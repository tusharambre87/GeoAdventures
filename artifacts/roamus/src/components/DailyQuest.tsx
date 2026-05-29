import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationCard, LOCATION_CARDS, STREAK_BADGES } from "@/lib/gameData";
import { DAILY_QUEST_CITIES, getDailyQuestCityForToday, fuzzyMatchCity } from "@/lib/dailyQuestData";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { useOffline } from "@/lib/offlineContext";
import { Bell, Clock, Share2, Trophy, Calendar, X, Facebook, Twitter, Instagram, MessageCircle, User, Smile, MapPin, HelpCircle, Flame, Award, Target, TrendingUp, Sticker, Star, Gift, ChevronLeft, ChevronRight, Sparkles, BookOpen, Lightbulb, Info, Home, Volume2, VolumeX, Mic, MicOff, Compass, Check } from "lucide-react";
import LearningSummary, { getGameLearningPoints } from "@/components/LearningSummary";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { GameCard } from "@/components/GameCard";
import { TTSButton } from "@/components/TTSButton";
import { PassportStamp } from "@/components/PassportStamp";
import { cn } from "@/lib/utils";
import { useParentalGate } from "@/components/ParentalGate";
import { getTodayDateString, useCountdown, formatCountdown } from "@/lib/dailyReset";

import { soundManager } from "@/lib/sound";
import { recordGamePlayed } from "@/components/TravelModeReminders";
import { ReturnToAdventuresPrompt, didComeFromGeoAdventures, clearCameFromGeoAdventures } from "@/components/GeoGamesFromAdventures";
import { setInternalNavToAdventures } from "@/components/GatedTravelMode";
import { useGameInstallPrompt } from "@/hooks/useGameInstallPrompt";
import { GameInstallPrompt } from "@/components/GameInstallPrompt";
import { useSharePrompt } from "@/hooks/useSharePrompt";
import { SharePrompt } from "@/components/SharePrompt";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { useNotificationPrompt } from "@/hooks/useNotificationPrompt";
import { NotificationPrompt } from "@/components/NotificationPrompt";

interface StickerData {
  id: string;
  city: string;
  country: string;
  continent: string;
  stickerIcon: string;
  funFact: string | null;
}

interface StreakBadgeUnlock {
  badge: { id: string; name: string; icon: string; description: string };
  bonusHints?: number;
}

export function DailyQuest() {
  const [, navigate] = useLocation();
  const returnTo = new URLSearchParams(window.location.search).get('from');
  const onClose = () => navigate(returnTo || "/");
  const { user, recordDailyQuestPlayed, recordGameSession, stats, syncStatsToBackend, checkStreakBadges, awardPassportStar, passportMastery, loadPlayerFromBackend, currentPlayerId, addCollectedCard, collectedCardIds, queueCardAdditionForSync, getPerGameStats, isLoadingPlayer } = useUser();
  const { activeExplorer, isLoading: explorerLoading } = useExplorer();
  
  useEffect(() => {
    if (activeExplorer?.id && activeExplorer.id !== currentPlayerId) {
      loadPlayerFromBackend(activeExplorer.id);
    }
  }, [activeExplorer?.id, currentPlayerId, loadPlayerFromBackend]);
  const { queueStickerGrant } = useOffline();
  const { requestAccess } = useParentalGate();
  const countdown = useCountdown();
  const [dailyCard, setDailyCard] = useState<LocationCard | null>(null);
  const [stage, setStage] = useState<"ONBOARDING" | "SELECT_PLAYER" | "START" | "PLAYING" | "STAMPING" | "STICKER_REWARD" | "PASSPORT_STAMP" | "QUEST_CELEBRATION" | "QUEST_MISSED" | "RESULT" | "ALREADY_PLAYED" | "STREAK_CELEBRATION">("SELECT_PLAYER");
  const [isNewlyDiscoveredCity, setIsNewlyDiscoveredCity] = useState(false);
  const [timer, setTimer] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [isWin, setIsWin] = useState(false);

  const [currentClue, setCurrentClue] = useState(1);
  const [guessesLeft, setGuessesLeft] = useState(3);
  const [freeTypeAnswer, setFreeTypeAnswer] = useState('');
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [wrongGuessMessage, setWrongGuessMessage] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [newStreakBadges, setNewStreakBadges] = useState<StreakBadgeUnlock[]>([]);
  const [showReminderEmailDialog, setShowReminderEmailDialog] = useState(false);
  const [showDisableReminderConfirm, setShowDisableReminderConfirm] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);
  const [earnedSticker, setEarnedSticker] = useState<StickerData | null>(null);
  const [isFetchingSticker, setIsFetchingSticker] = useState(false);
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [isStickerFlying, setIsStickerFlying] = useState(false);
  const [stickerCollected, setStickerCollected] = useState(false);
  const [isSpeakingFact, setIsSpeakingFact] = useState(false);
  const [showReturnToAdventures, setShowReturnToAdventures] = useState(false);
  const [cameFromAdventures] = useState(() => didComeFromGeoAdventures());
  
  // PWA Install Prompt
  const { shouldShowPrompt: showInstallPrompt, dismissPrompt, recordGameCompleted } = useGameInstallPrompt();
  const [showGameInstallPrompt, setShowGameInstallPrompt] = useState(false);
  
  // Share Prompt (after 3-day streak)
  const { shouldShowPrompt: showSharePromptFlag, dismissPrompt: dismissSharePrompt, checkStreakTrigger } = useSharePrompt();
  const [showSharePromptDialog, setShowSharePromptDialog] = useState(false);
  
  // Notification Prompt (after 2nd Daily Quest completion)
  const { shouldShowPrompt: showNotificationPromptFlag, dismissPrompt: dismissNotificationPrompt, enableAndDismiss: enableNotifications, recordDailyQuestCompletion } = useNotificationPrompt();
  const [showNotificationPromptDialog, setShowNotificationPromptDialog] = useState(false);
  
  // Free Limits & Founding Families Invitation
  const { recordDailyQuestDay, hasReachedFreeLimit } = useFreeLimits();
  
  // Per-game stats for Daily Quest (totalGames, wins, etc.)
  const [perGameStats, setPerGameStats] = useState<{ totalGames: number; wins: number } | null>(null);
  
  useEffect(() => {
    if (currentPlayerId) {
      getPerGameStats('daily_quest').then(stats => {
        if (stats) {
          setPerGameStats({ totalGames: stats.totalGames || 0, wins: stats.wins || 0 });
        }
      });
    }
  }, [currentPlayerId, getPerGameStats]);
  
  // Show share prompt when conditions are met (after install prompt is dismissed or if it's not showing)
  useEffect(() => {
    if (stage === "RESULT" && showSharePromptFlag && !showInstallPrompt && !showGameInstallPrompt && !showSharePromptDialog) {
      const timer = setTimeout(() => setShowSharePromptDialog(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [stage, showSharePromptFlag, showInstallPrompt, showGameInstallPrompt, showSharePromptDialog]);
  
  // Show notification prompt when conditions are met (after other prompts)
  useEffect(() => {
    if (stage === "RESULT" && showNotificationPromptFlag && !showInstallPrompt && !showGameInstallPrompt && !showSharePromptDialog && !showNotificationPromptDialog) {
      const timer = setTimeout(() => setShowNotificationPromptDialog(true), 3500);
      return () => clearTimeout(timer);
    }
  }, [stage, showNotificationPromptFlag, showInstallPrompt, showGameInstallPrompt, showSharePromptDialog, showNotificationPromptDialog]);
  
  // Voice Input State
  const [voiceGuess, setVoiceGuess] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Auto-play TTS when sticker reward is shown
  useEffect(() => {
    if (stage === "STICKER_REWARD" && earnedSticker && !isStickerFlying && !stickerCollected) {
      const factText = earnedSticker.funFact || dailyCard?.didYouKnow || "";
      if (factText) {
        // Small delay to let the animation settle
        const timer = setTimeout(() => {
          setIsSpeakingFact(true);
          soundManager.speak(factText);
          
          // Listen for speech end (approximate based on text length)
          const duration = Math.max(3000, factText.length * 80);
          setTimeout(() => setIsSpeakingFact(false), duration);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [stage, earnedSticker, isStickerFlying, stickerCollected, dailyCard?.didYouKnow]);
  
  // Toggle TTS for the fact
  const toggleSpeakFact = () => {
    const factText = earnedSticker?.funFact || dailyCard?.didYouKnow || "";
    if (isSpeakingFact) {
      soundManager.stopSpeaking();
      setIsSpeakingFact(false);
    } else if (factText) {
      setIsSpeakingFact(true);
      soundManager.speak(factText);
      const duration = Math.max(3000, factText.length * 80);
      setTimeout(() => setIsSpeakingFact(false), duration);
    }
  };
  
  // Track session stats for guests (when no explorer is active)
  // Persist in localStorage to survive dialog close/reopen
  const today = getTodayDateString();
  const guestSessionKey = `geoquest_guest_session_${today}`;
  
  const getGuestSession = () => {
    try {
      const stored = localStorage.getItem(guestSessionKey);
      return stored ? JSON.parse(stored) : { played: false, won: false };
    } catch {
      return { played: false, won: false };
    }
  };
  
  const [guestSession, setGuestSession] = useState(getGuestSession);
  
  const updateGuestSession = (played: boolean, won: boolean) => {
    const session = { played, won };
    localStorage.setItem(guestSessionKey, JSON.stringify(session));
    setGuestSession(session);
  };
  
  // Use per-game stats from server if available (most accurate), otherwise fall back to gameHistory
  // perGameStats comes from playerGameStats table which tracks each game type separately
  const dailyQuestGamesPlayed = currentPlayerId && perGameStats 
    ? perGameStats.totalGames 
    : ((stats.gameHistory?.filter(g => g.date).length || 0) + (guestSession.played && !currentPlayerId ? 1 : 0));
  const dailyQuestWins = currentPlayerId && perGameStats 
    ? perGameStats.wins 
    : ((stats.gameHistory?.filter(g => g.won).length || 0) + (guestSession.won && !currentPlayerId ? 1 : 0));
  const dailyQuestWinPercent = dailyQuestGamesPlayed > 0 ? Math.round((dailyQuestWins / dailyQuestGamesPlayed) * 100) : 0;
  
  // For display: use DAILY QUEST streak (specific to Daily Quest plays only)
  // Explorer streak is shown on Home page; Daily Quest page shows Daily Quest specific streak
  const displayStreak = currentPlayerId ? (stats.dailyQuestStreak || 0) : (guestSession.played ? 1 : 0);
  const displayMaxStreak = currentPlayerId ? (stats.dailyQuestMaxStreak || stats.longestStreak || 0) : (guestSession.played ? 1 : 0);
  const displayStreakFreezes = currentPlayerId ? (stats.streakFreezes || 0) : 0;

  // Player Selection State
  const [selectedPlayerName, setSelectedPlayerName] = useState("");
  const [customPlayerName, setCustomPlayerName] = useState("");
  
  // Track whether game has progressed past initial stage (to prevent stage reset)
  const gameInProgressRef = useRef(false);

  const generateInitialRevealedLetters = (cityName: string): Set<number> => {
    const letters = cityName.split('');
    const letterIndices = letters.reduce((acc: number[], char, i) => {
      if (/[a-zA-Z]/.test(char)) acc.push(i);
      return acc;
    }, []);
    if (letterIndices.length <= 4) return new Set();
    if (letterIndices.length <= 7) {
      const shuffled = [...letterIndices].sort(() => Math.random() - 0.5);
      return new Set(shuffled.slice(0, 1));
    }
    const shuffled = [...letterIndices].sort(() => Math.random() - 0.5);
    return new Set(shuffled.slice(0, Math.min(2, Math.floor(letterIndices.length * 0.15))));
  };

  const revealMoreLetters = (cityName: string, currentRevealed: Set<number>): Set<number> => {
    const letters = cityName.split('');
    const hiddenLetterIndices = letters.reduce((acc: number[], char, i) => {
      if (/[a-zA-Z]/.test(char) && !currentRevealed.has(i)) acc.push(i);
      return acc;
    }, []);
    const totalLetters = letters.filter(c => /[a-zA-Z]/.test(c)).length;
    let revealCount: number;
    if (totalLetters <= 4) {
      revealCount = 1;
    } else if (totalLetters <= 7) {
      revealCount = Math.max(1, Math.min(2, hiddenLetterIndices.length - 1));
    } else {
      revealCount = Math.max(2, Math.min(3, Math.floor(hiddenLetterIndices.length * 0.35)));
    }
    revealCount = Math.min(revealCount, hiddenLetterIndices.length);
    const shuffled = [...hiddenLetterIndices].sort(() => Math.random() - 0.5);
    const newRevealed = new Set(currentRevealed);
    shuffled.slice(0, revealCount).forEach(i => newRevealed.add(i));
    return newRevealed;
  };

  const getMysteryLetters = (cityName: string, revealed: Set<number>): string[] => {
    return cityName.split('').map((char, i) => {
      if (/[^a-zA-Z]/.test(char)) return char;
      if (revealed.has(i)) return char.toUpperCase();
      return '_';
    });
  };
  
  const pageContentRef = useRef<HTMLDivElement>(null);
  
  // Generate Daily Challenge based on Date & Check Access
  useEffect(() => {
    // Wait for explorer context AND player data to finish loading before checking
    // This ensures we have the correct stats.lastDailyQuestDate for the current explorer
    if (!explorerLoading && !isLoadingPlayer) {
      // Additional guard: ensure currentPlayerId matches activeExplorer.id
      // This prevents checking stale data during explorer switches
      if (activeExplorer?.id && activeExplorer.id !== currentPlayerId) {
        // Player data is still loading for the new explorer, wait...
        return;
      }
      
      // CRITICAL: Don't reset stage if game is already in progress (after playing/winning)
      // This prevents the celebration screens from being skipped when stats update
      if (gameInProgressRef.current) {
        return;
      }
      
      const today = new Date();
      const dateString = getTodayDateString();
      
      // Check if explorer has seen Daily Quest onboarding (from database for logged-in users)
      // For guests, fall back to localStorage
      const hasSeenOnboarding = activeExplorer?.hasSeenDailyQuestOnboarding 
        ?? localStorage.getItem('geoquest_daily_quest_onboarding_seen') === 'true';
      
      const explorerKey = activeExplorer?.id || user?.email || 'guest';
      const lastPlayedKey = `geoquest_daily_last_date_${explorerKey}`;
      const lastPlayed = localStorage.getItem(lastPlayedKey);
      const lastPlayedNormalized = lastPlayed ? 
        (lastPlayed.includes('-') ? lastPlayed : new Date(lastPlayed).toISOString().split('T')[0]) : null;
      const backendLastPlayed = stats.lastDailyQuestDate ? 
        (stats.lastDailyQuestDate.includes('-') ? stats.lastDailyQuestDate : new Date(stats.lastDailyQuestDate).toISOString().split('T')[0]) : null;
      const hasPlayedToday = lastPlayedNormalized === dateString;
      const backendSaysPlayed = backendLastPlayed === dateString;

      if (hasPlayedToday || backendSaysPlayed) {
          setStage("ALREADY_PLAYED");
      } else {
          if (!hasSeenOnboarding) {
            if (activeExplorer) {
              try {
                fetch(`/api/players/${activeExplorer.id}/stats`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ hasSeenDailyQuestOnboarding: true }),
                });
              } catch {}
            } else {
              localStorage.setItem('geoquest_daily_quest_onboarding_seen', 'true');
            }
          }
          if (activeExplorer) {
              setSelectedPlayerName(activeExplorer.name);
              setStage("START");
          } else if (selectedPlayerName) {
              setStage("START");
          } else {
              setStage("SELECT_PLAYER");
              setSelectedPlayerName("");
              setCustomPlayerName("");
          }
      }

      const card = getDailyQuestCityForToday(dateString);
      setDailyCard(card);
      setTimer(0);
    }
  }, [user, activeExplorer?.id, explorerLoading, isLoadingPlayer, currentPlayerId, stats.lastDailyQuestDate]);

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stage === "PLAYING") {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage]);

  const handlePlayerSelect = (name: string) => {
      setSelectedPlayerName(name);
      setStage("START");
  };

  const handleCustomPlayerSubmit = () => {
      if (customPlayerName.trim()) {
          setSelectedPlayerName(customPlayerName.trim());
          setStage("START");
      }
  };

  const handleOnboardingNext = () => {
    if (onboardingSlide < 3) {
      setOnboardingSlide(prev => prev + 1);
    }
  };

  const handleOnboardingPrev = () => {
    if (onboardingSlide > 0) {
      setOnboardingSlide(prev => prev - 1);
    }
  };

  const handleOnboardingComplete = async () => {
    // For logged-in users with an active explorer, save to database
    if (activeExplorer) {
      try {
        await fetch(`/api/players/${activeExplorer.id}/stats`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ hasSeenDailyQuestOnboarding: true }),
        });
      } catch (error) {
        console.error('Failed to save onboarding status:', error);
      }
      setSelectedPlayerName(activeExplorer.name);
      setStage("START");
    } else {
      // For guests, use localStorage as fallback
      localStorage.setItem('geoquest_daily_quest_onboarding_seen', 'true');
      setStage("SELECT_PLAYER");
      setSelectedPlayerName("");
      setCustomPlayerName("");
    }
  };

  const handleOnboardingSkip = async () => {
    // For logged-in users with an active explorer, save to database
    if (activeExplorer) {
      try {
        await fetch(`/api/players/${activeExplorer.id}/stats`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ hasSeenDailyQuestOnboarding: true }),
        });
      } catch (error) {
        console.error('Failed to save onboarding status:', error);
      }
      setSelectedPlayerName(activeExplorer.name);
      setStage("START");
    } else {
      // For guests, use localStorage as fallback
      localStorage.setItem('geoquest_daily_quest_onboarding_seen', 'true');
      setStage("SELECT_PLAYER");
      setSelectedPlayerName("");
      setCustomPlayerName("");
    }
  };

  const handleReplayOnboarding = () => {
    setOnboardingSlide(0);
    setStage("ONBOARDING");
  };

  const handleStart = () => {
    gameInProgressRef.current = true;
    const dateString = getTodayDateString();
    const card = getDailyQuestCityForToday(dateString);
    setDailyCard(card);
    setCurrentClue(1);
    setGuessesLeft(3);
    setFreeTypeAnswer('');
    setWrongGuessMessage('');
    const initialRevealed = generateInitialRevealedLetters(card.city);
    setRevealedIndices(initialRevealed);
    setStage("PLAYING");
    setTimer(0);
  };

  const getQuestClues = (card: LocationCard): string[] => {
    if (Array.isArray(card.cluesAlt2) && card.cluesAlt2.length === 3) return card.cluesAlt2;
    if (card.clues.length >= 3) return card.clues.slice(0, 3);
    return [...card.clues, card.didYouKnow || 'This city has a fascinating history!'].slice(0, 3);
  };

  const handleQuestGuessSubmit = () => {
    if (!dailyCard || !freeTypeAnswer.trim()) return;
    const isCorrect = fuzzyMatchCity(freeTypeAnswer.trim(), dailyCard.city);
    if (isCorrect) {
      handleGuess(dailyCard.city);
    } else {
      const newGuessesLeft = guessesLeft - 1;
      setGuessesLeft(newGuessesLeft);
      soundManager.playError();
      
      if (newGuessesLeft <= 0) {
        handleGuess(freeTypeAnswer.trim());
      } else {
        const newRevealed = revealMoreLetters(dailyCard.city, revealedIndices);
        setRevealedIndices(newRevealed);
        setWrongGuessMessage("Not quite — more letters revealed!");
        setFreeTypeAnswer('');
        setTimeout(() => setWrongGuessMessage(''), 3000);
      }
    }
  };

  const handleCollectSticker = () => {
    setIsStickerFlying(true);
    setTimeout(() => {
      setIsStickerFlying(false);
      setStickerCollected(true);
    }, 1200);
  };
  
  const handleContinueAfterSticker = () => {
    setStickerCollected(false);
    // If newly discovered city, show passport stamp stage first
    if (isNewlyDiscoveredCity) {
      setStage("PASSPORT_STAMP");
    } else {
      saveQuestDataAndNavigate(true);
    }
  };
  
  const saveQuestDataAndNavigate = (won: boolean) => {
    if (dailyCard) {
      const clues = getQuestClues(dailyCard);
      const questData = {
        playerName: selectedPlayerName,
        timer,
        isWin: won,
        difficulty: 'quest' as const,
        clues,
        cityName: dailyCard.city,
        country: dailyCard.country,
        continent: dailyCard.continent,
        didYouKnow: dailyCard.didYouKnow || null,
        newStreakBadges: newStreakBadges.map(b => ({ badge: b.badge, bonusHints: b.bonusHints })),
        timestamp: Date.now(),
      };
      localStorage.setItem('geoquest_last_quest_data', JSON.stringify(questData));
    }
    onClose();
    navigate(`/city/${dailyCard?.id}?from=quest${won ? '' : '&lost=true'}`);
  };

  const handleContinueAfterPassportStamp = () => {
    setStage("QUEST_CELEBRATION");
  };

  const handleQuestCelebrationNavigate = () => {
    saveQuestDataAndNavigate(true);
  };

  // Speech Recognition for voice input
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Sorry, your browser doesn't support voice input. Tap an answer instead!");
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
      const transcript = event.results[0][0].transcript.trim();
      setVoiceGuess(transcript);
      setIsListening(false);
      
      // Try to match the spoken answer to one of the options
      const normalizedTranscript = transcript.toLowerCase();
      const matchedOption = options.find(opt => 
        opt.toLowerCase() === normalizedTranscript ||
        opt.toLowerCase().includes(normalizedTranscript) ||
        normalizedTranscript.includes(opt.toLowerCase())
      );
      
      if (matchedOption) {
        toast.success(`Got it: "${matchedOption}"`);
        setTimeout(() => handleGuess(matchedOption), 500);
      } else {
        toast.info(`I heard "${transcript}". Tap the correct city!`);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        toast.info("I didn't hear anything. Try again!");
      } else if (event.error === 'not-allowed') {
        toast.error("Microphone access denied. Please allow microphone access.");
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

  const handleGuess = (city: string) => {
    if (!dailyCard) return;
    setSelectedOption(city);
    
    const today = getTodayDateString();
    const explorerKey = activeExplorer?.id || user?.email || 'guest';
    localStorage.setItem(`geoquest_daily_last_date_${explorerKey}`, today);
    localStorage.setItem(`geoquest_daily_last_player_${explorerKey}`, selectedPlayerName);
    
    // Update User Stats via backend (Streak and Best Time)
    // This calls the backend which calculates the correct streak and returns it
    const won = city === dailyCard.city;
    if (currentPlayerId) {
      recordGameSession('daily_quest', won, timer * 1000).then((result) => {
        if (result) {
          // Backend returns the daily quest streak for badge checking (not explorer streak)
          const dailyStreak = result.streakResult.dailyQuestStreak || 1;
          console.log('🎯 [DailyQuest] Backend streak result:', { dailyQuestStreak: dailyStreak, explorerStreak: result.streakResult.newStreak });
          
          // Update per-game stats locally so display updates immediately
          if (result.gameStats) {
            setPerGameStats({
              totalGames: result.gameStats.totalGames || 0,
              wins: result.gameStats.wins || 0,
            });
          }
          
          // Check for new streak badges using Daily Quest streak (not explorer streak)
          const unlocks = checkStreakBadges(dailyStreak);
          if (unlocks.length > 0) {
            setNewStreakBadges(unlocks);
            
            // Extra celebration for streak badge unlock!
            setTimeout(() => {
              confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.5 },
                colors: ['#FFD700', '#FFA500', '#FF6347', '#FF4500', '#DC143C']
              });
              confetti({
                particleCount: 100,
                spread: 160,
                origin: { y: 0.4 },
                colors: ['#FFD700', '#FFA500', '#FF6347']
              });
            }, 800);
          }
          
          // Check for share prompt trigger (3-day streak) - uses daily quest streak
          checkStreakTrigger(dailyStreak);
        }
      });
    } else {
      // Fallback for guests - use local recording
      recordDailyQuestPlayed(won, timer);
      updateGuestSession(true, won);
    }
    
    // Track game for PWA install prompt (after 2 games)
    recordGameCompleted('daily-quest');
    
    // Track for notification prompt (after 2nd completion)
    recordDailyQuestCompletion();
    
    // Record daily quest day for free limits tracking
    recordDailyQuestDay();
    
    // Show install prompt if conditions are met (after result is shown)
    if (showInstallPrompt) {
      setTimeout(() => setShowGameInstallPrompt(true), 3000);
    }
    
    // Track analytics event
    import('@/lib/analytics').then(({ trackGameEvent }) => {
      trackGameEvent('daily_quest_complete', 'daily_quest', {
        timeSpentSeconds: timer,
        completed: true,
        won: city === dailyCard.city,
      });
    });
    
    // Track for Travel Mode reminders
    recordGamePlayed();
    
    // Sync stats to backend
    setTimeout(() => syncStatsToBackend(), 500);

    if (city === dailyCard.city) {
      setIsWin(true);
      
      // Check if this city is newly discovered (not already collected from Guess & Go)
      const isAlreadyCollected = collectedCardIds.includes(dailyCard.id);
      if (!isAlreadyCollected) {
        // Award Star 1 (Discovered) and add to collected cards
        addCollectedCard(dailyCard.id);
        awardPassportStar(dailyCard.id, 1);
        setIsNewlyDiscoveredCity(true);
        
        // Persist the collected card to backend via /add-game-rewards endpoint
        // This is required because the regular stats sync excludes collectedCardIds
        // Supports offline mode - queues for sync if offline or on failure
        if (activeExplorer?.id) {
          if (navigator.onLine) {
            fetch(`/api/players/${activeExplorer.id}/add-game-rewards`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cardIds: [dailyCard.id] }),
            }).then(res => {
              if (!res.ok) {
                // Queue for later retry if server rejects
                queueCardAdditionForSync(activeExplorer.id, [dailyCard.id]);
              }
            }).catch(() => {
              // Queue for offline sync on network failure
              queueCardAdditionForSync(activeExplorer.id, [dailyCard.id]);
            });
          } else {
            // Offline - queue for later sync
            queueCardAdditionForSync(activeExplorer.id, [dailyCard.id]);
          }
        }
      } else {
        setIsNewlyDiscoveredCity(false);
      }
      
      // Show sticker reward stage first, then go to result
      setStage("STICKER_REWARD");
      setIsFetchingSticker(true);

      // Grant the sticker to the user
      const visitorId = localStorage.getItem('geoquest_visitor_id') || `guest_${Date.now()}`;
      if (!localStorage.getItem('geoquest_visitor_id')) {
        localStorage.setItem('geoquest_visitor_id', visitorId);
      }
      
      // Create local sticker data for offline display
      const localStickerData: StickerData = {
        id: `local_${dailyCard.city}_${Date.now()}`,
        city: dailyCard.city,
        country: dailyCard.country,
        continent: dailyCard.continent,
        stickerIcon: dailyCard.landmarkIcon || "🏙️",
        funFact: dailyCard.didYouKnow || null,
      };
      
      // Check if online before attempting server grant
      if (navigator.onLine) {
        fetch('/api/stickers/grant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            playerId: activeExplorer?.id || null,
            city: dailyCard.city,
            country: dailyCard.country,
          })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.sticker?.stickerDetails) {
              const stickerData = data.sticker.stickerDetails;
              stickerData.city = dailyCard.city;
              setEarnedSticker(stickerData);
            } else {
              // Fallback to local sticker data
              setEarnedSticker(localStickerData);
            }
            setIsFetchingSticker(false);
          })
          .catch(err => {
            console.error("Failed to grant sticker:", err);
            // Use local sticker data on error
            setEarnedSticker(localStickerData);
            setIsFetchingSticker(false);
            
            // Queue for sync on network error using the offline sync system
            queueStickerGrant({
              visitorId,
              playerId: activeExplorer?.id || null,
              city: dailyCard.city,
              country: dailyCard.country,
            });
          });
      } else {
        // Offline: use local sticker data and queue for sync
        setEarnedSticker(localStickerData);
        setIsFetchingSticker(false);
        
        // Queue sticker grant using the offline sync system
        queueStickerGrant({
          visitorId,
          playerId: activeExplorer?.id || null,
          city: dailyCard.city,
          country: dailyCard.country,
        });
        toast.info("Souvenir saved! It will sync when you're back online.");
      }

      // Trigger 5-second Firework Celebration
      const duration = 5000;
      const end = Date.now() + duration;

      // Initial burst
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

      // Continuous fireworks for 5 seconds
      const interval = setInterval(() => {
        if (Date.now() > end) {
          clearInterval(interval);
          // TTS auto-plays in the sticker reward screen via useEffect
          return;
        }

        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: {
            x: Math.random(),
            y: Math.random() - 0.2
          }
        });
      }, 250);

    } else {
        setIsWin(false);
        soundManager.playError();
        gameInProgressRef.current = true;
        setStage("QUEST_MISSED");
    }
  };

  const getShareText = () => {
    const name = selectedPlayerName || "A Junior Explorer";
    let age = "";
    if (user?.registeredPlayers) {
        const p = user.registeredPlayers.find(p => p.name === selectedPlayerName);
        if (p) age = `(Age ${p.age})`;
    } else if (user?.username === selectedPlayerName && user.age) {
        age = `(Age ${user.age})`;
    }

    return `🚀 Daily Quest Complete!\n\n${name} ${age} found ${dailyCard?.city} in ${timer} seconds! 🌍⏱️\n\nCan you beat my time? Play GeoQuest Junior: ${window.location.origin}`;
  };

  const handleShare = (platform: string) => {
    const text = getShareText();
    const url = window.location.origin;
    
    let shareUrl = "";
    
    switch(platform) {
        case "twitter":
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            break;
        case "facebook":
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
            break;
        case "whatsapp":
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
            break;
        case "copy":
        default:
            navigator.clipboard.writeText(text);
            toast.success("Result copied to clipboard!");
            return;
    }
    
    if (shareUrl) {
      requestAccess(() => {
        window.open(shareUrl, '_blank');
      });
    }
  };

  if (!dailyCard) return null;

  // Helper to get color styles for the "Mystery Card" view
  const getCardStyles = (continent: string) => {
     // For Mystery Card, we might want to mask the continent color too? 
     // Or give a hint? "I am in Africa..." 
     // Let's show the color as a hint!
      switch(continent) {
        case "Europe": return "bg-[#9d7ad2] border-[#9d7ad2]"; // Purple
        case "North America": return "bg-[#ef5350] border-[#ef5350]"; // Red
        case "Asia": return "bg-[#fdd835] border-[#fdd835] text-black"; // Yellow
        case "South America": return "bg-[#66bb6a] border-[#66bb6a]"; // Green
        case "Africa": return "bg-[#ff9800] border-[#ff9800]"; // Orange
        case "Oceania": return "bg-[#26c6da] border-[#26c6da]"; // Teal
        default: return "bg-purple-500 border-purple-500";
      }
  };

  const colorClass = getCardStyles(dailyCard.continent);

  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-gray-900">
      <div ref={pageContentRef} className="max-w-md mx-auto px-4 py-4 pb-24">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-10 h-10 rounded-xl"
            data-testid="button-back-daily-quest"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Daily Quest</h1>
        </div>
        
        <div className="relative pb-4">
            <AnimatePresence>
                {stage === "ALREADY_PLAYED" && (
                    <motion.div 
                        key="already-played"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center"
                    >
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border-4 border-green-200 dark:border-green-700 shadow-2xl text-center w-full max-w-sm">
                            <div className="w-14 h-14 bg-green-100 dark:bg-green-700/30 rounded-full mx-auto mb-3 flex items-center justify-center">
                                <Check className="w-7 h-7 text-green-500 dark:text-green-400" />
                            </div>
                            <h3 
                                className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1"
                                onDoubleClick={() => setStage("QUEST_CELEBRATION")}
                            >Quest Completed</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">{activeExplorer?.name || "You"} already played today's quest.</p>

                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl p-4 mb-4 border border-orange-200 dark:border-orange-700">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-left">
                                        <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                            🔥 {displayStreak}-Day Explorer Streak
                                        </p>
                                        <p className="text-sm text-orange-500 dark:text-orange-300 font-medium">
                                            {displayStreak >= 7 ? "You're on fire!" :
                                             displayStreak >= 3 ? "You're going places!" :
                                             "You're heating up!"}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                                        const today = new Date();
                                        const todayDayIndex = today.getDay();
                                        const isToday = index === todayDayIndex;
                                        const isPast = index < todayDayIndex;
                                        const daysAgo = todayDayIndex - index;
                                        const wasPlayed = isPast && daysAgo < displayStreak;
                                        return (
                                            <div key={index} className="flex flex-col items-center">
                                                <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium mb-0.5">{day}</span>
                                                <div className={cn(
                                                    "w-7 h-7 rounded-full flex items-center justify-center text-sm",
                                                    isToday ? "bg-yellow-400 text-white ring-2 ring-yellow-500" :
                                                    wasPlayed ? "bg-green-400 dark:bg-green-600 text-white" :
                                                    "bg-gray-200 dark:bg-gray-700"
                                                )}>
                                                    {(isToday || wasPlayed) && <span className="text-white text-xs">✓</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {displayStreakFreezes > 0 && (
                                <div className="flex items-center justify-center gap-2 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-700">
                                    <span className="text-lg">🧊</span>
                                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                        {displayStreakFreezes} Streak Freeze{displayStreakFreezes !== 1 ? 's' : ''} Available
                                    </span>
                                </div>
                            )}

                            {dailyCard && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-4 border border-green-200 dark:border-green-700">
                                    <p className="text-xs text-green-600 dark:text-green-400 uppercase font-bold mb-2">🌍 Today's City</p>
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        {dailyCard.flagUrl && (
                                            <img src={dailyCard.flagUrl} alt="" className="w-6 h-4 rounded-sm object-cover shadow-sm" />
                                        )}
                                        <span className="text-lg font-black text-gray-800 dark:text-gray-100">{dailyCard.city}</span>
                                    </div>
                                </div>
                            )}

                            {dailyCard && (
                                <Button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/city/${dailyCard.id}?from=quest`);
                                    }}
                                    className="w-full h-11 text-base font-bold rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg mb-4"
                                    data-testid="button-explore-city-already"
                                >
                                    🏙️ Explore {dailyCard.city}
                                </Button>
                            )}

                            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3 mb-4 border border-purple-200 dark:border-purple-700">
                                <p className="text-xs text-purple-500 dark:text-purple-400 uppercase font-bold mb-1">Next Quest In</p>
                                <p className="text-2xl font-mono font-bold text-purple-700 dark:text-purple-300">{formatCountdown(countdown)}</p>
                            </div>

                            <div className="mb-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-2">🏆 Streak Milestones</p>
                                {(() => {
                                    const badgeTiers = [
                                        [0, 4], [4, 8], [8, 12]
                                    ];
                                    const currentTierIndex = displayStreak >= 200 ? 2 : displayStreak >= 31 ? 1 : 0;
                                    const [start, end] = badgeTiers[currentTierIndex];
                                    const visibleBadges = STREAK_BADGES.slice(start, end);
                                    return (
                                        <div className="grid grid-cols-4 gap-2">
                                            {visibleBadges.map((badge) => {
                                                const isUnlocked = displayStreak >= badge.daysRequired ||
                                                    (stats.unlockedStreakBadgeIds || []).includes(badge.id);
                                                return (
                                                    <div
                                                        key={badge.id}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-2 rounded-xl border-2 h-[75px]",
                                                            isUnlocked
                                                                ? "bg-gradient-to-b from-amber-300 to-yellow-400 border-amber-500 shadow-lg"
                                                                : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                                        )}
                                                    >
                                                        <span className={cn("text-xl mb-0.5", !isUnlocked && "grayscale opacity-50")}>{badge.icon}</span>
                                                        <span className={cn("text-[10px] font-bold", isUnlocked ? "text-amber-900" : "text-gray-600 dark:text-gray-400")}>{badge.daysRequired}d</span>
                                                        <span className={cn("text-[8px] font-medium", isUnlocked ? "text-amber-800" : "text-gray-500 dark:text-gray-400")}>{badge.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            {dailyCard ? (
                                <Button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/city/${dailyCard.id}?from=quest`);
                                    }}
                                    className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg"
                                    data-testid="button-start-adventure-already"
                                >
                                    Start Your Adventure
                                </Button>
                            ) : (
                                <Button
                                    onClick={onClose}
                                    className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg"
                                    data-testid="button-back-to-home"
                                >
                                    Back to Home
                                </Button>
                            )}
                        </div>
                    </motion.div>
                )}

                {stage === "SELECT_PLAYER" && (
                    <motion.div 
                        key="select-player"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center justify-center min-h-[60vh]"
                    >
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl text-center w-full border border-gray-100 dark:border-gray-700">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-full mx-auto mb-5 flex items-center justify-center">
                                <span className="text-4xl">🔍</span>
                            </div>
                            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2" style={{ fontFamily: 'Nunito, Poppins, sans-serif' }}>What's your name?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter your name to start the quest.</p>
                            
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Enter Name..." 
                                    value={customPlayerName}
                                    onChange={(e) => setCustomPlayerName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCustomPlayerSubmit()}
                                    className="h-12 text-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 rounded-xl"
                                    data-testid="input-player-name"
                                />
                                <Button 
                                    onClick={handleCustomPlayerSubmit}
                                    disabled={!customPlayerName.trim()}
                                    className="h-12 px-6 rounded-xl font-bold bg-gradient-to-r from-[#7B5CFF] to-[#A855F7] hover:from-[#6B4CFF] hover:to-[#9845E7] text-white"
                                    data-testid="button-player-go"
                                >
                                    Go
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {stage === "START" && (
                    <motion.div 
                        key="start"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="flex flex-col items-center justify-center min-h-[70vh]"
                    >
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl text-center w-full border border-gray-100 dark:border-gray-700">
                            <div className="w-28 h-28 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-full mx-auto mb-5 flex items-center justify-center relative overflow-hidden">
                                <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full" aria-hidden="true">
                                  <g transform="translate(0, 42)" opacity="0.2" fill="currentColor" className="text-purple-800 dark:text-purple-300">
                                    <rect x="8" y="30" width="12" height="48" rx="1" />
                                    <rect x="22" y="18" width="10" height="60" rx="1" />
                                    <rect x="34" y="38" width="8" height="40" rx="1" />
                                    <rect x="44" y="10" width="14" height="68" rx="1" />
                                    <polygon points="48,10 51,2 54,10" />
                                    <rect x="60" y="28" width="10" height="50" rx="1" />
                                    <rect x="72" y="20" width="12" height="58" rx="1" />
                                    <rect x="86" y="34" width="9" height="44" rx="1" />
                                    <rect x="97" y="24" width="14" height="54" rx="1" />
                                    <polygon points="101,24 104,14 107,24" />
                                  </g>
                                </svg>
                                <span className="text-5xl relative z-10">🔍</span>
                            </div>
                            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-1" style={{ fontFamily: 'Nunito, Poppins, sans-serif' }}>Mystery City</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Solve today's destination before the clues run out.</p>
                            
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 px-3 py-2 rounded-xl">
                                    <span className="text-lg">🧠</span>
                                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">3 clues</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 px-3 py-2 rounded-xl">
                                    <span className="text-lg">✏️</span>
                                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">3 guesses</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-xl">
                                    <span className="text-lg">⭐</span>
                                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">Stamp</span>
                                </div>
                            </div>
                            
                            <Button 
                                onClick={handleStart} 
                                size="lg" 
                                className="w-full text-lg py-6 rounded-2xl shadow-lg border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 transition-all bg-gradient-to-r from-[#7B5CFF] to-[#A855F7] hover:from-[#6B4CFF] hover:to-[#9845E7] text-white font-bold"
                                style={{ boxShadow: '0 0 20px rgba(123, 92, 255, 0.3)' }}
                                data-testid="button-start-quest"
                            >
                                Start Quest
                            </Button>
                        </div>
                    </motion.div>
                )}

                {stage === "PLAYING" && dailyCard && (
                    <motion.div 
                        key="playing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="min-h-[75vh] flex flex-col"
                    >
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mx-auto relative flex-1 flex flex-col w-full">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-[#7B5CFF] to-[#A855F7] px-4 py-3 flex items-center justify-between">
                                <span className="text-white text-sm font-bold">Daily Quest</span>
                                <span className="text-white/80 text-sm font-medium">Guess {4 - guessesLeft} of 3</span>
                            </div>

                            {/* Mystery Letters */}
                            <div className="bg-[#F7F6FB] dark:bg-gray-900 px-4 py-5 text-center relative">
                                <div className="absolute top-2 right-2 bg-gray-800/80 text-white px-2.5 py-1 rounded-full font-mono text-xs font-bold flex items-center gap-1.5 z-20">
                                    <Clock className="w-3 h-3" /> {timer}s
                                </div>
                                <div className="flex items-center justify-center gap-1.5 flex-wrap" data-testid="mystery-letters">
                                    {getMysteryLetters(dailyCard.city, revealedIndices).map((char, i) => (
                                        <motion.span
                                            key={`${i}-${char}`}
                                            initial={char !== '_' && revealedIndices.has(i) ? { scale: 0.5, opacity: 0 } : {}}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.3, type: "spring" }}
                                            className={cn(
                                                "inline-flex items-center justify-center text-2xl font-black tracking-wider",
                                                char === '_' ? "text-gray-300 dark:text-gray-600 w-6" : 
                                                char === ' ' ? "w-3" :
                                                /[^a-zA-Z]/.test(char) ? "text-gray-400 w-3" :
                                                "text-gray-800 dark:text-gray-100 w-6"
                                            )}
                                            style={{ fontFamily: 'Nunito, monospace' }}
                                        >
                                            {char}
                                        </motion.span>
                                    ))}
                                </div>
                            </div>

                            {/* Wrong Guess Message */}
                            <AnimatePresence>
                                {wrongGuessMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-amber-50 dark:bg-amber-900/30 px-4 py-2 text-center border-b border-amber-200 dark:border-amber-700"
                                    >
                                        <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{wrongGuessMessage}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* All Clues - shown at once */}
                            <div className="p-4 flex-1">
                                {(() => {
                                    const clues = getQuestClues(dailyCard);
                                    const allClueText = clues.join(' ');
                                    return (
                                        <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 p-4 relative">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 dark:text-purple-400">CLUES</span>
                                                <TTSButton text={allClueText} className="text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 shrink-0" size="sm" />
                                            </div>
                                            <div className="space-y-2.5">
                                                {clues.map((clue, i) => (
                                                    <div key={i} className="flex gap-2 items-start">
                                                        <span className="text-xs font-black text-purple-400 dark:text-purple-500 mt-0.5 shrink-0">{i + 1}.</span>
                                                        <p
                                                            className="text-sm leading-relaxed text-gray-700 dark:text-gray-200"
                                                            style={{ fontFamily: 'Nunito, sans-serif', lineHeight: '1.6' }}
                                                        >
                                                            {clue}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Guess Input */}
                            <div className="px-4 pb-4">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Guess the city</label>
                                <div className="flex gap-2 mb-3">
                                    <Input
                                        value={freeTypeAnswer}
                                        onChange={(e) => setFreeTypeAnswer(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleQuestGuessSubmit()}
                                        onFocus={(e) => {
                                            setTimeout(() => {
                                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }, 300);
                                        }}
                                        placeholder="Type the city name"
                                        className="flex-1 h-12 text-base font-bold border-2 border-purple-200 dark:border-purple-700 focus:border-purple-500 rounded-xl bg-white dark:bg-gray-700 dark:text-gray-100"
                                        style={{ fontFamily: 'Nunito, sans-serif' }}
                                        autoFocus
                                        data-testid="input-quest-guess"
                                    />
                                    <Button
                                        onClick={handleQuestGuessSubmit}
                                        disabled={!freeTypeAnswer.trim()}
                                        className="h-12 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-[#7B5CFF] to-[#A855F7] hover:from-[#6B4CFF] hover:to-[#9845E7] transition-all active:scale-[0.96]"
                                        data-testid="button-submit-guess"
                                    >
                                        Submit Guess
                                    </Button>
                                </div>

                                {/* Guess Progress Dots */}
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    {[1, 2, 3].map(i => (
                                        <div 
                                            key={i} 
                                            className={cn(
                                                "w-3 h-3 rounded-full transition-all",
                                                i <= (3 - guessesLeft) ? "bg-amber-500" : "bg-gray-200 dark:bg-gray-600"
                                            )}
                                        />
                                    ))}
                                </div>
                                <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                                    {guessesLeft === 3 ? "Solve today's city to earn a passport stamp." :
                                     guessesLeft === 2 ? `${guessesLeft} guesses left — more letters revealed!` :
                                     guessesLeft === 1 ? "Last guess — more letters revealed!" : ""}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {stage === "STAMPING" && (
                    <motion.div 
                        key="stamping"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-[#f4e4bc] p-6 rounded-3xl shadow-2xl w-full aspect-[3/4] relative overflow-hidden flex flex-col items-center justify-center border-8 border-[#d4c5a9]"
                        style={{ backgroundImage: "url(https://www.transparenttextures.com/patterns/aged-paper.png)" }}
                    >
                         {/* Passport Header */}
                         <div className="absolute top-4 w-full text-center opacity-50">
                            <div className="border-b-2 border-double border-[#8b7355] mx-8 mb-1"></div>
                            <span className="text-[#8b7355] font-serif italic text-xs tracking-widest">OFFICIAL VISA PAGE</span>
                         </div>

                         {/* Faint background markings */}
                         <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <MapPin className="w-64 h-64 absolute -bottom-10 -right-10 text-[#8b7355]" />
                            <div className="w-32 h-32 border-4 border-[#8b7355] rounded-full absolute top-10 left-10 flex items-center justify-center">
                                <span className="text-4xl">✈️</span>
                            </div>
                         </div>

                         <div className="z-10 text-center">
                             <h3 className="font-heading text-xl text-[#8b7355] mb-6 uppercase tracking-widest">Correct!</h3>
                             <PassportStamp 
                                city={dailyCard.city} 
                                date={new Date().toLocaleDateString()} 
                                color={(() => {
                                  const mastery = passportMastery?.find((m) => m.cityId === dailyCard.id);
                                  if (!mastery) return "#16a34a";
                                  const count = (mastery.star1 ? 1 : 0) + (mastery.star2 ? 1 : 0) + (mastery.star3 ? 1 : 0) + (mastery.star4 ? 1 : 0) + (mastery.star5 ? 1 : 0);
                                  if (count >= 3) return "#d97706";
                                  if (count >= 2) return "#2563eb";
                                  return "#16a34a";
                                })()}
                                mastered={(() => {
                                  const mastery = passportMastery?.find((m) => m.cityId === dailyCard.id);
                                  if (!mastery) return false;
                                  const count = (mastery.star1 ? 1 : 0) + (mastery.star2 ? 1 : 0) + (mastery.star3 ? 1 : 0) + (mastery.star4 ? 1 : 0) + (mastery.star5 ? 1 : 0);
                                  return count >= 3;
                                })()}
                             />
                         </div>
                    </motion.div>
                )}

                {stage === "STICKER_REWARD" && (
                    <motion.div 
                        key="sticker-reward"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="bg-gradient-to-b from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-3xl border-4 border-yellow-300 dark:border-yellow-600 shadow-2xl text-center relative overflow-visible"
                    >
                        {isStickerFlying && earnedSticker && (
                            <motion.div
                                initial={{ scale: 1, x: 0, y: 0, rotate: 0 }}
                                animate={{ 
                                    scale: [1, 1.3, 0.6],
                                    x: [0, 50, 150],
                                    y: [0, -100, -250],
                                    rotate: [0, 20, 360]
                                }}
                                transition={{ duration: 1, ease: "easeInOut" }}
                                className="absolute left-1/2 top-24 -translate-x-1/2 z-50 pointer-events-none"
                            >
                                <div className="w-24 h-24 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-400">
                                    <span className="text-5xl">{earnedSticker.stickerIcon}</span>
                                </div>
                            </motion.div>
                        )}
                        
                        <motion.div 
                            initial={{ scale: 0, rotate: -180 }}
                            animate={isStickerFlying ? { scale: 0, opacity: 0 } : { scale: 1, rotate: 0 }}
                            transition={{ delay: isStickerFlying ? 0 : 0.3, duration: isStickerFlying ? 0.2 : 0.8, type: "spring", bounce: 0.5 }}
                            className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-yellow-200 to-orange-200 dark:from-yellow-700 dark:to-orange-700 rounded-full flex items-center justify-center shadow-lg border-4 border-yellow-400 dark:border-yellow-500 cursor-pointer hover:scale-105 transition-transform"
                            onClick={!isFetchingSticker && earnedSticker ? handleCollectSticker : undefined}
                        >
                            {isFetchingSticker ? (
                                <div className="animate-pulse">
                                    <Gift className="w-16 h-16 text-yellow-600 dark:text-yellow-300" />
                                </div>
                            ) : earnedSticker ? (
                                <span className="text-6xl">{earnedSticker.stickerIcon}</span>
                            ) : (
                                <Star className="w-16 h-16 text-yellow-600 dark:text-yellow-300" />
                            )}
                        </motion.div>
                        
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (isStickerFlying || stickerCollected) ? 0 : 0.5, duration: 0.4 }}
                        >
                            {(isStickerFlying || stickerCollected) ? (
                                <div className="py-4">
                                    <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-3">
                                        Yay!
                                    </h3>
                                    <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-4">
                                        You have successfully claimed the souvenir in your Souvenir Book!
                                    </p>
                                    {stickerCollected && (
                                        <Button 
                                            className="w-full h-12 text-lg font-bold rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all" 
                                            onClick={handleContinueAfterSticker}
                                            data-testid="button-continue-after-sticker"
                                        >
                                            Continue
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                                        You Earned a City Souvenir!
                                    </h3>
                                    {earnedSticker && (
                                        <>
                                            <p className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
                                                {earnedSticker.city}, {earnedSticker.country}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                                                {earnedSticker.continent}
                                            </p>
                                        </>
                                    )}
                                    
                                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 mb-4 mt-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Did You Know?</p>
                                            <button
                                                onClick={toggleSpeakFact}
                                                className={cn(
                                                    "p-1.5 rounded-full transition-all",
                                                    isSpeakingFact 
                                                        ? "bg-red-100 dark:bg-red-900/40 text-red-500 animate-pulse" 
                                                        : "bg-blue-100 dark:bg-blue-900/40 text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-800/60"
                                                )}
                                                title={isSpeakingFact ? "Stop" : "Listen"}
                                                data-testid="button-tts-fact"
                                            >
                                                {isSpeakingFact ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                                            {earnedSticker?.funFact || dailyCard?.didYouKnow || "This city is amazing!"}
                                        </p>
                                    </div>
                                    
                                    <p className="text-sm text-orange-600 dark:text-orange-400 font-bold mb-4">
                                        Tap the souvenir to collect it!
                                    </p>
                                </>
                            )}
                        </motion.div>
                        
                        {!isStickerFlying && !stickerCollected && (
                            <Button
                                onClick={handleCollectSticker}
                                disabled={isFetchingSticker || !earnedSticker}
                                className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg border-b-4 border-orange-600 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50"
                                data-testid="button-collect-sticker"
                            >
                                <BookOpen className="w-5 h-5 mr-2" />
                                Add to Souvenir Book
                            </Button>
                        )}
                    </motion.div>
                )}

                {stage === "PASSPORT_STAMP" && dailyCard && (
                    <motion.div 
                        key="passport-stamp"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="bg-gradient-to-b from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-3xl border-4 border-green-300 dark:border-green-600 shadow-2xl text-center relative overflow-hidden"
                    >
                        {/* Passport-style background pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <MapPin className="w-40 h-40 absolute -bottom-8 -right-8 text-green-700" />
                            <Compass className="w-24 h-24 absolute top-4 left-4 text-green-700" />
                        </div>
                        
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.3, duration: 0.8, type: "spring", bounce: 0.5 }}
                            className="relative z-10"
                        >
                            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-800 px-4 py-1.5 rounded-full mb-3">
                                <span className="text-lg">⭐</span>
                                <span className="text-sm font-bold text-green-700 dark:text-green-300">NEW CITY DISCOVERED</span>
                            </div>
                            
                            <div className="mb-3">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{dailyCard.city}</h3>
                                    {dailyCard.flagUrl && (
                                        <img src={dailyCard.flagUrl} alt="" className="w-7 h-5 rounded-sm object-cover shadow-sm" />
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{dailyCard.country} • {dailyCard.continent}</p>
                            </div>
                            
                            {/* Passport Stamp */}
                            <div className="mb-4 flex justify-center">
                                <PassportStamp 
                                    city={dailyCard.city} 
                                    date={new Date().toLocaleDateString()} 
                                    color="#16a34a"
                                    mastered={false}
                                />
                            </div>

                            {/* Passport Progress */}
                            <div className="bg-white/70 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Passport Progress</p>
                                <div className="flex items-center justify-between px-2">
                                    {[
                                        { label: "Discovered", color: "#16a34a" },
                                        { label: "Learning", color: "#2563eb" },
                                        { label: "Remembered", color: "#8b5cf6" },
                                        { label: "Visited", color: "#d97706" }
                                    ].map((step, i) => (
                                        <div key={step.label} className="flex flex-col items-center gap-1">
                                            <div className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center border-2",
                                                i === 0
                                                    ? "border-green-500 bg-green-500 text-white"
                                                    : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600"
                                            )}>
                                                {i === 0 ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-500" />
                                                )}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-semibold",
                                                i === 0 ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"
                                            )}>{step.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Explore this city to master it!</p>
                            </div>
                            
                            <Button 
                                className="w-full h-12 text-lg font-bold rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all" 
                                onClick={handleContinueAfterPassportStamp}
                                data-testid="button-continue-after-passport"
                            >
                                Explore {dailyCard.city} →
                            </Button>
                        </motion.div>
                    </motion.div>
                )}

                {stage === "QUEST_CELEBRATION" && dailyCard && (
                    <motion.div
                        key="quest-celebration"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border-4 border-green-200 dark:border-green-700 shadow-2xl text-center w-full max-w-sm">
                            <div className="w-14 h-14 bg-green-100 dark:bg-green-700/30 rounded-full mx-auto mb-3 flex items-center justify-center">
                                <Check className="w-7 h-7 text-green-500 dark:text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1" data-testid="text-quest-completed">Quest Completed</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">You discovered {dailyCard.city} today.</p>

                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl p-4 mb-4 border border-orange-200 dark:border-orange-700">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-left">
                                        <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                            🔥 {displayStreak}-Day Explorer Streak
                                        </p>
                                        <p className="text-sm text-orange-500 dark:text-orange-300 font-medium">
                                            {displayStreak >= 7 ? "You're on fire!" :
                                             displayStreak >= 3 ? "You're going places!" :
                                             "You're heating up!"}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                                        const today = new Date();
                                        const todayDayIndex = today.getDay();
                                        const isToday = index === todayDayIndex;
                                        const isPast = index < todayDayIndex;
                                        const daysAgo = todayDayIndex - index;
                                        const wasPlayed = isPast && daysAgo < displayStreak;
                                        return (
                                            <div key={index} className="flex flex-col items-center">
                                                <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium mb-0.5">{day}</span>
                                                <div className={cn(
                                                    "w-7 h-7 rounded-full flex items-center justify-center text-sm",
                                                    isToday ? "bg-yellow-400 text-white ring-2 ring-yellow-500" :
                                                    wasPlayed ? "bg-green-400 dark:bg-green-600 text-white" :
                                                    "bg-gray-200 dark:bg-gray-700"
                                                )}>
                                                    {(isToday || wasPlayed) && <span className="text-white text-xs">✓</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-4 border border-green-200 dark:border-green-700">
                                <p className="text-xs text-green-600 dark:text-green-400 uppercase font-bold mb-2">🌍 Today's Discovery</p>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    {dailyCard.flagUrl && (
                                        <img src={dailyCard.flagUrl} alt="" className="w-6 h-4 rounded-sm object-cover shadow-sm" />
                                    )}
                                    <span className="text-lg font-black text-gray-800 dark:text-gray-100">{dailyCard.city}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Arrival stamp added to passport</p>
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">⭐ +25 XP earned</p>
                            </div>

                            <Button
                                onClick={handleQuestCelebrationNavigate}
                                className="w-full h-11 text-base font-bold rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg mb-4"
                                data-testid="button-explore-city"
                            >
                                🏙️ Explore {dailyCard.city}
                            </Button>

                            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3 mb-4 border border-purple-200 dark:border-purple-700">
                                <p className="text-xs text-purple-500 dark:text-purple-400 uppercase font-bold mb-1">Next Quest In</p>
                                <p className="text-2xl font-mono font-bold text-purple-700 dark:text-purple-300">{formatCountdown(countdown)}</p>
                            </div>

                            <div className="mb-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-2">🏆 Streak Milestones</p>
                                {(() => {
                                    const badgeTiers = [
                                        [0, 4], [4, 8], [8, 12]
                                    ];
                                    const currentTierIndex = displayStreak >= 200 ? 2 : displayStreak >= 31 ? 1 : 0;
                                    const [start, end] = badgeTiers[currentTierIndex];
                                    const visibleBadges = STREAK_BADGES.slice(start, end);
                                    return (
                                        <div className="grid grid-cols-4 gap-2">
                                            {visibleBadges.map((badge) => {
                                                const isUnlocked = displayStreak >= badge.daysRequired ||
                                                    (stats.unlockedStreakBadgeIds || []).includes(badge.id);
                                                return (
                                                    <div
                                                        key={badge.id}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-2 rounded-xl border-2 h-[75px]",
                                                            isUnlocked
                                                                ? "bg-gradient-to-b from-amber-300 to-yellow-400 border-amber-500 shadow-lg"
                                                                : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                                        )}
                                                    >
                                                        <span className={cn("text-xl mb-0.5", !isUnlocked && "grayscale opacity-50")}>{badge.icon}</span>
                                                        <span className={cn("text-[10px] font-bold", isUnlocked ? "text-amber-900" : "text-gray-600 dark:text-gray-400")}>{badge.daysRequired}d</span>
                                                        <span className={cn("text-[8px] font-medium", isUnlocked ? "text-amber-800" : "text-gray-500 dark:text-gray-400")}>{badge.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            <Button
                                onClick={handleQuestCelebrationNavigate}
                                className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg"
                                data-testid="button-start-adventure"
                            >
                                Start Your Adventure
                            </Button>
                        </div>
                    </motion.div>
                )}

                {stage === "QUEST_MISSED" && dailyCard && (
                    <motion.div
                        key="quest-missed"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border-4 border-amber-200 dark:border-amber-700 shadow-2xl text-center w-full max-w-sm">
                            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-700/30 rounded-full mx-auto mb-3 flex items-center justify-center">
                                <span className="text-2xl">🌍</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1" data-testid="text-quest-missed">So close!</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Today's city was</p>

                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-4 border border-purple-200 dark:border-purple-700">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    {dailyCard.flagUrl && (
                                        <img src={dailyCard.flagUrl} alt="" className="w-6 h-4 rounded-sm object-cover shadow-sm" />
                                    )}
                                    <span className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-wide">{dailyCard.city}</span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{dailyCard.country} {dailyCard.continent ? `• ${dailyCard.continent}` : ''}</p>
                            </div>

                            {dailyCard.didYouKnow && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-4 border border-amber-200 dark:border-amber-700 text-left">
                                    <p className="text-xs text-amber-600 dark:text-amber-400 uppercase font-bold mb-1.5 flex items-center gap-1">
                                        <span>🏰</span> Did you know?
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{dailyCard.didYouKnow}</p>
                                </div>
                            )}

                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl p-4 mb-4 border border-orange-200 dark:border-orange-700">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-left">
                                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                            🔥 {displayStreak}-Day Explorer Streak
                                        </p>
                                        <p className="text-sm text-orange-500 dark:text-orange-300 font-medium">
                                            Keep playing to grow your streak!
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                                        const today = new Date();
                                        const todayDayIndex = today.getDay();
                                        const isToday = index === todayDayIndex;
                                        const isPast = index < todayDayIndex;
                                        const daysAgo = todayDayIndex - index;
                                        const wasPlayed = isPast && daysAgo < displayStreak;
                                        return (
                                            <div key={index} className="flex flex-col items-center">
                                                <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium mb-0.5">{day}</span>
                                                <div className={cn(
                                                    "w-7 h-7 rounded-full flex items-center justify-center text-sm",
                                                    isToday ? "bg-yellow-400 text-white ring-2 ring-yellow-500" :
                                                    wasPlayed ? "bg-green-400 dark:bg-green-600 text-white" :
                                                    "bg-gray-200 dark:bg-gray-700"
                                                )}>
                                                    {(isToday || wasPlayed) && <span className="text-white text-xs">✓</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <Button
                                onClick={() => {
                                    onClose();
                                    navigate(`/geo-atlas`);
                                }}
                                className="w-full h-11 text-base font-bold rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg mb-3"
                                data-testid="button-explore-geoatlas"
                            >
                                🗺️ Explore in GeoAtlas
                            </Button>

                            <Button
                                onClick={() => {
                                    saveQuestDataAndNavigate(false);
                                }}
                                variant="outline"
                                className="w-full h-11 text-base font-bold rounded-xl border-2 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 mb-4"
                                data-testid="button-practice-city"
                            >
                                Practice {dailyCard.city} →
                            </Button>

                            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3 border border-purple-200 dark:border-purple-700">
                                <p className="text-xs text-purple-500 dark:text-purple-400 uppercase font-bold mb-1">Next Daily Quest In</p>
                                <p className="text-2xl font-mono font-bold text-purple-700 dark:text-purple-300">{formatCountdown(countdown)}</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {stage === "RESULT" && (
                    <motion.div 
                        key="result"
                        initial={{ opacity: 0, rotateY: 90 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        transition={{ duration: 0.6, type: "spring" }}
                        className="flex flex-col items-center"
                    >
                        {/* REVEALED CARD */}
                        <div className="transform scale-90 mb-4">
                             <GameCard card={dailyCard} isRevealed={true} hideBadges={true} />
                        </div>

                        {/* Stats & Share Panel */}
                        <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-sm border-4 border-yellow-300 relative -mt-8 z-20">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center border-2 shrink-0", isWin ? "bg-yellow-100 border-yellow-400" : "bg-gray-100 border-gray-400")}>
                                    {isWin ? <Smile className="w-10 h-10 text-yellow-600" /> : <HelpCircle className="w-10 h-10 text-gray-500" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg leading-none mb-1">{selectedPlayerName}</h3>
                                    {isWin ? (
                                        <p className="text-sm text-gray-500 font-bold uppercase">Solved in {timer}s!</p>
                                    ) : (
                                        <p className="text-sm text-gray-500 font-bold uppercase">Nice try!</p>
                                    )}
                                </div>
                            </div>

                            {/* Show streak badge unlock notification */}
                            {newStreakBadges.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-gradient-to-r from-yellow-100 to-orange-100 p-3 rounded-xl mb-4 border-2 border-yellow-300"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="text-4xl">{newStreakBadges[0].badge.icon}</div>
                                        <div>
                                            <p className="text-xs font-bold text-orange-600 uppercase">New Badge Unlocked!</p>
                                            <p className="font-bold text-gray-800">{newStreakBadges[0].badge.name}</p>
                                            <p className="text-xs text-gray-600">{newStreakBadges[0].badge.description}</p>
                                            {newStreakBadges[0].bonusHints && (
                                                <p className="text-xs text-green-600 font-bold mt-1">+{newStreakBadges[0].bonusHints} Bonus Hints in Crossworld!</p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Learning Summary */}
                            <div className="mb-4">
                                <LearningSummary points={getGameLearningPoints("daily-quest")} />
                            </div>

                            {dailyCard && (
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-xl mb-4 border border-amber-200" data-testid="clue-explanation-section">
                                    <p className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-1">
                                        <span>🔍</span> Why {dailyCard.city}?
                                    </p>
                                    <div className="space-y-2">
                                        {(() => {
                                            const clues = getQuestClues(dailyCard);
                                            return clues.map((clue: string, i: number) => (
                                                <div key={i} className="flex items-start gap-2 bg-white/70 rounded-lg p-2">
                                                    <span className="text-amber-500 mt-0.5 shrink-0">{i === 0 ? "💡" : i === 1 ? "🧩" : "🎯"}</span>
                                                    <p className="text-sm text-gray-700 leading-snug italic">"{clue}"</p>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                    {dailyCard.didYouKnow && (
                                        <div className="mt-2 pt-2 border-t border-amber-200">
                                            <p className="text-xs text-amber-800 flex items-start gap-1.5">
                                                <span className="shrink-0">🌟</span>
                                                <span><strong>Did you know?</strong> {dailyCard.didYouKnow}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {!isWin && (
                                <div className="bg-blue-50 p-3 rounded-xl mb-4 text-center border border-blue-100">
                                    <p className="text-blue-800 font-bold mb-1">Great exploring!</p>
                                    <p className="text-sm text-blue-600 leading-tight mb-2">
                                        Every quest makes you a better explorer. What will you explore next?
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mt-2">See you tomorrow for a new adventure!</p>
                                </div>
                            )}

                            {isWin && (
                                <>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2 text-center">Share Result</p>
                                    <div className="flex justify-center gap-2 mb-2">
                                        <Button size="sm" className="bg-[#1877F2] hover:bg-[#1864D9] rounded-full w-10 h-10 p-0" onClick={() => handleShare("facebook")}><Facebook className="w-4 h-4" /></Button>
                                        <Button size="sm" className="bg-[#1DA1F2] hover:bg-[#1A91DA] rounded-full w-10 h-10 p-0" onClick={() => handleShare("twitter")}><Twitter className="w-4 h-4" /></Button>
                                        <Button size="sm" className="bg-[#25D366] hover:bg-[#128C7E] rounded-full w-10 h-10 p-0" onClick={() => handleShare("whatsapp")}><MessageCircle className="w-4 h-4" /></Button>
                                        <Button size="sm" className="bg-gray-800 hover:bg-gray-900 rounded-full w-10 h-10 p-0" onClick={() => handleShare("copy")}><Share2 className="w-4 h-4" /></Button>
                                    </div>
                                </>
                            )}
                            
                            <div className="flex gap-2">
                                {isWin && (
                                    <Button 
                                        className="flex-1 h-12 text-base font-bold rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg border-b-4 border-orange-600 active:border-b-0 active:translate-y-1 transition-all" 
                                        onClick={() => {
                                            onClose();
                                            navigate("/sticker-book");
                                        }}
                                        data-testid="button-go-sticker-book"
                                    >
                                        <BookOpen className="w-4 h-4 mr-1" />
                                        Souvenir Book
                                    </Button>
                                )}
                                <Button 
                                    className={cn(
                                        "h-12 text-base font-bold rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg border-b-4 border-indigo-700 active:border-b-0 active:translate-y-1 transition-all",
                                        isWin ? "flex-1" : "w-full"
                                    )}
                                    onClick={() => {
                                        if (cameFromAdventures) {
                                            setShowReturnToAdventures(true);
                                        } else {
                                            onClose();
                                        }
                                    }}
                                    data-testid="button-go-home"
                                >
                                    <Home className="w-4 h-4 mr-1" />
                                    {cameFromAdventures ? "Continue" : "Home"}
                                </Button>
                            </div>
                            
                            {/* Reminder Toggle */}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                    <Bell className="w-4 h-4 text-purple-500" />
                                    <span>Get Daily Reminders?</span>
                                </div>
                                <Button 
                                    variant={reminderEnabled ? "default" : "outline"}
                                    size="sm"
                                    className={cn("h-7 text-xs rounded-full", reminderEnabled ? "bg-purple-500" : "text-gray-500")}
                                    onClick={() => {
                                        if (!reminderEnabled) {
                                            if (!user) {
                                                setShowReminderEmailDialog(true);
                                            } else {
                                                toast.success("You are automatically signed up for our email alerts.", {
                                                    icon: "📧"
                                                });
                                                setReminderEnabled(true);
                                            }
                                        } else {
                                            setShowDisableReminderConfirm(true);
                                        }
                                    }}
                                >
                                    {reminderEnabled ? "On" : "Off"}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      {/* Email Reminder Dialog */}
      <Dialog open={showReminderEmailDialog} onOpenChange={setShowReminderEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-500" />
              Get Daily Quest Reminders
            </DialogTitle>
            <DialogDescription>
              Enter your email to receive daily quest notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="dq-reminder-email" className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="dq-reminder-email"
                type="email"
                placeholder="your@email.com"
                value={reminderEmail}
                onChange={(e) => setReminderEmail(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none"
                data-testid="input-dq-reminder-email"
              />
            </div>
            <Button
              onClick={async () => {
                if (!reminderEmail || !reminderEmail.includes('@')) {
                  toast.error("Please enter a valid email address");
                  return;
                }
                setIsSubmittingReminder(true);
                try {
                  const response = await fetch('/api/email/subscribe-reminder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: reminderEmail })
                  });
                  
                  if (response.ok) {
                    setReminderEnabled(true);
                    setShowReminderEmailDialog(false);
                    setReminderEmail("");
                    toast.success(
                      <div>
                        <p className="font-bold">You're signed up for daily quest alerts!</p>
                        <p className="text-sm mt-1">By providing your email, you agree to our <a href="/privacy" className="underline text-purple-600">Privacy Policy</a>.</p>
                      </div>,
                      { duration: 6000, icon: "📧" }
                    );
                  } else {
                    toast.error("Failed to subscribe. Please try again.");
                  }
                } catch (error) {
                  toast.error("Failed to subscribe. Please try again.");
                } finally {
                  setIsSubmittingReminder(false);
                }
              }}
              disabled={isSubmittingReminder}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-xl h-12"
              data-testid="button-submit-dq-reminder-email"
            >
              {isSubmittingReminder ? "Subscribing..." : "Sign Up for Reminders"}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              By signing up, you agree to our{" "}
              <a href="/privacy" className="underline text-purple-600">Privacy Policy</a> and{" "}
              <a href="/terms" className="underline text-purple-600">Terms of Service</a>.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Disabling Reminders */}
      <AlertDialog open={showDisableReminderConfirm} onOpenChange={setShowDisableReminderConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-orange-500" />
              Turn Off Reminders?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              If you turn off reminders, you won't receive notifications about the Daily Quest. You might miss out on building your streak!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl border-2 font-bold">
              Keep Reminders On
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setReminderEnabled(false);
                toast.info("Reminders turned off");
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold"
            >
              Turn Off Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Return to GeoAdventures Prompt - shown when user came from GeoAdventures */}
      <ReturnToAdventuresPrompt
        open={showReturnToAdventures}
        onClose={() => setShowReturnToAdventures(false)}
        onReturnToAdventures={() => {
          clearCameFromGeoAdventures();
          setShowReturnToAdventures(false);
          onClose();
          setInternalNavToAdventures();
          navigate("/geoadventures");
        }}
        onPlayGuessAndGo={() => {
          setShowReturnToAdventures(false);
          onClose();
          navigate("/play");
        }}
        onStay={() => {
          clearCameFromGeoAdventures();
          setShowReturnToAdventures(false);
          onClose();
        }}
      />
      
      {/* PWA Install Prompt - After 2 games */}
      <GameInstallPrompt 
        isOpen={showGameInstallPrompt} 
        onClose={() => {
          setShowGameInstallPrompt(false);
          dismissPrompt();
        }} 
      />
      
      {/* Share Prompt - After 3-day streak */}
      <SharePrompt 
        isOpen={showSharePromptDialog} 
        onClose={() => {
          setShowSharePromptDialog(false);
          dismissSharePrompt();
        }} 
      />
      
      {/* Notification Prompt - After 2nd Daily Quest completion */}
      <NotificationPrompt 
        open={showNotificationPromptDialog}
        onEnable={async () => {
          const success = await enableNotifications();
          if (success) {
            setShowNotificationPromptDialog(false);
          }
          return success;
        }}
        onDismiss={() => {
          setShowNotificationPromptDialog(false);
          dismissNotificationPrompt();
        }}
      />
      
      </div>
    </div>
  );
}