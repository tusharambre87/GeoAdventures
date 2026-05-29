/**
 * WeatherFixSheet — shared bottom-sheet for weather smart rerouting.
 *
 * Props:
 *   open              — controls visibility
 *   onClose           — dismiss sheet
 *   tripId            — needed for API calls
 *   impactedStops     — from weather-check result (pre-fetched by parent)
 *   proposal          — from weather-proposal result (fetched lazily)
 *   proposalLoading   — true while proposal is fetching
 *   onApplied(undoInfo) — called after apply so parent can refresh + dismiss banner
 *   onUndone()        — called after undo succeeds so parent can refresh
 */

import { useState } from "react";
import { X, Clock, Loader2, CloudRain, ArrowLeftRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export interface ImpactedStop {
  id: string;
  name: string;
  stopType: string | null;
  displayOrder: number;
  durationMinutes: number;
  precipMax: number;
  severity?: "low" | "moderate" | "high";
  reason: string;
  isReplaceable: boolean;
  estimatedStartHour?: number;
}

type ReorderOperation = { stopId: string; displayOrder: number | null | undefined };

type ReplaceOperation = {
  deleteStopId: string;
  newStop: {
    name: string;
    stopType: string | null;
    durationMinutes: number;
    description?: string;
    displayOrder: number | null | undefined;
  };
};

type WeatherOperations = ReorderOperation[] | ReplaceOperation | null;

export interface WeatherProposal {
  proposalType: "reorder" | "replace" | null;
  operations: WeatherOperations;
  proposal: {
    stopName: string;
    stopType: string | null;
    durationMinutes: number;
    description?: string;
  } | null;
  reasoning: string;
}

export type UndoInfoReorder = { proposalType: "reorder"; originalStopOrders: ReorderOperation[] };
export type UndoInfoReplace = { proposalType: "replace"; addedStopId: string; originalStop: { name: string; stopType: string | null; durationMinutes: number; description?: string | null; displayOrder: number } | null };
export type WeatherUndoInfo = UndoInfoReorder | UndoInfoReplace;

interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  impactedStops: ImpactedStop[];
  proposal: WeatherProposal | null;
  proposalLoading: boolean;
  onApplied: (undoInfo: WeatherUndoInfo) => void;
  onUndone: () => void;
}

function getStopEmoji(stopType?: string | null): string {
  const map: Record<string, string> = {
    museum: "🏛️", nature: "🌿", beach: "🏖️", park: "🌳",
    zoo: "🐾", aquarium: "🐠", restaurant: "🍽️", landmark: "📍",
    market: "🛒", viewpoint: "🌅", garden: "🌸", playground: "🎠",
    cafe: "☕", science_center: "🔬", art_gallery: "🎨", cinema: "🎬",
    mall: "🏬", food: "🍔", bowling: "🎳", escape_room: "🔐",
  };
  return map[stopType ?? ""] ?? "🏠";
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function WeatherFixSheet({
  open, onClose, tripId, impactedStops, proposal, proposalLoading,
  onApplied, onUndone,
}: Props) {
  const [applying, setApplying] = useState(false);
  const [undoInfo, setUndoInfo] = useState<WeatherUndoInfo | null>(null);
  const [phase, setPhase] = useState<"review" | "applied">("review");
  const [undoing, setUndoing] = useState(false);

  if (!open) return null;

  const handleApply = async () => {
    if (!proposal || !proposal.proposalType) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/travel/trips/${tripId}/weather-apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          proposalType: proposal.proposalType,
          operations: proposal.operations,
        }),
      });
      if (!res.ok) throw new Error("apply failed");
      const data = await res.json() as { success: boolean; undoInfo: WeatherUndoInfo };
      setUndoInfo(data.undoInfo);
      setPhase("applied");
      onApplied(data.undoInfo);
      toast.success(`Updated for rain 🌧`, {
        action: {
          label: "Undo",
          onClick: () => void performUndo(),
        },
        duration: 8000,
      });
    } catch {
      toast.error("Couldn't apply the change — please try again");
    } finally {
      setApplying(false);
    }
  };

  const performUndo = async () => {
    try {
      const res = await fetch(`/api/travel/trips/${tripId}/weather-undo`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("undo failed");
      setPhase("review");
      setUndoInfo(null);
      onUndone();
      onClose();
      toast.success("Changes reverted ✓");
    } catch {
      toast.error("Couldn't undo — try adjusting your plan manually");
    }
  };

  const handleUndo = async () => {
    setUndoing(true);
    try {
      await performUndo();
    } finally {
      setUndoing(false);
    }
  };

  const proposalTypeLabel = proposal?.proposalType === "reorder" ? "Reorder" : "Replace";
  const ProposalIcon = proposal?.proposalType === "reorder" ? ArrowLeftRight : RefreshCw;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="sheet-weather-fix"
    >
      <div
        className="w-full rounded-t-3xl bg-white px-5 pt-4 pb-10 overflow-y-auto"
        style={{ maxHeight: "85vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.14)" }}
      >
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4" />

        {phase === "applied" ? (
          /* ── Post-apply confirmation state ─────────────────── */
          <div className="text-center py-4" data-testid="sheet-weather-applied">
            <div className="text-4xl mb-3">🌧</div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Plan updated for rain</h2>
            <p className="text-sm text-slate-500 mb-6">
              {proposal?.proposalType === "reorder"
                ? `Indoor activities moved earlier · ${proposal.proposal?.stopName} is now first`
                : `${proposal?.proposal?.stopName} replaces the outdoor stop`}
            </p>
            <button
              onClick={handleUndo}
              disabled={undoing}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-slate-600 border-2 border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-60"
              data-testid="button-weather-undo"
            >
              {undoing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Undo this change
            </button>
            <button
              onClick={onClose}
              className="w-full mt-2.5 py-3.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: "#D4872B" }}
              data-testid="button-weather-done"
            >
              Looks good ✓
            </button>
          </div>
        ) : (
          /* ── Review proposal state ──────────────────────────── */
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <CloudRain className="w-4 h-4 text-blue-500" />
                  <span className="text-base font-bold text-slate-800">Rain may affect your day</span>
                </div>
                <p className="text-xs text-slate-400">Here's a fix — you stay in control</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors shrink-0 -mt-1"
                data-testid="button-close-weather-fix"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Impacted stops list */}
            {impactedStops.length > 0 && (
              <div className="mb-5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                  Affected {impactedStops.length === 1 ? "stop" : "stops"}
                </p>
                <div className="space-y-2">
                  {impactedStops.slice(0, 2).map((stop) => (
                    <div
                      key={stop.id}
                      className="rounded-2xl px-4 py-3 flex items-start gap-3"
                      style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}
                      data-testid={`card-impacted-stop-${stop.id}`}
                    >
                      <span className="text-xl shrink-0">{getStopEmoji(stop.stopType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{stop.name}</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          ⚠ {stop.reason} · {stop.precipMax}% rain
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proposal card */}
            <div className="mb-5">
              {proposal?.proposalType && (
                <div className="flex items-center gap-2 mb-2">
                  <ProposalIcon className="w-3.5 h-3.5 text-blue-500" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Suggested fix · {proposalTypeLabel}
                  </p>
                </div>
              )}

              {proposalLoading ? (
                <div
                  className="rounded-2xl px-4 py-4 flex items-center gap-3 border border-slate-100 bg-slate-50"
                  data-testid="card-proposal-loading"
                >
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  <p className="text-sm text-slate-400">Finding the best fix…</p>
                </div>
              ) : proposal?.proposal ? (
                <div
                  className="rounded-2xl px-4 py-3.5"
                  style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
                  data-testid="card-weather-proposal"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{getStopEmoji(proposal.proposal.stopType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-blue-900">{proposal.proposal.stopName}</p>
                      {proposal.proposal.description && (
                        <p className="text-xs text-blue-700 mt-0.5 leading-snug">{proposal.proposal.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-blue-500 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />{formatDuration(proposal.proposal.durationMinutes)}
                        </span>
                        <span className="text-[11px] text-blue-500">🏠 Indoor</span>
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          {proposalTypeLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {proposal.reasoning && (
                    <div className="mt-3 pt-3 border-t border-blue-100">
                      <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wide mb-1">Why this works</p>
                      <p className="text-xs text-blue-700 leading-snug">{proposal.reasoning}</p>
                    </div>
                  )}
                </div>
              ) : proposal && !proposalLoading ? (
                <div
                  className="rounded-2xl px-4 py-4 border border-slate-100 bg-slate-50"
                  data-testid="card-no-proposal"
                >
                  <p className="text-sm text-slate-500">
                    No automatic fix available — you can adjust your plan manually.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Action buttons */}
            <div className="space-y-2.5">
              {proposal?.proposalType && proposal.proposal && (
                <button
                  onClick={handleApply}
                  disabled={applying || proposalLoading}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-sm font-bold transition-opacity active:opacity-80 disabled:opacity-60"
                  style={{ background: "#D4872B" }}
                  data-testid="button-apply-weather-fix"
                >
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Apply fix
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl text-sm font-semibold text-slate-600 border-2 border-slate-200 hover:bg-slate-50 transition-colors"
                data-testid="button-keep-original-plan"
              >
                Keep original plan
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
