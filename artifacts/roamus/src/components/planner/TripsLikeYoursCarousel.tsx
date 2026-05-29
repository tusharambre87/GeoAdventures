import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useUser } from "@/lib/userContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { TripUnlockSheet } from "./TripUnlockSheet";
import { AuthGateSheet } from "./AuthGateSheet";
import { SignUpPrompt } from "@/components/SignUpPrompt";
import { getAdventureCityImage } from "@/lib/adventureImages";

type PriceBand = "A" | "B" | "C";
const BAND_LABELS: Record<PriceBand, { label: string; founding: string }> = {
  A: { label: "$9.99", founding: "$5.99" },
  B: { label: "€7.99", founding: "€5.99" },
  C: { label: "₹199",  founding: "₹149"  },
};

interface MemoryPayload {
  destinationKey: string;
  heroLine: string;
  heroSubline: string;
  heroImageUrl: string;
  moments: {
    placeName: string;
    momentType: string;
    imageUrl: string;
    caption: string;
    sortOrder: number;
  }[];
  kidQuotes: string[];
  kidImageUrl: string;
  parentReliefLine: string;
  parentImageUrl: string;
}

interface TripsLikeYoursCarouselProps {
  destination: string;
  country?: string;
  tripType?: string;
  stops?: string[];
  stopCount?: number;
  tripDays?: number;
  tripId?: string;
  /** All cities in a multi-city trip (e.g. ["Bangalore", "Ooty"]) — used for the closing card label */
  allCities?: string[];
  /** Called when paywall is off and user taps "Start This Experience" — reveals the plan in-place */
  onRevealPlan?: () => void;
  /** When true, suppresses the fixed sticky CTA bar (e.g. when inline CTA is visible or plan is revealed) */
  hideStickyBar?: boolean;
  /** Number of OTHER trips the user has already created (0 = this is their first trip) */
  userTripCount?: number;
  /** First photo URL from any previous trip — used on Card 2 for second-trip+ users */
  previousTripPhotoUrl?: string | null;
}

// Top-10 pre-seeded destinations — no Fix 2 overlay applied to these
const TOP_10_KEYS = ["chicago", "paris", "london", "new york", "nyc", "tokyo", "sydney", "rome", "barcelona", "dubai", "singapore"];
function isTop10Destination(dest: string): boolean {
  const d = dest.toLowerCase().trim();
  return TOP_10_KEYS.some(k => d.includes(k));
}

const GENERIC_FAMILY_FALLBACKS = [
  "/memory-images/london-parent.png",
  "/memory-images/nyc-parent.png",
  "/memory-images/sydney-parent.png",
  "/family-photos/fam3.jpg",
];

function CardImage({ src, alt, className, objectPosition, fallbackIndex = 0 }: { src: string | null | undefined; alt: string; className?: string; objectPosition?: string; fallbackIndex?: number }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const fallbackSrc = GENERIC_FAMILY_FALLBACKS[fallbackIndex % GENERIC_FAMILY_FALLBACKS.length];
  const effectiveSrc = (!src || src.includes("source.unsplash.com")) ? fallbackSrc : src;

  return (
    <div className={`${className || ""} overflow-hidden`}>
      <img
        src={errored ? fallbackSrc : effectiveSrc}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!errored) setErrored(true);
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: objectPosition || "center center",
          transform: loaded ? "scale(1.02)" : "scale(1)",
          transition: "transform 1.2s ease",
          opacity: loaded ? 1 : 0,
          transitionProperty: "transform, opacity",
        }}
      />
    </div>
  );
}

function ProgressDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-3 pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-testid={`carousel-dot-${i}`}
          style={{
            width: i === active ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === active ? "#E8962F" : "rgba(255,255,255,0.35)",
            transition: "width 0.3s ease, background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

interface FamilyPhoto {
  id: string;
  imageUrl: string;
  category: string;
  poseType: string;
  city: string;
}

export function TripsLikeYoursCarousel({ destination, country, tripType, stops, stopCount, tripDays, tripId, allCities, onRevealPlan, hideStickyBar, userTripCount = 0, previousTripPhotoUrl }: TripsLikeYoursCarouselProps) {
  const { user } = useUser();
  const { paywallEnabled } = useFeatureFlags();
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const [payload, setPayload] = useState<MemoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [communityPhotos, setCommunityPhotos] = useState<FamilyPhoto[]>([]);
  const [familyPhotos, setFamilyPhotos] = useState<FamilyPhoto[]>([]);
  const [activeCard, setActiveCard] = useState(0);
  const [showStickyCta] = useState(true); // always visible from page load
  const [cardVisible, setCardVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [saveForLaterOpen, setSaveForLaterOpen] = useState(false);
  const [adminUnlocking, setAdminUnlocking] = useState(false);
  const [autoUnlocking, setAutoUnlocking] = useState(false);
  // Reactively tracks ?tripUnlocked=true in URL (works even when sheet closes on same page)
  const [apiUnlocked, setApiUnlocked] = useState(false);
  const urlUnlocked = new URLSearchParams(searchStr).get("tripUnlocked") === "true";
  const tripIsUnlocked = urlUnlocked || apiUnlocked;

  const band: PriceBand = ((user?.pricingBand as PriceBand) || "A");
  const bandLabels = BAND_LABELS[band];
  const useFoundingPrice = !!user?.isFoundingFamily;
  const ctaPriceLabel = useFoundingPrice ? bandLabels.founding : bandLabels.label;
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const stopsKey = stops?.join(",") ?? "";

  useEffect(() => {
    if (!destination) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (tripType) params.set("tripType", tripType);
    if (stopsKey) params.set("stops", stopsKey);
    const qs = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/memory-engine/${encodeURIComponent(destination)}${qs}`)
      .then(r => {
        if (!r.ok) throw new Error(`Memory engine returned ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (
          data &&
          typeof data === "object" &&
          "heroLine" in data &&
          "moments" in data &&
          Array.isArray((data as MemoryPayload).moments) &&
          (data as MemoryPayload).moments.length > 0
        ) {
          setPayload(data as MemoryPayload);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [destination, country, tripType, stopsKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardWidth = el.scrollWidth / TOTAL_CARDS;
      const index = Math.round(el.scrollLeft / cardWidth);
      setActiveCard(Math.min(TOTAL_CARDS - 1, Math.max(0, index)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [payload]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCardVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch real community photos shared by families for this destination (highest priority)
  useEffect(() => {
    setCommunityPhotos([]); // clear stale photos immediately on destination change
    if (!destination) return;
    fetch(`/api/community-moments/for-city?city=${encodeURIComponent(destination)}&limit=4`)
      .then(r => r.ok ? r.json() : { photos: [] })
      .then((d: { photos: Array<{ id: string; imageUrl: string; city: string }> }) => {
        if (Array.isArray(d.photos) && d.photos.length > 0) {
          const mapped: FamilyPhoto[] = d.photos.map(p => ({
            id: p.id,
            imageUrl: p.imageUrl,
            category: "community",
            poseType: "candid",
            city: p.city,
          }));
          setCommunityPhotos(mapped);
        }
      })
      .catch(() => {});
  }, [destination]);

  // Fetch AI-generated family photos for this destination (fallback)
  useEffect(() => {
    setFamilyPhotos([]); // clear stale photos immediately on destination change
    if (!destination) return;
    const citySlug = destination.toLowerCase().replace(/\s+/g, "-");
    fetch(`/api/family-photos/for-trip?city=${encodeURIComponent(citySlug)}`)
      .then(r => r.ok ? r.json() : { photos: [] })
      .then((d: { photos: FamilyPhoto[] }) => {
        if (Array.isArray(d.photos) && d.photos.length > 0) setFamilyPhotos(d.photos);
      })
      .catch(() => {});
  }, [destination]);

  // API-based unlock check — runs once when user loads; fallback for reload without URL param
  useEffect(() => {
    if (!tripId || !user || tripIsUnlocked) return;
    fetch(`/api/travel/trips/${tripId}/unlock-status`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.isUnlocked) setApiUnlocked(true); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, user]);

  const buildUnlockUrl = useCallback(() => {
    const q = new URLSearchParams();
    q.set("destination", destination);
    if (country) q.set("country", country);
    if (tripDays) q.set("days", String(tripDays));
    if (stopCount) q.set("stops", String(stopCount));
    if (tripId) q.set("tripId", tripId);
    const returnUrl = window.location.pathname + window.location.search;
    q.set("returnUrl", encodeURIComponent(returnUrl));
    return `/trip-unlock?${q.toString()}`;
  }, [destination, country, tripDays, stopCount, tripId]);

  const adminUnlockTrip = useCallback(async () => {
    if (!tripId || adminUnlocking) return;
    setAdminUnlocking(true);
    try {
      const res = await fetch("/api/stripe/trip-unlock/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, destination }),
      });
      if (!res.ok) throw new Error("Admin unlock failed");
      window.location.href = `/adventure/${tripId}/parent-plan?tripUnlocked=true`;
    } catch {
      setAdminUnlocking(false);
    }
  }, [tripId, destination, adminUnlocking]);

  const handleStartExperience = useCallback(async () => {
    if (!user) {
      setAuthGateOpen(true);
      return;
    }
    if (user.isAdmin) {
      adminUnlockTrip();
      return;
    }
    // When paywall is disabled, reveal the plan in-place via the parent callback — no navigation loop.
    if (!paywallEnabled) {
      if (onRevealPlan) { onRevealPlan(); return; }
      // Fallback if no callback provided
      if (tripId) window.location.href = `/adventure/${tripId}/parent-plan`;
      else setLocation("/build-adventure");
      return;
    }
    setSheetOpen(true);
  }, [user, adminUnlockTrip, paywallEnabled, onRevealPlan, tripId, destination, setLocation]);

  // Build a merged 4-slot photo list: community (real) → AI-generated → static Chicago fallback
  // Card2 and Card3 use this so every slot is filled with the best available source.
  const mergedPhotos = useMemo<FamilyPhoto[]>(() => {
    const result: FamilyPhoto[] = [];
    for (const p of communityPhotos) {
      if (result.length >= 4) break;
      result.push(p);
    }
    for (const p of familyPhotos) {
      if (result.length >= 4) break;
      result.push(p);
    }
    return result;
  }, [communityPhotos, familyPhotos]);

  const TOTAL_CARDS = 5;

  if (!destination) return null;

  // Trip already paid / unlocked — hide the section only when paywall is enabled
  // When paywall is disabled the carousel acts as a teaser intro and should always be visible
  if (tripIsUnlocked && paywallEnabled) return null;

  if (!loading && !payload) {
    return (
      <div ref={sectionRef} style={{ margin: "0 0 24px 0" }} data-testid="section-trips-like-yours-error">
        <div className="px-4 mb-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Trips like yours</p>
          <p className="text-[18px] font-extrabold text-gray-900 leading-tight">This is what families actually remember</p>
        </div>
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "#f9f9f9", border: "1px solid #eee", padding: "24px 20px", textAlign: "center" }} data-testid="carousel-error-card">
          <p style={{ color: "#aaa", fontSize: 14 }}>Preview unavailable right now — your trip is saved.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={sectionRef} style={{ margin: "0 0 24px 0" }} data-testid="section-trips-like-yours">
      <div className="px-4 mb-4">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
          Trips like yours
        </p>
        <p className="text-[18px] font-extrabold text-gray-900 leading-tight">
          This is what families actually remember
        </p>
      </div>

      <ProgressDots count={TOTAL_CARDS} active={activeCard} />

      <div
        ref={scrollRef}
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          display: "flex",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          gap: 12,
          paddingLeft: 16,
          paddingRight: 16,
          marginTop: 4,
          touchAction: "pan-x",
          overscrollBehaviorX: "contain",
        } as React.CSSProperties}
        data-testid="carousel-scroll-container"
      >
        {loading
          ? Array.from({ length: TOTAL_CARDS }).map((_, i) => (
              <div
                key={i}
                style={{
                  minWidth: "calc(100vw - 48px)",
                  maxWidth: 360,
                  height: 480,
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)",
                  flexShrink: 0,
                  scrollSnapAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                data-testid={`carousel-card-skeleton-${i}`}
              >
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 28 }}>✈</div>
              </div>
            ))
          : payload && (
              <>
                <Card1Hero
                  payload={payload}
                  destination={destination}
                  visible={cardVisible}
                />
                <Card2Moments payload={payload} visible={cardVisible && activeCard >= 0} destination={destination} userTripCount={userTripCount} previousTripPhotoUrl={previousTripPhotoUrl} familyPhotos={mergedPhotos} />
                <Card3KidMemory payload={payload} destination={destination} visible={cardVisible && activeCard >= 1} familyPhotos={mergedPhotos} />
                <Card4ParentRelief payload={payload} destination={destination} visible={cardVisible && activeCard >= 2} />
                <Card5Emotion
                  destination={destination}
                  allCities={allCities}
                  visible={cardVisible && activeCard >= 3}
                />
              </>
            )}
      </div>

      {showStickyCta && !hideStickyBar && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
            left: 0,
            right: 0,
            zIndex: 100,
            padding: "10px 16px 14px",
            background: "rgba(255,255,255,0.97)",
            borderTop: "1px solid #f0f0f0",
            backdropFilter: "blur(8px)",
            animation: "fadeSlideUp 0.3s ease forwards",
          }}
          data-testid="sticky-cta-start-experience"
        >
          <button
            onClick={handleStartExperience}
            disabled={adminUnlocking || autoUnlocking}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 16,
              background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)",
              color: "#fff",
              fontSize: 17,
              fontWeight: 800,
              border: "none",
              cursor: (adminUnlocking || autoUnlocking) ? "wait" : "pointer",
              boxShadow: "0 4px 16px rgba(212,135,43,0.45)",
              opacity: (adminUnlocking || autoUnlocking) ? 0.7 : 1,
            }}
            data-testid="button-start-experience-sticky"
          >
            {(adminUnlocking || autoUnlocking) ? "Unlocking…" : "Start This Experience →"}
          </button>

          {/* Save for later — only shown to non-logged-in users */}
          {!user && (
            <button
              onClick={() => setSaveForLaterOpen(true)}
              style={{
                display: "block",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                marginTop: 8,
                fontSize: 13,
                color: "#94A3B8",
                textAlign: "center",
              }}
              data-testid="button-save-for-later"
            >
              Want to save this for later?
            </button>
          )}
        </div>
      )}

      {/* Payment sheet — logged-in non-admin users */}
      <TripUnlockSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onOpenFullDetails={() => setLocation(buildUnlockUrl())}
        destination={destination}
        country={country}
        days={tripDays}
        stops={stopCount}
        tripId={tripId}
        returnUrl={tripId ? `/adventure/${tripId}/parent-plan` : "/build-adventure"}
        useFoundingPrice={useFoundingPrice}
      />

      {/* Auth gate — non-logged-in taps "Start This Experience" */}
      <AuthGateSheet
        open={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        destination={destination}
        onSuccess={() => {
          setAuthGateOpen(false);
          if (!paywallEnabled && tripId) {
            setAutoUnlocking(true);
            fetch("/api/travel/trips/auto-unlock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tripId, destination }),
            })
              .then(async res => {
                if (!res.ok) throw new Error("Auto-unlock failed");
                const data = await res.json();
                const navTripId = data.tripId || tripId;
                window.location.href = `/adventure/${navTripId}/parent-plan?tripUnlocked=true`;
              })
              .catch(() => setAutoUnlocking(false));
          } else {
            setSheetOpen(true);
          }
        }}
      />

      {/* Save for later — non-logged-in taps "Want to save this for later?" */}
      <SignUpPrompt
        isOpen={saveForLaterOpen}
        onClose={() => setSaveForLaterOpen(false)}
        variant="travel"
        onLogin={() => setSaveForLaterOpen(false)}
      />

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const CARD_STYLE: React.CSSProperties = {
  minWidth: "calc(100vw - 48px)",
  maxWidth: 360,
  height: 480,
  borderRadius: 20,
  flexShrink: 0,
  scrollSnapAlign: "center",
  position: "relative",
  overflow: "hidden",
};

// source.unsplash.com/featured/ URLs are a deprecated API that returns broken/random results.
// Filter them out so we fall through to the curated city images instead.
function validPayloadImage(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes("source.unsplash.com")) return null;
  return url;
}

function Card1Hero({ payload, destination, visible }: { payload: MemoryPayload; destination: string; visible: boolean }) {
  const cityImg = validPayloadImage(payload.heroImageUrl) || getAdventureCityImage(destination, undefined, 0);
  const showRememberBadge = !isTop10Destination(destination);
  return (
    <div style={{ ...CARD_STYLE }} data-testid="carousel-card-hero">
      <div style={{ position: "absolute", inset: 0 }}>
        <CardImage src={cityImg} alt={destination} className="absolute inset-0" fallbackIndex={3} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 40%, rgba(0,0,0,0) 80%)" }} />
      </div>
      {/* Subtle "worth remembering" badge — top-right, non-top-10 cities only */}
      {showRememberBadge && (
        <div style={{
          position: "absolute",
          top: 18,
          right: 18,
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(8px)",
          borderRadius: 20,
          padding: "5px 12px",
          border: "1px solid rgba(255,255,255,0.2)",
          zIndex: 2,
        }}>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, margin: 0 }}>
            This is worth remembering.
          </p>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "28px 24px",
          animation: visible ? "fadeIn 0.6s ease forwards" : "none",
          opacity: 0,
        }}
      >
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
          Memory
        </p>
        <h2 style={{ color: "#fff", fontSize: 28, fontWeight: 900, lineHeight: 1.1, marginBottom: 12 }}>
          {payload.heroLine}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
          {payload.heroSubline}
        </p>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 12 }}>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
            {destination}
          </p>
        </div>
      </div>
    </div>
  );
}

// Real family photos extracted from the Chicago trip collage — 4 distinct shots
// objectPosition tuned per photo so faces aren't cropped
const FAMILY_PHOTOS: Array<{ src: string; pos: string }> = [
  { src: "/family-photos/photo_tl.jpg", pos: "center 30%" },  // family selfie at Chicago Riverwalk
  { src: "/family-photos/photo_tr.jpg", pos: "center center" }, // kids at the river with Chicago skyline
  { src: "/family-photos/photo_bl.jpg", pos: "center 30%" },  // dad + kids at Chicago River
  { src: "/family-photos/photo_br.jpg", pos: "center center" }, // couple selfie — center avoids cropping faces
];

// Generic memory captions — work for any destination, not city-specific
const GENERIC_MOMENT_CAPTIONS = [
  { caption: "They wouldn't stop talking about this one for weeks", placeName: "Highlight of the trip" },
  { caption: "The kids spotted it before we even got close", placeName: "A family favourite" },
  { caption: "We stayed way longer than planned — no one wanted to leave", placeName: "Best discovery" },
  { caption: "This is the moment the whole trip was really about", placeName: "The one we remember" },
];

function Card2Moments({ visible, destination, userTripCount = 0, previousTripPhotoUrl, familyPhotos = [] }: { payload?: MemoryPayload; visible: boolean; destination: string; userTripCount?: number; previousTripPhotoUrl?: string | null; familyPhotos?: FamilyPhoto[] }) {
  const isRepeatUser = userTripCount >= 1;

  // ── REPEAT USER: single strong moment card ────────────────────────────────
  if (isRepeatUser) {
    const hasOwnPhoto = !!previousTripPhotoUrl;
    const bgImage = hasOwnPhoto ? previousTripPhotoUrl! : getAdventureCityImage(destination, undefined, 1);
    const caption = hasOwnPhoto
      ? "You don't forget these memories."
      : "We didn't plan to stop here… but we stayed the longest.";
    return (
      <div style={{ ...CARD_STYLE }} data-testid="carousel-card-moments-repeat">
        <div style={{ position: "absolute", inset: 0 }}>
          <CardImage src={bgImage} alt={destination} className="absolute inset-0" fallbackIndex={1} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 45%, rgba(0,0,0,0.1) 90%)" }} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "32px 28px",
            animation: visible ? "fadeIn 0.6s ease 0.1s forwards" : "none",
            opacity: 0,
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 12 }}>
            {hasOwnPhoto ? "From your last trip" : "The moments that matter"}
          </p>
          <p style={{ color: "#fff", fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>
            {caption}
          </p>
        </div>
      </div>
    );
  }

  // ── FIRST TRIP: moments grid ─────────────────────────────────────────────
  // Per-slot fallback chain: community/AI photo → destination city image (NOT Chicago photos)
  // Start at variant 1 so the grid doesn't repeat Card 1's hero (which uses variant 0).
  // Pattern: [1, 2, 0, 1] gives 3 distinct visuals across 4 slots.
  const cityImgFallbacks = ([1, 2, 0, 1] as const).map(i => getAdventureCityImage(destination, undefined, i));
  const gridPhotos: Array<{ src: string; pos: string }> = [
    { src: familyPhotos[0]?.imageUrl || cityImgFallbacks[0], pos: "center 30%" },
    { src: familyPhotos[1]?.imageUrl || cityImgFallbacks[1], pos: "center center" },
    { src: familyPhotos[2]?.imageUrl || cityImgFallbacks[2], pos: "center 30%" },
    { src: familyPhotos[3]?.imageUrl || cityImgFallbacks[3], pos: "center center" },
  ];
  const captions = GENERIC_MOMENT_CAPTIONS;

  return (
    <div style={{ ...CARD_STYLE, background: "#0f0f1a" }} data-testid="carousel-card-moments">
      {/* Header */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: "18px 18px 12px",
        background: "linear-gradient(to bottom, rgba(15,15,26,0.95) 70%, transparent)",
        zIndex: 2,
      }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
          The moments that mattered
        </p>
        <p style={{ fontSize: 17, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
          A few things we won't forget
        </p>
      </div>

      {/* 2×2 family photo grid */}
      <div
        style={{
          position: "absolute",
          top: 80,
          bottom: 0,
          left: 0,
          right: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 3,
          animation: visible ? "fadeIn 0.6s ease 0.1s forwards" : "none",
          opacity: 0,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => {
          const photo = gridPhotos[i] || FAMILY_PHOTOS[i % FAMILY_PHOTOS.length];
          const c = captions[i];
          return (
            <div key={i} style={{ position: "relative", overflow: "hidden", background: "#111" }} data-testid={`card2-photo-${i}`}>
              <img
                src={photo.src}
                alt=""
                style={{
                  display: "block",
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  width: "100%", height: "100%",
                  objectFit: "cover",
                  objectPosition: photo.pos,
                }}
                onError={(e) => {
                  const t = e.currentTarget;
                  if (!t.dataset.fallback) {
                    t.dataset.fallback = "1";
                    t.src = FAMILY_PHOTOS[i % FAMILY_PHOTOS.length].src;
                  }
                }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.82) 40%, rgba(0,0,0,0) 75%)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px 10px", zIndex: 1 }}>
                <p style={{ color: "#fff", fontSize: 11, lineHeight: 1.35, fontWeight: 700, marginBottom: 4 }}>
                  {c.caption}
                </p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  {c.placeName}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card3KidMemory({ payload, visible }: { payload: MemoryPayload; destination: string; visible: boolean; familyPhotos?: FamilyPhoto[] }) {
  // Card 3 uses its own gradient background — no city photo so nothing repeats from Card 1 or Card 2
  return (
    <div style={{ ...CARD_STYLE, background: "linear-gradient(135deg, #0d1b3e 0%, #1a2f5a 45%, #0f3460 100%)" }} data-testid="carousel-card-kid-memory">
      {/* Subtle star-field overlay for atmosphere */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 20% 30%, rgba(255,200,80,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(100,180,255,0.05) 0%, transparent 60%)",
      }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "32px 24px",
          animation: visible ? "fadeIn 0.6s ease 0.15s forwards" : "none",
          opacity: 0,
        }}
      >
        <p style={{ color: "rgba(255,200,80,0.85)", fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 16 }}>
          What kids actually remember
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {payload.kidQuotes.slice(0, 3).map((q, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding: "14px 16px",
                borderLeft: "3px solid rgba(255,200,80,0.7)",
              }}
              data-testid={`kid-quote-${i}`}
            >
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 1.5, fontWeight: 600, fontStyle: "italic" }}>
                "{q}"
              </p>
            </div>
          ))}
        </div>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 20, fontStyle: "italic" }}>
          — Moments that outlast the photos
        </p>
      </div>
    </div>
  );
}

function Card4ParentRelief({ payload, visible }: { payload: MemoryPayload; destination: string; visible: boolean }) {
  // Card 4 uses its own gradient background — no city photo so nothing repeats from other cards
  return (
    <div style={{ ...CARD_STYLE, background: "linear-gradient(135deg, #0a2410 0%, #1a4220 45%, #0e3318 100%)" }} data-testid="carousel-card-parent-relief">
      {/* Subtle warm glow overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 70% 20%, rgba(100,220,120,0.07) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(255,200,80,0.05) 0%, transparent 55%)",
      }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "32px 24px",
          animation: visible ? "fadeIn 0.6s ease 0.2s forwards" : "none",
          opacity: 0,
        }}
      >
        <p style={{ color: "rgba(100,220,120,0.85)", fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 12 }}>
          And for you?
        </p>
        <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 24 }}>
          {payload.parentReliefLine}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            "Less guessing what's next",
            "Smoother days, fewer meltdowns",
            "More time actually present",
          ].map((line, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: "rgba(100,220,120,0.2)", border: "1px solid rgba(100,220,120,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "rgba(100,220,120,0.9)", flexShrink: 0 }}>✓</span>
              <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, fontWeight: 500 }}>{line}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card5Emotion({ destination, allCities, visible }: { destination: string; allCities?: string[]; visible: boolean }) {
  const tripLabel = (() => {
    const cities = (allCities || []).filter(Boolean);
    if (cities.length >= 2) {
      const last = cities[cities.length - 1];
      const rest = cities.slice(0, -1).join(", ");
      return `Your ${rest} & ${last} adventure`;
    }
    return destination;
  })();
  return (
    <div
      style={{
        ...CARD_STYLE,
        background: "linear-gradient(160deg, #0f172a 0%, #1e1035 60%, #0f2a1e 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "36px 28px",
      }}
      data-testid="carousel-card-emotion"
    >
      <div
        style={{
          animation: visible ? "fadeIn 0.7s ease 0.2s forwards" : "none",
          opacity: 0,
        }}
      >
        <p style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          marginBottom: 24,
        }}>
          Your trip — this is what it becomes
        </p>

        <h2 style={{
          color: "#fff",
          fontSize: 26,
          fontWeight: 900,
          lineHeight: 1.15,
          marginBottom: 32,
        }}>
          Your kids won't remember the plan.
          <br />
          <span style={{ color: "#E8962F" }}>They'll remember this.</span>
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            "The dinosaur they couldn't stop talking about",
            "The place they didn't want to leave",
            "The moment they surprised you",
          ].map((bullet, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: "rgba(232,150,47,0.18)",
                border: "1.5px solid rgba(232,150,47,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
              }}>
                <span style={{ color: "#E8962F", fontSize: 12 }}>✦</span>
              </div>
              <p style={{
                color: "rgba(255,255,255,0.82)",
                fontSize: 15,
                lineHeight: 1.45,
                fontWeight: 500,
              }}>
                {bullet}
              </p>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 40,
          paddingTop: 24,
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}>
          <p style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: 12,
            fontStyle: "italic",
            lineHeight: 1.5,
            textAlign: "center",
          }}>
            {tripLabel} — ready when you are
          </p>
        </div>
      </div>
    </div>
  );
}
