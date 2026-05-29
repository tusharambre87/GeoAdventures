/**
 * kidModeSession.ts
 *
 * Utilities for the kid-mode state layer.
 *
 * Keys (all stored in localStorage — survives app backgrounding, tab switches,
 * and screen sleeps unlike sessionStorage):
 *   kidHandoffReturn-{tripId}          — parent return URL
 *   kidFlowState-{tripId}-{stopId}     — { storyCompleted, missionCompleted, ... }
 *
 * Cleanup rules:
 *   - Do NOT clear on "Hand back to parent" — the parent needs to see what the kid did.
 *   - DO clear when the parent marks the stop done or skips it (call clearKidSession then).
 *   - State is also auto-reset in TodayScreen when a new stop becomes current.
 */

export type CompletionLevel = "story_only" | "story_mission" | "full";

export interface KidFlowState {
  kidExperienceStarted: boolean;
  storyCompleted: boolean;
  wonderCompleted?: boolean;
  wonderResponse?: string;
  missionCompleted: boolean;
  gamesCompleted: boolean;
  completionLevel?: CompletionLevel;
  /** Set when kids do travel-mode engagement (story/guess) from blue mode, BEFORE arriving at the stop */
  travelEngagementStarted?: boolean;
}

export function handoffReturnKey(tripId: string): string {
  return `kidHandoffReturn-${tripId}`;
}

export function kidFlowStateKey(tripId: string, stopId: string): string {
  return `kidFlowState-${tripId}-${stopId}`;
}

export function getHandoffReturn(tripId: string, fallback?: string): string {
  try {
    return (
      localStorage.getItem(handoffReturnKey(tripId)) ??
      fallback ??
      `/adventure/${tripId}/today`
    );
  } catch {
    return fallback ?? `/adventure/${tripId}/today`;
  }
}

export function setHandoffReturn(tripId: string, url: string): void {
  try {
    localStorage.setItem(handoffReturnKey(tripId), url);
  } catch {}
}

export function getKidFlowState(tripId: string, stopId: string): KidFlowState {
  const defaults: KidFlowState = { kidExperienceStarted: false, storyCompleted: false, missionCompleted: false, gamesCompleted: false };
  try {
    const raw = localStorage.getItem(kidFlowStateKey(tripId, stopId));
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function setKidFlowState(
  tripId: string,
  stopId: string,
  patch: Partial<KidFlowState>
): void {
  try {
    const current = getKidFlowState(tripId, stopId);
    localStorage.setItem(
      kidFlowStateKey(tripId, stopId),
      JSON.stringify({ ...current, ...patch })
    );
  } catch {}
}

/**
 * Clear kid session for a stop. Call this ONLY when the parent marks the stop
 * done or skips it — NOT when the kid hands back to the parent.
 */
export function clearKidSession(tripId: string, stopId?: string): void {
  try {
    localStorage.removeItem(handoffReturnKey(tripId));
    if (stopId) {
      localStorage.removeItem(kidFlowStateKey(tripId, stopId));
    }
  } catch {}
}
