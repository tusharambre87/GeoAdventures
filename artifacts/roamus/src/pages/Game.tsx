import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LOCATION_CARDS, MISSION_CARDS, EVENT_CARDS, ACHIEVEMENTS, LocationCard, EventCard, MissionCard, Achievement } from "@/lib/gameData";
import { ALL_GUESS_AND_GO_CITIES } from "@/lib/dailyQuestData";

// Game mode types
type GameMode = "EXPLORER" | "WORLD_CHAMPION";

// Feature flag for World Champion mode (Hard mode with 101 cities)
// Enabled in all environments
const WORLD_CHAMPION_MODE_ENABLED = true;
import { ANIMAL_CARDS, AnimalCard } from "@/lib/animalData";
import { GameCard } from "@/components/GameCard";
import { PlayerPanel } from "@/components/PlayerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowRight, ArrowLeft, Lightbulb, Map, Globe, CheckCircle, XCircle, RotateCcw, Trophy, Send, Sparkles, UserPlus, Play, AlertCircle, Eye, Trash2, HelpCircle, Star, Home, Flag, LogOut, Volume2, VolumeX, Stamp, Users, MapPin, ChevronRight, Share2, Mic, MicOff } from "lucide-react";
import LearningSummary, { getGameLearningPoints } from "@/components/LearningSummary";
import { CityLiveInfo } from "@/components/CityLiveInfo";
import { getCityImage } from "@/lib/cityImages";
import { getCityMapUrl } from "@/lib/cityMaps";
import confetti from "canvas-confetti";
import bgImage from "@assets/generated_images/playful_hand-drawn_world_adventure_map_pattern.png";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { UserHeader } from "@/components/UserHeader";
import { soundManager } from "@/lib/sound";
import { useParentalGate } from "@/components/ParentalGate";
import { useSessionOptional } from "@/lib/sessionContext";
import { findConnection, formatConnectionMessage, markConnectionShown, hasConnectionBeenShown } from "@/lib/connections";
import { recordGamePlayed } from "@/components/TravelModeReminders";
import { recordCityExplored } from "@/components/EndOfDayRecap";
import { useGameInstallPrompt } from "@/hooks/useGameInstallPrompt";
import { GameInstallPrompt } from "@/components/GameInstallPrompt";
import { useSharePrompt } from "@/hooks/useSharePrompt";
import { SharePrompt } from "@/components/SharePrompt";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { useSubscription } from "@/hooks/useSubscription";
import { setInternalNavToAdventures } from "@/components/GatedTravelMode";

interface Player {
  id: number;
  name: string;
  stars: number;
  avatarColor: string;
  isTurn: boolean;
  collectedCards: LocationCard[];
  completedMissions: MissionCard[];
  skipNextTurn: boolean;
  peekNextCard: boolean;
  autoWinBonus?: boolean;
  lockedDifficulty?: Difficulty | null;
  explorerId?: string | null;
  invitedEmail?: string | null;
}

const PLAYER_PREFIXES = [
  "Explorer", "Traveler", "Adventurer", "Voyager", "Navigator", "Scout", "Ranger", "Captain"
];

const AVATAR_COLORS = [
  "bg-blue-500", "bg-pink-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-teal-500"
];

type GamePhase = "SETUP" | "DRAW" | "CHOOSE_DIFFICULTY" | "SHOW_CLUE" | "REVEAL_RESULT" | "BONUS_ROUND" | "MAP_BONUS_ROUND" | "STAMP_PASSPORT" | "EVENT" | "MISSION_COMPLETE" | "ANIMAL_BONUS" | "DISCARD_CHOICE" | "PEEK_PREVIEW" | "GAME_OVER";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

// Levenshtein distance for fuzzy matching (simple version)
const levenshteinDistance = (a: string, b: string) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// Alias mapping for countries (Common variations -> Standard Name)
const COUNTRY_ALIASES: Record<string, string> = {
  "usa": "United States",
  "united states": "United States",
  "united states of america": "United States",
  "us": "United States",
  "america": "United States",
  "uk": "United Kingdom",
  "great britain": "United Kingdom",
  "britain": "United Kingdom",
  "england": "United Kingdom", // Technically incorrect but acceptable for kids game context if dealing with London
  "uae": "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
  "emirates": "United Arab Emirates",
  "korea": "South Korea",
  "s korea": "South Korea",
  "s. korea": "South Korea",
  "south africa": "South Africa", // Just ensuring standard casing
  "sa": "South Africa",
  "nz": "New Zealand",
  "dr congo": "Democratic Republic of the Congo",
  "drc": "Democratic Republic of the Congo",
  "new york": "New York",
  "nyc": "New York",
  "new york city": "New York"
};

const isCloseEnough = (guess: string, answer: string) => {
  let normalizedGuess = guess.trim().toLowerCase();
  const normalizedAnswer = answer.trim().toLowerCase();
  
  // Check alias match
  if (COUNTRY_ALIASES[normalizedGuess] && COUNTRY_ALIASES[normalizedGuess].toLowerCase() === normalizedAnswer) {
     return "EXACT";
  }
  
  // Special case for New York / New York City
  if ((normalizedGuess === "new york" || normalizedGuess === "new york city") && 
      (normalizedAnswer === "new york" || normalizedAnswer === "new york city")) {
      return "EXACT";
  }

  if (normalizedGuess === normalizedAnswer) return "EXACT";
  
  // NEW LOGIC: Check for "CLOSE" match
  
  // Handle multi-word answers (e.g. "New York")
  const answerParts = normalizedAnswer.split(" ");
  const guessParts = normalizedGuess.split(" ");
  
  if (answerParts.length > 1) {
      // If it's a multi-word answer, let's check if at least one word is correct or close
      // Or if the Levenshtein distance of the whole phrase is close enough
      
      // Strategy 1: Check whole phrase distance
      const wholeDistance = levenshteinDistance(normalizedGuess, normalizedAnswer);
      const maxWholeDistance = Math.max(3, Math.floor(normalizedAnswer.length / 3)); // Allow bit more for phrases
      
      if (wholeDistance <= maxWholeDistance) return "CLOSE";
      
      // Strategy 2: Check individual words if guess has same number of words
      if (guessParts.length === answerParts.length) {
          let closeWords = 0;
          for (let i = 0; i < answerParts.length; i++) {
              const dist = levenshteinDistance(guessParts[i], answerParts[i]);
              if (dist <= 2) closeWords++; // Allow 2 typos per word
          }
          
          // If all words are close, it's a close guess
          if (closeWords === answerParts.length) return "CLOSE";
      }
  }

  // 1. Must start with the same letter (for single words mostly, or strict mode)
  // We relax this for very close Levenshtein matches (e.g. "PAris" -> "Paris" is distance 1, even if we typed "Aris" it's dist 1)
  // But for kids, first letter rule is good. Let's keep it but be careful with multi-word.
  
  if (normalizedGuess[0] !== normalizedAnswer[0]) {
      // Exception: If distance is very small (1 or 2), maybe they just missed the first key?
      // But generally we want to enforce first letter for "learning" aspect.
      // Let's stick to the rule unless it's a known alias.
      return "WRONG";
  }

  // 2. Check Levenshtein distance (allow more flexibility based on length)
  const distance = levenshteinDistance(normalizedGuess, normalizedAnswer);
  const maxAllowedDistance = Math.max(2, Math.floor(normalizedAnswer.length / 2)); // Allow up to half the length to be wrong (or 2 chars min)

  if (distance <= maxAllowedDistance) {
      return "CLOSE";
  }
  
  return "WRONG";
};

import { VictoryCelebration } from "@/components/VictoryCelebration";
import { FlagImage } from "@/components/FlagImage";

import { PreOrderPopup } from "@/components/PreOrderPopup";

export default function Game() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [turnIndex, setTurnIndex] = useState(0); // Use index instead of ID for simpler rotation
  const [phase, setPhase] = useState<GamePhase>("SETUP");
  
  // Setup State
  const [setupStep, setSetupStep] = useState<"MODE_SELECT" | "REGISTRATION" | "COUNT" | "NAMES" | "CONFIRM">("MODE_SELECT");
  const [gameMode, setGameMode] = useState<GameMode>("EXPLORER");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [nameErrors, setNameErrors] = useState<string[]>([]);
  
  // Game State
  const [currentCard, setCurrentCard] = useState<LocationCard | null>(null);
  const [deck, setDeck] = useState<LocationCard[]>([]);
  const [eventDeck, setEventDeck] = useState<EventCard[]>([]);
  const [discardPile, setDiscardPile] = useState<LocationCard[]>([]);
  const [nextCardPreview, setNextCardPreview] = useState<LocationCard | null>(null); // For Peek Event
  const [currentEvent, setCurrentEvent] = useState<EventCard | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [lastPlayedCard, setLastPlayedCard] = useState<LocationCard | null>(null);
  
  // Clue Logic State
  const [revealedClueIndices, setRevealedClueIndices] = useState<number[]>([]);
  const [extraClueUsed, setExtraClueUsed] = useState(false);
  const [clueCost, setClueCost] = useState(0);
  const [activeClueSet, setActiveClueSet] = useState<'clues' | 'cluesAlt' | 'cluesAlt2'>('clues');
  
  const [guessInput, setGuessInput] = useState("");
  const [emptyGuessCount, setEmptyGuessCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [bonusOptions, setBonusOptions] = useState<{ country: string, flagUrl: string }[]>([]);
  const [bonusWon, setBonusWon] = useState<boolean | null>(null); // Track bonus result
  const [selectedBonusOption, setSelectedBonusOption] = useState<string | null>(null); // Track user selection
  
  // Map Bonus State
  const [mapBonusOptions, setMapBonusOptions] = useState<{ country: string, mapUrl: string }[]>([]);
  
  const [activeMissions, setActiveMissions] = useState<MissionCard[]>([]);
  // const [showVictory, setShowVictory] = useState(false); // REPLACED BY GAME_OVER PHASE
  const [justCompletedMission, setJustCompletedMission] = useState<MissionCard | null>(null);
  
  // Animal Bonus State
  const [currentAnimalCard, setCurrentAnimalCard] = useState<AnimalCard | null>(null);
  const [animalOptions, setAnimalOptions] = useState<string[]>([]);
  const [animalBonusWon, setAnimalBonusWon] = useState(false);
  const [wrongAnimalGuesses, setWrongAnimalGuesses] = useState<string[]>([]);

  // Alert States
  const [showEmptyGuessAlert, setShowEmptyGuessAlert] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [showPreOrderPopup, setShowPreOrderPopup] = useState(false);
  const [typoRetryCount, setTypoRetryCount] = useState(0);
  const [showVisualClue, setShowVisualClue] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [showGeoAdventuresPrompt, setShowGeoAdventuresPrompt] = useState(false);
  
  // New Player Choice Modal State (for logged-in users adding non-family players)
  const [showNewPlayerChoice, setShowNewPlayerChoice] = useState(false);
  const [newPlayerIndex, setNewPlayerIndex] = useState<number | null>(null);
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [newPlayerEmailError, setNewPlayerEmailError] = useState("");
  const [pendingNewPlayers, setPendingNewPlayers] = useState<{
    index: number;
    name: string;
    choice: 'family' | 'invite' | null;
    email?: string;
  }[]>([]);

  // User Context
  const { user, stats, login, addCollectedCard, awardPassportStar, recordGameResult, addStars, addMissionCompleted, unlockAchievement, unlockedAchievementIds, syncStatsToBackend, currentPlayerId, setCurrentPlayerId, loadPlayerFromBackend, isLoading: isAuthLoading } = useUser();
  const { activeExplorer, explorers, createExplorer, loadExplorers, updateActiveExplorerStats } = useExplorer();
  
  // Load explorers when user is available
  useEffect(() => {
    if (user?.id) {
      loadExplorers(user.id);
    }
  }, [user?.id, loadExplorers]);
  
  // Session Tracking
  const session = useSessionOptional();
  
  // Parental Gate
  const { requestAccess } = useParentalGate();
  
  // PWA Install Prompt after games
  const { shouldShowPrompt: showInstallPrompt, dismissPrompt, recordGameCompleted } = useGameInstallPrompt();
  const [showGameInstallPrompt, setShowGameInstallPrompt] = useState(false);
  
  // Share Prompt after 3 Guess & Go games
  const { shouldShowPrompt: showSharePromptFlag, dismissPrompt: dismissSharePrompt, recordGuessGoGame } = useSharePrompt();
  const [showSharePromptDialog, setShowSharePromptDialog] = useState(false);
  
  // Free Limits
  const { 
    recordGuessAndGoGame: recordFreeGame, 
    hasReachedFreeLimit, 
    canPlayGuessAndGo,
  } = useFreeLimits();
  const { isAdmin, hasActiveSubscription } = useSubscription();
  
  // Show share prompt when conditions are met (after install prompt is dismissed or if it's not showing)
  useEffect(() => {
    if (phase === "GAME_OVER" && showSharePromptFlag && !showInstallPrompt && !showGameInstallPrompt && !showSharePromptDialog) {
      const timer = setTimeout(() => setShowSharePromptDialog(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, showSharePromptFlag, showInstallPrompt, showGameInstallPrompt, showSharePromptDialog]);
  
  // Show GeoAdventures prompt for first-time players after game over (with delay)
  // Skip for admin users and paid subscribers - they already have full access
  useEffect(() => {
    if (phase === "GAME_OVER") {
      // Never show for admin users or paid subscribers
      if (isAdmin || hasActiveSubscription) return;
      
      const gamesPlayed = parseInt(localStorage.getItem('geoquest_games_played') || '0', 10);
      const hasSeenGeoAdventuresPrompt = localStorage.getItem('geoquest_seen_geoadventures_prompt');
      
      // Show only after the first game if not already seen
      if (gamesPlayed === 1 && !hasSeenGeoAdventuresPrompt && !showGeoAdventuresPrompt) {
        const timer = setTimeout(() => setShowGeoAdventuresPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, showGeoAdventuresPrompt, isAdmin, hasActiveSubscription]);
  
  // Track game time - start when game starts, stop when game ends
  useEffect(() => {
    if (phase === "DRAW" && session) {
      session.startGameTimer();
    } else if (phase === "GAME_OVER" && session) {
      session.stopGameTimer();
    }
  }, [phase, session]);

  // Dialog States
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showStealDialog, setShowStealDialog] = useState(false);
  const [stealTargets, setStealTargets] = useState<Player[]>([]);
  const [rainWipes, setRainWipes] = useState(0);
  const [showEventAnimation, setShowEventAnimation] = useState(false);
  const [isStamped, setIsStamped] = useState(false); // Track if passport is stamped
  const [reviewPlayerId, setReviewPlayerId] = useState<number | "SUMMARY" | null>(null); // For Game Review
  const [newlyUnlockedAchievement, setNewlyUnlockedAchievement] = useState<Achievement | null>(null);
  const [, setLocation] = useLocation();
  const gameReturnTo = new URLSearchParams(window.location.search).get('from');
  const goHome = () => setLocation(gameReturnTo || "/");

  // Tutorial State
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Auto-speech mute toggle (persisted in localStorage)
  const [isAutoSpeechMuted, setIsAutoSpeechMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('geoquest_auto_speech_muted') === 'true';
    }
    return false;
  });
  
  const toggleAutoSpeechMute = () => {
    setIsAutoSpeechMuted(prev => {
      const newValue = !prev;
      localStorage.setItem('geoquest_auto_speech_muted', String(newValue));
      if (newValue) {
        soundManager.stopSpeaking();
      }
      return newValue;
    });
  };

  // Mission Tutorial State - shows when first city of a mission is won
  const [showMissionTutorial, setShowMissionTutorial] = useState(false);
  const [missionTutorialStep, setMissionTutorialStep] = useState(0);
  const [missionTutorialMission, setMissionTutorialMission] = useState<MissionCard | null>(null);
  const [missionTutorialPlayer, setMissionTutorialPlayer] = useState<string>("");

  // Animal Safari Tutorial State - shows on first animal bonus round
  const [showAnimalTutorial, setShowAnimalTutorial] = useState(false);

  // Fun Facts Card Tutorial State - shows on first correct answer to teach about the card
  const [showFunFactsTutorial, setShowFunFactsTutorial] = useState(false);
  const [funFactsTutorialStep, setFunFactsTutorialStep] = useState(0);
  const [cityLiveInfoAvailable, setCityLiveInfoAvailable] = useState(false);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const checkSpeaking = setInterval(() => {
        setIsSpeaking(window.speechSynthesis?.speaking ?? false);
    }, 200);
    return () => clearInterval(checkSpeaking);
  }, []);

  // Helper to get current player safely
  const currentPlayer = players[turnIndex];

  // Initialize Active Missions with Shuffle
  useEffect(() => {
    const shuffledMissions = [...MISSION_CARDS].sort(() => Math.random() - 0.5);
    setActiveMissions(shuffledMissions.slice(0, 3));
    
    // Resume Audio Context on first interaction
    const handleInteraction = () => {
       soundManager.resumeContext();
       document.removeEventListener('click', handleInteraction);
       document.removeEventListener('keydown', handleInteraction);
       document.removeEventListener('touchstart', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    
    return () => {
       document.removeEventListener('click', handleInteraction);
       document.removeEventListener('keydown', handleInteraction);
       document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Tutorial Trigger
  useEffect(() => {
     // Determine user-specific session key
     const userKey = user ? (user.email || user.username) : "guest";
     const tutorialKey = `geoquest_tutorial_seen_${userKey}`;
     
     // Check session storage to prevent showing it multiple times in one session if they reload
     const hasSeenTutorial = sessionStorage.getItem(tutorialKey);
     
     // Trigger tutorial only on the very first game (ever), first turn, when we reach the main gameplay phase
     // AND if we haven't seen it in this session yet for this specific user
     if (stats.gamesPlayed === 0 && phase === "CHOOSE_DIFFICULTY" && turnIndex === 0 && tutorialStep === 0 && !hasSeenTutorial) {
         // Small delay to let animations finish
         const timer = setTimeout(() => {
            setTutorialStep(1);
            sessionStorage.setItem(tutorialKey, "true");
         }, 1000);
         return () => clearTimeout(timer);
     }
  }, [phase, stats.gamesPlayed, turnIndex, user]);

  // Fun Facts Card Tutorial Trigger - shows on first correct answer
  useEffect(() => {
    if (phase === "REVEAL_RESULT" && isCorrect && currentCard) {
      const userKey = user ? (user.email || user.username) : "guest";
      const funFactsKey = `geoquest_funfacts_tutorial_seen_${userKey}`;
      const hasSeenFunFactsTutorial = localStorage.getItem(funFactsKey);
      
      if (!hasSeenFunFactsTutorial) {
        const timer = setTimeout(() => {
          setShowFunFactsTutorial(true);
          setFunFactsTutorialStep(0);
          setCityLiveInfoAvailable(navigator.onLine);
          localStorage.setItem(funFactsKey, 'true');
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, isCorrect, currentCard, user]);

  // Travel Mode Connections - show "You saw something like this on your trip!" toast
  useEffect(() => {
    if (phase === "REVEAL_RESULT" && currentCard) {
      const connection = findConnection(
        currentCard.city,
        currentCard.country,
        currentCard.clues || []
      );
      if (connection) {
        const connectionId = `${connection.tripId}-${connection.fact}`;
        if (!hasConnectionBeenShown(connectionId)) {
          markConnectionShown(connectionId);
          const timer = setTimeout(() => {
            toast(formatConnectionMessage(connection), {
              icon: "🔗",
              duration: 5000,
              className: "bg-purple-50 border-purple-200",
            });
          }, 1500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [phase, currentCard]);

  // Handle Game Over Persistence - Distribute rewards to EACH player's explorer individually
  const gameRecordedRef = useRef(false);
  useEffect(() => {
     if (phase === "GAME_OVER" && players.length > 0 && !gameRecordedRef.current) {
        gameRecordedRef.current = true;
        
        // Track game completion for Travel Mode reminders
        recordGamePlayed();
        
        // Track game completion for PWA install prompt (after 2 games)
        recordGameCompleted('guess-and-go');
        
        // Track game completion for share prompt (after 3 Guess & Go games)
        recordGuessGoGame();
        
        // Show install prompt if conditions are met (after a short delay)
        // Share prompt is handled by useEffect watching for state changes
        if (showInstallPrompt) {
          setTimeout(() => setShowGameInstallPrompt(true), 2000);
        }
        
        // Increment games played counter for non-signed up users (for retention prompts)
        const isGuest = !user || user.id?.startsWith('local_');
        if (isGuest) {
          const currentCount = parseInt(localStorage.getItem('geoquest_games_played') || '0', 10);
          localStorage.setItem('geoquest_games_played', String(currentCount + 1));
        }
        
        recordFreeGame();
        
        // Default review to SUMMARY
        setReviewPlayerId("SUMMARY");

        // Calculate totals for analytics
        let totalStars = 0;
        players.forEach(p => { totalStars += p.stars; });

        // Distribute rewards to each player's linked explorer account
        const distributeRewards = async () => {
          for (const player of players) {
            // Only distribute if player has a linked explorer
            if (player.explorerId) {
              const cardIds = player.collectedCards.map(c => c.id);
              const rewardPayload = { 
                stars: player.stars,
                cardIds: cardIds,
                gamesPlayed: true,
              };
              
              // Check if online before making API call
              if (navigator.onLine) {
                try {
                  const response = await fetch(`/api/players/${player.explorerId}/add-game-rewards`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rewardPayload),
                  });
                  
                  if (response.ok) {
                    console.log(`✅ Rewards distributed to ${player.name}: ${player.stars} stars, ${cardIds.length} cards`);
                  } else {
                    // HTTP error (4xx/5xx) - save to offline queue for retry
                    console.error(`Server error distributing rewards for ${player.name}: ${response.status}`);
                    saveOfflineRewards(player.explorerId, player.name, rewardPayload);
                    toast.info("Your progress will sync when connection improves", { duration: 3000 });
                  }
                } catch (error) {
                  console.error(`Failed to distribute rewards for ${player.name}:`, error);
                  // Save to offline queue on network error
                  saveOfflineRewards(player.explorerId, player.name, rewardPayload);
                  toast.info("Your progress is saved and will sync later", { duration: 3000 });
                }
              } else {
                // Offline: save rewards for later sync
                saveOfflineRewards(player.explorerId, player.name, rewardPayload);
                console.log(`📦 Offline: Saved rewards for ${player.name} to sync later`);
                toast.info("You're offline - progress saved and will sync later!", { duration: 4000 });
              }
            } else if (player.invitedEmail) {
              // For invited players, save stats to pending transfer for later claim
              console.log(`📧 Saving stats for invited player ${player.name} (${player.invitedEmail})`);
              
              // Strip prefix from name and normalize to match pending transfer storage
              // Must match server-side normalization: trim, collapse spaces (server lowercases in SQL)
              const prefixRegex = /^(Explorer |Traveler |Adventurer |Voyager |Navigator |Scout |Ranger |Captain )/;
              const cleanName = player.name.replace(prefixRegex, '').trim().replace(/\s+/g, ' ');
              
              try {
                const response = await fetch('/api/pending-transfers/stats', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: player.invitedEmail,
                    playerName: cleanName,
                    stats: {
                      stars: player.stars,
                      cardIds: player.collectedCards.map(c => c.id),
                      gamesPlayed: 1,
                    },
                  }),
                });
                
                if (response.ok) {
                  console.log(`✅ Saved pending transfer stats for ${player.name}: ${player.stars} stars`);
                } else {
                  console.error(`Failed to save pending transfer stats for ${player.name}: ${response.status}`);
                }
              } catch (error) {
                console.error(`Failed to save pending transfer stats for ${player.name}:`, error);
              }
            } else {
              // For guest players without explorer IDs, save rewards to guest session for later migration
              console.log(`⚠️ No explorer linked for ${player.name} - saving to guest session for migration`);
              
              // Update guest session with game rewards
              try {
                const savedSession = localStorage.getItem('geoquest_guest_session');
                if (savedSession) {
                  const sessionData = JSON.parse(savedSession);
                  if (!sessionData.playerRewards) {
                    sessionData.playerRewards = [];
                  }
                  
                  // Find and update existing player or add new
                  const existingIndex = sessionData.playerRewards.findIndex((p: any) => p.name === player.name);
                  const rewardData = {
                    name: player.name,
                    stars: player.stars,
                    cardIds: player.collectedCards.map(c => c.id),
                    gamesPlayed: 1,
                  };
                  
                  if (existingIndex >= 0) {
                    // Accumulate rewards for multiple games
                    const existing = sessionData.playerRewards[existingIndex];
                    sessionData.playerRewards[existingIndex] = {
                      ...rewardData,
                      stars: (existing.stars || 0) + player.stars,
                      cardIds: [...(existing.cardIds || []), ...rewardData.cardIds],
                      gamesPlayed: (existing.gamesPlayed || 0) + 1,
                    };
                  } else {
                    sessionData.playerRewards.push(rewardData);
                  }
                  
                  localStorage.setItem('geoquest_guest_session', JSON.stringify(sessionData));
                  console.log(`📦 Saved guest rewards for ${player.name}: ${player.stars} stars`);
                }
              } catch (e) {
                console.error('Failed to save guest rewards:', e);
              }
            }
          }
          
          // Reload the active explorer's data to sync local state with backend
          // This prevents the stats sync from overwriting the newly added rewards
          if (activeExplorer?.id) {
            await loadPlayerFromBackend(activeExplorer.id);
          }
        };
        
        distributeRewards();
        
        // Track analytics event (total for the game session)
        import('@/lib/analytics').then(({ trackGameEvent }) => {
          trackGameEvent('game_complete', 'main_game', {
            starsEarned: totalStars,
            completed: true,
            won: totalStars > 0,
          });
        });
     }
  }, [phase]);

  // SETUP: Handle Email Validation & Next Step
  const handleRegistrationNext = async () => {
    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    // Check if email already exists in the database
    try {
      const response = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: contactEmail }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          // Email already registered - prompt to sign in
          setEmailError("This email is already registered. Please sign in to continue playing.");
          return;
        }
      }
    } catch (error) {
      console.error("Error checking email:", error);
      // Continue anyway if check fails - registration will catch duplicates
    }

    // Save guest session data BEFORE calling login (so it's available for signup autofill)
    // This must happen before login() sets the user context
    const guestSessionData = {
      parentName: contactName,
      parentEmail: contactEmail,
      playerNames: [], // Will be populated when game starts
      timestamp: Date.now(),
    };
    console.log('[Game] Saving initial guest session data:', guestSessionData);
    localStorage.setItem('geoquest_guest_session', JSON.stringify(guestSessionData));
    
    // Sync with global user context if not logged in
    if (!user) {
       // We'll register them as a guest user with email
       // This ensures "Home" knows who they are
       login(contactName, contactEmail, undefined, []); 
    }

    setEmailError("");
    setSetupStep("COUNT");
  };

  // Helper: Save rewards to offline queue for later sync
  const saveOfflineRewards = async (explorerId: string, playerName: string, rewards: { stars: number, cardIds: string[], gamesPlayed: boolean }) => {
    try {
      const queueKey = 'geoquest_offline_rewards_queue';
      const existingQueue = localStorage.getItem(queueKey);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      // Generate unique ID for this queue entry to enable precise deletion
      const entryId = `${explorerId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      queue.push({
        id: entryId,
        explorerId,
        playerName,
        rewards,
        timestamp: Date.now(),
      });
      
      localStorage.setItem(queueKey, JSON.stringify(queue));
      console.log(`📦 Saved offline rewards for ${playerName}: ${rewards.stars} stars (entry: ${entryId})`);
      
      // Update local explorer state immediately if this is the active explorer
      // This ensures stars and cards appear in the UI right away even when offline
      if (activeExplorer && activeExplorer.id === explorerId) {
        const currentStars = activeExplorer.starsEarnedTotal || 0;
        const currentCards = (activeExplorer.collectedCardIds as string[]) || [];
        const currentGames = activeExplorer.gamesPlayed || 0;
        const newCardIds = rewards.cardIds || [];
        
        updateActiveExplorerStats({
          starsEarnedTotal: currentStars + rewards.stars,
          collectedCardIds: newCardIds.length > 0 
            ? Array.from(new Set([...currentCards, ...newCardIds]))
            : currentCards,
          gamesPlayed: rewards.gamesPlayed ? currentGames + 1 : currentGames,
        });
        console.log(`🔄 Updated local explorer state: +${rewards.stars} stars, +${newCardIds.length} cards`);
      }
      
      // If we're online, try to sync immediately after a short delay (retry mechanism)
      if (navigator.onLine) {
        setTimeout(async () => {
          try {
            const response = await fetch(`/api/players/${explorerId}/add-game-rewards`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(rewards),
            });
            
            if (response.ok) {
              // Remove from queue on success using unique entry ID
              const currentQueue = localStorage.getItem(queueKey);
              if (currentQueue) {
                const parsedQueue = JSON.parse(currentQueue);
                const updatedQueue = parsedQueue.filter((item: any) => item.id !== entryId);
                if (updatedQueue.length > 0) {
                  localStorage.setItem(queueKey, JSON.stringify(updatedQueue));
                } else {
                  localStorage.removeItem(queueKey);
                }
              }
              console.log(`✅ Retry succeeded for ${playerName}: ${rewards.stars} stars (entry: ${entryId})`);
            }
          } catch (retryError) {
            console.log(`⏳ Retry failed for ${playerName}, will sync later`);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to save offline rewards:', error);
    }
  };

  // Sync offline rewards when coming back online
  useEffect(() => {
    const syncOfflineRewards = async () => {
      if (!navigator.onLine) return;
      
      const queueKey = 'geoquest_offline_rewards_queue';
      const existingQueue = localStorage.getItem(queueKey);
      if (!existingQueue) return;
      
      let queue;
      try {
        queue = JSON.parse(existingQueue);
      } catch {
        console.error('Failed to parse offline rewards queue');
        localStorage.removeItem(queueKey);
        return;
      }
      if (!queue || queue.length === 0) return;
      
      console.log(`🔄 Syncing ${queue.length} offline rewards...`);
      const failedItems: any[] = [];
      
      for (const item of queue) {
        try {
          const response = await fetch(`/api/players/${item.explorerId}/add-game-rewards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.rewards),
          });
          
          if (response.ok) {
            // Successfully synced - item is automatically removed by not adding to failedItems
            console.log(`✅ Synced offline rewards for ${item.playerName}: ${item.rewards.stars} stars${item.id ? ` (entry: ${item.id})` : ' (legacy)'}`);
          } else {
            // Failed - keep for retry
            failedItems.push(item);
          }
        } catch (error) {
          console.error(`Failed to sync rewards for ${item.playerName}:`, error);
          failedItems.push(item);
        }
      }
      
      // Save failed items back to queue, or clear if all succeeded
      if (failedItems.length > 0) {
        localStorage.setItem(queueKey, JSON.stringify(failedItems));
      } else {
        localStorage.removeItem(queueKey);
        // Reload explorer data to show updated stats
        if (activeExplorer?.id) {
          await loadPlayerFromBackend(activeExplorer.id);
        }
      }
    };
    
    // Sync on mount and when coming online
    syncOfflineRewards();
    
    const handleOnline = () => {
      console.log('📶 Back online - syncing offline rewards...');
      syncOfflineRewards();
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [activeExplorer?.id, loadPlayerFromBackend]);

  // SETUP: Handle Player Count Selection
  const handlePlayerCountSelect = (count: number) => {
    setPlayerCount(count);
    
    // Pre-fill with explorer names from the account (up to count)
    // IMPORTANT: Active explorer is ALWAYS the first player
    const names = Array(count).fill("");
    
    // Always use active explorer as first player
    if (activeExplorer?.name) {
      names[0] = activeExplorer.name;
    }
    
    // Fill remaining slots with other explorers (excluding active one)
    if (explorers.length > 0 && count > 1) {
      const otherExplorers = explorers.filter(e => e.id !== activeExplorer?.id);
      for (let i = 1; i < count && i - 1 < otherExplorers.length; i++) {
        names[i] = otherExplorers[i - 1].name;
      }
    }
    
    setPlayerNames(names);
    setNameErrors([]);
    setSetupStep("NAMES");
  };

  // SETUP: Handle Name Input
  const handleNameChange = (index: number, value: string) => {
    const newNames = [...playerNames];
    newNames[index] = value;
    setPlayerNames(newNames);

    // Live duplicate detection
    const newErrors = [...nameErrors];
    const trimmed = value.trim().toLowerCase();
    if (trimmed) {
      const isDuplicate = newNames.some((n, i) => i !== index && n.trim().toLowerCase() === trimmed);
      newErrors[index] = isDuplicate ? "This explorer is already playing the game, use someone else." : "";
    } else {
      newErrors[index] = "";
    }
    // Also clear errors on other fields that may have flagged this same value
    newNames.forEach((n, i) => {
      if (i !== index && n.trim().toLowerCase() === trimmed && !newErrors[i]?.startsWith("This explorer")) {
        // leave them; their error will clear when they change their own field
      } else if (i !== index && newErrors[i] === "This explorer is already playing the game, use someone else.") {
        // recheck if this other field is still a duplicate
        const stillDup = newNames.some((m, j) => j !== i && m.trim().toLowerCase() === n.trim().toLowerCase() && n.trim() !== "");
        if (!stillDup) newErrors[i] = "";
      }
    });
    setNameErrors(newErrors);
  };

  // Helper: Match player name to an explorer from the account
  const matchNameToExplorer = (name: string): string | null => {
    const normalizedName = name.trim().toLowerCase();
    // Try exact match first
    const exactMatch = explorers.find(e => e.name.toLowerCase() === normalizedName);
    if (exactMatch) return exactMatch.id;
    
    // Try partial match (name contains or is contained in explorer name)
    const partialMatch = explorers.find(e => 
      e.name.toLowerCase().includes(normalizedName) || 
      normalizedName.includes(e.name.toLowerCase())
    );
    if (partialMatch) return partialMatch.id;
    
    return null;
  };

  // SETUP: Proceed to confirmation step
  const handleProceedToConfirm = () => {
    if (playerNames.some(name => !name.trim())) {
      toast.error("Please enter the name of the explorer");
      return;
    }

    // Duplicate name check (case-insensitive)
    const lowerNames = playerNames.map(n => n.trim().toLowerCase());
    const duplicates = lowerNames.filter((n, i) => lowerNames.indexOf(n) !== i);
    if (duplicates.length > 0) {
      const newErrors = playerNames.map((n, i) =>
        lowerNames.filter(m => m === n.trim().toLowerCase()).length > 1
          ? "This explorer is already playing the game, use someone else."
          : ""
      );
      setNameErrors(newErrors);
      toast.error("Each explorer must have a unique name.");
      return;
    }
    
    // For logged-in users, check if any players are new (not matching existing explorers)
    if (user) {
      const newPlayers: { index: number; name: string; choice: 'family' | 'invite' | null; email?: string }[] = [];
      
      playerNames.forEach((name, idx) => {
        if (name.trim()) {
          const explorerId = matchNameToExplorer(name);
          if (!explorerId) {
            // This is a new player not in the family
            newPlayers.push({ index: idx, name: name.trim(), choice: null });
          }
        }
      });
      
      // If there are new players, show choice modal for the first one
      if (newPlayers.length > 0) {
        setPendingNewPlayers(newPlayers);
        setNewPlayerIndex(0);
        setNewPlayerEmail("");
        setNewPlayerEmailError("");
        setShowNewPlayerChoice(true);
        return;
      }
    }
    
    setSetupStep("CONFIRM");
  };
  
  // Handle new player choice: Add to Family
  const handleAddToFamily = () => {
    if (newPlayerIndex === null) return;
    
    const updatedPending = [...pendingNewPlayers];
    updatedPending[newPlayerIndex] = { ...updatedPending[newPlayerIndex], choice: 'family' };
    setPendingNewPlayers(updatedPending);
    
    // Move to next new player or proceed to confirm
    if (newPlayerIndex < pendingNewPlayers.length - 1) {
      setNewPlayerIndex(newPlayerIndex + 1);
      setNewPlayerEmail("");
      setNewPlayerEmailError("");
    } else {
      setShowNewPlayerChoice(false);
      setSetupStep("CONFIRM");
    }
  };
  
  // Handle new player choice: Create Own Account (send invite)
  const handleSendInvite = async () => {
    if (newPlayerIndex === null) return;
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newPlayerEmail.trim()) {
      setNewPlayerEmailError("Please enter an email address");
      return;
    }
    if (!emailRegex.test(newPlayerEmail)) {
      setNewPlayerEmailError("Please enter a valid email address");
      return;
    }
    
    const currentPlayer = pendingNewPlayers[newPlayerIndex];
    
    try {
      // Create pending transfer record and send invitation email
      const response = await fetch('/api/pending-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include session cookie for authentication
        body: JSON.stringify({
          email: newPlayerEmail,
          playerName: currentPlayer.name,
          invitedByUserId: user?.id,
          invitedByUserEmail: user?.email,
          invitedByFamilyName: user?.firstName || 'A GeoQuest Family',
        }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Please log in to send invitations');
          return;
        }
        throw new Error('Failed to send invitation');
      }
      
      const result = await response.json();
      
      // Handle both new invites and existing invites
      if (result.alreadyExists) {
        toast.success(`${currentPlayer.name} was already invited - they can join your game!`);
      } else {
        toast.success(`Invitation sent to ${newPlayerEmail}!`);
      }
      
      const updatedPending = [...pendingNewPlayers];
      updatedPending[newPlayerIndex] = { 
        ...updatedPending[newPlayerIndex], 
        choice: 'invite',
        email: newPlayerEmail 
      };
      setPendingNewPlayers(updatedPending);
      
      // Move to next new player or proceed to confirm
      if (newPlayerIndex < pendingNewPlayers.length - 1) {
        setNewPlayerIndex(newPlayerIndex + 1);
        setNewPlayerEmail("");
        setNewPlayerEmailError("");
      } else {
        setShowNewPlayerChoice(false);
        setSetupStep("CONFIRM");
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('Failed to send invitation. Please try again.');
    }
  };

  // SETUP: Start Game (after confirmation)
  const handleStartGame = async () => {
    // If user is already logged in and we skipped the setup/registration forms
    // We need to ensure players are initialized from the user context if the players array is empty
    // This handles the "Welcome Back -> Play" flow where we skip the form
    
    let initialPlayerNames = [...playerNames];
    
    // If we have a user but no names entered (skipped setup), use the user's profile
    if (user && initialPlayerNames.length === 0) {
       // Create a single player entry for the user by default, or use their registered kids if available
       if (user.registeredPlayers && user.registeredPlayers.length > 0) {
          initialPlayerNames = user.registeredPlayers.map(p => p.name);
       } else {
          initialPlayerNames = [user.username];
       }
       // Also update player count to match
       setPlayerCount(Math.max(2, initialPlayerNames.length)); // Minimum 2 for game logic usually, or fill with bots/dummy
       
       // If we only have 1 human player, we need at least 2 for the game to work well (based on current logic)
       // So let's pad with "Player 2" if needed
       if (initialPlayerNames.length < 2) {
          initialPlayerNames.push("Player 2");
       }
    }

    if (playerNames.some(name => !name.trim())) {
      toast.error("Please enter the name of the explorer");
      return;
    }

    // Shuffle prefixes to ensure uniqueness
    const shuffledPrefixes = [...PLAYER_PREFIXES].sort(() => Math.random() - 0.5);

    // Create players with explorer ID linking
    const newPlayers: Player[] = await Promise.all(initialPlayerNames.map(async (name, index) => {
      let displayName = name.trim();
      
      // Auto-fill logged in user for Player 1 if empty
      if (index === 0 && !displayName && user) {
        displayName = user.username;
      }
      
      // Assign unique prefix
      const prefix = shuffledPrefixes[index % shuffledPrefixes.length];
      const finalName = displayName || `${prefix} ${index + 1}`;
      
      // Check if user added prefix already
      const hasPrefix = PLAYER_PREFIXES.some(p => finalName.startsWith(p));
      const nameWithPrefix = hasPrefix ? finalName : `${prefix} ${finalName}`;

      // Match to explorer or create new one for logged-in users without explorers
      let explorerId: string | null = matchNameToExplorer(displayName);
      
      // Check if this player was invited to create their own account (don't create explorer for them)
      const pendingPlayer = pendingNewPlayers.find(p => p.name === displayName);
      const wasInvited = pendingPlayer?.choice === 'invite';
      
      // If user is logged in and no explorer match, auto-create explorer
      // But skip creation for invited players - they should remain as guests
      if (!explorerId && user && displayName && !wasInvited) {
        try {
          const newExplorer = await createExplorer({
            name: displayName,
            userId: user.id,
            profileType: 'kid',
            ageRange: '6-9',
          });
          if (newExplorer) {
            explorerId = newExplorer.id;
          }
        } catch (error) {
          console.error('Failed to auto-create explorer:', error);
        }
      }

      return {
        id: index + 1,
        name: nameWithPrefix,
        stars: 0,
        avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
        isTurn: index === 0,
        collectedCards: [],
        completedMissions: [],
        skipNextTurn: false,
        peekNextCard: false,
        explorerId: explorerId,
        invitedEmail: wasInvited ? pendingPlayer?.email : null,
      };
    }));

    // Shuffle player order randomly at the start of each game
    // This ensures fair turn distribution - whoever entered first doesn't always go first
    const shuffledPlayers = [...newPlayers]
      .map((player, index) => ({ player, sortKey: Math.random() }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ player }, newIndex) => ({
        ...player,
        id: newIndex + 1,
        isTurn: newIndex === 0,
      }));
    
    console.log('[Game] Shuffled player order:', shuffledPlayers.map(p => p.name.replace(/^(Explorer |Traveler |Adventurer |Voyager |Navigator |Scout |Ranger |Captain )/, '')));
    
    setPlayers(shuffledPlayers);
    setTurnIndex(0);
    
    // Update guest session data with player names (for signup auto-population)
    try {
      const savedSession = localStorage.getItem('geoquest_guest_session');
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        // Add player names to the session
        sessionData.playerNames = initialPlayerNames.filter(n => n.trim() && n !== contactName);
        sessionData.playerDetails = newPlayers.map(p => ({
          name: p.name,
          index: p.id - 1,
        }));
        console.log('[Game] Updated guest session with player names:', sessionData);
        localStorage.setItem('geoquest_guest_session', JSON.stringify(sessionData));
      }
    } catch (e) {
      console.error('Failed to update guest session:', e);
    }
    
    // Initialize Deck based on game mode
    // Explorer Mode: 42 original Guess & Go cities (LOCATION_CARDS)
    // World Champion Mode: All 101 cities (42 original + 59 Daily Quest exclusive)
    const cityPool = gameMode === "WORLD_CHAMPION" ? ALL_GUESS_AND_GO_CITIES : LOCATION_CARDS;
    const initialDeck = [...cityPool].sort(() => Math.random() - 0.5);
    console.log(`[Game] Initialized ${gameMode} mode with ${initialDeck.length} cities`);
    setDeck(initialDeck);
    
    // Initialize Event Deck
    let availableEvents = [...EVENT_CARDS];

    // Single Player Adjustments: Replace multiplayer/turn-based cards with penalties
    if (newPlayers.length === 1) {
        const lostLuggage = EVENT_CARDS.find(c => c.id === "evt_lost_luggage")!;
        const wrongTurn = EVENT_CARDS.find(c => c.id === "evt_wrong_turn")!;

        availableEvents = availableEvents.map(card => {
            // Replace "Draw 1 extra" (Upgrade) with "Discard 1" (Wrong Turn)
            if (card.id === "evt_flight_upgrade") {
                return { ...wrongTurn, id: "evt_wrong_turn_replaced_1", name: wrongTurn.name + " (Bad Luck)" };
            }
            // Replace "Skip action" (Delay) with "Lose 1 star" (Lost Luggage)
            if (card.id === "evt_flight_delay") {
                return { ...lostLuggage, id: "evt_lost_luggage_replaced_1", name: lostLuggage.name + " (Delay)" };
            }
            // Also replace Steal (Friendly Local) as it requires opponents
            if (card.id === "evt_friendly_local") {
                 return { ...lostLuggage, id: "evt_lost_luggage_replaced_2", name: lostLuggage.name + " (Scam)" };
            }
            // Replace "Rainy Day" (Others gain) with "Lose 1 star" (Bad luck just for you)
            if (card.id === "evt_rainy_day") {
                return { ...lostLuggage, id: "evt_lost_luggage_replaced_3", name: lostLuggage.name + " (Downpour)" };
            }
            return card;
        });
    }

    const initialEventDeck = availableEvents.sort(() => Math.random() - 0.5);
    setEventDeck(initialEventDeck);

    setDiscardPile([]);
    
    setPhase("DRAW");
  };

  // Effect to pre-fill user info if logged in (but still show mode selection first)
  useEffect(() => {
     if (user && phase === "SETUP") {
        // Pre-fill user info but keep MODE_SELECT as the first step
        // User should always choose game mode before proceeding
        setContactName(user.username);
        setContactEmail(user.email || "");
        // Keep on MODE_SELECT - do not auto-skip to COUNT
     }
  }, [user, phase]);

  // Check for completed missions
  const checkMissions = (player: Player) => {
    let missionCompleted = null;
    let updatedActiveMissions = [...activeMissions];
    
    for (let i = 0; i < activeMissions.length; i++) {
      const mission = activeMissions[i];
      const matchingCards = player.collectedCards.filter(
        card => card.missionLinked === mission.name || card.secondaryMissionLinked === mission.name
      );

      if (matchingCards.length >= 2) {
        missionCompleted = mission;
        const remainingMissions = MISSION_CARDS.filter(
          m => !activeMissions.find(am => am.id === m.id) && !player.completedMissions.find(cm => cm.id === m.id)
        );
        
        updatedActiveMissions = updatedActiveMissions.filter(m => m.id !== mission.id);
        if (remainingMissions.length > 0) {
          updatedActiveMissions.push(remainingMissions[0]);
        }
        break; 
      }
    }
    return { missionCompleted, updatedActiveMissions };
  };

  // Game Logic: Start Turn / Draw Card
  const handleDrawCard = () => {
    let currentDeck = [...deck];
    let currentDiscard = [...discardPile];

    // Handle Empty Deck
    if (currentDeck.length === 0) {
       if (currentDiscard.length === 0) {
          // Should be rare given 42 cards
          toast.error("All cards have been played!");
          return;
       }
       // Reshuffle discard into deck
       toast.info("Reshuffling the deck with discard pile...");
       currentDeck = currentDiscard.sort(() => Math.random() - 0.5);
       currentDiscard = [];
       setDiscardPile([]);
    }

    // Avoid consecutive continent/country cards
    let nextCardIndex = currentDeck.length - 1;
    
    if (lastPlayedCard && currentDeck.length > 1) {
       // Try to find a card that is DIFFERENT continent and DIFFERENT country
       // Iterate backwards to find first valid one from the top
       for (let i = currentDeck.length - 1; i >= 0; i--) {
           const candidate = currentDeck[i];
           if (candidate.continent !== lastPlayedCard.continent && 
               candidate.country !== lastPlayedCard.country) {
               nextCardIndex = i;
               break;
           }
       }
    }

    const [nextCard] = currentDeck.splice(nextCardIndex, 1);
    setDeck(currentDeck);
    setCurrentCard(nextCard || null);
    
    // Always use Level 1 clues (base 'clues' array) for simplicity
    // Level 2 & 3 clues (cluesAlt, cluesAlt2) are disabled per user feedback
    if (nextCard) {
      setActiveClueSet('clues');
    }
    
    // Check if player has Peek ability active
    if (currentPlayer.peekNextCard) {
       // Peek at the NEW top card (which is at the end of the array)
       const peekCard = currentDeck.length > 0 ? currentDeck[currentDeck.length - 1] : null;
       setNextCardPreview(peekCard);
       // Reset peek flag immediately so it's used up
       const updatedPlayers = [...players];
       updatedPlayers[turnIndex] = { ...currentPlayer, peekNextCard: false };
       setPlayers(updatedPlayers);
    }

    setPhase("CHOOSE_DIFFICULTY");
    setSelectedDifficulty(null);
    setRevealedClueIndices([]);
    setExtraClueUsed(false);
    setClueCost(0);
    setGuessInput("");
    setEmptyGuessCount(0);
    setIsCorrect(null);
    setBonusWon(null);
    setCurrentEvent(null);
    setJustCompletedMission(null);
    setShowEmptyGuessAlert(false);
    setRetryMessage(null);
    setTypoRetryCount(0);
    setShowVisualClue(false);
  };

  const [highlightCloseButton, setHighlightCloseButton] = useState(false);
  const handleEventBackgroundClick = () => {
     setHighlightCloseButton(true);
     setTimeout(() => setHighlightCloseButton(false), 1000);
  };

  const handleSelectDifficulty = (difficulty: Difficulty) => {
    if (currentPlayer.lockedDifficulty === difficulty) {
       toast.error(`This clue is locked because you got it wrong last turn! It will unlock next time.`);
       soundManager.playError();
       return;
    }
    setSelectedDifficulty(difficulty);
    setPhase("SHOW_CLUE");
    setExtraClueUsed(false);
    
    if (difficulty === "EASY") setRevealedClueIndices([0]);
    if (difficulty === "MEDIUM") setRevealedClueIndices([1]);
    if (difficulty === "HARD") setRevealedClueIndices([2]);
  };

  const handleExtraClue = (index: number) => {
    if (extraClueUsed) return; // Double check logic
    setRevealedClueIndices([...revealedClueIndices, index]);
    setExtraClueUsed(true);
    
    // Clue 0 (Continent) is FREE.
    // Extra clues are also FREE now per request.
    // if (index !== 0) {
    //    setClueCost(1);
    // }
  };

      const [suggestion, setSuggestion] = useState<string | null>(null);

      // Speech Recognition for voice input
      const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
          toast.error("Sorry, your browser doesn't support voice input. Try typing instead!");
          return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsListening(true);
          soundManager.playClick();
        };
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setGuessInput(transcript);
          setIsListening(false);
          if (showEmptyGuessAlert) setShowEmptyGuessAlert(false);
          toast.success(`Got it: "${transcript}"`);
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'no-speech') {
            toast.info("I didn't hear anything. Try again!");
          } else if (event.error === 'not-allowed') {
            toast.error("Microphone access denied. Please allow microphone access and try again.");
          } else {
            toast.error("Couldn't understand that. Try speaking again!");
          }
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
        recognition.start();
      };
      
      const stopListening = () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          setIsListening(false);
        }
      };

      const handleSubmitGuess = () => {
        if (!currentCard || !selectedDifficulty) return;
    
        // Empty Guess Check
        if (!guessInput.trim()) {
          if (emptyGuessCount === 0) {
            setShowEmptyGuessAlert(true);
            setEmptyGuessCount(1);
            return;
          }
        }
    
        let correctAnswer = "";
        if (selectedDifficulty === "EASY") correctAnswer = currentCard.continent;
        if (selectedDifficulty === "MEDIUM") correctAnswer = currentCard.country;
        if (selectedDifficulty === "HARD") correctAnswer = currentCard.city;
    
        const result = isCloseEnough(guessInput, correctAnswer);
    
        if (result === "EXACT") {
          handleCorrectGuess();
        } else if (result === "CLOSE") {
          // Logic for close guesses
          if (typoRetryCount < 2) { // Allow up to 2 retries for close guesses
             setRetryMessage(`You're so close! Did you mean "${correctAnswer}"?`);
             setSuggestion(correctAnswer);
             setTypoRetryCount(prev => prev + 1);
             return;
          } else {
             handleIncorrectGuess();
          }
        } else {
           // Check for partial correctness (Broader answer)
           // e.g. Difficulty=HARD (City), Answer=Country or Continent
           const isCountry = isCloseEnough(guessInput, currentCard.country);
           const isContinent = isCloseEnough(guessInput, currentCard.continent);
           // Check for narrower answer (More specific than asked)
           // e.g. Difficulty=EASY (Continent), Answer=City
           const isCity = isCloseEnough(guessInput, currentCard.city);
    
           if (selectedDifficulty === "HARD") {
             if (isCountry === "EXACT" || isCountry === "CLOSE") {
                if (typoRetryCount < 2) {
                  setRetryMessage("That's the correct Country! But we need the City name. Try again!");
                  setTypoRetryCount(prev => prev + 1);
                  return;
                }
             }
             if (isContinent === "EXACT" || isContinent === "CLOSE") {
                if (typoRetryCount < 2) {
                   setRetryMessage("That's the correct Continent! Can you guess the City?");
                   setTypoRetryCount(prev => prev + 1);
                   return;
                }
             }
           }
           
           if (selectedDifficulty === "MEDIUM") {
              if (isContinent === "EXACT" || isContinent === "CLOSE") {
                 if (typoRetryCount < 2) {
                    setRetryMessage("That's the correct Continent! Can you name the Country?");
                    setTypoRetryCount(prev => prev + 1);
                    return;
                 }
              }
              if (isCity === "EXACT" || isCity === "CLOSE") {
                 if (typoRetryCount < 2) {
                    setRetryMessage("That's the correct City! But we only need the Country name.");
                    setTypoRetryCount(prev => prev + 1);
                    return;
                 }
              }
           }
    
           if (selectedDifficulty === "EASY") {
              if (isCountry === "EXACT" || isCountry === "CLOSE") {
                 if (typoRetryCount < 2) {
                    setRetryMessage("That's the correct Country! But we need the Continent name.");
                    setTypoRetryCount(prev => prev + 1);
                    return;
                 }
              }
              if (isCity === "EXACT" || isCity === "CLOSE") {
                 if (typoRetryCount < 2) {
                    setRetryMessage("That's the correct City! But we need the Continent name.");
                    setTypoRetryCount(prev => prev + 1);
                    return;
                 }
              }
           }
    
           // Lock this difficulty for next turn (Penalty)
           const updatedPlayers = [...players];
           updatedPlayers[turnIndex] = { ...currentPlayer, lockedDifficulty: selectedDifficulty };
           setPlayers(updatedPlayers);

           handleIncorrectGuess();
        }
        
        // Play appropriate sound for incorrect guess
        if (result === "WRONG") {
           soundManager.playError();
        }
      };

  const handleCorrectGuess = () => {
    // Instead of finishing turn immediately, start Bonus Round
    if (!currentCard) return;
    
    setIsCorrect(true);
    setShowEmptyGuessAlert(false);
    setRetryMessage(null);
    
    // Clear any locked difficulty (Success resets penalties)
    const updatedPlayers = [...players];
    updatedPlayers[turnIndex] = { ...currentPlayer, lockedDifficulty: null };
    setPlayers(updatedPlayers);

    soundManager.playSuccess();

    // Check for Auto-Win Bonus (Smooth Sailing Event)
    if (currentPlayer.autoWinBonus) {
       // Consume the power-up
       const updatedPlayers = [...players];
       updatedPlayers[turnIndex] = { ...currentPlayer, autoWinBonus: false };
       setPlayers(updatedPlayers);

       confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 }, colors: ['#FFD700'] });
       toast.success("Smooth Sailing! Auto-won Bonus Round! ⭐", { duration: 4000, icon: '⛵' });
       
       // Skip straight to finalizing with +1 bonus star
       finalizeTurn(1);
       return;
    }

    // Speak the fun fact immediately after correct guess (if not muted)
    if (currentCard && !isAutoSpeechMuted) {
        // Play Greeting Audio
        if (currentCard.greetingAudio) {
           soundManager.speak(currentCard.greetingAudio);
        } else {
           soundManager.playSuccess(); // Fallback if no greeting
        }

        setTimeout(() => {
            soundManager.speak(`Did you know? ${currentCard.didYouKnow}`);
        }, 2000); // Delay to let greeting finish
    }

    // Prepare Bonus Round
    // Use SVG format for more reliable loading on mobile
    const getReliableFlagUrl = (url: string) => {
      const match = url.match(/flagcdn\.com\/\w+\/([a-z]{2})\.png/i);
      if (match) {
        return `https://flagcdn.com/${match[1].toLowerCase()}.svg`;
      }
      return url;
    };
    const correctOption = { country: currentCard.country, flagUrl: getReliableFlagUrl(currentCard.flagUrl) };
    
    // Force Flag Bonus Round (Map Bonus Removed as per request)
    // const isMapBonus = Math.random() > 0.5; 
    const isMapBonus = false;

    if (isMapBonus) {
        // MAP BONUS ROUND SETUP
        /* Local getMapUrl removed, using imported getCityMapUrl */

        const correctMapOption = { country: currentCard.country, mapUrl: getCityMapUrl(currentCard.city, currentCard.country) };
        
        // Get 3 random wrong options (unique countries)
        const otherCards = LOCATION_CARDS.filter(c => c.country !== currentCard.country);
        const shuffledOthers = [...otherCards].sort(() => Math.random() - 0.5);
        
        const uniqueWrongOptions: { country: string, mapUrl: string }[] = [];
        const seenCountries = new Set();
        
        for (const card of shuffledOthers) {
           if (!seenCountries.has(card.country)) {
              uniqueWrongOptions.push({ country: card.country, mapUrl: getCityMapUrl(card.city, card.country) });
              seenCountries.add(card.country);
           }
           if (uniqueWrongOptions.length >= 3) break;
        }
        
        const options = [correctMapOption, ...uniqueWrongOptions].sort(() => Math.random() - 0.5);
        setMapBonusOptions(options);
        setSelectedBonusOption(null);
        setBonusWon(null);
        setPhase("MAP_BONUS_ROUND");

    } else {
        // FLAG BONUS ROUND SETUP (Existing)
        // Fix: Filter by both country name AND flag URL to handle country name variants (e.g., "USA" vs "United States")
        const correctFlagUrl = getReliableFlagUrl(currentCard.flagUrl);
        const otherCards = LOCATION_CARDS.filter(c => 
          c.country !== currentCard.country && getReliableFlagUrl(c.flagUrl) !== correctFlagUrl
        );
        const shuffledOthers = [...otherCards].sort(() => Math.random() - 0.5);
        
        const uniqueWrongOptions: { country: string, flagUrl: string }[] = [];
        const seenCountries = new Set<string>();
        const seenFlagUrls = new Set<string>();
        
        for (const card of shuffledOthers) {
           const cardFlagUrl = getReliableFlagUrl(card.flagUrl);
           // Ensure unique country AND unique flag (prevents same flag appearing twice)
           if (!seenCountries.has(card.country) && !seenFlagUrls.has(cardFlagUrl)) {
              uniqueWrongOptions.push({ country: card.country, flagUrl: cardFlagUrl });
              seenCountries.add(card.country);
              seenFlagUrls.add(cardFlagUrl);
           }
           if (uniqueWrongOptions.length >= 3) break;
        }
        
        const options = [correctOption, ...uniqueWrongOptions].sort(() => Math.random() - 0.5);
        setBonusOptions(options);
        setSelectedBonusOption(null);
        setBonusWon(null);
        setPhase("BONUS_ROUND");
    }
  };

  const handleBonusGuess = (selectedCountry: string) => {
      // Safe check for current card
      if (!currentCard || selectedBonusOption) return;

      setSelectedBonusOption(selectedCountry);
      const isBonusCorrect = selectedCountry === currentCard.country;
      
      if (isBonusCorrect) {
          setBonusWon(true);
          soundManager.playSuccess();
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 }, colors: ['#FFD700'] });
          // toast.success("Correct Flag! +1 Bonus Star! ⭐", { duration: 3000, icon: '🏳️' });
      } else {
          setBonusWon(false);
          soundManager.playError();
          // toast.error(`Oops! That was wrong.`, { duration: 3000 });
      }
  };

  const handleBonusContinue = () => {
     finalizeTurn(bonusWon ? 1 : 0);
  };

  const handleStampComplete = () => {
     // 30% Chance for a random Animal Encounter! (Viral Fun Factor)
     if (Math.random() < 0.3) {
        // Small delay for suspense
        setTimeout(() => {
           toast.info("🌿 A wild animal approaches! 🐾", { duration: 3000 });
           startAnimalBonusRound();
        }, 500);
     } else {
        nextTurn();
     }
  };
  
  const startAnimalBonusRound = () => {
      // Pick a random animal card
      const randomAnimal = ANIMAL_CARDS[Math.floor(Math.random() * ANIMAL_CARDS.length)];
      
      // Generate options (Correct + 2 Wrong Countries/Continents)
      const isContinentGuess = randomAnimal.continent === "Antarctica";
      
      let options: string[] = [];
      if (isContinentGuess) {
          options = ["Antarctica", "Africa", "Asia"]; // Simple static wrong options for prototype
      } else {
          const correct = randomAnimal.country!;
          // Fix: Use Set to ensure unique countries (prevents duplicates from multiple animals in same country)
          const uniqueWrongCountries: string[] = [];
          const seenCountries = new Set<string>();
          const shuffledAnimals = [...ANIMAL_CARDS].sort(() => Math.random() - 0.5);
          
          for (const animal of shuffledAnimals) {
              if (animal.country && animal.country !== correct && !seenCountries.has(animal.country)) {
                  uniqueWrongCountries.push(animal.country);
                  seenCountries.add(animal.country);
              }
              if (uniqueWrongCountries.length >= 2) break;
          }
          options = [correct, ...uniqueWrongCountries];
      }
      
      setAnimalOptions(options.sort(() => Math.random() - 0.5));
      setCurrentAnimalCard(randomAnimal);
      setAnimalBonusWon(false);
      setWrongAnimalGuesses([]);
      
      // Save encountered animal to the current player's explorer album
      const currentPlayerExplorerId = players[turnIndex]?.explorerId;
      if (currentPlayerExplorerId) {
        fetch(`/api/players/${currentPlayerExplorerId}/encountered-animals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ animalId: randomAnimal.id }),
        }).catch(err => console.error('Failed to save encountered animal:', err));
      }
      
      // Check if this is the first animal bonus round for this user
      const userKey = user ? (user.email || user.username) : "guest";
      const animalTutorialKey = `geoquest_animal_tutorial_seen_${userKey}`;
      const hasSeenAnimalTutorial = localStorage.getItem(animalTutorialKey);
      
      if (!hasSeenAnimalTutorial) {
          setShowAnimalTutorial(true);
          localStorage.setItem(animalTutorialKey, 'true');
      }
      
      setPhase("ANIMAL_BONUS");
  };

  const handleAnimalGuess = (guess: string) => {
      if (!currentAnimalCard) return;
      
      const isCorrect = (currentAnimalCard.continent === "Antarctica" && guess === "Antarctica") || 
                        (currentAnimalCard.country === guess);
      
      if (isCorrect) {
          soundManager.playSuccess();
          confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
          setAnimalBonusWon(true);
          
          // Add bonus star immediately
          // REMOVED: Animal Bonus is just for fun now! No stars.
          // const updatedPlayers = [...players];
          // updatedPlayers[turnIndex].stars = Math.min(10, updatedPlayers[turnIndex].stars + 1);
          // setPlayers(updatedPlayers);
          toast.success("Animal Friend Found! 🐾");

          // REMOVED: Victory check not needed if no stars awarded here
          /*
          if (updatedPlayers[turnIndex].stars >= 10) {
             setTimeout(() => {
                setPhase("GAME_OVER");
                if (user && updatedPlayers[turnIndex].name.includes(user.username)) {
                   recordGameResult(updatedPlayers[turnIndex].stars, true);
                }
             }, 1500); 
             return;
          }
          */
      } else {
          soundManager.playError();
          setAnimalBonusWon(false);
          setWrongAnimalGuesses(prev => [...prev, guess]);
      }
  };

  const handleAnimalContinue = () => {
      nextTurn();
  };

  // State to track stars earned in the current turn for display
  const [lastTurnStars, setLastTurnStars] = useState(0);

  const finalizeTurn = (bonusStars: number) => {
    setPhase("REVEAL_RESULT");

    let starsEarned = 0;
    
    // Base Stars from Difficulty
    if (selectedDifficulty === "EASY") starsEarned = 1;
    if (selectedDifficulty === "MEDIUM") starsEarned = 2;
    if (selectedDifficulty === "HARD") starsEarned = 3;

    // Deduct for Extra Clue (if any paid clue was used)
    // REMOVED: Extra clues are free now
    // if (clueCost > 0) {
    //    starsEarned = Math.max(0, starsEarned - clueCost);
    // }

    // Add Bonus Stars (Add, don't replace or ignore!)
    starsEarned += bonusStars;

    

    // Set display state
    setLastTurnStars(starsEarned);
    setLastPlayedCard(currentCard);

    let updatedPlayer = { 
      ...currentPlayer, 
      stars: currentPlayer.stars + starsEarned,  // No cap - players earn their actual stars
      collectedCards: [...currentPlayer.collectedCards, currentCard!] 
    };
    
    // Track city for end-of-day recap
    if (currentCard) {
      recordCityExplored(currentCard.city, currentCard.country, currentCard.continent);
    }

    // --- USER CONTEXT SYNC ---
    // If the current player matches the logged-in user, update persistent stats
    if (user && updatedPlayer.name.includes(user.username)) {
       addCollectedCard(currentCard!.id);
       awardPassportStar(currentCard!.id, 1);
       addStars(starsEarned);

       // CHECK ACHIEVEMENTS
       ACHIEVEMENTS.forEach(ach => {
          if (unlockedAchievementIds.includes(ach.id)) return;

          let unlocked = false;
          if (ach.conditionType === "STARS" && updatedPlayer.stars >= ach.threshold) unlocked = true;
          if (ach.conditionType === "COLLECTION" && updatedPlayer.collectedCards.length >= ach.threshold) unlocked = true;
          if (ach.conditionType === "MISSIONS" && updatedPlayer.completedMissions.length >= ach.threshold) unlocked = true;

          if (unlocked) {
             unlockAchievement(ach.id);
             setNewlyUnlockedAchievement(ach);
             soundManager.playFanfare();
             confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 }, colors: ['#FFD700', '#87CEEB', '#FFFFFF'] });
          }
       });
    }
    // -------------------------

    // Check if this card creates FIRST progress on any mission (1/2) and show tutorial
    const missionTutorialShown = localStorage.getItem('geoquest_mission_tutorial_shown');
    if (!missionTutorialShown && currentCard) {
      for (const mission of activeMissions) {
        const matchingCards = updatedPlayer.collectedCards.filter(
          card => card.missionLinked === mission.name || card.secondaryMissionLinked === mission.name
        );
        // If exactly 1 matching card (the one we just added), trigger tutorial
        if (matchingCards.length === 1 && 
            (currentCard.missionLinked === mission.name || currentCard.secondaryMissionLinked === mission.name)) {
          setMissionTutorialMission(mission);
          setMissionTutorialPlayer(updatedPlayer.name);
          setMissionTutorialStep(0);
          setShowMissionTutorial(true);
          localStorage.setItem('geoquest_mission_tutorial_shown', 'true');
          break;
        }
      }
    }

    const { missionCompleted, updatedActiveMissions } = checkMissions(updatedPlayer);
    
    if (missionCompleted) {
      updatedPlayer.stars = updatedPlayer.stars + 2;  // No cap for mission bonus
      updatedPlayer.completedMissions = [...updatedPlayer.completedMissions, missionCompleted];
      setActiveMissions(updatedActiveMissions);
      setJustCompletedMission(missionCompleted);
      
      // Sync Mission Stat
      if (user && updatedPlayer.name.includes(user.username)) {
         addMissionCompleted();
         addStars(2);
      }
    }

    const updatedPlayers = [...players];
    updatedPlayers[turnIndex] = updatedPlayer;
    setPlayers(updatedPlayers);

    if (updatedPlayer.stars >= 10) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setPhase("GAME_OVER");
      
      // Sync Game Played Stat
      const isUser = user ? updatedPlayer.name.includes(user.username) : (turnIndex === 0);
      
      if (isUser) {
         recordGameResult(updatedPlayer.stars, true);
      } else {
         // Even if someone else wins, we count it as a game played
         recordGameResult(0, false);
      }

      // Pre-order popup disabled for now - can be re-enabled in the future
      // setTimeout(() => setShowPreOrderPopup(true), 1500);
      
      return; 
    }
    
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, colors: ['#FFD700', '#FFA500'] });

    if (missionCompleted) {
       // Trigger ANIMAL BONUS ROUND after Mission Complete
       setTimeout(() => {
         setPhase("MISSION_COMPLETE");
         confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: ['#FFD700', '#FF0000', '#00FF00', '#0000FF'] });
         
         setTimeout(() => {
             startAnimalBonusRound();
         }, 3000);
       }, 2000);
    } 
    // Removed auto-nextTurn here to allow manual "Continue"
  };

  const handleIncorrectGuess = () => {
    setIsCorrect(false);
    setPhase("REVEAL_RESULT");
    setShowEmptyGuessAlert(false);
    setRetryMessage(null);

    // Add back to discard pile so it can be reshuffled later
    if (currentCard) {
      setDiscardPile(prev => [...prev, currentCard]);
    }
  };

  const closeEventAnimation = () => {
      setShowEventAnimation(false);
      // Don't clear event or next turn yet - let the user see the event card
      // and click "Continue Journey" to trigger the effect
  };

  const handleDrawEventCard = () => {
      let currentDeck = [...eventDeck];
      
      // Fallback if deck is somehow empty or exhausted, re-init
      if (currentDeck.length === 0) {
          currentDeck = [...EVENT_CARDS].sort(() => Math.random() - 0.5);
      }

      // Find first valid card based on "smart filtering"
      let selectedIndex = -1;
      
      for (let i = 0; i < currentDeck.length; i++) {
          const card = currentDeck[i];
          let isValid = true;
          
          if (currentPlayer.stars === 0 && card.effect.includes("Lose 1")) isValid = false;
          if (currentPlayer.collectedCards.length === 0 && card.effect.includes("Discard")) isValid = false;
          
          if (isValid) {
              selectedIndex = i;
              break;
          }
      }
      
      // If no "smart" card found (rare), just pick the top one to keep game moving
      if (selectedIndex === -1) {
          selectedIndex = 0;
      }

      const selectedEvent = currentDeck[selectedIndex];
      
      // Remove from current position
      currentDeck.splice(selectedIndex, 1);
      
      // Add to bottom of the pile (cycle it)
      currentDeck.push(selectedEvent);
      
      setEventDeck(currentDeck);
      setCurrentEvent(selectedEvent);
      setRainWipes(0); // Reset rain interaction
      setShowEventAnimation(true);
      setPhase("EVENT");
  };

  const handleEventContinue = () => {
     if (!currentEvent) return;

     let updatedPlayer = { ...currentPlayer };
     let updatedPlayers = [...players];
     let shouldNextTurn = true;

     // Apply Effects
     if (currentEvent.effect.includes("Gain +1")) {
        updatedPlayer.stars = updatedPlayer.stars + 1;  // No cap
     }
     if (currentEvent.effect.includes("Lose 1")) {
        updatedPlayer.stars = Math.max(0, updatedPlayer.stars - 1);
     }
     if (currentEvent.effect.includes("Skip")) {
        updatedPlayer.skipNextTurn = true;
     }
     if (currentEvent.effect.includes("Draw 1 extra")) {
        shouldNextTurn = false;
        setPhase("DRAW");
     }
     if (currentEvent.effect.includes("Peek")) {
        updatedPlayer.peekNextCard = true;
     }
     if (currentEvent.effect.includes("Discard 1")) {
        if (updatedPlayer.collectedCards.length > 0) {
           shouldNextTurn = false;
           setPhase("DISCARD_CHOICE");
           updatedPlayers[turnIndex] = updatedPlayer;
           setPlayers(updatedPlayers);
           return; 
        }
     }
     if (currentEvent.effect.includes("Auto-win Bonus")) {
        updatedPlayer.autoWinBonus = true;
     }
     
     // Friendly Local: Steal 1 star
     if (currentEvent.effect.includes("Steal 1")) {
        const opponents = updatedPlayers.filter((p, idx) => idx !== turnIndex && p.stars > 0);
        
        if (opponents.length > 0) {
            // Show dialog to pick a target
            setStealTargets(opponents);
            setShowStealDialog(true);
            shouldNextTurn = false; // Wait for user interaction
            return; // Exit early, handleStealConfirm will finish turn
        } else {
            toast("No one has stars to steal!", { icon: '🤷' });
        }
     }

     // Rainy Day: Everyone ELSE gains 1 star
     if (currentEvent.effect.includes("Everyone except you gains")) {
        updatedPlayers = updatedPlayers.map((p, idx) => {
           if (idx !== turnIndex) {
              return { ...p, stars: p.stars + 1 };  // No cap
           }
           return p;
        });
        // No change to current player
     }
     // Old logic for "Everyone except you loses" (kept for compatibility if cards revert)
     else if (currentEvent.effect.includes("Everyone except you loses")) {
        updatedPlayers = updatedPlayers.map((p, idx) => {
           if (idx !== turnIndex) {
              return { ...p, stars: Math.max(0, p.stars - 1) };
           }
           return p;
        });
     }

     // Commit changes to current player (if not handled by map above)
     // For "Steal", we modified updatedPlayers array directly for target, and updatedPlayer object for self.
     // We need to make sure updatedPlayer is put back into updatedPlayers
     updatedPlayers[turnIndex] = updatedPlayer;
     setPlayers(updatedPlayers);

     // Victory Check for Event Phase
     if (updatedPlayer.stars >= 10) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setPhase("GAME_OVER");
        
        // Sync Game Played Stat
        if (user && updatedPlayer.name.includes(user.username)) {
           recordGameResult(updatedPlayer.stars, true);
        }
        
        return; // Stop here, don't go to next turn
     }

     if (shouldNextTurn) {
        nextTurn();
     }
  };

  const handleStealConfirm = (targetId: number) => {
     const updatedPlayers = [...players];
     const targetIndex = updatedPlayers.findIndex(p => p.id === targetId);
     const currentPlayerIndex = turnIndex;

     if (targetIndex !== -1) {
        const targetName = updatedPlayers[targetIndex].name;
        // Remove star from target
        updatedPlayers[targetIndex] = { 
           ...updatedPlayers[targetIndex], 
           stars: Math.max(0, updatedPlayers[targetIndex].stars - 1) 
        };
        
        // Add star to current player
        updatedPlayers[currentPlayerIndex] = { 
           ...updatedPlayers[currentPlayerIndex], 
           stars: updatedPlayers[currentPlayerIndex].stars + 1  // No cap
        };

        setPlayers(updatedPlayers);
        toast.success(`Stole 1⭐ from ${targetName}!`);
     }
     
     setShowStealDialog(false);
     
     // Check victory condition after stealing
     if (updatedPlayers[currentPlayerIndex].stars >= 10) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setPhase("GAME_OVER");
        
        if (user && updatedPlayers[currentPlayerIndex].name.includes(user.username)) {
           recordGameResult(updatedPlayers[currentPlayerIndex].stars, true);
        }
        return;
     }

     nextTurn();
  };

  const handleDiscardCard = (cardId: string) => {
     const updatedPlayer = { ...currentPlayer };
     updatedPlayer.collectedCards = updatedPlayer.collectedCards.filter(c => c.id !== cardId);
     
     const updatedPlayers = [...players];
     updatedPlayers[turnIndex] = updatedPlayer;
     setPlayers(updatedPlayers);
     
     nextTurn();
  };

  const handleMissionCompleteAck = () => nextTurn();

  const nextTurn = () => {
    setPhase("DRAW");
    setCurrentCard(null);
    setCurrentEvent(null);
    setJustCompletedMission(null);
    setNextCardPreview(null);

    let nextIndex = (turnIndex + 1) % players.length;
    let nextPlayer = players[nextIndex];

    if (nextPlayer.skipNextTurn) {
      const updatedPlayers = [...players];
      updatedPlayers[nextIndex] = { ...nextPlayer, skipNextTurn: false };
      setPlayers(updatedPlayers);

      nextIndex = (nextIndex + 1) % players.length;
      setTurnIndex(nextIndex);
    } else {
      setTurnIndex(nextIndex);
    }
  };

  // Get the clues array based on the active clue set (rotates between clues, cluesAlt, cluesAlt2)
  const getCurrentClues = (): string[] => {
    if (!currentCard) return [];
    // Access the clue set dynamically, fallback to main clues if alt set is missing or incomplete
    const clueArray = currentCard[activeClueSet];
    if (clueArray && clueArray.length === 3) {
      return clueArray;
    }
    // For Daily Quest cities that have 2-item clues but 3-item cluesAlt (proper 3-tier structure)
    // Fall back to cluesAlt which has the continent→country→city format
    if (currentCard.cluesAlt && currentCard.cluesAlt.length === 3) {
      return currentCard.cluesAlt;
    }
    // Final fallback to main clues (may have fewer than 3)
    return currentCard.clues || [];
  };

  // Render Clue Text (Filtering based on difficulty)
  const renderClueText = (text: string) => {
    if (!currentCard) return text;

    let filteredText = text;

    // Simple replacement to hide answers
    if (selectedDifficulty === "EASY") {
       const continentRegex = new RegExp(currentCard.continent, "gi");
       filteredText = filteredText.replace(continentRegex, "this continent");
    }
    if (selectedDifficulty === "MEDIUM") {
       const countryRegex = new RegExp(currentCard.country, "gi");
       filteredText = filteredText.replace(countryRegex, "this country");
    }
    if (selectedDifficulty === "HARD") {
       const cityRegex = new RegExp(currentCard.city, "gi");
       filteredText = filteredText.replace(cityRegex, "this city");
    }

    return filteredText;
  };

  if (phase === "SETUP") {
    // Show loading state while checking authentication
    if (isAuthLoading && setupStep === "REGISTRATION") {
      return (
        <div className="min-h-screen w-full bg-cover bg-center bg-fixed flex flex-col items-center justify-center relative font-sans"
             style={{ backgroundImage: `url(${bgImage})` }}>
           <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/80 backdrop-blur-[2px]" />
           <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">Loading...</p>
           </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen w-full bg-cover bg-center bg-fixed flex flex-col items-center justify-center relative font-sans overflow-x-hidden overflow-y-auto py-8"
           style={{ backgroundImage: `url(${bgImage})` }}>
         <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/80 backdrop-blur-[2px]" />
         
         <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="relative z-10 bg-white/90 dark:bg-gray-800/95 p-8 rounded-[2rem] shadow-2xl max-w-2xl w-full mx-4 border-4 border-white dark:border-gray-700"
         >
           <h1 className="text-4xl font-heading text-center text-primary dark:text-blue-400 mb-2">Welcome to GeoQuest!</h1>
           <p className="text-center text-gray-600 dark:text-gray-300 mb-8 text-xl italic">Explore the world, one clue at a time.</p>

           {setupStep === "MODE_SELECT" && (
             <div className="flex flex-col gap-6">
               <div className="relative flex items-center justify-center">
                  <Button 
                     variant="ghost" 
                     className="absolute left-0 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 -ml-2"
                     onClick={goHome}
                  >
                     <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <h3 className="text-xl font-bold text-center text-gray-700 dark:text-gray-200">Choose Your Adventure</h3>
               </div>
               
               <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
                 {/* Explorer Mode - 42 cities */}
                 <motion.button
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => {
                     setGameMode("EXPLORER");
                     setSetupStep("COUNT");
                   }}
                   className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl p-6 text-left shadow-lg border-b-4 border-blue-700 hover:border-b-2 transition-all"
                   data-testid="button-mode-explorer"
                 >
                   <div className="flex items-center gap-4">
                     <span className="text-4xl">🌍</span>
                     <div>
                       <h4 className="text-xl font-bold">Explorer Mode</h4>
                       <p className="text-blue-100 text-sm">42 amazing cities to discover</p>
                       <p className="text-blue-200 text-xs mt-1">Perfect for beginners!</p>
                     </div>
                   </div>
                 </motion.button>

                 {/* World Champion Mode - 101 cities */}
                 <motion.button
                   whileHover={WORLD_CHAMPION_MODE_ENABLED ? { scale: 1.02 } : {}}
                   whileTap={WORLD_CHAMPION_MODE_ENABLED ? { scale: 0.98 } : {}}
                   onClick={() => {
                     if (WORLD_CHAMPION_MODE_ENABLED) {
                       setGameMode("WORLD_CHAMPION");
                       setSetupStep("COUNT");
                     }
                   }}
                   className={cn(
                     "rounded-2xl p-6 text-left shadow-lg border-b-4 transition-all relative overflow-hidden",
                     WORLD_CHAMPION_MODE_ENABLED 
                       ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-700 hover:border-b-2 cursor-pointer"
                       : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed"
                   )}
                   disabled={!WORLD_CHAMPION_MODE_ENABLED}
                   data-testid="button-mode-world-champion"
                 >
                   <div className="flex items-center gap-4">
                     <span className="text-4xl">{WORLD_CHAMPION_MODE_ENABLED ? "🏆" : "🔒"}</span>
                     <div>
                       <h4 className="text-xl font-bold flex items-center gap-2">
                         World Champion
                         {!WORLD_CHAMPION_MODE_ENABLED && (
                           <span className="text-xs bg-gray-400 dark:bg-gray-600 text-white px-2 py-0.5 rounded-full">Coming Soon</span>
                         )}
                       </h4>
                       <p className={cn("text-sm", WORLD_CHAMPION_MODE_ENABLED ? "text-purple-100" : "text-gray-500 dark:text-gray-400")}>
                         101 cities from around the world
                       </p>
                       <p className={cn("text-xs mt-1", WORLD_CHAMPION_MODE_ENABLED ? "text-purple-200" : "text-gray-400 dark:text-gray-500")}>
                         For geography experts!
                       </p>
                     </div>
                   </div>
                   {!WORLD_CHAMPION_MODE_ENABLED && (
                     <div className="absolute inset-0 bg-gray-300/30 dark:bg-gray-800/30" />
                   )}
                 </motion.button>
               </div>
             </div>
           )}

           {setupStep === "REGISTRATION" && (
             <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
               <div className="relative flex items-center justify-center mb-2">
                  <Button 
                     variant="ghost" 
                     className="absolute left-0 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 -ml-2"
                     onClick={() => setSetupStep("MODE_SELECT")}
                  >
                     <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <h3 className="text-xl font-bold text-center text-gray-700 dark:text-gray-200">Who is starting this adventure?</h3>
               </div>
               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Your Name</label>
                    <Input 
                      placeholder="Enter your name" 
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="h-12 text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Email Address</label>
                    <Input 
                      type="email"
                      placeholder="Enter your email" 
                      value={contactEmail}
                      onChange={(e) => {
                         setContactEmail(e.target.value);
                         setEmailError(""); // Clear error on change
                      }}
                      className={cn("h-12 text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600", emailError && "border-red-500 focus-visible:ring-red-500")}
                    />
                    {emailError && (
                      <div className="space-y-2">
                        <p className="text-sm text-red-500 font-medium flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" /> {emailError}
                        </p>
                        {emailError.includes("already registered") && (
                          <Button 
                            variant="link" 
                            className="text-blue-600 underline p-0 h-auto text-sm"
                            onClick={() => setLocation("/?login=true")}
                            data-testid="link-sign-in"
                          >
                            Click here to Sign In
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
               </div>
               <Button 
                 size="lg" 
                 className="w-full text-xl mt-4 bg-blue-500 hover:bg-blue-600 text-white border-b-4 border-blue-700"
                 onClick={handleRegistrationNext}
                 disabled={!contactName || !contactEmail}
               >
                 Next Step <ArrowRight className="ml-2" />
               </Button>
             </div>
           )}

           {setupStep === "COUNT" && (
             <div className="flex flex-col gap-6">
               <div className="relative flex items-center justify-center">
                  <Button 
                     variant="ghost" 
                     className="absolute left-0 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 -ml-2"
                     onClick={() => {
                       // Go back to mode selection
                       setSetupStep("MODE_SELECT");
                     }}
                  >
                     <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <h3 className="text-xl font-bold text-center text-gray-700 dark:text-gray-200">How many explorers are playing?</h3>
               </div>
               <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto w-full">
                 {[1, 2, 3, 4].map(num => (
                   <Button 
                     key={num}
                     className="h-20 text-2xl font-heading rounded-xl border-b-4 border-blue-700 hover:translate-y-1 hover:border-b-0 transition-all"
                     onClick={() => handlePlayerCountSelect(num)}
                   >
                     {num}
                   </Button>
                 ))}
               </div>
             </div>
           )}

           {setupStep === "NAMES" && (
             <div className="flex flex-col gap-4">
               <div className="relative flex items-center justify-center">
                  <Button 
                     variant="ghost" 
                     className="absolute left-0 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 -ml-2"
                     onClick={() => setSetupStep("COUNT")}
                  >
                     <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <h3 className="text-xl font-bold text-center text-gray-700 dark:text-gray-200">Who is joining the expedition?</h3>
               </div>
               <div className="space-y-3 my-4">
                 {Array.from({ length: playerCount }).map((_, idx) => (
                   <div key={idx} className="flex flex-col gap-1">
                     <div className="flex items-center gap-3">
                       <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm shrink-0", AVATAR_COLORS[idx])}>
                         {idx + 1}
                       </div>
                       <Input 
                         placeholder={`Explorer Name #${idx + 1}`}
                         className={cn("text-lg h-12 bg-white dark:bg-gray-700 text-gray-900 dark:text-white", nameErrors[idx] ? "border-red-400 dark:border-red-500 focus-visible:ring-red-400" : "border-gray-300 dark:border-gray-600")}
                         value={playerNames[idx]}
                         onChange={(e) => handleNameChange(idx, e.target.value)}
                         data-testid={`input-player-name-${idx}`}
                       />
                     </div>
                     {nameErrors[idx] ? (
                       <p className="text-xs text-red-500 font-medium pl-13 ml-13" style={{ paddingLeft: 52 }}>
                         ⚠️ {nameErrors[idx]}
                       </p>
                     ) : null}
                   </div>
                 ))}
               </div>
               <Button 
                 size="lg" 
                 className="w-full text-xl h-16 mt-4 bg-green-500 hover:bg-green-600 border-b-4 border-green-700 text-white"
                 onClick={handleProceedToConfirm}
               >
                 Continue <ArrowRight className="ml-2" />
               </Button>
             </div>
           )}

           {setupStep === "CONFIRM" && (
             <div className="flex flex-col gap-4">
               <div className="relative flex items-center justify-center">
                  <Button 
                     variant="ghost" 
                     className="absolute left-0 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 -ml-2"
                     onClick={() => setSetupStep("NAMES")}
                  >
                     <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <h3 className="text-xl font-bold text-center text-gray-700 dark:text-gray-200">Ready to Play?</h3>
               </div>
               
               <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 my-2">
                 <p className="text-center text-blue-800 dark:text-blue-200 font-medium mb-4">
                   {playerCount} explorer{playerCount > 1 ? 's' : ''} are joining this adventure:
                 </p>
                 <div className="space-y-3">
                   {playerNames.filter(name => name.trim()).map((name, idx) => {
                     const explorerId = matchNameToExplorer(name);
                     const matchedExplorer = explorers.find(e => e.id === explorerId);
                     const pendingPlayer = pendingNewPlayers.find(p => p.name === name.trim());
                     
                     return (
                       <div key={idx} className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm">
                         <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm", AVATAR_COLORS[idx])}>
                           {idx + 1}
                         </div>
                         <div className="flex-1">
                           <p className="font-bold text-gray-800 dark:text-gray-200">{name}</p>
                           {matchedExplorer ? (
                             <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                               <CheckCircle className="w-3 h-3" /> Linked to explorer account
                             </p>
                           ) : pendingPlayer?.choice === 'invite' ? (
                             <p className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1">
                               <Send className="w-3 h-3" /> Invited to create account ({pendingPlayer.email})
                             </p>
                           ) : user ? (
                             <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                               <UserPlus className="w-3 h-3" /> Will create new explorer
                             </p>
                           ) : (
                             <p className="text-xs text-gray-500 dark:text-gray-400">
                               Guest player (stars not saved)
                             </p>
                           )}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>

               <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl border border-yellow-200 dark:border-yellow-800 text-center">
                 <p className="text-sm text-yellow-800 dark:text-yellow-200">
                   <Star className="w-4 h-4 inline mr-1 fill-yellow-500" />
                   Each player earns stars for their own explorer account!
                 </p>
               </div>
               
               <Button 
                 size="lg" 
                 className="w-full text-xl h-16 mt-4 bg-green-500 hover:bg-green-600 border-b-4 border-green-700 text-white"
                 onClick={handleStartGame}
               >
                 Start Adventure! <Play className="ml-2 fill-white" />
               </Button>
             </div>
           )}
         </motion.div>

         {/* NEW PLAYER CHOICE MODAL (Add to Family or Send Invite) - Must be inside SETUP return */}
         <Dialog open={showNewPlayerChoice} onOpenChange={(open) => {
           if (!open) {
             setShowNewPlayerChoice(false);
             setSetupStep("CONFIRM");
           }
         }}>
           <DialogContent className="bg-gradient-to-br from-blue-50 to-teal-50 border-4 border-teal-400 rounded-[2rem] max-w-md p-0 overflow-hidden shadow-2xl [&>button]:hidden">
             <DialogHeader className="bg-gradient-to-r from-teal-500 to-blue-500 p-6 text-center">
               <div className="flex justify-center mb-2">
                 <div className="bg-white/20 p-3 rounded-full">
                   <Users className="w-8 h-8 text-white" />
                 </div>
               </div>
               <DialogTitle className="text-2xl font-heading text-white">
                 New Explorer: {newPlayerIndex !== null && pendingNewPlayers[newPlayerIndex]?.name}
               </DialogTitle>
               <DialogDescription className="text-teal-100">
                 How would you like to add this player?
               </DialogDescription>
             </DialogHeader>
             
             <div className="p-6 space-y-4">
               <div className="text-center mb-4">
                 <p className="text-gray-600">
                   {newPlayerIndex !== null && newPlayerIndex + 1} of {pendingNewPlayers.length} new player{pendingNewPlayers.length > 1 ? 's' : ''}
                 </p>
               </div>
               
               {/* Option 1: Add to Family */}
               <Button
                 onClick={handleAddToFamily}
                 className="w-full h-16 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white font-bold rounded-xl text-lg shadow-lg transform hover:scale-[1.02] transition-all border-b-4 border-teal-700"
                 data-testid="button-add-to-family"
               >
                 <UserPlus className="mr-2 w-5 h-5" /> Add to My Family
                 <span className="block text-xs font-normal opacity-80 ml-2">(max 7 explorers)</span>
               </Button>
               
               <div className="relative">
                 <div className="absolute inset-0 flex items-center">
                   <span className="w-full border-t border-gray-300" />
                 </div>
                 <div className="relative flex justify-center text-xs uppercase">
                   <span className="bg-gradient-to-br from-blue-50 to-teal-50 px-2 text-gray-500">or</span>
                 </div>
               </div>
               
               {/* Option 2: Create Own Account */}
               <div className="space-y-3 bg-white/50 p-4 rounded-xl border border-teal-200">
                 <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                   <Send className="w-4 h-4 text-teal-500" />
                   Invite them to create their own account
                 </p>
                 <Input
                   type="email"
                   placeholder="Enter their email address"
                   value={newPlayerEmail}
                   onChange={(e) => {
                     setNewPlayerEmail(e.target.value);
                     setNewPlayerEmailError("");
                   }}
                   className="h-12 bg-white text-gray-900 border-gray-300"
                   data-testid="input-invite-email"
                 />
                 {newPlayerEmailError && (
                   <p className="text-sm text-red-500 flex items-center gap-1">
                     <AlertCircle className="w-3 h-3" /> {newPlayerEmailError}
                   </p>
                 )}
                 <Button
                   onClick={handleSendInvite}
                   className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl shadow-lg"
                   data-testid="button-send-invite"
                 >
                   <Send className="mr-2 w-4 h-4" /> Send Invitation
                 </Button>
                 <p className="text-xs text-gray-500 text-center">
                   They can play as a guest today and keep their progress when they sign up!
                 </p>
               </div>
               
               {/* Skip button to continue without adding */}
               <Button
                 variant="ghost"
                 onClick={() => {
                   if (newPlayerIndex !== null && newPlayerIndex < pendingNewPlayers.length - 1) {
                     setNewPlayerIndex(newPlayerIndex + 1);
                     setNewPlayerEmail("");
                     setNewPlayerEmailError("");
                   } else {
                     setShowNewPlayerChoice(false);
                     setNewPlayerIndex(null);
                     setPendingNewPlayers([]);
                     setNewPlayerEmail("");
                     setSetupStep("CONFIRM");
                   }
                 }}
                 className="w-full h-10 text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium rounded-xl"
                 data-testid="button-skip-player-invite"
               >
                 Skip for now
               </Button>
             </div>
           </DialogContent>
         </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-cover bg-center bg-fixed flex flex-col relative overflow-x-hidden overflow-y-auto font-sans pt-[env(safe-area-inset-top)]"
         style={{ backgroundImage: `url(${bgImage})` }}>
      
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/80 backdrop-blur-[2px]" />

      {/* Header - Logo and Controls in Flow */}
      <header className="relative z-10 p-4 pt-3 flex justify-between items-start">
        {/* Logo */}
        <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 mt-2 shrink-0">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-yellow-500 shrink-0">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 3L15.5 15L12 13L8.5 15L12 3Z" fill="currentColor" stroke="none"/>
           </svg>
           <h1 className="font-heading text-sm sm:text-base text-primary font-bold tracking-tight whitespace-nowrap">
             GeoQuest <span className="text-yellow-500">Junior</span>
           </h1>
        </div>

        {/* Right Controls Stack */}
        <div className="flex flex-col items-end gap-3 z-50">
           <UserHeader className="static" hideStreakBadges />

           <div className="flex items-center gap-2">
             {/* Auto-Speech Mute Toggle */}
             <Button 
               variant="outline" 
               size="sm" 
               className={cn(
                 "rounded-full px-3 font-bold transition-all shadow-sm",
                 isAutoSpeechMuted 
                   ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600" 
                   : "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border-blue-300 dark:border-blue-700"
               )}
               onClick={toggleAutoSpeechMute}
               data-testid="button-mute-auto-speech"
               title={isAutoSpeechMuted ? "Unmute auto-speech" : "Mute auto-speech"}
             >
               {isAutoSpeechMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
             </Button>

             <Button 
               variant="destructive" 
               size="sm" 
               className="rounded-full px-4 font-bold bg-red-500 hover:bg-red-600 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 transition-all shadow-sm"
               onClick={() => setShowExitConfirm(true)}
             >
               <LogOut className="w-4 h-4 mr-2" />
               Close Game
             </Button>
           </div>
        </div>
      </header>

      {/* Achievement Popup */}
      <Dialog open={!!newlyUnlockedAchievement} onOpenChange={(open) => !open && setNewlyUnlockedAchievement(null)}>
        <DialogContent className="bg-[#fffbec] border-4 border-yellow-400 rounded-3xl max-w-sm text-center overflow-hidden p-0 [&>button]:hidden">
          <div className="bg-yellow-400 p-4">
             <h2 className="text-2xl font-heading text-yellow-900 uppercase tracking-wider">Achievement Unlocked!</h2>
          </div>
          <div className="p-6 flex flex-col items-center">
             <div className="w-20 h-20 bg-white rounded-full shadow-inner flex items-center justify-center text-5xl mb-3 border-4 border-yellow-200 animate-bounce">
                {newlyUnlockedAchievement?.icon}
             </div>
             <h3 className="text-2xl font-bold text-gray-800 mb-1">{newlyUnlockedAchievement?.name}</h3>
             <p className="text-gray-600 font-medium text-sm mb-4">{newlyUnlockedAchievement?.description}</p>
             
             <p className="text-gray-500 text-xs mb-3 uppercase tracking-wide font-bold">Share your achievement:</p>
             
             <div className="grid grid-cols-4 gap-2 w-full mb-4">
               {/* Facebook */}
               <Button
                 onClick={() => {
                   const shareText = `I scored my first star in this cool GeoQuest game! Try it for free here:`;
                   const shareUrl = "https://game.geoquestgame.com";
                   const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
                   requestAccess(() => {
                     window.open(fbUrl, '_blank', 'width=600,height=400');
                     toast.success("Achievement Shared!", { icon: "📸" });
                     setNewlyUnlockedAchievement(null);
                   });
                 }}
                 className="h-14 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl flex flex-col items-center justify-center gap-0.5 border-b-2 border-[#1467D8]"
                 data-testid="share-achievement-facebook"
               >
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
               </Button>

               {/* Instagram */}
               <Button
                 onClick={() => {
                   const shareText = `I scored my first star in this cool GeoQuest game! 🌍⭐ Try it for free here: game.geoquestgame.com`;
                   navigator.clipboard.writeText(shareText);
                   toast.success("Copied! Open Instagram to share", {
                     description: "Paste in your story or post",
                     duration: 4000,
                   });
                   requestAccess(() => {
                     window.open('https://www.instagram.com/', '_blank');
                     setNewlyUnlockedAchievement(null);
                   });
                 }}
                 className="h-14 bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white rounded-xl flex flex-col items-center justify-center gap-0.5 border-b-2 border-[#7B2FAE]"
                 data-testid="share-achievement-instagram"
               >
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
               </Button>

               {/* Twitter/X */}
               <Button
                 onClick={() => {
                   const shareText = `I scored my first star in this cool GeoQuest game! 🌍⭐ Try it for free here:`;
                   const shareUrl = "https://game.geoquestgame.com";
                   const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                   requestAccess(() => {
                     window.open(twitterUrl, '_blank', 'width=600,height=400');
                     toast.success("Achievement Shared!", { icon: "📸" });
                     setNewlyUnlockedAchievement(null);
                   });
                 }}
                 className="h-14 bg-black hover:bg-gray-800 text-white rounded-xl flex flex-col items-center justify-center gap-0.5 border-b-2 border-gray-700"
                 data-testid="share-achievement-twitter"
               >
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
               </Button>

               {/* Text/SMS */}
               <Button
                 onClick={() => {
                   const shareText = `Hey! I scored my first star in this cool GeoQuest game! 🌍⭐ Try it for free here: https://game.geoquestgame.com`;
                   const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                   if (isMobile) {
                     window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
                   } else {
                     navigator.clipboard.writeText(shareText);
                     toast.success("Message copied!", {
                       description: "Paste it anywhere to share",
                       duration: 3000,
                     });
                   }
                   setNewlyUnlockedAchievement(null);
                 }}
                 className="h-14 bg-green-500 hover:bg-green-600 text-white rounded-xl flex flex-col items-center justify-center gap-0.5 border-b-2 border-green-700"
                 data-testid="share-achievement-sms"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
               </Button>
             </div>
             
             <Button variant="ghost" onClick={() => setNewlyUnlockedAchievement(null)} className="text-gray-400 text-sm">
               Maybe Later
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="max-w-sm rounded-2xl border-4 border-orange-200 bg-white [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-heading text-orange-600">
              Leave Adventure?
            </DialogTitle>
            <DialogDescription className="text-center pt-2 font-medium text-slate-600">
              If you leave now, your current game progress will be lost! 
              Are you sure you want to go back to base?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center mt-4">
            <Button variant="outline" onClick={() => setShowExitConfirm(false)} className="rounded-xl border-2">
              Stay & Play
            </Button>
            <Button 
              variant="destructive" 
              className="rounded-xl bg-orange-500 hover:bg-orange-600"
              onClick={goHome}
            >
              Yes, Go Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restart Confirmation Dialog */}
      <Dialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
        <DialogContent className="max-w-sm rounded-2xl border-4 border-blue-200 bg-white [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-heading text-blue-600">
              Restart Game?
            </DialogTitle>
            <DialogDescription className="text-center pt-2 font-medium text-slate-600">
              Do you want to start a fresh game? All current stars and progress will be reset!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center mt-4">
            <Button variant="outline" onClick={() => setShowRestartConfirm(false)} className="rounded-xl border-2">
              Cancel
            </Button>
            <Button 
              className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => window.location.reload()}
            >
              Yes, Restart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mission Tutorial Dialog - Shows when first city of a mission is won */}
      <Dialog open={showMissionTutorial} onOpenChange={() => {}}>
        <DialogContent className="max-w-md rounded-3xl border-4 border-purple-300 bg-gradient-to-b from-purple-50 to-white dark:from-purple-900/80 dark:to-gray-900 [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-heading text-purple-700 dark:text-purple-300 flex items-center justify-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-500" />
              Mission Progress!
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {/* Step 1: What is a Mission Card */}
            {missionTutorialStep === 0 && missionTutorialMission && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-purple-200 dark:border-purple-700 p-4 mb-4 shadow-lg">
                  <h3 className="font-bold text-xl text-purple-700 dark:text-purple-300 mb-3">{missionTutorialMission.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{missionTutorialMission.description}</p>
                </div>
                <p className="text-purple-800 dark:text-purple-200 font-medium text-lg mb-2">
                  This is a <span className="font-bold text-purple-600 dark:text-purple-400">Mission Card!</span>
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Missions are special challenges. Complete them to earn bonus stars!
                </p>
              </motion.div>
            )}

            {/* Step 2: Who earned progress */}
            {missionTutorialStep === 1 && missionTutorialMission && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 rounded-2xl p-4 mb-4 border-2 border-green-300 dark:border-green-700">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                      {missionTutorialPlayer.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-green-700 dark:text-green-300 text-lg">{missionTutorialPlayer}</p>
                      <p className="text-green-600 dark:text-green-400 text-sm">Mission Explorer</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "50%" }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full"
                    />
                  </div>
                  <span className="font-bold text-purple-700 dark:text-purple-300">1/2</span>
                </div>
                <p className="text-purple-800 dark:text-purple-200 font-medium">
                  You're <span className="font-bold">halfway there!</span>
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  Get one more matching city to complete this mission!
                </p>
              </motion.div>
            )}

            {/* Step 3: Stars reward */}
            {missionTutorialStep === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-900/50 rounded-2xl p-6 mb-4 border-2 border-yellow-300 dark:border-yellow-700">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="flex items-center justify-center gap-2 mb-2"
                  >
                    <Star className="w-10 h-10 fill-yellow-500 text-yellow-500 drop-shadow-lg" />
                    <span className="text-5xl font-bold text-yellow-600 dark:text-yellow-400">+2</span>
                    <Star className="w-10 h-10 fill-yellow-500 text-yellow-500 drop-shadow-lg" />
                  </motion.div>
                  <p className="font-bold text-yellow-700 dark:text-yellow-300 text-lg">Bonus Stars!</p>
                </div>
                <p className="text-purple-800 dark:text-purple-200 font-medium text-lg">
                  Complete missions to earn <span className="font-bold text-yellow-600 dark:text-yellow-400">+2 extra stars!</span>
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
                  Keep collecting cities to complete your missions faster!
                </p>
              </motion.div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              {[0, 1, 2].map(step => (
                <div 
                  key={step} 
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    step === missionTutorialStep ? "bg-purple-500" : "bg-gray-300 dark:bg-gray-600"
                  )}
                />
              ))}
            </div>
            <Button
              onClick={() => {
                if (missionTutorialStep < 2) {
                  setMissionTutorialStep(missionTutorialStep + 1);
                } else {
                  setShowMissionTutorial(false);
                  setMissionTutorialStep(0);
                }
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-6 rounded-xl"
            >
              {missionTutorialStep < 2 ? "Next" : "Got it!"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Animal Safari Tutorial Dialog - Shows on first animal bonus round */}
      <Dialog open={showAnimalTutorial} onOpenChange={() => {}}>
        <DialogContent className="max-w-md rounded-3xl border-4 border-amber-300 bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/80 dark:to-gray-900 [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-heading text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2">
              <span className="text-3xl">🦁</span>
              Safari Bonus Round!
              <span className="text-3xl">🐘</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 rounded-2xl p-5 mb-4 border-2 border-amber-300 dark:border-amber-700"
            >
              <div className="text-5xl mb-3">🐾</div>
              <h3 className="font-bold text-lg text-amber-800 dark:text-amber-200 mb-2">
                A Wild Animal Appeared!
              </h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                Animals from around the world will give you clues about where they live!
              </p>
            </motion.div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-amber-200 dark:border-amber-700 mb-4">
              <h4 className="font-bold text-amber-700 dark:text-amber-300 mb-2">How to Play:</h4>
              <ul className="text-left text-gray-700 dark:text-gray-300 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">1.</span>
                  <span>Read the animal's clue about its home</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">2.</span>
                  <span>Guess which country or continent they live in</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">3.</span>
                  <span>Learn fun facts about animals from around the world!</span>
                </li>
              </ul>
            </div>

            <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
              Safari rounds appear randomly after correct guesses - so keep exploring!
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => setShowAnimalTutorial(false)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-3 rounded-xl text-lg shadow-lg border-b-4 border-amber-700"
              data-testid="button-animal-tutorial-got-it"
            >
              Let's Go! 🦁
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fun Facts Card Tutorial Dialog - Shows on first correct answer */}
      <Dialog open={showFunFactsTutorial} onOpenChange={() => {}}>
        <DialogContent className="max-w-md rounded-3xl border-4 border-blue-300 bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/80 dark:to-gray-900 [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-heading text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2">
              <span className="text-3xl">🎉</span>
              Great Job, Explorer!
              <span className="text-3xl">🌍</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 text-center">
            {funFactsTutorialStep === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/50 dark:to-blue-900/50 rounded-2xl p-5 mb-4 border-2 border-blue-300 dark:border-blue-700">
                  <div className="text-5xl mb-3">💡</div>
                  <h3 className="font-bold text-lg text-blue-800 dark:text-blue-200 mb-2">
                    Learn Fun Facts!
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
                    When you get a correct answer, you'll see interesting facts about the city!
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-700 mb-4">
                  <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-3">You can discover:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-xl text-center">
                      <span className="text-2xl">💰</span>
                      <p className="text-xs font-bold text-green-700 dark:text-green-300 mt-1">Currency</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">What money they use</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-xl text-center">
                      <span className="text-2xl">🗣️</span>
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mt-1">Language</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">What they speak</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded-xl text-center">
                      <span className="text-2xl">👥</span>
                      <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mt-1">People</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Population size</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {funFactsTutorialStep === 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-900/50 dark:to-pink-900/50 rounded-2xl p-5 mb-4 border-2 border-orange-300 dark:border-orange-700">
                  <div className="text-5xl mb-3">🌡️</div>
                  <h3 className="font-bold text-lg text-orange-800 dark:text-orange-200 mb-2">
                    Live City Info!
                  </h3>
                  <p className="text-orange-700 dark:text-orange-300 text-sm mb-4">
                    See what's happening right now in that city!
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-orange-200 dark:border-orange-700 mb-4">
                  <h4 className="font-bold text-orange-700 dark:text-orange-300 mb-3">You can see:</h4>
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/30 p-2 rounded-lg">
                      <span className="text-2xl">🌡️</span>
                      <div>
                        <p className="text-sm font-bold text-orange-700 dark:text-orange-300">Temperature</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">How warm or cold it is</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
                      <span className="text-2xl">🕐</span>
                      <div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Local Time</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">What time it is there now</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/30 p-2 rounded-lg">
                      <span className="text-2xl">🎯</span>
                      <div>
                        <p className="text-sm font-bold text-purple-700 dark:text-purple-300">What People Are Doing</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Is it dinner time? Bedtime?</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-orange-600 dark:text-orange-400 text-xs font-medium italic">
                  Note: This only works when you're connected to the internet!
                </p>
              </motion.div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              {(cityLiveInfoAvailable ? [0, 1] : [0]).map(step => (
                <div 
                  key={step} 
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    step === funFactsTutorialStep ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                  )}
                />
              ))}
            </div>
            <Button
              onClick={() => {
                if (funFactsTutorialStep < 1 && cityLiveInfoAvailable) {
                  setFunFactsTutorialStep(1);
                } else {
                  setShowFunFactsTutorial(false);
                  setFunFactsTutorialStep(0);
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 rounded-xl"
              data-testid="button-fun-facts-tutorial-next"
            >
              {funFactsTutorialStep < 1 && cityLiveInfoAvailable ? "Next" : "Got it!"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Steal Star Dialog */}
      <Dialog open={showStealDialog}>
        <DialogContent className="max-w-md rounded-2xl border-4 border-yellow-400 bg-white [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-heading text-yellow-600">
              Sneaky Move! 🤫
            </DialogTitle>
            <DialogDescription className="text-center pt-2 font-medium text-slate-600">
              You must choose a player to steal a star from!
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
             {stealTargets.map(target => (
               <Button
                 key={target.id}
                 variant="outline"
                 className="h-16 flex items-center justify-between px-4 border-2 hover:border-yellow-400 hover:bg-yellow-50 group w-full"
                 onClick={() => handleStealConfirm(target.id)}
               >
                 <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm", target.avatarColor)}>
                       {target.id}
                    </div>
                    <span className="font-bold text-lg text-gray-700 group-hover:text-yellow-700">{target.name}</span>
                 </div>
                 <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold text-yellow-700">{target.stars}</span>
                 </div>
               </Button>
             ))}
          </div>
        </DialogContent>
      </Dialog>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-start p-4 max-w-6xl mx-auto w-full">
        
        {/* Player Dashboard */}
        <PlayerPanel players={players} currentPlayerId={currentPlayer.id} />

        {/* Active Missions Area */}
        <div className="w-full mb-8">
           <div className="flex flex-col md:flex-row items-center justify-center gap-4 px-4 md:px-0 w-full">
              {activeMissions.map(m => {
                // Calculate progress for this mission
                const missionProgress = players.map(p => {
                   const count = p.collectedCards.filter(
                      c => c.missionLinked === m.name || c.secondaryMissionLinked === m.name
                   ).length;
                   return {
                      playerId: p.id,
                      playerName: p.name,
                      playerColor: p.avatarColor,
                      current: count,
                      target: 2 // Hardcoded as per checkMissions logic
                   };
                }).filter(p => p.current > 0).sort((a, b) => b.current - a.current);

                return (
                <motion.div 
                  key={m.id} 
                  whileHover={{ scale: 1.05, rotate: -2 }}
                  className="transform scale-90 md:scale-90 lg:scale-100 transition-transform"
                >
                  <GameCard card={m} missionProgress={missionProgress} />
                </motion.div>
                );
              })}
           </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 w-full flex flex-col items-center justify-start min-h-[400px] pb-8">
          <AnimatePresence mode="wait">
            
            {/* PHASE: DRAW */}
            {phase === "DRAW" && (
              <motion.div 
                key="draw"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                <div className="bg-white/90 p-8 rounded-3xl shadow-2xl border-4 border-white max-w-md mx-auto">
                   <h2 className="text-3xl font-heading text-primary mb-2">
                     {currentPlayer.name}'s Turn!
                   </h2>
                   <p className="text-gray-600 mb-8 text-xl italic">Are you ready for an adventure?</p>
                   
                   <Button 
                     size="lg" 
                     className="w-full text-xl py-8 rounded-2xl shadow-lg hover:scale-105 transition-transform bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-b-4 border-blue-700"
                     onClick={handleDrawCard}
                   >
                     <Globe className="mr-3 w-6 h-6 animate-spin-slow" />
                     Draw Location Card
                   </Button>
                </div>
              </motion.div>
            )}

            {/* PHASE: CHOOSE DIFFICULTY */}
            {phase === "CHOOSE_DIFFICULTY" && currentCard && (
              <motion.div 
                key="difficulty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center gap-8 max-w-4xl"
              >
                 {/* Floating Current Player Indicator - Left Side */}
                 <motion.div
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="fixed top-20 left-4 z-50 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full shadow-lg border-2 border-white/50"
                 >
                   <span className="text-sm font-bold">{currentPlayer.name}'s Turn</span>
                 </motion.div>
                 
                 <div className="flex justify-center">
                   {/* MYSTERY CARD */}
                   <GameCard 
                     card={currentCard} 
                     isMystery={true}
                     isRevealed={false}
                     className="shadow-2xl"
                   />
                 </div>
                 
                 {/* PEEK PREVIEW (If player used Peek ability) */}
                 {nextCardPreview && (
                    <motion.div 
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="absolute top-20 right-4 z-50"
                    >
                       <div className="bg-white/90 p-4 rounded-xl shadow-xl border border-blue-200 max-w-[200px]">
                          <div className="flex items-center mb-2 text-blue-600">
                             <Eye className="w-4 h-4 mr-2" />
                             <h4 className="font-bold text-xs uppercase">Future Sight</h4>
                          </div>
                          <p className="text-xs text-gray-600">The next card in the deck is likely from:</p>
                          <p className="font-bold text-lg text-primary">{nextCardPreview.continent}</p>
                       </div>
                    </motion.div>
                 )}

                 <div className="bg-white/90 p-6 rounded-2xl shadow-xl border border-white/50 w-full max-w-xl text-center">
                    <h3 className="text-xl font-heading text-primary mb-4">Choose Your Challenge!</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Button 
                        className={cn(
                           "h-24 flex flex-col items-center justify-center border-b-4 rounded-xl shadow-md transition-all",
                           currentPlayer.lockedDifficulty === "EASY" 
                              ? "bg-gray-300 border-gray-400 cursor-not-allowed opacity-70 grayscale"
                              : "bg-emerald-500 hover:bg-emerald-600 border-emerald-700 hover:-translate-y-1"
                        )}
                        onClick={() => handleSelectDifficulty("EASY")}
                      >
                        <span className="font-bold text-white text-lg">Easy</span>
                        <span className="text-xs uppercase opacity-90 mt-1 text-emerald-100">Guess Continent</span>
                        <span className="bg-emerald-700 px-2 py-0.5 rounded-full text-[10px] mt-2 text-white">+1⭐</span>
                        {currentPlayer.lockedDifficulty === "EASY" && <span className="absolute top-2 right-2 text-xs">🔒</span>}
                      </Button>
                      <Button 
                        className={cn(
                           "h-24 flex flex-col items-center justify-center border-b-4 rounded-xl shadow-md transition-all",
                           currentPlayer.lockedDifficulty === "MEDIUM" 
                              ? "bg-gray-300 border-gray-400 cursor-not-allowed opacity-70 grayscale"
                              : "bg-blue-500 hover:bg-blue-600 border-blue-700 hover:-translate-y-1"
                        )}
                        onClick={() => handleSelectDifficulty("MEDIUM")}
                      >
                         <span className="font-bold text-white text-lg">Medium</span>
                         <span className="text-xs uppercase opacity-90 mt-1 text-blue-100">Guess Country</span>
                         <span className="bg-blue-700 px-2 py-0.5 rounded-full text-[10px] mt-2 text-white">+2⭐</span>
                         {currentPlayer.lockedDifficulty === "MEDIUM" && <span className="absolute top-2 right-2 text-xs">🔒</span>}
                      </Button>
                      <Button 
                        className={cn(
                           "h-24 flex flex-col items-center justify-center border-b-4 rounded-xl shadow-md transition-all",
                           currentPlayer.lockedDifficulty === "HARD" 
                              ? "bg-gray-300 border-gray-400 cursor-not-allowed opacity-70 grayscale"
                              : "bg-purple-500 hover:bg-purple-600 border-purple-700 hover:-translate-y-1"
                        )}
                        onClick={() => handleSelectDifficulty("HARD")}
                      >
                         <span className="font-bold text-white text-lg">Hard</span>
                         <span className="text-xs uppercase opacity-90 mt-1 text-purple-100">Guess City</span>
                         <span className="bg-purple-700 px-2 py-0.5 rounded-full text-[10px] mt-2 text-white">+3⭐</span>
                         {currentPlayer.lockedDifficulty === "HARD" && <span className="absolute top-2 right-2 text-xs">🔒</span>}
                      </Button>
                    </div>
                 </div>
              </motion.div>
            )}

            {/* PHASE: SHOW CLUE & GUESS */}
            {phase === "SHOW_CLUE" && currentCard && (
              <motion.div 
                key="clue"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center gap-8 max-w-4xl"
              >
                 {/* Floating Current Player Indicator - Left Side */}
                 <motion.div
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="fixed top-20 left-4 z-50 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full shadow-lg border-2 border-white/50"
                 >
                   <span className="text-sm font-bold">{currentPlayer.name}'s Turn</span>
                 </motion.div>
                 
                 <div className="flex justify-center">
                   {/* MYSTERY CARD STILL SHOWN */}
                   <GameCard 
                     card={currentCard} 
                     isMystery={true}
                     isRevealed={false}
                     className="shadow-2xl"
                   />
                 </div>

                 <div className="bg-white/90 p-6 rounded-2xl shadow-xl border border-white/50 w-full max-w-xl">
                    <div className="space-y-4 mb-6">
                      {revealedClueIndices.map((clueIndex) => (
                        <motion.div 
                          key={clueIndex}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-blue-50 p-4 rounded-xl border border-blue-100"
                        >
                          <div className="flex items-center mb-2">
                            <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
                            <h3 className="font-bold text-blue-800 uppercase text-sm tracking-wider">
                              {clueIndex === 0 ? "Continent Clue (Easy)" : clueIndex === 1 ? "Country Clue (Medium)" : "City Clue (Hard)"}
                            </h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto h-6 w-6 p-0 rounded-full hover:bg-blue-100"
                              onClick={() => {
                                  if (isSpeaking) {
                                      soundManager.stopSpeaking();
                                  } else {
                                      soundManager.speak(renderClueText(getCurrentClues()[clueIndex]));
                                  }
                              }}
                            >
                               {isSpeaking ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-blue-500" />}
                            </Button>
                          </div>
                          <p className="text-xl font-heading text-blue-900 leading-tight">
                            "{renderClueText(getCurrentClues()[clueIndex])}"
                          </p>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* EXTRA CLUE OPTIONS */}
                    {(!extraClueUsed && revealedClueIndices.length < 3) ? (
                      <div className="mb-6 pt-4 border-t border-gray-200">
                        <p className="text-center text-sm text-gray-500 mb-3 font-bold uppercase">Need help? Open more clues!</p>
                        <div className="flex flex-wrap gap-3 justify-center">
                          {!extraClueUsed && !revealedClueIndices.includes(0) && (
                            <Button 
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              onClick={() => handleExtraClue(0)}
                            >
                              <HelpCircle className="w-4 h-4 mr-2" /> Open Continent Clue (Easy)
                            </Button>
                          )}
                          {!extraClueUsed && !revealedClueIndices.includes(1) && (
                            <Button 
                              variant="outline"
                              className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                              onClick={() => handleExtraClue(1)}
                            >
                              <HelpCircle className="w-4 h-4 mr-2" /> Open Country Clue (Medium)
                            </Button>
                          )}
                          {!extraClueUsed && !revealedClueIndices.includes(2) && (
                            <Button 
                              variant="outline"
                              className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                              onClick={() => handleExtraClue(2)}
                            >
                              <HelpCircle className="w-4 h-4 mr-2" /> Open City Clue (Hard)
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* VISUAL CLUE DISPLAY - REMOVED PER REQUEST */}
                    
                    {/* RETRY MESSAGE */}
                    {retryMessage && (
                       <motion.div 
                         initial={{ opacity: 0, y: -10 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="bg-yellow-100 border-2 border-yellow-400 p-3 rounded-xl mb-4 flex items-center"
                       >
                          <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <p className="text-yellow-800 font-bold text-sm">{retryMessage}</p>
                          {suggestion && (
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="ml-auto bg-white/50 hover:bg-white text-yellow-900 border-yellow-300"
                               onClick={() => {
                                  setGuessInput(suggestion);
                                  setSuggestion(null);
                                  // Focus input if possible, or just let them hit enter
                               }}
                             >
                               Fill it in!
                             </Button>
                          )}
                       </motion.div>
                    )}

                    <div className="space-y-4">
                       <p className="text-center text-sm font-medium text-gray-500">Type your guess or tap the mic to speak!</p>
                       <div className="flex gap-2">
                         <div className="relative flex-1">
                           <Input 
                             placeholder="Type your guess here..." 
                             className="h-12 text-lg bg-white pr-12"
                             value={guessInput}
                             onChange={(e) => {
                                setGuessInput(e.target.value);
                                if (showEmptyGuessAlert) setShowEmptyGuessAlert(false);
                             }}
                             onKeyDown={(e) => e.key === "Enter" && handleSubmitGuess()}
                             data-testid="input-guess"
                           />
                           <Button
                             type="button"
                             variant="ghost"
                             size="icon"
                             className={cn(
                               "absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full transition-all",
                               isListening 
                                 ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse" 
                                 : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                             )}
                             onClick={isListening ? stopListening : startListening}
                             data-testid="button-voice-input"
                           >
                             {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                           </Button>
                         </div>
                         <Button 
                           className="h-12 px-6 bg-green-500 hover:bg-green-600 text-white border-b-4 border-green-700"
                           onClick={handleSubmitGuess}
                           data-testid="button-reveal"
                         >
                           <Sparkles className="mr-2 w-4 h-4" />
                           Reveal!
                         </Button>
                       </div>
                       {isListening && (
                         <p className="text-center text-sm text-blue-600 font-medium animate-pulse">
                           🎤 Listening... Say your answer!
                         </p>
                       )}
                    </div>
                 </div>

                 {/* Empty Guess Alert Dialog */}
                 <Dialog open={showEmptyGuessAlert} onOpenChange={setShowEmptyGuessAlert}>
                   <DialogContent className="bg-white border-4 border-blue-200 rounded-2xl max-w-sm text-center [&>button]:hidden">
                     <DialogHeader>
                       <DialogTitle className="text-2xl font-heading text-blue-600 text-center">
                         Don't be shy! 🤔
                       </DialogTitle>
                     </DialogHeader>
                     <div className="py-4">
                       <p className="text-lg text-gray-700 font-medium">
                         Give it your best guess! Even if you're not sure, exploring is about trying.
                       </p>
                     </div>
                     <Button onClick={() => setShowEmptyGuessAlert(false)} className="bg-blue-500 text-white w-full rounded-xl">
                       Okay, I'll try!
                     </Button>
                   </DialogContent>
                 </Dialog>
              </motion.div>
            )}

            {/* PHASE: BONUS ROUND */}
            {phase === "BONUS_ROUND" && currentCard && (
              <motion.div 
                key="bonus"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center w-full max-w-4xl"
              >
                 <div className="bg-white/90 backdrop-blur-md p-8 rounded-[2rem] shadow-2xl border-4 border-yellow-400 w-full text-center relative overflow-hidden">
                    {/* Confetti / Shine Effect Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-100/50 via-white/50 to-yellow-100/50 opacity-50" />
                    
                    <div className="relative z-10">
                      <div className="inline-flex items-center justify-center bg-yellow-100 text-yellow-700 px-4 py-1 rounded-full text-sm font-bold mb-4 border border-yellow-200 shadow-sm">
                         <Star className="w-4 h-4 mr-2 fill-yellow-500 text-yellow-500" /> BONUS ROUND
                      </div>

                      <h2 className="text-4xl font-heading text-gray-800 mb-2">Guess the Flag!</h2>
                      <p className="text-gray-600 text-lg mb-8 font-medium">
                        Which flag belongs to <span className="text-blue-600 font-bold">{currentCard.country}</span>?
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                         {bonusOptions.map((option, idx) => {
                            const isSelected = selectedBonusOption === option.country;
                            const isCorrect = option.country === currentCard.country;
                            
                            let cardStyle = "bg-white border-gray-100 hover:border-blue-400";
                            if (selectedBonusOption) {
                               if (isCorrect) {
                                  cardStyle = "bg-green-50 border-green-500 ring-4 ring-green-200 scale-105 z-10";
                               } else if (isSelected && !isCorrect) {
                                  cardStyle = "bg-red-50 border-red-500 ring-4 ring-red-200 opacity-80";
                               } else {
                                  cardStyle = "bg-gray-50 border-gray-200 opacity-40 grayscale";
                               }
                            }

                            return (
                            <motion.button
                              key={idx}
                              whileHover={!selectedBonusOption ? { scale: 1.05, y: -5 } : {}}
                              whileTap={!selectedBonusOption ? { scale: 0.95 } : {}}
                              disabled={!!selectedBonusOption}
                              className={`p-2 rounded-xl shadow-md border-2 transition-all flex flex-col items-center gap-2 group relative ${cardStyle}`}
                              onClick={() => handleBonusGuess(option.country)}
                            >
                               <div className="w-full aspect-[3/2] rounded-lg overflow-hidden border border-gray-200 relative bg-gradient-to-br from-gray-50 to-gray-100">
                                  <img 
                                    src={option.flagUrl}
                                    alt={`Flag of ${option.country}`}
                                    className="w-full h-full object-cover"
                                    loading="eager"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      // Try PNG fallback if SVG fails
                                      const match = target.src.match(/flagcdn\.com\/([a-z]{2})\.svg/i);
                                      if (match) {
                                        target.src = `https://flagcdn.com/w160/${match[1].toLowerCase()}.png`;
                                      } else {
                                        // Hide image and show fallback
                                        target.style.display = 'none';
                                        const fallback = target.parentElement?.querySelector('.flag-fallback');
                                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                      }
                                    }}
                                  />
                                  <div className="flag-fallback absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 items-center justify-center hidden">
                                    <span className="text-xl font-bold text-blue-600">
                                      {option.flagUrl.match(/flagcdn\.com\/(?:w\d+\/)?([a-z]{2})\./i)?.[1]?.toUpperCase() || '🏳️'}
                                    </span>
                                  </div>
                                  {!selectedBonusOption && <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />}
                               </div>
                               {selectedBonusOption && isCorrect && (
                                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-md">
                                     <CheckCircle className="w-5 h-5" />
                                  </div>
                               )}
                               {selectedBonusOption && isSelected && !isCorrect && (
                                  <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md">
                                     <XCircle className="w-5 h-5" />
                                  </div>
                               )}
                            </motion.button>
                            );
                         })}
                      </div>
                      
                      {selectedBonusOption && (
                         <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 mb-6"
                         >
                            <div className={`mb-6 font-bold text-xl flex items-center justify-center gap-2 ${bonusWon ? 'text-green-600' : 'text-red-500'}`}>
                               {bonusWon 
                                  ? <span>🎉 Correct! You earned a bonus star!</span> 
                                  : <span>❌ Oops! The correct flag is highlighted in green.</span>}
                            </div>
                            <Button 
                               size="lg"
                               onClick={handleBonusContinue}
                               className={`text-xl px-8 py-6 rounded-xl shadow-lg ${
                                  bonusWon 
                                  ? 'bg-green-500 hover:bg-green-600 text-white border-b-4 border-green-700 active:border-b-0 active:translate-y-1' 
                                  : 'bg-blue-500 hover:bg-blue-600 text-white border-b-4 border-blue-700 active:border-b-0 active:translate-y-1'
                               }`}
                            >
                               Continue Journey <ArrowRight className="ml-2" />
                            </Button>
                         </motion.div>
                      )}

                      {!selectedBonusOption && (
                        <div className="bg-blue-50 rounded-xl p-3 inline-block">
                           <p className="text-blue-800 text-sm font-bold flex items-center">
                             <Lightbulb className="w-4 h-4 mr-2" />
                             Get it right for an extra star!
                           </p>
                        </div>
                      )}
                    </div>
                 </div>
              </motion.div>
            )}

            {/* PHASE: REVEAL RESULT */}
            {phase === "REVEAL_RESULT" && currentCard && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
              >
                <div className="flex gap-8 items-center mb-8 relative">
                   {/* FLIP TO REVEALED CARD */}
                   <div className="relative">
                       <GameCard 
                         card={currentCard} 
                         isRevealed={true} 
                         className="shadow-2xl scale-110"
                       />
                       {/* Pronunciation Button */}
                       <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 }}
                          className="absolute -right-16 top-1/2 transform -translate-y-1/2 z-50"
                       >
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full w-12 h-12 bg-white shadow-lg hover:bg-blue-50 border-2 border-blue-200 group"
                            onClick={() => {
                                if (isSpeaking) {
                                    soundManager.stopSpeaking();
                                } else {
                                    soundManager.speak(currentCard.city);
                                }
                            }}
                          >
                            {isSpeaking ? <VolumeX className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" /> : <Volume2 className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />}
                          </Button>
                          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-[10px] font-bold text-blue-600 whitespace-nowrap bg-white/90 px-2 py-1 rounded-full shadow-sm border border-blue-100">
                             Hear it!
                          </div>
                       </motion.div>
                   </div>
                   
                   {/* Floating guess bubble if they typed one */}
                   {guessInput && (
                     <motion.div 
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="absolute -right-40 top-10 bg-white p-3 rounded-xl rounded-bl-none shadow-lg border border-gray-200 max-w-[150px]"
                     >
                       <p className="text-xs text-gray-400 uppercase font-bold">You guessed:</p>
                       <p className="font-heading text-lg text-primary truncate">{guessInput}</p>
                     </motion.div>
                   )}
                </div>

                  <div className="flex flex-col items-center w-full max-w-md">
                    {isCorrect ? (
                      <motion.div 
                        initial={{ scale: 0, rotate: -10 }} 
                        animate={{ scale: 1, rotate: 0 }}
                        className="bg-yellow-100 text-yellow-800 p-6 rounded-3xl shadow-xl border-4 border-yellow-400 w-full mb-6 text-center relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-full h-full bg-white/40 opacity-50 pointer-events-none" />
                        <div className="relative z-10">
                           <h2 className="text-4xl font-heading mb-2 text-yellow-600 drop-shadow-sm">Spectacular!</h2>
                           <p className="text-xl font-bold opacity-90 mb-2">
                             +{lastTurnStars} Stars Earned!
                           </p>
                           
                           {bonusWon !== null && (
                             <div className="mb-3 text-sm font-bold bg-white/50 py-1 px-3 rounded-full inline-block">
                               {bonusWon ? "✅ Bonus Round Won (+1⭐)" : "❌ Bonus Round Missed"}
                             </div>
                           )}

                           <p className="text-sm opacity-75">Collecting card...</p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }}
                        className="bg-red-50 text-red-800 p-6 rounded-3xl shadow-xl border-4 border-red-200 w-full mb-6 text-center"
                      >
                        <h2 className="text-3xl font-heading mb-2">Good Try!</h2>
                        <p className="mb-2 text-lg italic">"Every wrong turn is just a new adventure!"</p>
                        <p className="text-sm opacity-75">The correct answer was: <strong>
                          {selectedDifficulty === "EASY" ? currentCard.continent : 
                           selectedDifficulty === "MEDIUM" ? currentCard.country : currentCard.city}
                        </strong></p>
                      </motion.div>
                    )}

                    {/* Learning Section - Animated Facts */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-2xl border-4 border-blue-200 w-full relative"
                    >
                      {/* Animated Landmark Pop-Up */}
                      {currentCard?.landmarkIcon && (
                         <motion.div
                            initial={{ scale: 0, y: 50 }}
                            animate={{ scale: 1, y: -40 }}
                            transition={{ type: "spring", bounce: 0.6, delay: 0.2 }}
                            className="absolute -top-8 right-8 text-8xl filter drop-shadow-2xl z-50 pointer-events-none"
                         >
                            {currentCard.landmarkIcon}
                         </motion.div>
                      )}

                      <h3 className="text-xl font-heading text-center text-blue-800 mb-4 flex items-center justify-center">
                        <Lightbulb className="w-6 h-6 mr-2 text-yellow-500 fill-yellow-500" /> 
                        Fun Facts about {currentCard.city}
                      </h3>
                      
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <motion.div 
                           initial={{ scale: 0.8, opacity: 0 }}
                           animate={{ scale: 1, opacity: 1 }}
                           transition={{ delay: 0.7 }}
                           className="bg-green-50 p-2 rounded-xl text-center border border-green-100 flex flex-col items-center"
                        >
                           <span className="text-2xl mb-1">💰</span>
                           <span className="text-xs text-gray-500 uppercase font-bold">Currency</span>
                           <span className="font-bold text-green-700 text-sm leading-tight">{currentCard.currency}</span>
                        </motion.div>
                        <motion.div 
                           initial={{ scale: 0.8, opacity: 0 }}
                           animate={{ scale: 1, opacity: 1 }}
                           transition={{ delay: 0.9 }}
                           className="bg-blue-50 p-2 rounded-xl text-center border border-blue-100 flex flex-col items-center"
                        >
                           <span className="text-2xl mb-1">🗣️</span>
                           <span className="text-xs text-gray-500 uppercase font-bold">Language</span>
                           <span className="font-bold text-blue-700 text-sm leading-tight">{currentCard.language}</span>
                        </motion.div>
                        <motion.div 
                           initial={{ scale: 0.8, opacity: 0 }}
                           animate={{ scale: 1, opacity: 1 }}
                           transition={{ delay: 1.1 }}
                           className="bg-purple-50 p-2 rounded-xl text-center border border-purple-100 flex flex-col items-center"
                        >
                           <span className="text-2xl mb-1">👥</span>
                           <span className="text-xs text-gray-500 uppercase font-bold">People</span>
                           <span className="font-bold text-purple-700 text-sm leading-tight">{currentCard.population}</span>
                        </motion.div>
                      </div>

                      {/* Live Weather & Time */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 }}
                        className="mb-4"
                      >
                        <CityLiveInfo city={currentCard.city} />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.3 }}
                        className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 relative"
                      >
                        <Star className="absolute -top-3 -left-3 w-8 h-8 text-yellow-400 fill-yellow-400 drop-shadow-sm animate-spin-slow" />
                        <p className="text-center text-lg text-yellow-900 leading-tight italic">
                          "{currentCard.didYouKnow}"
                        </p>
                      </motion.div>
                    </motion.div>

                    <div className="mt-6 w-full">
                       {isCorrect ? (
                         <Button 
                           size="lg"
                           className="w-full bg-green-500 hover:bg-green-600 text-white border-b-4 border-green-700 shadow-lg animate-pulse text-xl h-14 rounded-xl"
                           onClick={() => {
                              setPhase("STAMP_PASSPORT");
                              setIsStamped(false);
                           }}
                         >
                           Collect Stamp <Stamp className="ml-2 w-5 h-5" />
                         </Button>
                       ) : (
                         <Button 
                           size="lg"
                           className="w-full bg-red-500 hover:bg-red-600 text-white border-b-4 border-red-700 shadow-lg animate-pulse text-xl h-14 rounded-xl"
                           onClick={handleDrawEventCard}
                         >
                           Draw Event Card <ArrowRight className="ml-2" />
                         </Button>
                       )}
                    </div>
                  </div>
              </motion.div>
            )}

            {/* PHASE: STAMP PASSPORT */}
            {phase === "STAMP_PASSPORT" && currentCard && (
               <motion.div 
                  key="stamp"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center w-full max-w-4xl"
               >
                  <div className="relative w-full max-w-3xl aspect-[3/2] bg-[#1a237e] rounded-[2rem] shadow-2xl border-8 border-[#0d47a1] overflow-hidden flex">
                     {/* Passport Cover Texture */}
                     <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/leather.png')]" />
                     
                     {/* Left Page - Player Info */}
                     <div className="hidden md:flex w-1/2 bg-[#fdfbf7] m-4 mr-0 rounded-l-xl shadow-inner p-6 border-r border-gray-300 relative flex-col items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-gray-200 mb-4 border-4 border-gray-300 overflow-hidden shadow-inner">
                           {/* Avatar placeholder */}
                           <div className={cn("w-full h-full flex items-center justify-center text-2xl font-bold text-white", currentPlayer.avatarColor)}>
                              {currentPlayer.name.substring(0, 2).toUpperCase()}
                           </div>
                        </div>
                        <h3 className="font-heading text-2xl text-blue-900">{currentPlayer.name}</h3>
                        <p className="text-gray-500 font-bold uppercase text-sm mb-6">Explorer</p>
                        
                        <div className="w-full bg-gray-100 rounded-xl p-3 border border-gray-200">
                           <p className="text-xs font-bold text-gray-400 uppercase mb-2 text-center">Collected Visas</p>
                           <div className="flex gap-2 justify-center flex-wrap">
                              {currentPlayer.collectedCards.slice(0, 6).map((c, i) => (
                                 <div key={c.id || i} className="w-8 h-8 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-[10px] shadow-sm" title={c.city}>
                                    ✈️
                                 </div>
                              ))}
                              {currentPlayer.collectedCards.length > 6 && (
                                 <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                    +{currentPlayer.collectedCards.length - 6}
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>

                     {/* Right Page - Stamping Area */}
                     <div className="w-full md:w-1/2 bg-[#fdfbf7] m-4 ml-0 md:ml-0 rounded-xl md:rounded-r-xl shadow-inner p-6 relative flex flex-col items-center justify-center cursor-pointer group"
                          onClick={() => {
                             if (isStamped) return;
                             setIsStamped(true);
                             soundManager.playStamp();
                             setTimeout(() => soundManager.playFanfare(), 300);
                             confetti({ particleCount: 50, spread: 40, origin: { y: 0.6 } });
                             setTimeout(() => {
                                handleStampComplete();
                             }, 2500);
                          }}
                     >
                        {/* Page Texture */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]" />
                        
                        <div className="border-4 border-dashed border-gray-300 rounded-xl w-full h-full flex items-center justify-center relative overflow-hidden bg-white/50 group-hover:bg-blue-50/50 transition-colors">
                           {!isStamped && (
                              <div className="text-center opacity-50 group-hover:opacity-100 transition-opacity">
                                 <Stamp className="w-20 h-20 text-blue-300 mx-auto mb-4 animate-bounce" />
                                 <p className="font-bold text-blue-400 uppercase tracking-widest text-lg">Click to Stamp</p>
                              </div>
                           )}

                           <AnimatePresence>
                              {isStamped && (
                                 <motion.div
                                    initial={{ scale: 2, opacity: 0, rotate: 10 }}
                                    animate={{ scale: 1, opacity: 1, rotate: -5 }}
                                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                    className="absolute inset-0 flex items-center justify-center"
                                 >
                                    <div className="border-8 border-blue-600 rounded-full w-48 h-48 flex flex-col items-center justify-center transform rotate-[-15deg] opacity-90 mix-blend-multiply">
                                       <div className="w-full border-b-2 border-blue-600 absolute top-12" />
                                       <div className="w-full border-b-2 border-blue-600 absolute bottom-12" />
                                       
                                       <p className="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] mt-2">ARRIVED</p>
                                       <h2 className="text-blue-700 font-black text-2xl uppercase my-1">{currentCard.city}</h2>
                                       <p className="text-blue-600 font-bold text-xs">{new Date().toLocaleDateString()}</p>
                                    </div>
                                 </motion.div>
                              )}
                           </AnimatePresence>
                        </div>
                     </div>
                  </div>
                  
                  <p className="text-white font-bold mt-4 text-lg drop-shadow-md animate-pulse">
                     {isStamped ? "Passport Updated!" : "Stamp your passport to continue!"}
                  </p>
               </motion.div>
            )}

            {/* PHASE: MAP BONUS ROUND */}
            {phase === "MAP_BONUS_ROUND" && (
               <motion.div 
                  key="map-bonus"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center w-full max-w-4xl"
               >
                  <div className="bg-white/95 backdrop-blur-md p-8 rounded-[3rem] shadow-2xl border-8 border-blue-400 w-full max-w-3xl text-center relative overflow-hidden">
                     <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/grid.png')]" />
                     
                     <div className="relative z-10">
                        <div className="inline-block bg-blue-100 text-blue-800 px-4 py-1 rounded-full font-bold text-sm mb-4 border border-blue-200">
                           🗺️ MAP IT BONUS ROUND!
                        </div>
                        
                        <h2 className="text-3xl font-heading text-blue-900 mb-2">Which map belongs to {currentCard?.country}?</h2>
                        <p className="text-gray-500 mb-6">Tap the correct country shape to earn a bonus star!</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                           {mapBonusOptions.map((option, idx) => {
                              const isSelected = selectedBonusOption === option.country;
                              const isCorrectOption = option.country === currentCard?.country;
                              
                              let buttonClass = "bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50";
                              
                              if (bonusWon !== null) {
                                 if (isCorrectOption) buttonClass = "bg-green-100 border-green-500 ring-2 ring-green-300";
                                 else if (isSelected && !isCorrectOption) buttonClass = "bg-red-100 border-red-500 opacity-60";
                                 else buttonClass = "bg-gray-50 border-gray-200 opacity-40 grayscale";
                              }
                              
                              return (
                                 <motion.button
                                    key={idx}
                                    whileHover={!bonusWon ? { scale: 1.05 } : {}}
                                    whileTap={!bonusWon ? { scale: 0.95 } : {}}
                                    className={`p-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-all shadow-sm h-48 ${buttonClass}`}
                                    onClick={() => handleBonusGuess(option.country)}
                                    disabled={bonusWon !== null}
                                 >
                                    <div className="w-full h-28 flex items-center justify-center p-2 relative">
                                       <img 
                                          src={option.mapUrl} 
                                          alt="Map Shape" 
                                          loading="lazy"
                                          className="max-w-full max-h-full object-contain drop-shadow-md brightness-0"
                                          onError={(e) => {
                                             // Fallback if icon not found
                                             e.currentTarget.style.display = "none";
                                             e.currentTarget.parentElement!.innerHTML = "<span class='text-4xl'>🗺️</span>";
                                          }}
                                       />
                                    </div>
                                 </motion.button>
                              );
                           })}
                        </div>

                        {bonusWon !== null && (
                           <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                           >
                              {bonusWon ? (
                                 <div className="flex flex-col items-center">
                                    <h3 className="text-2xl font-heading text-green-600 mb-4">Correct! That's the map of {currentCard?.country}!</h3>
                                    <Button 
                                       size="lg" 
                                       className="bg-green-500 hover:bg-green-600 text-white text-xl rounded-xl animate-bounce"
                                       onClick={handleBonusContinue}
                                    >
                                       Claim Star & Continue <Star className="ml-2 fill-white" />
                                    </Button>
                                 </div>
                              ) : (
                                 <div className="flex flex-col items-center">
                                    <h3 className="text-xl font-heading text-red-500 mb-4">Not quite! But good try!</h3>
                                    <Button 
                                       size="lg" 
                                       className="bg-blue-500 hover:bg-blue-600 text-white text-xl rounded-xl"
                                       onClick={handleBonusContinue}
                                    >
                                       Continue Journey <ArrowRight className="ml-2" />
                                    </Button>
                                 </div>
                              )}
                           </motion.div>
                        )}
                     </div>
                  </div>
               </motion.div>
            )}

            {/* PHASE: ANIMAL BONUS */}
            {phase === "ANIMAL_BONUS" && currentAnimalCard && (
               <motion.div 
                  key="animal"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center w-full max-w-4xl"
               >
                  <div className="bg-white/95 backdrop-blur-md p-8 rounded-[3rem] shadow-2xl border-8 border-orange-400 w-full max-w-2xl text-center relative overflow-hidden">
                     {/* Jungle Background Pattern */}
                     <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]" />
                     
                     <div className="relative z-10">
                        <div className="inline-block bg-orange-100 text-orange-800 px-4 py-1 rounded-full font-bold text-sm mb-6 border border-orange-200">
                           🦁 SAFARI BONUS ROUND 🐘
                        </div>

                        <div className="text-8xl mb-4 animate-bounce-slow">{currentAnimalCard.imageEmoji}</div>
                        
                        <h2 className="text-4xl font-heading text-orange-900 mb-4">Where Am I From?</h2>
                        
                        <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-200 mb-8">
                           <p className="text-2xl text-orange-800 leading-relaxed italic">
                              "{currentAnimalCard.clue}"
                           </p>
                           <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-8 w-8 p-0 rounded-full hover:bg-orange-200 mx-auto"
                              onClick={() => {
                                  if (isSpeaking) {
                                      soundManager.stopSpeaking();
                                  } else {
                                      soundManager.speak(currentAnimalCard.clue);
                                  }
                              }}
                            >
                               {isSpeaking ? <VolumeX className="w-5 h-5 text-red-600" /> : <Volume2 className="w-5 h-5 text-orange-600" />}
                            </Button>
                        </div>

                        {!animalBonusWon ? (
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {animalOptions.map((option, idx) => {
                                 const isWrong = wrongAnimalGuesses.includes(option);
                                 return (
                                    <Button
                                       key={idx}
                                       disabled={isWrong}
                                       className={`h-20 text-xl font-bold border-2 transition-all shadow-sm ${
                                          isWrong 
                                             ? "bg-red-100 text-red-400 border-red-200 cursor-not-allowed opacity-60" 
                                             : "bg-white text-orange-900 border-orange-200 hover:bg-orange-100 hover:border-orange-400 hover:scale-105"
                                       }`}
                                       onClick={() => handleAnimalGuess(option)}
                                    >
                                       {option}
                                    </Button>
                                 );
                              })}
                           </div>
                        ) : (
                           <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="bg-green-100 border-2 border-green-400 p-6 rounded-2xl"
                           >
                              <h3 className="text-3xl font-heading text-green-700 mb-2">You Found Me!</h3>
                              <p className="text-lg text-green-800 mb-6">
                                 I am a <span className="font-bold">{currentAnimalCard.name}</span> from {currentAnimalCard.continent}!
                              </p>
                              <Button 
                                 size="lg"
                                 onClick={handleAnimalContinue}
                                 className="bg-green-600 hover:bg-green-700 text-white text-xl px-8 py-4 rounded-xl shadow-lg"
                              >
                                 Continue Adventure <ArrowRight className="ml-2" />
                              </Button>
                           </motion.div>
                        )}
                     </div>
                  </div>
               </motion.div>
            )}

            {/* PHASE: EVENT (If Wrong) */}
            {phase === "EVENT" && currentEvent && (
               <motion.div 
                  key="event"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center"
               >
                  <h2 className="text-3xl font-heading text-white mb-6 drop-shadow-md">Event Card!</h2>
                  <GameCard card={currentEvent} className="shadow-2xl mb-8" />
                  
                  <Button 
                    size="lg" 
                    className="bg-green-600 hover:bg-green-700 text-white border-b-4 border-green-800 text-xl px-8 py-6 rounded-xl shadow-lg"
                    onClick={handleEventContinue}
                  >
                    Continue Journey <ArrowRight className="ml-2" />
                  </Button>
               </motion.div>
            )}

            {/* PHASE: DISCARD CHOICE (Negative Event) */}
            {phase === "DISCARD_CHOICE" && (
               <motion.div 
                  key="discard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full flex flex-col items-center"
               >
                  <div className="bg-red-50 p-6 rounded-2xl border-4 border-red-300 shadow-xl text-center mb-8 max-w-2xl">
                     <h2 className="text-2xl font-heading text-red-800 mb-2">Choose a card to discard</h2>
                     <p className="text-red-600">The storm took one of your memories! Select a card to lose.</p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-4">
                     {currentPlayer.collectedCards.map(card => (
                        <motion.div 
                           key={card.id}
                           whileHover={{ scale: 1.05 }}
                           className="relative cursor-pointer"
                           onClick={() => handleDiscardCard(card.id)}
                        >
                           <div className="absolute inset-0 bg-red-500/20 hover:bg-red-500/40 z-10 rounded-2xl flex items-center justify-center transition-colors">
                              <Trash2 className="text-white w-12 h-12 drop-shadow-lg" />
                           </div>
                           <GameCard card={card} isRevealed={true} className="scale-75 origin-top" />
                        </motion.div>
                     ))}
                  </div>
               </motion.div>
            )}

            {/* PHASE: MISSION COMPLETE */}
            {phase === "MISSION_COMPLETE" && justCompletedMission && (
               <motion.div 
                  key="mission"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
               >
                  <div className="bg-gradient-to-b from-yellow-100 to-yellow-300 p-8 rounded-[3rem] shadow-2xl border-8 border-yellow-500 max-w-md text-center relative overflow-visible">
                     <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                        <Trophy className="w-32 h-32 text-yellow-600 drop-shadow-lg animate-bounce" />
                     </div>
                     
                     <h2 className="text-4xl font-heading text-yellow-800 mt-12 mb-2">Mission Complete!</h2>
                     <p className="text-xl font-bold text-yellow-700 mb-6">{justCompletedMission.name}</p>
                     
                     <div className="bg-white/60 p-4 rounded-xl mb-6">
                        <p className="text-sm text-yellow-900 mb-2 font-medium">{justCompletedMission.description}</p>
                        <div className="inline-block bg-yellow-500 text-white px-4 py-1 rounded-full font-bold shadow-sm">
                           Reward: +2⭐
                        </div>
                     </div>
                     
                     <Button 
                       size="lg" 
                       className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-xl rounded-xl border-b-4 border-yellow-800"
                       onClick={handleMissionCompleteAck}
                     >
                       Awesome!
                     </Button>
                  </div>
               </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* EVENT OVERLAYS */}
        <AnimatePresence>
           {/* RAINY DAY OVERLAY */}
           {phase === "EVENT" && currentEvent?.id === "evt_rainy_day" && rainWipes < 5 && (
              <motion.div 
                 className="fixed inset-0 z-[100] bg-blue-900/30 cursor-pointer touch-none flex items-center justify-center backdrop-blur-[2px]"
                 onClick={() => {
                     setRainWipes(prev => prev + 1);
                     // Optional: Play wipe sound if available
                 }}
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
              >
                 <div className="absolute top-4 right-4 z-[110]">
                    <Button 
                       size="icon" 
                       className="rounded-full bg-white/50 hover:bg-white/70 text-blue-900 border-2 border-blue-200 w-12 h-12"
                       onClick={(e) => {
                          e.stopPropagation();
                          setRainWipes(5);
                       }}
                    >
                       <XCircle className="w-8 h-8" />
                    </Button>
                 </div>

                 <div className="absolute inset-0 overflow-hidden pointer-events-none">
                     {/* Raindrops */}
                     {Array.from({ length: 30 }).map((_, i) => (
                        <motion.div 
                           key={i}
                           className="absolute text-4xl opacity-70"
                           initial={{ y: -100, x: Math.random() * 100 + "%" }}
                           animate={{ y: "110vh" }}
                           transition={{ duration: 0.8 + Math.random(), repeat: Infinity, ease: "linear", delay: Math.random() }}
                           style={{ left: Math.random() * 100 + "%" }}
                        >
                           💧
                        </motion.div>
                     ))}
                 </div>
                 <div className="bg-white/90 px-8 py-4 rounded-full font-bold text-blue-800 text-2xl shadow-xl animate-bounce pointer-events-none border-4 border-blue-300 select-none">
                    👆 Tap to Wipe the Rain! ({5 - rainWipes})
                 </div>
              </motion.div>
           )}

           {/* LUCKY FIND (+1 Star) */}
           {showEventAnimation && phase === "EVENT" && currentEvent?.id === "evt_lucky_find" && (
              <motion.div 
                 className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center bg-yellow-400/20 backdrop-blur-[2px] pointer-events-auto"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={handleEventBackgroundClick}
              >
                 <div className="absolute top-4 right-4 z-[110] pointer-events-auto">
                    <Button 
                       size="icon" 
                       className={cn(
                          "rounded-full bg-white/50 hover:bg-white/70 text-yellow-900 border-2 border-yellow-200 w-12 h-12 transition-all duration-300",
                          highlightCloseButton && "ring-4 ring-yellow-400 scale-125 bg-white shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse"
                       )}
                       onClick={(e) => {
                           e.stopPropagation();
                           closeEventAnimation();
                       }}
                    >
                       <XCircle className="w-8 h-8" />
                    </Button>
                 </div>

                  <motion.div
                     initial={{ scale: 0, rotate: -180 }}
                     animate={{ scale: 1, rotate: 0 }}
                     transition={{ type: "spring", bounce: 0.5 }}
                     className="bg-yellow-100 p-12 rounded-full border-8 border-yellow-400 shadow-2xl text-center relative"
                  >
                     <motion.div 
                       animate={{ rotate: 360 }}
                       transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                       className="absolute inset-0 border-4 border-dashed border-yellow-300 rounded-full m-2"
                     />
                     <div className="text-9xl mb-4 drop-shadow-md">🌟</div>
                     <h2 className="text-5xl font-heading text-yellow-600 mb-2">LUCKY!</h2>
                     <div 
                        className="bg-yellow-500 text-white text-3xl font-bold px-6 py-2 rounded-full inline-block shadow-lg cursor-pointer hover:bg-yellow-600 transition-colors select-none"
                        onClick={closeEventAnimation}
                     >
                        +1 Star
                     </div>
                     
                     <div className="mt-8">
                        <Button 
                            onClick={closeEventAnimation}
                            className="bg-white text-yellow-600 hover:bg-yellow-50 font-bold text-lg px-8 py-2 rounded-full shadow-lg border-2 border-yellow-200 animate-pulse"
                        >
                            Collect Reward! 🌟
                        </Button>
                     </div>
                  </motion.div>
                  
                  {/* Falling Coins/Stars */}
                  {Array.from({ length: 20 }).map((_, i) => (
                      <motion.div
                         key={i}
                         className="absolute text-4xl pointer-events-none"
                         initial={{ y: -100, x: Math.random() * 100 + "%" }}
                         animate={{ y: "110vh", rotate: 360 }}
                         transition={{ duration: 2 + Math.random(), repeat: Infinity, ease: "linear", delay: Math.random() }}
                         style={{ left: Math.random() * 100 + "%" }}
                      >
                         ✨
                      </motion.div>
                  ))}
                  
                  {/* Visible Close Button Below Card */}
                  <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.8 }}
                     className="mt-6 z-[120] pointer-events-auto"
                  >
                     <Button 
                        onClick={(e) => {
                           e.stopPropagation();
                           closeEventAnimation();
                        }}
                        className="bg-white/90 hover:bg-white text-gray-700 font-bold text-lg px-8 py-3 rounded-full shadow-xl border-2 border-gray-300"
                     >
                        ✕ Close Animation
                     </Button>
                  </motion.div>
              </motion.div>
           )}

           {/* LOST LUGGAGE ANIMATION */}
           {showEventAnimation && phase === "EVENT" && currentEvent?.id === "evt_lost_luggage" && (
              <motion.div 
                 className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center bg-red-900/10 backdrop-blur-[1px] pointer-events-auto"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={handleEventBackgroundClick}
              >
                 <div className="absolute top-4 right-4 z-[110] pointer-events-auto">
                    <Button 
                       size="icon" 
                       className={cn(
                          "rounded-full bg-white/50 hover:bg-white/70 text-red-900 border-2 border-red-200 w-12 h-12 transition-all duration-300",
                          highlightCloseButton && "ring-4 ring-red-400 scale-125 bg-white shadow-[0_0_20px_rgba(248,113,113,0.6)] animate-pulse"
                       )}
                       onClick={(e) => {
                           e.stopPropagation();
                           closeEventAnimation();
                       }}
                    >
                       <XCircle className="w-8 h-8" />
                    </Button>
                 </div>

                 <motion.div
                    className="text-9xl absolute z-20"
                    initial={{ x: "-100vw", y: 100, rotate: -45 }}
                    animate={{ x: "100vw", y: -200, rotate: 45 }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                 >
                    🧳
                    <motion.div 
                       className="absolute top-0 right-0 text-6xl"
                       animate={{ opacity: [0, 1, 0], scale: [1, 1.5, 1] }}
                       transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                       💨
                    </motion.div>
                 </motion.div>
                 
                 <motion.div
                    className="absolute text-5xl font-bold text-red-600 bg-white/95 px-10 py-6 rounded-3xl border-8 border-red-200 shadow-2xl transform -rotate-3"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", bounce: 0.5 }}
                 >
                    <div className="text-center">
                       <p className="mb-2">OH NO!</p>
                       <div 
                          className="text-2xl bg-red-100 text-red-800 px-4 py-2 rounded-xl cursor-pointer hover:bg-red-200 transition-colors select-none"
                          onClick={closeEventAnimation}
                       >
                          Luggage Lost = -1 Star
                       </div>
                       <div className="mt-4">
                            <Button 
                                onClick={closeEventAnimation}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-6 py-2 rounded-xl shadow-lg"
                            >
                                Oh well... Continue ✈️
                            </Button>
                       </div>
                    </div>
                 </motion.div>
                 
                 {/* Visible Close Button Below Card */}
                 <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-6 z-[120] pointer-events-auto"
                 >
                    <Button 
                       onClick={(e) => {
                          e.stopPropagation();
                          closeEventAnimation();
                       }}
                       className="bg-white/90 hover:bg-white text-gray-700 font-bold text-lg px-8 py-3 rounded-full shadow-xl border-2 border-gray-300"
                    >
                       ✕ Close Animation
                    </Button>
                 </motion.div>
              </motion.div>
           )}

           {/* FLIGHT DELAY ANIMATION */}
           {showEventAnimation && phase === "EVENT" && currentEvent?.id === "evt_flight_delay" && (
              <motion.div 
                 className="fixed inset-0 z-[100] bg-black/30 pointer-events-none flex flex-col items-center justify-center backdrop-blur-[2px] pointer-events-auto"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={handleEventBackgroundClick}
              >
                 <div className="absolute top-4 right-4 z-[110] pointer-events-auto">
                    <Button 
                       size="icon" 
                       className={cn(
                          "rounded-full bg-white/50 hover:bg-white/70 text-gray-900 border-2 border-gray-200 w-12 h-12 transition-all duration-300",
                          highlightCloseButton && "ring-4 ring-white scale-125 bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] animate-pulse"
                       )}
                       onClick={(e) => {
                           e.stopPropagation();
                           closeEventAnimation();
                       }}
                    >
                       <XCircle className="w-8 h-8" />
                    </Button>
                 </div>

                 <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-8 border-slate-700 flex flex-col items-center relative transform rotate-1 max-w-md">
                    <div className="absolute -top-8 -right-8 text-7xl animate-bounce drop-shadow-lg">💤</div>
                    
                    <div className="relative mb-6">
                       <div className="text-9xl opacity-20 grayscale">✈️</div>
                       <motion.div
                          className="absolute inset-0 flex items-center justify-center text-8xl font-mono text-red-600 font-bold"
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                       >
                          00:00
                       </motion.div>
                    </div>

                    <h2 className="text-6xl font-black text-red-600 uppercase tracking-widest border-8 border-red-600 p-4 transform -rotate-6 mask-stamp mb-4">
                       DELAYED
                    </h2>
                    <p 
                       className="text-xl font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors select-none"
                       onClick={closeEventAnimation}
                    >
                       Skip Next Turn
                    </p>
                    <div className="mt-6">
                        <Button 
                            onClick={closeEventAnimation}
                            className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-lg px-8 py-2 rounded-xl shadow-lg"
                        >
                            Wait it out... 🕒
                        </Button>
                    </div>
                 </div>
                 
                 {/* Visible Close Button Below Card */}
                 <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-6 z-[120] pointer-events-auto"
                 >
                    <Button 
                       onClick={(e) => {
                          e.stopPropagation();
                          closeEventAnimation();
                       }}
                       className="bg-white/90 hover:bg-white text-gray-700 font-bold text-lg px-8 py-3 rounded-full shadow-xl border-2 border-gray-300"
                    >
                       ✕ Close Animation
                    </Button>
                 </motion.div>
              </motion.div>
           )}
           
           {/* FLIGHT UPGRADE (Extra Card) */}
           {showEventAnimation && phase === "EVENT" && currentEvent?.id === "evt_flight_upgrade" && (
              <motion.div 
                 className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center bg-sky-200/30 backdrop-blur-[2px] pointer-events-auto"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={handleEventBackgroundClick}
              >
                 <div className="absolute top-4 right-4 z-[110] pointer-events-auto">
                    <Button 
                       size="icon" 
                       className={cn(
                          "rounded-full bg-white/50 hover:bg-white/70 text-sky-900 border-2 border-sky-200 w-12 h-12 transition-all duration-300",
                          highlightCloseButton && "ring-4 ring-sky-400 scale-125 bg-white shadow-[0_0_20px_rgba(56,189,248,0.6)] animate-pulse"
                       )}
                       onClick={(e) => {
                           e.stopPropagation();
                           closeEventAnimation();
                       }}
                    >
                       <XCircle className="w-8 h-8" />
                    </Button>
                 </div>

                  {/* Clouds */}
                  <motion.div className="absolute top-20 left-10 text-9xl opacity-60" animate={{ x: 100 }} transition={{ repeat: Infinity, repeatType: "reverse", duration: 5 }}>☁️</motion.div>
                  <motion.div className="absolute bottom-40 right-20 text-8xl opacity-60" animate={{ x: -100 }} transition={{ repeat: Infinity, repeatType: "reverse", duration: 7 }}>☁️</motion.div>

                  <motion.div
                     initial={{ y: 500, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     transition={{ type: "spring", damping: 12 }}
                     className="bg-gradient-to-b from-blue-500 to-blue-700 p-1 rounded-[2rem] shadow-2xl transform -rotate-2"
                  >
                     <div className="bg-white p-8 rounded-[1.8rem] flex flex-col items-center border-4 border-blue-300 border-dashed">
                        <div className="flex items-center justify-between w-full mb-4 border-b-2 border-gray-200 pb-2">
                           <span className="font-bold text-gray-400">BOARDING PASS</span>
                           <span className="font-mono text-blue-600 font-bold">FIRST CLASS</span>
                        </div>
                        <div className="flex items-center gap-6 mb-6">
                           <div className="text-6xl">🎫</div>
                           <div className="text-left">
                              <div className="text-sm text-gray-500 uppercase">Passenger</div>
                              <div className="text-xl font-bold text-gray-800">{currentPlayer.name}</div>
                              <div className="text-sm text-gray-500 uppercase mt-2">Destination</div>
                              <div className="text-xl font-bold text-blue-600">UNKNOWN</div>
                           </div>
                        </div>
                        <div 
                           className="bg-green-100 text-green-800 font-bold text-2xl px-6 py-3 rounded-xl border-2 border-green-300 animate-pulse cursor-pointer hover:bg-green-200 transition-colors select-none"
                           onClick={closeEventAnimation}
                        >
                           DRAW AN EXTRA CARD!
                        </div>
                        <div className="mt-6 w-full">
                            <Button 
                                onClick={closeEventAnimation}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-3 rounded-xl shadow-lg"
                            >
                                Board Plane! 🛫
                            </Button>
                        </div>
                     </div>
                  </motion.div>
                  
                  {/* Visible Close Button Below Card */}
                  <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.8 }}
                     className="mt-6 z-[120] pointer-events-auto"
                  >
                     <Button 
                        onClick={(e) => {
                           e.stopPropagation();
                           closeEventAnimation();
                        }}
                        className="bg-white/90 hover:bg-white text-gray-700 font-bold text-lg px-8 py-3 rounded-full shadow-xl border-2 border-gray-300"
                     >
                        ✕ Close Animation
                     </Button>
                  </motion.div>
              </motion.div>
           )}

           {/* SMOOTH SAILING (Auto Bonus) */}
           {showEventAnimation && phase === "EVENT" && currentEvent?.id === "evt_smooth_sailing" && (
              <motion.div 
                 className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center bg-cyan-100/30 backdrop-blur-[2px] pointer-events-auto"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={handleEventBackgroundClick}
              >
                 <div className="absolute top-4 right-4 z-[110] pointer-events-auto">
                    <Button 
                       size="icon" 
                       className={cn(
                          "rounded-full bg-white/50 hover:bg-white/70 text-cyan-900 border-2 border-cyan-200 w-12 h-12 transition-all duration-300",
                          highlightCloseButton && "ring-4 ring-cyan-400 scale-125 bg-white shadow-[0_0_20px_rgba(34,211,238,0.6)] animate-pulse"
                       )}
                       onClick={(e) => {
                           e.stopPropagation();
                           closeEventAnimation();
                       }}
                    >
                       <XCircle className="w-8 h-8" />
                    </Button>
                 </div>

                  <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-blue-400/50 to-transparent" />
                  
                  <motion.div
                     initial={{ x: -500, rotate: 5 }}
                     animate={{ x: 0, rotate: [5, -5, 5] }}
                     transition={{ 
                        x: { duration: 1.5, type: "spring" },
                        rotate: { repeat: Infinity, duration: 3, ease: "easeInOut" }
                     }}
                     className="relative z-20"
                  >
                     <div className="text-[12rem] drop-shadow-2xl transform scale-x-[-1]">⛵</div>
                  </motion.div>

                  <motion.div
                     initial={{ scale: 0, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     transition={{ delay: 0.8 }}
                     className="absolute top-1/3 bg-white/90 p-8 rounded-3xl shadow-xl border-4 border-cyan-300 text-center max-w-md z-10"
                  >
                     <h2 className="text-4xl font-heading text-cyan-700 mb-2">Smooth Sailing!</h2>
                     <p className="text-lg text-cyan-900 font-medium">
                        You automatically win the next bonus round!
                     </p>
                     <div className="mt-4 text-5xl animate-bounce">🏆</div>
                     <div className="mt-6">
                        <Button 
                            onClick={closeEventAnimation}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-lg px-8 py-2 rounded-xl shadow-lg"
                        >
                            Awesome! 🌊
                        </Button>
                     </div>
                  </motion.div>
                  
                  {/* Visible Close Button Below Card */}
                  <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 1.2 }}
                     className="absolute bottom-20 z-30"
                  >
                     <Button 
                        onClick={(e) => {
                           e.stopPropagation();
                           closeEventAnimation();
                        }}
                        className="bg-white/90 hover:bg-white text-gray-700 font-bold text-lg px-8 py-3 rounded-full shadow-xl border-2 border-gray-300"
                     >
                        ✕ Close Animation
                     </Button>
                  </motion.div>
              </motion.div>
           )}

           {/* WRONG TURN (Discard) */}
           {showEventAnimation && phase === "EVENT" && currentEvent?.id === "evt_wrong_turn" && (
              <motion.div 
                 className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center bg-gray-800/40 backdrop-blur-[2px] pointer-events-auto"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={handleEventBackgroundClick}
              >
                 <div className="absolute top-4 right-4 z-[110] pointer-events-auto">
                    <Button 
                       size="icon" 
                       className={cn(
                          "rounded-full bg-white/50 hover:bg-white/70 text-gray-900 border-2 border-gray-200 w-12 h-12 transition-all duration-300",
                          highlightCloseButton && "ring-4 ring-white scale-125 bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] animate-pulse"
                       )}
                       onClick={(e) => {
                           e.stopPropagation();
                           closeEventAnimation();
                       }}
                    >
                       <XCircle className="w-8 h-8" />
                    </Button>
                 </div>

                  <motion.div
                     animate={{ rotate: 360 * 3 }}
                     transition={{ duration: 2, ease: "circOut" }}
                     className="relative"
                  >
                     <div className="text-[10rem]">🧭</div>
                  </motion.div>
                  
                  <motion.div
                     initial={{ opacity: 0, scale: 0.5 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: 1.5 }}
                     className="absolute mt-60 bg-red-50 border-4 border-red-400 p-6 rounded-2xl shadow-2xl text-center"
                  >
                     <h2 className="text-4xl font-heading text-red-700 mb-2">LOST!</h2>
                     <p className="font-bold text-red-900 text-xl">Discard one card to find your way back.</p>
                     <div className="mt-6">
                        <Button 
                            onClick={closeEventAnimation}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-8 py-2 rounded-xl shadow-lg"
                        >
                            Find Way Back 🧭
                        </Button>
                     </div>
                  </motion.div>
                  
                  {/* Visible Close Button Below Card */}
                  <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 2 }}
                     className="absolute bottom-16 z-30"
                  >
                     <Button 
                        onClick={(e) => {
                           e.stopPropagation();
                           closeEventAnimation();
                        }}
                        className="bg-white/90 hover:bg-white text-gray-700 font-bold text-lg px-8 py-3 rounded-full shadow-xl border-2 border-gray-300"
                     >
                        ✕ Close Animation
                     </Button>
                  </motion.div>
              </motion.div>
           )}

           {/* FRIENDLY LOCAL (Steal) */}
           {showEventAnimation && phase === "EVENT" && currentEvent?.id === "evt_friendly_local" && (
              <motion.div 
                 className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center bg-purple-900/30 backdrop-blur-[2px] pointer-events-auto"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={handleEventBackgroundClick}
              >
                 <div className="absolute top-4 right-4 z-[110] pointer-events-auto">
                    <Button 
                       size="icon" 
                       className={cn(
                          "rounded-full bg-white/50 hover:bg-white/70 text-purple-900 border-2 border-purple-200 w-12 h-12 transition-all duration-300",
                          highlightCloseButton && "ring-4 ring-purple-400 scale-125 bg-white shadow-[0_0_20px_rgba(192,132,252,0.6)] animate-pulse"
                       )}
                       onClick={(e) => {
                           e.stopPropagation();
                           closeEventAnimation();
                       }}
                    >
                       <XCircle className="w-8 h-8" />
                    </Button>
                 </div>

                  <motion.div
                     initial={{ x: -100, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ type: "spring" }}
                     className="relative z-10 flex flex-col items-center"
                  >
                     <div className="text-[10rem] animate-bounce drop-shadow-2xl">🦝</div>
                     
                     <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        className="bg-white/95 p-8 rounded-[2rem] shadow-2xl border-4 border-purple-400 text-center max-w-md mt-4"
                     >
                        <h2 className="text-4xl font-heading text-purple-700 mb-2">Sneaky Move!</h2>
                        <div 
                           className="bg-purple-100 text-purple-900 text-xl font-bold px-6 py-3 rounded-xl inline-block border border-purple-200 cursor-pointer hover:bg-purple-200 transition-colors select-none"
                           onClick={closeEventAnimation}
                        >
                           Steal 1 Star from another player!
                        </div>
                        <div className="mt-6">
                            <Button 
                                onClick={closeEventAnimation}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg px-8 py-2 rounded-xl shadow-lg"
                            >
                                Be Sneaky! 🦝
                            </Button>
                        </div>
                     </motion.div>
                     
                     {/* Visible Close Button Below Card */}
                     <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="mt-6 z-[120] pointer-events-auto"
                     >
                        <Button 
                           onClick={(e) => {
                              e.stopPropagation();
                              closeEventAnimation();
                           }}
                           className="bg-white/90 hover:bg-white text-gray-700 font-bold text-lg px-8 py-3 rounded-full shadow-xl border-2 border-gray-300"
                        >
                           ✕ Close Animation
                        </Button>
                     </motion.div>
                  </motion.div>
              </motion.div>
           )}

        </AnimatePresence>
      </main>

            {/* PHASE: GAME OVER (New Review Screen) */}
            {phase === "GAME_OVER" && (
               <motion.div 
                  key="gameover"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 overflow-y-auto"
               >
                  <div className="bg-[#fdfbf7] w-full max-w-5xl rounded-[2rem] shadow-2xl border-8 border-yellow-500 relative overflow-hidden flex flex-col max-h-[90vh]">
                     {/* Header */}
                     <div className="bg-yellow-400 p-6 text-center relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]" />
                        
                        {/* Victory Fireworks - Limited to 10s */}
                        <VictoryCelebration />

                        {/* Spotlight Effect */}
                        <div className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,0.3)_0%,transparent_60%)] animate-pulse pointer-events-none" />

                        <h2 className="text-5xl md:text-6xl font-heading text-yellow-900 drop-shadow-md relative z-10 mb-2 animate-bounce">
                           🎉 {players[turnIndex].name} Wins! 🎉
                        </h2>
                        <p className="text-yellow-800 font-bold text-xl relative z-10">Master Explorer of the World</p>
                        
                        {/* Identity-building celebration message */}
                        {(() => {
                           const allCollectedCards = players.flatMap(p => p.collectedCards);
                           const continents = Array.from(new Set(allCollectedCards.map(c => c.continent).filter(Boolean)));
                           const totalCities = allCollectedCards.length;
                           
                           let message = "";
                           if (continents.length === 1) {
                              message = `You explored ${continents[0]} today!`;
                           } else if (continents.length > 1) {
                              message = `You explored ${continents.length} continents today!`;
                           } else if (totalCities > 0) {
                              message = `You discovered ${totalCities} ${totalCities === 1 ? 'city' : 'cities'} today!`;
                           } else {
                              message = "You're becoming a world explorer!";
                           }
                           
                           return (
                              <motion.p 
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ delay: 0.5 }}
                                 className="text-yellow-700 font-medium text-lg relative z-10 mt-2 italic"
                                 data-testid="text-identity-celebration"
                              >
                                 ✨ {message} ✨
                              </motion.p>
                           );
                        })()}
                     </div>

                     {/* Player Selector Tabs */}
                     <div className="bg-yellow-100 p-2 flex gap-2 overflow-x-auto shrink-0">
                        <button
                           onClick={() => setReviewPlayerId("SUMMARY")}
                           className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold whitespace-nowrap border-2",
                              reviewPlayerId === "SUMMARY"
                                 ? "bg-white text-blue-600 border-blue-400 shadow-md scale-105" 
                                 : "bg-yellow-50 text-yellow-700 border-transparent hover:bg-white/50"
                           )}
                        >
                           <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-500 text-white">
                              <Users className="w-4 h-4" />
                           </div>
                           Team Summary
                        </button>
                        
                        {players.map(p => (
                           <button
                              key={p.id}
                              onClick={() => setReviewPlayerId(p.id)}
                              className={cn(
                                 "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold whitespace-nowrap border-2",
                                 reviewPlayerId === p.id 
                                    ? "bg-white text-blue-600 border-blue-400 shadow-md scale-105" 
                                    : "bg-yellow-50 text-yellow-700 border-transparent hover:bg-white/50"
                              )}
                           >
                              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white", p.avatarColor)}>
                                 {p.id}
                              </div>
                              {p.name}
                              {p.id === players[turnIndex].id && <Trophy className="w-4 h-4 text-yellow-500 ml-1" />}
                           </button>
                        ))}
                     </div>

                     {/* Content Area */}
                     <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                        {reviewPlayerId === "SUMMARY" ? (
                           <div className="space-y-8">
                              {/* Total Stats */}
                              <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-blue-100">
                                 <h3 className="text-2xl font-heading text-blue-800 mb-4 flex items-center">
                                    <Globe className="w-6 h-6 mr-2 text-blue-500" /> Expedition Report
                                 </h3>
                                 
                                 <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-yellow-50 p-4 rounded-xl text-center border border-yellow-200">
                                       <div className="text-sm font-bold text-gray-500 uppercase mb-1">Total Stars</div>
                                       <div className="text-3xl font-black text-yellow-600">
                                          {players.reduce((acc, p) => acc + p.stars, 0)}
                                       </div>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-200">
                                       <div className="text-sm font-bold text-gray-500 uppercase mb-1">Locations</div>
                                       <div className="text-3xl font-black text-blue-600">
                                          {players.reduce((acc, p) => acc + p.collectedCards.length, 0)}
                                       </div>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-200">
                                       <div className="text-sm font-bold text-gray-500 uppercase mb-1">Badges</div>
                                       <div className="text-3xl font-black text-purple-600">
                                          {players.reduce((acc, p) => acc + p.completedMissions.length, 0)}
                                       </div>
                                    </div>
                                 </div>

                                 {/* Player Breakdown List */}
                                 <div className="space-y-3">
                                    <h4 className="font-bold text-gray-700 uppercase text-sm border-b border-gray-200 pb-2 mb-3">Explorer Stats</h4>
                                    {players.map(p => (
                                       <div 
                                          key={p.id} 
                                          className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                                          onClick={() => setReviewPlayerId(p.id)}
                                       >
                                          <div className="flex items-center gap-3">
                                             <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm", p.avatarColor)}>
                                                {p.id}
                                             </div>
                                             <div>
                                                <div className="font-bold text-gray-800 flex items-center">
                                                   {p.name} 
                                                   {p.id === players[turnIndex].id && <Trophy className="w-3 h-3 text-yellow-500 ml-1" />}
                                                </div>
                                                <div className="text-xs text-gray-500">Explorer #{p.id}</div>
                                             </div>
                                          </div>
                                          
                                          <div className="flex gap-4 text-sm">
                                             <div className="flex flex-col items-end w-16">
                                                <span className="font-bold text-yellow-600 flex items-center"><Star className="w-3 h-3 mr-1 fill-yellow-500" /> {p.stars}</span>
                                                <span className="text-[10px] text-gray-400 uppercase">Stars</span>
                                             </div>
                                             <div className="flex flex-col items-end w-16">
                                                <span className="font-bold text-blue-600 flex items-center"><MapPin className="w-3 h-3 mr-1" /> {p.collectedCards.length}</span>
                                                <span className="text-[10px] text-gray-400 uppercase">Cities</span>
                                             </div>
                                             <div className="flex items-center justify-center w-8 text-gray-300">
                                                <ChevronRight className="w-5 h-5" />
                                             </div>
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                                 
                                 {/* Learning Summary */}
                                 <div className="mt-4">
                                    <LearningSummary points={getGameLearningPoints("guess-and-go")} />
                                 </div>
                              </div>
                           </div>
                        ) : (
                           /* Individual Player Stats (Original Code Wrapped) */
                           reviewPlayerId && (() => {
                              const reviewPlayer = players.find(p => p.id === reviewPlayerId) || players[0];
                              return (
                                 <div className="space-y-8">
                                 {/* Stats Row */}
                                 <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 text-center">
                                       <div className="text-3xl mb-1">⭐</div>
                                       <div className="text-sm font-bold text-gray-500 uppercase">Total Stars</div>
                                       <div className="text-2xl font-black text-yellow-600">{reviewPlayer.stars}</div>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 text-center">
                                       <div className="text-3xl mb-1">✈️</div>
                                       <div className="text-sm font-bold text-gray-500 uppercase">Locations</div>
                                       <div className="text-2xl font-black text-blue-600">{reviewPlayer.collectedCards.length}</div>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 text-center">
                                       <div className="text-3xl mb-1">🏆</div>
                                       <div className="text-sm font-bold text-gray-500 uppercase">Missions</div>
                                       <div className="text-2xl font-black text-purple-600">{reviewPlayer.completedMissions.length}</div>
                                    </div>
                                 </div>

                                 {/* Missions */}
                                 {reviewPlayer.completedMissions.length > 0 && (
                                    <div>
                                       <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center">
                                          <Trophy className="w-6 h-6 mr-2 text-purple-500" /> Completed Missions
                                       </h3>
                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          {reviewPlayer.completedMissions.map(m => (
                                             <div key={m.id} className="bg-white p-4 rounded-xl border-2 border-purple-100 shadow-sm flex items-start gap-3">
                                                <div className="bg-purple-100 p-2 rounded-full">
                                                   <Trophy className="w-6 h-6 text-purple-600" />
                                                </div>
                                                <div>
                                                   <h4 className="font-bold text-purple-900">{m.name}</h4>
                                                   <p className="text-sm text-gray-600 leading-tight">{m.description}</p>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 )}

                                 {/* Collection / Stamps */}
                                 <div>
                                    <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center">
                                       <Stamp className="w-6 h-6 mr-2 text-blue-500" /> Passport Stamps
                                    </h3>
                                    {reviewPlayer.collectedCards.length === 0 ? (
                                       <div className="text-center py-8 text-gray-400 italic bg-gray-100 rounded-xl border border-dashed border-gray-300">
                                          No locations visited yet!
                                       </div>
                                    ) : (
                                       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                          {reviewPlayer.collectedCards.map(card => (
                                             <div key={card.id} className="relative group perspective-1000">
                                                <div className="bg-white p-2 rounded-xl shadow-md border border-gray-200 hover:shadow-xl transition-all transform hover:-translate-y-1">
                                                   <div className="aspect-[4/3] rounded-lg overflow-hidden mb-2 relative">
                                                      <img src={getCityImage(card.city, card.continent)} className="w-full h-full object-cover" loading="lazy" />
                                                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2">
                                                         <span className="text-white text-xs font-bold">{card.continent}</span>
                                                      </div>
                                                   </div>
                                                   <div className="text-center">
                                                      <h4 className="font-bold text-gray-800 text-sm leading-tight">{card.city}</h4>
                                                      <p className="text-xs text-gray-500">{card.country}</p>
                                                   </div>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    )}
                                 </div>
                              </div>
                           );
                        })())}
                     </div>


                     {/* Footer Actions */}
                     <div className="bg-gray-100 p-4 border-t border-gray-200 flex flex-col gap-3 shrink-0 sticky bottom-0 z-50">
                        <div className="flex justify-center items-center gap-3">
                           <Button 
                              variant="outline" 
                              size="lg"
                              className="bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 border-2 border-blue-300 rounded-xl flex-1 max-w-[180px] min-h-[48px] touch-manipulation"
                              onClick={() => setShowShareDialog(true)}
                              data-testid="button-share-adventure"
                           >
                              <Share2 className="mr-2 w-5 h-5" /> Share Adventure
                           </Button>

                           <Button 
                              variant="default"
                              size="lg"
                              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border-b-4 border-green-800 rounded-xl transition-all flex-1 max-w-[180px] min-h-[48px] touch-manipulation"
                              onClick={() => setLocation("/")}
                              data-testid="button-play-again"
                           >
                              <Home className="mr-2 w-5 h-5" /> Home
                           </Button>
                        </div>
                        
                        <button
                           onClick={() => setShowGeoAdventuresPrompt(true)}
                           className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center justify-center gap-1 py-1"
                           data-testid="button-plan-real-trip"
                        >
                           <Globe className="w-4 h-4" />
                           Want to plan a real family trip?
                        </button>
                     </div>
                  </div>
               </motion.div>
            )}

            <PreOrderPopup isOpen={showPreOrderPopup} onClose={() => setShowPreOrderPopup(false)} />

            {/* GEOADVENTURES PROMPT DIALOG - Dismissible popup for travel memories */}
            <Dialog open={showGeoAdventuresPrompt} onOpenChange={(open) => {
              setShowGeoAdventuresPrompt(open);
              if (!open) {
                localStorage.setItem('geoquest_seen_geoadventures_prompt', 'true');
              }
            }}>
              <DialogContent className="bg-gradient-to-br from-amber-50 to-orange-50 border-4 border-amber-400 rounded-[2rem] max-w-md p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center relative">
                  <div className="flex justify-center mb-2">
                    <div className="bg-white/20 p-3 rounded-full">
                      <span className="text-4xl">✈️</span>
                    </div>
                  </div>
                  <DialogTitle className="text-2xl font-heading text-white">Turn Games into Memories!</DialogTitle>
                  <DialogDescription className="text-amber-100">
                    Create unforgettable family adventures
                  </DialogDescription>
                </DialogHeader>
                
                <div className="p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-gray-700 text-lg mb-2">
                      <span className="font-bold text-amber-600">GeoAdventures</span> helps your family explore the world together!
                    </p>
                    <p className="text-gray-500 text-sm">
                      Plan trips, capture moments, and build lasting memories with your kids.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      onClick={() => {
                        setShowGeoAdventuresPrompt(false);
                        setInternalNavToAdventures();
                        setLocation("/geoadventures");
                      }}
                      className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-lg shadow-lg transform hover:scale-[1.02] transition-all border-b-4 border-amber-700"
                      data-testid="button-explore-geoadventures"
                    >
                      <Globe className="mr-2 w-5 h-5" /> Start Your Adventure
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowGeoAdventuresPrompt(false);
                        localStorage.setItem('geoquest_seen_geoadventures_prompt', 'true');
                      }}
                      className="w-full h-12 text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium rounded-xl"
                      data-testid="button-close-geoadventures-prompt"
                    >
                      Maybe Later
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* SIGN UP PROMPT DIALOG (for guests clicking Play Again) */}
            <Dialog open={showSignUpPrompt} onOpenChange={setShowSignUpPrompt}>
              <DialogContent className="bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-purple-400 rounded-[2rem] max-w-md p-0 overflow-hidden shadow-2xl [&>button]:hidden">
                <DialogHeader className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 p-6 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="bg-white/20 p-3 rounded-full">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <DialogTitle className="text-2xl font-heading text-white">Save Your Adventure!</DialogTitle>
                  <DialogDescription className="text-purple-100">
                    Don't lose your explorer's progress!
                  </DialogDescription>
                </DialogHeader>
                
                <div className="p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-gray-700 text-lg mb-2">
                      Want to save your progress and get a <span className="font-bold text-purple-600">customized learning path</span> for your explorers?
                    </p>
                    <p className="text-gray-500 text-sm">
                      Keep your stars, stamps, and achievements safe!
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      onClick={() => {
                        setShowSignUpPrompt(false);
                        setLocation("/?signup=true");
                      }}
                      className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl text-lg shadow-lg transform hover:scale-[1.02] transition-all border-b-4 border-purple-800"
                      data-testid="button-signup-now"
                    >
                      <UserPlus className="mr-2 w-5 h-5" /> Sign Up Now
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowSignUpPrompt(false);
                        setLocation("/");
                      }}
                      className="w-full h-12 text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium rounded-xl"
                      data-testid="button-maybe-later"
                    >
                      Maybe Later
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* SHARE ADVENTURE DIALOG */}
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
              <DialogContent className="bg-gradient-to-br from-indigo-50 to-purple-50 border-4 border-indigo-400 rounded-[2rem] max-w-md p-0 overflow-hidden shadow-2xl [&>button]:hidden">
                <DialogHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="bg-white/20 p-3 rounded-full">
                      <Share2 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <DialogTitle className="text-2xl font-heading text-white">Share Your Adventure!</DialogTitle>
                  <DialogDescription className="text-indigo-100">
                    Invite friends to explore the world with you
                  </DialogDescription>
                </DialogHeader>
                
                <div className="p-6 space-y-4">
                  <p className="text-center text-gray-600 text-sm mb-4">
                    Choose how you'd like to share:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Facebook */}
                    <Button
                      onClick={() => {
                        const shareText = `I just explored ${players.reduce((acc, p) => acc + p.collectedCards.length, 0)} amazing places in GeoQuest! Can you beat my score? Play now!`;
                        const shareUrl = "https://game.geoquestgame.com";
                        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
                        requestAccess(() => {
                          window.open(fbUrl, '_blank', 'width=600,height=400');
                          setShowShareDialog(false);
                        });
                      }}
                      className="h-16 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl flex flex-col items-center justify-center gap-1 border-b-4 border-[#1467D8]"
                      data-testid="share-facebook"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      <span className="text-xs font-bold">Facebook</span>
                    </Button>

                    {/* Instagram */}
                    <Button
                      onClick={() => {
                        const shareText = `I just explored ${players.reduce((acc, p) => acc + p.collectedCards.length, 0)} amazing places in GeoQuest! 🌍✈️ Can you beat my score? Play now at game.geoquestgame.com`;
                        navigator.clipboard.writeText(shareText);
                        toast.success("Message copied to clipboard!", {
                          description: "Paste it in your Instagram story or post",
                          duration: 4000,
                        });
                        requestAccess(() => {
                          window.open('https://www.instagram.com/', '_blank');
                          setShowShareDialog(false);
                        });
                      }}
                      className="h-16 bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white rounded-xl flex flex-col items-center justify-center gap-1 border-b-4 border-[#7B2FAE]"
                      data-testid="share-instagram"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      <span className="text-xs font-bold">Instagram</span>
                    </Button>

                    {/* Twitter/X */}
                    <Button
                      onClick={() => {
                        const shareText = `I just explored ${players.reduce((acc, p) => acc + p.collectedCards.length, 0)} amazing places in GeoQuest! 🌍✈️ Can you beat my score? Play now:`;
                        const shareUrl = "https://game.geoquestgame.com";
                        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                        requestAccess(() => {
                          window.open(twitterUrl, '_blank', 'width=600,height=400');
                          setShowShareDialog(false);
                        });
                      }}
                      className="h-16 bg-black hover:bg-gray-800 text-white rounded-xl flex flex-col items-center justify-center gap-1 border-b-4 border-gray-700"
                      data-testid="share-twitter"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      <span className="text-xs font-bold">X (Twitter)</span>
                    </Button>

                    {/* Text/SMS */}
                    <Button
                      onClick={() => {
                        const shareText = `Hey! I just explored ${players.reduce((acc, p) => acc + p.collectedCards.length, 0)} amazing places in GeoQuest! 🌍✈️ Can you beat my score? Try it here: https://game.geoquestgame.com`;
                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                        if (isMobile) {
                          window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
                        } else {
                          navigator.clipboard.writeText(shareText);
                          toast.success("Message copied!", {
                            description: "Paste it in your messaging app",
                            duration: 3000,
                          });
                        }
                        setShowShareDialog(false);
                      }}
                      className="h-16 bg-green-500 hover:bg-green-600 text-white rounded-xl flex flex-col items-center justify-center gap-1 border-b-4 border-green-700"
                      data-testid="share-text"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      <span className="text-xs font-bold">Text</span>
                    </Button>
                  </div>
                  
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setShowShareDialog(false)}
                      className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* TUTORIAL OVERLAY */}
            <AnimatePresence>
               {tutorialStep > 0 && (
                  <motion.div 
                     className="fixed inset-0 z-[300] pointer-events-auto flex flex-col"
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                  >
                     {/* Dimmed Background with mask effect logic would be complex, using simple overlays instead */}
                     <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => { /* Block clicks */ }} />

                     {/* Step 1: Player Cards (Top Right) */}
                     {tutorialStep === 1 && (
                        <div className="absolute top-24 right-4 md:right-12 max-w-xs">
                           <motion.div 
                              initial={{ scale: 0.8, opacity: 0, x: 20 }}
                              animate={{ scale: 1, opacity: 1, x: 0 }}
                              className="bg-white p-6 rounded-2xl shadow-2xl border-4 border-yellow-400 relative"
                           >
                              <Button 
                                 size="icon" 
                                 variant="ghost" 
                                 className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-gray-600"
                                 onClick={() => setTutorialStep(0)}
                              >
                                 <XCircle className="w-5 h-5" />
                              </Button>
                              <div className="absolute -top-3 -right-3 bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white pointer-events-none">1</div>
                              <h3 className="font-heading text-xl text-yellow-800 mb-2 pr-6">Become a Master Explorer!</h3>
                              <p className="text-gray-700 mb-4">Whoever collects <span className="font-bold text-yellow-600">10 stars</span> is a Master Explorer.</p>
                              <div className="flex justify-end">
                                 <Button onClick={() => setTutorialStep(2)} className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl">
                                    Next <ArrowRight className="ml-2 w-4 h-4" />
                                 </Button>
                              </div>
                              {/* Arrow pointing up/right */}
                              <div className="absolute -top-2 right-10 w-4 h-4 bg-white border-t-4 border-l-4 border-yellow-400 transform rotate-45"></div>
                           </motion.div>
                        </div>
                     )}

                     {/* Step 2: Mission Cards (Left Side / Top on Mobile) */}
                     {tutorialStep === 2 && (
                        <div className="absolute top-32 left-4 md:top-1/2 md:-translate-y-1/2 md:left-8 max-w-xs z-50">
                           <motion.div 
                              initial={{ scale: 0.8, opacity: 0, x: -20 }}
                              animate={{ scale: 1, opacity: 1, x: 0 }}
                              className="bg-white p-6 rounded-2xl shadow-2xl border-4 border-purple-400 relative"
                           >
                              <Button 
                                 size="icon" 
                                 variant="ghost" 
                                 className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-gray-600"
                                 onClick={() => setTutorialStep(0)}
                              >
                                 <XCircle className="w-5 h-5" />
                              </Button>
                              <div className="absolute -top-3 -left-3 bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white pointer-events-none">2</div>
                              <h3 className="font-heading text-xl text-purple-800 mb-2 pr-6">Complete Missions!</h3>
                              <p className="text-gray-700 mb-4">Finish missions to earn <span className="font-bold text-purple-600">2 additional stars</span>.</p>
                              <div className="flex justify-end gap-2">
                                 <Button variant="ghost" onClick={() => setTutorialStep(1)}>Back</Button>
                                 <Button onClick={() => setTutorialStep(3)} className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl">
                                    Next <ArrowRight className="ml-2 w-4 h-4" />
                                 </Button>
                              </div>
                              {/* Arrow pointing left (or up on mobile) */}
                              <div className="hidden md:block absolute top-1/2 -left-2 w-4 h-4 bg-white border-b-4 border-l-4 border-purple-400 transform rotate-45"></div>
                           </motion.div>
                        </div>
                     )}

                     {/* Step 3: Main Game Card (Center) */}
                     {tutorialStep === 3 && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-full px-4 z-50">
                           <motion.div 
                              initial={{ scale: 0.8, opacity: 0, y: 20 }}
                              animate={{ scale: 1, opacity: 1, y: 0 }}
                              className="bg-white p-6 rounded-2xl shadow-2xl border-4 border-blue-400 relative"
                           >
                              <Button 
                                 size="icon" 
                                 variant="ghost" 
                                 className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-gray-600"
                                 onClick={() => setTutorialStep(0)}
                              >
                                 <XCircle className="w-5 h-5" />
                              </Button>
                              <div className="absolute -top-3 -right-3 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white pointer-events-none">3</div>
                              <h3 className="font-heading text-xl text-blue-800 mb-2 pr-6">Guess the Location!</h3>
                              <p className="text-gray-700 mb-4">
                                 Guess the location card by clicking the clues below:
                                 <ul className="list-disc list-inside mt-2 mb-2 space-y-1">
                                    <li><span className="font-bold text-emerald-600">Easy</span> (Continent): 1 Star</li>
                                    <li><span className="font-bold text-blue-600">Medium</span> (Country): 2 Stars</li>
                                    <li><span className="font-bold text-orange-600">Hard</span> (City): 3 Stars</li>
                                 </ul>
                                 <span className="text-sm italic text-gray-500 block mt-2">
                                    Get it wrong, and you are in for a surprise event card! Test your luck, as event cards can help or derail your progress.
                                 </span>
                              </p>
                              <div className="flex justify-end gap-2">
                                 <Button variant="ghost" onClick={() => setTutorialStep(2)}>Back</Button>
                                 <Button onClick={() => setTutorialStep(0)} className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-8 font-bold shadow-lg hover:scale-105 transition-transform">
                                    Let's Play! 🚀
                                 </Button>
                              </div>
                           </motion.div>
                        </div>
                     )}
                  </motion.div>
               )}
            </AnimatePresence>
            
            {/* PWA Install Prompt - After 2 games */}
            <GameInstallPrompt 
              isOpen={showGameInstallPrompt} 
              onClose={() => {
                setShowGameInstallPrompt(false);
                dismissPrompt();
              }} 
            />
            
            {/* Share Prompt - After 3 Guess & Go games */}
            <SharePrompt 
              isOpen={showSharePromptDialog} 
              onClose={() => {
                setShowSharePromptDialog(false);
                dismissSharePrompt();
              }} 
            />
            
    </div>
  );
}
