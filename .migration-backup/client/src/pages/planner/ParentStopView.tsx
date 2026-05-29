import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Navigation, Coffee, UtensilsCrossed, Zap, Star, Scissors, Loader2, X, Clock, Home, Sun, Users, Volume2 } from "lucide-react";
import { usePlanner } from "@/lib/plannerContext";
import type { PlannerTripPlanStop, SupportAction } from "@shared/schema";
import { computeEffectiveDuration } from "@/lib/effectiveDuration";

const SUPPORT_ACTIONS: Array<{ key: SupportAction; label: string; emoji: string; icon: typeof Coffee; color: string }> = [
  { key: "break", label: "We need a break", emoji: "☕", icon: Coffee, color: "bg-blue-50 text-blue-600 border-blue-200" },
  { key: "food", label: "Time for food", emoji: "🍕", icon: UtensilsCrossed, color: "bg-green-50 text-green-600 border-green-200" },
  { key: "keep_going", label: "Keep going!", emoji: "⚡", icon: Zap, color: "bg-amber-50 text-amber-600 border-amber-200" },
  { key: "more_fun", label: "More fun please", emoji: "🎉", icon: Star, color: "bg-purple-50 text-purple-600 border-purple-200" },
  { key: "shorten", label: "Shorten this", emoji: "✂️", icon: Scissors, color: "bg-red-50 text-red-600 border-red-200" },
];

interface Props {
  stop: PlannerTripPlanStop;
  onBack: () => void;
}

export default function ParentStopView({ stop, onBack }: Props) {
  const { tripPlan, liveSupportState, triggerSupport, clearSupport, plannerInput } = usePlanner();
  const youngestChildAge = plannerInput.childrenAges.length > 0 ? Math.min(...plannerInput.childrenAges) : undefined;
  const baseDuration = stop.durationMinutes ?? 0;
  const displayDuration = (youngestChildAge != null && youngestChildAge < 8 && stop.type !== "rest")
    ? computeEffectiveDuration(baseDuration, youngestChildAge)
    : baseDuration;
  const durationLabel = displayDuration < 60
    ? `${displayDuration} min`
    : (() => { const h = Math.floor(displayDuration / 60); const m = displayDuration % 60; return m === 0 ? `${h} hr` : `${h} hr ${m} min`; })();
  const durationAdjusted = displayDuration !== baseDuration;

  const handleAction = async (action: SupportAction) => {
    await triggerSupport(stop.id, action);
  };

  const handleDirections = () => {
    const query = stop.address || stop.name;
    window.open(`https://maps.google.com/?q=${encodeURIComponent(query)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FFFAF5] flex flex-col">
      <div className="flex items-center px-5 pt-safe-top pt-4 pb-3 sticky top-0 z-10 bg-[#FFFAF5] border-b border-orange-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-orange-50 text-gray-500" data-testid="button-stop-view-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="text-base font-bold text-slate-800">{stop.name}</h1>
          <p className="text-xs text-slate-400 capitalize">Day {stop.dayNumber} · {stop.type}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div className="flex gap-2 flex-wrap" data-testid="chips-utility">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${durationAdjusted ? "bg-orange-50 border border-orange-100" : "bg-slate-100"}`} data-testid="chip-duration">
            <Clock className={`w-3.5 h-3.5 ${durationAdjusted ? "text-orange-500" : "text-slate-500"}`} />
            <span className={`text-xs font-medium ${durationAdjusted ? "text-orange-700" : "text-slate-600"}`}>
              {durationLabel}{durationAdjusted && <span className="text-[10px] text-orange-400 ml-1">for your family</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
            <Zap className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-600 capitalize">{stop.effortLevel} effort</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
            {stop.indoorOutdoor === "indoor" ? <Home className="w-3.5 h-3.5 text-slate-500" /> : <Sun className="w-3.5 h-3.5 text-slate-500" />}
            <span className="text-xs font-medium text-slate-600 capitalize">{stop.indoorOutdoor}</span>
          </div>
          {stop.minAge != null && stop.minAge > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Ages {stop.minAge}+</span>
            </div>
          )}
          {stop.sensoryLoad && stop.sensoryLoad !== "moderate" && (
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
              <Volume2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 capitalize">{stop.sensoryLoad} sensory</span>
            </div>
          )}
        </div>

        <button
          onClick={handleDirections}
          className="w-full flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:bg-orange-50 transition"
          data-testid="button-get-directions"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
            <Navigation className="w-6 h-6 text-orange-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-800 text-sm">Get Directions</p>
            {stop.address && <p className="text-xs text-slate-400 mt-0.5">{stop.address}</p>}
          </div>
          <span className="text-xs text-orange-500 font-semibold">Open Maps →</span>
        </button>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">What do you need right now?</h3>
          <div className="space-y-2">
            {SUPPORT_ACTIONS.map((action) => (
              <button
                key={action.key}
                onClick={() => handleAction(action.key)}
                disabled={liveSupportState.loading}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition ${action.color} ${liveSupportState.action === action.key ? "ring-2 ring-offset-1 ring-orange-300" : ""}`}
                data-testid={`button-support-${action.key}`}
              >
                <span className="text-xl">{action.emoji}</span>
                <span className="font-semibold text-sm">{action.label}</span>
                {liveSupportState.loading && liveSupportState.action === action.key && (
                  <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {liveSupportState.result && liveSupportState.activeStopId === stop.id && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="bg-white border border-orange-200 rounded-2xl p-5 shadow-md"
              data-testid="card-support-result"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 mb-1">{liveSupportState.result.suggestion}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{liveSupportState.result.details}</p>
                </div>
                <button onClick={clearSupport} className="ml-3 p-1 text-slate-300 hover:text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {liveSupportState.action === "shorten" && !liveSupportState.result.shortenedTo && (
                <button
                  onClick={() => triggerSupport(stop.id, "shorten", true)}
                  disabled={liveSupportState.loading}
                  className="mt-3 w-full py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition flex items-center justify-center gap-2"
                  data-testid="button-confirm-shorten"
                >
                  <Scissors className="w-4 h-4" />
                  Confirm Shorten
                  {liveSupportState.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                </button>
              )}
              {liveSupportState.result.shortenedTo && (
                <p className="mt-2 text-xs text-green-600 font-medium">Duration updated to {liveSupportState.result.shortenedTo} minutes</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {stop.whyNow && (
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <p className="text-xs font-semibold text-orange-700 mb-1">Why this stop</p>
            <p className="text-sm text-slate-700 leading-relaxed">{stop.whyNow}</p>
          </div>
        )}
      </div>
    </div>
  );
}
