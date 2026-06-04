import React, { createContext, ReactNode, useContext, useState } from "react";

import type { ExploreContent } from "@/lib/apiClient";

export type { ExploreContent };

interface KidsState {
  stopId: string;
  stopName: string;
  tripId: string;
  kidName: string;
  explorerId: string;
  xpToday: number;
  currentStoryIndex: number;
  completedStories: [boolean, boolean, boolean];
  wonderObservation: string;
  selectedTopics: string[];
  exploreContent: ExploreContent | null;
  isLoadingExplore: boolean;
  exploreError: boolean;
  sessionXpEarned: number;
}

interface KidsCtx extends KidsState {
  setStopInfo: (stopId: string, stopName: string, tripId: string) => void;
  setCurrentStoryIndex: (n: number) => void;
  markStoryComplete: (n: number) => void;
  setWonderObservation: (s: string) => void;
  setSelectedTopics: (t: string[]) => void;
  setExploreContent: (c: ExploreContent | null) => void;
  setLoadingExplore: (b: boolean) => void;
  setExploreError: (b: boolean) => void;
  setKidName: (name: string) => void;
  setXpToday: (xp: number) => void;
  setExplorerId: (id: string) => void;
  addSessionXp: (xp: number) => void;
}

const KidsContext = createContext<KidsCtx>({} as KidsCtx);

export function KidsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KidsState>({
    stopId: "",
    stopName: "Millennium Park",
    tripId: "",
    kidName: "Explorer",
    explorerId: "",
    xpToday: 0,
    currentStoryIndex: 0,
    completedStories: [false, false, false],
    wonderObservation: "",
    selectedTopics: [],
    exploreContent: null,
    isLoadingExplore: false,
    exploreError: false,
    sessionXpEarned: 0,
  });

  const ctx: KidsCtx = {
    ...state,
    setStopInfo: (stopId, stopName, tripId) =>
      setState((s) => ({ ...s, stopId, stopName, tripId, sessionXpEarned: 0 })),
    setCurrentStoryIndex: (n) =>
      setState((s) => ({ ...s, currentStoryIndex: n })),
    markStoryComplete: (n) =>
      setState((s) => {
        const c: [boolean, boolean, boolean] = [...s.completedStories] as [boolean, boolean, boolean];
        c[n] = true;
        return { ...s, completedStories: c };
      }),
    setWonderObservation: (wonderObservation) =>
      setState((s) => ({ ...s, wonderObservation })),
    setSelectedTopics: (selectedTopics) =>
      setState((s) => ({ ...s, selectedTopics })),
    setExploreContent: (exploreContent) =>
      setState((s) => ({ ...s, exploreContent })),
    setLoadingExplore: (isLoadingExplore) =>
      setState((s) => ({ ...s, isLoadingExplore })),
    setExploreError: (exploreError) =>
      setState((s) => ({ ...s, exploreError })),
    setKidName: (kidName) => setState((s) => ({ ...s, kidName })),
    setXpToday: (xpToday) => setState((s) => ({ ...s, xpToday })),
    addSessionXp: (xp) => setState((s) => ({ ...s, sessionXpEarned: s.sessionXpEarned + xp, xpToday: s.xpToday + xp })),
    setExplorerId: (explorerId) => setState((s) => ({ ...s, explorerId })),
  };

  return <KidsContext.Provider value={ctx}>{children}</KidsContext.Provider>;
}

export function useKids() {
  return useContext(KidsContext);
}
