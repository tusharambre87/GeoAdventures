/**
 * Batch backfill: populate stop_library.enrichment for all seeded stops.
 *
 * Runs to completion in a single invocation — no manual re-runs needed.
 *
 * Writes a lightweight logistics JSON object to each stop_library row that
 * currently has enrichment IS NULL. Uses gpt-4o-mini (not gpt-4o) — this is
 * structured extraction, not full intelligence scoring.
 *
 * Ordering: US cities first → India second → rest of world.
 * Batch size: 5 (Promise.all), with a 2-second pause between batches.
 * Pages of 50 candidates are fetched from the DB at a time; the loop
 * continues until the candidate query returns 0 rows (or only rows that
 * have already failed this run — those are excluded to prevent infinite loops).
 *
 * Idempotent: the candidate query filters enrichment IS NULL, so already-written
 * rows are excluded at the DB level. A per-stop re-check guards against races.
 *
 * Progress is logged every 100 stops processed:
 *   Processed 100/3401 (2.9%) • Est. cost so far: $0.02 • Elapsed: 3m 12s
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:logistics
 */

import OpenAI from "openai";
import { db } from "../db.js";
import { stopLibrary } from "@workspace/db";
import { and, isNull, notInArray, eq, sql, count } from "drizzle-orm";
import { z } from "zod";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const BATCH_SIZE = 5;
const BATCH_PAUSE_MS = 2000;
const FETCH_PAGE_SIZE = 50;

// gpt-4o-mini pricing estimate: ~500 input + ~200 output tokens per call
// $0.15/1M input + $0.60/1M output → ~$0.000075 + $0.00012 ≈ $0.0002/call
const COST_PER_CALL_USD = 0.0002;

// ── Logistics enrichment shape ────────────────────────────────────────────────

/**
 * Lightweight logistics object written to stop_library.enrichment.
 * These 6 fields feed Gate 2 of the stop enrichment read path (stopEnrichmentService.ts).
 */
const LogisticsEnrichmentSchema = z.object({
  parkingAvailability: z.string(),
  nearestRestroomLocation: z.string(),
  strollerAccessibility: z.enum(["yes", "no", "partial"]),
  sensoryLoad: z.enum(["low", "medium", "high"]),
  bestTimeOfDay: z.string(),
  typicalWaitTime: z.string(),
});

type LogisticsEnrichment = z.infer<typeof LogisticsEnrichmentSchema>;

type StopRow = {
  id: string;
  name: string;
  city: string;
  country: string | null;
  stopType: string | null;
  description: string | null;
};

// ── AI call ───────────────────────────────────────────────────────────────────

async function callLogisticsAI(stop: StopRow): Promise<LogisticsEnrichment> {
  const destination = stop.country ? `${stop.city}, ${stop.country}` : stop.city;

  const systemMessage =
    "You are a family travel expert. Return a JSON object only, with no markdown or extra text.";

  const userMessage = `Provide practical logistics information for families visiting this stop.

Stop: ${stop.name}
City / Destination: ${destination}
Type: ${stop.stopType ?? "landmark"}${stop.description ? `\nDescription: ${stop.description}` : ""}

Return ONLY a JSON object with exactly these 6 fields:
{
  "parkingAvailability": "<brief description of parking options, e.g. 'Paid garage on-site' or 'Street parking available' or 'No dedicated parking'>",
  "nearestRestroomLocation": "<where to find the nearest restroom, e.g. 'On-site near the main entrance' or 'In the food court 200m away'>",
  "strollerAccessibility": "yes" | "no" | "partial",
  "sensoryLoad": "low" | "medium" | "high",
  "bestTimeOfDay": "<e.g. 'Early morning before crowds' or 'Late afternoon for cooler weather' or 'Anytime'>",
  "typicalWaitTime": "<e.g. 'No wait' or '5-15 min at peak hours' or 'Up to 45 min on weekends'>"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`No content returned for stop: ${stop.name}`);

  const raw = JSON.parse(content);
  const parsed = LogisticsEnrichmentSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `Validation failed for "${stop.name}": ${parsed.error.message}`,
    );
  }

  return parsed.data;
}

// ── Idempotency re-check ──────────────────────────────────────────────────────

/**
 * Per-stop race guard: returns true if enrichment is already populated in the DB.
 * The outer query already filters enrichment IS NULL, so this only fires if two
 * parallel job instances processed the same stop concurrently.
 */
async function isAlreadyEnriched(id: string): Promise<boolean> {
  const [row] = await db
    .select({ enrichment: stopLibrary.enrichment })
    .from(stopLibrary)
    .where(eq(stopLibrary.id, id))
    .limit(1);
  return !!row?.enrichment;
}

function fmtCost(calls: number): string {
  return `$${(calls * COST_PER_CALL_USD).toFixed(4)}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(stopLibrary)
    .where(isNull(stopLibrary.enrichment));

  if (total === 0) {
    console.log("[BackfillLogistics] 0 stops to process — already complete.");
    process.exit(0);
  }

  console.log(`[BackfillLogistics] ${total} stop(s) with enrichment IS NULL. Starting full run…`);
  console.log(`[BackfillLogistics] Estimated cost if all are new: ${fmtCost(total)} (gpt-4o-mini @ ~$0.0002/call)`);

  let totalEnriched = 0;
  let totalSkipped = 0;
  let totalAiCalls = 0;   // incremented before every AI call — accurate even if parse/write fails
  let totalErrors = 0;
  const startTime = Date.now();

  // IDs that failed this run — excluded from future pages to prevent infinite loops
  // on deterministically failing stops (schema validation failures, API errors, etc.).
  const failedIds: string[] = [];

  // Outer loop: keep fetching pages until no candidates remain.
  while (true) {
    const candidates = await db
      .select({
        id: stopLibrary.id,
        name: stopLibrary.name,
        city: stopLibrary.city,
        country: stopLibrary.country,
        stopType: stopLibrary.stopType,
        description: stopLibrary.description,
      })
      .from(stopLibrary)
      .where(
        failedIds.length === 0
          ? isNull(stopLibrary.enrichment)
          : and(isNull(stopLibrary.enrichment), notInArray(stopLibrary.id, failedIds))
      )
      .orderBy(
        sql`CASE
          WHEN LOWER(${stopLibrary.country}) LIKE '%united states%'
            OR LOWER(${stopLibrary.country}) LIKE '%usa%' THEN 0
          WHEN LOWER(${stopLibrary.country}) LIKE '%india%' THEN 1
          ELSE 2
        END`,
        stopLibrary.city,
        stopLibrary.name,
      )
      .limit(FETCH_PAGE_SIZE);

    // Fallback: if we still get candidates that are all in failedIds (shouldn't happen
    // with the where clause, but guards against edge cases), break to avoid looping.
    if (candidates.length === 0) break;

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (stop) => {
          try {
            if (await isAlreadyEnriched(stop.id)) {
              totalSkipped++;
              return;
            }

            totalAiCalls++;  // count before the call — accurate even if parse/update fails
            const enrichment = await callLogisticsAI(stop);

            await db
              .update(stopLibrary)
              .set({ enrichment })
              .where(eq(stopLibrary.id, stop.id));

            totalEnriched++;
            console.log(`[BackfillLogistics] Enriched: ${stop.name} (${stop.city})`);
          } catch (err) {
            totalErrors++;
            failedIds.push(stop.id);
            console.error(
              `[BackfillLogistics] Error enriching "${stop.name}" (${stop.city}):`,
              (err as Error).message,
            );
          }
        }),
      );

      const processed = totalEnriched + totalSkipped + totalErrors;

      // Progress line every 100 stops.
      if (processed % 100 < BATCH_SIZE) {
        const pct = ((processed / total) * 100).toFixed(1);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const mm = Math.floor(elapsed / 60);
        const ss = elapsed % 60;
        console.log(
          `[BackfillLogistics] Processed ${processed}/${total} (${pct}%) • ` +
          `Est. cost so far: ${fmtCost(totalAiCalls)} • ` +
          `Elapsed: ${mm}m ${ss}s`,
        );
      }

      if (i + BATCH_SIZE < candidates.length) {
        await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
      }
    }
  }

  const elapsedSec = Math.round((Date.now() - startTime) / 1000);
  const elapsedMm = Math.floor(elapsedSec / 60);
  const elapsedSs = elapsedSec % 60;

  console.log("");
  console.log("══════════════════════════════════════════════════");
  console.log(" BackfillLogistics — Complete");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Enriched:        ${totalEnriched}`);
  console.log(`  Skipped:         ${totalSkipped} (already had enrichment data)`);
  console.log(`  Errors:          ${totalErrors}${totalErrors > 0 ? " (excluded from retry to prevent loops)" : ""}`);
  console.log(`  AI calls made:   ${totalAiCalls}`);
  console.log(`  Est. total cost: ${fmtCost(totalAiCalls)}`);
  console.log(`  Time elapsed:    ${elapsedMm}m ${elapsedSs}s`);
  if (failedIds.length > 0) {
    console.log(`  Failed stop IDs: ${failedIds.join(", ")}`);
  }
  console.log("══════════════════════════════════════════════════");

  process.exit(totalErrors > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("[BackfillLogistics] Fatal error:", err);
  process.exit(1);
});
