import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Compass, Gamepad2, Flame, Moon, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { GeoBuddyCharacter } from './GeoBuddyCharacter';

const STOP_COMPLETED_PROMPT_KEY = 'geoadventures_stop_prompt_date';
const EXIT_PROMPT_SHOWN_KEY = 'geoadventures_exit_prompt_date';
const CAME_FROM_GEOADVENTURES_KEY = 'came_from_geoadventures';

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function getExplorerSuffix(explorerId?: string): string {
  return explorerId ? `_${explorerId}` : '_guest';
}

function hasDailyStreakBeenCompleted(explorerId?: string): boolean {
  try {
    const today = getTodayDateString();
    const keysToCheck = [
      explorerId ? `geoquest_daily_last_date_${explorerId}` : null,
      'geoquest_daily_last_date_guest',
    ].filter(Boolean) as string[];
    
    for (const key of keysToCheck) {
      const lastPlayed = localStorage.getItem(key);
      if (lastPlayed) {
        const todayParts = today.split('-').map(Number);
        const lastParts = lastPlayed.split('-').map(Number);
        if (todayParts[0] === lastParts[0] && 
            todayParts[1] === lastParts[1] && 
            todayParts[2] === lastParts[2]) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

function hasStopPromptShownToday(explorerId?: string): boolean {
  try {
    const key = STOP_COMPLETED_PROMPT_KEY + getExplorerSuffix(explorerId);
    const savedDate = localStorage.getItem(key);
    return savedDate === getTodayDateString();
  } catch {
    return false;
  }
}

function markStopPromptShown(explorerId?: string) {
  try {
    const key = STOP_COMPLETED_PROMPT_KEY + getExplorerSuffix(explorerId);
    localStorage.setItem(key, getTodayDateString());
  } catch {}
}

function hasExitPromptShownToday(explorerId?: string): boolean {
  try {
    const key = EXIT_PROMPT_SHOWN_KEY + getExplorerSuffix(explorerId);
    const savedDate = localStorage.getItem(key);
    return savedDate === getTodayDateString();
  } catch {
    return false;
  }
}

function markExitPromptShown(explorerId?: string) {
  try {
    const key = EXIT_PROMPT_SHOWN_KEY + getExplorerSuffix(explorerId);
    localStorage.setItem(key, getTodayDateString());
  } catch {}
}

export function markCameFromGeoAdventures() {
  try {
    localStorage.setItem(CAME_FROM_GEOADVENTURES_KEY, 'true');
  } catch {}
}

export function clearCameFromGeoAdventures() {
  try {
    localStorage.removeItem(CAME_FROM_GEOADVENTURES_KEY);
  } catch {}
}

export function didComeFromGeoAdventures(): boolean {
  try {
    return localStorage.getItem(CAME_FROM_GEOADVENTURES_KEY) === 'true';
  } catch {
    return false;
  }
}

export function shouldShowStopCompletedPrompt(explorerId?: string): boolean {
  if (hasStopPromptShownToday(explorerId)) return false;
  if (hasDailyStreakBeenCompleted(explorerId)) return false;
  return true;
}

export function shouldShowExitPrompt(explorerId?: string): boolean {
  if (hasExitPromptShownToday(explorerId)) return false;
  if (hasDailyStreakBeenCompleted(explorerId)) return false;
  return true;
}

interface StopCompletedPromptProps {
  open: boolean;
  onClose: () => void;
  explorerId?: string;
  onPlayDailyQuest: () => void;
  onContinueAdventure: () => void;
}

export function StopCompletedPrompt({ 
  open, 
  onClose, 
  explorerId,
  onPlayDailyQuest,
  onContinueAdventure
}: StopCompletedPromptProps) {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (open) {
      markStopPromptShown(explorerId);
    }
  }, [open, explorerId]);

  const handlePlayDailyQuest = () => {
    markCameFromGeoAdventures();
    onPlayDailyQuest();
    onClose();
  };

  const handleContinueLater = () => {
    onContinueAdventure();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={handleContinueLater}
          data-testid="stop-completed-prompt-overlay"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-orange-400 to-amber-400 p-4 text-white relative">
                <button
                  onClick={handleContinueLater}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                  data-testid="button-close-stop-prompt"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                    <Flame className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">You're Exploring!</h3>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 flex-shrink-0">
                    <GeoBuddyCharacter state="wondering" size="sm" autoHide={false} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Great exploring today! 🌍<br/>
                    Want a quick geography challenge before you go?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                    onClick={handlePlayDailyQuest}
                    data-testid="button-play-daily-quest"
                  >
                    <Compass className="w-4 h-4 mr-2" />
                    Play 1-Minute Game
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleContinueLater}
                    data-testid="button-continue-adventure"
                  >
                    Continue Adventure Later
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ExitAdventurePromptProps {
  open: boolean;
  onClose: () => void;
  explorerId?: string;
  onPlayQuickGame: () => void;
  onNotToday: () => void;
}

export function ExitAdventurePrompt({ 
  open, 
  onClose, 
  explorerId,
  onPlayQuickGame,
  onNotToday
}: ExitAdventurePromptProps) {
  useEffect(() => {
    if (open) {
      markExitPromptShown(explorerId);
    }
  }, [open, explorerId]);

  const handlePlayGame = () => {
    markCameFromGeoAdventures();
    onPlayQuickGame();
    onClose();
  };

  const handleNotToday = () => {
    onNotToday();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={handleNotToday}
          data-testid="exit-adventure-prompt-overlay"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-400 to-purple-400 p-4 text-white relative">
                <button
                  onClick={handleNotToday}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                  data-testid="button-close-exit-prompt"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                    <Moon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Adventure Done for Today</h3>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 flex-shrink-0">
                    <GeoBuddyCharacter state="wondering" size="sm" autoHide={false} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Great adventure today! 🌙<br/>
                    Ready for one more quick exploration?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                    onClick={handlePlayGame}
                    data-testid="button-play-quick-game"
                  >
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    Play Quick Game
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleNotToday}
                    data-testid="button-not-today"
                  >
                    Not Today
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ParentReviewPromptProps {
  open: boolean;
  onClose: () => void;
  onPlayRelatedGame: () => void;
  onSkip: () => void;
}

export function ParentReviewPrompt({ 
  open, 
  onClose, 
  onPlayRelatedGame,
  onSkip
}: ParentReviewPromptProps) {
  const handlePlayGame = () => {
    markCameFromGeoAdventures();
    onPlayRelatedGame();
    onClose();
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={handleSkip}
          data-testid="parent-review-prompt-overlay"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-teal-400 to-emerald-400 p-4 text-white relative">
                <button
                  onClick={handleSkip}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                  data-testid="button-close-parent-prompt"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Memory Reinforcement</h3>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 flex-shrink-0">
                    <GeoBuddyCharacter state="wondering" size="sm" autoHide={false} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Want to help your child remember today's places?<br/>
                    A quick GeoGame builds recall.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
                    onClick={handlePlayGame}
                    data-testid="button-play-related-game"
                  >
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    Play Related Game
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSkip}
                    data-testid="button-skip-parent-prompt"
                  >
                    Skip
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ReturnToAdventuresPromptProps {
  open: boolean;
  onClose: () => void;
  onReturnToAdventures: () => void;
  onPlayGuessAndGo: () => void;
  onStay: () => void;
}

export function ReturnToAdventuresPrompt({ 
  open, 
  onClose, 
  onReturnToAdventures,
  onPlayGuessAndGo,
  onStay
}: ReturnToAdventuresPromptProps) {
  const handleReturnToAdventures = () => {
    clearCameFromGeoAdventures();
    onReturnToAdventures();
    onClose();
  };

  const handlePlayGuessAndGo = () => {
    clearCameFromGeoAdventures();
    onPlayGuessAndGo();
    onClose();
  };

  const handleStay = () => {
    clearCameFromGeoAdventures();
    onStay();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={handleStay}
          data-testid="return-adventures-prompt-overlay"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-4 text-white relative">
                <button
                  onClick={handleStay}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                  data-testid="button-close-return-prompt"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                    <Compass className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Great Job!</h3>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 flex-shrink-0">
                    <GeoBuddyCharacter state="chatting" size="sm" autoHide={false} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You kept your streak alive! 🎉<br/>
                    What would you like to do next?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    onClick={handleReturnToAdventures}
                    data-testid="button-return-to-adventures"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Return to GeoAdventures
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handlePlayGuessAndGo}
                    data-testid="button-play-guess-and-go"
                  >
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    Play a Quick Guess & Go
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleStay}
                    data-testid="button-close-prompts"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useGeoGamesFromAdventures(explorerId?: string) {
  const [showStopPrompt, setShowStopPrompt] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  
  const triggerStopCompletedPrompt = () => {
    if (shouldShowStopCompletedPrompt(explorerId)) {
      setShowStopPrompt(true);
    }
  };
  
  const triggerExitPrompt = () => {
    if (shouldShowExitPrompt(explorerId)) {
      setShowExitPrompt(true);
    }
  };
  
  return {
    showStopPrompt,
    setShowStopPrompt,
    showExitPrompt,
    setShowExitPrompt,
    triggerStopCompletedPrompt,
    triggerExitPrompt,
  };
}
