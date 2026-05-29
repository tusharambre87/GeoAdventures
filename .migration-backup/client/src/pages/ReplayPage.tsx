import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { Share2, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GeoAdventuresNav } from "@/components/GeoAdventuresNav";

// ── Types ────────────────────────────────────────────────────────────────────

interface ReplayStop {
  stopId: string;
  name: string;
  stopType: string;
  displayOrder: number;
  isVisited: boolean;
  storyTitle: string | null;
  storyContent: string | null;
  momentSummary: string | null;
  photos: string[];
}

interface ReplayData {
  tripName: string;
  destination: string;
  stops: ReplayStop[];
  isOwner: boolean;
  ownerName: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STOP_EMOJI: Record<string, string> = {
  museum: "🏛️", zoo: "🦁", aquarium: "🐠", beach: "🏖️",
  park: "🌳", restaurant: "🍽️", market: "🛒", playground: "🛝",
  viewpoint: "🌄", landmark: "🗺️", garden: "🌸", cafe: "☕",
  hotel: "🏨", attraction: "⭐", theme_park: "🎢", waterfall: "💧",
  nature: "🌿", farm: "🌾", activity: "🎯",
};

// Type-based gradient backgrounds (used when no user photo available)
const STOP_GRADIENTS: Record<string, string> = {
  beach: "linear-gradient(160deg,#0d4f7c 0%,#1a7a8f 50%,#2fa8a0 100%)",
  park: "linear-gradient(160deg,#0e2d0e 0%,#1a5c1a 50%,#2d8a3a 100%)",
  nature: "linear-gradient(160deg,#0e2d1a 0%,#1a5c2a 50%,#3a8a50 100%)",
  garden: "linear-gradient(160deg,#1a2d0e 0%,#2a5c1a 50%,#5a8a30 100%)",
  museum: "linear-gradient(160deg,#2d1e0e 0%,#6b4c25 50%,#a8722a 100%)",
  landmark: "linear-gradient(160deg,#2d1e0e 0%,#7a5c25 50%,#c4a050 100%)",
  viewpoint: "linear-gradient(160deg,#0e1a2d 0%,#253d6b 50%,#4a6aaa 100%)",
  waterfall: "linear-gradient(160deg,#0a1e2d 0%,#0f4d72 50%,#1a80a0 100%)",
  restaurant: "linear-gradient(160deg,#2d0e0e 0%,#6b2020 50%,#a84040 100%)",
  cafe: "linear-gradient(160deg,#2d1e0e 0%,#7a5035 50%,#b88060 100%)",
  hotel: "linear-gradient(160deg,#1a1a2d 0%,#3a3a6a 50%,#6060a0 100%)",
  aquarium: "linear-gradient(160deg,#0a1a2d 0%,#0d4060 50%,#1a6a8a 100%)",
  zoo: "linear-gradient(160deg,#1a2d10 0%,#3d6020 50%,#6aaa30 100%)",
  theme_park: "linear-gradient(160deg,#2d0d2d 0%,#6b1f6b 50%,#a840a8 100%)",
  farm: "linear-gradient(160deg,#2d2d0e 0%,#6b6b1a 50%,#a8a825 100%)",
};
const DEFAULT_GRADIENT = "linear-gradient(160deg,#0f0f1e 0%,#1e1e3a 50%,#2d2d50 100%)";

function getStopGradient(stopType: string) {
  return STOP_GRADIENTS[stopType?.toLowerCase()] ?? DEFAULT_GRADIENT;
}

const FALLBACK_LINES: Record<string, string> = {
  hotel: "Home base for the whole adventure.",
  beach: "The waves seemed endless that day.",
  museum: "History came alive behind every wall.",
  park: "Nature slowed everything down.",
  garden: "Nature slowed everything down.",
  nature: "Everything felt wilder here.",
  restaurant: "The food hit differently here.",
  cafe: "A moment to pause and breathe.",
  aquarium: "The underwater world was breathtaking.",
  zoo: "The kids could have stayed all day.",
  viewpoint: "The views made everything worth it.",
  playground: "Pure joy, no agenda needed.",
  theme_park: "Pure magic, start to finish.",
  landmark: "A place worth every minute.",
  market: "The sights, the smells, the sounds.",
  attraction: "One of those moments you can't explain.",
  waterfall: "The sound alone was worth the trip.",
  farm: "The kids learned something they won't forget.",
  activity: "No screen could replace this.",
};

const VIVID_WORDS = [
  'feet', 'miles', 'century', 'centuries', 'ancient', 'towering', 'plunges', 'plunge',
  'sacred', 'rare', 'oldest', 'deepest', 'highest', 'tallest', 'vast', 'crystal',
  'thunder', 'thundering', 'hidden', 'secret', 'legendary', 'breathtaking', 'spectacular',
  'stunning', 'lush', 'rainforest', 'jungle', 'volcano', 'lava', 'coral', 'reef',
  'roar', 'mist', 'fog', 'soar', 'soaring', 'carved', 'stretches', 'stretch',
];

function extractStoryPunchLine(storyContent: string): string | null {
  // Strip chapter markers and HTML
  const clean = storyContent
    .replace(/\[Chapter \d+[^\]]*\]/gi, ' ')
    .replace(/\[.*?\]/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sentenceRe = /[^.!?]{15,}[.!?]/g;
  const sentences = clean.match(sentenceRe) ?? [];

  const SKIP_STARTS = [
    'close your', 'imagine', 'you ', "you'", 'as you', "let's", "let me",
    'welcome to', "we're", 'picture', 'think about', 'listen',
  ];

  const candidates = sentences.filter(s => {
    const lower = s.toLowerCase().trim();
    if (SKIP_STARTS.some(sk => lower.startsWith(sk))) return false;
    if (s.trim().length < 35 || s.trim().length > 130) return false;
    return true;
  });

  // Prefer sentences with vivid/factual words
  const vivid = candidates.find(s =>
    VIVID_WORDS.some(w => s.toLowerCase().includes(w))
  );

  const chosen = vivid ?? candidates[0] ?? null;
  return chosen ? chosen.trim() : null;
}

function getOneLiner(stop: ReplayStop, isAlmostSkipped: boolean): string {
  if (isAlmostSkipped) return "You almost skipped this stop…";

  // Parse momentSummary: format is "Prompt... Answer · Prompt2... Answer2"
  if (stop.momentSummary) {
    const parts = stop.momentSummary.split(' · ');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('...')) {
        // "The best thing I saw was... Colorful fishies"
        const sepIdx = trimmed.indexOf('...');
        const prompt = trimmed.slice(0, sepIdx).trim();
        const answer = trimmed.slice(sepIdx + 3).trim();
        if (answer.length >= 3) {
          const full = `${prompt}… ${answer}`;
          if (full.length <= 85) return full;
          // Answer alone if too long
          if (answer.length <= 70) return answer;
        }
      } else if (trimmed.length >= 5 && trimmed.length <= 70) {
        return `"${trimmed}"`;
      }
    }
  }

  // Try storyContent punch line
  if (stop.storyContent) {
    const line = extractStoryPunchLine(stop.storyContent);
    if (line) return line;
  }

  const type = stop.stopType?.toLowerCase() ?? '';
  return FALLBACK_LINES[type] ?? "A moment worth remembering.";
}

// ── Navigation transition hook ────────────────────────────────────────────────

function useSlideNav(initialSlide = -1) {
  const [slide, setSlide] = useState(initialSlide);
  const [visible, setVisible] = useState(true);

  const go = useCallback((next: number) => {
    setVisible(false);
    setTimeout(() => {
      setSlide(next);
      setTimeout(() => setVisible(true), 30);
    }, 180);
  }, []);

  return { slide, visible, go };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ReplayPage() {
  const [, params] = useRoute("/replay/:tripId");
  const tripId = params?.tripId ?? "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [data, setData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<"not-found" | "error" | null>(null);

  const { slide, visible, go } = useSlideNav(-1);

  useEffect(() => {
    if (!tripId) return;
    let classified = false;
    fetch(`/api/trips/${tripId}/replay-data`)
      .then(r => {
        if (r.status === 404) { classified = true; setErrorType("not-found"); throw new Error(); }
        if (!r.ok) { classified = true; setErrorType("error"); throw new Error(); }
        return r.json();
      })
      .then((d: ReplayData) => setData(d))
      .catch(() => { if (!classified) setErrorType("error"); })
      .finally(() => setLoading(false));
  }, [tripId]);

  const stops = (data?.stops ?? []).filter(s => s.isVisited);
  const destination = data?.destination ?? "";

  const allPhotos = stops.flatMap(s => s.photos);
  const heroPhoto = allPhotos[0] ?? null;
  const finalPhoto = allPhotos[allPhotos.length - 1] ?? heroPhoto;

  // "Almost skipped" stop at ~55% through
  const almostSkippedIdx = stops.length >= 3 ? Math.floor(stops.length * 0.55) : -1;

  const totalStopSlides = stops.length;
  const finalSlide = totalStopSlides;
  const endSlide = totalStopSlides + 1;

  // Auto-advance on stop slides
  useEffect(() => {
    if (slide < 0 || slide >= totalStopSlides) return;
    const t = setTimeout(() => go(slide + 1), 5000);
    return () => clearTimeout(t);
  }, [slide, totalStopSlides, go]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/replay/${tripId}`;
    const shareText = `Someone shared their travel journey to ${destination} through GeoAdventures`;
    if (navigator.share) {
      navigator.share({ title: "GeoAdventures", text: shareText, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText}\n${url}`).then(() => {
        toast({ title: "Link copied!", description: "Share with family and friends" });
      });
    }
  }, [tripId, destination, toast]);

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: "#0d0f1e" }}>
        <style>{`
          @keyframes planefly {
            0%   { transform: translateX(-60px) translateY(0px); opacity: 0; }
            10%  { opacity: 1; }
            45%  { transform: translateX(0px) translateY(-10px); }
            55%  { transform: translateX(0px) translateY(-10px); }
            90%  { opacity: 1; }
            100% { transform: translateX(60px) translateY(0px); opacity: 0; }
          }
          @keyframes dotFade {
            0%,80%,100% { opacity: 0.2; transform: translateY(0); }
            40%          { opacity: 1;   transform: translateY(-4px); }
          }
          @keyframes pinPulse {
            0%,100% { transform: scale(1);    opacity: 0.7; }
            50%      { transform: scale(1.2); opacity: 1;   }
          }
        `}</style>

        {/* Flight path illustration */}
        <div className="relative flex items-center justify-center mb-8" style={{ width: 200, height: 64 }}>
          {/* Dashed path line */}
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2"
            style={{ borderTop: "2px dashed rgba(212,135,43,0.3)", height: 0 }} />

          {/* Left pin */}
          <div className="absolute left-0 text-2xl select-none"
            style={{ animation: "pinPulse 2s ease-in-out infinite" }}>
            📍
          </div>

          {/* Flying airplane */}
          <div className="absolute text-2xl select-none"
            style={{ animation: "planefly 2s ease-in-out infinite" }}>
            ✈️
          </div>

          {/* Right pin */}
          <div className="absolute right-0 text-2xl select-none"
            style={{ animation: "pinPulse 2s ease-in-out 1s infinite" }}>
            📍
          </div>
        </div>

        <p className="text-sm font-semibold mb-3" style={{ color: "#E8962F" }}>
          Preparing your replay
        </p>

        {/* Animated dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "rgba(212,135,43,0.6)",
                animation: `dotFade 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
          ))}
        </div>
      </div>
    );
  }

  if (errorType || !data) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center" style={{ background: "#000" }}>
        <div className="text-5xl mb-4">🗺️</div>
        <h1 className="text-xl font-bold text-white mb-2">Couldn't load this replay</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
          This adventure may not have visited stops yet.
        </p>
        <button
          onClick={() => setLocation("/")}
          className="px-6 py-3 rounded-2xl text-white font-bold text-sm"
          style={{ background: "linear-gradient(135deg,#E8962F 0%,#D4872B 100%)" }}
        >
          Go home
        </button>
      </div>
    );
  }

  // ── Shared UI: top bar ────────────────────────────────────────────────────
  const SafeTopBar = ({ showProgress = false, currentStop = 0 }: { showProgress?: boolean; currentStop?: number }) => (
    <div
      className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4 z-20"
      style={{ paddingTop: "max(16px, env(safe-area-inset-top, 16px))" }}
      onClick={e => e.stopPropagation()}
    >
      {showProgress && (
        <div className="flex-1 flex items-center gap-[3px]">
          {stops.map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-all duration-300"
              style={{
                height: 3,
                background: i <= currentStop ? "#E8962F" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      )}
      {!showProgress && <div className="flex-1" />}
      <button
        onClick={handleShare}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
        data-testid="button-replay-share"
      >
        <Share2 className="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  );

  // ── SCREEN 1: START ────────────────────────────────────────────────────────
  if (slide === -1) {
    return (
      <div
        className="fixed inset-0 flex flex-col"
        style={{ background: "#000", opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
      >
        {heroPhoto ? (
          <img src={heroPhoto} alt={destination} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: getStopGradient('viewpoint') }} />
        )}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.96) 100%)" }} />

        <SafeTopBar />

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "#E8962F" }}>
            GeoAdventures · Family Travel
          </p>
          <h1 className="text-4xl font-black text-white leading-tight mb-1">{destination}</h1>
          <p className="text-base font-medium mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>
            Relive your trip · {totalStopSlides} stop{totalStopSlides !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => go(0)}
            className="w-full py-4 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 shadow-2xl active:scale-[0.97] transition-transform"
            style={{ background: "linear-gradient(135deg,#E8962F 0%,#D4872B 100%)" }}
            data-testid="button-replay-start"
          >
            Start <ChevronRight className="w-5 h-5" />
          </button>
          <p className="text-center text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            Tap anywhere to advance through stops
          </p>
        </div>

        <style>{`@keyframes replayProgress { from { width: 0% } to { width: 100% } }`}</style>
      </div>
    );
  }

  // ── SCREEN 2+: STOP SLIDES ─────────────────────────────────────────────────
  if (slide >= 0 && slide < totalStopSlides) {
    const stop = stops[slide];
    const isAlmostSkipped = slide === almostSkippedIdx;
    const oneLiner = getOneLiner(stop, isAlmostSkipped);
    const emoji = STOP_EMOJI[stop.stopType?.toLowerCase()] ?? "📍";
    const hasPhoto = stop.photos.length > 0;
    const isFirst = slide === 0;
    const isLast = slide === totalStopSlides - 1;

    return (
      <div
        className="fixed inset-0 flex flex-col cursor-pointer"
        style={{
          background: hasPhoto ? "#000" : getStopGradient(stop.stopType),
          opacity: visible ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
        onClick={() => go(isLast ? finalSlide : slide + 1)}
        data-testid={`screen-replay-stop-${slide}`}
      >
        {hasPhoto && (
          <img
            src={stop.photos[0]}
            alt={stop.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 28%, transparent 45%, rgba(0,0,0,0.88) 100%)" }} />

        {/* Top bar with progress */}
        <SafeTopBar showProgress currentStop={slide} />

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-8" onClick={e => e.stopPropagation()}>

          {/* Almost-skipped badge */}
          {isAlmostSkipped && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-xs font-bold"
              style={{ background: "rgba(212,135,43,0.2)", border: "1px solid rgba(212,135,43,0.5)", color: "#E8962F" }}
            >
              ✨ Almost skipped this one
            </div>
          )}

          {/* Stop label */}
          <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            {emoji} {stop.stopType?.replace(/_/g, " ") ?? "Stop"}
          </p>

          {/* Stop name */}
          <h2 className="text-2xl font-black text-white leading-tight mb-3">{stop.name}</h2>

          {/* Punch line */}
          <p className="text-base font-medium leading-snug mb-5" style={{ color: "rgba(255,255,255,0.82)" }}>
            {oneLiner}
          </p>

          {/* Navigation row */}
          <div className="flex items-center justify-between">
            {/* Prev button */}
            <button
              onClick={e => { e.stopPropagation(); if (!isFirst) go(slide - 1); else go(-1); }}
              className="flex items-center gap-1 px-4 py-2 rounded-full font-semibold text-sm"
              style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.7)" }}
              data-testid={`button-replay-prev-${slide}`}
            >
              <ChevronLeft className="w-4 h-4" />
              {isFirst ? "Cover" : "Back"}
            </button>

            {/* Auto-advance progress bar */}
            <div className="flex-1 mx-3 rounded-full overflow-hidden" style={{ height: 2, background: "rgba(255,255,255,0.15)" }}>
              <div className="h-full rounded-full" key={slide}
                style={{ width: "100%", background: "rgba(255,255,255,0.45)", animation: "replayProgress 5s linear forwards" }} />
            </div>

            {/* Next button */}
            <button
              onClick={e => { e.stopPropagation(); go(isLast ? finalSlide : slide + 1); }}
              className="flex items-center gap-1 px-4 py-2 rounded-full font-bold text-sm text-white"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
              data-testid={`button-replay-next-${slide}`}
            >
              {isLast ? "Finish" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <style>{`@keyframes replayProgress { from { width: 0% } to { width: 100% } }`}</style>
      </div>
    );
  }

  // ── FINAL SCREEN ──────────────────────────────────────────────────────────
  if (slide === finalSlide) {
    return (
      <div
        className="fixed inset-0 flex flex-col cursor-pointer"
        style={{ background: "#000", opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
        onClick={() => go(endSlide)}
      >
        {finalPhoto ? (
          <img src={finalPhoto} alt="Final memory" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: getStopGradient('viewpoint') }} />
        )}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.85) 100%)" }} />

        <div className="absolute inset-0 flex flex-col items-center justify-end px-8 pb-16">
          <p className="text-3xl font-black text-white text-center leading-tight mb-8">
            We'll talk about this trip for years.
          </p>
          <button
            onClick={e => { e.stopPropagation(); go(endSlide); }}
            className="px-10 py-3.5 rounded-2xl font-bold text-white text-base"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}
            data-testid="button-replay-continue"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── END SCREEN ─────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background: "#0d1117",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease",
        paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 25%,rgba(212,135,43,0.1) 0%,transparent 65%)" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative">
        <div className="text-5xl mb-5">🌍</div>
        <h2 className="text-2xl font-black text-white mb-2">What a journey.</h2>
        <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.4)" }}>
          {destination} · {totalStopSlides} stop{totalStopSlides !== 1 ? "s" : ""}
        </p>

        <a
          href="/geoadventures"
          className="w-full max-w-xs py-4 rounded-2xl text-white font-black text-base flex items-center justify-center mb-3 shadow-xl active:scale-[0.97] transition-transform"
          style={{ background: "linear-gradient(135deg,#E8962F 0%,#D4872B 100%)" }}
          data-testid="button-replay-plan-next"
        >
          Plan next trip →
        </a>

        <button
          onClick={() => go(-1)}
          className="w-full max-w-xs py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 mb-5"
          style={{ border: "2px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.65)", background: "transparent" }}
          data-testid="button-replay-again"
        >
          <RotateCcw className="w-4 h-4" />
          Replay again
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 text-sm font-semibold py-2"
          style={{ color: "#E8962F" }}
          data-testid="button-replay-share-end"
        >
          <Share2 className="w-4 h-4" />
          Share {destination} Journey
        </button>
      </div>

      <GeoAdventuresNav activeTab="me" />
    </div>
  );
}
