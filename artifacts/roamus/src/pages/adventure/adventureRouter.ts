import type { TravelTrip, TravelStop, JourneyPackProgress } from "@shared/schema";

/**
 * Logic to determine the "planned" next stop for an adventure.
 * Returns the first unvisited stop based on displayOrder.
 */
export function getPlannedNextStop(stops: TravelStop[]): TravelStop | null {
  const unvisitedStops = stops
    .filter((s) => !s.isVisited)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return unvisitedStops.length > 0 ? unvisitedStops[0] : null;
}

/**
 * Logic to determine the current stop being focused on.
 * Uses sessionStorage override if present, otherwise falls back to planned stop.
 */
export function getCurrentStop(
  plannedStopId: string | null,
  overrideStopId: string | null
): string | null {
  return overrideStopId || plannedStopId;
}

interface LocalFlags {
  hasSeenQuiet?: boolean;
}

/**
 * Determines the next route in the guided kid flow (K1-K7b).
 */
export function getNextKidRoute(
  tripId: string,
  trip: TravelTrip | null,
  stops: TravelStop[],
  journeyPackProgress: JourneyPackProgress[],
  localFlags: LocalFlags = {}
): string {
  const base = `/adventure/${tripId}/kid`;

  // Case 1: Trip not started or upcoming
  if (!trip || trip.status === "upcoming" || !trip.adventureStartedAt) {
    console.log("[AdventureRouter] Branch: Trip not started/upcoming -> Kid Hub");
    return base;
  }

  const plannedStop = getPlannedNextStop(stops);
  const sessionOverrideStopId = sessionStorage.getItem(`adventure_override_stop_${tripId}`);
  const currentStopId = getCurrentStop(plannedStop?.id || null, sessionOverrideStopId);

  // Case 2: No more stops and no override
  if (!currentStopId) {
    console.log("[AdventureRouter] Branch: All stops visited -> Recap");
    return `${base}/recap`;
  }

  const currentStop = stops.find((s) => s.id === currentStopId);
  const progress = journeyPackProgress.find((p) => p.stopId === currentStopId);

  // Case 3: Story not heard (listenProgress < 100 or 'listen' not in completedSections)
  // According to T008 details: "If current stop listen not heard"
  const hasHeardStory = progress?.completedSections?.includes("listen") || (progress?.listenProgress || 0) >= 100;
  if (!hasHeardStory) {
    console.log(`[AdventureRouter] Branch: Story not heard for ${currentStop?.name} -> Next Stop Page`);
    return `${base}/next`;
  }

  // Case 4: Quiet not shown
  const hasDoneQuiet = progress?.completedSections?.includes("quiet") || localFlags.hasSeenQuiet;
  if (!hasDoneQuiet) {
    console.log(`[AdventureRouter] Branch: Quiet not shown for ${currentStop?.name} -> Quiet Page`);
    return `${base}/quiet/${currentStopId}`;
  }

  // Case 5: Reflection not done
  const hasDoneReflect = progress?.completedSections?.includes("reflect");
  if (!hasDoneReflect) {
    console.log(`[AdventureRouter] Branch: Reflection not done for ${currentStop?.name} -> Reflect Page`);
    return `${base}/reflect/${currentStopId}`;
  }

  // If current stop is fully processed but still in override mode, maybe we should clear it or go to recap?
  // Usually we'd go to the next planned stop.
  console.log(`[AdventureRouter] Branch: Stop ${currentStop?.name} complete -> Next Stop Page`);
  return `${base}/next`;
}

/**
 * Checks if the "Skip Story" feature should be unlocked.
 * Unlocked if at least 2 stops have significant listen progress (>= 60).
 */
export function isStorySkipUnlocked(journeyPackProgress: JourneyPackProgress[]): boolean {
  const significantListenCount = journeyPackProgress.filter(
    (p) => (p.listenProgress || 0) >= 60 || p.completedSections?.includes("listen")
  ).length;
  
  return significantListenCount >= 2;
}
