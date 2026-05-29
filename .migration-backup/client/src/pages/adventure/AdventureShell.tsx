import { useEffect, useState, createContext, useContext } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTravel } from "@/lib/travelContext";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { useDestinationWeather } from "@/hooks/useDestinationWeather";
import { navReplace } from "@/lib/nav";
import { SwitchAdventureSheet } from "@/components/SwitchAdventureSheet";
import { TravelModeReminders } from "@/components/TravelModeReminders";
import { VideoMakerGate, ComingSoonModal, AdventureLimitGate } from "@/components/UpgradePrompt";
import { getTravelAvatarForTrip } from "@/lib/travelAvatars";
import { ParentHubModal } from "./ParentHubModal";

interface AdventureShellContextValue {
  tripId: string;
  openParentHub: () => void;
  showSwitchAdventure: () => void;
  parentVerified: boolean;
  verifyParent: () => void;
  gatingActions: {
    showVideoMakerGate: () => void;
    showComingSoon: (feature: string) => void;
    showAdventureLimitGate: (type: 'explore_home' | 'travel' | 'community' | 'spots') => void;
    showSpotLimitGate: (cityName?: string) => void;
  };
}

const AdventureShellContext = createContext<AdventureShellContextValue | null>(null);

export function useAdventureShell() {
  const ctx = useContext(AdventureShellContext);
  if (!ctx) throw new Error("useAdventureShell must be used within AdventureShell");
  return ctx;
}

function isParentVerified(): boolean {
  try {
    const until = localStorage.getItem("parentVerifiedUntil");
    if (!until) return false;
    return Date.now() < parseInt(until, 10);
  } catch {
    return false;
  }
}

interface AdventureShellProps {
  children: React.ReactNode;
}

export function AdventureShell({ children }: AdventureShellProps) {
  const [, params] = useRoute("/adventure/:tripId/*");
  const tripId = params?.tripId || "";
  const [, setLocation] = useLocation();

  const { activeExplorer } = useExplorer();
  const {
    currentTrip,
    currentTripStops,
    trips,
    ensureTripLoaded,
    travelHydrationState,
    setIsInTravelMode,
    fetchTrip,
  } = useTravel();

  const { weather: currentTripWeather } = useDestinationWeather(
    currentTrip?.city,
    currentTrip?.country,
    currentTrip?.destination
  );

  const [parentHubOpen, setParentHubOpen] = useState(false);
  const [parentVerified, setParentVerified] = useState(isParentVerified());
  const [switchSheetOpen, setSwitchSheetOpen] = useState(false);

  const [videoMakerGateOpen, setVideoMakerGateOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState("");
  const [adventureLimitOpen, setAdventureLimitOpen] = useState(false);
  const [adventureLimitType, setAdventureLimitType] = useState<'explore_home' | 'travel' | 'community' | 'spots'>('travel');
  const [spotLimitOpen, setSpotLimitOpen] = useState(false);
  const [spotLimitCity, setSpotLimitCity] = useState<string | undefined>();

  useEffect(() => {
    setIsInTravelMode(true);
    return () => setIsInTravelMode(false);
  }, [setIsInTravelMode]);

  useEffect(() => {
    if (tripId) {
      ensureTripLoaded(tripId);
    }
  }, [tripId, ensureTripLoaded]);

  const verifyParent = () => {
    const until = Date.now() + 10 * 60 * 1000;
    localStorage.setItem("parentVerifiedUntil", String(until));
    setParentVerified(true);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  const handleSelectAdventure = (newTripId: string) => {
    setSwitchSheetOpen(false);
    navReplace(setLocation, `/adventure/${newTripId}/kid`);
  };

  const tripAvatarObj = currentTrip ? getTravelAvatarForTrip(currentTrip.city || undefined, currentTrip.country) : null;
  const tripAvatar = tripAvatarObj?.emoji || "🧭";

  const contextValue: AdventureShellContextValue = {
    tripId,
    openParentHub: () => setParentHubOpen(true),
    showSwitchAdventure: () => setSwitchSheetOpen(true),
    parentVerified,
    verifyParent,
    gatingActions: {
      showVideoMakerGate: () => setVideoMakerGateOpen(true),
      showComingSoon: (feature: string) => {
        setComingSoonFeature(feature);
        setComingSoonOpen(true);
      },
      showAdventureLimitGate: (type) => {
        setAdventureLimitType(type);
        setAdventureLimitOpen(true);
      },
      showSpotLimitGate: (cityName?: string) => {
        setSpotLimitCity(cityName);
        setSpotLimitOpen(true);
      },
    },
  };

  if (travelHydrationState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🧭</div>
          <p className="text-orange-700 font-medium">Loading adventure...</p>
        </div>
      </div>
    );
  }

  if (travelHydrationState === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🌍</div>
          <h2 className="text-xl font-bold text-orange-800 mb-2">Adventure not available</h2>
          <p className="text-orange-600 mb-6">
            This adventure couldn't be loaded. You may be offline or the link may be invalid.
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Adventures
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdventureShellContext.Provider value={contextValue}>
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-2.5">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              data-testid="button-adventure-back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>

            <div className="flex items-center gap-2 flex-1 min-w-0 mx-3">
              <span className="text-lg">{tripAvatar}</span>
              <h1 className="font-bold text-gray-900 truncate text-sm">
                {currentTrip?.name || "Adventure"}
              </h1>
            </div>

          </div>
        </header>

        <main className="max-w-lg mx-auto">
          {children}
        </main>

        <TravelModeReminders explorerId={activeExplorer?.id} />

        <SwitchAdventureSheet
          open={switchSheetOpen}
          onOpenChange={setSwitchSheetOpen}
          trips={trips.filter(t => t.status !== 'completed')}
          activeAdventureId={tripId}
          onSelectAdventure={handleSelectAdventure}
        />

        <VideoMakerGate
          isOpen={videoMakerGateOpen}
          onClose={() => setVideoMakerGateOpen(false)}
          tripName={currentTrip?.name}
        />

        <ComingSoonModal
          isOpen={comingSoonOpen}
          onClose={() => setComingSoonOpen(false)}
          featureName={comingSoonFeature}
        />

        <AdventureLimitGate
          isOpen={adventureLimitOpen}
          onClose={() => setAdventureLimitOpen(false)}
          limitType={adventureLimitType}
        />

        <AdventureLimitGate
          isOpen={spotLimitOpen}
          onClose={() => setSpotLimitOpen(false)}
          limitType="spots"
          cityName={spotLimitCity}
        />

        <ParentHubModal
          open={parentHubOpen}
          onOpenChange={setParentHubOpen}
        />
      </div>
    </AdventureShellContext.Provider>
  );
}
