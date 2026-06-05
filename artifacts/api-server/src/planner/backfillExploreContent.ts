/**
 * Backfill explore_cache from stop_library.
 *
 * Canonical cache keyed on (normalizedName, cityGroup) — one row per real-world
 * stop identity, reused across all trips. Run once; idempotent thereafter.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:explore
 *
 * Remove the `if (generated >= 5) break` line after the 5-stop test passes.
 */

import { db } from '../db.js';
import { stopLibrary } from '@workspace/db';
import { eq, or } from 'drizzle-orm';
import { getExploreContent } from '../exploreContentService.js';
import { getExploreCacheByStop, upsertExploreCache } from '../storage.js';

const PAUSE_MS = 2500;

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function backfillExploreContent() {
  console.log('Starting explore_cache backfill from stop_library...');

  const stops = await db
    .select({
      id:       stopLibrary.id,
      name:     stopLibrary.name,
      stopType: stopLibrary.stopType,
      city:     stopLibrary.city,
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

  console.log(`Total stops: ${stops.length}`);

  let skipped   = 0;
  let generated = 0;
  let failed    = 0;
  const failedStops: string[] = [];

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];

    try {
      // Skip if already in explore_cache
      const existing = await getExploreCacheByStop(
        stop.name,
        stop.city ?? '',
      );

      if (existing) {
        skipped++;
        continue;
      }

      if (i % 10 === 0) {
        console.log(
          `[${i + 1}/${stops.length}] Generating: ${stop.name} (${stop.city ?? ''}) — ${generated} done, ${skipped} skipped, ${failed} failed`,
        );
      }

      const content = await getExploreContent(
        stop.name,
        stop.stopType ?? 'attraction',
        stop.city ?? '',
      );

      await upsertExploreCache(
        stop.name,
        stop.city ?? '',
        stop.stopType ?? '',
        content,
      );

      generated++;

    } catch (err) {
      failed++;
      failedStops.push(`${stop.name} (${stop.city ?? ''})`);
      console.error(`Failed: ${stop.name} — ${err}`);
    }

    if (i < stops.length - 1) {
      await sleep(PAUSE_MS);
    }
  }

  console.log('\nBackfill complete');
  console.log(`Generated : ${generated}`);
  console.log(`Skipped   : ${skipped}`);
  console.log(`Failed    : ${failed}`);
  if (failedStops.length > 0) {
    console.log('Failed stops:', failedStops.slice(0, 20).join(', '));
  }
}

backfillExploreContent()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
