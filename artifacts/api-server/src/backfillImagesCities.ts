/**
 * Targeted hero-image backfill — only stops missing images in specific cities.
 * Cities: Minneapolis, Washington DC, Los Angeles, Chicago
 * Skips stops that already have hero_image_url starting with 'stop-images/'.
 *
 * Runs in batches of 10 with a 3-second pause between batches.
 * Reports progress every 10 stops.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:images-cities
 */

import { db } from "./db.js";
import { travelStops } from "@workspace/db";
import { inArray, eq } from "drizzle-orm";
import OpenAI from "openai";
import { objectStorageClient } from "./lib/objectStorage.js";

const TARGET_CITIES = ["Minneapolis", "Washington DC", "Los Angeles", "Chicago"];
const BATCH_SIZE = 10;
const BATCH_PAUSE_MS = 3_000;

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    console.error("[backfill:images-cities] DEFAULT_OBJECT_STORAGE_BUCKET_ID not set — aborting");
    process.exit(1);
  }

  console.log(`[backfill:images-cities] Querying stops for: ${TARGET_CITIES.join(", ")}`);

  const allStops = await db
    .select({
      id: travelStops.id,
      name: travelStops.name,
      cityGroup: travelStops.cityGroup,
      tripId: travelStops.tripId,
      heroImageUrl: travelStops.heroImageUrl,
    })
    .from(travelStops)
    .where(inArray(travelStops.cityGroup as any, TARGET_CITIES));

  const targets = allStops.filter(s =>
    !s.heroImageUrl || !s.heroImageUrl.startsWith("stop-images/")
  );

  console.log(`[backfill:images-cities] ${targets.length} stops need images (of ${allStops.length} in target cities)`);
  console.log(`[backfill:images-cities] Estimated cost: ~$${(targets.length * 0.04).toFixed(2)}`);
  console.log(`[backfill:images-cities] Starting in 5 seconds — Ctrl-C to abort...`);
  await sleep(5_000);

  const bucket = objectStorageClient.bucket(bucketId);
  let done = 0;
  let failed = 0;
  const start = Date.now();

  for (let batchStart = 0; batchStart < targets.length; batchStart += BATCH_SIZE) {
    const batch = targets.slice(batchStart, batchStart + BATCH_SIZE);

    for (const stop of batch) {
      try {
        const location = stop.cityGroup ?? "the destination";
        const prompt = `Travel photo of ${stop.name} in ${location}. Daytime, no people, architectural or landscape shot, family friendly, vibrant colors, high quality.`;
        console.log(`[backfill:images-cities] [${done + failed + 1}/${targets.length}] Generating: "${stop.name}" (${stop.cityGroup})`);

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
          await bucket.file(fileName).save(buffer, { contentType: "image/png" });
          await db.update(travelStops).set({ heroImageUrl: fileName }).where(eq(travelStops.id, stop.id));
          done++;
          console.log(`[backfill:images-cities] ✓ ${stop.name} → ${fileName}`);
        } else {
          failed++;
          console.warn(`[backfill:images-cities] ✗ No image data for "${stop.name}"`);
        }
      } catch (err) {
        failed++;
        console.error(`[backfill:images-cities] ✗ Failed: "${stop.name}" (${stop.id}):`, (err as Error).message);
      }
    }

    const elapsed = ((Date.now() - start) / 60_000).toFixed(1);
    const processed = Math.min(batchStart + BATCH_SIZE, targets.length);
    const pct = ((processed / targets.length) * 100).toFixed(0);
    console.log(`[backfill:images-cities] ── Batch done: ${done} generated, ${failed} failed, ${pct}% complete, ${elapsed}m elapsed, ~$${(done * 0.04).toFixed(2)}`);

    if (batchStart + BATCH_SIZE < targets.length) {
      await sleep(BATCH_PAUSE_MS);
    }
  }

  const totalMin = ((Date.now() - start) / 60_000).toFixed(1);
  console.log(`[backfill:images-cities] ── Complete: ${done} generated, ${failed} failed, ${totalMin}m elapsed, ~$${(done * 0.04).toFixed(2)} spent`);
}

main().catch(err => {
  console.error("[backfill:images-cities] Fatal:", err);
  process.exit(1);
});
