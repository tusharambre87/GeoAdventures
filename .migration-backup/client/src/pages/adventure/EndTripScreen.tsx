import { useState, useMemo, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useTravel } from "@/lib/travelContext";
import { useTripExecutionState } from "@/hooks/useTripExecutionState";
import { Camera, Globe, MapPin, X, Home } from "lucide-react";
import { toast } from "sonner";
import { getStopCategory } from "@/lib/stopCategories";
import { getStoryImageState, getMomentPhotos } from "@/lib/storyState";
import { TripStoryPreview } from "@/components/TripStoryPreview";
import { useFreeLimits } from "@/hooks/useFreeLimits";

// ── Stop helpers ──────────────────────────────────────────────────────────────

const EMOJI_MAP: Record<string, string> = {
  museum: "🏛️", nature: "🌿", beach: "🏖️", park: "🌳",
  zoo: "🐾", aquarium: "🐠", restaurant: "🍽️", landmark: "📍",
  market: "🛒", viewpoint: "🌅", garden: "🌸", playground: "🎠",
  cafe: "☕", breakfast: "🥐", lunch: "🥗", dinner: "🌙",
  snack: "🍎", coffee: "☕",
};

function getStopEmoji(stopType?: string | null): string {
  return EMOJI_MAP[stopType ?? ""] ?? "📍";
}

function getStopAction(stopType?: string | null): string {
  const t = (stopType ?? "").toLowerCase();
  const category = getStopCategory(t);

  if (category === "meal") {
    if (t === "breakfast") return "Had breakfast together";
    if (t === "lunch") return "Had lunch together";
    if (t === "dinner") return "Had dinner together";
    if (t === "snack") return "Snack break together";
    if (t === "coffee" || t === "cafe") return "Coffee stop";
    return "Had a meal together";
  }

  if (category === "recovery") {
    if (t === "playground") return "Let the kids run wild";
    if (t === "beach") return "Relaxed together";
    if (t === "park" || t === "garden") return "Took a break and ran around";
    return "Took a breather";
  }

  if (t === "museum") return "Discovered something new";
  if (t === "zoo") return "Saw the animals";
  if (t === "aquarium") return "Explored the sea life";
  if (t === "beach") return "Played on the beach";
  if (t === "viewpoint" || t === "landmark") return "Took it all in";
  if (t === "market") return "Wandered through";
  if (t === "garden") return "Walked together";
  return "Explored together";
}

// ── Memory bullets ────────────────────────────────────────────────────────────

interface StopShape {
  id: string;
  name: string;
  stopType?: string | null;
  isVisited?: boolean | null;
}

function generateMemoryBullets(stops: StopShape[]): string[] {
  const bullets: string[] = [];
  for (const stop of stops) {
    if (bullets.length >= 5) break;
    const category = getStopCategory(stop.stopType);
    const t = (stop.stopType ?? "").toLowerCase();

    if (category === "meal") {
      const mealWord =
        t === "breakfast" ? "breakfast" :
        t === "lunch" ? "lunch" :
        t === "dinner" ? "dinner" :
        t === "snack" ? "snacks" :
        t === "coffee" || t === "cafe" ? "coffee" :
        "a meal";
      bullets.push(`🍽️ You had ${mealWord} at ${stop.name}`);
    } else if (category === "recovery") {
      if (t === "playground") bullets.push(`🎠 The kids played at ${stop.name}`);
      else if (t === "beach") bullets.push(`🏖️ You relaxed at ${stop.name}`);
      else bullets.push(`🌳 You ran around at ${stop.name}`);
    } else {
      if (t === "museum") bullets.push(`🏛️ You explored ${stop.name}`);
      else if (t === "zoo") bullets.push(`🐾 You saw animals at ${stop.name}`);
      else if (t === "aquarium") bullets.push(`🐠 You discovered ${stop.name}`);
      else if (t === "beach") bullets.push(`🏖️ You hit the beach at ${stop.name}`);
      else if (t === "viewpoint" || t === "landmark") bullets.push(`📍 You visited ${stop.name}`);
      else if (t === "market") bullets.push(`🛒 You wandered through ${stop.name}`);
      else if (t === "garden") bullets.push(`🌸 You walked through ${stop.name}`);
      else bullets.push(`✨ You explored ${stop.name}`);
    }
  }
  return bullets;
}

// ── Story teaser mini card ────────────────────────────────────────────────────

interface TeaserCardProps {
  emoji: string;
  label: string;
  photo?: string | null;
  gradient: string;
  blurPhoto?: boolean;
}

function TeaserCard({ emoji, label, photo, gradient, blurPhoto }: TeaserCardProps) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden flex-1"
      style={{ height: 112, background: gradient }}
    >
      {photo && (
        <img
          src={photo}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: blurPhoto ? "blur(6px) brightness(0.65)" : "brightness(0.7)" }}
        />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2">
        <span className="text-2xl">{emoji}</span>
        <span className="text-[10px] font-bold text-white/80 uppercase tracking-wide text-center leading-tight">{label}</span>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EndTripScreen() {
  const [, params] = useRoute("/adventure/:tripId/end-trip");
  const tripId = params?.tripId ?? "";
  const [, setLocation] = useLocation();
  const { ensureTripLoaded, currentTripMoments } = useTravel();
  const completedRef = useRef(false);

  const [showPreview, setShowPreview] = useState(false);
  const [showCitySheet, setShowCitySheet] = useState(false);
  const [cityPreviewFilter, setCityPreviewFilter] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { isPaidUser, hasPaidTripUnlock, recordFirstPaidTripCompleted } = useFreeLimits();
  const geoPassKey = tripId ? `geoquest_geopass_endtrip_dismissed_${tripId}` : null;
  const [geoPassDismissed, setGeoPassDismissed] = useState(() =>
    geoPassKey ? localStorage.getItem(geoPassKey) === "true" : true
  );

  useEffect(() => {
    if (tripId) ensureTripLoaded(tripId);
  }, [tripId, ensureTripLoaded]);

  const { dayGroups, trip } = useTripExecutionState(tripId);

  useEffect(() => {
    if (!tripId || !trip || completedRef.current) return;
    if (trip.status === "completed") return;
    // Never auto-complete until stops are loaded AND every single one is visited
    const allStopsFlat = dayGroups.flat();
    if (allStopsFlat.length === 0) return; // stops not loaded yet — wait
    if (allStopsFlat.some(s => !s.isVisited)) return; // unvisited stops remain
    completedRef.current = true;
    fetch(`/api/travel/trips/${tripId}/complete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
    // Record first paid trip completed — used for EarlyExplorer trigger (b)
    // Only fires when user paid via Stripe (hasPaidTripUnlock), not free promo
    if (trip.adventureContext === 'travel' && hasPaidTripUnlock) {
      recordFirstPaidTripCompleted();
    }
  }, [tripId, trip, dayGroups, hasPaidTripUnlock, recordFirstPaidTripCompleted]);

  const allStops = useMemo(() => dayGroups.flat(), [dayGroups]);
  const visitedStops = useMemo(() => allStops.filter(s => s.isVisited), [allStops]);
  // Multi-city: list of unique cityGroup names with stop counts (only if 2+)
  const cityCities = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of visitedStops) {
      if (s.cityGroup) map.set(s.cityGroup, (map.get(s.cityGroup) ?? 0) + 1);
    }
    return map.size >= 2 ? [...map.entries()].map(([city, count]) => ({ city, count })) : [];
  }, [visitedStops]);
  const adventureStops = useMemo(() => visitedStops.slice(0, 6), [visitedStops]);
  const memoryBullets = useMemo(() => generateMemoryBullets(visitedStops), [visitedStops]);

  const storyPhotos = useMemo(() => getMomentPhotos(currentTripMoments), [currentTripMoments]);
  const imageState = useMemo(
    () => getStoryImageState(currentTripMoments, visitedStops),
    [currentTripMoments, visitedStops]
  );

  // City-scoped story data for multi-city "share by city" flow
  const cityPreviewStops = useMemo(
    () => cityPreviewFilter ? allStops.filter(s => s.cityGroup === cityPreviewFilter) : allStops,
    [allStops, cityPreviewFilter]
  );
  const cityPreviewStopIds = useMemo(
    () => new Set(cityPreviewStops.map(s => s.id)),
    [cityPreviewStops]
  );
  const cityPreviewMoments = useMemo(
    () => cityPreviewFilter
      ? currentTripMoments.filter(m => m.stopId != null && cityPreviewStopIds.has(m.stopId))
      : currentTripMoments,
    [cityPreviewFilter, currentTripMoments, cityPreviewStopIds]
  );
  const cityPreviewPhotos = useMemo(
    () => getMomentPhotos(cityPreviewMoments),
    [cityPreviewMoments]
  );
  const cityPreviewImageState = useMemo(
    () => getStoryImageState(cityPreviewMoments, cityPreviewStops.filter(s => s.isVisited)),
    [cityPreviewMoments, cityPreviewStops]
  );
  // Override trip destination so coordinate lookup + headlines use the correct city name
  const cityPreviewTrip = useMemo(() => {
    if (!cityPreviewFilter || !trip) return trip;
    return { ...trip, destination: cityPreviewFilter, city: cityPreviewFilter };
  }, [cityPreviewFilter, trip]);

  const firstPhoto = storyPhotos[0] ?? null;

  // ── Story flow handlers ────────────────────────────────────────────────────

  const handleViewStory = () => {
    if (tripId) localStorage.setItem(`geoquest_story_created_${tripId}`, "true");
    setShowPreview(true);
  };

  const handleRegenerateStory = async () => {
    if (!tripId || isRegenerating) return;
    setIsRegenerating(true);
    try {
      await fetch(`/api/travel/trips/${tripId}/story/regenerate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      toast.success("Story refreshed with your latest stops");
    } catch {
      toast.error("Couldn't refresh story — try again");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAddPhotos = () => {
    setLocation(`/adventure/${tripId}/parent-plan?tab=memories`);
  };

  const handleDismissGeoPass = () => {
    if (geoPassKey) localStorage.setItem(geoPassKey, "true");
    setGeoPassDismissed(true);
  };

  const handleShare = async () => {
    const tripName = trip?.name || trip?.destination || "our adventure";
    const shareText = `We just finished ${tripName} — ${visitedStops.length} amazing ${visitedStops.length === 1 ? "stop" : "stops"} with the kids! ✈️`;
    const shareUrl = `${window.location.origin}/s/${tripId}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: tripName, text: shareText, url: shareUrl });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast.success("Link copied — share your adventure");
      } catch {
        toast.error("Couldn't copy link — try again");
      }
    }
  };

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="screen-end-trip-loading">
        <div className="text-4xl animate-bounce">✈️</div>
      </div>
    );
  }

  const destinationLabel = trip.name || trip.destination;

  // ── Teaser caption ─────────────────────────────────────────────────────────

  const teaserCaption =
    imageState === "A" ? "Built from your photos, places, and memories" :
    imageState === "B" ? "Built from your route, places, and trip highlights" :
    "Add photos to make it personal";

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="screen-end-trip">

      {/* Hero */}
      <div
        className="px-5 pt-10 pb-10 text-center"
        style={{ background: "linear-gradient(160deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)" }}
        data-testid="block-trip-hero"
      >
        <div className="flex justify-start mb-2">
          <button
            onClick={() => setLocation("/geoadventures?home=1")}
            className="flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
            data-testid="button-end-trip-home"
          >
            <Home className="w-3.5 h-3.5" />
            GeoAdventures
          </button>
        </div>
        <div className="text-5xl mb-3">✈️</div>
        <h1 className="text-3xl font-black text-white leading-tight mb-1" data-testid="text-trip-complete-heading">
          This mattered
        </h1>
        <p className="text-blue-200 text-base font-semibold" data-testid="text-trip-name">
          {destinationLabel}
        </p>
      </div>

      <div className="flex-1 px-4 pt-5 pb-10 max-w-lg mx-auto w-full space-y-4">

        {/* Story teaser — "Turn this trip into a story" */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e2d4f 100%)", border: "1px solid rgba(255,255,255,0.06)" }}
          data-testid="block-story-teaser"
        >
          <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">
            Turn this trip into a story
          </p>
          <div className="flex gap-2.5 mb-3">
            {imageState === "A" ? (
              <TeaserCard
                emoji="📷"
                label="Your photos"
                photo={firstPhoto}
                gradient="linear-gradient(135deg,#1e3a5f,#2563eb)"
                blurPhoto
              />
            ) : imageState === "B" ? (
              <TeaserCard
                emoji="🗺️"
                label="Your places"
                gradient="linear-gradient(135deg,#1a2f5f,#1d4ed8)"
              />
            ) : (
              <TeaserCard
                emoji="📍"
                label="Your route"
                gradient="linear-gradient(135deg,#111827,#1e3a5f)"
              />
            )}
            <TeaserCard
              emoji="🧭"
              label="Journey map"
              gradient="linear-gradient(135deg,#1e3a5f,#0369a1)"
            />
          </div>
          <p className="text-xs text-white/45 font-medium leading-snug">{teaserCaption}</p>
        </div>

        {/* Memory bullets */}
        {memoryBullets.length > 0 && (
          <div
            className="rounded-2xl px-5 py-4"
            style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}
            data-testid="card-memory-block"
          >
            <p className="text-sm font-bold text-slate-700 mb-3">
              Here's what your explorer will remember
            </p>
            <ul className="space-y-2.5">
              {memoryBullets.map((bullet, i) => (
                <li
                  key={i}
                  className="text-sm font-semibold text-slate-800"
                  data-testid={`text-memory-bullet-${i}`}
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Adventure list */}
        {adventureStops.length > 0 && (
          <div data-testid="block-your-adventure">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
              Your adventure
            </p>
            <div className="space-y-2">
              {adventureStops.map(stop => (
                <div
                  key={stop.id}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: "#F9FAFB", border: "1px solid #F0F0F0" }}
                  data-testid={`card-adventure-stop-${stop.id}`}
                >
                  <span className="text-xl shrink-0">{getStopEmoji(stop.stopType)}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{stop.name}</div>
                    <div className="text-xs text-slate-400 font-medium">→ {getStopAction(stop.stopType)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="space-y-3 pt-1" data-testid="block-ctas">
          {/* Primary: View Your Story (orange) */}
          <button
            onClick={handleViewStory}
            className="w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
            style={{ background: "#D4872B" }}
            data-testid="button-view-story"
          >
            View Your Story
          </button>

          {/* Share by city — multi-city trips only */}
          {cityCities.length >= 2 && (
            <button
              onClick={() => setShowCitySheet(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-base font-semibold transition-all active:opacity-80 active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg,#1a2f5f 0%,#2563eb 100%)", border: "1.5px solid rgba(255,255,255,0.15)" }}
              data-testid="button-share-by-city"
            >
              <MapPin className="w-4 h-4 shrink-0" />
              Share by city
            </button>
          )}

          {/* Secondary: Refresh story (updates stop count) */}
          <button
            onClick={handleRegenerateStory}
            disabled={isRegenerating}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-slate-600 text-sm font-semibold border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
            data-testid="button-refresh-story"
          >
            {isRegenerating ? "Refreshing…" : "↻ Create new story"}
          </button>

          {/* Tertiary: View memories (link style) */}
          <button
            onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=memories`)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
            data-testid="button-view-memories"
          >
            <Camera className="w-3.5 h-3.5" />
            View memories
          </button>
        </div>


        {/* Where to next */}
        <div
          className="rounded-2xl px-5 py-5"
          style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)", border: "1px solid #FED7AA" }}
          data-testid="block-where-next"
        >
          <p className="text-base font-black text-slate-800 mb-3">Where to next?</p>
          <div className="space-y-2.5">
            <button
              onClick={() => setLocation("/build-adventure")}
              className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl text-white text-sm font-bold transition-all active:opacity-80 active:scale-[0.97]"
              style={{ background: "#D4872B" }}
              data-testid="button-try-another-city"
            >
              <Globe className="w-4 h-4 shrink-0" />
              Try another city
            </button>
            <button
              onClick={() => setLocation("/geoadventures?tab=trips")}
              className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl text-slate-700 text-sm font-bold border border-orange-200 bg-white hover:bg-orange-50 transition-colors"
              data-testid="button-home-adventure"
            >
              <MapPin className="w-4 h-4 shrink-0 text-orange-500" />
              Do a home adventure
            </button>
          </div>
        </div>
      </div>

      {/* City selector sheet — shown when "Create by City" is tapped */}
      {showCitySheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" data-testid="overlay-city-sheet">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCitySheet(false)} />
          <div
            className="relative rounded-t-3xl px-5 pt-6 pb-10"
            style={{ background: "white" }}
          >
            <button
              onClick={() => setShowCitySheet(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: "#F3F4F6" }}
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
            <p className="text-base font-black text-slate-900 mb-1">Choose a city</p>
            <p className="text-sm text-slate-500 mb-5">Create a story with just that city's stops</p>
            <div className="space-y-3">
              {cityCities.map(({ city, count }) => (
                <button
                  key={city}
                  onClick={() => {
                    setCityPreviewFilter(city);
                    setShowCitySheet(false);
                    setShowPreview(true);
                  }}
                  className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                  style={{ background: "#EFF6FF", border: "2px solid #2563eb" }}
                  data-testid={`button-city-select-${city.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🗺️</span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{city}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{count} stop{count !== 1 ? "s" : ""} explored</p>
                    </div>
                  </div>
                  <span className="text-blue-600 font-bold text-sm">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen story preview */}
      {showPreview && (
        <TripStoryPreview
          trip={cityPreviewTrip ?? trip}
          stops={cityPreviewStops}
          moments={cityPreviewMoments}
          photos={cityPreviewPhotos}
          imageState={cityPreviewImageState}
          onClose={() => { setShowPreview(false); setCityPreviewFilter(null); }}
          onAddPhotos={handleAddPhotos}
        />
      )}
    </div>
  );
}
