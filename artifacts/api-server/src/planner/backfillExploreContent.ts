/**
 * Backfill journey_packs.explore_data for all travel_stops missing it.
 *
 * NOTE — schema constraint:
 *   journey_packs.stop_id is a FK to travel_stops.id (NOT stop_library.id).
 *   Source is therefore travel_stops (joined to travel_trips for destination).
 *
 * getExploreContent() is a pure function — does NOT write to DB.
 * This script does the explicit upsert via storage functions.
 *
 * Storage functions used (confirmed names in storage.ts):
 *   storage.getJourneyPackByStopId(stopId)
 *   storage.createJourneyPack(packData)
 *   storage.updateJourneyPack(packId, updates)
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:explore
 */

import { db } from '../db.js';
import { travelStops, travelTrips } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { getExploreContent } from '../exploreContentService.js';
import { storage } from '../storage.js';

const PAUSE_MS = 2500;

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function backfillExploreContent() {
  console.log('🚀 Starting explore content backfill...');

  const stops = await db
    .select({
      id:          travelStops.id,
      name:        travelStops.name,
      stopType:    travelStops.stopType,
      cityGroup:   travelStops.cityGroup,
      destination: travelTrips.destination,
    })
    .from(travelStops)
    .innerJoin(travelTrips, eq(travelStops.tripId, travelTrips.id));

  console.log(`📊 Total travel_stops: ${stops.length}`);

  let skipped = 0;
  let generated = 0;
  let failed = 0;
  const failedStops: string[] = [];

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];

    try {
      const existing = await storage.getJourneyPackByStopId(stop.id);

      if (existing?.exploreData) {
        skipped++;
        if (i % 50 === 0) {
          console.log(`[${i + 1}/${stops.length}] Skipped (cached): ${stop.name}`);
        }
        continue;
      }

      if (generated + failed >= 5) break; // REMOVE AFTER TEST

      if (i % 10 === 0) {
        console.log(`[${i + 1}/${stops.length}] Generating: ${stop.name} (${stop.cityGroup ?? stop.destination ?? ''})`);
      }

      const content = await getExploreContent(
        stop.name,
        stop.stopType ?? 'attraction',
        stop.cityGroup ?? stop.destination ?? '',
      );

      if (existing) {
        await storage.updateJourneyPack(existing.id, { exploreData: content as any });
      } else {
        await storage.createJourneyPack({
          stopId:      stop.id,
          exploreData: content as any,
        });
      }

      generated++;

    } catch (err) {
      failed++;
      failedStops.push(`${stop.name} (${stop.cityGroup ?? stop.destination ?? ''})`);
      console.error(`❌ Failed: ${stop.name} — ${err}`);
    }

    await sleep(PAUSE_MS);
  }

  console.log('\n✅ Backfill complete');
  console.log(`   Generated : ${generated}`);
  console.log(`   Skipped   : ${skipped}`);
  console.log(`   Failed    : ${failed}`);
  if (failedStops.length > 0) {
    console.log('   Failed stops (first 20):', failedStops.slice(0, 20).join(', '));
  }
}

backfillExploreContent()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
