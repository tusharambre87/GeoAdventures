import { useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useTravel } from "@/lib/travelContext";
import { getCityImage } from "@/lib/cityImages";
import { groupStopsByDay, type CityDateRange } from "@/lib/travelDayGroups";
import { motion } from "framer-motion";
import { MapPin, Navigation, ArrowRight, Sun, Layers, CheckCircle } from "lucide-react";
import type { TravelTrip, TravelStop } from "@shared/schema";

type ContextState = "day_complete" | "at_stop" | "between_stops";

export default function TripContextScreen() {
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId || "";
  const [, navigate] = useLocation();
  const { trips, currentTrip, currentTripStops, isLoading, fetchTrip } = useTravel();

  const tripFromList = trips.find((t: TravelTrip) => t.id === tripId) as TravelTrip | undefined;
  const trip: TravelTrip | undefined = currentTrip?.id === tripId ? currentTrip : tripFromList;
  const stops: TravelStop[] = currentTrip?.id === tripId ? currentTripStops : [];

  useEffect(() => {
    if (tripId && !isLoading && currentTrip?.id !== tripId) {
      fetchTrip(tripId);
    }
  }, [tripId, currentTrip, isLoading]);

  useEffect(() => {
    if (tripId) {
      const todayKey = new Date().toISOString().slice(0, 10);
      sessionStorage.setItem(`trip_ctx_shown_${tripId}_${todayKey}`, "1");
    }
  }, [tripId]);

  const { nextStop, tomorrowStop, contextState, visitedToday, totalToday } = useMemo(() => {
    if (!trip) {
      return {
        nextStop: null,
        tomorrowStop: null,
        contextState: "between_stops" as ContextState,
        visitedToday: 0,
        totalToday: 0,
      };
    }

    const sorted = [...stops].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    const tripCityDates = (trip as TravelTrip & { cityDates?: Record<string, CityDateRange> | null }).cityDates ?? null;

    const parseLocalDate = (s: string) => {
      const [y, m, d] = s.slice(0, 10).split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    // Resolve startDate — fallback to earliest cityDates startDate
    let startStr: string | null = trip.startDate ? String(trip.startDate).slice(0, 10) : null;
    if (!startStr && tripCityDates) {
      const starts = Object.values(tripCityDates).map(r => r.startDate).filter(Boolean) as string[];
      if (starts.length > 0) startStr = starts.sort()[0];
    }

    // Resolve endDate — fallback to latest cityDates endDate
    let endStr: string | null = trip.endDate ? String(trip.endDate).slice(0, 10) : null;
    if (!endStr && tripCityDates) {
      const ends = Object.values(tripCityDates).map(r => r.endDate).filter(Boolean) as string[];
      if (ends.length > 0) endStr = ends.sort().at(-1)!;
    }

    const nowDay = new Date();
    nowDay.setHours(0, 0, 0, 0);

    const startDate = startStr ? parseLocalDate(startStr) : nowDay;
    const endDate = endStr ? parseLocalDate(endStr) : nowDay;

    const todayOffset = Math.max(0, Math.floor((nowDay.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const tomorrowOffset = todayOffset + 1;

    const tripNumDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const dayGroups = groupStopsByDay(sorted, tripNumDays, trip.pace, tripCityDates);

    let todayStops: TravelStop[] = dayGroups[todayOffset] ?? [];
    let tomorrowStops: TravelStop[] = dayGroups[tomorrowOffset] ?? [];

    if (todayStops.length === 0) todayStops = sorted;

    const allTodayVisited = todayStops.length > 0 && todayStops.every((s) => s.isVisited);

    const estDuration = (stopType: string | null | undefined, durationStr: string | null | undefined): number => {
      if (durationStr) {
        const parsed = parseInt(durationStr, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      switch (stopType) {
        case "museum": return 180;
        case "aquarium": return 120;
        case "zoo": return 150;
        case "park": return 75;
        case "food": case "restaurant": case "street_food": return 60;
        default: return 60;
      }
    };

    const DAY_START_MIN = 9 * 60;
    const TRAVEL_BUFFER_MIN = 15;
    let cursor = DAY_START_MIN;
    const stopWindows = todayStops.map((s) => {
      const startMin = cursor;
      const dur = estDuration(s.stopType, s.duration);
      cursor += dur + TRAVEL_BUFFER_MIN;
      return { stop: s, startMin, endMin: cursor - TRAVEL_BUFFER_MIN };
    });

    const realNow = new Date();
    const nowMins = realNow.getHours() * 60 + realNow.getMinutes();
    const nextUnvisitedWindow = stopWindows.find((w) => !w.stop.isVisited);
    const isWithinStopTimeWindow =
      !!nextUnvisitedWindow &&
      nowMins >= nextUnvisitedWindow.startMin - 30 &&
      nowMins <= nextUnvisitedWindow.startMin + 90;

    const atStopSessionActive = !!sessionStorage.getItem(`geoquest_at_stop_${tripId}`);

    let contextState: ContextState;
    if (allTodayVisited) {
      contextState = "day_complete";
    } else if (isWithinStopTimeWindow || atStopSessionActive) {
      contextState = "at_stop";
    } else {
      contextState = "between_stops";
    }

    const nextStop = todayStops.find((s) => !s.isVisited) || null;
    const tomorrowStop = tomorrowStops[0] || sorted.find((s) => !s.isVisited) || null;

    return {
      nextStop,
      tomorrowStop,
      contextState,
      visitedToday: todayStops.filter((s) => s.isVisited).length,
      totalToday: todayStops.length,
    };
  }, [trip, stops, tripId]);

  const cityImage = getCityImage(trip?.city || "", trip?.continent || "");
  const stopForCard = contextState === "day_complete" ? tomorrowStop : nextStop;
  const stopCityImage = stopForCard
    ? getCityImage(stopForCard.cityGroup || stopForCard.name || trip?.city || "", trip?.continent || "")
    : cityImage;
  const heroImage = stopCityImage || cityImage;

  const dismiss = () => {
    navigate("/");
  };

  const handleExploreStopToday = () => {
    navigate(`/adventure/${tripId}/parent-plan?t=today`);
  };

  const handleExploreStopAtStop = () => {
    navigate(`/adventure/${tripId}/parent-plan?t=current`);
  };

  const handleGetDirections = () => {
    if (nextStop) {
      const query = nextStop.address || nextStop.name || "";
      if (query) window.open(`https://maps.google.com/?q=${encodeURIComponent(query)}`, "_blank");
    }
    navigate(`/adventure/${tripId}/parent-plan?t=today`);
  };

  const handleExploreTomorrow = () => {
    navigate(`/adventure/${tripId}/parent-plan?t=plan`);
  };

  const handleGoToToday = () => {
    navigate(`/adventure/${tripId}/parent-plan?t=today`);
  };

  if (!trip) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#F6F3EE" }}
      >
        <div className="text-center">
          <div className="text-5xl animate-bounce mb-3">🧭</div>
          <p className="text-sm text-gray-500 font-medium">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  const tripName = trip.name || trip.city || "Your Adventure";
  const tripCity = trip.city || "your destination";
  const todayDayNum = (() => {
    if (!trip.startDate) return 1;
    const start = new Date(trip.startDate);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  })();

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "#F6F3EE" }}
      data-testid="trip-context-screen"
    >
      {/* Hero image — top ~58% */}
      <div className="relative flex-shrink-0" style={{ height: "58%" }}>
        {heroImage ? (
          <img
            src={heroImage}
            alt={stopForCard?.name || tripCity}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />

        {/* Top status row */}
        <div className="absolute top-0 left-0 right-0 p-5 pt-safe flex items-start justify-between">
          <div
            className="flex items-center gap-1.5 text-white/90 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)" }}
          >
            ✈️ {tripName}
          </div>

          {contextState !== "day_complete" && (
            <div
              className="text-white/80 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide"
              style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }}
            >
              Day {todayDayNum}
            </div>
          )}
        </div>

        {/* Bottom text on hero */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-6">
          {contextState === "day_complete" && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,183,0,0.25)", color: "#FFD700" }}
                >
                  🌅 Day Complete
                </div>
              </div>
              <h1 className="text-[28px] font-black text-white leading-tight tracking-tight">
                {tomorrowStop ? "Ready for tomorrow?" : "Adventure complete!"}
              </h1>
              {tomorrowStop && (
                <p className="text-white/70 text-sm mt-1 font-medium">
                  Up next: {tomorrowStop.name}
                </p>
              )}
            </div>
          )}

          {contextState === "at_stop" && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5"
                  style={{ background: "rgba(125,168,146,0.3)", color: "#7DA892" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7DA892] inline-block animate-pulse" />
                  Best to go now
                </div>
              </div>
              <h1 className="text-[28px] font-black text-white leading-tight tracking-tight">
                {nextStop?.name || "At your stop"}
              </h1>
              <p className="text-white/70 text-sm mt-1">
                {nextStop?.description
                  ? nextStop.description.slice(0, 70) + (nextStop.description.length > 70 ? "…" : "")
                  : tripCity}
              </p>
            </div>
          )}

          {contextState === "between_stops" && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}
                >
                  <MapPin className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />
                  Next stop
                </div>
              </div>
              <h1 className="text-[28px] font-black text-white leading-tight tracking-tight">
                {nextStop?.name || tripCity}
              </h1>
              <p className="text-white/65 text-sm mt-1">
                {nextStop?.description
                  ? nextStop.description.slice(0, 65) + (nextStop.description.length > 65 ? "…" : "")
                  : tripCity}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom card — flex fills remaining height */}
      <div className="flex-1 flex flex-col px-4 pt-5 pb-4 overflow-hidden">
        {/* Progress dots — between stops only */}
        {contextState === "between_stops" && totalToday > 0 && (
          <div className="flex items-center gap-2 mb-5">
            {Array.from({ length: totalToday }, (_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i < visitedToday ? 24 : 8,
                  height: 8,
                  background:
                    i < visitedToday
                      ? "#7DA892"
                      : i === visitedToday
                      ? "#1a1a2e"
                      : "#D1C9BC",
                }}
              />
            ))}
            <span className="ml-1 text-xs text-gray-500 font-medium">
              {visitedToday} of {totalToday} today
            </span>
          </div>
        )}

        {/* Day complete progress indicator */}
        {contextState === "day_complete" && (
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(125,168,146,0.12)" }}>
              <CheckCircle className="w-4 h-4 text-[#7DA892]" />
              <span className="text-sm font-semibold text-[#7DA892]">
                {visitedToday} stop{visitedToday !== 1 ? "s" : ""} explored today
              </span>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 mt-auto">
          {contextState === "between_stops" && (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleExploreStopToday}
                className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2"
                style={{ background: "#1a1a2e" }}
                data-testid="ctx-btn-explore-stop"
              >
                <Layers className="w-4 h-4" />
                Explore Stop
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleGetDirections}
                className="w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
                style={{ background: "rgba(26,26,46,0.08)", color: "#1a1a2e" }}
                data-testid="ctx-btn-get-directions"
              >
                <Navigation className="w-4 h-4" />
                Get Directions
              </motion.button>
            </>
          )}

          {contextState === "at_stop" && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleExploreStopAtStop}
              className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2"
              style={{ background: "#7DA892" }}
              data-testid="ctx-btn-explore-at-stop"
            >
              <Layers className="w-4 h-4" />
              Explore Stop
            </motion.button>
          )}

          {contextState === "day_complete" && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={tomorrowStop ? handleExploreTomorrow : handleGoToToday}
              className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2"
              style={{ background: "#1a1a2e" }}
              data-testid="ctx-btn-explore-tomorrow"
            >
              <Sun className="w-4 h-4" />
              {tomorrowStop ? "Explore Tomorrow" : "View Trip Summary"}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}

          {/* Dismiss link */}
          <button
            onClick={dismiss}
            className="text-center text-sm text-gray-400 font-medium py-1"
            data-testid="ctx-btn-dismiss"
          >
            Open full app →
          </button>
        </div>
      </div>
    </div>
  );
}
