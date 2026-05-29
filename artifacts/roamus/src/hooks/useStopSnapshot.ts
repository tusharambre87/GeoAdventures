/**
 * useStopSnapshot — Phase 2
 *
 * Client-side hook for reading the execution snapshot from a travel stop.
 *
 * The snapshot is stored in travel_stops.metadata (JSONB) and loaded
 * as part of the normal trip fetch — no extra API call needed.
 *
 * Usage:
 *   const snapshot = useStopSnapshot(stop.id);
 *   if (snapshot?.bestTimeTip) { ... }
 *
 * Returns null for:
 *   - Stops created before Phase 2 (metadata: null)
 *   - Stops where enrichment failed (metadata: null)
 *   - Unknown stop IDs
 *
 * Execution screens MUST always render correctly when snapshot is null.
 * The snapshot is enhancement-only — never a required data dependency.
 */

import { useMemo } from "react";
import { useTravel } from "@/lib/travelContext";
import type { StopExecutionSnapshot } from "@shared/schema";

/**
 * useStopSnapshot
 *
 * @param stopId - The travel_stop ID to read the snapshot for.
 *                 Pass null/undefined when no stop is selected.
 * @returns The typed StopExecutionSnapshot, or null if unavailable.
 */
export function useStopSnapshot(
  stopId: string | null | undefined,
): StopExecutionSnapshot | null {
  const { currentTripStops } = useTravel();

  return useMemo(() => {
    if (!stopId) return null;

    const stop = currentTripStops.find((s) => s.id === stopId);
    if (!stop) return null;

    // metadata is typed as `unknown` in the Drizzle schema — cast safely
    const raw = stop.metadata;
    if (!raw || typeof raw !== "object") return null;

    return raw as StopExecutionSnapshot;
  }, [stopId, currentTripStops]);
}

/**
 * getSnapshotFromStop
 *
 * Non-hook helper for reading a snapshot from an already-fetched TravelStop.
 * Use when you have the stop object directly (e.g. in event handlers).
 */
export function getSnapshotFromStop(
  stop: { metadata?: unknown } | null | undefined,
): StopExecutionSnapshot | null {
  if (!stop) return null;
  const raw = stop.metadata;
  if (!raw || typeof raw !== "object") return null;
  return raw as StopExecutionSnapshot;
}
