/**
 * One-shot Yosemite library seeder.
 *
 * Generates the shortfall stops needed to bring Yosemite up to its
 * target depth of 40 stops (the national-park tier in CITY_TARGET_OVERRIDES).
 * Idempotent: if Yosemite already has ≥ 40 stops the script exits cleanly.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run seed:yosemite
 */

import { storage } from "../storage.js";

const CITY = "Yosemite";
const COUNTRY = "USA";
const TARGET = 40;

function normalizeKey(city: string, country: string): string {
  return `${city.toLowerCase().trim()}:${country.toLowerCase().trim()}`;
}

async function run(): Promise<void> {
  console.log(`[SeedYosemite] Checking stop_library for ${CITY}…`);

  const existing = await storage.getStopLibraryByCity(CITY, COUNTRY);
  console.log(`[SeedYosemite] Found ${existing.length} existing stops (target: ${TARGET})`);

  if (existing.length >= TARGET) {
    console.log(`[SeedYosemite] Already at target — nothing to do.`);
    process.exit(0);
  }

  const needed = TARGET - existing.length;
  console.log(`[SeedYosemite] Generating ${needed} new stops via AI (batches of 10)…`);

  const { generateCityStops } = await import("../travelContent.js");

  const BATCH_SIZE = 10;
  const nk = normalizeKey(CITY, COUNTRY);
  let totalSaved = 0;
  let totalDuped = 0;
  let remaining = needed;

  while (remaining > 0) {
    const batchSize = Math.min(BATCH_SIZE, remaining);
    console.log(`[SeedYosemite] Batch: requesting ${batchSize} stops (${remaining} still needed)…`);

    const generatedStops = await generateCityStops(
      CITY,
      null,
      COUNTRY,
      batchSize,
      "nature_expedition"
    );

    if (!generatedStops || generatedStops.length === 0) {
      console.error(`[SeedYosemite] Batch returned no stops — aborting.`);
      process.exit(1);
    }

    console.log(`[SeedYosemite] AI returned ${generatedStops.length} stops. Saving…`);

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

    const saved = await storage.saveStopLibraryEntries(entries);
    totalSaved += saved.length;
    totalDuped += entries.length - saved.length;
    remaining -= saved.length;
    console.log(`[SeedYosemite] Saved ${saved.length} (${entries.length - saved.length} dupes). Remaining: ${remaining}`);

    // small pause between batches
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`[SeedYosemite] ✅ Done:`);
  console.log(`  Saved (new)  : ${totalSaved}`);
  console.log(`  Skipped dupe : ${totalDuped}`);

  const finalCount = await storage.getStopLibraryByCity(CITY, COUNTRY);
  console.log(`  Final library: ${finalCount.length}/${TARGET} stops`);
  console.log(`[SeedYosemite] Next step: run GP backfill — new stops have gp_verified_at IS NULL`);
}

run().catch((err) => {
  console.error("[SeedYosemite] Fatal:", err);
  process.exit(1);
});
