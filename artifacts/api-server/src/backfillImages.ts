/**
 * One-time backfill: generate DALL-E 3 hero images for all travel_stops that
 * have no hero_image_url yet and upload them to permanent object storage.
 *
 * DALL-E 3 returns temporary URLs that expire in ~1 hour, so we use the
 * b64_json response format and upload each image to GCS ourselves, storing
 * the permanent https://storage.googleapis.com/... URL in the DB.
 *
 * Rate: DALL-E 3 standard tier allows 5 images/minute → 12s gap between calls.
 * Cost: ~$0.04/image on standard quality. ~1,176 stops ≈ $47 total.
 * Time: ~1,176 stops × 12s ≈ 4 hours. Run overnight.
 *
 * The script is fully idempotent — stops that already have a heroImageUrl are
 * skipped. Safe to stop and re-run.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:images
 */

import { db } from "./db.js";
import { travelStops } from "@workspace/db";
import { isNull, eq } from "drizzle-orm";
import OpenAI from "openai";
import { objectStorageClient } from "./lib/objectStorage.js";

const DELAY_MS = 12_000;
const MAX_STOPS = 1_200; // safety ceiling — re-run if there are more

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    console.error("[backfill:images] DEFAULT_OBJECT_STORAGE_BUCKET_ID not set — aborting");
    process.exit(1);
  }

  const stops = await db
    .select({ id: travelStops.id, name: travelStops.name, cityGroup: travelStops.cityGroup, tripId: travelStops.tripId })
    .from(travelStops)
    .where(isNull(travelStops.heroImageUrl))
    .limit(MAX_STOPS);

  console.log(`[backfill:images] Backfilling ${stops.length} stops. Estimated cost: $${(stops.length * 0.04).toFixed(2)}`);
  console.log(`[backfill:images] Starting in 5 seconds — Ctrl-C to abort if the number looks wrong...`);
  await sleep(5_000);

  const bucket = objectStorageClient.bucket(bucketId);
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
        response_format: "b64_json",
      });

      const b64 = (response.data ?? [])[0]?.b64_json;
      if (b64) {
        const buffer = Buffer.from(b64, "base64");
        const fileName = `stop-images/${stop.tripId}/${stop.id}.png`;
        const file = bucket.file(fileName);
        await file.save(buffer, { contentType: "image/png", public: true });
        const url = `https://storage.googleapis.com/${bucketId}/${fileName}`;

        await db
          .update(travelStops)
          .set({ heroImageUrl: url })
          .where(eq(travelStops.id, stop.id));

        done++;
      }

      if (done % 10 === 0 && done > 0) {
        const elapsedMin = ((Date.now() - start) / 60_000).toFixed(1);
        const pct = ((done / stops.length) * 100).toFixed(1);
        console.log(`[backfill:images] ${done}/${stops.length} (${pct}%) — ${elapsedMin}m — ~$${(done * 0.04).toFixed(2)}`);
      }
    } catch (err) {
      failed++;
      console.error(`[backfill:images] Failed for "${stop.name}" (${stop.id}):`, err);
    }

    await sleep(DELAY_MS);
  }

  const totalMin = ((Date.now() - start) / 60_000).toFixed(1);
  console.log(`[backfill:images] Complete: ${done} generated, ${failed} failed, ${totalMin}m elapsed, ~$${(done * 0.04).toFixed(2)} spent`);
}

main().catch(err => {
  console.error("[backfill:images] Fatal:", err);
  process.exit(1);
});
