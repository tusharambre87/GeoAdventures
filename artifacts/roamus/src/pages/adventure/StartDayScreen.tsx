/**
 * StartDayScreen — Phase 5
 *
 * Morning briefing screen. Answers 5 questions clearly:
 *   1. What does today look like? (stop count / total hours / lunch)
 *   2. What is the first stop?
 *   3. What comes next?
 *   4. Are tickets needed?
 *   5. Where are we starting from?
 *
 * Fixes from Phase 4:
 *   - Removed undefined computeLeaveByTime (crash) — shows snapshot travelMinutes only
 *   - Added state redirect guard: DAY_ACTIVE / AT_STOP → /today; DAY_COMPLETE → end-day
 *   - Added empty-stop guard: 0 unvisited → "today complete" inline
 *   - Starting location row + full bottom sheet (same as TodayScreen)
 *   - Ticket pre-check row if firstStop needs tickets
 *   - Smarter headline logic
 *   - "Adjust plan" routes to today's plan tab, not generic parent-plan root
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useTravel } from "@/lib/travelContext";
import { useTripExecutionState } from "@/hooks/useTripExecutionState";
import type { EnrichedTravelStop } from "@/lib/travelExecutionTypes";
import {
  Loader2, Clock, UtensilsCrossed, MapPin, ChevronRight,
  Lightbulb, Home, Ticket, Navigation, CloudRain, X,
} from "lucide-react";
import { getSnapshotFromStop } from "@/hooks/useStopSnapshot";
import { toast } from "sonner";
import { WeatherFixSheet } from "@/components/WeatherFixSheet";
import type { ImpactedStop, WeatherProposal, WeatherUndoInfo } from "@/components/WeatherFixSheet";

function getStopEmoji(stopType?: string | null): string {
  const map: Record<string, string> = {
    museum: "🏛️", nature: "🌿", beach: "🏖️", park: "🌳",
    zoo: "🐾", aquarium: "🐠", restaurant: "🍽️", landmark: "📍",
    market: "🛒", viewpoint: "🌅", garden: "🌸", playground: "🎠",
  };
  return map[stopType ?? ""] ?? "📍";
}

export default function StartDayScreen() {
  const [, params] = useRoute("/adventure/:tripId/start-day");
  const tripId = params?.tripId ?? "";
  const [, setLocation] = useLocation();
  const { fetchTrip, ensureTripLoaded, fetchTrips } = useTravel();
  const [starting, setStarting] = useState(false);
  const [showStartNudge, setShowStartNudge] = useState(false);
  const [tripEndedDismissed, setTripEndedDismissed] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);

  // ── Weather state (new: per-stop conflict analysis) ───────────────────────
  const [weatherBannerDismissed, setWeatherBannerDismissed] = useState(false);
  const [showWeatherFixSheet, setShowWeatherFixSheet] = useState(false);
  const [weatherCheck, setWeatherCheck] = useState<{
    isRainy: boolean;
    precipProb: number;
    impactedStops: ImpactedStop[];
  } | null>(null);
  const [weatherProposal, setWeatherProposal] = useState<WeatherProposal | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);

  // ── Starting location state ───────────────────────────────────────────────
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

  useEffect(() => {
    if (tripId) ensureTripLoaded(tripId);
  }, [tripId, ensureTripLoaded]);

  const { state, currentDay, currentDayIndex, dayGroups, trip } = useTripExecutionState(tripId);

  // ── Weather check — server-authoritative per-stop conflict analysis ──────────
  // Uses GET endpoint that fetches stops server-side; dayIndex tells server which day to analyze.

  // Reset weather state whenever the active day changes so we don't show stale data.
  const prevDayIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (currentDayIndex !== prevDayIndexRef.current) {
      prevDayIndexRef.current = currentDayIndex ?? null;
      setWeatherCheck(null);
      setWeatherProposal(null);
      setWeatherBannerDismissed(false);
    }
  }, [currentDayIndex]);

  const currentDayLength = (currentDay ?? []).length;
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

  // ── Redirect guards ───────────────────────────────────────────────────────
  useEffect(() => {
    if (state === "DAY_ACTIVE" || state === "AT_STOP") {
      setLocation(`/adventure/${tripId}/today`);
    } else if (state === "DAY_COMPLETE") {
      setLocation(`/adventure/${tripId}/end-day`);
    }
  }, [state, tripId, setLocation]);

  const todayStops = (currentDay ?? []) as EnrichedTravelStop[];
  const unvisitedStops = todayStops.filter((s) => !s.isVisited);
  const firstStop = unvisitedStops[0] ?? null;
  const secondStop = unvisitedStops[1] ?? null;
  const firstStopSnapshot = getSnapshotFromStop(firstStop);

  const totalHours = useMemo(() => {
    const totalMins = unvisitedStops.reduce((acc, s) => acc + (s.durationMinutes ?? 60), 0);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }, [unvisitedStops]);

  const travelMinutesLabel = firstStopSnapshot?.travelMinutes
    ? `${firstStopSnapshot.travelMinutes} min away`
    : null;

  const lunchStop = unvisitedStops.find(
    s => ["restaurant", "food", "cafe", "lunch", "street_food"].includes(s.stopType ?? "")
  ) ?? null;

  const ticketNeeded = firstStopSnapshot?.ticketSignal === true;

  // ── Smarter headline ──────────────────────────────────────────────────────
  const headline = useMemo(() => {
    if (unvisitedStops.length === 1) return "Light day ahead 🌿";
    if (!lunchStop || ticketNeeded) return "Almost ready — one quick thing first";
    return "Today looks good 👍";
  }, [unvisitedStops.length, lunchStop, ticketNeeded]);

  // ── Weather banner logic ──────────────────────────────────────────────────
  // Show banner whenever rain is forecast (>=50% precip), not only when stops are flagged
  const showWeatherBanner = !weatherBannerDismissed && weatherCheck !== null &&
    (weatherCheck.isRainy || weatherCheck.precipProb >= 50 || weatherCheck.impactedStops.length > 0);
  const firstImpactedStop = weatherCheck?.impactedStops?.[0] ?? null;

  // ── Weather fix handlers ───────────────────────────────────────────────────
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
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setWeatherProposal(data);
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

  // ── Starting location handlers ────────────────────────────────────────────
  const handleOpenSetStartingPoint = () => {
    setStartingPointInput(startingPoint ?? "");
    setStartingPointResults([]);
    setStartingPointDialogOpen(true);
  };

  const searchStartingPoint = async (query: string) => {
    if (!query.trim() || query.trim().length < 3) { setStartingPointResults([]); return; }
    setStartingPointSearching(true);
    try {
      const dest = encodeURIComponent(`${query} ${trip?.destination ?? trip?.city ?? ""}`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${dest}&format=json&limit=5&addressdetails=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "GeoQuestApp/1.0" } }
      );
      const data = await res.json();
      setStartingPointResults((data || []).slice(0, 5).map((r: any) => ({
        name: r.name || r.display_name.split(",")[0],
        address: r.display_name,
      })));
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

  // ── handleStartDay ────────────────────────────────────────────────────────
  const doStartDay = async () => {
    if (!tripId) return;
    setStarting(true);
    setShowStartNudge(false);
    try {
      const res = await fetch(`/api/travel/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: "active",
          // Only set adventureStartedAt on the very first day start.
          // For Day 2+ the calendar anchor is already locked in — overwriting it
          // would reset calendarDayIndex to 0 and break the time-aware model.
          ...(trip?.adventureStartedAt
            ? {}
            : { adventureStartedAt: new Date().toISOString() }),
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      fetch(`/api/travel/trips/${tripId}/pregenerate-story-packs`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
      await fetchTrip(tripId);
      setLocation(`/adventure/${tripId}/today`);
    } catch (e) {
      console.error("Failed to start trip:", e);
      toast.error("Couldn't start your day — please try again");
    } finally {
      setStarting(false);
    }
  };

  const handleStartDay = () => {
    if (!startingPoint) {
      setShowStartNudge(true);
      return;
    }
    doStartDay();
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="screen-start-day-loading">
        <div className="text-4xl animate-bounce">🧭</div>
      </div>
    );
  }

  if (state === "DAY_ACTIVE" || state === "AT_STOP" || state === "DAY_COMPLETE") {
    return null;
  }

  // ── TRIP_ENDED: dates have passed — ask to continue or wrap up ────────────
  if (state === "TRIP_ENDED" && !tripEndedDismissed) {
    const handleMarkDone = async () => {
      if (!tripId) return;
      setMarkingDone(true);
      try {
        await fetch(`/api/travel/trips/${tripId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "completed" }),
        });
        await fetchTrips();
        setLocation(`/adventure/${tripId}/end-trip`);
      } catch {
        setLocation(`/adventure/${tripId}/end-trip`);
      } finally {
        setMarkingDone(false);
      }
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: "#FDFBF8" }} data-testid="screen-trip-ended-prompt">
        <div className="text-6xl mb-4">✈️</div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#9B7EC8" }}>
          Trip dates have passed
        </p>
        <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
          {trip.name || trip.destination}
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-xs mb-8">
          Your scheduled trip dates are over. You can still continue exploring, or wrap up and save your memories.
        </p>
        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={handleMarkDone}
            disabled={markingDone}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-base font-bold transition-opacity active:opacity-80 disabled:opacity-60"
            style={{ background: "#D4872B" }}
            data-testid="button-mark-trip-done-ended"
          >
            {markingDone ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Mark trip done
          </button>
          <button
            onClick={() => setTripEndedDismissed(true)}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold border border-gray-200 text-slate-600 hover:bg-gray-50 transition-colors"
            data-testid="button-continue-anyway-ended"
          >
            Continue anyway →
          </button>
        </div>
      </div>
    );
  }

  // ── Empty-stop guard ──────────────────────────────────────────────────────
  // Only show "already complete" when the day actually loaded (currentDay != null)
  if (trip && currentDay !== null && unvisitedStops.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center" data-testid="screen-start-day-complete">
        <div className="text-5xl mb-4">✅</div>
        <div className="text-xl font-bold text-slate-800 mb-2">Today is already complete</div>
        <p className="text-slate-400 text-sm mb-6">All stops for today have been visited.</p>
        <button
          onClick={() => setLocation(`/adventure/${tripId}/end-day`)}
          className="w-full max-w-xs py-4 rounded-2xl text-white text-base font-bold"
          style={{ background: "#D4872B" }}
          data-testid="button-go-to-summary"
        >
          See day summary →
        </button>
      </div>
    );
  }

  const adjustPlanUrl = `/adventure/${tripId}/parent-plan?tab=todays_plan`;

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="screen-start-day">
      <div className="flex-1 flex flex-col px-4 pt-6 pb-8 max-w-lg mx-auto w-full">

        {/* Back to hub */}
        <button
          onClick={() => setLocation("/geoadventures?home=1")}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-orange-500 transition-colors mb-5 self-start"
          data-testid="button-back-home"
        >
          <Home className="w-3.5 h-3.5" />
          GeoAdventures
        </button>

        {/* Day + trip header */}
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Day {currentDayIndex + 1} of {dayGroups.length}
          </p>
          <h1
            className="text-2xl font-bold text-slate-900 leading-tight"
            data-testid="text-start-day-heading"
          >
            {trip.name || trip.destination}
          </h1>
        </div>

        {/* ── Weather rain banner ───────────────────────────────────────── */}
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

        {/* ── 1. Day summary card ───────────────────────────────────────── */}
        <div
          className="rounded-2xl px-5 py-4 mb-3"
          style={{ background: "#FFF8ED", border: "1px solid #F5E0B5" }}
          data-testid="card-day-summary"
        >
          <p className="text-base font-bold text-slate-800 mb-3" data-testid="text-day-headline">
            {headline}
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <span className="text-base shrink-0">📍</span>
              <span data-testid="text-stop-count">
                {unvisitedStops.length} {unvisitedStops.length === 1 ? "stop" : "stops"} planned
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span data-testid="text-total-hours">~{totalHours} + travel</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              {lunchStop ? (
                <>
                  <UtensilsCrossed className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-green-700 font-medium" data-testid="text-lunch-planned">
                    Lunch included — {lunchStop.name}
                  </span>
                </>
              ) : (
                <>
                  <UtensilsCrossed className="w-4 h-4 text-slate-300 shrink-0" />
                  <button
                    onClick={() => setLocation(adjustPlanUrl)}
                    className="text-slate-400 underline"
                    data-testid="button-add-lunch-from-start"
                  >
                    No lunch planned — add one
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. Starting location row ──────────────────────────────────── */}
        <button
          onClick={handleOpenSetStartingPoint}
          className="flex items-center gap-2 px-4 py-3 rounded-xl mb-3 text-left transition-colors active:opacity-80 w-full"
          style={startingPoint
            ? { border: "1px solid #E5E7EB", background: "#F9FAFB" }
            : { border: "1px solid #FDE68A", background: "#FFFBEB" }}
          data-testid="button-open-start-location"
        >
          <Navigation className="w-4 h-4 shrink-0" style={{ color: startingPoint ? "#9CA3AF" : "#D97706" }} />
          {startingPoint ? (
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Start from</span>
              <p className="text-sm font-semibold text-slate-800 truncate">{startingPoint}</p>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#D97706" }}>Start from</span>
              <p className="text-sm font-semibold" style={{ color: "#92400E" }}>Set starting location →</p>
            </div>
          )}
          {startingPoint && (
            <span className="text-xs font-semibold text-orange-500 shrink-0">Change</span>
          )}
        </button>

        {/* ── 3. Ticket pre-check ───────────────────────────────────────── */}
        {ticketNeeded && firstStop && (
          <div
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-3"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
            data-testid="banner-ticket-needed"
          >
            <Ticket className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              <span className="font-semibold">Tickets needed</span> for {firstStop.name}
            </p>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${firstStop.name} tickets`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-amber-700 underline shrink-0"
              data-testid="link-open-passes"
            >
              Open passes
            </a>
          </div>
        )}

        {/* ── 4. First stop card ───────────────────────────────────────── */}
        {firstStop && (
          <div
            className="rounded-2xl overflow-hidden mb-3"
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" }}
            data-testid="card-first-stop"
          >
            <div className="px-5 py-5">
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">
                First stop
              </p>
              <div className="flex items-start gap-2 mb-2">
                <span className="text-2xl">{getStopEmoji(firstStop.stopType)}</span>
                <div
                  className="text-white text-xl font-bold leading-tight"
                  data-testid="text-first-stop-name"
                >
                  {firstStop.name}
                </div>
              </div>

              {firstStopSnapshot?.familyFitLabel && (
                <p className="text-blue-200 text-sm mb-2" data-testid="text-family-fit">
                  {firstStopSnapshot.familyFitLabel}
                </p>
              )}

              {travelMinutesLabel && (
                <div className="flex items-center gap-1.5 text-blue-100 text-sm" data-testid="text-travel-mins">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{travelMinutesLabel} from your start</span>
                </div>
              )}
              {firstStop.durationMinutes && (
                <div className="flex items-center gap-1.5 text-blue-200 text-sm mt-1" data-testid="text-first-stop-duration">
                  <span>Plan for ~{firstStop.durationMinutes < 60
                    ? `${firstStop.durationMinutes} min`
                    : firstStop.durationMinutes % 60 === 0
                      ? `${Math.floor(firstStop.durationMinutes / 60)}h`
                      : `${Math.floor(firstStop.durationMinutes / 60)}h ${firstStop.durationMinutes % 60}m`
                  } here</span>
                </div>
              )}

              {firstStopSnapshot?.bestTimeTip && (
                <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-blue-400/30">
                  <Lightbulb className="w-3.5 h-3.5 text-blue-200 shrink-0 mt-0.5" />
                  <p className="text-blue-100 text-xs leading-snug" data-testid="text-best-time-tip">
                    {firstStopSnapshot.bestTimeTip}
                  </p>
                </div>
              )}
            </div>

            {/* Followed by: second stop */}
            {secondStop && (
              <div className="px-5 py-3 bg-blue-700/30 flex items-center gap-2" data-testid="block-second-stop">
                <span className="text-blue-200 text-xs">Followed by</span>
                <span className="text-sm">{getStopEmoji(secondStop.stopType)}</span>
                <span
                  className="text-white text-sm font-semibold truncate"
                  data-testid="text-second-stop-name"
                >
                  {secondStop.name}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-blue-300 shrink-0 ml-auto" />
              </div>
            )}
          </div>
        )}

        {/* ── 5. +N more stops ─────────────────────────────────────────── */}
        {unvisitedStops.length > 2 && (
          <button
            onClick={() => setLocation(adjustPlanUrl)}
            className="flex items-center gap-1.5 text-sm font-medium mb-4"
            style={{ color: "#D4872B" }}
            data-testid="button-more-stops"
          >
            <MapPin className="w-3.5 h-3.5" />
            +{unvisitedStops.length - 2} more stop{unvisitedStops.length - 2 !== 1 ? "s" : ""} today
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* ── CTAs ─────────────────────────────────────────────────────── */}
        <div className="mt-auto space-y-3">

          {/* Inline nudge — shown when no starting point and "Start Day" tapped */}
          {showStartNudge && (
            <div
              className="rounded-2xl px-4 py-3.5"
              style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
              data-testid="nudge-start-location"
            >
              <p className="text-sm font-semibold text-amber-800 mb-1">
                No starting point set
              </p>
              <p className="text-xs text-amber-700 mb-3">
                We'll use your current location for directions. Want to set one first?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={doStartDay}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-300 bg-white"
                  data-testid="button-nudge-continue"
                >
                  Continue anyway
                </button>
                <button
                  onClick={() => { setShowStartNudge(false); handleOpenSetStartingPoint(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#D4872B" }}
                  data-testid="button-nudge-set-location"
                >
                  Set location
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleStartDay}
            disabled={starting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-base font-bold transition-opacity active:opacity-80 disabled:opacity-60"
            style={{ background: "#D4872B" }}
            data-testid="button-start-day"
          >
            {starting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
              : "Start Day"}
          </button>

          <button
            onClick={() => setLocation(adjustPlanUrl)}
            className="w-full py-4 rounded-2xl text-base font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
            data-testid="button-adjust-plan"
          >
            Adjust plan
          </button>
        </div>
      </div>

      {/* ── Weather Fix Sheet ────────────────────────────────────────────── */}
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

      {/* ── Starting location bottom sheet ───────────────────────────────── */}
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
                    onClick={() => searchStartingPoint(startingPointInput)}
                    disabled={startingPointSearching}
                    className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-colors"
                    style={{ background: "#D4872B" }}
                    data-testid="button-lookup-start"
                  >
                    {startingPointSearching ? "…" : "Look up"}
                  </button>
                </div>

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
    </div>
  );
}
