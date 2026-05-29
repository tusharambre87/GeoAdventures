/**
 * useTripExecutionState — Phase 2 (Time-Aware)
 *
 * React hook wrapper around resolveTimeAwareTripState().
 * Provides reactive execution state for any component that needs to know
 * where the user currently is in their adventure.
 *
 * State is driven by:
 *   - trip.status / trip.adventureStartedAt
 *   - stop.isVisited / stop.isSkipped flags
 *   - groupStopsByDay (respects pace + cityDates)
 *   - Calendar date (differenceInCalendarDays from adventureStartedAt)
 *   - uiActiveStopId (optional tap-driven stop override — never persisted)
 *
 * DO NOT add visit logic, mission logic, or planner logic here.
 */

import { useMemo } from "react";
import { useTravel } from "@/lib/travelContext";
import { resolveTimeAwareTripState } from "@/lib/tripStateResolver";
import type { ResolvedTripState } from "@/lib/tripStateResolver";

// Re-export types so existing importers keep working without path changes
export type { TripExecutionStateEnum } from "@/lib/tripStateResolver";
export type TripExecutionState = ResolvedTripState;

/**
 * useTripExecutionState
 *
 * @param tripId         - Optional. If provided, resolves state for that specific trip.
 *                         Falls back to currentTrip from context if omitted.
 * @param uiActiveStopId - Optional. UI-only stop override set when a user taps a stop
 *                         card directly. Passed through to the resolved state and used
 *                         by TripEntryRouter to route to /stop/:id instead of /today.
 *                         Never written to the database.
 */
export function useTripExecutionState(
  tripId?: string,
  uiActiveStopId?: string | null,
): TripExecutionState {
  const { currentTrip, currentTripStops, trips } = useTravel();

  return useMemo<TripExecutionState>(() => {
    const trip = tripId
      ? (trips.find((t) => t.id === tripId) ?? currentTrip)
      : currentTrip;

    const resolved = resolveTimeAwareTripState(trip, currentTripStops, uiActiveStopId ?? null);

    // If the trip has already been explicitly marked completed, override to
    // TRIP_ENDED so the hub shows TripEndedCard (story access) rather than
    // an active AT_STOP / DAY_ACTIVE card.
    if ((trip as any)?.status === "completed" && resolved.state !== "NO_TRIP") {
      return { ...resolved, state: "TRIP_ENDED" };
    }

    return resolved;
  }, [tripId, uiActiveStopId, currentTrip, currentTripStops, trips]);
}
