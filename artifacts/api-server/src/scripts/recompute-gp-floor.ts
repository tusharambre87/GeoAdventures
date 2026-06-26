/**
 * Part 4 — Recompute score_classic_final with GP floor
 *
 * For every PSI row where manually_overridden IS NOT TRUE, this script:
 *   1. Joins plannerStopIntelligence → plannerPlaces → stop_library to get
 *      gpRating + gpRatingsTotal for each stop.
 *   2. Reconstructs the PlacePlanningProfile from stored PSI columns.
 *   3. Calls computeScores(profile, CLASSIC_FAMILY, gpData) — identical to
 *      how backfillLibraryPsi computes scoreClassicFinal, but now with the
 *      Part 3 GP floor active.
 *   4. Writes the new score if it differs from the existing one.
 *   5. Runs an orphan gate: any stop_library row with gp_ratings_total that
 *      was NOT joined to a PSI row is an orphan. Orphan count > 0 → exit 1
 *      without busting the pool cache.
 *   6. On zero orphans, deletes affected city_stop_pool_cache rows.
 *
 * ── JOIN NOTE ────────────────────────────────────────────────────────────────
 * stop_library has NO FK to plannerStopIntelligence. The only structural path
 * is:
 *   plannerStopIntelligence.placeId → plannerPlaces.id (internal UUID FK)
 *   plannerPlaces → stop_library via LOWER(TRIM(name + city))
 *
 * stop_library.gp_place_id is the EXTERNAL Google Places ID (e.g. "ChIJ…").
 * plannerStopIntelligence.placeId is the internal plannerPlaces UUID.
 * These two IDs are unrelated — a gp_place_id join is not structurally
 * possible without a schema change. The orphan gate catches any stops the
 * name-join misses.
 *
 * ── LOOP QUESTION ────────────────────────────────────────────────────────────
 * No external API calls — pure DB reads + in-process scoring + DB writes.
 * At 200 ms pause × ~4 k rows ≈ 14 minutes. One pass is sufficient.
 * Do NOT wrap in an auto-resume loop.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:recompute-gp-floor
 */

import { db } from "../db.js";
import {
  plannerStopIntelligence,
  plannerPlaces,
  stopLibrary,
  cityStopPoolCache,
} from "@workspace/db";
import { eq, and, isNotNull, ne, sql, inArray } from "drizzle-orm";
import {
  computeScores,
  type FamilyProfile,
  type PlacePlanningProfile,
} from "../planner/scoringEngine.js";

const LOG = "[RecomputeGpFloor]";
const PAUSE_MS = 200;

/** Optional city scope — set CITY_FILTER=yellowstone to process one city only. */
const CITY_FILTER = process.env.CITY_FILTER?.trim().toLowerCase() ?? null;

/**
 * Canonical "classic" family profile — identical to CANONICAL_PROFILES[1]
 * used in backfillLibraryPsi.ts. No per-stop overrides; stop-specific data
 * lives in PlacePlanningProfile.
 */
const CLASSIC_FAMILY: FamilyProfile = {
  childrenAges: [5, 8],
  pace: "moderate",
  transportMode: "driving",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Map flat PSI columns back to a PlacePlanningProfile for computeScores(). */
function psiToProfile(
  psi: typeof plannerStopIntelligence.$inferSelect,
): PlacePlanningProfile {
  return {
    // Phase 1 — Core logistics
    restroomConfidence:               psi.restroomConfidence              ?? undefined,
    foodConfidence:                   psi.foodConfidence                  ?? undefined,
    entryFrictionScore:               psi.entryFrictionScore              ?? undefined,
    exitEaseScore:                    psi.exitEaseScore                   ?? undefined,
    escapeEaseScore:                  psi.escapeEaseScore                 ?? undefined,
    parkingAvailabilityScore:         psi.parkingAvailabilityScore        ?? undefined,
    shadeOrClimateRelief:             psi.shadeOrClimateRelief            ?? undefined,
    seatingAvailability:              psi.seatingAvailability             ?? undefined,
    shortenabilityScore:              psi.shortenabilityScore             ?? undefined,
    skipCostScore:                    psi.skipCostScore                   ?? undefined,
    queueRiskMorning:                 psi.queueRiskMorning                ?? undefined,
    queueRiskMidday:                  psi.queueRiskMidday                 ?? undefined,
    queueRiskAfternoon:               psi.queueRiskAfternoon              ?? undefined,
    lateDayRisk:                      psi.lateDayRisk                     ?? undefined,
    sourceConfidence:                 psi.sourceConfidence                ?? undefined,
    bestArrivalWindow:                psi.bestArrivalWindow               ?? undefined,
    worstArrivalWindow:               psi.worstArrivalWindow              ?? undefined,
    rationaleShort:                   psi.rationaleShort                  ?? undefined,
    socialLabel:                      psi.socialLabel                     ?? undefined,
    discoveryLabel:                   psi.discoveryLabel                  ?? undefined,
    // Phase 2 — Age-band fit
    age2to4Fit:                       psi.age2to4Fit                      ?? undefined,
    age5to7Fit:                       psi.age5to7Fit                      ?? undefined,
    age8to12Fit:                      psi.age8to12Fit                     ?? undefined,
    teenFit:                          psi.teenFit                         ?? undefined,
    mixedSiblingFit:                  psi.mixedSiblingFit                 ?? undefined,
    // Phase 2 — Parent reality
    strollerEaseScore:                psi.strollerEaseScore               ?? undefined,
    waitingToleranceRequiredScore:    psi.waitingToleranceRequiredScore   ?? undefined,
    meltdownRecoveryEaseScore:        psi.meltdownRecoveryEaseScore       ?? undefined,
    hungerRecoveryEaseScore:          psi.hungerRecoveryEaseScore         ?? undefined,
    bathroomUrgencyResilienceScore:   psi.bathroomUrgencyResilienceScore  ?? undefined,
    weatherFallbackStrengthScore:     psi.weatherFallbackStrengthScore    ?? undefined,
    ticketValueConfidenceScore:       psi.ticketValueConfidenceScore      ?? undefined,
    hassleToJoyRatioScore:            psi.hassleToJoyRatioScore           ?? undefined,
    parentEffortScore:                psi.parentEffortScore               ?? undefined,
    // Phase 2 — Kid delight
    wowFactorScore:                   psi.wowFactorScore                  ?? undefined,
    handsOnLevelScore:                psi.handsOnLevelScore               ?? undefined,
    freePlayLevelScore:               psi.freePlayLevelScore              ?? undefined,
    movementReleaseScore:             psi.movementReleaseScore            ?? undefined,
    sensoryRewardScore:               psi.sensoryRewardScore              ?? undefined,
    curiosityHookScore:               psi.curiosityHookScore              ?? undefined,
    // Phase 2 — Day-fit
    morningFitScore:                  psi.morningFitScore                 ?? undefined,
    afterLunchFitScore:               psi.afterLunchFitScore              ?? undefined,
    lateDayFitScore:                  psi.lateDayFitScore                 ?? undefined,
    rainyDayFitScore:                 psi.rainyDayFitScore                ?? undefined,
    hotDayFitScore:                   psi.hotDayFitScore                  ?? undefined,
    coldDayFitScore:                  psi.coldDayFitScore                 ?? undefined,
    quickWinFitScore:                 psi.quickWinFitScore                ?? undefined,
    treatStopFitScore:                psi.treatStopFitScore               ?? undefined,
    anchorStopFitScore:               psi.anchorStopFitScore              ?? undefined,
    // Phase 2 — Family evidence
    familyAnchorType:                 psi.familyAnchorType                ?? undefined,
    familyEvidenceScore:              psi.familyEvidenceScore             ?? undefined,
    ageMatchConfidenceScore:          psi.ageMatchConfidenceScore         ?? undefined,
    worthTheHassleConfidenceScore:    psi.worthTheHassleConfidenceScore   ?? undefined,
    hiddenGemFamilyScore:             psi.hiddenGemFamilyScore            ?? undefined,
    supportingEvidenceCount:          psi.supportingEvidenceCount         ?? undefined,
    commonParentPros:                 psi.commonParentPros                ?? undefined,
    commonParentCautions:             psi.commonParentCautions            ?? undefined,
    // Phase 2 — Labels (not used in scoring but part of the interface)
    bestForAgesLabel:                 psi.bestForAgesLabel                ?? undefined,
    timeNeededLabel:                  psi.timeNeededLabel                 ?? undefined,
    effortLabel:                      psi.effortLabel                     ?? undefined,
    weatherLabel:                     psi.weatherLabel                    ?? undefined,
    cautionLabel:                     psi.cautionLabel                    ?? undefined,
    whyWorthItLabel:                  psi.whyWorthItLabel                 ?? undefined,
    goodMomentLabel:                  psi.goodMomentLabel                 ?? undefined,
  };
}

async function run(): Promise<void> {
  // ── 1. Load all recompute candidates ──────────────────────────────────────
  //
  // JOIN path:
  //   plannerStopIntelligence
  //     INNER JOIN plannerPlaces ON psi.place_id = pp.id
  //     LEFT JOIN  stop_library  ON LOWER(TRIM(sl.name)) = LOWER(TRIM(pp.name))
  //                             AND LOWER(TRIM(sl.city)) = LOWER(TRIM(pp.city))
  //
  // LEFT JOIN so PSI rows with no stop_library match still appear in the loop
  // (they get gpData = null, so the floor doesn't fire — correct behaviour).
  // The orphan gate then flags stop_library rows with GP data that were missed.

  console.log(`${LOG} Loading PSI rows… ${CITY_FILTER ? `(city filter: ${CITY_FILTER})` : "(full library)"}`);

  const cityWhereClause = CITY_FILTER
    ? sql`${plannerStopIntelligence.manuallyOverridden} IS NOT TRUE AND LOWER(TRIM(${plannerPlaces.city})) LIKE ${'%' + CITY_FILTER + '%'}`
    : sql`${plannerStopIntelligence.manuallyOverridden} IS NOT TRUE`;

  const rows = await db
    .select({
      psi:             plannerStopIntelligence,
      ppName:          plannerPlaces.name,
      ppCity:          plannerPlaces.city,
      slId:            stopLibrary.id,
      slNormalizedKey: stopLibrary.normalizedKey,
      gpRating:        stopLibrary.gpRating,
      gpRatingsTotal:  stopLibrary.gpRatingsTotal,
    })
    .from(plannerStopIntelligence)
    .innerJoin(plannerPlaces, eq(plannerStopIntelligence.placeId, plannerPlaces.id))
    .leftJoin(
      stopLibrary,
      and(
        sql`LOWER(TRIM(${stopLibrary.name})) = LOWER(TRIM(${plannerPlaces.name}))`,
        sql`LOWER(TRIM(${stopLibrary.city})) = LOWER(TRIM(${plannerPlaces.city}))`,
      ),
    )
    .where(cityWhereClause);

  console.log(`${LOG} ${rows.length} PSI rows to process.`);

  // ── 2. Per-stop recompute ─────────────────────────────────────────────────

  const processedSlIds = new Set<string>();
  const affectedNormalizedKeys = new Set<string>();
  let updated = 0;
  let unchanged = 0;
  let noGp = 0;
  let floorActivations = 0;  // GP data present AND floor raised the score above raw

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { psi, slId, slNormalizedKey, gpRating, gpRatingsTotal } = row;

    if (slId) processedSlIds.add(slId);

    const profile = psiToProfile(psi);

    // gpRating is stored as numeric → Drizzle returns it as string | null.
    // gpRatingsTotal is integer → number | null.
    const gpData =
      gpRating != null && gpRatingsTotal != null
        ? { gpRating: String(gpRating), gpRatingsTotal }
        : null;

    if (!gpData) noGp++;

    const { finalScore: newScore } = computeScores(
      profile,
      CLASSIC_FAMILY,
      gpData ?? undefined,
    );

    // Floor activation: GP data was present AND it actually raised the score
    // above what the raw (no-GP) engine would have produced.
    if (gpData) {
      const { finalScore: rawScore } = computeScores(profile, CLASSIC_FAMILY);
      if (newScore > rawScore) floorActivations++;
    }

    if (newScore !== psi.scoreClassicFinal) {
      await db
        .update(plannerStopIntelligence)
        .set({ scoreClassicFinal: newScore })
        .where(eq(plannerStopIntelligence.id, psi.id));

      updated++;
      if (slNormalizedKey) affectedNormalizedKeys.add(slNormalizedKey);

      if (updated <= 20 || updated % 100 === 0) {
        console.log(
          `${LOG} Updated "${row.ppName}" (${row.ppCity}): ${psi.scoreClassicFinal ?? "NULL"} → ${newScore}`,
        );
      }
    } else {
      unchanged++;
    }

    if ((i + 1) % 200 === 0) {
      const pct = (((i + 1) / rows.length) * 100).toFixed(1);
      console.log(
        `${LOG} Progress: ${i + 1}/${rows.length} (${pct}%) | updated=${updated} unchanged=${unchanged} noGP=${noGp} floorActivations=${floorActivations}`,
      );
    }

    await sleep(PAUSE_MS);
  }

  console.log(
    `${LOG} Loop complete — updated=${updated} unchanged=${unchanged} noGP=${noGp} floorActivations=${floorActivations}`,
  );

  // ── 3. Orphan gate ────────────────────────────────────────────────────────
  //
  // A TRUE orphan is a stop_library row where:
  //   • gp_ratings_total IS NOT NULL  (floor-eligible)
  //   • Has at least one non-overridden PSI match via name+city join
  //   • That non-overridden PSI match still has score_classic_final IS NULL
  //     (the recompute loop should have processed it but missed it)
  //
  // Stops whose ONLY PSI rows are manually_overridden are correctly skipped
  // by the IS NOT TRUE filter above — they are NOT flagged as orphans.
  //
  // Implementation: pure DB query, no in-process set needed.

  console.log(`${LOG} Running orphan gate…`);

  const orphans = await db
    .select({
      id:             stopLibrary.id,
      name:           stopLibrary.name,
      city:           stopLibrary.city,
      gpRatingsTotal: stopLibrary.gpRatingsTotal,
      gpRating:       stopLibrary.gpRating,
    })
    .from(stopLibrary)
    .where(
      and(
        isNotNull(stopLibrary.gpVerifiedAt),
        ne(stopLibrary.gpPlaceId, "NOT_FOUND"),
        isNotNull(stopLibrary.gpRatingsTotal),
        // Has a non-overridden PSI match whose score is still NULL → missed
        sql`EXISTS (
          SELECT 1
          FROM planner_places pp
          INNER JOIN planner_stop_intelligence psi ON psi.place_id = pp.id
          WHERE LOWER(TRIM(pp.name)) = LOWER(TRIM(${stopLibrary.name}))
            AND LOWER(TRIM(pp.city)) = LOWER(TRIM(${stopLibrary.city}))
            AND psi.manually_overridden IS NOT TRUE
            AND psi.score_classic_final IS NULL
        )`,
      ),
    );

  if (orphans.length > 0) {
    console.error(
      `${LOG} ORPHAN GATE FAILED — ${orphans.length} floor-eligible stop(s) have non-overridden PSI rows with no score:`,
    );
    for (const o of orphans) {
      console.error(
        `  - "${o.name}" (${o.city}) | gp_ratings_total=${o.gpRatingsTotal} | gp_rating=${o.gpRating} | id=${o.id}`,
      );
    }
    console.error(
      `${LOG} Pool cache NOT busted. Investigate the join miss for these stops, then re-run.`,
    );
    process.exit(1);
  }

  console.log(`${LOG} Orphan gate passed — 0 true orphans.`);

  // ── 4. Cache bust ─────────────────────────────────────────────────────────
  //
  // Delete city_stop_pool_cache rows only for normalizedKeys where at least
  // one score actually changed. Unchanged stops don't need cache invalidation.

  if (affectedNormalizedKeys.size === 0) {
    console.log(`${LOG} No scores changed — cache bust skipped.`);
    return;
  }

  const keyList = [...affectedNormalizedKeys];
  console.log(`${LOG} Busting pool cache for ${keyList.length} normalizedKey(s)…`);

  await db
    .delete(cityStopPoolCache)
    .where(inArray(cityStopPoolCache.normalizedKey, keyList));

  console.log(`${LOG} Cache bust complete.`);
  console.log(`${LOG} Done.`);
}

run().catch((err) => {
  console.error(`${LOG} Fatal:`, err);
  process.exit(1);
});
