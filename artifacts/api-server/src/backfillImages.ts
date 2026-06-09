/**
 * One-time backfill: generate DALL-E 3 hero images for all travel_stops that
 * have no hero_image_url yet.
 *
 * Rate: DALL-E 3 standard tier allows 5 images/minute → 12s gap between calls.
 * Estimate: ~1,176 stops × 12s ≈ 4 hours. Run overnight.
 *
 * The script is fully idempotent — stops that already have a heroImageUrl are
 * skipped. Safe to re-run if interrupted.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:images
 */

import { db } from "./db.js";
import { travelStops } from "@workspace/db";
import { isNull } from "drizzle-orm";
import OpenAI from "openai";

const DELAY_MS = 12_000; // 5 images/min on standard tier

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const stops = await db
    .select({ id: travelStops.id, name: travelStops.name, cityGroup: travelStops.cityGroup })
    .from(travelStops)
    .where(isNull(travelStops.heroImageUrl));

  console.log(`[backfill:images] ${stops.length} stops need hero images`);

  let done = 0;
  let failed = 0;
  const start = Date.now();

  for (const stop of stops) {
    try {
      const location = stop.cityGroup ?? "the destination";
      const prompt = `Travel photo of ${stop.name} in ${location}. Daytime, no people, architectural or landscape shot, family friendly, vibrant colors, high quality.`;

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1792x1024",
        quality: "standard",
      });

      const imageUrl = response.data[0]?.url;
      if (imageUrl) {
        await db
          .update(travelStops)
          .set({ heroImageUrl: imageUrl })
          .where(isNull(travelStops.heroImageUrl));
        done++;
      }

      if (done % 10 === 0) {
        const elapsedMin = ((Date.now() - start) / 60_000).toFixed(1);
        const pct = ((done / stops.length) * 100).toFixed(1);
        console.log(`[backfill:images] ${done}/${stops.length} (${pct}%) — ${elapsedMin}m elapsed — ~$${(done * 0.04).toFixed(2)} spent`);
      }
    } catch (err) {
      failed++;
      console.error(`[backfill:images] Failed for "${stop.name}":`, err);
    }

    await sleep(DELAY_MS);
  }

  console.log(`[backfill:images] Done. ${done} generated, ${failed} failed.`);
}

main().catch(err => {
  console.error("[backfill:images] Fatal:", err);
  process.exit(1);
});
