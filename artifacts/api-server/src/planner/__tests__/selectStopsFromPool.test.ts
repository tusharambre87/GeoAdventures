/**
 * selectStopsFromPool — zero-stop guard regression tests
 *
 * Two distinct failure modes are covered:
 *
 * 1. ZERO-STOP via Pass-1 exhausting `remaining`
 *    When Pass-1 takes every candidate out of `remaining` (pool size === totalAnchorsNeeded),
 *    the while loop condition `remaining.size > 0` is false and the loop never runs.
 *    The injected anchors are stored in `anchorsByDay` but the day-reset injection block
 *    is INSIDE the while loop — it never fires.  Fill-up also iterates `remaining` which
 *    is empty.  Result: stops=[].  This is the actual zero-stop code path.
 *
 *    The guard added at both pool call-sites throws on stops.length === 0 so the catch
 *    block falls through to AI generation instead of persisting an empty trip.
 *
 * 2. FILL-UP MASKING gates ⑫–⑮ (documented, not fixed here)
 *    When findBest fails to select a filler (e.g. leg-cap fires on a geographically distant
 *    stop), the greedy while loop exits early.  The fill-up block (lines 3501-3510) then
 *    re-adds those same candidates WITHOUT any distance/duration check — the code has a
 *    TODO noting this is deliberate.  Result: correct stop count but potentially wrong
 *    geography.  This test documents the observed behaviour rather than asserting a fix
 *    that hasn't landed.
 *
 * NOTE on St. Louis "46 in pool, 1 generated":
 *    Gates ⑫–⑮ alone cannot explain a near-zero result in the current code — the fill-up
 *    would rescue any remaining candidates without geo checks.  The 1-stop outcome is more
 *    consistent with a pool-cache race condition (task #459's original diagnosis) or with
 *    pool size === totalAnchorsNeeded causing the Pass-1 exhaustion path above.
 */

import { describe, it, expect } from 'vitest';
import { selectStopsFromPool, type PlannerInput } from '../plannerService.js';
import type { CachedStopCandidate } from '@workspace/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCandidate(
  overrides: { name: string; type: string } & Partial<CachedStopCandidate> & Record<string, unknown>,
): CachedStopCandidate {
  return {
    name: overrides.name,
    description: '',
    stopType: overrides.type,
    type: overrides.type,
    durationMinutes: 60,
    effortLevel: 'low',
    indoorOutdoor: 'both',
    sensoryLoad: 'low',
    familyAnchorType: 'support',
    minAge: 0,
    whyNow: '',
    scoreClassicFinal: 55,
    parentSupportData: {
      breakSuggestion: '', foodSuggestion: '', keepGoingSuggestion: '',
      moreFunSuggestion: '', shortenSuggestion: '',
    },
    placeReferenceData: {
      directionsNote: '', openingHours: '', priceRange: '',
      bookingRequired: false, sourceConfidence: 90,
    },
    placeProfileData: {
      whyItWorks: '', bathroomNotes: '', foodOptions: '', parkingNotes: '',
      bestTimeOfDay: '', weatherSensitive: false, strollerFriendly: true,
      nearbyStops: [], practicalTips: [],
    },
    ...overrides,
  } as unknown as CachedStopCandidate;
}

function makeInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    destination: 'TestCity',
    tripDays: 1,
    childrenAges: [8],
    pace: 'moderate',
    stopsPerDayOverride: 3,
    ...overrides,
  } as PlannerInput;
}

// ---------------------------------------------------------------------------
// 1. Zero-stop: Pass-1 exhausts `remaining`
// ---------------------------------------------------------------------------

describe('selectStopsFromPool — zero-stop via Pass-1 exhausting remaining', () => {
  it('returns stops:[] when the pool has exactly 1 anchor and stopsPerDayOverride=1', () => {
    // stopsPerDayOverride=1 → anchorsPerDay = ceil(1*0.5) = 1 → totalAnchorsNeeded = 1
    // Pool has exactly 1 candidate that qualifies for Pass-1:
    //   familyAnchorType='anchor' AND scoreClassicFinal(60) >= 54
    //
    // Pass-1 takes it → remaining.delete() → remaining = {}
    // While loop: remaining.size === 0 → condition false → loop never runs.
    // Day-reset injection block is inside the while loop — it never fires.
    // anchorsByDay has the stop but it never reaches `selected`.
    // Fill-up also iterates `remaining` which is empty → nothing added.
    // selected = [].
    const pool: CachedStopCandidate[] = [
      makeCandidate({
        name: 'Central Park',
        type: 'landmark',
        familyAnchorType: 'anchor',
        scoreClassicFinal: 60,
        latitude: '40.7851',
        longitude: '-73.9683',
      }),
    ];

    const result = selectStopsFromPool(pool, makeInput({ stopsPerDayOverride: 1 }));

    expect(result.stops).toHaveLength(0);
  });

  it('the call-site guard throws on zero stops — simulates the catch→AI-fallback path', () => {
    // This mirrors the guard added at both pool call-sites in plannerService.ts:
    //
    //   if (rawSelectedStops.length === 0) {
    //     throw new Error(`selectStopsFromPool returned 0 stops for "${cityName}" — falling back...`);
    //   }
    //
    // Before this guard, a zero return was indistinguishable from a successful
    // result: insertedStops was [], the function returned { stops: [] }, and
    // the trip was built with no stops and no error surfaced.
    function simulateCaller(pool: CachedStopCandidate[], input: PlannerInput): void {
      const { stops } = selectStopsFromPool(pool, input);
      if (stops.length === 0) {
        throw new Error(
          `selectStopsFromPool returned 0 stops for "${input.destination}" — falling back to AI generation`,
        );
      }
    }

    const singleAnchorPool: CachedStopCandidate[] = [
      makeCandidate({
        name: 'Central Park',
        type: 'landmark',
        familyAnchorType: 'anchor',
        scoreClassicFinal: 60,
        latitude: '40.7851',
        longitude: '-73.9683',
      }),
    ];

    expect(() =>
      simulateCaller(singleAnchorPool, makeInput({ stopsPerDayOverride: 1 })),
    ).toThrow('falling back to AI generation');
  });
});

// ---------------------------------------------------------------------------
// 2. Shortfall / cascading truncation guard
// ---------------------------------------------------------------------------
//
// Root cause (plannerService.ts result-assembly loop):
//
//   for (let day = 1; day <= input.tripDays; day++) {
//     const daySlice = selected.slice(stopIdx, stopIdx + daySize);
//     stopIdx += daySize;
//     if (daySlice.length === 0) break;   ← drops every remaining day
//   }
//
// When pool exhaustion causes any day to come up empty, `break` silently
// drops that day AND every day after it.  A 3-day trip whose pool ran out
// after day 2 returns 4 stops — non-zero, so the old guard (=== 0) would
// not fire, and the trip would be persisted with day 3 blank.
//
// Fix: return `totalStopsNeeded` from selectStopsFromPool and replace the
// === 0 guard at the call site with `< totalStopsNeeded`.
//
// Trade-off (documented here, not resolved here):
//   The new guard causes the entire trip to regenerate via AI when even a
//   single day is short.  A future improvement could supplement only the
//   shortfall and preserve the pool-generated days, but that requires new
//   plumbing (partial AI call + merge step) outside this brief's scope.

describe('selectStopsFromPool — shortfall / cascading truncation', () => {
  it('returns fewer stops than totalStopsNeeded when pool is exhausted before the last day', () => {
    // 3-day trip needing 2 stops/day = totalStopsNeeded 6.
    // Pool has only 4 non-anchor candidates (all 'support' → Pass-1 skips them,
    // remaining={4}, greedy loop exhausts them in 4 iterations).
    //
    // Result-assembly loop:
    //   Day 1: slice(0,2) = [A,B]  → length 2 ✓
    //   Day 2: slice(2,4) = [C,D]  → length 2 ✓
    //   Day 3: slice(4,6) = []     → length 0 → break
    //
    // result.stops.length (4) > 0  → old guard (=== 0) would NOT have fired.
    // result.stops.length (4) < totalStopsNeeded (6) → new guard fires correctly.
    //
    // Landmark/park/nature/viewpoint chosen deliberately: none are in
    // IMMERSIVE_TYPES, so the per-day immersive cap cannot interfere.
    // All at the same coordinates cluster (< 1 km apart) so legCap never fires.
    // Quality gate is skipped for pools with < 10 scored candidates.
    const pool: CachedStopCandidate[] = [
      makeCandidate({ name: 'Landmark A',  type: 'landmark',  familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '40.7580', longitude: '-73.9855' }),
      makeCandidate({ name: 'Park B',      type: 'park',      familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '40.7589', longitude: '-73.9841' }),
      makeCandidate({ name: 'Nature C',    type: 'nature',    familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '40.7596', longitude: '-73.9868' }),
      makeCandidate({ name: 'Viewpoint D', type: 'viewpoint', familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '40.7572', longitude: '-73.9877' }),
    ];

    const result = selectStopsFromPool(
      pool,
      makeInput({ tripDays: 3, stopsPerDayOverride: 2, childrenAges: [7], pace: 'moderate' }),
    );

    // totalStopsNeeded is 3 days × 2 stops/day = 6
    expect(result.totalStopsNeeded).toBe(6);

    // Pool only had 4 valid candidates — result has fewer than the trip needs
    expect(result.stops.length).toBeLessThan(result.totalStopsNeeded);

    // stops.length > 0: the old guard (=== 0) would NOT have caught this shortfall
    expect(result.stops.length).toBeGreaterThan(0);
  });

  it('the updated call-site guard throws on a shortfall, not just on zero stops', () => {
    // Mirrors the guard at plannerService.ts (single-city pool path):
    //
    //   const { stops, totalStopsNeeded } = selectStopsFromPool(...);
    //   if (stops.length < totalStopsNeeded) {
    //     throw new Error(`selectStopsFromPool returned N of M needed stops for "..." — falling back...`);
    //   }
    //
    // Before this change, a 4-of-6 result was indistinguishable from full success:
    // the trip was persisted with days 3+ having zero stops, no error surfaced.
    function simulateCaller(pool: CachedStopCandidate[], input: PlannerInput): void {
      const { stops, totalStopsNeeded } = selectStopsFromPool(pool, input);
      if (stops.length < totalStopsNeeded) {
        throw new Error(
          `selectStopsFromPool returned ${stops.length} of ${totalStopsNeeded} needed stops for "${input.destination}" — falling back to AI generation`,
        );
      }
    }

    const shortPool: CachedStopCandidate[] = [
      makeCandidate({ name: 'Landmark A',  type: 'landmark',  familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '40.7580', longitude: '-73.9855' }),
      makeCandidate({ name: 'Park B',      type: 'park',      familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '40.7589', longitude: '-73.9841' }),
      makeCandidate({ name: 'Nature C',    type: 'nature',    familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '40.7596', longitude: '-73.9868' }),
      makeCandidate({ name: 'Viewpoint D', type: 'viewpoint', familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '40.7572', longitude: '-73.9877' }),
    ];

    expect(() =>
      simulateCaller(shortPool, makeInput({ tripDays: 3, stopsPerDayOverride: 2, childrenAges: [7], pace: 'moderate' })),
    ).toThrow('falling back to AI generation');
  });
});

// ---------------------------------------------------------------------------
// 3. Multi-city leg: per-city totalStopsNeeded and guard scope
// ---------------------------------------------------------------------------
//
// In the multi-city loop (plannerService.ts ~4478) selectStopsFromPool is
// called with cityInput = { ...input, tripDays: daysForCity }, so
// totalStopsNeeded is daysForCity × stopsPerDay — not the full trip total.
//
// The updated guard at the multi-city call site:
//
//   const { stops: cityStops, ..., totalStopsNeeded: cityStopsNeeded }
//     = selectStopsFromPool(pool.stopPool, cityInput, qualityProfile, city);
//   if (cityStops.length < cityStopsNeeded) {
//     throw new Error(`... ${cityStops.length} of ${cityStopsNeeded} needed ...`);
//   }
//
// When the guard fires, the catch at ~4530 handles only that city and falls
// through to per-day AI generation for just that city.  Previous cities that
// completed via `continue` have their stops persisted and are unaffected —
// the trade-off is strictly per-city, not trip-wide.

describe('selectStopsFromPool — multi-city leg: per-city totalStopsNeeded', () => {
  it('totalStopsNeeded equals daysForCity × stopsPerDay, not the full trip length', () => {
    // Simulates a 2-day city leg inside a longer multi-city trip.
    // cityInput has tripDays=2 and stopsPerDayOverride=2 → totalStopsNeeded=4.
    // (A 5-day full trip would have totalStopsNeeded=10 — the result here is
    //  scoped to just these 2 days, confirming the guard is per-city.)
    //
    // Note: we only assert totalStopsNeeded here (the per-city scoping claim).
    // Whether the greedy algorithm fills all 4 slots depends on pool composition
    // and internal caps — tested separately in the shortfall case below.
    const pool: CachedStopCandidate[] = [
      makeCandidate({ name: 'Landmark A', type: 'landmark', familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '38.9072', longitude: '-77.0369' }),
      makeCandidate({ name: 'Park B',     type: 'park',     familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '38.9080', longitude: '-77.0350' }),
      makeCandidate({ name: 'Nature C',   type: 'nature',   familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '38.9065', longitude: '-77.0382' }),
      makeCandidate({ name: 'Viewpoint D', type: 'viewpoint', familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '38.9058', longitude: '-77.0395' }),
    ];

    const cityInput = makeInput({ tripDays: 2, stopsPerDayOverride: 2, childrenAges: [7] });
    const result = selectStopsFromPool(pool, cityInput, undefined, 'Washington DC');

    // Core assertion: totalStopsNeeded is 2 days × 2 stops/day = 4, not a
    // trip-wide number — confirming the guard is scoped to this city leg only.
    expect(result.totalStopsNeeded).toBe(4);
  });

  it('thin pool on a 2-day leg produces a shortfall — guard condition fires', () => {
    // Pool has only 2 candidates for a 2-day × 2-stop leg (totalStopsNeeded=4).
    // Day 1 gets 2 stops; day 2's slice is empty → break.
    // stops.length (2) < totalStopsNeeded (4) → guard fires for this city only.
    const thinPool: CachedStopCandidate[] = [
      makeCandidate({ name: 'Landmark A', type: 'landmark', familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '38.9072', longitude: '-77.0369' }),
      makeCandidate({ name: 'Park B',     type: 'park',     familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '38.9080', longitude: '-77.0350' }),
    ];

    const cityInput = makeInput({ tripDays: 2, stopsPerDayOverride: 2, childrenAges: [7] });
    const result = selectStopsFromPool(thinPool, cityInput, undefined, 'CityB');

    expect(result.totalStopsNeeded).toBe(4);
    expect(result.stops.length).toBeGreaterThan(0);           // old guard (=== 0) would NOT fire
    expect(result.stops.length).toBeLessThan(result.totalStopsNeeded); // new guard fires
  });

  it('multi-city guard throws on shortfall — the catch handles only the deficient city', () => {
    // Mirrors the updated guard at the multi-city call site:
    //
    //   const { stops: cityStops, ..., totalStopsNeeded: cityStopsNeeded }
    //     = selectStopsFromPool(pool.stopPool, cityInput, qualityProfile, city);
    //   if (cityStops.length < cityStopsNeeded) {
    //     throw new Error(`... ${cityStops.length} of ${cityStopsNeeded} needed stops
    //       for multi-city leg "${city}" — falling back to AI generation`);
    //   }
    //
    // The message is checked to confirm the city name and both counts are present,
    // matching the log output used to diagnose production shortfalls.
    function simulateMultiCityGuard(
      pool: CachedStopCandidate[],
      cityInput: PlannerInput,
      cityName: string,
    ): void {
      const { stops: cityStops, totalStopsNeeded: cityStopsNeeded } =
        selectStopsFromPool(pool, cityInput, undefined, cityName);
      if (cityStops.length < cityStopsNeeded) {
        throw new Error(
          `selectStopsFromPool returned ${cityStops.length} of ${cityStopsNeeded} needed stops for multi-city leg "${cityName}" — falling back to AI generation`,
        );
      }
    }

    const thinPool: CachedStopCandidate[] = [
      makeCandidate({ name: 'Landmark A', type: 'landmark', familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '38.9072', longitude: '-77.0369' }),
      makeCandidate({ name: 'Park B',     type: 'park',     familyAnchorType: 'support', scoreClassicFinal: 75, latitude: '38.9080', longitude: '-77.0350' }),
    ];

    const cityInput = makeInput({ tripDays: 2, stopsPerDayOverride: 2, childrenAges: [7] });

    expect(() => simulateMultiCityGuard(thinPool, cityInput, 'CityB'))
      .toThrow(/multi-city leg "CityB"/);
    expect(() => simulateMultiCityGuard(thinPool, cityInput, 'CityB'))
      .toThrow(/falling back to AI generation/);
    // Error message includes both the returned count and the needed count
    expect(() => simulateMultiCityGuard(thinPool, cityInput, 'CityB'))
      .toThrow(/\d+ of \d+ needed/);
  });
});

// ---------------------------------------------------------------------------
// 4. Fill-up masks gates ⑫–⑮ (documents observed behaviour, not a fix)
// ---------------------------------------------------------------------------

describe('selectStopsFromPool — fill-up bypasses geo leg-cap (gates ⑭/⑮)', () => {
  it('adds a geographically distant filler via fill-up after the greedy loop rejects it', () => {
    // Setup:
    //   Anchor: NYC (~40.8, -74.0) — qualifies for Pass-1, injected at day-reset.
    //   Filler: London (~51.5, -0.1) — ~5,571 km away.
    //
    // Greedy loop:
    //   Pass-1 injects the NYC anchor → lastLat/lastLon set to NYC coords.
    //   Slot 1 (dayPosition=1): findBest fires gate ⑭ on the London stop:
    //     legMins = round(5571/35*60) = 9550 >> legCap (25 for 'moderate') → continue.
    //   findBest(true) = null; findBest(false) = null (gate ⑭ not controlled by applyConfidenceGate).
    //   while loop exits with selected = [anchor].
    //
    // Fill-up (lines 3501-3510):
    //   selected.length(1) < totalStopsNeeded(2) → enters.
    //   Iterates `remaining` — London stop is still there (only Pass-1 removes from remaining;
    //   findBest leaving it unselected does NOT remove it).
    //   No museum/nature cap applies to 'landmark' type.
    //   London stop is pushed WITHOUT any distance or travel-time check.
    //   Result: selected = [NYC anchor, London landmark] — 2 stops, geographically nonsensical.
    //
    // This is intentional per the TODO comment on the fill-up:
    //   "Leg-cap and type-diversity are deliberately deferred — they collide with
    //    positional day-slicing and belong in a future post-selection resequencing pass."
    //
    // The zero-stop guard (stops.length === 0) does NOT fire here.
    // The "sparse-but-wrong-geo" failure mode is a separate, unscoped problem.
    const nycAnchor = makeCandidate({
      name: 'Central Park',
      type: 'landmark',
      familyAnchorType: 'anchor',
      scoreClassicFinal: 70,
      latitude: '40.7851',
      longitude: '-73.9683',
      durationMinutes: 120,
    });

    const londonFiller = makeCandidate({
      name: 'Tower of London',
      type: 'landmark',
      familyAnchorType: 'support',
      scoreClassicFinal: 65,
      latitude: '51.5081',
      longitude: '-0.0759',
      durationMinutes: 90,
    });

    const pool: CachedStopCandidate[] = [nycAnchor, londonFiller];

    const result = selectStopsFromPool(
      pool,
      makeInput({ stopsPerDayOverride: 2, tripDays: 1, childrenAges: [8], pace: 'moderate' }),
    );

    // Fill-up produced 2 stops even though the greedy loop rejected the London filler.
    expect(result.stops).toHaveLength(2);

    // Confirm zero-stop guard would NOT have fired.
    expect(result.stops.length).not.toBe(0);

    // Document: the selected result includes both the NYC anchor AND the London
    // stop that failed gate ⑭ — the fill-up adds it without distance checks.
    const names = result.stops.map(s => s.name);
    expect(names).toContain('Central Park');
    expect(names).toContain('Tower of London');
  });
});
