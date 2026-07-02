/**
 * One-shot Split Rock Lighthouse seeder.
 *
 * Inserts Split Rock Lighthouse State Park into stop_library as a support-tier
 * Duluth stop — NOT an anchor competitor. Enriches storyPack, seeds PSI, and
 * rebuilds the pool so Duluth generates via path=POOL with 16 stops.
 *
 * Idempotent: name+normalizedKey dedup means re-running is safe.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run seed:split-rock
 *
 * After this script, run the GP backfill scoped to Duluth to fill gpPlaceId:
 *   BACKFILL_CITY=Duluth pnpm --filter @workspace/api-server run backfill:google-places
 */

import { pool as dbPool } from '../db.js';
import { storage } from '../storage.js';
import { enrichStopLibraryIds } from '../planner/stopLibraryEnricher.js';
import { runPsiForCity } from '../planner/psiTrigger.js';
import { generateCityStopPool } from '../planner/plannerService.js';

const CITY    = 'Duluth';
const COUNTRY = 'USA';
const NK      = 'duluth:usa';

// Real coordinates for Split Rock Lighthouse State Park, Two Harbors, MN
// 47.1995°N, 91.3669°W — verified against USGS/NPS records
// stop_type=viewpoint (not landmark) so anchorTypeByStopType returns 'support', not 'anchor'
const STOP = {
  name:      'Split Rock Lighthouse',
  stopType:  'viewpoint' as const,
  latitude:  '47.1995',
  longitude: '-91.3669',
};

async function run(): Promise<void> {
  console.log('[SeedSplitRock] === Step 1: insert Split Rock Lighthouse ===');

  const rows = await storage.saveStopLibraryEntries([
    {
      name:          STOP.name,
      city:          CITY,
      country:       COUNTRY,
      normalizedKey: NK,
      stopType:      STOP.stopType,
      latitude:      STOP.latitude,
      longitude:     STOP.longitude,
      source:        'seeded' as const,
    },
  ]);

  console.log(`[SeedSplitRock] ${rows.length} row upserted`);
  rows.forEach(r => console.log(`  · ${r.name} (${r.id})`));

  const stopId = rows[0]?.id;
  if (!stopId) throw new Error('No row returned from saveStopLibraryEntries');

  // Explicitly set family_anchor_type = 'support' in planner_places (overrides any
  // anchorTypeByStopType fallback that would promote landmark → anchor).
  // This must happen BEFORE the pool rebuild so the JSONB anchor type is correct.
  const existing = await dbPool.query(
    `SELECT id FROM planner_places WHERE name = $1 AND city ILIKE '%duluth%'`,
    [STOP.name],
  );
  if (existing.rows.length > 0) {
    await dbPool.query(
      `UPDATE planner_places SET family_anchor_type = 'support' WHERE name = $1 AND city ILIKE '%duluth%'`,
      [STOP.name],
    );
    console.log('[SeedSplitRock] planner_places.family_anchor_type set to support (existing row)');
  }

  console.log('\n[SeedSplitRock] === Step 2: enrich storyPack ===');
  await enrichStopLibraryIds([stopId]);
  console.log('[SeedSplitRock] Enrichment complete');

  // Set support again after enrichment in case enricher upserted a planner_places row
  await dbPool.query(
    `UPDATE planner_places SET family_anchor_type = 'support' WHERE name = $1 AND city ILIKE '%duluth%'`,
    [STOP.name],
  );
  console.log('[SeedSplitRock] planner_places.family_anchor_type confirmed support (post-enrich)');

  console.log('\n[SeedSplitRock] === Step 3: PSI seeding ===');
  await runPsiForCity(CITY, COUNTRY);
  console.log('[SeedSplitRock] PSI complete');

  // Set support one more time after PSI (psiTrigger may upsert planner_places rows)
  await dbPool.query(
    `UPDATE planner_places SET family_anchor_type = 'support' WHERE name = $1 AND city ILIKE '%duluth%'`,
    [STOP.name],
  );
  console.log('[SeedSplitRock] planner_places.family_anchor_type confirmed support (post-PSI)');

  console.log('\n[SeedSplitRock] === Step 4: rebuild pool ===');
  // Invalidate, regenerate, and PERSIST to city_stop_pool_cache
  await dbPool.query(`DELETE FROM city_stop_pool_cache WHERE normalized_key = 'duluth:usa'`);
  try {
    const poolArr = await generateCityStopPool(CITY, COUNTRY);
    const arr = Array.isArray(poolArr) ? poolArr : [];
    if (arr.length > 0) {
      // Persist to DB so getCityStopPool finds the row on the next trip generation
      await storage.saveCityStopPool({
        city: CITY,
        country: COUNTRY,
        normalizedKey: 'duluth:usa',
        stopPool: arr as any,
      });
      console.log(`[SeedSplitRock] Pool rebuild OK — ${arr.length} stops persisted`);
      arr.forEach((s: any) => console.log(`  · ${s.name} (${s.familyAnchorType})`));
    } else {
      console.warn('[SeedSplitRock] Pool returned empty — check stop_library and PSI data');
    }
  } catch (err) {
    console.error('[SeedSplitRock] Pool rebuild failed (non-fatal):', err);
  }

  console.log('\n[SeedSplitRock] Done');
  console.log('  Next: BACKFILL_CITY=Duluth pnpm --filter @workspace/api-server run backfill:google-places');
  console.log('  Then: SELECT name, stop_type, family_anchor_type, gp_place_id FROM stop_library WHERE name ILIKE \'%split rock%\'');
}

run().catch(err => {
  console.error('[SeedSplitRock] Fatal:', err);
  process.exit(1);
});
