/**
 * International Library Seeder
 *
 * For each major international city (Europe, Asia, Australia, South America,
 * Middle East, Africa, etc.), checks whether stop_library already has ≥20 stops.
 * If not, calls generateCityStops to generate the shortfall and upserts them
 * via saveStopLibraryEntries.
 *
 * Fully idempotent — cities already at ≥20 stops are skipped.
 * Processes cities sequentially with a 500ms delay to respect rate limits.
 *
 * After seeding completes, kicks off startEnrichmentQueue("INTERNATIONAL") to
 * enrich all newly added stops.
 */

import { storage } from "../storage";

const TARGET_STOPS = 20;
const DELAY_BETWEEN_CITIES_MS = 500;

interface CityEntry {
  city: string;
  country: string;
}

const INTERNATIONAL_CITIES: CityEntry[] = [
  // ── Europe ─────────────────────────────────────────────────────────────────
  { city: "London", country: "United Kingdom" },
  { city: "Paris", country: "France" },
  { city: "Rome", country: "Italy" },
  { city: "Barcelona", country: "Spain" },
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Vienna", country: "Austria" },
  { city: "Prague", country: "Czech Republic" },
  { city: "Budapest", country: "Hungary" },
  { city: "Lisbon", country: "Portugal" },
  { city: "Dublin", country: "Ireland" },
  { city: "Edinburgh", country: "United Kingdom" },
  { city: "Brussels", country: "Belgium" },
  { city: "Zurich", country: "Switzerland" },
  { city: "Interlaken", country: "Switzerland" },
  { city: "Munich", country: "Germany" },
  { city: "Berlin", country: "Germany" },
  { city: "Copenhagen", country: "Denmark" },
  { city: "Stockholm", country: "Sweden" },
  { city: "Oslo", country: "Norway" },
  { city: "Helsinki", country: "Finland" },
  { city: "Athens", country: "Greece" },
  { city: "Santorini", country: "Greece" },
  { city: "Florence", country: "Italy" },
  { city: "Venice", country: "Italy" },
  { city: "Milan", country: "Italy" },
  { city: "Madrid", country: "Spain" },
  { city: "Seville", country: "Spain" },
  { city: "Porto", country: "Portugal" },
  { city: "Reykjavik", country: "Iceland" },
  { city: "Dubrovnik", country: "Croatia" },

  // ── Asia (Non-India) ────────────────────────────────────────────────────────
  { city: "Tokyo", country: "Japan" },
  { city: "Kyoto", country: "Japan" },
  { city: "Osaka", country: "Japan" },
  { city: "Hiroshima", country: "Japan" },
  { city: "Seoul", country: "South Korea" },
  { city: "Bangkok", country: "Thailand" },
  { city: "Chiang Mai", country: "Thailand" },
  { city: "Phuket", country: "Thailand" },
  { city: "Singapore", country: "Singapore" },
  { city: "Bali", country: "Indonesia" },
  { city: "Kuala Lumpur", country: "Malaysia" },
  { city: "Hong Kong", country: "China" },
  { city: "Beijing", country: "China" },
  { city: "Shanghai", country: "China" },
  { city: "Hanoi", country: "Vietnam" },
  { city: "Ho Chi Minh City", country: "Vietnam" },
  { city: "Hoi An", country: "Vietnam" },
  { city: "Siem Reap", country: "Cambodia" },
  { city: "Taipei", country: "Taiwan" },
  { city: "Kathmandu", country: "Nepal" },

  // ── Middle East ─────────────────────────────────────────────────────────────
  { city: "Dubai", country: "UAE" },
  { city: "Abu Dhabi", country: "UAE" },
  { city: "Doha", country: "Qatar" },
  { city: "Muscat", country: "Oman" },
  { city: "Istanbul", country: "Turkey" },
  { city: "Cappadocia", country: "Turkey" },

  // ── Australia & New Zealand ─────────────────────────────────────────────────
  { city: "Sydney", country: "Australia" },
  { city: "Melbourne", country: "Australia" },
  { city: "Brisbane", country: "Australia" },
  { city: "Cairns", country: "Australia" },
  { city: "Gold Coast", country: "Australia" },
  { city: "Auckland", country: "New Zealand" },
  { city: "Queenstown", country: "New Zealand" },
  { city: "Rotorua", country: "New Zealand" },

  // ── South America ───────────────────────────────────────────────────────────
  { city: "Buenos Aires", country: "Argentina" },
  { city: "Rio de Janeiro", country: "Brazil" },
  { city: "São Paulo", country: "Brazil" },
  { city: "Cusco", country: "Peru" },
  { city: "Machu Picchu", country: "Peru" },
  { city: "Lima", country: "Peru" },
  { city: "Cartagena", country: "Colombia" },
  { city: "Bogotá", country: "Colombia" },
  { city: "Santiago", country: "Chile" },
  { city: "Patagonia", country: "Argentina" },

  // ── Africa ──────────────────────────────────────────────────────────────────
  { city: "Cape Town", country: "South Africa" },
  { city: "Johannesburg", country: "South Africa" },
  { city: "Marrakech", country: "Morocco" },
  { city: "Cairo", country: "Egypt" },
  { city: "Nairobi", country: "Kenya" },
  { city: "Zanzibar", country: "Tanzania" },

  // ── Canada ──────────────────────────────────────────────────────────────────
  { city: "Toronto", country: "Canada" },
  { city: "Vancouver", country: "Canada" },
  { city: "Montreal", country: "Canada" },
  { city: "Quebec City", country: "Canada" },
  { city: "Banff", country: "Canada" },
  { city: "Victoria", country: "Canada" },

  // ── Mexico & Caribbean ──────────────────────────────────────────────────────
  { city: "Mexico City", country: "Mexico" },
  { city: "Cancun", country: "Mexico" },
  { city: "Oaxaca", country: "Mexico" },
  { city: "San Miguel de Allende", country: "Mexico" },
  { city: "Punta Cana", country: "Dominican Republic" },
  { city: "San Juan", country: "Puerto Rico" },
];

function normalizeKey(city: string, country: string): string {
  return `${city.toLowerCase().trim()}:${country.toLowerCase().trim()}`;
}

let internationalSeedRunning = false;

export async function seedInternationalCityLibrary(): Promise<void> {
  if (internationalSeedRunning) {
    console.log("[InternationalLibrarySeeder] Already running — skipping duplicate call");
    return;
  }
  internationalSeedRunning = true;

  console.log(
    `[InternationalLibrarySeeder] Starting — ${INTERNATIONAL_CITIES.length} cities to check (target: ${TARGET_STOPS} stops each)`
  );

  let citiesSeeded = 0;
  let citiesSkipped = 0;
  let totalInserted = 0;

  try {
    const { generateCityStops } = await import("../travelContent.js");

    for (const { city, country } of INTERNATIONAL_CITIES) {
      try {
        const existing = await storage.getStopLibraryByCity(city, country);
        if (existing.length >= TARGET_STOPS) {
          console.log(
            `[InternationalLibrarySeeder] ✓ ${city}, ${country} — ${existing.length} stops already (skipping)`
          );
          citiesSkipped++;
          continue;
        }

        const needed = TARGET_STOPS - existing.length;
        console.log(
          `[InternationalLibrarySeeder] → ${city}, ${country} — ${existing.length}/${TARGET_STOPS} stops, generating ${needed} more…`
        );

        const generatedStops = await generateCityStops(city, null, country, needed, "family_explorer");

        if (!generatedStops || generatedStops.length === 0) {
          console.warn(`[InternationalLibrarySeeder] ⚠️  ${city}, ${country} — generateCityStops returned no stops`);
          continue;
        }

        const nk = normalizeKey(city, country);
        const entries = generatedStops
          .filter((s) => s.name && s.name.trim().length > 0)
          .map((s) => ({
            city,
            country,
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
          console.warn(`[InternationalLibrarySeeder] ⚠️  ${city}, ${country} — all generated stops had empty names`);
          continue;
        }

        const saved = await storage.saveStopLibraryEntries(entries);
        totalInserted += saved.length;
        citiesSeeded++;
        console.log(
          `[InternationalLibrarySeeder] ✅ ${city}, ${country} — inserted ${saved.length} stops (${entries.length - saved.length} already existed)`
        );
      } catch (cityErr) {
        console.error(
          `[InternationalLibrarySeeder] ❌ ${city}, ${country} — error:`,
          (cityErr as Error).message
        );
      }

      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CITIES_MS));
    }

    console.log(
      `[InternationalLibrarySeeder] Complete — seeded: ${citiesSeeded} cities, skipped: ${citiesSkipped} cities, total new stops: ${totalInserted}`
    );
  } catch (err) {
    console.error("[InternationalLibrarySeeder] Fatal error:", (err as Error).message);
  } finally {
    internationalSeedRunning = false;
  }

  // Kick off enrichment for newly seeded international stops (fire-and-forget).
  // No country filter — international stops span many real country values (UK, France, Japan, etc.)
  // so we enrich all pending unenriched stops across the library.
  import("./stopLibraryEnricher.js")
    .then(({ startEnrichmentQueue }) => {
      startEnrichmentQueue();
    })
    .catch((err: any) => {
      console.warn("[InternationalLibrarySeeder] Could not start enrichment queue:", err.message);
    });
}
