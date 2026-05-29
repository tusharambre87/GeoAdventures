import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTravel } from "@/lib/travelContext";
import { useAdventureShell } from "./AdventureShell";
import { navPush, navReplace } from "@/lib/nav";
import { MapPin, Navigation, ChevronRight, ArrowLeft, Map, Ticket, Camera, BookOpen, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ReliefResultCard } from "./ReliefResultCard";
import type { NeedRec } from "./ReliefResultCard";

const STOP_TYPE_CONFIG: Record<string, { emoji: string; gradient: string }> = {
  park:       { emoji: "🌳", gradient: "from-green-400 to-emerald-500" },
  museum:     { emoji: "🏛️", gradient: "from-amber-400 to-orange-500" },
  landmark:   { emoji: "🏛️", gradient: "from-blue-400 to-indigo-500" },
  beach:      { emoji: "🏖️", gradient: "from-cyan-400 to-blue-400" },
  nature:     { emoji: "🌿", gradient: "from-green-500 to-teal-500" },
  zoo:        { emoji: "🦁", gradient: "from-yellow-400 to-orange-400" },
  aquarium:   { emoji: "🐠", gradient: "from-blue-400 to-cyan-500" },
  restaurant: { emoji: "🍽️", gradient: "from-red-400 to-orange-400" },
  viewpoint:  { emoji: "👀", gradient: "from-purple-400 to-pink-400" },
  activity:   { emoji: "🎯", gradient: "from-orange-400 to-red-400" },
  market:     { emoji: "🏪", gradient: "from-amber-500 to-yellow-400" },
  garden:     { emoji: "🌸", gradient: "from-pink-400 to-rose-400" },
  palace:     { emoji: "🏯", gradient: "from-slate-400 to-gray-500" },
  bridge:     { emoji: "🌉", gradient: "from-gray-400 to-slate-500" },
};

function getStopCfg(type?: string | null) {
  return STOP_TYPE_CONFIG[type || ""] || { emoji: "📍", gradient: "from-orange-400 to-amber-400" };
}

type LocationMode = "near_me" | "near_next_stop" | "along_route";
type IntentChipId = "break" | "food";

const INTENT_CHIPS: { id: IntentChipId; emoji: string; label: string }[] = [
  { id: "break", emoji: "🌿", label: "We need a break" },
  { id: "food", emoji: "🍔", label: "Feed us now" },
];

type BottomTab = "plan" | "stop" | "passes" | "memories";

export default function AdventureParentExplore() {
  const { tripId } = useAdventureShell();
  const { currentTrip, currentTripStops, fetchTrip } = useTravel();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<BottomTab>("stop");
  const [stopExploreData, setStopExploreData] = useState<any>(null);
  const [stopExploreLoading, setStopExploreLoading] = useState(false);

  const [selectedIntent, setSelectedIntent] = useState<IntentChipId | null>(null);
  const [needRecState, setNeedRecState] = useState<{
    loading: boolean; suggestions: NeedRec[];
  }>({ loading: false, suggestions: [] });
  const [selectedBackupIdx, setSelectedBackupIdx] = useState<number | null>(null);
  const [locationSheet, setLocationSheet] = useState<{
    open: boolean; mode: LocationMode; gpsAvailable: boolean | null; lat: number | null; lng: number | null;
  }>({ open: false, mode: "near_next_stop", gpsAvailable: null, lat: null, lng: null });
  const [detourBanner, setDetourBanner] = useState<{ stopName: string } | null>(null);
  const [addSuccessBanner, setAddSuccessBanner] = useState<{ stopName: string; stopId?: string } | null>(null);

  useEffect(() => {
    if (tripId) fetchTrip(tripId);
  }, [tripId]);

  const currentStop = currentTripStops.find(s => !s.isVisited) || currentTripStops[0];
  const cfg = getStopCfg(currentStop?.stopType);

  useEffect(() => {
    if (!currentStop) return;
    setStopExploreLoading(true);
    fetch(`/api/travel/stops/${currentStop.id}/explore`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setStopExploreData(d))
      .catch(() => setStopExploreData(null))
      .finally(() => setStopExploreLoading(false));
  }, [currentStop?.id]);

  const handleDirections = () => {
    if (currentStop?.address) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(currentStop.address)}`, "_blank");
    } else if (currentTrip?.destination) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent((currentStop?.name || "") + " " + currentTrip.destination)}`, "_blank");
    }
  };

  const openLocationSheet = (intentId: IntentChipId) => {
    setSelectedIntent(intentId);
    setNeedRecState({ loading: false, suggestions: [] });
    setSelectedBackupIdx(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationSheet({ open: true, mode: "near_me", gpsAvailable: true, lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setLocationSheet({ open: true, mode: "near_next_stop", gpsAvailable: false, lat: null, lng: null });
        },
        { timeout: 3000 }
      );
    } else {
      setLocationSheet({ open: true, mode: "near_next_stop", gpsAvailable: false, lat: null, lng: null });
    }
  };

  const fetchNeedRecs = async (mode: LocationMode, lat: number | null, lng: number | null) => {
    if (!selectedIntent || !currentTrip) return;
    setNeedRecState({ loading: true, suggestions: [] });
    try {
      const res = await fetch("/api/travel/need-recs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          destination: currentTrip.destination || "",
          nearStopName: currentStop?.name || "",
          needType: selectedIntent,
          locationMode: mode,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
        }),
      });
      const data = await res.json();
      setNeedRecState({ loading: false, suggestions: data.suggestions || [] });
    } catch {
      setNeedRecState({ loading: false, suggestions: [] });
    }
  };

  const addRecStop = async (rec: NeedRec) => {
    if (!tripId) return;
    const firstUnvisited = currentTripStops.find(s => !s.isVisited);
    const insertDisplayOrder = firstUnvisited
      ? (firstUnvisited.displayOrder ?? 0) - 0.5
      : currentTripStops.length;
    try {
      const res = await fetch(`/api/travel/trips/${tripId}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: rec.name,
          stopType: rec.type || "other",
          insertAtOrder: Math.round(insertDisplayOrder),
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).message || "Failed"); }
      const stop = await res.json();
      setAddSuccessBanner({ stopName: stop.name, stopId: stop.id });
      await fetchTrip(tripId);
    } catch (err: any) {
      toast.error(err?.message && err.message !== "Failed" ? err.message : "Couldn't add stop — please try again.");
    }
  };

  const undoAddedStop = async (stopId: string) => {
    if (!tripId || !stopId) return;
    try {
      await fetch(`/api/travel/trips/${tripId}/stops/${stopId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setAddSuccessBanner(null);
      await fetchTrip(tripId);
    } catch {
      toast.error("Couldn't undo — please try again.");
    }
  };

  if (!currentTrip) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F6F7F9]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  const NAV_TABS = [
    { id: "plan" as BottomTab, icon: Map, label: "Plan View" },
    { id: "stop" as BottomTab, icon: BookOpen, label: "Stop View" },
    { id: "passes" as BottomTab, icon: Ticket, label: "Passes" },
    { id: "memories" as BottomTab, icon: Camera, label: "Memories" },
  ];

  const handleTabChange = (tab: BottomTab) => {
    if (tab === "plan") {
      navPush(setLocation, `/adventure/${tripId}/parent-plan`);
      return;
    }
    if (tab === "passes") {
      navPush(setLocation, `/adventure/${tripId}/parent-plan?tab=wallet`);
      return;
    }
    if (tab === "memories") {
      navPush(setLocation, `/adventure/${tripId}/kid`);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col" data-testid="parent-explore-page">
      {/* Detour banner */}
      <AnimatePresence>
        {detourBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-50 max-w-lg mx-auto"
          >
            <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between shadow-md" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
              <div>
                <p className="text-xs font-bold leading-tight">Heading to {detourBanner.stopName}</p>
                <p className="text-[11px] opacity-80 mt-0.5">We'll help you continue your day after</p>
              </div>
              <button onClick={() => setDetourBanner(null)} className="text-white opacity-70 hover:opacity-100 ml-3 shrink-0 text-xs font-bold" data-testid="button-explore-dismiss-detour">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add-success banner */}
      <AnimatePresence>
        {addSuccessBanner && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-20 left-0 right-0 z-40 max-w-lg mx-auto px-4"
          >
            <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl">
              <p className="text-xs font-bold leading-tight">✓ {addSuccessBanner.stopName} added to today</p>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <button
                  onClick={() => {
                    setAddSuccessBanner(null);
                    navPush(setLocation, `/adventure/${tripId}/parent-plan?tab=todays_plan`);
                  }}
                  className="text-orange-400 text-[11px] font-bold hover:text-orange-300"
                  data-testid="button-explore-success-run-day"
                >
                  Run updated day
                </button>
                {addSuccessBanner.stopId && (
                  <>
                    <span className="text-gray-600">·</span>
                    <button
                      onClick={() => undoAddedStop(addSuccessBanner.stopId!)}
                      className="text-gray-400 text-[11px] font-bold hover:text-gray-200"
                      data-testid="button-explore-success-undo"
                    >
                      Undo
                    </button>
                  </>
                )}
                <button onClick={() => setAddSuccessBanner(null)} className="text-gray-500 text-xs ml-1 hover:text-gray-300" data-testid="button-explore-success-dismiss">✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-safe">
        <div className="flex items-center gap-3 py-3">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navPush(setLocation, `/adventure/${tripId}/parent-plan`)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-600"
            data-testid="button-back-parent-hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium">Parent Hub</p>
            <h1 className="text-base font-bold text-gray-900 truncate">
              {currentStop?.name || currentTrip.destination}
            </h1>
          </div>
          <div className="flex items-center bg-gray-100 rounded-full p-0.5 shrink-0">
            <button
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm"
              data-testid="toggle-parent-mode"
            >
              👨‍👩‍👧 Parent
            </button>
            <button
              onClick={() => navReplace(setLocation, `/adventure/${tripId}/kid/next`)}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-gray-500 hover:text-purple-600 transition-colors"
              data-testid="toggle-kid-mode"
            >
              🧒 Kid
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Stop Hero Card */}
        <div className="mx-4 mt-4">
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="flex items-stretch">
              <div className={`w-24 shrink-0 bg-gradient-to-br ${cfg.gradient} flex flex-col items-center justify-center gap-1.5 py-4`}>
                <span className="text-4xl">{cfg.emoji}</span>
                <span className="text-xs font-bold text-white/80 capitalize">{currentStop?.stopType || "stop"}</span>
              </div>
              <div className="flex-1 p-4">
                <h2 className="font-bold text-gray-900 text-base leading-tight mb-1">
                  {currentStop?.name || currentTrip.destination}
                </h2>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <span>⏱</span> 45–90 min
                  </span>
                  {currentStop?.address && (
                    <span className="flex items-center gap-1 truncate max-w-[120px]">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{currentStop.address}</span>
                    </span>
                  )}
                </div>
                <button
                  onClick={handleDirections}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                  data-testid="button-start-directions"
                >
                  <Navigation className="w-4 h-4" />
                  Start Directions
                </button>
              </div>
            </div>
            {currentStop && (
              <div className="px-4 pb-3 border-t border-gray-50">
                <button
                  onClick={() => setActiveTab("stop")}
                  className="text-xs text-orange-500 font-semibold flex items-center gap-0.5 mt-2"
                  data-testid="button-view-stop-details"
                >
                  View stop details <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stop View content — explore data */}
        {activeTab === "stop" && (
          <div className="mx-4 mt-4">
            {stopExploreLoading ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-400" />
              </div>
            ) : stopExploreData ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {stopExploreData.aboutArea && (
                  <div className="p-4 border-b border-gray-50">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">About this stop</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{stopExploreData.aboutArea}</p>
                  </div>
                )}
                {stopExploreData.funFacts?.length > 0 && (
                  <div className="p-4 border-b border-gray-50">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fun facts</h3>
                    <ul className="space-y-1.5">
                      {stopExploreData.funFacts.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-orange-400 mt-0.5">•</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {stopExploreData.parentTips?.length > 0 && (
                  <div className="p-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Parent tips</h3>
                    <ul className="space-y-1.5">
                      {stopExploreData.parentTips.map((t: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-blue-400 mt-0.5">💡</span>{t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!stopExploreData.aboutArea && !stopExploreData.funFacts?.length && !stopExploreData.parentTips?.length && (
                  <div className="p-6 text-center">
                    <p className="text-sm text-gray-400">No extra details available for this stop yet.</p>
                  </div>
                )}
              </div>
            ) : currentStop?.description ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">About this stop</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{currentStop.description}</p>
              </div>
            ) : null}
          </div>
        )}

        {/* What do you need right now? — relief engine */}
        <div className="mx-4 mt-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">What do you need right now?</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {INTENT_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => {
                  if (selectedIntent === chip.id) {
                    setSelectedIntent(null);
                    setNeedRecState({ loading: false, suggestions: [] });
                  } else {
                    openLocationSheet(chip.id);
                  }
                }}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                  selectedIntent === chip.id
                    ? "border-orange-400 bg-orange-50 shadow-sm"
                    : "border-gray-100 bg-white shadow-sm hover:border-orange-200"
                }`}
                data-testid={`intent-chip-${chip.id}`}
              >
                <span className="text-2xl">{chip.emoji}</span>
                <span className={`text-xs font-bold leading-tight ${selectedIntent === chip.id ? "text-orange-700" : "text-gray-700"}`}>
                  {chip.label}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selectedIntent && (
              <motion.div
                key={selectedIntent}
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 overflow-hidden"
              >
                {needRecState.loading ? (
                  <div className="flex flex-col items-center gap-2 py-6 bg-white rounded-2xl border border-gray-100">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                    <span className="text-xs text-gray-400 font-medium">Finding the best move right now…</span>
                  </div>
                ) : needRecState.suggestions.length > 0 ? (() => {
                  const [best, ...backups] = needRecState.suggestions;
                  const textColor = selectedIntent === "break" ? "text-green-700" : "text-orange-700";
                  const bestLabel = selectedIntent === "break" ? "Best quick break near you" : "Best food stop near you";
                  return (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{bestLabel}</p>
                      <ReliefResultCard
                        rec={best}
                        needType={selectedIntent}
                        testIdSuffix="best"
                        onGoNow={() => {
                          const url = best.goNowMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(best.name + " " + (currentTrip?.destination || ""))}`;
                          window.open(url, "_blank");
                          setDetourBanner({ stopName: best.name });
                        }}
                        onAddToday={() => addRecStop(best)}
                      />
                      {backups.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Other options</p>
                          <div className="space-y-2">
                            {backups.map((rec, i) => {
                              const isExpanded = selectedBackupIdx === i;
                              return (
                                <div key={i} data-testid={`explore-rec-backup-${i}`}>
                                  {isExpanded ? (
                                    <ReliefResultCard
                                      rec={rec}
                                      needType={selectedIntent}
                                      testIdSuffix={`backup-${i}`}
                                      onGoNow={() => {
                                        const url = rec.goNowMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(rec.name + " " + (currentTrip?.destination || ""))}`;
                                        window.open(url, "_blank");
                                        setDetourBanner({ stopName: rec.name });
                                      }}
                                      onAddToday={() => { addRecStop(rec); setSelectedBackupIdx(null); }}
                                      onCollapse={() => setSelectedBackupIdx(null)}
                                    />
                                  ) : (
                                    <button
                                      className="w-full flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 hover:bg-gray-100 transition-colors text-left"
                                      onClick={() => setSelectedBackupIdx(i)}
                                      data-testid={`button-explore-backup-expand-${i}`}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 text-xs leading-tight truncate">{rec.name}</p>
                                        <p className="text-[10px] text-gray-400">
                                          {rec.travelTimeMinutes != null ? `${rec.travelTimeMinutes} min away` : rec.walkTime || ""}
                                        </p>
                                      </div>
                                      <span className={`shrink-0 text-[10px] ${textColor} font-bold`}>See more →</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                    <p className="text-sm text-orange-800 font-medium leading-relaxed">
                      {selectedIntent === "break"
                        ? "Look for a nearby café or bench where everyone can relax for 10–15 minutes."
                        : "Try checking if there's a café or restaurant near this stop."}
                    </p>
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=${selectedIntent === "break" ? "park+OR+cafe" : "restaurant+kid+friendly"}+near+${encodeURIComponent(currentStop?.name || currentTrip.destination)}`, "_blank")}
                      className="text-[11px] text-orange-600 font-bold mt-2"
                    >
                      Search in Maps →
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nearby suggestions */}
        <div className="mx-4 mt-5 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Nearby suggestions</h3>
          <div className="space-y-2">
            {[
              { icon: "🌳", label: `Find nearby park` },
              { icon: "☕", label: `Find nearby café` },
              { icon: "⏱", label: `Shorten this stop` },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  const q = `${s.label.replace("Find nearby ", "")} near ${currentStop?.name || currentTrip.destination}`;
                  window.open(`https://maps.google.com/?q=${encodeURIComponent(q)}`, "_blank");
                }}
                className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-orange-200 hover:bg-orange-50 transition-colors shadow-sm text-left"
                data-testid={`suggestion-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="text-lg">{s.icon}</span>
                {s.label}
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Location mode selection sheet */}
      <AnimatePresence>
        {locationSheet.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center max-w-lg mx-auto"
            onClick={() => setLocationSheet(s => ({ ...s, open: false }))}
          >
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ duration: 0.25 }}
              className="relative w-full bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8"
              onClick={e => e.stopPropagation()}
              data-testid="explore-location-mode-sheet"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <p className="text-sm font-bold text-gray-900 mb-1">Where should we look?</p>
              <p className="text-xs text-gray-500 mb-4">Choose a search area for suggestions</p>

              {!locationSheet.gpsAvailable && (
                <div className="mb-3 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <span className="text-amber-500 text-sm">📍</span>
                  <p className="text-[11px] text-amber-700">Suggestions based on your next stop.{" "}
                    <button
                      className="font-bold underline"
                      onClick={() => {
                        navigator.geolocation?.getCurrentPosition(
                          (pos) => setLocationSheet(s => ({ ...s, gpsAvailable: true, mode: "near_me", lat: pos.coords.latitude, lng: pos.coords.longitude })),
                          () => {}
                        );
                      }}
                      data-testid="button-explore-use-my-location"
                    >
                      Use my location
                    </button>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {([
                  { id: "near_me" as const, label: "Near me", sub: "Use your current GPS location", emoji: "📍", disabled: locationSheet.gpsAvailable === false },
                  { id: "near_next_stop" as const, label: "Near next stop", sub: "Based on your next planned stop", emoji: "🗺️", disabled: false },
                  { id: "along_route" as const, label: "Along today's route", sub: "Find options anywhere on your route today", emoji: "🛣️", disabled: false },
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => !opt.disabled && setLocationSheet(s => ({ ...s, mode: opt.id }))}
                    className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                      locationSheet.mode === opt.id
                        ? "border-orange-400 bg-orange-50"
                        : opt.disabled
                        ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                        : "border-gray-100 bg-white hover:border-orange-200"
                    }`}
                    data-testid={`explore-location-mode-${opt.id}`}
                    disabled={opt.disabled}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${locationSheet.mode === opt.id ? "text-orange-700" : opt.disabled ? "text-gray-400" : "text-gray-800"}`}>{opt.label}</p>
                      <p className="text-[11px] text-gray-400">{opt.sub}</p>
                    </div>
                    {locationSheet.mode === opt.id && <span className="text-orange-500 text-sm font-bold shrink-0">✓</span>}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setLocationSheet(s => ({ ...s, open: false }));
                  fetchNeedRecs(locationSheet.mode, locationSheet.lat, locationSheet.lng);
                }}
                className="w-full mt-4 py-3.5 bg-orange-500 text-white font-bold text-sm rounded-2xl hover:bg-orange-600 transition-colors"
                data-testid="button-explore-location-confirm"
              >
                Find suggestions →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav tray */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 px-2 pb-safe z-20">
        <div className="flex items-center pt-1">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && tab.id !== "plan" && tab.id !== "passes" && tab.id !== "memories";
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-4 transition-colors ${
                  isActive ? "text-orange-500" : "text-gray-400 hover:text-gray-600"
                }`}
                data-testid={`bottom-tab-${tab.id}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-orange-500" : ""}`} />
                <span className={`text-[10px] font-semibold ${isActive ? "text-orange-500" : ""}`}>{tab.label}</span>
                {isActive && <div className="absolute bottom-0 h-0.5 w-8 bg-orange-500 rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
