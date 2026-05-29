import { useState, useEffect } from "react";
import { Image, Map, Sparkles, Trophy, ChevronRight, BookOpen, Share2, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { PrivacySettingsMenu } from "@/components/PrivacySettingsMenu";
import { getCityImage } from "@/lib/cityImages";
import { useToast } from "@/hooks/use-toast";

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

interface GeoAdventuresMeTabProps {
  userName?: string | null;
  userInitials?: string | null;
  onOpenMoments: () => void;
  onOpenTravelMap: () => void;
  onOpenTrophyCabinet: () => void;
}

interface MeRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  testId?: string;
}

function MeRow({ icon, label, description, onClick, testId }: MeRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-left shadow-sm hover:shadow-md transition-shadow"
      data-testid={testId}
    >
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-800 dark:text-white">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
    </button>
  );
}

function LatestJournalPreview({ entry, onNavigate }: { entry: JournalEntry; onNavigate: (path: string) => void }) {
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
      data-testid={`journal-preview-${entry.tripId}`}
    >
      <div className="relative w-full" style={{ height: 170 }}>
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
          <p className="text-xs text-white/60 leading-relaxed line-clamp-2 italic mb-3">
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

export function GeoAdventuresMeTab({
  userName,
  userInitials,
  onOpenMoments,
  onOpenTravelMap,
  onOpenTrophyCabinet,
}: GeoAdventuresMeTabProps) {
  const [, setLocation] = useLocation();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalLoaded, setJournalLoaded] = useState(false);

  const initials = userInitials || (userName ? userName.slice(0, 2).toUpperCase() : '?');

  useEffect(() => {
    fetch("/api/travel/journal")
      .then(r => r.ok ? r.json() : Promise.resolve([]))
      .then((data: JournalEntry[]) => setJournalEntries(data || []))
      .catch(() => {})
      .finally(() => setJournalLoaded(true));
  }, []);

  const latestEntry = journalEntries[0] ?? null;

  return (
    <div className="space-y-3" data-testid="me-tab-content">
      <div className="flex items-center gap-3 mb-4" data-testid="me-identity-header">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md flex-shrink-0">
          <span className="text-white font-bold text-xl">{initials}</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
            {userName ? `Hi, ${userName}!` : 'Explorer'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your adventure collection</p>
        </div>
      </div>

      {/* ── My Travel Journal ─────────────────────────────────────────────── */}
      {journalLoaded && (
        <div data-testid="section-travel-journal">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-2 px-0.5">
            <BookOpen className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">My Travel Journal</h3>
            {journalEntries.length > 0 && (
              <span className="text-xs text-slate-400 font-medium ml-auto">
                {journalEntries.length} {journalEntries.length === 1 ? "story" : "stories"}
              </span>
            )}
          </div>

          {journalEntries.length === 0 ? (
            <div
              className="rounded-2xl px-5 py-6 text-center"
              style={{ background: "rgba(212,135,43,0.06)", border: "1px solid rgba(212,135,43,0.15)" }}
              data-testid="journal-empty-state"
            >
              <div className="text-3xl mb-2">📖</div>
              <p className="text-sm font-semibold text-slate-700 dark:text-white/80 mb-1">No travel stories yet</p>
              <p className="text-xs text-slate-400 dark:text-white/40">Finish a trip and save your story — it'll appear here</p>
            </div>
          ) : (
            <>
              {/* Latest story preview */}
              {latestEntry && (
                <LatestJournalPreview entry={latestEntry} onNavigate={setLocation} />
              )}

              {/* "Revisit Your Adventures" link */}
              <button
                onClick={() => setLocation("/journal")}
                className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl text-sm font-semibold transition-colors"
                style={{ color: "#D4872B" }}
                data-testid="button-revisit-adventures"
              >
                <span>Revisit Your Adventures</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          <div className="mt-3 mb-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>
      )}

      <MeRow
        icon={<Image className="w-5 h-5 text-pink-500" />}
        label="Moments"
        description="All your captured memories"
        onClick={onOpenMoments}
        testId="button-me-moments"
      />

      <MeRow
        icon={<Map className="w-5 h-5 text-teal-500" />}
        label="Travel Map"
        description="See where you've explored"
        onClick={onOpenTravelMap}
        testId="button-me-travel-map"
      />

      <MeRow
        icon={<Sparkles className="w-5 h-5 text-amber-500" />}
        label="Keepsakes"
        description="Your collected travel treasures"
        onClick={() => setLocation("/travel-keepsake")}
        testId="button-me-keepsakes"
      />

      <MeRow
        icon={<Trophy className="w-5 h-5 text-yellow-500" />}
        label="Trophy Cabinet"
        description="Achievements and milestones"
        onClick={onOpenTrophyCabinet}
        testId="button-me-trophy"
      />

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 shadow-sm" data-testid="me-settings-row">
        <PrivacySettingsMenu onClose={() => {}} variant="geoadventures" />
      </div>
    </div>
  );
}
