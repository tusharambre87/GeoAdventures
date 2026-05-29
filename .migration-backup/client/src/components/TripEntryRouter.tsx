/**
 * TripEntryRouter — Phase 1
 *
 * Single entry routing layer for GeoAdventures.
 * Replaces the old ActiveTripRedirector component.
 *
 * Responsibilities:
 *   1. Find the latest active travel trip for this account
 *   2. Ensure its stops are loaded (calls ensureTripLoaded)
 *   3. Wait until trip data is available before resolving
 *   4. Use resolveEntryRoute() to determine the correct screen
 *   5. Navigate there — once, on hub entry, with the ?home=1 bypass intact
 *
 * Rules:
 *   - Only fires when the user is at /geoadventures or /travel (hub entry paths)
 *   - ?home=1 suppresses the redirect (user explicitly chose to come home)
 *   - uiActiveStopId enables tap-driven routing to a specific stop view
 *   - Never touches visit logic, mission logic, or planner logic
 *   - hasRedirectedRef prevents double-navigation on re-render
 *
 * This component renders null — it is purely a routing side-effect.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTravel } from "@/lib/travelContext";
import { useTripExecutionState } from "@/hooks/useTripExecutionState";
import { resolveEntryRoute } from "@/lib/tripStateResolver";

interface TripEntryRouterProps {
  /**
   * UI-only stop override. Set externally when a user taps a stop card.
   * Routes AT_STOP state to /stop/:id instead of /today.
   * Never persisted to the database.
   */
  uiActiveStopId?: string | null;
}

export function TripEntryRouter({ uiActiveStopId }: TripEntryRouterProps = {}) {
  const [, setLocation] = useLocation();
  const { trips, isLoading, ensureTripLoaded, currentTrip, currentTripStops } =
    useTravel();

  // The trip ID we're routing for — set once stops are loaded
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Prevent double-navigation on re-renders
  const hasRedirectedRef = useRef(false);

  // ── Step 1: Find the active travel trip and load its stops ─────────────────
  useEffect(() => {
    // Wait until the trip list is ready
    if (isLoading || trips.length === 0) return;

    const pathname = window.location.pathname;

    // Only run on hub entry paths — not inside individual trip screens
    const isHubEntry =
      pathname === "/geoadventures" || pathname === "/travel";
    if (!isHubEntry) return;

    // Find the latest active travel trip.
    // travel context only — home/virtual adventures are excluded.
    // Prefers status='active'; also catches trips that were started but not
    // yet marked 'completed' (e.g. multi-day trips in progress).
    const activeTrip = trips.find(
      (t) =>
        t.adventureContext === "travel" &&
        (t.status === "active" ||
          (t.adventureStartedAt && t.status !== "completed")),
    );

    // No active trip → stay on hub (TripEntryRouter stays silent; hub shows create CTA)
    if (!activeTrip) return;

    // Trigger stop fetch for this trip so the state resolver has accurate data
    ensureTripLoaded(activeTrip.id);

    // Wait until currentTrip matches — this signals that stop data is populated.
    // Without this guard we'd compute a premature DAY_NOT_STARTED state.
    if (!currentTrip || currentTrip.id !== activeTrip.id) return;

    // Lock in the trip ID (once, so state doesn't thrash on subsequent renders)
    setActiveTripId((prev) => prev ?? activeTrip.id);
  }, [isLoading, trips, currentTrip, currentTripStops, ensureTripLoaded]);

  // ── Step 2: Resolve execution state for the active trip ────────────────────
  // Hook always runs (Rules of Hooks); result is only acted upon when activeTripId is set
  const { state } = useTripExecutionState(
    activeTripId ?? undefined,
    uiActiveStopId,
  );

  // ── Step 3: Navigate to the correct screen ─────────────────────────────────
  useEffect(() => {
    // Not ready yet
    if (!activeTripId) return;

    // State machine not yet resolved (trip data still loading)
    if (state === "NO_TRIP") return;

    // MISSED_DAY: stay on hub — the Now tab's MissedDayCard drives the user's choice.
    // No auto-redirect; the card's CTAs ("Continue from Day N" / "Go back to Day N") handle navigation.
    if (state === "MISSED_DAY") return;

    // TRIP_ENDED: stay on hub — TripEndedCard in the Now tab owns navigation to end-trip screen.
    // Routing here would bypass the card entirely; the user must see it and choose.
    if (state === "TRIP_ENDED") return;

    // Already redirected this session — don't fire again
    if (hasRedirectedRef.current) return;

    // ?home=1 bypass: user navigated home explicitly (e.g. from TodayScreen home button).
    // Skip the redirect and clean up the query param so it doesn't persist.
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("home") === "1") {
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    // Resolve the target route and navigate
    hasRedirectedRef.current = true;
    const route = resolveEntryRoute(state, activeTripId, uiActiveStopId);
    setLocation(route);
  }, [state, activeTripId, uiActiveStopId, setLocation]);

  // Purely a routing side-effect — renders nothing
  return null;
}
