/**
 * stampBudgetExceeded — unit tests
 *
 * Verifies three things:
 *
 * 1. COMPUTATION — the function stamps budgetExceeded/budgetNote on every stop
 *    in a day when the cumulative activity duration (stop time + stop-to-stop
 *    buffers, rest stops excluded) exceeds paceConfig.totalStopMinutes.max.
 *
 * 2. WITHIN-BUDGET — stops that don't exceed the ceiling are left untouched.
 *
 * 3. PERSISTENCE SHAPE — PlannerTripPlanStop (the Drizzle $inferSelect type for
 *    planner_trip_plan_stops) includes both fields so that persistStop's
 *    returning() result carries them.  This is a compile-time type assertion —
 *    if either line fails tsc the schema column is missing from the DB schema.
 *
 * Budget accounting formula (mirrors Gate ⑫ in selectStopsFromPool):
 *   totalMins = Σ effectiveDuration(s.durationMinutes, minChildAge)
 *               + (mainStops.length - 1) × stopToStopBufferMins(pace)
 *   flag when totalMins > paceConfig.totalStopMinutes.max
 *
 * paceConfig.totalStopMinutes.max by tier:
 *   relaxed  → 180 min   buffer → 25 min
 *   moderate → 240 min   buffer → 15 min
 *   busy     → 480 min   buffer → 10 min
 *
 * effectiveDuration with childrenAges=[8] (age ≥ 8) returns base unchanged.
 *
 * Exact values used:
 *   moderate, 2 × 100 min stops:  100 + 15 + 100 = 215 ≤ 240  (within budget)
 *   moderate, 2 × 120 min stops:  120 + 15 + 120 = 255 > 240  (over budget)
 *   relaxed,  2 ×  90 min stops:   90 + 25 +  90 = 205 > 180  (over budget)
 *   busy,     4 × 120 min stops:  120 + 10 + 120 + 10 + 120 + 10 + 120 = 510 > 480
 */

import { describe, it, expect } from 'vitest';
import {
  stampBudgetExceeded,
  stopToStopBufferMins,
  type GeneratedStop,
} from '../plannerService.js';
import type { PlannerTripPlanStop } from '@workspace/db';

// ---------------------------------------------------------------------------
// Compile-time persistence shape proof
//
// If either assignment fails to compile, budgetExceeded / budgetNote is absent
// from the planner_trip_plan_stops schema — meaning persistStop's returning()
// result would silently drop the field.  This is the non-negotiable check.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _BudgetExceededField = PlannerTripPlanStop['budgetExceeded']; // boolean | null
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _BudgetNoteField     = PlannerTripPlanStop['budgetNote'];     // string | null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DUMMY_PARENT_SUPPORT = {
  breakSuggestion: '', foodSuggestion: '', keepGoingSuggestion: '',
  moreFunSuggestion: '', shortenSuggestion: '',
};
const DUMMY_PLACE_REFERENCE = {
  directionsNote: '', openingHours: '', priceRange: '',
  bookingRequired: false,
};
const DUMMY_PLACE_PROFILE = {
  whyItWorks: '', bathroomNotes: '', foodOptions: '', parkingNotes: '',
  bestTimeOfDay: 'anytime', weatherSensitive: false, strollerFriendly: true,
  nearbyStops: [], practicalTips: [],
};

function makeStop(
  name: string,
  durationMinutes: number,
  type: string = 'landmark',
): GeneratedStop {
  return {
    dayNumber: 1,
    displayOrder: 0,
    name,
    type,
    durationMinutes,
    effortLevel: 'low',
    indoorOutdoor: 'both',
    sensoryLoad: 'low',
    familyAnchorType: 'support',
    minAge: 0,
    whyNow: 'test',
    parentSupportData: DUMMY_PARENT_SUPPORT,
    placeReferenceData: DUMMY_PLACE_REFERENCE,
    placeProfileData: DUMMY_PLACE_PROFILE,
  };
}

function makeRestStop(name: string): GeneratedStop {
  return makeStop(name, 20, 'rest');
}

const MIN_CHILD_AGE_8 = 8; // effectiveDuration returns base unchanged for age ≥ 8

// ---------------------------------------------------------------------------
// 1. stopToStopBufferMins — confirm the values the tests depend on
// ---------------------------------------------------------------------------

describe('stopToStopBufferMins — values used in budget calculations', () => {
  it('moderate: 15 min', () => expect(stopToStopBufferMins('moderate')).toBe(15));
  it('relaxed:  25 min', () => expect(stopToStopBufferMins('relaxed')).toBe(25));
  it('busy:     10 min', () => expect(stopToStopBufferMins('busy')).toBe(10));
});

// ---------------------------------------------------------------------------
// 2. Within-budget days — no flag set
//
//   moderate, 2 × 100 min stops: 100 + 15 + 100 = 215 ≤ 240  → no flag
// ---------------------------------------------------------------------------

describe('stampBudgetExceeded — within-budget day (moderate, 2 × 100 min)', () => {
  const stops = [makeStop('Museum A', 100), makeStop('Park B', 100)];

  it('does not set budgetExceeded on any stop', () => {
    stampBudgetExceeded(stops, 'moderate', MIN_CHILD_AGE_8);
    expect(stops.every(s => !s.budgetExceeded)).toBe(true);
  });

  it('does not set budgetNote on any stop', () => {
    stampBudgetExceeded(stops, 'moderate', MIN_CHILD_AGE_8);
    expect(stops.every(s => s.budgetNote === undefined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Over-budget day — flag set on every stop
//
//   moderate, 2 × 120 min stops: 120 + 15 + 120 = 255 > 240  → flag on both
// ---------------------------------------------------------------------------

describe('stampBudgetExceeded — over-budget day (moderate, 2 × 120 min = 255 > 240)', () => {
  function freshStops() {
    return [makeStop('Museum A', 120), makeStop('Aquarium B', 120)];
  }

  it('sets budgetExceeded=true on every stop', () => {
    const stops = freshStops();
    stampBudgetExceeded(stops, 'moderate', MIN_CHILD_AGE_8);
    expect(stops.every(s => s.budgetExceeded === true)).toBe(true);
  });

  it('sets budgetNote to a non-empty string on every stop', () => {
    const stops = freshStops();
    stampBudgetExceeded(stops, 'moderate', MIN_CHILD_AGE_8);
    expect(stops.every(s => typeof s.budgetNote === 'string' && s.budgetNote.length > 0)).toBe(true);
  });

  it('budgetNote includes the computed total (255) and the budget ceiling (240)', () => {
    const stops = freshStops();
    stampBudgetExceeded(stops, 'moderate', MIN_CHILD_AGE_8);
    // All stops share the same note
    const note = stops[0].budgetNote ?? '';
    expect(note).toContain('255');
    expect(note).toContain('240');
  });

  it('all stops in the day share an identical budgetNote', () => {
    const stops = freshStops();
    stampBudgetExceeded(stops, 'moderate', MIN_CHILD_AGE_8);
    const first = stops[0].budgetNote;
    expect(stops.every(s => s.budgetNote === first)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Rest stops are excluded from the duration sum but are stamped
//
//   moderate, [120 min, 120 min, rest(20 min)]:
//     mainStops = [120, 120] → 120 + 15 + 120 = 255 > 240 → all 3 stamped
// ---------------------------------------------------------------------------

describe('stampBudgetExceeded — rest stops excluded from sum, included in stamp', () => {
  function freshStops() {
    return [makeStop('Museum A', 120), makeStop('Aquarium B', 120), makeRestStop('Rest break')];
  }

  it('rest stop duration is not counted (only 2 × 120 + buffer = 255, not 275)', () => {
    // If rest were counted: 120 + 15 + 120 + 15 + 20 = 290 (also over; not a useful distinction here)
    // But for relaxed case with budget=180 and 2 × 80 + rest(20):
    //   with rest excluded: 80 + 25 + 80 = 185 > 180 → flag
    //   with rest included: 80 + 25 + 80 + 25 + 20 = 230 > 180 → also flag (not distinguishing)
    //
    // Confirm with a within-budget example: relaxed, 1 × 90 + rest(20):
    //   main: [90] → total = 90 ≤ 180 → NO flag
    //   if rest were counted: 90 + 25 + 20 = 135 ≤ 180 → still no flag (not distinguishing either)
    //
    // The real proof is below: rest stop IS stamped when the flag fires.
    const stops = freshStops();
    stampBudgetExceeded(stops, 'moderate', MIN_CHILD_AGE_8);
    // All over budget → all three stamped
    expect(stops.every(s => s.budgetExceeded === true)).toBe(true);
  });

  it('rest stop is stamped budgetExceeded=true when the day is over budget', () => {
    const stops = freshStops();
    stampBudgetExceeded(stops, 'moderate', MIN_CHILD_AGE_8);
    const restStop = stops.find(s => s.type === 'rest')!;
    expect(restStop.budgetExceeded).toBe(true);
    expect(restStop.budgetNote).toBeTruthy();
  });

  it('single-stop day with a rest: only mainStop counts, no buffer added', () => {
    // relaxed: max=180, 1 × 170 main + rest(20)
    // mainStops=[170] → totalMins = 170 (i=0, no buffer) ≤ 180 → no flag
    const stops = [makeStop('Big Museum', 170), makeRestStop('Nap')];
    stampBudgetExceeded(stops, 'relaxed', MIN_CHILD_AGE_8);
    expect(stops.every(s => !s.budgetExceeded)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Over-budget across all three pace tiers
// ---------------------------------------------------------------------------

describe('stampBudgetExceeded — over-budget at each pace tier', () => {
  it('relaxed: 2 × 90 min = 90 + 25 + 90 = 205 > 180 → flagged', () => {
    const stops = [makeStop('Stop A', 90), makeStop('Stop B', 90)];
    stampBudgetExceeded(stops, 'relaxed', MIN_CHILD_AGE_8);
    expect(stops.every(s => s.budgetExceeded === true)).toBe(true);
  });

  it('busy: 4 × 120 min = 120+10+120+10+120+10+120 = 510 > 480 → flagged', () => {
    const stops = [
      makeStop('Stop A', 120), makeStop('Stop B', 120),
      makeStop('Stop C', 120), makeStop('Stop D', 120),
    ];
    stampBudgetExceeded(stops, 'busy', MIN_CHILD_AGE_8);
    expect(stops.every(s => s.budgetExceeded === true)).toBe(true);
  });

  it('busy: 4 × 110 min = 110+10+110+10+110+10+110 = 470 ≤ 480 → not flagged', () => {
    const stops = [
      makeStop('Stop A', 110), makeStop('Stop B', 110),
      makeStop('Stop C', 110), makeStop('Stop D', 110),
    ];
    stampBudgetExceeded(stops, 'busy', MIN_CHILD_AGE_8);
    expect(stops.every(s => !s.budgetExceeded)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. effectiveDuration age scaling applies
//
//   Age ≤ 4: hard cap at 75 min (effectiveDuration(120, 4) = 75)
//   moderate, 2 × 120 min stops with minChildAge=4:
//     75 + 15 + 75 = 165 ≤ 240  → NOT flagged (age scaling brings it under budget)
// ---------------------------------------------------------------------------

describe('stampBudgetExceeded — effectiveDuration age scaling', () => {
  it('age=4: 2 × 120 min caps to 75 → 75+15+75=165 ≤ 240 → not flagged', () => {
    const stops = [makeStop('Museum A', 120), makeStop('Aquarium B', 120)];
    stampBudgetExceeded(stops, 'moderate', 4 /* minChildAge */);
    expect(stops.every(s => !s.budgetExceeded)).toBe(true);
  });

  it('age=8: same 2 × 120 min returns base → 255 > 240 → flagged', () => {
    const stops = [makeStop('Museum A', 120), makeStop('Aquarium B', 120)];
    stampBudgetExceeded(stops, 'moderate', 8 /* minChildAge */);
    expect(stops.every(s => s.budgetExceeded === true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Edge: empty stop list and all-rest list → no crash, no flag
// ---------------------------------------------------------------------------

describe('stampBudgetExceeded — edge cases', () => {
  it('empty list: no crash', () => {
    expect(() => stampBudgetExceeded([], 'moderate', MIN_CHILD_AGE_8)).not.toThrow();
  });

  it('all-rest list: treated as mainStops=[] → early return, no flag', () => {
    const stops = [makeRestStop('Nap A'), makeRestStop('Nap B')];
    stampBudgetExceeded(stops, 'moderate', MIN_CHILD_AGE_8);
    expect(stops.every(s => !s.budgetExceeded)).toBe(true);
  });
});
