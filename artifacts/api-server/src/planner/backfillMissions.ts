/**
 * Batch backfill: populate stop_library.stop_missions for all stops that have
 * storyPack populated but stop_missions IS NULL.
 *
 * Runs to completion in a single invocation — no manual re-runs needed.
 *
 * Uses gpt-4o-mini via generateMissionsForStop() (same model used in the live
 * enrichment pipeline). Estimated cost: ~$0.04 for 195 stops.
 *
 * Ordering: US cities first → India second → rest of world.
 * Batch size: 5 (Promise.all), with a 2-second pause between batches.
 * Pages of 50 candidates are fetched from the DB at a time; the loop
 * continues until the candidate query returns 0 rows (or only rows that
 * have already failed this run — those are excluded to prevent infinite loops).
 *
 * Idempotent: the candidate query filters stop_missions IS NULL, so already-
 * written rows are excluded at the DB level. A per-stop re-check guards against
 * races.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:missions
 */

import { db } from "../db.js";
import { stopLibrary } from "@workspace/db";
import { and, isNull, isNotNull, notInArray, eq, sql, count } from "drizzle-orm";
import { generateMissionsForStop, type GeneratedStopMission } from "../travelContent.js";

const BATCH_SIZE = 5;
const BATCH_PAUSE_MS = 2000;
const FETCH_PAGE_SIZE = 50;

// gpt-4o-mini pricing estimate: ~800 input + ~600 output tokens per call
// $0.15/1M input + $0.60/1M output → ~$0.000120 + $0.000360 ≈ $0.0005/call
const COST_PER_CALL_USD = 0.0005;

type StopRow = {
  id: string;
  name: string;
  city: string;
  country: string | null;
  stopType: string | null;
};

// ── Mission shape validation ──────────────────────────────────────────────────

const REQUIRED_TYPES = ["knowledge", "observation", "photo"] as const;

/**
 * Returns a human-readable error string if the missions array is invalid,
 * or null if it is acceptable to write to the DB.
 *
 * Rules:
 * - Exactly 3 missions.
 * - One of each type: knowledge, observation, photo (in any order).
 * - The knowledge mission must have exactly 4 options and a valid correctOption (0–3).
 */
function validateMissions(missions: GeneratedStopMission[]): string | null {
  if (missions.length !== 3) {
    return `Expected 3 missions, got ${missions.length}`;
  }

  const types = missions.map((m) => m.type);
  for (const required of REQUIRED_TYPES) {
    if (!types.includes(required)) {
      return `Missing mission type: ${required} (got ${types.join(", ")})`;
    }
  }

  const knowledge = missions.find((m) => m.type === "knowledge")!;
  if (!Array.isArray(knowledge.options) || knowledge.options.length !== 4) {
    return `Knowledge mission must have exactly 4 options (got ${knowledge.options?.length ?? 0})`;
  }
  if (
    typeof knowledge.correctOption !== "number" ||
    knowledge.correctOption < 0 ||
    knowledge.correctOption > 3
  ) {
    return `Knowledge mission has invalid correctOption: ${knowledge.correctOption}`;
  }

  return null;
}

// ── Idempotency re-check ──────────────────────────────────────────────────────

/**
 * Per-stop race guard: returns true if stop_missions is already populated.
 * The outer query filters stop_missions IS NULL, so this only fires if two
 * parallel job instances processed the same stop concurrently.
 */
async function isAlreadyEnriched(id: string): Promise<boolean> {
  const [row] = await db
    .select({ stopMissions: stopLibrary.stopMissions })
    .from(stopLibrary)
    .where(eq(stopLibrary.id, id))
    .limit(1);
  return row?.stopMissions != null;
}

// ── Candidate where clause ────────────────────────────────────────────────────

function candidateWhere(failedIds: string[]) {
  const base = and(
    isNotNull(stopLibrary.storyPack),
    isNull(stopLibrary.stopMissions),
  );
  if (failedIds.length === 0) return base;
  return and(base, notInArray(stopLibrary.id, failedIds));
}

function fmtCost(calls: number): string {
  return `$${(calls * COST_PER_CALL_USD).toFixed(4)}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(stopLibrary)
    .where(candidateWhere([]));

  if (total === 0) {
    console.log("[BackfillMissions] 0 stops to process — already complete.");
    process.exit(0);
  }

  console.log(`[BackfillMissions] ${total} stop(s) with stop_missions IS NULL. Starting full run…`);
  console.log(`[BackfillMissions] Estimated cost if all are new: ${fmtCost(total)} (gpt-4o-mini @ ~$0.0005/call)`);

  let totalEnriched = 0;
  let totalSkipped = 0;
  let totalAiCalls = 0;   // incremented before every AI call — accurate even if write fails
  let totalErrors = 0;
  const startTime = Date.now();

  // IDs that failed this run — excluded from future pages to prevent infinite loops
  // on deterministically failing stops (bad AI response, parse failures, etc.).
  const failedIds: string[] = [];

  // Outer loop: keep fetching pages until no candidates remain.
  while (true) {
    const candidates = await db
      .select({
        id: stopLibrary.id,
        name: stopLibrary.name,
        city: stopLibrary.city,
        country: stopLibrary.country,
        stopType: stopLibrary.stopType,
      })
      .from(stopLibrary)
      .where(candidateWhere(failedIds))
      .orderBy(
        sql`CASE
          WHEN LOWER(${stopLibrary.country}) LIKE '%united states%'
            OR LOWER(${stopLibrary.country}) LIKE '%usa%' THEN 0
          WHEN LOWER(${stopLibrary.country}) LIKE '%india%' THEN 1
          ELSE 2
        END`,
        stopLibrary.city,
        stopLibrary.name,
      )
      .limit(FETCH_PAGE_SIZE);

    if (candidates.length === 0) break;

    // Process this page in batches of BATCH_SIZE with a pause between batches.
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (stop) => {
          try {
            // Per-stop race guard.
            if (await isAlreadyEnriched(stop.id)) {
              totalSkipped++;
              return;
            }

            totalAiCalls++;  // count before the call — accurate even if validation/write fails
            const missions = await generateMissionsForStop(
              stop.name,
              stop.city,
              stop.stopType ?? "landmark",
            );

            // Require exactly 3 missions with types knowledge/observation/photo.
            // generateMissionsForStop can return a 2-mission fallback on AI failure;
            // reject that rather than persisting non-compliant data.
            const validationError = validateMissions(missions);
            if (validationError) {
              throw new Error(`Mission shape invalid: ${validationError}`);
            }

            await db
              .update(stopLibrary)
              .set({ stopMissions: missions as any })
              .where(eq(stopLibrary.id, stop.id));

            totalEnriched++;
            console.log(`[BackfillMissions] Enriched: ${stop.name} (${stop.city})`);
          } catch (err) {
            totalErrors++;
            failedIds.push(stop.id);
            console.error(
              `[BackfillMissions] Error enriching "${stop.name}" (${stop.city}):`,
              (err as Error).message,
            );
          }
        }),
      );

      const processed = totalEnriched + totalSkipped + totalErrors;

      // Progress line every 100 stops (or at natural end of small runs).
      if (processed % 100 < BATCH_SIZE || processed === total) {
        const pct = ((processed / total) * 100).toFixed(1);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const mm = Math.floor(elapsed / 60);
        const ss = elapsed % 60;
        console.log(
          `[BackfillMissions] Processed ${processed}/${total} (${pct}%) • ` +
          `Est. cost so far: ${fmtCost(totalAiCalls)} • ` +
          `Elapsed: ${mm}m ${ss}s`,
        );
      }

      if (i + BATCH_SIZE < candidates.length) {
        await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
      }
    }
  }

  const elapsedSec = Math.round((Date.now() - startTime) / 1000);
  const elapsedMm = Math.floor(elapsedSec / 60);
  const elapsedSs = elapsedSec % 60;

  console.log("");
  console.log("══════════════════════════════════════════════════");
  console.log(" BackfillMissions — Complete");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Enriched:        ${totalEnriched}`);
  console.log(`  Skipped:         ${totalSkipped} (already had missions data)`);
  console.log(`  Errors:          ${totalErrors}${totalErrors > 0 ? " (excluded from retry to prevent loops)" : ""}`);
  console.log(`  AI calls made:   ${totalAiCalls}`);
  console.log(`  Est. total cost: ${fmtCost(totalAiCalls)}`);
  console.log(`  Time elapsed:    ${elapsedMm}m ${elapsedSs}s`);
  if (failedIds.length > 0) {
    console.log(`  Failed stop IDs: ${failedIds.join(", ")}`);
  }
  console.log("══════════════════════════════════════════════════");

  process.exit(totalErrors > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("[BackfillMissions] Fatal error:", err);
  process.exit(1);
});
