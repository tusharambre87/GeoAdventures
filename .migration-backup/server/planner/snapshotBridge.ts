/**
 * snapshotBridge — Phase 2
 *
 * Bridges planner intelligence into travel_stops.metadata at Start Adventure time.
 *
 * Architecture:
 *   - Planner = source of intelligence (plannerPlaces, planner_place_profiles, etc.)
 *   - Adventure UX = execution layer (travel_trips, travel_stops)
 *   - This module = one-way bridge that copies planner data into travel_stops.metadata
 *
 * Constraints:
 *   - NEVER modifies visit logic, mission logic, journey packs, wallet, or memories
 *   - NEVER throws — all errors are caught and logged; partial metadata is acceptable
 *   - NEVER blocks trip creation — trip + stops are always committed before this runs
 *   - Only populates fields defined in StopExecutionSnapshot (no speculative additions)
 *   - Day-start behavior (adventureStartedAt rule) is NOT changed here
 */

import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  plannerPlaceProfiles,
  plannerStopIntelligence,
  plannerParentSupport,
  plannerPlaceReference,
  travelStops,
  type StopExecutionSnapshot,
  type PlannerTripPlanStop,
} from "@shared/schema";

// ─── Snapshot generation ─────────────────────────────────────────────────────

/**
 * generateStopSnapshot
 *
 * Builds a StopExecutionSnapshot for a single planner stop.
 * Each enrichment table is queried independently — a failure on one
 * leaves all other fields intact. Always returns a valid (possibly partial) object.
 *
 * @param plannerStop - The planner_trip_plan_stops row for this stop
 */
export async function generateStopSnapshot(
  plannerStop: PlannerTripPlanStop,
): Promise<StopExecutionSnapshot> {
  const placeId = plannerStop.placeId;

  // Build the snapshot starting from fields we already have on the planner stop row.
  // No enrichment queries needed for these — they are always present.
  const snapshot: StopExecutionSnapshot = {
    plannerStopId: plannerStop.id,
    plannerPlaceId: placeId ?? undefined,
    dayNumber: plannerStop.dayNumber,
    sequenceInDay: plannerStop.displayOrder,
    // familyAnchorType is the source — may be more generic than canonical roles.
    // Treat as best-effort; do not assume it always maps to anchor/support/treat/meal/reset.
    stopRole: plannerStop.familyAnchorType ?? undefined,
    whyPlacedHere: plannerStop.whyNow ?? undefined,
    travelMinutes: plannerStop.travelMinutes ?? undefined,
    travelMode: plannerStop.travelMode ?? undefined,
    snapshotGeneratedAt: new Date().toISOString(),
  };

  // No placeId = no enrichment possible — return what we have
  if (!placeId) return snapshot;

  // ── planner_place_profiles ──────────────────────────────────────────────────
  // Source: practicalTips (array), strollerFriendly, parkingNotes
  try {
    const [profile] = await db
      .select()
      .from(plannerPlaceProfiles)
      .where(eq(plannerPlaceProfiles.placeId, placeId))
      .limit(1);

    if (profile) {
      const tips = (profile.practicalTips ?? []) as string[];

      // practicalHighlights: first 3 practical tips
      if (tips.length > 0) {
        snapshot.practicalHighlights = tips.slice(0, 3);
      }

      // doThisFirst: first tip only — acknowledged as placeholder-quality mapping
      if (tips[0]) {
        snapshot.doThisFirst = tips[0];
      }

      snapshot.strollerFriendly = profile.strollerFriendly ?? null;

      // parkingSignal from profile: if parkingNotes text exists, we have signal
      // (true/false inference from text is skipped — use intelligence score instead)
      // Leave parkingSignal null here; refined below from intelligence score
    }
  } catch (err) {
    console.warn(`[SnapshotBridge] planner_place_profiles query failed for place ${placeId}:`, err);
  }

  // ── planner_stop_intelligence ───────────────────────────────────────────────
  // Source: bestForAgesLabel, bestArrivalWindow, restroomConfidence,
  //         foodConfidence, parkingAvailabilityScore, rationaleShort
  try {
    const [intel] = await db
      .select()
      .from(plannerStopIntelligence)
      .where(eq(plannerStopIntelligence.placeId, placeId))
      .limit(1);

    if (intel) {
      snapshot.familyFitLabel = intel.bestForAgesLabel ?? undefined;
      snapshot.bestTimeTip = intel.bestArrivalWindow ?? undefined;

      if (intel.restroomConfidence !== null && intel.restroomConfidence !== undefined) {
        snapshot.restroomConfidence = intel.restroomConfidence;
      }

      // foodNearby: confidence score above 50 = food is reasonably nearby
      if (intel.foodConfidence !== null && intel.foodConfidence !== undefined) {
        snapshot.foodNearby = intel.foodConfidence > 50;
      } else {
        snapshot.foodNearby = null;
      }

      // parkingSignal: score > 60 = parking is generally easy/available
      if (intel.parkingAvailabilityScore !== null && intel.parkingAvailabilityScore !== undefined) {
        snapshot.parkingSignal = intel.parkingAvailabilityScore > 60;
      } else if (snapshot.parkingSignal === undefined) {
        snapshot.parkingSignal = null;
      }

      snapshot.confidenceSummary = intel.rationaleShort ?? undefined;
    }
  } catch (err) {
    console.warn(`[SnapshotBridge] planner_stop_intelligence query failed for place ${placeId}:`, err);
  }

  // ── planner_parent_support ──────────────────────────────────────────────────
  // Source: breakSuggestion, foodSuggestion, keepGoingSuggestion, shortenSuggestion
  try {
    const [support] = await db
      .select()
      .from(plannerParentSupport)
      .where(eq(plannerParentSupport.placeId, placeId))
      .limit(1);

    if (support) {
      snapshot.breakSuggestion = support.breakSuggestion ?? undefined;
      snapshot.foodSuggestion = support.foodSuggestion ?? undefined;
      snapshot.keepGoingSuggestion = support.keepGoingSuggestion ?? undefined;
      snapshot.shortenSuggestion = support.shortenSuggestion ?? undefined;
    }
  } catch (err) {
    console.warn(`[SnapshotBridge] planner_parent_support query failed for place ${placeId}:`, err);
  }

  // ── planner_place_reference ─────────────────────────────────────────────────
  // Source: bookingRequired (= ticketSignal)
  try {
    const [ref] = await db
      .select()
      .from(plannerPlaceReference)
      .where(eq(plannerPlaceReference.placeId, placeId))
      .limit(1);

    if (ref) {
      snapshot.ticketSignal = ref.bookingRequired ?? null;
    } else {
      snapshot.ticketSignal = null;
    }
  } catch (err) {
    console.warn(`[SnapshotBridge] planner_place_reference query failed for place ${placeId}:`, err);
    snapshot.ticketSignal = null;
  }

  return snapshot;
}

// ─── Write snapshot to travel_stop ──────────────────────────────────────────

/**
 * writeSnapshotToStop
 *
 * Writes a snapshot into travel_stops.metadata for the given stop ID.
 * If the write fails, the error is logged but not re-thrown.
 * The stop row already exists — this is always an update, never an insert.
 */
export async function writeSnapshotToStop(
  travelStopId: string,
  snapshot: StopExecutionSnapshot,
): Promise<void> {
  try {
    await db
      .update(travelStops)
      .set({ metadata: snapshot as Record<string, unknown> })
      .where(eq(travelStops.id, travelStopId));
  } catch (err) {
    console.error(`[SnapshotBridge] Failed to write metadata for stop ${travelStopId}:`, err);
    // Non-fatal — stop row exists, metadata remains null, UX falls back gracefully
  }
}

// ─── Retrieval ───────────────────────────────────────────────────────────────

/**
 * getStopSnapshot
 *
 * Server-side helper: reads the execution snapshot from travel_stops.metadata.
 * Returns null for pre-Phase-2 stops or stops where enrichment failed.
 */
export async function getStopSnapshot(
  travelStopId: string,
): Promise<StopExecutionSnapshot | null> {
  try {
    const [row] = await db
      .select({ metadata: travelStops.metadata })
      .from(travelStops)
      .where(eq(travelStops.id, travelStopId))
      .limit(1);

    return (row?.metadata as StopExecutionSnapshot | null) ?? null;
  } catch (_) {
    return null;
  }
}

/**
 * runSnapshotPassForTrip
 *
 * Convenience function: generates and writes snapshots for a batch of stops.
 * Called after all travel_stops are inserted in startAdventure.
 * Each stop is processed independently — one failure does not affect others.
 * All errors are logged and swallowed.
 *
 * @param createdStops - Array of { travelStopId, plannerStop } pairs
 */
export async function runSnapshotPassForTrip(
  createdStops: Array<{ travelStopId: string; plannerStop: PlannerTripPlanStop }>,
): Promise<void> {
  console.log(`[SnapshotBridge] Starting snapshot pass for ${createdStops.length} stops`);

  let successCount = 0;
  let failCount = 0;

  for (const { travelStopId, plannerStop } of createdStops) {
    try {
      const snapshot = await generateStopSnapshot(plannerStop);
      await writeSnapshotToStop(travelStopId, snapshot);
      successCount++;
    } catch (err) {
      failCount++;
      console.error(
        `[SnapshotBridge] Snapshot failed for stop ${travelStopId} (planner stop ${plannerStop.id}):`,
        err,
      );
      // Continue — trip and all other stops are unaffected
    }
  }

  console.log(
    `[SnapshotBridge] Snapshot pass complete: ${successCount} succeeded, ${failCount} failed`,
  );
}
