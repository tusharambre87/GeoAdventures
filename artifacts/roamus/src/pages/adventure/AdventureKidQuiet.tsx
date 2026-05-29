import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useAdventureShell } from "./AdventureShell";
import { useTravel } from "@/lib/travelContext";
import { toast } from "sonner";
import { navReplace } from "@/lib/nav";
import { completeSection } from "@/lib/travelEvents";
import { getStockImageForDestination } from "@/components/TravelTripCard";
import { getHandoffReturn, clearKidSession } from "@/lib/kidModeSession";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { MomentCapture } from "@/components/MomentCapture";
import { motion } from "framer-motion";

export default function AdventureKidQuiet() {
  const { tripId, parentVerified, verifyParent } = useAdventureShell();
  const [, params] = useRoute("/adventure/:tripId/kid/quiet/:stopId");
  const stopId = params?.stopId || "";
  const [, setLocation] = useLocation();

  const { currentTrip, currentTripStops, saveMoment } = useTravel();
  const [showCamera, setShowCamera] = useState(false);

  const stop = useMemo(
    () => currentTripStops.find((s) => s.id === stopId),
    [currentTripStops, stopId]
  );

  const heroImage = getStockImageForDestination(
    stop?.name || currentTrip?.city,
    currentTrip?.country,
    currentTrip?.destination
  );

  const handleWeAreBack = async () => {
    if (!parentVerified) {
      const until = Date.now() + 10 * 60 * 1000;
      localStorage.setItem("parentVerifiedUntil", String(until));
      verifyParent();
    }

    try {
      await completeSection(stopId, tripId, "quiet");
    } catch (e) {
      console.error("[KidQuiet] Failed to complete quiet section:", e);
    }

    navReplace(setLocation, `/adventure/${tripId}/kid/next`);
  };

  const handleHandBackToParent = () => {
    clearKidSession(tripId, stopId);
    const returnUrl = getHandoffReturn(tripId, `/adventure/${tripId}/today`);
    setLocation(returnUrl);
  };

  if (showCamera && currentTrip) {
    return (
      <MomentCapture
        trip={currentTrip}
        stops={currentTripStops}
        onSave={async (momentData) => {
          await saveMoment({ tripId: currentTrip.id, ...momentData });
          toast.success("Moment saved ✨");
          setShowCamera(false);
        }}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-56px)] flex flex-col" data-testid="kid-quiet-page">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt={stop?.name || "destination"}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6"
          >
            <span className="text-3xl">📵</span>
          </motion.div>

          <h1 className="text-4xl font-black text-white mb-3 leading-tight" data-testid="text-quiet-title">
            Phone away.
          </h1>

          <p className="text-xl text-white/90 mb-2 font-medium">
            Look around with your eyes!
          </p>

          <p className="text-white/70 text-sm mb-10">
            We'll ask you a fun question after!
          </p>
        </motion.div>
      </div>

      <div className="relative z-10 px-6 pb-8 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={() => setShowCamera(true)}
            className="flex items-center justify-center gap-2 w-full py-3 text-white/80 text-sm font-medium hover:text-white transition-colors"
            data-testid="button-quiet-photo"
          >
            <Camera className="w-4 h-4" />
            Take a photo (optional)
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={handleWeAreBack}
            className="w-full h-14 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-full text-base font-bold border border-white/30 shadow-lg active:scale-[0.98] transition-all"
            data-testid="button-we-are-back"
          >
            We're back!
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={handleHandBackToParent}
            className="w-full text-center text-white/40 hover:text-white/70 text-xs font-medium py-2 transition-colors"
            data-testid="button-hand-back-quiet"
          >
            Hand back to parent
          </button>
        </motion.div>
      </div>
    </div>
  );
}
