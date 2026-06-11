/**
 * PSI Trigger — reusable PSI enrichment logic extracted from backfillIntelligence.
 *
 * Exports:
 *   runPsiForStops(stops)  — enrich a specific list of stop_library rows
 *   runPsiForCity(city, country) — enrich all unenriched stops for a given city
 *
 * Designed for fire-and-forget use from seeders and saveStopLibraryEntries:
 *   runPsiForCity("Washington DC", "USA").catch(() => {});
 *
 * Does NOT call process.exit — safe to call from a long-running server process.
 */

import { db } from "../db.js";
import { stopLibrary, plannerPlaces, plannerStopIntelligence } from "@workspace/db";
import { isNotNull, and, eq, notInArray, sql } from "drizzle-orm";
import { enrichStop } from "./stopEnrichmentService.js";

const BATCH_SIZE = 5;
const BATCH_PAUSE_MS = 2000;

type StopInput = {
  id: string;
  name: string;
  city: string;
  country: string | null;
  stopType: string | null;
};

export async function findOrCreatePlace(stop: StopInput): Promise<string> {
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

async function enrichOne(stop: StopInput): Promise<void> {
  const placeId = await findOrCreatePlace(stop);
  if (await hasIntelligence(placeId)) return;
  const destination = stop.country ? `${stop.city}, ${stop.country}` : stop.city;
  await enrichStop(
    { name: stop.name, type: stop.stopType ?? "landmark", destination },
    placeId,
  );
}

/**
 * Enrich PSI for a specific list of stop_library rows (e.g. newly inserted batch).
 */
export async function runPsiForStops(stops: StopInput[]): Promise<void> {
  if (stops.length === 0) return;
  console.log(`[PSITrigger] Enriching ${stops.length} stop(s)…`);
  let done = 0;
  let errors = 0;

  for (let i = 0; i < stops.length; i += BATCH_SIZE) {
    const batch = stops.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (stop) => {
        try {
          await enrichOne(stop);
          done++;
        } catch (err) {
          errors++;
          console.warn(`[PSITrigger] Failed "${stop.name}" (${stop.city}): ${(err as Error).message}`);
        }
      }),
    );
    if (i + BATCH_SIZE < stops.length) {
      await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
    }
  }

  console.log(`[PSITrigger] Done — enriched: ${done}, errors: ${errors}`);
}

/**
 * Enrich PSI for all stops that have storyPack but no intelligence record yet.
 * Designed to be called fire-and-forget from the enrichment queue completion.
 */
export async function runPsiBackfill(): Promise<void> {
  const pp = plannerPlaces;
  const psi = plannerStopIntelligence;

  const candidates = await db
    .select({
      id: stopLibrary.id,
      name: stopLibrary.name,
      city: stopLibrary.city,
      country: stopLibrary.country,
      stopType: stopLibrary.stopType,
    })
    .from(stopLibrary)
    .where(
      and(
        isNotNull(stopLibrary.storyPack),
        sql`NOT EXISTS (
          SELECT 1
          FROM ${pp}
          JOIN ${psi} ON ${psi.placeId} = ${pp.id}
          WHERE LOWER(TRIM(${pp.name})) = LOWER(TRIM(${stopLibrary.name}))
            AND LOWER(TRIM(${pp.city})) = LOWER(TRIM(${stopLibrary.city}))
        )`,
      ),
    );

  if (candidates.length === 0) {
    console.log("[PSITrigger] Backfill: all enriched stops already have PSI");
    return;
  }

  console.log(`[PSITrigger] Backfill: seeding PSI for ${candidates.length} stop(s)…`);
  await runPsiForStops(candidates);
}

/**
 * Enrich PSI for all unenriched stops in a given city.
 * Useful to trigger after a city's stop batch is seeded.
 */
export async function runPsiForCity(city: string, country: string): Promise<void> {
  const nk = `${city.toLowerCase().trim()}:${country.toLowerCase().trim()}`;

  const pp = plannerPlaces;
  const psi = plannerStopIntelligence;

  const candidates = await db
    .select({
      id: stopLibrary.id,
      name: stopLibrary.name,
      city: stopLibrary.city,
      country: stopLibrary.country,
      stopType: stopLibrary.stopType,
    })
    .from(stopLibrary)
    .where(
      and(
        isNotNull(stopLibrary.storyPack),
        eq(stopLibrary.normalizedKey, nk),
        sql`NOT EXISTS (
          SELECT 1
          FROM ${pp}
          JOIN ${psi} ON ${psi.placeId} = ${pp.id}
          WHERE LOWER(TRIM(${pp.name})) = LOWER(TRIM(${stopLibrary.name}))
            AND LOWER(TRIM(${pp.city})) = LOWER(TRIM(${stopLibrary.city}))
        )`,
      ),
    );

  if (candidates.length === 0) {
    console.log(`[PSITrigger] ${city} — all stops already have PSI, nothing to do`);
    return;
  }

  console.log(`[PSITrigger] ${city} — seeding PSI for ${candidates.length} unenriched stop(s)`);
  await runPsiForStops(candidates);
}
