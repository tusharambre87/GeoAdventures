/**
 * Backfill: PSI enrichment + multi-profile scoring for every stop_library row.
 *
 * Per stop, in sequence:
 *   1. findOrCreatePlace — resolve (or create) a plannerPlaces row so the FK holds
 *   2. enrichStop        — AI call for all 70 PlacePlanningProfile fields; idempotent
 *   3. computeScores x4  — score against four canonical family profiles
 *   4. db.update         — write computed scores back to planner_stop_intelligence
 *
 * Run order:
 *   1. pnpm --filter @workspace/db run push          (add profile-score columns)
 *   2. DC test:  pnpm --filter @workspace/api-server run backfill:library-psi
 *      (script starts DC-only; remove DC_ONLY flag below for full library run)
 *   3. Verify with the query in the brief before removing the DC filter
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:library-psi
 */

import { db } from "../db.js";
import { stopLibrary, plannerPlaces, plannerStopIntelligence } from "@workspace/db";
import { eq, and, sql, isNull, count } from "drizzle-orm";
import { enrichStop } from "./stopEnrichmentService.js";
import { computeScores, type FamilyProfile } from "./scoringEngine.js";

// ── Config ────────────────────────────────────────────────────────────────────
// Set to false to run against the full library after DC test passes.
const DC_ONLY = false;

const BATCH_SIZE = 5;
const BATCH_PAUSE_MS = 2000;
const COST_PER_CALL_USD = 0.025; // gpt-4o @ ~$0.025/call

const LOG = "[BackfillLibraryPsi]";

// ── Canonical family profiles ─────────────────────────────────────────────────
// Four profiles covering the realistic user distribution.
// Scores from the "classic" profile become the default finalScore / kidFitScore.
const CANONICAL_PROFILES: Array<{
  id: "toddler" | "classic" | "urban" | "adventure";
  family: FamilyProfile;
}> = [
  {
    id: "toddler",
    family: { childrenAges: [3], pace: "relaxed", transportMode: "driving" },
  },
  {
    id: "classic",
    family: { childrenAges: [5, 8], pace: "moderate", transportMode: "driving" },
  },
  {
    id: "urban",
    family: { childrenAges: [7, 10], pace: "moderate", transportMode: "walking" },
  },
  {
    id: "adventure",
    family: { childrenAges: [12], pace: "busy", transportMode: "driving" },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Find an existing plannerPlaces record by normalised name+city, or create a
 * minimal one. Returns the canonical placeId used as the PSI FK.
 */
async function findOrCreatePlace(stop: {
  name: string;
  city: string;
  country: string | null;
  stopType: string | null;
}): Promise<string> {
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
 * Returns true if the PSI row for this placeId already has profile scores,
 * meaning this script has already processed it.
 */
async function alreadyScored(placeId: string): Promise<boolean> {
  const rows = await db
    .select({ scoreClassicFinal: plannerStopIntelligence.scoreClassicFinal })
    .from(plannerStopIntelligence)
    .where(eq(plannerStopIntelligence.placeId, placeId))
    .limit(1);
  return rows.length > 0 && rows[0].scoreClassicFinal !== null;
}

function fmtCost(calls: number): string {
  return `$${(calls * COST_PER_CALL_USD).toFixed(2)}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const cityFilter = DC_ONLY
    ? sql`${stopLibrary.city} = 'Washington DC'`
    : sql`1=1`;

  const [{ total }] = await db
    .select({ total: count() })
    .from(stopLibrary)
    .where(cityFilter);

  console.log(`${LOG} Mode: ${DC_ONLY ? "DC ONLY (test run)" : "FULL LIBRARY"}`);
  console.log(`${LOG} ${total} stop(s) to process.`);
  console.log(`${LOG} Estimated cost if all are new: ${fmtCost(total)}`);

  const candidates = await db
    .select({
      id: stopLibrary.id,
      name: stopLibrary.name,
      city: stopLibrary.city,
      country: stopLibrary.country,
      stopType: stopLibrary.stopType,
    })
    .from(stopLibrary)
    .where(cityFilter)
    .orderBy(stopLibrary.name);

  let totalEnriched = 0;
  let totalScored = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalAiCalls = 0;
  const startTime = Date.now();
  const failedNames: string[] = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (stop) => {
        try {
          // Step 1 — resolve or create plannerPlaces row (satisfies PSI FK)
          const placeId = await findOrCreatePlace(stop);

          // Step 2 — skip if already scored by this script
          if (await alreadyScored(placeId)) {
            totalSkipped++;
            console.log(`${LOG} Skip (already scored): ${stop.name}`);
            return;
          }

          // Step 2b — skip if a human has manually corrected this row
          const existingPsi = await db
            .select({ manuallyOverridden: plannerStopIntelligence.manuallyOverridden })
            .from(plannerStopIntelligence)
            .where(eq(plannerStopIntelligence.placeId, placeId))
            .limit(1);
          if (existingPsi[0]?.manuallyOverridden) {
            totalSkipped++;
            console.log(`${LOG} Skip (manually overridden): ${stop.name}`);
            return;
          }

          const destination = stop.country
            ? `${stop.city}, ${stop.country}`
            : stop.city;

          // Step 3 — fetch familyAnchorType from plannerPlaces so the AI prompt
          // gets the correct role context (anchor vs support) rather than defaulting
          // to "support" for every stop regardless of stop type.
          const ppMeta = await db
            .select({ familyAnchorType: plannerPlaces.familyAnchorType })
            .from(plannerPlaces)
            .where(eq(plannerPlaces.id, placeId))
            .limit(1);

          // Step 4 — enrich via AI (idempotent: returns cached if already enriched)
          totalAiCalls++;
          const enriched = await enrichStop(
            {
              name: stop.name,
              type: stop.stopType ?? "landmark",
              destination,
              familyAnchorType: ppMeta[0]?.familyAnchorType ?? undefined,
            },
            placeId,
          );
          totalEnriched++;

          // Step 4 — score against all 4 canonical profiles
          let classicScores = computeScores(enriched, CANONICAL_PROFILES[1].family);

          const profileUpdates: Record<string, number> = {};
          for (const { id, family } of CANONICAL_PROFILES) {
            const scores = computeScores(enriched, { ...family, stopType: stop.stopType ?? undefined });
            profileUpdates[`${id}Final`] = scores.finalScore;
            profileUpdates[`${id}KidFit`] = scores.ageAndKidFitScore;
            if (id === "classic") classicScores = scores;
          }

          // Step 5 — write scores back to PSI
          await db
            .update(plannerStopIntelligence)
            .set({
              // Component scores from the "classic" profile become the defaults
              finalScore: classicScores.finalScore,
              kidFitScore: classicScores.ageAndKidFitScore,
              practicalityScore: classicScores.parentPracticalityScore,
              flowFitScore: classicScores.flowAndDayFitScore,
              flexibilityScore: classicScores.flexibilityAndRecoveryScore,
              socialProofScore: classicScores.delightScore,
              discoveryScore: classicScores.familyEvidenceConfidenceScore,
              roleAssigned: classicScores.roleAssigned,
              // Per-profile scores
              scoreToddlerFinal: profileUpdates.toddlerFinal,
              scoreToddlerKidFit: profileUpdates.toddlerKidFit,
              scoreClassicFinal: profileUpdates.classicFinal,
              scoreClassicKidFit: profileUpdates.classicKidFit,
              scoreUrbanFinal: profileUpdates.urbanFinal,
              scoreUrbanKidFit: profileUpdates.urbanKidFit,
              scoreAdventureFinal: profileUpdates.adventureFinal,
              scoreAdventureKidFit: profileUpdates.adventureKidFit,
              enrichedAt: new Date(),
            })
            .where(eq(plannerStopIntelligence.placeId, placeId));

          totalScored++;
          console.log(
            `${LOG} Done: ${stop.name} — classic final=${classicScores.finalScore} ` +
            `toddler=${profileUpdates.toddlerFinal} urban=${profileUpdates.urbanFinal} ` +
            `adventure=${profileUpdates.adventureFinal} role=${classicScores.roleAssigned}`,
          );
        } catch (err) {
          totalErrors++;
          failedNames.push(stop.name);
          console.error(
            `${LOG} Error: "${stop.name}" (${stop.city}):`,
            (err as Error).message,
          );
        }
      }),
    );

    const processed = totalScored + totalSkipped + totalErrors;
    if (processed > 0 && processed % 10 < BATCH_SIZE) {
      const pct = ((processed / candidates.length) * 100).toFixed(1);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const mm = Math.floor(elapsed / 60);
      const ss = elapsed % 60;
      console.log(
        `${LOG} Progress: ${processed}/${candidates.length} (${pct}%) • ` +
        `Est. cost: ${fmtCost(totalAiCalls)} • Elapsed: ${mm}m ${ss}s`,
      );
    }

    if (i + BATCH_SIZE < candidates.length) {
      await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
    }
  }

  const elapsedSec = Math.round((Date.now() - startTime) / 1000);
  const mm = Math.floor(elapsedSec / 60);
  const ss = elapsedSec % 60;

  console.log("");
  console.log("══════════════════════════════════════════════════════════");
  console.log(` BackfillLibraryPsi — ${DC_ONLY ? "DC Test" : "Full Library"} Complete`);
  console.log("══════════════════════════════════════════════════════════");
  console.log(`  Enriched + scored: ${totalScored}`);
  console.log(`  Skipped:           ${totalSkipped} (already had profile scores)`);
  console.log(`  Errors:            ${totalErrors}`);
  console.log(`  AI calls:          ${totalAiCalls}`);
  console.log(`  Est. cost:         ${fmtCost(totalAiCalls)}`);
  console.log(`  Time elapsed:      ${mm}m ${ss}s`);
  if (failedNames.length > 0) {
    console.log(`  Failed stops:      ${failedNames.join(", ")}`);
  }
  if (DC_ONLY) {
    console.log("");
    console.log("  DC test complete. Run the verification query, then set");
    console.log("  DC_ONLY = false and re-run for the full library.");
  }
  console.log("══════════════════════════════════════════════════════════");

  process.exit(totalErrors > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(`${LOG} Fatal:`, err);
  process.exit(1);
});
