/**
 * One-off script: Seed all 40 India city stop pools.
 * Skips cities that already have ≥ 15 stops.
 * Run: npx tsx scripts/seed-india-pools.ts
 */

import { db } from "../server/db";
import { generateCityStopPool } from "../server/planner/plannerService";
import { storage } from "../server/storage";
import { sql } from "drizzle-orm";

const INDIA_CITIES = [
  "Delhi", "Agra", "Jaipur", "Goa", "Mumbai", "Kochi", "Manali", "Shimla",
  "Darjeeling", "Udaipur", "Varanasi", "Ooty", "Munnar", "Mysore", "Rishikesh",
  "Ranthambore", "Bangalore", "Andaman Islands", "Chennai", "Hyderabad", "Kolkata",
  "Pune", "Ahmedabad", "Jodhpur", "Pushkar", "Hampi", "Coorg", "Alleppey",
  "Leh Ladakh", "Amritsar", "Pondicherry", "Madurai", "Mahabalipuram",
  "Mount Abu", "Varkala", "Bhubaneswar", "Tirupati", "Lonavala", "Jaisalmer", "Bikaner",
];

const MIN_STOPS = 15;
const COUNTRY = "India";

async function main() {
  console.log(`\n🇮🇳 India City Pool Seeder`);
  console.log(`Target: ${INDIA_CITIES.length} cities, minimum ${MIN_STOPS} stops each\n`);

  // Get current status
  const existing = await db.execute(
    sql`SELECT city, jsonb_array_length(stop_pool) as stops 
        FROM city_stop_pool_cache WHERE country = 'India' ORDER BY city`
  );
  const existingMap = new Map<string, number>();
  for (const row of (existing as any).rows) {
    existingMap.set(row.city, parseInt(row.stops));
  }

  const toSeed = INDIA_CITIES.filter(city => {
    const stops = existingMap.get(city) ?? 0;
    return stops < MIN_STOPS;
  });
  const alreadyGood = INDIA_CITIES.filter(city => (existingMap.get(city) ?? 0) >= MIN_STOPS);

  console.log(`✅ Already good (≥${MIN_STOPS} stops): ${alreadyGood.length} cities`);
  console.log(`   ${alreadyGood.map(c => `${c} (${existingMap.get(c)})`).join(', ')}`);
  console.log(`\n🔄 Need seeding: ${toSeed.length} cities`);
  console.log(`   ${toSeed.join(', ')}\n`);

  if (toSeed.length === 0) {
    console.log("🎉 All 40 India cities already have good pools! Nothing to do.");
    process.exit(0);
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < toSeed.length; i++) {
    const city = toSeed[i];
    const progress = `[${i + 1}/${toSeed.length}]`;

    try {
      console.log(`${progress} Generating: ${city}, ${COUNTRY}...`);
      const pool = await generateCityStopPool(city, COUNTRY);

      if (pool.length === 0) {
        console.log(`${progress} ⚠️  No stops generated for ${city} — skipping`);
        failed++;
        continue;
      }

      // Delete existing thin entry if any
      await db.execute(
        sql`DELETE FROM city_stop_pool_cache WHERE city = ${city} AND country = ${COUNTRY}`
      );

      await storage.saveCityStopPool({
        city,
        country: COUNTRY,
        normalizedKey: `${city.toLowerCase().trim()}:${COUNTRY.toLowerCase().trim()}`,
        stopPool: pool,
      });

      console.log(`${progress} ✅ ${city}: ${pool.length} stops saved\n`);
      success++;

      // Small delay between cities to be kind to the API
      if (i < toSeed.length - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    } catch (err) {
      console.error(`${progress} ❌ Failed ${city}:`, err);
      failed++;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🏁 Done — ✅ ${success} seeded  ❌ ${failed} failed`);

  // Final status report
  console.log(`\n📊 Final India Pool Status:`);
  const final = await db.execute(
    sql`SELECT city, jsonb_array_length(stop_pool) as stops 
        FROM city_stop_pool_cache WHERE country = 'India' ORDER BY city`
  );
  const finalRows = (final as any).rows;
  let totalGood = 0;
  for (const row of finalRows) {
    const stops = parseInt(row.stops);
    const icon = stops >= MIN_STOPS ? '✅' : '⚠️ ';
    console.log(`  ${icon} ${row.city}: ${stops} stops`);
    if (stops >= MIN_STOPS) totalGood++;
  }
  const missing40 = INDIA_CITIES.filter(c => !finalRows.find((r: any) => r.city === c));
  for (const city of missing40) {
    console.log(`  ❌ ${city}: not in DB`);
  }
  console.log(`\n${totalGood}/${INDIA_CITIES.length} cities fully seeded ✅`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
