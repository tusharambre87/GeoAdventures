import { useState, useEffect } from "react";
import { useAdventureShell } from "./AdventureShell";
import { useTravel } from "@/lib/travelContext";
import { useExplorer } from "@/lib/explorerContext";
import { useLocation } from "wouter";
import { navReplace, navPush } from "@/lib/nav";
import { getNextKidRoute } from "./adventureRouter";
import { DidYouKnow } from "@/components/TripEnhancements";
import { getTravelAvatarForTrip } from "@/lib/travelAvatars";
import { ChevronRight, Star, Backpack, Trophy, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { getStopTypeEmoji } from "@/lib/travelAvatars";
import { getPlannedNextStop } from "./adventureRouter";
import { getAdventureCityImage } from "@/lib/adventureImages";
import { useOnDemandCityImage } from "@/hooks/useOnDemandAdventureImage";

const KID_FRIENDLY_CITY_IMAGES: Record<string, string> = {
  paris: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=800&h=500&fit=crop",
  london: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&h=500&fit=crop",
  tokyo: "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&h=500&fit=crop",
  newyork: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&h=500&fit=crop",
  rome: "https://images.unsplash.com/photo-1525874684015-58379d421a52?w=800&h=500&fit=crop",
  sydney: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&h=500&fit=crop",
  hawaii: "https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=800&h=500&fit=crop",
  disney: "https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=800&h=500&fit=crop",
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop",
  safari: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=500&fit=crop",
  india: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=500&fit=crop",
  china: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=500&fit=crop",
  japan: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=500&fit=crop",
  greece: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&h=500&fit=crop",
  egypt: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&h=500&fit=crop",
  brazil: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=500&fit=crop",
  canada: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&h=500&fit=crop",
  australia: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&h=500&fit=crop",
  mexico: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&h=500&fit=crop",
  "st louis": "/city-images/st-louis.jpg",
  "saint louis": "/city-images/st-louis.jpg",
  missouri: "/city-images/st-louis.jpg",
  omaha: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=500&fit=crop",
  orlando: "https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=800&h=500&fit=crop",
  singapore: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=500&fit=crop",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=500&fit=crop",
  barcelona: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=500&fit=crop",
  "los angeles": "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&h=500&fit=crop",
  "san francisco": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=500&fit=crop",
  chicago: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&h=500&fit=crop",
  seattle: "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800&h=500&fit=crop",
  "las vegas": "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=800&h=500&fit=crop",
  washington: "https://images.unsplash.com/photo-1617581629397-a72507c3de9e?w=800&h=500&fit=crop",
  nashville: "https://images.unsplash.com/photo-1587162146766-e06b1189b907?w=800&h=500&fit=crop",
};

const KID_FRIENDLY_FALLBACKS = [
  "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1504150558240-0b4fd8946624?w=800&h=500&fit=crop",
];

function getKidFriendlyImage(city?: string | null, country?: string, destination?: string): string {
  const illustratedImage = getAdventureCityImage(city, destination);
  if (illustratedImage) return illustratedImage;

  const searchText = `${city || ''} ${country || ''} ${destination || ''}`.toLowerCase();
  for (const [key, url] of Object.entries(KID_FRIENDLY_CITY_IMAGES)) {
    if (searchText.includes(key)) return url;
  }
  let hash = 0;
  const hashSource = city || destination || 'adventure';
  for (let i = 0; i < hashSource.length; i++) {
    hash = ((hash << 5) - hash) + hashSource.charCodeAt(i);
    hash |= 0;
  }
  return KID_FRIENDLY_FALLBACKS[Math.abs(hash) % KID_FRIENDLY_FALLBACKS.length];
}

export default function AdventureKidHome() {
  const { tripId } = useAdventureShell();
  const { currentTrip, currentTripStops, fetchTrip } = useTravel();
  const { activeExplorer } = useExplorer();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);
  const [showKeepsakes, setShowKeepsakes] = useState(false);
  const [showStopPicker, setShowStopPicker] = useState(false);
  const [keepsakes, setKeepsakes] = useState<any[]>([]);

  const { image: onDemandCityImage } = useOnDemandCityImage(currentTrip?.city, currentTrip?.country);

  useEffect(() => {
    if (currentTrip && activeExplorer && currentTripStops.length > 0) {
      const stopNames = new Set(currentTripStops.map(s => s.name));
      Promise.all([
        ...currentTripStops.map(s =>
          fetch(`/api/travel/artifacts/by-stop/${encodeURIComponent(s.name)}`, { credentials: 'include' }).then(r => r.ok ? r.json() : [])
        ),
        fetch(`/api/travel/artifacts/collected/${activeExplorer.id}/${currentTrip.id}`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
      ])
        .then((results) => {
          const collected = results[results.length - 1] || [];
          const collectedIds = new Set((collected).map((c: any) => c.artifactId));
          const allTripArtifacts = results.slice(0, -1).flat();
          const merged = allTripArtifacts.map((a: any) => ({
            ...a,
            isCollected: collectedIds.has(a.id),
          }));
          setKeepsakes(merged);
        })
        .catch(() => {});
    }
  }, [currentTrip?.id, activeExplorer?.id, currentTripStops.length]);

  if (!currentTrip) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="kid-home-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7A1A] mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  const tripAvatarObj = getTravelAvatarForTrip(currentTrip.city || undefined, currentTrip.country);
  const adventureStarted = !!currentTrip.adventureStartedAt;
  const stockHeroImage = getKidFriendlyImage(currentTrip.city, currentTrip.country, currentTrip.destination);
  const heroImage = onDemandCityImage || stockHeroImage;
  const displayName = currentTrip.city || currentTrip.destination?.split(",")[0]?.trim() || currentTrip.name;

  const totalStops = currentTripStops.length;
  const visitedStops = currentTripStops.filter(s => s.isVisited).length;
  const progressPercent = totalStops > 0 ? (visitedStops / totalStops) * 100 : 0;

  const handleStartContinue = async () => {
    if (!adventureStarted) {
      setIsStarting(true);
      try {
        await fetch(`/api/travel/trips/${tripId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            status: "active",
            adventureStartedAt: new Date().toISOString(),
          }),
        });
        await fetchTrip(tripId);
        toast({
          title: "Adventure Started!",
          description: "Your journey has officially begun!",
        });
        navReplace(setLocation, `/adventure/${tripId}/kid/next`);
      } catch (error) {
        console.error("Error starting adventure:", error);
        toast({
          title: "Couldn't start",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsStarting(false);
      }
      return;
    }

    const nextRoute = getNextKidRoute(tripId, currentTrip, currentTripStops, [], {});
    navReplace(setLocation, nextRoute);
  };

  const nextStop = currentTripStops.find(s => !s.isVisited);

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] bg-[#F6F7F9]" data-testid="kid-home-page">
      <div className="relative overflow-hidden" style={{ height: "480px" }}>
        <motion.img
          src={heroImage}
          alt={displayName}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.02 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          data-testid="img-hero-destination"
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.15) 65%, rgba(246,247,249,0.5) 85%, #F6F7F9 100%)',
          }}
        />

        <div className="absolute bottom-0 left-0 right-0 px-[5%] z-10" style={{ paddingBottom: '80px' }}>
          <div
            className="p-5 rounded-[24px]"
            style={{
              background: 'rgba(30,30,30,0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 15px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base brightness-125">⭐</span>
              <h1
                className="text-[32px] font-bold text-white leading-tight tracking-wide"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                data-testid="text-trip-title"
              >
                {displayName}
              </h1>
            </div>
            <DidYouKnow
              destination={currentTrip.destination}
              city={currentTrip.city}
              country={currentTrip.country}
              variant="overlay"
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center" style={{ paddingBottom: '16px' }}>
          <motion.button
            onClick={handleStartContinue}
            disabled={isStarting}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.97 }}
            className="w-[75%] h-[52px] rounded-full text-white font-bold text-lg disabled:opacity-70"
            style={{
              background: 'linear-gradient(135deg, #FF7A1A 0%, #F97316 100%)',
              boxShadow: '0 12px 30px rgba(249,115,22,0.4)',
            }}
            data-testid="button-start-adventure"
          >
            {isStarting ? "Starting..." : "Continue Journey \u2192"}
          </motion.button>
        </div>
      </div>

      {/* Parent / Kid toggle bar */}
      <div className="mx-4 mb-4 mt-4 flex items-center bg-gray-100 rounded-full p-1" data-testid="view-mode-toggle">
        <button
          onClick={() => navPush(setLocation, `/adventure/${tripId}/parent-plan`)}
          className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all text-gray-500 hover:text-orange-600"
          data-testid="toggle-parent-view"
        >
          Parent View
        </button>
        <button
          className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all text-white shadow-sm"
          style={{ background: '#7DA892' }}
          data-testid="toggle-kid-mode-active"
        >
          🧒 Kid Mode
        </button>
      </div>

      <div className="px-6 pt-5 pb-4">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-[20px] font-bold text-[#111827]">Adventure Progress</h2>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[14px] text-[#6B7280] font-medium">{visitedStops} of {totalStops} Stops Visited</span>
          <div className="flex-1 h-[10px] rounded-full overflow-hidden" style={{ background: '#E5E7EB', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #FF7A1A, #FB923C)' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(progressPercent, 3)}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            />
          </div>
        </div>
        {nextStop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-1.5 text-[13px] text-[#6B7280]"
          >
            <span className="font-medium text-[#111827]">Next Stop:</span>
            <span>{nextStop.name}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.div>
        )}
        {adventureStarted && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            onClick={() => setShowStopPicker(true)}
            className="flex items-center justify-center gap-1 text-[13px] text-orange-600 font-semibold mt-1 hover:text-orange-700 transition-colors"
            data-testid="button-choose-different-stop"
          >
            Choose a different stop
          </motion.button>
        )}
      </div>

      <div className="px-6 pb-8">
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navPush(setLocation, `/adventure/${tripId}/kid/explore-city`)}
            className="rounded-[20px] p-4 text-left"
            style={{
              background: 'linear-gradient(135deg, #FFF5EB 0%, #FFE8D6 100%)',
              border: '1px solid rgba(249,115,22,0.12)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
            }}
            data-testid="button-explore-city"
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shrink-0">
                <span className="text-xl">📍</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[14px] text-[#111827] leading-tight whitespace-nowrap">Explore the City</h3>
                <p className="text-[12px] text-[#6B7280]">Discover top sights</p>
              </div>
            </div>
            <div
              className="flex items-center justify-center gap-1 w-full h-[34px] rounded-full text-[13px] font-bold text-white"
              style={{ background: '#F97316', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}
            >
              Play
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navPush(setLocation, `/adventure/${tripId}/kid/games`)}
            className="rounded-[20px] p-4 text-left"
            style={{
              background: 'linear-gradient(135deg, #EEF6FF 0%, #DDEEFF 100%)',
              border: '1px solid rgba(59,130,246,0.12)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
            }}
            data-testid="button-play-together"
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shrink-0">
                <span className="text-xl">🎮</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[14px] text-[#111827] leading-tight">Play Together</h3>
                <p className="text-[12px] text-[#6B7280]">Fun mini-games</p>
              </div>
            </div>
            <div
              className="flex items-center justify-center gap-1 w-full h-[34px] rounded-full text-[13px] font-bold text-white"
              style={{ background: '#F97316', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}
            >
              Play
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowKeepsakes(true)}
            className="rounded-[20px] p-4 text-left col-span-2"
            style={{
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '1px solid rgba(245,158,11,0.15)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
            }}
            data-testid="button-travel-keepsakes"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shrink-0">
                <span className="text-xl">🏆</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[14px] text-[#111827] leading-tight">Travel Vault</h3>
                <p className="text-[12px] text-[#6B7280]">
                  {keepsakes.length > 0
                    ? `${keepsakes.filter((k: any) => k.isCollected).length} of ${keepsakes.length} keepsakes collected`
                    : "Earn keepsakes at each stop"}
                </p>
              </div>
              <div
                className="flex items-center justify-center gap-1 h-[34px] px-5 rounded-full text-[13px] font-bold text-white shrink-0"
                style={{ background: '#F97316', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}
              >
                View
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showStopPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowStopPicker(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="relative bg-white w-full max-w-lg rounded-t-[2rem] p-6 shadow-2xl max-h-[75vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-orange-900">Where to next?</h3>
                <button onClick={() => setShowStopPicker(false)} className="p-2 bg-orange-50 rounded-full text-orange-600" data-testid="button-close-stop-picker">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 pb-6">
                {(() => {
                  const plannedStop = getPlannedNextStop(currentTripStops);
                  const unvisited = currentTripStops.filter(s => !s.isVisited).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                  const visited = currentTripStops.filter(s => s.isVisited).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

                  const handlePickStop = (stopId: string | null) => {
                    if (stopId) {
                      sessionStorage.setItem(`adventure_override_stop_${tripId}`, stopId);
                    } else {
                      sessionStorage.removeItem(`adventure_override_stop_${tripId}`);
                    }
                    setShowStopPicker(false);
                    navReplace(setLocation, `/adventure/${tripId}/kid/next`);
                  };

                  return (
                    <>
                      {plannedStop && (
                        <button
                          onClick={() => handlePickStop(null)}
                          className="flex items-center gap-3 w-full p-4 rounded-2xl border-2 bg-orange-50 border-orange-400"
                          data-testid="button-pick-planned"
                        >
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-lg">
                            {getStopTypeEmoji(plannedStop.stopType || undefined)}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <p className="font-bold text-orange-900 text-sm">Follow Planned Route</p>
                            <p className="text-xs text-orange-500 truncate">{plannedStop.name}</p>
                          </div>
                          <Check className="text-orange-500 w-5 h-5 shrink-0" />
                        </button>
                      )}

                      <div className="h-px bg-gray-100 my-3" />

                      {unvisited.map((stop) => (
                        <button
                          key={stop.id}
                          onClick={() => handlePickStop(stop.id)}
                          className="flex items-center gap-3 w-full p-4 rounded-2xl border-2 bg-white border-gray-100 hover:border-orange-200"
                          data-testid={`button-pick-stop-${stop.id}`}
                        >
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-lg">
                            {getStopTypeEmoji(stop.stopType || undefined)}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <p className="font-bold text-orange-900 text-sm">{stop.name}</p>
                            <p className="text-xs text-orange-500 capitalize">{stop.stopType || 'Adventure'}</p>
                          </div>
                        </button>
                      ))}

                      {visited.length > 0 && (
                        <>
                          <div className="h-px bg-gray-100 my-3" />
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Completed Stops</p>
                          {visited.map((stop) => (
                            <button
                              key={stop.id}
                              onClick={() => handlePickStop(stop.id)}
                              className="flex items-center gap-3 w-full p-4 rounded-2xl border-2 bg-white border-gray-100 hover:border-green-200"
                              data-testid={`button-pick-visited-${stop.id}`}
                            >
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">
                                {getStopTypeEmoji(stop.stopType || undefined)}
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <p className="font-bold text-gray-700 text-sm">{stop.name}</p>
                                <p className="text-xs text-green-500 capitalize flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Visited
                                </p>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showKeepsakes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowKeepsakes(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white rounded-t-3xl px-6 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-[#111827]">Travel Vault</h2>
                </div>
                <button
                  onClick={() => setShowKeepsakes(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                  data-testid="button-close-keepsakes"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="px-6 py-4">
                {keepsakes.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-500 mb-4">
                      {keepsakes.filter((k: any) => k.isCollected).length} of {keepsakes.length} keepsakes collected
                    </p>
                    <div className="grid grid-cols-5 gap-3">
                      {keepsakes.map((k: any, i: number) => (
                        <div
                          key={k.id || i}
                          className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 ${
                            k.isCollected
                              ? "bg-gradient-to-br from-amber-100 to-orange-100 shadow-sm"
                              : "bg-gray-100 grayscale opacity-40"
                          }`}
                          data-testid={`keepsake-grid-${k.id || i}`}
                        >
                          <span className="text-2xl">{k.imageEmoji || k.emoji || "🎁"}</span>
                          <span className="text-[9px] text-gray-600 font-medium text-center leading-tight px-1 truncate w-full">
                            {k.name || "???"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-4">
                      Complete Journey Packs to earn keepsakes!
                    </p>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <span className="text-4xl mb-3 block">🏆</span>
                    <p className="text-gray-500 text-sm">
                      Listen to stories and complete activities at each stop to earn travel keepsakes!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
