/**
 * tripStateResolver — Phase 1 (original) + Phase 2 (time-aware extension)
 *
 * Pure, framework-agnostic state resolution for GeoAdventures Travel Mode.
 * No React, no hooks — safe to call from hooks, routers, and server logic.
 *
 * Phase 1 state machine (progress-based, resolveTripState — UNCHANGED):
 *
 *   NO_TRIP           → No travel trip found for this account
 *   TRIP_NOT_STARTED  → Trip created but "Start Adventure" not yet pressed
 *   DAY_NOT_STARTED   → Trip started; current day's stops not yet begun
 *   DAY_ACTIVE        → Day in progress, no stop visited yet in this group
 *   AT_STOP           → ≥1 stop visited; now at or heading to the next stop
 *   DAY_COMPLETE      → All stops in the current day (or all days) are visited
 *
 * Phase 2 additions (resolveTimeAwareTripState — new, wraps Phase 1):
 *   MISSED_DAY        → Calendar day > progress day (user was away)
 *   TRIP_ENDED        → Calendar day ≥ totalDays (trip is over by date)
 *
 * Time-aware rules:
 *   - adventureStartedAt = calendar Day 0
 *   - calendarDayIndex = differenceInCalendarDays(today, adventureStartedAt)
 *   - isSkipped=true stops count as "done" for day progression (isVisited stays false)
 *   - MISSED_DAY/TRIP_ENDED are calendar-only guards; normal states remain progress-based
 *
 * DO NOT put visit logic, mission logic, or planner logic here.
 */

import { differenceInCalendarDays } from "date-fns";
import { groupStopsByDay } from "@/lib/travelDayGroups";
import type { TravelTrip, TravelStop } from "@shared/schema";

// ─── Shared state enum ───────────────────────────────────────────────────────

export type TripExecutionStateEnum =
  | "NO_TRIP"
  | "TRIP_NOT_STARTED"
  | "MISSED_DAY"
  | "TRIP_ENDED"
  | "DAY_NOT_STARTED"
  | "DAY_ACTIVE"
  | "AT_STOP"
  | "DAY_COMPLETE";

export interface ResolvedTripState {
  state: TripExecutionStateEnum;
  trip: TravelTrip | null;
  dayGroups: TravelStop[][];
  currentDay: TravelStop[] | null;
  currentDayIndex: number;
  /** First unvisited, non-skipped stop in the current day — the "active" stop. */
  currentStop: TravelStop | null;
  /** Second unvisited, non-skipped stop — shown as "coming up next". */
  nextStop: TravelStop | null;
  /**
   * UI-level stop override.
   * Set when a user taps a stop card directly (tap-driven, not location-driven).
   * Used only for routing — never persisted as visit state.
   * Null when no override is active.
   */
  uiActiveStopId: string | null;
  /**
   * Calendar-based day index (0-indexed), anchored to adventureStartedAt.
   * Day 0 = the calendar day adventureStartedAt was set.
   * -1 when not applicable (no trip, not started).
   * Populated by resolveTimeAwareTripState; always -1 from resolveTripState.
   */
  calendarDayIndex: number;
  /**
   * How many calendar days the user was away.
   * Set only in MISSED_DAY state; 0 otherwise.
   */
  missedDayCount: number;
  /**
   * Human-readable day badge: "Today · Day N of M"
   * Populated only in DAY_NOT_STARTED, DAY_ACTIVE, AT_STOP states.
   * Null in all other states (planning, trip-ended, day-complete).
   */
  dayBadge: string | null;
}

// ─── Phase 1 — original, unchanged resolver ──────────────────────────────────

/**
 * resolveTripState (Phase 1 — ORIGINAL, UNCHANGED)
 *
 * Pure function. Progress-based state only. No calendar date logic.
 * Kept intact for backward compatibility with any code that calls it directly.
 *
 * All calendarDayIndex/missedDayCount/dayBadge fields are set to neutral defaults.
 */
export function resolveTripState(
  trip: TravelTrip | null,
  allStops: TravelStop[],
  uiActiveStopId: string | null = null,
): ResolvedTripState {
  const empty = (state: TripExecutionStateEnum): ResolvedTripState => ({
    state,
    trip,
    dayGroups: [],
    currentDay: null,
    currentDayIndex: 0,
    currentStop: null,
    nextStop: null,
    uiActiveStopId,
    calendarDayIndex: -1,
    missedDayCount: 0,
    dayBadge: null,
  });

  // ── No trip ──────────────────────────────────────────────────────────────
  if (!trip) return { ...empty("NO_TRIP"), trip: null };

  // ── Trip exists but hasn't been started yet ───────────────────────────────
  if (!trip.adventureStartedAt) {
    return empty("TRIP_NOT_STARTED");
  }

  // ── Stops not yet generated ───────────────────────────────────────────────
  const stops = allStops.filter((s) => s.tripId === trip.id);
  if (stops.length === 0) return empty("DAY_NOT_STARTED");

  // ── Group stops into days ─────────────────────────────────────────────────
  const cityDates = trip.cityDates as
    | Record<string, { startDate: string; endDate: string }>
    | null;
  const dayGroups = groupStopsByDay(stops, undefined, trip.pace, cityDates);

  // ── Find the first day with any unvisited stops = the "current day" ───────
  let currentDayIndex = 0;
  let currentDay: TravelStop[] | null = null;

  for (let i = 0; i < dayGroups.length; i++) {
    if (dayGroups[i].some((s) => !s.isVisited)) {
      currentDayIndex = i;
      currentDay = dayGroups[i];
      break;
    }
  }

  // ── All days fully visited ────────────────────────────────────────────────
  if (!currentDay) {
    const lastDay = dayGroups[dayGroups.length - 1] ?? null;
    return {
      state: "DAY_COMPLETE",
      trip,
      dayGroups,
      currentDay: lastDay,
      currentDayIndex: dayGroups.length - 1,
      currentStop: null,
      nextStop: null,
      uiActiveStopId,
      calendarDayIndex: -1,
      missedDayCount: 0,
      dayBadge: null,
    };
  }

  const unvisited = currentDay.filter((s) => !s.isVisited);
  const visited = currentDay.filter((s) => s.isVisited);

  // ── Current day not yet kicked off ────────────────────────────────────────
  if (visited.length === 0 && !trip.adventureStartedAt) {
    return {
      state: "DAY_NOT_STARTED",
      trip,
      dayGroups,
      currentDay,
      currentDayIndex,
      currentStop: unvisited[0] ?? null,
      nextStop: unvisited[1] ?? null,
      uiActiveStopId,
      calendarDayIndex: -1,
      missedDayCount: 0,
      dayBadge: null,
    };
  }

  const currentStop = unvisited[0] ?? null;
  const nextStop = unvisited[1] ?? null;

  // ── All stops in this day done ────────────────────────────────────────────
  if (unvisited.length === 0) {
    return {
      state: "DAY_COMPLETE",
      trip,
      dayGroups,
      currentDay,
      currentDayIndex,
      currentStop: null,
      nextStop: null,
      uiActiveStopId,
      calendarDayIndex: -1,
      missedDayCount: 0,
      dayBadge: null,
    };
  }

  // ── AT_STOP ───────────────────────────────────────────────────────────────
  if (visited.length > 0 && currentStop !== null) {
    return {
      state: "AT_STOP",
      trip,
      dayGroups,
      currentDay,
      currentDayIndex,
      currentStop,
      nextStop,
      uiActiveStopId,
      calendarDayIndex: -1,
      missedDayCount: 0,
      dayBadge: null,
    };
  }

  // ── DAY_ACTIVE ────────────────────────────────────────────────────────────
  return {
    state: "DAY_ACTIVE",
    trip,
    dayGroups,
    currentDay,
    currentDayIndex,
    currentStop,
    nextStop,
    uiActiveStopId,
    calendarDayIndex: -1,
    missedDayCount: 0,
    dayBadge: null,
  };
}

// ─── Phase 2 — time-aware resolver ──────────────────────────────────────────

/**
 * resolveTimeAwareTripState (Phase 2 — NEW)
 *
 * Calendar-date-driven wrapper around resolveTripState.
 * Introduces MISSED_DAY and TRIP_ENDED guards, anchored to adventureStartedAt.
 *
 * Stop "doneness" for day progression: isVisited=true OR isSkipped=true.
 * This keeps XP/mission/story systems clean — skipped stops never trigger rewards.
 *
 * @param trip          - The travel trip record
 * @param allStops      - All stops for this trip
 * @param uiActiveStopId - Optional tap-driven stop override (see resolveTripState)
 * @param today         - Injectable "today" date (defaults to new Date()). Used for testing.
 */
export function resolveTimeAwareTripState(
  trip: TravelTrip | null,
  allStops: TravelStop[],
  uiActiveStopId: string | null = null,
  today: Date = new Date(),
): ResolvedTripState {
  // ── Fast path: no trip or not started ─────────────────────────────────────
  if (!trip || !trip.adventureStartedAt) {
    return resolveTripState(trip, allStops, uiActiveStopId);
  }

  // ── Build day groups (needed for calendar math and state computation) ──────
  const stops = allStops.filter((s) => s.tripId === trip.id);
  if (stops.length === 0) {
    return resolveTripState(trip, allStops, uiActiveStopId);
  }

  const cityDates = trip.cityDates as
    | Record<string, { startDate: string; endDate: string }>
    | null;
  const dayGroups = groupStopsByDay(stops, undefined, trip.pace, cityDates);
  const totalDays = dayGroups.length;

  // ── Calendar anchor ───────────────────────────────────────────────────────
  const startedAt = new Date(trip.adventureStartedAt);
  const calendarDayIndex = Math.max(0, differenceInCalendarDays(today, startedAt));

  // ── TRIP_ENDED: calendar has advanced past the last day ───────────────────
  if (calendarDayIndex >= totalDays) {
    return {
      state: "TRIP_ENDED",
      trip,
      dayGroups,
      currentDay: dayGroups[totalDays - 1] ?? null,
      currentDayIndex: totalDays - 1,
      currentStop: null,
      nextStop: null,
      uiActiveStopId,
      calendarDayIndex,
      missedDayCount: 0,
      dayBadge: null,
    };
  }

  // ── Find progress day: first day with any active stops ────────────────────
  // A stop is "active" if it's neither visited nor skipped
  let progressDayIndex = totalDays - 1; // Default: last day (all done)
  let foundProgressDay = false;
  for (let i = 0; i < dayGroups.length; i++) {
    const hasActiveStop = dayGroups[i].some((s) => !s.isVisited && !s.isSkipped);
    if (hasActiveStop) {
      progressDayIndex = i;
      foundProgressDay = true;
      break;
    }
  }

  // ── MISSED_DAY: calendar is ahead of progress ─────────────────────────────
  if (foundProgressDay && calendarDayIndex > progressDayIndex) {
    const missedDayCount = calendarDayIndex - progressDayIndex;
    const progressDay = dayGroups[progressDayIndex] ?? [];
    // Provide currentStop so TodayScreen can render safely when user taps "Go back to Day N"
    const progressDayActive = progressDay.filter((s) => !s.isVisited && !s.isSkipped);
    return {
      state: "MISSED_DAY",
      trip,
      dayGroups,
      currentDay: progressDay,
      currentDayIndex: progressDayIndex,
      currentStop: progressDayActive[0] ?? null,
      nextStop: progressDayActive[1] ?? null,
      uiActiveStopId,
      calendarDayIndex,
      missedDayCount,
      dayBadge: null,
    };
  }

  // ── Normal states: delegate to resolveTripState, augment with calendar context ──
  // Transform stops so resolveTripState treats isSkipped as done (isVisited=true).
  // This ensures skipped days are not re-entered as the "current day" after skip-day runs.
  const stopsForLegacyResolver = allStops.map((s) =>
    s.isSkipped ? { ...s, isVisited: true } : s
  );
  const normalState = resolveTripState(trip, stopsForLegacyResolver, uiActiveStopId);

  // Day badge: anchored to calendarDayIndex (today), not progress day.
  // Shown only in DAY_NOT_STARTED, DAY_ACTIVE, AT_STOP (not DAY_COMPLETE).
  const dayBadgeStates: TripExecutionStateEnum[] = [
    "DAY_NOT_STARTED",
    "DAY_ACTIVE",
    "AT_STOP",
  ];
  const dayBadge = dayBadgeStates.includes(normalState.state)
    ? `Today · Day ${calendarDayIndex + 1} of ${totalDays}`
    : null;

  return {
    ...normalState,
    // Re-use the calendar-aware dayGroups (respects isSkipped for group building)
    dayGroups,
    calendarDayIndex,
    missedDayCount: 0,
    dayBadge,
  };
}

// ─── Entry route resolver ────────────────────────────────────────────────────

/**
 * resolveEntryRoute
 *
 * Maps an execution state to the app route the user should land on.
 */
export function resolveEntryRoute(
  state: TripExecutionStateEnum,
  tripId: string | null,
  uiActiveStopId?: string | null,
): string {
  if (!tripId || state === "NO_TRIP") return "/geoadventures";

  switch (state) {
    case "TRIP_NOT_STARTED":
      return `/adventure/${tripId}/parent-plan`;

    case "MISSED_DAY":
      // Stay on hub — the Now tab's MissedDayCard is shown
      return "/geoadventures";

    case "TRIP_ENDED":
      // Trip is over — go to the end-trip (story) screen
      return `/adventure/${tripId}/end-trip`;

    case "DAY_NOT_STARTED":
      return `/adventure/${tripId}/start-day`;

    case "DAY_ACTIVE":
      return `/adventure/${tripId}/today`;

    case "AT_STOP":
      return uiActiveStopId
        ? `/adventure/${tripId}/stop/${uiActiveStopId}`
        : `/adventure/${tripId}/today`;

    case "DAY_COMPLETE":
      return `/adventure/${tripId}/end-day`;

    default:
      return "/geoadventures";
  }
}
