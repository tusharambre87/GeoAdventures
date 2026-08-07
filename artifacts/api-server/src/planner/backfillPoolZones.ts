/**
 * Zone-enrichment backfill for city_stop_pool_cache.
 *
 * Rather than regenerating pools from scratch, this script patches the existing
 * stop_pool JSONB in-place: for each city it calls the AI to assign a
 * neighborhoodZone to every stop that lacks one, then writes the result back.
 *
 * Why not full pool regeneration?
 *   generateCityStopPool queries stop_library, which has no neighborhood_zone
 *   column. Regenerating would still produce zero zones for library-sourced stops.
 *   The patch approach is ~1 cheap AI call per city instead of a full regeneration.
 *
 * Run:
 *   npx tsx src/planner/backfillPoolZones.ts              # all cities
 *   npx tsx src/planner/backfillPoolZones.ts Yellowstone  # single city (substring match)
 */

import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { cityStopPoolCache, type CachedStopCandidate } from "@workspace/db";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Mirrors CITY_ZONE_HINTS in plannerService — zone names must stay consistent.
const CITY_ZONE_HINTS: Record<string, string> = {
  "new york city":  "Midtown, Upper West Side, Upper East Side, Lower Manhattan, Brooklyn, Queens, Harlem, Battery Park City, SoHo/Tribeca, Astoria",
  "washington dc":  "National Mall, Georgetown, Dupont Circle, Capitol Hill, Southwest Waterfront, Adams Morgan, Penn Quarter",
  "london":         "Westminster/West End, South Bank, Kensington/Chelsea, East London, North London, Greenwich, Covent Garden",
  "paris":          "Eiffel Tower/7th, Marais/4th, Montmartre/18th, Latin Quarter/5th, Louvre/1st, Champs-Elysées/8th, Vincennes",
  "chicago":        "The Loop, River North, Navy Pier/Streeterville, Lincoln Park, Museum Campus, Hyde Park, Wrigleyville",
  "san francisco":  "Fisherman's Wharf/North Beach, Golden Gate/Presidio, Mission, Downtown/Union Square, Golden Gate Park, Chinatown, Haight-Ashbury",
  "los angeles":    "Hollywood, Santa Monica/Venice, Universal City, Downtown LA, Beverly Hills, Griffith Park, Long Beach",
  "orlando":        "Walt Disney World, Universal Studios Area, International Drive, SeaWorld Area, Downtown Orlando, Lake Buena Vista",
  "sydney":         "CBD/Circular Quay, Darling Harbour, Bondi/Eastern Suburbs, Manly/Northern Beaches, Inner West, Parramatta",
  "tokyo":          "Shinjuku, Shibuya, Asakusa/Ueno, Odaiba, Harajuku/Omotesando, Akihabara, Ikebukuro",
  "singapore":      "Marina Bay, Orchard Road, Sentosa, Chinatown/Kampong Glam, Little India, Jurong, Changi",
  "dubai":          "Downtown Dubai, Dubai Marina, Deira, Jumeirah, Al Quoz, Palm Jumeirah, Dubai Creek",
  "boston":         "Downtown/Beacon Hill, Back Bay, Fenway/Kenmore, Cambridge, Charlestown, South Boston, North End",
  "miami":          "South Beach/Art Deco, Brickell/Downtown, Wynwood, Coconut Grove, Coral Gables, Key Biscayne, Midtown",
  "seattle":        "Downtown/Pike Place, Capitol Hill, Queen Anne/Seattle Center, Ballard, South Lake Union, Fremont, West Seattle",
};

function getZoneHint(city: string): string | undefined {
  const key = city.toLowerCase().trim()
    .replace(/\s*(national park|np)\s*/gi, " ")
    .replace(/,.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return CITY_ZONE_HINTS[key];
}

async function assignZones(
  city: string,
  country: string,
  stopNames: string[],
): Promise<Map<string, string>> {
  const zoneHint = getZoneHint(city);
  const zoneInstruction = zoneHint
    ? `Use ONLY these zone names (pick the closest match for each stop): ${zoneHint}.`
    : `Use the city's standard neighbourhood, district, or area names. Be specific and consistent — nearby stops should share the same zone label.`;

  const prompt = `You are a geographic expert. For each stop below in ${city}, ${country}, assign a neighborhoodZone — the specific neighbourhood, district, or area where it is located.

${zoneInstruction}

Return a JSON object:
{
  "zones": [
    { "name": "Exact stop name", "neighborhoodZone": "Area name" }
  ]
}

Stops:
${stopNames.map(n => `- ${n}`).join("\n")}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 1500,
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: { zones?: { name: string; neighborhoodZone: string }[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Map();
  }

  const result = new Map<string, string>();
  for (const entry of parsed.zones ?? []) {
    if (entry.name && entry.neighborhoodZone) {
      result.set(entry.name.trim(), entry.neighborhoodZone.trim());
    }
  }
  return result;
}

async function processCity(row: {
  id: string;
  city: string;
  country: string;
  stopPool: CachedStopCandidate[];
}): Promise<{ added: number; alreadyHad: number; missing: number }> {
  const stops = row.stopPool;
  const needZone = stops.filter(s => !s.neighborhoodZone);

  if (needZone.length === 0) {
    return { added: 0, alreadyHad: stops.length, missing: 0 };
  }

  const zoneMap = await assignZones(row.city, row.country, needZone.map(s => s.name));

  let added = 0;
  let missing = 0;
  const patched = stops.map(stop => {
    if (stop.neighborhoodZone) return stop;
    const zone = zoneMap.get(stop.name.trim());
    if (!zone) { missing++; return stop; }
    added++;
    return { ...stop, neighborhoodZone: zone };
  });

  await db
    .update(cityStopPoolCache)
    .set({ stopPool: patched as unknown as CachedStopCandidate[] })
    .where(eq(cityStopPoolCache.id, row.id));

  return { added, alreadyHad: stops.length - needZone.length, missing };
}

async function main() {
  const filterArg = process.argv[2]?.toLowerCase();

  const rows = await db
    .select({
      id: cityStopPoolCache.id,
      city: cityStopPoolCache.city,
      country: cityStopPoolCache.country,
      stopPool: cityStopPoolCache.stopPool,
    })
    .from(cityStopPoolCache)
    .orderBy(cityStopPoolCache.city);

  const targets = filterArg
    ? rows.filter(r => r.city.toLowerCase().includes(filterArg))
    : rows;

  if (targets.length === 0) {
    console.log(`No cities matched filter "${filterArg}". Exiting.`);
    process.exit(0);
  }

  console.log(`\n🗺  Pool zone backfill — ${targets.length} cit${targets.length === 1 ? "y" : "ies"}${filterArg ? ` (filter: "${filterArg}")` : ""}\n`);

  const CONCURRENCY = 5;
  let totalAdded = 0;
  let totalAlreadyHad = 0;
  let totalMissing = 0;
  let totalFailed = 0;

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (row, bi) => {
        const idx = i + bi + 1;
        const needCount = (row.stopPool as CachedStopCandidate[]).filter(s => !(s as CachedStopCandidate).neighborhoodZone).length;
        process.stdout.write(
          `  [${String(idx).padStart(3)}/${targets.length}] ${row.city.padEnd(30)} ${String(needCount).padStart(2)} unzoned … `
        );
        const r = await processCity({ ...row, stopPool: row.stopPool as CachedStopCandidate[] });
        console.log(`+${r.added} zones  (had ${r.alreadyHad}, missed ${r.missing})`);
        return r;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        totalAdded     += r.value.added;
        totalAlreadyHad += r.value.alreadyHad;
        totalMissing   += r.value.missing;
      } else {
        totalFailed++;
        console.error("  ❌", r.reason);
      }
    }

    if (i + CONCURRENCY < targets.length) {
      await new Promise(res => setTimeout(res, 600));
    }
  }

  console.log(`\n🏁  Done — ${totalAdded} zones added, ${totalAlreadyHad} already present, ${totalMissing} unresolved, ${totalFailed} cities errored\n`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
