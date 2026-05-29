import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/userContext";

const FEEDBACK_STORAGE_KEY = "geoquest_feedback_state";
const FEEDBACK_DISMISS_DAYS = 30;
const REQUIRED_SESSIONS = 5;
const REQUIRED_GAMES = 5;
const REQUIRED_STOPS = 5;

interface FeedbackState {
  lastDismissedAt: string | null;
  sessionCount: number;
  hasViewedWeeklySummary: boolean;
  stopsVisitedCount: number;
  guessAndGoGamesPlayed: number;
  hasSavedMemory: boolean;
}

const getStoredState = (): FeedbackState => {
  try {
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading feedback state:", e);
  }
  return {
    lastDismissedAt: null,
    sessionCount: 0,
    hasViewedWeeklySummary: false,
    stopsVisitedCount: 0,
    guessAndGoGamesPlayed: 0,
    hasSavedMemory: false,
  };
};

const saveState = (state: FeedbackState) => {
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Error saving feedback state:", e);
  }
};

export function useFeedbackModal() {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<FeedbackState>(getStoredState);

  useEffect(() => {
    const newState = { ...state, sessionCount: state.sessionCount + 1 };
    setState(newState);
    saveState(newState);
  }, []);

  const isDismissedRecently = useCallback(() => {
    if (!state.lastDismissedAt) return false;
    const dismissedDate = new Date(state.lastDismissedAt);
    const daysSinceDismiss = Math.floor(
      (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceDismiss < FEEDBACK_DISMISS_DAYS;
  }, [state.lastDismissedAt]);

  const shouldShowModal = useCallback(() => {
    if (isDismissedRecently()) return false;
    
    const context = checkFeedbackContext();
    if (context.isInGameplay || context.isInOnboarding || context.isAfterError) {
      return false;
    }

    const hasEnoughSessions = state.sessionCount >= REQUIRED_SESSIONS;
    const hasViewedWeekly = state.hasViewedWeeklySummary;
    const hasEnoughStops = state.stopsVisitedCount >= REQUIRED_STOPS;
    const hasEnoughGames = state.guessAndGoGamesPlayed >= REQUIRED_GAMES;
    const hasSavedMemory = state.hasSavedMemory;

    return hasEnoughSessions || hasViewedWeekly || hasEnoughStops || hasEnoughGames || hasSavedMemory;
  }, [state, isDismissedRecently]);

  const openModal = useCallback(() => {
    if (shouldShowModal()) {
      setIsOpen(true);
    }
  }, [shouldShowModal]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const dismissModal = useCallback(() => {
    const newState = {
      ...state,
      lastDismissedAt: new Date().toISOString(),
    };
    setState(newState);
    saveState(newState);
    setIsOpen(false);
  }, [state]);

  const recordWeeklySummaryViewed = useCallback(() => {
    const newState = { ...state, hasViewedWeeklySummary: true };
    setState(newState);
    saveState(newState);
  }, [state]);

  const recordStopVisited = useCallback(() => {
    const newState = { ...state, stopsVisitedCount: state.stopsVisitedCount + 1 };
    setState(newState);
    saveState(newState);
  }, [state]);

  const recordGuessAndGoPlayed = useCallback(() => {
    const newState = { ...state, guessAndGoGamesPlayed: state.guessAndGoGamesPlayed + 1 };
    setState(newState);
    saveState(newState);
  }, [state]);

  const recordMemorySaved = useCallback(() => {
    const newState = { ...state, hasSavedMemory: true };
    setState(newState);
    saveState(newState);
  }, [state]);

  const canShow = shouldShowModal();

  return {
    isOpen,
    openModal,
    closeModal,
    dismissModal,
    canShow,
    recordWeeklySummaryViewed,
    recordStopVisited,
    recordGuessAndGoPlayed,
    recordMemorySaved,
    state,
  };
}

export function checkFeedbackContext(): {
  isInGameplay: boolean;
  isInOnboarding: boolean;
  isAfterError: boolean;
} {
  const path = window.location.pathname;
  
  const isInGameplay = 
    path.includes("/game") ||
    path.includes("/crossworld") ||
    path.includes("/daily-quest") ||
    path.includes("/spin-the-world") ||
    path.includes("/find-my-home") ||
    path.includes("/map-me") ||
    path.includes("/geo-maze") ||
    path.includes("/spell-geo") ||
    path.includes("/georelic-puzzles") ||
    path.includes("/map-puzzles");

  const isInOnboarding = path === "/" && !localStorage.getItem("geoquest_has_played");
  
  const isAfterError = sessionStorage.getItem("last_error_timestamp")
    ? Date.now() - parseInt(sessionStorage.getItem("last_error_timestamp") || "0", 10) < 60000
    : false;

  return { isInGameplay, isInOnboarding, isAfterError };
}
