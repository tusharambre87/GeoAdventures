import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Utensils, Volume2, VolumeX, Users, CheckCircle, Sparkles, ChevronRight, ChevronLeft, WifiOff, Lightbulb, Star } from "lucide-react";
import { useExplorer } from "@/lib/explorerContext";
import { apiRequest } from "@/lib/queryClient";
import { type ExperienceContent, type LocalWord, XP_REWARDS } from "@shared/schema";
import { getExperienceContentOffline } from "@/lib/travelOfflineStorage";
import { LoadingWithFacts } from "@/components/LoadingWithFacts";
import { getAdventureCityImage } from "@/lib/adventureImages";
import { useOnDemandCityImage } from "@/hooks/useOnDemandAdventureImage";
import confetti from "canvas-confetti";

interface ExperienceCityProps {
  destinationName: string;
  country?: string;
  onComplete?: () => void;
  initialCard?: CardType;
  onInitialCardDismissed?: () => void;
}

type CardType = 'food_culture' | 'hear_place' | 'everyday_life';
type CardState = 'not_started' | 'tried' | 'completed';

interface ExperienceProgress {
  foodCultureState: CardState;
  hearPlaceState: CardState;
  everydayLifeState: CardState;
}

const CARD_CONFIG = [
  { 
    id: 'food_culture' as CardType,
    title: 'Food & Culture',
    icon: Utensils,
    emoji: '🍜',
    description: 'Taste local flavors',
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    glowColor: 'shadow-orange-200/50 dark:shadow-orange-800/30'
  },
  { 
    id: 'hear_place' as CardType,
    title: 'Hear the Place',
    icon: Volume2,
    emoji: '🎧',
    description: 'Listen & learn words',
    color: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    glowColor: 'shadow-purple-200/50 dark:shadow-purple-800/30'
  },
  { 
    id: 'everyday_life' as CardType,
    title: 'Everyday Life',
    icon: Users,
    emoji: '🏠',
    description: 'See how kids live',
    color: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-200 dark:border-teal-800',
    glowColor: 'shadow-teal-200/50 dark:shadow-teal-800/30'
  }
];

const DWELL_TIME_MS = 10000;

function FunFactReveal({ fact }: { fact: string }) {
  const [revealed, setRevealed] = useState(false);

  if (!fact) return null;

  return (
    <motion.div
      className="mt-3 cursor-pointer"
      onClick={() => setRevealed(!revealed)}
      whileTap={{ scale: 0.97 }}
      data-testid="fun-fact-reveal"
    >
      <div className={`rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
        revealed 
          ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950/30' 
          : 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-950/20'
      }`}>
        <div className="px-4 py-3 flex items-center gap-2">
          <motion.div 
            animate={revealed ? { rotate: 0, scale: 1 } : { rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: revealed ? 0 : Infinity, repeatDelay: 3 }}
          >
            <Lightbulb className={`w-5 h-5 ${revealed ? 'text-yellow-500' : 'text-yellow-400'}`} />
          </motion.div>
          {revealed ? (
            <motion.p 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-medium text-yellow-800 dark:text-yellow-200"
            >
              {fact}
            </motion.p>
          ) : (
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
              Tap to reveal a fun fact!
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = (completed / total) * circumference;
  
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700" />
        <motion.circle 
          cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="3" 
          className="text-emerald-500"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-xs font-bold text-emerald-600 dark:text-emerald-400">{completed}/{total}</span>
    </div>
  );
}

function WordFlashcard({ word, onSpeak, isSpeaking, onStopSpeaking }: {
  word: LocalWord;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      className="min-h-[120px] perspective-1000 cursor-pointer"
      onClick={() => setFlipped(!flipped)}
      whileTap={{ scale: 0.97 }}
      data-testid={`flashcard-${word.word}`}
    >
      <AnimatePresence mode="wait">
        {!flipped ? (
          <motion.div
            key="front"
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 border-2 border-purple-200 dark:border-purple-700 min-h-[120px]"
          >
            <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">{word.word}</span>
            {word.pronunciation && (
              <span className="text-sm text-purple-500 dark:text-purple-400 italic">/{word.pronunciation}/</span>
            )}
            <span className="text-xs text-purple-400 dark:text-purple-500 mt-1">{word.language} · Tap to flip</span>
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 border-2 border-indigo-200 dark:border-indigo-700 min-h-[120px]"
          >
            <span className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">{word.meaning}</span>
            <Button
              size="sm"
              variant="outline"
              className="bg-white/80 dark:bg-slate-800/80"
              onClick={(e) => {
                e.stopPropagation();
                isSpeaking ? onStopSpeaking() : onSpeak(`${word.word}. ${word.meaning}`);
              }}
              data-testid={`speak-word-${word.word}`}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4 mr-1" /> : <Volume2 className="w-4 h-4 mr-1" />}
              {isSpeaking ? 'Stop' : 'Hear it'}
            </Button>
            <span className="text-xs text-indigo-400 dark:text-indigo-500">Tap to flip back</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CompletionCelebration({ destinationName, xpAwarded }: { destinationName: string; xpAwarded: number }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#6366f1', '#f59e0b', '#ec4899']
      });
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-emerald-950/40 dark:to-sky-950/40 rounded-2xl p-6 border-2 border-emerald-300 dark:border-emerald-700 text-center"
      data-testid="completion-celebration"
    >
      <motion.div 
        animate={{ scale: [1, 1.2, 1] }} 
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-5xl mb-3"
      >
        🎉
      </motion.div>
      <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-1">
        Explorer Complete!
      </h3>
      <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-3">
        You explored everything about {destinationName}!
      </p>
      {xpAwarded > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full font-bold text-sm"
        >
          <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
          +{xpAwarded} XP earned!
        </motion.div>
      )}
    </motion.div>
  );
}

export function ExperienceCity({ destinationName, country, onComplete, initialCard, onInitialCardDismissed }: ExperienceCityProps) {
  const { activeExplorer: currentExplorer } = useExplorer();
  const { image: onDemandCityImg } = useOnDemandCityImage(destinationName, country);
  const [content, setContent] = useState<ExperienceContent | null>(null);
  const [progress, setProgress] = useState<ExperienceProgress>({
    foodCultureState: 'not_started',
    hearPlaceState: 'not_started',
    everydayLifeState: 'not_started'
  });
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const initialCardTriggered = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const celebrationTriggered = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dwellProgressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadContent();
  }, [destinationName, country, currentExplorer?.id]);

  useEffect(() => {
    if (initialCard && !loading && content && !initialCardTriggered.current) {
      initialCardTriggered.current = true;
      setActiveCard(initialCard);
    }
  }, [initialCard, loading, content]);

  const completedCount = [progress.foodCultureState, progress.hearPlaceState, progress.everydayLifeState]
    .filter(s => s === 'completed').length;
  const allCompleted = completedCount === 3;

  useEffect(() => {
    if (allCompleted && !celebrationTriggered.current && currentExplorer?.id) {
      celebrationTriggered.current = true;
      setShowCelebration(true);
      awardCompletionXP();
    }
  }, [allCompleted]);

  const awardCompletionXP = async () => {
    if (!currentExplorer?.id) return;
    try {
      const res = await apiRequest('POST', `/api/players/${currentExplorer.id}/award-xp`, {
        amount: XP_REWARDS.EXPERIENCE_COMPLETE,
        reason: `experience_complete_${destinationName}`
      });
      if (res.ok) {
        setXpAwarded(XP_REWARDS.EXPERIENCE_COMPLETE);
        window.dispatchEvent(new CustomEvent('geoquest:spin-earned', { detail: { reason: 'adventure_stop_completed' } }));
      }
    } catch (error) {
      console.error("Error awarding XP:", error);
    }
  };

  const loadContent = async () => {
    setLoading(true);
    try {
      const cachedContent = await getExperienceContentOffline(destinationName, country);
      
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        if (cachedContent) {
          setContent(cachedContent);
          if (currentExplorer?.id && typeof window !== 'undefined') {
            try {
              const storedProgress = localStorage.getItem(`experience_progress_${destinationName}_${currentExplorer.id}`);
              if (storedProgress) {
                setProgress(JSON.parse(storedProgress));
              }
            } catch (e) {
              console.warn("Could not load offline progress:", e);
            }
          }
        }
        setLoading(false);
        return;
      }

      const countryParam = country ? `?country=${encodeURIComponent(country)}` : '';
      const [contentRes, progressRes] = await Promise.all([
        fetch(`/api/experience/${encodeURIComponent(destinationName)}${countryParam}`),
        currentExplorer?.id 
          ? fetch(`/api/experience/${encodeURIComponent(destinationName)}/progress/${currentExplorer.id}`)
          : null
      ]);

      if (contentRes.ok) {
        const data = await contentRes.json();
        setContent(data);
      } else if (cachedContent) {
        setContent(cachedContent);
      }

      if (progressRes?.ok) {
        const progressData = await progressRes.json();
        setProgress(progressData);
      }
    } catch (error) {
      console.error("Error loading experience content:", error);
      try {
        const cachedContent = await getExperienceContentOffline(destinationName, country);
        if (cachedContent) {
          setContent(cachedContent);
        }
      } catch (e) {
        console.warn("Could not load cached content:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (cardType: CardType, state: CardState) => {
    if (!currentExplorer?.id) return;

    const newProgress = {
      ...progress,
      [cardType === 'food_culture' ? 'foodCultureState' : 
       cardType === 'hear_place' ? 'hearPlaceState' : 'everydayLifeState']: state
    };
    
    setProgress(newProgress);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `experience_progress_${destinationName}_${currentExplorer.id}`, 
          JSON.stringify(newProgress)
        );
      } catch (e) {
        console.warn("Could not save offline progress:", e);
      }
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (isOnline) {
      try {
        await apiRequest('POST', `/api/experience/${encodeURIComponent(destinationName)}/progress`, {
          explorerId: currentExplorer.id,
          cardType,
          state
        });
      } catch (error) {
        console.error("Error updating progress:", error);
      }
    }
  };

  const clearDwellTimers = () => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (dwellProgressRef.current) {
      clearInterval(dwellProgressRef.current);
      dwellProgressRef.current = null;
    }
    setDwellProgress(0);
  };

  const handleCardOpen = (cardType: CardType) => {
    setActiveCard(cardType);
    const currentState = cardType === 'food_culture' ? progress.foodCultureState :
                         cardType === 'hear_place' ? progress.hearPlaceState : 
                         progress.everydayLifeState;
    
    if (currentState === 'not_started') {
      setDwellProgress(0);
      
      const startTime = Date.now();
      dwellProgressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, (elapsed / DWELL_TIME_MS) * 100);
        setDwellProgress(pct);
      }, 100);
      
      dwellTimerRef.current = setTimeout(async () => {
        await updateProgress(cardType, 'tried');
        clearDwellTimers();
      }, DWELL_TIME_MS);
    }
  };

  const handleCardClose = () => {
    clearDwellTimers();
    setActiveCard(null);
    stopSpeaking();
    if (initialCard) onInitialCardDismissed?.();
  };

  const handleComplete = async () => {
    clearDwellTimers();
    if (activeCard) {
      await updateProgress(activeCard, 'completed');
    }
    setActiveCard(null);
    stopSpeaking();
  };
  
  useEffect(() => {
    return () => clearDwellTimers();
  }, []);

  const speakText = async (text: string) => {
    stopSpeaking();
    
    if (navigator.onLine) {
      try {
        setIsLoadingAudio(true);
        setIsSpeaking(true);
        
        const response = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text })
        });
        
        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          
          if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
          }
          audioUrlRef.current = audioUrl;
          
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          
          audio.onended = () => {
            setIsSpeaking(false);
          };
          audio.onerror = () => {
            setIsSpeaking(false);
          };
          
          setIsLoadingAudio(false);
          await audio.play();
          return;
        }
      } catch (error) {
        console.warn("Google Cloud TTS failed, falling back to browser speech:", error);
      } finally {
        setIsLoadingAudio(false);
      }
    }
    
    if ('speechSynthesis' in window) {
      const cleanedText = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, "");
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      utteranceRef.current = utterance;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
  };

  const getCardState = (cardType: CardType): CardState => {
    if (cardType === 'food_culture') return progress.foodCultureState as CardState;
    if (cardType === 'hear_place') return progress.hearPlaceState as CardState;
    return progress.everydayLifeState as CardState;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <LoadingWithFacts 
          message={`Discovering ${destinationName}...`}
          showFacts={true}
          factInterval={4000}
        />
        <p className="text-xs text-muted-foreground text-center mt-2 px-4">
          First-time destinations take a moment to prepare - we're creating unique content just for you!
        </p>
      </div>
    );
  }

  if (!content) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
        {isOffline ? (
          <>
            <WifiOff className="w-8 h-8 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              You're offline and this destination hasn't been downloaded yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Download trip content before your adventure to use offline!
            </p>
          </>
        ) : (
          <>
            <span className="text-3xl">🌍</span>
            <p className="text-sm text-muted-foreground">
              We're still preparing your {destinationName} adventure!
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadContent}
              className="mt-2"
              data-testid="button-retry-experience"
            >
              Try Again
            </Button>
          </>
        )}
      </div>
    );
  }

  const localWords: LocalWord[] = typeof content.localWords === 'string' 
    ? JSON.parse(content.localWords) 
    : (content.localWords as LocalWord[] || []);

  const activeCardConfig = activeCard ? CARD_CONFIG.find(c => c.id === activeCard) : null;

  return (
    <div className="space-y-4" data-testid="experience-city-module">
      {(() => {
        const cityHeroImage = onDemandCityImg || getAdventureCityImage(destinationName);
        return cityHeroImage ? (
          <div className="relative rounded-xl overflow-hidden mb-2" data-testid="experience-city-hero">
            <img
              src={cityHeroImage}
              alt={`Illustrated view of ${destinationName}`}
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <motion.span 
                  className="text-2xl"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                >
                  🌍
                </motion.span>
                <h3 className="text-lg font-bold text-white drop-shadow-md">Experience {destinationName}</h3>
              </div>
              <ProgressRing completed={completedCount} total={3} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <motion.span 
                className="text-2xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
              >
                🌍
              </motion.span>
              <h3 className="text-lg font-bold">Experience {destinationName}</h3>
            </div>
            <ProgressRing completed={completedCount} total={3} />
          </div>
        );
      })()}

      {showCelebration && (
        <CompletionCelebration destinationName={destinationName} xpAwarded={xpAwarded} />
      )}

      <div className="grid grid-cols-1 gap-3">
        {CARD_CONFIG.map((card, idx) => {
          const state = getCardState(card.id);
          const Icon = card.icon;
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`cursor-pointer transition-all ${card.bgColor} ${card.borderColor} border-2 hover:shadow-xl ${card.glowColor} relative overflow-hidden`}
                onClick={() => handleCardOpen(card.id)}
                data-testid={`experience-card-${card.id}`}
              >
                {state === 'completed' && (
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                    <div className="absolute top-2 right-[-20px] rotate-45 bg-emerald-500 text-white text-[10px] font-bold px-6 py-0.5 shadow-sm">
                      Done
                    </div>
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg flex-shrink-0`}
                      whileHover={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      <span className="text-2xl">{card.emoji}</span>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base">{card.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
                      {state === 'tried' && (
                        <div className="flex items-center gap-1 mt-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">In progress</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {activeCard && activeCardConfig && (
          <Dialog open={!!activeCard} onOpenChange={handleCardClose}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
              <div className={`bg-gradient-to-r ${activeCardConfig.color} px-6 py-5 text-white`}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-white">
                    <span className="text-3xl">{activeCardConfig.emoji}</span>
                    <div>
                      <span className="text-lg font-bold block">{activeCardConfig.title}</span>
                      <DialogDescription className="text-white/80 text-sm mt-0.5">
                        Discover {destinationName}
                      </DialogDescription>
                    </div>
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="px-6 py-4">
                {activeCard === 'food_culture' && (
                  <FoodCultureContent 
                    content={content}
                    onSpeak={speakText}
                    isSpeaking={isSpeaking}
                    onStopSpeaking={stopSpeaking}
                  />
                )}

                {activeCard === 'hear_place' && (
                  <HearPlaceContent 
                    content={content}
                    localWords={localWords}
                    onSpeak={speakText}
                    isSpeaking={isSpeaking}
                    onStopSpeaking={stopSpeaking}
                  />
                )}

                {activeCard === 'everyday_life' && (
                  <EverydayLifeContent 
                    content={content}
                    onSpeak={speakText}
                    isSpeaking={isSpeaking}
                    onStopSpeaking={stopSpeaking}
                  />
                )}

                {dwellProgress > 0 && dwellProgress < 100 && (
                  <div className="mt-4 mb-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Take your time exploring...</span>
                      <span>{Math.round(dwellProgress)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full bg-gradient-to-r ${activeCardConfig.color}`}
                        style={{ width: `${dwellProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {(() => {
                  const currentCardState = activeCard ? getCardState(activeCard) : 'not_started';
                  const canComplete = currentCardState === 'tried' || currentCardState === 'completed';
                  
                  return (
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        onClick={handleCardClose}
                        className="flex-1"
                        data-testid="experience-close-button"
                      >
                        Close
                      </Button>
                      <Button 
                        onClick={canComplete ? handleComplete : handleCardClose}
                        className={`flex-1 ${canComplete 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
                          : `bg-gradient-to-r ${activeCardConfig.color}`}`}
                        data-testid="experience-complete-button"
                      >
                        {canComplete ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Explored
                          </>
                        ) : (
                          'Keep exploring'
                        )}
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}

function FoodCultureContent({ content, onSpeak, isSpeaking, onStopSpeaking }: {
  content: ExperienceContent;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-4 relative">
        <div className="absolute top-2 right-2">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => isSpeaking ? onStopSpeaking() : onSpeak(content.foodStory || '')}
            data-testid="food-audio-button"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
        <h4 className="font-medium mb-2 text-orange-700 dark:text-orange-300">A Taste of the Culture</h4>
        <p className="text-sm leading-relaxed">{content.foodStory}</p>
      </div>

      {content.foodTags && content.foodTags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Famous Foods to Try</h4>
          <div className="flex flex-wrap gap-2">
            {content.foodTags.map((tag, idx) => (
              <motion.span 
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium border border-orange-200 dark:border-orange-800"
              >
                {tag}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      <FunFactReveal fact={content.foodFunFact || ''} />

      {content.foodMemoryLine && (
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
          <p className="text-sm italic text-amber-700 dark:text-amber-300">
            "{content.foodMemoryLine}"
          </p>
        </div>
      )}
    </div>
  );
}

function HearPlaceContent({ content, localWords, onSpeak, isSpeaking, onStopSpeaking }: {
  content: ExperienceContent;
  localWords: LocalWord[];
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  return (
    <div className="space-y-4">
      {content.soundscapeDescription && (
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 relative">
          <div className="absolute top-2 right-2">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => isSpeaking ? onStopSpeaking() : onSpeak(content.soundscapeDescription || '')}
              data-testid="soundscape-audio-button"
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>
          <h4 className="font-medium mb-2 text-purple-700 dark:text-purple-300">Close Your Eyes and Listen</h4>
          <p className="text-sm leading-relaxed">{content.soundscapeDescription}</p>
        </div>
      )}

      {localWords.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold">Learn to Say</h4>
            <span className="text-xs text-muted-foreground">{currentWordIndex + 1} of {localWords.length}</span>
          </div>
          
          <WordFlashcard 
            word={localWords[currentWordIndex]}
            onSpeak={onSpeak}
            isSpeaking={isSpeaking}
            onStopSpeaking={onStopSpeaking}
          />
          
          {localWords.length > 1 && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <Button
                size="sm"
                variant="outline"
                disabled={currentWordIndex === 0}
                onClick={() => setCurrentWordIndex(i => i - 1)}
                data-testid="word-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex gap-1.5">
                {localWords.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`w-2 h-2 rounded-full transition-all ${idx === currentWordIndex ? 'bg-purple-500 scale-125' : 'bg-purple-200 dark:bg-purple-700'}`}
                  />
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={currentWordIndex === localWords.length - 1}
                onClick={() => setCurrentWordIndex(i => i + 1)}
                data-testid="word-next"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <FunFactReveal fact={content.hearFunFact || ''} />

      {content.hearWonderPrompt && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            Wonder: {content.hearWonderPrompt}
          </p>
        </div>
      )}
    </div>
  );
}

function EverydayLifeContent({ content, onSpeak, isSpeaking, onStopSpeaking }: {
  content: ExperienceContent;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-teal-50 dark:bg-teal-950/30 rounded-xl p-4 relative">
        <div className="absolute top-2 right-2">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => isSpeaking ? onStopSpeaking() : onSpeak(content.everydayLifeSnapshot || '')}
            data-testid="everyday-audio-button"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
        <h4 className="font-medium mb-2 text-teal-700 dark:text-teal-300">A Day in Their Shoes</h4>
        <p className="text-sm leading-relaxed">{content.everydayLifeSnapshot}</p>
      </div>

      {content.everydayLifeTags && content.everydayLifeTags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Life Here Includes</h4>
          <div className="flex flex-wrap gap-2">
            {content.everydayLifeTags.map((tag, idx) => (
              <motion.span 
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="px-3 py-1.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full text-xs font-medium border border-teal-200 dark:border-teal-800"
              >
                {tag}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      <FunFactReveal fact={content.everydayFunFact || ''} />

      {content.everydayWonderPrompt && (
        <div className="bg-cyan-50 dark:bg-cyan-950/30 rounded-lg p-3 border border-cyan-200 dark:border-cyan-800">
          <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
            Wonder: {content.everydayWonderPrompt}
          </p>
        </div>
      )}
    </div>
  );
}
