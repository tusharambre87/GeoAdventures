/**
 * One-shot Yellowstone library seeder.
 *
 * Generates the shortfall stops needed to bring Yellowstone up to its
 * target depth of 40 stops (the national-park tier in CITY_TARGET_OVERRIDES).
 * Idempotent: if Yellowstone already has ≥ 40 stops the script exits cleanly.
 *
 * This script is intentionally scoped to Yellowstone only. Once confirmed
 * working, run the full USA seeder to fill the other 7 park-city overrides.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run seed:yellowstone
 */

import { storage } from "../storage.js";

const CITY = "Yellowstone";
const COUNTRY = "USA";
const TARGET = 40;

function normalizeKey(city: string, country: string): string {
  return `${city.toLowerCase().trim()}:${country.toLowerCase().trim()}`;
}

async function run(): Promise<void> {
  console.log(`[SeedYellowstone] Checking stop_library for ${CITY}…`);

  const existing = await storage.getStopLibraryByCity(CITY, COUNTRY);
  console.log(`[SeedYellowstone] Found ${existing.length} existing stops (target: ${TARGET})`);

  if (existing.length >= TARGET) {
    console.log(`[SeedYellowstone] Already at target — nothing to do.`);
    process.exit(0);
  }

  const needed = TARGET - existing.length;
  console.log(`[SeedYellowstone] Generating ${needed} new stops via AI…`);

  const { generateCityStops } = await import("../travelContent.js");

  const generatedStops = await generateCityStops(
    CITY,
    null,
    COUNTRY,
    needed,
    "nature_expedition"  // outdoor/nature style fits Yellowstone better than generic family_explorer
  );

  if (!generatedStops || generatedStops.length === 0) {
    console.error(`[SeedYellowstone] generateCityStops returned no stops — aborting.`);
    process.exit(1);
  }

  console.log(`[SeedYellowstone] AI returned ${generatedStops.length} stops. Saving…`);

  const nk = normalizeKey(CITY, COUNTRY);
  const entries = generatedStops
    .filter((s) => s.name && s.name.trim().length > 0)
    .map((s) => ({
      city: CITY,
      country: COUNTRY,
      normalizedKey: nk,
      name: s.name.trim(),
      address: s.address ?? null,
      latitude: s.latitude ?? null,
      longitude: s.longitude ?? null,
      stopType: s.stopType ?? "nature",
      description: s.description ?? null,
      stopMissions: s.stopMissions && s.stopMissions.length > 0 ? s.stopMissions : null,
      source: "seeded" as const,
    }));

  if (entries.length === 0) {
    console.error(`[SeedYellowstone] All generated stops had empty names — aborting.`);
    process.exit(1);
  }

  const saved = await storage.saveStopLibraryEntries(entries);
  const duped = entries.length - saved.length;

  console.log(`[SeedYellowstone] ✅ Done:`);
  console.log(`  AI generated : ${generatedStops.length}`);
  console.log(`  Entries built: ${entries.length}`);
  console.log(`  Saved (new)  : ${saved.length}`);
  console.log(`  Skipped dupe : ${duped}  (name+normalizedKey conflict — already in library)`);

  const finalCount = await storage.getStopLibraryByCity(CITY, COUNTRY);
  console.log(`  Final library: ${finalCount.length}/${TARGET} stops`);
  console.log(`[SeedYellowstone] Next step: run GP backfill — new stops have gp_verified_at IS NULL`);
}

run().catch((err) => {
  console.error("[SeedYellowstone] Fatal:", err);
  process.exit(1);
});
