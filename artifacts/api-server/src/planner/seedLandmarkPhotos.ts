/**
 * Landmark photo seeder — populates compass_landmark_images via DALL-E 3.
 * Idempotent: already-cached cities are skipped.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:landmarks          # all cities
 *   pnpm --filter @workspace/api-server run backfill:landmarks:dc       # DC only
 *   LANDMARK_CITY="Paris" pnpm --filter @workspace/api-server run backfill:landmarks
 */

import { getOrGenerateLandmarkImage } from "../compassLandmarkImageService.js";
import { CITY_LANDMARKS } from "../cityLandmarkMap.js";
import { db } from "../db.js";
import { compassLandmarkImages } from "@workspace/db";
import { eq } from "drizzle-orm";

const DELAY_MS = 2500;
const filterCity = process.env.LANDMARK_CITY ?? null;

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const targets = filterCity
    ? CITY_LANDMARKS.filter(c => c.city.toLowerCase() === filterCity.toLowerCase())
    : CITY_LANDMARKS;

  if (targets.length === 0) {
    console.error(`No cities matched LANDMARK_CITY="${filterCity}". Available: ${CITY_LANDMARKS.map(c => c.city).join(', ')}`);
    process.exit(1);
  }

  console.log(`[LandmarkSeeder] Starting — ${targets.length} cities to seed`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const { city, country, svgKey } of targets) {
    try {
      const existing = await db
        .select({ svgKey: compassLandmarkImages.svgKey })
        .from(compassLandmarkImages)
        .where(eq(compassLandmarkImages.svgKey, svgKey))
        .limit(1);

      if (existing.length > 0) {
        console.log(`[LandmarkSeeder] ✓ ${city} (${svgKey}) — already cached, skipping`);
        skipped++;
        continue;
      }

      console.log(`[LandmarkSeeder] → ${city}, ${country} (${svgKey}) — generating via DALL-E 3…`);
      const result = await getOrGenerateLandmarkImage(svgKey, city);

      if (result) {
        console.log(`[LandmarkSeeder] ✅ ${city} (${svgKey}) — done (${result.length} chars)`);
        generated++;
      } else {
        console.warn(`[LandmarkSeeder] ⚠️  ${city} (${svgKey}) — generation returned null`);
        failed++;
      }

      if (generated + failed < targets.length) {
        await sleep(DELAY_MS);
      }
    } catch (err) {
      console.error(`[LandmarkSeeder] ❌ ${city} (${svgKey}):`, (err as Error).message);
      failed++;
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n[LandmarkSeeder] Complete — generated: ${generated}, skipped: ${skipped}, failed: ${failed}`);
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
