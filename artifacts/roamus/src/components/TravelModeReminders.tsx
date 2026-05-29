import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Compass, Globe, Trophy, Gamepad2, Map, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { GeoBuddyCharacter } from './GeoBuddyCharacter';

const REMINDER_STORAGE_KEY = 'travel_mode_reminders';
const FIRST_TIME_KEY = 'travel_mode_first_visit';
const STOPS_SINCE_GAME_KEY = 'travel_mode_stops_since_game';
const GAMES_PLAYED_TODAY_KEY = 'travel_mode_games_today';
const GAMES_TODAY_DATE_KEY = 'travel_mode_games_today_date';
const DAILY_REMINDER_SHOWN_KEY = 'travel_mode_daily_reminder_shown';
const GAMES_BEFORE_REMINDER = 3; // Show reminder after every 3 games

interface ReminderState {
  dailyQuest: string | null;
  crossWorld: string | null;
  treasureVault: string | null;
  guessAndGo: string | null;
}

interface TravelModeRemindersProps {
  stopsVisited?: number;
  onNavigate?: (path: string) => void;
  explorerId?: string;
}

function hasDailyQuestBeenPlayedToday(explorerId?: string): boolean {
  try {
    const today = getTodayDateString();
    // Check multiple possible keys for daily quest played status
    const keysToCheck = [
      explorerId ? `geoquest_daily_last_date_${explorerId}` : null,
      'geoquest_daily_last_date_guest',
    ].filter(Boolean) as string[];
    
    for (const key of keysToCheck) {
      const lastPlayed = localStorage.getItem(key);
      if (lastPlayed) {
        // Compare dates (format: YYYY-M-D or YYYY-MM-DD)
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

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getReminders(): ReminderState {
  try {
    const saved = localStorage.getItem(REMINDER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : { dailyQuest: null, crossWorld: null, treasureVault: null, guessAndGo: null };
  } catch {
    return { dailyQuest: null, crossWorld: null, treasureVault: null, guessAndGo: null };
  }
}

function saveReminder(key: keyof ReminderState) {
  const reminders = getReminders();
  reminders[key] = new Date().toISOString();
  localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminders));
}

function shouldShowReminder(key: keyof ReminderState): boolean {
  const reminders = getReminders();
  const lastShown = reminders[key];
  if (!lastShown) return true;
  
  const lastDate = new Date(lastShown);
  const today = new Date();
  return !isSameDay(lastDate, today);
}

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function getGamesPlayedToday(): number {
  try {
    const savedDate = localStorage.getItem(GAMES_TODAY_DATE_KEY);
    const today = getTodayDateString();
    
    // Reset counter if it's a new day
    if (savedDate !== today) {
      localStorage.setItem(GAMES_TODAY_DATE_KEY, today);
      localStorage.setItem(GAMES_PLAYED_TODAY_KEY, '0');
      localStorage.removeItem(DAILY_REMINDER_SHOWN_KEY); // Reset daily reminder flag
      return 0;
    }
    
    return parseInt(localStorage.getItem(GAMES_PLAYED_TODAY_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function hasShownDailyReminder(): boolean {
  try {
    const savedDate = localStorage.getItem(DAILY_REMINDER_SHOWN_KEY);
    const today = getTodayDateString();
    return savedDate === today;
  } catch {
    return false;
  }
}

function markDailyReminderShown() {
  try {
    localStorage.setItem(DAILY_REMINDER_SHOWN_KEY, getTodayDateString());
  } catch {}
}

// Call this after each game completion to track progress
export function recordGamePlayed(): { gamesPlayed: number; shouldShowReminder: boolean } {
  try {
    const today = getTodayDateString();
    const savedDate = localStorage.getItem(GAMES_TODAY_DATE_KEY);
    
    // Reset if new day
    if (savedDate !== today) {
      localStorage.setItem(GAMES_TODAY_DATE_KEY, today);
      localStorage.setItem(GAMES_PLAYED_TODAY_KEY, '1');
      localStorage.removeItem(DAILY_REMINDER_SHOWN_KEY);
      return { gamesPlayed: 1, shouldShowReminder: false };
    }
    
    const current = parseInt(localStorage.getItem(GAMES_PLAYED_TODAY_KEY) || '0', 10);
    const newCount = current + 1;
    localStorage.setItem(GAMES_PLAYED_TODAY_KEY, String(newCount));
    
    // Check if we should show reminder (every 3 games, but only once per day)
    const alreadyShownToday = hasShownDailyReminder();
    const shouldShow = newCount >= GAMES_BEFORE_REMINDER && !alreadyShownToday;
    
    return { gamesPlayed: newCount, shouldShowReminder: shouldShow };
  } catch {
    return { gamesPlayed: 0, shouldShowReminder: false };
  }
}

function canShowTravelReminder(): boolean {
  // Only show if: 3+ games played today AND haven't shown reminder today
  const gamesPlayed = getGamesPlayedToday();
  const alreadyShownToday = hasShownDailyReminder();
  return gamesPlayed >= GAMES_BEFORE_REMINDER && !alreadyShownToday;
}

function getStopsSinceGame(): number {
  try {
    return parseInt(localStorage.getItem(STOPS_SINCE_GAME_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function resetStopsSinceGame() {
  localStorage.setItem(STOPS_SINCE_GAME_KEY, '0');
}

function incrementStopsSinceGame(): number {
  const current = getStopsSinceGame();
  const newCount = current + 1;
  localStorage.setItem(STOPS_SINCE_GAME_KEY, String(newCount));
  return newCount;
}

type ReminderType = 'dailyQuest' | 'crossWorld' | 'treasureVault' | 'guessAndGo';

interface ReminderConfig {
  key: ReminderType;
  title: string;
  message: string;
  icon: React.ReactNode;
  buttonText: string;
  path: string;
  color: string;
}

const REMINDERS: ReminderConfig[] = [
  {
    key: 'dailyQuest',
    title: 'Daily Quest Awaits!',
    message: 'Take a quick geography challenge to earn stars and keep your brain sharp!',
    icon: <Compass className="w-8 h-8" />,
    buttonText: 'Start Daily Quest',
    path: '/?openDailyQuest=true',
    color: 'from-orange-500 to-amber-500',
  },
  {
    key: 'crossWorld',
    title: 'CrossWorld Puzzle!',
    message: 'A new geography crossword is ready for you. Can you solve it?',
    icon: <Globe className="w-8 h-8" />,
    buttonText: 'Play CrossWorld',
    path: '/crossworld',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    key: 'treasureVault',
    title: 'Treasure Vault Open!',
    message: 'Explore mini-games and unlock rewards in the Treasure Vault!',
    icon: <Trophy className="w-8 h-8" />,
    buttonText: 'Open Vault',
    path: '/sticker-book',
    color: 'from-purple-500 to-pink-500',
  },
  {
    key: 'guessAndGo',
    title: 'Time for Guess & Go!',
    message: "You've explored 2 stops! Ready for a geography challenge?",
    icon: <Gamepad2 className="w-8 h-8" />,
    buttonText: 'Play Guess & Go',
    path: '/game',
    color: 'from-green-500 to-emerald-500',
  },
];

export function TravelModeReminders({ stopsVisited = 0, onNavigate, explorerId }: TravelModeRemindersProps) {
  // NOTE: This component's random reminder logic has been deprecated.
  // GeoGames prompts within GeoAdventures are now handled by GeoGamesFromAdventures.tsx
  // which provides 3 focused moments:
  // 1. StopCompletedPrompt - after first stop completion, if streak not done
  // 2. ExitAdventurePrompt - when leaving GeoAdventures, if streak not done  
  // 3. ReturnToAdventuresPrompt - after playing Daily Quest from GeoAdventures
  // 
  // This component is kept for backward compatibility with exported functions
  // but no longer shows random game reminders.
  
  const [, setLocation] = useLocation();
  const [currentReminder, setCurrentReminder] = useState<ReminderConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [shownReminders, setShownReminders] = useState<Set<ReminderType>>(new Set());

  // Deprecated: Random reminders no longer shown
  // The old logic (3 games threshold, random picker) has been removed
  // in favor of the focused prompts in GeoGamesFromAdventures.tsx

  const handleDismiss = () => {
    if (currentReminder) {
      saveReminder(currentReminder.key);
      setShownReminders(prev => new Set(Array.from(prev).concat(currentReminder.key)));
      if (currentReminder.key === 'guessAndGo') {
        resetStopsSinceGame();
      }
    }
    setCurrentReminder(null);
  };

  const handleAction = () => {
    if (currentReminder) {
      saveReminder(currentReminder.key);
      setShownReminders(prev => new Set(Array.from(prev).concat(currentReminder.key)));
      if (currentReminder.key === 'guessAndGo') {
        resetStopsSinceGame();
      }
      if (onNavigate) {
        onNavigate(currentReminder.path);
      } else {
        setLocation(currentReminder.path);
      }
    }
    setCurrentReminder(null);
  };

  return (
    <AnimatePresence>
      {currentReminder && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            <Card className="overflow-hidden">
              <div className={`bg-gradient-to-r ${currentReminder.color} p-4 text-white relative`}>
                <button
                  onClick={handleDismiss}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                  data-testid="button-dismiss-reminder"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                    {currentReminder.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{currentReminder.title}</h3>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 flex-shrink-0">
                    <GeoBuddyCharacter state="wondering" size="sm" autoHide={false} />
                  </div>
                  <p className="text-sm text-muted-foreground">{currentReminder.message}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleDismiss}
                    data-testid="button-maybe-later"
                  >
                    Maybe Later
                  </Button>
                  <Button
                    className={`flex-1 bg-gradient-to-r ${currentReminder.color} text-white`}
                    onClick={handleAction}
                    data-testid="button-reminder-action"
                  >
                    {currentReminder.buttonText}
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

export function FirstTimeTravelWelcome({ onClose, hasTrips = false }: { onClose: () => void; hasTrips?: boolean }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Skip welcome for existing users who already have trips
    if (hasTrips) {
      // Mark as seen so it doesn't show if they delete all trips later
      localStorage.setItem(FIRST_TIME_KEY, 'true');
      return;
    }
    
    const hasSeenWelcome = localStorage.getItem(FIRST_TIME_KEY);
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [hasTrips]);

  const handleClose = () => {
    localStorage.setItem(FIRST_TIME_KEY, 'true');
    setIsVisible(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 p-6 text-white text-center relative">
                <button
                  onClick={handleClose}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                  data-testid="button-close-welcome"
                >
                  <X className="w-5 h-5" />
                </button>
                <motion.div 
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-24 h-24 mx-auto mb-4"
                >
                  <GeoBuddyCharacter state="wondering" size="lg" autoHide={false} />
                </motion.div>
                <h2 className="text-xl font-bold">Welcome to GeoAdventures!</h2>
              </div>
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                  <Map className="w-5 h-5" />
                  <Sparkles className="w-5 h-5" />
                  <Compass className="w-5 h-5" />
                </div>
                <p className="text-muted-foreground">
                  Ready to make memories during your travels? Let Compass GeoBuddy be your guide on this adventure!
                </p>
                <Button
                  onClick={handleClose}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  data-testid="button-start-exploring"
                >
                  Let's Start Exploring!
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function incrementStopsVisited(): number {
  return incrementStopsSinceGame();
}
