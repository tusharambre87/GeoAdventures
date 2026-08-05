/**
 * Stop-to-stop buffer — unit and integration tests
 *
 * Two concerns:
 *
 * 1. stopToStopBufferMins — correct value for every pace alias.
 *
 * 2. selectStopsFromPool integration — per pace tier, a stop that would exactly
 *    fill paceConfig.totalStopMinutes.max without a buffer is rejected once the
 *    buffer counts against that budget, and a shorter stop is selected in its place.
 *
 * Pool pattern for each tier:
 *   First  — highest score, always placed at dayPos=0 (no duration gate fires)
 *   Full   — same effDur as First, score=80; fills the budget to the byte without
 *            a buffer but fails gate ⑫ (dailyDurationMins + bufferMins + effDur > max)
 *   Short  — smaller effDur, score=60; fits even after the buffer is counted
 *
 * With the buffer code the greedy loop places [First, Short] and rejects Full.
 * Short wins the second slot via gate, not via score — this is the key assertion.
 *
 * paceConfig.totalStopMinutes.max by tier (getPaceConfig):
 *   relaxed  → 180 min   buffer → 25 min
 *   moderate → 240 min   buffer → 15 min
 *   busy     → 480 min   buffer → 10 min
 *
 * effectiveDuration(base, youngestChildAge):
 *   childrenAges=[8] → age≥8 → returns base unchanged
 *
 * NOTE on fill-up masking: the fill-up block (after the greedy while loop) does
 * NOT check the duration gate, so if greedy falls short of totalStopsNeeded it
 * would re-add rejected candidates. These tests deliberately size the pool so that
 * a gate-passing Short stop is available, letting greedy reach totalStopsNeeded
 * without needing fill-up, which would otherwise mask the buffer effect.
 */

import { describe, it, expect } from 'vitest';
import {
  selectStopsFromPool,
  stopToStopBufferMins,
  type PlannerInput,
} from '../plannerService.js';
import type { CachedStopCandidate } from '@workspace/db';

// ---------------------------------------------------------------------------
// Helpers (same shape as selectStopsFromPool.test.ts)
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
    childrenAges: [8],        // age ≥ 8 → effectiveDuration returns base unchanged
    pace: 'moderate',
    stopsPerDayOverride: 2,
    ...overrides,
  } as PlannerInput;
}

// ---------------------------------------------------------------------------
// 1. stopToStopBufferMins — unit tests
// ---------------------------------------------------------------------------

describe('stopToStopBufferMins', () => {
  it('returns 25 min for relaxed', () => expect(stopToStopBufferMins('relaxed')).toBe(25));
  it('returns 25 min for chill alias', () => expect(stopToStopBufferMins('chill')).toBe(25));
  it('returns 15 min for moderate', () => expect(stopToStopBufferMins('moderate')).toBe(15));
  it('returns 15 min for balanced (default branch)', () => expect(stopToStopBufferMins('balanced')).toBe(15));
  it('returns 10 min for busy', () => expect(stopToStopBufferMins('busy')).toBe(10));
  it('returns 10 min for packed alias', () => expect(stopToStopBufferMins('packed')).toBe(10));
});

// ---------------------------------------------------------------------------
// 2. Integration — relaxed (max=180, buffer=25)
//
//   First:  effDur=90  → dailyDurationMins=90 after dayPos=0 (no buffer)
//   Full:   effDur=90  → gate: 90 + 25 + 90 = 205 > 180  ✗
//   Short:  effDur=55  → gate: 90 + 25 + 55 = 170 ≤ 180  ✓
// ---------------------------------------------------------------------------

describe('selectStopsFromPool — stop-to-stop buffer (relaxed)', () => {
  const first = makeCandidate({
    name: 'First Stop', type: 'landmark', durationMinutes: 90, scoreClassicFinal: 100,
  });
  const full = makeCandidate({
    name: 'Full Stop', type: 'park', durationMinutes: 90, scoreClassicFinal: 80,
  });
  const short = makeCandidate({
    name: 'Short Stop', type: 'nature', durationMinutes: 55, scoreClassicFinal: 60,
  });

  it('rejects Full (205 min > 180 max with buffer) and selects Short for slot 2', () => {
    const { stops } = selectStopsFromPool(
      [first, full, short],
      makeInput({ pace: 'relaxed', stopsPerDayOverride: 2 }),
    );
    const names = stops.map(s => s.name);
    expect(names).toContain('First Stop');
    expect(names).toContain('Short Stop');
    expect(names).not.toContain('Full Stop');
  });

  it('fills exactly 2 slots via greedy (no fill-up rescue needed)', () => {
    const { stops } = selectStopsFromPool(
      [first, full, short],
      makeInput({ pace: 'relaxed', stopsPerDayOverride: 2 }),
    );
    expect(stops).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 3. Integration — moderate (max=240, buffer=15)
//
//   First:  effDur=120 → dailyDurationMins=120
//   Full:   effDur=120 → gate: 120 + 15 + 120 = 255 > 240  ✗
//   Short:  effDur=100 → gate: 120 + 15 + 100 = 235 ≤ 240  ✓
// ---------------------------------------------------------------------------

describe('selectStopsFromPool — stop-to-stop buffer (moderate)', () => {
  const first = makeCandidate({
    name: 'First Stop', type: 'landmark', durationMinutes: 120, scoreClassicFinal: 100,
  });
  const full = makeCandidate({
    name: 'Full Stop', type: 'park', durationMinutes: 120, scoreClassicFinal: 80,
  });
  const short = makeCandidate({
    name: 'Short Stop', type: 'nature', durationMinutes: 100, scoreClassicFinal: 60,
  });

  it('rejects Full (255 min > 240 max with buffer) and selects Short for slot 2', () => {
    const { stops } = selectStopsFromPool(
      [first, full, short],
      makeInput({ pace: 'moderate', stopsPerDayOverride: 2 }),
    );
    const names = stops.map(s => s.name);
    expect(names).toContain('First Stop');
    expect(names).toContain('Short Stop');
    expect(names).not.toContain('Full Stop');
  });

  it('fills exactly 2 slots via greedy (no fill-up rescue needed)', () => {
    const { stops } = selectStopsFromPool(
      [first, full, short],
      makeInput({ pace: 'moderate', stopsPerDayOverride: 2 }),
    );
    expect(stops).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 4. Integration — busy (max=480, buffer=10)
//
//   Stop1: effDur=120 → dm=120  (dayPos=0, no buffer)
//   Stop2: effDur=120 → 120+10+120=250 ≤ 480  ✓  dm=250
//   Stop3: effDur=120 → 250+10+120=380 ≤ 480  ✓  dm=380
//   Full:  effDur=120 → 380+10+120=510 > 480  ✗
//   Short: effDur=90  → 380+10+90 =480 ≤ 480  ✓  (placed in slot 4 instead of Full)
//
//   Type constraints to watch:
//   - REPEATABLE_NATURE_TYPES = {zoo, aquarium, garden, park, nature}: cap = max(1, ceil(days/2)) = 1
//     for a 1-day trip. Avoid using more than one of these types in the pool.
//   - learningHeavyTypes = {museum, history, culture}: learningLimit = min(maxLearningHeavyStops*days,
//     floor(totalStopsNeeded*0.4)) = min(3, floor(4*0.4)) = min(3,1) = 1 for busy/stopsPerDayOverride=4.
//     Only one learning-heavy stop is allowed. Avoid mixing 'culture'+'history' in the same pool.
//   - IMMERSIVE_TYPES = {museum, zoo, aquarium, activity, palace}: only one heavy-immersive (≥90 min)
//     stop per day. Using a non-immersive type avoids this gate entirely.
//
//   Safe types: landmark, viewpoint, playground, beach, culture (1 OK for busy).
// ---------------------------------------------------------------------------

describe('selectStopsFromPool — stop-to-stop buffer (busy)', () => {
  const stop1 = makeCandidate({
    name: 'Stop One',   type: 'landmark',   durationMinutes: 120, scoreClassicFinal: 100,
  });
  const stop2 = makeCandidate({
    name: 'Stop Two',   type: 'culture',    durationMinutes: 120, scoreClassicFinal: 90,
  });
  const stop3 = makeCandidate({
    name: 'Stop Three', type: 'playground', durationMinutes: 120, scoreClassicFinal: 80,
  });
  const full = makeCandidate({
    name: 'Full Stop',  type: 'viewpoint',  durationMinutes: 120, scoreClassicFinal: 70,
  });
  const short = makeCandidate({
    name: 'Short Stop', type: 'beach',      durationMinutes: 90,  scoreClassicFinal: 60,
  });

  it('places Stop1–3 then rejects Full (510 > 480) and selects Short for slot 4', () => {
    const { stops } = selectStopsFromPool(
      [stop1, stop2, stop3, full, short],
      makeInput({ pace: 'busy', stopsPerDayOverride: 4 }),
    );
    const names = stops.map(s => s.name);
    expect(names).toContain('Stop One');
    expect(names).toContain('Stop Two');
    expect(names).toContain('Stop Three');
    expect(names).toContain('Short Stop');
    expect(names).not.toContain('Full Stop');
  });

  it('fills exactly 4 slots via greedy (no fill-up rescue needed)', () => {
    const { stops } = selectStopsFromPool(
      [stop1, stop2, stop3, full, short],
      makeInput({ pace: 'busy', stopsPerDayOverride: 4 }),
    );
    expect(stops).toHaveLength(4);
  });
});
