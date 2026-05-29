import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Star, CheckCircle, Clock, Zap, ToggleLeft, ToggleRight } from "lucide-react";
import { usePlanner } from "@/lib/plannerContext";
import { toast } from "sonner";

export default function StartAdventureConfirmation() {
  const [, navigate] = useLocation();
  const { tripPlan, stops, handoffState, startAdventure } = usePlanner();
  const [includeOptional, setIncludeOptional] = useState(false);

  const sortedStops = useMemo(() => [...stops].sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  }), [stops]);

  const optionalCount = sortedStops.filter((s) => s.isOptional && !s.isLocked).length;

  const includedStops = useMemo(() =>
    includeOptional ? sortedStops : sortedStops.filter((s) => !s.isOptional || s.isLocked),
    [sortedStops, includeOptional]
  );

  const totalDuration = includedStops.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const hours = Math.floor(totalDuration / 60);
  const minutes = totalDuration % 60;

  const handleLaunch = async () => {
    if (!tripPlan) return;
    try {
      const includedStopIds = includedStops.map((s) => s.id);
      const result = await startAdventure(tripPlan.id, includedStopIds);
      toast.success("Adventure started!");
      navigate(`~/adventure/${result.experienceTripId}/parent-plan`);
    } catch (err: any) {
      if (err.message !== "Session expired") {
        toast.error(err.message || "Failed to start adventure. Please try again.");
      }
    }
  };

  if (!tripPlan) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 flex flex-col">
      <div className="flex items-center px-5 pt-safe-top pt-4 pb-3 sticky top-0 z-10 bg-orange-50/90 backdrop-blur border-b border-orange-100">
        <button onClick={() => navigate("/plan")} className="p-2 -ml-2 rounded-full hover:bg-orange-100 text-gray-500" data-testid="button-start-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="ml-2 text-lg font-bold text-slate-800">Start Adventure</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-32 space-y-6">
        <div className="text-center py-6">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
          >
            🗺️
          </motion.div>
          <h2 className="text-2xl font-bold text-slate-800">{tripPlan.destination}</h2>
          <p className="text-slate-500 mt-1">{tripPlan.tripDays} days · {includedStops.length} stops</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="w-4 h-4" /> ~{hours}h {minutes}m total
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 capitalize">
              <Zap className="w-4 h-4" /> {tripPlan.pace} pace
            </div>
          </div>
        </div>

        {optionalCount > 0 && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-3.5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-700">Include optional stops</p>
              <p className="text-xs text-slate-400 mt-0.5">{optionalCount} optional stop{optionalCount > 1 ? "s" : ""} in your plan</p>
            </div>
            <button
              onClick={() => setIncludeOptional(!includeOptional)}
              className="text-orange-500"
              data-testid="button-toggle-optional"
            >
              {includeOptional ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-700">Your Itinerary</p>
            <p className="text-xs text-slate-400 mt-0.5">{includedStops.length} stops included</p>
          </div>
          <div className="divide-y divide-slate-100">
            {includedStops.map((stop, idx) => (
              <div key={stop.id} className="flex items-center gap-3 px-4 py-3" data-testid={`row-confirm-stop-${stop.id}`}>
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{stop.name}</p>
                  <p className="text-xs text-slate-400">Day {stop.dayNumber} · {stop.durationMinutes}min</p>
                </div>
                {stop.isOptional && (
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full flex-shrink-0">opt</span>
                )}
                {stop.isLocked && (
                  <CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">What happens next</p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-xs text-amber-700">
              <span className="mt-0.5">✓</span> Your plan is saved to GeoAdventures
            </li>
            <li className="flex items-start gap-2 text-xs text-amber-700">
              <span className="mt-0.5">✓</span> Kids can start missions and earn XP at each stop
            </li>
            <li className="flex items-start gap-2 text-xs text-amber-700">
              <span className="mt-0.5">✓</span> You can still edit and adjust stops during the trip
            </li>
          </ul>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-amber-50 via-amber-50 to-transparent px-5 py-5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleLaunch}
          disabled={handoffState.loading}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-base shadow-xl transition-all flex items-center justify-center gap-2"
          data-testid="button-launch-adventure"
        >
          {handoffState.loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Launching...</>
          ) : (
            <><Star className="w-5 h-5" /> Launch Adventure</>
          )}
        </motion.button>
        {handoffState.error && (
          <p className="text-center text-xs text-red-500 mt-2">{handoffState.error}</p>
        )}
      </div>
    </div>
  );
}
