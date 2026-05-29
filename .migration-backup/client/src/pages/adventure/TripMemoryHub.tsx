import { useMemo, useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useTravel } from "@/lib/travelContext";
import { useTripExecutionState } from "@/hooks/useTripExecutionState";
import { FamilyTravelMap } from "@/components/FamilyTravelMap";
import { getMomentPhotos, getKidMemoryLines } from "@/lib/storyState";
import { getStockImageForDestination } from "@/components/TravelTripCard";
import { ArrowLeft, Share2, ChevronDown, ChevronRight, MapPin, BookOpen, Camera, Map } from "lucide-react";
import { format } from "date-fns";

// ── Emotional tagline ──────────────────────────────────────────────────────

function getTagline(stopCount: number): string {
  if (stopCount >= 12) return "What a journey 🌍";
  if (stopCount >= 6) return "This was a good one ✨";
  return "Short, sweet, and memorable 💛";
}

// ── Date range label ───────────────────────────────────────────────────────

function getDateLabel(startDate: string | null | undefined, completedAt: string | Date | null | undefined): string {
  if (!startDate) return "";
  try {
    const start = new Date(startDate);
    const parts = [format(start, "MMM d")];
    if (completedAt) {
      const end = new Date(completedAt as string);
      parts.push(format(end, "d, yyyy"));
    } else {
      parts[0] = format(start, "MMM yyyy");
    }
    return parts.join("–");
  } catch {
    return "";
  }
}

// ── Story Preview Strip ────────────────────────────────────────────────────

interface StoryStripProps {
  firstPhoto: string | null;
  photos: string[];
  tripName: string;
  stopCount: number;
  onOpen: () => void;
}

function StoryPreviewStrip({ firstPhoto, photos, tripName, stopCount, onOpen }: StoryStripProps) {
  const collagePhotos = photos.slice(0, 4);
  const hasPhotos = photos.length > 0;

  return (
    <section className="px-4" data-testid="section-story-strip">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-slate-800">Your trip story</h2>
        <button
          onClick={onOpen}
          className="text-sm font-semibold text-orange-500 flex items-center gap-0.5"
          data-testid="button-view-story-all"
        >
          View all <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
        {/* Cover card */}
        <button
          onClick={onOpen}
          className="shrink-0 snap-start rounded-2xl overflow-hidden w-36 h-52 relative shadow"
          style={{ background: firstPhoto ? "transparent" : "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          data-testid="button-story-card-0"
        >
          {firstPhoto && <img src={firstPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
          <div className="absolute top-3 left-3 text-2xl">📖</div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-xs font-bold text-white">Cover</p>
            <p className="text-[10px] text-white/70 mt-0.5 leading-tight">{tripName}</p>
          </div>
        </button>

        {/* Journey card — shows stop count */}
        <button
          onClick={onOpen}
          className="shrink-0 snap-start rounded-2xl overflow-hidden w-36 h-52 relative shadow"
          style={{ background: "linear-gradient(135deg,#1a2f5f,#2563eb)" }}
          data-testid="button-story-card-1"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 to-blue-900/70" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3">
            <span className="text-3xl">🗺️</span>
            {stopCount > 0 && (
              <p className="text-xl font-black text-white leading-none">{stopCount}</p>
            )}
            <p className="text-[10px] font-bold text-white/80 uppercase tracking-wide text-center">
              {stopCount > 0 ? `place${stopCount !== 1 ? "s" : ""} explored` : "Journey"}
            </p>
          </div>
        </button>

        {/* Collage card — shows photo grid */}
        <button
          onClick={onOpen}
          className="shrink-0 snap-start rounded-2xl overflow-hidden w-36 h-52 relative shadow"
          style={{ background: "linear-gradient(135deg,#78350f,#D4872B)" }}
          data-testid="button-story-card-2"
        >
          {hasPhotos && collagePhotos.length >= 2 ? (
            <div className="absolute inset-0 grid grid-cols-2 gap-0.5">
              {collagePhotos.map((p, i) => (
                <div key={i} className="overflow-hidden">
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {/* fill remaining cells with gradient if fewer than 4 photos */}
              {Array.from({ length: Math.max(0, 4 - collagePhotos.length) }).map((_, i) => (
                <div key={`fill-${i}`} style={{ background: "rgba(212,135,43,0.4)" }} />
              ))}
            </div>
          ) : hasPhotos ? (
            <img src={collagePhotos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
          <div className="absolute top-3 left-3 text-2xl">📸</div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-xs font-bold text-white">Collage</p>
            {photos.length > 0 && (
              <p className="text-[10px] text-white/70 mt-0.5">{photos.length} photo{photos.length !== 1 ? "s" : ""}</p>
            )}
          </div>
        </button>
      </div>
    </section>
  );
}

// ── Kid Memory Section ─────────────────────────────────────────────────────

interface KidMemorySectionProps {
  lines: string[];
  onSeeAll: () => void;
}

function KidMemorySection({ lines, onSeeAll }: KidMemorySectionProps) {
  if (lines.length === 0) return null;
  return (
    <section className="px-4" data-testid="section-kid-memory">
      <h2 className="text-base font-bold text-slate-800 mb-3">What your explorer will remember</h2>
      <div
        className="rounded-2xl px-4 py-4"
        style={{ background: "#F4F8FF", border: "1px solid #BFDBFE" }}
      >
        <ul className="space-y-2.5">
          {lines.map((line, i) => (
            <li key={i} className="text-sm text-slate-700 leading-snug" data-testid={`text-kid-memory-${i}`}>
              {line}
            </li>
          ))}
        </ul>
        <button
          onClick={onSeeAll}
          className="mt-3 text-xs font-semibold text-blue-500 flex items-center gap-1"
          data-testid="button-see-all-moments"
        >
          See all moments <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
}

// ── Memory Narrative Section ───────────────────────────────────────────────

interface MemoryNarrativeProps {
  moments: import("@shared/schema").TravelMoment[];
  visitedStops: { id: string; name: string; stopType?: string | null; missionCompleted?: boolean | null }[];
  onSeeAll: () => void;
}

function MemoryNarrative({ moments, visitedStops, onSeeAll }: MemoryNarrativeProps) {
  const kidQuotes = moments
    .filter(m => (m as any).kidPromptResponse)
    .map(m => ({ text: (m as any).kidPromptResponse as string, stopId: (m as any).stopId as string | null }))
    .slice(0, 5);

  const parentNotes = moments
    .filter(m => (m as any).parentPromptResponse)
    .map(m => ({ text: (m as any).parentPromptResponse as string }))
    .slice(0, 3);

  const missionWins = visitedStops
    .filter(s => s.missionCompleted)
    .slice(0, 6);

  const hasContent = kidQuotes.length > 0 || parentNotes.length > 0 || missionWins.length > 0;
  if (!hasContent) return null;

  const stopName = (stopId: string | null) =>
    visitedStops.find(s => s.id === stopId)?.name ?? null;

  return (
    <section className="px-4" data-testid="section-memory-narrative">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-slate-800">Your family story</h2>
        <button
          onClick={onSeeAll}
          className="text-sm font-semibold text-orange-500 flex items-center gap-0.5"
          data-testid="button-narrative-see-all"
        >
          All moments <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">

        {/* Kid voices */}
        {kidQuotes.length > 0 && (
          <div className="rounded-2xl px-4 py-4" style={{ background: "#F4F8FF", border: "1px solid #BFDBFE" }}>
            <p className="text-[11px] font-extrabold text-blue-400 uppercase tracking-widest mb-3">💬 In their words</p>
            <div className="space-y-3">
              {kidQuotes.map((q, i) => (
                <div key={i} className="flex gap-2.5" data-testid={`quote-kid-${i}`}>
                  <span className="text-2xl leading-none mt-0.5">👦</span>
                  <div>
                    <p className="text-sm text-slate-700 leading-snug italic">"{q.text}"</p>
                    {stopName(q.stopId) && (
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {stopName(q.stopId)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mission wins */}
        {missionWins.length > 0 && (
          <div className="rounded-2xl px-4 py-4" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <p className="text-[11px] font-extrabold text-emerald-500 uppercase tracking-widest mb-3">🏆 Explorer missions completed</p>
            <div className="flex flex-wrap gap-2">
              {missionWins.map((s, i) => (
                <span
                  key={i}
                  className="text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full px-3 py-1.5"
                  data-testid={`badge-mission-${i}`}
                >
                  ✓ {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Parent notes */}
        {parentNotes.length > 0 && (
          <div className="rounded-2xl px-4 py-4" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
            <p className="text-[11px] font-extrabold text-orange-400 uppercase tracking-widest mb-3">📝 Parent reflections</p>
            <div className="space-y-2.5">
              {parentNotes.map((n, i) => (
                <p key={i} className="text-sm text-slate-600 leading-snug italic" data-testid={`note-parent-${i}`}>
                  "{n.text}"
                </p>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

// ── Itinerary Section (collapsible) ───────────────────────────────────────

interface ItinerarySectionProps {
  dayGroups: { id: string; name: string; stopType?: string | null; isVisited?: boolean | null }[][];
}

function ItinerarySection({ dayGroups }: ItinerarySectionProps) {
  const [open, setOpen] = useState(false);
  const totalStops = dayGroups.flat().length;
  if (totalStops === 0) return null;

  return (
    <section className="px-4" data-testid="section-itinerary">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl"
        style={{ background: "#F8F9FB", border: "1px solid #E5E7EB" }}
        data-testid="button-toggle-itinerary"
      >
        <span className="text-sm font-semibold text-slate-700">See your itinerary</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 rounded-2xl overflow-hidden border border-slate-100 bg-white" data-testid="panel-itinerary">
          {dayGroups.map((day, dayIdx) => (
            <div key={dayIdx}>
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Day {dayIdx + 1}</p>
              </div>
              {day.map((stop, idx) => (
                <div
                  key={stop.id}
                  className={`flex items-center gap-3 px-4 py-3 ${idx < day.length - 1 ? "border-b border-slate-50" : ""}`}
                  data-testid={`row-itinerary-stop-${stop.id}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${stop.isVisited ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}
                  >
                    {stop.isVisited && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                  <p className={`text-sm ${stop.isVisited ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                    {stop.name}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Moments Gallery ────────────────────────────────────────────────────────

function MomentsGallery({ photos, onSeeAll }: { photos: string[]; onSeeAll: () => void }) {
  if (photos.length === 0) return null;
  const shown = photos.slice(0, 6);
  return (
    <section className="px-4" data-testid="section-moments-gallery">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-slate-800">Moments from the trip</h2>
        {photos.length > 6 && (
          <button
            onClick={onSeeAll}
            className="text-sm font-semibold text-orange-500 flex items-center gap-0.5"
            data-testid="button-view-all-memories"
          >
            View all <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {shown.map((url, i) => (
          <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-100" data-testid={`img-moment-${i}`}>
            <img src={url} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      {photos.length > 0 && (
        <button
          onClick={onSeeAll}
          className="mt-3 w-full py-3 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          data-testid="button-see-all-memories"
        >
          View all memories
        </button>
      )}
    </section>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function TripMemoryHub() {
  const [, params] = useRoute("/adventure/:tripId/memory");
  const tripId = params?.tripId ?? "";
  const [, setLocation] = useLocation();
  const { currentTripMoments, ensureTripLoaded } = useTravel();
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tripId) ensureTripLoaded(tripId);
  }, [tripId, ensureTripLoaded]);

  const { trip, dayGroups } = useTripExecutionState(tripId);

  const allStops = useMemo(() => dayGroups.flat(), [dayGroups]);
  const visitedStops = useMemo(() => allStops.filter(s => s.isVisited), [allStops]);

  const photos = useMemo(() => getMomentPhotos(currentTripMoments), [currentTripMoments]);
  const firstPhoto = photos[0] ?? null;
  const heroImage = firstPhoto ?? (trip ? getStockImageForDestination(trip.city, (trip as any).country ?? undefined, trip.destination) : null);

  const kidLines = useMemo(
    () => getKidMemoryLines(currentTripMoments, visitedStops as any),
    [currentTripMoments, visitedStops]
  );

  const tagline = getTagline(visitedStops.length);
  const dateLabel = getDateLabel(trip?.startDate as string | null, trip?.completedAt);

  const subText = [
    dateLabel,
    visitedStops.length > 0 ? `${visitedStops.length} stop${visitedStops.length !== 1 ? "s" : ""}` : null,
    trip?.destination ?? trip?.city ?? null,
  ].filter(Boolean).join(" · ");

  const goBack = () => setLocation("/geoadventures");
  const goStory = () => setLocation(`/adventure/${tripId}/end-trip`);
  const goMemories = () => setLocation(`/adventure/${tripId}/parent-plan?tab=memories`);
  const scrollToMap = () => mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="screen-memory-hub-loading">
        <div className="text-4xl animate-bounce">🧭</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="screen-trip-memory-hub">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative h-72 shrink-0 overflow-hidden" data-testid="section-hero">
        {heroImage ? (
          <img
            src={heroImage}
            alt={trip.name ?? trip.destination}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2d6a9f 100%)" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/20" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Trips</span>
          </button>
          <button
            onClick={goStory}
            className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
            data-testid="button-share-hero"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-5 left-4 right-4">
          <h1
            className="text-2xl font-bold text-white leading-tight mb-1"
            data-testid="text-trip-name"
          >
            {trip.name || trip.destination}
          </h1>
          {subText && (
            <p className="text-sm text-white/80 mb-2" data-testid="text-trip-sub">
              {subText}
            </p>
          )}
          <p className="text-base font-medium text-white/90" data-testid="text-tagline">
            {tagline}
          </p>
        </div>
      </div>

      {/* ── Primary Action Tiles (overlap hero) ─────────────────────────── */}
      <div
        className="mx-4 -mt-8 bg-white rounded-3xl shadow-lg p-4 relative z-10"
        data-testid="section-primary-tiles"
      >
        <div className="grid grid-cols-2 gap-3">
          {/* Story tile */}
          <button
            onClick={goStory}
            className="flex flex-col items-center gap-2 rounded-2xl py-4 px-2 text-center transition-colors hover:bg-slate-50 active:bg-slate-100"
            style={{ background: "#F8F9FB" }}
            data-testid="tile-view-story"
          >
            <span className="text-2xl">📖</span>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">View your story</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Full trip recap</p>
            </div>
          </button>

          {/* Memories tile */}
          <button
            onClick={goMemories}
            className="flex flex-col items-center gap-2 rounded-2xl py-4 px-2 text-center transition-colors hover:bg-slate-50 active:bg-slate-100"
            style={{ background: "#F8F9FB" }}
            data-testid="tile-view-memories"
          >
            <span className="text-2xl">📸</span>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">View memories</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Photos & moments</p>
            </div>
          </button>

          {/* Journey tile */}
          <button
            onClick={scrollToMap}
            className="flex flex-col items-center gap-2 rounded-2xl py-4 px-2 text-center transition-colors hover:bg-slate-50 active:bg-slate-100"
            style={{ background: "#F8F9FB" }}
            data-testid="tile-see-journey"
          >
            <span className="text-2xl">🗺️</span>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">See journey</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Map & places</p>
            </div>
          </button>

          {/* Trip plan tile */}
          <button
            onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=trip_plan`)}
            className="flex flex-col items-center gap-2 rounded-2xl py-4 px-2 text-center transition-colors hover:bg-slate-50 active:bg-slate-100"
            style={{ background: "#F8F9FB" }}
            data-testid="tile-view-trip-plan"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">View trip plan</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Day by day</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Content sections ─────────────────────────────────────────────── */}
      <div className="pb-16 space-y-8 mt-7">

        {/* Story preview strip */}
        <StoryPreviewStrip
          firstPhoto={firstPhoto}
          photos={photos}
          tripName={trip.name || trip.destination || ""}
          stopCount={visitedStops.length}
          onOpen={goStory}
        />

        {/* Kid memory section */}
        <KidMemorySection lines={kidLines} onSeeAll={goMemories} />

        {/* Memory narrative — kid quotes, mission wins, parent reflections */}
        <MemoryNarrative
          moments={currentTripMoments}
          visitedStops={visitedStops as any}
          onSeeAll={goMemories}
        />

        {/* Journey map preview */}
        {allStops.length > 0 && (
          <section className="px-4" data-testid="section-journey-map" ref={mapRef}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-800">Your journey</h2>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5" />
                <span data-testid="text-stops-count">{visitedStops.length} places explored</span>
              </div>
            </div>
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{ height: 200 }}
            >
              <FamilyTravelMap
                trips={[trip]}
                currentTrip={trip}
                stops={allStops as any}
                moments={currentTripMoments}
                memoryStars={0}
                onClose={() => {}}
                onStopClick={() => {}}
                onTripSelect={() => {}}
                initialView="trip"
                containedMode
              />
              <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-slate-200" />
            </div>
          </section>
        )}

        {/* Collapsible itinerary */}
        <ItinerarySection dayGroups={dayGroups as any} />

        {/* Moments gallery */}
        {photos.length > 0 && (
          <MomentsGallery photos={photos} onSeeAll={goMemories} />
        )}

        {/* Where to next? */}
        <section className="px-4" data-testid="section-where-next">
          <div
            className="rounded-2xl px-5 py-5"
            style={{ background: "linear-gradient(135deg,#EEF6FF 0%,#F0FFF4 100%)", border: "1px solid #E0F2FE" }}
          >
            <h2 className="text-base font-bold text-slate-800 mb-1">Where to next?</h2>
            <p className="text-xs text-slate-500 mb-4">Keep the adventures going</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setLocation("/build-adventure")}
                className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all active:opacity-80"
                style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
                data-testid="button-new-adventure"
              >
                Plan a new adventure
              </button>
              <button
                onClick={() => setLocation("/geoadventures")}
                className="w-full py-3 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                data-testid="button-try-home-adventure"
              >
                Try a home adventure
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
