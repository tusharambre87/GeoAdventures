/**
 * One-shot: insert 15 new DC stops, enrich them, seed PSI, and generate explore_cache.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:dc-stops
 */

import { storage, getExploreCacheByStop, upsertExploreCache } from '../storage.js';
import { enrichStopLibraryIds } from './stopLibraryEnricher.js';
import { runPsiForCity } from './psiTrigger.js';
import { getExploreContent } from '../exploreContentService.js';

const CITY = 'Washington DC';
const COUNTRY = 'USA';
const NK = 'washington dc:usa';
const PAUSE_MS = 2500;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const NEW_STOPS = [
  { name: 'FDR Memorial',                stopType: 'landmark',     latitude: '38.8832', longitude: '-77.0447' },
  { name: 'Vietnam Veterans Memorial',   stopType: 'landmark',     latitude: '38.8914', longitude: '-77.0476' },
  { name: 'Capitol Building',            stopType: 'landmark',     latitude: '38.8899', longitude: '-77.0091' },
  { name: 'Georgetown Waterfront Park',  stopType: 'park',         latitude: '38.9032', longitude: '-77.0619' },
  { name: 'Theodore Roosevelt Island',   stopType: 'nature',       latitude: '38.8966', longitude: '-77.0626' },
  { name: 'Georgetown',                  stopType: 'neighborhood', latitude: '38.9050', longitude: '-77.0624' },
  { name: 'Dupont Circle',               stopType: 'neighborhood', latitude: '38.9094', longitude: '-77.0432' },
  { name: 'H Street Corridor',           stopType: 'neighborhood', latitude: '38.8996', longitude: '-77.0011' },
  { name: 'National Building Museum',    stopType: 'museum',       latitude: '38.8982', longitude: '-77.0211' },
  { name: 'Discovery Theater',           stopType: 'activity',     latitude: '38.8881', longitude: '-77.0274' },
  { name: "National Children's Museum",  stopType: 'museum',       latitude: '38.8977', longitude: '-77.0196' },
  { name: 'DAR Constitution Hall',       stopType: 'landmark',     latitude: '38.8971', longitude: '-77.0472' },
  { name: 'Kenilworth Aquatic Gardens',  stopType: 'nature',       latitude: '38.9143', longitude: '-76.9441' },
  { name: 'Anacostia Park',              stopType: 'park',         latitude: '38.8696', longitude: '-76.9736' },
  { name: 'East Potomac Park',           stopType: 'park',         latitude: '38.8705', longitude: '-77.0286' },
] as const;

async function run() {
  console.log('[AddDcStops] === Step 1: insert 15 DC stops ===');
  const rows = await storage.saveStopLibraryEntries(
    NEW_STOPS.map(s => ({
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
  console.log(`[AddDcStops] ${rows.length} rows upserted`);

  const ids = rows.map(r => r.id);

  console.log('\n[AddDcStops] === Step 2: enrich (storyPack) ===');
  await enrichStopLibraryIds(ids);
  console.log('[AddDcStops] Enrichment complete');

  console.log('\n[AddDcStops] === Step 3: PSI seeding ===');
  await runPsiForCity('Washington DC', 'USA');
  console.log('[AddDcStops] PSI complete');

  console.log('\n[AddDcStops] === Step 4: explore_cache ===');
  let generated = 0;
  let skipped   = 0;
  let failed    = 0;

  for (let i = 0; i < rows.length; i++) {
    const stop = rows[i];
    try {
      const lookupName = stop.normalizedName || stop.name;
      const existing   = await getExploreCacheByStop(lookupName, stop.city ?? '');
      if (existing) { skipped++; continue; }

      const content = await getExploreContent(
        stop.name,
        stop.stopType ?? 'attraction',
        stop.city ?? '',
      );
      await upsertExploreCache(lookupName, stop.city ?? '', stop.stopType ?? '', content);
      generated++;
      console.log(`[AddDcStops] explore_cache generated: ${stop.name}`);
    } catch (err) {
      failed++;
      console.error(`[AddDcStops] explore_cache failed: ${stop.name} — ${err}`);
    }
    if (i < rows.length - 1) await sleep(PAUSE_MS);
  }

  console.log(`\n[AddDcStops] explore_cache: ${generated} generated, ${skipped} skipped, ${failed} failed`);
  console.log('[AddDcStops] Done.');
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[AddDcStops] Fatal:', err);
    process.exit(1);
  });
