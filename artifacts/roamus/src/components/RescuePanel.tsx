import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ChevronRight, Plus, Search, MapPin, Route, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useQualitySignal } from "@/hooks/useQualitySignal";

type RescueAction = "food" | "break" | "easier" | "fun" | "skip";

interface SuggestionItem {
  name: string;
  stopType: string;
  duration?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  closestStopName?: string;
}

interface LighterProposal {
  stopsToRemove: { id: string; name: string; reason?: string }[];
  stopsToKeep: { id: string; name: string; anchorReason?: string }[];
  explanation: string;
  newTotalMinutes: number;
  oldTotalMinutes: number;
}

interface SnapshotHints {
  food?: string;
  break?: string;
  shorten?: string;
}

interface RescuePanelProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  currentStopId?: string | null;
  nextStopId?: string | null;
  nextStopName?: string | null;
  cityName: string;
  initialAction?: RescueAction;
  snapshotHints?: SnapshotHints;
  todayStops?: Array<{ id: string; name: string; stopType: string | null; durationMinutes?: number | null; isVisited?: boolean | null; displayOrder?: number | null; latitude?: string | null; longitude?: string | null; }>;
  onSkipDone?: () => void;
  onProposalAccepted?: () => void;
  onAddStop?: (suggestion: SuggestionItem) => Promise<void> | void;
  onGetHelp?: () => void;
}

const ACTIONS: { id: RescueAction; emoji: string; label: string; sub: string }[] = [
  { id: "food",   emoji: "🍔", label: "Find food",           sub: "Kid-friendly spots nearby" },
  { id: "break",  emoji: "😴", label: "Take a break",        sub: "Low-effort rest options" },
  { id: "easier", emoji: "🔄", label: "Make the day easier",  sub: "Lighten today's plan" },
  { id: "fun",    emoji: "🎉", label: "Add something fun",    sub: "Quick fun nearby" },
  { id: "skip",   emoji: "⏭",  label: "Skip this stop",      sub: "Move to next stop" },
];

function getTypeColor(stopType: string) {
  const map: Record<string, string> = {
    museum: "bg-blue-50 border-blue-100",
    park: "bg-green-50 border-green-100",
    restaurant: "bg-orange-50 border-orange-100",
    food: "bg-orange-50 border-orange-100",
    cafe: "bg-amber-50 border-amber-100",
    playground: "bg-yellow-50 border-yellow-100",
  };
  return map[stopType] || "bg-gray-50 border-gray-100";
}

function StopTypeEmoji({ type }: { type: string }) {
  const map: Record<string, string> = {
    museum: "🏛️", park: "🌳", restaurant: "🍴", food: "🍔",
    cafe: "☕", playground: "🎠", aquarium: "🐠", zoo: "🦁",
    beach: "🏖️", landmark: "🗺️", dessert: "🍦", ice_cream: "🍦",
    bakery: "🥐", nature: "🌿", other: "📍",
  };
  return <span>{map[type] || "📍"}</span>;
}

export function RescuePanel({
  open,
  onClose,
  tripId,
  currentStopId,
  nextStopId,
  nextStopName,
  cityName,
  initialAction,
  snapshotHints,
  todayStops = [],
  onSkipDone,
  onProposalAccepted,
  onAddStop,
  onGetHelp,
}: RescuePanelProps) {
  const [activeAction, setActiveAction] = useState<RescueAction | null>(null);
  // directMode = opened via chip, skip the menu and show action content only
  const [directMode, setDirectMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [proposal, setProposal] = useState<LighterProposal | null>(null);
  const [proposalAccepting, setProposalAccepting] = useState(false);
  const [addingStop, setAddingStop] = useState<string | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [skipReasonStep, setSkipReasonStep] = useState<"reason" | "confirm">("reason");
  const [selectedSkipReason, setSelectedSkipReason] = useState<string | null>(null);
  const [apiError, setApiError] = useState(false);
  const { fireSignal } = useQualitySignal();
  const lastFetchRef = useRef<{ action: RescueAction; fn: () => Promise<void> } | null>(null);

  // Food search state
  const [foodSearchMode, setFoodSearchMode] = useState<"menu" | "search" | "results" | null>(null);
  const [foodQuery, setFoodQuery] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Break search state (mirrors food panel)
  const [breakSearchMode, setBreakSearchMode] = useState<"menu" | null>(null);
  const [breakQuery, setBreakQuery] = useState("");
  const [nearbyDenied, setNearbyDenied] = useState(false);
  const [easierAlreadyBalanced, setEasierAlreadyBalanced] = useState(false);

  const reset = () => {
    setActiveAction(null);
    setSuggestions([]);
    setProposal(null);
    setFoodSearchMode(null);
    setFoodQuery("");
    setBreakSearchMode(null);
    setBreakQuery("");
    setNearbyDenied(false);
    setDirectMode(false);
    setShowSkipConfirm(false);
    setSkipReasonStep("reason");
    setSelectedSkipReason(null);
    setApiError(false);
    setEasierAlreadyBalanced(false);
    lastFetchRef.current = null;
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Get current stop coordinates for route search
  const currentStop = todayStops.find(s => s.id === currentStopId);
  const nextStop = todayStops.find(s => s.id === nextStopId);

  const openNearbySearch = (action: "food" | "break") => {
    setLocationLoading(true);
    setNearbyDenied(false);
    if (!navigator.geolocation) {
      setLocationLoading(false);
      if (action === "food") setFoodSearchMode(null);
      else setBreakSearchMode(null);
      fetchAISuggestions(action, undefined, {});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationLoading(false);
        const { latitude, longitude } = pos.coords;
        if (action === "food") setFoodSearchMode(null);
        else setBreakSearchMode(null);
        await fetchAISuggestions(action, undefined, { userLat: latitude, userLng: longitude });
      },
      async () => {
        setLocationLoading(false);
        setNearbyDenied(true);
        if (action === "food") setFoodSearchMode(null);
        else setBreakSearchMode(null);
        await fetchAISuggestions(action, undefined, {});
      },
      { timeout: 15000, maximumAge: 60000 }
    );
  };

  const openRouteSearch = async (action: "food" | "break") => {
    const fromName = currentStop?.name || cityName;
    const toName = nextStop?.name || cityName;
    const routeContext = `${fromName} to ${toName} in ${cityName}`;
    if (action === "food") setFoodSearchMode(null);
    else setBreakSearchMode(null);
    await fetchAISuggestions(action, undefined, { routeContext });
  };

  const openCustomSearch = async (action: "food" | "break", query: string) => {
    if (!query.trim()) return;
    if (action === "food") setFoodSearchMode(null);
    else setBreakSearchMode(null);
    await fetchAISuggestions(action, query, {});
  };

  const fetchAISuggestions = async (
    action: RescueAction,
    customQuery?: string,
    opts?: { routeContext?: string; userLat?: number; userLng?: number }
  ) => {
    setLoading(true);
    setSuggestions([]);
    setApiError(false);
    lastFetchRef.current = {
      action,
      fn: () => fetchAISuggestions(action, customQuery, opts),
    };
    try {
      const stopTypeMap: Record<RescueAction, string[]> = {
        food:   ["restaurant", "food"],
        break:  ["cafe", "park_bench", "rest_stop"],
        fun:    ["playground", "park", "fun"],
        easier: [],
        skip:   [],
      };
      const stopNames = todayStops.map(s => s.name).filter(Boolean);
      const res = await fetch("/api/travel/stops/smart-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          destination: cityName,
          stopTypes: stopTypeMap[action],
          context: action,
          customQuery: customQuery || undefined,
          todayStopNames: stopNames.length > 0 ? stopNames : undefined,
          routeContext: opts?.routeContext || undefined,
          userLat: opts?.userLat || undefined,
          userLng: opts?.userLng || undefined,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      const items: SuggestionItem[] = [];
      if (data.nearby) items.push(...data.nearby);
      if (data.popular) items.push(...data.popular.slice(0, 2));
      if (data.buckets) {
        for (const bucket of data.buckets) {
          items.push(...(bucket.stops || []));
        }
      }

      const unique: SuggestionItem[] = [];
      const seen = new Set<string>();
      for (const item of items) {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          unique.push(item);
        }
      }
      setSuggestions(unique.slice(0, 4));
    } catch {
      setApiError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (action: RescueAction) => {
    setActiveAction(action);

    if (action === "skip") {
      if (!currentStopId) { toast.error("No current stop to skip"); return; }
      setActiveAction("skip");
      setShowSkipConfirm(true);
      return;
    }

    if (action === "easier") {
      const unvisited = todayStops.filter(s => !s.isVisited);
      if (unvisited.length <= 2) { setEasierAlreadyBalanced(true); return; }
      setLoading(true);
      setApiError(false);
      lastFetchRef.current = { action: "easier", fn: () => fetchSuggestions("easier") };
      try {
        const stopsPayload = unvisited.map(s => ({
          id: s.id, name: s.name, stopType: s.stopType,
          durationMinutes: s.durationMinutes ?? 60, displayOrder: s.displayOrder,
        }));
        const res = await fetch(`/api/travel/trips/${tripId}/lighter-day-proposal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ stops: stopsPayload, triggerContext: "lighter" }),
        });
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (data.alreadyBalanced) {
          setEasierAlreadyBalanced(true);
        } else {
          setProposal(data);
        }
      } catch {
        setApiError(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (action === "food") {
      setFoodSearchMode("menu");
      return;
    }

    if (action === "break") {
      setBreakSearchMode("menu");
      return;
    }

    // fun — fetch AI suggestions directly
    await fetchAISuggestions(action);
  };

  // Auto-trigger initialAction when panel opens
  // For food/break: don't use directMode — open their search menus naturally (same UX as tapping from action menu)
  // For other actions: use directMode to skip the action menu and go straight to results
  useEffect(() => {
    if (open && initialAction) {
      if (initialAction === "food" || initialAction === "break") {
        setDirectMode(false);
        fetchSuggestions(initialAction);
      } else {
        setDirectMode(true);
        fetchSuggestions(initialAction);
      }
    } else if (!open) {
      setDirectMode(false);
    }
  }, [open, initialAction]); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptProposal = async () => {
    if (!proposal) return;
    setProposalAccepting(true);
    try {
      for (const stop of proposal.stopsToRemove) {
        await fetch(`/api/travel/stops/${stop.id}`, { method: "DELETE", credentials: "include" });
      }
      toast.success(`Day lightened — removed ${proposal.stopsToRemove.length} stop${proposal.stopsToRemove.length !== 1 ? "s" : ""}`);
      handleClose();
      onProposalAccepted?.();
    } catch {
      toast.error("Couldn't apply changes — try again");
    } finally {
      setProposalAccepting(false);
    }
  };

  const handleAddStop = async (item: SuggestionItem, idx: number) => {
    if (!onAddStop) return;
    setAddingStop(`${idx}-${item.name}`);
    try {
      await onAddStop(item);
    } finally {
      setAddingStop(null);
    }
  };

  const doSkip = async () => {
    if (!currentStopId) return;
    setLoading(true);
    try {
      const deleteRes = await fetch(`/api/travel/stops/${currentStopId}`, { method: "DELETE", credentials: "include" });
      if (!deleteRes.ok) throw new Error("Delete failed");
      // Fire quality signal only after successful delete (atomic ordering)
      if (selectedSkipReason) {
        fireSignal(currentStopId, "skipped", { signalReason: selectedSkipReason });
      }
      toast.success("Stop skipped");
      handleClose();
      onSkipDone?.();
    } catch {
      toast.error("Couldn't skip stop — please try again");
    } finally {
      setLoading(false);
    }
  };

  const actionLabel: Record<RescueAction, string> = {
    food: "Food nearby",
    break: "Break spots",
    easier: "Lighter day",
    fun: "Fun nearby",
    skip: "Skip this stop",
  };

  if (!open) return null;

  const showResults = activeAction && !loading && suggestions.length > 0
    && (activeAction !== "food" || foodSearchMode === null)
    && (activeAction !== "break" || breakSearchMode === null);
  const showFoodPanel = activeAction === "food" && foodSearchMode === "menu";
  const showBreakPanel = activeAction === "break" && breakSearchMode === "menu";
  const showError = !loading && apiError && !showResults && activeAction && !showSkipConfirm;
  const currentStopObj = todayStops.find(s => s.id === currentStopId);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="rescue-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: 9998 }}
            onClick={handleClose}
          />
          <motion.div
            key="rescue-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 rounded-t-3xl bg-white max-h-[88vh] overflow-y-auto"
            style={{ zIndex: 9999 }}
            onClick={e => e.stopPropagation()}
            data-testid="rescue-panel"
          >
            <div className="px-5 pt-4 pb-8">
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  {/* In menu mode: show back only after an action is chosen */}
                  {!directMode && (showSkipConfirm || showFoodPanel || showBreakPanel || showResults || showError || (activeAction === "easier" && (loading || proposal || easierAlreadyBalanced))) && (
                    <button
                      onClick={reset}
                      className="flex items-center gap-1.5 text-sm text-orange-500 font-semibold mb-0.5"
                    >
                      ← Back
                    </button>
                  )}
                  {/* In direct mode: show Back to return to the Today screen (closes panel) */}
                  {directMode && (
                    <button
                      onClick={handleClose}
                      className="flex items-center gap-1.5 text-sm text-orange-500 font-semibold mb-0.5"
                    >
                      ← Back
                    </button>
                  )}
                  <h3 className="text-base font-bold text-gray-900">
                    {directMode && activeAction
                      ? ACTIONS.find(a => a.id === activeAction)?.label ?? "What do you need right now?"
                      : "What do you need right now?"}
                  </h3>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  data-testid="button-rescue-close"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Skip confirmation — shown when user chose "Skip this stop" */}
              {showSkipConfirm && skipReasonStep === "reason" && (
                <div className="space-y-3" data-testid="skip-reason-panel">
                  <div className="text-2xl">⏭</div>
                  <p className="text-base font-bold text-gray-900">
                    Why skip {currentStopObj?.name ?? "this stop"}?
                  </p>
                  <p className="text-xs text-gray-400">Takes 2 seconds — helps us tune your trip</p>
                  {[
                    { value: "too_tired", label: "Too tired" },
                    { value: "too_crowded", label: "Too crowded" },
                    { value: "running_late", label: "Running late" },
                    { value: "not_worth_it", label: "Not worth it" },
                    { value: "kids_not_interested", label: "Kids not interested" },
                    { value: "weather_changed", label: "Weather changed" },
                    { value: "already_seen_enough_nearby", label: "Already seen enough nearby" },
                    { value: "other", label: "Other" },
                  ].map(r => (
                    <button
                      key={r.value}
                      onClick={() => setSelectedSkipReason(r.value)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all text-left text-sm font-semibold"
                      style={
                        selectedSkipReason === r.value
                          ? { background: "#FFF4E5", borderColor: "#E67E22", color: "#92400E" }
                          : { background: "#ffffff", borderColor: "#EBEBEB", color: "#374151" }
                      }
                      data-testid={`button-skip-reason-${r.value}`}
                    >
                      {r.label}
                      {selectedSkipReason === r.value && <span className="text-amber-500">✓</span>}
                    </button>
                  ))}
                  <button
                    onClick={() => selectedSkipReason && setSkipReasonStep("confirm")}
                    disabled={!selectedSkipReason}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
                    style={{ background: "#DC2626" }}
                    data-testid="button-skip-reason-next"
                  >
                    Continue
                  </button>
                  <button
                    onClick={reset}
                    className="w-full flex items-center justify-center py-3 rounded-2xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                    data-testid="button-cancel-skip"
                  >
                    Never mind
                  </button>
                </div>
              )}

              {showSkipConfirm && skipReasonStep === "confirm" && (
                <div className="space-y-4" data-testid="skip-confirm-panel">
                  <div
                    className="rounded-2xl px-4 py-4"
                    style={{ background: "#FFF0F0", border: "1px solid #FECACA" }}
                  >
                    <div className="text-2xl mb-2">⏭</div>
                    <p className="text-base font-bold text-gray-900 mb-1">
                      Skip {currentStopObj?.name ?? "this stop"}?
                    </p>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      It'll be removed from today's itinerary and you'll move on to the next stop. This can't be undone.
                    </p>
                  </div>
                  <button
                    onClick={doSkip}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
                    style={{ background: "#DC2626" }}
                    data-testid="button-confirm-skip"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Yes, skip this stop
                  </button>
                  <button
                    onClick={() => setSkipReasonStep("reason")}
                    className="w-full flex items-center justify-center py-3 rounded-2xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                    data-testid="button-back-skip"
                  >
                    Back
                  </button>
                </div>
              )}

              {/* Action menu — only shown when NOT in direct mode and not in skip confirm */}
              {!directMode && !showSkipConfirm && (
                <div className="space-y-2 mb-4">
                  {ACTIONS.map(action => {
                    const isActive = activeAction === action.id;
                    return (
                      <button
                        key={action.id}
                        onClick={() => { if (!loading) fetchSuggestions(action.id); }}
                        disabled={loading && activeAction !== action.id}
                        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all active:scale-[0.98] text-left"
                        style={
                          isActive
                            ? { background: "#FFF4E5", borderColor: "#E67E22" }
                            : { background: "#ffffff", borderColor: "#EBEBEB" }
                        }
                        data-testid={`button-rescue-${action.id}`}
                      >
                        <span className="text-xl shrink-0">{action.emoji}</span>
                        <span className="flex-1 text-sm font-semibold text-gray-900">{action.label}</span>
                        {loading && isActive ? (
                          <Loader2 className="w-4 h-4 animate-spin text-orange-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  {/* SOS row — always last, separated by subtle margin */}
                  <div style={{ marginTop: 10 }}>
                    <button
                      onClick={() => { onClose(); onGetHelp?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all active:scale-[0.98] text-left"
                      style={{ background: "#ffffff", borderColor: "#EBEBEB" }}
                      data-testid="button-rescue-get-help"
                    >
                      <span className="text-xl shrink-0">🆘</span>
                      <span className="flex-1 text-sm font-semibold text-gray-900">Get help now</span>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* FOOD PANEL — 3 search modes */}
              <AnimatePresence mode="wait">
                {showFoodPanel && foodSearchMode === "menu" && (
                  <motion.div
                    key="food-menu"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                        Find food in {cityName}
                      </p>

                      {/* Snapshot food hint — shown when planner has a suggestion ready */}
                      {snapshotHints?.food && (
                        <div
                          className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-3"
                          style={{ background: "#FFF8ED", border: "1px solid #F5E0B5" }}
                          data-testid="snapshot-hint-food"
                        >
                          <span className="text-base shrink-0">💡</span>
                          <p className="text-sm leading-snug" style={{ color: "#7A5010" }}>
                            {snapshotHints.food}
                          </p>
                        </div>
                      )}

                      {/* Search bar */}
                      <div className="flex gap-2 mb-3">
                        <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5">
                          <Search className="w-4 h-4 text-gray-400 shrink-0" />
                          <input
                            ref={inputRef}
                            value={foodQuery}
                            onChange={e => setFoodQuery(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && foodQuery.trim() && openCustomSearch("food", foodQuery)}
                            placeholder="Search e.g. pizza, sushi, tacos…"
                            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                            data-testid="input-food-search"
                          />
                        </div>
                        <button
                          onClick={() => foodQuery.trim() && openCustomSearch("food", foodQuery)}
                          disabled={!foodQuery.trim() || loading}
                          className="px-4 py-2.5 rounded-2xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
                          style={{ background: "#E67E22" }}
                          data-testid="button-food-search-go"
                        >
                          Go
                        </button>
                      </div>

                      {/* Mode buttons */}
                      <div className="space-y-2 mb-4">
                        <button
                          onClick={() => openNearbySearch("food")}
                          disabled={locationLoading}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-left active:scale-[0.98]"
                          data-testid="button-food-near-me"
                        >
                          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            {locationLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            ) : (
                              <MapPin className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Search nearby</p>
                            <p className="text-xs text-gray-400">
                              {nearbyDenied ? "Using city-based suggestions (location denied)" : "Kid-friendly spots around you"}
                            </p>
                          </div>
                          <Navigation className="w-4 h-4 text-gray-300 ml-auto" />
                        </button>

                        <button
                          onClick={() => openRouteSearch("food")}
                          disabled={loading}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-left active:scale-[0.98]"
                          data-testid="button-food-along-route"
                        >
                          <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                            <Route className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {nextStopName ? `On the way to ${nextStopName}` : "Along our route"}
                            </p>
                            <p className="text-xs text-gray-400">Food stops on your drive to next</p>
                          </div>
                          <Navigation className="w-4 h-4 text-gray-300 ml-auto" />
                        </button>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* BREAK PANEL — search menu */}
              <AnimatePresence mode="wait">
                {showBreakPanel && (
                  <motion.div
                    key="break-menu"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                        Find a break spot in {cityName}
                      </p>

                      {/* Snapshot break hint — shown when planner has a suggestion ready */}
                      {snapshotHints?.break && (
                        <div
                          className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-3"
                          style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
                          data-testid="snapshot-hint-break"
                        >
                          <span className="text-base shrink-0">💡</span>
                          <p className="text-sm leading-snug text-blue-800">
                            {snapshotHints.break}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 mb-3">
                        <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5">
                          <Search className="w-4 h-4 text-gray-400 shrink-0" />
                          <input
                            value={breakQuery}
                            onChange={e => setBreakQuery(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && breakQuery.trim() && openCustomSearch("break", breakQuery)}
                            placeholder="e.g. café, park, playground…"
                            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                            data-testid="input-break-search"
                          />
                        </div>
                        <button
                          onClick={() => breakQuery.trim() && openCustomSearch("break", breakQuery)}
                          disabled={!breakQuery.trim() || loading}
                          className="px-4 py-2.5 rounded-2xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
                          style={{ background: "#E67E22" }}
                          data-testid="button-break-search-go"
                        >
                          Go
                        </button>
                      </div>

                      <div className="space-y-2 mb-2">
                        <button
                          onClick={() => openNearbySearch("break")}
                          disabled={locationLoading}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-left active:scale-[0.98]"
                          data-testid="button-break-near-me"
                        >
                          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            {locationLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            ) : (
                              <MapPin className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Search nearby</p>
                            <p className="text-xs text-gray-400">
                              {nearbyDenied ? "Using city-based suggestions (location denied)" : "Break spots close to you"}
                            </p>
                          </div>
                          <Navigation className="w-4 h-4 text-gray-300 ml-auto" />
                        </button>

                        <button
                          onClick={() => openRouteSearch("break")}
                          disabled={loading}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-left active:scale-[0.98]"
                          data-testid="button-break-along-route"
                        >
                          <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                            <Route className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {nextStopName ? `On the way to ${nextStopName}` : "Along our route"}
                            </p>
                            <p className="text-xs text-gray-400">Break spots on your drive to next</p>
                          </div>
                          <Navigation className="w-4 h-4 text-gray-300 ml-auto" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ALL results (food, break, fun) */}
              <AnimatePresence mode="wait">
                {showResults && (
                  <motion.div
                    key={activeAction}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                        {actionLabel[activeAction!]}
                      </p>
                      <SuggestionList
                        suggestions={suggestions}
                        onAddStop={onAddStop ? (item, idx) => handleAddStop(item, idx) : undefined}
                        addingStop={addingStop}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* INLINE ERROR STATE */}
              <AnimatePresence mode="wait">
                {showError && (
                  <motion.div
                    key="rescue-error"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="pt-2 border-t border-gray-100">
                      <div className="rounded-2xl px-4 py-5 text-center mb-3" style={{ background: "#FFF4F4", border: "1px solid #FECACA" }}>
                        <p className="text-2xl mb-2">😕</p>
                        <p className="text-sm font-bold text-gray-800 mb-1">Couldn't load suggestions</p>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {activeAction === "food"
                            ? "We had trouble finding food spots. Check your connection and try again."
                            : activeAction === "break"
                            ? "We had trouble finding break spots. Check your connection and try again."
                            : activeAction === "easier"
                            ? "We had trouble analyzing your day. Check your connection and try again."
                            : "We had trouble finding suggestions. Check your connection and try again."}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setApiError(false);
                          if (activeAction === "food") {
                            setFoodSearchMode("menu");
                          } else if (activeAction === "break") {
                            setBreakSearchMode("menu");
                          } else if (lastFetchRef.current) {
                            lastFetchRef.current.fn();
                          }
                        }}
                        className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-colors mb-2"
                        style={{ background: "#E67E22" }}
                        data-testid="button-rescue-retry"
                      >
                        Try again
                      </button>
                      <button
                        onClick={reset}
                        className="w-full py-2.5 rounded-2xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                        data-testid="button-rescue-back-from-error"
                      >
                        Back to options
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* LIGHTER DAY — already balanced message */}
              {activeAction === "easier" && easierAlreadyBalanced && (
                <div
                  className="rounded-2xl px-4 py-5 mt-2 text-center"
                  style={{ background: "#F0FFF4", border: "1px solid #BBF7D0" }}
                  data-testid="rescue-already-balanced"
                >
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-base font-bold text-green-800 mb-1">Your day looks great!</p>
                  <p className="text-sm text-green-700 leading-relaxed">
                    You only have a couple of stops left — no need to cut anything. Enjoy the rest of the day!
                  </p>
                </div>
              )}

              {/* LIGHTER DAY proposal */}
              <AnimatePresence mode="wait">
                {activeAction === "easier" && !loading && proposal && (
                  <motion.div
                    key="proposal"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="pt-2 border-t border-gray-100 space-y-3" data-testid="rescue-proposal">
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                        <p className="text-sm font-semibold text-amber-900 mb-2">{proposal.explanation}</p>
                        {proposal.oldTotalMinutes > 0 && proposal.newTotalMinutes > 0 && (
                          <p className="text-xs text-amber-700">
                            {Math.round(proposal.oldTotalMinutes / 60)}h → {Math.round(proposal.newTotalMinutes / 60)}h
                          </p>
                        )}
                      </div>

                      {proposal.stopsToRemove.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Stops to remove</p>
                          <div className="space-y-1.5">
                            {proposal.stopsToRemove.map((s, i) => (
                              <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                                <span className="text-sm shrink-0">✕</span>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                                  {s.reason && <p className="text-xs text-gray-500 mt-0.5">{s.reason}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {proposal.stopsToKeep.some(k => k.anchorReason) && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Keeping the essentials</p>
                          <div className="space-y-1.5">
                            {proposal.stopsToKeep.filter(k => k.anchorReason).map((s, i) => (
                              <div key={i} className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl p-3">
                                <span className="text-sm shrink-0">✓</span>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                                  {s.anchorReason && <p className="text-xs text-gray-500 mt-0.5">{s.anchorReason}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={acceptProposal}
                        disabled={proposalAccepting}
                        className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{ background: "#E67E22" }}
                        data-testid="button-rescue-accept-proposal"
                      >
                        {proposalAccepting ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</>
                        ) : "Accept changes"}
                      </button>
                      <button
                        onClick={reset}
                        className="w-full py-2.5 rounded-2xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                        data-testid="button-rescue-cancel-proposal"
                      >
                        Keep original
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function SuggestionList({
  suggestions,
  onAddStop,
  addingStop,
}: {
  suggestions: SuggestionItem[];
  onAddStop?: (item: SuggestionItem, idx: number) => void;
  addingStop: string | null;
}) {
  return (
    <div className="space-y-2.5">
      {suggestions.map((item, i) => {
        const key = `${i}-${item.name}`;
        const isAdding = addingStop === key;
        const isRecommended = i === 0;
        return (
          <div
            key={i}
            className={`rounded-2xl border p-3.5 ${getTypeColor(item.stopType)}`}
            data-testid={`rescue-suggestion-${i}`}
          >
            {isRecommended && (
              <div className="flex items-center gap-1 mb-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#FFF0D6", color: "#D4872B" }}
                >
                  ⭐ Recommended
                </span>
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <StopTypeEmoji type={item.stopType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {item.duration && (
                      <span className="text-xs text-gray-500">Visit: {item.duration}</span>
                    )}
                    {item.closestStopName && (
                      <span className="text-xs text-blue-500 font-medium">· Near {item.closestStopName}</span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-1 leading-snug">{item.description}</p>
                  )}
                </div>
              </div>
              {onAddStop && (
                <button
                  onClick={() => onAddStop(item, i)}
                  disabled={isAdding}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white transition-opacity disabled:opacity-60"
                  style={{ background: "#E67E22" }}
                  data-testid={`button-rescue-add-${i}`}
                >
                  {isAdding ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Add to day
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
