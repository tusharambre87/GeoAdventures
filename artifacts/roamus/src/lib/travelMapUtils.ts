import type { TravelTrip, TravelStop } from "@shared/schema";

// ── City-center coordinates ───────────────────────────────────────────────────

export const TRIP_LAT_LONG: Record<string, { lat: number; lon: number }> = {
  "chicago": { lat: 41.88, lon: -87.63 },
  "illinois": { lat: 40.0, lon: -89.0 },
  "hawaii": { lat: 19.8, lon: -155.5 },
  "big island": { lat: 19.5, lon: -155.5 },
  "oahu": { lat: 21.4, lon: -158.0 },
  "maui": { lat: 20.8, lon: -156.3 },
  "paris": { lat: 48.8, lon: 2.3 },
  "france": { lat: 46.2, lon: 2.2 },
  "tokyo": { lat: 35.7, lon: 139.7 },
  "japan": { lat: 36.2, lon: 138.3 },
  "london": { lat: 51.5, lon: -0.1 },
  "new york": { lat: 40.7, lon: -74.0 },
  "california": { lat: 36.8, lon: -119.4 },
  "los angeles": { lat: 34.1, lon: -118.2 },
  "san francisco": { lat: 37.8, lon: -122.4 },
  "florida": { lat: 27.6, lon: -81.5 },
  "orlando": { lat: 28.5, lon: -81.4 },
  "miami": { lat: 25.8, lon: -80.2 },
  "sydney": { lat: -33.9, lon: 151.2 },
  "australia": { lat: -25.3, lon: 133.8 },
  "rome": { lat: 41.9, lon: 12.5 },
  "italy": { lat: 41.9, lon: 12.6 },
  "cairo": { lat: 30.0, lon: 31.2 },
  "dubai": { lat: 25.2, lon: 55.3 },
  "singapore": { lat: 1.4, lon: 103.8 },
  "bangkok": { lat: 13.8, lon: 100.5 },
  "thailand": { lat: 15.9, lon: 100.9 },
  "mexico": { lat: 23.6, lon: -102.5 },
  "cancun": { lat: 21.2, lon: -86.8 },
  "brazil": { lat: -14.2, lon: -51.9 },
  "india": { lat: 20.6, lon: 79.0 },
  "china": { lat: 35.9, lon: 104.2 },
  "germany": { lat: 51.2, lon: 10.5 },
  "spain": { lat: 40.5, lon: -3.7 },
  "greece": { lat: 39.1, lon: 21.8 },
  "canada": { lat: 56.1, lon: -106.3 },
  "costa rica": { lat: 9.7, lon: -83.8 },
  "iceland": { lat: 64.9, lon: -19.0 },
  "new zealand": { lat: -40.9, lon: 174.9 },
  "bali": { lat: -8.4, lon: 115.2 },
  "vietnam": { lat: 14.1, lon: 108.3 },
  "korea": { lat: 35.9, lon: 127.8 },
  "portugal": { lat: 39.4, lon: -8.2 },
  "ireland": { lat: 53.1, lon: -7.7 },
  "switzerland": { lat: 46.8, lon: 8.2 },
  "alaska": { lat: 64.2, lon: -152.5 },
  "colorado": { lat: 39.0, lon: -105.8 },
  "texas": { lat: 31.0, lon: -100.0 },
  "caribbean": { lat: 21.5, lon: -78.7 },
  "saint louis": { lat: 38.63, lon: -90.20 },
  "seattle": { lat: 47.61, lon: -122.33 },
  "boston": { lat: 42.36, lon: -71.06 },
  "denver": { lat: 39.74, lon: -104.99 },
  "austin": { lat: 30.27, lon: -97.74 },
  "nashville": { lat: 36.16, lon: -86.78 },
  "berlin": { lat: 52.52, lon: 13.41 },
  "madrid": { lat: 40.42, lon: -3.70 },
  "barcelona": { lat: 41.39, lon: 2.17 },
  "athens": { lat: 37.98, lon: 23.73 },
  "lisbon": { lat: 38.72, lon: -9.14 },
  "istanbul": { lat: 41.01, lon: 28.98 },
  "amsterdam": { lat: 52.37, lon: 4.90 },
  "vienna": { lat: 48.21, lon: 16.37 },
  "prague": { lat: 50.08, lon: 14.44 },
  "budapest": { lat: 47.50, lon: 19.04 },
  "copenhagen": { lat: 55.68, lon: 12.57 },
  "stockholm": { lat: 59.33, lon: 18.07 },
  "oslo": { lat: 59.91, lon: 10.75 },
  "edinburgh": { lat: 55.95, lon: -3.19 },
  "florence": { lat: 43.77, lon: 11.26 },
  "venice": { lat: 45.44, lon: 12.32 },
  "doha": { lat: 25.29, lon: 51.53 },
  "nairobi": { lat: -1.29, lon: 36.82 },
  "cape town": { lat: -33.92, lon: 18.42 },
  "buenos aires": { lat: -34.60, lon: -58.38 },
  "rio de janeiro": { lat: -22.91, lon: -43.17 },
  "lima": { lat: -12.05, lon: -77.04 },
  "bogota": { lat: 4.71, lon: -74.07 },
  "kuala lumpur": { lat: 3.14, lon: 101.69 },
  "jakarta": { lat: -6.21, lon: 106.85 },
  "taipei": { lat: 25.03, lon: 121.57 },
  "seoul": { lat: 37.57, lon: 126.98 },
  "osaka": { lat: 34.69, lon: 135.50 },
  "kyoto": { lat: 35.01, lon: 135.77 },
  "beijing": { lat: 39.90, lon: 116.41 },
  "shanghai": { lat: 31.23, lon: 121.47 },
  "hong kong": { lat: 22.32, lon: 114.17 },
  "mumbai": { lat: 19.08, lon: 72.88 },
  "delhi": { lat: 28.70, lon: 77.10 },
  "mexico city": { lat: 19.43, lon: -99.13 },
  "toronto": { lat: 43.65, lon: -79.38 },
  "vancouver": { lat: 49.28, lon: -123.12 },
  "montreal": { lat: 45.50, lon: -73.57 },
};

// ── Well-known stop coordinates for popular cities ────────────────────────────

const CITY_STOP_COORDS: Record<string, Record<string, { lat: number; lon: number }>> = {
  chicago: {
    "Millennium Park & Cloud Gate": { lat: 41.8827, lon: -87.6233 },
    "Navy Pier": { lat: 41.8917, lon: -87.6086 },
    "Shedd Aquarium": { lat: 41.8676, lon: -87.614 },
    "Field Museum": { lat: 41.8663, lon: -87.617 },
    "Art Institute of Chicago": { lat: 41.8796, lon: -87.6237 },
    "Willis Tower Skydeck": { lat: 41.8789, lon: -87.6359 },
    "Lincoln Park Zoo": { lat: 41.9211, lon: -87.634 },
    "Chicago Riverwalk": { lat: 41.888, lon: -87.62 },
    "Museum of Science and Industry": { lat: 41.7906, lon: -87.5831 },
    "Magnificent Mile": { lat: 41.895, lon: -87.6245 },
  },
  hawaii: {
    "Volcanoes National Park": { lat: 19.4194, lon: -155.2885 },
    "Mauna Kea Summit": { lat: 19.8207, lon: -155.4681 },
    "Akaka Falls": { lat: 19.8536, lon: -155.1528 },
    "Punalu'u Black Sand Beach": { lat: 19.1364, lon: -155.5042 },
    "Kona Town": { lat: 19.64, lon: -155.9969 },
    "Waipio Valley": { lat: 20.1194, lon: -155.5897 },
    "Rainbow Falls": { lat: 19.7203, lon: -155.1061 },
    "Hapuna Beach": { lat: 19.9886, lon: -155.8261 },
  },
  sydney: {
    "Sydney Opera House": { lat: -33.8568, lon: 151.2153 },
    "Sydney Harbour Bridge": { lat: -33.8523, lon: 151.2108 },
    "Taronga Zoo": { lat: -33.8435, lon: 151.2411 },
    "Bondi Beach": { lat: -33.8908, lon: 151.2743 },
    "Darling Harbour": { lat: -33.8732, lon: 151.1987 },
    "Manly Beach": { lat: -33.7969, lon: 151.2873 },
  },
  paris: {
    "Eiffel Tower": { lat: 48.8584, lon: 2.2945 },
    "Louvre Museum": { lat: 48.8606, lon: 2.3376 },
    "Notre-Dame Cathedral": { lat: 48.853, lon: 2.3499 },
    "Palace of Versailles": { lat: 48.8049, lon: 2.1204 },
    "Sacré-Cœur Basilica": { lat: 48.8867, lon: 2.3431 },
    "Luxembourg Gardens": { lat: 48.8462, lon: 2.3372 },
    "Musée d'Orsay": { lat: 48.86, lon: 2.3266 },
    "Arc de Triomphe": { lat: 48.8738, lon: 2.295 },
    "Champs-Élysées": { lat: 48.8698, lon: 2.3078 },
    "Disneyland Paris": { lat: 48.8675, lon: 2.7836 },
  },
  "san francisco": {
    "Golden Gate Bridge": { lat: 37.8199, lon: -122.4783 },
    "Alcatraz Island": { lat: 37.8267, lon: -122.4233 },
    "Fisherman's Wharf": { lat: 37.808, lon: -122.4177 },
    "California Academy of Sciences": { lat: 37.7699, lon: -122.4661 },
    "Cable Car Ride": { lat: 37.7949, lon: -122.4194 },
    "Pier 39 & Sea Lions": { lat: 37.8087, lon: -122.4098 },
    "Golden Gate Park": { lat: 37.7694, lon: -122.4862 },
    "Coit Tower": { lat: 37.8024, lon: -122.4058 },
  },
};

function getCityStopCoords(trip: TravelTrip | null): Record<string, { lat: number; lon: number }> {
  if (!trip) return {};
  const key = (trip.city || trip.destination || trip.name || "").toLowerCase();
  for (const [city, coords] of Object.entries(CITY_STOP_COORDS)) {
    if (key.includes(city)) return coords;
  }
  return {};
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Returns a coordinate lookup map keyed by stop name.
 * Priority: stop.latitude/longitude → city-specific stop tables.
 */
export function getStopCoordsForTrip(
  trip: TravelTrip | null,
  stops: TravelStop[],
): Record<string, { lat: number; lon: number }> {
  const lookup: Record<string, { lat: number; lon: number }> = {};

  stops.forEach(stop => {
    const lat = parseFloat(stop.latitude ?? "");
    const lon = parseFloat(stop.longitude ?? "");
    if (!isNaN(lat) && !isNaN(lon)) {
      lookup[stop.name] = { lat, lon };
    }
  });

  const cityCoords = getCityStopCoords(trip);
  for (const [name, coords] of Object.entries(cityCoords)) {
    if (!lookup[name]) lookup[name] = coords;
  }

  return lookup;
}

/**
 * Returns the geographic center for a trip, used as the map center.
 * Priority: first stop with coords → trip.latitude/longitude → TRIP_LAT_LONG lookup.
 */
export function getTripCenter(
  trip: TravelTrip | null,
  stops: TravelStop[] = [],
): { lat: number; lon: number } {
  const firstWithCoords = stops.find(s => {
    const lat = parseFloat(s.latitude ?? "");
    const lon = parseFloat(s.longitude ?? "");
    return !isNaN(lat) && !isNaN(lon);
  });
  if (firstWithCoords) {
    return {
      lat: parseFloat(firstWithCoords.latitude!),
      lon: parseFloat(firstWithCoords.longitude!),
    };
  }

  if (trip) {
    const tLat = parseFloat(trip.latitude ?? "");
    const tLon = parseFloat(trip.longitude ?? "");
    if (!isNaN(tLat) && !isNaN(tLon)) return { lat: tLat, lon: tLon };

    const key = (trip.city || trip.destination || trip.name || "").toLowerCase();
    const match = Object.entries(TRIP_LAT_LONG).find(
      ([k]) => key.includes(k) || k.includes(key),
    );
    if (match) return match[1];
  }

  return { lat: 20, lon: 0 };
}

/**
 * Resolves an ordered array of [lat, lon] pairs for the given stops,
 * falling back to the trip center if a stop has no coordinate.
 */
export function resolveStopCoords(
  trip: TravelTrip | null,
  stops: TravelStop[],
): Array<[number, number]> {
  const lookup = getStopCoordsForTrip(trip, stops);
  const center = getTripCenter(trip, stops);

  return stops.map(s => {
    const c = lookup[s.name] ?? center;
    return [c.lat, c.lon] as [number, number];
  });
}
