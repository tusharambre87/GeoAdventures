/**
 * Fire-and-forget backfill enqueue helpers for newly-created stop_library rows.
 *
 * Called immediately after AI generates stops for a brand-new city and saves
 * them to stop_library. Both functions run the same batch logic as the
 * standalone backfill scripts (Task #179 / Task #180) but are scoped to a
 * specific list of stop IDs instead of scanning the full table.
 *
 * - No await at call sites — both are fire-and-forget.
 * - Idempotent: each stop is skipped when enrichment data already exists.
 * - Batch size: 5, pause: 2 s between batches (same as standalone scripts).
 */

import OpenAI from "openai";
import { db } from "../db.js";
import { stopLibrary, plannerPlaces, plannerStopIntelligence } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { enrichStop } from "./stopEnrichmentService.js";
import { z } from "zod";

const BATCH_SIZE = 5;
const BATCH_PAUSE_MS = 2000;

// ── Shared OpenAI client ──────────────────────────────────────────────────────

function getOpenAI(): OpenAI {
  return new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });
}

// ── Intelligence helpers (mirrors backfillIntelligence.ts) ────────────────────

type StopLibraryRow = {
  id: string;
  name: string;
  city: string;
  country: string | null;
  stopType: string | null;
};

async function findOrCreatePlace(stop: StopLibraryRow): Promise<string> {
  const existing = await db
    .select({ id: plannerPlaces.id })
    .from(plannerPlaces)
    .where(
      and(
        sql`LOWER(TRIM(${plannerPlaces.name})) = LOWER(TRIM(${stop.name}))`,
        sql`LOWER(TRIM(${plannerPlaces.city})) = LOWER(TRIM(${stop.city}))`,
      ),
    )
    .orderBy(plannerPlaces.createdAt)
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [inserted] = await db
    .insert(plannerPlaces)
    .values({
      name: stop.name,
      city: stop.city,
      country: stop.country ?? "Unknown",
      type: stop.stopType ?? "landmark",
    })
    .returning({ id: plannerPlaces.id });

  return inserted.id;
}

async function hasIntelligence(placeId: string): Promise<boolean> {
  const rows = await db
    .select({ placeId: plannerStopIntelligence.placeId })
    .from(plannerStopIntelligence)
    .where(eq(plannerStopIntelligence.placeId, placeId))
    .limit(1);
  return rows.length > 0;
}

// ── Logistics helpers (mirrors backfillLogistics.ts) ─────────────────────────

const LogisticsEnrichmentSchema = z.object({
  parkingAvailability: z.string(),
  nearestRestroomLocation: z.string(),
  strollerAccessibility: z.enum(["yes", "no", "partial"]),
  sensoryLoad: z.enum(["low", "medium", "high"]),
  bestTimeOfDay: z.string(),
  typicalWaitTime: z.string(),
});

type LogisticsRow = {
  id: string;
  name: string;
  city: string;
  country: string | null;
  stopType: string | null;
  description: string | null;
};

async function isAlreadyEnriched(id: string): Promise<boolean> {
  const [row] = await db
    .select({ enrichment: stopLibrary.enrichment })
    .from(stopLibrary)
    .where(eq(stopLibrary.id, id))
    .limit(1);
  return !!row?.enrichment;
}

async function callLogisticsAI(stop: LogisticsRow) {
  const openai = getOpenAI();
  const destination = stop.country ? `${stop.city}, ${stop.country}` : stop.city;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a family travel expert. Return a JSON object only, with no markdown or extra text.",
      },
      {
        role: "user",
        content: `Provide practical logistics information for families visiting this stop.

Stop: ${stop.name}
City / Destination: ${destination}
Type: ${stop.stopType ?? "landmark"}${stop.description ? `\nDescription: ${stop.description}` : ""}

Return ONLY a JSON object with exactly these 6 fields:
{
  "parkingAvailability": "<brief description of parking options>",
  "nearestRestroomLocation": "<where to find the nearest restroom>",
  "strollerAccessibility": "yes" | "no" | "partial",
  "sensoryLoad": "low" | "medium" | "high",
  "bestTimeOfDay": "<e.g. 'Early morning before crowds'>",
  "typicalWaitTime": "<e.g. 'No wait' or '5-15 min at peak hours'>"
}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`No content returned for stop: ${stop.name}`);

  const raw = JSON.parse(content);
  const parsed = LogisticsEnrichmentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Validation failed for "${stop.name}": ${parsed.error.message}`);
  }
  return parsed.data;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fire-and-forget: populate planner_stop_intelligence for a specific list of
 * newly-created stop_library IDs. Skips any stop that already has an
 * intelligence record. Batches of 5 with a 2-second pause between batches.
 */
export function enqueueIntelligenceBackfill(stopIds: string[]): void {
  if (stopIds.length === 0) return;

  void (async () => {
    try {
      const rows = await db
        .select({
          id: stopLibrary.id,
          name: stopLibrary.name,
          city: stopLibrary.city,
          country: stopLibrary.country,
          stopType: stopLibrary.stopType,
        })
        .from(stopLibrary)
        .where(inArray(stopLibrary.id, stopIds));

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (stop) => {
            try {
              const placeId = await findOrCreatePlace(stop);

              if (await hasIntelligence(placeId)) {
                console.log(
                  `[BackfillQueue/Intelligence] Skip (already enriched): ${stop.name} (${stop.city})`,
                );
                return;
              }

              const destination = stop.country
                ? `${stop.city}, ${stop.country}`
                : stop.city;

              await enrichStop(
                { name: stop.name, type: stop.stopType ?? "landmark", destination },
                placeId,
              );

              console.log(
                `[BackfillQueue/Intelligence] Enriched: ${stop.name} (${stop.city})`,
              );
            } catch (err) {
              console.error(
                `[BackfillQueue/Intelligence] Error enriching "${stop.name}":`,
                (err as Error).message,
              );
            }
          }),
        );

        if (i + BATCH_SIZE < rows.length) {
          await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
        }
      }
    } catch (err) {
      console.error("[BackfillQueue/Intelligence] Fatal error:", (err as Error).message);
    }
  })();
}

/**
 * Fire-and-forget: populate stop_library.enrichment for a specific list of
 * newly-created stop_library IDs. Skips any stop that already has an
 * enrichment value. Batches of 5 with a 2-second pause between batches.
 */
export function enqueueLogisticsBackfill(stopIds: string[]): void {
  if (stopIds.length === 0) return;

  void (async () => {
    try {
      const rows = await db
        .select({
          id: stopLibrary.id,
          name: stopLibrary.name,
          city: stopLibrary.city,
          country: stopLibrary.country,
          stopType: stopLibrary.stopType,
          description: stopLibrary.description,
        })
        .from(stopLibrary)
        .where(inArray(stopLibrary.id, stopIds));

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (stop) => {
            try {
              if (await isAlreadyEnriched(stop.id)) {
                console.log(
                  `[BackfillQueue/Logistics] Skip (already enriched): ${stop.name} (${stop.city})`,
                );
                return;
              }

              const enrichment = await callLogisticsAI(stop);

              await db
                .update(stopLibrary)
                .set({ enrichment })
                .where(eq(stopLibrary.id, stop.id));

              console.log(
                `[BackfillQueue/Logistics] Enriched: ${stop.name} (${stop.city})`,
              );
            } catch (err) {
              console.error(
                `[BackfillQueue/Logistics] Error enriching "${stop.name}":`,
                (err as Error).message,
              );
            }
          }),
        );

        if (i + BATCH_SIZE < rows.length) {
          await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
        }
      }
    } catch (err) {
      console.error("[BackfillQueue/Logistics] Fatal error:", (err as Error).message);
    }
  })();
}
