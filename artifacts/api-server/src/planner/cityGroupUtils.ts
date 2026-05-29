import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// ── Static city-center lookup (mirrors client travelMapUtils) ─────────────────
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "chicago": { lat: 41.88, lon: -87.63 },
  "illinois": { lat: 40.00, lon: -89.00 },
  "hawaii": { lat: 19.80, lon: -155.50 },
  "big island": { lat: 19.50, lon: -155.50 },
  "oahu": { lat: 21.40, lon: -158.00 },
  "maui": { lat: 20.80, lon: -156.30 },
  "paris": { lat: 48.85, lon: 2.35 },
  "tokyo": { lat: 35.70, lon: 139.70 },
  "london": { lat: 51.51, lon: -0.13 },
  "new york": { lat: 40.71, lon: -74.01 },
  "new york city": { lat: 40.71, lon: -74.01 },
  "nyc": { lat: 40.71, lon: -74.01 },
  "los angeles": { lat: 34.05, lon: -118.24 },
  "la": { lat: 34.05, lon: -118.24 },
  "san francisco": { lat: 37.77, lon: -122.42 },
  "orlando": { lat: 28.54, lon: -81.38 },
  "miami": { lat: 25.78, lon: -80.21 },
  "seattle": { lat: 47.61, lon: -122.33 },
  "boston": { lat: 42.36, lon: -71.06 },
  "denver": { lat: 39.74, lon: -104.99 },
  "austin": { lat: 30.27, lon: -97.74 },
  "nashville": { lat: 36.16, lon: -86.78 },
  "atlanta": { lat: 33.75, lon: -84.39 },
  "dallas": { lat: 32.78, lon: -96.80 },
  "houston": { lat: 29.76, lon: -95.37 },
  "phoenix": { lat: 33.45, lon: -112.07 },
  "san diego": { lat: 32.72, lon: -117.15 },
  "las vegas": { lat: 36.17, lon: -115.14 },
  "portland": { lat: 45.52, lon: -122.68 },
  "minneapolis": { lat: 44.98, lon: -93.27 },
  "saint louis": { lat: 38.63, lon: -90.20 },
  "new orleans": { lat: 29.95, lon: -90.07 },
  "washington": { lat: 38.91, lon: -77.04 },
  "washington dc": { lat: 38.91, lon: -77.04 },
  "sydney": { lat: -33.87, lon: 151.21 },
  "rome": { lat: 41.90, lon: 12.50 },
  "berlin": { lat: 52.52, lon: 13.41 },
  "madrid": { lat: 40.42, lon: -3.70 },
  "barcelona": { lat: 41.39, lon: 2.17 },
  "amsterdam": { lat: 52.37, lon: 4.90 },
  "vienna": { lat: 48.21, lon: 16.37 },
  "prague": { lat: 50.08, lon: 14.44 },
  "budapest": { lat: 47.50, lon: 19.04 },
  "athens": { lat: 37.98, lon: 23.73 },
  "lisbon": { lat: 38.72, lon: -9.14 },
  "istanbul": { lat: 41.01, lon: 28.98 },
  "dubai": { lat: 25.20, lon: 55.27 },
  "singapore": { lat: 1.35, lon: 103.82 },
  "bangkok": { lat: 13.75, lon: 100.50 },
  "tokyo": { lat: 35.68, lon: 139.69 },
  "osaka": { lat: 34.69, lon: 135.50 },
  "kyoto": { lat: 35.01, lon: 135.77 },
  "beijing": { lat: 39.91, lon: 116.39 },
  "shanghai": { lat: 31.23, lon: 121.47 },
  "hong kong": { lat: 22.32, lon: 114.17 },
  "bali": { lat: -8.41, lon: 115.19 },
  "cancun": { lat: 21.16, lon: -86.85 },
  "cape town": { lat: -33.92, lon: 18.42 },
  "nairobi": { lat: -1.29, lon: 36.82 },
  "buenos aires": { lat: -34.60, lon: -58.38 },
  "rio de janeiro": { lat: -22.91, lon: -43.17 },
  "toronto": { lat: 43.65, lon: -79.38 },
  "vancouver": { lat: 49.25, lon: -123.12 },
  "montreal": { lat: 45.51, lon: -73.55 },
  "mexico city": { lat: 19.43, lon: -99.13 },
  "lima": { lat: -12.05, lon: -77.04 },
  "bogota": { lat: 4.71, lon: -74.07 },
  "reykjavik": { lat: 64.13, lon: -21.93 },
  "auckland": { lat: -36.86, lon: 174.76 },
  "johannesburg": { lat: -26.20, lon: 28.04 },
  "mumbai": { lat: 19.08, lon: 72.88 },
  "delhi": { lat: 28.61, lon: 77.21 },
  "bangalore": { lat: 12.97, lon: 77.59 },
  "seoul": { lat: 37.57, lon: 126.98 },
  "taipei": { lat: 25.03, lon: 121.56 },
  "kuala lumpur": { lat: 3.14, lon: 101.69 },
  "jakarta": { lat: -6.21, lon: 106.85 },
  "manila": { lat: 14.60, lon: 120.98 },
  "ho chi minh city": { lat: 10.82, lon: 106.63 },
  "hanoi": { lat: 21.03, lon: 105.85 },
  "florence": { lat: 43.77, lon: 11.26 },
  "venice": { lat: 45.44, lon: 12.32 },
  "milan": { lat: 45.47, lon: 9.19 },
  "naples": { lat: 40.85, lon: 14.27 },
  "edinburgh": { lat: 55.95, lon: -3.19 },
  "dublin": { lat: 53.35, lon: -6.26 },
  "copenhagen": { lat: 55.68, lon: 12.57 },
  "stockholm": { lat: 59.33, lon: 18.07 },
  "oslo": { lat: 59.91, lon: 10.75 },
  "helsinki": { lat: 60.17, lon: 24.94 },
  "zurich": { lat: 47.38, lon: 8.54 },
  "geneva": { lat: 46.20, lon: 6.14 },
  "brussels": { lat: 50.85, lon: 4.35 },
  "warsaw": { lat: 52.23, lon: 21.01 },
  "bucharest": { lat: 44.43, lon: 26.10 },
  "kraków": { lat: 50.06, lon: 19.94 },
  "krakow": { lat: 50.06, lon: 19.94 },
  "doha": { lat: 25.29, lon: 51.53 },
  "abu dhabi": { lat: 24.47, lon: 54.37 },
  "riyadh": { lat: 24.69, lon: 46.72 },
  "cairo": { lat: 30.04, lon: 31.24 },
  "casablanca": { lat: 33.59, lon: -7.62 },
  "marrakech": { lat: 31.63, lon: -8.00 },
};

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Geocode city names (lookup first, OpenAI fallback) ───────────────────────
async function getRouteCityCoords(
  cityNames: string[],
  countryHint: string
): Promise<Map<string, { lat: number; lon: number }>> {
  const coordMap = new Map<string, { lat: number; lon: number }>();
  const needsGeocode: string[] = [];

  for (const city of cityNames) {
    const key = city.toLowerCase().trim();
    const known = CITY_COORDS[key];
    if (known) {
      coordMap.set(city, known);
    } else {
      needsGeocode.push(city);
    }
  }

  if (needsGeocode.length > 0) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Return JSON with approximate city-center coordinates for these cities in or near ${countryHint}. Format: { "CityName": { "lat": number, "lon": number } }. Cities: ${needsGeocode.join(", ")}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      const data = JSON.parse(response.choices[0].message.content || "{}") as Record<
        string,
        { lat?: number; lon?: number }
      >;

      for (const [city, coords] of Object.entries(data)) {
        if (typeof coords?.lat === "number" && typeof coords?.lon === "number") {
          coordMap.set(city, { lat: coords.lat, lon: coords.lon });
        }
      }
    } catch (err) {
      console.warn("[CityGroups] OpenAI geocoding failed:", err);
    }
  }

  return coordMap;
}

// ── Main export ───────────────────────────────────────────────────────────────
export interface StopForGrouping {
  id: string;
  name: string;
  latitude?: string | null;
  longitude?: string | null;
}

/**
 * Assigns each stop to the nearest route city using haversine distance.
 * Falls back to `defaultCity` when a stop has no lat/lon or only one route city.
 */
export async function computeCityGroupsForStops(
  stops: StopForGrouping[],
  routeCityNames: string[],
  countryHint: string,
  defaultCity: string
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  const uniqueCities = [...new Set(routeCityNames.filter(Boolean))];

  if (uniqueCities.length <= 1) {
    for (const stop of stops) result.set(stop.id, uniqueCities[0] ?? defaultCity);
    return result;
  }

  const cityCoords = await getRouteCityCoords(uniqueCities, countryHint);

  for (const stop of stops) {
    if (!stop.latitude || !stop.longitude) {
      result.set(stop.id, defaultCity);
      continue;
    }

    const stopLat = parseFloat(stop.latitude);
    const stopLon = parseFloat(stop.longitude);

    if (isNaN(stopLat) || isNaN(stopLon)) {
      result.set(stop.id, defaultCity);
      continue;
    }

    let nearestCity = defaultCity;
    let minDist = Infinity;

    for (const [cityName, coords] of cityCoords) {
      const dist = haversineKm(stopLat, stopLon, coords.lat, coords.lon);
      if (dist < minDist) {
        minDist = dist;
        nearestCity = cityName;
      }
    }

    result.set(stop.id, nearestCity);
  }

  return result;
}
