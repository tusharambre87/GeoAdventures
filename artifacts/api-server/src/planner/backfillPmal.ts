/**
 * Backfill: populate parent_suggestions for trips where the pool path completed
 * but the PMAL write was silently dropped (stale compiled dist or pre-fix throw).
 *
 * Only processes trips where:
 *   - parent_suggestions IS NULL
 *   - A city stop pool exists for the trip's city
 *   - The trip has at least 1 stop (so proximity assignment has something to work with)
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:pmal
 */

import { db } from '../db.js';
import { travelTrips, travelStops, cityStopPoolCache } from '@workspace/db';
import { isNull, sql, eq, and, isNotNull } from 'drizzle-orm';
import { selectStopsFromPool, type PlannerInput, type GeneratedStop } from './plannerService.js';
import { assignSuggestionsByProximity } from './proximityAssignment.js';

async function main() {
  console.log('[PMAL Backfill] Starting…');

  // 1. Fetch all trips where parent_suggestions is NULL
  const trips = await db
    .select({
      id: travelTrips.id,
      city: travelTrips.city,
      travelers: travelTrips.travelers,
      tailoring: travelTrips.tailoring,
      tripDays: travelTrips.tripDays,
      pace: travelTrips.pace,
    })
    .from(travelTrips)
    .where(isNull(travelTrips.parentSuggestions))
    .orderBy(travelTrips.createdAt);

  console.log(`[PMAL Backfill] ${trips.length} trips to process`);

  let updated = 0;
  let skippedNoPool = 0;
  let skippedNoStops = 0;
  let skippedNoSuggestions = 0;
  let errors = 0;

  for (const trip of trips) {
    try {
      const cityName = (trip.city ?? '').toLowerCase().trim();
      if (!cityName) { skippedNoPool++; continue; }

      // 2. Find pool for this city
      const [poolRow] = await db
        .select({ stopPool: cityStopPoolCache.stopPool })
        .from(cityStopPoolCache)
        .where(sql`lower(${cityStopPoolCache.city}) = ${cityName}`)
        .limit(1);

      if (!poolRow || !Array.isArray(poolRow.stopPool) || poolRow.stopPool.length === 0) {
        skippedNoPool++;
        continue;
      }

      // 3. Fetch trip stops (non-meal) to use for proximity assignment
      const stopRows = await db
        .select({
          name: travelStops.name,
          latitude: travelStops.latitude,
          longitude: travelStops.longitude,
          dayIndex: travelStops.dayIndex,
          displayOrder: travelStops.displayOrder,
        })
        .from(travelStops)
        .where(
          and(
            eq(travelStops.tripId, trip.id),
            sql`lower(${travelStops.stopType}) NOT IN ('restaurant','food','cafe','market','meal','dining','eatery')`
          )
        )
        .orderBy(travelStops.dayIndex, travelStops.displayOrder);

      if (stopRows.length === 0) { skippedNoStops++; continue; }

      // 4. Build plannerInput from trip data
      const travelers: Array<{ age: string; isParent: boolean }> = (trip.travelers as any) ?? [];
      const childAges = travelers
        .filter(t => !t.isParent)
        .map(t => parseInt(String(t.age), 10))
        .filter(a => !isNaN(a));
      const tailoring = (trip.tailoring as any) ?? {};
      const tripDays = trip.tripDays ?? 3;

      const plannerInput: PlannerInput = {
        destination: trip.city ?? 'Unknown',
        tripDays,
        childrenAges: childAges,
        pace: (trip.pace ?? 'balanced') as any,
        strollerNeeded: tailoring.stroller ?? false,
        indoorLean: tailoring.indoorOutdoor ?? undefined,
        budgetSensitivity: tailoring.budgetSensitivity ?? undefined,
        kidEnergyLevel: tailoring.kidEnergyLevel ?? undefined,
        interests: (tailoring.interests ?? []).map((i: string) =>
          i.replace(/\s*[^\w\s].*$/, '').trim().toLowerCase()
        ).filter((i: string) => i.length > 0),
      };

      // 5. Run pool selection
      const { stops: selectedStops, parentSuggestions } = selectStopsFromPool(
        poolRow.stopPool as any[],
        plannerInput,
        undefined,
        trip.city ?? undefined,
      );

      if (parentSuggestions.length === 0) {
        skippedNoSuggestions++;
        continue;
      }

      // 6. Convert trip stops to GeneratedStop shape for proximity assignment
      const tripGeneratedStops: GeneratedStop[] = stopRows.map(s => ({
        name: s.name ?? '',
        type: 'landmark',
        stopType: 'landmark',
        dayNumber: (s.dayIndex ?? 0) + 1,
        displayOrder: s.displayOrder ?? 0,
        latitude: s.latitude ? parseFloat(s.latitude) : undefined,
        longitude: s.longitude ? parseFloat(s.longitude) : undefined,
        durationMinutes: 60,
        familyAnchorType: 'support' as const,
        minAge: 0,
      }));

      // 7. Assign suggestions by proximity
      const suggestionsMap = assignSuggestionsByProximity(
        tripGeneratedStops,
        parentSuggestions,
        tripDays,
      );

      // 8. Write to DB
      await db
        .update(travelTrips)
        .set({ parentSuggestions: suggestionsMap as any })
        .where(eq(travelTrips.id, trip.id));

      const daysWithSuggestions = Object.values(suggestionsMap).filter(a => a.length > 0).length;
      console.log(`  ✓ ${trip.city} / ${trip.id.slice(0, 8)} — ${parentSuggestions.length} suggestion(s) across ${daysWithSuggestions} day(s)`);
      updated++;

    } catch (err) {
      console.error(`  ✗ Error processing trip ${trip.id}:`, err);
      errors++;
    }
  }

  console.log(`
[PMAL Backfill] Done.
  Updated:              ${updated}
  Skipped (no pool):    ${skippedNoPool}
  Skipped (no stops):   ${skippedNoStops}
  Skipped (0 suggestions): ${skippedNoSuggestions}
  Errors:               ${errors}
`);
}

main().catch(err => {
  console.error('[PMAL Backfill] Fatal:', err);
  process.exit(1);
});
