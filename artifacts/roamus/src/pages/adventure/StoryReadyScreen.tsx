import { useState, useMemo, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useTravel } from "@/lib/travelContext";
import { useTripExecutionState } from "@/hooks/useTripExecutionState";
import { getMomentPhotos } from "@/lib/storyState";

export default function StoryReadyScreen() {
  const [, params] = useRoute("/adventure/:tripId/story-ready");
  const tripId = params?.tripId ?? "";
  const [, setLocation] = useLocation();

  const { ensureTripLoaded, currentTripMoments } = useTravel();

  useEffect(() => {
    if (tripId) ensureTripLoaded(tripId);
  }, [tripId, ensureTripLoaded]);

  const { dayGroups, trip } = useTripExecutionState(tripId);

  const visitedStops = useMemo(
    () => dayGroups.flat().filter((s) => s.isVisited),
    [dayGroups]
  );

  const heroPhoto = useMemo(
    () => getMomentPhotos(Array.isArray(currentTripMoments) ? currentTripMoments : [])[0] ?? null,
    [currentTripMoments]
  );

  const dest = String(trip?.destination || trip?.name || "your adventure");
  const stopCount = visitedStops.length;

  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setPhase(1);                                       // 0 ms
    const t2 = setTimeout(() => setPhase(2), 1000);   // 1 000 ms
    const t3 = setTimeout(() => setPhase(3), 2200);   // 2 200 ms
    const t4 = setTimeout(() => setPhase(4), 3400);   // 3 400 ms
    const t5 = setTimeout(() => setPhase(5), 3800);   // 3 800 ms
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center"
      style={{ background: "#0a0a0a" }}
      data-testid="screen-story-ready"
    >
      <style>{`
        @keyframes storyReadyZoom {
          from { transform: scale(1.05); }
          to   { transform: scale(1.08); }
        }
      `}</style>

      {heroPhoto && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${heroPhoto})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(24px)",
            animation: "storyReadyZoom 8s ease-in-out forwards",
            transform: "scale(1.05)",
          }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.62)" }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center px-8 text-center max-w-sm mx-auto w-full gap-8">
        <div className="flex flex-col gap-6">
          <p
            className="text-white font-black tracking-tight transition-all duration-700"
            style={{
              fontSize: 34,
              opacity: phase >= 1 ? 1 : 0,
              transform: phase >= 1 ? "translateY(0)" : "translateY(12px)",
            }}
            data-testid="text-story-ready-line1"
          >
            You did it.
          </p>

          <p
            className="text-white/80 font-semibold transition-all duration-700"
            style={{
              fontSize: 20,
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? "translateY(0)" : "translateY(12px)",
            }}
            data-testid="text-story-ready-line2"
          >
            You visited {stopCount} place{stopCount !== 1 ? "s" : ""} across{" "}
            {dest}
          </p>

          <p
            className="text-white/70 italic transition-all duration-700"
            style={{
              fontSize: 18,
              opacity: phase >= 3 ? 1 : 0,
              transform: phase >= 3 ? "translateY(0)" : "translateY(12px)",
            }}
            data-testid="text-story-ready-line3"
          >
            And somehow… these are the moments that stuck
          </p>

          <p
            className="text-white/55 uppercase tracking-widest transition-all duration-700"
            style={{
              fontSize: 12,
              opacity: phase >= 4 ? 1 : 0,
              transform: phase >= 4 ? "translateY(0)" : "translateY(12px)",
            }}
            data-testid="text-story-ready-line4"
          >
            Your trip is ready to relive
          </p>
        </div>

        <div
          className="flex flex-col items-center gap-4 w-full transition-all duration-700"
          style={{
            opacity: phase >= 5 ? 1 : 0,
            transform: phase >= 5 ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <button
            onClick={() =>
              setLocation(`/adventure/${tripId}/end-trip?from=story-ready`)
            }
            className="w-full py-4 rounded-full bg-white text-slate-900 text-lg font-bold active:scale-[0.97] transition-transform"
            data-testid="button-view-story"
          >
            View your story →
          </button>

          <button
            onClick={() => setLocation(`/adventure/${tripId}/end-trip`)}
            className="text-white/40 text-sm underline"
            data-testid="button-skip-story"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
