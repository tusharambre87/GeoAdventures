import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, X, Ticket, CheckCircle2, Clock, Loader2, Hash } from "lucide-react";
import { usePlanner } from "@/lib/plannerContext";
import type { PlannerPass } from "@shared/schema";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  upcoming: { label: "Upcoming", color: "bg-blue-50 text-blue-600", icon: <Clock className="w-3.5 h-3.5" /> },
  ready: { label: "Ready", color: "bg-green-50 text-green-600", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  used: { label: "Used", color: "bg-slate-100 text-slate-500", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

const PASS_TYPES = ["ticket", "reservation", "confirmation", "note"];

interface PassDetailCardProps {
  pass: PlannerPass;
  onClose: () => void;
  onStatusChange: (passId: string, status: "upcoming" | "ready" | "used") => void;
  onDelete: (passId: string) => void;
}

function PassDetailCard({ pass, onClose, onStatusChange, onDelete }: PassDetailCardProps) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[80vh] flex flex-col"
        data-testid="drawer-pass-detail"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">{pass.label}</h2>
            <p className="text-xs text-slate-400 capitalize mt-0.5">{pass.type}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500" data-testid="button-close-pass-detail">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {pass.confirmationNumber && (
            <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
              <Hash className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Confirmation Number</p>
                <p className="font-mono font-bold text-slate-800">{pass.confirmationNumber}</p>
              </div>
            </div>
          )}

          {pass.qrData && (
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-2">QR Code Data</p>
              <div className="font-mono text-xs text-slate-700 break-all bg-white border border-slate-200 rounded-lg p-3">{pass.qrData}</div>
            </div>
          )}

          {pass.notes && (
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
              <p className="text-sm text-slate-700">{pass.notes}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Status</p>
            <div className="flex gap-2">
              {(["upcoming", "ready", "used"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(pass.id, s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${pass.status === s ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"}`}
                  data-testid={`button-pass-status-${s}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={() => { onDelete(pass.id); onClose(); }}
            className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition"
            data-testid="button-delete-pass"
          >
            Delete Pass
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition" data-testid="button-done-pass">
            Done
          </button>
        </div>
      </motion.div>
    </>
  );
}

export default function PassesScreen() {
  const [, navigate] = useLocation();
  const { tripPlan, stops, passes, fetchPasses, addPass, updatePass, deletePass } = usePlanner();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPass, setSelectedPass] = useState<PlannerPass | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState({ label: "", type: "ticket", confirmationNumber: "", notes: "", qrData: "", stopId: "" });

  useEffect(() => {
    if (tripPlan) fetchPasses(tripPlan.id);
  }, [tripPlan?.id]);

  const handleAdd = async () => {
    if (!tripPlan || !form.label.trim()) return;
    setAddLoading(true);
    try {
      await addPass(tripPlan.id, { label: form.label.trim(), type: form.type, confirmationNumber: form.confirmationNumber || undefined, notes: form.notes || undefined, qrData: form.qrData || undefined, stopId: form.stopId || undefined });
      setForm({ label: "", type: "ticket", confirmationNumber: "", notes: "", qrData: "", stopId: "" });
      setShowAdd(false);
      toast.success("Pass added");
    } catch {
      toast.error("Failed to add pass");
    } finally {
      setAddLoading(false);
    }
  };

  const handleStatusChange = async (passId: string, status: "upcoming" | "ready" | "used") => {
    await updatePass(passId, { status });
    toast.success("Status updated");
  };

  const handleDelete = async (passId: string) => {
    await deletePass(passId);
    toast.success("Pass deleted");
  };

  const groupedPasses = {
    ready: passes.filter((p) => p.status === "ready"),
    upcoming: passes.filter((p) => p.status === "upcoming"),
    used: passes.filter((p) => p.status === "used"),
  };

  return (
    <div className="min-h-screen bg-[#FFFAF5] flex flex-col">
      <div className="flex items-center px-5 pt-safe-top pt-4 pb-3 sticky top-0 z-10 bg-[#FFFAF5] border-b border-orange-100">
        <button onClick={() => navigate("/plan")} className="p-2 -ml-2 rounded-full hover:bg-orange-50 text-gray-500" data-testid="button-passes-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="text-lg font-bold text-slate-800">Passes & Tickets</h1>
          <p className="text-xs text-slate-400">{passes.length} saved</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition"
          data-testid="button-add-pass"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {passes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">🎟️</div>
            <p className="font-semibold text-slate-600">No passes yet</p>
            <p className="text-sm text-slate-400 mt-1">Add tickets, reservations, and confirmation numbers</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-6 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition"
              data-testid="button-add-first-pass"
            >
              Add First Pass
            </button>
          </div>
        ) : (
          (["ready", "upcoming", "used"] as const).map((group) => {
            const groupPasses = groupedPasses[group];
            if (groupPasses.length === 0) return null;
            const cfg = STATUS_CONFIG[group];
            return (
              <div key={group}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{cfg.label}</p>
                <div className="space-y-2">
                  {groupPasses.map((pass) => (
                    <button
                      key={pass.id}
                      onClick={() => setSelectedPass(pass)}
                      className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition"
                      data-testid={`card-pass-${pass.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                          <Ticket className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{pass.label}</p>
                          {pass.stopId && (() => {
                            const linkedStop = stops.find((s) => s.id === pass.stopId);
                            return linkedStop ? (
                              <p className="text-xs text-slate-400 mt-0.5" data-testid={`text-pass-stop-${pass.id}`}>
                                {linkedStop.name} · Day {linkedStop.dayNumber}
                              </p>
                            ) : null;
                          })()}
                          {!pass.stopId && pass.confirmationNumber && (
                            <p className="text-xs text-slate-400 font-mono mt-0.5">#{pass.confirmationNumber}</p>
                          )}
                        </div>
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowAdd(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl"
              data-testid="sheet-add-pass"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">Add Pass</h2>
                <button onClick={() => setShowAdd(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <input type="text" placeholder="Label (e.g. Museum Tickets)" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" data-testid="input-pass-label" />
                <div className="flex gap-2 flex-wrap">
                  {PASS_TYPES.map((t) => (
                    <button key={t} onClick={() => setForm((f) => ({ ...f, type: t }))} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${form.type === t ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"}`} data-testid={`button-pass-type-${t}`}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                {stops.length > 0 && (
                  <select
                    value={form.stopId}
                    onChange={(e) => setForm((f) => ({ ...f, stopId: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-slate-700"
                    data-testid="select-pass-stop"
                  >
                    <option value="">Link to a stop (optional)</option>
                    {stops.map((s) => (
                      <option key={s.id} value={s.id}>Day {s.dayNumber}: {s.name}</option>
                    ))}
                  </select>
                )}
                <input type="text" placeholder="Confirmation number (optional)" value={form.confirmationNumber} onChange={(e) => setForm((f) => ({ ...f, confirmationNumber: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" data-testid="input-pass-confirmation" />
                <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" data-testid="input-pass-notes" />
                <button onClick={handleAdd} disabled={!form.label.trim() || addLoading} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 transition flex items-center justify-center gap-2" data-testid="button-save-pass">
                  {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Pass"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPass && (
          <PassDetailCard
            pass={selectedPass}
            onClose={() => setSelectedPass(null)}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
