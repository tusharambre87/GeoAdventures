/**
 * International Landmark Photo Seeder
 *
 * Pre-seeds the compass_landmark_images table with storybook-style artwork for
 * the cities listed in cityLandmarkMap.ts.
 * Each city maps to a canonical svgKey; the seeder calls getOrGenerateLandmarkImage
 * for every key, which:
 *   1. Returns immediately if an image already exists in the DB (idempotent).
 *   2. Generates a DALL-E 3 image and caches it for all future requests if not.
 *
 * This eliminates the cold-start delay families experience the first time they
 * view a landmark card for London, Tokyo, Paris, Sydney, etc.
 *
 * Processes cities sequentially with a 2 s delay between generations to stay
 * within DALL-E rate limits.
 */

import { getOrGenerateLandmarkImage } from "../compassLandmarkImageService.js";
import { CITY_LANDMARKS } from "../cityLandmarkMap.js";

const DELAY_BETWEEN_CITIES_MS = 2000;

let seedRunning = false;

export interface InternationalLandmarkSeedResult {
  total: number;
  generated: number;
  alreadyCached: number;
  failed: number;
  cities: Array<{ city: string; country: string; svgKey: string; status: "cached" | "generated" | "failed" }>;
}

/**
 * Pre-seeds landmark photos for all configured cities.
 * Idempotent — cities already cached in the DB are skipped instantly.
 * Returns a summary of what happened.
 */
export async function seedInternationalLandmarkPhotos(): Promise<InternationalLandmarkSeedResult> {
  if (seedRunning) {
    console.log("[IntlLandmarkSeeder] Already running — skipping duplicate call");
    return { total: 0, generated: 0, alreadyCached: 0, failed: 0, cities: [] };
  }
  seedRunning = true;

  const result: InternationalLandmarkSeedResult = {
    total: CITY_LANDMARKS.length,
    generated: 0,
    alreadyCached: 0,
    failed: 0,
    cities: [],
  };

  console.log(
    `[IntlLandmarkSeeder] Starting — ${CITY_LANDMARKS.length} cities to pre-seed`
  );

  try {
    const { db } = await import("../db.js");
    const { compassLandmarkImages } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    for (const { city, country, svgKey } of CITY_LANDMARKS) {
      try {
        // Check DB directly to distinguish "already cached" vs "newly generated"
        // without burning an API call.
        const existing = await db
          .select({ svgKey: compassLandmarkImages.svgKey })
          .from(compassLandmarkImages)
          .where(eq(compassLandmarkImages.svgKey, svgKey))
          .limit(1);

        if (existing.length > 0) {
          console.log(`[IntlLandmarkSeeder] ✓ ${city}, ${country} (${svgKey}) — already cached`);
          result.alreadyCached++;
          result.cities.push({ city, country, svgKey, status: "cached" });
          continue;
        }

        console.log(`[IntlLandmarkSeeder] → ${city}, ${country} (${svgKey}) — generating…`);
        const imageData = await getOrGenerateLandmarkImage(svgKey, city);

        if (imageData) {
          console.log(`[IntlLandmarkSeeder] ✅ ${city}, ${country} (${svgKey}) — generated & cached`);
          result.generated++;
          result.cities.push({ city, country, svgKey, status: "generated" });
        } else {
          console.warn(`[IntlLandmarkSeeder] ⚠️  ${city}, ${country} (${svgKey}) — generation returned null`);
          result.failed++;
          result.cities.push({ city, country, svgKey, status: "failed" });
        }

        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CITIES_MS));
      } catch (cityErr) {
        console.error(
          `[IntlLandmarkSeeder] ❌ ${city}, ${country} (${svgKey}) — error:`,
          (cityErr as Error).message
        );
        result.failed++;
        result.cities.push({ city, country, svgKey, status: "failed" });
        // Brief back-off before next city on error
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CITIES_MS));
      }
    }
  } finally {
    seedRunning = false;
  }

  console.log(
    `[IntlLandmarkSeeder] Complete — generated: ${result.generated}, ` +
    `already cached: ${result.alreadyCached}, failed: ${result.failed}`
  );

  return result;
}
