import { useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Unlock, Flag, ChevronUp, ChevronDown, RefreshCw, ChevronRight,
  Clock, Home, Sun, Users, MapPin, Sunrise, Sunset, Coffee, AlertTriangle, X
} from "lucide-react";
import type { PlannerTripPlanStop, PlannerStopIntelligence } from "@shared/schema";
import InlineStatusBadge from "./InlineStatusBadge";
import UtilityChip from "./UtilityChip";
import { computeEffectiveDuration } from "@/lib/effectiveDuration";

const TYPE_EMOJI: Record<string, string> = {
  museum: "🏛️", park: "🌳", landmark: "🏛️", restaurant: "🍽️", beach: "🏖️",
  viewpoint: "👀", market: "🏪", garden: "🌸", activity: "🎯", other: "📍",
};

const ROLE_STYLE: Record<string, { label: string; color: string }> = {
  Anchor:     { label: "Anchor",    color: "text-orange-700 bg-orange-50" },
  Support:    { label: "Support",   color: "text-blue-700 bg-blue-50" },
  Treat:      { label: "Treat",     color: "text-pink-700 bg-pink-50" },
  Meal:       { label: "Meal",      color: "text-green-700 bg-green-50" },
  Reset:      { label: "Reset",     color: "text-purple-700 bg-purple-50" },
  "Quick win":{ label: "Quick win", color: "text-cyan-700 bg-cyan-50" },
  "Wind-down":{ label: "Wind-down", color: "text-indigo-700 bg-indigo-50" },
  Backup:     { label: "Backup",    color: "text-slate-600 bg-slate-100" },
  anchor:     { label: "Anchor",    color: "text-orange-700 bg-orange-50" },
  support:    { label: "Support",   color: "text-blue-700 bg-blue-50" },
  filler:     { label: "Filler",    color: "text-slate-600 bg-slate-100" },
  meal:       { label: "Meal",      color: "text-green-700 bg-green-50" },
  reset:      { label: "Reset",     color: "text-purple-700 bg-purple-50" },
  weather_backup: { label: "Rain Plan", color: "text-cyan-700 bg-cyan-50" },
};

const EFFORT_COLOR: Record<string, string> = {
  low: "text-green-600 bg-green-50",
  moderate: "text-amber-600 bg-amber-50",
  high: "text-red-600 bg-red-50",
};

const WINDOW_ICON: Record<string, ReactNode> = {
  morning:   <Sunrise className="w-3 h-3" />,
  midday:    <Sun className="w-3 h-3" />,
  afternoon: <Sunset className="w-3 h-3" />,
  evening:   <Coffee className="w-3 h-3" />,
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 65 ? "bg-amber-400" : "bg-red-400";
  return (
    <div
      className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 shadow-sm`}
      data-testid="badge-intelligence-score"
      title={`Family intelligence score: ${score}/100`}
    >
      {score}
    </div>
  );
}

interface StopCardProps {
  stop: PlannerTripPlanStop;
  dayStops: PlannerTripPlanStop[];
  totalDays: number;
  intelligence?: PlannerStopIntelligence | null;
  youngestChildAge?: number;
  onSelect: (s: PlannerTripPlanStop) => void;
  onReplace: (s: PlannerTripPlanStop) => void;
  onLock: (s: PlannerTripPlanStop) => void;
  onOptional: (s: PlannerTripPlanStop) => void;
  onMove: (s: PlannerTripPlanStop, dir: "up" | "down") => void;
  onMoveToDay: (s: PlannerTripPlanStop, day: number) => void;
}

export default function StopCard({ stop, dayStops, totalDays, intelligence, youngestChildAge, onSelect, onReplace, onLock, onOptional, onMove, onMoveToDay }: StopCardProps) {
  const idx = dayStops.findIndex((s) => s.id === stop.id);
  const isNapStop = stop.type === "rest";
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Effective duration for families with young children
  const baseDuration = stop.durationMinutes ?? 0;
  const displayDuration = (youngestChildAge != null && youngestChildAge < 8 && !isNapStop)
    ? computeEffectiveDuration(baseDuration, youngestChildAge)
    : baseDuration;
  const durationLabel = displayDuration < 60
    ? `${displayDuration} min`
    : (() => { const h = Math.floor(displayDuration / 60); const m = displayDuration % 60; return m === 0 ? `${h}h` : `${h}h ${m}m`; })();

  // Use intelligence roleAssigned if available, fall back to familyAnchorType
  const roleKey = intelligence?.roleAssigned ?? stop.familyAnchorType;
  const roleStyle = roleKey ? ROLE_STYLE[roleKey] : null;

  // Discovery or social label from intelligence
  const discoveryTag = intelligence?.discoveryLabel ?? intelligence?.socialLabel ?? null;
  const bestWindow = intelligence?.bestArrivalWindow;

  return (
    <>
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border shadow-sm overflow-hidden ${isNapStop ? "bg-indigo-50 border-indigo-100" : `bg-white ${stop.isOptional ? "border-dashed border-slate-300" : "border-slate-200"}`}`}
      data-testid={`card-stop-${stop.id}`}
    >
      {isNapStop ? (
        <div className="w-full p-4 flex items-center gap-3" data-testid={`button-stop-detail-${stop.id}`}>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl flex-shrink-0">💤</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-indigo-800 text-sm leading-tight">{stop.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <UtilityChip icon={<Clock className="w-3 h-3" />} label="90 min" />
              <span className="text-[10px] text-indigo-500 font-medium">Midday rest for little ones</span>
            </div>
          </div>
        </div>
      ) : (
      <>
      <button
        className="w-full text-left p-4"
        onClick={() => onSelect(stop)}
        data-testid={`button-stop-detail-${stop.id}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl flex-shrink-0">
            {TYPE_EMOJI[stop.type] || "📍"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-800 text-sm leading-tight">{stop.name}</p>
              {roleStyle && (
                <InlineStatusBadge
                  label={roleStyle.label}
                  className={roleStyle.color}
                  testId={`badge-role-${stop.id}`}
                />
              )}
              {stop.isLocked && <Lock className="w-3 h-3 text-orange-500 flex-shrink-0" />}
              {stop.isOptional && <InlineStatusBadge label="optional" className="text-slate-400 bg-slate-100" />}
            </div>

            {discoveryTag && (
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium italic">{discoveryTag}</p>
            )}

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <UtilityChip icon={<Clock className="w-3 h-3" />} label={durationLabel} />
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${EFFORT_COLOR[stop.effortLevel || "moderate"]}`}>
                {stop.effortLevel}
              </span>
              <UtilityChip
                icon={stop.indoorOutdoor === "indoor" ? <Home className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                label={stop.indoorOutdoor || "outdoor"}
              />
              {stop.minAge != null && stop.minAge > 0 && (
                <UtilityChip icon={<Users className="w-3 h-3" />} label={`${stop.minAge}+`} />
              )}
              {bestWindow && bestWindow !== "anytime" && WINDOW_ICON[bestWindow] && (
                <UtilityChip icon={WINDOW_ICON[bestWindow]!} label={`Best ${bestWindow}`} />
              )}
            </div>
            {stop.whyNow && (
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{stop.whyNow}</p>
            )}
            {idx < dayStops.length - 1 && (
              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400" data-testid={`text-travel-${stop.id}`}>
                <MapPin className="w-3 h-3" />
                <span>
                  {stop.travelMinutes ? `${stop.travelMinutes}min` : "→"} to {dayStops[idx + 1].name}
                </span>
                {stop.travelMode && <span className="capitalize">· {stop.travelMode}</span>}
              </div>
            )}
          </div>
          {intelligence?.finalScore != null ? (
            <ScoreBadge score={intelligence.finalScore} />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
          )}
        </div>
      </button>

      {stop.reviewRequired && (
        <div className="px-4 pb-3">
          <button
            onClick={(e) => { e.stopPropagation(); setShowReviewModal(true); }}
            className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] font-semibold hover:bg-amber-100 transition"
            data-testid={`badge-review-required-${stop.id}`}
          >
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            Confirm before going
          </button>
        </div>
      )}

      <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-2 bg-slate-50">
        <button
          onClick={() => onMove(stop, "up")}
          disabled={idx === 0}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-30 transition"
          data-testid={`button-move-up-${stop.id}`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMove(stop, "down")}
          disabled={idx === dayStops.length - 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-30 transition"
          data-testid={`button-move-down-${stop.id}`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onLock(stop)}
          className={`p-1.5 rounded-lg transition ${stop.isLocked ? "text-orange-500 bg-orange-50" : "text-slate-400 hover:text-slate-600 hover:bg-white"}`}
          data-testid={`button-lock-${stop.id}`}
        >
          {stop.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => onOptional(stop)}
          className={`p-1.5 rounded-lg transition ${stop.isOptional ? "text-slate-500 bg-slate-100" : "text-slate-400 hover:text-slate-600 hover:bg-white"}`}
          data-testid={`button-optional-${stop.id}`}
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
        {totalDays > 1 && (
          <select
            value={stop.dayNumber}
            onChange={(e) => onMoveToDay(stop, Number(e.target.value))}
            className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1 hover:border-orange-300 transition"
            data-testid={`select-move-day-${stop.id}`}
          >
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>Day {d}</option>
            ))}
          </select>
        )}
        <div className="flex-1" />
        {!stop.isLocked && (
          <button
            onClick={() => onReplace(stop)}
            className="flex items-center gap-1 text-orange-500 hover:text-orange-600 text-[11px] font-semibold px-2 py-1 rounded-lg hover:bg-orange-50 transition"
            data-testid={`button-replace-${stop.id}`}
          >
            <RefreshCw className="w-3 h-3" /> Replace
          </button>
        )}
      </div>
      </>
      )}
    </motion.div>

    <AnimatePresence>
      {showReviewModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowReviewModal(false)}
          data-testid={`modal-review-required-${stop.id}`}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Worth confirming first</h3>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                data-testid={`button-close-review-modal-${stop.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              {stop.reviewNote ?? "We found this stop but couldn't fully verify it — worth confirming before you visit."}
            </p>
            <p className="text-xs text-slate-400 mb-5">
              We recommend checking opening hours, location, and that the place is still operating before making it part of your day.
            </p>
            <button
              onClick={() => setShowReviewModal(false)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl py-3 text-sm transition"
              data-testid={`button-dismiss-review-modal-${stop.id}`}
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
