/**
 * server/travelDayGroups.ts
 *
 * Server-side copy of the groupStopsByDay utility.
 * Kept in sync with client/src/lib/travelDayGroups.ts.
 * Used by the skip-day endpoint to reproduce day grouping without importing client code.
 */

import type { TravelStop } from "@shared/schema";

export const STOPS_PER_DAY = 5;

export type CityDateRange = { startDate: string; endDate: string };

export function stopsPerDayFromPace(pace?: string | null): number {
  if (pace === "chill") return 3;
  if (pace === "packed") return 6;
  return 4;
}

function distributeEvenly(stops: TravelStop[], numDays: number): TravelStop[][] {
  const slices: TravelStop[][] = Array.from({ length: numDays }, () => []);
  stops.forEach((s, i) => slices[Math.floor(i * numDays / stops.length)].push(s));
  return slices;
}

export function groupStopsByDay(
  stops: TravelStop[],
  numDays?: number,
  pace?: string | null,
  cityDates?: Record<string, CityDateRange> | null
): TravelStop[][] {
  if (stops.length === 0) return [];

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
