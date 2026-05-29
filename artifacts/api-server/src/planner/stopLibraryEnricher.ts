/**
 * Stop Library Enricher
 *
 * Enriches individual stop_library rows with:
 *   - storyPack   (via generateStoryPack — 2-step GPT-4o-mini + GPT-4o)
 *   - audioUrl    (via Google Cloud TTS → saved to /audio/stop-library/<id>.mp3)
 *   - keepsake    (via generateArtifactsForStops — one keepsake per stop)
 *
 * Each column is updated conditionally: if the column already has data it is
 * left untouched.  enrichedAt is set once storyPack is populated.
 *
 * Throttled at MIN_ENRICH_DELAY_MS between batches, MAX_CONCURRENT parallel.
 */

import { db } from "../db";
import { stopLibrary } from "@workspace/db";
import { eq, isNull, inArray, and } from "drizzle-orm";
import path from "path";
import fs from "fs";

const MAX_CONCURRENT = 5;
const MIN_ENRICH_DELAY_MS = 300;

let enrichmentQueueRunning = false;

// ── internal helpers ─────────────────────────────────────────────────────────

/**
 * Fetch the full row for a stop so we can decide which columns to populate.
 */
async function fetchRow(id: string) {
  const [row] = await db
    .select({
      id: stopLibrary.id,
      name: stopLibrary.name,
      stopType: stopLibrary.stopType,
      city: stopLibrary.city,
      country: stopLibrary.country,
      storyPack: stopLibrary.storyPack,
      audioUrl: stopLibrary.audioUrl,
      keepsake: stopLibrary.keepsake,
      stopMissions: stopLibrary.stopMissions,
      enrichedAt: stopLibrary.enrichedAt,
    })
    .from(stopLibrary)
    .where(eq(stopLibrary.id, id));
  return row ?? null;
}

/**
 * Enrich a single stop row. Updates only the columns that are currently null.
 */
async function enrichOneStop(row: {
  id: string;
  name: string;
  stopType: string | null;
  city: string;
  country: string | null;
  storyPack: unknown;
  audioUrl: string | null;
  keepsake: unknown;
  stopMissions: unknown;
  enrichedAt: Date | null;
}): Promise<void> {
  try {
    const destination = row.country ? `${row.city}, ${row.country}` : row.city;
    const updatePayload: Record<string, unknown> = {};

    // ── Step A: storyPack ──────────────────────────────────────────────────────
    let currentStoryPack = row.storyPack as { mainStory?: string } | null;
    if (!currentStoryPack) {
      const { generateStoryPack } = await import("../travelContent.js");
      currentStoryPack = await generateStoryPack(
        row.name,
        row.stopType || "landmark",
        destination
      );
      updatePayload.storyPack = currentStoryPack;
      updatePayload.enrichedAt = new Date();
    }

    // ── Step B: audioUrl ───────────────────────────────────────────────────────
    if (!row.audioUrl && currentStoryPack) {
      try {
        const { TextToSpeechClient } = await import("@google-cloud/text-to-speech");
        let ttsClient: any;
        if (process.env.GOOGLE_CLOUD_TTS_CREDENTIALS) {
          const credentials = JSON.parse(process.env.GOOGLE_CLOUD_TTS_CREDENTIALS);
          ttsClient = new TextToSpeechClient({ credentials });
        } else {
          ttsClient = new TextToSpeechClient();
        }

        const ssmlText = currentStoryPack.mainStory || "";
        const [ttsResponse] = await ttsClient.synthesizeSpeech({
          input: { text: ssmlText.replace(/\[[^\]]*\]/g, "").slice(0, 4500) },
          voice: { languageCode: "en-US", name: "en-US-Journey-F" },
          audioConfig: { audioEncoding: "MP3" },
        });

        if (ttsResponse.audioContent) {
          const audioDir = path.resolve(process.cwd(), "public", "audio", "stop-library");
          fs.mkdirSync(audioDir, { recursive: true });
          const filename = `sl-${row.id}.mp3`;
          fs.writeFileSync(path.join(audioDir, filename), ttsResponse.audioContent as Buffer);
          updatePayload.audioUrl = `/audio/stop-library/${filename}`;
        }
      } catch (ttsErr) {
        console.warn(
          `[StopLibraryEnricher] TTS failed for "${row.name}":`,
          (ttsErr as Error).message
        );
      }
    }

    // ── Step C: keepsake ───────────────────────────────────────────────────────
    if (!row.keepsake) {
      try {
        const { generateArtifactsForStops } = await import("../travelContent.js");
        const artifacts = await generateArtifactsForStops(
          [{ name: row.name, stopType: row.stopType || "landmark" }],
          row.city
        );
        if (artifacts.length > 0) {
          updatePayload.keepsake = artifacts[0];
        }
      } catch (keepErr) {
        console.warn(
          `[StopLibraryEnricher] Keepsake gen failed for "${row.name}":`,
          (keepErr as Error).message
        );
      }
    }

    // ── Step D: stopMissions ───────────────────────────────────────────────────
    if (!row.stopMissions) {
      try {
        const { generateMissionsForStop } = await import("../travelContent.js");
        const missions = await generateMissionsForStop(
          row.name,
          row.city,
          row.stopType || "landmark"
        );
        if (missions && missions.length > 0) {
          updatePayload.stopMissions = missions;
        }
      } catch (missionsErr) {
        console.warn(
          `[StopLibraryEnricher] Missions gen failed for "${row.name}":`,
          (missionsErr as Error).message
        );
      }
    }

    // ── Persist — only if there is something new to write ──────────────────────
    if (Object.keys(updatePayload).length > 0) {
      await db
        .update(stopLibrary)
        .set(updatePayload as any)
        .where(eq(stopLibrary.id, row.id));
      console.log(`[StopLibraryEnricher] ✅ Enriched "${row.name}" (${row.city}) — columns: ${Object.keys(updatePayload).join(", ")}`);
    }
  } catch (err) {
    console.error(
      `[StopLibraryEnricher] ❌ Failed to enrich "${row.name}":`,
      (err as Error).message
    );
  }
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Enrich a list of stop_library IDs (all of them, not just the first).
 * Runs serially with a small delay between each stop.
 */
export async function enrichStopLibraryIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const rows = await db
    .select({
      id: stopLibrary.id,
      name: stopLibrary.name,
      stopType: stopLibrary.stopType,
      city: stopLibrary.city,
      country: stopLibrary.country,
      storyPack: stopLibrary.storyPack,
      audioUrl: stopLibrary.audioUrl,
      keepsake: stopLibrary.keepsake,
      stopMissions: stopLibrary.stopMissions,
      enrichedAt: stopLibrary.enrichedAt,
    })
    .from(stopLibrary)
    .where(inArray(stopLibrary.id, ids));

  for (const row of rows) {
    await enrichOneStop(row);
    await new Promise((r) => setTimeout(r, MIN_ENRICH_DELAY_MS));
  }
}

/**
 * Background queue: enrich all stop_library rows that have no storyPack yet.
 * Optionally filtered by country. Safe to call concurrently — uses a
 * module-level flag to avoid re-entry.
 */
export function startEnrichmentQueue(country?: string): void {
  if (enrichmentQueueRunning) return;
  enrichmentQueueRunning = true;
  (async () => {
    const BATCH_SIZE = 50;
    let totalProcessed = 0;
    try {
      console.log(
        `[StopLibraryEnricher] Queue started${country ? ` (country: ${country})` : " (all countries)"}`
      );

      // Paginate until exhausted — never hard-caps at 500
      while (true) {
        const whereClause = country
          ? and(isNull(stopLibrary.storyPack), eq(stopLibrary.country, country))
          : isNull(stopLibrary.storyPack);

        const pending = await db
          .select({
            id: stopLibrary.id,
            name: stopLibrary.name,
            stopType: stopLibrary.stopType,
            city: stopLibrary.city,
            country: stopLibrary.country,
            storyPack: stopLibrary.storyPack,
            audioUrl: stopLibrary.audioUrl,
            keepsake: stopLibrary.keepsake,
            stopMissions: stopLibrary.stopMissions,
            enrichedAt: stopLibrary.enrichedAt,
          })
          .from(stopLibrary)
          .where(whereClause)
          .limit(BATCH_SIZE);

        if (pending.length === 0) break;

        for (let i = 0; i < pending.length; i += MAX_CONCURRENT) {
          const chunk = pending.slice(i, i + MAX_CONCURRENT);
          await Promise.all(chunk.map((row) => enrichOneStop(row)));
          if (i + MAX_CONCURRENT < pending.length) {
            await new Promise((r) => setTimeout(r, MIN_ENRICH_DELAY_MS));
          }
        }

        totalProcessed += pending.length;
        console.log(`[StopLibraryEnricher] Progress — ${totalProcessed} stops enriched so far`);

        // If we got fewer than a full batch, we're done
        if (pending.length < BATCH_SIZE) break;

        // Small pause between batches to avoid overwhelming the DB/AI API
        await new Promise((r) => setTimeout(r, MIN_ENRICH_DELAY_MS * 2));
      }

      console.log(`[StopLibraryEnricher] Queue complete — ${totalProcessed} total stops processed`);
    } catch (err) {
      console.error("[StopLibraryEnricher] Queue error:", err);
    } finally {
      enrichmentQueueRunning = false;
    }
  })();
}

/**
 * Enqueue a batch of stop IDs for enrichment fire-and-forget (after AI generation).
 */
export function enqueueStopLibraryEnrichment(ids: string[]): void {
  if (ids.length === 0) return;
  setTimeout(async () => {
    for (const id of ids) {
      try {
        const row = await fetchRow(id);
        if (row) await enrichOneStop(row);
        await new Promise((r) => setTimeout(r, MIN_ENRICH_DELAY_MS));
      } catch (err) {
        console.warn(
          `[StopLibraryEnricher] enqueue error for ${id}:`,
          (err as Error).message
        );
      }
    }
  }, 300);
}
