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

/**
 * Stops that must never be sent to the image API because they are licensed IP.
 * The image safety system rejects them every time, burning API credits on retries.
 * Each entry maps the exact stop name (as stored in the DB) to a GCS path for a
 * placeholder landmark image. The backfill will write that path to hero_image_url
 * so the stop won't appear in future runs.
 *
 * To add a new licensed-IP stop: add its DB name and a suitable placeholder path.
 */
const SKIP_STOPS: Record<string, string> = {
  "Shrek's Adventure! London":
    "stop-images/f6ceb352-af3f-4f75-a6f1-e96f1e191d16/49391052-1082-40e2-aa52-e8214d7d978a.png",
};

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

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
    const placeholder = SKIP_STOPS[stop.name];
    if (placeholder !== undefined) {
      await db
        .update(travelStops)
        .set({ heroImageUrl: placeholder })
        .where(eq(travelStops.id, stop.id));
      console.log(`[skip] ${stop.name} — licensed IP, assigned placeholder image`);
      continue;
    }

    try {
      const location = stop.cityGroup ?? "the destination";
      const prompt = `Travel photo of ${stop.name} in ${location}. Daytime, no people, architectural or landscape shot, family friendly, vibrant colors, high quality.`;
      console.log(`[backfill:images] Generating: "${stop.name}" (${done + 1}/${stops.length})`);

      const response = await (openai.images as any).generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1536x1024",
        quality: "medium",
      }, { timeout: 120_000 });

      const b64 = (response.data ?? [])[0]?.b64_json;
      if (b64) {
        const buffer = Buffer.from(b64, "base64");
        const fileName = `stop-images/${stop.tripId}/${stop.id}.png`;
        const file = bucket.file(fileName);
        await file.save(buffer, { contentType: "image/png" });

        await db
          .update(travelStops)
          .set({ heroImageUrl: fileName })
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
