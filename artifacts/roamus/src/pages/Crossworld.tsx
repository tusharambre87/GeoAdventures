import { useState, useEffect, useRef, TouchEvent } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Lightbulb, Trophy, Timer, Flame, Zap, Lock, AlertCircle, Globe, Bell, Target, TrendingUp } from "lucide-react";
import LearningSummary, { getGameLearningPoints } from "@/components/LearningSummary";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { soundManager } from "@/lib/sound";
import { getCityImage } from "@/lib/cityImages";
import { cn } from "@/lib/utils";
import { FILTERED_CROSSWORLD_DATA } from "@/lib/crossworldData";
import { getTodayDateString, useCountdown, formatCountdown } from "@/lib/dailyReset";
import { useSessionOptional } from "@/lib/sessionContext";

type GameMode = "EASY" | "HARD";

// Configuration - Grid size varies by mode (7x7 for Easy, 8x8 for Hard)
const getGridSize = (mode: GameMode) => mode === "EASY" ? 7 : 8;

// Seeded Random Number Generator
function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

type Cell = {
  r: number;
  c: number;
  letter: string;
};

type WordLocation = {
    id: string;
    cells: Cell[];
};

// Directions: [rowDelta, colDelta]
const DIRECTIONS = [
  [0, 1],   // Horizontal Right
  [1, 0],   // Vertical Down
  [1, 1],   // Diagonal Down-Right
  [-1, 1]   // Diagonal Up-Right
];

export default function Crossworld() {
  const [, setLocation] = useLocation();
  const crosswordReturnTo = new URLSearchParams(window.location.search).get('from');
  const goHome = () => setLocation(crosswordReturnTo || "/play-games");
  const { user, stats, recordCrossworldResult, syncStatsToBackend, getBonusHintsFromStreak, loadPlayerFromBackend, currentPlayerId } = useUser();
  const { activeExplorer } = useExplorer();
  const session = useSessionOptional();
  
  useEffect(() => {
    if (activeExplorer?.id && activeExplorer.id !== currentPlayerId) {
      loadPlayerFromBackend(activeExplorer.id);
    }
  }, [activeExplorer?.id, currentPlayerId, loadPlayerFromBackend]);
  
  const bonusHints = getBonusHintsFromStreak();
  
  // Ready confirmation state (for logged-in users with active explorer)
  const [showReadyConfirm, setShowReadyConfirm] = useState(false);
  
  // Persistent Daily State
  const [playedToday, setPlayedToday] = useState(false);
  
  // Setup State
  const [setupComplete, setSetupComplete] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("HARD");

  // Game State
  const [grid, setGrid] = useState<string[][]>([]);
  const [targetWords, setTargetWords] = useState<any[]>([]);
  const [wordLocations, setWordLocations] = useState<WordLocation[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]); // Store IDs of found/guessed words
  const [guessedWordIds, setGuessedWordIds] = useState<string[]>([]); // Words the user actually guessed correctly (not revealed)
  const [selection, setSelection] = useState<Cell[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [gameStatus, setGameStatus] = useState<"PLAYING" | "WON" | "LOST" | "GIVEN_UP">("PLAYING");
  const [showReward, setShowReward] = useState<any | null>(null);
  const [cheatUsed, setCheatUsed] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [giveUpAttempts, setGiveUpAttempts] = useState(0);
  const [showGiveUpMotivation, setShowGiveUpMotivation] = useState(false);
  const [showCountriesRevealed, setShowCountriesRevealed] = useState(false);
  const [showCountriesConfirm, setShowCountriesConfirm] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showReminderEmailDialog, setShowReminderEmailDialog] = useState(false);
  const [showDisableReminderConfirm, setShowDisableReminderConfirm] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);
  const [showCompletedScreen, setShowCompletedScreen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false); // View-only mode for completed puzzles
  const [showCelebration, setShowCelebration] = useState(false); // Delay before results after winning
  
  const crossworldGamesPlayed = stats.crossworldTotalGames || 0;
  const crossworldWins = stats.crossworldTotalWins || 0;
  const crossworldWinPercent = crossworldGamesPlayed > 0 ? Math.round((crossworldWins / crossworldGamesPlayed) * 100) : 0;
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startCellRef = useRef<Cell | null>(null);
  const fireworksRef = useRef<NodeJS.Timeout | null>(null);

  const countdown = useCountdown();
  
  // Helper functions to save/load puzzle results per explorer per day per mode
  const getPuzzleResultKey = (mode: GameMode) => {
    const explorerId = activeExplorer?.id || 'guest';
    const today = getTodayDateString();
    return `crossworld_result_${explorerId}_${today}_${mode}`;
  };
  
  const savePuzzleResult = (mode: GameMode, guessedIds: string[]) => {
    const key = getPuzzleResultKey(mode);
    localStorage.setItem(key, JSON.stringify({ guessedWordIds: guessedIds }));
  };
  
  const loadPuzzleResult = (mode: GameMode): string[] => {
    const key = getPuzzleResultKey(mode);
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.guessedWordIds || [];
      }
    } catch (e) {
      console.error('Error loading puzzle result:', e);
    }
    return [];
  };
  
  // Check if played today - only show completed screen if BOTH modes are played
  useEffect(() => {
      const today = getTodayDateString();
      const easyPlayedToday = stats.crossworldLastPlayedEasy === today;
      const hardPlayedToday = stats.crossworldLastPlayedHard === today;
      
      // Only skip to completed screen if BOTH modes are played today
      if (easyPlayedToday && hardPlayedToday) {
          setPlayedToday(true);
          setSetupComplete(true);
          setShowCompletedScreen(true);
          const mode = stats.crossworldMode || "HARD";
          setGameMode(mode);
          setGameStatus(stats.crossworldStatus || "GIVEN_UP"); 
      }
      // If only one mode is played, show setup dialog (which handles "Already Played" status)
  }, [stats.crossworldLastPlayedEasy, stats.crossworldLastPlayedHard, stats.crossworldStatus, stats.crossworldMode]);

  // Initial Generation (default for when first loading)
  // We only do this if we are already played today, otherwise we wait for startGame
  useEffect(() => {
      if (playedToday) {
          generateDailyPuzzle(gameMode);
      }
  }, [playedToday, gameMode]);

  // Timer Logic (Count UP)
  useEffect(() => {
    if (setupComplete && gameStatus === "PLAYING" && !playedToday) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [setupComplete, gameStatus, playedToday]);

  // Track game time for analytics
  useEffect(() => {
    if (setupComplete && gameStatus === "PLAYING" && session) {
      session.startGameTimer();
    } else if (gameStatus !== "PLAYING" && session) {
      session.stopGameTimer();
    }
  }, [setupComplete, gameStatus, session]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateDailyPuzzle = (mode: GameMode) => {
    const today = new Date();
    const startDate = new Date("2024-01-01");
    const dayIndex = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Total available cards - filter by max word length for grid size
    const gridSize = getGridSize(mode);
    const allCards = [...FILTERED_CROSSWORLD_DATA].filter(card => card.capital.length <= gridSize);
    const cardsPerGame = 5;
    
    // Partition cards into two disjoint pools: odd indices for Easy, even indices for Hard
    // This guarantees Easy and Hard modes NEVER share capitals on the same day
    const easyPool = allCards.filter((_, i) => i % 2 === 0);
    const hardPool = allCards.filter((_, i) => i % 2 === 1);
    const modePool = mode === "EASY" ? easyPool : hardPool;
    const totalCards = modePool.length;
    
    const cycleNum = Math.floor((dayIndex * cardsPerGame) / totalCards);
    
    // Use Mode in RNG seed for shuffling
    const modeOffset = mode === "EASY" ? 0 : 9999;
    const rng = mulberry32(cycleNum + 12345 + modeOffset); 
    
    // Shuffle this mode's pool
    const shuffledCards = [...modePool].sort(() => rng() - 0.5);
    
    // Pick cards based on offset
    const offset = (dayIndex * cardsPerGame) % totalCards;
    let dailyCards = shuffledCards.slice(offset, offset + cardsPerGame);
    
    if (dailyCards.length < cardsPerGame) {
        const remaining = cardsPerGame - dailyCards.length;
        dailyCards = [...dailyCards, ...shuffledCards.slice(0, remaining)];
    }
    
    const formatCards = (cards: typeof dailyCards) => cards.map(card => ({
        id: card.country,
        word: card.capital.toUpperCase(),
        clue: card.hint || `Famous city in ${card.country}`,
        displayClue: card.country,
        imageCity: card.capital,
        imageContinent: "World"
    }));

    let formattedWords = formatCards(dailyCards);
    let result = tryPlaceWords(formattedWords, rng, mode);

    let retryCount = 0;
    const usedCardIds = new Set(dailyCards.map(c => c.country));
    while (result.placedWords.length < cardsPerGame && retryCount < 15) {
      retryCount++;
      const unplacedCount = cardsPerGame - result.placedWords.length;
      const replacements = modePool
        .filter(c => !usedCardIds.has(c.country) && c.capital.length <= gridSize)
        .sort(() => rng() - 0.5)
        .slice(0, unplacedCount);
      
      if (replacements.length === 0) break;
      replacements.forEach(c => usedCardIds.add(c.country));
      
      const keptCards = dailyCards.filter(c => result.placedWordIds.has(c.country));
      const newFormatted = formatCards([...keptCards, ...replacements]);
      result = tryPlaceWords(newFormatted, rng, mode);
    }

    setGrid(result.grid);
    setWordLocations(result.locations);
    setTargetWords(result.placedWords);
  };

  const tryPlaceWords = (words: any[], placementRng: () => number, mode: GameMode) => {
    const result = generateGrid(words, placementRng, mode);
    const placedWordIds = new Set(result.locations.map(loc => loc.id));
    const placedWords = words.filter(w => placedWordIds.has(w.id));
    return { ...result, placedWordIds, placedWords };
  };

  const generateGrid = (words: any[], placementRng: () => number, mode: GameMode) => {
    const gridSize = getGridSize(mode);
    const newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(""));
    const locations: WordLocation[] = [];
    
    const wordsToPlace = [...words].sort((a, b) => b.word.length - a.word.length);
    
    // Assign specific directions to ensure variety
    // DIRECTIONS: [0] Horizontal, [1] Vertical, [2] Diagonal Down-Right, [3] Diagonal Up-Right
    const directionAssignments = [
      0, // First word: Horizontal
      1, // Second word: Vertical
      2, // Third word: Diagonal Down-Right
      3, // Fourth word: Diagonal Up-Right
      Math.floor(placementRng() * 4) // Fifth word: Random
    ];
    
    // Shuffle assignments based on RNG for variety
    for (let i = directionAssignments.length - 1; i > 0; i--) {
      const j = Math.floor(placementRng() * (i + 1));
      [directionAssignments[i], directionAssignments[j]] = [directionAssignments[j], directionAssignments[i]];
    }

    for (let wordIndex = 0; wordIndex < wordsToPlace.length; wordIndex++) {
      const wordObj = wordsToPlace[wordIndex];
      let placed = false;
      let attempts = 0;
      
      // Get the assigned direction for this word
      const preferredDirIndex = directionAssignments[wordIndex % directionAssignments.length];
      
      // Increased attempts to 500 to better ensure placement in smaller grids
      while (!placed && attempts < 500) {
        // Use preferred direction for first 150 attempts, then try any direction
        const dirIndex = attempts < 150 ? preferredDirIndex : Math.floor(placementRng() * DIRECTIONS.length);
        const dir = DIRECTIONS[dirIndex];
        const rStart = Math.floor(placementRng() * gridSize);
        const cStart = Math.floor(placementRng() * gridSize);
        
        let fits = true;
        const currentCells: Cell[] = [];
        
        for (let i = 0; i < wordObj.word.length; i++) {
          const r = rStart + (dir[0] * i);
          const c = cStart + (dir[1] * i);
          
          if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
            fits = false;
            break;
          }
          
          if (newGrid[r][c] !== "" && newGrid[r][c] !== wordObj.word[i]) {
            fits = false;
            break;
          }
          currentCells.push({ r, c, letter: wordObj.word[i] });
        }
        
        if (fits) {
          for (let i = 0; i < wordObj.word.length; i++) {
            const r = rStart + (dir[0] * i);
            const c = cStart + (dir[1] * i);
            newGrid[r][c] = wordObj.word[i];
          }
          locations.push({ id: wordObj.id, cells: currentCells });
          placed = true;
        }
        attempts++;
      }
      
      // Log warning if word couldn't be placed (should be rare with increased attempts)
      if (!placed) {
        console.warn(`[Crossworld] Could not place word: ${wordObj.word} (${wordObj.id})`);
      }
    }
    
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (newGrid[r][c] === "") {
          newGrid[r][c] = ALPHABET[Math.floor(placementRng() * ALPHABET.length)];
        }
      }
    }
    
    return { grid: newGrid, locations };
  };

  const startGame = (mode: GameMode) => {
      setGameMode(mode);
      generateDailyPuzzle(mode); // Generate specifically for this mode
      setSetupComplete(true);
      setGameStatus("PLAYING");
      setFoundWords([]);
      setHintsUsed(0);
      setActiveHint(null);
      setTimer(0);
      setCheatUsed(false);
  };

  const handleCheatCode = () => {
    if (cheatUsed || gameStatus !== "PLAYING") return;
    
    const remainingWords = targetWords.filter(w => !foundWords.includes(w.id));
    if (remainingWords.length === 0) return;
    
    const randomWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
    handleWordFound(randomWord, false); // Pass false to indicate this was revealed, not guessed
    setCheatUsed(true);
    setActiveHint(`🎁 CHEAT: Found ${randomWord.word}!`);
  };

  // Selection Logic
  const getCellsBetween = (start: Cell, end: Cell) => {
    const cells: Cell[] = [];
    const dr = end.r - start.r;
    const dc = end.c - start.c;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    if (steps === 0) return [start];
    const rStep = dr / steps;
    const cStep = dc / steps;
    const isInt = (n: number) => Math.abs(n - Math.round(n)) < 0.01;
    if (isInt(rStep) && isInt(cStep)) {
       for (let i = 0; i <= steps; i++) {
         cells.push({
           r: Math.round(start.r + (i * rStep)),
           c: Math.round(start.c + (i * cStep)),
           letter: grid[Math.round(start.r + (i * rStep))][Math.round(start.c + (i * cStep))]
         });
       }
    }
    return cells;
  };

  const handlePointerDown = (r: number, c: number) => {
    if (gameStatus !== "PLAYING") return;
    setIsSelecting(true);
    startCellRef.current = { r, c, letter: grid[r][c] };
    setSelection([startCellRef.current]);
  };

  const handlePointerMove = (r: number, c: number) => {
    if (!isSelecting || !startCellRef.current || gameStatus !== "PLAYING") return;
    const path = getCellsBetween(startCellRef.current, { r, c, letter: grid[r][c] });
    setSelection(path);
  };

  const handlePointerUp = () => {
    if (!isSelecting || gameStatus !== "PLAYING") return;
    setIsSelecting(false);
    
    const selectedWord = selection.map(cell => cell.letter).join("");
    const match = targetWords.find(w => w.word === selectedWord && !foundWords.includes(w.id));
    
    if (match) {
      handleWordFound(match);
    } else {
      soundManager.playClick();
    }
    
    setSelection([]);
    startCellRef.current = null;
  };
  
  const handleTouchStart = (e: TouchEvent, r: number, c: number) => {
      handlePointerDown(r, c);
  };
  
  const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element && element.hasAttribute('data-row')) {
          const r = parseInt(element.getAttribute('data-row')!);
          const c = parseInt(element.getAttribute('data-col')!);
          handlePointerMove(r, c);
      }
  };

  const handleWordFound = (wordObj: any, wasGuessed: boolean = true) => {
    const newFound = [...foundWords, wordObj.id];
    setFoundWords(newFound);
    
    // Track if this was a user guess (not a reveal)
    // Build the new guessed list to pass to handleGameOver (avoids stale closure)
    const newGuessedIds = wasGuessed ? [...guessedWordIds, wordObj.id] : guessedWordIds;
    if (wasGuessed) {
      setGuessedWordIds(newGuessedIds);
    }
    
    // Only show popup reward if playing
    if (gameStatus === "PLAYING") {
        setShowReward(wordObj);
        soundManager.playSuccess();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    }
    
    if (newFound.length === targetWords.length) {
       // Show celebration with completed grid before going to results
       setShowCelebration(true);
       soundManager.playFanfare();
       confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
       // Delay before showing results dialog - pass final guessedIds to avoid stale closure
       const finalGuessedIds = newGuessedIds;
       setTimeout(() => {
         setShowCelebration(false);
         handleGameOver("WON", finalGuessedIds);
       }, 2500);
    }
  };

  const handleGameOver = (status: "WON" | "LOST" | "GIVEN_UP", finalGuessedIds?: string[]) => {
    setGameStatus(status);
    if (status === "WON") {
        soundManager.playFanfare();
        
        // Check if this is a new record
        const previousBest = stats.crossworldBestTime;
        const finalTime = timer;
        const beatRecord = !previousBest || finalTime < previousBest;
        setIsNewRecord(beatRecord);
        
        if (beatRecord) {
            // Extended fireworks celebration for new record - 10 seconds
            let fireworkCount = 0;
            const maxFireworks = 20; // 20 bursts over 10 seconds
            
            const launchFirework = () => {
                if (fireworkCount >= maxFireworks) {
                    if (fireworksRef.current) clearInterval(fireworksRef.current);
                    return;
                }
                
                // Random positions for fireworks effect
                const x = 0.2 + Math.random() * 0.6;
                const y = 0.2 + Math.random() * 0.4;
                
                confetti({
                    particleCount: 80,
                    spread: 100,
                    origin: { x, y },
                    colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
                    startVelocity: 30,
                    gravity: 0.8,
                    scalar: 1.2
                });
                
                fireworkCount++;
            };
            
            // Launch immediately and then every 500ms for 10 seconds
            launchFirework();
            fireworksRef.current = setInterval(launchFirework, 500);
        } else {
            // Regular confetti celebration for winning
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
            setTimeout(() => {
                confetti({ particleCount: 100, spread: 80, origin: { x: 0.3, y: 0.5 } });
            }, 300);
            setTimeout(() => {
                confetti({ particleCount: 100, spread: 80, origin: { x: 0.7, y: 0.5 } });
            }, 600);
        }
    } else {
        soundManager.playError();
    }
    
    // Save puzzle result (guessed word IDs) for view mode
    // Use finalGuessedIds if provided (to avoid stale closure), otherwise use current state
    const idsToSave = finalGuessedIds || guessedWordIds;
    savePuzzleResult(gameMode, idsToSave);
    // Also update state if finalGuessedIds was passed
    if (finalGuessedIds) {
      setGuessedWordIds(finalGuessedIds);
    }
    
    // Record Stats
    const finalTime = timer;
    recordCrossworldResult(finalTime, status, gameMode);
    
    // Track analytics event
    import('@/lib/analytics').then(({ trackGameEvent }) => {
      trackGameEvent('crossworld_complete', 'crossworld', {
        timeSpentSeconds: timer,
        completed: true,
        won: status === "WON",
        difficulty: gameMode,
      });
    });
    
    // Sync stats to backend
    setTimeout(() => syncStatsToBackend(), 500);
  };
  
  // Cleanup fireworks on unmount
  useEffect(() => {
    return () => {
      if (fireworksRef.current) clearInterval(fireworksRef.current);
    };
  }, []);

  const handleHint = () => {
    const baseHints = gameMode === "EASY" ? 3 : 2;
    const maxHints = baseHints + bonusHints;
    if (hintsUsed >= maxHints) return;
    
    const remainingWords = targetWords.filter(w => !foundWords.includes(w.id));
    if (remainingWords.length === 0) return;
    
    const randomWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
    
    if (gameMode === "HARD") {
      const wordLength = randomWord.word.length;
      const pos1 = Math.floor(Math.random() * wordLength);
      let pos2 = Math.floor(Math.random() * wordLength);
      while (pos2 === pos1 && wordLength > 1) {
        pos2 = Math.floor(Math.random() * wordLength);
      }
      const letter1 = randomWord.word[pos1].toUpperCase();
      const letter2 = randomWord.word[pos2].toUpperCase();
      const ordinal1 = pos1 === 0 ? "1st" : pos1 === 1 ? "2nd" : pos1 === 2 ? "3rd" : `${pos1 + 1}th`;
      const ordinal2 = pos2 === 0 ? "1st" : pos2 === 1 ? "2nd" : pos2 === 2 ? "3rd" : `${pos2 + 1}th`;
      setActiveHint(`💡 HINT: A capital has "${letter1}" as ${ordinal1} letter and "${letter2}" as ${ordinal2} letter`);
    } else {
      setActiveHint(`💡 HINT: ${randomWord.clue}`);
    }
    setHintsUsed(prev => prev + 1);
  };
  
  const handleShowCountries = () => {
    setShowCountriesConfirm(true);
  };
  
  const confirmShowCountries = () => {
    setTimer(prev => prev + 15);
    setShowCountriesRevealed(true);
    setShowCountriesConfirm(false);
  };
  
  // CrossWorld Completed Screen (when already played today)
  if (playedToday && showCompletedScreen) {
      return (
        <div className="min-h-screen bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm fixed inset-0 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-4 border-indigo-200 dark:border-indigo-700 my-4 max-h-[90vh] overflow-y-auto">
                <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Globe className="w-12 h-12 text-indigo-500 dark:text-indigo-400" />
                </div>
                <h1 className="text-2xl font-heading text-indigo-900 dark:text-indigo-200 mb-2">CrossWorld Completed!</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    You already played today's puzzle.
                    {stats.crossworldStatus === "WON" ? " Great job!" : ""}
                </p>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-600">
                    <div className="text-center">
                        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 mb-1">
                            <Target className="w-4 h-4" />
                        </div>
                        <div className="text-xl font-black text-gray-800 dark:text-gray-100 leading-none">{crossworldGamesPlayed}</div>
                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mt-1">Games</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center text-green-500 mb-1">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <div className="text-xl font-black text-green-600 dark:text-green-400 leading-none">{crossworldWinPercent}%</div>
                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mt-1">Win</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center text-orange-500 mb-1">
                            <Flame className="w-4 h-4 fill-orange-500" />
                        </div>
                        <div className="text-xl font-black text-orange-600 dark:text-orange-400 leading-none">{stats.crossworldStreak || 0}</div>
                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mt-1">CrossWorld</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center text-yellow-500 mb-1">
                            <Zap className="w-4 h-4 fill-yellow-500" />
                        </div>
                        <div className="text-xl font-black text-yellow-600 dark:text-yellow-400 leading-none">{stats.crossworldBestTime ? formatTime(stats.crossworldBestTime) : "--:--"}</div>
                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mt-1">Best</div>
                    </div>
                </div>
                
                {/* Learning Summary */}
                <div className="mb-4">
                    <LearningSummary points={getGameLearningPoints("crossworld")} />
                </div>
                
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-3 mb-6 border border-indigo-200 dark:border-indigo-700">
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 uppercase font-bold mb-1">Next Puzzle In</p>
                    <p className="text-2xl font-mono font-bold text-indigo-700 dark:text-indigo-300">{formatCountdown(countdown)}</p>
                </div>
                
                {/* Show option to play other mode if available */}
                {(() => {
                    const today = new Date().toISOString().split('T')[0];
                    const easyPlayedToday = stats.crossworldLastPlayedEasy === today;
                    const hardPlayedToday = stats.crossworldLastPlayedHard === today;
                    const otherModeAvailable = (gameMode === "EASY" && !hardPlayedToday) || (gameMode === "HARD" && !easyPlayedToday);
                    const otherMode = gameMode === "EASY" ? "HARD" : "EASY";
                    
                    if (otherModeAvailable) {
                        return (
                            <Button 
                                onClick={() => {
                                    setPlayedToday(false);
                                    setShowCompletedScreen(false);
                                    setSetupComplete(false);
                                    setGameMode(otherMode);
                                    setGameStatus("PLAYING");
                                    setTimer(0);
                                    setHintsUsed(0);
                                    setActiveHint(null);
                                    setSelection([]);
                                    setFoundWords([]);
                                    setCheatUsed(false);
                                }}
                                className={cn(
                                    "w-full mb-4 h-14 text-lg font-bold rounded-xl border-2",
                                    otherMode === "HARD" 
                                        ? "bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-600"
                                        : "bg-green-100 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60 text-green-800 dark:text-green-300 border-green-300 dark:border-green-600"
                                )}
                            >
                                🎯 Try {otherMode} Mode
                            </Button>
                        );
                    }
                    return null;
                })()}
                
                <div className="flex gap-3">
                    <Button 
                        onClick={() => setShowCompletedScreen(false)}
                        variant="outline"
                        className="flex-1 border-2 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl h-12 font-bold"
                    >
                        View Puzzle
                    </Button>
                    <Button 
                        onClick={goHome}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-12 font-bold shadow-md"
                    >
                        Back to Home
                    </Button>
                </div>
                
                {/* Reminder Toggle */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between w-full">
                   <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                     <Bell className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                     <span>Get Daily Reminders?</span>
                   </div>
                   <Button 
                     variant={reminderEnabled ? "default" : "outline"}
                     size="sm"
                     className={cn("h-7 text-xs rounded-full", reminderEnabled ? "bg-purple-500" : "text-gray-500 dark:text-gray-400")}
                     onClick={() => {
                       if (!reminderEnabled) {
                         if (!user) {
                           setShowReminderEmailDialog(true);
                         } else {
                           toast.success("You're signed up for CrossWorld alerts!", {
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
                
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold mt-4">Come back at midnight for a new puzzle!</p>
            </div>
        </div>
      );
  }

  // Ready Confirmation Screen (for logged-in users with active explorer)
  if (showReadyConfirm && activeExplorer && !playedToday) {
      return (
        <div className="min-h-screen bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm fixed inset-0 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-4 border-indigo-200 dark:border-indigo-700">
                <div className="w-32 h-32 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-indigo-200 dark:border-indigo-700">
                    <Trophy className="w-16 h-16 text-indigo-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Ready, {activeExplorer.name}?</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8">Find all 5 capitals as fast as you can!</p>
                <Button 
                    onClick={() => {
                        setShowReadyConfirm(false);
                        setSetupComplete(true);
                    }} 
                    size="lg" 
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-xl py-6 rounded-xl shadow-lg border-b-4 border-indigo-700 active:border-b-0 active:translate-y-1"
                    data-testid="button-start-crossworld"
                >
                    Start CrossWorld
                </Button>
                <Button 
                    variant="ghost" 
                    onClick={() => {
                        setShowReadyConfirm(false);
                        setGameMode("HARD");
                    }}
                    className="mt-4 text-slate-400 dark:text-slate-500 dark:hover:text-slate-300"
                    data-testid="button-back-to-modes"
                >
                    Back to Mode Selection
                </Button>
            </div>
        </div>
      );
  }

  // Setup Dialog
  if (!setupComplete && !playedToday) {
      const today = getTodayDateString();
      const easyPlayedToday = stats.crossworldLastPlayedEasy === today;
      const hardPlayedToday = stats.crossworldLastPlayedHard === today;
      
      return (
        <div className="min-h-screen bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm fixed inset-0 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-4 border-indigo-200 dark:border-indigo-700">
                <h1 className="text-3xl font-heading text-indigo-900 dark:text-indigo-200 mb-2">Daily CrossWorld</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Find 5 hidden capitals!</p>
                
                {bonusHints > 0 && (
                    <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/40 dark:to-orange-900/40 p-3 rounded-xl mb-4 border-2 border-yellow-300 dark:border-yellow-600">
                        <p className="text-sm font-bold text-orange-600 dark:text-orange-400">🎉 Streak Bonus: +{bonusHints} Extra Hints!</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Earned from your daily play streak</p>
                    </div>
                )}
                
                <div className="space-y-4">
                    <Button 
                        onClick={() => {
                            if (easyPlayedToday) {
                                // Already played - show the board with answers in VIEW MODE
                                setGameMode("EASY");
                                generateDailyPuzzle("EASY");
                                setIsViewMode(true);
                                setGameStatus("WON"); // Show all answers
                                // Load saved guessed words for this mode
                                const savedGuessed = loadPuzzleResult("EASY");
                                setGuessedWordIds(savedGuessed);
                                setFoundWords(savedGuessed); // Only the guessed ones are "found", rest are revealed
                                setSetupComplete(true);
                            } else if (activeExplorer) {
                                // For logged-in users, show ready confirmation first
                                setGameMode("EASY");
                                generateDailyPuzzle("EASY");
                                setShowReadyConfirm(true);
                            } else {
                                // For guests, start immediately
                                startGame("EASY");
                            }
                        }} 
                        className={cn(
                            "w-full h-16 text-xl rounded-xl flex flex-col items-center justify-center gap-0 border-2",
                            easyPlayedToday 
                                ? "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                                : "bg-green-100 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60 text-green-800 dark:text-green-300 border-green-300 dark:border-green-600"
                        )}
                    >
                        <span className="font-bold">EASY MODE {easyPlayedToday && "✓"}</span>
                        <span className="text-xs font-normal opacity-80">
                            {easyPlayedToday ? "Already played • Tap to view answers" : `Countries shown • ${3 + bonusHints} Hints`}
                        </span>
                    </Button>
                    
                    <Button 
                        onClick={() => {
                            if (hardPlayedToday) {
                                // Already played - show the board with answers in VIEW MODE
                                setGameMode("HARD");
                                generateDailyPuzzle("HARD");
                                setIsViewMode(true);
                                setGameStatus("WON"); // Show all answers
                                // Load saved guessed words for this mode
                                const savedGuessed = loadPuzzleResult("HARD");
                                setGuessedWordIds(savedGuessed);
                                setFoundWords(savedGuessed); // Only the guessed ones are "found", rest are revealed
                                setSetupComplete(true);
                            } else if (activeExplorer) {
                                // For logged-in users, show ready confirmation first
                                setGameMode("HARD");
                                generateDailyPuzzle("HARD");
                                setShowReadyConfirm(true);
                            } else {
                                // For guests, start immediately
                                startGame("HARD");
                            }
                        }}
                        className={cn(
                            "w-full h-16 text-xl rounded-xl flex flex-col items-center justify-center gap-0 border-2",
                            hardPlayedToday 
                                ? "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                                : "bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-600"
                        )}
                    >
                         <span className="font-bold">HARD MODE {hardPlayedToday && "✓"}</span>
                         <span className="text-xs font-normal opacity-80">
                            {hardPlayedToday ? "Already played • Tap to view answers" : `Hidden list • ${2 + bonusHints} Hints`}
                         </span>
                    </Button>
                </div>
                
                <Button onClick={goHome} className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl h-12 px-6 shadow-md">
                    Back to Home
                </Button>

                {/* Reminder Toggle */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between w-full">
                   <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                     <Bell className="w-4 h-4 text-purple-500 dark:text-purple-400" />
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
                           toast.success("You're signed up for CrossWorld alerts!", {
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
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900 flex flex-col items-center py-4 px-4 font-sans select-none overflow-y-auto">
      <div className="w-full max-w-md flex flex-col items-center min-h-full pb-20">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <Button 
          variant="outline" 
          onClick={() => {
            // If user has made progress (hints used, cheat used, or found words), lock the puzzle
            const hasProgress = hintsUsed > 0 || cheatUsed || foundWords.length > 0;
            if (hasProgress && gameStatus === "PLAYING" && !isViewMode) {
              handleGameOver("GIVEN_UP");
            }
            goHome();
          }} 
          className="bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl px-4 py-2 font-bold shadow-md"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Close
        </Button>
        
        <div className="flex gap-3">
            {stats.crossworldStreak && stats.crossworldStreak > 0 && (
                <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-sm font-bold border border-orange-200 dark:border-orange-700">
                    <Flame className="w-4 h-4 fill-orange-500" /> {stats.crossworldStreak}
                </div>
            )}
            {stats.crossworldBestTime && (
                <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-3 py-1 rounded-full text-sm font-bold border border-yellow-200 dark:border-yellow-700">
                    <Zap className="w-4 h-4 fill-yellow-500" /> {formatTime(stats.crossworldBestTime)}
                </div>
            )}
        </div>
      </div>

      <div className="text-center mb-4">
        <h1 className="text-3xl font-heading text-slate-800 dark:text-slate-100">
          {isViewMode ? "CrossWorld - Answers" : "Daily CrossWorld"}
        </h1>
        {!isViewMode && (
          <div className={cn(
              "inline-flex items-center justify-center gap-2 px-4 py-1 rounded-full shadow-sm border mt-2 transition-colors bg-white dark:bg-gray-800 border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400"
          )}>
               <Timer className="w-4 h-4" />
               <span className="font-mono font-bold">{formatTime(timer)}</span>
          </div>
        )}
        {isViewMode && (
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1 rounded-full shadow-sm border mt-2 bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300">
               <Trophy className="w-4 h-4" />
               <span className="font-bold">Completed!</span>
          </div>
        )}
      </div>
      
      {/* Celebration Overlay when completing puzzle */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-yellow-100 to-orange-100 p-8 rounded-3xl shadow-2xl border-4 border-yellow-400 text-center"
          >
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-heading text-orange-800 mb-2">All Capitals Found!</h2>
            <p className="text-orange-600">Great job, explorer!</p>
            <p className="text-orange-500/70 text-sm italic mt-2">What will you explore next?</p>
          </motion.div>
        </div>
      )}

      {/* Game Area */}
      <div className={cn(
        "bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-xl border-4 border-slate-800 dark:border-slate-600 mb-6 relative",
        isViewMode ? "pointer-events-none" : "touch-none"
      )}
           onTouchMove={isViewMode ? undefined : handleTouchMove}
           onTouchEnd={isViewMode ? undefined : handlePointerUp}
      >
        <div 
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${getGridSize(gameMode)}, minmax(0, 1fr))` }}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
        >
          {grid.map((row, r) => (
            row.map((letter, c) => {
              const isSelected = selection.some(cell => cell.r === r && cell.c === c);
              
              // Check if part of found words
              const foundWordId = foundWords.find(id => {
                  const loc = wordLocations.find(wl => wl.id === id);
                  return loc?.cells.some(cell => cell.r === r && cell.c === c);
              });
              const isFound = !!foundWordId;
              
              // Check if part of answer words (for view mode and revealed)
              // In view mode, show all answers in green
              let isAnswer = false;
              if (isViewMode || gameStatus !== "PLAYING") {
                  const answerWordId = targetWords.find(w => {
                      const loc = wordLocations.find(wl => wl.id === w.id);
                      return loc?.cells.some(cell => cell.r === r && cell.c === c);
                  })?.id;
                  if (answerWordId) {
                      isAnswer = true;
                  }
              }
              
              // Check if part of REVEALED words (missed ones - orange for non-found during game)
              let isRevealed = false;
              if (!isViewMode && gameStatus !== "PLAYING" && !isFound && !isAnswer) {
                  const revealedWordId = targetWords.find(w => {
                      const loc = wordLocations.find(wl => wl.id === w.id);
                      return loc?.cells.some(cell => cell.r === r && cell.c === c);
                  })?.id;
                  if (revealedWordId && !foundWords.includes(revealedWordId)) {
                      isRevealed = true;
                  }
              }

              
              let cellColor = "bg-slate-100 text-slate-700 hover:bg-slate-200"; // Default
              
              // Determine if this cell's word was guessed (green) or revealed (orange) in view mode
              const getAnswerWordIdForCell = () => {
                for (const loc of wordLocations) {
                  if (loc.cells.some(cell => cell.r === r && cell.c === c)) {
                    return loc.id;
                  }
                }
                return null;
              };
              const answerWordId = isAnswer ? getAnswerWordIdForCell() : null;
              const wasGuessed = answerWordId ? guessedWordIds.includes(answerWordId) : false;
              
              if (isSelected) {
                  cellColor = "bg-yellow-400 text-yellow-900 scale-110 shadow-lg z-20 relative ring-2 ring-yellow-200";
              } else if (isViewMode && isAnswer) {
                  // In view mode: green for guessed words, orange for revealed words
                  cellColor = wasGuessed 
                    ? "bg-green-500 text-white scale-100 z-10 shadow-inner"
                    : "bg-orange-400 text-white scale-100 z-10 shadow-inner";
              } else if (isFound) {
                  cellColor = "bg-green-500 text-white scale-100 z-10 shadow-inner";
              } else if (isAnswer && gameStatus !== "PLAYING") {
                  // Answers shown after game over (orange for missed, green for found)
                  cellColor = foundWords.includes(answerWordId || '') 
                    ? "bg-green-500 text-white scale-100 z-10 shadow-inner"
                    : "bg-orange-400 text-white scale-100 z-10 shadow-inner";
              } else if (isRevealed) {
                  cellColor = "bg-orange-400 text-white scale-100 z-10 shadow-inner";
              }

              return (
                <div
                  key={`${r}-${c}`}
                  data-row={r}
                  data-col={c}
                  className={cn(
                    "w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-xl sm:text-2xl font-bold rounded-md cursor-pointer transition-all duration-200",
                    cellColor
                  )}
                  onMouseDown={() => handlePointerDown(r, c)}
                  onMouseEnter={() => handlePointerMove(r, c)}
                  onTouchStart={(e) => handleTouchStart(e, r, c)}
                >
                  {letter}
                </div>
              );
            })
          ))}
        </div>
      </div>

      {/* Hint Area / View Mode Info */}
      <div className="w-full max-w-md px-4 mb-6">
          {isViewMode ? (
              <>
                <div className="bg-slate-100 border-2 border-slate-300 p-4 rounded-xl mb-4 shadow-inner">
                    <p className="font-bold text-slate-700 text-center mb-3">Today's Puzzle Results</p>
                    <div className="flex justify-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-500 rounded-md"></div>
                        <span className="text-slate-600 font-medium">You found it</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-orange-400 rounded-md"></div>
                        <span className="text-slate-600 font-medium">Revealed/Hint</span>
                      </div>
                    </div>
                    <p className="text-center text-xs text-slate-500 mt-2">
                      {guessedWordIds.length}/{targetWords.length} capitals found by you
                    </p>
                </div>
                <Button 
                    onClick={() => {
                      setIsViewMode(false);
                      setSetupComplete(false);
                      setGameStatus("PLAYING");
                    }}
                    className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                </Button>
              </>
          ) : gameStatus === "PLAYING" ? (
              <>
                {activeHint ? (
                    <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl text-blue-800 font-medium text-center mb-4 shadow-sm flex items-center justify-center"
                    >
                    <Lightbulb className="w-5 h-5 mr-2 fill-blue-500 text-blue-500" />
                    {activeHint}
                    </motion.div>
                ) : (
                    <div className="h-14 mb-4 text-center text-slate-400 italic flex items-center justify-center">
                    {gameMode === "EASY" ? "Find the capitals for the countries below" : "Find the hidden capitals"}
                    </div>
                )}

                <div className="flex gap-2 flex-wrap">
                    <Button 
                        className={`flex-1 h-12 text-base font-bold rounded-xl shadow-md transition-all min-w-[80px] ${hintsUsed >= ((gameMode === "EASY" ? 3 : 2) + bonusHints) ? "bg-slate-200 text-slate-400" : "bg-yellow-400 hover:bg-yellow-500 text-yellow-900"}`}
                        onClick={handleHint}
                        disabled={hintsUsed >= ((gameMode === "EASY" ? 3 : 2) + bonusHints)}
                    >
                        <Lightbulb className="w-4 h-4 mr-1" />
                        Hint ({((gameMode === "EASY" ? 3 : 2) + bonusHints) - hintsUsed}){bonusHints > 0 && <span className="ml-1 text-xs">+{bonusHints}</span>}
                    </Button>

                    {gameMode === "HARD" && !showCountriesRevealed && (
                      <Button 
                          className="flex-1 h-12 text-sm font-bold rounded-xl shadow-md transition-all min-w-[70px] bg-teal-500 hover:bg-teal-600 text-white"
                          onClick={handleShowCountries}
                      >
                          <Globe className="w-4 h-4 mr-1" />
                          Show
                      </Button>
                    )}

                    <Button 
                        className={`flex-1 h-12 text-base font-bold rounded-xl shadow-md transition-all min-w-[80px] ${cheatUsed ? "bg-slate-200 text-slate-400" : "bg-purple-500 hover:bg-purple-600 text-white"}`}
                        onClick={handleCheatCode}
                        disabled={cheatUsed}
                    >
                        <Zap className="w-4 h-4 mr-1" />
                        {cheatUsed ? "Used" : "Cheat"}
                    </Button>

                    <Button 
                        variant="destructive"
                        className="flex-1 h-12 text-base font-bold rounded-xl shadow-md min-w-[80px]"
                        onClick={() => {
                          if (giveUpAttempts === 0) {
                            setGiveUpAttempts(1);
                            setShowGiveUpMotivation(true);
                          } else {
                            handleGameOver("GIVEN_UP");
                          }
                        }}
                    >
                        Give Up
                    </Button>
                </div>
              </>
          ) : (
               <div className="bg-slate-100 border-2 border-slate-200 p-4 rounded-xl text-slate-600 text-center mb-4 shadow-inner font-bold">
                   {gameStatus === "WON" ? "All capitals found!" : "Here are the answers!"}
               </div>
          )}
      </div>
      
      {/* Progress / Word List */}
      <div className="w-full max-w-md pb-8">
         <h3 className="text-center text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">
             {isViewMode 
               ? "Answers" 
               : (gameMode === "EASY" ? "Countries" : (showCountriesRevealed ? "Countries (+15s)" : "Hidden Capitals"))
             } {!isViewMode && `(${foundWords.length}/${targetWords.length})`}
         </h3>
         <div className="flex flex-wrap justify-center gap-2">
            {targetWords.map((word, idx) => {
               const wasGuessedByUser = guessedWordIds.includes(word.id);
               return (
               <div 
                 key={word.id}
                 className={cn(
                    "px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all",
                    isViewMode
                      ? (wasGuessedByUser 
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-orange-100 text-orange-700 border-orange-300")
                      : foundWords.includes(word.id) 
                        ? "bg-green-100 text-green-700 border-green-300"
                        : (gameStatus !== "PLAYING" ? "bg-orange-100 text-orange-700 border-orange-300" : "bg-white text-slate-800 border-slate-200 shadow-sm")
                 )}
               >
                  {/* View Mode: Show Country → Capital. Easy Mode: Always show Country. Hard Mode: Show country if revealed, otherwise "Word X" until found */}
                  {isViewMode 
                    ? `${word.displayClue} → ${word.word}`
                    : gameMode === "EASY" 
                      ? word.displayClue 
                      : (foundWords.includes(word.id) || gameStatus !== "PLAYING" 
                          ? word.word 
                          : (showCountriesRevealed ? word.displayClue : `Word ${idx + 1}`))
                  }
               </div>
            )})}
         </div>
      </div>

      {/* Reward Popup (Only for playing) */}
      <Dialog open={!!showReward && gameStatus === "PLAYING"} onOpenChange={() => setShowReward(null)}>
        <DialogContent className="bg-white border-4 border-yellow-400 rounded-[2rem] max-w-sm text-center p-0 overflow-hidden [&>button]:hidden">
           {showReward && (
             <div className="flex flex-col items-center">
                <div className="w-full h-48 bg-slate-200 relative">
                   <img 
                      src={getCityImage(showReward.imageCity, showReward.imageContinent)} 
                      alt={showReward.imageCity}
                      className="w-full h-full object-cover"
                   />
                   <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 to-transparent p-4 text-white text-left">
                      <h3 className="text-2xl font-heading">{showReward.word}</h3>
                      <p className="text-sm opacity-90">{showReward.imageCity}, {showReward.imageContinent}</p>
                   </div>
                </div>
                <div className="p-6 w-full">
                   <p className="text-slate-600 mb-4 font-medium">You found a hidden capital!</p>
                   <Button onClick={() => setShowReward(null)} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl h-12">
                     Awesome!
                   </Button>
                </div>
             </div>
           )}
        </DialogContent>
      </Dialog>

      {/* Give Up Motivation Dialog */}
      <Dialog open={showGiveUpMotivation} onOpenChange={setShowGiveUpMotivation}>
        <DialogContent className="bg-gradient-to-br from-blue-50 to-indigo-100 border-4 border-blue-300 rounded-[2rem] max-w-sm text-center p-8 [&>button]:hidden">
           <DialogHeader>
             <DialogTitle className="text-2xl font-heading text-blue-800 mb-2">
               Wait! Don't Give Up Yet!
             </DialogTitle>
           </DialogHeader>
           
           <div className="flex flex-col items-center gap-4 my-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-blue-200">
                 <span className="text-4xl">💪</span>
              </div>
              
              <p className="text-blue-700 font-medium text-lg leading-relaxed">
                You're doing great! Every explorer faces challenges. 
                Take a deep breath and try one more time - you might surprise yourself!
              </p>
              
              <p className="text-blue-600 text-sm italic">
                Hint: Try using a Hint button if you're stuck!
              </p>
           </div>

           <div className="flex gap-3 w-full">
              <Button 
                onClick={() => setShowGiveUpMotivation(false)} 
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl h-12 shadow-lg"
              >
                 Keep Trying! 🌟
              </Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Show Countries Confirmation Dialog */}
      <Dialog open={showCountriesConfirm} onOpenChange={setShowCountriesConfirm}>
        <DialogContent className="bg-gradient-to-br from-teal-50 to-cyan-100 border-4 border-teal-300 rounded-[2rem] max-w-sm text-center p-8 [&>button]:hidden">
           <DialogHeader>
             <DialogTitle className="text-2xl font-heading text-teal-800 mb-2">
               Reveal Countries?
             </DialogTitle>
           </DialogHeader>
           
           <div className="flex flex-col items-center gap-4 my-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-teal-200">
                 <Globe className="w-10 h-10 text-teal-600" />
              </div>
              
              <p className="text-teal-700 font-medium text-lg leading-relaxed">
                This will show you which countries the hidden capitals belong to.
              </p>
              
              <div className="bg-orange-100 border-2 border-orange-300 rounded-xl p-3 w-full">
                <p className="text-orange-700 font-bold text-base">
                  ⏱️ Warning: +15 seconds will be added to your time!
                </p>
              </div>
           </div>

           <div className="flex gap-3 w-full">
              <Button 
                variant="outline"
                onClick={() => setShowCountriesConfirm(false)} 
                className="flex-1 font-bold rounded-xl h-12 border-2"
              >
                 Cancel
              </Button>
              <Button 
                onClick={confirmShowCountries} 
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl h-12 shadow-lg"
              >
                 OK, Show Countries
              </Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Game Over Popup */}
      <Dialog open={gameStatus !== "PLAYING" && !playedToday} onOpenChange={() => {}}>
        <DialogContent className={cn(
            "border-4 rounded-[2rem] max-w-md text-center p-8 [&>button]:hidden",
            gameStatus === "WON" 
              ? isNewRecord 
                ? "bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100 border-yellow-400" 
                : "bg-gradient-to-br from-yellow-100 to-orange-100 border-orange-400" 
              : "bg-gradient-to-br from-slate-50 to-orange-50 border-orange-300"
        )}>
           <DialogHeader>
             <DialogTitle className={cn(
               "text-3xl font-heading mb-2", 
               gameStatus === "WON" 
                 ? isNewRecord ? "text-purple-800" : "text-orange-800" 
                 : "text-orange-800"
             )}>
               {gameStatus === "WON" 
                 ? isNewRecord ? "NEW RECORD!" : "Victory!" 
                 : "Puzzle Complete"}
             </DialogTitle>
           </DialogHeader>

           {/* Stats Bar */}
           <div className="grid grid-cols-4 gap-2 mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100 w-full">
               <div className="text-center">
                   <div className="text-lg font-black text-gray-800">{stats.crossworldStreak || 0}</div>
                   <div className="text-[9px] font-bold text-gray-500 uppercase">Games</div>
               </div>
               <div className="text-center">
                   <div className="text-lg font-black text-green-600">{gameStatus === "WON" ? "100%" : "0%"}</div>
                   <div className="text-[9px] font-bold text-gray-500 uppercase">Win</div>
               </div>
               <div className="text-center">
                   <div className="text-lg font-black text-orange-600">{stats.crossworldStreak || 0}</div>
                   <div className="text-[9px] font-bold text-gray-500 uppercase">CrossWorld</div>
               </div>
               <div className="text-center">
                   <div className="text-lg font-black text-purple-600">{stats.crossworldBestTime ? stats.crossworldBestTime : 0}s</div>
                   <div className="text-[9px] font-bold text-gray-500 uppercase">Best</div>
               </div>
           </div>
           
           <div className="flex flex-col items-center gap-4 my-4">
              <div className={cn(
                "w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl border-4", 
                gameStatus === "WON" 
                  ? isNewRecord ? "border-yellow-400 animate-pulse" : "border-orange-200" 
                  : "border-orange-200"
              )}>
                 {gameStatus === "WON" 
                   ? isNewRecord 
                     ? <span className="text-5xl">🏆</span>
                     : <Trophy className="w-12 h-12 text-orange-500" /> 
                   : <span className="text-5xl">🌍</span>}
              </div>
              
              {gameStatus === "WON" ? (
                  <>
                    <div className="space-y-2">
                      <p className={cn(
                        "font-heading text-xl font-bold",
                        isNewRecord ? "text-purple-800" : "text-orange-900"
                      )}>
                        You are a CHAMPION
                      </p>
                      <p className={cn(
                        "font-heading text-lg",
                        isNewRecord ? "text-purple-700" : "text-orange-800"
                      )}>
                        across the world!
                      </p>
                    </div>
                    
                    {isNewRecord && (
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-6 py-3 rounded-xl shadow-lg animate-bounce">
                        <span className="text-white font-bold text-lg">FASTEST TIME EVER!</span>
                      </div>
                    )}
                    
                    <div className="bg-white px-4 py-2 rounded-lg border border-orange-200 shadow-sm">
                        <span className="text-2xl">{isNewRecord ? "🥇" : "🏅"} Badge Earned</span>
                    </div>
                    
                    <div className={cn(
                      "px-4 py-2 rounded-lg",
                      isNewRecord ? "bg-purple-100 border border-purple-200" : "bg-slate-100"
                    )}>
                      <p className={cn(
                        "text-lg font-bold",
                        isNewRecord ? "text-purple-700" : "text-slate-600"
                      )}>
                        TIME: {formatTime(timer)}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                      <p className="text-xs text-purple-500 uppercase font-bold mb-1">Next Puzzle In</p>
                      <p className="text-xl font-mono font-bold text-purple-700">{formatCountdown(countdown)}</p>
                    </div>
                  </>
              ) : (
                  <>
                    <p className="text-orange-700 font-medium text-lg leading-relaxed">
                      The capitals you missed are shown in orange on the board.
                    </p>
                    <div className="bg-orange-100 border border-orange-200 rounded-xl p-4 mt-2">
                      <p className="text-orange-800 font-heading text-base">
                        🌟 Great try! Learning geography takes practice.
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                      <p className="text-xs text-purple-500 uppercase font-bold mb-1">Next Puzzle In</p>
                      <p className="text-xl font-mono font-bold text-purple-700">{formatCountdown(countdown)}</p>
                    </div>
                  </>
              )}
           </div>

           <div className="flex gap-3 w-full">
              <Button 
                onClick={() => {
                  // Save the current guessed words before switching to view mode
                  savePuzzleResult(gameMode, guessedWordIds);
                  setIsViewMode(true);
                  setPlayedToday(true);
                }} 
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl h-14 shadow-lg"
              >
                 See Your Puzzle
              </Button>
              <Button 
                onClick={goHome} 
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl h-14 shadow-lg"
                data-testid="button-back-to-home"
              >
                 Back to Home
              </Button>
           </div>
           
           {/* Reminder Toggle */}
           <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between w-full">
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
        </DialogContent>
      </Dialog>

      {/* Email Reminder Dialog */}
      <Dialog open={showReminderEmailDialog} onOpenChange={setShowReminderEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-500" />
              Get CrossWorld Reminders
            </DialogTitle>
            <DialogDescription>
              Enter your email to receive daily puzzle notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="cw-reminder-email" className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="cw-reminder-email"
                type="email"
                placeholder="your@email.com"
                value={reminderEmail}
                onChange={(e) => setReminderEmail(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none"
                data-testid="input-cw-reminder-email"
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
                        <p className="font-bold">You're signed up for CrossWorld alerts!</p>
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
              data-testid="button-submit-cw-reminder-email"
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
              If you turn off reminders, you won't receive notifications about CrossWorld. You might miss out on building your streak!
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
      </div>
    </div>
  );
}
