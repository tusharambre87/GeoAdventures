import React, { createContext, useContext, useState } from 'react';

export type Traveler = {
  id: number;
  init: string;
  name: string;
  isParent: boolean;
  age?: number;
};

export type PreviewStop = {
  name: string;
  description: string;
  stopType: string;
  time: string;
};

export type PreviewDay = {
  label: string;
  stops: PreviewStop[];
};

export type CityDateEntry = { arrive: string | null; leave: string | null };

export type OnboardingData = {
  cities: string[];
  cityMode: "one" | "multi";
  cityDates: Record<string, CityDateEntry>;
  travelers: Traveler[];
  startDate: string | null;
  endDate: string | null;
  arrivalMethod: string | null;
  arrivalTime: string | null;
  tripStyle: string | null;
  pace: string | null;
  transport: string | null;
  stroller: boolean | null;
  interests: string[];
  createdTripId: string | null;
  /** AI-generated trip preview; set by Building screen before account creation */
  generatedTrip: { days: PreviewDay[] } | null;
  /** true only while the user is actively mid-flow after registration (Account→Upgrade) */
  onboardingInProgress: boolean;
  /** "travel" | "late" | "full" — what the last day of the trip looks like */
  lastDay: string | null;
  /** Record of "CityA→CityB" → "morning"|"midday"|"evening" transition timing */
  cityTransitions: Record<string, string>;
};

const DEFAULT: OnboardingData = {
  cities: [],
  cityMode: "one",
  cityDates: {},
  travelers: [{ id: 0, init: 'Y', name: 'You', isParent: true }],
  startDate: null,
  endDate: null,
  arrivalMethod: null,
  arrivalTime: null,
  tripStyle: null,
  pace: null,
  transport: null,
  stroller: null,
  interests: [],
  createdTripId: null,
  generatedTrip: null,
  onboardingInProgress: false,
  lastDay: null,
  cityTransitions: {},
};

type Ctx = {
  data: OnboardingData;
  set: (patch: Partial<OnboardingData>) => void;
  reset: () => void;
  completeOnboarding: () => void;
};

const OnboardingContext = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(DEFAULT);

  function set(patch: Partial<OnboardingData>) {
    setData(prev => ({ ...prev, ...patch }));
  }

  function reset() {
    setData(DEFAULT);
  }

  function completeOnboarding() {
    setData(prev => ({ ...prev, onboardingInProgress: false }));
  }

  return (
    <OnboardingContext.Provider value={{ data, set, reset, completeOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
