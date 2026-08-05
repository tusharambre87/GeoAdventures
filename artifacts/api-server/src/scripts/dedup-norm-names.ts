/**
 * Dedup stop_library norm-name duplicates — cascade to PSI/planner_places only.
 *
 * Finds stop_library rows that share the same normStopName within a city but have
 * different literal names (parenthetical variants, "The X"/"X", diacritics, etc.).
 *
 * For each duplicate group the KEEPER (highest scoreClassicFinal → gpRatingsTotal
 * → shortest name) is left completely intact. For each LOSER:
 *   - planner_stop_intelligence rows are deleted (FK: psi.place_id → planner_places.id)
 *   - planner_places rows are deleted
 *   - stop_library rows are NOT touched — seeder re-inflation rule; do not break this.
 *
 * After cleanup, city_stop_pool_cache entries for all affected cities are
 * invalidated and regenerated so the new state is immediately visible to the planner.
 *
 * A verification scan is printed at the end: before/after counts for both
 * stop_library dupe groups and pool-cache dup pairs.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run dedup:norm-names
 *   SCOPE_CITY=Nashville pnpm --filter @workspace/api-server run dedup:norm-names
 */

import { db } from "../db.js";
import {
  stopLibrary,
  plannerPlaces,
  plannerStopIntelligence,
  plannerParentSupport,
  plannerPlaceProfiles,
  plannerPlaceReference,
  plannerPlaceRelationships,
  plannerTripPlanStops,
  cityStopPoolCache,
} from "@workspace/db";
import { sql, and, inArray, or } from "drizzle-orm";
import { generateCityStopPool } from "../planner/plannerService.js";
import { storage } from "../storage.js";
import { buildCityPoolKey } from "../cityPoolUtils.js";

const LOG = "[DedupNormNames]";
const SCOPE_CITY = process.env.SCOPE_CITY?.trim() ?? null;

// ── normStopName — keep in sync with selectStopsFromPool in plannerService.ts ─
// This is the canonical dedup key used at trip-generation time.
function normStopName(n: string): string {
  return n
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/^the\s+/, "")
    .replace(/\bunited\s+states\b/g, "us")
    .replace(/\bmount\b/g, "mt")
    .replace(/\bsaint\b/g, "st")
    .replace(/\bof\s+arts?\b/g, "of art")
    .replace(/\s+regional\s+/g, " ")
    .replace(/\s+state\s+park\b/g, "")
    .replace(/\s+national\s+park\b/g, "")
    .replace(/\s+county\s+park\b/g, "")
    .replace(/&/g, "and")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join(" ");
}

// ── Scan helper — returns {poolsWithDupes, totalDupePairs} for the current cache ─
async function scanPoolCache(): Promise<{ poolsWithDupes: number; totalDupePairs: number }> {
  const rows = await db
    .select({
      city: cityStopPoolCache.city,
      stopPool: cityStopPoolCache.stopPool,
    })
    .from(cityStopPoolCache);

  let poolsWithDupes = 0;
  let totalDupePairs = 0;

  for (const row of rows) {
    const stops = Array.isArray(row.stopPool) ? (row.stopPool as { name?: string }[]) : [];
    const seen = new Map<string, string>();
    let pairsThisPool = 0;
    for (const s of stops) {
      const name = s.name;
      if (!name) continue;
      const norm = normStopName(name);
      if (seen.has(norm) && seen.get(norm) !== name) {
        pairsThisPool++;
        totalDupePairs++;
      } else if (!seen.has(norm)) {
        seen.set(norm, name);
      }
    }
    if (pairsThisPool > 0) poolsWithDupes++;
  }

  return { poolsWithDupes, totalDupePairs };
}

// ── Count stop_library norm-name dup groups (stop_library itself is never changed) ─
async function countLibraryDupes(scopeCity: string | null): Promise<number> {
  const rows = await db
    .select({ city: stopLibrary.city, country: stopLibrary.country, name: stopLibrary.name })
    .from(stopLibrary)
    .where(
      scopeCity
        ? sql`LOWER(TRIM(${stopLibrary.city})) = LOWER(TRIM(${scopeCity}))`
        : sql`1=1`,
    );

  const groups = new Map<string, Set<string>>();
  for (const r of rows) {
    const key = `${r.city.toLowerCase().trim()}|${r.country.toLowerCase().trim()}|${normStopName(r.name)}`;
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key)!.add(r.name);
  }
  let count = 0;
  for (const names of groups.values()) {
    if (names.size > 1) count++;
  }
  return count;
}

async function run(): Promise<void> {
  console.log(
    SCOPE_CITY
      ? `${LOG} Scoped to city: ${SCOPE_CITY}`
      : `${LOG} Running across ALL cities`,
  );

  // ── Baseline counts ───────────────────────────────────────────────────────
  const baselineLibDupes = await countLibraryDupes(SCOPE_CITY);
  const baselinePool = await scanPoolCache();
  console.log(`\n${LOG} BASELINE`);
  console.log(`  stop_library normName-dup groups : ${baselineLibDupes}`);
  console.log(`  pool cache pools with dupe pairs : ${baselinePool.poolsWithDupes}`);
  console.log(`  pool cache total dup pairs       : ${baselinePool.totalDupePairs}`);

  // ── 1. Load stop_library rows with PSI scores (via name+city join) ────────
  const loadResult = await db.execute<{
    id: string;
    city: string;
    country: string;
    name: string;
    gp_ratings_total: number | null;
    score_classic_final: number | null;
  }>(sql`
    SELECT
      sl.id,
      sl.city,
      sl.country,
      sl.name,
      sl.gp_ratings_total,
      psi.score_classic_final
    FROM stop_library sl
    LEFT JOIN planner_places pp
      ON LOWER(TRIM(pp.name)) = LOWER(TRIM(sl.name))
     AND LOWER(TRIM(pp.city)) = LOWER(TRIM(sl.city))
    LEFT JOIN planner_stop_intelligence psi ON psi.place_id = pp.id
    ${SCOPE_CITY ? sql`WHERE LOWER(TRIM(sl.city)) = LOWER(TRIM(${SCOPE_CITY}))` : sql``}
    ORDER BY sl.city, sl.name
  `);

  type Row = {
    id: string;
    city: string;
    country: string;
    name: string;
    gp_ratings_total: number | null;
    score_classic_final: number | null;
  };
  const allRows = loadResult.rows as Row[];

  // ── 2. Group by (city, country, normStopName) ─────────────────────────────
  const groups = new Map<string, Row[]>();
  for (const row of allRows) {
    const key = `${row.city.toLowerCase().trim()}|${row.country.toLowerCase().trim()}|${normStopName(row.name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  // ── 3. Collect dup groups (multiple distinct literal names, same normName) ─
  const dupGroups: Row[][] = [];
  for (const group of groups.values()) {
    const distinctNames = new Set(group.map((r) => r.name));
    if (distinctNames.size > 1) dupGroups.push(group);
  }

  if (dupGroups.length === 0) {
    console.log(`\n${LOG} No normName duplicates found — nothing to do.`);
    process.exit(0);
  }

  console.log(`\n${LOG} Found ${dupGroups.length} dup group(s). Processing…`);

  let psiDeleted = 0;
  let placesDeleted = 0;
  let alreadyClean = 0;
  const affectedCityCountry = new Set<string>(); // "city|country" with original casing

  // ── 4. Process each group ─────────────────────────────────────────────────
  for (const group of dupGroups) {
    // Sort: highest scoreClassicFinal → highest gpRatingsTotal → shortest name
    const sorted = [...group].sort((a, b) => {
      const sa = a.score_classic_final ?? -1;
      const sb = b.score_classic_final ?? -1;
      if (sb !== sa) return sb - sa;
      const ga = a.gp_ratings_total ?? -1;
      const gb = b.gp_ratings_total ?? -1;
      if (gb !== ga) return gb - ga;
      return a.name.length - b.name.length;
    });

    const keeper = sorted[0];
    const losers = sorted.slice(1);
    const norm = normStopName(keeper.name);

    console.log(`\n  ${keeper.city} | norm="${norm}"`);
    console.log(
      `    KEEP : "${keeper.name}" (classic=${keeper.score_classic_final ?? "null"}, gp=${keeper.gp_ratings_total ?? "null"})`,
    );

    for (const loser of losers) {
      console.log(
        `    LOSE : "${loser.name}" (classic=${loser.score_classic_final ?? "null"}, gp=${loser.gp_ratings_total ?? "null"})`,
      );

      // Find planner_places rows for this loser by name+city
      const ppRows = await db
        .select({ id: plannerPlaces.id })
        .from(plannerPlaces)
        .where(
          and(
            sql`LOWER(TRIM(${plannerPlaces.name})) = LOWER(TRIM(${loser.name}))`,
            sql`LOWER(TRIM(${plannerPlaces.city})) = LOWER(TRIM(${loser.city}))`,
          ),
        );

      const ppIds = ppRows.map((r) => r.id);

      if (ppIds.length === 0) {
        console.log(`      → No planner_places rows found (already clean or never enriched)`);
        alreadyClean++;
        continue;
      }

      // ── Cascade order: delete/null all FK dependents before planner_places ──
      // 1. planner_stop_intelligence (place_id FK)
      const psiResult = await db
        .delete(plannerStopIntelligence)
        .where(inArray(plannerStopIntelligence.placeId, ppIds));
      psiDeleted += (psiResult as any).rowCount ?? 0;

      // 2. planner_parent_support (place_id FK)
      await db
        .delete(plannerParentSupport)
        .where(inArray(plannerParentSupport.placeId, ppIds));

      // 3. planner_place_profiles (place_id FK)
      await db
        .delete(plannerPlaceProfiles)
        .where(inArray(plannerPlaceProfiles.placeId, ppIds));

      // 4. planner_place_reference (place_id FK)
      await db
        .delete(plannerPlaceReference)
        .where(inArray(plannerPlaceReference.placeId, ppIds));

      // 5. planner_place_relationships (place_id AND related_place_id are both FKs)
      await db
        .delete(plannerPlaceRelationships)
        .where(
          or(
            inArray(plannerPlaceRelationships.placeId, ppIds),
            inArray(plannerPlaceRelationships.relatedPlaceId, ppIds),
          ),
        );

      // 6. planner_trip_plan_stops — place_id is nullable; NULL it out rather than
      //    deleting trip history. The stop name/coords are still on the row, so
      //    existing trips continue to display correctly.
      await db
        .update(plannerTripPlanStops)
        .set({ placeId: null })
        .where(inArray(plannerTripPlanStops.placeId, ppIds));

      // 7. Now safe to delete planner_places
      const ppResult = await db
        .delete(plannerPlaces)
        .where(inArray(plannerPlaces.id, ppIds));
      const ppCount = (ppResult as any).rowCount ?? 0;
      placesDeleted += ppCount;

      const psiCount = (psiResult as any).rowCount ?? 0;
      console.log(`      → Deleted ${psiCount} PSI + ${ppCount} planner_places for "${loser.name}"`);
    }

    affectedCityCountry.add(`${keeper.city}|${keeper.country}`);
  }

  console.log(`\n${LOG} Cleanup: ${psiDeleted} PSI rows, ${placesDeleted} planner_places rows deleted; ${alreadyClean} loser(s) already had no PSI/planner_places`);

  // ── 5. Invalidate pool cache for affected cities ──────────────────────────
  const affectedKeys = [...affectedCityCountry].map((s) => {
    const [city, country] = s.split("|");
    return buildCityPoolKey(city, country);
  });
  const uniqueKeys = [...new Set(affectedKeys)];

  console.log(`\n${LOG} Invalidating ${uniqueKeys.length} pool cache entry/entries…`);
  if (uniqueKeys.length > 0) {
    await db
      .delete(cityStopPoolCache)
      .where(inArray(cityStopPoolCache.normalizedKey, uniqueKeys));
    console.log(`${LOG} Cache entries deleted.`);
  }

  // ── 6. Regenerate pool cache — with normStopName dedup pass after generation ─
  // generateCityStopPool uses normalizePoolKey + gp_place_id dedup, which does not
  // align with normStopName. A third pass here ensures the persisted pool is clean.
  console.log(`\n${LOG} Regenerating pools for ${affectedCityCountry.size} city/country pair(s)…`);
  let poolOk = 0;
  let poolEmpty = 0;
  let poolFailed = 0;

  for (const cityCountry of affectedCityCountry) {
    const [city, country] = cityCountry.split("|");
    try {
      const poolArr = await generateCityStopPool(city, country);
      let arr = Array.isArray(poolArr) ? poolArr : [];

      // ── normStopName dedup pass (Pass 3) ─────────────────────────────────
      // Keep the highest-scoring variant per normName. Mirrors the keeper
      // selection used in Step 4 above.
      const normSeen = new Map<string, typeof arr[number]>();
      for (const stop of arr) {
        const norm = normStopName((stop as any).name ?? "");
        if (!normSeen.has(norm)) {
          normSeen.set(norm, stop);
        } else {
          const existing = normSeen.get(norm)!;
          const eScore: number = (existing as any).scoreClassicFinal ?? -1;
          const nScore: number = (stop as any).scoreClassicFinal ?? -1;
          const eGp: number    = (existing as any).gpRatingsTotal ?? -1;
          const nGp: number    = (stop as any).gpRatingsTotal ?? -1;
          const eName: string  = (existing as any).name ?? "";
          const nName: string  = (stop as any).name ?? "";
          if (
            nScore > eScore ||
            (nScore === eScore && nGp > eGp) ||
            (nScore === eScore && nGp === eGp && nName.length < eName.length)
          ) {
            normSeen.set(norm, stop);
          }
        }
      }
      const beforeCount = arr.length;
      arr = [...normSeen.values()];
      const dropped = beforeCount - arr.length;
      if (dropped > 0) {
        console.log(`    normStopName pass: ${city} dropped ${dropped} dup(s) (${beforeCount} → ${arr.length})`);
      }
      // ── end normStopName pass ─────────────────────────────────────────────

      if (arr.length > 0) {
        await storage.saveCityStopPool({
          city,
          country,
          normalizedKey: buildCityPoolKey(city, country),
          stopPool: arr as any,
        });
        console.log(`  ✓ ${city}, ${country} — ${arr.length} stops`);
        poolOk++;
      } else {
        console.warn(`  ⚠  ${city}, ${country} — pool returned empty (not persisted)`);
        poolEmpty++;
      }
    } catch (err) {
      console.error(`  ✗ ${city}, ${country} — ${(err as Error).message}`);
      poolFailed++;
    }
  }

  console.log(
    `\n${LOG} Pool regeneration: ${poolOk} OK, ${poolEmpty} empty, ${poolFailed} failed`,
  );

  // ── 7. Verification scan ──────────────────────────────────────────────────
  const afterLibDupes = await countLibraryDupes(SCOPE_CITY);
  const afterPool = await scanPoolCache();

  console.log(`\n${LOG} === VERIFICATION ===`);
  console.log(
    `  stop_library normName-dup groups : ${baselineLibDupes} → ${afterLibDupes}  (stop_library untouched — expected unchanged)`,
  );
  console.log(
    `  pool cache pools with dup pairs  : ${baselinePool.poolsWithDupes} → ${afterPool.poolsWithDupes}`,
  );
  console.log(
    `  pool cache total dup pairs       : ${baselinePool.totalDupePairs} → ${afterPool.totalDupePairs}`,
  );

  if (afterPool.totalDupePairs > 0) {
    console.log(
      `\n${LOG} ⚠  ${afterPool.totalDupePairs} dup pair(s) remain in pool cache.` +
        ` These share the same normStopName but have neither a shared gp_place_id` +
        ` nor a matching normalizePoolKey — both variants survived generateCityStopPool's` +
        ` own dedup. The fill-up / must-do gate fix (#488) is still required to prevent` +
        ` them from shipping as duplicates.`,
    );
  } else {
    console.log(`\n${LOG} ✓ Pool cache clean — no normName dups remain.`);
  }

  console.log(`\n${LOG} Done.`);
}

run().catch((err) => {
  console.error(`${LOG} Fatal:`, err);
  process.exit(1);
});
