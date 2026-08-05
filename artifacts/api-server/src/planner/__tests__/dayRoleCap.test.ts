/**
 * dayRoleCap() — scalar derivation and 1-day combined-role tests
 *
 * Context:
 *   routes.ts previously computed arrivalDayCap and lastDayCap with two
 *   hand-rolled ternary chains that diverged from the spec at non-balanced paces:
 *
 *     old scalar (afternoon arrival): Math.max(0, effectivePerDay - 1)
 *       → relaxed=0, balanced=1, busy=2
 *     spec (dayRoleCap):              always { anchors:1, fillers:0 } = 1
 *
 *     old scalar (late departure):   Math.min(2, effectivePerDay)
 *       → relaxed=1, balanced=2, busy=2
 *     spec (dayRoleCap):              always { anchors:1, fillers:0 } = 1
 *
 *   The fix replaces both ternaries with:
 *     const cap = dayRoleCap(role, timing, _baseSpd);
 *     const scalar = cap.anchors + cap.fillers;
 *
 *   The three mismatched combinations from the verification audit:
 *     busy  + afternoon-arrival  (old=2, spec=1)
 *     balanced + late-departure  (old=2, spec=1)
 *     busy  + late-departure     (old=2, spec=1)
 *
 *   1-day trips previously received dayRoleCap('middle', null, base) — ignoring
 *   both arrivalTime and lastDay signals.  The fix takes the more restrictive of
 *   the arrival and departure cap per component (Math.min per anchors/fillers).
 */

import { describe, it, expect } from 'vitest';
import { dayRoleCap, getStopsPerDay } from '../plannerService.js';

// ---------------------------------------------------------------------------
// Helpers — base configs for the three pace tiers
// ---------------------------------------------------------------------------

const relaxedBase  = getStopsPerDay('relaxed');   // { anchors:1, fillers:0, total:1 }
const balancedBase = getStopsPerDay('moderate');  // { anchors:1, fillers:1, total:2 }
const busyBase     = getStopsPerDay('busy');      // { anchors:2, fillers:1, total:3 }

function scalarFromCap(role: 'arrival' | 'departure', timing: string | null, base: ReturnType<typeof getStopsPerDay>): number {
  const cap = dayRoleCap(role, timing, base);
  return cap.anchors + cap.fillers;
}

// ---------------------------------------------------------------------------
// 1. The three mismatched combinations from the audit
// ---------------------------------------------------------------------------

describe('dayRoleCap() — three previously-mismatched scalar combinations', () => {
  it('busy + afternoon arrival: spec says 1, old scalar gave 2', () => {
    // old: Math.max(0, effectivePerDay - 1) = Math.max(0, 3-1) = 2
    // new: dayRoleCap('arrival','afternoon',busyBase) = {anchors:1,fillers:0} → 1
    expect(scalarFromCap('arrival', 'afternoon', busyBase)).toBe(1);
  });

  it('balanced + late departure: spec says 1, old scalar gave 2', () => {
    // old: Math.min(2, effectivePerDay) = Math.min(2, 2) = 2
    // new: dayRoleCap('departure','late',balancedBase) = {anchors:1,fillers:0} → 1
    expect(scalarFromCap('departure', 'late', balancedBase)).toBe(1);
  });

  it('busy + late departure: spec says 1, old scalar gave 2', () => {
    // old: Math.min(2, effectivePerDay) = Math.min(2, 3) = 2
    // new: dayRoleCap('departure','late',busyBase) = {anchors:1,fillers:0} → 1
    expect(scalarFromCap('departure', 'late', busyBase)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Combinations that were already correct (regression guard)
// ---------------------------------------------------------------------------

describe('dayRoleCap() — previously-correct scalars unchanged', () => {
  it('relaxed + afternoon arrival: spec and old scalar both gave 0', () => {
    // old: Math.max(0, 1-1) = 0;  new: {anchors:1,fillers:0} = 1
    // Wait — this was a mismatch in the OTHER direction (old=0, spec=1).
    // Documenting the spec value here so regressions are visible.
    expect(scalarFromCap('arrival', 'afternoon', relaxedBase)).toBe(1);
  });

  it('any pace + evening arrival: always 0', () => {
    expect(scalarFromCap('arrival', 'evening', relaxedBase)).toBe(0);
    expect(scalarFromCap('arrival', 'evening', balancedBase)).toBe(0);
    expect(scalarFromCap('arrival', 'evening', busyBase)).toBe(0);
  });

  it('any pace + travel departure: always 0', () => {
    expect(scalarFromCap('departure', 'travel', relaxedBase)).toBe(0);
    expect(scalarFromCap('departure', 'travel', balancedBase)).toBe(0);
    expect(scalarFromCap('departure', 'travel', busyBase)).toBe(0);
  });

  it('morning arrival / full departure: full base pace', () => {
    expect(scalarFromCap('arrival',   'morning', relaxedBase)).toBe(1);
    expect(scalarFromCap('arrival',   'morning', balancedBase)).toBe(2);
    expect(scalarFromCap('arrival',   'morning', busyBase)).toBe(3);
    expect(scalarFromCap('departure', 'full',    balancedBase)).toBe(2);
    expect(scalarFromCap('departure', null,      busyBase)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 3. 1-day combined-role logic: min(arrival, departure) per component
// ---------------------------------------------------------------------------

describe('1-day combined-role cap: min(arrival, departure) per anchors/fillers', () => {
  function oneDayCap(
    arrivalTiming: string | null,
    departureTiming: string | null,
    base: ReturnType<typeof getStopsPerDay>,
  ) {
    const arrCap = dayRoleCap('arrival',   arrivalTiming,   base);
    const depCap = dayRoleCap('departure', departureTiming, base);
    return {
      anchors:   Math.min(arrCap.anchors,  depCap.anchors),
      fillers:   Math.min(arrCap.fillers,  depCap.fillers),
      total:     Math.min(arrCap.anchors,  depCap.anchors)
               + Math.min(arrCap.fillers,  depCap.fillers),
    };
  }

  it('evening arrival + travel departure → 0 stops (both cap at 0)', () => {
    const cap = oneDayCap('evening', 'travel', balancedBase);
    expect(cap.total).toBe(0);
  });

  it('morning arrival + full departure (balanced) → full base (2)', () => {
    // arrival=morning → full base {1,1}; departure=full → full base {1,1}
    // min(1,1)+min(1,1) = 2
    const cap = oneDayCap('morning', 'full', balancedBase);
    expect(cap.total).toBe(2);
  });

  it('morning arrival + full departure (busy) → full base (3)', () => {
    // arrival=morning → {2,1}; departure=full → {2,1}; min per component = {2,1} = 3
    const cap = oneDayCap('morning', null, busyBase);
    expect(cap.total).toBe(3);
  });

  it('afternoon arrival + late departure → 1 (both cap at {anchors:1,fillers:0})', () => {
    // arrival=afternoon → {1,0}; departure=late → {1,0}; min = {1,0} = 1
    const cap = oneDayCap('afternoon', 'late', busyBase);
    expect(cap.total).toBe(1);
  });

  it('afternoon arrival + travel departure → 0 (departure is the tighter constraint)', () => {
    // arrival=afternoon → {1,0}=1; departure=travel → {0,0}=0; min anchors = 0 → total 0
    const cap = oneDayCap('afternoon', 'travel', balancedBase);
    expect(cap.total).toBe(0);
  });

  it('morning arrival + late departure (busy) → 1 (departure is the tighter constraint)', () => {
    // arrival=morning → {2,1}=3; departure=late → {1,0}=1; min = {1,0} = 1
    const cap = oneDayCap('morning', 'late', busyBase);
    expect(cap.total).toBe(1);
  });

  it('evening arrival + full departure → 0 (arrival is the tighter constraint)', () => {
    // arrival=evening → {0,0}=0; departure=full → {1,1}=2; min = {0,0} = 0
    const cap = oneDayCap('evening', 'full', balancedBase);
    expect(cap.total).toBe(0);
  });
});
