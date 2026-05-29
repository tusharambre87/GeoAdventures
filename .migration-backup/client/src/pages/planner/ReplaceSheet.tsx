import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Clock, Home, Loader2, ChevronRight, Trash2 } from "lucide-react";
import { usePlanner } from "@/lib/plannerContext";
import type { PlannerTripPlanStop } from "@shared/schema";
import { toast } from "sonner";

interface Props {
  stop: PlannerTripPlanStop;
  onClose: () => void;
}

const GROUPS = [
  { key: "shorter", label: "Shorter", emoji: "⏱️", desc: "Less time commitment" },
  { key: "easier", label: "Easier", emoji: "🌿", desc: "Less physically demanding" },
  { key: "indoor", label: "Indoor", emoji: "🏠", desc: "Weather-proof option" },
  { key: "moreActive", label: "More Active", emoji: "⚡", desc: "Higher energy" },
  { key: "sameVibe", label: "Same Vibe", emoji: "✨", desc: "Different experience" },
];

export default function ReplaceSheet({ stop, onClose }: Props) {
  const { tripPlan, replaceStop, deleteStop } = usePlanner();
  const [suggestions, setSuggestions] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState("shorter");
  const [replacing, setReplacing] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!tripPlan) return;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/planner/trip-plans/${tripPlan.id}/stops/${stop.id}/replacements`, { credentials: "include" })
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/?login=true";
          throw new Error("Session expired");
        }
        if (!r.ok) {
          let msg = "Could not load alternatives";
          try { const d = await r.json(); msg = d.message || msg; } catch {}
          throw new Error(msg);
        }
        return r.json();
      })
      .then((data) => setSuggestions(data))
      .catch((e) => { setSuggestions({}); setLoadError(e.message); })
      .finally(() => setLoading(false));
  }, [stop.id, tripPlan?.id]);

  const handleReplace = async (suggestion: any) => {
    setReplacing(suggestion.name);
    try {
      await replaceStop(stop.id, suggestion);
      toast.success(`Replaced with ${suggestion.name}`);
      onClose();
    } catch {
      toast.error("Failed to replace stop");
    } finally {
      setReplacing(null);
    }
  };

  const handleRemoveStop = async () => {
    setRemoving(true);
    try {
      await deleteStop(stop.id);
      toast.success("Stop removed — enjoy your free time! 🌿");
      onClose();
    } catch {
      toast.error("Couldn't remove stop, please try again.");
    } finally {
      setRemoving(false);
    }
  };

  const activeSuggestions = suggestions[activeGroup] || [];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90vh] flex flex-col"
        data-testid="sheet-replace"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">Replace Stop</h2>
            <p className="text-xs text-slate-400 mt-0.5">Find a better fit for <span className="font-medium text-slate-600">{stop.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500" data-testid="button-close-replace">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 px-5 py-3 overflow-x-auto border-b border-slate-100">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setActiveGroup(g.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${activeGroup === g.key ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              data-testid={`chip-replace-group-${g.key}`}
            >
              <span>{g.emoji}</span> {g.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Finding alternatives...</span>
            </div>
          ) : loadError ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-slate-500 text-sm font-medium">Could not load alternatives</p>
              <p className="text-slate-400 text-xs mt-1">{loadError}</p>
            </div>
          ) : activeSuggestions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-slate-400 text-sm">No alternatives found for this group</p>
            </div>
          ) : (
            activeSuggestions.map((s: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
                data-testid={`card-replacement-${idx}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl flex-shrink-0">📍</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" /> {s.durationMinutes}min
                        {s.durationDelta !== undefined && (
                          <span className={`${s.durationDelta < 0 ? "text-green-500" : "text-amber-500"}`}>
                            ({s.durationDelta > 0 ? "+" : ""}{s.durationDelta}min)
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-500 capitalize">{s.effortLevel} effort</span>
                      {s.effortDelta && s.effortDelta !== "same" && (
                        <span className={`text-[10px] font-medium ${s.effortDelta === "easier" ? "text-green-500" : "text-red-500"}`}>
                          ({s.effortDelta})
                        </span>
                      )}
                      {s.travelMinutes !== undefined && (
                        <span className="text-[11px] text-slate-500">{s.travelMinutes}min away</span>
                      )}
                    </div>
                    {s.whyNow && <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">{s.whyNow}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleReplace(s)}
                  disabled={replacing === s.name}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-60 transition"
                  data-testid={`button-use-replacement-${idx}`}
                >
                  {replacing === s.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Use this stop <ChevronRight className="w-4 h-4" /></>}
                </button>
              </motion.div>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-4 bg-white">
          <button
            onClick={handleRemoveStop}
            disabled={removing || !!replacing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all text-sm font-semibold disabled:opacity-40"
            data-testid="button-remove-stop"
          >
            {removing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {removing ? "Removing…" : "Just remove this stop — we'll chill 🌿"}
          </button>
        </div>
      </motion.div>
    </>
  );
}
