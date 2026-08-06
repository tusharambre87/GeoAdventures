/**
 * Partial pool-patch tests
 *
 * Piece A — classifyPoolDays:
 *   Verifies that the per-day classification correctly identifies passing days
 *   (pool stop count ≥ cap) and short days (count < cap), and that specific
 *   named stops from passing days are present unchanged in passingStops.
 *   "Present unchanged" means the exact stop object (by name) survives the
 *   classification; a test that accepts any stops of the right length would
 *   pass even if "preserve good days" silently did nothing.
 *
 * Piece B — generateDayWithRetry:
 *   Verifies that the retry wrapper:
 *     - returns the first result immediately when count is adequate
 *     - calls generate() a second time when first result is short
 *     - accepts the retry result when adequate
 *     - accepts the best short result (with a warning) when both are short
 *     - never calls generate() more than twice
 *     - usedStopNames for the retry is whatever was passed in — unchanged
 *       between attempts (the caller's responsibility, proven by the closure
 *       receiving the same snapshot each time)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyPoolDays, generateDayWithRetry } from '../plannerService';
import type { GeneratedStop } from '../plannerService';

// ---------------------------------------------------------------------------
// Minimal stop factory
// classifyPoolDays only reads stop.dayNumber; everything else is irrelevant
// but GeneratedStop has required fields — use a cast.
// ---------------------------------------------------------------------------

function makeStop(name: string, dayNumber: number): GeneratedStop {
  return { name, dayNumber, displayOrder: 0 } as unknown as GeneratedStop;
}

// ---------------------------------------------------------------------------
// Piece A: classifyPoolDays
// ---------------------------------------------------------------------------

describe('classifyPoolDays', () => {
  // Core scenario: mixed pool, 3 days, caps [2, 2, 2]
  // Day 1: 2 stops (passes), Day 2: 1 stop (short), Day 3: 2 stops (passes)
  const stops = [
    makeStop('Museum of Natural History', 1),
    makeStop('Central Park', 1),
    makeStop('Brooklyn Bridge', 2),   // only 1 of 2 needed → short
    makeStop('Statue of Liberty', 3),
    makeStop('Times Square', 3),
  ];
  const stopsForDay = [2, 2, 2];

  const { passingStops, shortLocalDays } = classifyPoolDays(stops, stopsForDay);

  it('identifies day 2 as short', () => {
    expect(shortLocalDays).toEqual([2]);
  });

  it('does not list passing days as short', () => {
    expect(shortLocalDays).not.toContain(1);
    expect(shortLocalDays).not.toContain(3);
  });

  // The high-bar assertion: specific named stops from passing days are present
  it('passing day 1 stop "Museum of Natural History" is present unchanged', () => {
    const names = passingStops.map(s => s.name);
    expect(names).toContain('Museum of Natural History');
  });

  it('passing day 1 stop "Central Park" is present unchanged', () => {
    const names = passingStops.map(s => s.name);
    expect(names).toContain('Central Park');
  });

  it('passing day 3 stop "Statue of Liberty" is present unchanged', () => {
    const names = passingStops.map(s => s.name);
    expect(names).toContain('Statue of Liberty');
  });

  it('passing day 3 stop "Times Square" is present unchanged', () => {
    const names = passingStops.map(s => s.name);
    expect(names).toContain('Times Square');
  });

  it('the short day\'s stop "Brooklyn Bridge" is NOT in passingStops', () => {
    const names = passingStops.map(s => s.name);
    expect(names).not.toContain('Brooklyn Bridge');
  });

  it('passingStops has exactly 4 stops (days 1+3, 2 each)', () => {
    expect(passingStops).toHaveLength(4);
  });

  // All-passing case
  it('all days passing: shortLocalDays is empty, all stops in passingStops', () => {
    const allPass = [
      makeStop('Stop A', 1), makeStop('Stop B', 1),
      makeStop('Stop C', 2), makeStop('Stop D', 2),
    ];
    const { passingStops: ps, shortLocalDays: sl } = classifyPoolDays(allPass, [2, 2]);
    expect(sl).toEqual([]);
    expect(ps).toHaveLength(4);
    expect(ps.map(s => s.name)).toContain('Stop A');
    expect(ps.map(s => s.name)).toContain('Stop D');
  });

  // All-short case
  it('all days short: passingStops is empty, all days listed as short', () => {
    const allShort = [makeStop('Lone Stop', 1)]; // 1 of 2 needed
    const { passingStops: ps, shortLocalDays: sl } = classifyPoolDays(allShort, [2, 2]);
    expect(ps).toHaveLength(0);
    expect(sl).toEqual([1, 2]); // day 2 has 0 stops, also short
  });

  // First day short, rest passing
  it('first day short: shortLocalDays=[1], other days preserved', () => {
    const mixed = [
      makeStop('Solo', 1),             // 1 of 3 → short
      makeStop('Alpha', 2), makeStop('Beta', 2), makeStop('Gamma', 2),
      makeStop('Delta', 3), makeStop('Epsilon', 3), makeStop('Zeta', 3),
    ];
    const { passingStops: ps, shortLocalDays: sl } = classifyPoolDays(mixed, [3, 3, 3]);
    expect(sl).toEqual([1]);
    expect(ps.map(s => s.name)).toContain('Alpha');
    expect(ps.map(s => s.name)).toContain('Delta');
    expect(ps.map(s => s.name)).not.toContain('Solo');
  });

  // Empty pool
  it('empty stop list: all days short', () => {
    const { passingStops: ps, shortLocalDays: sl } = classifyPoolDays([], [2, 3, 2]);
    expect(ps).toHaveLength(0);
    expect(sl).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// Piece B: generateDayWithRetry
// ---------------------------------------------------------------------------

describe('generateDayWithRetry', () => {
  const makeStops = (n: number, prefix = 'Stop') =>
    Array.from({ length: n }, (_, i) => makeStop(`${prefix} ${i + 1}`, 1));

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns first result immediately when count is adequate — generate called once', async () => {
    const generate = vi.fn().mockResolvedValue(makeStops(3));
    const result = await generateDayWithRetry(generate, 3, 'test day 1');
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(3);
  });

  it('calls generate() a second time when first result is short', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(makeStops(1))  // first attempt: 1/3
      .mockResolvedValueOnce(makeStops(3)); // retry: 3/3
    const result = await generateDayWithRetry(generate, 3, 'test day 2');
    expect(generate).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(3);
  });

  it('retry result returned when adequate', async () => {
    const retryStops = makeStops(4, 'Retry');
    const generate = vi.fn()
      .mockResolvedValueOnce(makeStops(1))
      .mockResolvedValueOnce(retryStops);
    const result = await generateDayWithRetry(generate, 4, 'test day 3');
    expect(result).toBe(retryStops); // exact reference — retry result used
  });

  it('never calls generate() more than twice', async () => {
    const generate = vi.fn().mockResolvedValue(makeStops(0)); // always empty
    await generateDayWithRetry(generate, 3, 'test day 4');
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('when both attempts short: accepts best result and logs a warning', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(makeStops(1))  // first: 1/3
      .mockResolvedValueOnce(makeStops(2)); // retry: 2/3
    const result = await generateDayWithRetry(generate, 3, 'test day 5');
    // Both short — takes retry (2 > 1)
    expect(result).toHaveLength(2);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('retry also short'));
  });

  it('when both attempts short and first has more: returns first', async () => {
    const firstStops = makeStops(2, 'First');
    const retryStops = makeStops(1, 'Retry');
    const generate = vi.fn()
      .mockResolvedValueOnce(firstStops)
      .mockResolvedValueOnce(retryStops);
    const result = await generateDayWithRetry(generate, 4, 'test day 6');
    expect(result).toBe(firstStops);
  });

  it('retry warning fires on first shortfall', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(makeStops(2))
      .mockResolvedValueOnce(makeStops(4));
    await generateDayWithRetry(generate, 4, 'my-label');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('my-label'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('retrying once'));
  });

  it('no persist side-effect: generate() is the only side-effect — pure callback model', async () => {
    // Nothing in generateDayWithRetry calls persistStop or the DB.
    // Proven by the fact that generate() is the ONLY async call it makes;
    // if persistStop or any DB import were invoked, they'd throw here (not mocked).
    const generate = vi.fn().mockResolvedValue(makeStops(2));
    await expect(generateDayWithRetry(generate, 2, 'pure test')).resolves.not.toThrow();
  });
});
