/**
 * One-shot PSI seeder for specific cities.
 * Usage: pnpm --filter @workspace/api-server run backfill:psi-cities
 */
import { runPsiForCity } from "./psiTrigger.js";

const CITIES: { city: string; country: string }[] = [
  { city: "Washington DC", country: "USA" },
  { city: "Minneapolis", country: "USA" },
];

async function main(): Promise<void> {
  for (const { city, country } of CITIES) {
    console.log(`\n[RunPsiCities] === ${city}, ${country} ===`);
    try {
      await runPsiForCity(city, country);
    } catch (err) {
      console.error(`[RunPsiCities] Failed for ${city}:`, (err as Error).message);
    }
  }
  console.log("\n[RunPsiCities] All done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[RunPsiCities] Fatal:", err);
    process.exit(1);
  });
