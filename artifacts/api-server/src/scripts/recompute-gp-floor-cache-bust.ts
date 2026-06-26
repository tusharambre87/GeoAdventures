/**
 * Part 4 — Cache bust (post-recompute)
 *
 * The main recompute loop already wrote 3,123 score_classic_final updates and
 * exited before the cache bust because the original orphan gate incorrectly
 * flagged 13 stops whose ONLY PSI row is manually_overridden=true. Those are
 * correctly skipped by the recompute (scores are manually protected).
 *
 * Corrected orphan definition (used here):
 *   A TRUE orphan is a stop_library row where:
 *     1. gp_ratings_total IS NOT NULL (floor-eligible)
 *     2. Has at least one non-overridden PSI match via name+city join
 *     3. That non-overridden PSI match still has score_classic_final IS NULL
 *        (meaning the recompute loop missed it — the join failed for it)
 *
 *   Stops whose only PSI rows are manually_overridden are correctly skipped
 *   and are NOT flagged as true orphans.
 *
 * If gate passes (0 true orphans): full city_stop_pool_cache clear.
 */

import { db } from "../db.js";
import {
  stopLibrary,
  cityStopPoolCache,
} from "@workspace/db";
import { and, isNotNull, ne, sql } from "drizzle-orm";

const LOG = "[GpFloorCacheBust]";

async function run(): Promise<void> {
  // ── 1. Corrected orphan gate ──────────────────────────────────────────────
  //
  // Find stop_library rows with GP data that have a non-overridden PSI row
  // whose score_classic_final is STILL NULL after the recompute. Those are
  // the stops the recompute loop should have reached but missed.

  console.log(`${LOG} Running corrected orphan gate…`);

  const trueOrphans = await db
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
        // At least one non-overridden PSI match exists with a NULL score
        // (the recompute ran but didn't write a score → join missed this stop)
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

  if (trueOrphans.length > 0) {
    console.error(
      `${LOG} ORPHAN GATE FAILED — ${trueOrphans.length} stop(s) have non-overridden PSI rows with no score after recompute:`,
    );
    for (const o of trueOrphans) {
      console.error(
        `  - "${o.name}" (${o.city}) | gp_ratings_total=${o.gpRatingsTotal} | gp_rating=${o.gpRating} | id=${o.id}`,
      );
    }
    console.error(`${LOG} Cache NOT busted. Re-run the full recompute to fix these.`);
    process.exit(1);
  }

  console.log(`${LOG} Orphan gate passed — 0 true orphans.`);

  // ── 2. Cache bust ─────────────────────────────────────────────────────────
  //
  // 3,123 PSI scores changed across stops in many cities. Full cache clear is
  // the correct and safe choice: the pool regenerates on next trip creation.

  console.log(`${LOG} Clearing city_stop_pool_cache…`);

  await db.delete(cityStopPoolCache);

  console.log(`${LOG} Cache cleared.`);
  console.log(`${LOG} Done — Part 4 complete.`);
}

run().catch((err) => {
  console.error(`${LOG} Fatal:`, err);
  process.exit(1);
});
