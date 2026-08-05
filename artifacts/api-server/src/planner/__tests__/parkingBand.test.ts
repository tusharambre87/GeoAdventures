/**
 * parkingBandFromScore() — PSI parking score → text band
 *
 * Context:
 *   Brief 3 wired parkingAvailabilityScore (a 0–100 PSI integer) to the
 *   enrichment.parkingNotes field shown on the at-stop screen.  The banding
 *   was originally inlined at two call sites in routes.ts.  It is now
 *   extracted to parkingBandFromScore() in plannerService.ts so it can be
 *   tested deterministically — the same motivation as dayRoleCap.test.ts.
 *
 * Priority chain (enforced at call sites, not here):
 *   AI output > explore_cache.parkingInfo > PSI band > unchanged
 *
 * Bands shipped:
 *   ≥70  → "Parking is generally available nearby"
 *   40–69 → "Parking may be limited"
 *   <40   → "Parking can be difficult to find"
 *   null  → null (caller leaves parkingNotes unchanged — falls through to "—")
 */

import { describe, it, expect } from 'vitest';
import { parkingBandFromScore } from '../plannerService.js';

// ---------------------------------------------------------------------------
// 1. null input
// ---------------------------------------------------------------------------

describe('parkingBandFromScore() — null input', () => {
  it('returns null for null score so call sites leave parkingNotes untouched', () => {
    expect(parkingBandFromScore(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Band membership
// ---------------------------------------------------------------------------

describe('parkingBandFromScore() — band membership', () => {
  it('score ≥70 → generally available', () => {
    expect(parkingBandFromScore(70)).toBe('Parking is generally available nearby');
    expect(parkingBandFromScore(85)).toBe('Parking is generally available nearby');
    expect(parkingBandFromScore(100)).toBe('Parking is generally available nearby');
  });

  it('score 40–69 → may be limited', () => {
    expect(parkingBandFromScore(40)).toBe('Parking may be limited');
    expect(parkingBandFromScore(55)).toBe('Parking may be limited');
    expect(parkingBandFromScore(69)).toBe('Parking may be limited');
  });

  it('score <40 → difficult to find', () => {
    expect(parkingBandFromScore(39)).toBe('Parking can be difficult to find');
    expect(parkingBandFromScore(20)).toBe('Parking can be difficult to find');
    expect(parkingBandFromScore(0)).toBe('Parking can be difficult to find');
  });
});

// ---------------------------------------------------------------------------
// 3. Boundary values (≥70 and 40 are the two cutpoints)
// ---------------------------------------------------------------------------

describe('parkingBandFromScore() — boundary values', () => {
  it('70 is the lower bound of the top band (≥70)', () => {
    expect(parkingBandFromScore(70)).toBe('Parking is generally available nearby');
    expect(parkingBandFromScore(69)).toBe('Parking may be limited');
  });

  it('40 is the lower bound of the middle band (40–69)', () => {
    expect(parkingBandFromScore(40)).toBe('Parking may be limited');
    expect(parkingBandFromScore(39)).toBe('Parking can be difficult to find');
  });
});

// ---------------------------------------------------------------------------
// 4. Priority-chain guard (simulates both call sites)
// ---------------------------------------------------------------------------

describe('parkingBandFromScore() — priority-chain guard', () => {
  it('PSI band is skipped when explore_cache already set parkingNotes', () => {
    // Simulates: if (!enrich.parkingNotes && _psiBand !== null) { ... }
    const existingNote = 'Street parking available on Main St';
    const psiBand = parkingBandFromScore(25); // would be "Parking can be difficult to find"

    let parkingNotes = existingNote;
    if (!parkingNotes && psiBand !== null) {
      parkingNotes = psiBand;
    }

    // explore_cache wins; PSI band is NOT applied
    expect(parkingNotes).toBe(existingNote);
    expect(parkingNotes).not.toBe(psiBand);
  });

  it('PSI band fires when parkingNotes is absent and score is non-null', () => {
    const psiBand = parkingBandFromScore(55); // "Parking may be limited"

    let parkingNotes: string | null = null;
    if (!parkingNotes && psiBand !== null) {
      parkingNotes = psiBand;
    }

    expect(parkingNotes).toBe('Parking may be limited');
  });

  it('parkingNotes stays null when both explore_cache and PSI score are absent', () => {
    const psiBand = parkingBandFromScore(null);

    let parkingNotes: string | null = null;
    if (!parkingNotes && psiBand !== null) {
      parkingNotes = psiBand;
    }

    expect(parkingNotes).toBeNull();
  });
});
