import type { TravelStop } from "@shared/schema";
import type {
  DayRouteStop,
  DayRouteVariant,
  DayRouteVariantType,
  DayRouteBundle,
} from "../types/dailyMaps";

type MealRec = {
  name: string;
  cuisine: string;
  description: string;
  priceLevel: number;
  kidFriendlyNote: string;
  walkTime?: string;
};

const EST_DURATIONS: Record<string, number> = {
  museum: 90, aquarium: 90, zoo: 120, park: 75, nature: 75,
  garden: 75, beach: 90, landmark: 60, viewpoint: 45, bridge: 30,
  restaurant: 75, market: 60, activity: 90, culture: 75,
};

function estDuration(stopType?: string | null): number {
  return EST_DURATIONS[stopType || ""] || 60;
}

function travelStopToDayRouteStop(stop: TravelStop, order: number): DayRouteStop {
  const lat = stop.latitude ? Number(stop.latitude) : null;
  const lng = stop.longitude ? Number(stop.longitude) : null;
  const isMealType = ["restaurant", "cafe", "food_court", "street_food"].includes(stop.stopType || "");
  return {
    id: stop.id,
    name: stop.name,
    address: (stop as any).address as string | undefined,
    lat,
    lng,
    stopType: stop.stopType || "landmark",
    isNavigable: lat != null && lng != null,
    isMealOrSnack: isMealType,
    estimatedDurationMin: estDuration(stop.stopType),
    travelTimeToNextMin: null,
    displayOrder: order,
    isVisited: stop.isVisited || false,
  };
}

function makeMealStop(meal: MealRec, mealType: "lunch" | "snack", order: number): DayRouteStop {
  return {
    id: `meal-${mealType}-${order}`,
    name: meal.name,
    lat: null,
    lng: null,
    stopType: "restaurant",
    isNavigable: false,
    isMealOrSnack: true,
    mealLabel: mealType === "lunch" ? "Lunch" : "Snack",
    estimatedDurationMin: mealType === "lunch" ? 60 : 30,
    travelTimeToNextMin: null,
    displayOrder: order,
    isVisited: false,
  };
}

function estimateTravelTimes(stops: DayRouteStop[], segmentDurations?: number[]): DayRouteStop[] {
  return stops.map((stop, i) => {
    if (i === stops.length - 1) return { ...stop, travelTimeToNextMin: null };
    if (segmentDurations && segmentDurations[i] != null) {
      return { ...stop, travelTimeToNextMin: Math.round(segmentDurations[i] / 60) };
    }
    const next = stops[i + 1];
    if (stop.isNavigable && next.isNavigable) {
      const dist = haversineKm(stop.lat!, stop.lng!, next.lat!, next.lng!);
      const min = Math.round((dist / 30) * 60);
      return { ...stop, travelTimeToNextMin: Math.max(5, min) };
    }
    return { ...stop, travelTimeToNextMin: 10 };
  });
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeStats(stops: DayRouteStop[]) {
  const active = stops.filter((s) => !s.isDropped);
  const totalTravel = active.reduce((sum, s) => sum + (s.travelTimeToNextMin || 0), 0);
  const meals = active.filter((s) => s.isMealOrSnack).length;
  const navigable = active.filter((s) => s.isNavigable).length;
  return { totalStops: active.length, navigableStops: navigable, totalTravelMin: totalTravel, mealsIncluded: meals };
}

function buildSummaryText(stats: { totalStops: number; totalTravelMin: number; mealsIncluded: number }): string {
  const hrs = Math.floor(stats.totalTravelMin / 60);
  const mins = stats.totalTravelMin % 60;
  const travelStr = hrs > 0 ? `${hrs}h ${mins}m travel` : `${mins}m travel`;
  const mealStr = stats.mealsIncluded > 0 ? `Meals included` : "";
  return [
    `${stats.totalStops} stops`,
    travelStr,
    mealStr,
  ].filter(Boolean).join(" · ");
}

function buildBalancedVariant(
  stops: DayRouteStop[],
  city?: string,
  segmentDurations?: number[]
): DayRouteVariant {
  const withTravel = estimateTravelTimes(stops, segmentDurations);
  const stats = computeStats(withTravel);
  return {
    type: "balanced",
    label: "Balanced",
    stops: withTravel,
    ...stats,
    summaryText: buildSummaryText(stats),
    googleMapsUrl: buildGoogleMapsDayRouteLink(withTravel, city),
    polylinePoints: null,
    boundingBox: null,
  };
}

function nearestNeighborReorder(stops: DayRouteStop[]): DayRouteStop[] {
  const alreadyVisited = stops.filter((s) => s.isVisited);
  const unvisited = stops.filter((s) => !s.isVisited);

  const withCoords = unvisited.filter((s) => s.isNavigable && !s.isDropped);
  if (withCoords.length < 3) return stops;

  const remaining = [...unvisited];
  const result: DayRouteStop[] = [];

  let current = remaining.shift()!;
  result.push(current);

  while (remaining.length > 0) {
    if (!current.isNavigable || current.isDropped) {
      current = remaining.shift()!;
      result.push(current);
      continue;
    }
    let minDist = Infinity;
    let nearestIdx = 0;
    for (let i = 0; i < remaining.length; i++) {
      const s = remaining[i];
      if (!s.isNavigable || s.isDropped) continue;
      const dist = haversineKm(current.lat!, current.lng!, s.lat!, s.lng!);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }
    current = remaining.splice(nearestIdx, 1)[0];
    result.push(current);
  }

  return [...alreadyVisited, ...result].map((s, i) => ({ ...s, displayOrder: i }));
}

function buildFasterVariant(
  stops: DayRouteStop[],
  city?: string,
  segmentDurations?: number[]
): DayRouteVariant {
  let fasterStops = [...stops];

  if (fasterStops.length >= 5) {
    const optionalStops = fasterStops.filter(
      (s) => !s.isMealOrSnack && ["viewpoint", "market", "garden", "bridge"].includes(s.stopType)
    );
    if (optionalStops.length > 0) {
      const dropId = optionalStops[optionalStops.length - 1].id;
      fasterStops = fasterStops.map((s) =>
        s.id === dropId ? { ...s, isDropped: true, droppedReason: "Skipped for a faster day" } : s
      );
    }
  }

  fasterStops = nearestNeighborReorder(fasterStops);

  fasterStops = fasterStops.map((s) =>
    s.isDropped ? s : { ...s, estimatedDurationMin: Math.round(s.estimatedDurationMin * 0.75) }
  );

  const withTravel = estimateTravelTimes(
    fasterStops.filter((s) => !s.isDropped),
    segmentDurations
  );
  const allStops = fasterStops.map((s) => {
    if (s.isDropped) return s;
    const updated = withTravel.find((w) => w.id === s.id);
    return updated || s;
  });
  const activeStops = allStops.filter((s) => !s.isDropped);
  const stats = computeStats(activeStops);
  const same = stops.length === activeStops.length &&
    stops.every((s, i) => s.id === activeStops[i]?.id);
  return {
    type: "faster",
    label: "Faster",
    stops: allStops,
    ...stats,
    summaryText: same ? "This day is already well balanced." : buildSummaryText(stats),
    googleMapsUrl: buildGoogleMapsDayRouteLink(activeStops, city),
    polylinePoints: null,
    boundingBox: null,
  };
}

function buildEasierVariant(
  stops: DayRouteStop[],
  city?: string,
  segmentDurations?: number[]
): DayRouteVariant {
  let easierStops = [...stops];
  if (easierStops.length >= 3) {
    const nonMealStops = easierStops.filter((s) => !s.isMealOrSnack);
    if (nonMealStops.length >= 2) {
      const dropId = nonMealStops[nonMealStops.length - 1].id;
      easierStops = easierStops.map((s) =>
        s.id === dropId ? { ...s, isDropped: true, droppedReason: "Dropped for an easier day" } : s
      );
    }
  }
  easierStops = easierStops.map((s) =>
    s.isDropped ? s : { ...s, estimatedDurationMin: Math.round(s.estimatedDurationMin * 1.15) }
  );
  const withTravel = estimateTravelTimes(
    easierStops.filter((s) => !s.isDropped),
    segmentDurations
  );
  const allStops = easierStops.map((s) => {
    if (s.isDropped) return s;
    const updated = withTravel.find((w) => w.id === s.id);
    return updated || s;
  });
  const activeStops = allStops.filter((s) => !s.isDropped);
  const stats = computeStats(activeStops);
  const same = stops.length === activeStops.length &&
    stops.every((s, i) => s.id === activeStops[i]?.id);
  return {
    type: "easier",
    label: "Easier day",
    stops: allStops,
    ...stats,
    summaryText: same ? "This day is already well balanced." : buildSummaryText(stats),
    googleMapsUrl: buildGoogleMapsDayRouteLink(activeStops, city),
    polylinePoints: null,
    boundingBox: null,
  };
}

export function generateDayRouteVariants(
  todayStops: TravelStop[],
  mealRecs: { lunch: MealRec | null; snack: MealRec | null },
  city?: string
): DayRouteBundle {
  const baseStops: DayRouteStop[] = [];
  todayStops.forEach((stop, i) => {
    baseStops.push(travelStopToDayRouteStop(stop, i));
  });

  const midpoint = Math.floor(baseStops.length / 2);
  if (mealRecs.lunch) {
    baseStops.splice(midpoint, 0, makeMealStop(mealRecs.lunch, "lunch", midpoint));
  }
  if (mealRecs.snack && baseStops.length > 2) {
    const snackIdx = Math.min(baseStops.length, midpoint + 2);
    baseStops.splice(snackIdx, 0, makeMealStop(mealRecs.snack, "snack", snackIdx));
  }

  const reindexed = baseStops.map((s, i) => ({ ...s, displayOrder: i }));

  return {
    balanced: buildBalancedVariant(reindexed, city),
    faster: buildFasterVariant(reindexed, city),
    easier: buildEasierVariant(reindexed, city),
    polylinePoints: null,
    routeFetchFailed: false,
  };
}

export function buildGoogleMapsDayRouteLinkFromVariant(variant: DayRouteVariant, city?: string): string {
  return buildGoogleMapsDayRouteLink(variant.stops, city);
}

// Build a Google Maps Directions link using place names (not raw lat/lng) so
// Maps shows real place labels instead of "Dropped pin".
export function buildGoogleMapsDayRouteLink(stops: DayRouteStop[], city?: string): string {
  // Use all non-dropped stops that have a name, deduped by name
  const seen = new Set<string>();
  const active = stops.filter((s) => {
    if (s.isDropped || !s.name) return false;
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });

  if (active.length === 0) return "https://www.google.com/maps";

  const ctx = city ? ` ${city}` : "";

  // Prefer address if available (more precise), fall back to stop name
  const placeText = (s: DayRouteStop) => (s.address || s.name) + ctx;

  if (active.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeText(active[0]))}`;
  }

  const origin = encodeURIComponent(placeText(active[0]));
  const destination = encodeURIComponent(placeText(active[active.length - 1]));

  // Google Maps web supports up to 9 waypoints
  const waypointStops = active.slice(1, -1).slice(0, 9);
  const waypointStr = waypointStops.map((s) => encodeURIComponent(placeText(s))).join("|");

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypointStr) url += `&waypoints=${waypointStr}`;
  return url;
}

export async function getRoutePolylineForStops(
  stops: DayRouteStop[]
): Promise<{
  points: [number, number][];
  segmentDurations: number[];
  boundingBox: { sw: [number, number]; ne: [number, number] };
} | null> {
  const navigable = stops.filter((s) => s.isNavigable && !s.isDropped);
  if (navigable.length < 2) return null;

  const coords = navigable.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const geoCoords: [number, number][] = route.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]] as [number, number]
    );

    const segmentDurations: number[] = [];
    if (route.legs) {
      for (const leg of route.legs) {
        segmentDurations.push(leg.duration || 0);
      }
    }

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const [lat, lng] of geoCoords) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    return {
      points: geoCoords,
      segmentDurations,
      boundingBox: { sw: [minLat, minLng], ne: [maxLat, maxLng] },
    };
  } catch {
    return null;
  }
}
