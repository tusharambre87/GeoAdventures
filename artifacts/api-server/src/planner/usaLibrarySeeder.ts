/**
 * USA Library Seeder
 *
 * For each of the 60 USA cities in CITIES_TO_SEED, checks whether stop_library
 * already has ≥20 stops. If not, calls generateCityStops to generate the
 * shortfall and upserts them via saveStopLibraryEntries.
 *
 * Fully idempotent — cities already at ≥20 stops are skipped.
 * Processes cities sequentially with a 500ms delay to respect rate limits.
 *
 * After seeding completes, kicks off startEnrichmentQueue("USA") to enrich all
 * newly added stops.
 */

import { storage } from "../storage";

const TARGET_STOPS = 20;
const DELAY_BETWEEN_CITIES_MS = 500;

const USA_CITIES = [
  "Orlando",
  "Washington DC",
  "New York City",
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

let usaSeedRunning = false;

export async function seedUSACityLibrary(): Promise<void> {
  if (usaSeedRunning) {
    console.log("[USALibrarySeeder] Already running — skipping duplicate call");
    return;
  }
  usaSeedRunning = true;

  console.log(`[USALibrarySeeder] Starting — ${USA_CITIES.length} cities to check (target: ${TARGET_STOPS} stops each)`);

  let citiesSeeded = 0;
  let citiesSkipped = 0;
  let totalInserted = 0;

  try {
    const { generateCityStops } = await import("../travelContent.js");

    for (const city of USA_CITIES) {
      try {
        const existing = await storage.getStopLibraryByCity(city, "USA");
        if (existing.length >= TARGET_STOPS) {
          console.log(`[USALibrarySeeder] ✓ ${city} — ${existing.length} stops already (skipping)`);
          citiesSkipped++;
          continue;
        }

        const needed = TARGET_STOPS - existing.length;
        console.log(`[USALibrarySeeder] → ${city} — ${existing.length}/${TARGET_STOPS} stops, generating ${needed} more…`);

        const generatedStops = await generateCityStops(city, null, "USA", needed, "family_explorer");

        if (!generatedStops || generatedStops.length === 0) {
          console.warn(`[USALibrarySeeder] ⚠️  ${city} — generateCityStops returned no stops`);
          continue;
        }

        const nk = normalizeKey(city, "USA");
        const entries = generatedStops
          .filter((s) => s.name && s.name.trim().length > 0)
          .map((s) => ({
            city,
            country: "USA",
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
      startEnrichmentQueue("USA");
    })
    .catch((err: any) => {
      console.warn("[USALibrarySeeder] Could not start enrichment queue:", err.message);
    });
}
