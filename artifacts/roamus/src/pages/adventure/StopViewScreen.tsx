/**
 * StopViewScreen — Phase 5
 *
 * Modular, calm at-stop execution surface.
 *
 * Layout:
 *   1. Header (back + day)
 *   2. Hero image
 *   3. Stop identity card (name, duration, family fit, utility chips)
 *   4. Do this first (snapshot-sourced)
 *   5. Primary actions: Start exploring / Short visit / Skip (with confirmation)
 *   6. Don't Miss This (snapshot practicalHighlights or journey pack)
 *   7. Collapsed modules: Kids experience / Food nearby / Details
 *   8. View full day link
 *   Sticky footer: Mark as visited
 *
 * After Mark as visited:
 *   Celebration phase: Nice job! + photo/skip + next stop + quick games + Continue
 *
 * Preserved unchanged:
 *   - markStopVisited (useTravel)
 *   - routeAfterAction logic
 *   - handleAddStop
 *   - RescuePanel (all props identical)
 *   - useDontMissThis journey-pack hook
 *   - getSnapshotFromStop (all null-safe)
 */

import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useTravel } from "@/lib/travelContext";
import { useTripExecutionState } from "@/hooks/useTripExecutionState";
import type { EnrichedTravelStop } from "@/lib/travelExecutionTypes";
import {
  ArrowLeft, Clock, ChevronRight, Loader2,
  MapPin, ParkingCircle, Baby, Lightbulb, Users, Star,
  Utensils, Camera, Gamepad2,
} from "lucide-react";
import { useOnDemandStopImage } from "@/hooks/useOnDemandAdventureImage";
import { RescuePanel } from "@/components/RescuePanel";
import { KeepThemBusySheet } from "@/components/KeepThemBusySheet";
import { GetHelpFlow } from "@/components/GetHelpFlow";
import { toast } from "sonner";
import { getSnapshotFromStop } from "@/hooks/useStopSnapshot";
import { useQualitySignal } from "@/hooks/useQualitySignal";

// ─── Journey-pack hook (unchanged) ──────────────────────────────────────────

interface DontMissThis { highlights: string[]; shortOnTime: string }

function useDontMissThis(stopId: string) {
  const [dontMissThis, setDontMissThis] = useState<DontMissThis | null>(null);
  useEffect(() => {
    if (!stopId) return;
    fetch(`/api/travel/stops/${stopId}/journey-pack`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.dontMissThis?.highlights?.length > 0) setDontMissThis(data.dontMissThis);
      })
      .catch(() => {});
  }, [stopId]);
  return dontMissThis;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getKidNote(stopType?: string | null): string {
  const notes: Record<string, string> = {
    museum: "Great for kids · Easy restrooms", zoo: "Great for kids · Lots of walking",
    aquarium: "Great for kids · Easy restrooms", park: "Great for kids · Open space",
    beach: "Great for kids · Watch the sun", nature: "Great for kids · Fresh air",
    playground: "Perfect for kids · Open space", garden: "Lovely for kids · Easy walk",
    landmark: "Fun for kids · Photo spot", restaurant: "Kid-friendly · Great food",
  };
  return notes[stopType ?? ""] ?? "Kid-friendly";
}

function getDurationLabel(mins?: number | null, shortened?: boolean): string {
  const m = shortened ? Math.round((mins ?? 60) * 0.5) : (mins ?? 60);
  return m < 60 ? `${m}m` : `${Math.round(m / 60 * 10) / 10}h`.replace(/\.0h/, "h");
}

function getStopEmoji(stopType?: string | null): string {
  const map: Record<string, string> = {
    museum: "🏛️", nature: "🌿", beach: "🏖️", park: "🌳",
    zoo: "🐾", aquarium: "🐠", restaurant: "🍽️", landmark: "📍",
    market: "🛒", viewpoint: "🌅", garden: "🌸", playground: "🎠",
  };
  return map[stopType ?? ""] ?? "📍";
}

// ─── CollapsibleModule ───────────────────────────────────────────────────────

function CollapsibleModule({
  icon, label, sub, onClick, testId,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
      data-testid={testId}
    >
      <span className="text-slate-400 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-slate-700 text-sm">{label}</span>
        {sub && <span className="text-slate-400 text-xs block">{sub}</span>}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
    </button>
  );
}

// ─── Post-visit celebration ──────────────────────────────────────────────────

function VisitedCelebration({
  stopName,
  nextStop,
  tripId,
  stopId,
  showQualityPrompt,
  onContinue,
}: {
  stopName: string;
  nextStop: { name: string; stopType?: string | null } | null;
  tripId: string;
  stopId: string;
  showQualityPrompt?: boolean;
  onContinue: () => void;
}) {
  const [location, setLocation] = useLocation();
  // StopViewScreen is mounted at /adventure/:tripId/stop/:stopId — a parent-only path.
  // Kid routes are under /adventure/:tripId/kid/*; this screen is never rendered in kid mode.
  const isParentMode = !location.includes("/kid/");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [worthItAnswer, setWorthItAnswer] = useState<string | null>(null);
  const [worthItFollowup, setWorthItFollowup] = useState<string | null>(null);
  const { fireSignal } = useQualitySignal();

  const handleWorthIt = (val: string) => {
    setWorthItAnswer(val);
    setWorthItFollowup(null);
    fireSignal(stopId, "worth_it", { signalValue: val });
  };

  const handleSavePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const existing = JSON.parse(localStorage.getItem("adventure-stop-photos") || "[]");
        existing.push({ stopName, tripId, dataUrl: reader.result, ts: Date.now() });
        localStorage.setItem("adventure-stop-photos", JSON.stringify(existing.slice(-20)));
      } catch {}
      setPhotoSaved(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="screen-visited-celebration">
      <div className="flex-1 flex flex-col px-4 pt-10 pb-8 max-w-lg mx-auto w-full items-center">

        {/* Celebration header */}
        <div className="text-6xl mb-4">✅</div>
        <h2
          className="text-2xl font-bold text-slate-900 mb-1 text-center"
          data-testid="text-nice-job"
        >
          Nice — that one's done 👍
        </h2>
        <p className="text-sm text-slate-400 mb-6 text-center">{stopName}</p>

        {/* Photo capture */}
        {!photoSaved ? (
          <div
            className="w-full rounded-2xl px-4 py-4 mb-5 text-center"
            style={{ background: "#FFF8ED", border: "1px solid #F5E0B5" }}
            data-testid="block-save-photo"
          >
            <Camera className="w-6 h-6 mx-auto mb-1.5 text-amber-500" />
            <p className="text-sm font-semibold text-amber-800 mb-3">Capture a moment?</p>
            <div className="flex gap-2">
              <button
                onClick={() => photoInputRef.current?.click()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity active:opacity-80"
                style={{ background: "#D4872B" }}
                data-testid="button-save-photo"
              >
                Save a photo
              </button>
              <button
                onClick={() => setPhotoSaved(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
                data-testid="button-skip-photo"
              >
                Skip
              </button>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleSavePhoto}
            />
          </div>
        ) : (
          <div
            className="w-full rounded-2xl px-4 py-3 mb-5 flex items-center gap-2"
            style={{ background: "#F0FFF4", border: "1px solid #BBF7D0" }}
            data-testid="block-photo-saved"
          >
            <span className="text-lg">📸</span>
            <span className="text-sm font-semibold text-green-700">Moment saved!</span>
          </div>
        )}

        {/* Next stop preview */}
        {nextStop && (
          <div
            className="w-full rounded-2xl px-4 py-3.5 mb-5"
            style={{ background: "#F8F8F8", border: "1px solid #E8E8E8" }}
            data-testid="block-next-stop-preview"
          >
            <p className="text-xs font-semibold text-slate-400 mb-2">Next up</p>
            <div className="flex items-center gap-2">
              <span className="text-xl">{getStopEmoji(nextStop.stopType)}</span>
              <span className="font-semibold text-slate-800 text-sm" data-testid="text-next-stop-name">
                {nextStop.name}
              </span>
            </div>
          </div>
        )}

        {/* Keep them busy */}
        <div className="w-full mb-6">
          <p className="text-xs font-semibold text-slate-400 mb-2.5">
            Something for the ride
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setLocation("/compass-quest")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold transition-colors hover:bg-purple-100 active:opacity-80"
              data-testid="button-ride-compass"
            >
              🧭 Compass Quest
            </button>
            <button
              onClick={() => setLocation(`/adventure/${tripId}/kid/games`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold transition-colors hover:bg-purple-100 active:opacity-80"
              data-testid="button-ride-games"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              More games
            </button>
          </div>
        </div>

        {/* "Worth it?" pulse — parent-only; criteria computed server-side (anchor/uncertain types + first-time placeId) */}
        {isParentMode && showQualityPrompt && (
          <div
            className="w-full rounded-2xl px-4 py-4 mb-5"
            style={{ background: "#F8F9FA", border: "1px solid #E8E8E8" }}
            data-testid="block-worth-it"
          >
            {worthItAnswer && worthItFollowup ? (
              <p className="text-sm font-semibold text-slate-600 text-center">
                {worthItAnswer === "big_hit" ? "🏆 Big hit — saved!" : "👎 Noted — we'll remember that."}
              </p>
            ) : worthItAnswer === "good" ? (
              <p className="text-sm font-semibold text-slate-600 text-center">👍 Good to know!</p>
            ) : worthItAnswer ? (
              // Follow-up tag row after big_hit or skip_next_time
              <>
                <p className="text-xs font-bold text-slate-500 mb-2">
                  {worthItAnswer === "big_hit" ? "What made it great?" : "What went wrong?"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(worthItAnswer === "big_hit"
                    ? [
                        { val: "kids_loved_it", label: "👶 Kids loved it" },
                        { val: "hidden_gem", label: "💎 Hidden gem" },
                        { val: "would_return", label: "🔄 Would return" },
                      ]
                    : [
                        { val: "too_crowded", label: "👥 Too crowded" },
                        { val: "not_kid_friendly", label: "🚫 Not kid-friendly" },
                        { val: "expensive", label: "💸 Expensive" },
                      ]
                  ).map(tag => (
                    <button
                      key={tag.val}
                      onClick={() => {
                        setWorthItFollowup(tag.val);
                        fireSignal(stopId, "worth_it_followup", { signalValue: tag.val });
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 active:scale-95 transition-all"
                      data-testid={`button-worth-it-followup-${tag.val}`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-slate-500 mb-3 text-center uppercase tracking-wide">
                  Worth it?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleWorthIt("big_hit")}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
                    style={{ background: "#FFF9EC", borderColor: "#F59E0B", color: "#92400E" }}
                    data-testid="button-worth-it-big-hit"
                  >
                    🏆 Big hit
                  </button>
                  <button
                    onClick={() => handleWorthIt("good")}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
                    style={{ background: "#F0FFF4", borderColor: "#34D399", color: "#065F46" }}
                    data-testid="button-worth-it-good"
                  >
                    👍 Good
                  </button>
                  <button
                    onClick={() => handleWorthIt("skip_next_time")}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
                    style={{ background: "#FFF5F5", borderColor: "#FCA5A5", color: "#991B1B" }}
                    data-testid="button-worth-it-skip"
                  >
                    👎 Skip next time
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Continue CTA */}
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
          style={{ background: "#D4872B" }}
          data-testid="button-continue-after-visit"
        >
          Ready for what's next?
        </button>
      </div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type ScreenPhase = "active" | "skip-confirm" | "visited";

export default function StopViewScreen() {
  const [, params] = useRoute("/adventure/:tripId/stop/:stopId");
  const tripId = params?.tripId ?? "";
  const stopId = params?.stopId ?? "";
  const [, setLocation] = useLocation();
  const { currentTripStops, markStopVisited, toggleStopFavorite, fetchTrip, ensureTripLoaded } = useTravel();
  const [rescuePanelOpen, setRescuePanelOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [rescueInitialAction, setRescueInitialAction] = useState<string | undefined>();
  const [busyOpen, setBusyOpen] = useState(false);
  const dontMissThis = useDontMissThis(stopId);

  useEffect(() => {
    if (tripId) ensureTripLoaded(tripId);
  }, [tripId, ensureTripLoaded]);

  const { currentDayIndex, dayGroups, trip } = useTripExecutionState(tripId);
  const [phase, setPhase] = useState<ScreenPhase>("active");
  const [markingDone, setMarkingDone] = useState(false);
  const [shortVisit, setShortVisit] = useState(false);
  const [qualityPromptOnVisit, setQualityPromptOnVisit] = useState(false);

  const stop = currentTripStops.find((s) => s.id === stopId) as EnrichedTravelStop | undefined;
  const cityName = stop?.cityGroup || trip?.city || trip?.destination || "";
  const dayStops = dayGroups[currentDayIndex] ?? [];
  const nextStop = dayStops.find(s => !s.isVisited && s.id !== stopId) ?? null;

  const routeAfterAction = () => {
    const remaining = dayStops.filter(s => !s.isVisited && s.id !== stopId);
    setLocation(remaining.length === 0
      ? `/adventure/${tripId}/end-day`
      : `/adventure/${tripId}/today`);
  };

  // ── Preserved: markStopVisited logic ─────────────────────────────────
  const handleMarkDone = async () => {
    setMarkingDone(true);
    try {
      const result = await markStopVisited(stopId);
      setQualityPromptOnVisit(!!(result as { showQualityPrompt?: boolean } | void)?.showQualityPrompt);
      setPhase("visited");
    } catch {
      toast.error("Couldn't mark stop done — please try again");
    } finally {
      setMarkingDone(false);
    }
  };

  // ── Preserved: skip uses markStopVisited (not delete) ────────────────
  const handleSkipConfirmed = async () => {
    setMarkingDone(true);
    try {
      await markStopVisited(stopId);
    } catch {
      toast.error("Couldn't skip stop — please try again");
    } finally {
      setMarkingDone(false);
      routeAfterAction();
    }
  };

  // ── Preserved: handleAddStop ─────────────────────────────────────────
  const handleAddStop = async (suggestion: { name: string; stopType: string; description?: string }) => {
    try {
      await fetch(`/api/travel/trips/${tripId}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: suggestion.name, stopType: suggestion.stopType, description: suggestion.description ?? null }),
      });
      toast.success(`${suggestion.name} added to your day`);
      fetchTrip(tripId);
    } catch {
      toast.error("Couldn't add stop — please try again");
    }
  };

  const openRescue = (action?: string) => {
    setRescueInitialAction(action);
    setRescuePanelOpen(true);
  };

  // ── Loading state ─────────────────────────────────────────────────────
  if (!stop) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="screen-stop-loading">
        <div className="text-4xl animate-bounce">🧭</div>
      </div>
    );
  }

  // ── Snapshot fields (all null-safe) ──────────────────────────────────
  const stopSnapshot = getSnapshotFromStop(stop);
  const doThisFirst = stopSnapshot?.doThisFirst
    || (stop as any).whyNow
    || `Start here — ${stop.name} is perfectly timed for right now.`;
  const hasParking = stopSnapshot?.parkingSignal === true;
  const hasRestrooms = (stopSnapshot?.restroomConfidence ?? 0) >= 60;
  const isStrollerFriendly = stopSnapshot?.strollerFriendly === true;
  const familyFitLabel = stopSnapshot?.familyFitLabel ?? null;
  const practicalHighlights = stopSnapshot?.practicalHighlights ?? [];

  const durationLabel = getDurationLabel(stop.durationMinutes, shortVisit);
  const shortDurationLabel = getDurationLabel(stop.durationMinutes, true);

  // ── Post-visit celebration phase ──────────────────────────────────────
  if (phase === "visited") {
    return (
      <VisitedCelebration
        stopName={stop.name}
        nextStop={nextStop ? { name: nextStop.name, stopType: nextStop.stopType } : null}
        tripId={tripId}
        stopId={stopId}
        showQualityPrompt={qualityPromptOnVisit}
        onContinue={routeAfterAction}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col pb-28" data-testid="screen-stop-view">
      <div className="px-4 pt-5 pb-4 max-w-lg mx-auto w-full">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setLocation(`/adventure/${tripId}/today`)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Day {currentDayIndex + 1}
          </span>
        </div>

        {/* ── Hero image ───────────────────────────────────────────── */}
        <StopHeroImage stopName={stop.name} cityName={cityName} stopType={stop.stopType} />

        {/* ── Stop identity card ───────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden mb-3"
          style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" }}
          data-testid="card-stop-identity"
        >
          <div className="px-5 py-4">
            {/* Stop name */}
            <div className="flex items-start gap-2 mb-2">
              <span className="text-xl">{getStopEmoji(stop.stopType)}</span>
              <h1
                className="text-xl font-bold text-white leading-tight"
                data-testid="text-stop-name"
              >
                {stop.name}
              </h1>
            </div>

            {/* Duration + family fit */}
            <div className="flex items-center gap-1.5 text-blue-100 text-sm mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              <span data-testid="text-duration">
                {shortVisit ? `Short visit · ${durationLabel}` : `About ${durationLabel}`}
              </span>
            </div>
            <p className="text-blue-200 text-sm" data-testid="text-family-fit">
              {familyFitLabel ?? getKidNote(stop.stopType)}
            </p>

            {/* Utility chips */}
            {(hasParking || hasRestrooms || isStrollerFriendly) && (
              <div className="flex items-center gap-2 flex-wrap mt-2.5">
                {hasParking && (
                  <span className="inline-flex items-center gap-1 bg-blue-400/30 text-blue-100 text-xs font-semibold px-2 py-0.5 rounded-full" data-testid="chip-parking">
                    <ParkingCircle className="w-3 h-3" />Parking nearby
                  </span>
                )}
                {hasRestrooms && (
                  <span className="inline-flex items-center gap-1 bg-blue-400/30 text-blue-100 text-xs font-semibold px-2 py-0.5 rounded-full" data-testid="chip-restrooms">
                    <Users className="w-3 h-3" />Restrooms
                  </span>
                )}
                {isStrollerFriendly && (
                  <span className="inline-flex items-center gap-1 bg-blue-400/30 text-blue-100 text-xs font-semibold px-2 py-0.5 rounded-full" data-testid="chip-stroller">
                    <Baby className="w-3 h-3" />Stroller OK
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Do this first ────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-4 py-3.5 mb-4"
          style={{ background: "#FFF8ED", border: "1px solid #F5E0B5" }}
          data-testid="block-do-this-first"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Lightbulb className="w-3.5 h-3.5 shrink-0" style={{ color: "#B07A2A" }} />
            <span className="text-sm font-bold" style={{ color: "#B07A2A" }}>
              Start here 👇
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#7A5010" }} data-testid="text-do-this-first">
            {doThisFirst}
          </p>
        </div>

        {/* ── Primary action ───────────────────────────────────────── */}
        <div className="mb-4" data-testid="actions-primary">
          {/* Start exploring — the only primary decision */}
          <button
            onClick={() => setLocation(`/adventure/${tripId}/handoff/${stopId}?from=stop`)}
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97] mb-3"
            style={{ background: "#1a1a2e" }}
            data-testid="button-start-exploring"
          >
            <Users className="w-4 h-4" />
            Let kids explore
          </button>

          {/* Modifiers row: short visit chip + skip link — secondary, visually lighter */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setShortVisit(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
              style={
                shortVisit
                  ? { background: "#EFF6FF", borderColor: "#3b82f6", color: "#2563eb" }
                  : { background: "#F8FAFC", borderColor: "#E2E8F0", color: "#64748b" }
              }
              data-testid="button-short-visit"
            >
              <Clock className="w-3 h-3" />
              {shortVisit ? `✓ Keep it quick (${shortDurationLabel})` : `Keep it quick (${shortDurationLabel})`}
            </button>

            {phase !== "skip-confirm" ? (
              <button
                onClick={() => setPhase("skip-confirm")}
                className="text-xs font-medium text-slate-400 underline underline-offset-2 active:text-slate-600"
                data-testid="button-skip-stop"
              >
                Skip this stop
              </button>
            ) : (
              <span className="text-xs text-red-500 font-medium">Skipping…</span>
            )}
          </div>

          {/* Skip confirm — inline, only when triggered */}
          {phase === "skip-confirm" && (
            <div
              className="mt-3 rounded-2xl px-4 py-4 space-y-2.5"
              style={{ background: "#FFF0F0", border: "1px solid #FECACA" }}
              data-testid="block-skip-confirm"
            >
              <div>
                <p className="font-bold text-slate-800 text-sm mb-0.5">Skip {stop.name}?</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The stop will be marked done and you'll continue to the next one.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSkipConfirmed}
                  disabled={markingDone}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
                  style={{ background: "#DC2626" }}
                  data-testid="button-confirm-skip"
                >
                  {markingDone ? "Skipping…" : "Yes, skip"}
                </button>
                <button
                  onClick={() => setPhase("active")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                  data-testid="button-cancel-skip"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Don't Miss This — secondary weight ───────────────────── */}
        {(() => {
          const highlights = dontMissThis?.highlights?.length
            ? dontMissThis.highlights
            : practicalHighlights.length
              ? practicalHighlights
              : null;
          if (!highlights) return null;
          return (
            <div
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 mb-4"
              data-testid="card-dont-miss"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Worth noting</p>
              </div>
              <div className="space-y-1">
                {highlights.slice(0, 2).map((h, i) => (
                  <div key={i} className="flex items-start gap-2" data-testid={`highlight-${i}`}>
                    <span className="text-slate-300 text-sm mt-0.5">·</span>
                    <p className="text-xs text-slate-600 leading-snug">{h}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Collapsed modules ────────────────────────────────────── */}
        <div
          className="rounded-2xl border border-slate-100 divide-y divide-slate-100 mb-4 overflow-hidden"
          data-testid="sections-extra"
        >
          <CollapsibleModule
            icon={<Users className="w-4 h-4" />}
            label="Kids experience"
            sub="Stories, missions, and games"
            onClick={() => setLocation(`/adventure/${tripId}/handoff/${stopId}?from=stop`)}
            testId="button-module-kids"
          />
          <CollapsibleModule
            icon={<Utensils className="w-4 h-4" />}
            label="Food nearby"
            sub="Kid-friendly spots within reach"
            onClick={() => openRescue("food")}
            testId="button-module-food"
          />
          <CollapsibleModule
            icon={<MapPin className="w-4 h-4" />}
            label="Details"
            sub="Full stop info and plan"
            onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=current`)}
            testId="button-module-details"
          />
        </div>

        {/* ── View full day ────────────────────────────────────────── */}
        <button
          onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=todays_plan&from=execution`)}
          className="w-full text-center text-sm font-semibold flex items-center justify-center gap-1 py-1"
          style={{ color: "#2563eb" }}
          data-testid="button-view-full-day"
        >
          View full day
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Sticky Mark as visited footer ────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4 shadow-lg"
        data-testid="footer-mark-visited"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleStopFavorite(stopId)}
            className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-all active:scale-[0.97]"
            style={{
              borderColor: stop?.isFavorite ? '#F59E0B' : '#E2E8F0',
              background: stop?.isFavorite ? '#FEF3C7' : '#F8FAFC',
            }}
            data-testid="button-toggle-favorite"
            title={stop?.isFavorite ? "Remove from highlights" : "Mark as a trip highlight"}
          >
            <Star className={`w-6 h-6 transition-colors ${stop?.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
          </button>
          <button
            onClick={handleMarkDone}
            disabled={markingDone || phase === "skip-confirm"}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97] disabled:opacity-60"
            style={{ background: "#D4872B" }}
            data-testid="button-mark-visited"
          >
            {markingDone
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Marking done…</>
              : "Mark as visited"}
          </button>
        </div>
      </div>

      {/* ── Floating SOS button ──────────────────────────────────────── */}
      <button
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center justify-center active:scale-95 transition-transform"
        style={{ width: 44, height: 44, borderRadius: "50%", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        aria-label="Get help"
        data-testid="button-sos-float"
      >
        <span className="text-xl leading-none">🆘</span>
      </button>

      <KeepThemBusySheet open={busyOpen} onClose={() => setBusyOpen(false)} />

      {/* ── RescuePanel (all props preserved + snapshot hints) ──────── */}
      <RescuePanel
        open={rescuePanelOpen}
        onClose={() => { setRescuePanelOpen(false); setRescueInitialAction(undefined); }}
        tripId={tripId}
        currentStopId={stopId}
        nextStopId={nextStop?.id ?? null}
        nextStopName={nextStop?.name ?? null}
        cityName={cityName}
        todayStops={dayStops as any}
        initialAction={rescueInitialAction as any}
        snapshotHints={{
          food: stopSnapshot?.foodSuggestion ?? undefined,
          break: stopSnapshot?.breakSuggestion ?? undefined,
          shorten: stopSnapshot?.shortenSuggestion ?? undefined,
        }}
        onSkipDone={() => { setRescuePanelOpen(false); routeAfterAction(); }}
        onProposalAccepted={() => { setRescuePanelOpen(false); fetchTrip(tripId); }}
        onAddStop={handleAddStop}
        onGetHelp={() => setHelpOpen(true)}
      />

      {/* ── Get Help Now overlay ─────────────────────────────────────── */}
      {(() => {
        type StayLoc = { cityName?: string; name: string; address: string; checkIn: string; checkOut: string };
        type DayOv = { startLocation?: { name: string; address: string }; endLocation?: { name: string; address: string } };
        const explicitStayLocs = (trip?.stayLocations as StayLoc[] | null | undefined) ?? null;
        const dayOvData = (trip as any)?.dayOverrides as Record<string, DayOv> | null | undefined;
        const dayOv = dayOvData?.[String(currentDayIndex)];
        const stayLocs: StayLoc[] | null = (() => {
          if (explicitStayLocs?.length) return explicitStayLocs;
          const candidates: StayLoc[] = [];
          if (dayOv?.endLocation?.address) candidates.push({ name: dayOv.endLocation.name, address: dayOv.endLocation.address, checkIn: '', checkOut: '' });
          if (dayOv?.startLocation?.address) candidates.push({ name: dayOv.startLocation.name, address: dayOv.startLocation.address, checkIn: '', checkOut: '' });
          return candidates.length ? candidates : null;
        })();
        const fbLat = stop?.latitude ? parseFloat(stop.latitude) : null;
        const fbLng = stop?.longitude ? parseFloat(stop.longitude) : null;
        return (
          <GetHelpFlow
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            cityName={cityName}
            tripDestination={trip?.destination ?? trip?.city ?? cityName}
            stayLocations={stayLocs}
            fallbackLat={fbLat}
            fallbackLng={fbLng}
          />
        );
      })()}
    </div>
  );
}

// ─── Stop hero image (unchanged) ─────────────────────────────────────────────

function StopHeroImage({ stopName, cityName, stopType }: { stopName: string; cityName: string; stopType?: string | null }) {
  const { image } = useOnDemandStopImage(stopName, cityName, stopType, null);
  if (!image) return null;
  return (
    <div className="w-full h-48 overflow-hidden rounded-2xl mb-4">
      <img src={image} alt={stopName} className="w-full h-full object-cover" data-testid="img-stop-hero" />
    </div>
  );
}
