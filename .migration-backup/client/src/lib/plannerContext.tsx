import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { PlannerTripPlan, PlannerTripPlanStop, PlannerPass, SupportAction, PlannerStopIntelligence } from "@shared/schema";

export interface PlannerRouteStop {
  id: string;
  name: string;
  countryName?: string;
  nights?: number;
}

export interface PlannerStayLocation {
  cityName?: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
}

export interface PlannerInput {
  destination: string;
  tripDays: number;
  childrenAges: number[];
  pace: "relaxed" | "moderate" | "busy";
  tripStyle?: "highlights" | "balanced" | "offbeat" | "easy";
  transportMode?: "walking" | "driving" | "transit";
  budgetSensitivity?: "budget" | "moderate" | "premium";
  kidEnergyLevel?: "full" | "mixed" | "low";
  indoorLean?: "outdoor" | "mix" | "indoor";
  interests?: string[];
  strollerNeeded?: boolean;
  stayLocations?: PlannerStayLocation[];
  stopIntelligenceEnabled?: boolean;
  routeStops?: Array<{ name: string; countryName?: string; nights?: number }>;
  experienceTripId?: string;
}

export interface LiveSupportState {
  activeStopId: string | null;
  action: SupportAction | null;
  result: { suggestion: string; details: string; shortenedTo?: number } | null;
  loading: boolean;
}

export interface HandoffState {
  loading: boolean;
  experienceTripId: string | null;
  error: string | null;
}

export type IntelligenceMap = Record<string, PlannerStopIntelligence | null>;

interface PlannerContextType {
  plannerInput: PlannerInput;
  setPlannerInput: (input: PlannerInput) => void;
  plannerRouteStops: PlannerRouteStop[];
  setPlannerRouteStops: (stops: PlannerRouteStop[]) => void;
  tripPlan: PlannerTripPlan | null;
  stops: PlannerTripPlanStop[];
  passes: PlannerPass[];
  intelligence: IntelligenceMap;
  uiState: {
    generating: boolean;
    error: string | null;
    selectedDay: number;
    selectedStopId: string | null;
    showReplaceSheet: boolean;
    showStopDetails: boolean;
    showPasses: boolean;
    showStartConfirm: boolean;
  };
  liveSupportState: LiveSupportState;
  handoffState: HandoffState;
  generatePlan: (input: PlannerInput) => Promise<void>;
  fetchPlan: (planId: string) => Promise<void>;
  fetchIntelligence: (planId: string) => Promise<void>;
  replaceStop: (stopId: string, newStopData: Partial<PlannerTripPlanStop>) => Promise<void>;
  deleteStop: (stopId: string) => Promise<void>;
  updateStop: (stopId: string, data: Partial<PlannerTripPlanStop>) => Promise<void>;
  addStop: (dayNumber: number, name: string, stopType?: string) => Promise<void>;
  triggerSupport: (stopId: string, action: LiveSupportState["action"], confirm?: boolean) => Promise<void>;
  clearSupport: () => void;
  fetchPasses: (planId: string) => Promise<void>;
  addPass: (planId: string, data: Partial<PlannerPass>) => Promise<void>;
  updatePass: (passId: string, data: Partial<PlannerPass>) => Promise<void>;
  deletePass: (passId: string) => Promise<void>;
  startAdventure: (planId: string, includedStopIds?: string[]) => Promise<{ experienceTripId: string; planId: string; tripName: string; totalStops: number }>;
  optimizeDay: (planId: string, day: number) => Promise<void>;
  setUiState: (updates: Partial<typeof defaultUiState>) => void;
  resetPlanner: () => void;
}

const defaultInput: PlannerInput = {
  destination: "",
  tripDays: 3,
  childrenAges: [],
  pace: "moderate",
  transportMode: "walking",
  budgetSensitivity: "moderate",
};

const defaultUiState: {
  generating: boolean;
  error: string | null;
  selectedDay: number;
  selectedStopId: string | null;
  showReplaceSheet: boolean;
  showStopDetails: boolean;
  showPasses: boolean;
  showStartConfirm: boolean;
} = {
  generating: false,
  error: null,
  selectedDay: 1,
  selectedStopId: null,
  showReplaceSheet: false,
  showStopDetails: false,
  showPasses: false,
  showStartConfirm: false,
};

const PlannerContext = createContext<PlannerContextType | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [plannerInput, setPlannerInput] = useState<PlannerInput>(defaultInput);
  const [plannerRouteStops, setPlannerRouteStops] = useState<PlannerRouteStop[]>([]);
  const [tripPlan, setTripPlan] = useState<PlannerTripPlan | null>(null);
  const [stops, setStops] = useState<PlannerTripPlanStop[]>([]);
  const [passes, setPasses] = useState<PlannerPass[]>([]);
  const [intelligence, setIntelligence] = useState<IntelligenceMap>({});
  const [uiState, setUiStateRaw] = useState(defaultUiState);
  const [liveSupportState, setLiveSupportState] = useState<LiveSupportState>({
    activeStopId: null,
    action: null,
    result: null,
    loading: false,
  });
  const [handoffState, setHandoffState] = useState<HandoffState>({
    loading: false,
    experienceTripId: null,
    error: null,
  });

  const setUiState = useCallback((updates: Partial<typeof defaultUiState>) => {
    setUiStateRaw((prev) => ({ ...prev, ...updates }));
  }, []);

  const fetchIntelligence = useCallback(async (planId: string) => {
    try {
      const res = await fetch(`/api/planner/trip-plans/${planId}/stops/intelligence`, { credentials: "include" });
      if (!res.ok) return;
      const data: { stopId: string; placeId: string | null; intelligence: PlannerStopIntelligence | null }[] = await res.json();
      const map: IntelligenceMap = {};
      for (const row of data) {
        map[row.stopId] = row.intelligence;
      }
      setIntelligence(map);
    } catch {
      // Intelligence is optional — silently degrade
    }
  }, []);

  const generatePlan = useCallback(async (input: PlannerInput) => {
    setUiState({ generating: true, error: null });
    try {
      const res = await fetch("/api/planner/trip-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to generate plan");
      }
      const data = await res.json();
      setTripPlan(data.plan);
      setStops(data.stops || []);
      setPlannerInput(input);
      // Auto-fetch intelligence after generation (non-blocking)
      fetchIntelligence(data.plan.id).catch(() => {});
    } catch (err: any) {
      setUiState({ error: err.message || "Failed to generate plan" });
      throw err;
    } finally {
      setUiState({ generating: false });
    }
  }, [setUiState, fetchIntelligence]);

  const fetchPlan = useCallback(async (planId: string) => {
    try {
      const res = await fetch(`/api/planner/trip-plans/${planId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch plan");
      const data = await res.json();
      setTripPlan(data.plan);
      setStops(data.stops || []);
      // Auto-fetch intelligence (non-blocking)
      fetchIntelligence(planId).catch(() => {});
    } catch (err: any) {
      setUiState({ error: err.message });
    }
  }, [setUiState, fetchIntelligence]);

  const deleteStop = useCallback(async (stopId: string) => {
    if (!tripPlan) return;
    const res = await fetch(`/api/planner/trip-plans/${tripPlan.id}/stops/${stopId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to delete stop");
    setStops((prev) => prev.filter((s) => s.id !== stopId));
  }, [tripPlan]);

  const replaceStop = useCallback(async (stopId: string, newStopData: Partial<PlannerTripPlanStop>) => {
    if (!tripPlan) return;
    try {
      const res = await fetch(`/api/planner/trip-plans/${tripPlan.id}/stops/${stopId}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newStopData),
      });
      if (!res.ok) throw new Error("Failed to replace stop");
      const updated = await res.json();
      setStops((prev) => prev.map((s) => (s.id === stopId ? updated : s)));
      // Refresh intelligence after replacement
      fetchIntelligence(tripPlan.id).catch(() => {});
    } catch (err: any) {
      setUiState({ error: err.message });
    }
  }, [tripPlan, setUiState, fetchIntelligence]);

  const updateStop = useCallback(async (stopId: string, data: Partial<PlannerTripPlanStop>) => {
    if (!tripPlan) return;
    try {
      const res = await fetch(`/api/planner/trip-plans/${tripPlan.id}/stops/${stopId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update stop");
      const updated = await res.json();
      setStops((prev) => prev.map((s) => (s.id === stopId ? updated : s)));
    } catch (err: any) {
      setUiState({ error: err.message });
    }
  }, [tripPlan, setUiState]);

  const addStop = useCallback(async (dayNumber: number, name: string, stopType?: string) => {
    if (!tripPlan) return;
    try {
      const res = await fetch(`/api/planner/trip-plans/${tripPlan.id}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dayNumber, name, stopType: stopType || "landmark" }),
      });
      if (!res.ok) throw new Error("Failed to add stop");
      const created = await res.json();
      setStops((prev) => [...prev, created]);
    } catch (err: any) {
      setUiState({ error: err.message });
      throw err;
    }
  }, [tripPlan, setUiState]);

  const triggerSupport = useCallback(async (stopId: string, action: LiveSupportState["action"], confirm?: boolean) => {
    if (!tripPlan || !action) return;
    setLiveSupportState({ activeStopId: stopId, action, result: null, loading: true });
    try {
      const res = await fetch(`/api/planner/trip-plans/${tripPlan.id}/stops/${stopId}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, confirm: confirm || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      const result = await res.json();
      setLiveSupportState((prev) => ({ ...prev, result, loading: false }));
      if (confirm && action === "shorten" && result.shortenedTo) {
        setStops((prev) => prev.map((s) => s.id === stopId ? { ...s, durationMinutes: result.shortenedTo } : s));
      }
    } catch {
      setLiveSupportState((prev) => ({ ...prev, loading: false }));
    }
  }, [tripPlan]);

  const clearSupport = useCallback(() => {
    setLiveSupportState({ activeStopId: null, action: null, result: null, loading: false });
  }, []);

  const fetchPasses = useCallback(async (planId: string) => {
    try {
      const res = await fetch(`/api/planner/trip-plans/${planId}/passes`, { credentials: "include" });
      if (res.ok) setPasses(await res.json());
    } catch {}
  }, []);

  const addPass = useCallback(async (planId: string, data: Partial<PlannerPass>) => {
    try {
      const res = await fetch(`/api/planner/trip-plans/${planId}/passes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const pass = await res.json();
        setPasses((prev) => [pass, ...prev]);
      }
    } catch {}
  }, []);

  const updatePass = useCallback(async (passId: string, data: Partial<PlannerPass>) => {
    try {
      const res = await fetch(`/api/planner/passes/${passId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setPasses((prev) => prev.map((p) => (p.id === passId ? updated : p)));
      }
    } catch {}
  }, []);

  const deletePass = useCallback(async (passId: string) => {
    try {
      await fetch(`/api/planner/passes/${passId}`, { method: "DELETE", credentials: "include" });
      setPasses((prev) => prev.filter((p) => p.id !== passId));
    } catch {}
  }, []);

  const startAdventure = useCallback(async (planId: string, includedStopIds?: string[]): Promise<{ experienceTripId: string; planId: string; tripName: string; totalStops: number }> => {
    setHandoffState({ loading: true, experienceTripId: null, error: null });
    try {
      const res = await fetch(`/api/planner/trip-plans/${planId}/start-adventure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ includedStopIds }),
      });
      if (res.status === 401) {
        setHandoffState({ loading: false, experienceTripId: null, error: "Session expired — please log in again" });
        window.location.href = "/?login=true";
        throw new Error("Session expired");
      }
      if (!res.ok) {
        let msg = "Failed to start adventure";
        try { const d = await res.json(); msg = d.message || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setHandoffState({ loading: false, experienceTripId: data.experienceTripId, error: null });
      return data;
    } catch (err: any) {
      setHandoffState({ loading: false, experienceTripId: null, error: err.message });
      throw err;
    }
  }, []);

  const optimizeDay = useCallback(async (planId: string, day: number) => {
    try {
      const res = await fetch(`/api/planner/trip-plans/${planId}/days/${day}/optimize-order`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to optimize");
      const updatedDayStops: PlannerTripPlanStop[] = await res.json();
      setStops((prev) => {
        const otherDays = prev.filter((s) => s.dayNumber !== day);
        return [...otherDays, ...updatedDayStops];
      });
    } catch (err: any) {
      setUiState({ error: err.message });
      throw err;
    }
  }, [setUiState]);

  const resetPlanner = useCallback(() => {
    setPlannerInput(defaultInput);
    setPlannerRouteStops([]);
    setTripPlan(null);
    setStops([]);
    setPasses([]);
    setIntelligence({});
    setUiStateRaw(defaultUiState);
    setLiveSupportState({ activeStopId: null, action: null, result: null, loading: false });
    setHandoffState({ loading: false, experienceTripId: null, error: null });
  }, []);

  return (
    <PlannerContext.Provider value={{
      plannerInput,
      setPlannerInput,
      plannerRouteStops,
      setPlannerRouteStops,
      tripPlan,
      stops,
      passes,
      intelligence,
      uiState,
      liveSupportState,
      handoffState,
      generatePlan,
      fetchPlan,
      fetchIntelligence,
      replaceStop,
      deleteStop,
      updateStop,
      addStop,
      triggerSupport,
      clearSupport,
      fetchPasses,
      addPass,
      updatePass,
      deletePass,
      startAdventure,
      optimizeDay,
      setUiState,
      resetPlanner,
    }}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used within PlannerProvider");
  return ctx;
}
