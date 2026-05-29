/**
 * helpNearby.ts
 * Proxies an OpenStreetMap Overpass API query for nearby medical facilities.
 * Returns top 2 results per type: urgent_care, pharmacy, hospital.
 * No API key required — Overpass is open and free.
 */

interface NearbyPlace {
  name: string;
  type: "urgent_care" | "pharmacy" | "hospital";
  distanceMeters: number;
  lat: number;
  lng: number;
  phone?: string;
  isOpen?: boolean;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseIsOpen(openingHours?: string): boolean | undefined {
  if (!openingHours) return undefined;
  const h = openingHours.toLowerCase().trim();
  if (h === "24/7" || h === "mo-su 00:00-24:00") return true;
  const now = new Date();
  const day = ["su", "mo", "tu", "we", "th", "fr", "sa"][now.getDay()];
  const hour = now.getHours() + now.getMinutes() / 60;
  const dayMatch = new RegExp(`${day}[\\w-]*[\\s,]*(\\d{2}:\\d{2})-(\\d{2}:\\d{2})`);
  const m = h.match(dayMatch);
  if (!m) return undefined;
  const [, startStr, endStr] = m;
  const toH = (t: string) => {
    const [hh, mm] = t.split(":").map(Number);
    return hh + mm / 60;
  };
  return hour >= toH(startStr) && hour < toH(endStr);
}

export async function fetchNearbyHelp(lat: number, lng: number): Promise<NearbyPlace[]> {
  // 15 km radius for US suburban coverage; broader tag set to catch US-style tagging
  const radius = 15000;
  const query = `[out:json][timeout:25];
(
  node["amenity"~"^(clinic|doctors|urgent_care)$"](around:${radius},${lat},${lng});
  way["amenity"~"^(clinic|doctors|urgent_care)$"](around:${radius},${lat},${lng});
  node["healthcare"~"^(centre|clinic|urgent_care)$"](around:${radius},${lat},${lng});
  way["healthcare"~"^(centre|clinic|urgent_care)$"](around:${radius},${lat},${lng});
  node["healthcare:speciality"="urgent_care"](around:${radius},${lat},${lng});
  way["healthcare:speciality"="urgent_care"](around:${radius},${lat},${lng});
  node["amenity"="pharmacy"](around:${radius},${lat},${lng});
  way["amenity"="pharmacy"](around:${radius},${lat},${lng});
  node["amenity"="hospital"](around:${radius},${lat},${lng});
  way["amenity"="hospital"](around:${radius},${lat},${lng});
);
out center;`;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  const elements: any[] = data.elements || [];

  type Bucket = { type: NearbyPlace["type"]; candidates: NearbyPlace[] };
  const buckets: Record<string, Bucket> = {
    urgent_care: { type: "urgent_care", candidates: [] },
    pharmacy:    { type: "pharmacy",    candidates: [] },
    hospital:    { type: "hospital",    candidates: [] },
  };

  for (const el of elements) {
    const tags = el.tags || {};
    const name = (tags.name || tags["name:en"] || "").trim();
    if (!name) continue;

    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (elLat == null || elLng == null) continue;

    const amenity: string = tags.amenity || "";
    const healthcare: string = tags.healthcare || "";

    let bucket: string | null = null;
    if (amenity === "clinic" || amenity === "doctors" || amenity === "urgent_care") {
      bucket = "urgent_care";
    } else if (healthcare === "centre" || healthcare === "clinic") {
      bucket = "urgent_care";
    } else if (amenity === "pharmacy") {
      bucket = "pharmacy";
    } else if (amenity === "hospital") {
      bucket = "hospital";
    }
    if (!bucket) continue;

    const distanceMeters = haversineMeters(lat, lng, elLat, elLng);
    const phone = tags.phone || tags["contact:phone"] || undefined;
    const isOpen = parseIsOpen(tags.opening_hours);

    buckets[bucket].candidates.push({
      name,
      type: buckets[bucket].type,
      distanceMeters: Math.round(distanceMeters),
      lat: elLat,
      lng: elLng,
      phone: phone ? String(phone).trim() : undefined,
      isOpen,
    });
  }

  // Return up to 2 results per type, sorted nearest first
  const RESULTS_PER_TYPE = 2;
  const results: NearbyPlace[] = [];
  for (const key of ["urgent_care", "pharmacy", "hospital"] as const) {
    const { candidates } = buckets[key];
    if (candidates.length === 0) continue;
    candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
    results.push(...candidates.slice(0, RESULTS_PER_TYPE));
  }

  return results;
}
