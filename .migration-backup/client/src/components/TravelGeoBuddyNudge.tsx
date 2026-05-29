import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Compass, MapPin, Loader2, Search } from "lucide-react";
import { Button } from "./ui/button";
import { GeoBuddyCharacter } from "./GeoBuddyCharacter";
import { GeoBuddy } from "./GeoBuddy";

// ──────────────────────────────────────────────────────────────────
// GeoBuddySuggestionCard — inline beige card replacing inferredBanner
// ──────────────────────────────────────────────────────────────────

interface GeoBuddySuggestionCardProps {
  message: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  tertiaryAction?: { label: string; onClick: () => void };
  onDismiss: () => void;
}

export function GeoBuddySuggestionCard({
  message,
  primaryAction,
  secondaryAction,
  tertiaryAction,
  onDismiss,
}: GeoBuddySuggestionCardProps) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-2xl"
      style={{ background: "#FFF8F0", border: "1.5px solid #F0A87A" }}
      data-testid="banner-inferred-suggestion"
    >
      <Compass className="w-5 h-5 shrink-0 mt-0.5 text-orange-500" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 leading-snug">{message}</p>
        {(primaryAction || secondaryAction || tertiaryAction) && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {primaryAction && (
              <button
                onClick={() => { primaryAction.onClick(); onDismiss(); }}
                className="text-[12px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-all"
                style={{ background: "#E8742B", color: "white" }}
                data-testid="button-inferred-banner-action"
              >
                {primaryAction.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={() => { secondaryAction.onClick(); onDismiss(); }}
                className="text-[12px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-all"
                style={{ background: "#F2F2F0", color: "#555" }}
                data-testid="button-inferred-banner-secondary"
              >
                {secondaryAction.label}
              </button>
            )}
            {tertiaryAction && (
              <button
                onClick={() => { tertiaryAction.onClick(); onDismiss(); }}
                className="text-[12px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-all"
                style={{ background: "#F2F2F0", color: "#555" }}
                data-testid="button-inferred-banner-tertiary"
              >
                {tertiaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 mt-0.5 p-1 rounded-full hover:bg-orange-100 transition-colors"
        style={{ color: "#B8742B" }}
        data-testid="button-inferred-banner-dismiss"
        aria-label="Dismiss suggestion"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// TravelGeoBuddyPanel — quick-action bottom sheet for travel contexts
// ──────────────────────────────────────────────────────────────────

interface TravelGeoBuddyPanelProps {
  onClose: () => void;
  onWhatsNext?: () => void;
  onFindFood?: () => void;
  onMakeLighter?: () => void;
  onSkipNext?: () => void;
}

function TravelGeoBuddyPanel({
  onClose,
  onWhatsNext,
  onFindFood,
  onMakeLighter,
  onSkipNext,
}: TravelGeoBuddyPanelProps) {
  const actions = [
    { emoji: "📍", label: "What's next?", handler: onWhatsNext, testId: "panel-whats-next" },
    { emoji: "🍽️", label: "Find food nearby", handler: onFindFood, testId: "panel-find-food" },
    { emoji: "☀️", label: "Make day easier", handler: onMakeLighter, testId: "panel-make-lighter" },
    { emoji: "⏭️", label: "Skip next stop", handler: onSkipNext, testId: "panel-skip-next" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: 280 }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-slate-800 text-[15px]">GeoBuddy 👋</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 transition-colors"
            data-testid="button-close-geobuddy-panel"
            aria-label="Close GeoBuddy panel"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="py-1">
          {actions.map((action) => (
            <button
              key={action.testId}
              onClick={() => {
                action.handler?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
              data-testid={action.testId}
            >
              <span className="text-xl w-7 text-center shrink-0">{action.emoji}</span>
              <span className="flex-1 text-[14px] font-medium text-slate-700">{action.label}</span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────
// TravelGeoBuddyHomePanel — home-page panel with trip-level shortcuts
// ──────────────────────────────────────────────────────────────────

export interface HomePanelTrip {
  id: string;
  name: string;
  destination?: string;
  city?: string;
}

interface TravelGeoBuddyHomePanelProps {
  onClose: () => void;
  activeTrips: HomePanelTrip[];
  onOpenTrip: (tripId: string) => void;
  onPrepareTomorrow: (tripId: string) => void;
  onFindFood: (mode: "gps" | "route" | "search", city?: string) => void;
}

function TravelGeoBuddyHomePanel({
  onClose,
  activeTrips,
  onOpenTrip,
  onPrepareTomorrow,
  onFindFood,
}: TravelGeoBuddyHomePanelProps) {
  const [subView, setSubView] = useState<null | "food" | "trips">(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const primaryTrip = activeTrips[0] ?? null;

  const handleGps = () => {
    if (!("geolocation" in navigator)) {
      setGpsError("Location not available on this device");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          let detectedCity: string | undefined;
          if (resp.ok) {
            const data = await resp.json();
            detectedCity =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.county ||
              undefined;
          }
          onFindFood("gps", detectedCity);
          onClose();
        } catch {
          onFindFood("gps");
          onClose();
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        setGpsError("Location not available — try 'Search anywhere' instead");
      },
      { timeout: 8000 }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {subView ? (
              <button
                onClick={() => { setSubView(null); setGpsError(null); }}
                className="p-1 rounded-full hover:bg-slate-100 transition-colors mr-1"
                aria-label="Back"
              >
                <ChevronRight className="w-4 h-4 text-slate-500 rotate-180" />
              </button>
            ) : (
              <Compass className="w-5 h-5 text-orange-500" />
            )}
            <span className="font-bold text-slate-800 text-[15px]">
              {subView === "food" ? "Find food nearby" : subView === "trips" ? "Choose a trip" : "GeoBuddy 👋"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 transition-colors"
            data-testid="button-close-geobuddy-panel"
            aria-label="Close GeoBuddy panel"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Main actions */}
        {!subView && (
          <div className="py-1">
            {/* Check out active trip */}
            {activeTrips.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 text-left opacity-50">
                <span className="text-xl w-7 text-center shrink-0">🗺️</span>
                <span className="flex-1 text-[14px] font-medium text-slate-500">No active trip — start one ✈️</span>
              </div>
            ) : activeTrips.length === 1 ? (
              <button
                onClick={() => { onOpenTrip(primaryTrip!.id); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
                data-testid="panel-home-open-trip"
              >
                <span className="text-xl w-7 text-center shrink-0">🗺️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-slate-700">Check out active trip</p>
                  <p className="text-[12px] text-slate-400 truncate">{primaryTrip!.name}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => setSubView("trips")}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
                data-testid="panel-home-open-trip"
              >
                <span className="text-xl w-7 text-center shrink-0">🗺️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-slate-700">Check out active trip</p>
                  <p className="text-[12px] text-slate-400">{activeTrips.length} trips active</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            )}

            {/* Prepare for tomorrow */}
            <button
              onClick={() => { if (primaryTrip) { onPrepareTomorrow(primaryTrip.id); onClose(); } }}
              disabled={!primaryTrip}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 active:bg-orange-100 transition-colors text-left disabled:opacity-40 disabled:pointer-events-none"
              data-testid="panel-home-prepare-tomorrow"
            >
              <span className="text-xl w-7 text-center shrink-0">📋</span>
              <span className="flex-1 text-[14px] font-medium text-slate-700">Prepare for tomorrow</span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Find food nearby */}
            <button
              onClick={() => setSubView("food")}
              disabled={!primaryTrip}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 active:bg-orange-100 transition-colors text-left disabled:opacity-40 disabled:pointer-events-none"
              data-testid="panel-home-find-food"
            >
              <span className="text-xl w-7 text-center shrink-0">🍔</span>
              <span className="flex-1 text-[14px] font-medium text-slate-700">Find food nearby</span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        )}

        {/* Trip picker sub-view */}
        {subView === "trips" && (
          <div className="py-1 max-h-60 overflow-y-auto">
            {activeTrips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => { onOpenTrip(trip.id); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
                data-testid={`panel-home-trip-${trip.id}`}
              >
                <span className="text-xl w-7 text-center shrink-0">✈️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-slate-700 truncate">{trip.name}</p>
                  <p className="text-[12px] text-slate-400 truncate">{trip.city || trip.destination}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Food location picker sub-view */}
        {subView === "food" && (
          <div className="p-4 space-y-2">
            <button
              onClick={handleGps}
              disabled={gpsLoading}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-orange-50 rounded-xl border border-slate-100 hover:border-orange-200 transition-colors text-left disabled:opacity-50"
              data-testid="panel-food-gps"
            >
              {gpsLoading ? (
                <Loader2 className="w-5 h-5 text-orange-500 animate-spin shrink-0" />
              ) : (
                <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
              )}
              <span className="text-[14px] font-medium text-slate-700">
                {gpsLoading ? "Getting your location…" : "Near my current location"}
              </span>
            </button>

            <button
              onClick={() => { onFindFood("route"); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-orange-50 rounded-xl border border-slate-100 hover:border-orange-200 transition-colors text-left"
              data-testid="panel-food-route"
            >
              <Compass className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="text-[14px] font-medium text-slate-700">Along the route</span>
            </button>

            <button
              onClick={() => { onFindFood("search"); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-orange-50 rounded-xl border border-slate-100 hover:border-orange-200 transition-colors text-left"
              data-testid="panel-food-search"
            >
              <Search className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="text-[14px] font-medium text-slate-700">Search anywhere</span>
            </button>

            {gpsError && (
              <p className="text-[12px] text-red-500 text-center pt-1">{gpsError}</p>
            )}
          </div>
        )}

        <div className="h-safe-area-inset-bottom pb-2" />
      </motion.div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────
// TravelGeoBuddyNudge — main float character + speech bubble
// ──────────────────────────────────────────────────────────────────

interface TravelGeoBuddyNudgeProps {
  message: string;
  triggerKey: string;
  delay?: number;
  duration?: number;
  onDismiss?: () => void;
  showDismiss?: boolean;
  chatEnabled?: boolean;
  panelVariant?: "home" | "trip";
  activeTrips?: HomePanelTrip[];
  onOpenTrip?: (tripId: string) => void;
  onPrepareTomorrow?: (tripId: string) => void;
  onFindFoodHome?: (mode: "gps" | "route" | "search", city?: string) => void;
  onWhatsNext?: () => void;
  onFindFood?: () => void;
  onMakeLighter?: () => void;
  onSkipNext?: () => void;
}

const STORAGE_PREFIX = "geobuddy-nudge-dismissed-";

export function TravelGeoBuddyNudge({
  message,
  triggerKey,
  delay = 2000,
  duration = 10000,
  onDismiss,
  showDismiss = true,
  chatEnabled = true,
  panelVariant = "trip",
  activeTrips = [],
  onOpenTrip,
  onPrepareTomorrow,
  onFindFoodHome,
  onWhatsNext,
  onFindFood,
  onMakeLighter,
  onSkipNext,
}: TravelGeoBuddyNudgeProps) {
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const storageKey = `${STORAGE_PREFIX}${triggerKey}`;

  const dismissMessage = useCallback(() => {
    setIsMessageVisible(false);
    try {
      const today = new Date().toDateString();
      localStorage.setItem(storageKey, today);
    } catch {}
    onDismiss?.();
  }, [storageKey, onDismiss]);

  useEffect(() => {
    try {
      const lastDismissed = localStorage.getItem(storageKey);
      const today = new Date().toDateString();
      if (lastDismissed === today) {
        return;
      }
    } catch {}

    const showTimer = setTimeout(() => {
      setIsMessageVisible(true);
    }, delay);

    return () => clearTimeout(showTimer);
  }, [delay, storageKey]);

  useEffect(() => {
    if (!isMessageVisible || duration === 0) return;

    const hideTimer = setTimeout(() => {
      setIsMessageVisible(false);
    }, duration);

    return () => clearTimeout(hideTimer);
  }, [isMessageVisible, duration]);

  const handleCharacterClick = () => {
    if (chatEnabled) {
      setIsChatOpen(true);
    } else {
      setIsPanelOpen(true);
    }
  };

  return (
    <>
      {/* Speech bubble - only shows when there's a message */}
      <AnimatePresence>
        {isMessageVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-28 left-20 z-[55] max-w-[180px] pointer-events-auto"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl px-3 py-2 shadow-lg relative border border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-snug pr-4">
                "{message}"
              </p>
              <div className="absolute -bottom-2 left-3 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-slate-100 dark:border-slate-700 rotate-45" />
              {showDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600"
                  onClick={dismissMessage}
                  data-testid="button-dismiss-nudge"
                >
                  <X className="w-2.5 h-2.5" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GeoBuddy character — draggable, opens panel (travel) or chat (GeoQuest) */}
      <motion.button
        drag
        dragMomentum={false}
        dragElastic={0.1}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={handleCharacterClick}
        className="fixed bottom-8 left-4 z-[54] cursor-grab active:cursor-grabbing hover:scale-105 transition-transform touch-none"
        data-testid="button-geobuddy-chat"
        aria-label={chatEnabled ? "Chat with GeoBuddy" : "Open GeoBuddy actions"}
      >
        <GeoBuddyCharacter
          state={isMessageVisible ? "chatting" : "idle"}
          size="md"
          showGlow={isMessageVisible}
          autoHide={false}
        />
      </motion.button>

      {/* GeoBuddy Chat Dialog — GeoQuest contexts only */}
      <AnimatePresence>
        {chatEnabled && isChatOpen && (
          <GeoBuddyChatDialog onClose={() => setIsChatOpen(false)} />
        )}
      </AnimatePresence>

      {/* Travel quick-action panel — trip view */}
      <AnimatePresence>
        {!chatEnabled && panelVariant === "trip" && isPanelOpen && (
          <TravelGeoBuddyPanel
            onClose={() => setIsPanelOpen(false)}
            onWhatsNext={onWhatsNext}
            onFindFood={onFindFood}
            onMakeLighter={onMakeLighter}
            onSkipNext={onSkipNext}
          />
        )}
      </AnimatePresence>

      {/* Home panel — GeoAdventures main page */}
      <AnimatePresence>
        {!chatEnabled && panelVariant === "home" && isPanelOpen && (
          <TravelGeoBuddyHomePanel
            onClose={() => setIsPanelOpen(false)}
            activeTrips={activeTrips}
            onOpenTrip={onOpenTrip ?? (() => {})}
            onPrepareTomorrow={onPrepareTomorrow ?? (() => {})}
            onFindFood={onFindFoodHome ?? (() => {})}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// GeoBuddyChatDialog — existing chat sheet for GeoQuest contexts
// ──────────────────────────────────────────────────────────────────

function GeoBuddyChatDialog({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4 bg-black/30"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30">
          <div className="flex items-center gap-3">
            <GeoBuddyCharacter state="chatting" size="sm" autoHide={false} />
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Geo-Buddy</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Your AI learning companion</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
            data-testid="button-close-chat"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-0">
          <GeoBuddy embedded />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Nudge messages and utilities
// ──────────────────────────────────────────────────────────────────

const NUDGE_MESSAGES = {
  firstVisit: "Let's explore together and see where your adventure begins!",
  upcomingTrip: "Looks like a busy day ahead — I've got some ideas",
  activeTrip: "What will you remember from today? Let's explore together!",
  pastTrips: "Where will you go next? Let's explore together!",
  returnToTrip: "Welcome back! Let's explore together!",
  afterJourneyPack: "What will you discover next? Let's explore together!",
  afterMoment: "Beautiful memory saved!",
  geoBuddyIntro: "I'm GeoBuddy, your geography companion. Let's explore together!",
  keepsakeIntro: "Travel Keepsakes are special treasures you can only find at each stop! Complete activities to unlock these rare collectibles. Let's explore together!",
} as const;

export type NudgeType = keyof typeof NUDGE_MESSAGES;

export function getTravelNudgeMessage(type: NudgeType): string {
  return NUDGE_MESSAGES[type];
}
