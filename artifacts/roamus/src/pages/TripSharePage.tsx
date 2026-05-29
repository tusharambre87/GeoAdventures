import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { getCityImage } from "@/lib/cityImages";
import { GeoAdventuresNav } from "@/components/GeoAdventuresNav";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MapStop { name: string; lat: number; lon: number; stopType: string; }

interface ShareData {
  name: string;
  destination: string;
  stopCount: number;
  totalStops: number;
  momentCount: number;
  startDate: string | null;
  completedAt: string | null;
  heroImage: string | null;
  photos: string[];
  highlights: string[];
  mapStops: MapStop[];
}

// ── Story card data ────────────────────────────────────────────────────────────

interface Card {
  bg: string;
  photo?: string | null;
  bgImage?: string | null;
  emoji: string;
  headline: string;
  sub: string;
  photos?: string[];
  lines?: string[];
  mapStops?: MapStop[];
}

function buildCards(data: ShareData): Card[] {
  const cityFallback = getCityImage(data.destination, "");
  const photo1 = data.photos[1] ?? data.heroImage ?? cityFallback;
  const photo2 = data.photos[2] ?? data.photos[0] ?? data.heroImage ?? cityFallback;

  return [
    {
      bg: "linear-gradient(160deg,#1e3a5f 0%,#2563eb 60%,#1e3a5f 100%)",
      photo: data.heroImage,
      emoji: "✈️",
      headline: "This is what they'll remember",
      sub: `${data.stopCount} stop${data.stopCount !== 1 ? "s" : ""} · ${data.destination}`,
    },
    {
      bg: "linear-gradient(160deg,#0f172a 0%,#1e3a5f 100%)",
      emoji: "🗺️",
      headline: `${data.stopCount} stop${data.stopCount !== 1 ? "s" : ""}. One unforgettable trip.`,
      sub: "Every place was chosen for the kids",
      mapStops: data.mapStops,
    },
    {
      bg: "linear-gradient(160deg,#78350f 0%,#D4872B 100%)",
      emoji: "📸",
      headline: "The moments in between",
      sub: data.photos.length > 0 ? `${data.photos.length} photo${data.photos.length !== 1 ? "s" : ""} from the journey` : "Every memory matters",
      photos: data.photos.slice(0, 4),
    },
    {
      bg: "linear-gradient(160deg,#134e4a 0%,#0f766e 100%)",
      bgImage: photo1,
      emoji: "💬",
      headline: "What they'll talk about",
      sub: "The real moments from the trip",
      lines: data.highlights.slice(0, 3),
    },
    {
      bg: "linear-gradient(160deg,#1e1b4b 0%,#312e81 60%,#4338ca 100%)",
      bgImage: photo2,
      emoji: "🧭",
      headline: "We'll talk about this trip for years.",
      sub: "Built with GeoAdventures — the family travel companion",
    },
  ];
}

// ── Inline map card (Leaflet inside carousel) ──────────────────────────────────

function InlineMapCard({
  card,
  isActive,
  onClick,
}: {
  card: Card;
  isActive: boolean;
  onClick: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const boundsRef = useRef<any>(null);
  const stops = card.mapStops ?? [];

  // When this card becomes active, recalculate size AND re-fit the route bounds
  useEffect(() => {
    if (isActive && leafletRef.current) {
      setTimeout(() => {
        leafletRef.current?.invalidateSize();
        if (boundsRef.current) {
          leafletRef.current?.fitBounds(boundsRef.current, { padding: [28, 28], maxZoom: 14 });
        }
      }, 100);
    }
  }, [isActive]);

  useEffect(() => {
    if (!mapRef.current || stops.length === 0 || leafletRef.current) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const lats = stops.map(s => parseFloat(s.lat as any));
      const lons = stops.map(s => parseFloat(s.lon as any));
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;

      const map = L.map(mapRef.current!, {
        center: [centerLat, centerLon],
        zoom: 12,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        attributionControl: false,
      });
      leafletRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
      }).addTo(map);

      if (stops.length >= 2) {
        L.polyline(stops.map(s => [parseFloat(s.lat as any), parseFloat(s.lon as any)] as [number, number]), {
          color: "#D4872B",
          weight: 3,
          opacity: 0.9,
          dashArray: "6 5",
        }).addTo(map);
      }

      const markerIcon = L.divIcon({
        html: `<div style="width:11px;height:11px;border-radius:50%;background:#D4872B;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.6)"></div>`,
        className: "",
        iconSize: [11, 11],
        iconAnchor: [5.5, 5.5],
      });

      stops.forEach(s => {
        L.marker([parseFloat(s.lat as any), parseFloat(s.lon as any)], { icon: markerIcon }).addTo(map);
      });

      if (stops.length >= 2) {
        const bounds = L.latLngBounds(stops.map(s => [parseFloat(s.lat as any), parseFloat(s.lon as any)] as [number, number]));
        boundsRef.current = bounds;
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
      } else if (stops.length === 1) {
        map.setView([parseFloat(stops[0].lat as any), parseFloat(stops[0].lon as any)], 13);
      }

      // Force tile refresh — needed when map initializes off-screen in a scrollable carousel
      setTimeout(() => {
        map.invalidateSize();
        if (boundsRef.current) {
          map.fitBounds(boundsRef.current, { padding: [28, 28], maxZoom: 14 });
        }
      }, 200);
    };

    initMap();
    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [stops.length]);

  return (
    <button
      onClick={onClick}
      className="shrink-0 snap-center rounded-2xl overflow-hidden relative shadow-xl"
      style={{ width: "72vw", maxWidth: 320, height: "calc(72vw * 16/9)", maxHeight: 570, background: card.bg }}
      data-testid="card-story-map"
    >
      {/* Leaflet map fills the card */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />

      {/* Gradient overlay so text is readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" style={{ zIndex: 2 }} />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-center items-center px-5 text-center" style={{ zIndex: 3 }}>
        <span className="text-3xl mb-3">{card.emoji}</span>
        <h3 className="text-lg font-black text-white leading-tight mb-1.5">{card.headline}</h3>
        <p className="text-xs text-white/70 font-medium">{card.sub}</p>
      </div>

      {isActive && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-orange-400 pointer-events-none" style={{ zIndex: 4 }} />
      )}
    </button>
  );
}

// ── Carousel ──────────────────────────────────────────────────────────────────

function StoryCarousel({ cards }: { cards: Card[] }) {
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const TOTAL = cards.length;

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(i, TOTAL - 1));
    setIdx(clamped);
    trackRef.current?.children[clamped]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = startX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) goTo(idx + (delta > 0 ? 1 : -1));
  };

  return (
    <section className="px-4" data-testid="section-story-carousel">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">Your story</h2>
        <span className="text-xs text-white/40">Swipe →</span>
      </div>

      {/* Cards track */}
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-1"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ scrollbarWidth: "none" }}
        data-testid="carousel-track"
      >
        {cards.map((c, i) => {
          // Map card — uses its own Leaflet-powered component
          if (c.mapStops && c.mapStops.length > 0) {
            return (
              <InlineMapCard
                key={i}
                card={c}
                isActive={i === idx}
                onClick={() => goTo(i)}
              />
            );
          }

          // Standard card
          const hasBgImage = !!(c.photo || c.bgImage);
          const isCentered = !!c.bgImage && !c.photo;

          return (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="shrink-0 snap-center rounded-2xl overflow-hidden relative shadow-xl"
              style={{ width: "72vw", maxWidth: 320, height: "calc(72vw * 16/9)", maxHeight: 570, background: c.bg }}
              data-testid={`card-story-${i}`}
            >
              {/* Hero photo bg */}
              {c.photo && (
                <img
                  src={c.photo}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              )}

              {/* bgImage — city stock image or user photo used as card background */}
              {!c.photo && c.bgImage && (
                <img
                  src={c.bgImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              )}

              {/* Photo collage grid */}
              {!c.photo && !c.bgImage && c.photos && c.photos.length >= 2 && (
                <div className="absolute inset-0 grid grid-cols-2 gap-0.5">
                  {c.photos.map((p, pi) => (
                    <div key={pi} className="overflow-hidden">
                      <img src={p} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - c.photos.length) }).map((_, fi) => (
                    <div key={`fill-${fi}`} style={{ background: "rgba(0,0,0,0.3)" }} />
                  ))}
                </div>
              )}
              {!c.photo && !c.bgImage && c.photos && c.photos.length === 1 && (
                <img src={c.photos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              )}

              {/* Overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: hasBgImage
                    ? "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.65) 100%)"
                    : "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.3) 100%)",
                }}
              />

              {/* Content — centered for image-backed cards, bottom for gradient-only */}
              <div className={`absolute inset-0 flex flex-col px-5 ${isCentered ? "justify-center items-center text-center" : "justify-end pb-6"}`}>
                <span className="text-3xl mb-3">{c.emoji}</span>
                <h3 className="text-lg font-black text-white leading-tight mb-1.5">{c.headline}</h3>
                {c.lines && c.lines.length > 0 ? (
                  <ul className={`space-y-1 mb-1 ${isCentered ? "text-center" : ""}`}>
                    {c.lines.map((l, li) => (
                      <li key={li} className={`text-xs text-white/85 font-semibold flex items-start gap-1.5 ${isCentered ? "justify-center" : ""}`}>
                        <span className="text-orange-300 mt-0.5">•</span>{l}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-xs text-white/70 font-medium">{c.sub}</p>
              </div>

              {/* Active ring */}
              {i === idx && (
                <div className="absolute inset-0 rounded-2xl ring-2 ring-orange-400 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="rounded-full transition-all"
            style={{
              width: i === idx ? 20 : 6,
              height: 6,
              background: i === idx ? "#D4872B" : "rgba(255,255,255,0.25)",
            }}
            data-testid={`dot-${i}`}
          />
        ))}
      </div>
    </section>
  );
}

// ── Map section (Leaflet, lazy init) ──────────────────────────────────────────

function ShareMap({ stops }: { stops: MapStop[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || stops.length === 0 || leafletRef.current) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      // Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const lats = stops.map(s => s.lat);
      const lons = stops.map(s => s.lon);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;

      const map = L.map(mapRef.current!, {
        center: [centerLat, centerLon],
        zoom: 12,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        attributionControl: false,
      });
      leafletRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
      }).addTo(map);

      // Draw route polyline
      if (stops.length >= 2) {
        L.polyline(stops.map(s => [s.lat, s.lon] as [number, number]), {
          color: "#D4872B",
          weight: 3,
          opacity: 0.9,
          dashArray: "6 5",
        }).addTo(map);
      }

      // Custom marker icon
      const markerIcon = L.divIcon({
        html: `<div style="width:11px;height:11px;border-radius:50%;background:#D4872B;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
        className: "",
        iconSize: [11, 11],
        iconAnchor: [5.5, 5.5],
      });

      stops.forEach(s => {
        L.marker([s.lat, s.lon], { icon: markerIcon })
          .bindTooltip(s.name, { permanent: false, direction: "top" })
          .addTo(map);
      });

      // Fit map to bounds
      if (stops.length >= 2) {
        const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lon] as [number, number]));
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
        setTimeout(() => { map.invalidateSize(); map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 }); }, 200);
      }
    };

    initMap();
    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [stops]);

  if (stops.length === 0) return null;

  return (
    <section className="px-4" data-testid="section-map">
      <div className="mb-4">
        <h2 className="text-xl font-black text-white mb-1">Where they went</h2>
        <p className="text-sm text-white/50">Built automatically around kids</p>
      </div>
      <div
        ref={mapRef}
        className="rounded-2xl overflow-hidden"
        style={{ height: 220 }}
        data-testid="share-map-container"
      />
    </section>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────

function ShareSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "#0a0a14" }}>
      {/* Hero skeleton */}
      <div className="relative" style={{ height: "100svh" }}>
        <div className="absolute inset-0 animate-pulse" style={{ background: "linear-gradient(160deg,#1a2540 0%,#0f1929 100%)" }} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TripSharePage() {
  const [, params] = useRoute("/s/:tripId");
  const tripId = params?.tripId ?? "";
  const [, setLocation] = useLocation();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    fetch(`/api/travel/trips/${tripId}/share-data`)
      .then(r => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tripId]);

  // Sticky CTA appears mid-scroll; hides near bottom so nav can show cleanly
  useEffect(() => {
    const onScroll = () => {
      const ratio = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setShowSticky(ratio > 0.15 && ratio < 0.88);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Check if current user owns this trip (owner-only features)
  useEffect(() => {
    if (!tripId) return;
    fetch(`/api/trips/${tripId}/is-owner`)
      .then(r => r.ok ? r.json() : { isOwner: false })
      .then((d: { isOwner: boolean }) => setIsOwner(!!d.isOwner))
      .catch(() => {});
  }, [tripId]);

  if (loading) return <ShareSkeleton />;

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "#0a0a14" }}
      >
        <div className="text-6xl mb-4">🗺️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Adventure not found</h1>
        <p className="text-white/50 mb-6">This share link may have expired or isn't public.</p>
        <a
          href="/"
          className="px-6 py-3 rounded-2xl text-white font-bold"
          style={{ background: "linear-gradient(135deg,#E8962F 0%,#D4872B 100%)" }}
        >
          Go to GeoAdventures
        </a>
      </div>
    );
  }

  const cards = buildCards(data);
  const ctaUrl = "/";

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "#0a0a14" }}
      data-testid="screen-trip-share"
    >

      {/* ── 1. HERO ──────────────────────────────────────────────────────── */}
      <div
        className="relative flex flex-col justify-end"
        style={{ minHeight: "100svh" }}
        data-testid="section-hero"
      >
        {/* Hero image */}
        {data.heroImage ? (
          <img
            src={data.heroImage}
            alt={data.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            data-testid="img-hero"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(160deg,#1e3a5f 0%,#2563eb 50%,#D4872B 100%)" }}
          />
        )}

        {/* Dark overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent" style={{ top: "40%" }} />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-12 pb-4">
          <p className="text-xs font-semibold text-white/50" data-testid="text-shared-via">
            Shared via GeoAdventures
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🧭</span>
            <span className="text-sm font-black text-white">GeoAdventures</span>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-6 pb-8 pt-6">
          <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3" data-testid="text-destination">
            📍 {data.destination}
          </p>
          <h1
            className="text-4xl font-black text-white leading-tight mb-3"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
            data-testid="text-hero-headline"
          >
            This is what they'll remember
          </h1>
          <p className="text-base text-white/70 font-semibold mb-7" data-testid="text-hero-sub">
            {data.stopCount} stop{data.stopCount !== 1 ? "s" : ""} across {data.name}
          </p>
          <a
            href={ctaUrl}
            className="block w-full py-4 rounded-2xl text-center text-white font-black text-base shadow-xl transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg,#E8962F 0%,#D4872B 100%)" }}
            data-testid="button-hero-cta"
          >
            Plan a trip like this →
          </a>
        </div>
      </div>

      {/* ── OWNER-ONLY: Replay button ─────────────────────────────────────── */}
      {isOwner && (
        <div className="px-4 pt-5 pb-2" data-testid="section-replay-cta">
          <button
            onClick={() => setLocation(`/replay/${tripId}`)}
            className="w-full py-4 rounded-2xl text-white font-black text-base shadow-xl transition-all active:scale-[0.97] flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,rgba(212,135,43,0.2) 0%,rgba(232,150,47,0.25) 100%)", border: "1.5px solid rgba(212,135,43,0.5)" }}
            data-testid="button-replay-trip"
          >
            🎬 Replay your trip →
          </button>
        </div>
      )}

      {/* ── 2. STORY CAROUSEL ────────────────────────────────────────────── */}
      <div className="pt-8 pb-6" data-testid="section-carousel-wrap">
        <StoryCarousel cards={cards} />
      </div>

      {/* ── 3. HIGHLIGHTS ────────────────────────────────────────────────── */}
      {data.highlights.length > 0 && (
        <section className="px-4 pb-8" data-testid="section-highlights">
          <div
            className="rounded-2xl px-5 py-5"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <h2 className="text-xl font-black text-white mb-4">What made this trip special</h2>
            <ul className="space-y-3">
              {data.highlights.map((h, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3"
                  data-testid={`highlight-${i}`}
                >
                  <span className="text-orange-400 font-black text-base mt-0.5">✦</span>
                  <span className="text-sm font-semibold text-white/85 leading-snug">{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── 4. MAP ────────────────────────────────────────────────────────── */}
      {data.mapStops.length > 0 && (
        <div className="pb-8">
          <ShareMap stops={data.mapStops} />
        </div>
      )}

      {/* ── 5. SOCIAL PROOF ──────────────────────────────────────────────── */}
      <section className="px-4 pb-8" data-testid="section-social-proof">
        <div
          className="rounded-2xl px-5 py-4 text-center"
          style={{ background: "rgba(212,135,43,0.08)", border: "1px solid rgba(212,135,43,0.2)" }}
        >
          <p className="text-sm font-semibold text-orange-300/80 leading-snug">
            🌍  Families are using GeoAdventures to travel better with kids
          </p>
        </div>
      </section>

      {/* ── 6. FINAL CTA ─────────────────────────────────────────────────── */}
      <section className="px-4 pb-8" data-testid="section-final-cta">
        <div
          className="rounded-2xl px-5 py-7 text-center"
          style={{ background: "linear-gradient(160deg,rgba(30,58,95,0.8) 0%,rgba(37,99,235,0.4) 100%)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-2xl font-black text-white mb-2">Ready to create your own?</h2>
          <p className="text-sm text-white/50 mb-6">AI-powered itineraries · Built for kids · Family memories</p>
          <div className="flex flex-col gap-3">
            <a
              href={ctaUrl}
              className="block w-full py-4 rounded-2xl text-center text-white font-black text-base shadow-xl transition-all active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg,#E8962F 0%,#D4872B 100%)" }}
              data-testid="button-final-cta-primary"
            >
              Start your trip
            </a>
            <a
              href={ctaUrl}
              className="block w-full py-3 rounded-2xl text-center text-white/70 font-semibold text-sm border border-white/10 transition-all active:opacity-70"
              data-testid="button-final-cta-secondary"
            >
              Try a home adventure
            </a>
          </div>
        </div>
      </section>

      {/* ── STICKY CTA ────────────────────────────────────────────────────── */}
      {/* Sticky CTA — only mid-scroll; positions at bottom-0 since nav hides when this shows */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe pt-3 transition-transform duration-300"
        style={{
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          background: "linear-gradient(to top,rgba(10,10,20,0.98) 70%,transparent)",
          transform: showSticky ? "translateY(0)" : "translateY(120%)",
        }}
        data-testid="sticky-cta"
      >
        <a
          href={ctaUrl}
          className="block w-full py-4 rounded-2xl text-center text-white font-black text-base shadow-2xl transition-all active:scale-[0.97]"
          style={{ background: "linear-gradient(135deg,#E8962F 0%,#D4872B 100%)" }}
          data-testid="button-sticky-cta"
        >
          Plan a trip like this →
        </a>
      </div>

      {/* GeoAdventures bottom nav — only shows when sticky CTA is hidden */}
      {!showSticky && <GeoAdventuresNav />}

    </div>
  );
}
