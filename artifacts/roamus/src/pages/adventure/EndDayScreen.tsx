import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useTravel } from "@/lib/travelContext";
import { useTripExecutionState } from "@/hooks/useTripExecutionState";
import { Camera, Ticket, X, ImagePlus, Check, Home } from "lucide-react";
import { getStopCategory } from "@/lib/stopCategories";
import { getMomentPhotos } from "@/lib/storyState";
import { toast } from "sonner";
import { useExplorer } from "@/lib/explorerContext";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { useQualitySignal } from "@/hooks/useQualitySignal";

const STOP_EMOJI: Record<string, string> = {
  museum: "🏛️", nature: "🌿", beach: "🏖️", park: "🌳",
  zoo: "🐾", aquarium: "🐠", restaurant: "🍽️", landmark: "📍",
  market: "🛒", viewpoint: "🌅", garden: "🌸", playground: "🎠",
  cafe: "☕", breakfast: "🥐", lunch: "🥗", dinner: "🌙",
};

function getStopEmoji(stopType?: string | null): string {
  return STOP_EMOJI[stopType ?? ""] ?? "📍";
}

const TICKET_NEEDED_TYPES = ["museum", "aquarium", "theme_park", "zoo", "attraction"];

interface WalletItem {
  id: string;
  stopId?: string | null;
  type: string;
}

interface StopShape {
  id: string;
  name: string;
  stopType?: string | null;
  isVisited?: boolean | null;
}

function generateMemoryBullets(stops: StopShape[], momentsCount: number): string[] {
  const bullets: string[] = [];

  for (const stop of stops) {
    if (bullets.length >= 4) break;
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

  if (momentsCount > 0 && bullets.length < 5) {
    bullets.push(`📸 You captured ${momentsCount} ${momentsCount === 1 ? "memory" : "memories"} along the way`);
  }

  return bullets;
}

// ── Photo Picker Sheet ─────────────────────────────────────────────────────

const MAX_PHOTOS = 5;

async function compressImage(file: File, maxPx = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      const scale = Math.min(1, maxPx / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

interface PhotoPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: (count: number) => void;
  tripId: string;
  lastStopId: string | null;
  stops?: { id: string; name: string }[];
}

function PhotoPickerSheet({ open, onClose, onSaved, tripId, lastStopId, stops = [] }: PhotoPickerSheetProps) {
  const { saveMoment } = useTravel();
  const { fireSignal } = useQualitySignal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(lastStopId);

  const reset = useCallback(() => {
    setSelectedFiles([]);
    setPreviewUrls(prev => { prev.forEach(u => URL.revokeObjectURL(u)); return []; });
    setSaving(false);
    setSelectedStopId(lastStopId);
  }, [lastStopId]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, MAX_PHOTOS - selectedFiles.length);
    const combined = [...selectedFiles, ...arr].slice(0, MAX_PHOTOS);
    setSelectedFiles(combined);
    setPreviewUrls(prev => {
      prev.forEach(u => URL.revokeObjectURL(u));
      return combined.map(f => URL.createObjectURL(f));
    });
  };

  const removePhoto = (idx: number) => {
    const next = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles(next);
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSave = async () => {
    if (selectedFiles.length === 0 || saving) return;
    setSaving(true);
    try {
      const photoUrls = await Promise.all(selectedFiles.map(f => compressImage(f)));
      await saveMoment({
        tripId,
        stopId: selectedStopId,
        photoUrls,
        photoUrl: photoUrls[0] ?? null,
      });
      // Fire moment quality signals (fire-and-forget, parent-only path)
      if (selectedStopId) {
        fireSignal(selectedStopId, "photo_added", { signalValue: String(photoUrls.length) });
      }
      onSaved(selectedFiles.length);
      onClose();
    } catch {
      toast.error("Couldn't save photos — try again");
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        data-testid="overlay-photo-sheet-backdrop"
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col"
        data-testid="sheet-photo-picker"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Add moments from today</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
            data-testid="button-photo-sheet-close"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Photo grid */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2" data-testid="grid-photo-previews">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                  <img src={url} alt="" className="w-full h-full object-cover" data-testid={`img-preview-${i}`} />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                    data-testid={`button-remove-photo-${i}`}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {selectedFiles.length < MAX_PHOTOS && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  data-testid="button-add-more-photos"
                >
                  <ImagePlus className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-400">Add more</span>
                </button>
              )}
            </div>
          )}

          {/* Empty state — upload prompt */}
          {previewUrls.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              data-testid="button-upload-photos-empty"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
              >
                <Camera className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">Choose photos</p>
                <p className="text-xs text-slate-500 mt-0.5">Up to {MAX_PHOTOS} from your camera roll</p>
              </div>
            </button>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
            data-testid="input-file-picker"
          />

          <p className="text-xs text-center text-slate-400">
            {selectedFiles.length}/{MAX_PHOTOS} selected
          </p>

          {/* Stop selector */}
          {stops.length > 0 && (
            <div data-testid="section-stop-selector">
              <p className="text-xs font-semibold text-slate-500 mb-2">Which stop is this from?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedStopId(null)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: selectedStopId === null ? "#D4872B" : "#F1F5F9",
                    color: selectedStopId === null ? "#fff" : "#475569",
                  }}
                  data-testid="button-stop-none"
                >
                  No specific stop
                </button>
                {stops.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStopId(s.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: selectedStopId === s.id ? "#D4872B" : "#F1F5F9",
                      color: selectedStopId === s.id ? "#fff" : "#475569",
                    }}
                    data-testid={`button-stop-${s.id}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t border-slate-100 space-y-2">
          <button
            onClick={handleSave}
            disabled={selectedFiles.length === 0 || saving}
            className="w-full py-3.5 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
            data-testid="button-save-photos"
          >
            {saving ? "Saving…" : `Save ${selectedFiles.length > 0 ? selectedFiles.length : ""} photo${selectedFiles.length !== 1 ? "s" : ""}`}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-slate-500 text-sm font-semibold"
            data-testid="button-photo-sheet-cancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── Today's Moments Section ────────────────────────────────────────────────

interface TodayMomentsSectionProps {
  tripId: string;
  dayIndex: number;
  stopsVisited: { name: string; stopType?: string | null }[];
  heroPhotoUrl: string | null;
}

function TodayMomentsSection({ tripId, dayIndex, stopsVisited, heroPhotoUrl }: TodayMomentsSectionProps) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [parentNote, setParentNote] = useState("");
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether we've successfully generated with real stop data
  const generatedWithStopsRef = useRef(false);

  useEffect(() => {
    // Defer generation until stops have loaded (or re-run when they first appear)
    const hasStops = stopsVisited.length > 0;
    if (generatedWithStopsRef.current && !hasStops) return; // already have good data, don't regress

    let cancelled = false;
    setLoading(true);
    fetch(`/api/travel/trips/${tripId}/day-memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        dayIndex,
        stopsVisited: stopsVisited.map(s => ({ name: s.name, stopType: s.stopType })),
        parentNote: null,
        photoUrl: heroPhotoUrl ?? null,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (!cancelled && Array.isArray(data.lines)) {
          setLines(data.lines);
          if (hasStops) generatedWithStopsRef.current = true;
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tripId, dayIndex, stopsVisited.length]);

  const handleNoteChange = (value: string) => {
    setParentNote(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/travel/trips/${tripId}/day-memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          dayIndex,
          noteOnly: true,
          parentNote: value,
        }),
      }).catch(() => {});
    }, 1000);
  };

  return (
    <div className="space-y-3" data-testid="section-today-moments">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">
        Today felt like this…
      </p>

      {loading ? (
        <>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="rounded-2xl animate-pulse"
              style={{
                height: i === 0 ? 120 : 72,
                background: "#1e293b",
                opacity: 0.5 + i * 0.1,
              }}
              data-testid={`skeleton-moment-${i}`}
            />
          ))}
        </>
      ) : (
        <>
          {/* Hero card */}
          <div
            className="rounded-2xl overflow-hidden relative flex items-end"
            style={{
              height: 130,
              background: heroPhotoUrl
                ? undefined
                : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            }}
            data-testid="card-moment-hero"
          >
            {heroPhotoUrl && (
              <img
                src={heroPhotoUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                data-testid="img-moment-hero"
              />
            )}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 100%)" }}
            />
            <p
              className="relative z-10 px-4 pb-4 text-base font-medium text-white italic leading-snug"
              data-testid="text-moment-line-0"
            >
              {lines?.[0] ?? ""}
            </p>
          </div>

          {/* Lines 2 & 3 */}
          {[1, 2].map(idx => (
            <div
              key={idx}
              className="rounded-2xl px-4 py-3.5 flex items-center"
              style={{ background: "#1e293b", minHeight: 68 }}
              data-testid={`card-moment-${idx}`}
            >
              <p
                className="text-sm font-medium text-white italic leading-snug"
                data-testid={`text-moment-line-${idx}`}
              >
                {lines?.[idx] ?? ""}
              </p>
            </div>
          ))}
        </>
      )}

      {/* Parent note */}
      <input
        type="text"
        value={parentNote}
        onChange={e => handleNoteChange(e.target.value)}
        placeholder="Anything you want to remember?"
        className="w-full rounded-xl px-4 py-3 text-sm text-slate-700 border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
        data-testid="input-parent-note"
      />

      <p className="text-xs text-center text-slate-400 pb-1" data-testid="text-moments-footer">
        We'll turn this into your trip story later
      </p>
    </div>
  );
}

// ── Day Photo Section ──────────────────────────────────────────────────────

interface DayPhotoSectionProps {
  photoCount: number;
  isLastDay: boolean;
  onAddPhotos: () => void;
  onViewPhotos: () => void;
}

function DayPhotoSection({ photoCount, isLastDay, onAddPhotos, onViewPhotos }: DayPhotoSectionProps) {
  let heading: string;
  let subtext: string;
  let primaryLabel: string;
  let secondaryLabel: string;
  let primaryAction: () => void;

  if (isLastDay && photoCount === 0) {
    heading = "Before you go — save a few moments 📸";
    subtext = "These will become your trip story";
    primaryLabel = "Add photos";
    secondaryLabel = "Skip for now";
    primaryAction = onAddPhotos;
  } else if (photoCount === 0) {
    heading = "Save a moment from today 📸";
    subtext = "Add 1–3 photos so your adventure is easier to remember";
    primaryLabel = "Add photos";
    secondaryLabel = "Skip for now";
    primaryAction = onAddPhotos;
  } else if (photoCount <= 3) {
    heading = `You captured ${photoCount} moment${photoCount !== 1 ? "s" : ""} today 📸`;
    subtext = "Add more or keep going";
    primaryLabel = "Add more photos";
    secondaryLabel = "Looks good";
    primaryAction = onAddPhotos;
  } else {
    heading = "Nice — today is well captured 📸";
    subtext = "These will be part of your trip story";
    primaryLabel = "View photos";
    secondaryLabel = "Continue";
    primaryAction = onViewPhotos;
  }

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{ background: "#FFFBF0", border: "1px solid #FDE68A" }}
      data-testid="card-day-photo-section"
    >
      <p className="text-sm font-bold text-slate-800 mb-0.5" data-testid="text-photo-heading">
        {heading}
      </p>
      <p className="text-xs text-slate-500 mb-3" data-testid="text-photo-subtext">
        {subtext}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={primaryAction}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:opacity-80 active:scale-[0.97]"
          style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
          data-testid="button-photo-primary"
        >
          {primaryLabel}
        </button>
        <button
          onClick={onViewPhotos}
          className="py-2.5 px-3 rounded-xl text-slate-600 text-sm font-semibold border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors whitespace-nowrap"
          data-testid="button-photo-secondary"
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function EndDayScreen() {
  const [, params] = useRoute("/adventure/:tripId/end-day");
  const tripId = params?.tripId ?? "";
  const [location, setLocation] = useLocation();
  // EndDayScreen is a parent-only screen; kid mode lives under /adventure/:tripId/kid/*.
  const isParentMode = !location.includes("/kid/");
  const { currentTripMoments, ensureTripLoaded } = useTravel();
  const [walletItems, setWalletItems] = useState<WalletItem[]>([]);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [photosJustSaved, setPhotosJustSaved] = useState(0);
  const [standoutStopId, setStandoutStopId] = useState<string | null>(null);
  const [standoutTag, setStandoutTag] = useState<string | null>(null);
  const { fireSignal } = useQualitySignal();
  const { activeExplorer } = useExplorer();
  const { isPaidUser } = useFreeLimits();
  const explorerStreak = activeExplorer?.streak ?? 0;
  const showStreakNudge = !isPaidUser && explorerStreak >= 2;

  useEffect(() => {
    if (tripId) ensureTripLoaded(tripId);
  }, [tripId, ensureTripLoaded]);

  useEffect(() => {
    if (!tripId) return;
    fetch(`/api/travel/trips/${tripId}/wallet`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setWalletItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [tripId]);

  const { currentDay, currentDayIndex, dayGroups, trip } =
    useTripExecutionState(tripId);

  useEffect(() => {
    if (!tripId || !trip) return;
    const emailKey = `dayEmailSent:${tripId}:${new Date().toDateString()}`;
    if (sessionStorage.getItem(emailKey)) return;
    sessionStorage.setItem(emailKey, '1');

    const completedToday = (currentDay ?? []).filter(s => s.isVisited);
    const todayXP = completedToday.length * 25;
    const todayMoments = currentTripMoments.filter(
      m => m.stopId && new Set((currentDay ?? []).map(s => s.id)).has(m.stopId!)
    ).length;
    const nextFirst = (dayGroups[currentDayIndex + 1] ?? [])[0];
    const nextPreview = nextFirst?.name ?? 'More adventures tomorrow';

    fetch(`/api/travel/trips/${tripId}/notify-day-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        stopsExplored: completedToday.length,
        xpEarned: todayXP,
        momentsCount: todayMoments,
        nextDayPreview: nextPreview,
      }),
    }).catch(() => {});
  }, [tripId, trip]);

  const todayCompletedStops = useMemo(
    () => (currentDay ?? []).filter(s => s.isVisited),
    [currentDay]
  );

  const todayStopIds = useMemo(
    () => new Set((currentDay ?? []).map(s => s.id)),
    [currentDay]
  );

  const momentsToday = useMemo(
    () => currentTripMoments.filter(m => m.stopId && todayStopIds.has(m.stopId)).length,
    [currentTripMoments, todayStopIds]
  );

  const todayPhotoCount = useMemo(() => {
    const todayMoments = currentTripMoments.filter(
      m => m.stopId && todayStopIds.has(m.stopId)
    );
    return getMomentPhotos(todayMoments).length + photosJustSaved;
  }, [currentTripMoments, todayStopIds, photosJustSaved]);

  const memoryBullets = useMemo(
    () => generateMemoryBullets(todayCompletedStops, momentsToday),
    [todayCompletedStops, momentsToday]
  );

  const nextDayIndex = currentDayIndex + 1;
  const nextDayStops = dayGroups[nextDayIndex] ?? [];
  const nextDayFirstStop = nextDayStops.find(s => !s.isVisited) ?? nextDayStops[0] ?? null;
  const hasMoreDays = nextDayStops.length > 0;
  const isLastDay = !hasMoreDays;

  const lastVisitedStopId = todayCompletedStops.at(-1)?.id ?? null;

  const tomorrowTicketStops = useMemo(
    () => nextDayStops.filter(s => TICKET_NEEDED_TYPES.includes(s.stopType ?? "")),
    [nextDayStops]
  );

  const stopHasTicket = (stopId: string) =>
    walletItems.some(
      w => w.stopId === stopId && ["ticket", "reservation", "confirmation"].includes(w.type)
    );

  const missingTicketStop = tomorrowTicketStops.find(s => !stopHasTicket(s.id)) ?? null;
  const allTicketsReady = tomorrowTicketStops.length > 0 && tomorrowTicketStops.every(s => stopHasTicket(s.id));

  const showPhotoCapture = trip?.allowMediaCapture !== false && trip?.adventureContext !== 'home';

  const handlePhotoSaved = useCallback((count: number) => {
    setPhotosJustSaved(prev => prev + count);
    toast.success(`Saved to today's memories`, {
      icon: <Check className="w-4 h-4 text-green-600" />,
      duration: 2500,
    });
  }, []);

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="screen-end-day-loading">
        <div className="text-4xl animate-bounce">🧭</div>
      </div>
    );
  }

  const headlineText = isLastDay ? "You finished your adventure" : "You did it — great day";
  const subText = isLastDay
    ? "What a way to end it"
    : `You explored ${todayCompletedStops.length} ${todayCompletedStops.length === 1 ? "place" : "places"} together`;

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="screen-end-day">

      {/* Header */}
      <div
        className="px-4 pt-10 pb-8 text-center"
        style={{ background: "linear-gradient(180deg, #EEF6FF 0%, #ffffff 100%)" }}
      >
        <div className="flex justify-start mb-2">
          <button
            onClick={() => setLocation("/geoadventures?home=1")}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-orange-500 transition-colors"
            data-testid="button-end-day-home"
          >
            <Home className="w-3.5 h-3.5" />
            GeoAdventures
          </button>
        </div>
        <div className="text-5xl mb-3">🎉</div>
        <h1
          className="text-3xl font-bold text-slate-900 mb-1"
          data-testid="text-day-complete-heading"
        >
          {headlineText}
        </h1>
        <p className="text-base text-slate-500 mt-1" data-testid="text-day-subtext">
          {subText}
        </p>
      </div>

      <div className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full space-y-3">

        {/* Memory block */}
        {memoryBullets.length > 0 && (
          <div
            className="rounded-2xl px-5 py-4"
            style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}
            data-testid="card-memory-block"
          >
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Show your explorer what you did today 👇
            </p>
            <ul className="space-y-2.5">
              {memoryBullets.map((bullet, i) => (
                <li key={i} className="text-sm font-semibold text-slate-800" data-testid={`text-memory-bullet-${i}`}>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Today's Moments — emotional capture (skip on last day — trip complete screen focuses on the full story) */}
        {showPhotoCapture && !isLastDay && (
          <TodayMomentsSection
            tripId={tripId}
            dayIndex={currentDayIndex}
            stopsVisited={todayCompletedStops}
            heroPhotoUrl={getMomentPhotos(currentTripMoments.filter(m => m.stopId && todayStopIds.has(m.stopId)))[0] ?? null}
          />
        )}

        {/* Save today's moments */}
        {showPhotoCapture && (
          <DayPhotoSection
            photoCount={todayPhotoCount}
            isLastDay={isLastDay}
            onAddPhotos={() => setShowPhotoSheet(true)}
            onViewPhotos={() => setLocation(`/adventure/${tripId}/parent-plan?tab=memories`)}
          />
        )}

        {/* Tomorrow preview — mid-trip only */}
        {hasMoreDays && nextDayFirstStop && (
          <div data-testid="card-tomorrow-preview">
            <div
              className="rounded-2xl px-5 py-4"
              style={{ background: "#F9F9F9", border: "1px solid #EBEBEB" }}
            >
              <p className="text-xs font-semibold text-slate-400 mb-2">Tomorrow</p>
              <div className="flex items-center gap-2 flex-wrap mb-3" data-testid="text-tomorrow-preview">
                <span>{getStopEmoji(nextDayFirstStop.stopType)}</span>
                <span className="font-semibold text-slate-800">{nextDayFirstStop.name}</span>
                {nextDayStops.length > 1 && (
                  <>
                    <span className="text-slate-400">+</span>
                    <span className="text-slate-600 text-sm">{nextDayStops.length - 1} more</span>
                  </>
                )}
              </div>

              {missingTicketStop && (
                <div
                  className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5"
                  style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
                  data-testid="block-ticket-warning"
                >
                  <Ticket className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-800">
                      You'll need tickets for {missingTicketStop.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=wallet`)}
                    className="text-xs font-bold text-amber-700 underline shrink-0 active:opacity-70"
                    data-testid="button-fix-tickets"
                  >
                    Fix now
                  </button>
                </div>
              )}

              {allTicketsReady && (
                <div
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
                  style={{ background: "#F0FFF4", border: "1px solid #BBF7D0" }}
                  data-testid="block-tickets-ready"
                >
                  <span className="text-sm">✅</span>
                  <p className="text-xs font-bold text-green-700">You're ready 👍</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Day-end quality tagging: one standout stop + one tag — parent-only */}
        {isParentMode && todayCompletedStops.length > 0 && (
          <div
            className="rounded-2xl px-4 py-4"
            style={{ background: "#FFFDF5", border: "1px solid #FDE68A" }}
            data-testid="section-stop-tags"
          >
            {!standoutStopId ? (
              <>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  ⭐ Best stop today?
                </p>
                <p className="text-xs text-slate-400 mb-3">Tap one — helps tune future trips</p>
                <div className="flex flex-wrap gap-2">
                  {todayCompletedStops.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setStandoutStopId(s.id);
                        setStandoutTag(null);
                        // Fire standout_stop immediately on selection
                        fireSignal(s.id, "standout_stop", { signalValue: "best_stop" });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95"
                      style={{ background: "#ffffff", borderColor: "#E5E7EB", color: "#4B5563" }}
                      data-testid={`button-standout-${s.id}`}
                    >
                      {getStopEmoji(s.stopType)} {s.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-amber-700">
                    ⭐ {todayCompletedStops.find(s => s.id === standoutStopId)?.name}
                  </span>
                  <button
                    onClick={() => { setStandoutStopId(null); setStandoutTag(null); }}
                    className="text-xs text-slate-400 hover:text-slate-600"
                    data-testid="button-change-standout"
                  >
                    change
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-2">What made it great?</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { val: "kids_loved_this", label: "👶 Kids loved it" },
                    { val: "good_break_stop", label: "☕ Good break" },
                    { val: "glad_we_did_it", label: "🙌 Glad we did it" },
                    { val: "too_much_effort", label: "😤 Actually tough" },
                  ].map(tag => (
                    <button
                      key={tag.val}
                      onClick={() => {
                        const next = standoutTag === tag.val ? null : tag.val;
                        setStandoutTag(next);
                        if (next) fireSignal(standoutStopId, "day_end_tag", { signalValue: next });
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all active:scale-95 whitespace-nowrap"
                      style={
                        standoutTag === tag.val
                          ? { background: "#FEF08A", borderColor: "#EAB308", color: "#713F12" }
                          : { background: "#ffffff", borderColor: "#E5E7EB", color: "#4B5563" }
                      }
                      data-testid={`button-tag-${tag.val}-${standoutStopId}`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* CTAs */}
        <div className="space-y-3 pt-2">
          {hasMoreDays ? (
            <button
              onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=trip_plan&day=next`)}
              className="w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
              style={{ background: "#D4872B" }}
              data-testid="button-preview-tomorrow"
            >
              Preview tomorrow
            </button>
          ) : (
            <button
              onClick={() => setLocation(`/adventure/${tripId}/story-ready`)}
              className="w-full py-4 rounded-2xl text-white text-base font-bold transition-all active:opacity-80 active:scale-[0.97]"
              style={{ background: "#D4872B" }}
              data-testid="button-see-full-adventure"
            >
              See your full adventure
            </button>
          )}

          <button
            onClick={() => setLocation(`/adventure/${tripId}/parent-plan?tab=memories`)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-slate-700 text-base font-semibold border border-slate-200 hover:bg-slate-50 transition-colors"
            data-testid="button-view-memories"
          >
            <Camera className="w-4 h-4" />
            View memories
          </button>
        </div>

      </div>

      {/* Photo picker bottom sheet */}
      <PhotoPickerSheet
        open={showPhotoSheet}
        onClose={() => setShowPhotoSheet(false)}
        onSaved={handlePhotoSaved}
        tripId={tripId}
        lastStopId={lastVisitedStopId}
        stops={todayCompletedStops}
      />
    </div>
  );
}
