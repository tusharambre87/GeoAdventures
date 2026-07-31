/**
 * Shared trip-selection utilities used by both the Today tab and the Home tab
 * so they always agree on which trip is "active" — including under dev-date
 * overrides and multi-trip edge cases.
 */

/** Minimum trip shape required by selectActiveTrip. */
export interface TripLike {
  id: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}

/** Parse date string as LOCAL midnight (strips UTC offset). */
function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const datePart = s.split('T')[0].split(' ')[0];
  const ymd = datePart.split('-').map(Number);
  if (ymd.length !== 3 || ymd.some(isNaN)) return null;
  return new Date(ymd[0], ymd[1] - 1, ymd[2]);
}

/**
 * Four-tier active-trip selection:
 *   1. Explicit status  — status === 'active' | 'in_progress'
 *   2. Date window      — today falls within [startDate, endDate]
 *   3. Soonest future   — earliest non-completed upcoming trip
 *   4. Most-recent past — reverse-chronological fallback, then last, then first
 *
 * Pass `devDate` (ISO string) to time-shift the "today" anchor the same way
 * the Today screen does; omit (or pass null/undefined) for real wall-clock.
 */
export function selectActiveTrip<T extends TripLike>(
  trips: T[],
  devDate?: Date | string | null,
): T | undefined {
  const sortedTrips = [...trips].sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });
  const todayMs = (devDate ? new Date(devDate) : new Date()).setHours(0, 0, 0, 0);

  return (
    // Tier 1: explicit active/in-progress status
    sortedTrips.find(t => {
      if (t.status === 'active' || t.status === 'in_progress') return true;
      if (!t.startDate || !t.endDate) return false;
      const s = parseLocalDate(t.startDate)!; s.setHours(0, 0, 0, 0);
      const e = parseLocalDate(t.endDate)!;   e.setHours(23, 59, 59, 999);
      return todayMs >= s.getTime() && todayMs <= e.getTime();
    }) ??
    // Tier 2: soonest non-completed future trip
    sortedTrips.find(t => {
      if (!t.startDate || t.status === 'completed') return false;
      const s = parseLocalDate(t.startDate);
      if (!s) return false;
      s.setHours(0, 0, 0, 0);
      return s.getTime() > todayMs;
    }) ??
    // Tier 3: most-recently-started trip (reverse-chronological)
    [...sortedTrips].reverse().find(t => t.startDate) ??
    // Tier 4: absolute fallbacks
    sortedTrips[sortedTrips.length - 1] ??
    sortedTrips[0]
  );
}
