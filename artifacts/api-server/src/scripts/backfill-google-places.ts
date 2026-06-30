/**
 * Batch backfill: enrich stop_library rows with Google Places data.
 *
 * For each stop where gp_verified_at IS NULL this script:
 *   1. Calls findplacefromtext to look up the Google Places place_id.
 *   2. Calls the Place Details endpoint to fetch hours, rating, photo references,
 *      price level, address, parking, wheelchair accessibility, phone, and website.
 *   3. Writes the result back to stop_library via a Drizzle .update().
 *   Stops with no Places match are marked gp_place_id='NOT_FOUND' and
 *   gp_verified_at=NOW() so they are not retried.
 *
 * Rate limit: ~200 ms pause between individual stops (sequential, no parallelism)
 * to stay comfortably within the Places API QPS limit.
 * Progress is logged every 50 stops.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:google-places
 */

import { db } from "../db.js";
import { stopLibrary } from "@workspace/db";
import { isNull, notInArray, eq, sql, count, and } from "drizzle-orm";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!GOOGLE_PLACES_API_KEY) {
  console.error("[BackfillGooglePlaces] GOOGLE_PLACES_API_KEY is not set.");
  process.exit(1);
}

const STOP_PAUSE_MS = 200;
const FETCH_PAGE_SIZE = 50;
const PROGRESS_EVERY = 50;

const FIND_PLACE_URL = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json";
const DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

// ── Google Places API helpers ─────────────────────────────────────────────────

/**
 * Find a place_id using the findplacefromtext endpoint.
 * Returns null if no candidate is found or the API call fails.
 */
async function findPlace(name: string, city: string, country: string): Promise<string | null> {
  const input = `${name}, ${city}, ${country}`.trim().replace(/,\s*,/g, ",");
  const params = new URLSearchParams({
    input,
    inputtype: "textquery",
    fields: "place_id",
    key: GOOGLE_PLACES_API_KEY!,
  });

  const res = await fetch(`${FIND_PLACE_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`findplacefromtext HTTP ${res.status} for "${name}"`);
  }

  const json = (await res.json()) as {
    status: string;
    candidates?: Array<{ place_id: string }>;
  };

  if (json.status !== "OK" || !json.candidates || json.candidates.length === 0) {
    return null;
  }
  return json.candidates[0].place_id;
}

type PlaceDetails = {
  gpHours: Record<string, unknown> | null;
  gpRating: string | null;
  gpRatingsTotal: number | null;
  gpPhotoRefs: string[];
  gpPriceLevel: number | null;
  gpAddressVerified: string | null;
  gpParkingType: string | null;
  gpWheelchairAccessible: boolean | null;
  gpPhone: string | null;
  gpWebsite: string | null;
};

/**
 * Fetch rich place details from the Place Details endpoint.
 * Returns a PlaceDetails object with null/empty values for missing fields.
 */
async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const fields = [
    "opening_hours",
    "rating",
    "user_ratings_total",
    "photos",
    "price_level",
    "formatted_address",
    "wheelchair_accessible_entrance",
    "formatted_phone_number",
    "website",
  ].join(",");

  const params = new URLSearchParams({
    place_id: placeId,
    fields,
    key: GOOGLE_PLACES_API_KEY!,
  });

  const res = await fetch(`${DETAILS_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`Place Details HTTP ${res.status} for place_id "${placeId}"`);
  }

  const json = (await res.json()) as {
    status: string;
    result?: {
      opening_hours?: Record<string, unknown>;
      rating?: number;
      user_ratings_total?: number;
      photos?: Array<{ photo_reference: string }>;
      price_level?: number;
      formatted_address?: string;
      wheelchair_accessible_entrance?: boolean;
      formatted_phone_number?: string;
      website?: string;
    };
  };

  if (json.status !== "OK" || !json.result) {
    throw new Error(`Place Details returned status "${json.status}" for "${placeId}"`);
  }

  const r = json.result;

  // Store only the photo_reference token, never a URL with the API key embedded.
  const gpPhotoRefs = (r.photos ?? [])
    .map((p) => p.photo_reference)
    .filter(Boolean)
    .slice(0, 10); // cap at 10 refs

  // Derive a loose parking hint from the hours object if present (Places API
  // does not expose a dedicated parking field in the standard tier, so we note
  // its absence explicitly).
  const gpParkingType: string | null = null;

  return {
    gpHours: r.opening_hours ?? null,
    gpRating: r.rating != null ? String(r.rating) : null,
    gpRatingsTotal: r.user_ratings_total ?? null,
    gpPhotoRefs,
    gpPriceLevel: r.price_level ?? null,
    gpAddressVerified: r.formatted_address ?? null,
    gpParkingType,
    gpWheelchairAccessible: r.wheelchair_accessible_entrance ?? null,
    gpPhone: r.formatted_phone_number ?? null,
    gpWebsite: r.website ?? null,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const SCOPE_CITY = process.env.BACKFILL_CITY ?? null;

async function run(): Promise<void> {
  const baseWhere = SCOPE_CITY
    ? and(isNull(stopLibrary.gpVerifiedAt), eq(stopLibrary.city, SCOPE_CITY))
    : isNull(stopLibrary.gpVerifiedAt);

  if (SCOPE_CITY) {
    console.log(`[BackfillGooglePlaces] Scoped to city: ${SCOPE_CITY}`);
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(stopLibrary)
    .where(baseWhere);

  if (total === 0) {
    console.log("[BackfillGooglePlaces] 0 stops to process — already complete.");
    process.exit(0);
  }

  console.log(`[BackfillGooglePlaces] ${total} stop(s) with gp_verified_at IS NULL. Starting…`);

  let totalVerified = 0;
  let totalNotFound = 0;
  let totalErrors = 0;
  const startTime = Date.now();
  const failedIds: string[] = [];

  while (true) {
    const candidates = await db
      .select({
        id: stopLibrary.id,
        name: stopLibrary.name,
        city: stopLibrary.city,
        country: stopLibrary.country,
      })
      .from(stopLibrary)
      .where(
        failedIds.length === 0
          ? baseWhere
          : and(baseWhere, notInArray(stopLibrary.id, failedIds)),
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

    if (candidates.length === 0) break;

    for (const stop of candidates) {
      try {
        const placeId = await findPlace(stop.name, stop.city, stop.country);

        if (!placeId) {
          await db
            .update(stopLibrary)
            .set({ gpPlaceId: "NOT_FOUND", gpVerifiedAt: new Date() })
            .where(eq(stopLibrary.id, stop.id));
          totalNotFound++;
          console.log(`[BackfillGooglePlaces] NOT_FOUND: ${stop.name} (${stop.city})`);
        } else {
          const details = await getPlaceDetails(placeId);

          await db
            .update(stopLibrary)
            .set({
              gpPlaceId: placeId,
              gpHours: details.gpHours,
              gpRating: details.gpRating,
              gpRatingsTotal: details.gpRatingsTotal,
              gpPhotoRefs: details.gpPhotoRefs,
              gpPriceLevel: details.gpPriceLevel,
              gpAddressVerified: details.gpAddressVerified,
              gpParkingType: details.gpParkingType,
              gpWheelchairAccessible: details.gpWheelchairAccessible,
              gpPhone: details.gpPhone,
              gpWebsite: details.gpWebsite,
              gpVerifiedAt: new Date(),
            })
            .where(eq(stopLibrary.id, stop.id));

          totalVerified++;
          console.log(`[BackfillGooglePlaces] Verified: ${stop.name} (${stop.city}) → ${placeId}`);
        }
      } catch (err) {
        totalErrors++;
        failedIds.push(stop.id);
        console.error(
          `[BackfillGooglePlaces] Error processing "${stop.name}" (${stop.city}):`,
          (err as Error).message,
        );
      }

      const processed = totalVerified + totalNotFound + totalErrors;
      if (processed % PROGRESS_EVERY === 0) {
        const pct = ((processed / total) * 100).toFixed(1);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const mm = Math.floor(elapsed / 60);
        const ss = elapsed % 60;
        console.log(
          `[BackfillGooglePlaces] Processed ${processed}/${total} (${pct}%) • Elapsed: ${mm}m ${ss}s`,
        );
      }

      // Rate-limit: pause between each stop to avoid Places API QPS limits.
      await new Promise((r) => setTimeout(r, STOP_PAUSE_MS));
    }
  }

  const elapsedSec = Math.round((Date.now() - startTime) / 1000);
  const elapsedMm = Math.floor(elapsedSec / 60);
  const elapsedSs = elapsedSec % 60;

  console.log("");
  console.log("══════════════════════════════════════════════════");
  console.log(" BackfillGooglePlaces — Complete");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Verified:        ${totalVerified}`);
  console.log(`  Not found:       ${totalNotFound} (marked NOT_FOUND, won't be retried)`);
  console.log(`  Errors:          ${totalErrors}${totalErrors > 0 ? " (excluded from retry)" : ""}`);
  console.log(`  Time elapsed:    ${elapsedMm}m ${elapsedSs}s`);
  if (failedIds.length > 0) {
    console.log(`  Failed stop IDs: ${failedIds.join(", ")}`);
  }
  console.log("══════════════════════════════════════════════════");

  process.exit(totalErrors > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("[BackfillGooglePlaces] Fatal error:", err);
  process.exit(1);
});
