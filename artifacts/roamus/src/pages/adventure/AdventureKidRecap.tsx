import { useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAdventureShell } from "./AdventureShell";
import { useTravel } from "@/lib/travelContext";
import { useExplorer } from "@/lib/explorerContext";
import { navReplace } from "@/lib/nav";
import { getStockImageForDestination } from "@/components/TravelTripCard";
import { useFreeLimits } from "@/hooks/useFreeLimits";

import { Button } from "@/components/ui/button";
import { Trophy, Camera, MapPin, Home, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import { NextDestinationHook } from "@/components/GeoAdventuresPaywall";

export default function AdventureKidRecap() {
  const { tripId } = useAdventureShell();
  const [, setLocation] = useLocation();
  const { currentTrip, currentTripStops, currentTripMoments } = useTravel();
  const { activeExplorer } = useExplorer();
  const { isPaidUser } = useFreeLimits();
  const hasDispatchedCompletion = useRef(false);

  useEffect(() => {
    if (currentTrip?.city && !hasDispatchedCompletion.current) {
      hasDispatchedCompletion.current = true;
      window.dispatchEvent(new CustomEvent('geoquest:adventure-completed', {
        detail: { cityName: currentTrip.city },
      }));
    }
  }, [currentTrip?.city]);

  const visitedCount = useMemo(
    () => currentTripStops.filter((s) => s.isVisited).length,
    [currentTripStops]
  );

  const momentCount = (currentTripMoments || []).length;
  const totalStops = currentTripStops.length;

  const heroImage = getStockImageForDestination(
    currentTrip?.city,
    currentTrip?.country,
    currentTrip?.destination
  );

  const handleGoHome = () => {
    navReplace(setLocation, `/adventure/${tripId}/kid`);
  };

  const handleBackToAdventures = () => {
    navReplace(setLocation, "/geoadventures");
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]" data-testid="kid-recap-page">
      <div className="relative overflow-hidden rounded-b-[2rem]" style={{ height: "35vh" }}>
        <img
          src={heroImage}
          alt={currentTrip?.name || "adventure"}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="text-center"
          >
            <div className="text-6xl mb-2">🎉</div>
            <h1 className="text-3xl font-black text-white" data-testid="text-recap-title">
              Amazing Adventure!
            </h1>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 pb-24">
        <p className="text-center text-orange-500 font-semibold mb-5" data-testid="text-recap-trip-name">
          {currentTrip?.name || "Your Trip"}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-4 text-center shadow-sm border border-orange-100"
          >
            <MapPin className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-800" data-testid="text-recap-stops">
              {visitedCount}
            </p>
            <p className="text-[10px] text-orange-500 font-medium">Places</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-4 text-center shadow-sm border border-orange-100"
          >
            <Camera className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-800" data-testid="text-recap-moments">
              {momentCount}
            </p>
            <p className="text-[10px] text-orange-500 font-medium">Moments</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-4 text-center shadow-sm border border-orange-100"
          >
            <Trophy className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-800" data-testid="text-recap-total">
              {totalStops}
            </p>
            <p className="text-[10px] text-orange-500 font-medium">Stops</p>
          </motion.div>
        </div>

        {!isPaidUser && (
          <div className="mb-6">
            <NextDestinationHook
              currentCity={currentTrip?.city}
              onClose={() => {}}
            />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <Button
            onClick={handleGoHome}
            className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-base font-bold shadow-lg shadow-orange-500/30"
            data-testid="button-recap-home"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Adventure
          </Button>

          <Button
            onClick={handleBackToAdventures}
            variant="outline"
            className="w-full h-12 rounded-full border-orange-200 text-orange-700 hover:bg-orange-50"
            data-testid="button-recap-all-adventures"
          >
            All Adventures
          </Button>
        </motion.div>
      </div>

    </div>
  );
}
