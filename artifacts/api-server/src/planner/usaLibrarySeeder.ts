/**
 * USA Library Seeder
 *
 * For each of the 60 USA cities in USA_CITIES, checks whether stop_library
 * already has ≥ the city's target stop count. If not, calls generateCityStops
 * to generate the shortfall and upserts them via saveStopLibraryEntries.
 *
 * Most cities default to DEFAULT_TARGET (20 stops). National parks and large
 * multi-day outdoor destinations override to a higher target via
 * CITY_TARGET_OVERRIDES — one config change raises pool depth for the whole
 * category without manual inserts.
 *
 * Fully idempotent — cities already at their target are skipped, and cities in
 * CURATED_CITIES are skipped unconditionally regardless of count (regenerating
 * AI stops would undo GP-fetch, dedup, and PSI-scoring already applied).
 * Processes cities sequentially with a 500 ms delay to respect rate limits.
 *
 * After seeding completes, kicks off startEnrichmentQueue("US") to enrich all
 * newly added stops.
 */

import { storage } from "../storage";

const DEFAULT_TARGET = 20;
const DELAY_BETWEEN_CITIES_MS = 500;

/**
 * Per-city stop-count targets.
 *
 * Rationale for higher targets:
 *   National parks (40): genuinely have 40+ named family destinations; a
 *     5–7 day trip at moderate pace consumes 12–14 stops, so 20 exhausts
 *     the pool and kills trip variety on repeat visits.
 *   Large outdoor destinations (35): week-long trips are common; 20 stops
 *     leaves almost no selection headroom after the planner picks anchors.
 *   Compact nature destinations (30): smaller footprint but still richer
 *     than a metro city — 30 gives the planner meaningful choice.
 *
 * All other cities stay at DEFAULT_TARGET = 20.
 */
const CITY_TARGET_OVERRIDES: Record<string, number> = {
  "Yellowstone":   40,
  "Grand Canyon":  40,
  "Yosemite":      40,
  "Bar Harbor":    35,   // Acadia National Park gateway
  "Gatlinburg":    35,   // Great Smoky Mountains
  "Jackson Hole":  35,
  "Big Island":    35,   // Hawaii Volcanoes NP + Mauna Kea
  "Anchorage":     35,
  "Sedona":        30,
  "Park City":     30,
};

// Cities whose library has been fully curated (GP-fetched, deduped, PSI-scored).
// The seeder must NOT regenerate stops for these — doing so re-injects un-scored
// AI stops and undoes the curation. Add a city here the moment its pipeline completes.
const CURATED_CITIES = new Set<string>([
  "Yellowstone",
  "Yosemite",
]);

const USA_CITIES = [
  "Orlando",
  "Washington DC",
  "New York",
  "San Diego",
  "Los Angeles",
  "Chicago",
  "Honolulu",
  "San Francisco",
  "Nashville",
  "Denver",
  "Miami",
  "Boston",
  "Seattle",
  "New Orleans",
  "Philadelphia",
  "Austin",
  "Las Vegas",
  "Portland",
  "Charleston",
  "Jackson Hole",
  "St. Louis",
  "Big Island",
  "Omaha",
  "San Antonio",
  "Atlanta",
  "Dallas",
  "Phoenix",
  "Salt Lake City",
  "Minneapolis",
  "Kansas City",
  "Memphis",
  "Baltimore",
  "Pittsburgh",
  "Indianapolis",
  "Cincinnati",
  "Columbus",
  "Houston",
  "Albuquerque",
  "Santa Fe",
  "Savannah",
  "Asheville",
  "Williamsburg",
  "Yellowstone",
  "Grand Canyon",
  "Yosemite",
  "Sedona",
  "Monterey",
  "Santa Barbara",
  "Napa Valley",
  "Park City",
  "Anchorage",
  "Louisville",
  "Charlotte",
  "Raleigh",
  "Richmond",
  "Tucson",
  "Boise",
  "Burlington",
  "Bar Harbor",
  "Gatlinburg",
  "Myrtle Beach",
];

function normalizeKey(city: string, country: string): string {
  return `${city.toLowerCase().trim()}:${country.toLowerCase().trim()}`;
}

function targetForCity(city: string): number {
  return CITY_TARGET_OVERRIDES[city] ?? DEFAULT_TARGET;
}

let usaSeedRunning = false;

export async function seedUSACityLibrary(): Promise<void> {
  if (usaSeedRunning) {
    console.log("[USALibrarySeeder] Already running — skipping duplicate call");
    return;
  }
  usaSeedRunning = true;

  console.log(`[USALibrarySeeder] Starting — ${USA_CITIES.length} cities to check`);

  let citiesSeeded = 0;
  let citiesSkipped = 0;
  let totalInserted = 0;

  try {
    const { generateCityStops } = await import("../travelContent.js");

    for (const city of USA_CITIES) {
      if (CURATED_CITIES.has(city)) {
        console.log(`[USALibrarySeeder] ✦ ${city} — curated, seeder will not regenerate (skipping)`);
        citiesSkipped++;
        continue;
      }
      const target = targetForCity(city);
      try {
        const existing = await storage.getStopLibraryByCity(city, "US");
        if (existing.length >= target) {
          console.log(`[USALibrarySeeder] ✓ ${city} — ${existing.length}/${target} stops already (skipping)`);
          citiesSkipped++;
          continue;
        }

        const needed = target - existing.length;
        console.log(`[USALibrarySeeder] → ${city} — ${existing.length}/${target} stops, generating ${needed} more…`);

        const generatedStops = await generateCityStops(city, null, "US", needed, "family_explorer");

        if (!generatedStops || generatedStops.length === 0) {
          console.warn(`[USALibrarySeeder] ⚠️  ${city} — generateCityStops returned no stops`);
          continue;
        }

        const nk = normalizeKey(city, "US");
        const entries = generatedStops
          .filter((s) => s.name && s.name.trim().length > 0)
          .map((s) => ({
            city,
            country: "US",
            normalizedKey: nk,
            name: s.name.trim(),
            address: s.address ?? null,
            latitude: s.latitude ?? null,
            longitude: s.longitude ?? null,
            stopType: s.stopType ?? "landmark",
            description: s.description ?? null,
            stopMissions: s.stopMissions && s.stopMissions.length > 0 ? s.stopMissions : null,
            source: "seeded" as const,
          }));

        if (entries.length === 0) {
          console.warn(`[USALibrarySeeder] ⚠️  ${city} — all generated stops had empty names`);
          continue;
        }

        const saved = await storage.saveStopLibraryEntries(entries);
        totalInserted += saved.length;
        citiesSeeded++;
        console.log(`[USALibrarySeeder] ✅ ${city} — inserted ${saved.length} stops (${entries.length - saved.length} already existed)`);
      } catch (cityErr) {
        console.error(`[USALibrarySeeder] ❌ ${city} — error:`, (cityErr as Error).message);
      }

      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CITIES_MS));
    }

    console.log(
      `[USALibrarySeeder] Complete — seeded: ${citiesSeeded} cities, skipped: ${citiesSkipped} cities, total new stops: ${totalInserted}`
    );
  } catch (err) {
    console.error("[USALibrarySeeder] Fatal error:", (err as Error).message);
  } finally {
    usaSeedRunning = false;
  }

  // Kick off enrichment for newly seeded USA stops (fire-and-forget)
  import("./stopLibraryEnricher.js")
    .then(({ startEnrichmentQueue }) => {
      startEnrichmentQueue("US");
    })
    .catch((err: any) => {
      console.warn("[USALibrarySeeder] Could not start enrichment queue:", err.message);
    });
}
