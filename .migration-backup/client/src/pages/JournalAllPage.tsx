import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Share2, BookOpen } from "lucide-react";
import { getCityImage } from "@/lib/cityImages";
import { useToast } from "@/hooks/use-toast";
import { GeoAdventuresNav } from "@/components/GeoAdventuresNav";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface JournalEntry {
  storyId: string;
  tripId: string;
  title: string;
  storySummary: string | null;
  photoUrls: string[];
  highlights: string[];
  generatedAt: string | null;
  destination: string;
  name: string;
  memoryAnchor: string | null;
  travelMonth: number | null;
  travelYear: number | null;
  travelers: { explorerId?: string; name?: string; avatarKey?: string }[];
}

function JournalCard({ entry, onNavigate }: { entry: JournalEntry; onNavigate: (path: string) => void }) {
  const { toast } = useToast();
  const heroImg = entry.photoUrls[0] ?? getCityImage(entry.destination, "");
  const quote = entry.memoryAnchor || entry.highlights[0] || entry.storySummary || null;
  const dateLabel = entry.travelMonth && entry.travelYear
    ? `${MONTHS[entry.travelMonth - 1]} ${entry.travelYear}`
    : entry.generatedAt
    ? new Date(entry.generatedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;
  const travelerCount = Array.isArray(entry.travelers) ? entry.travelers.length : 0;

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/s/${entry.tripId}`;
    const shareTitle = `My Travel Journey to ${entry.destination}`;
    if (navigator.share) {
      navigator.share({ title: shareTitle, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        toast({ title: "Copied!", description: "Share link copied to clipboard" });
      }).catch(() => {
        toast({ title: "Couldn't copy", description: "Please copy the link manually" });
      });
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
      style={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.08)" }}
      onClick={() => onNavigate(`/s/${entry.tripId}`)}
      data-testid={`journal-card-${entry.tripId}`}
    >
      <div className="relative w-full" style={{ height: 180 }}>
        <img
          src={heroImg}
          alt={entry.destination}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-base font-black text-white leading-tight line-clamp-1 mb-0.5">
            {entry.destination}
          </h3>
          {entry.name && entry.name !== entry.destination && (
            <p className="text-xs font-semibold text-orange-400/80 line-clamp-1">
              {entry.name}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 py-3">
        {quote && (
          <p className="text-xs text-white/65 leading-relaxed line-clamp-2 italic mb-3">
            "{quote}"
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-white/40 font-medium">
            {dateLabel && <span>📅 {dateLabel}</span>}
            {travelerCount > 0 && <span>👦 {travelerCount} {travelerCount === 1 ? "explorer" : "explorers"}</span>}
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "rgba(212,135,43,0.12)", color: "#D4872B" }}
            data-testid={`button-share-journal-${entry.tripId}`}
          >
            <Share2 className="w-3 h-3" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JournalAllPage() {
  const [, setLocation] = useLocation();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/travel/journal")
      .then(r => r.ok ? r.json() : Promise.resolve([]))
      .then((data: JournalEntry[]) => setEntries(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#0d1117", paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 flex items-center gap-3 px-4 py-4"
        style={{ background: "rgba(13,17,23,0.96)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => setLocation("/geoadventures?tab=me")}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.08)" }}
          data-testid="button-journal-back"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: "#D4872B" }} />
          <p className="text-sm font-bold text-white truncate">My Travel Journal</p>
        </div>
        {entries.length > 0 && (
          <span className="ml-auto text-xs font-semibold flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
            {entries.length} {entries.length === 1 ? "story" : "stories"}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-5 space-y-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="text-4xl mb-3">📖</div>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading your stories…</p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div
            className="rounded-2xl px-5 py-8 text-center mt-4"
            style={{ background: "rgba(212,135,43,0.06)", border: "1px solid rgba(212,135,43,0.15)" }}
          >
            <div className="text-3xl mb-2">📖</div>
            <p className="text-sm font-semibold text-white/80 mb-1">No travel stories yet</p>
            <p className="text-xs text-white/40">Finish a trip and save your story — it'll appear here</p>
          </div>
        ) : (
          entries.map(entry => (
            <JournalCard key={entry.storyId} entry={entry} onNavigate={setLocation} />
          ))
        )}
      </div>

      {/* GeoAdventures bottom nav */}
      <GeoAdventuresNav activeTab="me" />
    </div>
  );
}
