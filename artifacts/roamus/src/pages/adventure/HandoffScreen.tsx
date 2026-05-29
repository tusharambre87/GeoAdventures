/**
 * HandoffScreen — Phase 5.5 / 6
 *
 * Route: /adventure/:tripId/handoff/:stopId
 *
 * Full-screen transition from Parent Mode → Kid Mode.
 * No tabs. No parent controls. No back navigation.
 * One job: hand the device to the kid.
 *
 * Shows the stop image for an intentional emotional transition.
 * Stores parent return destination in sessionStorage so every
 * kid screen knows where "Hand back to parent" goes.
 */

import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useTravel } from "@/lib/travelContext";
import { useAdventureShell } from "./AdventureShell";
import { setHandoffReturn } from "@/lib/kidModeSession";
import { getAdventureStopImage, getAdventureCityImage } from "@/lib/adventureImages";
import { getStockImageForDestination } from "@/components/TravelTripCard";
import { useOnDemandCityImage, useOnDemandStopImage } from "@/hooks/useOnDemandAdventureImage";

export default function HandoffScreen() {
  const [, params] = useRoute("/adventure/:tripId/handoff/:stopId");
  const { tripId } = useAdventureShell();
  const stopId = params?.stopId ?? "";
  const [, setLocation] = useLocation();

  const { currentTrip, currentTripStops, ensureTripLoaded } = useTravel();

  useEffect(() => {
    if (tripId) ensureTripLoaded(tripId);
  }, [tripId, ensureTripLoaded]);

  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const fromContext = searchParams.get("from") ?? "today";

  const returnUrl =
    fromContext === "stop" && stopId
      ? `/adventure/${tripId}/stop/${stopId}`
      : `/adventure/${tripId}/today`;

  useEffect(() => {
    if (tripId) {
      setHandoffReturn(tripId, returnUrl);
    }
  }, [tripId, returnUrl]);

  const stop = currentTripStops.find((s) => s.id === stopId);
  const stopName = stop?.name ?? "this stop";

  const { image: onDemandCityImg } = useOnDemandCityImage(currentTrip?.city, currentTrip?.country);
  const { image: onDemandStopImg } = useOnDemandStopImage(
    stop?.name,
    currentTrip?.city,
    stop?.stopType ?? null,
    currentTrip?.country
  );

  const heroImage = (() => {
    if (stop?.name) {
      if (onDemandStopImg) return onDemandStopImg;
      return getAdventureStopImage(
        stop.name,
        stop.stopType ?? null,
        currentTrip?.city,
        currentTrip?.destination
      );
    }
    if (onDemandCityImg) return onDemandCityImg;
    const illustratedCity = getAdventureCityImage(currentTrip?.city, currentTrip?.destination);
    if (illustratedCity) return illustratedCity;
    return getStockImageForDestination(currentTrip?.city, currentTrip?.country, currentTrip?.destination);
  })();

  const handleStartExploring = () => {
    setLocation(
      `/adventure/${tripId}/kid/next?fromExecution=true&stopId=${stopId}`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden"
      data-testid="screen-handoff"
    >
      {/* Stop image — top half */}
      <div className="relative flex-shrink-0" style={{ height: "45vh", minHeight: 220 }}>
        {heroImage ? (
          <img
            src={heroImage}
            alt={stopName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-amber-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-white" />
      </div>

      {/* Content — bottom half */}
      <div className="flex-1 flex flex-col items-center justify-between px-6 pt-4 pb-8">
        <div className="w-full max-w-sm text-center">
          {/* Title */}
          <div className="text-4xl mb-3">👇</div>
          <h1
            className="text-3xl font-black text-slate-900 leading-tight mb-1"
            data-testid="text-handoff-title"
          >
            Hand it over
          </h1>

          {/* Context */}
          <p className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-1">
            You're at
          </p>
          <p
            className="text-lg font-bold text-slate-700 mb-4"
            data-testid="text-handoff-stop"
          >
            {stopName}
          </p>

          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Let your explorer take over for a bit.
          </p>

          {/* Visual cues */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">🎧</span>
              <span className="text-xs font-semibold text-slate-400">Listen</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">🎯</span>
              <span className="text-xs font-semibold text-slate-400">Play</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">📸</span>
              <span className="text-xs font-semibold text-slate-400">Capture</span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={handleStartExploring}
            className="w-full py-4 rounded-2xl text-white text-lg font-black tracking-wide transition-opacity active:opacity-80 shadow-lg"
            style={{ background: "#D4872B", boxShadow: "0 8px 24px rgba(212,135,43,0.35)" }}
            data-testid="button-start-exploring"
          >
            Start exploring
          </button>
          <button
            onClick={() => setLocation(returnUrl)}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-slate-500 bg-slate-100 active:bg-slate-200 transition-colors"
            data-testid="button-hand-back-parent"
          >
            Hand back to parent
          </button>
        </div>
      </div>
    </div>
  );
}
