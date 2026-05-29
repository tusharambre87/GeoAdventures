import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  X, Volume2, Pause, Play, Lightbulb, Users, Gamepad2, 
  ChevronDown, ChevronRight, Star, Loader2, Lock, Check,
  Eye, Shuffle, Search, Hammer, Camera, Mic, MicOff, Image, MapPin, Trash2,
  Compass, UtensilsCrossed, Car, Map
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// SpeechRecognition type declarations for cross-browser support
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
import type { TravelStop, TravelTrip, JourneyPack, TravelMoment } from "@shared/schema";
import { getTravelAvatarForStopType, getStopTypeEmoji } from "@/lib/travelAvatars";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";
import { MomentCapture } from "./MomentCapture";
import { getRandomParentInsight, getCategoryBg, getCategoryColor, type ParentInsight } from "@/lib/parentInsights";
import { ArtifactSection } from "./ArtifactSection";
import { getJourneyPackOffline, getAudioOffline } from "@/lib/travelOfflineStorage";
import { GlobeLoader } from "./GlobeLoader";
import type { TravelKeepsake } from "@shared/schema";
import { Sparkles, Heart, ChevronRight as ChevronRightIcon } from "lucide-react";
import { GeoBuddyCharacter } from "./GeoBuddyCharacter";
import { StopCompletedPrompt, shouldShowStopCompletedPrompt } from "./GeoGamesFromAdventures";
import { MissionCard, ExplorerChallenge } from "./MissionCard";
import type { ExplorerChallengeMission } from "@shared/schema";
import { QuietPromiseBanner } from "./GeoAdventuresAnchoring";

// Keepsake/Artifact data for each stop - unique collectible items
const STOP_KEEPSAKES: Record<string, { name: string; description: string; emoji: string }[]> = {
  "Volcanoes National Park": [
    { name: "Lava Crystal", description: "A magical crystal formed from cooling lava deep inside the volcano!", emoji: "🔮" },
    { name: "Pele's Fire Stone", description: "A legendary stone blessed by Pele, the Hawaiian goddess of fire.", emoji: "🔥" },
  ],
  "Mauna Kea Summit": [
    { name: "Stargazer Lens", description: "A special lens used by ancient Hawaiian navigators to read the stars.", emoji: "🔭" },
  ],
  "Akaka Falls": [
    { name: "Waterfall Mist Bottle", description: "A tiny bottle filled with refreshing mist from the mighty Akaka Falls!", emoji: "💧" },
  ],
  "Punalu'u Black Sand Beach": [
    { name: "Honu Charm", description: "A charm shaped like a sea turtle (honu) who loves the black sand beach.", emoji: "🐢" },
    { name: "Black Sand Sample", description: "Real volcanic black sand from one of Hawaii's famous beaches!", emoji: "⬛" },
  ],
  "Kona Town": [
    { name: "Kona Coffee Bean", description: "A golden coffee bean from the famous Kona coffee plantations.", emoji: "☕" },
  ],
  "Waipio Valley": [
    { name: "Taro Root", description: "A sacred taro root from the Valley of the Kings.", emoji: "🥔" },
    { name: "Ancient Poi Bowl", description: "A traditional bowl used to make poi from taro.", emoji: "🥣" },
  ],
  "Kealakekua Bay": [
    { name: "Captain Cook's Compass", description: "A compass like the one Captain Cook used to explore Hawaii.", emoji: "🧭" },
    { name: "Dolphin Whistle", description: "A magical whistle that spinner dolphins can hear!", emoji: "🐬" },
  ],
  "Hilo Farmers Market": [
    { name: "Tropical Fruit Basket", description: "A colorful basket of exotic Hawaiian fruits!", emoji: "🍍" },
    { name: "Lei Flower", description: "A beautiful flower used in traditional Hawaiian leis.", emoji: "🌺" },
  ],
  "Rainbow Falls": [
    { name: "Rainbow Prism", description: "A magical prism that creates rainbows just like the waterfall!", emoji: "🌈" },
  ],
  "Hapuna Beach": [
    { name: "Golden Sand Shell", description: "A beautiful seashell from Hawaii's best white sand beach.", emoji: "🐚" },
    { name: "Ocean Wave Vial", description: "A tiny vial containing the essence of Pacific waves.", emoji: "🌊" },
  ],
  "Naniloa Grand Hilton": [
    { name: "Aloha Welcome Lei", description: "A beautiful lei representing Hawaiian hospitality.", emoji: "🌺" },
  ],
  "Eiffel Tower": [
    { name: "Iron Tower Charm", description: "A tiny replica of the famous Eiffel Tower!", emoji: "🗼" },
  ],
  "Louvre Museum": [
    { name: "Mona Lisa Postcard", description: "A special postcard from the world's most famous museum.", emoji: "🖼️" },
  ],
  "Notre-Dame Cathedral": [
    { name: "Cathedral Bell", description: "A miniature bell like the ones that ring in Notre-Dame.", emoji: "🔔" },
  ],
  // Sydney, Australia
  "Sydney Opera House": [
    { name: "Opera House Sail", description: "A miniature sail from the iconic Sydney Opera House!", emoji: "🎭" },
    { name: "Didgeridoo Charm", description: "A tiny didgeridoo, Australia's ancient musical instrument.", emoji: "🎵" },
  ],
  "Sydney Harbour Bridge": [
    { name: "Bridge Climber Badge", description: "A special badge for climbing the famous coat hanger bridge!", emoji: "🌉" },
  ],
  "Taronga Zoo": [
    { name: "Koala Eucalyptus Leaf", description: "A lucky eucalyptus leaf from the koalas at Taronga Zoo!", emoji: "🐨" },
    { name: "Kangaroo Joey Charm", description: "Australia's national animal - the bouncy kangaroo!", emoji: "🦘" },
  ],
  "Australian Museum": [
    { name: "Dinosaur Fossil Piece", description: "A piece of ancient dinosaur fossil from millions of years ago!", emoji: "🦕" },
    { name: "Indigenous Boomerang", description: "A miniature boomerang from Australia's First Nations peoples.", emoji: "🪃" },
  ],
  "Bondi Beach": [
    { name: "Bondi Lifeguard Whistle", description: "A whistle like the famous Bondi lifeguards use!", emoji: "🏖️" },
    { name: "Golden Beach Sand", description: "Golden sand from Australia's most famous beach.", emoji: "🐚" },
  ],
  "Royal Botanic Garden": [
    { name: "Rare Australian Flower", description: "A beautiful native Australian flower from the gardens.", emoji: "🌸" },
    { name: "Flying Fox Wing", description: "A lucky charm shaped like the garden's famous fruit bats!", emoji: "🦇" },
  ],
  "Darling Harbour": [
    { name: "Harbour Sailor Knot", description: "A special sailor's knot from the harbor!", emoji: "⚓" },
  ],
  "SEA LIFE Sydney Aquarium": [
    { name: "Shark Tooth", description: "A replica shark tooth from the Great Barrier Reef exhibit!", emoji: "🦈" },
    { name: "Platypus Charm", description: "Australia's amazing egg-laying mammal - the platypus!", emoji: "🦫" },
  ],
  "Blue Mountains Day Trip": [
    { name: "Three Sisters Stone", description: "A magical stone from the legendary Three Sisters rock formation!", emoji: "🏔️" },
    { name: "Eucalyptus Oil Vial", description: "Fragrant eucalyptus oil from the Blue Mountains!", emoji: "🌿" },
  ],
  "Sydney Tower Eye": [
    { name: "Sky View Binoculars", description: "Mini binoculars from Australia's tallest tower!", emoji: "🔭" },
  ],
  "Powerhouse Museum": [
    { name: "Steam Engine Cog", description: "A tiny cog from an old steam engine!", emoji: "⚙️" },
    { name: "Space Rocket Badge", description: "A badge celebrating Australia's space exploration!", emoji: "🚀" },
  ],
  "The Rocks": [
    { name: "Convict Brick", description: "A tiny brick from Sydney's oldest neighborhood!", emoji: "🧱" },
    { name: "Colonial Coin", description: "A replica coin from Australia's early settlement days.", emoji: "🪙" },
  ],
  "The Rocks Historic Area": [
    { name: "Convict Brick", description: "A tiny brick from Sydney's oldest neighborhood!", emoji: "🧱" },
  ],
  "Manly Beach & Ferry": [
    { name: "Ferry Captain's Wheel", description: "A mini wheel from the famous Manly ferry!", emoji: "🚢" },
    { name: "Fairy Penguin Feather", description: "A lucky feather from Manly's little penguins!", emoji: "🐧" },
  ],
  "Sydney Fish Market": [
    { name: "Lucky Fishing Net", description: "A piece of fishing net for good luck!", emoji: "🎣" },
  ],
  "Fish Market": [
    { name: "Lucky Fishing Net", description: "A piece of fishing net for good luck!", emoji: "🎣" },
  ],
};

interface StopKeepsakeSummaryProps {
  stop: TravelStop;
  stopNumber?: number;
  totalStops?: number;
  isHomeAdventure?: boolean;
  onContinue: () => void;
}

function StopKeepsakeSummary({ stop, stopNumber = 1, totalStops = 1, isHomeAdventure = false, onContinue }: StopKeepsakeSummaryProps) {
  const stopTypeEmoji = getStopTypeEmoji(stop.stopType || 'landmark');
  const isMultipleStops = (stopNumber || 1) > 1;
  
  // Get keepsakes for this stop, or use default based on stop name
  const keepsakes = STOP_KEEPSAKES[stop.name] || [
    { name: stop.name, description: "A special memory from this place.", emoji: stopTypeEmoji }
  ];
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-amber-50 via-orange-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 overflow-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        {/* GeoBuddy character at the top */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
          className="w-24 h-24 mx-auto"
        >
          <GeoBuddyCharacter state="wondering" size="lg" autoHide={false} />
        </motion.div>
        
        {/* Opening line - family experience */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-xl font-medium text-slate-700 dark:text-slate-300"
        >
          You explored this place together.
        </motion.p>
        
        {/* What the child did */}
        <div className="space-y-1">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-lg text-slate-600 dark:text-slate-400"
          >
            You listened. You noticed. You played.
          </motion.p>
        </div>
        
        {/* Keepsake reveal */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="text-2xl font-bold text-slate-800 dark:text-slate-100"
        >
          {keepsakes.length > 1 ? "You earned travel keepsakes!" : "You earned a travel keepsake!"}
        </motion.h2>

        {/* Keepsake cards */}
        <div className="space-y-3">
          {keepsakes.map((keepsake, index) => (
            <motion.div
              key={keepsake.name}
              initial={{ opacity: 0, scale: 0.95, x: index % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.15 }}
            >
              <Card className="bg-white/80 dark:bg-slate-800/80">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center text-3xl shadow-inner border-2 border-amber-300 dark:border-amber-600">
                      {keepsake.emoji}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">{keepsake.name}</h3>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {keepsake.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Permanence message - varies for home vs travel adventures */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 + keepsakes.length * 0.1 }}
          className={`text-sm italic ${isHomeAdventure ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400"}`}
        >
          {isHomeAdventure 
            ? "Travel here to save this keepsake in your collection!"
            : isMultipleStops 
              ? "Your child is building a travel story they'll remember."
              : "This moment is saved forever in your travel collection."
          }
        </motion.p>
        
        {/* At-Home upsell message */}
        {isHomeAdventure && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 + keepsakes.length * 0.1 }}
            className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 border border-teal-200 dark:border-teal-700"
          >
            <p className="text-sm text-teal-700 dark:text-teal-300">
              <span className="font-semibold">This is a preview!</span> When you visit {stop.name} in real life, your keepsakes will be saved forever in your travel collection.
            </p>
          </motion.div>
        )}
        
        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 + keepsakes.length * 0.1 }}
        >
          <Button 
            onClick={onContinue}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            data-testid="button-continue-adventure"
          >
            Continue the Adventure <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// GeoMoment Reflection - journaling prompts after stop completion
const REFLECTION_PROMPTS = [
  "What was your favorite thing about this place?",
  "Did anything surprise you at this place?",
  "What will you remember about this place?",
  "What made you smile at this stop?",
  "Would you want to visit this place again? Why?",
];

interface GeoMomentReflectionProps {
  stop: TravelStop;
  onSave: (response: string) => void;
  onSkip: () => void;
}

function GeoMomentReflection({ stop, onSave, onSkip }: GeoMomentReflectionProps) {
  const [response, setResponse] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  
  // Check if speech recognition is available (not fully reliable on iOS Safari)
  const isSpeechSupported = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  
  // Detect iOS Safari for specific messaging
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Pick a random prompt
  const [prompt] = useState(() => REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)]);
  
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError(isIOS ? 
        "Voice typing isn't available on this device. Please type your response instead." :
        "Voice typing isn't supported in this browser. Please type your response instead."
      );
      return;
    }
    
    setSpeechError(null);
    
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        const errorType = event.error || "unknown";
        if (errorType === "not-allowed") {
          setSpeechError("Microphone access was denied. Please allow microphone permissions and try again.");
        } else if (errorType === "no-speech") {
          setSpeechError("No speech detected. Please try again and speak clearly.");
        } else if (isIOS) {
          setSpeechError("Voice typing may not work fully on iOS. Please type your response instead.");
        }
      };
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0]?.transcript || "")
          .join(" ");
        setResponse(transcript);
      };
      
      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Speech recognition error:", error);
      setSpeechError(isIOS ? 
        "Voice typing isn't available on this device. Please type your response instead." :
        "Voice typing couldn't start. Please type your response instead."
      );
    }
  }, [isIOS]);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);
  
  const handleSave = () => {
    onSave(response);
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 overflow-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
          className="w-20 h-20 mx-auto"
        >
          <GeoBuddyCharacter state="wondering" size="lg" autoHide={false} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            GeoMoment Reflection
          </h2>
          <p className="text-sm text-muted-foreground">
            at {stop.name}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-6 shadow-lg"
        >
          <p className="text-lg font-medium text-purple-800 dark:text-purple-200 mb-4">
            {prompt}
          </p>
          
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Tell us what you think..."
            className="min-h-[120px] text-base mb-4"
            data-testid="input-reflection-response"
          />
          
          {isSpeechSupported && (
            <div className="flex items-center justify-center gap-3 mb-4">
              <Button
                type="button"
                variant={isListening ? "default" : "outline"}
                size="sm"
                onClick={isListening ? stopListening : startListening}
                className={`rounded-full ${isListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : "border-purple-300 hover:bg-purple-50 dark:border-purple-600 dark:hover:bg-purple-900"}`}
                data-testid="button-speech-to-text"
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4 mr-1.5" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-1.5" />
                    Speak to Type
                  </>
                )}
              </Button>
            </div>
          )}
          
          {isListening && (
            <p className="text-xs text-red-500 mb-3 animate-pulse">
              🎤 Listening... speak now!
            </p>
          )}
          
          {speechError && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 text-center">
              {speechError}
            </p>
          )}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <Button 
            onClick={handleSave}
            disabled={!response.trim()}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            data-testid="button-save-reflection"
          >
            <Heart className="w-4 h-4 mr-2" />
            Save My Reflection
          </Button>
          
          <Button 
            variant="ghost"
            onClick={onSkip}
            className="w-full text-muted-foreground"
            data-testid="button-skip-reflection"
          >
            Skip for now
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

interface LocationFacts {
  facts: string[];
  transcript: string;
}

interface BonusChapter {
  type: "legend" | "howItsMade" | "history" | "culture" | "geology" | "wildlife";
  title: string;
  content: string;
  icon: string;
}

interface LocationStory {
  title: string;
  story: string;
  chapters: { title: string; content: string }[];
  bonusChapters?: BonusChapter[];
  duration: string;
}

interface ParentTip {
  tip: string;
  category: string;
}

interface JourneyPackPlayerProps {
  stop: TravelStop;
  journeyPack: JourneyPack | null;
  trip?: TravelTrip;
  stopMoments?: TravelMoment[];
  explorerId?: string;
  stopNumber?: number;
  totalStops?: number;
  mode?: "full" | "kidLite";
  onClose: () => void;
  onComplete?: () => void;
  onSaveMoment?: (data: { stopId?: string; photoUrl?: string; photoUrls?: string[]; kidPromptResponse?: string; parentPromptResponse?: string }) => Promise<void>;
  onDeleteMoment?: (momentId: string) => Promise<void>;
  onCompleteMission?: (stopId: string, answer: string) => Promise<{
    success: boolean;
    isCorrect: boolean;
    xpAwarded: number;
    keepsakeUnlocked: boolean;
    unlockedKeepsake?: { name: string; emoji: string; description: string } | null;
    correctAnswer?: string;
  }>;
}

function getMomentPhotoUrl(moment: TravelMoment): string | null {
  if (moment.photoUrl) return moment.photoUrl;
  const urls = moment.photoUrls;
  if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string') {
    return urls[0];
  }
  if (typeof urls === 'string') {
    try {
      const parsed = JSON.parse(urls);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {}
  }
  return null;
}

type Section = "listen" | "wonder" | "parent" | "games" | "explore";
type GameType = "guess" | "thisorthat" | "spotit" | "buildit";

interface NearbyAttraction {
  name: string;
  type: string;
  distance: string;
  description?: string;
  imageUrl?: string;
}

interface Restaurant {
  name: string;
  cuisine: string;
  distance: string;
  priceRange?: string;
}

interface KidFriendlyPlace {
  name: string;
  type: string;
  distance: string;
  description?: string;
  ageRange?: string;
}

interface ExploreData {
  aboutArea: string;
  nearbyAttractions: NearbyAttraction[];
  restaurants: Restaurant[];
  kidFriendlyPlaces?: KidFriendlyPlace[];
  gettingAround?: string;
  tips?: string[];
}

interface GuessRound { question: string; options: { emoji: string; label: string }[] }
interface ThisOrThatRound { question: string; optionA: { emoji: string; label: string }; optionB: { emoji: string; label: string }; funFact: string }
interface SpotItRound { prompt: string }
interface BuildItRound { prompt: string; options: { emoji: string; label: string }[] }

interface GameContentRounds {
  guess: GuessRound[];
  thisorthat: ThisOrThatRound[];
  spotit: SpotItRound[];
  buildit: BuildItRound[];
  connectionFact?: string;
}

const MULTI_ROUND_GAMES: Record<string, GameContentRounds> = {
  "Volcanoes National Park": {
    guess: [
      { question: "Do you think the rocks here will be smooth or sharp?", options: [{ emoji: "🪨", label: "Smooth" }, { emoji: "💎", label: "Sharp" }] },
      { question: "Will it smell like rotten eggs here?", options: [{ emoji: "🥚", label: "Yes, stinky!" }, { emoji: "🌸", label: "No, fresh air" }] },
      { question: "Can plants grow on lava?", options: [{ emoji: "🌱", label: "Yes!" }, { emoji: "❌", label: "No way" }] }
    ],
    thisorthat: [
      { question: "Which is hotter?", optionA: { emoji: "🌋", label: "Lava" }, optionB: { emoji: "🔥", label: "Fire" }, funFact: "Lava can reach 2,200°F — much hotter than most fires!" },
      { question: "Which creates new land?", optionA: { emoji: "🌋", label: "Volcanoes" }, optionB: { emoji: "🌊", label: "Oceans" }, funFact: "Volcanoes create new land when lava cools into rock!" },
      { question: "Which is louder?", optionA: { emoji: "🌋", label: "Eruption" }, optionB: { emoji: "⛈️", label: "Thunder" }, funFact: "Some eruptions can be heard hundreds of miles away!" }
    ],
    spotit: [
      { prompt: "When you arrive, see if you can spot something black." },
      { prompt: "Can you find any steam coming from the ground?" },
      { prompt: "Look for plants growing on old lava rock!" }
    ],
    buildit: [
      { prompt: "If you were building a volcano...", options: [{ emoji: "🪨", label: "Stone blocks" }, { emoji: "🔥", label: "Fire pit" }, { emoji: "💨", label: "Steam vents" }, { emoji: "🌿", label: "Plants around it" }] },
      { prompt: "Design a volcano viewing station...", options: [{ emoji: "🔭", label: "Viewing deck" }, { emoji: "🧯", label: "Safety gear" }, { emoji: "☕", label: "Snack bar" }, { emoji: "🎓", label: "Learning center" }] },
      { prompt: "Build a volcano museum...", options: [{ emoji: "🪨", label: "Rock samples" }, { emoji: "📸", label: "Photo gallery" }, { emoji: "🎬", label: "Movie theater" }, { emoji: "🎮", label: "Eruption simulator" }] }
    ],
    connectionFact: "Volcanoes create islands like Hawaii"
  },
  "Mauna Kea Summit": {
    guess: [
      { question: "What color do you think the sky looks from the summit?", options: [{ emoji: "🌌", label: "Purple/Dark" }, { emoji: "☁️", label: "Bright Blue" }] },
      { question: "Will it be warm or cold at the top?", options: [{ emoji: "🥶", label: "Very cold!" }, { emoji: "🌴", label: "Warm like beach" }] },
      { question: "Can you see more stars here than at home?", options: [{ emoji: "⭐", label: "Way more!" }, { emoji: "🌟", label: "About the same" }] }
    ],
    thisorthat: [
      { question: "Which is taller?", optionA: { emoji: "🏔️", label: "Mauna Kea" }, optionB: { emoji: "🗻", label: "Mount Everest" }, funFact: "From base to peak, Mauna Kea is actually taller than Everest!" },
      { question: "Which sees more clearly?", optionA: { emoji: "🔭", label: "Big telescope" }, optionB: { emoji: "👁️", label: "Human eye" }, funFact: "Telescopes on Mauna Kea can see galaxies billions of light-years away!" },
      { question: "Which is older?", optionA: { emoji: "🏔️", label: "Mauna Kea" }, optionB: { emoji: "🌍", label: "Earth" }, funFact: "Mauna Kea is about 1 million years old, but Earth is 4.5 billion!" }
    ],
    spotit: [
      { prompt: "Can you spot a telescope when you get there?" },
      { prompt: "Look for clouds below you!" },
      { prompt: "Try to spot the Milky Way if it's night!" }
    ],
    buildit: [
      { prompt: "If you were building an observatory...", options: [{ emoji: "🔭", label: "Giant telescope" }, { emoji: "🏠", label: "Cozy dome" }, { emoji: "⭐", label: "Star map room" }, { emoji: "🛸", label: "Landing pad" }] },
      { prompt: "Design a mountain base camp...", options: [{ emoji: "🏕️", label: "Warm tent" }, { emoji: "☕", label: "Hot cocoa station" }, { emoji: "🧥", label: "Coat closet" }, { emoji: "📷", label: "Photo spot" }] },
      { prompt: "Create a star-watching spot...", options: [{ emoji: "🛋️", label: "Reclining chairs" }, { emoji: "🔭", label: "Binoculars" }, { emoji: "📱", label: "Star-finder app" }, { emoji: "🍿", label: "Snacks" }] }
    ],
    connectionFact: "Mountain observatories help us explore space"
  },
  default: {
    guess: [
      { question: "What do you think you'll see first at this place?", options: [{ emoji: "🌿", label: "Nature" }, { emoji: "🏛️", label: "Buildings" }] },
      { question: "Will you hear birds singing here?", options: [{ emoji: "🐦", label: "Yes!" }, { emoji: "🔇", label: "Probably not" }] },
      { question: "Is this place bigger than your school?", options: [{ emoji: "📏", label: "Much bigger!" }, { emoji: "🏫", label: "About the same" }] }
    ],
    thisorthat: [
      { question: "Would you rather explore...", optionA: { emoji: "🚶", label: "On foot" }, optionB: { emoji: "🚗", label: "By car" }, funFact: "Walking lets you discover hidden treasures cars might miss!" },
      { question: "Would you rather see...", optionA: { emoji: "🌅", label: "Sunrise" }, optionB: { emoji: "🌇", label: "Sunset" }, funFact: "Sunrises and sunsets look different because of how light travels through air!" },
      { question: "Would you rather bring...", optionA: { emoji: "📷", label: "Camera" }, optionB: { emoji: "🎨", label: "Sketchbook" }, funFact: "Both are great ways to remember special moments!" }
    ],
    spotit: [
      { prompt: "Try to find something you've never seen before!" },
      { prompt: "Can you spot an animal or insect?" },
      { prompt: "Look for something in your favorite color!" }
    ],
    buildit: [
      { prompt: "If you were the architect here...", options: [{ emoji: "🌳", label: "More trees" }, { emoji: "🎨", label: "Colorful art" }, { emoji: "🪑", label: "Cozy seats" }, { emoji: "💡", label: "Fun lights" }] },
      { prompt: "Design the perfect rest stop...", options: [{ emoji: "🚽", label: "Clean bathrooms" }, { emoji: "🍦", label: "Ice cream" }, { emoji: "🎮", label: "Games" }, { emoji: "🛝", label: "Playground" }] },
      { prompt: "Build a learning area...", options: [{ emoji: "📚", label: "Book nook" }, { emoji: "🖥️", label: "Touch screens" }, { emoji: "🎭", label: "Dress up" }, { emoji: "🔬", label: "Science station" }] }
    ],
    connectionFact: "Every place has unique geography to explore"
  }
};

function getGameContent(stopName: string): GameContentRounds {
  return MULTI_ROUND_GAMES[stopName] || MULTI_ROUND_GAMES.default;
}

function generateMathQuestion(): { question: string; answer: number } {
  const operations = [
    () => {
      const a = Math.floor(Math.random() * 20) + 10;
      const b = Math.floor(Math.random() * 15) + 5;
      return { question: `${a} + ${b}`, answer: a + b };
    },
    () => {
      const a = Math.floor(Math.random() * 30) + 20;
      const b = Math.floor(Math.random() * 15) + 5;
      return { question: `${a} - ${b}`, answer: a - b };
    },
    () => {
      const a = Math.floor(Math.random() * 8) + 4;
      const b = Math.floor(Math.random() * 6) + 3;
      return { question: `${a} × ${b}`, answer: a * b };
    },
  ];
  return operations[Math.floor(Math.random() * operations.length)]();
}

interface SpotItReminder {
  stopName: string;
  stopId: string;
  mission: string;
}

interface PendingReflection {
  stopName: string;
  stopId: string;
  stopType: string;
  stopEmoji?: string;
}

export function JourneyPackPlayer({ stop, journeyPack, trip, stopMoments = [], explorerId, stopNumber, totalStops, mode = "full", onClose, onComplete, onSaveMoment, onDeleteMoment, onCompleteMission }: JourneyPackPlayerProps) {
  const storageKey = `journeypack-progress-${stop.id}`;
  const spotItReminderKey = trip?.id ? `spotit-reminder-${trip.id}` : null;
  const pendingReflectionKey = trip?.id ? `pending-reflection-${trip.id}` : null;
  
  // Adventure mode detection
  const isHomeAdventure = trip?.adventureContext === 'home';
  const allowMediaCapture = trip?.allowMediaCapture !== false && !isHomeAdventure;
  const contentDepth = trip?.contentDepth || (isHomeAdventure ? 'preview' : 'full');
  
  const [expandedSection, setExpandedSection] = useState<Section | null>("listen");
  const [momentToDelete, setMomentToDelete] = useState<TravelMoment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showKeepsakeSummary, setShowKeepsakeSummary] = useState(false);
  const [showGeoMomentReflection, setShowGeoMomentReflection] = useState(false);
  const sectionCompletedDuringSessionRef = useRef(false);
  const [completedSections, setCompletedSections] = useState<Section[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [serverProgressLoaded, setServerProgressLoaded] = useState(false);
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [gameStep, setGameStep] = useState<"question" | "roundComplete" | "allComplete">("question");
  const [currentRound, setCurrentRound] = useState(0);
  const TOTAL_ROUNDS = activeGame === "spotit" ? 1 : 3;
  const [isParentLocked, setIsParentLocked] = useState(true);
  const [parentUnlockAnswer, setParentUnlockAnswer] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioPaused, setAudioPaused] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [narratorVoice, setNarratorVoice] = useState<'eva' | 'avi'>(() => {
    try {
      return (localStorage.getItem('geoquest_narrator_voice') as 'eva' | 'avi') || 'eva';
    } catch {
      return 'eva';
    }
  });
  
  // Listen for storage events to sync voice changes from Account Settings
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'geoquest_narrator_voice' && e.newValue) {
        if (e.newValue === 'eva' || e.newValue === 'avi') {
          setNarratorVoice(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const [mathQuestion] = useState(() => generateMathQuestion());
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const serverAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [serverAudioUrl, setServerAudioUrl] = useState<string | null>(null);
  // Track if at least 1 chapter was played IN THIS SESSION (not from saved progress)
  // This is a session-level flag that resets when stop changes
  const [hasPlayedChapter, setHasPlayedChapter] = useState(false);
  
  // Reset state when stop changes - reload completedSections from localStorage
  // and reset hasPlayedChapter to false
  useEffect(() => {
    setHasPlayedChapter(false);
    setServerProgressLoaded(false); // Force server reload for new stop
    
    // Reload completedSections from localStorage for the new stop
    try {
      const saved = localStorage.getItem(storageKey);
      setCompletedSections(saved ? JSON.parse(saved) : []);
    } catch {
      setCompletedSections([]);
    }
  }, [stop.id, storageKey]);
  
  const [locationFacts, setLocationFacts] = useState<LocationFacts | null>(null);
  const [locationStory, setLocationStory] = useState<LocationStory | null>(null);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [parentTip, setParentTip] = useState<ParentTip | null>(null);
  const [isLoadingFacts, setIsLoadingFacts] = useState(false);
  const [isLoadingTip, setIsLoadingTip] = useState(false);
  const [parentInsight] = useState<ParentInsight>(() => getRandomParentInsight());
  
  const [wonderResponse, setWonderResponse] = useState("");
  const [showMomentCapture, setShowMomentCapture] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showStreakPrompt, setShowStreakPrompt] = useState(false);
  const [spotItReminder, setSpotItReminder] = useState<SpotItReminder | null>(null);
  const [showSpotItReminder, setShowSpotItReminder] = useState(false);
  const [spotItFeedback, setSpotItFeedback] = useState<"spotted" | "missed" | null>(null);
  const [pendingReflection, setPendingReflection] = useState<PendingReflection | null>(null);
  const [showPendingReflection, setShowPendingReflection] = useState(false);
  const [spotItReflection, setSpotItReflection] = useState("");
  const [isSpotItListening, setIsSpotItListening] = useState(false);
  const spotItRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [dynamicGameContent, setDynamicGameContent] = useState<GameContentRounds | null>(null);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [exploreData, setExploreData] = useState<ExploreData | null>(null);
  const [isLoadingExplore, setIsLoadingExplore] = useState(false);
  const [showQuietBanner, setShowQuietBanner] = useState(() => {
    try {
      return !localStorage.getItem('explore_quiet_shown');
    } catch {
      return false;
    }
  });
  const [expandedBonusChapter, setExpandedBonusChapter] = useState<number | null>(null);
  const [playingBonusChapter, setPlayingBonusChapter] = useState<number | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Load available voices and select the best one for kids' stories
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        
        // Priority order for natural-sounding voices (best first)
        // These are known to be high-quality neural/premium voices
        const preferredVoices = [
          // iOS/Safari premium voices
          'Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona',
          // macOS enhanced voices
          'Samantha (Enhanced)', 'Alex', 'Allison',
          // Google voices (Chrome)
          'Google UK English Female', 'Google US English',
          // Microsoft neural voices (Edge)
          'Microsoft Aria Online', 'Microsoft Jenny Online',
          'Microsoft Zira', 'Microsoft Hazel',
          // Android voices
          'English United States', 'en-US-language',
        ];
        
        // Find the best available voice
        let bestVoice: SpeechSynthesisVoice | null = null;
        
        for (const preferred of preferredVoices) {
          const match = voices.find(v => 
            v.name.toLowerCase().includes(preferred.toLowerCase()) ||
            preferred.toLowerCase().includes(v.name.toLowerCase())
          );
          if (match) {
            bestVoice = match;
            break;
          }
        }
        
        // Fallback: prefer female English voices (generally warmer for kids)
        if (!bestVoice) {
          bestVoice = voices.find(v => 
            v.lang.startsWith('en') && 
            (v.name.toLowerCase().includes('female') || 
             v.name.toLowerCase().includes('samantha') ||
             v.name.toLowerCase().includes('karen'))
          ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        }
        
        setSelectedVoice(bestVoice);
      }
    };
    
    // Voices may load asynchronously
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  
  useEffect(() => {
    const fetchGameContent = async () => {
      setIsLoadingGames(true);
      try {
        const response = await fetch(`/api/travel/stops/${stop.id}/games`, { credentials: 'include' });
        if (response.ok) {
          const content = await response.json();
          setDynamicGameContent(content);
        }
      } catch (error) {
        console.log('Using fallback game content');
      } finally {
        setIsLoadingGames(false);
      }
    };
    fetchGameContent();
  }, [stop.id]);

  // Fetch explore data for the stop
  useEffect(() => {
    const fetchExploreData = async () => {
      // First check if journey pack has cached explore data
      if (journeyPack?.exploreData) {
        setExploreData(journeyPack.exploreData as ExploreData);
        return;
      }
      
      setIsLoadingExplore(true);
      try {
        const response = await fetch(`/api/travel/stops/${stop.id}/explore`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setExploreData(data);
        }
      } catch (error) {
        console.log('Could not load explore data');
      } finally {
        setIsLoadingExplore(false);
      }
    };
    fetchExploreData();
  }, [stop.id, journeyPack?.exploreData]);

  // Check for pending reflection from previous stop (shows FIRST before Spot It reminder)
  useEffect(() => {
    if (!pendingReflectionKey) return;
    try {
      const saved = localStorage.getItem(pendingReflectionKey);
      const shownKey = `pending-reflection-shown-${stop.id}`;
      const alreadyShown = localStorage.getItem(shownKey);
      if (saved && !alreadyShown) {
        const reflection: PendingReflection = JSON.parse(saved);
        // Show reflection if it's from a DIFFERENT stop ID (user moved to next stop)
        // Use stopId comparison instead of name to handle duplicate stop names
        if (reflection.stopId !== stop.id && reflection.stopId) {
          setPendingReflection(reflection);
          setShowPendingReflection(true);
          localStorage.setItem(shownKey, "true");
        }
      }
    } catch {
    }
  }, [pendingReflectionKey, stop.id]);

  // Check for Spot It reminder from previous stop (shows AFTER pending reflection)
  useEffect(() => {
    if (!spotItReminderKey) return;
    // Don't show Spot It reminder if pending reflection is still showing
    if (showPendingReflection) return;
    try {
      const saved = localStorage.getItem(spotItReminderKey);
      const shownKey = `spotit-reminder-shown-${stop.id}`;
      const alreadyShown = localStorage.getItem(shownKey);
      if (saved && !alreadyShown) {
        const reminder: SpotItReminder = JSON.parse(saved);
        // Show the reminder if it's from a different stop (user moved to next stop)
        if (reminder.stopName !== stop.name && reminder.stopId && reminder.mission) {
          setSpotItReminder(reminder);
          setShowSpotItReminder(true);
          localStorage.setItem(shownKey, "true");
        }
      }
    } catch {
    }
  }, [spotItReminderKey, stop.name, stop.id, showPendingReflection]);

  // Load progress from server on mount (takes priority over localStorage)
  useEffect(() => {
    if (!explorerId || !trip?.id || serverProgressLoaded) return;
    
    const loadServerProgress = async () => {
      try {
        const res = await fetch(`/api/travel/stops/${stop.id}/progress/${explorerId}`, { 
          credentials: 'include' 
        });
        if (res.ok) {
          const progress = await res.json();
          if (progress && progress.completedSections) {
            // Server data takes priority - update localStorage and state
            const serverSections = progress.completedSections as Section[];
            if (serverSections.length > 0) {
              localStorage.setItem(storageKey, JSON.stringify(serverSections));
              setCompletedSections(serverSections);
              
              // If all sections are already complete from server, ensure flag is false
              // to prevent auto-trigger on reopen
              const requiredSections: Section[] = ["listen", "wonder", "parent", "games"];
              if (requiredSections.every(s => serverSections.includes(s))) {
                sectionCompletedDuringSessionRef.current = false;
              }
            }
          }
        }
      } catch (err) {
        console.log('Could not load progress from server, using localStorage');
      } finally {
        setServerProgressLoaded(true);
      }
    };
    
    loadServerProgress();
  }, [stop.id, explorerId, trip?.id, storageKey, serverProgressLoaded]);
  
  // Save to localStorage AND sync to server when completedSections changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(completedSections));
    } catch {
    }
    
    // Sync to server if we have explorerId and trip
    if (explorerId && trip?.id && completedSections.length > 0 && serverProgressLoaded) {
      const syncToServer = async () => {
        try {
          const res = await fetch(`/api/travel/stops/${stop.id}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              tripId: trip.id,
              explorerId,
              completedSections,
            }),
          });
          if (res.ok) {
            console.log(`✅ Journey Pack progress synced:`, { stopId: stop.id, sections: completedSections });
          }
        } catch (err) {
          console.log('Could not sync progress to server');
        }
      };
      syncToServer();
    }
  }, [completedSections, storageKey, explorerId, trip?.id, stop.id, serverProgressLoaded]);

  // Mark Listen as complete ONLY when at least 1 chapter has been played (not just when section is opened)
  useEffect(() => {
    if (hasPlayedChapter && !completedSections.includes("listen")) {
      sectionCompletedDuringSessionRef.current = true;
      setCompletedSections(prev => prev.includes("listen") ? prev : [...prev, "listen"]);
    }
  }, [hasPlayedChapter, completedSections]);

  // Keepsake summary is now only shown when user clicks the "Done" button
  // Removed auto-trigger to give users control over when they see the completion screen

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }
      if (serverAudioRef.current) {
        serverAudioRef.current.pause();
        serverAudioRef.current = null;
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Safari.');
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setWonderResponse(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const startSpotItListening = useCallback(() => {
    if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Safari.');
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsSpotItListening(true);
    recognition.onend = () => setIsSpotItListening(false);
    recognition.onerror = () => setIsSpotItListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setSpotItReflection(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    spotItRecognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopSpotItListening = useCallback(() => {
    if (spotItRecognitionRef.current) {
      spotItRecognitionRef.current.stop();
    }
    setIsSpotItListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (spotItRecognitionRef.current) {
        spotItRecognitionRef.current.stop();
      }
    };
  }, []);
  
  const avatar = getTravelAvatarForStopType(stop.stopType || "other");
  const stopEmoji = getStopTypeEmoji(stop.stopType || "other");
  const gameContent = dynamicGameContent || getGameContent(stop.name);

  useEffect(() => {
    if (stop.id && !locationStory && !isLoadingFacts) {
      setIsLoadingFacts(true);
      
      const loadStory = async () => {
        try {
          // Try to load from offline cache first
          if (!navigator.onLine) {
            const cached = await getJourneyPackOffline(stop.id);
            if (cached?.storyContent) {
              setLocationStory({
                title: (cached as any).storyTitle || `Discover ${stop.name}`,
                story: cached.storyContent,
                chapters: (cached as any).storyChapters || [],
                bonusChapters: (cached as any).bonusChapters || [],
                duration: (cached as any).storyDuration || "~7 minutes"
              });
              // Also set legacy facts for backwards compatibility
              if (cached.audioFactText) {
                const facts = cached.audioFactText.split('.').filter((s: string) => s.trim()).slice(0, 4).map((s: string) => s.trim() + '.');
                setLocationFacts({ facts, transcript: cached.audioFactText });
              }
              return;
            }
            // Fallback to cached journey pack from props
            if (journeyPack?.storyContent) {
              setLocationStory({
                title: journeyPack.storyTitle || `Discover ${stop.name}`,
                story: journeyPack.storyContent,
                chapters: (journeyPack.storyChapters as { title: string; content: string }[]) || [],
                bonusChapters: (journeyPack as any).bonusChapters || [],
                duration: journeyPack.storyDuration || "~7 minutes"
              });
              return;
            }
            // Legacy fallback to audioFactText
            if (cached?.audioFactText || journeyPack?.audioFactText) {
              const text = cached?.audioFactText || journeyPack?.audioFactText || "";
              const facts = text.split('.').filter((s: string) => s.trim()).slice(0, 4).map((s: string) => s.trim() + '.');
              setLocationFacts({ facts, transcript: text });
              setLocationStory({
                title: `Discover ${stop.name}`,
                story: text,
                chapters: [],
                duration: "~1 minute"
              });
              return;
            }
          }
          
          // Generate new podcast-style story
          const res = await apiRequest("POST", `/api/travel/stops/${stop.id}/generate-story`);
          const data = await res.json();
          setLocationStory(data);
          // Also create legacy facts format for backwards compatibility
          if (data.story) {
            const firstSentences = data.story.split('.').filter((s: string) => s.trim()).slice(0, 4).map((s: string) => s.trim() + '.');
            setLocationFacts({ facts: firstSentences, transcript: data.story });
          }
        } catch (err) {
          // Fallback to cached data on error
          try {
            const cached = await getJourneyPackOffline(stop.id);
            if (cached?.storyContent) {
              setLocationStory({
                title: (cached as any).storyTitle || `Discover ${stop.name}`,
                story: cached.storyContent,
                chapters: (cached as any).storyChapters || [],
                bonusChapters: (cached as any).bonusChapters || [],
                duration: (cached as any).storyDuration || "~7 minutes"
              });
            } else if (cached?.audioFactText || journeyPack?.audioFactText) {
              const text = cached?.audioFactText || journeyPack?.audioFactText || "";
              const facts = text.split('.').filter((s: string) => s.trim()).slice(0, 4).map((s: string) => s.trim() + '.');
              setLocationFacts({ facts, transcript: text });
              setLocationStory({
                title: `Discover ${stop.name}`,
                story: text,
                chapters: [],
                duration: "~1 minute"
              });
            }
          } catch {
            // Ignore errors from fallback
          }
        } finally {
          setIsLoadingFacts(false);
        }
      };
      
      loadStory();
    }
  }, [stop.id, journeyPack]);

  // Setup Media Session API for lock screen, CarPlay, and Bluetooth controls
  const setupMediaSession = useCallback((chapterTitle: string, stopName: string) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: chapterTitle || 'Journey Pack Story',
        artist: 'GeoQuest GeoAdventures',
        album: stopName,
      });
      
      navigator.mediaSession.setActionHandler('play', () => {
        if (audioPaused) {
          window.speechSynthesis.resume();
          setAudioPaused(false);
          setAudioPlaying(true);
          navigator.mediaSession.playbackState = 'playing';
        }
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioPlaying && !audioPaused) {
          window.speechSynthesis.pause();
          setAudioPlaying(false);
          setAudioPaused(true);
          navigator.mediaSession.playbackState = 'paused';
        }
      });
      
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (currentChapter > 0) {
          window.speechSynthesis.cancel();
          setCurrentChapter(prev => prev - 1);
          setAudioPlaying(false);
          setAudioPaused(false);
        }
      });
      
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (locationStory?.chapters?.length && currentChapter < locationStory.chapters.length - 1) {
          window.speechSynthesis.cancel();
          setCurrentChapter(prev => prev + 1);
          setAudioPlaying(false);
          setAudioPaused(false);
        }
      });
      
      navigator.mediaSession.playbackState = 'playing';
    }
  }, [audioPlaying, audioPaused, currentChapter, locationStory?.chapters?.length]);

  // Create silent audio element for background playback support
  useEffect(() => {
    // Create a silent audio element to keep audio session alive for background playback
    if (!silentAudioRef.current) {
      const audio = new Audio();
      // Tiny silent MP3 data URI - longer duration for better background persistence
      audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYAAAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYAAAAAAAAAAAAAAAAA';
      audio.loop = true;
      audio.volume = 0.01; // Nearly silent
      // Enable background playback attributes
      audio.setAttribute('playsinline', 'true');
      (audio as any).webkitPlaysinline = true;
      silentAudioRef.current = audio;
    }
    
    // Add visibility change handler to try resuming speech when app comes back
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && speechSynthRef.current) {
        // Try to resume speech synthesis when app becomes visible again
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const playWithBrowserTTS = useCallback((textToPlay: string) => {
    const cleanText = textToPlay
      .replace(/\[pause\]/gi, "...")
      .replace(/\[excited voice\]/gi, "")
      .replace(/\[whisper\]/gi, "")
      .replace(/\[warm voice\]/gi, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, "");
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    const chapterTitle = locationStory?.chapters?.[currentChapter]?.title || locationStory?.title || 'Story';
    setupMediaSession(chapterTitle, stop.name);
    
    utterance.onend = () => {
      setAudioPlaying(false);
      setAudioPaused(false);
      
      if (autoplayEnabled && locationStory?.chapters?.length && currentChapter < locationStory.chapters.length - 1) {
        setCurrentChapter(prev => prev + 1);
        setTimeout(() => {
          const nextChapterIndex = currentChapter + 1;
          const nextText = locationStory.chapters[nextChapterIndex]?.content;
          if (nextText) {
            playWithBrowserTTS(nextText);
          }
        }, 3000);
      } else {
        if (silentAudioRef.current) {
          silentAudioRef.current.pause();
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'none';
        }
      }
    };
    
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setAudioPlaying(true);
  }, [locationStory, currentChapter, autoplayEnabled, setupMediaSession, stop.name, selectedVoice]);

  const playAudio = useCallback(async () => {
    // Handle pause/resume for server audio
    if (serverAudioRef.current && !serverAudioRef.current.paused) {
      serverAudioRef.current.pause();
      setAudioPlaying(false);
      setAudioPaused(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      return;
    }
    
    if (serverAudioRef.current && audioPaused && serverAudioUrl) {
      serverAudioRef.current.play();
      setAudioPaused(false);
      setAudioPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      return;
    }
    
    // Handle pause/resume for browser TTS
    if (audioPaused) {
      window.speechSynthesis.resume();
      setAudioPaused(false);
      setAudioPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      return;
    }
    
    // Handle stop (pause the current playback)
    if (audioPlaying) {
      if (serverAudioRef.current) {
        serverAudioRef.current.pause();
      }
      window.speechSynthesis.pause();
      setAudioPlaying(false);
      setAudioPaused(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      return;
    }
    
    // Play current chapter or full story
    const textToPlay = locationStory?.chapters?.length && locationStory.chapters[currentChapter]
      ? locationStory.chapters[currentChapter].content
      : locationStory?.story || locationFacts?.transcript;
    
    if (!textToPlay) return;
    
    // Mark that a chapter has been played (for completion tracking)
    setHasPlayedChapter(true);
    
    // Start silent audio for background playback support
    if (silentAudioRef.current) {
      silentAudioRef.current.play().catch(() => {});
    }
    
    const chapterTitle = locationStory?.chapters?.[currentChapter]?.title || locationStory?.title || 'Story';
    setupMediaSession(chapterTitle, stop.name);
    
    // Try offline cache first (pre-downloaded audio), then fall back to API
    try {
      const cachedBlob = await getAudioOffline(stop.id);
      if (cachedBlob) {
        setIsLoadingAudio(true);
        const audioUrl = URL.createObjectURL(cachedBlob);
        if (serverAudioUrl) URL.revokeObjectURL(serverAudioUrl);
        setServerAudioUrl(audioUrl);
        const audio = new Audio(audioUrl);
        serverAudioRef.current = audio;
        audio.onended = () => { setAudioPlaying(false); setAudioPaused(false); };
        audio.onerror = () => { setAudioPlaying(false); setIsLoadingAudio(false); };
        audio.play().then(() => { setAudioPlaying(true); setIsLoadingAudio(false); }).catch(() => setIsLoadingAudio(false));
        return;
      }
    } catch {}

    // Try to use server-side Google Cloud TTS first (only if online)
    if (navigator.onLine) {
      try {
        setIsLoadingAudio(true);
        console.log("🎙️ Fetching audio from Google Cloud TTS...");
        
        const response = await fetch(`/api/travel/stops/${stop.id}/generate-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text: textToPlay, voice: narratorVoice })
        });
        
        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Clean up previous URL
          if (serverAudioUrl) {
            URL.revokeObjectURL(serverAudioUrl);
          }
          
          setServerAudioUrl(audioUrl);
          
          const audio = new Audio(audioUrl);
          serverAudioRef.current = audio;
          
          audio.onended = () => {
            setAudioPlaying(false);
            setAudioPaused(false);
            
            // Auto-advance to next chapter if autoplay is enabled
            if (autoplayEnabled && locationStory?.chapters?.length && currentChapter < locationStory.chapters.length - 1) {
              const nextChapterIndex = currentChapter + 1;
              setCurrentChapter(nextChapterIndex);
              
              // Play next chapter after a short pause
              setTimeout(async () => {
                const nextText = locationStory.chapters[nextChapterIndex]?.content;
                if (nextText && navigator.onLine) {
                  try {
                    setIsLoadingAudio(true);
                    const nextResponse = await fetch(`/api/travel/stops/${stop.id}/generate-audio`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ text: nextText, voice: narratorVoice })
                    });
                    
                    if (nextResponse.ok) {
                      const nextBlob = await nextResponse.blob();
                      const nextUrl = URL.createObjectURL(nextBlob);
                      const nextAudio = new Audio(nextUrl);
                      serverAudioRef.current = nextAudio;
                      nextAudio.onended = audio.onended;
                      await nextAudio.play();
                      setAudioPlaying(true);
                    }
                  } catch (err) {
                    console.warn("Failed to play next chapter:", err);
                  } finally {
                    setIsLoadingAudio(false);
                  }
                }
              }, 2000);
            } else {
              if (silentAudioRef.current) {
                silentAudioRef.current.pause();
              }
              if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'none';
              }
            }
          };
          
          audio.onerror = () => {
            console.warn("⚠️ Server audio playback failed, falling back to browser TTS");
            setAudioPlaying(false);
            playWithBrowserTTS(textToPlay);
          };
          
          await audio.play();
          setAudioPlaying(true);
          setIsLoadingAudio(false);
          console.log("✅ Playing Google Cloud TTS audio");
          return;
        } else {
          console.warn("⚠️ Server TTS request failed, falling back to browser TTS");
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch server TTS, falling back to browser TTS:", error);
      } finally {
        setIsLoadingAudio(false);
      }
    }
    
    // Fallback to browser's SpeechSynthesis API
    console.log("🔊 Using browser SpeechSynthesis (fallback)");
    playWithBrowserTTS(textToPlay);
  }, [locationStory, locationFacts, audioPlaying, audioPaused, currentChapter, autoplayEnabled, setupMediaSession, stop.name, stop.id, selectedVoice, serverAudioUrl, playWithBrowserTTS]);

  const loadParentTip = useCallback(async () => {
    if (parentTip || isLoadingTip) return;
    setIsLoadingTip(true);
    
    try {
      if (!navigator.onLine) {
        const cached = await getJourneyPackOffline(stop.id);
        if (cached?.parentTip) {
          setParentTip({ tip: cached.parentTip, category: "gear" });
          return;
        }
        if (journeyPack?.parentTip) {
          setParentTip({ tip: journeyPack.parentTip, category: "gear" });
          return;
        }
      }
      
      const res = await apiRequest("POST", `/api/travel/stops/${stop.id}/generate-tip`);
      const data = await res.json();
      setParentTip(data);
    } catch (err) {
      const cached = await getJourneyPackOffline(stop.id);
      if (cached?.parentTip) {
        setParentTip({ tip: cached.parentTip, category: "gear" });
      } else if (journeyPack?.parentTip) {
        setParentTip({ tip: journeyPack.parentTip, category: "gear" });
      }
    } finally {
      setIsLoadingTip(false);
    }
  }, [stop.id, parentTip, isLoadingTip, journeyPack]);

  const checkParentUnlock = () => {
    const answer = parseInt(parentUnlockAnswer);
    if (answer === mathQuestion.answer) {
      setIsParentLocked(false);
      loadParentTip();
    }
  };

  const toggleSection = (section: Section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
      if (!completedSections.includes(section) && section !== "games") {
        setTimeout(() => {
          sectionCompletedDuringSessionRef.current = true;
          setCompletedSections(prev => [...prev, section]);
        }, 2000);
      }
    }
  };

  const handleGameComplete = () => {
    setGameStep("roundComplete");
  };

  const handleNextRound = () => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setGameStep("allComplete");
    } else {
      setCurrentRound(prev => prev + 1);
      setGameStep("question");
    }
  };

  const handleGameDone = () => {
    if (activeGame === "spotit" && spotItReminderKey) {
      try {
        const allMissions = gameContent.spotit.map(s => s.prompt).join(" | ");
        localStorage.setItem(spotItReminderKey, JSON.stringify({
          stopName: stop.name,
          stopId: stop.id,
          mission: allMissions
        }));
      } catch {
      }
    }
    if (gameContent.connectionFact && trip?.id) {
      try {
        const existingConnections = JSON.parse(localStorage.getItem("geoquest-connections") || "[]");
        const newConnection = {
          tripId: trip.id,
          tripName: trip.name || trip.destination,
          stopName: stop.name,
          fact: gameContent.connectionFact,
          timestamp: Date.now()
        };
        if (!existingConnections.find((c: { fact: string }) => c.fact === gameContent.connectionFact)) {
          existingConnections.push(newConnection);
          localStorage.setItem("geoquest-connections", JSON.stringify(existingConnections));
        }
      } catch {
      }
    }
    setActiveGame(null);
    setGameStep("question");
    setCurrentRound(0);
    if (!completedSections.includes("games")) {
      sectionCompletedDuringSessionRef.current = true;
      setCompletedSections(prev => [...prev, "games"]);
    }
  };

  const allComplete = completedSections.length >= 4;

  const SectionHeader = ({ 
    section, 
    icon: Icon, 
    emoji,
    title, 
    color 
  }: { 
    section: Section; 
    icon: any;
    emoji: string;
    title: string; 
    color: string;
  }) => {
    const isExpanded = expandedSection === section;
    const isComplete = completedSections.includes(section);
    
    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => toggleSection(section)}
        className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${
          isExpanded ? `bg-${color}-100 dark:bg-${color}-900/30` : "bg-white/60 dark:bg-slate-800/60"
        }`}
        style={{ 
          backgroundColor: isExpanded ? `var(--${color}-100, rgba(${color === "orange" ? "251,146,60" : color === "purple" ? "192,132,252" : color === "sky" ? "125,211,252" : color === "teal" ? "45,212,191" : "134,239,172"},0.2))` : undefined 
        }}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 360 : 0, scale: isExpanded ? 1.1 : 1 }}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
            isComplete ? "bg-green-100 dark:bg-green-900/30" : ""
          }`}
          style={{ backgroundColor: !isComplete ? `rgba(${color === "orange" ? "251,146,60" : color === "purple" ? "192,132,252" : color === "sky" ? "125,211,252" : color === "teal" ? "45,212,191" : "134,239,172"},0.3)` : undefined }}
        >
          {isComplete ? "✓" : emoji}
        </motion.div>
        <div className="flex-1 text-left">
          <h3 className="font-bold">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {isComplete ? "Completed!" : isExpanded ? "Tap to collapse" : "Tap to expand"}
          </p>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </motion.button>
    );
  };

  // Pending Reflection shows FIRST (before Spot It reminder)
  if (showPendingReflection && pendingReflection) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-purple-50 via-pink-50 to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
      >
        <GeoMomentReflection
          stop={{ 
            ...stop, 
            name: pendingReflection.stopName, 
            stopType: pendingReflection.stopType, 
            id: pendingReflection.stopId 
          } as TravelStop}
          onSave={async (reflectionResponse) => {
            try {
              await apiRequest("PATCH", `/api/travel/stops/${pendingReflection.stopId}`, {
                reflectionResponse
              });
              toast.success("Reflection saved!");
            } catch (error) {
              console.error("Failed to save reflection:", error);
            }
            setShowPendingReflection(false);
            // Clear the pending reflection from localStorage
            if (pendingReflectionKey) {
              localStorage.removeItem(pendingReflectionKey);
            }
          }}
          onSkip={() => {
            setShowPendingReflection(false);
            // Clear the pending reflection from localStorage
            if (pendingReflectionKey) {
              localStorage.removeItem(pendingReflectionKey);
            }
          }}
        />
      </motion.div>
    );
  }

  if (showSpotItReminder && spotItReminder) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-green-100 to-teal-100 dark:from-slate-900 dark:to-slate-800"
      >
        <div className="max-w-lg mx-auto p-4 h-full flex flex-col items-center justify-center text-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowSpotItReminder(false)}
            className="absolute top-4 left-4"
            data-testid="button-close-reminder"
          >
            <X className="w-6 h-6" />
          </Button>
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="mb-6"
          >
            <h2 className="font-bold text-lg mb-2 text-green-700">👀 Remember Your Mission!</h2>
            <p className="text-sm text-muted-foreground">From your last stop at {spotItReminder.stopName}:</p>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-6xl mb-6"
          >
            👀
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-6 shadow-lg max-w-sm"
          >
            <h3 className="text-lg font-bold mb-2">Your mission:</h3>
            <div className="space-y-3 text-left">
              {spotItReminder.mission.split(/\s*\|\s*/).map((question, idx) => (
                <p key={idx} className="text-base leading-relaxed">{question.trim()}</p>
              ))}
            </div>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg font-semibold text-green-700 dark:text-green-300 mt-4"
          >
            Did you spot it?
          </motion.p>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 flex gap-3 w-full max-w-xs"
          >
            <Button 
              size="lg" 
              onClick={() => setSpotItFeedback("spotted")}
              className={`flex-1 ${spotItFeedback === "spotted" ? "bg-green-600 ring-2 ring-green-400" : "bg-green-500 hover:bg-green-600"}`}
              data-testid="button-spotted-it"
            >
              Yes! 👀✨
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => setSpotItFeedback("missed")}
              className={`flex-1 ${spotItFeedback === "missed" ? "ring-2 ring-amber-400 bg-amber-50" : ""}`}
              data-testid="button-didnt-see"
            >
              Not yet 🤷
            </Button>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 w-full max-w-sm"
          >
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              What else did you notice about this stop? ✏️
            </label>
            <div className="relative">
              <textarea
                value={spotItReflection}
                onChange={(e) => setSpotItReflection(e.target.value)}
                placeholder="Tell us what you saw, heard, or felt..."
                className="w-full p-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 resize-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                rows={3}
                data-testid="input-spotit-reflection"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={isSpotItListening ? stopSpotItListening : startSpotItListening}
                className={`absolute right-2 top-2 ${isSpotItListening ? "text-red-500 animate-pulse" : "text-slate-400"}`}
                data-testid="button-spotit-voice"
              >
                {isSpotItListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
            </div>
            {isSpotItListening && (
              <p className="text-xs text-red-500 mt-1 animate-pulse">🎤 Listening... speak now!</p>
            )}
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6"
          >
            <Button
              size="lg"
              onClick={() => {
                setShowSpotItReminder(false);
                setSpotItReflection("");
                setSpotItFeedback(null);
              }}
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold px-8"
              data-testid="button-done-reflection"
            >
              Done! Let's explore! 🚀
            </Button>
          </motion.div>
          
          {spotItFeedback && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`mt-4 p-3 rounded-xl ${spotItFeedback === "spotted" ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}
            >
              <p className={`text-sm font-medium ${spotItFeedback === "spotted" ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                {spotItFeedback === "spotted" 
                  ? "Amazing explorer eyes! 🌟" 
                  : "No worries! You'll spot it next time! 🔍"}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  if (activeGame) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-green-100 to-teal-100 dark:from-slate-900 dark:to-slate-800"
      >
        <div className="max-w-lg mx-auto p-4 h-full flex flex-col">
          <header className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={() => { setActiveGame(null); setGameStep("question"); setCurrentRound(0); }}>
              <X className="w-6 h-6" />
            </Button>
            <div className="text-center">
              <h1 className="font-bold text-lg">
                {activeGame === "guess" && (isHomeAdventure ? "Guess What's There" : "Guess Before You See")}
                {activeGame === "thisorthat" && "This or That"}
                {activeGame === "spotit" && (isHomeAdventure ? "What Will You Spot?" : "Spot It")}
                {activeGame === "buildit" && (isHomeAdventure ? "Dream It Up" : "Build It")}
              </h1>
              <p className="text-xs text-muted-foreground">Round {currentRound + 1} of {TOTAL_ROUNDS}</p>
            </div>
            <div className="w-10" />
          </header>

          <AnimatePresence mode="wait">
            {gameStep === "question" && (
              <motion.div
                key={`question-${currentRound}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="flex-1 flex flex-col justify-center"
              >
                {activeGame === "guess" && gameContent.guess[currentRound] && (
                  <div className="space-y-6">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-6xl text-center mb-4"
                    >
                      🔮
                    </motion.div>
                    <h2 className="text-xl font-bold text-center">{gameContent.guess[currentRound].question}</h2>
                    <p className="text-sm text-center text-muted-foreground">
                      {isHomeAdventure ? "What do you think you'll find?" : "Just guessing — you'll see soon!"}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {gameContent.guess[currentRound].options.map((opt, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleGameComplete}
                          className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg flex flex-col items-center gap-2"
                        >
                          <span className="text-4xl">{opt.emoji}</span>
                          <span className="font-bold">{opt.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {activeGame === "thisorthat" && gameContent.thisorthat[currentRound] && (
                  <div className="space-y-6">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-6xl text-center mb-4"
                    >
                      ⚖️
                    </motion.div>
                    <h2 className="text-xl font-bold text-center">{gameContent.thisorthat[currentRound].question}</h2>
                    <p className="text-sm text-center text-muted-foreground">Go with your gut!</p>
                    <div className="flex gap-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGameComplete}
                        className="flex-1 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg flex flex-col items-center gap-2"
                      >
                        <span className="text-5xl">{gameContent.thisorthat[currentRound].optionA.emoji}</span>
                        <span className="font-bold">{gameContent.thisorthat[currentRound].optionA.label}</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGameComplete}
                        className="flex-1 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg flex flex-col items-center gap-2"
                      >
                        <span className="text-5xl">{gameContent.thisorthat[currentRound].optionB.emoji}</span>
                        <span className="font-bold">{gameContent.thisorthat[currentRound].optionB.label}</span>
                      </motion.button>
                    </div>
                  </div>
                )}

                {activeGame === "spotit" && gameContent.spotit[currentRound] && (
                  <div className="space-y-6 text-center">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-6xl mb-4"
                    >
                      👀
                    </motion.div>
                    <h2 className="text-xl font-bold">Your mission:</h2>
                    <Card className="bg-white/80 dark:bg-slate-800/80">
                      <CardContent className="p-6">
                        <p className="text-lg">{gameContent.spotit[currentRound].prompt}</p>
                      </CardContent>
                    </Card>
                    <p className="text-sm text-muted-foreground">
                      {isHomeAdventure 
                        ? "Imagine looking for this when you visit!" 
                        : "No need to do it now — just remember!"}
                    </p>
                    <Button 
                      size="lg" 
                      onClick={handleGameComplete}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      {isHomeAdventure ? "I'll remember! 👍" : "Got it! 👍"}
                    </Button>
                  </div>
                )}

                {activeGame === "buildit" && gameContent.buildit[currentRound] && (
                  <div className="space-y-6">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-6xl text-center mb-4"
                    >
                      🏗️
                    </motion.div>
                    <h2 className="text-xl font-bold text-center">{gameContent.buildit[currentRound].prompt}</h2>
                    <p className="text-sm text-center text-muted-foreground">
                      {isHomeAdventure ? "What would you want to see here?" : "What would you add?"}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {gameContent.buildit[currentRound].options.map((opt, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleGameComplete}
                          className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg flex items-center gap-3"
                        >
                          <span className="text-3xl">{opt.emoji}</span>
                          <span className="font-medium text-sm">{opt.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {gameStep === "roundComplete" && (
              <motion.div
                key={`roundComplete-${currentRound}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="text-6xl mb-4"
                >
                  {currentRound === 0 ? "👍" : currentRound === 1 ? "🌟" : "✨"}
                </motion.div>
                <h2 className="text-xl font-bold mb-2">
                  {activeGame === "guess" && "Nice guess!"}
                  {activeGame === "thisorthat" && "Interesting choice!"}
                  {activeGame === "spotit" && "Got it!"}
                  {activeGame === "buildit" && "Cool idea!"}
                </h2>
                <p className="text-muted-foreground mb-2">
                  {activeGame === "guess" && (isHomeAdventure 
                    ? "You'll find out when you visit someday!" 
                    : "Keep an eye out when you arrive.")}
                  {activeGame === "thisorthat" && gameContent.thisorthat[currentRound]?.funFact}
                  {activeGame === "spotit" && (isHomeAdventure 
                    ? "Try to spot this if you ever visit!" 
                    : "Remember to look when you get there!")}
                  {activeGame === "buildit" && (isHomeAdventure 
                    ? "What would make this place even better?" 
                    : "See how the real place compares.")}
                </p>
                <div className="flex gap-1 my-4">
                  {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${i <= currentRound ? "bg-green-500" : "bg-slate-300"}`}
                    />
                  ))}
                </div>
                <Button size="lg" onClick={handleNextRound} className="bg-green-500 hover:bg-green-600">
                  {currentRound + 1 >= TOTAL_ROUNDS ? "See Results!" : "Next Round →"}
                </Button>
              </motion.div>
            )}

            {gameStep === "allComplete" && (
              <motion.div
                key="allComplete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="text-8xl mb-6"
                >
                  🎉
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">All {TOTAL_ROUNDS} rounds complete!</h2>
                <p className="text-muted-foreground mb-4">
                  You'll find out when you arrive 😊
                </p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-6 max-w-xs"
                >
                  <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">
                    🔗 You'll see this again in GeoQuest.
                  </p>
                </motion.div>
                <Button size="lg" onClick={handleGameDone} className="bg-green-500 hover:bg-green-600">
                  Done
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-auto"
    >
      
      {/* Keepsake Summary - shown after completing all sections */}
      <AnimatePresence mode="wait">
        {showKeepsakeSummary && !showGeoMomentReflection && (
          <StopKeepsakeSummary
            stop={stop}
            stopNumber={stopNumber}
            totalStops={totalStops}
            isHomeAdventure={isHomeAdventure}
            onContinue={() => {
              // Save pending reflection for the next stop instead of showing it now
              if (pendingReflectionKey) {
                try {
                  const stopEmoji = getStopTypeEmoji(stop.stopType || 'landmark');
                  localStorage.setItem(pendingReflectionKey, JSON.stringify({
                    stopName: stop.name,
                    stopId: stop.id,
                    stopType: stop.stopType || 'landmark',
                    stopEmoji
                  }));
                } catch {
                  console.log('Could not save pending reflection');
                }
              }
              setShowKeepsakeSummary(false);
              sectionCompletedDuringSessionRef.current = false;
              
              // Check if we should show streak protection prompt (first stop completed today, streak not done)
              if (shouldShowStopCompletedPrompt(explorerId)) {
                setShowStreakPrompt(true);
              } else {
                if (onComplete) {
                  onComplete();
                }
                onClose();
              }
            }}
          />
        )}
      </AnimatePresence>
      
      {/* GeoMoment Reflection - journaling after stop completion (legacy, now handled as pending) */}
      <AnimatePresence mode="wait">
        {showGeoMomentReflection && (
          <GeoMomentReflection
            stop={stop}
            onSave={async (reflectionResponse) => {
              try {
                await apiRequest("PATCH", `/api/travel/stops/${stop.id}`, {
                  reflectionResponse
                });
                toast.success("Reflection saved!");
              } catch (error) {
                console.error("Failed to save reflection:", error);
              }
              sectionCompletedDuringSessionRef.current = false;
              setShowGeoMomentReflection(false);
              if (onComplete) {
                onComplete();
              }
              onClose();
            }}
            onSkip={() => {
              sectionCompletedDuringSessionRef.current = false;
              setShowGeoMomentReflection(false);
              if (onComplete) {
                onComplete();
              }
              onClose();
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Streak Protection Prompt - shown after first stop completion if daily streak not completed */}
      <StopCompletedPrompt
        open={showStreakPrompt}
        onClose={() => setShowStreakPrompt(false)}
        explorerId={explorerId}
        onPlayDailyQuest={() => {
          setShowStreakPrompt(false);
          if (onComplete) {
            onComplete();
          }
          onClose();
          // Navigate to Daily Quest - use URL parameter to open modal
          window.location.href = '/?openDailyQuest=true';
        }}
        onContinueAdventure={() => {
          setShowStreakPrompt(false);
          if (onComplete) {
            onComplete();
          }
          onClose();
        }}
      />
      
      {/* Main Journey Pack content - hidden when keepsake, reflection, or pending reflection is showing */}
      {!showKeepsakeSummary && !showGeoMomentReflection && !showPendingReflection && !showSpotItReminder && (
      <>
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-200 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-lg mx-auto p-4 pb-24">
        <header className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-journey">
            <X className="w-6 h-6" />
          </Button>
          <div className="text-center flex-1">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="text-4xl mb-1"
            >
              {avatar.emoji}
            </motion.div>
            <h1 className="font-bold text-lg">{stop.name}</h1>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              {stopEmoji} {stop.stopType}
            </p>
            {stop.address && (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[200px]">{stop.address}</span>
              </p>
            )}
          </div>
          <div className="w-10" />
        </header>

        {/* Context message - different for At-Home vs Travel adventures */}
        <Card className={`bg-gradient-to-r ${isHomeAdventure ? 'from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30' : 'from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30'} border-0 mb-4`}>
          <CardContent className="p-4 text-center">
            <p className={`text-sm font-medium ${isHomeAdventure ? 'text-teal-800 dark:text-teal-200' : 'text-amber-800 dark:text-amber-200'}`}>
              {isHomeAdventure 
                ? `🌍 Discover the wonders of ${stop.name}!`
                : `🚗 Use this on the way to ${stop.name}!`
              }
            </p>
          </CardContent>
        </Card>

        {trip && (
          <ArtifactSection 
            stop={stop} 
            trip={trip}
            listenCompleted={completedSections.includes("listen")}
            onRequestListen={() => {
              setExpandedSection("listen");
            }}
            onRequestPhoto={() => {
              setShowMomentCapture(true);
            }}
          />
        )}

        <div className="space-y-3">
          {mode !== "kidLite" && (<>
          <SectionHeader section="parent" icon={Users} emoji="👨‍👩‍👧" title="Parent Tip" color="sky" />
          <AnimatePresence>
            {expandedSection === "parent" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card className="bg-white/80 dark:bg-slate-800/80">
                  <CardContent className="p-4">
                    {isParentLocked ? (
                      <div className="text-center py-4">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="text-4xl mb-3"
                        >
                          🔒
                        </motion.div>
                        <p className="text-sm font-medium mb-2">Parent Verification</p>
                        <p className="text-xs text-muted-foreground mb-4">
                          What is {mathQuestion.question}? (Quick math to verify you're an adult)
                        </p>
                        <div className="flex gap-2 justify-center items-center max-w-xs mx-auto">
                          <Input
                            type="number"
                            placeholder="Answer"
                            value={parentUnlockAnswer}
                            onChange={(e) => setParentUnlockAnswer(e.target.value)}
                            className="w-24 text-center text-lg"
                            data-testid="input-parent-unlock"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={checkParentUnlock}
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Unlock
                          </Button>
                        </div>
                        {parentUnlockAnswer && parseInt(parentUnlockAnswer) !== mathQuestion.answer && (
                          <p className="text-xs text-red-500 mt-2">That's not quite right, try again!</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {isLoadingTip ? (
                          <div className="py-6">
                            <GlobeLoader message="Finding parent tips..." size="sm" />
                          </div>
                        ) : (
                          <>
                            {parentTip ? (
                              <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4 mb-3">
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">
                                    {parentTip.category === "weather" ? "🌤️" : 
                                     parentTip.category === "gear" ? "🎒" :
                                     parentTip.category === "safety" ? "⚠️" :
                                     parentTip.category === "timing" ? "⏰" :
                                     parentTip.category === "food" ? "🍎" : "💡"}
                                  </span>
                                  <div>
                                    <p className="text-xs font-medium text-sky-600 dark:text-sky-400 uppercase mb-1">
                                      {parentTip.category} tip
                                    </p>
                                    <p className="text-sky-800 dark:text-sky-200">
                                      {parentTip.tip}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4 mb-3">
                                <p className="text-sky-800 dark:text-sky-200">
                                  💡 Ask your child what they're most excited to see. Their curiosity drives deeper learning!
                                </p>
                              </div>
                            )}
                            
                            <div className={`rounded-xl p-4 border ${getCategoryBg(parentInsight.category)}`}>
                              <div className="flex items-start gap-3">
                                <span className="text-xl">{parentInsight.emoji}</span>
                                <div>
                                  <p className={`text-xs font-medium uppercase mb-1 ${getCategoryColor(parentInsight.category)}`}>
                                    Parent Notes
                                  </p>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">
                                    {parentInsight.text}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Explore the Area Section - positioned after Parent Tip for both adventure types */}
          <SectionHeader section="explore" icon={Compass} emoji="🗺️" title="Explore the Area" color="teal" />
          <AnimatePresence>
            {expandedSection === "explore" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card className="bg-white/80 dark:bg-slate-800/80">
                  <CardContent className="p-4 space-y-4">
                    {/* Subtle "we go quiet" reminder for first exploration */}
                    {showQuietBanner && (
                      <QuietPromiseBanner 
                        variant="subtle" 
                        onDismiss={() => {
                          setShowQuietBanner(false);
                          try {
                            localStorage.setItem('explore_quiet_shown', 'true');
                          } catch {}
                        }}
                      />
                    )}
                    {isLoadingExplore ? (
                      <div className="py-6">
                        <GlobeLoader message="Discovering nearby places..." size="sm" />
                      </div>
                    ) : exploreData ? (
                      <>
                        {/* About the Area */}
                        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-teal-200 dark:border-teal-800">
                          <div className="flex items-start gap-3">
                            <Map className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-1" />
                            <div>
                              <h4 className="font-bold text-teal-800 dark:text-teal-300 mb-2">About the Area</h4>
                              <p className="text-sm text-teal-700 dark:text-teal-200">{exploreData.aboutArea}</p>
                            </div>
                          </div>
                        </div>

                        {/* Nearby Attractions */}
                        {exploreData.nearbyAttractions.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-orange-500" />
                              <h4 className="font-bold text-slate-700 dark:text-slate-200">What's Nearby</h4>
                            </div>
                            <div className="grid gap-2">
                              {exploreData.nearbyAttractions.map((attraction, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800"
                                >
                                  <span className="text-2xl">
                                    {attraction.type === 'beach' ? '🏖️' :
                                     attraction.type === 'nature' ? '🌿' :
                                     attraction.type === 'landmark' ? '🏛️' :
                                     attraction.type === 'museum' ? '🏛️' :
                                     attraction.type === 'park' ? '🌳' :
                                     attraction.type === 'viewpoint' ? '👀' : '📍'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{attraction.name}</p>
                                    <p className="text-xs text-orange-600 dark:text-orange-400">{attraction.distance}</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Restaurants */}
                        {exploreData.restaurants.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <UtensilsCrossed className="w-4 h-4 text-pink-500" />
                              <h4 className="font-bold text-slate-700 dark:text-slate-200">Places to Eat</h4>
                            </div>
                            <div className="grid gap-2">
                              {exploreData.restaurants.map((restaurant, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-100 dark:border-pink-800"
                                >
                                  <span className="text-2xl">🍽️</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{restaurant.name}</p>
                                    <p className="text-xs text-pink-600 dark:text-pink-400">
                                      {restaurant.cuisine} • {restaurant.distance}
                                      {restaurant.priceRange && ` • ${restaurant.priceRange}`}
                                    </p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* For Kids */}
                        {exploreData.kidFriendlyPlaces && exploreData.kidFriendlyPlaces.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🧸</span>
                              <h4 className="font-bold text-slate-700 dark:text-slate-200">For Kids</h4>
                            </div>
                            <div className="grid gap-2">
                              {exploreData.kidFriendlyPlaces.map((place, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800"
                                >
                                  <span className="text-2xl">
                                    {place.type === 'playground' ? '🛝' :
                                     place.type === 'ice_cream' ? '🍦' :
                                     place.type === 'toy_store' ? '🧸' :
                                     place.type === 'arcade' ? '🕹️' :
                                     place.type === 'splash_pad' ? '💦' :
                                     place.type === 'zoo' ? '🦁' :
                                     place.type === 'aquarium' ? '🐠' :
                                     place.type === 'trampoline' ? '🤸' :
                                     place.type === 'mini_golf' ? '⛳' :
                                     place.type === 'candy_shop' ? '🍬' : '🎈'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{place.name}</p>
                                    <p className="text-xs text-purple-600 dark:text-purple-400">
                                      {place.distance}
                                      {place.ageRange && ` • ${place.ageRange}`}
                                    </p>
                                    {place.description && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{place.description}</p>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Getting Around */}
                        {exploreData.gettingAround && (
                          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                            <div className="flex items-start gap-3">
                              <Car className="w-5 h-5 text-slate-600 dark:text-slate-400 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">Getting Around</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{exploreData.gettingAround}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tips */}
                        {exploreData.tips && exploreData.tips.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-start gap-3">
                              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-amber-700 dark:text-amber-300 mb-2">Tips</h4>
                                <ul className="space-y-1">
                                  {exploreData.tips.map((tip, idx) => (
                                    <li key={idx} className="text-sm text-amber-700 dark:text-amber-200 flex items-start gap-2">
                                      <span className="text-amber-500">•</span>
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <Compass className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                        <p className="text-muted-foreground">Explore data will be available soon!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          </>)}

          <SectionHeader section="listen" icon={Volume2} emoji="🎧" title="Story Pack" color="orange" />
          <AnimatePresence>
            {expandedSection === "listen" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card className="bg-white/80 dark:bg-slate-800/80">
                  <CardContent className="p-4">
                    {/* Optional Pre-Stop Riddle */}
                    {journeyPack?.preStopRiddle && (
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-4 mb-4 border border-amber-200 dark:border-amber-700">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">🤔</span>
                          <div>
                            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase mb-1">
                              Riddle Time!
                            </p>
                            <p className="text-amber-800 dark:text-amber-200 font-medium">
                              {journeyPack.preStopRiddle}
                            </p>
                            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-2 italic">
                              Can you guess the answer before you arrive?
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {isLoadingFacts ? (
                      <div className="py-6">
                        <GlobeLoader message="Creating your adventure story..." size="md" />
                      </div>
                    ) : locationStory ? (
                      <>
                        {/* Story Header with Title and Duration */}
                        <div className="text-center mb-4">
                          <h3 className="font-bold text-lg text-orange-800 dark:text-orange-200">
                            🎙️ {locationStory.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {locationStory.duration} podcast adventure
                          </p>
                        </div>

                        {/* Chapter Navigation (if chapters exist) */}
                        {locationStory.chapters && locationStory.chapters.length > 0 && (
                          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                            {locationStory.chapters.map((chapter, idx) => (
                              <motion.button
                                key={idx}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  window.speechSynthesis.cancel();
                                  setAudioPlaying(false);
                                  setAudioPaused(false);
                                  setCurrentChapter(idx);
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                  currentChapter === idx
                                    ? "bg-orange-500 text-white"
                                    : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200"
                                }`}
                                data-testid={`button-chapter-${idx}`}
                              >
                                {idx + 1}. {chapter.title.length > 12 ? chapter.title.slice(0, 12) + '...' : chapter.title}
                              </motion.button>
                            ))}
                          </div>
                        )}

                        {/* Play/Pause Button */}
                        <div className="flex items-center justify-center mb-4">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={playAudio}
                            disabled={!locationStory?.story || isLoadingAudio}
                            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                              isLoadingAudio
                                ? "bg-gradient-to-br from-blue-400 to-blue-500"
                                : audioPaused 
                                  ? "bg-gradient-to-br from-amber-400 to-orange-500" 
                                  : "bg-gradient-to-br from-orange-400 to-pink-500"
                            }`}
                            data-testid="button-play-story"
                          >
                            {isLoadingAudio ? (
                              <Loader2 className="w-10 h-10 text-white animate-spin" />
                            ) : audioPlaying ? (
                              <Pause className="w-10 h-10 text-white" />
                            ) : audioPaused ? (
                              <Play className="w-10 h-10 text-white ml-1" />
                            ) : (
                              <Play className="w-10 h-10 text-white ml-1" />
                            )}
                          </motion.button>
                        </div>
                        
                        {/* Status Text */}
                        {audioPaused && !audioPlaying && (
                          <p className="text-center text-sm text-amber-600 dark:text-amber-400 font-medium mb-2">
                            ⏸️ Paused - Tap to Resume
                          </p>
                        )}
                        
                        {/* Playing Indicator */}
                        {audioPlaying && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center mb-4"
                          >
                            <div className="flex justify-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  animate={{ scaleY: [1, 2, 1] }}
                                  transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                  className="w-2 h-6 bg-orange-400 rounded-full"
                                />
                              ))}
                            </div>
                            {locationStory.chapters && locationStory.chapters.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Playing: {locationStory.chapters[currentChapter]?.title || "Story"}
                              </p>
                            )}
                          </motion.div>
                        )}
                        
                        {/* Playback Controls */}
                        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                          {/* Autoplay Toggle */}
                          {locationStory.chapters && locationStory.chapters.length > 1 && (
                            <button
                              onClick={() => setAutoplayEnabled(!autoplayEnabled)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                autoplayEnabled
                                  ? "bg-orange-500 text-white"
                                  : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                              }`}
                              data-testid="button-toggle-autoplay"
                            >
                              {autoplayEnabled ? "🔄 Autoplay ON" : "🔄 Autoplay OFF"}
                            </button>
                          )}
                          
                          {/* Voice Selector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">🎙️</span>
                            <Select 
                              value={narratorVoice} 
                              onValueChange={(value: 'eva' | 'avi') => {
                                setNarratorVoice(value);
                                localStorage.setItem('geoquest_narrator_voice', value);
                              }}
                            >
                              <SelectTrigger className="h-7 w-24 text-xs" data-testid="select-story-voice">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="eva">Eva</SelectItem>
                                <SelectItem value="avi">Avi</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Story Content */}
                        <div className="space-y-3">
                          {/* Current Chapter or Full Story */}
                          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3">
                            <button
                              onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                              className="w-full flex items-center justify-between text-left"
                              data-testid="button-toggle-transcript"
                            >
                              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                📖 {locationStory.chapters && locationStory.chapters.length > 0 
                                  ? `Read Chapter ${currentChapter + 1}` 
                                  : "Read along"}
                              </span>
                              <ChevronDown 
                                className={`w-4 h-4 text-orange-600 transition-transform ${isTranscriptExpanded ? 'rotate-180' : ''}`} 
                              />
                            </button>
                            <AnimatePresence>
                              {isTranscriptExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 leading-relaxed whitespace-pre-line">
                                    {locationStory.chapters && locationStory.chapters.length > 0
                                      ? locationStory.chapters[currentChapter]?.content
                                      : locationStory.story.replace(/\[[^\]]*\]/g, '')}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            {!isTranscriptExpanded && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">
                                {locationStory.chapters && locationStory.chapters.length > 0
                                  ? locationStory.chapters[currentChapter]?.content?.replace(/\[[^\]]*\]/g, '')
                                  : locationStory.story.replace(/\[[^\]]*\]/g, '')}
                              </p>
                            )}
                          </div>
                          
                          {/* Chapter List (collapsible) */}
                          {locationStory.chapters && locationStory.chapters.length > 1 && (
                            <div className={`bg-gradient-to-r ${isHomeAdventure ? 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20' : 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20'} rounded-xl p-3`}>
                              <p className={`text-xs font-medium mb-2 ${isHomeAdventure ? 'text-teal-700 dark:text-teal-300' : 'text-orange-700 dark:text-orange-300'}`}>📚 Story Chapters</p>
                              <div className="space-y-1">
                                {locationStory.chapters.map((chapter, idx) => {
                                  // For At-Home adventures, only first 2 chapters are available
                                  const isLocked = isHomeAdventure && idx >= 2;
                                  
                                  return (
                                    <motion.button
                                      key={idx}
                                      whileTap={isLocked ? undefined : { scale: 0.98 }}
                                      onClick={() => {
                                        if (isLocked) return; // Prevent locked chapters from playing
                                        window.speechSynthesis.cancel();
                                        setAudioPlaying(false);
                                        setAudioPaused(false);
                                        setCurrentChapter(idx);
                                      }}
                                      disabled={isLocked}
                                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                        isLocked
                                          ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50"
                                          : currentChapter === idx
                                          ? (isHomeAdventure ? "bg-teal-200 dark:bg-teal-800/50 font-medium" : "bg-orange-200 dark:bg-orange-800/50 font-medium")
                                          : (isHomeAdventure ? "hover:bg-teal-100 dark:hover:bg-teal-900/30" : "hover:bg-orange-100 dark:hover:bg-orange-900/30")
                                      }`}
                                      data-testid={`button-chapter-select-${idx}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span>
                                          <span className={isHomeAdventure ? "text-teal-600 dark:text-teal-400" : "text-orange-600 dark:text-orange-400"}>{idx + 1}.</span> {chapter.title}
                                        </span>
                                        {isLocked && (
                                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 rounded-full">
                                            Travel Pack
                                          </span>
                                        )}
                                      </div>
                                    </motion.button>
                                  );
                                })}
                              </div>
                              {isHomeAdventure && locationStory.chapters.length > 2 && (
                                <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-2 text-center">
                                  More chapters available with a Travel Pack
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* Bonus Chapters - Deep Dives - only for Travel adventures */}
                          {!isHomeAdventure && locationStory.bonusChapters && locationStory.bonusChapters.length > 0 && (
                            <div className="mt-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                                <span>🎓</span> Bonus Chapters <span className="text-amber-500 text-[10px]">(Optional Deep Dives)</span>
                              </p>
                              <div className="space-y-2">
                                {locationStory.bonusChapters.map((bonus, idx) => (
                                  <div key={idx} className="bg-white dark:bg-slate-700/50 rounded-lg overflow-hidden shadow-sm">
                                    <motion.button
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => setExpandedBonusChapter(expandedBonusChapter === idx ? null : idx)}
                                      className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                      data-testid={`button-bonus-chapter-${idx}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">{bonus.icon}</span>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{bonus.title}</span>
                                      </div>
                                      <ChevronRight className={`w-4 h-4 text-amber-500 transition-transform ${expandedBonusChapter === idx ? "rotate-90" : ""}`} />
                                    </motion.button>
                                    
                                    <AnimatePresence>
                                      {expandedBonusChapter === idx && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="px-3 pb-3 pt-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={async () => {
                                                  if (playingBonusChapter === idx) {
                                                    if (serverAudioRef.current) {
                                                      serverAudioRef.current.pause();
                                                    }
                                                    window.speechSynthesis.cancel();
                                                    setPlayingBonusChapter(null);
                                                    return;
                                                  }
                                                  
                                                  // Stop any current playback
                                                  if (serverAudioRef.current) {
                                                    serverAudioRef.current.pause();
                                                  }
                                                  window.speechSynthesis.cancel();
                                                  setAudioPlaying(false);
                                                  
                                                  const cleanText = bonus.content
                                                    .replace(/\[[^\]]*\]/g, '')
                                                    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, "");
                                                  
                                                  // Try server TTS first
                                                  if (navigator.onLine) {
                                                    try {
                                                      setIsLoadingAudio(true);
                                                      setPlayingBonusChapter(idx);
                                                      
                                                      const response = await fetch(`/api/travel/stops/${stop.id}/generate-audio`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        credentials: 'include',
                                                        body: JSON.stringify({ text: cleanText, voice: narratorVoice })
                                                      });
                                                      
                                                      if (response.ok) {
                                                        const audioBlob = await response.blob();
                                                        const audioUrl = URL.createObjectURL(audioBlob);
                                                        const audio = new Audio(audioUrl);
                                                        serverAudioRef.current = audio;
                                                        audio.onended = () => setPlayingBonusChapter(null);
                                                        await audio.play();
                                                        setIsLoadingAudio(false);
                                                        return;
                                                      }
                                                    } catch (err) {
                                                      console.warn("Bonus chapter TTS failed:", err);
                                                    } finally {
                                                      setIsLoadingAudio(false);
                                                    }
                                                  }
                                                  
                                                  // Fallback to browser TTS
                                                  const utterance = new SpeechSynthesisUtterance(cleanText);
                                                  utterance.rate = 0.95;
                                                  utterance.pitch = 1.05;
                                                  if (selectedVoice) {
                                                    utterance.voice = selectedVoice;
                                                  }
                                                  utterance.onend = () => setPlayingBonusChapter(null);
                                                  window.speechSynthesis.speak(utterance);
                                                  setPlayingBonusChapter(idx);
                                                }}
                                                className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium"
                                                data-testid={`button-play-bonus-${idx}`}
                                              >
                                                {playingBonusChapter === idx ? (
                                                  <>
                                                    <Pause className="w-3 h-3" />
                                                    Stop
                                                  </>
                                                ) : (
                                                  <>
                                                    <Play className="w-3 h-3" />
                                                    Listen
                                                  </>
                                                )}
                                              </motion.button>
                                              <span className="text-[10px] text-amber-600 dark:text-amber-400 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded-full capitalize">
                                                {bonus.type === "howItsMade" ? "How It's Made" : bonus.type}
                                              </span>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                              {bonus.content.replace(/\[[^\]]*\]/g, '')}
                                            </p>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : locationFacts ? (
                      <>
                        {/* Legacy short facts display */}
                        <div className="flex items-center justify-center mb-4">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={playAudio}
                            disabled={!locationFacts?.transcript || isLoadingAudio}
                            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                              isLoadingAudio
                                ? "bg-gradient-to-br from-blue-400 to-blue-500"
                                : audioPaused 
                                  ? "bg-gradient-to-br from-amber-400 to-orange-500" 
                                  : "bg-gradient-to-br from-orange-400 to-pink-500"
                            }`}
                          >
                            {isLoadingAudio ? (
                              <Loader2 className="w-10 h-10 text-white animate-spin" />
                            ) : audioPlaying ? (
                              <Pause className="w-10 h-10 text-white" />
                            ) : (
                              <Play className="w-10 h-10 text-white ml-1" />
                            )}
                          </motion.button>
                        </div>
                        
                        {/* Paused indicator */}
                        {audioPaused && !audioPlaying && (
                          <p className="text-center text-sm text-amber-600 dark:text-amber-400 font-medium mb-2">
                            ⏸️ Paused - Tap to Resume
                          </p>
                        )}
                        
                        <div className="space-y-3">
                          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3">
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              {locationFacts.transcript}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {locationFacts.facts.map((fact, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white dark:bg-slate-700 rounded-xl p-3 text-center shadow-sm"
                              >
                                <span className="text-2xl block mb-1">
                                  {["🌟", "🔮", "✨", "🎯"][i]}
                                </span>
                                <p className="text-xs">{fact}</p>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <SectionHeader section="wonder" icon={Lightbulb} emoji="🧠" title="Wonder Time" color="purple" />
          <AnimatePresence>
            {expandedSection === "wonder" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card className="bg-white/80 dark:bg-slate-800/80">
                  <CardContent className="p-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center mb-4">
                      <p className="text-lg font-medium text-purple-800 dark:text-purple-200">
                        {journeyPack?.wonderPrompt || "What do you think makes this place special?"}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Playful response chips */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[
                          { emoji: "🌿", label: "nature" },
                          { emoji: "🦎", label: "animals" },
                          { emoji: "📜", label: "history" },
                          { emoji: "😲", label: "it's huge" },
                          { emoji: "✨", label: "it's beautiful" },
                          { emoji: "💭", label: "other" },
                        ].map((chip) => (
                          <motion.button
                            key={chip.label}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              const addition = chip.label === "other" ? "" : chip.label;
                              setWonderResponse(prev => 
                                prev ? `${prev}, ${addition}` : addition
                              );
                            }}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                              wonderResponse.includes(chip.label)
                                ? "bg-purple-500 text-white"
                                : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/40"
                            }`}
                            data-testid={`chip-${chip.label}`}
                          >
                            {chip.emoji} {chip.label}
                          </motion.button>
                        ))}
                      </div>
                      
                      {/* Optional text input */}
                      <Textarea
                        placeholder="Anything you notice..."
                        value={wonderResponse}
                        onChange={(e) => setWonderResponse(e.target.value)}
                        className="min-h-[80px] text-base border-2 border-purple-200 focus:border-purple-400 rounded-xl"
                        data-testid="textarea-wonder-response"
                      />
                      
                      {/* Voice input as "Tell GeoBuddy" */}
                      <div className="flex justify-center">
                        <Button
                          variant={isListening ? "default" : "outline"}
                          size="sm"
                          onClick={isListening ? stopListening : startListening}
                          className={`rounded-full ${isListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : "border-purple-300 hover:bg-purple-50"}`}
                          data-testid="button-speech-to-text"
                        >
                          {isListening ? (
                            <>
                              <MicOff className="w-4 h-4 mr-1.5" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Mic className="w-4 h-4 mr-1.5" />
                              Tell GeoBuddy
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {wonderResponse && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center justify-center gap-2 text-green-600"
                        >
                          <Check className="w-5 h-5" />
                          <span className="text-sm font-medium">Great observation! 🌟</span>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {(() => {
            const missions = stop.stopMissions as ExplorerChallengeMission[] | null | undefined;
            if (missions && Array.isArray(missions) && missions.length > 0) {
              const handleExplorerMission = async (stopId: string, missionIndex: number, payload: {
                selectedOption?: number | null;
                skipped?: boolean;
                textResponse?: string;
                photoUrl?: string;
              }) => {
                const response = await fetch(`/api/travel/stops/${stopId}/complete-explorer-mission`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ missionIndex, ...payload, explorerId }),
                });
                return response.json();
              };
              return (
                <div className="my-3">
                  <ExplorerChallenge
                    stopId={stop.id}
                    stopName={stop.name}
                    missions={missions}
                    onComplete={handleExplorerMission}
                  />
                </div>
              );
            }
            if (stop.missionType && stop.missionQuestion && onCompleteMission) {
              return (
                <div className="my-3">
                  <MissionCard
                    stopId={stop.id}
                    stopName={stop.name}
                    missionType={stop.missionType}
                    missionQuestion={stop.missionQuestion}
                    missionHint={stop.missionHint}
                    missionAnswer={stop.missionAnswer}
                    missionDifficulty={stop.missionDifficulty || 'normal'}
                    missionCompleted={stop.missionCompleted || false}
                    missionKeepsakeReward={stop.missionKeepsakeReward || false}
                    missionXpAwarded={stop.missionXpAwarded || 0}
                    onComplete={onCompleteMission}
                    isActive={!stop.missionCompleted}
                    isLocked={false}
                    index={0}
                  />
                </div>
              );
            }
            return null;
          })()}

          <SectionHeader section="games" icon={Gamepad2} emoji="🎯" title="Journey Games: Explore" color="green" />
          <AnimatePresence>
            {expandedSection === "games" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card className="bg-white/80 dark:bg-slate-800/80">
                  <CardContent className="p-4 space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveGame("guess")}
                      className="w-full p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl flex items-center gap-3 border border-amber-200 dark:border-amber-800"
                    >
                      <span className="text-3xl">🔮</span>
                      <div className="flex-1 text-left">
                        <p className="font-bold">{isHomeAdventure ? "Guess What's There" : "Guess Before You See"}</p>
                        <p className="text-xs text-muted-foreground">Make a prediction!</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveGame("thisorthat")}
                      className="w-full p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl flex items-center gap-3 border border-pink-200 dark:border-pink-800"
                    >
                      <span className="text-3xl">⚖️</span>
                      <div className="flex-1 text-left">
                        <p className="font-bold">This or That</p>
                        <p className="text-xs text-muted-foreground">Quick comparison!</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveGame("spotit")}
                      className="w-full p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl flex items-center gap-3 border border-green-200 dark:border-green-800"
                    >
                      <span className="text-3xl">👀</span>
                      <div className="flex-1 text-left">
                        <p className="font-bold">{isHomeAdventure ? "What Will You Spot?" : "Spot It"}</p>
                        <p className="text-xs text-muted-foreground">{isHomeAdventure ? "Imagine finding these!" : "Observation mission!"}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveGame("buildit")}
                      className="w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl flex items-center gap-3 border border-blue-200 dark:border-blue-800"
                    >
                      <span className="text-3xl">🏗️</span>
                      <div className="flex-1 text-left">
                        <p className="font-bold">{isHomeAdventure ? "Dream It Up" : "Build It"}</p>
                        <p className="text-xs text-muted-foreground">{isHomeAdventure ? "What would you add?" : "Be the architect!"}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </motion.button>

                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Saved Moments for this Stop */}
        {stopMoments.length > 0 && (
          <div className="max-w-lg mx-auto mb-20 px-4">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-5 h-5 text-pink-500" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                  Your Moments Here ({stopMoments.length})
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(() => {
                  // Build flat list of all photo tiles with moment reference
                  const allPhotoTiles: Array<{ moment: TravelMoment; photoUrl: string; photoIndex: number }> = [];
                  
                  for (const moment of stopMoments) {
                    // Normalize photoUrls - handle arrays, strings, and legacy data
                    let normalizedUrls: string[] = [];
                    if (Array.isArray(moment.photoUrls) && moment.photoUrls.length > 0) {
                      normalizedUrls = moment.photoUrls.filter((u): u is string => typeof u === 'string');
                    } else if (typeof moment.photoUrls === 'string') {
                      try {
                        const parsed = JSON.parse(moment.photoUrls);
                        if (Array.isArray(parsed)) {
                          normalizedUrls = parsed.filter((u): u is string => typeof u === 'string');
                        }
                      } catch {
                        // Not valid JSON, treat as single URL
                        if (moment.photoUrls) normalizedUrls = [moment.photoUrls];
                      }
                    }
                    // Fallback to single photoUrl
                    if (normalizedUrls.length === 0 && moment.photoUrl) {
                      normalizedUrls = [moment.photoUrl];
                    }
                    
                    if (normalizedUrls.length === 0) {
                      // Placeholder for moments with no photos
                      allPhotoTiles.push({ moment, photoUrl: '', photoIndex: 0 });
                    } else {
                      normalizedUrls.forEach((url, idx) => {
                        allPhotoTiles.push({ moment, photoUrl: url, photoIndex: idx });
                      });
                    }
                  }
                  
                  const visibleTiles = allPhotoTiles.slice(0, 9);
                  const hiddenCount = allPhotoTiles.length - visibleTiles.length;
                  
                  return (
                    <>
                      {visibleTiles.map(({ moment, photoUrl, photoIndex }) => (
                        <div 
                          key={`${moment.id}-${photoIndex}`} 
                          className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 group"
                        >
                          {photoUrl ? (
                            <img 
                              src={photoUrl} 
                              alt={moment.kidPromptResponse || "Memory"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          {photoIndex === 0 && moment.kidPromptResponse && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                              <p className="text-white text-xs line-clamp-2">{moment.kidPromptResponse}</p>
                            </div>
                          )}
                          {photoIndex === 0 && onDeleteMoment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMomentToDelete(moment);
                              }}
                              className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500/90 text-white hover:bg-red-600 transition-colors shadow-md"
                              data-testid={`button-delete-moment-${moment.id}`}
                              aria-label="Delete moment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      {hiddenCount > 0 && (
                        <p className="col-span-3 text-xs text-center text-muted-foreground mt-2">
                          +{hiddenCount} more photos
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!momentToDelete} onOpenChange={(open) => !open && setMomentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this moment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this photo and memory. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={async () => {
                  if (!momentToDelete || !onDeleteMoment) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteMoment(momentToDelete.id);
                    setMomentToDelete(null);
                  } catch (error) {
                    console.error("Failed to delete moment:", error);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? "Deleting..." : "Delete Forever"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-sky-200 dark:from-slate-900 via-sky-200/80 dark:via-slate-900/80 to-transparent">
          <div className="max-w-lg mx-auto">
            <div className="flex justify-center gap-2 mb-3">
              {(["listen", "wonder", "parent", "games"] as Section[]).map((section) => (
                <div
                  key={section}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    completedSections.includes(section) ? "bg-green-500" : "bg-slate-300"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {/* Save Moment - only for Travel adventures that allow media capture */}
              {allowMediaCapture && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setShowMomentCapture(true)}
                    className="w-full bg-white/80 border-pink-300 text-pink-600 hover:bg-pink-50"
                    data-testid="button-save-moment-journey"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Save a Moment
                  </Button>
                </motion.div>
              )}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={allowMediaCapture ? "flex-1" : "flex-1"}>
                <Button
                  size="lg"
                  onClick={() => setShowKeepsakeSummary(true)}
                  className={`w-full ${allComplete ? (isHomeAdventure ? "bg-gradient-to-r from-teal-500 to-cyan-500" : "bg-gradient-to-r from-green-500 to-emerald-500") : "bg-slate-400"}`}
                  disabled={!allComplete}
                  data-testid="button-done-journey"
                >
                  <Star className="w-5 h-5 mr-2" />
                  {allComplete ? "Done!" : `${completedSections.length}/4`}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <AnimatePresence>
        {showMomentCapture && trip && onSaveMoment && (
          <MomentCapture
            trip={trip}
            stops={[stop]}
            isParentMode={true}
            onSave={async (momentData) => {
              await onSaveMoment({
                stopId: stop.id,
                photoUrl: momentData.photoUrl,
                photoUrls: momentData.photoUrls,
                kidPromptResponse: momentData.kidPromptResponse,
                parentPromptResponse: momentData.parentPromptResponse,
              });
              setShowMomentCapture(false);
            }}
            onClose={() => setShowMomentCapture(false)}
          />
        )}
      </AnimatePresence>
      </>
      )}
    </motion.div>
  );
}
