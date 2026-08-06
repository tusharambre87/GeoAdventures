/**
 * distributeStopsToDays — unit tests
 *
 * Verifies that the round-robin distribution:
 *
 * 1. SPREAD — high-anchorScore stops spread across days rather than clustering
 *    on the arrival day; this is the pathological case of sequential descending
 *    fill (arrivalCap=2 would consume the top-2 stops of the trip on the day
 *    the family is most constrained and tired from travel).
 *
 * 2. CAPS — arrival, middle, and departure caps are all respected.
 *
 * 3. DISPLAY ORDER — within each assigned day, displayOrder is contiguous and
 *    0-based (no gaps from non-sequential flat-list indices).
 *
 * 4. COMPLETENESS — every stop in the input appears exactly once in the output.
 *
 * 5. DAY NUMBERS — dayNumber is 1-based and within [1, tripDays].
 *
 * 6. EDGE CASES — single-day trip, two-day trip (no middle days), all-absent
 *    anchorScore, empty input.
 *
 * Sort key: anchorScore (numeric 1–5) from travelContent.GeneratedStop.
 * The stops reaching this function come from travelContent.generateCityStops,
 * whose AI prompt explicitly assigns anchorScore ("ANCHOR PROTECTION" section,
 * travelContent.ts line 1316). familyAnchorType (plannerService.GeneratedStop)
 * is from a different AI path and is NOT present on these objects — using it as
 * the sort key produces a no-op sort because every stop's value is undefined.
 */

import { describe, it, expect } from 'vitest';
import { distributeStopsToDays } from '../plannerService';

// ---------------------------------------------------------------------------
// Minimal stop shape — only the fields distributeStopsToDays reads or writes
// ---------------------------------------------------------------------------

interface TestStop {
  name: string;
  dayNumber: number;
  displayOrder: number;
  anchorScore?: number;
}

function makeStop(name: string, anchorScore?: number): TestStop {
  return { name, dayNumber: 1, displayOrder: 99, anchorScore };
}

function byDay(stops: TestStop[]): Map<number, TestStop[]> {
  const map = new Map<number, TestStop[]>();
  for (const s of stops) {
    const d = s.dayNumber;
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(s);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Core scenario: 8 stops, 3 days, caps [2, 4, 2]
// 3 high-priority (anchorScore=5), 3 medium (anchorScore=3), 2 low (anchorScore=1)
// ---------------------------------------------------------------------------

describe('distributeStopsToDays — 3-day trip (arrivalCap=2, perDay=4, lastDayCap=2)', () => {
  const stops: TestStop[] = [
    makeStop('H1', 5),
    makeStop('H2', 5),
    makeStop('H3', 5),
    makeStop('M1', 3),
    makeStop('M2', 3),
    makeStop('M3', 3),
    makeStop('L1', 1),
    makeStop('L2', 1),
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

  // SPREAD: the core behavioral assertion
  it('each day receives exactly one high-priority stop (anchorScore=5 spreads, not clusters)', () => {
    const highOnDay1 = (days.get(1) ?? []).filter(s => s.anchorScore === 5);
    const highOnDay2 = (days.get(2) ?? []).filter(s => s.anchorScore === 5);
    const highOnDay3 = (days.get(3) ?? []).filter(s => s.anchorScore === 5);

    expect(highOnDay1).toHaveLength(1);
    expect(highOnDay2).toHaveLength(1);
    expect(highOnDay3).toHaveLength(1);
  });

  it('day 1 has one score-5 and one score-3 stop (not two score-5)', () => {
    const d1 = days.get(1) ?? [];
    const scores = d1.map(s => s.anchorScore).sort((a, b) => (b ?? 0) - (a ?? 0));
    expect(scores).toEqual([5, 3]);
  });

  // Contrast: what sequential fill would have produced with the same sort
  it('contrast: sequential fill would place 2 score-5 stops on day 1 (demonstrating the pathology round-robin fixes)', () => {
    const sorted = [...stops].sort((a, b) => (b.anchorScore ?? 3) - (a.anchorScore ?? 3));
    // Sequential fill: day 0 takes first 2
    const seqDay0 = sorted.slice(0, 2);
    expect(seqDay0.filter(s => s.anchorScore === 5)).toHaveLength(2);
  });

  // DISPLAY ORDER: contiguous 0-based within each day
  it('displayOrder within day 1 is [0, 1]', () => {
    const d1 = (days.get(1) ?? []).sort((a, b) => a.displayOrder - b.displayOrder);
    expect(d1.map(s => s.displayOrder)).toEqual([0, 1]);
  });

  it('displayOrder within day 2 is [0, 1, 2, 3]', () => {
    const d2 = (days.get(2) ?? []).sort((a, b) => a.displayOrder - b.displayOrder);
    expect(d2.map(s => s.displayOrder)).toEqual([0, 1, 2, 3]);
  });

  it('displayOrder within day 3 is [0, 1]', () => {
    const d3 = (days.get(3) ?? []).sort((a, b) => a.displayOrder - b.displayOrder);
    expect(d3.map(s => s.displayOrder)).toEqual([0, 1]);
  });

  it('all original stop names appear in the result', () => {
    const names = new Set(result.map(s => s.name));
    for (const s of stops) expect(names.has(s.name)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// All anchorScore absent — sort is neutral, distribution still round-robins
// ---------------------------------------------------------------------------

describe('distributeStopsToDays — anchorScore absent on all stops', () => {
  const stops: TestStop[] = [
    makeStop('A'), makeStop('B'), makeStop('C'),
    makeStop('D'), makeStop('E'), makeStop('F'),
  ];

  const result = distributeStopsToDays(stops, 3, 2, 2, 4);
  const days = byDay(result);

  it('produces 6 stops', () => expect(result).toHaveLength(6));

  it('day 1 gets 2 stops', () => expect(days.get(1)).toHaveLength(2));
  it('day 2 gets 2 stops (only 2 remain after day 1 and day 3 take their caps)', () => expect(days.get(2)).toHaveLength(2));
  it('day 3 gets 2 stops', () => expect(days.get(3)).toHaveLength(2));

  it('displayOrder within day 1 is contiguous', () => {
    const d1 = (days.get(1) ?? []).sort((a, b) => a.displayOrder - b.displayOrder);
    expect(d1.map(s => s.displayOrder)).toEqual([0, 1]);
  });
});

// ---------------------------------------------------------------------------
// Single-day trip
// ---------------------------------------------------------------------------

describe('distributeStopsToDays — single-day trip (tripDays=1)', () => {
  const stops: TestStop[] = [
    makeStop('A', 5), makeStop('B', 3), makeStop('C', 1),
  ];

  const result = distributeStopsToDays(stops, 1, 5, 5, 5);

  it('all stops are on day 1', () => {
    expect(result.every(s => s.dayNumber === 1)).toBe(true);
  });

  it('displayOrder is contiguous starting at 0', () => {
    const ordered = [...result].sort((a, b) => a.displayOrder - b.displayOrder);
    expect(ordered.map(s => s.displayOrder)).toEqual([0, 1, 2]);
  });
});

// ---------------------------------------------------------------------------
// Two-day trip (no middle days)
// ---------------------------------------------------------------------------

describe('distributeStopsToDays — two-day trip (arrivalCap=2, lastDayCap=3)', () => {
  const stops: TestStop[] = [
    makeStop('H1', 5), makeStop('H2', 5),
    makeStop('M1', 3), makeStop('M2', 3),
    makeStop('L1', 1),
  ];

  const result = distributeStopsToDays(stops, 2, 2, 3, 4);
  const days = byDay(result);

  it('day 1 gets exactly 2 stops (arrivalCap)', () => {
    expect(days.get(1)).toHaveLength(2);
  });

  it('day 2 gets exactly 3 stops (lastDayCap)', () => {
    expect(days.get(2)).toHaveLength(3);
  });

  it('no stop is on a third day', () => {
    expect(days.get(3)).toBeUndefined();
  });

  it('day 1 has one score-5 stop (not both)', () => {
    const highOnDay1 = (days.get(1) ?? []).filter(s => s.anchorScore === 5);
    expect(highOnDay1).toHaveLength(1);
  });

  it('displayOrder within day 1 is [0, 1]', () => {
    const d1 = (days.get(1) ?? []).sort((a, b) => a.displayOrder - b.displayOrder);
    expect(d1.map(s => s.displayOrder)).toEqual([0, 1]);
  });
});

// ---------------------------------------------------------------------------
// Empty input
// ---------------------------------------------------------------------------

describe('distributeStopsToDays — empty stop list', () => {
  it('returns an empty array without throwing', () => {
    const result = distributeStopsToDays([], 3, 2, 2, 4);
    expect(result).toEqual([]);
  });
});
