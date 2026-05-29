import { useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useAdventureShell } from "./AdventureShell";
import { useTravel } from "@/lib/travelContext";
import { navReplace } from "@/lib/nav";
import { setKidFlowState, getHandoffReturn } from "@/lib/kidModeSession";
import { StoryPlayerLite } from "./StoryPlayerLite";

import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export default function AdventureKidStory() {
  const { tripId } = useAdventureShell();
  const [, params] = useRoute("/adventure/:tripId/kid/story/:stopId");
  const stopId = params?.stopId || "";
  const [, setLocation] = useLocation();

  const { currentTrip, currentTripStops } = useTravel();

  const stop = useMemo(
    () => currentTripStops.find((s) => s.id === stopId),
    [currentTripStops, stopId]
  );

  const stopIndex = useMemo(
    () => currentTripStops.findIndex((s) => s.id === stopId) + 1,
    [currentTripStops, stopId]
  );

  const isRevisit = !!stop?.isVisited;

  const handleStoryDone = () => {
    if (isRevisit) {
      // Revisit mode — go back to trip plan, don't advance kid flow
      setLocation(`/adventure/${tripId}/parent-plan?tab=trip_plan`);
      return;
    }
    setKidFlowState(tripId, stopId, { storyCompleted: true, completionLevel: "story_only" });
    navReplace(setLocation, `/adventure/${tripId}/kid/next`);
  };

  if (!stop || !currentTrip) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="kid-story-loading">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-3">🎧</div>
          <p className="text-orange-600 font-medium">Loading Story Pack...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-48" data-testid="kid-story-page">
      {isRevisit && (
        <div className="px-5 pt-4 pb-2">
          <button
            onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=trip_plan`)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600"
            data-testid="button-revisit-back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to trip plan
          </button>
        </div>
      )}

      <StoryPlayerLite
        stop={stop}
        stopNumber={stopIndex}
        totalStops={currentTripStops.length}
      />

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="bg-gradient-to-t from-white via-white/95 to-transparent pt-8 pb-6 px-5">
          <div className="max-w-lg mx-auto space-y-3 pointer-events-auto">
            <Button
              onClick={handleStoryDone}
              className={`w-full h-14 text-white rounded-full text-base font-bold shadow-lg active:scale-[0.98] transition-all ${
                isRevisit
                  ? "bg-slate-600 hover:bg-slate-700 shadow-slate-500/30"
                  : "bg-green-500 hover:bg-green-600 shadow-green-500/30"
              }`}
              data-testid="button-story-done"
            >
              {isRevisit ? (
                <>
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to trip plan
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Story done — what's next?
                </>
              )}
            </Button>

            {!isRevisit && (
              <button
                onClick={() => {
                  const url = getHandoffReturn(tripId, `/adventure/${tripId}/today`);
                  setLocation(url);
                }}
                className="flex items-center justify-center gap-1.5 w-full text-slate-400 hover:text-slate-600 text-xs font-medium py-2 transition-colors border-t border-slate-100 mt-1 pt-3"
                data-testid="button-hand-back-to-parent"
              >
                Hand back to parent
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
