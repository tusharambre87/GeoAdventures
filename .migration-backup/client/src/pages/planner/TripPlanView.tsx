import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Star, Ticket, Plus, X, AlertTriangle, Wand2 } from "lucide-react";
import { usePlanner } from "@/lib/plannerContext";
import type { PlannerTripPlanStop } from "@shared/schema";
import type { IntelligenceMap } from "@/lib/plannerContext";
import StopCard from "@/components/planner/StopCard";
import DayChip from "@/components/planner/DayChip";
import EmptyState from "@/components/planner/EmptyState";
import StopDetailsDrawer from "./StopDetailsDrawer";
import ReplaceSheet from "./ReplaceSheet";
import ParentStopView from "./ParentStopView";
import { toast } from "sonner";

// ─── DayHealthBar ────────────────────────────────────────────────────────────

const ROLE_ICON: Record<string, string> = {
  Anchor: "⚓", Support: "🛡️", Treat: "🎉", Meal: "🍽️",
  Reset: "🌿", "Quick win": "⚡", "Wind-down": "🌙", Backup: "☂️",
  anchor: "⚓", support: "🛡️", filler: "📌", meal: "🍽️",
  reset: "🌿", weather_backup: "☂️",
};

function DayHealthBar({ dayStops, intelligence }: { dayStops: PlannerTripPlanStop[]; intelligence: IntelligenceMap }) {
  const stopsWithScores = dayStops
    .map((s) => ({ stop: s, intel: intelligence[s.id] ?? null }))
    .filter((x) => x.intel?.finalScore != null);

  if (stopsWithScores.length === 0) return null;

  const avgScore = Math.round(
    stopsWithScores.reduce((sum, x) => sum + (x.intel!.finalScore ?? 0), 0) / stopsWithScores.length
  );
  const barColor = avgScore >= 80 ? "#10b981" : avgScore >= 65 ? "#f59e0b" : "#ef4444";

  const roleIcons = dayStops
    .slice(0, 6)
    .map((s) => {
      const roleKey = intelligence[s.id]?.roleAssigned ?? s.familyAnchorType;
      return roleKey ? (ROLE_ICON[roleKey] ?? "📍") : "📍";
    });

  return (
    <div className="mx-5 mb-3 bg-white rounded-xl border border-slate-100 px-4 py-3" data-testid="day-health-bar">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-500">Day quality</span>
        <span className="text-sm font-bold" style={{ color: barColor }}>{avgScore}/100</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${avgScore}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex gap-1">
        {roleIcons.map((icon, i) => (
          <span key={i} className="text-sm">{icon}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Conflict alerts ──────────────────────────────────────────────────────────

interface ConflictAlert {
  type: "queue" | "outdoor" | "low-kids";
  message: string;
}

function computeConflicts(dayStops: PlannerTripPlanStop[], intelligence: IntelligenceMap): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];
  if (dayStops.length < 2) return alerts;

  // Back-to-back high queue risk
  for (let i = 0; i < dayStops.length - 1; i++) {
    const a = intelligence[dayStops[i].id];
    const b = intelligence[dayStops[i + 1].id];
    if (!a || !b) continue;
    const aMax = Math.max(a.queueRiskMorning ?? 0, a.queueRiskMidday ?? 0, a.queueRiskAfternoon ?? 0);
    const bMax = Math.max(b.queueRiskMorning ?? 0, b.queueRiskMidday ?? 0, b.queueRiskAfternoon ?? 0);
    if (aMax >= 70 && bMax >= 70) {
      alerts.push({ type: "queue", message: `${dayStops[i].name} and ${dayStops[i + 1].name} both have long queue risks — consider spreading them out.` });
      break;
    }
  }

  // All outdoor stops with no indoor fallback
  const withIntel = dayStops.filter((s) => intelligence[s.id] != null);
  if (withIntel.length >= 2) {
    const allOutdoor = withIntel.every((s) => s.indoorOutdoor !== "indoor");
    if (allOutdoor) {
      alerts.push({ type: "outdoor", message: "All stops are outdoors — consider adding one indoor option as a rain backup." });
    }
  }

  // Low kid-fit all day
  const kidScored = dayStops.filter((s) => intelligence[s.id]?.kidFitScore != null);
  if (kidScored.length >= 2) {
    const avgKid = kidScored.reduce((sum, s) => sum + (intelligence[s.id]!.kidFitScore ?? 0), 0) / kidScored.length;
    if (avgKid < 45) {
      alerts.push({ type: "low-kids", message: "This day may be tough for kids — most stops score low on child-friendliness." });
    }
  }

  return alerts;
}

function ConflictBanner({ alerts }: { alerts: ConflictAlert[] }) {
  const [open, setOpen] = useState(true);
  if (!alerts.length || !open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mb-3 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden"
      data-testid="conflict-banner"
    >
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-700">
            {alerts.length === 1 ? "1 planning alert" : `${alerts.length} planning alerts`}
          </span>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-amber-100 rounded-full" data-testid="button-dismiss-conflicts">
          <X className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>
      <div className="px-4 pb-3 space-y-1.5">
        {alerts.map((alert, i) => (
          <p key={i} className="text-[11px] text-amber-700 leading-relaxed flex items-start gap-1.5">
            <span className="mt-0.5 flex-shrink-0">
              {alert.type === "queue" ? "⏳" : alert.type === "outdoor" ? "🌧️" : "👶"}
            </span>
            {alert.message}
          </p>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function TripPlanView() {
  const [, navigate] = useLocation();
  const { tripPlan, stops, intelligence, uiState, setUiState, updateStop, addStop, fetchPasses, optimizeDay, plannerInput } = usePlanner();
  const youngestChildAge = plannerInput.childrenAges.length > 0 ? Math.min(...plannerInput.childrenAges) : undefined;
  const napActive = youngestChildAge != null && youngestChildAge < 3;
  const [selectedStop, setSelectedStop] = useState<PlannerTripPlanStop | null>(null);
  const [replaceStop, setReplaceStop] = useState<PlannerTripPlanStop | null>(null);
  const [liveStop, setLiveStop] = useState<PlannerTripPlanStop | null>(null);
  const [showAddStop, setShowAddStop] = useState(false);
  const [newStopName, setNewStopName] = useState("");
  const [newStopType, setNewStopType] = useState("landmark");
  const [addingStop, setAddingStop] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const days = useMemo(() => {
    if (!tripPlan) return [];
    const dayMap: Record<number, PlannerTripPlanStop[]> = {};
    for (const stop of stops) {
      const day = stop.dayNumber || 1;
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(stop);
    }
    for (const day in dayMap) {
      dayMap[day].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
    return Array.from({ length: tripPlan.tripDays }, (_, i) => ({
      day: i + 1,
      stops: dayMap[i + 1] || [],
    }));
  }, [tripPlan, stops]);

  const selectedDay = uiState.selectedDay || 1;
  const dayStops = days.find((d) => d.day === selectedDay)?.stops || [];

  const conflicts = useMemo(() => computeConflicts(dayStops, intelligence), [dayStops, intelligence]);

  const hasIntelligence = Object.keys(intelligence).length > 0;

  const handleLock = async (stop: PlannerTripPlanStop) => {
    await updateStop(stop.id, { isLocked: !stop.isLocked });
    toast.success(stop.isLocked ? "Stop unlocked" : "Stop locked");
  };

  const handleOptional = async (stop: PlannerTripPlanStop) => {
    await updateStop(stop.id, { isOptional: !stop.isOptional });
    toast.success(stop.isOptional ? "Stop required" : "Marked as optional");
  };

  const handleMove = async (stop: PlannerTripPlanStop, dir: "up" | "down") => {
    const idx = dayStops.findIndex((s) => s.id === stop.id);
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= dayStops.length) return;
    const target = dayStops[targetIdx];
    const stopOrder = stop.displayOrder ?? idx;
    const targetOrder = target.displayOrder ?? targetIdx;
    await Promise.all([
      updateStop(stop.id, { displayOrder: targetOrder }),
      updateStop(target.id, { displayOrder: stopOrder }),
    ]);
    toast.success(`Moved ${dir}`);
  };

  const handleMoveToDay = async (stop: PlannerTripPlanStop, targetDay: number) => {
    if (targetDay === stop.dayNumber || !tripPlan) return;
    const targetDayStops = days.find((d) => d.day === targetDay)?.stops || [];
    const newOrder = targetDayStops.length;
    await updateStop(stop.id, { dayNumber: targetDay, displayOrder: newOrder });
    toast.success(`Moved to Day ${targetDay}`);
  };

  const handleAddStop = async () => {
    if (!newStopName.trim()) return;
    setAddingStop(true);
    try {
      await addStop(selectedDay, newStopName.trim(), newStopType);
      setNewStopName("");
      setNewStopType("landmark");
      setShowAddStop(false);
      toast.success("Stop added to Day " + selectedDay);
    } catch {
      toast.error("Couldn't add stop, please try again.");
    }
    setAddingStop(false);
  };

  const handleOptimize = async () => {
    if (!tripPlan || optimizing) return;
    setOptimizing(true);
    try {
      await optimizeDay(tripPlan.id, selectedDay);
      toast.success(`Day ${selectedDay} optimized!`);
    } catch {
      toast.error("Couldn't optimize, please try again.");
    } finally {
      setOptimizing(false);
    }
  };


  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!tripPlan) {
      redirectTimeout.current = setTimeout(() => {
        navigate("/");
      }, 800);
    } else {
      if (redirectTimeout.current) clearTimeout(redirectTimeout.current);
    }
    return () => { if (redirectTimeout.current) clearTimeout(redirectTimeout.current); };
  }, [tripPlan, navigate]);

  if (!tripPlan) {
    return (
      <div className="min-h-screen bg-[#FFFAF5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">🗺️</div>
          <p className="text-sm text-slate-500">Loading your plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAF5] flex flex-col">
      <div className="flex items-center px-5 pt-safe-top pt-4 pb-3 sticky top-0 z-10 bg-[#FFFAF5] border-b border-orange-100">
        <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-full hover:bg-orange-50 text-gray-500" data-testid="button-plan-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 ml-2">
          <h1 className="text-base font-bold text-slate-800">{tripPlan.destination}</h1>
          <p className="text-xs text-slate-400">{tripPlan.tripDays} days · {stops.length} stops</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchPasses(tripPlan.id); navigate("/passes"); }}
            className="p-2 rounded-full hover:bg-orange-50 text-slate-500"
            data-testid="button-view-passes"
          >
            <Ticket className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 px-5 py-3 overflow-x-auto border-b border-orange-50 bg-white">
        {days.map(({ day }) => (
          <DayChip
            key={day}
            day={day}
            isSelected={selectedDay === day}
            onClick={() => setUiState({ selectedDay: day })}
          />
        ))}
        {hasIntelligence && dayStops.length > 1 && (
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-100 hover:bg-blue-100 transition flex-shrink-0 disabled:opacity-60"
            data-testid="button-optimize-day"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {optimizing ? "Optimizing..." : "Optimize"}
          </button>
        )}
      </div>

      {hasIntelligence && <DayHealthBar dayStops={dayStops} intelligence={intelligence} />}

      {napActive && (
        <div className="mx-5 mt-1 flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5" data-testid="banner-nap-window">
          <span className="text-base">💤</span>
          <p className="text-xs text-indigo-700 font-medium">We've built in rest time at midday — this works with nap schedules for kids under 3.</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {conflicts.length > 0 && (
          <ConflictBanner key={`conflicts-${selectedDay}`} alerts={conflicts} />
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 pb-32">
        {dayStops.length === 0 ? (
          <EmptyState message={`No stops for Day ${selectedDay}`} />
        ) : (
          dayStops.map((stop) => (
            <StopCard
              key={stop.id}
              stop={stop}
              dayStops={dayStops}
              totalDays={tripPlan.tripDays}
              intelligence={intelligence[stop.id] ?? null}
              youngestChildAge={youngestChildAge}
              onSelect={setSelectedStop}
              onReplace={setReplaceStop}
              onLock={handleLock}
              onOptional={handleOptional}
              onMove={handleMove}
              onMoveToDay={handleMoveToDay}
            />
          ))
        )}
        <button
          onClick={() => setShowAddStop(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-orange-200 rounded-2xl text-orange-500 text-sm font-semibold hover:border-orange-400 hover:bg-orange-50 transition-all"
          data-testid="button-add-stop"
        >
          <Plus className="w-4 h-4" /> Add stop to Day {selectedDay}
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#FFFAF5] border-t border-orange-100 px-5 py-4">
        <button
          onClick={() => navigate("/start")}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl text-base shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          data-testid="button-start-adventure"
        >
          <Star className="w-5 h-5" /> Start Day 1
        </button>
      </div>

      <AnimatePresence>
        {selectedStop && (
          <StopDetailsDrawer
            stop={selectedStop}
            intelligence={intelligence[selectedStop.id] ?? null}
            onClose={() => setSelectedStop(null)}
            onReplace={() => { setReplaceStop(selectedStop); setSelectedStop(null); }}
            onLiveSupport={() => { setLiveStop(selectedStop); setSelectedStop(null); }}
            youngestChildAge={youngestChildAge}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {replaceStop && (
          <ReplaceSheet
            stop={replaceStop}
            onClose={() => setReplaceStop(null)}
          />
        )}
      </AnimatePresence>

      {liveStop && (
        <div className="fixed inset-0 z-50 bg-[#FFFAF5]">
          <ParentStopView
            stop={liveStop}
            onBack={() => setLiveStop(null)}
          />
        </div>
      )}

      {showAddStop && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40"
          onClick={() => setShowAddStop(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-sm mx-4 shadow-xl w-full"
            onClick={(e) => e.stopPropagation()}
            data-testid="planner-add-stop-modal"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-base">Add a Stop — Day {selectedDay}</h3>
              <button onClick={() => setShowAddStop(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Name</label>
                <input
                  type="text"
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  placeholder="e.g. Eiffel Tower, Central Park"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                  data-testid="planner-input-stop-name"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleAddStop()}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                <select
                  value={newStopType}
                  onChange={(e) => setNewStopType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-white"
                  data-testid="planner-select-stop-type"
                >
                  <option value="landmark">Landmark</option>
                  <option value="museum">Museum</option>
                  <option value="park">Park</option>
                  <option value="beach">Beach</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="activity">Activity</option>
                  <option value="nature">Nature</option>
                  <option value="viewpoint">Viewpoint</option>
                  <option value="market">Market</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowAddStop(false)}
                  className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStop}
                  disabled={!newStopName.trim() || addingStop}
                  className="flex-1 py-2.5 rounded-full bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 flex items-center justify-center gap-1.5"
                  data-testid="planner-button-add-stop-submit"
                >
                  <Plus className="w-3.5 h-3.5" /> {addingStop ? "Adding..." : "Add Stop"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
