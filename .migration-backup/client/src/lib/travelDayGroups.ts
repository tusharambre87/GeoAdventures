import type { TravelStop } from "@shared/schema";

export const STOPS_PER_DAY = 5;

export type CityDateRange = { startDate: string; endDate: string };

export function stopsPerDayFromPace(pace?: string | null): number {
  if (pace === "chill") return 3;
  if (pace === "packed") return 6;
  return 4;
}


/** Distribute `stops` evenly across `numDays` days (fallback only — no dayIndex set). */
function distributeEvenly(stops: TravelStop[], numDays: number): TravelStop[][] {
  const slices: TravelStop[][] = Array.from({ length: numDays }, () => []);
  stops.forEach((s, i) => slices[Math.floor(i * numDays / stops.length)].push(s));
  return slices;
}

/**
 * Group stops by their explicit `dayIndex` field.
 * Returns an array indexed by day, each element being the stops for that day
 * sorted by `displayOrder`. This is the primary grouping path when stops have
 * been explicitly day-assigned (dayIndex != null).
 */
function groupByDayIndex(stops: TravelStop[], numDays?: number): TravelStop[][] {
  const maxDay = stops.reduce((m, s) => Math.max(m, s.dayIndex ?? 0), 0);
  const totalDays = numDays != null ? Math.max(numDays, maxDay + 1) : maxDay + 1;
  const result: TravelStop[][] = Array.from({ length: totalDays }, () => []);
  for (const stop of stops) {
    const d = stop.dayIndex ?? 0;
    const slot = Math.min(d, totalDays - 1);
    result[slot].push(stop);
  }
  for (const day of result) {
    day.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }
  return result;
}

export function groupStopsByDay(
  stops: TravelStop[],
  numDays?: number,
  pace?: string | null,
  cityDates?: Record<string, CityDateRange> | null
): TravelStop[][] {
  if (stops.length === 0) return [];

  // ── PRIMARY PATH: explicit dayIndex ──────────────────────────────────────
  // If ANY stop has a non-null dayIndex, trust dayIndex for ALL stops.
  // Stops without dayIndex fall back to day 0 (safe default).
  const anyHasDayIndex = stops.some(s => s.dayIndex != null);
  if (anyHasDayIndex) {
    return groupByDayIndex(stops, numDays);
  }

  // ── LEGACY PATH: no dayIndex set yet ─────────────────────────────────────
  // Distribute by position (original behaviour). This only runs for trips
  // that pre-date the dayIndex column and haven't been migrated yet.

  const hasCityGroups = stops.some((s) => s.cityGroup);
  if (hasCityGroups) {
    const namedStops = stops.filter((s) => !!s.cityGroup);
    const unknownStops = stops.filter((s) => !s.cityGroup);

    const cityOrder: string[] = [];
    const cityMap: Map<string, TravelStop[]> = new Map();
    for (const stop of namedStops) {
      const cg = stop.cityGroup as string;
      if (!cityMap.has(cg)) { cityMap.set(cg, []); cityOrder.push(cg); }
      cityMap.get(cg)!.push(stop);
    }

    for (const stop of unknownStops) {
      const order = stop.displayOrder ?? 0;
      let best = cityOrder[0] ?? "__unknown__";
      for (const cg of cityOrder) {
        const cgStops = cityMap.get(cg)!;
        const maxOrder = Math.max(...cgStops.map((s) => s.displayOrder ?? 0));
        if (maxOrder <= order) best = cg;
      }
      if (!cityMap.has(best)) { cityMap.set(best, []); cityOrder.push(best); }
      cityMap.get(best)!.push(stop);
    }

    const spd = stopsPerDayFromPace(pace);
    const hasCityDateData = cityDates && cityOrder.some((c) => cityDates[c]);

    if (hasCityDateData) {
      const days: TravelStop[][] = [];
      let prevCityEndDate: string | null = null;
      for (let ci = 0; ci < cityOrder.length; ci++) {
        const city = cityOrder[ci];
        const cd = cityDates![city];
        let daysForCity = 1;
        if (cd?.startDate && cd?.endDate) {
          const s = new Date(cd.startDate);
          const e = new Date(cd.endDate);
          daysForCity = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          if (prevCityEndDate && cd.startDate === prevCityEndDate) {
            daysForCity = Math.max(1, daysForCity - 1);
          }
          prevCityEndDate = cd.endDate;
        }
        const cityStops = (cityMap.get(city) || []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        if (cityStops.length === 0) {
          for (let d = 0; d < daysForCity; d++) days.push([]);
          continue;
        }
        if (daysForCity === 1) {
          days.push(cityStops);
          continue;
        }
        days.push(...distributeEvenly(cityStops, daysForCity));
      }
      return days;
    }

    // No cityDates — use numDays if provided, otherwise derive from stop pace
    const days: TravelStop[][] = [];
    const totalStops = namedStops.length || stops.length;
    for (const city of cityOrder) {
      const cityStops = (cityMap.get(city) || []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      if (cityStops.length === 0) continue;

      let daysForCity: number;
      if (numDays && numDays > 0) {
        const fraction = cityStops.length / Math.max(1, totalStops);
        daysForCity = Math.max(1, Math.round(fraction * numDays));
      } else {
        daysForCity = Math.max(1, Math.ceil(cityStops.length / spd));
      }

      days.push(...distributeEvenly(cityStops, daysForCity));
    }
    return days;
  }

  // No city groups at all — use numDays to split evenly, or fall back to STOPS_PER_DAY
  const sortedStops = [...stops].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  if (numDays && numDays > 0) {
    return distributeEvenly(sortedStops, numDays);
  }
  const stopsPerDay = STOPS_PER_DAY;
  const groups: TravelStop[][] = [];
  for (let i = 0; i < sortedStops.length; i += stopsPerDay) {
    groups.push(sortedStops.slice(i, i + stopsPerDay));
  }
  return groups;
}

/**
 * Compute the dayIndex for each stop in a set of stops using distributeEvenly logic.
 * Used server-side and client-side to migrate legacy stops that have no dayIndex.
 */
export function computeDayIndexes(
  stops: TravelStop[],
  numDays?: number,
  pace?: string | null,
  cityDates?: Record<string, CityDateRange> | null
): Map<string, number> {
  const result = new Map<string, number>();
  // Run groupStopsByDay in legacy mode (ignore any existing dayIndex)
  const stopsWithNullDayIndex = stops.map(s => ({ ...s, dayIndex: null }));
  const groups = groupStopsByDay(stopsWithNullDayIndex as TravelStop[], numDays, pace, cityDates);
  groups.forEach((dayStops, dayIdx) => {
    for (const s of dayStops) {
      result.set(s.id, dayIdx);
    }
  });
  return result;
}
