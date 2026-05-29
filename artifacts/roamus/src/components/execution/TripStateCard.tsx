/**
 * TripStateCard — Phase 3
 *
 * A state-driven card system for the GeoAdventures execution shell.
 * One dominant card renders at a time, keyed to the 6 major states:
 *   Planning · Ready · Start Day · Today · At Stop · End Day
 *
 * Usage (Now tab / hub):
 *   <TripStateCardDispatcher tripId={id} onCreateTrip={fn} />
 *
 * All snapshot access is null-safe — cards degrade gracefully when
 * travel_stops.metadata is absent (pre-Phase-2 stops or failed enrichment).
 */

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Plane,
  Compass,
  MapPin,
  Clock,
  Navigation,
  Users,
  CheckCircle2,
  ChevronRight,
  Plus,
  UtensilsCrossed,
  ParkingCircle,
  Ticket,
  Baby,
  Lightbulb,
  Camera,
  Star,
  CalendarX,
  BookOpen,
  SkipForward,
} from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { useTripExecutionState } from "@/hooks/useTripExecutionState";
import { useTravel } from "@/lib/travelContext";
import { GetHelpFlow } from "@/components/GetHelpFlow";
import { getSnapshotFromStop } from "@/hooks/useStopSnapshot";
import type { EnrichedTravelStop } from "@/lib/travelExecutionTypes";
import type { StopExecutionSnapshot } from "@shared/schema";

// ─── Shared helpers ────────────────────────────────────────────────────────────

function getStopEmoji(stopType?: string | null): string {
  const map: Record<string, string> = {
    museum: "🏛️", nature: "🌿", beach: "🏖️", park: "🌳",
    zoo: "🐾", aquarium: "🐠", restaurant: "🍽️", landmark: "📍",
    market: "🛒", viewpoint: "🌅", garden: "🌸", playground: "🎠",
  };
  return map[stopType ?? ""] ?? "📍";
}

function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const days = differenceInCalendarDays(new Date(dateStr), new Date());
  return days;
}

function formatStartDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    });
  } catch {
    return "";
  }
}


function SnapshotChip({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: color + "22", color }}
    >
      {icon}
      {label}
    </div>
  );
}

// ─── 1. No-trip card ───────────────────────────────────────────────────────────

export function NoPlanCard({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <div className="flex flex-col items-center py-10 px-4 text-center" data-testid="card-no-trip">
      <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
        <Compass className="w-8 h-8 text-orange-400" />
      </div>
      <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">No Adventure Yet</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-5 max-w-xs">
        Build your first family adventure to see live trip status here.
      </p>
      <button
        onClick={onCreateTrip}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-full text-sm shadow transition-colors"
        data-testid="button-create-trip"
      >
        <Plus className="w-4 h-4" />
        Create an Adventure
      </button>
    </div>
  );
}

// ─── 2. Planning card (TRIP_NOT_STARTED, starts in >2 days) ──────────────────

interface PlanningCardProps {
  tripId: string;
  tripName: string;
  destination: string;
  startDate: string | null | undefined;
  daysUntil: number;
}

export function PlanningCard({
  tripId, tripName, destination, startDate, daysUntil,
}: PlanningCardProps) {
  const [, setLocation] = useLocation();
  return (
    <div
      className="rounded-2xl border border-amber-200 dark:border-amber-700/50 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)" }}
      data-testid="card-planning"
    >
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center shrink-0">
            <Plane className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs font-semibold text-amber-600">Upcoming trip</p>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mt-2 leading-tight" data-testid="text-trip-name">
          {tripName || destination}
        </h3>
        {startDate ? (
          <p className="text-sm text-slate-600 mt-0.5" data-testid="text-trip-date">
            {formatStartDate(startDate)}
            {daysUntil > 0 && (
              <span className="ml-1.5 font-semibold text-amber-700">· {daysUntil} days away</span>
            )}
          </p>
        ) : (
          <p className="text-xs text-slate-400 mt-1" data-testid="text-trip-no-date">No date set yet</p>
        )}
        <p className="text-xs text-slate-400 mt-2" data-testid="text-plan-insight">
          Review your plan before you go.
        </p>
      </div>
      <div className="px-4 pb-4 space-y-2.5">
        <button
          onClick={() => setLocation(`/adventure/${tripId}/parent-plan`)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-opacity active:opacity-80"
          style={{ background: "#D4872B" }}
          data-testid="button-view-plan"
        >
          View Trip Plan
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=trip_plan`)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-amber-700 border border-amber-200 transition-colors hover:bg-amber-50"
          data-testid="button-improve-plan"
        >
          Improve Plan
        </button>
      </div>
    </div>
  );
}

// ─── 3. Ready card (TRIP_NOT_STARTED, starts in ≤2 days) ─────────────────────

interface ReadyCardProps {
  tripId: string;
  tripName: string;
  destination: string;
  daysUntil: number;
  firstStopName: string | null;
  ticketSignal: boolean | undefined;
}

export function ReadyCard({
  tripId, tripName, destination, daysUntil, firstStopName, ticketSignal,
}: ReadyCardProps) {
  const [, setLocation] = useLocation();
  const label = daysUntil <= 0 ? "Trip starts today!" : `Trip starts in ${daysUntil} ${daysUntil === 1 ? "day" : "days"}`;
  return (
    <div
      className="rounded-2xl overflow-hidden border border-green-200 dark:border-green-700/40"
      style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" }}
      data-testid="card-ready"
    >
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 bg-green-400/20 rounded-lg flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider">{label}</p>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mt-2 leading-tight" data-testid="text-trip-name-ready">
          {tripName || destination}
        </h3>
        <div className="mt-3 space-y-1.5">
          {firstStopName && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span>First stop: <span className="font-semibold text-slate-800">{firstStopName}</span></span>
            </div>
          )}
          {ticketSignal === true && (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Ticket className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Tickets may be needed — check your wallet</span>
            </div>
          )}
        </div>
      </div>
      <div className="px-4 pb-4 space-y-2.5">
        <button
          onClick={() => setLocation(`/adventure/${tripId}/parent-plan`)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-opacity active:opacity-80"
          style={{ background: "#16a34a" }}
          data-testid="button-get-ready"
        >
          Get Ready
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=trip_plan`)}
          className="w-full py-3 rounded-xl text-sm font-semibold text-green-700 border border-green-200 transition-colors hover:bg-green-50"
          data-testid="button-adjust-plan-ready"
        >
          Adjust Plan
        </button>
      </div>
    </div>
  );
}

// ─── 4. Start Day card (DAY_NOT_STARTED) ─────────────────────────────────────

interface StartDayCardProps {
  tripId: string;
  tripName: string;
  dayNumber: number;
  totalDays: number;
  stopCount: number;
  totalHours: string;
  hasLunch: boolean;
  firstStop: EnrichedTravelStop | null;
  snapshot: StopExecutionSnapshot | null;
}

export function StartDayCard({
  tripId, tripName, dayNumber, totalDays, stopCount, totalHours,
  hasLunch, firstStop, snapshot,
}: StartDayCardProps) {
  const [, setLocation] = useLocation();
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white" data-testid="card-start-day">
      <div className="px-5 pt-5 pb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
          Day {dayNumber} of {totalDays}
        </p>
        <h3 className="text-xl font-bold text-slate-900 leading-tight" data-testid="text-start-day-title">
          {tripName}
        </h3>

        {/* Day stats row */}
        <div className="flex items-center gap-3 flex-wrap mt-2.5 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />{stopCount} stop{stopCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />~{totalHours}
          </span>
          {hasLunch ? (
            <span className="flex items-center gap-1 text-green-600 font-semibold">
              <UtensilsCrossed className="w-3 h-3" />Lunch included
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500">
              <UtensilsCrossed className="w-3 h-3" />No lunch stop
            </span>
          )}
        </div>

        {/* First stop preview */}
        {firstStop && (
          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">First stop</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base">{getStopEmoji(firstStop.stopType)}</span>
              <span className="font-semibold text-slate-800 text-sm" data-testid="text-first-stop-name">
                {firstStop.name}
              </span>
              {snapshot?.familyFitLabel && (
                <span className="text-xs text-slate-500 italic">{snapshot.familyFitLabel}</span>
              )}
            </div>
            {snapshot?.bestTimeTip && (
              <div className="flex items-start gap-1.5 mt-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-snug">{snapshot.bestTimeTip}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="px-4 pb-4 pt-1 space-y-2.5">
        <button
          onClick={() => setLocation(`/adventure/${tripId}/start-day`)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-bold transition-opacity active:opacity-80"
          style={{ background: "#D4872B" }}
          data-testid="button-go-to-start-day"
        >
          Start Day
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setLocation(`/adventure/${tripId}/parent-plan`)}
          className="w-full py-3 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors hover:bg-slate-50"
          data-testid="button-adjust-plan-startday"
        >
          Adjust Plan
        </button>
      </div>
    </div>
  );
}

// ─── 5. Today card (DAY_ACTIVE) ──────────────────────────────────────────────

interface TodayCardProps {
  tripId: string;
  tripName: string;
  dayNumber: number;
  currentStop: EnrichedTravelStop | null;
  nextStop: EnrichedTravelStop | null;
  allDayStops: EnrichedTravelStop[];
  snapshot: StopExecutionSnapshot | null;
  onNeedHelp?: () => void;
}

export function TodayCard({
  tripId, tripName, dayNumber, currentStop, nextStop, allDayStops, snapshot, onNeedHelp,
}: TodayCardProps) {
  const [, setLocation] = useLocation();

  const visitedCount = allDayStops.filter(s => s.isVisited).length;
  const totalStops = allDayStops.length;
  const progressPct = totalStops > 0 ? (visitedCount / totalStops) * 100 : 0;
  const isFirstStop = visitedCount === 0;
  const stopLabel = isFirstStop ? "First stop" : `Stop ${visitedCount + 1} of ${totalStops}`;

  const googleMapsUrl = currentStop
    ? currentStop.latitude && currentStop.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${currentStop.latitude},${currentStop.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentStop.name)}`
    : null;

  const travelMins = snapshot?.travelMinutes;
  const hasParkingSignal = snapshot?.parkingSignal === true;
  const hasTicketSignal = snapshot?.ticketSignal === true;

  const lunchStop = allDayStops.find(
    s => !s.isVisited && ["restaurant", "food", "cafe", "lunch", "street_food"].includes(s.stopType ?? "")
  );

  if (!currentStop) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center" data-testid="card-all-done">
        <div className="text-3xl mb-2">✅</div>
        <p className="font-semibold text-slate-700 mb-3">All stops visited!</p>
        <button
          onClick={() => setLocation(`/adventure/${tripId}/end-day`)}
          className="w-full py-3 rounded-xl text-white text-sm font-bold"
          style={{ background: "#D4872B" }}
          data-testid="button-see-summary"
        >
          See Day Summary
        </button>
      </div>
    );
  }

  return (
    <div data-testid="card-today">
      {/* Next stop primary card */}
      <div
        className="rounded-2xl overflow-hidden mb-3"
        style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" }}
        data-testid="card-next-stop-hub"
      >
        <div className="px-5 py-4">
          <p className="text-blue-200 text-xs font-semibold mb-1">Day {dayNumber} · {stopLabel}</p>
          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-white mt-0.5 shrink-0" />
            <div
              className="text-white text-2xl font-bold leading-tight"
              data-testid="text-current-stop-name"
            >
              {currentStop.name}
            </div>
          </div>
          {travelMins !== undefined && travelMins !== null && travelMins >= 5 && (
            <div className="flex items-center gap-1.5 mt-2 text-blue-100 text-sm">
              <Clock className="w-3.5 h-3.5" />
              <span>~{travelMins} min away</span>
            </div>
          )}
          {/* Snapshot utility chips */}
          {(hasParkingSignal || hasTicketSignal) && (
            <div className="flex items-center gap-2 flex-wrap mt-2.5">
              {hasParkingSignal && (
                <SnapshotChip
                  icon={<ParkingCircle className="w-3 h-3" />}
                  label="Parking OK"
                  color="#60a5fa"
                />
              )}
              {hasTicketSignal && (
                <SnapshotChip
                  icon={<Ticket className="w-3 h-3" />}
                  label="Tickets needed"
                  color="#fbbf24"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Day progress bar */}
      {totalStops > 1 && (
        <div className="flex items-center gap-2.5 mb-3" data-testid="block-hub-progress">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: "#34d399" }}
            />
          </div>
          <span className="text-xs text-slate-400 shrink-0 font-medium">
            {visitedCount > 0 ? `${visitedCount}/${totalStops}` : `${totalStops} stops`}
          </span>
        </div>
      )}

      {/* Lunch status */}
      {lunchStop ? (
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl mb-3"
          style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
          data-testid="lunch-planned"
        >
          <span>🍽️</span>
          <span className="text-xs font-semibold text-green-700">Lunch: </span>
          <span className="text-xs font-bold text-green-900 truncate">{lunchStop.name}</span>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl mb-3"
          style={{ background: "#fff5f5", border: "1px solid #fed7d7" }}
          data-testid="lunch-not-planned"
        >
          <span>🍽️</span>
          <span className="text-xs font-semibold text-red-500 flex-1">No lunch stop planned</span>
        </div>
      )}

      {/* Need anything right now? */}
      {onNeedHelp && (
        <button
          onClick={onNeedHelp}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 transition-colors active:bg-slate-100 mb-2.5"
          data-testid="button-hub-need-help"
        >
          <span className="text-sm font-semibold text-slate-500">Need anything right now?</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      )}

      {/* Primary CTA */}
      {googleMapsUrl && (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white text-sm font-bold mb-2.5 transition-opacity active:opacity-80"
          style={{ background: "#D4872B" }}
          data-testid="button-hub-navigate"
        >
          <Navigation className="w-4 h-4" />
          Start Navigation
        </a>
      )}

      {/* Kids CTA — secondary style */}
      <button
        onClick={() => setLocation(`/adventure/${tripId}/kid/next`)}
        className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl text-slate-700 text-sm font-bold mb-2.5 border-2 border-slate-200 bg-white transition-all active:bg-slate-50 active:scale-[0.97]"
        data-testid="button-hub-kids"
      >
        <Users className="w-4 h-4" />
        Let Kids Explore
      </button>

      {/* View full screen + need help */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=todays_plan`)}
          className="text-sm font-semibold flex items-center gap-0.5"
          style={{ color: "#D4872B" }}
          data-testid="button-hub-full-day"
        >
          View full day
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        {nextStop && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            {getStopEmoji(nextStop.stopType)}
            <span>Up next: {nextStop.name}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 6. At Stop card (AT_STOP) ────────────────────────────────────────────────

interface AtStopCardProps {
  tripId: string;
  dayNumber: number;
  stop: EnrichedTravelStop;
  snapshot: StopExecutionSnapshot | null;
}

export function AtStopCard({ tripId, dayNumber, stop, snapshot }: AtStopCardProps) {
  const [, setLocation] = useLocation();
  const durationLabel = stop.durationMinutes
    ? stop.durationMinutes < 60
      ? `${stop.durationMinutes}min`
      : `${Math.round(stop.durationMinutes / 60 * 10) / 10}h`.replace(/\.0h/, "h")
    : "~1h";

  const doThisFirst = snapshot?.doThisFirst
    || (stop as any).whyNow
    || `Start exploring — ${stop.name} is ready for you.`;

  const hasParking = snapshot?.parkingSignal === true;
  const hasRestrooms = snapshot?.restroomConfidence !== undefined && (snapshot.restroomConfidence ?? 0) >= 60;
  const isStrollerFriendly = snapshot?.strollerFriendly === true;
  const familyFitLabel = snapshot?.familyFitLabel;

  return (
    <div data-testid="card-at-stop">
      {/* Stop header */}
      <div className="mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
          Day {dayNumber} · At stop
        </p>
        <h3
          className="text-2xl font-bold text-slate-900 leading-tight"
          data-testid="text-at-stop-name"
        >
          {stop.name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className="text-sm text-slate-500">{durationLabel}</span>
          {familyFitLabel && (
            <span className="text-xs text-slate-500 italic">· {familyFitLabel}</span>
          )}
        </div>
      </div>

      {/* Duration + utility chips */}
      <div
        className="rounded-2xl px-4 py-3.5 mb-3"
        style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" }}
        data-testid="card-at-stop-duration"
      >
        <div className="flex items-center gap-2 text-white mb-1.5">
          <Clock className="w-4 h-4 text-blue-200" />
          <span className="text-lg font-bold">{durationLabel}</span>
        </div>
        {(hasParking || hasRestrooms || isStrollerFriendly) && (
          <div className="flex items-center gap-2 flex-wrap">
            {hasParking && (
              <SnapshotChip icon={<ParkingCircle className="w-3 h-3" />} label="Parking OK" color="#93c5fd" />
            )}
            {hasRestrooms && (
              <SnapshotChip icon={<Users className="w-3 h-3" />} label="Restrooms" color="#93c5fd" />
            )}
            {isStrollerFriendly && (
              <SnapshotChip icon={<Baby className="w-3 h-3" />} label="Stroller OK" color="#93c5fd" />
            )}
          </div>
        )}
      </div>

      {/* Do this first */}
      <div
        className="rounded-2xl px-4 py-3.5 mb-3"
        style={{ background: "#FFF8ED", border: "1px solid #F5E0B5" }}
        data-testid="block-do-this-first"
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Lightbulb className="w-3.5 h-3.5 shrink-0" style={{ color: "#B07A2A" }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#B07A2A" }}>
            Do this first
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#7A5010" }} data-testid="text-do-this-first">
          {doThisFirst}
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2.5 mb-3">
        <button
          onClick={() => setLocation(`/adventure/${tripId}/kid/next`)}
          className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white text-sm font-bold transition-opacity active:opacity-80"
          style={{ background: "#1a1a2e" }}
          data-testid="button-start-exploring"
        >
          <Users className="w-4 h-4" />
          Start Exploring
        </button>
        <button
          onClick={() => setLocation(`/adventure/${tripId}/stop/${stop.id}`)}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          data-testid="button-full-stop-view"
        >
          See stop details →
        </button>
      </div>
    </div>
  );
}

// ─── 7. End Day card (DAY_COMPLETE) ──────────────────────────────────────────

interface EndDayCardProps {
  tripId: string;
  dayNumber: number;
  stopsExplored: number;
  totalHours: string;
  momentsCount: number;
  hasMoreDays: boolean;
  nextDayFirstStopName: string | null;
}

export function EndDayCard({
  tripId, dayNumber, stopsExplored, totalHours, momentsCount,
  hasMoreDays, nextDayFirstStopName,
}: EndDayCardProps) {
  const [, setLocation] = useLocation();
  return (
    <div
      className="rounded-2xl overflow-hidden border border-blue-200 dark:border-blue-700/40"
      style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" }}
      data-testid="card-end-day"
    >
      <div className="px-5 pt-5 pb-3 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <p className="text-lg font-bold text-slate-900 mb-0.5">
          {hasMoreDays ? "Great day!" : "Adventure complete!"}
        </p>
        <p className="text-xs text-slate-500 mb-2">
          {stopsExplored} {stopsExplored === 1 ? "place" : "places"} explored together
        </p>
        {hasMoreDays && nextDayFirstStopName && (
          <div className="mt-2 rounded-xl bg-white/60 px-3 py-2">
            <p className="text-xs text-slate-500">Tomorrow starts at</p>
            <p className="text-sm font-bold text-slate-800">{nextDayFirstStopName}</p>
          </div>
        )}
      </div>
      <div className="px-4 pb-4 pt-1 space-y-2.5">
        {hasMoreDays ? (
          <button
            onClick={() => setLocation(`/adventure/${tripId}/end-day`)}
            className="w-full py-3 rounded-xl text-white text-sm font-bold transition-opacity active:opacity-80"
            style={{ background: "#D4872B" }}
            data-testid="button-preview-tomorrow"
          >
            Preview tomorrow
          </button>
        ) : (
          <button
            onClick={() => setLocation(`/adventure/${tripId}/end-day`)}
            className="w-full py-3 rounded-xl text-white text-sm font-bold transition-opacity active:opacity-80"
            style={{ background: "#D4872B" }}
            data-testid="button-see-full-adventure"
          >
            See your full adventure
          </button>
        )}
        <button
          onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=memories`)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-blue-700 border border-blue-200 transition-colors hover:bg-blue-50"
          data-testid="button-view-memories"
        >
          <Camera className="w-4 h-4" />
          View memories
        </button>
      </div>
    </div>
  );
}

// ─── 8. Missed Day card (MISSED_DAY) ─────────────────────────────────────────

interface MissedDayCardProps {
  tripId: string;
  tripName: string;
  missedDayCount: number;
  calendarDayIndex: number;
  dayGroups: import("@shared/schema").TravelStop[][];
  onSkipToToday: () => void;
  isSkipping: boolean;
}

export function MissedDayCard({
  tripId, tripName, missedDayCount, calendarDayIndex, dayGroups,
  onSkipToToday, isSkipping,
}: MissedDayCardProps) {
  const [, setLocation] = useLocation();
  const progressDayIndex = calendarDayIndex - missedDayCount;
  const stopsToSkip = dayGroups
    .slice(progressDayIndex, calendarDayIndex)
    .flat()
    .filter((s) => !s.isVisited && !s.isSkipped).length;

  const dayLabel = missedDayCount === 1 ? "1 day" : `${missedDayCount} days`;
  const todayDayNumber = calendarDayIndex + 1;
  const backDayNumber = progressDayIndex + 1;

  // "Go back to Day N" routes to the missed day's normal execution screen:
  //   - Some stops visited on progress day → /today (day is in progress)
  //   - No stops visited → /start-day (day has not been kicked off)
  // The ?from=go-back param suppresses TodayScreen's MISSED_DAY safety redirect
  // so the user can continue exploring their progress day's stops.
  const progressDayStops = dayGroups[progressDayIndex] ?? [];
  const hasProgressOnDay = progressDayStops.some((s) => s.isVisited);
  const goBackRoute = hasProgressOnDay
    ? `/adventure/${tripId}/today?from=go-back`
    : `/adventure/${tripId}/start-day`;

  return (
    <div
      className="rounded-2xl overflow-hidden border border-amber-200"
      style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" }}
      data-testid="card-missed-day"
    >
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <CalendarX className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Away for {dayLabel}</p>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{tripName}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          Looks like you were away for {dayLabel}. No worries — your adventure is still here.
        </p>

        {stopsToSkip > 0 && (
          <div
            className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-1"
            style={{ background: "#FFF8ED", border: "1px solid #F5E0B5" }}
            data-testid="block-missed-stops"
          >
            <SkipForward className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              {stopsToSkip} {stopsToSkip === 1 ? "stop" : "stops"} from missed {missedDayCount === 1 ? "day" : "days"} will be marked as skipped
            </p>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 space-y-2.5">
        <button
          onClick={onSkipToToday}
          disabled={isSkipping}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-bold transition-opacity active:opacity-80 disabled:opacity-60"
          style={{ background: "#D4872B" }}
          data-testid="button-continue-from-today"
        >
          {isSkipping ? (
            <>
              <Compass className="w-4 h-4 animate-spin" />
              Catching up…
            </>
          ) : (
            <>
              Continue from Day {todayDayNumber}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
        <button
          onClick={() => setLocation(goBackRoute)}
          className="w-full py-3 rounded-xl text-sm font-semibold text-amber-700 border border-amber-200 transition-colors hover:bg-amber-50"
          data-testid="button-go-back-to-day"
        >
          Go back to Day {backDayNumber}
        </button>
      </div>
    </div>
  );
}

// ─── 9. Trip Ended card (TRIP_ENDED) ─────────────────────────────────────────

interface TripEndedCardProps {
  tripId: string;
  tripName: string;
  calendarDayIndex: number;
  totalDays: number;
}

export function TripEndedCard({
  tripId, tripName, calendarDayIndex, totalDays,
}: TripEndedCardProps) {
  const [, setLocation] = useLocation();
  const daysAgo = calendarDayIndex - totalDays + 1;
  const daysAgoLabel = daysAgo <= 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`;

  return (
    <div
      className="rounded-2xl overflow-hidden border border-purple-200"
      style={{ background: "linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)" }}
      data-testid="card-trip-ended"
    >
      <div className="px-5 pt-5 pb-4 text-center">
        <div className="text-5xl mb-3">✈️</div>
        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
          Trip ended {daysAgoLabel}
        </p>
        <h3
          className="text-xl font-bold text-slate-900 leading-tight mb-2"
          data-testid="text-trip-ended-name"
        >
          {tripName}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
          Your {totalDays}-day adventure is complete. Time to look back on everything you explored together.
        </p>
      </div>
      <div className="px-4 pb-5 space-y-2.5">
        <button
          onClick={() => setLocation(`/adventure/${tripId}/end-trip`)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-bold transition-opacity active:opacity-80"
          style={{ background: "#D4872B" }}
          data-testid="button-view-story-ended"
        >
          <BookOpen className="w-4 h-4" />
          View your story →
        </button>
        <button
          onClick={async () => {
            try {
              await fetch(`/api/travel/trips/${tripId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "completed" }),
                credentials: "include",
              });
              setLocation(`/adventure/${tripId}/end-trip`);
            } catch {
              setLocation(`/adventure/${tripId}/end-trip`);
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-purple-700 border border-purple-200 transition-colors hover:bg-purple-50"
          data-testid="button-mark-trip-done"
        >
          <CheckCircle2 className="w-4 h-4" />
          Mark trip done
        </button>
      </div>
    </div>
  );
}

// ─── Master dispatcher ─────────────────────────────────────────────────────────

interface TripStateCardDispatcherProps {
  tripId?: string | null;
  onCreateTrip: () => void;
}

export function TripStateCardDispatcher({
  tripId,
  onCreateTrip,
}: TripStateCardDispatcherProps) {
  const execState = useTripExecutionState(tripId ?? undefined);
  const { isLoading, currentTripMoments } = useTravel();
  const [helpOpen, setHelpOpen] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  type StayLoc = { cityName?: string; name: string; address: string; checkIn: string; checkOut: string };
  const trip = (execState as any).trip;
  const currentStop = (execState as any).currentStop;
  const helpCityName: string = trip?.city || trip?.destination || "";
  const helpStayLocs: StayLoc[] | null = (trip?.stayLocations as StayLoc[] | null) ?? null;
  const helpFallbackLat: number | null = currentStop?.latitude ? parseFloat(currentStop.latitude) : null;
  const helpFallbackLng: number | null = currentStop?.longitude ? parseFloat(currentStop.longitude) : null;

  const totalStops = useMemo(
    () => execState.dayGroups?.reduce((acc, day) => acc + day.length, 0) ?? 0,
    [execState.dayGroups]
  );

  const totalDays = execState.dayGroups?.length ?? 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400" data-testid="card-loading">
        <Compass className="w-8 h-8 animate-spin mb-3 text-orange-400" />
        <p className="text-sm">Loading your adventure…</p>
      </div>
    );
  }

  // ── Orientation badge ─────────────────────────────────────────────────────
  // Shown in DAY_ACTIVE, AT_STOP, DAY_NOT_STARTED, DAY_COMPLETE states
  const dayBadge = execState.dayBadge;

  // ── Skip-to-today handler (MISSED_DAY) ────────────────────────────────────
  // Calls skip-day once per missed day (single-day contract per endpoint spec).
  // Skips from the progress day up to (but not including) the calendar day.
  const handleSkipToToday = async () => {
    if (!tripId || isSkipping) return;
    setIsSkipping(true);
    try {
      const progressDayIndex = execState.calendarDayIndex - execState.missedDayCount;
      const lastDayToSkip = execState.calendarDayIndex - 1;
      for (let d = progressDayIndex; d <= lastDayToSkip; d++) {
        const res = await fetch(`/api/travel/trips/${tripId}/skip-day`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dayIndex: d }),
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error(`[skip-day] day ${d} failed:`, body);
          setIsSkipping(false);
          return;
        }
      }
      // Reload so travelContext re-fetches stops with updated isSkipped flags
      window.location.reload();
    } catch (err) {
      console.error("[skip-day] network error:", err);
      setIsSkipping(false);
    }
  };

  // ── NO_TRIP ───────────────────────────────────────────────────────────────
  if (execState.state === "NO_TRIP" || !tripId) {
    return <NoPlanCard onCreateTrip={onCreateTrip} />;
  }

  // ── MISSED_DAY ────────────────────────────────────────────────────────────
  if (execState.state === "MISSED_DAY" && execState.trip) {
    const trip = execState.trip;
    return (
      <MissedDayCard
        tripId={trip.id}
        tripName={trip.name || trip.destination || ""}
        missedDayCount={execState.missedDayCount}
        calendarDayIndex={execState.calendarDayIndex}
        dayGroups={execState.dayGroups}
        onSkipToToday={handleSkipToToday}
        isSkipping={isSkipping}
      />
    );
  }

  // ── TRIP_ENDED ────────────────────────────────────────────────────────────
  if (execState.state === "TRIP_ENDED" && execState.trip) {
    const trip = execState.trip;
    const totalDays = execState.dayGroups?.length ?? 1;
    return (
      <TripEndedCard
        tripId={trip.id}
        tripName={trip.name || trip.destination || ""}
        calendarDayIndex={execState.calendarDayIndex}
        totalDays={totalDays}
      />
    );
  }

  // ── TRIP_NOT_STARTED ──────────────────────────────────────────────────────
  if (execState.state === "TRIP_NOT_STARTED" && execState.trip) {
    const trip = execState.trip;
    const daysUntil = getDaysUntil(trip.startDate as string | null) ?? 0;
    const firstStop = execState.dayGroups?.[0]?.[0] ?? null;
    const firstStopSnapshot = firstStop ? getSnapshotFromStop(firstStop) : null;

    if (daysUntil <= 2) {
      return (
        <ReadyCard
          tripId={trip.id}
          tripName={trip.name ?? ""}
          destination={trip.destination ?? ""}
          daysUntil={daysUntil}
          firstStopName={firstStop?.name ?? null}
          ticketSignal={firstStopSnapshot?.ticketSignal}
        />
      );
    }

    return (
      <PlanningCard
        tripId={trip.id}
        tripName={trip.name ?? ""}
        destination={trip.destination ?? ""}
        startDate={trip.startDate as string | null}
        daysUntil={daysUntil}
      />
    );
  }

  // ── DAY_NOT_STARTED ───────────────────────────────────────────────────────
  if (execState.state === "DAY_NOT_STARTED" && execState.trip) {
    const trip = execState.trip;
    const todayStops = (execState.currentDay ?? []) as EnrichedTravelStop[];
    const unvisited = todayStops.filter(s => !s.isVisited);
    const firstStop = unvisited[0] ?? null;
    const snapshot = getSnapshotFromStop(firstStop);

    const totalMins = unvisited.reduce((acc, s) => acc + (s.durationMinutes ?? 60), 0);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const totalHours = m === 0 ? `${h}h` : `${h}h ${m}m`;
    const hasLunch = unvisited.some(
      s => ["restaurant", "food", "cafe", "lunch"].includes(s.stopType ?? "")
    );

    return (
      <>
        {dayBadge && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 self-start"
            style={{ background: "#FFF3E3", border: "1px solid #F5D9A8" }}
            data-testid="badge-day-orientation"
          >
            <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-700">{dayBadge}</span>
          </div>
        )}
        <StartDayCard
          tripId={trip.id}
          tripName={trip.name || trip.destination || ""}
          dayNumber={(execState.currentDayIndex ?? 0) + 1}
          totalDays={totalDays}
          stopCount={unvisited.length}
          totalHours={totalHours}
          hasLunch={hasLunch}
          firstStop={firstStop}
          snapshot={snapshot}
        />
      </>
    );
  }

  // ── DAY_ACTIVE ────────────────────────────────────────────────────────────
  if (execState.state === "DAY_ACTIVE" && execState.trip) {
    const trip = execState.trip;
    const allDayStops = (execState.currentDay ?? []) as EnrichedTravelStop[];
    const currentStop = (execState.currentStop ?? null) as EnrichedTravelStop | null;
    const nextStop = allDayStops.find(
      s => !s.isVisited && s.id !== currentStop?.id
    ) as EnrichedTravelStop | null ?? null;
    const snapshot = getSnapshotFromStop(currentStop);

    return (
      <>
        {dayBadge && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 self-start"
            style={{ background: "#FFF3E3", border: "1px solid #F5D9A8" }}
            data-testid="badge-day-orientation"
          >
            <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-700">{dayBadge}</span>
          </div>
        )}
        <TodayCard
          tripId={trip.id}
          tripName={trip.name || trip.destination || ""}
          dayNumber={(execState.currentDayIndex ?? 0) + 1}
          currentStop={currentStop}
          nextStop={nextStop}
          allDayStops={allDayStops}
          snapshot={snapshot}
          onNeedHelp={() => setHelpOpen(true)}
        />
        <GetHelpFlow
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          cityName={helpCityName}
          tripDestination={trip?.destination ?? trip?.city ?? helpCityName}
          stayLocations={helpStayLocs}
          fallbackLat={helpFallbackLat}
          fallbackLng={helpFallbackLng}
        />
      </>
    );
  }

  // ── AT_STOP ───────────────────────────────────────────────────────────────
  if (execState.state === "AT_STOP" && execState.trip) {
    const trip = execState.trip;
    const stop = (execState.currentStop ?? null) as EnrichedTravelStop | null;
    if (!stop) return null;
    const snapshot = getSnapshotFromStop(stop);

    return (
      <>
        {dayBadge && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 self-start"
            style={{ background: "#FFF3E3", border: "1px solid #F5D9A8" }}
            data-testid="badge-day-orientation"
          >
            <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-700">{dayBadge}</span>
          </div>
        )}
        <AtStopCard
          tripId={trip.id}
          dayNumber={(execState.currentDayIndex ?? 0) + 1}
          stop={stop}
          snapshot={snapshot}
        />
      </>
    );
  }

  // ── DAY_COMPLETE ──────────────────────────────────────────────────────────
  if (execState.state === "DAY_COMPLETE" && execState.trip) {
    const trip = execState.trip;
    const currentDayIndex = execState.currentDayIndex ?? 0;
    const currentDay = (execState.currentDay ?? []) as EnrichedTravelStop[];
    const visited = currentDay.filter(s => s.isVisited);

    const totalMins = visited.reduce((acc, s) => acc + ((s as any).durationMinutes ?? 60), 0);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const totalHours = m === 0 ? `${h}h` : `${h}h ${m}m`;

    const todayStopIds = new Set(currentDay.map(s => s.id));
    const momentsToday = currentTripMoments.filter(
      mem => mem.stopId && todayStopIds.has(mem.stopId)
    ).length;

    const nextDay = execState.dayGroups?.[currentDayIndex + 1] ?? null;
    const hasMoreDays = !!nextDay && nextDay.length > 0;
    const nextDayFirstStop = nextDay?.[0] ?? null;

    return (
      <EndDayCard
        tripId={trip.id}
        dayNumber={currentDayIndex + 1}
        stopsExplored={visited.length}
        totalHours={totalHours}
        momentsCount={momentsToday}
        hasMoreDays={hasMoreDays}
        nextDayFirstStopName={nextDayFirstStop?.name ?? null}
      />
    );
  }

  return null;
}
