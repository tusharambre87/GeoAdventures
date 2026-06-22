/**
 * Backfill explore_cache from stop_library — three age bands per stop.
 *
 * Generates young (age 5), middle (age 8), and older (age 12) story variants
 * so runtime callers can serve age-appropriate content immediately.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:explore
 *
 * Expected runtime: ~1,314 stops × 3 bands × 2.5s / 3 concurrency ≈ 55 minutes
 * After completion: set FORCE_REGEN = false
 */

import { db } from '../db.js';
import { stopLibrary } from '@workspace/db';
import { eq, or } from 'drizzle-orm';
import { getExploreContent } from '../exploreContentService.js';
import { upsertExploreCache } from '../storage.js';

const PAUSE_MS    = 2500;
const CONCURRENCY = 3;
const FORCE_REGEN = false; // set to false after this run completes

// Targeted run: only process these stop IDs (empty = process all)
const TARGET_IDS = new Set([
  'da793b7d-ac25-490f-8ecc-8888537dea20', // Afton State Park
  '91f87a65-9cd4-4453-88c4-f19ccecafd7a', // Historic Murphy's Landing
  '0320d6df-7035-47df-8f16-fb7f5849901f', // Interstate State Park
  'bc148e76-7695-4e2a-8571-0b063d5236ca', // Minnesota Landscape Arboretum
  '9b122427-c2a6-4f87-aae1-401efa968c2a', // Minnesota Zoo
  '99a39bed-8ee2-48c0-b3cd-da17b3ea2633', // Taylors Falls Scenic Boat Tours
  '485eb048-52ba-4e3d-bd20-b24903cfc3df', // Valleyfair Amusement Park
]);

const AGE_BANDS = [
  { band: 'young',  representativeAge: 5  },
  { band: 'middle', representativeAge: 8  },
  { band: 'older',  representativeAge: 12 },
] as const;

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function backfillExploreContent() {
  console.log('Starting explore_cache backfill — 3 age bands per stop...');
  console.log(`FORCE_REGEN = ${FORCE_REGEN}  CONCURRENCY = ${CONCURRENCY}`);

  const stops = await db
    .select({
      id:                     stopLibrary.id,
      name:                   stopLibrary.name,
      normalizedName:         stopLibrary.normalizedName,
      stopType:               stopLibrary.stopType,
      city:                   stopLibrary.city,
      gpHours:                stopLibrary.gpHours,
      gpRating:               stopLibrary.gpRating,
      gpPriceLevel:           stopLibrary.gpPriceLevel,
      gpAddressVerified:      stopLibrary.gpAddressVerified,
      gpWheelchairAccessible: stopLibrary.gpWheelchairAccessible,
      gpPhone:                stopLibrary.gpPhone,
      gpWebsite:              stopLibrary.gpWebsite,
    })
    .from(stopLibrary)
    .where(
      or(
        eq(stopLibrary.country, 'USA'),
        eq(stopLibrary.country, 'United States'),
        eq(stopLibrary.country, 'united states'),
        eq(stopLibrary.country, 'us'),
      ),
    );

  const filtered = TARGET_IDS.size > 0 ? stops.filter(s => TARGET_IDS.has(s.id)) : stops;
  if (TARGET_IDS.size > 0) {
    console.log(`Targeted run: ${filtered.length}/${stops.length} stops selected by TARGET_IDS`);
  }

  const total = filtered.length * AGE_BANDS.length;
  console.log(`Total stops: ${filtered.length} → ${total} total rows to generate`);

  // Build skip-set from existing rows so restarts never re-process completed entries
  const existing = await db.$client.query(
    `SELECT normalized_name, city_group, age_band FROM explore_cache`,
  );
  const skipSet = new Set<string>(
    existing.rows.map((r: { normalized_name: string; city_group: string; age_band: string }) =>
      `${r.normalized_name}|${r.city_group}|${r.age_band}`,
    ),
  );
  console.log(`Skip-set loaded: ${skipSet.size} existing rows will be skipped`);

  // Shared counters — safe to mutate from concurrent tasks in single-threaded JS
  let generated = 0;
  let failed    = 0;
  let skipped   = 0;
  let stopsDone = 0;
  const failedItems: string[] = [];

  async function processStop(stop: typeof stops[number]) {
    const stopNum = ++stopsDone;
    try {
      for (let bi = 0; bi < AGE_BANDS.length; bi++) {
        const { band, representativeAge } = AGE_BANDS[bi];

        const lookupName = stop.normalizedName || stop.name;
        const skipKey    = `${lookupName}|${(stop.city ?? '').toLowerCase().trim()}|${band}`;

        if (skipSet.has(skipKey)) {
          skipped++;
          console.log(`SKIP: ${skipKey}`);
          continue;
        }

        console.log(`[${stopNum}/${filtered.length}] ${band} — ${stop.name} (${stop.city ?? ''})`);

        try {
          const gpFacts = {
            gpHours:                stop.gpHours,
            gpRating:               stop.gpRating,
            gpPriceLevel:           stop.gpPriceLevel,
            gpAddressVerified:      stop.gpAddressVerified,
            gpWheelchairAccessible: stop.gpWheelchairAccessible,
            gpPhone:                stop.gpPhone,
            gpWebsite:              stop.gpWebsite,
          };

          const content = await getExploreContent(
            stop.name,
            stop.stopType ?? 'attraction',
            stop.city ?? '',
            representativeAge,
            gpFacts,
          );

          await upsertExploreCache(
            lookupName,
            stop.city ?? '',
            stop.stopType ?? '',
            content,
            band,
          );

          generated++;

        } catch (err) {
          failed++;
          failedItems.push(`${band}:${stop.name} (${stop.city ?? ''})`);
          console.error(`Failed [${band}] ${stop.name} — ${err}`);
        }

        // Pace each band within a stop to avoid rate-limit spikes
        if (bi < AGE_BANDS.length - 1) {
          await sleep(PAUSE_MS);
        }
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`SKIP_ERROR: ${stop.name} (${stop.city ?? ''}) — ${msg}`);
    }
  }

  // Process stops in chunks of CONCURRENCY — preserves all skip-set logic
  for (let i = 0; i < filtered.length; i += CONCURRENCY) {
    const chunk = filtered.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(stop => processStop(stop)));

    if ((i / CONCURRENCY) % 10 === 9) {
      console.log(`--- Progress: ${stopsDone}/${filtered.length} stops done | generated=${generated} skipped=${skipped} failed=${failed} ---`);
    }
  }

  console.log('\nBackfill complete');
  console.log(`Skipped   : ${skipped}`);
  console.log(`Generated : ${generated}`);
  console.log(`Failed    : ${failed}`);
  if (failedItems.length > 0) {
    console.log('Failed items:', failedItems.slice(0, 20).join(', '));
  }
}

backfillExploreContent()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
