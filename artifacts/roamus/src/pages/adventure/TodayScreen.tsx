/**
 * TodayScreen — Phase 13
 *
 * Structural overhaul:
 *   - DAY_ACTIVE and AT_STOP are now completely separate layouts
 *   - DAY_ACTIVE: "Up next" / "Get directions" (direct, 1 tap) / outlined handoff
 *   - AT_STOP: "You're here" (green) / duration / "Do this first" / "Start exploring"
 *   - Help chips moved ABOVE fold — inline row under the main card
 *   - Hero image: always reserves height (skeleton), no layout shift
 *   - Re-entry banner: shown after >30 min of inactivity
 *   - Late-awareness banner: shown when elapsed >> expected for visited stops
 *   - Between-stop transition flash: 1.5s inline flash when stop advances
 *   - "Hand it to your explorer" → outlined secondary (not competing teal)
 *   - Parking moved to small text link below primary CTA
 *
 * Preserved: resolver redirects, RescuePanel, handleAddStop.
 */

import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTravel } from "@/lib/travelContext";
import { useTripExecutionState } from "@/hooks/useTripExecutionState";
import { useQualitySignal } from "@/hooks/useQualitySignal";
import type { EnrichedTravelStop } from "@/lib/travelExecutionTypes";
import {
  Navigation, Users, ChevronRight, MapPin, Home,
  ParkingCircle, Ticket, Baby, Clock, X, Star, CloudRain,
} from "lucide-react";
import { RescuePanel } from "@/components/RescuePanel";
import { GetHelpFlow } from "@/components/GetHelpFlow";
import { useOnDemandStopImage } from "@/hooks/useOnDemandAdventureImage";
import { toast } from "sonner";
import { getSnapshotFromStop } from "@/hooks/useStopSnapshot";
import type { StopExecutionSnapshot } from "@shared/schema";
import type { TripExecutionStateEnum } from "@/lib/tripStateResolver";
import { getKidFlowState, setKidFlowState, clearKidSession, setHandoffReturn } from "@/lib/kidModeSession";
import type { KidFlowState } from "@/lib/kidModeSession";
import { getStopCategory, getMealLabel, getMealDoneLabel } from "@/lib/stopCategories";
import type { StopCategory } from "@/lib/stopCategories";
import { WeatherFixSheet } from "@/components/WeatherFixSheet";
import type { ImpactedStop, WeatherProposal, WeatherUndoInfo } from "@/components/WeatherFixSheet";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStopEmoji(stopType?: string | null): string {
  const map: Record<string, string> = {
    museum: "🏛️", nature: "🌿", beach: "🏖️", park: "🌳",
    zoo: "🐾", aquarium: "🐠", restaurant: "🍽️", landmark: "📍",
    market: "🛒", viewpoint: "🌅", garden: "🌸", playground: "🎠",
  };
  return map[stopType ?? ""] ?? "📍";
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function isIOS(): boolean {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function buildNavUrl(stop: EnrichedTravelStop, startingPoint?: string | null, cityHint?: string): string {
  const origin = startingPoint ? encodeURIComponent(startingPoint) : null;
  if (stop.latitude && stop.longitude) {
    const lat = stop.latitude;
    const lng = stop.longitude;
    const stopName = encodeURIComponent(stop.name);
    if (isIOS()) {
      const saddrPart = origin ? `&saddr=${origin}` : "";
      return `https://maps.apple.com/?daddr=${lat},${lng}&q=${stopName}&dirflg=d${saddrPart}`;
    }
    const originPart = origin ? `&origin=${origin}` : "";
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${originPart}`;
  }
  const rawQuery = cityHint ? `${stop.name}, ${cityHint}` : stop.name;
  const stopName = encodeURIComponent(rawQuery);
  if (isIOS()) {
    const saddrPart = origin ? `&saddr=${origin}` : "";
    return `https://maps.apple.com/?q=${stopName}&dirflg=d${saddrPart}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${stopName}`;
}

function buildParkingUrl(stop: EnrichedTravelStop): string {
  if (stop.latitude && stop.longitude) {
    if (isIOS()) return `https://maps.apple.com/?q=parking+near+${stop.latitude},${stop.longitude}&dirflg=d`;
    return `https://www.google.com/maps/search/?api=1&query=parking+near+${stop.latitude},${stop.longitude}`;
  }
  const query = encodeURIComponent(`parking near ${stop.name}`);
  if (isIOS()) return `https://maps.apple.com/?q=${query}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

// ─── Hero Image Slot — always reserves space, no layout shift ─────────────────

interface HeroSlotProps {
  heroImage: string | null;
  stopName: string;
}

function HeroSlot({ heroImage, stopName }: HeroSlotProps) {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [slotVisible, setSlotVisible] = useState(true);

  useEffect(() => {
    setHeroLoaded(false);
    setSlotVisible(true);
  }, [heroImage]);

  useEffect(() => {
    if (heroImage) return;
    const t = setTimeout(() => setSlotVisible(false), 3000);
    return () => clearTimeout(t);
  }, [heroImage]);

  useEffect(() => {
    if (heroImage) setSlotVisible(true);
  }, [heroImage]);

  if (!slotVisible) return null;

  return (
    <div
      className="w-full h-40 -mx-4 overflow-hidden relative"
      style={{ width: "calc(100% + 2rem)" }}
      data-testid="block-hero-image"
    >
      <div
        className={`absolute inset-0 bg-slate-100 transition-opacity duration-300 ${heroLoaded ? "opacity-0" : "opacity-100 animate-pulse"}`}
      />
      {heroImage && (
        <img
          src={heroImage}
          alt={stopName}
          className={`w-full h-full object-cover transition-opacity duration-500 ${heroLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setHeroLoaded(true)}
          data-testid="img-stop-hero"
        />
      )}
    </div>
  );
}

// ─── Day Progress Bar ─────────────────────────────────────────────────────────

function ProgressBar({ visitedCount, totalStops }: { visitedCount: number; totalStops: number }) {
  if (totalStops <= 1) return null;
  const pct = (visitedCount / totalStops) * 100;
  return (
    <div className="flex items-center gap-3 mt-1" data-testid="block-day-progress">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "#34d399" }}
        />
      </div>
      <span className="text-xs text-slate-400 shrink-0 font-medium">
        {visitedCount > 0 ? `${visitedCount}/${totalStops} done` : `${totalStops} stops today`}
      </span>
    </div>
  );
}

// ─── Help Chips — inline row, above the fold ─────────────────────────────────

interface HelpChipsProps {
  onFood: () => void;
  onBreak: () => void;
  onEasier: () => void;
  onFun?: () => void;
  showFun?: boolean;
}

function HelpChips({ onFood, onBreak, onEasier, onFun, showFun = true }: HelpChipsProps) {
  const chips = [
    { emoji: "🍔", label: "Food", onClick: onFood, testId: "chip-food" },
    { emoji: "😴", label: "Break", onClick: onBreak, testId: "chip-break" },
    { emoji: "⚡", label: "Easier", onClick: onEasier, testId: "chip-easier" },
    ...(showFun && onFun ? [{ emoji: "🎉", label: "Fun", onClick: onFun, testId: "chip-fun" }] : []),
  ];
  return (
    <div data-testid="block-help-chips">
      <p className="text-xs font-semibold text-slate-400 mb-2">What do you need right now?</p>
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
        {chips.map(c => (
          <button
            key={c.label}
            onClick={c.onClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-600 whitespace-nowrap transition-colors active:bg-slate-100 shrink-0"
            data-testid={c.testId}
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── BLUE Card — "Heading to stop" (NOT_STARTED) ─────────────────────────────

interface BlueTravelCardProps {
  stop: EnrichedTravelStop;
  allStops: EnrichedTravelStop[];
  nextStop: EnrichedTravelStop | null;
  visitedCount: number;
  totalStops: number;
  tripId: string;
  cityName?: string;
  snapshot: StopExecutionSnapshot | null;
  heroImage: string | null;
  startingPoint: string | null;
  stopCategory: StopCategory;
  onSetStartingPoint: () => void;
  onStartStop: () => void;
  onKidExplore: () => void;
  onRescue: (action?: string) => void;
  onViewFullDay: () => void;
  onSkip: () => void;
}

// ── Standalone Guess-Before-You-Get-There overlay ─────────────────────────────
// 3 questions, no story/missions — kids answer and hand back to parent.
// Separate from the in-stop kid mode flow.
interface GuessOverlayProps {
  stop: EnrichedTravelStop;
  gameContent: { guess: Array<{ question: string; options: Array<{ emoji: string; label: string }> }> };
  onDone: () => void;
}
function GuessBeforeYouArriveOverlay({ stop, gameContent, onDone }: GuessOverlayProps) {
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<"question" | "roundComplete" | "done">("question");
  const TOTAL_ROUNDS = Math.min(3, gameContent.guess.length);

  const handleAnswer = () => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setPhase("done");
    } else {
      setPhase("roundComplete");
    }
  };

  const handleNext = () => {
    setCurrentRound(r => r + 1);
    setPhase("question");
  };

  return (
    <div className="fixed inset-0 z-[70] bg-gradient-to-b from-violet-100 to-purple-50 flex flex-col" data-testid="overlay-guess-before-arrive">
      <div className="max-w-lg mx-auto w-full p-4 flex flex-col h-full">
        <header className="flex items-center justify-between mb-6 pt-2">
          <button onClick={onDone} className="p-2 rounded-full hover:bg-white/50" data-testid="button-close-guess-overlay">
            <X className="w-6 h-6 text-slate-600" />
          </button>
          <div className="text-center">
            <h1 className="font-bold text-lg text-slate-800">Guess Before You Arrive</h1>
            <p className="text-xs text-slate-400">{stop.name} · Round {currentRound + 1} of {TOTAL_ROUNDS}</p>
          </div>
          <div className="w-10" />
        </header>

        <AnimatePresence mode="wait">
          {phase === "question" && gameContent.guess[currentRound] && (
            <motion.div key={`q-${currentRound}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex-1 flex flex-col justify-center gap-6">
              <div className="text-6xl text-center">🔮</div>
              <h2 className="text-xl font-bold text-center text-slate-800">{gameContent.guess[currentRound].question}</h2>
              <p className="text-sm text-center text-slate-400">Just guessing — you'll find out when you arrive!</p>
              <div className="grid grid-cols-2 gap-4">
                {gameContent.guess[currentRound].options.map((opt, i) => (
                  <motion.button key={i} whileTap={{ scale: 0.95 }} onClick={handleAnswer}
                    className="p-6 bg-white rounded-2xl shadow-lg flex flex-col items-center gap-2"
                    data-testid={`button-guess-travel-option-${i}`}>
                    <span className="text-4xl">{opt.emoji}</span>
                    <span className="font-bold text-slate-700">{opt.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "roundComplete" && (
            <motion.div key="round-done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="text-6xl">🎯</div>
              <h2 className="text-2xl font-bold text-slate-800">Nice guess!</h2>
              <p className="text-slate-400 text-sm">You'll find out if you were right soon.</p>
              <button onClick={handleNext} className="px-8 py-4 bg-violet-500 text-white rounded-2xl font-bold text-base" data-testid="button-guess-next">
                Next question →
              </button>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div key="all-done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="text-7xl">🎉</div>
              <h2 className="text-2xl font-bold text-slate-800">All guesses in!</h2>
              <p className="text-slate-500 text-sm text-center">You'll see how close you were when you arrive at {stop.name}.</p>
              <button onClick={onDone} className="w-full max-w-xs py-4 rounded-2xl text-white font-black text-base" style={{ background: "#D4872B" }} data-testid="button-guess-done">
                Hand back to parent
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


function BlueTravelCard({
  stop, allStops, nextStop, visitedCount, totalStops, tripId, cityName,
  snapshot, heroImage, startingPoint, stopCategory, onSetStartingPoint,
  onStartStop, onKidExplore, onRescue, onViewFullDay, onSkip,
}: BlueTravelCardProps) {
  const [, setLocation] = useLocation();
  const [onTheWayOpen, setOnTheWayOpen] = useState(false);
  const [guessOverlayOpen, setGuessOverlayOpen] = useState(false);
  const [travelGameContent] = useState<{ guess: Array<{ question: string; options: Array<{ emoji: string; label: string }> }> }>({
    guess: [
      { question: `What do you think you'll see first at ${stop.name}?`, options: [{ emoji: "🌿", label: "Nature" }, { emoji: "🏛️", label: "Buildings" }] },
      { question: "Will it be busy when you arrive?", options: [{ emoji: "👫", label: "Lots of people" }, { emoji: "🤫", label: "Nice and quiet" }] },
      { question: "What's the first thing you'll do there?", options: [{ emoji: "📷", label: "Take a photo" }, { emoji: "🏃", label: "Start exploring" }] },
    ]
  });

  const travelMins = snapshot?.travelMinutes;
  const parkingTip = snapshot?.parkingSignal === true;
  const ticketNeeded = snapshot?.ticketSignal === true;
  const whyNow = snapshot?.whyPlacedHere || snapshot?.bestTimeTip || null;

  const lunchStop = allStops.find(
    s => !s.isVisited && ["restaurant", "food", "cafe", "lunch", "street_food"].includes(s.stopType ?? "")
  );

  const cityHint = cityName || stop.cityGroup || "";
  const navUrl = buildNavUrl(stop, startingPoint, cityHint);
  const parkingUrl = buildParkingUrl(stop);
  const nextStopDuration = nextStop?.durationMinutes ? formatDuration(nextStop.durationMinutes) : null;
  const stopEmoji = getStopEmoji(stop.stopType);

  // ── Meal stop blue card — simplified "go eat" flow ──────────────────────
  if (stopCategory === "meal") {
    const mealLabel = getMealLabel(stop.stopType);
    return (
      <div className="space-y-3">
        <HeroSlot heroImage={heroImage} stopName={stop.name} />
        <ProgressBar visitedCount={visitedCount} totalStops={totalStops} />
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" }}
          data-testid="card-next-stop"
        >
          <div className="px-5 py-5">
            <div className="text-blue-200 text-xs font-semibold mb-2" data-testid="label-up-next">{mealLabel}</div>
            <div className="text-white text-2xl font-bold leading-tight mb-1" data-testid="text-stop-name">{stop.name}</div>
            <div className="text-blue-200 text-sm mb-2">Take a break and enjoy</div>
            {travelMins != null && travelMins >= 2 && (
              <div className="flex items-center gap-1.5 text-blue-100 text-sm" data-testid="text-travel-mins">
                <Clock className="w-3.5 h-3.5" />
                <span>~{travelMins} min away</span>
              </div>
            )}
          </div>
          {nextStop && (
            <div className="px-5 pb-4 flex items-center gap-1.5">
              <span className="text-blue-400 text-xs">Then →</span>
              <span className="text-sm">{getStopEmoji(nextStop.stopType)}</span>
              <span className="text-blue-200 text-xs font-medium truncate" data-testid="text-next-stop-name">{nextStop.name}</span>
              {nextStopDuration && <span className="text-blue-400 text-xs shrink-0">· {nextStopDuration}</span>}
            </div>
          )}
        </div>
        <div className="space-y-2" data-testid="block-primary-ctas">
          <a href={navUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
            style={{ background: "#D4872B" }} data-testid="button-start-navigation">
            <Navigation className="w-4 h-4" />
            Get directions
          </a>
          <div className="flex items-center justify-center gap-1.5">
            {startingPoint ? (
              <>
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-400 truncate max-w-[160px]">From: {startingPoint}</span>
                <button onClick={onSetStartingPoint} className="text-xs font-semibold text-orange-500 underline shrink-0" data-testid="button-change-start">Change</button>
              </>
            ) : (
              <button onClick={onSetStartingPoint} className="flex items-center gap-1 text-xs font-semibold text-slate-400 underline" data-testid="button-set-start">
                <MapPin className="w-3 h-3" />Add starting location →
              </button>
            )}
          </div>
          <button onClick={onStartStop}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-slate-700 text-base font-bold border-2 border-slate-200 bg-white transition-all active:bg-slate-50 active:scale-[0.97]"
            data-testid="button-start-stop">
            We're here
          </button>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onSkip} className="text-xs font-semibold text-slate-400 underline py-2 transition-opacity active:opacity-70" data-testid="button-skip-stop">
            Skip this stop →
          </button>
          <button onClick={onViewFullDay} className="flex items-center gap-1 py-2 text-xs font-semibold text-slate-400 transition-opacity active:opacity-70" data-testid="button-view-full-day">
            View full day <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // ── Recovery stop blue card — "next break" flow ─────────────────────────
  if (stopCategory === "recovery") {
    return (
      <div className="space-y-3">
        <HeroSlot heroImage={heroImage} stopName={stop.name} />
        <ProgressBar visitedCount={visitedCount} totalStops={totalStops} />
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" }}
          data-testid="card-next-stop"
        >
          <div className="px-5 py-5">
            <div className="text-blue-200 text-xs font-semibold mb-2" data-testid="label-up-next">🌿 Next break</div>
            <div className="text-white text-2xl font-bold leading-tight mb-1" data-testid="text-stop-name">{stop.name}</div>
            <div className="text-blue-200 text-sm mb-2">Good place to stretch legs and reset</div>
            {travelMins != null && travelMins >= 2 && (
              <div className="flex items-center gap-1.5 text-blue-100 text-sm" data-testid="text-travel-mins">
                <Clock className="w-3.5 h-3.5" />
                <span>~{travelMins} min away</span>
              </div>
            )}
          </div>
          {nextStop && (
            <div className="px-5 pb-4 flex items-center gap-1.5">
              <span className="text-blue-400 text-xs">Then →</span>
              <span className="text-sm">{getStopEmoji(nextStop.stopType)}</span>
              <span className="text-blue-200 text-xs font-medium truncate" data-testid="text-next-stop-name">{nextStop.name}</span>
              {nextStopDuration && <span className="text-blue-400 text-xs shrink-0">· {nextStopDuration}</span>}
            </div>
          )}
        </div>
        <div className="space-y-2" data-testid="block-primary-ctas">
          <a href={navUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
            style={{ background: "#D4872B" }} data-testid="button-start-navigation">
            <Navigation className="w-4 h-4" />
            Get directions
          </a>
          <div className="flex items-center justify-center gap-1.5">
            {startingPoint ? (
              <>
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-400 truncate max-w-[160px]">From: {startingPoint}</span>
                <button onClick={onSetStartingPoint} className="text-xs font-semibold text-orange-500 underline shrink-0" data-testid="button-change-start">Change</button>
              </>
            ) : (
              <button onClick={onSetStartingPoint} className="flex items-center gap-1 text-xs font-semibold text-slate-400 underline" data-testid="button-set-start">
                <MapPin className="w-3 h-3" />Add starting location →
              </button>
            )}
          </div>
          <button onClick={onStartStop}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-slate-700 text-base font-bold border-2 border-slate-200 bg-white transition-all active:bg-slate-50 active:scale-[0.97]"
            data-testid="button-start-stop">
            We're here
          </button>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onSkip} className="text-xs font-semibold text-slate-400 underline py-2 transition-opacity active:opacity-70" data-testid="button-skip-stop">
            Skip this stop →
          </button>
          <button onClick={onViewFullDay} className="flex items-center gap-1 py-2 text-xs font-semibold text-slate-400 transition-opacity active:opacity-70" data-testid="button-view-full-day">
            View full day <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // ── Experience stop blue card — full flow ───────────────────────────────
  const cardLabel = visitedCount === 0 ? "Next stop — first stop" : "Next stop";

  return (
    <div className="space-y-3">
      <HeroSlot heroImage={heroImage} stopName={stop.name} />
      <ProgressBar visitedCount={visitedCount} totalStops={totalStops} />

      {/* ── Blue card: heading to stop ────────────────────── */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" }}
        data-testid="card-next-stop"
      >
        <div className="px-5 py-5">
          <div className="text-blue-200 text-xs font-semibold mb-2" data-testid="label-up-next">{cardLabel}</div>
          <div className="flex items-start gap-2 mb-3">
            <span className="text-2xl mt-0.5 shrink-0">{stopEmoji}</span>
            <div className="text-white text-2xl font-bold leading-tight" data-testid="text-stop-name">
              {stop.name}
            </div>
          </div>

          {travelMins != null && travelMins >= 2 && (
            <div className="flex items-center gap-1.5 text-blue-100 text-sm mb-2" data-testid="text-travel-mins">
              <Clock className="w-3.5 h-3.5" />
              <span>~{travelMins} min away</span>
            </div>
          )}

          {(ticketNeeded || parkingTip) && (
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {ticketNeeded && (
                <span className="inline-flex items-center gap-1 bg-amber-300/40 text-amber-100 text-xs font-semibold px-2 py-0.5 rounded-full" data-testid="chip-ticket">
                  <Ticket className="w-3 h-3" />Tickets needed
                </span>
              )}
              {parkingTip && (
                <span className="inline-flex items-center gap-1 bg-blue-400/30 text-blue-100 text-xs font-semibold px-2 py-0.5 rounded-full" data-testid="chip-parking">
                  <ParkingCircle className="w-3 h-3" />Parking OK
                </span>
              )}
            </div>
          )}

          {whyNow && (
            <p className="text-blue-200 text-xs leading-relaxed mb-2" data-testid="text-why-now">{whyNow}</p>
          )}

          {lunchStop ? (
            <div className="flex items-center gap-1.5" data-testid="lunch-status-planned">
              <span className="text-xs text-blue-200">🍔 Lunch:</span>
              <span className="text-xs font-semibold text-blue-100 truncate">{lunchStop.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5" data-testid="lunch-status-unplanned">
              <span className="text-xs text-blue-300">🍔 No lunch —</span>
              <button onClick={() => onRescue("food")} className="text-xs font-bold text-amber-200 underline" data-testid="button-add-lunch">
                Add one
              </button>
            </div>
          )}
        </div>

        {nextStop && (
          <div className="px-5 pb-4 flex items-center gap-1.5">
            <span className="text-blue-400 text-xs">Then →</span>
            <span className="text-sm">{getStopEmoji(nextStop.stopType)}</span>
            <span className="text-blue-200 text-xs font-medium truncate" data-testid="text-next-stop-name">{nextStop.name}</span>
            {nextStopDuration && <span className="text-blue-400 text-xs shrink-0">· {nextStopDuration}</span>}
          </div>
        )}
      </div>

      {/* ── Need help row ────────────────────────────────── */}
      <button
        onClick={() => onRescue()}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 transition-colors active:bg-slate-100"
        data-testid="button-need-help"
      >
        <span className="text-sm font-semibold text-slate-500">Need anything right now?</span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>

      {/* ── Primary CTA: Get directions (1 tap, direct link) ── */}
      <div className="space-y-2" data-testid="block-primary-ctas">
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
          style={{ background: "#D4872B" }}
          data-testid="button-start-navigation"
        >
          <Navigation className="w-4 h-4" />
          Get directions to {stop.name}
        </a>

        {/* Starting point row */}
        <div className="flex items-center justify-center gap-1.5">
          {startingPoint ? (
            <>
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-400 truncate max-w-[160px]">From: {startingPoint}</span>
              <button onClick={onSetStartingPoint} className="text-xs font-semibold text-orange-500 underline shrink-0" data-testid="button-change-start">
                Change
              </button>
            </>
          ) : (
            <button onClick={onSetStartingPoint} className="flex items-center gap-1 text-xs font-semibold text-slate-400 underline" data-testid="button-set-start">
              <MapPin className="w-3 h-3" />
              Add starting location →
            </button>
          )}
        </div>

        {parkingTip && (
          <a
            href={parkingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 py-1"
            data-testid="link-find-parking"
          >
            <ParkingCircle className="w-3.5 h-3.5" />
            Find parking nearby →
          </a>
        )}

        {/* Secondary CTA: We're here */}
        <button
          onClick={onStartStop}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-slate-700 text-base font-bold border-2 border-slate-200 bg-white transition-all active:bg-slate-50 active:scale-[0.97]"
          data-testid="button-start-stop"
        >
          We're here — start this stop
        </button>
      </div>

      {/* ── On the way? — collapsed — anticipation, not distraction ── */}
      <div data-testid="block-travel-engagement">
        <button
          onClick={() => setOnTheWayOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors bg-slate-50 border border-slate-100"
          data-testid="button-on-the-way-toggle"
        >
          <span>On the way?</span>
          <span className="text-xs text-slate-400">{onTheWayOpen ? "▲" : "▼"}</span>
        </button>
        {onTheWayOpen && (
          <div className="space-y-2 mt-2">
            {/* Listen to story preview → opens full kid mode (story → missions → games) */}
            <button
              onClick={() => {
                setKidFlowState(tripId, stop.id, { travelEngagementStarted: true });
                onKidExplore();
              }}
              className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl bg-white border border-slate-100 text-left transition-colors active:bg-slate-50 shadow-sm"
              data-testid="button-travel-listen-story"
            >
              <span className="text-xl shrink-0 mt-0.5">🎧</span>
              <div>
                <p className="text-sm font-bold text-slate-700">Get a preview of what you'll see</p>
                <p className="text-xs text-slate-400 mt-0.5">A short story about {stop.name} — builds excitement before you arrive</p>
              </div>
            </button>

            {/* Guess before you get there → standalone 3-question overlay, no missions */}
            <button
              onClick={() => {
                setKidFlowState(tripId, stop.id, { travelEngagementStarted: true });
                setGuessOverlayOpen(true);
              }}
              className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl bg-white border border-slate-100 text-left transition-colors active:bg-slate-50 shadow-sm"
              data-testid="button-travel-guess"
            >
              <span className="text-xl shrink-0 mt-0.5">🔮</span>
              <div>
                <p className="text-sm font-bold text-slate-700">Guess before you get there</p>
                <p className="text-xs text-slate-400 mt-0.5">3 quick questions about {stop.name} — see if you're right when you arrive</p>
              </div>
            </button>

            {/* Family games → GeoAdventures Kids tab */}
            <button
              onClick={() => {
                setHandoffReturn(tripId, `/adventure/${tripId}/today`);
                setLocation("/geoadventures?tab=kids&from=today");
              }}
              className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl bg-white border border-slate-100 text-left transition-colors active:bg-slate-50 shadow-sm"
              data-testid="button-travel-family-games"
            >
              <span className="text-xl shrink-0 mt-0.5">🎮</span>
              <div>
                <p className="text-sm font-bold text-slate-700">Play family games</p>
                <p className="text-xs text-slate-400 mt-0.5">Think Fast, Scavenger Hunt, GeoSpy — while you're on the road</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Standalone guess overlay — shown from blue mode only, returns to today */}
      {guessOverlayOpen && (
        <GuessBeforeYouArriveOverlay
          stop={stop}
          gameContent={travelGameContent}
          onDone={() => setGuessOverlayOpen(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-xs font-semibold text-slate-400 underline py-2 transition-opacity active:opacity-70"
          data-testid="button-skip-stop"
        >
          Skip this stop →
        </button>
        <button
          onClick={onViewFullDay}
          className="flex items-center gap-1 py-2 text-xs font-semibold text-slate-400 transition-opacity active:opacity-70"
          data-testid="button-view-full-day"
        >
          View full day
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── GREEN Card — "You're here — explore" (IN_PROGRESS) ─────────────────────

interface GreenExploreCardProps {
  stop: EnrichedTravelStop;
  allStops: EnrichedTravelStop[];
  nextStop: EnrichedTravelStop | null;
  visitedCount: number;
  totalStops: number;
  snapshot: StopExecutionSnapshot | null;
  heroImage: string | null;
  tripId: string;
  stopCategory: StopCategory;
  onKidExplore: () => void;
  onStartBreak: () => void;
  onRescue: (action?: string) => void;
  onViewFullDay: () => void;
  onMarkDone: () => void;
  onMarkDoneDirectly: () => void;
  onSkip: () => void;
}

function GreenExploreCard({
  stop, allStops, nextStop, visitedCount, totalStops,
  snapshot, heroImage, tripId, stopCategory,
  onKidExplore, onStartBreak, onRescue, onViewFullDay, onMarkDone, onMarkDoneDirectly, onSkip,
}: GreenExploreCardProps) {
  // Check if kids already started some engagement during travel (blue mode)
  const flowState = getKidFlowState(tripId, stop.id);
  const kidsDidTravelEngagement = !!(flowState.travelEngagementStarted || flowState.storyCompleted || flowState.missionCompleted || flowState.gamesCompleted);

  const doThisFirst = snapshot?.doThisFirst
    || snapshot?.whyPlacedHere
    || snapshot?.bestTimeTip
    || `Take your time — ${stop.name} is ready for you.`;

  const durationLabel = stop.durationMinutes ? formatDuration(stop.durationMinutes) : "~1h";
  const hasParking = snapshot?.parkingSignal === true;
  const hasRestrooms = (snapshot?.restroomConfidence ?? 0) >= 60;
  const isStrollerFriendly = snapshot?.strollerFriendly === true;
  const ticketNeeded = snapshot?.ticketSignal === true;

  const lunchStop = allStops.find(
    s => !s.isVisited && ["restaurant", "food", "cafe", "lunch", "street_food"].includes(s.stopType ?? "")
  );

  const nextStopDuration = nextStop?.durationMinutes ? formatDuration(nextStop.durationMinutes) : null;

  // ── Meal stop green card — "time to eat, mark done" ────────────────────
  if (stopCategory === "meal") {
    const mealLabel = getMealLabel(stop.stopType);
    const mealDoneLabel = getMealDoneLabel(stop.stopType);
    return (
      <div className="space-y-3">
        <HeroSlot heroImage={heroImage} stopName={stop.name} />
        <ProgressBar visitedCount={visitedCount} totalStops={totalStops} />
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)" }}
          data-testid="card-at-stop"
        >
          <div className="px-5 py-5">
            <div className="text-amber-100 text-xs font-semibold mb-1">{mealLabel}</div>
            <div className="text-white text-2xl font-bold leading-tight mb-1">{stop.name}</div>
            <div className="text-amber-100 text-sm">Take a break and recharge</div>
          </div>
          {nextStop && (
            <div className="px-5 pb-4 flex items-center gap-1.5">
              <span className="text-amber-300 text-xs">Then →</span>
              <span className="text-sm">{getStopEmoji(nextStop.stopType)}</span>
              <span className="text-amber-100 text-xs font-medium truncate">{nextStop.name}</span>
            </div>
          )}
        </div>
        <div className="space-y-3" data-testid="block-at-stop-ctas">
          <button
            onClick={onMarkDoneDirectly}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
            style={{ background: "#D4872B" }}
            data-testid="button-mark-meal-done"
          >
            {mealDoneLabel}
          </button>
          <button
            onClick={() => onRescue("food")}
            className="block mx-auto text-sm font-semibold text-slate-400 underline py-1 transition-opacity active:opacity-70"
            data-testid="button-find-food-else"
          >
            Find something else →
          </button>
        </div>
        <div className="flex items-center justify-end">
          <button onClick={onViewFullDay} className="flex items-center gap-1 py-2 text-xs font-semibold text-slate-400 transition-opacity active:opacity-70" data-testid="button-view-full-day-meal">
            View full day <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // ── Recovery stop green card — "let kids reset" ──────────────────────────
  if (stopCategory === "recovery") {
    return (
      <div className="space-y-3">
        <HeroSlot heroImage={heroImage} stopName={stop.name} />
        <ProgressBar visitedCount={visitedCount} totalStops={totalStops} />
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
          data-testid="card-at-stop"
        >
          <div className="px-5 py-5">
            <div className="text-green-100 text-xs font-semibold mb-1">🌿 You're here — take a break</div>
            <div className="text-white text-2xl font-bold leading-tight mb-1">{stop.name}</div>
            <div className="text-green-200 text-sm mb-2">
              {stop.durationMinutes ? `Plan for ${formatDuration(stop.durationMinutes)} here` : "Easy break stop — no rush"}
            </div>
            <div
              className="text-green-50 text-sm font-medium px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              Let kids move around and reset before the next stop
            </div>
          </div>
          {nextStop && (
            <div className="px-5 pb-4 flex items-center gap-1.5">
              <span className="text-green-400 text-xs">Then →</span>
              <span className="text-sm">{getStopEmoji(nextStop.stopType)}</span>
              <span className="text-green-100 text-xs font-medium truncate">{nextStop.name}</span>
            </div>
          )}
        </div>
        <div className="space-y-3" data-testid="block-at-stop-ctas">
          <button
            onClick={onStartBreak}
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
            style={{ background: "#D4872B" }}
            data-testid="button-start-break"
          >
            Let kids run around
          </button>
          <button
            onClick={onMarkDoneDirectly}
            className="block mx-auto text-sm font-semibold text-slate-400 underline py-1 transition-opacity active:opacity-70"
            data-testid="button-done-recovery"
          >
            Done here →
          </button>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onSkip} className="text-xs font-semibold text-slate-400 underline py-2 transition-opacity active:opacity-70" data-testid="button-skip-stop-atstop">Skip this stop →</button>
          <button onClick={onViewFullDay} className="flex items-center gap-1 py-2 text-xs font-semibold text-slate-400 transition-opacity active:opacity-70" data-testid="button-view-full-day-atstop">
            View full day <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // ── Experience stop green card — full explore flow ───────────────────────
  return (
    <div className="space-y-3">
      <HeroSlot heroImage={heroImage} stopName={stop.name} />
      <ProgressBar visitedCount={visitedCount} totalStops={totalStops} />

      {/* ── Green card: you're here ──────────────────────── */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
        data-testid="card-at-stop"
      >
        <div className="px-5 py-5">
          <div className="text-green-100 text-xs font-semibold mb-1" data-testid="label-youre-here">
            📍 You're here
          </div>
          <div className="text-white text-2xl font-bold leading-tight mb-1" data-testid="text-stop-name">
            {stop.name}
          </div>
          <div className="text-green-200 text-sm mb-3">
            Plan for {durationLabel} here
          </div>

          {/* Facility chips */}
          {(hasParking || hasRestrooms || isStrollerFriendly || ticketNeeded) && (
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {hasParking && (
                <span className="inline-flex items-center gap-1 bg-green-400/30 text-green-100 text-xs font-semibold px-2 py-0.5 rounded-full" data-testid="chip-parking-here">
                  <ParkingCircle className="w-3 h-3" />Parking OK
                </span>
              )}
              {hasRestrooms && (
                <span className="inline-flex items-center gap-1 bg-green-400/30 text-green-100 text-xs font-semibold px-2 py-0.5 rounded-full" data-testid="chip-restrooms">
                  🚻 Restrooms
                </span>
              )}
              {isStrollerFriendly && (
                <span className="inline-flex items-center gap-1 bg-green-400/30 text-green-100 text-xs font-semibold px-2 py-0.5 rounded-full" data-testid="chip-stroller">
                  <Baby className="w-3 h-3" />Stroller OK
                </span>
              )}
              {ticketNeeded && (
                <span className="inline-flex items-center gap-1 bg-amber-300/40 text-amber-100 text-xs font-semibold px-2 py-0.5 rounded-full" data-testid="chip-ticket-here">
                  <Ticket className="w-3 h-3" />Tickets needed
                </span>
              )}
            </div>
          )}

          {/* Lunch status */}
          {lunchStop ? (
            <div className="flex items-center gap-1.5" data-testid="lunch-status-planned">
              <span className="text-xs text-green-200">🍔 Lunch:</span>
              <span className="text-xs font-semibold text-green-100 truncate">{lunchStop.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5" data-testid="lunch-status-unplanned">
              <span className="text-xs text-green-300">🍔 No lunch —</span>
              <button onClick={() => onRescue("food")} className="text-xs font-bold text-amber-200 underline" data-testid="button-add-lunch">
                Add one
              </button>
            </div>
          )}
        </div>

        {nextStop && (
          <div className="px-5 pb-4 flex items-center gap-1.5">
            <span className="text-green-400 text-xs">Then →</span>
            <span className="text-sm">{getStopEmoji(nextStop.stopType)}</span>
            <span className="text-green-100 text-xs font-medium truncate">{nextStop.name}</span>
            {nextStopDuration && <span className="text-green-400 text-xs shrink-0">· {nextStopDuration}</span>}
          </div>
        )}
      </div>

      {/* ── DO THIS FIRST — above CTAs ────────────────────── */}
      <div
        className="rounded-2xl px-4 py-3.5"
        style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
        data-testid="block-do-this-first"
      >
        <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Do this first</p>
        <p className="text-slate-800 text-sm leading-relaxed font-medium" data-testid="text-do-this-first">{doThisFirst}</p>
      </div>

      {/* ── Need help row ────────────────────────────────── */}
      <button
        onClick={() => onRescue()}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 transition-colors active:bg-slate-100"
        data-testid="button-need-help-green"
      >
        <span className="text-sm font-semibold text-slate-500">Need anything right now?</span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>

      {/* ── CTAs ─────────────────────────────────────────── */}
      <div className="space-y-3" data-testid="block-at-stop-ctas">
        <button
          onClick={onKidExplore}
          className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
          style={{ background: "#D4872B" }}
          data-testid="button-start-exploring"
        >
          <Users className="w-4 h-4" />
          {kidsDidTravelEngagement ? "Continue exploring" : "Start exploring"}
        </button>

        <button
          onClick={onMarkDone}
          className="block mx-auto text-sm font-semibold text-slate-400 underline py-1 transition-opacity active:opacity-70"
          data-testid="button-mark-done"
        >
          Done here →
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-xs font-semibold text-slate-400 underline py-2 transition-opacity active:opacity-70"
          data-testid="button-skip-stop-atstop"
        >
          Skip this stop →
        </button>
        <button
          onClick={onViewFullDay}
          className="flex items-center gap-1 py-2 text-xs font-semibold text-slate-400 transition-opacity active:opacity-70"
          data-testid="button-view-full-day-atstop"
        >
          View full day
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── GREEN In-Progress Card — parent returned while kids still exploring ──────

interface GreenInProgressCardProps {
  stop: EnrichedTravelStop;
  nextStop: EnrichedTravelStop | null;
  visitedCount: number;
  totalStops: number;
  heroImage: string | null;
  kidFlowState: KidFlowState;
  kidExperienceStarted: boolean;
  stopCategory: StopCategory;
  onContinueKidMode: () => void;
  onMarkDone: () => void;
  onMarkDoneDirectly?: () => void;
  onViewDetails: () => void;
  onSkip: () => void;
  onToggleFavorite?: () => void;
}

function GreenInProgressCard({
  stop, nextStop, visitedCount, totalStops, heroImage,
  kidFlowState, kidExperienceStarted, stopCategory,
  onContinueKidMode, onMarkDone, onMarkDoneDirectly, onViewDetails, onSkip,
  onToggleFavorite,
}: GreenInProgressCardProps) {

  // ── Recovery "in progress" — kids are running around, no kid mode ─────────
  if (stopCategory === "recovery") {
    return (
      <div className="space-y-3">
        <HeroSlot heroImage={heroImage} stopName={stop.name} />
        <ProgressBar visitedCount={visitedCount} totalStops={totalStops} />
        <div
          className="rounded-3xl px-5 py-5"
          style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
          data-testid="card-recovery-in-progress"
        >
          <div className="text-green-100 text-xs font-semibold mb-1">🌿 Taking a break</div>
          <div className="text-white text-2xl font-bold leading-tight mb-1">{stop.name}</div>
          <div className="text-green-200 text-sm">Let the kids reset — no rush</div>
          {nextStop && (
            <div className="mt-4 flex items-center gap-1.5">
              <span className="text-green-400 text-xs">Then →</span>
              <span className="text-sm">{getStopEmoji(nextStop.stopType)}</span>
              <span className="text-green-100 text-xs font-medium truncate">{nextStop.name}</span>
            </div>
          )}
        </div>
        <button
          onClick={onMarkDoneDirectly ?? onMarkDone}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
          style={{ background: "#D4872B" }}
          data-testid="button-done-break"
        >
          ✅ Done here — move on
        </button>
      </div>
    );
  }

  // Whether the kid has come back with something done
  const isReturned = kidFlowState.missionCompleted || kidFlowState.storyCompleted || kidFlowState.gamesCompleted;

  // Build emotionally-specific summary with XP
  const kidSummaryItems: { label: string; xp: number }[] = [];
  if (kidFlowState.storyCompleted) kidSummaryItems.push({ label: "Listened to the story", xp: 25 });
  if (kidFlowState.missionCompleted) kidSummaryItems.push({ label: "Solved the challenges", xp: 20 });
  if (kidFlowState.gamesCompleted) kidSummaryItems.push({ label: "Played the games", xp: 10 });
  const totalXp = kidSummaryItems.reduce((sum, i) => sum + i.xp, 0);
  const hasSummary = kidSummaryItems.length > 0;

  const cardLabel = isReturned ? "🎉 Explorer back!" : "🧒 Kids are exploring";
  const cardHeadline = isReturned ? `Your explorer loved ${stop.name}` : stop.name;
  const cardSub = isReturned ? null : "Take your time here";

  return (
    <div className="space-y-3">
      <HeroSlot heroImage={heroImage} stopName={stop.name} />
      <ProgressBar visitedCount={visitedCount} totalStops={totalStops} />

      {/* ── In-progress green card ─────────────────────────── */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
        data-testid="card-kid-in-progress"
      >
        <div className="px-5 py-5">
          <div className="text-green-100 text-xs font-semibold mb-1" data-testid="label-kids-exploring">
            {cardLabel}
          </div>
          <div className="text-white text-2xl font-bold leading-tight mb-1" data-testid="text-stop-name-inprogress">
            {cardHeadline}
          </div>
          {cardSub && <div className="text-green-200 text-sm mb-2">{cardSub}</div>}

          {hasSummary && (
            <div className="mt-3 space-y-2" data-testid="block-kid-summary">
              {kidSummaryItems.map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-300 text-xs">✓</span>
                    <span className="text-green-100 text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-green-300 text-xs font-bold">+{item.xp} XP</span>
                </div>
              ))}
              {totalXp > 0 && (
                <div className="mt-2 pt-2 border-t border-green-700/40 flex items-center justify-between">
                  <span className="text-green-200 text-xs font-semibold">Total earned</span>
                  <span className="text-white text-sm font-black">+{totalXp} XP ⭐</span>
                </div>
              )}
            </div>
          )}
        </div>
        {nextStop && (
          <div className="px-5 pb-4 flex items-center gap-1.5">
            <span className="text-green-400 text-xs">Then →</span>
            <span className="text-sm">{getStopEmoji(nextStop.stopType)}</span>
            <span className="text-green-100 text-xs font-medium truncate">{nextStop.name}</span>
          </div>
        )}
      </div>

      {/* ── CTAs ─────────────────────────────────────────────── */}
      <div className="space-y-3" data-testid="block-inprogress-ctas">
        {!isReturned && (
          <button
            onClick={onContinueKidMode}
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
            style={{ background: "#D4872B" }}
            data-testid="button-continue-kid-mode"
          >
            <Users className="w-4 h-4" />
            Continue kid mode
          </button>
        )}

        <div className="flex items-center gap-3">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-all active:scale-[0.97]"
              style={{
                borderColor: stop.isFavorite ? '#F59E0B' : 'rgba(255,255,255,0.4)',
                background: stop.isFavorite ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.1)',
              }}
              data-testid="button-toggle-favorite-inprogress"
              title={stop.isFavorite ? "Remove from highlights" : "Mark as a trip highlight"}
            >
              <Star className={`w-6 h-6 ${stop.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-white/60'}`} />
            </button>
          )}
          <button
            onClick={isReturned && onMarkDoneDirectly ? onMarkDoneDirectly : onMarkDone}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
            style={{ background: isReturned ? "#D4872B" : "#6B7280" }}
            data-testid="button-mark-done-inprogress"
          >
            {isReturned ? "✅ We're done here" : "Mark as done →"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {!isReturned && (
          <button
            onClick={onViewDetails}
            className="text-xs font-semibold text-slate-400 underline py-2 transition-opacity active:opacity-70"
            data-testid="button-view-stop-details"
          >
            View stop details
          </button>
        )}
        <button
          onClick={onSkip}
          className="text-xs font-semibold text-slate-400 underline py-2 ml-auto transition-opacity active:opacity-70"
          data-testid="button-skip-inprogress"
        >
          Skip this stop
        </button>
      </div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const [, params] = useRoute("/adventure/:tripId/today");
  const tripId = params?.tripId ?? "";
  const [location, setLocation] = useLocation();
  // TodayScreen is mounted exclusively at /adventure/:tripId/today (parent-only path).
  // Kid mode routes live under /adventure/:tripId/kid/*; those never render this screen.
  const isParentMode = !location.includes("/kid/");
  const { ensureTripLoaded, fetchTrip, toggleStopFavorite } = useTravel();
  const [rescuePanelOpen, setRescuePanelOpen] = useState(false);
  const [rescueInitialAction, setRescueInitialAction] = useState<string | undefined>();
  const [helpOpen, setHelpOpen] = useState(false);
  const [markDoneOpen, setMarkDoneOpen] = useState(false);
  const [markDoneMode, setMarkDoneMode] = useState<"done" | "skip">("done");
  const [stopEngagementState, setStopEngagementState] = useState<"NOT_STARTED" | "IN_PROGRESS">("NOT_STARTED");
  const [kidExperienceStarted, setKidExperienceStarted] = useState(false);
  const [completionCard, setCompletionCard] = useState<{ stopName: string; flowState: KidFlowState; nextStopName: string | null; stopCategory: StopCategory } | null>(null);
  const [worthItState, setWorthItState] = useState<{ stopId: string; stopName: string } | null>(null);
  const [worthItAnswer, setWorthItAnswer] = useState<string | null>(null);
  const [worthItFollowup, setWorthItFollowup] = useState<string | null>(null);
  const { fireSignal } = useQualitySignal();
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // ── Starting location (per-trip, persisted in localStorage) ──────────────
  const startingPointKey = tripId ? `tripStartingPoint:${tripId}` : null;
  const [startingPoint, setStartingPoint] = useState<string | null>(() => {
    if (!tripId) return null;
    return localStorage.getItem(`tripStartingPoint:${tripId}`);
  });
  const [startingPointInput, setStartingPointInput] = useState("");
  const [startingPointDialogOpen, setStartingPointDialogOpen] = useState(false);
  const [startingPointResults, setStartingPointResults] = useState<{ name: string; address: string }[]>([]);
  const [startingPointSearching, setStartingPointSearching] = useState(false);
  const [startingPointGeoLoading, setStartingPointGeoLoading] = useState(false);

  const handleOpenSetStartingPoint = () => {
    setStartingPointInput(startingPoint ?? "");
    setStartingPointResults([]);
    setStartingPointDialogOpen(true);
  };

  const searchStartingPoint = async (query: string, autoSelect = false) => {
    if (!query.trim() || query.trim().length < 3) { setStartingPointResults([]); return; }
    setStartingPointSearching(true);
    try {
      const dest = encodeURIComponent(`${query} ${trip?.destination ?? trip?.city ?? ""}`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${dest}&format=json&limit=5&addressdetails=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "GeoQuestApp/1.0" } }
      );
      const data = await res.json();
      const mapped = (data || []).slice(0, 5).map((r: any) => ({
        name: r.name || r.display_name.split(",")[0],
        address: r.display_name,
      }));
      if (autoSelect && mapped.length > 0) {
        setStartingPointInput(mapped[0].name);
        setStartingPointResults([]);
      } else {
        setStartingPointResults(mapped);
      }
    } catch {
      setStartingPointResults([]);
    } finally {
      setStartingPointSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not available"); return; }
    setStartingPointGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en", "User-Agent": "GeoQuestApp/1.0" } }
          );
          const data = await res.json();
          const name = data?.address?.road || data?.address?.suburb || data?.display_name?.split(",")[0] || "Current location";
          const label = `${name}, ${data?.address?.city || data?.address?.town || data?.address?.village || ""}`.replace(/, $/, "");
          setStartingPointInput(label);
          if (startingPointKey) {
            localStorage.setItem(startingPointKey, label);
            setStartingPoint(label);
          }
          setStartingPointDialogOpen(false);
        } catch {
          setStartingPointInput(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setStartingPointGeoLoading(false);
        }
      },
      () => {
        setStartingPointGeoLoading(false);
        toast.error("Couldn't get location — please type your address");
      }
    );
  };

  const handleSaveStartingPoint = (val?: string) => {
    const v = (val ?? startingPointInput).trim();
    if (v && startingPointKey) {
      localStorage.setItem(startingPointKey, v);
      setStartingPoint(v);
    } else if (!v && startingPointKey) {
      localStorage.removeItem(startingPointKey);
      setStartingPoint(null);
    }
    setStartingPointDialogOpen(false);
    setStartingPointResults([]);
  };

  // ── Re-entry banner ───────────────────────────────────────
  const [showReentry, setShowReentry] = useState(false);
  useEffect(() => {
    if (!tripId) return;
    const key = `lastTodayVisit:${tripId}`;
    const last = sessionStorage.getItem(key);
    if (last) {
      const elapsed = Date.now() - parseInt(last);
      if (elapsed > 30 * 60 * 1000) {
        setShowReentry(true);
        const t = setTimeout(() => setShowReentry(false), 5000);
        return () => clearTimeout(t);
      }
    }
    sessionStorage.setItem(key, String(Date.now()));
  }, [tripId]);

  useEffect(() => {
    if (tripId) ensureTripLoaded(tripId);
  }, [tripId, ensureTripLoaded]);

  const { state, currentDay, currentDayIndex, currentStop, dayGroups, trip } =
    useTripExecutionState(tripId);

  const allDayStops = (currentDay ?? []) as EnrichedTravelStop[];

  // ── Weather state ──────────────────────────────────────────────────────────
  const [weatherBannerDismissed, setWeatherBannerDismissed] = useState(false);
  const [showWeatherFixSheet, setShowWeatherFixSheet] = useState(false);
  const [weatherCheck, setWeatherCheck] = useState<{
    isRainy: boolean;
    precipProb: number;
    impactedStops: ImpactedStop[];
  } | null>(null);
  const [weatherProposal, setWeatherProposal] = useState<WeatherProposal | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);

  // ── Weather check effect — server-authoritative (GET ?dayIndex=N) ──────────

  // Reset weather state whenever the active day changes so we don't show stale data.
  const prevDayIndexRefToday = useRef<number | null>(null);
  useEffect(() => {
    if (currentDayIndex !== prevDayIndexRefToday.current) {
      prevDayIndexRefToday.current = currentDayIndex ?? null;
      setWeatherCheck(null);
      setWeatherProposal(null);
      setWeatherBannerDismissed(false);
    }
  }, [currentDayIndex]);

  const currentDayLength = allDayStops.length;

  // ── MISSED_DAY / TRIP_ENDED safety redirect ────────────────────────────────
  // When the calendar moves past the progress day while TodayScreen is mounted,
  // redirect to the hub so MissedDayCard or TRIP_ENDED routing takes over.
  // Exception: ?from=go-back means the user explicitly chose "Go back to Day N"
  // from MissedDayCard — let them continue on their progress day's stops.
  const fromGoBack = new URLSearchParams(window.location.search).get("from") === "go-back";
  useEffect(() => {
    if (state === "TRIP_ENDED" || (state === "MISSED_DAY" && !fromGoBack)) {
      setLocation("/geoadventures");
    }
  }, [state, setLocation, fromGoBack]);

  useEffect(() => {
    if (currentDayIndex == null || weatherCheck !== null) return;
    let cancelled = false;
    fetch(`/api/travel/trips/${tripId}/weather-check?dayIndex=${currentDayIndex}`, {
      credentials: "include",
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!cancelled && d) {
          setWeatherCheck({ isRainy: d.isRainy, precipProb: d.precipProb, impactedStops: d.impactedStops ?? [] });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, currentDayIndex, currentDayLength, weatherCheck]);

  // Show banner whenever rain is forecast (>=50% precip), not only when stops are flagged
  const showWeatherBanner = !weatherBannerDismissed && weatherCheck !== null &&
    (weatherCheck.isRainy || weatherCheck.precipProb >= 50 || weatherCheck.impactedStops.length > 0);
  const firstImpactedStop = weatherCheck?.impactedStops?.[0] ?? null;

  const handleOpenWeatherFix = useCallback(async () => {
    setShowWeatherFixSheet(true);
    if (weatherProposal || proposalLoading) return;
    if (!weatherCheck?.impactedStops?.length) return;
    setProposalLoading(true);
    try {
      const res = await fetch(`/api/travel/trips/${tripId}/weather-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ impactedStops: weatherCheck.impactedStops, dayIndex: currentDayIndex ?? 0 }),
      });
      const data = res.ok ? await res.json() : null;
      setWeatherProposal(data ?? { proposalType: null, operations: null, proposal: null, reasoning: "" });
    } catch {
      setWeatherProposal({ proposalType: null, operations: null, proposal: null, reasoning: "" });
    } finally {
      setProposalLoading(false);
    }
  }, [weatherCheck, weatherProposal, proposalLoading, tripId, currentDayIndex]);

  const handleWeatherApplied = useCallback(async (_undoInfo: WeatherUndoInfo) => {
    await fetchTrip(tripId);
    setWeatherBannerDismissed(true);
  }, [fetchTrip, tripId]);

  const handleWeatherUndone = useCallback(async () => {
    await fetchTrip(tripId);
    setWeatherCheck(null);
    setWeatherProposal(null);
    setWeatherBannerDismissed(false);
  }, [fetchTrip, tripId]);

  const currentStopEnriched = currentStop as EnrichedTravelStop | null;

  const visitedCount = useMemo(
    () => allDayStops.filter(s => s.isVisited).length,
    [allDayStops]
  );
  const totalStops = allDayStops.length;

  const nextStop = useMemo(() => {
    const unvisited = allDayStops.filter(s => !s.isVisited);
    return (unvisited[1] ?? null) as EnrichedTravelStop | null;
  }, [allDayStops]);

  // ── Reset engagement state when the current stop changes ─
  const prevStopIdRef = useRef<string | null>(null);
  useEffect(() => {
    const stopId = currentStopEnriched?.id ?? null;
    if (stopId && stopId !== prevStopIdRef.current) {
      prevStopIdRef.current = stopId;
      const flowState = getKidFlowState(tripId, stopId);
      if (flowState.kidExperienceStarted) {
        setKidExperienceStarted(true);
        setStopEngagementState("IN_PROGRESS");
      } else {
        setKidExperienceStarted(false);
        setStopEngagementState("NOT_STARTED");
      }
    }
  }, [currentStopEnriched?.id, tripId]);

  // ── Between-stop transition flash ────────────────────────
  const prevVisitedCountRef = useRef<number>(visitedCount);
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visitedCount > prevVisitedCountRef.current && visitedCount > 0) {
      const lastVisited = [...allDayStops]
        .filter(s => s.isVisited)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        .at(-1);
      if (lastVisited) {
        setTransitionMsg(`✅ ${lastVisited.name} explored!`);
        const t = setTimeout(() => setTransitionMsg(null), 1500);
        return () => clearTimeout(t);
      }
    }
    prevVisitedCountRef.current = visitedCount;
  }, [visitedCount, allDayStops]);

  // ── Late awareness ────────────────────────────────────────
  const isRunningLate = useMemo(() => {
    if (!trip?.adventureStartedAt || visitedCount === 0) return false;
    const elapsed = (Date.now() - new Date(trip.adventureStartedAt as string).getTime()) / 60000;
    const visitedStops = allDayStops.filter(s => s.isVisited);
    const expectedMins = visitedStops.reduce((acc, s) => acc + (s.durationMinutes ?? 60), 0);
    const travelBuffer = visitedCount * 20;
    return elapsed > (expectedMins + travelBuffer) * 1.5;
  }, [trip?.adventureStartedAt, visitedCount, allDayStops]);

  const cityName = currentStopEnriched?.cityGroup || trip?.city || trip?.destination || "";
  const currentSnapshot = getSnapshotFromStop(currentStopEnriched);

  const { image: heroImage } = useOnDemandStopImage(
    currentStopEnriched?.name ?? "",
    cityName,
    currentStopEnriched?.stopType ?? null,
    null
  );

  // ── Resolver redirects ────────────────────────────────────
  useEffect(() => {
    if (state === "DAY_COMPLETE") {
      setLocation(`/adventure/${tripId}/end-day`);
    } else if (state === "TRIP_NOT_STARTED") {
      setLocation(`/adventure/${tripId}/parent-plan?tab=todays_plan`);
    } else if (state === "DAY_NOT_STARTED") {
      setLocation(`/adventure/${tripId}/start-day`);
    }
  }, [state, tripId, setLocation]);

  // ── Update last-visit timestamp ────────────────────────────
  useEffect(() => {
    if (tripId && (state === "DAY_ACTIVE" || state === "AT_STOP")) {
      sessionStorage.setItem(`lastTodayVisit:${tripId}`, String(Date.now()));
    }
  }, [tripId, state]);

  // ── Preserved handleAddStop ───────────────────────────────
  const handleAddStop = async (suggestion: { name: string; stopType: string; description?: string }) => {
    try {
      await fetch(`/api/travel/trips/${tripId}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: suggestion.name,
          stopType: suggestion.stopType,
          description: suggestion.description ?? null,
          displayOrder: (currentStopEnriched?.displayOrder ?? allDayStops.length) + 1,
        }),
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

  const handleKidExplore = () => {
    const sid = currentStopEnriched?.id ?? "";
    if (sid && tripId) {
      setKidFlowState(tripId, sid, { kidExperienceStarted: true });
      setKidExperienceStarted(true);
      // Set the return URL so every kid screen knows where "Hand back to parent" goes.
      setHandoffReturn(tripId, `/adventure/${tripId}/today`);
    }
    // Go directly into kid mode.
    setLocation(`/adventure/${tripId}/kid/next`);
  };

  const handleMarkDone = async () => {
    if (!currentStopEnriched?.id) return;
    const stopName = currentStopEnriched.name;
    const stopId = currentStopEnriched.id;
    const flowState = getKidFlowState(tripId, stopId);
    const mode = markDoneMode;
    try {
      const visitResp = await fetch(`/api/travel/stops/${stopId}/visit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const visitData = visitResp.ok ? await visitResp.json() : {};
      clearKidSession(tripId, stopId);
      setKidExperienceStarted(false);
      setStopEngagementState("NOT_STARTED");
      setMarkDoneOpen(false);
      if (mode === "done") {
        const sc = getStopCategory(currentStopEnriched?.stopType);
        setCompletionCard({ stopName, flowState, nextStopName: nextStop?.name ?? null, stopCategory: sc });
        // showQualityPrompt is computed server-side: true for anchor/uncertain types
        // or first time this placeId appears in quality signals (new place for the family).
        const showWorthIt = isParentMode && !!visitData.showQualityPrompt;
        setTimeout(() => {
          setCompletionCard(null);
          fetchTrip(tripId);
          if (showWorthIt) {
            setWorthItState({ stopId, stopName });
            setWorthItAnswer(null);
          }
        }, 2800);
      } else {
        fetchTrip(tripId);
      }
    } catch {
      toast.error("Couldn't mark stop — please try again");
    }
  };

  const handleMarkDoneDirectly = async () => {
    if (!currentStopEnriched?.id) return;
    const stopName = currentStopEnriched.name;
    const stopId = currentStopEnriched.id;
    const flowState = getKidFlowState(tripId, stopId);
    const sc = getStopCategory(currentStopEnriched.stopType);
    try {
      const visitResp = await fetch(`/api/travel/stops/${stopId}/visit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "done" }),
      });
      const visitData = visitResp.ok ? await visitResp.json() : {};
      clearKidSession(tripId, stopId);
      setKidExperienceStarted(false);
      setStopEngagementState("NOT_STARTED");
      setCompletionCard({ stopName, flowState, nextStopName: nextStop?.name ?? null, stopCategory: sc });
      const showWorthItD = isParentMode && !!visitData.showQualityPrompt;
      setTimeout(() => {
        setCompletionCard(null);
        fetchTrip(tripId);
        if (showWorthItD) {
          setWorthItState({ stopId, stopName });
          setWorthItAnswer(null);
        }
      }, 2800);
    } catch {
      toast.error("Couldn't mark stop — please try again");
    }
  };

  const handleStartBreak = () => {
    setKidExperienceStarted(true);
  };

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="screen-today-loading">
        <div className="text-4xl animate-bounce">🧭</div>
      </div>
    );
  }

  if (
    state === "DAY_COMPLETE" ||
    state === "DAY_NOT_STARTED" ||
    state === "TRIP_NOT_STARTED" ||
    (state === "MISSED_DAY" && !fromGoBack) ||
    state === "TRIP_ENDED"
  ) {
    return null;
  }

  const timeStr = currentTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const currentStopCategory = getStopCategory(currentStopEnriched?.stopType);

  const sharedCardProps = {
    stop: currentStopEnriched!,
    allStops: allDayStops,
    nextStop,
    visitedCount,
    totalStops,
    tripId,
    cityName: trip?.city || trip?.destination || "",
    snapshot: currentSnapshot,
    heroImage,
    startingPoint,
    stopCategory: currentStopCategory,
    onSetStartingPoint: handleOpenSetStartingPoint,
    onStartStop: () => setStopEngagementState("IN_PROGRESS"),
    onKidExplore: handleKidExplore,
    onStartBreak: handleStartBreak,
    onRescue: openRescue,
    onViewFullDay: () => setLocation(`/adventure/${tripId}/parent-plan?tab=todays_plan&from=execution`),
    onMarkDone: () => { setMarkDoneMode("done"); setMarkDoneOpen(true); },
    onMarkDoneDirectly: handleMarkDoneDirectly,
    onSkip: () => { setMarkDoneMode("skip"); setMarkDoneOpen(true); },
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="screen-today">
      <div className="flex-1 px-4 pt-5 pb-8 max-w-lg mx-auto w-full">

        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => setLocation("/geoadventures?home=1")}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-orange-500 transition-colors mb-2"
            data-testid="button-today-home"
          >
            <Home className="w-3.5 h-3.5" />
            GeoAdventures
          </button>
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Day {currentDayIndex + 1} of {dayGroups.length} · {trip.name || trip.destination}
            </div>
            <div className="text-xs font-semibold text-slate-400" data-testid="text-current-time">
              {timeStr} · Stop {visitedCount + 1} of {totalStops}
            </div>
          </div>
        </div>

        {/* ── Weather rain banner ──────────────────────────────── */}
        {showWeatherBanner && (
          <div
            className="rounded-2xl px-4 py-3.5 mb-3 flex items-start gap-3"
            style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
            data-testid="banner-weather-rain"
          >
            <CloudRain className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-blue-900 leading-tight">
                🌧 Rain expected today · {weatherCheck?.precipProb ?? 0}%
              </p>
              <p className="text-xs text-blue-700 mt-0.5 leading-snug">
                {firstImpactedStop
                  ? weatherCheck!.impactedStops.length === 1
                    ? `${firstImpactedStop.name} may not work well in the rain`
                    : `${weatherCheck!.impactedStops.length} outdoor stops affected`
                  : "Keep rain gear handy — plan adjusted if needed"}
              </p>
              {firstImpactedStop && (
                <button
                  onClick={handleOpenWeatherFix}
                  className="mt-2 text-xs font-bold text-blue-600 underline"
                  data-testid="button-weather-see-options"
                >
                  See options →
                </button>
              )}
            </div>
            <button
              onClick={() => setWeatherBannerDismissed(true)}
              className="shrink-0 p-1 -mt-0.5 text-blue-400 hover:text-blue-600"
              data-testid="button-weather-banner-dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Re-entry banner ─────────────────────────────────── */}
        {showReentry && currentStopEnriched && (
          <div
            className="mb-3 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-sm"
            style={{ background: "#FFF8ED", border: "1px solid #F5E0B5" }}
            data-testid="banner-reentry"
          >
            <span>👋</span>
            <span className="font-semibold text-slate-700">Welcome back</span>
            <span className="text-slate-500">
              {stopEngagementState === "IN_PROGRESS"
                ? `· You're at: ${currentStopEnriched.name}`
                : `· Heading to: ${currentStopEnriched.name}`}
            </span>
          </div>
        )}

        {/* ── Late-awareness banner ────────────────────────────── */}
        {isRunningLate && !transitionMsg && (
          <div
            className="mb-3 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-2"
            style={{ background: "#FFF8ED", border: "1px solid #F5E0B5" }}
            data-testid="banner-running-late"
          >
            <div className="flex items-center gap-2 text-sm">
              <span>⏱</span>
              <span className="font-semibold text-amber-800">Running a bit late — still doable</span>
            </div>
            <button
              onClick={() => openRescue("easier")}
              className="text-xs font-bold text-amber-700 underline shrink-0"
              data-testid="button-late-easier"
            >
              Make it easier
            </button>
          </div>
        )}

        {/* ── Between-stop transition flash (skip only; done uses completionCard) */}
        {transitionMsg && !completionCard && (
          <div
            className="mb-3 px-4 py-2.5 rounded-2xl text-sm font-bold text-center"
            style={{ background: "#F0FFF4", border: "1px solid #BBF7D0", color: "#166534" }}
            data-testid="banner-transition"
          >
            {transitionMsg}
          </div>
        )}

        {/* ── Completion overlay — full-screen moment before next stop ──── */}
        {completionCard && (() => {
          const isMeal = completionCard.stopCategory === "meal";
          const isRecovery = completionCard.stopCategory === "recovery";
          const bgGradient = isMeal
            ? "linear-gradient(160deg, #D97706 0%, #F59E0B 60%, #FCD34D 100%)"
            : isRecovery
              ? "linear-gradient(160deg, #059669 0%, #10b981 60%, #34d399 100%)"
              : "linear-gradient(160deg, #059669 0%, #10b981 60%, #34d399 100%)";
          const mainEmoji = isMeal ? "🍽️" : isRecovery ? "🌿" : "🎉";
          const headline = isMeal ? "Meal done!" : isRecovery ? "Nice reset!" : "Explored!";
          const subColor = isMeal ? "text-amber-100" : "text-green-100";
          const nextColor = isMeal ? "text-amber-200" : "text-green-200";
          return (
            <div
              className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
              style={{ background: bgGradient }}
              data-testid="card-completion-moment"
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {["top-12 left-8", "top-20 right-10", "top-36 left-1/4", "top-10 right-1/3",
                  "bottom-40 left-6", "bottom-32 right-8", "bottom-48 left-1/3"].map((pos, i) => (
                  <div key={i} className={`absolute w-2.5 h-2.5 rounded-full opacity-30 ${pos}`}
                    style={{ background: i % 2 === 0 ? "#fbbf24" : "#f9fafb" }} />
                ))}
              </div>
              <div className="relative">
                <div className="text-7xl mb-4" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }}>{mainEmoji}</div>
                <div className="text-white text-3xl font-black mb-1 tracking-tight">{headline}</div>
                <div className={`${subColor} text-xl font-bold mb-6`}>{completionCard.stopName}</div>

                {/* Kid XP summary — experience stops only */}
                {!isMeal && !isRecovery && (completionCard.flowState.storyCompleted || completionCard.flowState.missionCompleted || completionCard.flowState.gamesCompleted) && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-4 text-left space-y-2.5 mb-6 w-full max-w-xs mx-auto">
                    {completionCard.flowState.storyCompleted && (
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">📖</span>
                        <span className="text-green-50 text-sm font-semibold">Listened to the story</span>
                        <span className="ml-auto text-green-300 text-xs font-bold">+25 XP</span>
                      </div>
                    )}
                    {completionCard.flowState.missionCompleted && (
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🎯</span>
                        <span className="text-green-50 text-sm font-semibold">Solved the missions</span>
                        <span className="ml-auto text-green-300 text-xs font-bold">+20 XP</span>
                      </div>
                    )}
                    {completionCard.flowState.gamesCompleted && (
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🎮</span>
                        <span className="text-green-50 text-sm font-semibold">Played the games</span>
                        <span className="ml-auto text-green-300 text-xs font-bold">+10 XP</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Recharge message for meal/recovery */}
                {(isMeal || isRecovery) && (
                  <div className="mb-6 text-base font-semibold" style={{ color: isMeal ? "#fef3c7" : "#d1fae5" }}>
                    {isMeal ? "Everyone's recharged — ready to keep going" : "Kids are reset — ready for the next stop"}
                  </div>
                )}

                {/* Bridge to next stop */}
                {completionCard.nextStopName ? (
                  <div className="flex items-center gap-2 justify-center">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold"
                      style={{ background: "rgba(59,130,246,0.25)", border: "1.5px solid rgba(147,197,253,0.5)" }}>
                      <span className="text-blue-200">→</span>
                      <span className="text-blue-100">Next up:</span>
                      <span className="text-white">{completionCard.nextStopName}</span>
                    </div>
                  </div>
                ) : (
                  <div className={`${nextColor} text-sm font-semibold`}>Loading next stop…</div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Main execution content ───────────────────────────── */}
        {!completionCard && currentStopEnriched !== undefined && currentStopEnriched ? (
          stopEngagementState === "IN_PROGRESS"
            ? kidExperienceStarted
              ? (
                <GreenInProgressCard
                  stop={currentStopEnriched}
                  nextStop={sharedCardProps.nextStop}
                  visitedCount={sharedCardProps.visitedCount}
                  totalStops={sharedCardProps.totalStops}
                  heroImage={sharedCardProps.heroImage}
                  kidFlowState={getKidFlowState(tripId, currentStopEnriched.id)}
                  kidExperienceStarted={kidExperienceStarted}
                  stopCategory={currentStopCategory}
                  onContinueKidMode={sharedCardProps.onKidExplore}
                  onMarkDone={sharedCardProps.onMarkDone}
                  onMarkDoneDirectly={handleMarkDoneDirectly}
                  onViewDetails={() => setLocation(`/adventure/${tripId}/stop/${currentStopEnriched.id}`)}
                  onSkip={sharedCardProps.onSkip}
                  onToggleFavorite={() => toggleStopFavorite(currentStopEnriched.id)}
                />
              )
              : (
              <GreenExploreCard
                stop={currentStopEnriched}
                allStops={sharedCardProps.allStops}
                nextStop={sharedCardProps.nextStop}
                visitedCount={sharedCardProps.visitedCount}
                totalStops={sharedCardProps.totalStops}
                snapshot={sharedCardProps.snapshot}
                heroImage={sharedCardProps.heroImage}
                tripId={sharedCardProps.tripId}
                stopCategory={currentStopCategory}
                onKidExplore={sharedCardProps.onKidExplore}
                onStartBreak={sharedCardProps.onStartBreak}
                onRescue={sharedCardProps.onRescue}
                onViewFullDay={sharedCardProps.onViewFullDay}
                onMarkDone={sharedCardProps.onMarkDone}
                onMarkDoneDirectly={sharedCardProps.onMarkDoneDirectly}
                onSkip={sharedCardProps.onSkip}
              />
            )
            : (
              <BlueTravelCard
                stop={currentStopEnriched}
                allStops={sharedCardProps.allStops}
                nextStop={sharedCardProps.nextStop}
                visitedCount={sharedCardProps.visitedCount}
                totalStops={sharedCardProps.totalStops}
                tripId={sharedCardProps.tripId}
                cityName={sharedCardProps.cityName}
                snapshot={sharedCardProps.snapshot}
                heroImage={sharedCardProps.heroImage}
                startingPoint={sharedCardProps.startingPoint}
                stopCategory={currentStopCategory}
                onSetStartingPoint={sharedCardProps.onSetStartingPoint}
                onStartStop={sharedCardProps.onStartStop}
                onKidExplore={sharedCardProps.onKidExplore}
                onRescue={sharedCardProps.onRescue}
                onViewFullDay={sharedCardProps.onViewFullDay}
                onSkip={sharedCardProps.onSkip}
              />
            )
        ) : !completionCard ? (
          <div
            className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-8 text-center"
            data-testid="card-no-stop"
          >
            <div className="text-4xl mb-3">✅</div>
            <div className="font-bold text-slate-700 text-lg mb-1">All stops visited!</div>
            <div className="text-slate-400 text-sm mb-5">Great exploring today — let's wrap up.</div>
            <button
              onClick={() => setLocation(`/adventure/${tripId}/end-day`)}
              className="w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80"
              style={{ background: "#D4872B" }}
              data-testid="button-end-day"
            >
              See day summary →
            </button>
          </div>
        ) : null}
      </div>


      <RescuePanel
        open={rescuePanelOpen}
        onClose={() => { setRescuePanelOpen(false); setRescueInitialAction(undefined); }}
        tripId={tripId}
        currentStopId={currentStopEnriched?.id ?? null}
        nextStopId={nextStop?.id ?? null}
        nextStopName={nextStop?.name ?? null}
        cityName={cityName}
        todayStops={allDayStops}
        initialAction={rescueInitialAction as any}
        onSkipDone={() => { setRescuePanelOpen(false); fetchTrip(tripId); }}
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
        const fbLat = currentStopEnriched?.latitude ? parseFloat(currentStopEnriched.latitude) : null;
        const fbLng = currentStopEnriched?.longitude ? parseFloat(currentStopEnriched.longitude) : null;
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

      {/* ── Mark done / Skip confirm sheet ──────────────────────── */}
      {markDoneOpen && currentStopEnriched && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setMarkDoneOpen(false); }}
          data-testid="dialog-mark-done"
        >
          <div
            className="w-full rounded-t-3xl bg-white px-5 pt-4 pb-10"
            style={{ maxWidth: "512px", margin: "0 auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.14)" }}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5" />
            <div className="text-lg font-bold text-slate-800 mb-1">
              {markDoneMode === "done" ? "Mark as done?" : "Skip this stop?"}
            </div>
            <p className="text-sm text-slate-500 mb-6">
              {markDoneMode === "done"
                ? `Great exploring ${currentStopEnriched.name}! This will move you to the next stop.`
                : `${currentStopEnriched.name} will be skipped and you'll move to the next stop.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMarkDoneOpen(false)}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-slate-500 border border-slate-200"
                data-testid="button-cancel-done"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkDone}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white"
                style={{ background: "#D4872B" }}
                data-testid="button-confirm-done"
              >
                {markDoneMode === "done" ? "Mark as done ✅" : "Skip stop"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── "Worth it?" pulse — shown after stop completion, parent-only ─── */}
      {worthItState && !completionCard && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setWorthItState(null); }}
          data-testid="dialog-worth-it"
        >
          <div
            className="w-full rounded-t-3xl bg-white px-5 pt-5 pb-10"
            style={{ maxWidth: "512px", margin: "0 auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.14)" }}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4" />
            {worthItAnswer && worthItFollowup ? (
              // Step 3: both answered — show confirmation and dismiss
              <>
                <p className="text-center text-base font-bold text-slate-800 mb-1">
                  {worthItAnswer === "big_hit" ? "🏆 Big hit!" : "👎 Noted"}
                </p>
                <p className="text-center text-xs text-slate-400 mb-5">Saved. Helps tune your next trip.</p>
                <button
                  onClick={() => { setWorthItState(null); setWorthItFollowup(null); }}
                  className="w-full py-3.5 rounded-2xl text-sm font-semibold text-slate-500 border border-slate-200"
                  data-testid="button-worth-it-dismiss"
                >
                  Back to the adventure
                </button>
              </>
            ) : worthItAnswer === "good" ? (
              // "Good" has no follow-up — show confirmation immediately
              <>
                <p className="text-center text-base font-bold text-slate-800 mb-1">👍 Good stop!</p>
                <p className="text-center text-xs text-slate-400 mb-5">Saved. This helps us tune your trip.</p>
                <button
                  onClick={() => setWorthItState(null)}
                  className="w-full py-3.5 rounded-2xl text-sm font-semibold text-slate-500 border border-slate-200"
                  data-testid="button-worth-it-dismiss"
                >
                  Back to the adventure
                </button>
              </>
            ) : worthItAnswer ? (
              // Step 2: primary answered — show follow-up tags
              <>
                <p className="text-sm font-bold text-slate-700 mb-3">
                  {worthItAnswer === "big_hit" ? "What made it great?" : "What went wrong?"}
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {(worthItAnswer === "big_hit"
                    ? [
                        { val: "kids_loved_it", label: "👶 Kids loved it" },
                        { val: "hidden_gem", label: "💎 Hidden gem" },
                        { val: "would_return", label: "🔄 Would return" },
                        { val: "great_value", label: "💰 Great value" },
                      ]
                    : [
                        { val: "too_crowded", label: "👥 Too crowded" },
                        { val: "too_long", label: "⏱ Too long" },
                        { val: "not_kid_friendly", label: "🚫 Not kid-friendly" },
                        { val: "expensive", label: "💸 Expensive" },
                      ]
                  ).map(tag => (
                    <button
                      key={tag.val}
                      onClick={() => {
                        setWorthItFollowup(tag.val);
                        fireSignal(worthItState!.stopId, "worth_it_followup", { signalValue: tag.val });
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 active:scale-95 transition-all"
                      data-testid={`button-worth-it-followup-${tag.val}`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setWorthItState(null)}
                  className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  data-testid="button-worth-it-followup-skip"
                >
                  Skip
                </button>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-slate-800 mb-0.5">Was {worthItState.stopName} worth it?</p>
                <p className="text-xs text-slate-400 mb-5">Quick tap — helps us tune future trips</p>
                <div className="flex gap-2 mb-4">
                  {[
                    { val: "big_hit", label: "🏆 Big hit", bg: "#FFF9EC", border: "#F59E0B", text: "#92400E" },
                    { val: "good", label: "👍 Good", bg: "#F0FFF4", border: "#34D399", text: "#065F46" },
                    { val: "skip_next_time", label: "👎 Skip next time", bg: "#FFF5F5", border: "#FCA5A5", text: "#991B1B" },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => {
                        setWorthItAnswer(opt.val);
                        setWorthItFollowup(null);
                        fireSignal(worthItState.stopId, "worth_it", { signalValue: opt.val });
                      }}
                      className="flex-1 py-3 rounded-xl text-xs font-bold border transition-all active:scale-95"
                      style={{ background: opt.bg, borderColor: opt.border, color: opt.text }}
                      data-testid={`button-worth-it-${opt.val}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setWorthItState(null)}
                  className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  data-testid="button-worth-it-skip"
                >
                  Skip
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Starting location bottom sheet ───────────────────── */}
      {startingPointDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setStartingPointDialogOpen(false); }}
          data-testid="dialog-starting-point"
        >
          <div
            className="w-full rounded-t-3xl bg-white px-5 pt-4 pb-10 overflow-y-auto"
            style={{ maxHeight: "78vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.14)" }}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-base font-bold text-slate-800">Where are you starting from?</div>
                <p className="text-xs text-slate-400 mt-0.5">We'll add this to your directions so Maps opens correctly</p>
              </div>
              <button
                onClick={() => setStartingPointDialogOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors shrink-0 -mt-1"
                data-testid="button-close-start-sheet"
              >
                <span className="text-slate-400 text-base leading-none">✕</span>
              </button>
            </div>

            {/* ── Quick option: Current location ─── */}
            <div className="mb-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Quick options</p>
              <button
                onClick={handleUseCurrentLocation}
                disabled={startingPointGeoLoading}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50 text-left transition-all active:bg-slate-100 disabled:opacity-60"
                data-testid="button-use-current-location"
              >
                <span className="text-xl shrink-0">📍</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800">
                    {startingPointGeoLoading ? "Getting your location…" : "Use my current location"}
                  </p>
                  <p className="text-[11px] text-slate-400">Auto-detect and reverse geocode</p>
                </div>
                {startingPointGeoLoading && (
                  <div className="w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin shrink-0" />
                )}
              </button>

              {/* If there's already a saved location, show it as a quick re-select */}
              {startingPoint && (
                <button
                  onClick={() => { setStartingPointInput(startingPoint); setStartingPointResults([]); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 mt-2 text-left transition-all active:bg-orange-50"
                  style={{
                    background: startingPointInput === startingPoint ? "#FFF7ED" : "#F9FAFB",
                    borderColor: startingPointInput === startingPoint ? "#D4872B" : "#E5E7EB",
                  }}
                  data-testid="button-reuse-saved-start"
                >
                  <span className="text-xl shrink-0">🔁</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 truncate">{startingPoint}</p>
                    <p className="text-[11px] text-slate-400">Previously saved</p>
                  </div>
                  {startingPointInput === startingPoint && <span className="text-orange-500 text-sm shrink-0">✓</span>}
                </button>
              )}
            </div>

            {/* ── Search field ──────────────────── */}
            <div className="mb-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Or type an address</p>
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    autoFocus={!startingPoint}
                    type="text"
                    value={startingPointInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStartingPointInput(v);
                      const t = setTimeout(() => searchStartingPoint(v), 500);
                      return () => clearTimeout(t);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveStartingPoint(); }}
                    placeholder="Hotel name, street, landmark…"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    data-testid="input-starting-point"
                  />
                  <button
                    onClick={() => searchStartingPoint(startingPointInput, true)}
                    disabled={startingPointSearching}
                    className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-colors"
                    style={{ background: "#D4872B" }}
                    data-testid="button-lookup-start"
                  >
                    {startingPointSearching ? "…" : "Look up"}
                  </button>
                </div>

                {/* Search results dropdown */}
                {startingPointResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                    {startingPointResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setStartingPointInput(r.name);
                          setStartingPointResults([]);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-orange-50 transition-colors border-b border-slate-50 last:border-0"
                        data-testid={`start-result-${i}`}
                      >
                        <p className="text-xs font-semibold text-slate-800 truncate">{r.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{r.address}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Save / Clear ─────────────────── */}
            <div className="flex gap-3 mt-5">
              {startingPoint && (
                <button
                  onClick={() => handleSaveStartingPoint(" ")}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-slate-500 border border-slate-200"
                  data-testid="button-clear-start"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => handleSaveStartingPoint()}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white"
                style={{ background: "#D4872B" }}
                data-testid="button-save-start"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Weather Fix Sheet ─────────────────────────────────────────────── */}
      <WeatherFixSheet
        open={showWeatherFixSheet}
        onClose={() => setShowWeatherFixSheet(false)}
        tripId={tripId}
        impactedStops={weatherCheck?.impactedStops ?? []}
        proposal={weatherProposal}
        proposalLoading={proposalLoading}
        onApplied={handleWeatherApplied}
        onUndone={handleWeatherUndone}
      />
    </div>
  );
}
