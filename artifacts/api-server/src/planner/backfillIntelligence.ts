/**
 * Batch backfill: populate planner_stop_intelligence for all seeded stop_library stops.
 *
 * Runs to completion in a single invocation — no manual re-runs needed.
 *
 * Ordering: US cities first → India second → rest of world.
 * Batch size: 5 (Promise.all), with a 2-second pause between batches.
 * Pages of 50 candidates are fetched from the DB at a time; the loop
 * continues until the candidate query returns 0 rows (or only rows that
 * have already failed this run — those are excluded to prevent infinite loops).
 *
 * The candidate query excludes stops that already have a planner_stop_intelligence
 * record (via plannerPlaces name+city anti-join), so the backfill is fully
 * idempotent. An in-batch re-check also guards against parallel-run races.
 *
 * Progress is logged every 100 stops processed:
 *   Processed 100/3401 (2.9%) • Est. cost so far: $2.25 • Elapsed: 3m 12s
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:intelligence
 */

import { db } from "../db.js";
import { stopLibrary, plannerPlaces, plannerStopIntelligence } from "@workspace/db";
import { isNotNull, and, eq, notInArray, sql, count } from "drizzle-orm";
import { enrichStop } from "./stopEnrichmentService.js";

const BATCH_SIZE = 5;
const BATCH_PAUSE_MS = 2000;
const FETCH_PAGE_SIZE = 50;

// gpt-4o pricing estimate: ~1 000 input + ~2 000 output tokens per call
// $2.50/1M input + $10.00/1M output → ~$0.0225/call; rounded to $0.025 for safety
const COST_PER_CALL_USD = 0.025;

type StopLibraryRow = {
  id: string;
  name: string;
  city: string;
  country: string | null;
  stopType: string | null;
};

/**
 * Find an existing plannerPlaces record by normalized name+city, or insert a new
 * minimal one. Returns the canonical placeId.
 */
async function findOrCreatePlace(stop: StopLibraryRow): Promise<string> {
  const existing = await db
    .select({ id: plannerPlaces.id })
    .from(plannerPlaces)
    .where(
      and(
        sql`LOWER(TRIM(${plannerPlaces.name})) = LOWER(TRIM(${stop.name}))`,
        sql`LOWER(TRIM(${plannerPlaces.city})) = LOWER(TRIM(${stop.city}))`,
      ),
    )
    .orderBy(plannerPlaces.createdAt)
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [inserted] = await db
    .insert(plannerPlaces)
    .values({
      name: stop.name,
      city: stop.city,
      country: stop.country ?? "Unknown",
      type: stop.stopType ?? "landmark",
    })
    .returning({ id: plannerPlaces.id });

  return inserted.id;
}

/**
 * In-batch idempotency re-check: returns true if a planner_stop_intelligence row
 * already exists for this placeId. Guards against races when two job instances
 * run in parallel.
 */
async function hasIntelligence(placeId: string): Promise<boolean> {
  const rows = await db
    .select({ placeId: plannerStopIntelligence.placeId })
    .from(plannerStopIntelligence)
    .where(eq(plannerStopIntelligence.placeId, placeId))
    .limit(1);
  return rows.length > 0;
}

/**
 * A stop_library row is "unenriched" when there is NO plannerPlaces record
 * (matched by LOWER name+city) that already has a plannerStopIntelligence row.
 * Stops with no plannerPlaces record at all are included — findOrCreatePlace
 * will create the record during processing.
 */
function unenrichedWhereClause(excludeIds: string[]) {
  const pp = plannerPlaces;
  const psi = plannerStopIntelligence;

  const base = and(
    isNotNull(stopLibrary.storyPack),
    sql`NOT EXISTS (
      SELECT 1
      FROM ${pp}
      JOIN ${psi} ON ${psi.placeId} = ${pp.id}
      WHERE LOWER(TRIM(${pp.name})) = LOWER(TRIM(${stopLibrary.name}))
        AND LOWER(TRIM(${pp.city})) = LOWER(TRIM(${stopLibrary.city}))
    )`,
  );

  if (excludeIds.length === 0) return base;
  return and(base, notInArray(stopLibrary.id, excludeIds));
}

function fmtCost(calls: number): string {
  return `$${(calls * COST_PER_CALL_USD).toFixed(2)}`;
}

async function run(): Promise<void> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(stopLibrary)
    .where(unenrichedWhereClause([]));

  if (total === 0) {
    console.log("[BackfillIntelligence] 0 stops to process — already complete.");
    process.exit(0);
  }

  console.log(`[BackfillIntelligence] ${total} unenriched stop(s) to process. Starting full run…`);
  console.log(`[BackfillIntelligence] Estimated cost if all are new: ${fmtCost(total)} (gpt-4o @ ~$0.025/call)`);

  let totalEnriched = 0;
  let totalSkipped = 0;
  let totalAiCalls = 0;   // incremented before every enrichStop call (accurate even if write fails)
  let totalErrors = 0;
  const startTime = Date.now();

  // IDs that failed this run — excluded from future pages to prevent infinite loops
  // on deterministically failing stops (bad data, persistent API errors, etc.).
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
      .where(unenrichedWhereClause(failedIds))
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
            const placeId = await findOrCreatePlace(stop);

            if (await hasIntelligence(placeId)) {
              totalSkipped++;
              return;
            }

            const destination = stop.country
              ? `${stop.city}, ${stop.country}`
              : stop.city;

            totalAiCalls++;  // count before the call — accurate even if enrichStop throws
            await enrichStop(
              { name: stop.name, type: stop.stopType ?? "landmark", destination },
              placeId,
            );

            totalEnriched++;
            console.log(`[BackfillIntelligence] Enriched: ${stop.name} (${stop.city})`);
          } catch (err) {
            totalErrors++;
            failedIds.push(stop.id);
            console.error(
              `[BackfillIntelligence] Error enriching "${stop.name}" (${stop.city}):`,
              (err as Error).message,
            );
          }
        }),
      );

      const processed = totalEnriched + totalSkipped + totalErrors;

      // Progress line every 100 stops.
      if (processed % 100 < BATCH_SIZE) {
        const pct = ((processed / total) * 100).toFixed(1);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const mm = Math.floor(elapsed / 60);
        const ss = elapsed % 60;
        console.log(
          `[BackfillIntelligence] Processed ${processed}/${total} (${pct}%) • ` +
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
  console.log(" BackfillIntelligence — Complete");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Enriched:        ${totalEnriched}`);
  console.log(`  Skipped:         ${totalSkipped} (already had intelligence data)`);
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
  console.error("[BackfillIntelligence] Fatal error:", err);
  process.exit(1);
});
