import type { GeneratedStop } from './plannerService.js';

/**
 * Haversine great-circle distance between two lat/lng points.
 * Returns distance in kilometres; the unit is irrelevant for comparison purposes.
 */
export function haversineDist(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Assign each parent suggestion to the trip day whose planned stops are
 * geographically nearest (minimum haversine distance to any stop in that day).
 *
 * - Suggestions whose coordinates are missing or non-numeric fall back to day 0.
 * - `tripDays` initialises an empty array for every day so callers always get a
 *   full map even when some days receive no suggestions.
 *
 * @param selectedStops  The stops already placed in the trip (dayNumber is 1-based).
 * @param suggestions    Pool parent-suggestion stops to be assigned.
 * @param tripDays       Total number of days in the trip.
 * @returns              A Record keyed by 0-based day string ("0", "1", …).
 */
export function assignSuggestionsByProximity(
  selectedStops: Array<Pick<GeneratedStop, 'dayNumber' | 'latitude' | 'longitude'>>,
  suggestions: GeneratedStop[],
  tripDays: number,
): Record<string, GeneratedStop[]> {
  // Build per-day coordinate lists (dayNumber is 1-based → key is 0-based).
  const dayStopCoords = new Map<number, Array<{ lat: number; lng: number }>>();
  for (const stop of selectedStops) {
    const dayKey = (stop.dayNumber ?? 1) - 1;
    const lat = parseFloat(stop.latitude ?? '');
    const lng = parseFloat(stop.longitude ?? '');
    if (!isNaN(lat) && !isNaN(lng)) {
      if (!dayStopCoords.has(dayKey)) dayStopCoords.set(dayKey, []);
      dayStopCoords.get(dayKey)!.push({ lat, lng });
    }
  }

  // Initialise an empty array for every day.
  const result: Record<string, GeneratedStop[]> = {};
  for (let d = 0; d < tripDays; d++) {
    result[String(d)] = [];
  }

  for (const suggestion of suggestions) {
    const sLat = parseFloat(suggestion.latitude ?? '');
    const sLng = parseFloat(suggestion.longitude ?? '');

    if (isNaN(sLat) || isNaN(sLng) || dayStopCoords.size === 0) {
      // No valid coordinates — fall back to day 0.
      result['0'].push(suggestion);
      continue;
    }

    // Assign to the day containing the nearest individual planned stop.
    let bestDay = 0;
    let bestDist = Infinity;
    for (const [dayKey, coords] of dayStopCoords) {
      for (const coord of coords) {
        const dist = haversineDist(sLat, sLng, coord.lat, coord.lng);
        if (dist < bestDist) {
          bestDist = dist;
          bestDay = dayKey;
        }
      }
    }
    result[String(bestDay)].push(suggestion);
  }

  return result;
}
