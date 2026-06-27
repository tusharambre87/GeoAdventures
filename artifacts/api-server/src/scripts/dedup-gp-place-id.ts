/**
 * Dedup stop_library rows by gp_place_id within the same city.
 *
 * After the GP backfill runs, some newly seeded stops may resolve to the same
 * Google Places ID as an existing row (e.g. "Old Faithful" and "Old Faithful
 * Geyser" both resolving to the same place). This script finds those pairs,
 * keeps the row with the earlier created_at (the original), and deletes the
 * newer duplicate — reassigning any FK references first.
 *
 * Scoped to a single city when DEDUP_CITY env var is set (e.g.
 * DEDUP_CITY="Yellowstone"), otherwise runs across all cities.
 *
 * Safe to re-run: rows without a gp_place_id or with gp_place_id='NOT_FOUND'
 * are ignored. Only rows where gp_place_id is a real Places ID participate.
 *
 * Usage:
 *   DEDUP_CITY="Yellowstone" pnpm --filter @workspace/api-server run dedup:gp-place-id
 *   pnpm --filter @workspace/api-server run dedup:gp-place-id   # all cities
 */

import { db } from "../db.js";
import { stopLibrary } from "@workspace/db";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";

const SCOPE_CITY = process.env.DEDUP_CITY ?? null;

const COLLISION_THRESHOLD_MILES = 0.5;

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8; // Earth radius, miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseCoord(v: string | null): number | null {
  if (v === null) return null;
  const n = parseFloat(v);           // coords are varchar — string parse, same gotcha as gpRating
  return Number.isFinite(n) ? n : null;
}

async function run(): Promise<void> {
  console.log(
    SCOPE_CITY
      ? `[DedupGpPlaceId] Scoped to city: ${SCOPE_CITY}`
      : `[DedupGpPlaceId] Running across ALL cities`
  );

  // Find all gp_place_id values that appear more than once in the same city.
  // Exclude NOT_FOUND sentinels and NULL (unverified) rows.
  const duplicateGroups = await db.execute<{
    gp_place_id: string;
    city: string;
    cnt: number;
  }>(sql`
    SELECT gp_place_id, city, COUNT(*) AS cnt
    FROM stop_library
    WHERE gp_place_id IS NOT NULL
      AND gp_place_id != 'NOT_FOUND'
      ${SCOPE_CITY ? sql`AND LOWER(TRIM(city)) = LOWER(TRIM(${SCOPE_CITY}))` : sql``}
    GROUP BY gp_place_id, city
    HAVING COUNT(*) > 1
    ORDER BY city, gp_place_id
  `);

  const groups = duplicateGroups.rows;

  if (groups.length === 0) {
    console.log(`[DedupGpPlaceId] No duplicate gp_place_id groups found — nothing to do.`);
    process.exit(0);
  }

  console.log(`[DedupGpPlaceId] Found ${groups.length} duplicate group(s). Processing…`);

  let totalDeleted = 0;
  let totalKept = 0;
  let flaggedCollisions = 0;

  for (const group of groups) {
    const { gp_place_id, city, cnt } = group;

    // Fetch all rows for this place_id + city, ordered oldest first.
    const rows = await db
      .select({
        id: stopLibrary.id,
        name: stopLibrary.name,
        createdAt: stopLibrary.createdAt,
        latitude: stopLibrary.latitude,
        longitude: stopLibrary.longitude,
      })
      .from(stopLibrary)
      .where(
        and(
          eq(stopLibrary.gpPlaceId, gp_place_id),
          sql`LOWER(TRIM(${stopLibrary.city})) = LOWER(TRIM(${city}))`
        )
      )
      .orderBy(stopLibrary.createdAt);

    if (rows.length < 2) continue;

    const keeper = rows[0];
    const dupes = rows.slice(1);

    console.log(
      `[DedupGpPlaceId] ${city} | gp_place_id=${gp_place_id} | ${cnt} rows`
    );
    console.log(`  KEEP  : ${keeper.id} — "${keeper.name}"`);

    const kLat = parseCoord(keeper.latitude);
    const kLon = parseCoord(keeper.longitude);

    for (const dupe of dupes) {
      const dLat = parseCoord(dupe.latitude);
      const dLon = parseCoord(dupe.longitude);

      // Coordinate guard. A shared gp_place_id is only a TRUE duplicate if the two rows
      // sit at (nearly) the same spot. Far apart = GP matched one row to the WRONG listing;
      // deleting it would destroy a real, distinct stop. Flag for GP re-fetch, never delete.
      // Also refuse to delete when either side has no usable coords (can't verify → don't risk).
      if (kLat === null || kLon === null || dLat === null || dLon === null) {
        console.warn(`  ⚠️  FLAG (missing coords, NOT deleting): ${dupe.id} — "${dupe.name}"`);
        flaggedCollisions++;
        continue;
      }

      const miles = haversineMiles(kLat, kLon, dLat, dLon);
      if (miles > COLLISION_THRESHOLD_MILES) {
        console.warn(
          `  ⚠️  COLLISION (NOT deleting): ${dupe.id} "${dupe.name}" is ${miles.toFixed(1)}mi from ` +
          `keeper ${keeper.id} "${keeper.name}" — same gp_place_id=${gp_place_id}, different locations. ` +
          `One row has a mismatched Place ID; re-fetch GP for both.`
        );
        flaggedCollisions++;
        continue;
      }

      // Hard-delete the duplicate. FK references in planner_stop_intelligence
      // go through planner_places (joined by name+city), not stop_library.id,
      // so there are no FK cascade concerns here.
      console.log(`  DELETE: ${dupe.id} — "${dupe.name}" (${miles.toFixed(2)}mi from keeper — true dupe)`);
      await db.delete(stopLibrary).where(eq(stopLibrary.id, dupe.id));
      totalDeleted++;
    }

    totalKept++;
  }

  console.log(`\n[DedupGpPlaceId] Complete:`);
  console.log(`  Duplicate groups : ${groups.length}`);
  console.log(`  Rows kept        : ${totalKept} (one per group)`);
  console.log(`  Rows deleted     : ${totalDeleted}`);
  console.log(`  Collisions flagged (NOT deleted) : ${flaggedCollisions}`);
  if (flaggedCollisions > 0) {
    console.log(`\n[DedupGpPlaceId] ⚠️  ${flaggedCollisions} collision(s) flagged — shared gp_place_id, distinct locations. These need GP re-fetch, NOT deletion. Review the COLLISION lines above before scaling to other cities.`);
  }
  console.log(`[DedupGpPlaceId] Next step: run Library PSI Backfill on remaining stops, then floor recompute.`);
}

run().catch((err) => {
  console.error("[DedupGpPlaceId] Fatal:", err);
  process.exit(1);
});
