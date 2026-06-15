/**
 * Backfill explore_cache from stop_library — three age bands per stop.
 *
 * Generates young (age 5), middle (age 8), and older (age 12) story variants
 * so runtime callers can serve age-appropriate content immediately.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:explore
 *
 * Expected runtime: ~1,314 stops × 3 bands × 2.5s = ~165 minutes
 * After completion: set FORCE_REGEN = false
 */

import { db } from '../db.js';
import { stopLibrary } from '@workspace/db';
import { eq, or } from 'drizzle-orm';
import { getExploreContent } from '../exploreContentService.js';
import { upsertExploreCache } from '../storage.js';

const PAUSE_MS   = 2500;
const FORCE_REGEN = true; // set to false after this run completes

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
  console.log(`FORCE_REGEN = ${FORCE_REGEN}`);

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

  const total = stops.length * AGE_BANDS.length;
  console.log(`Total stops: ${stops.length} → ${total} total rows to generate`);

  let generated = 0;
  let failed    = 0;
  const failedItems: string[] = [];

  let rowIndex = 0;
  for (const stop of stops) {
    for (const { band, representativeAge } of AGE_BANDS) {
      rowIndex++;
      try {
        if (rowIndex % 10 === 1) {
          console.log(`[${rowIndex}/${total}] ${band} — ${stop.name} (${stop.city ?? ''})`);
        }

        const gpFacts = {
          gpHours:                stop.gpHours,
          gpRating:               stop.gpRating,
          gpPriceLevel:           stop.gpPriceLevel,
          gpAddressVerified:      stop.gpAddressVerified,
          gpWheelchairAccessible: stop.gpWheelchairAccessible,
          gpPhone:                stop.gpPhone,
          gpWebsite:              stop.gpWebsite,
        };

        const lookupName = stop.normalizedName || stop.name;

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

      if (rowIndex < total) {
        await sleep(PAUSE_MS);
      }
    }
  }

  console.log('\nBackfill complete');
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
