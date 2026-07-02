/**
 * One-shot Duluth library seeder.
 *
 * Inserts real Duluth stops into stop_library (hard-coded coords, no AI),
 * enriches storyPack, seeds PSI for the city, and pre-warms the pool so
 * the first trip uses path=POOL rather than AI_FALLBACK.
 *
 * Idempotent: name+normalizedKey dedup means re-running is safe.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run seed:duluth
 *
 * After this script, run the GP backfill scoped to Duluth to fill gpPlaceId:
 *   BACKFILL_CITY=Duluth pnpm --filter @workspace/api-server run backfill:google-places
 */

import { storage } from '../storage.js';
import { enrichStopLibraryIds } from '../planner/stopLibraryEnricher.js';
import { runPsiForCity } from '../planner/psiTrigger.js';
import { generateCityStopPool } from '../planner/plannerService.js';

const CITY    = 'Duluth';
const COUNTRY = 'USA';
const NK      = 'duluth:usa';

const STOPS = [
  // ── Marquee anchors (explicit in brief) ───────────────────────────────────
  { name: 'Canal Park',                            stopType: 'neighborhood', latitude: '46.7802', longitude: '-92.0890' },
  { name: 'Aerial Lift Bridge',                    stopType: 'landmark',     latitude: '46.7793', longitude: '-92.0877' },
  { name: 'Glensheen Mansion',                     stopType: 'landmark',     latitude: '46.8201', longitude: '-92.0427' },
  { name: 'Gooseberry Falls State Park',           stopType: 'waterfall',    latitude: '47.1387', longitude: '-91.4735' },
  { name: 'Enger Tower',                           stopType: 'landmark',     latitude: '46.7936', longitude: '-92.1157' },
  // ── Attractions ───────────────────────────────────────────────────────────
  { name: 'Great Lakes Aquarium',                  stopType: 'aquarium',     latitude: '46.7786', longitude: '-92.0982' },
  { name: 'Lake Superior Maritime Visitor Center', stopType: 'museum',       latitude: '46.7798', longitude: '-92.0882' },
  { name: 'Lake Superior Zoo',                     stopType: 'zoo',          latitude: '46.7211', longitude: '-92.1540' },
  { name: 'Spirit Mountain Recreation Area',       stopType: 'adventure',    latitude: '46.7056', longitude: '-92.2003' },
  { name: "Fitger's Brewery Complex",              stopType: 'landmark',     latitude: '46.7912', longitude: '-92.0817' },
  // ── Parks and nature ──────────────────────────────────────────────────────
  { name: 'Bayfront Festival Park',                stopType: 'park',         latitude: '46.7796', longitude: '-92.1038' },
  { name: 'Park Point Beach (Minnesota Point)',    stopType: 'beach',        latitude: '46.7272', longitude: '-92.0634' },
  { name: 'Leif Erikson Park',                     stopType: 'park',         latitude: '46.8043', longitude: '-92.0765' },
  { name: 'Chester Bowl Park',                     stopType: 'park',         latitude: '46.8100', longitude: '-92.0986' },
  { name: 'Hartley Nature Center',                 stopType: 'nature',       latitude: '46.8344', longitude: '-92.0710' },
] as const;

async function run(): Promise<void> {
  console.log(`[SeedDuluth] === Step 1: insert ${STOPS.length} stops ===`);

  const rows = await storage.saveStopLibraryEntries(
    STOPS.map(s => ({
      name:          s.name,
      city:          CITY,
      country:       COUNTRY,
      normalizedKey: NK,
      stopType:      s.stopType,
      latitude:      s.latitude,
      longitude:     s.longitude,
      source:        'seeded' as const,
    })),
  );

  console.log(`[SeedDuluth] ${rows.length} rows upserted`);
  rows.forEach(r => console.log(`  · ${r.name} (${r.id})`));

  console.log('\n[SeedDuluth] === Step 2: enrich storyPack ===');
  await enrichStopLibraryIds(rows.map(r => r.id));
  console.log('[SeedDuluth] Enrichment complete');

  console.log('\n[SeedDuluth] === Step 3: PSI seeding ===');
  await runPsiForCity(CITY, COUNTRY);
  console.log('[SeedDuluth] PSI complete');

  console.log('\n[SeedDuluth] === Step 4: pre-warm pool ===');
  try {
    const pool = await generateCityStopPool(CITY, COUNTRY);
    const poolArr = Array.isArray(pool) ? pool : [];
    if (poolArr.length > 0) {
      console.log(`[SeedDuluth] Pool pre-warm OK — ${poolArr.length} candidate stops available`);
    } else {
      console.warn('[SeedDuluth] Pool returned empty — check stop_library and PSI data');
    }
  } catch (err) {
    console.error('[SeedDuluth] Pool pre-warm failed (non-fatal — will build on first trip creation):', err);
  }

  console.log('\n[SeedDuluth] Done');
  console.log('  Then: BACKFILL_CITY=Duluth pnpm --filter @workspace/api-server run backfill:google-places');
  console.log('  Then: SELECT count(*), count(gp_place_id) FROM stop_library WHERE city ILIKE \'%duluth%\'');
  console.log('  Then: generate one test trip → confirm [Preview] path=POOL');
}

run().catch(err => {
  console.error('[SeedDuluth] Fatal:', err);
  process.exit(1);
});
