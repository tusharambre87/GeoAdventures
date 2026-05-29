import { useMemo, useCallback, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAdventureShell } from "./AdventureShell";
import { useTravel } from "@/lib/travelContext";
import { navReplace } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { CheckCircle, MapPin, Target } from "lucide-react";
import { motion } from "framer-motion";
import type { ExplorerChallengeMission } from "@shared/schema";

export default function AdventureKidPostExplore() {
  const { tripId } = useAdventureShell();
  const [, params] = useRoute("/adventure/:tripId/kid/post-explore/:stopId");
  const stopId = params?.stopId || "";
  const [, setLocation] = useLocation();

  const { currentTrip, currentTripStops } = useTravel();

  useEffect(() => {
    if (currentTrip?.adventureContext === 'home') {
      navReplace(setLocation, `/adventure/${tripId}/kid/reflect/${stopId}`);
    }
  }, [currentTrip?.adventureContext, tripId, stopId, setLocation]);

  const stop = useMemo(
    () => currentTripStops.find((s) => s.id === stopId),
    [currentTripStops, stopId]
  );

  const stopName = stop?.name || "this place";

  const missions = useMemo(() => {
    const m = stop?.stopMissions as ExplorerChallengeMission[] | null | undefined;
    if (!m || !Array.isArray(m) || m.length === 0) return null;
    return m;
  }, [stop?.stopMissions]);

  const completedCount = useMemo(() => {
    if (!missions) return 0;
    return missions.filter(m => m.completed || m.skipped).length;
  }, [missions]);

  const allMissionsComplete = useMemo(() => {
    if (!missions) return true;
    return completedCount === missions.length;
  }, [missions, completedCount]);

  const remainingCount = missions ? missions.length - completedCount : 0;

  const handleCompleteMissions = useCallback(() => {
    sessionStorage.setItem(`adventure_override_stop_${tripId}`, stopId);
    navReplace(setLocation, `/adventure/${tripId}/kid/next`);
  }, [tripId, stopId, setLocation]);

  const handleCompleteAnyway = useCallback(() => {
    navReplace(setLocation, `/adventure/${tripId}/kid/reflect/${stopId}?skipKeepsake=1`);
  }, [tripId, stopId, setLocation]);

  const handleMarkVisited = useCallback(() => {
    navReplace(setLocation, `/adventure/${tripId}/kid/reflect/${stopId}`);
  }, [tripId, stopId, setLocation]);

  if (allMissionsComplete) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-56px)] bg-gradient-to-b from-green-50 to-emerald-50" data-testid="kid-post-explore-page">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse" }}
              className="text-7xl mb-5"
            >
              🌟
            </motion.div>

            <h1 className="text-2xl font-black text-emerald-800 mb-2" data-testid="text-post-explore-title">
              Great job exploring the stop!
            </h1>
            <p className="text-base text-emerald-600 mb-1 font-medium">{stopName}</p>
            <p className="text-sm text-emerald-500 mt-3">
              All missions complete! Mark this stop as visited to continue.
            </p>
          </motion.div>
        </div>

        <div className="px-6 pb-8 pt-4">
          <Button
            onClick={handleMarkVisited}
            className="w-full h-14 rounded-full text-base font-bold shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
            }}
            data-testid="button-mark-visited-post-explore"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Mark Visited
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] bg-gradient-to-b from-amber-50 to-orange-50" data-testid="kid-post-explore-page">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-6xl mb-5"
          >
            🧭
          </motion.div>

          <h1 className="text-2xl font-black text-amber-800 mb-2" data-testid="text-post-explore-title">
            Explorer Missions Not Complete
          </h1>
          <p className="text-base text-amber-600 font-medium mb-1">{stopName}</p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 max-w-xs mx-auto"
          >
            <p className="text-sm text-amber-700 leading-relaxed">
              Complete your Explorer Challenges for this stop to earn XP and travel keepsakes!
            </p>
            <p className="text-xs text-amber-500 mt-2">
              {remainingCount} mission{remainingCount !== 1 ? 's' : ''} remaining
            </p>
          </motion.div>
        </motion.div>
      </div>

      <div className="px-6 pb-8 pt-4 space-y-3">
        <Button
          onClick={handleCompleteMissions}
          className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-base font-bold shadow-lg shadow-orange-500/30"
          data-testid="button-complete-missions"
        >
          <Target className="w-5 h-5 mr-2" />
          Complete Missions
        </Button>
        <button
          onClick={handleCompleteAnyway}
          className="w-full text-center text-gray-400 text-sm font-medium py-2"
          data-testid="button-complete-anyway"
        >
          Complete Anyway
        </button>
      </div>
    </div>
  );
}
