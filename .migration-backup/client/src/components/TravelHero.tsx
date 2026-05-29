import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Headphones, Eye, Camera, Compass, Globe, ChevronRight } from "lucide-react";
import type { TravelTrip, TravelStop } from "@shared/schema";

// Journey-phase based hero states
export type HeroState = 
  | "listen"      // Before Stop - on the way, spark curiosity
  | "wonder"      // At Location - put phone down, explore
  | "reflect"     // After Stop - save memory
  | "first"       // No trips - build first adventure
  | "memories"    // Has past trips, revisit or start new
  | "upcoming";   // Legacy: generic upcoming trip

export interface ActiveAdventure {
  trip: TravelTrip;
  nextStop?: TravelStop | null;
  journeyPhase: "listen" | "wonder" | "reflect" | "continue";
  isActive: boolean;
}

interface TravelHeroProps {
  state: HeroState;
  upcomingTrip?: TravelTrip | null;
  activeAdventure?: ActiveAdventure | null;
  stopName?: string;
  onStartListening?: () => void;
  onShowWonderPrompt?: () => void;
  onSaveMoment?: () => void;
  onContinueJourney?: () => void;
  onViewTravelMap?: () => void;
  onPlanFirstTrip?: () => void;
  onSkip?: () => void;
  otherAdventureCount?: number;
  onSwitchAdventure?: () => void;
}

const HERO_CONFIG = {
  listen: {
    emoji: "🎧",
    icon: Headphones,
    title: "Next GeoMoment: Listen",
    subtitle: "A short story about your next stop — perfect for the ride.",
    helperText: "Get curious before you arrive.",
    ctaText: "Start Listening",
    secondaryText: "Skip for now",
    gradient: "from-sky-400 via-blue-400 to-indigo-500 dark:from-sky-600 dark:via-blue-600 dark:to-indigo-700",
  },
  wonder: {
    emoji: "👀",
    icon: Eye,
    title: "Wonder Time",
    subtitle: "Look around. What do you notice?",
    helperText: "No screens needed — just explore together.",
    ctaText: "Show Wonder Prompt",
    secondaryText: "We're exploring now",
    gradient: "from-amber-400 via-orange-400 to-rose-400 dark:from-amber-600 dark:via-orange-600 dark:to-rose-500",
  },
  reflect: {
    emoji: "📸",
    icon: Camera,
    title: "Save This Memory",
    subtitle: "What made this place special for your child?",
    helperText: "A photo, a thought, or a moment — your choice.",
    ctaText: "Save a Moment",
    secondaryText: "Do it later",
    gradient: "from-violet-400 via-purple-400 to-fuchsia-400 dark:from-violet-600 dark:via-purple-600 dark:to-fuchsia-500",
  },
  first: {
    emoji: "🧭",
    icon: Compass,
    title: "Help Your Child Remember the Places You Visit",
    subtitle: "GeoAdventures turns family trips into stories kids actually remember — through audio adventures, wonder prompts, and travel keepsakes.",
    helperText: "No schedules. No tests. Just curiosity and play.",
    ctaText: "Build Your Child's First Adventure",
    secondaryText: "Try a sample adventure",
    gradient: "from-amber-100 via-orange-100 to-rose-100 dark:from-amber-900/40 dark:via-orange-900/40 dark:to-rose-900/40",
  },
  memories: {
    emoji: "🗺️",
    icon: Globe,
    title: "Your family has explored the world",
    subtitle: "Revisit favorite memories or start a new adventure.",
    helperText: "",
    ctaText: "View Travel Map",
    secondaryText: "Start New Adventure",
    gradient: "from-rose-400 via-pink-400 to-orange-400 dark:from-rose-600 dark:via-pink-600 dark:to-orange-500",
  },
  upcoming: {
    emoji: "🧭",
    icon: Compass,
    title: "You're building memories together",
    subtitle: "",
    helperText: "This trip is being saved as you go",
    ctaText: "Continue Exploring",
    secondaryText: "",
    gradient: "from-slate-600 via-slate-500 to-amber-600/80 dark:from-slate-700 dark:via-slate-600 dark:to-amber-700/70",
  },
};

export function TravelHero({
  state,
  upcomingTrip,
  activeAdventure,
  stopName,
  onStartListening,
  onShowWonderPrompt,
  onSaveMoment,
  onContinueJourney,
  onViewTravelMap,
  onPlanFirstTrip,
  onSkip,
  otherAdventureCount = 0,
  onSwitchAdventure,
}: TravelHeroProps) {
  const config = HERO_CONFIG[state];
  
  const handleCTA = () => {
    switch (state) {
      case "listen":
        onStartListening?.();
        break;
      case "wonder":
        onShowWonderPrompt?.();
        break;
      case "reflect":
        onSaveMoment?.();
        break;
      case "upcoming":
        onContinueJourney?.();
        break;
      case "memories":
        onViewTravelMap?.();
        break;
      case "first":
        onPlanFirstTrip?.();
        break;
    }
  };

  const handleSecondary = () => {
    switch (state) {
      case "listen":
      case "wonder":
      case "reflect":
        onSkip?.();
        break;
      case "memories":
        onPlanFirstTrip?.();
        break;
      case "first":
        // "Try an adventure from home" - could link to At-Home adventures
        onPlanFirstTrip?.();
        break;
    }
  };

  // Get display name for the adventure
  const adventureName = activeAdventure?.trip?.destination || upcomingTrip?.destination;
  const displayStopName = stopName || activeAdventure?.nextStop?.name;

  // Compact design for active trips
  const isActiveTrip = state === "upcoming";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-3xl ${isActiveTrip ? 'p-4' : 'p-6'} bg-gradient-to-br ${config.gradient} shadow-lg`}
    >
      <div className={`text-center ${isActiveTrip ? 'space-y-2' : 'space-y-3'}`}>
        {/* Compact header for active trips with emoji + title inline */}
        {isActiveTrip ? (
          <>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">{config.emoji}</span>
              <h2 className="text-lg font-bold text-white leading-tight">
                {config.title}
              </h2>
            </div>
            {/* Adventure name below title */}
            {adventureName && (
              <p className="text-sm font-medium text-white/90">
                {adventureName}
              </p>
            )}
            {/* Helper text */}
            {config.helperText && (
              <p className="text-xs text-white/50">
                {config.helperText}
              </p>
            )}
          </>
        ) : state === 'first' ? (
          <>
            {/* Special layout for "first" state - warm, inviting design */}
            <div className="flex flex-col items-center gap-3 py-1">
              {/* Compass badge - single meaningful icon */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.2 }}
                className="w-14 h-14 rounded-full bg-white/60 dark:bg-white/20 shadow-sm flex items-center justify-center"
              >
                <span className="text-3xl">{config.emoji}</span>
              </motion.div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-snug max-w-sm mx-auto">
                  {config.title}
                </h2>
                
                <p className="text-sm text-slate-600 dark:text-white/80 leading-relaxed max-w-sm mx-auto">
                  {config.subtitle}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.2 }}
              className="text-4xl"
            >
              {config.emoji}
            </motion.div>
            
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">
                {config.title}
              </h2>
              
              {/* Show adventure name for journey-phase states */}
              {(state === "listen" || state === "wonder" || state === "reflect") && adventureName && (
                <p className="text-sm font-medium text-white/90 mt-1">
                  {adventureName}
                  {displayStopName && (
                    <span className="block text-xs text-white/70 mt-0.5">
                      {state === "listen" ? "Next stop: " : ""}{displayStopName}
                    </span>
                  )}
                </p>
              )}
            </div>
            
            <p className="text-sm text-white/80 leading-relaxed max-w-xs mx-auto">
              {config.subtitle}
            </p>

            {/* Helper text for journey phases */}
            {config.helperText && (
              <p className="text-xs text-white/60 max-w-xs mx-auto">
                {config.helperText}
              </p>
            )}
          </>
        )}
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`flex flex-col items-center ${state === 'first' ? 'gap-4' : 'gap-2'}`}
        >
          <Button
            onClick={handleCTA}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 h-11 rounded-xl shadow-lg"
            data-testid="button-hero-cta"
          >
            {state === "listen" && <Headphones className="w-4 h-4 mr-2" />}
            {state === "wonder" && <Eye className="w-4 h-4 mr-2" />}
            {state === "reflect" && <Camera className="w-4 h-4 mr-2" />}
            {config.ctaText}
          </Button>

          {/* Secondary action */}
          {config.secondaryText && (
            <Button
              variant="ghost"
              onClick={handleSecondary}
              className={`text-sm ${state === 'first' ? 'text-slate-600 dark:text-white bg-white/50 dark:bg-white/20 hover:bg-white/70 dark:hover:bg-white/30 border border-slate-200 dark:border-white/40 px-6 h-10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              data-testid="button-hero-secondary"
            >
              {config.secondaryText}
            </Button>
          )}
          
          {/* Helper text below buttons for first state */}
          {state === 'first' && config.helperText && (
            <p className="text-xs text-slate-500 dark:text-white/60 max-w-xs mx-auto pt-2">
              {config.helperText}
            </p>
          )}
        </motion.div>

        {/* Other adventures hint */}
        {otherAdventureCount > 0 && onSwitchAdventure && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={onSwitchAdventure}
            className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 mt-2 flex items-center justify-center gap-1"
            data-testid="button-switch-adventure"
          >
            {otherAdventureCount === 1 
              ? "Another adventure in progress" 
              : `${otherAdventureCount} other adventures in progress`}
            <ChevronRight className="w-3 h-3" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

interface StoryProgressStripProps {
  hasTrips: boolean;
  hasStars: boolean;
  hasJourneyPacks: boolean;
}

const PROGRESS_MESSAGES = [
  { condition: (p: StoryProgressStripProps) => !p.hasStars, icon: "⭐", text: "Save a moment to begin your memory stars" },
  { condition: (p: StoryProgressStripProps) => !p.hasJourneyPacks, icon: "🎧", text: "Journey Packs work best on the way" },
  { condition: (p: StoryProgressStripProps) => p.hasTrips, icon: "🗺", text: "Your travel map grows with every adventure" },
];

export function StoryProgressStrip({ hasTrips, hasStars, hasJourneyPacks }: StoryProgressStripProps) {
  const props = { hasTrips, hasStars, hasJourneyPacks };
  const message = PROGRESS_MESSAGES.find(m => m.condition(props)) || PROGRESS_MESSAGES[2];

  if (!hasTrips || hasStars) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="flex items-center justify-center gap-1.5 py-1 text-sm text-slate-500 dark:text-slate-400"
    >
      <span>{message.icon}</span>
      <span>{message.text}</span>
    </motion.div>
  );
}
