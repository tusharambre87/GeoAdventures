import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, Volume2, VolumeX, Lightbulb, RotateCcw, Trophy, Sparkles, MapPin, Home, Flag, Book, Users, X, Globe } from "lucide-react";
import LearningSummary, { getGameLearningPoints } from "@/components/LearningSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  USA_STATES, 
  USAState, 
  Difficulty, 
  getRevealedLetters, 
  generateLetterChoices,
  shuffleArray,
  getStateImage,
  getStateMapImage
} from "@/lib/spellGeoData";
import { soundManager, speakWithServerTTS } from "@/lib/sound";
import { useUser } from "@/lib/userContext";
import { recordGamePlayed } from "@/components/TravelModeReminders";
import { useExplorer } from "@/lib/explorerContext";
import { useSessionOptional } from "@/lib/sessionContext";
import confetti from "canvas-confetti";

const PUZZLES_PER_GAME = 10;
const HINT_COST = 1;

const getBirdEmoji = (birdName: string): string => {
  const birdLower = birdName.toLowerCase();
  if (birdLower.includes('cardinal')) return '🐦‍🔥';
  if (birdLower.includes('bluebird')) return '🐦';
  if (birdLower.includes('mockingbird')) return '🎵';
  if (birdLower.includes('robin')) return '🐦';
  if (birdLower.includes('owl')) return '🦉';
  if (birdLower.includes('eagle')) return '🦅';
  if (birdLower.includes('hawk')) return '🦅';
  if (birdLower.includes('pelican')) return '🦩';
  if (birdLower.includes('quail')) return '🐦';
  if (birdLower.includes('roadrunner')) return '🏃';
  if (birdLower.includes('finch')) return '🐦';
  if (birdLower.includes('wren')) return '🐦';
  if (birdLower.includes('loon')) return '🦆';
  if (birdLower.includes('pheasant')) return '🐔';
  if (birdLower.includes('grouse')) return '🐔';
  if (birdLower.includes('nene') || birdLower.includes('goose')) return '🦢';
  if (birdLower.includes('chickadee')) return '🐦';
  if (birdLower.includes('oriole')) return '🐦';
  if (birdLower.includes('meadowlark')) return '🐦';
  if (birdLower.includes('thrasher')) return '🐦';
  if (birdLower.includes('flycatcher')) return '🐦';
  if (birdLower.includes('goldfinch')) return '🐦';
  if (birdLower.includes('hermit thrush')) return '🐦';
  if (birdLower.includes('willow')) return '🐦';
  return '🐦';
};

const getAnimalEmoji = (animalName: string): string => {
  const animalLower = animalName.toLowerCase();
  if (animalLower.includes('bear')) return '🐻';
  if (animalLower.includes('bison') || animalLower.includes('buffalo')) return '🦬';
  if (animalLower.includes('deer')) return '🦌';
  if (animalLower.includes('elk')) return '🦌';
  if (animalLower.includes('moose')) return '🫎';
  if (animalLower.includes('horse') || animalLower.includes('appaloosa') || animalLower.includes('mustang')) return '🐴';
  if (animalLower.includes('mule')) return '🫏';
  if (animalLower.includes('beaver')) return '🦫';
  if (animalLower.includes('otter')) return '🦦';
  if (animalLower.includes('raccoon')) return '🦝';
  if (animalLower.includes('badger')) return '🦡';
  if (animalLower.includes('armadillo')) return '🦔';
  if (animalLower.includes('alligator') || animalLower.includes('gator')) return '🐊';
  if (animalLower.includes('panther') || animalLower.includes('cougar') || animalLower.includes('mountain lion')) return '🐆';
  if (animalLower.includes('fox')) return '🦊';
  if (animalLower.includes('coyote')) return '🐺';
  if (animalLower.includes('wolf')) return '🐺';
  if (animalLower.includes('dog')) return '🐕';
  if (animalLower.includes('whale')) return '🐋';
  if (animalLower.includes('seal') || animalLower.includes('sea lion')) return '🦭';
  if (animalLower.includes('dolphin')) return '🐬';
  if (animalLower.includes('sheep') || animalLower.includes('bighorn')) return '🐏';
  if (animalLower.includes('longhorn') || animalLower.includes('cattle') || animalLower.includes('cow')) return '🐂';
  if (animalLower.includes('squirrel')) return '🐿️';
  if (animalLower.includes('tiger')) return '🐅';
  if (animalLower.includes('lion')) return '🦁';
  if (animalLower.includes('leopard')) return '🐆';
  if (animalLower.includes('cat')) return '🐱';
  if (animalLower.includes('rabbit') || animalLower.includes('cottontail')) return '🐰';
  if (animalLower.includes('cardinal')) return '🐦‍🔥';
  if (animalLower.includes('osprey')) return '🦅';
  if (animalLower.includes('toad') || animalLower.includes('frog')) return '🐸';
  if (animalLower.includes('turtle') || animalLower.includes('tortoise')) return '🐢';
  if (animalLower.includes('salamander') || animalLower.includes('newt')) return '🦎';
  if (animalLower.includes('lobster') || animalLower.includes('crab')) return '🦞';
  if (animalLower.includes('manatee')) return '🦭';
  return '🐾';
};

interface PuzzleState {
  state: USAState;
  revealedLetters: boolean[];
  userInput: string[];
  letterChoices: string[][];
  currentBlankIndex: number;
  completed: boolean;
  hintsUsed: number;
  gaveUp: boolean;
}

type GamePhase = "SETUP" | "PLAYING" | "REVEAL" | "COMPLETE" | "JOURNAL";

export default function SpellGeo() {
  const [, setLocation] = useLocation();
  const fromPage = new URLSearchParams(window.location.search).get('from');
  const { user, stats, addSpellGeoState } = useUser();
  const { activeExplorer } = useExplorer();
  const session = useSessionOptional();
  
  const [showReadyConfirm, setShowReadyConfirm] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("SETUP");
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [puzzles, setPuzzles] = useState<USAState[]>([]);
  const [puzzle, setPuzzle] = useState<PuzzleState | null>(null);
  const [totalStars, setTotalStars] = useState(0);
  const [timer, setTimer] = useState(0);
  const [showFact, setShowFact] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [animatingLetter, setAnimatingLetter] = useState<number | null>(null);
  
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
  const [correctAnimation, setCorrectAnimation] = useState<number | null>(null);
  const [statesCollectedThisGame, setStatesCollectedThisGame] = useState<string[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const collectedStates = stats?.spellGeoCollectedStates || [];

  useEffect(() => {
    if (gamePhase === "PLAYING" && puzzle && !puzzle.completed) {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gamePhase, puzzle?.completed]);

  const speak = useCallback((text: string) => {
    if (isAutoSpeechMuted) return;
    speakWithServerTTS(text, 'eva');
  }, [isAutoSpeechMuted]);

  const startGame = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    const shuffled = shuffleArray(USA_STATES);
    const selected = shuffled.slice(0, PUZZLES_PER_GAME);
    setPuzzles(selected);
    setCurrentPuzzleIndex(0);
    setTotalStars(0);
    setTimer(0);
    setStatesCollectedThisGame([]);
    setGamePhase("PLAYING");
    initializePuzzle(selected[0], selectedDifficulty);
  };

  const initializePuzzle = (state: USAState, diff: Difficulty) => {
    const name = state.name.toUpperCase();
    const revealed = getRevealedLetters(state.name, diff);
    const userInput = name.split('').map((letter, i) => {
      if (letter === ' ') return ' ';
      return revealed[i] ? letter : '';
    });
    
    const letterChoices = name.split('').map((letter, i) => {
      if (letter === ' ' || revealed[i]) return [];
      return generateLetterChoices(letter, 4);
    });
    
    const firstBlank = userInput.findIndex((l, i) => l === '' && name[i] !== ' ');
    
    setPuzzle({
      state,
      revealedLetters: revealed,
      userInput,
      letterChoices,
      currentBlankIndex: firstBlank >= 0 ? firstBlank : 0,
      completed: false,
      hintsUsed: 0,
      gaveUp: false
    });
    setWrongAttempts(0);
    setShowFact(false);
  };

  const handleLetterSelect = (letter: string, blankIndex: number) => {
    if (!puzzle || puzzle.completed) return;
    
    const stateName = puzzle.state.name.toUpperCase();
    const correctLetter = stateName[blankIndex];
    
    if (correctLetter === ' ') return;
    
    if (letter === correctLetter) {
      soundManager.playSuccess();
      setCorrectAnimation(blankIndex);
      setTimeout(() => setCorrectAnimation(null), 300);
      
      const newInput = [...puzzle.userInput];
      newInput[blankIndex] = letter;
      
      const nextBlank = newInput.findIndex((l, i) => i > blankIndex && l === '' && stateName[i] !== ' ');
      const firstBlank = newInput.findIndex((l, i) => l === '' && stateName[i] !== ' ');
      const isComplete = firstBlank === -1;
      
      setPuzzle({
        ...puzzle,
        userInput: newInput,
        currentBlankIndex: nextBlank >= 0 ? nextBlank : (firstBlank >= 0 ? firstBlank : blankIndex),
        completed: isComplete
      });
      
      if (isComplete) {
        handlePuzzleComplete(false);
      }
    } else {
      soundManager.playError();
      setAnimatingLetter(blankIndex);
      setWrongAttempts(w => w + 1);
      setTimeout(() => setAnimatingLetter(null), 500);
    }
  };

  const handleKeyPress = (letter: string) => {
    if (!puzzle || puzzle.completed) return;
    handleLetterSelect(letter, puzzle.currentBlankIndex);
  };

  const handleGiveUp = () => {
    if (!puzzle || puzzle.completed) return;
    
    const stateName = puzzle.state.name.toUpperCase();
    const filledInput = stateName.split('');
    
    setPuzzle({
      ...puzzle,
      userInput: filledInput,
      completed: true,
      gaveUp: true
    });
    
    handlePuzzleComplete(true);
  };

  const handlePuzzleComplete = (gaveUp: boolean) => {
    if (!puzzle) return;
    
    if (!gaveUp) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      
      const baseStars = difficulty === "HARD" ? 3 : difficulty === "MEDIUM" ? 2 : 1;
      const bonusStars = wrongAttempts === 0 ? 1 : 0;
      const earnedStars = Math.max(1, baseStars + bonusStars - puzzle.hintsUsed);
      
      setTotalStars(s => s + earnedStars);
      
      if (!collectedStates.includes(puzzle.state.abbreviation)) {
        addSpellGeoState(puzzle.state.abbreviation);
        setStatesCollectedThisGame(prev => [...prev, puzzle.state.abbreviation]);
      }
    } else {
      setTotalStars(s => Math.max(0, s - 2));
    }
    
    setShowFact(true);
    setGamePhase("REVEAL");
    
    speak(`${puzzle.state.name}! ${puzzle.state.tagline}. ${puzzle.state.funFact}`);
  };

  const nextPuzzle = () => {
    if (currentPuzzleIndex + 1 >= PUZZLES_PER_GAME) {
      setGamePhase("COMPLETE");
      recordGamePlayed(); // Track for Travel Mode reminders
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 }
      });
      return;
    }
    
    const nextIndex = currentPuzzleIndex + 1;
    setCurrentPuzzleIndex(nextIndex);
    initializePuzzle(puzzles[nextIndex], difficulty);
    setGamePhase("PLAYING");
    setShowFact(false);
  };

  const useHint = () => {
    if (!puzzle || puzzle.completed || totalStars < HINT_COST) return;
    
    const stateName = puzzle.state.name.toUpperCase();
    const blanks = puzzle.userInput
      .map((l, i) => ({ letter: l, index: i }))
      .filter(({ letter, index }) => letter === '' && stateName[index] !== ' ' && index !== puzzle.currentBlankIndex);
    
    if (blanks.length === 0) return;
    
    const randomBlank = blanks[Math.floor(Math.random() * blanks.length)];
    const correctLetter = stateName[randomBlank.index];
    
    const newInput = [...puzzle.userInput];
    newInput[randomBlank.index] = correctLetter;
    
    soundManager.playDing();
    setTotalStars(s => s - HINT_COST);
    
    const firstBlank = newInput.findIndex((l, i) => l === '' && stateName[i] !== ' ');
    const isComplete = firstBlank === -1;
    
    setPuzzle({
      ...puzzle,
      userInput: newInput,
      hintsUsed: puzzle.hintsUsed + 1,
      completed: isComplete
    });
    
    if (isComplete) {
      handlePuzzleComplete(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (gamePhase === "JOURNAL") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setGamePhase("SETUP")}
              className="rounded-full dark:text-gray-300"
              data-testid="button-back-journal"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-3xl font-heading font-bold text-amber-800 dark:text-amber-300">State Journal</h1>
            <div className="ml-auto bg-amber-200 px-3 py-1 rounded-full text-amber-800 font-bold">
              {collectedStates.length}/50
            </div>
          </div>

          <Card className="bg-white/90 backdrop-blur shadow-xl rounded-3xl border-4 border-amber-300 overflow-hidden mb-4">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Book className="w-12 h-12 mx-auto text-amber-600 mb-2" />
                <p className="text-gray-600">
                  Collect all 50 states by spelling them correctly!
                </p>
                <Progress 
                  value={(collectedStates.length / 50) * 100} 
                  className="h-4 mt-4 bg-amber-100"
                />
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {USA_STATES.map((state) => {
                  const isCollected = collectedStates.includes(state.abbreviation);
                  return (
                    <motion.div
                      key={state.abbreviation}
                      initial={isCollected ? { scale: 0 } : {}}
                      animate={isCollected ? { scale: 1 } : {}}
                      whileHover={isCollected ? { scale: 1.05, rotate: [0, -2, 2, 0] } : {}}
                      className={cn(
                        "aspect-square rounded-2xl overflow-hidden transition-all flex flex-col items-center justify-center p-2",
                        isCollected 
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg cursor-pointer"
                          : "bg-gray-200 text-gray-400"
                      )}
                      title={isCollected ? state.name : "???"}
                    >
                      {isCollected ? (
                        <>
                          <span className="text-white font-bold text-sm drop-shadow mb-1">{state.abbreviation}</span>
                          <img 
                            src={`https://flagcdn.com/w80/us-${state.abbreviation.toLowerCase()}.png`}
                            alt={state.name}
                            className="w-full max-w-[90%] h-auto object-contain rounded shadow-md border border-white/30"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </>
                      ) : (
                        <span className="text-2xl">?</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => setGamePhase("SETUP")}
            className="w-full h-14 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-2xl"
            data-testid="button-play-collect"
          >
            Play to Collect More States!
          </Button>
        </div>
      </div>
    );
  }

  if (showReadyConfirm && activeExplorer && pendingDifficulty) {
    return (
      <div className="min-h-screen bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm fixed inset-0 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-4 border-purple-200 dark:border-purple-700">
          <div className="w-32 h-32 bg-purple-100 dark:bg-purple-900/30 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-purple-200 dark:border-purple-700">
            <Trophy className="w-16 h-16 text-purple-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Ready, {activeExplorer.name}?</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Spell all 10 US states as fast as you can!</p>
          <Button 
            onClick={() => {
              setShowReadyConfirm(false);
              startGame(pendingDifficulty);
            }} 
            size="lg" 
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xl py-6 rounded-xl shadow-lg border-b-4 border-purple-700 active:border-b-0 active:translate-y-1"
            data-testid="button-start-spell-geo"
          >
            Start Spell Geo
          </Button>
        </div>
      </div>
    );
  }

  if (gamePhase === "SETUP") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation(fromPage || "/play-games")}
              className="rounded-full dark:text-gray-300"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-3xl font-heading font-bold text-purple-800 dark:text-purple-300">Spell Geo!</h1>
          </div>

          <Card className="bg-white/80 dark:bg-gray-800/90 backdrop-blur shadow-xl rounded-3xl border-4 border-purple-200 dark:border-purple-700 overflow-hidden">
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg">
                  <Globe className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-heading font-bold text-gray-800 dark:text-gray-100 mb-2">
                  USA State Spelling
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Complete state names by filling in the missing letters!
                </p>
              </div>

              <Button
                onClick={() => setGamePhase("JOURNAL")}
                variant="outline"
                className="w-full h-12 border-2 border-amber-400 text-amber-700 hover:bg-amber-50 rounded-2xl"
                data-testid="button-view-journal"
              >
                <Book className="w-5 h-5 mr-2" />
                View State Journal ({collectedStates.length}/50)
              </Button>

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 text-center">Choose your level:</p>
                
                <Button
                  onClick={() => {
                    if (activeExplorer) {
                      setPendingDifficulty("EASY");
                      setShowReadyConfirm(true);
                    } else {
                      startGame("EASY");
                    }
                  }}
                  className="w-full h-16 text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-2xl shadow-lg"
                  data-testid="button-difficulty-easy"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌟</span>
                    <div className="text-left">
                      <div className="font-bold">Easy Mode</div>
                      <div className="text-xs opacity-80">Tap letter choices (Ages 4-6)</div>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => {
                    if (activeExplorer) {
                      setPendingDifficulty("MEDIUM");
                      setShowReadyConfirm(true);
                    } else {
                      startGame("MEDIUM");
                    }
                  }}
                  className="w-full h-16 text-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-2xl shadow-lg"
                  data-testid="button-difficulty-medium"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⭐</span>
                    <div className="text-left">
                      <div className="font-bold">Medium Mode</div>
                      <div className="text-xs opacity-80">Type the letters (Ages 6+)</div>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => {
                    if (activeExplorer) {
                      setPendingDifficulty("HARD");
                      setShowReadyConfirm(true);
                    } else {
                      startGame("HARD");
                    }
                  }}
                  className="w-full h-16 text-lg bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-2xl shadow-lg"
                  data-testid="button-difficulty-hard"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <div className="text-left">
                      <div className="font-bold">Hard Mode</div>
                      <div className="text-xs opacity-80">Fewer hints, more challenge!</div>
                    </div>
                  </div>
                </Button>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-2xl p-4">
                <h3 className="font-bold text-purple-800 dark:text-purple-300 mb-2 text-center">How to Play</h3>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li className="flex items-start gap-2">
                    <span>🔤</span>
                    <span>See the state shape and some letters</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>✏️</span>
                    <span>Fill in the missing letters to spell the state</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>📖</span>
                    <span>Collect states in your journal!</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gamePhase === "COMPLETE") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-100 via-orange-50 to-pink-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full"
        >
          <Card className="bg-white/90 dark:bg-gray-800/95 backdrop-blur shadow-2xl rounded-3xl border-4 border-yellow-400 dark:border-yellow-500 overflow-hidden">
            <CardContent className="p-8 text-center space-y-6">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                <Trophy className="w-24 h-24 mx-auto text-yellow-500" />
              </motion.div>
              
              <h2 className="text-3xl font-heading font-bold text-gray-800 dark:text-gray-100">
                Amazing Job!
              </h2>
              
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/40 dark:to-orange-900/40 rounded-2xl p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {[...Array(Math.min(totalStars, 10))].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Star className="w-8 h-8 text-yellow-500 fill-yellow-400" />
                    </motion.div>
                  ))}
                  {totalStars > 10 && <span className="text-2xl font-bold dark:text-gray-100">+{totalStars - 10}</span>}
                </div>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalStars} Stars Earned!</p>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Time: {formatTime(timer)}</p>
              </div>

              {statesCollectedThisGame.length > 0 && (
                <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-4">
                  <p className="text-amber-800 font-bold mb-2">New States Collected!</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {statesCollectedThisGame.map(abbr => (
                      <span key={abbr} className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {abbr}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-gray-600 dark:text-gray-400">
                You spelled {PUZZLES_PER_GAME} US states!
              </p>
              
              {/* Learning Summary */}
              <LearningSummary points={getGameLearningPoints("spell-geo")} />

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setGamePhase("JOURNAL")}
                  className="w-full h-12 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-2xl"
                  data-testid="button-view-journal-complete"
                >
                  <Book className="w-5 h-5 mr-2" />
                  View Journal ({collectedStates.length}/50)
                </Button>
                
                <Button
                  onClick={() => {
                    setGamePhase("SETUP");
                    setCurrentPuzzleIndex(0);
                    setTotalStars(0);
                    setTimer(0);
                    setStatesCollectedThisGame([]);
                  }}
                  className="w-full h-14 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl"
                  data-testid="button-play-again"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Play Again
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setLocation(fromPage || "/play-games")}
                  className="w-full h-12 rounded-2xl"
                  data-testid="button-back-menu"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Back to Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!puzzle) return null;

  const stateName = puzzle.state.name.toUpperCase();
  const stateImage = getStateImage(puzzle.state.name);
  const stateMapImage = getStateMapImage(puzzle.state.name);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setGamePhase("SETUP")}
            className="rounded-full dark:text-gray-300"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 px-4 py-2 rounded-full shadow">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
            <span className="font-bold text-gray-800 dark:text-gray-100">{totalStars}</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleAutoSpeechMute}
            className={cn(
              "rounded-full",
              isAutoSpeechMuted 
                ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400" 
                : "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
            )}
            data-testid="button-mute-auto-speech"
            title={isAutoSpeechMuted ? "Unmute" : "Mute"}
          >
            {isAutoSpeechMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
          
          <div className="bg-white/80 dark:bg-gray-800/80 px-4 py-2 rounded-full shadow text-gray-700 dark:text-gray-300 font-mono">
            {formatTime(timer)}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>State {currentPuzzleIndex + 1} of {PUZZLES_PER_GAME}</span>
            <span className="capitalize">{difficulty.toLowerCase()} Mode</span>
          </div>
          <Progress 
            value={(currentPuzzleIndex / PUZZLES_PER_GAME) * 100} 
            className="h-3 bg-white/50"
          />
        </div>

        <AnimatePresence mode="wait">
          {gamePhase === "REVEAL" && showFact ? (
            <motion.div
              key="reveal"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className={cn(
                "shadow-2xl rounded-3xl border-4 overflow-hidden",
                puzzle.gaveUp 
                  ? "bg-gradient-to-br from-gray-400 to-gray-500 border-gray-300"
                  : difficulty === "EASY" 
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 border-green-400"
                    : difficulty === "MEDIUM"
                      ? "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400"
                      : "bg-gradient-to-br from-red-500 to-rose-600 border-red-400"
              )}>
                <CardContent className="p-6 text-white">
                  {!puzzle.gaveUp && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="mb-4 text-center"
                    >
                      <Sparkles className="w-12 h-12 mx-auto text-yellow-300" />
                    </motion.div>
                  )}
                  
                  {stateImage && (
                    <div className="mb-4 rounded-xl overflow-hidden shadow-lg">
                      <img 
                        src={stateImage} 
                        alt={puzzle.state.landmark}
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )}
                  
                  <h2 className="text-3xl font-heading font-bold mb-2 text-center">
                    {puzzle.state.name}
                  </h2>
                  
                  <div className="bg-black/20 rounded-xl px-4 py-2 inline-block mb-4 w-full text-center">
                    <span className="text-lg font-bold">{puzzle.state.abbreviation}</span>
                    <span className="mx-2">•</span>
                    <span>{puzzle.state.tagline}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-black/20 rounded-xl p-3 text-center">
                      <Users className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-xs opacity-90">Population</p>
                      <p className="font-bold">{puzzle.state.population}</p>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3 text-center">
                      <Flag className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-xs opacity-90">Capital</p>
                      <p className="font-bold">{puzzle.state.capital}</p>
                    </div>
                  </div>

                  <motion.div 
                    className="bg-black/20 rounded-xl p-4 mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <motion.div
                        animate={{ 
                          y: [0, -8, 0],
                          rotate: [0, -10, 10, 0]
                        }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <span className="text-3xl">{getBirdEmoji(puzzle.state.stateBird)}</span>
                      </motion.div>
                      <div className="text-center">
                        <p className="text-xs opacity-70">State Bird</p>
                        <p className="font-bold text-lg">{puzzle.state.stateBird}</p>
                      </div>
                    </div>
                    {puzzle.state.stateAnimal !== "None (unofficial)" && (
                      <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-white/30">
                        <motion.div
                          animate={{ 
                            x: [-3, 3, -3],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <span className="text-3xl">{getAnimalEmoji(puzzle.state.stateAnimal)}</span>
                        </motion.div>
                        <div className="text-center">
                          <p className="text-xs opacity-70">State Animal</p>
                          <p className="font-bold text-lg">{puzzle.state.stateAnimal}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  <div className="bg-black/20 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <MapPin className="w-5 h-5" />
                      <span className="font-bold">{puzzle.state.landmark}</span>
                    </div>
                    <p className="text-sm text-center">{puzzle.state.landmarkDescription}</p>
                  </div>

                  <div className="bg-black/20 rounded-2xl p-4 mb-4">
                    <p className="text-sm italic text-center">"{puzzle.state.funFact}"</p>
                  </div>

                  <p className="text-sm opacity-80 mb-4 text-center">
                    Became the {getOrdinal(puzzle.state.stateNumber)} state in {puzzle.state.yearJoined}
                  </p>

                  {!puzzle.gaveUp && !collectedStates.includes(puzzle.state.abbreviation) && (
                    <div className="bg-yellow-400/30 rounded-xl p-3 mb-4 text-center">
                      <span className="text-yellow-100 font-bold">Added to your Journal!</span>
                    </div>
                  )}

                  <Button
                    onClick={() => speak(puzzle.state.funFact)}
                    variant="secondary"
                    className="mb-4 w-full bg-black/20 hover:bg-black/30 text-white rounded-xl"
                    data-testid="button-hear-fact"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Hear Fun Fact
                  </Button>

                  <Button
                    onClick={nextPuzzle}
                    className={cn(
                      "w-full h-14 text-lg rounded-2xl font-bold shadow-lg",
                      puzzle.gaveUp 
                        ? "bg-white text-gray-600 hover:bg-gray-50"
                        : "bg-white text-green-600 hover:bg-green-50"
                    )}
                    data-testid="button-next-state"
                  >
                    {currentPuzzleIndex + 1 >= PUZZLES_PER_GAME ? "See Results!" : "Next State →"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="puzzle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur shadow-xl rounded-3xl border-4 border-purple-200 dark:border-purple-700 overflow-hidden">
                <CardContent className="p-6">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 text-center border-2 border-gray-100 dark:border-gray-700">
                    {stateMapImage ? (
                      <div className="relative">
                        <img 
                          src={stateMapImage} 
                          alt="State shape clue"
                          className="w-64 h-64 mx-auto object-contain mb-2"
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Can you spell this state?</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-6xl mb-2">🗺️</div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Can you spell this state?</p>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-center gap-1 mb-6">
                    {stateName.split('').map((letter, index) => {
                      if (letter === ' ') {
                        return <div key={index} className="w-4 sm:w-6" />;
                      }
                      
                      const isRevealed = puzzle.revealedLetters[index];
                      const userLetter = puzzle.userInput[index];
                      const isCurrent = index === puzzle.currentBlankIndex && !puzzle.completed;
                      const isWrong = animatingLetter === index;
                      const isCorrectAnim = correctAnimation === index;
                      const isBlank = !isRevealed && !userLetter;
                      const isClickable = isBlank && !puzzle.completed;

                      return (
                        <motion.div
                          key={index}
                          animate={
                            isWrong 
                              ? { x: [-5, 5, -5, 5, 0], backgroundColor: ['#fff', '#fecaca', '#fff'] }
                              : isCorrectAnim
                              ? { scale: [1, 1.2, 1], backgroundColor: ['#fff', '#bbf7d0', '#fff'] }
                              : {}
                          }
                          onClick={() => {
                            if (isClickable) {
                              setPuzzle({ ...puzzle, currentBlankIndex: index });
                            }
                          }}
                          className={cn(
                            "w-9 h-11 sm:w-11 sm:h-14 rounded-xl flex items-center justify-center text-lg sm:text-2xl font-bold shadow-md transition-all",
                            isRevealed || userLetter
                              ? "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border-2 border-purple-300 dark:border-purple-600"
                              : isCurrent
                              ? "bg-yellow-100 dark:bg-yellow-900/50 border-4 border-yellow-400 dark:border-yellow-500 animate-pulse cursor-pointer dark:text-yellow-100"
                              : "bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer dark:text-gray-100"
                          )}
                        >
                          {userLetter || (isRevealed ? letter : "_")}
                        </motion.div>
                      );
                    })}
                  </div>

                  {difficulty === "EASY" && !puzzle.completed && (
                    <div className="space-y-4">
                      <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
                        Tap the correct letter for position {puzzle.currentBlankIndex + 1}:
                      </p>
                      <div className="flex justify-center gap-3 flex-wrap">
                        {puzzle.letterChoices[puzzle.currentBlankIndex]?.map((choice, i) => (
                          <motion.button
                            key={`${puzzle.currentBlankIndex}-${choice}-${i}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleLetterSelect(choice, puzzle.currentBlankIndex)}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-white text-2xl font-bold shadow-lg hover:shadow-xl transition-shadow"
                            data-testid={`letter-choice-${choice}`}
                          >
                            {choice}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(difficulty === "MEDIUM" || difficulty === "HARD") && !puzzle.completed && (
                    <div className="space-y-2">
                      <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-3">
                        Tap the missing letters:
                      </p>
                      <div className="flex justify-center gap-1">
                        {"QWERTYUIOP".split('').map((letter) => (
                          <motion.button
                            key={letter}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleKeyPress(letter)}
                            className="w-[9%] max-w-[40px] aspect-square rounded-xl font-bold text-lg sm:text-xl shadow-md bg-gradient-to-b from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/50 dark:hover:to-blue-800/50 text-gray-800 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center"
                            data-testid={`keyboard-${letter}`}
                          >
                            {letter}
                          </motion.button>
                        ))}
                      </div>
                      <div className="flex justify-center gap-1">
                        {"ASDFGHJKL".split('').map((letter) => (
                          <motion.button
                            key={letter}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleKeyPress(letter)}
                            className="w-[9%] max-w-[40px] aspect-square rounded-xl font-bold text-lg sm:text-xl shadow-md bg-gradient-to-b from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/50 dark:hover:to-blue-800/50 text-gray-800 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center"
                            data-testid={`keyboard-${letter}`}
                          >
                            {letter}
                          </motion.button>
                        ))}
                      </div>
                      <div className="flex justify-center gap-1">
                        {"ZXCVBNM".split('').map((letter) => (
                          <motion.button
                            key={letter}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleKeyPress(letter)}
                            className="w-[9%] max-w-[40px] aspect-square rounded-xl font-bold text-lg sm:text-xl shadow-md bg-gradient-to-b from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/50 dark:hover:to-blue-800/50 text-gray-800 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center"
                            data-testid={`keyboard-${letter}`}
                          >
                            {letter}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {!puzzle.completed && totalStars >= HINT_COST && (
                      <Button
                        onClick={useHint}
                        variant="outline"
                        className="rounded-xl border-2 border-amber-400 text-amber-700 hover:bg-amber-50"
                        data-testid="button-hint"
                      >
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Use Hint (-{HINT_COST} star)
                      </Button>
                    )}
                    
                    {!puzzle.completed && (
                      <Button
                        onClick={handleGiveUp}
                        variant="outline"
                        className="rounded-xl border-2 border-red-300 text-red-600 hover:bg-red-50"
                        data-testid="button-give-up"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Give Up (-2 stars)
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
