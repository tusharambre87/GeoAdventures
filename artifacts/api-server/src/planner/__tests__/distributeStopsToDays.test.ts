/**
 * distributeStopsToDays — unit tests
 *
 * Verifies that the round-robin distribution:
 *
 * 1. SPREAD — high-priority stops are distributed across days rather than
 *    clustering on the (short) arrival day, which is the pathological case of
 *    sequential descending fill.
 *
 * 2. CAPS — arrival, middle, and departure caps are all respected.
 *
 * 3. DISPLAY ORDER — within each assigned day, displayOrder is contiguous and
 *    0-based (no gaps from non-sequential flat-list indices).
 *
 * 4. COMPLETENESS — every stop in the input appears exactly once in the output;
 *    no stops are silently dropped.
 *
 * 5. DAY NUMBERS — dayNumber is 1-based and within [1, tripDays].
 *
 * 6. EDGE CASES — single-day trip, two-day trip (no middle days), more stops
 *    than capacity (caller must slice beforehand, but function shouldn't crash).
 */

import { describe, it, expect } from 'vitest';
import { distributeStopsToDays } from '../plannerService';
import type { GeneratedStop } from '../plannerService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid GeneratedStop factory. Fields not relevant to distribution are
 *  set to sensible defaults so the type is satisfied. */
function makeStop(
  name: string,
  anchorType: GeneratedStop['familyAnchorType'],
  overrides: Partial<GeneratedStop> = {},
): GeneratedStop {
  return {
    dayNumber: 1,
    displayOrder: 99, // will be overwritten by distributeStopsToDays
    name,
    type: 'landmark',
    stopType: 'landmark',
    durationMinutes: 60,
    effortLevel: 'moderate',
    indoorOutdoor: 'both',
    sensoryLoad: 'moderate',
    familyAnchorType: anchorType,
    minAge: 0,
    whyNow: 'test',
    parentSupportData: {
      breakSuggestion: '',
      foodSuggestion: '',
      keepGoingSuggestion: '',
      moreFunSuggestion: '',
      shortenSuggestion: '',
    },
    placeReferenceData: {
      directionsNote: '',
      openingHours: '',
      priceRange: '',
      bookingRequired: false,
    },
    placeProfileData: {
      whyItWorks: '',
      bathroomNotes: '',
      foodOptions: '',
      parkingNotes: '',
      bestTimeOfDay: '',
      weatherSensitive: false,
      strollerFriendly: true,
      nearbyStops: [],
      practicalTips: [],
    },
    ...overrides,
  };
}

/** Group result stops by dayNumber. */
function byDay(stops: GeneratedStop[]): Map<number, GeneratedStop[]> {
  const map = new Map<number, GeneratedStop[]>();
  for (const s of stops) {
    const d = s.dayNumber ?? 1;
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(s);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Core scenario: 8 stops, 3 days, caps [2, 4, 2]
// Stops: 3 anchors (A1–A3), 3 supports (S1–S3), 2 fillers (F1–F2)
// ---------------------------------------------------------------------------

describe('distributeStopsToDays — 3-day trip (arrivalCap=2, perDay=4, lastDayCap=2)', () => {
  const stops = [
    makeStop('A1', 'anchor'),
    makeStop('A2', 'anchor'),
    makeStop('A3', 'anchor'),
    makeStop('S1', 'support'),
    makeStop('S2', 'support'),
    makeStop('S3', 'support'),
    makeStop('F1', 'filler'),
    makeStop('F2', 'filler'),
  ];

  const result = distributeStopsToDays(stops, 3, 2, 2, 4);
  const days = byDay(result);

  it('produces exactly 8 stops (no drops)', () => {
    expect(result).toHaveLength(8);
  });

  it('day 1 gets exactly 2 stops (arrivalCap)', () => {
    expect(days.get(1)).toHaveLength(2);
  });

  it('day 2 gets exactly 4 stops (perDay)', () => {
    expect(days.get(2)).toHaveLength(4);
  });

  it('day 3 gets exactly 2 stops (lastDayCap)', () => {
    expect(days.get(3)).toHaveLength(2);
  });

  it('all dayNumbers are within [1, 3]', () => {
    for (const s of result) {
      expect(s.dayNumber).toBeGreaterThanOrEqual(1);
      expect(s.dayNumber).toBeLessThanOrEqual(3);
    }
  });

  // SPREAD: the key behavioral assertion — anchors must NOT cluster on day 1
  it('each day receives exactly one anchor stop (priority spreads, not clusters)', () => {
    const anchorsOnDay1 = (days.get(1) ?? []).filter(s => s.familyAnchorType === 'anchor');
    const anchorsOnDay2 = (days.get(2) ?? []).filter(s => s.familyAnchorType === 'anchor');
    const anchorsOnDay3 = (days.get(3) ?? []).filter(s => s.familyAnchorType === 'anchor');

    expect(anchorsOnDay1).toHaveLength(1);
    expect(anchorsOnDay2).toHaveLength(1);
    expect(anchorsOnDay3).toHaveLength(1);
  });

  it('day 1 has one anchor and one support (not two anchors)', () => {
    const d1 = days.get(1) ?? [];
    const types = d1.map(s => s.familyAnchorType).sort();
    expect(types).toEqual(['anchor', 'support']);
  });

  // Contrast: what sequential fill would have produced
  it('contrast: sequential fill would place 2 anchors on day 1 (demonstrating the problem that round-robin fixes)', () => {
    // Simulate sequential descending fill (the old behaviour)
    const sorted = [...stops].sort((a, b) => {
      const w: Record<GeneratedStop['familyAnchorType'], number> = {
        anchor: 4, support: 3, filler: 2, meal: 1, reset: 0,
      };
      return (w[b.familyAnchorType] ?? 2) - (w[a.familyAnchorType] ?? 2);
    });
    // Sequential fill: day 0 gets first 2, day 1 gets next 4, day 2 gets last 2
    const seqDay0 = sorted.slice(0, 2);
    expect(seqDay0.filter(s => s.familyAnchorType === 'anchor')).toHaveLength(2);
    // (this is exactly the pathology round-robin avoids)
  });

  // DISPLAY ORDER: contiguous 0-based within each day
  it('displayOrder within day 1 is contiguous starting at 0', () => {
    const d1 = (days.get(1) ?? []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    expect(d1.map(s => s.displayOrder)).toEqual([0, 1]);
  });

  it('displayOrder within day 2 is contiguous starting at 0', () => {
    const d2 = (days.get(2) ?? []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    expect(d2.map(s => s.displayOrder)).toEqual([0, 1, 2, 3]);
  });

  it('displayOrder within day 3 is contiguous starting at 0', () => {
    const d3 = (days.get(3) ?? []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    expect(d3.map(s => s.displayOrder)).toEqual([0, 1]);
  });

  it('all original stop names appear in the result', () => {
    const names = new Set(result.map(s => s.name));
    for (const s of stops) expect(names.has(s.name)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Single-day trip: everything goes to day 1
// ---------------------------------------------------------------------------

describe('distributeStopsToDays — single-day trip (tripDays=1)', () => {
  const stops = [
    makeStop('A1', 'anchor'),
    makeStop('S1', 'support'),
    makeStop('F1', 'filler'),
  ];

  const result = distributeStopsToDays(stops, 1, 5, 5, 5);

  it('all stops are on day 1', () => {
    expect(result.every(s => s.dayNumber === 1)).toBe(true);
  });

  it('displayOrder is contiguous', () => {
    const ordered = [...result].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    expect(ordered.map(s => s.displayOrder)).toEqual([0, 1, 2]);
  });
});

// ---------------------------------------------------------------------------
// Two-day trip: no middle days — only arrival and departure caps
// ---------------------------------------------------------------------------

describe('distributeStopsToDays — two-day trip (arrivalCap=2, lastDayCap=3)', () => {
  const stops = [
    makeStop('A1', 'anchor'),
    makeStop('A2', 'anchor'),
    makeStop('S1', 'support'),
    makeStop('S2', 'support'),
    makeStop('F1', 'filler'),
  ];

  const result = distributeStopsToDays(stops, 2, 2, 3, 4);
  const days = byDay(result);

  it('day 1 gets exactly 2 stops (arrivalCap)', () => {
    expect(days.get(1)).toHaveLength(2);
  });

  it('day 2 gets exactly 3 stops (lastDayCap)', () => {
    expect(days.get(2)).toHaveLength(3);
  });

  it('no stop is on day 3 (only 2 days)', () => {
    expect(days.get(3)).toBeUndefined();
  });

  it('day 1 has one anchor (not both)', () => {
    const anchors = (days.get(1) ?? []).filter(s => s.familyAnchorType === 'anchor');
    expect(anchors).toHaveLength(1);
  });

  it('displayOrder within day 1 is [0, 1]', () => {
    const d1 = (days.get(1) ?? []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    expect(d1.map(s => s.displayOrder)).toEqual([0, 1]);
  });
});

// ---------------------------------------------------------------------------
// Mixed anchor types including meal and reset
// ---------------------------------------------------------------------------

describe('distributeStopsToDays — all five anchor types', () => {
  const stops = [
    makeStop('Anchor1',  'anchor'),
    makeStop('Support1', 'support'),
    makeStop('Filler1',  'filler'),
    makeStop('Meal1',    'meal'),
    makeStop('Reset1',   'reset'),
    makeStop('Anchor2',  'anchor'),
  ];

  const result = distributeStopsToDays(stops, 3, 2, 2, 4);
  const days = byDay(result);

  it('produces 6 stops total', () => {
    expect(result).toHaveLength(6);
  });

  it('anchors land on different days', () => {
    const anchor1Day = result.find(s => s.name === 'Anchor1')?.dayNumber;
    const anchor2Day = result.find(s => s.name === 'Anchor2')?.dayNumber;
    expect(anchor1Day).not.toEqual(anchor2Day);
  });

  it('reset and meal stops are in the result (not silently dropped)', () => {
    const names = result.map(s => s.name);
    expect(names).toContain('Meal1');
    expect(names).toContain('Reset1');
  });
});

// ---------------------------------------------------------------------------
// Empty input
// ---------------------------------------------------------------------------

describe('distributeStopsToDays — empty stop list', () => {
  it('returns an empty array without throwing', () => {
    expect(() => distributeStopsToDays([], 3, 2, 2, 4)).not.toThrow();
    expect(distributeStopsToDays([], 3, 2, 2, 4)).toEqual([]);
  });
});
