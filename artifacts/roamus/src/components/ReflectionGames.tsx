import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Lightbulb, MapPin, Image, Puzzle, BookOpen, Sparkles, ChevronRight, Trophy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export type ReflectionGameType = 'who_am_i' | 'guess_where' | 'doesnt_belong' | 'this_belongs' | 'pick_title' | 'story_spark';
export type ReflectionSessionType = 'adventure_recap' | 'end_of_day' | 'end_of_trip';

interface WhoAmIGame {
  gameType: 'who_am_i';
  stopId: string;
  stopName: string;
  clues: string[];
  options: { label: string; emoji: string }[];
  correctAnswer: string;
}

interface GuessWhereGame {
  gameType: 'guess_where';
  stopId: string;
  photoUrl: string;
  options: { label: string; emoji: string }[];
  correctAnswer: string;
}

interface DoesntBelongGame {
  gameType: 'doesnt_belong';
  items: { label: string; emoji: string; tags: string[] }[];
  explanations: { itemLabel: string; reason: string }[];
}

interface ThisBelongsGame {
  gameType: 'this_belongs';
  item: { label: string; emoji: string; description: string };
  stops: { stopId: string; stopName: string; emoji: string }[];
  bestFitStopId: string;
  affirmation: string;
}

interface PickTitleGame {
  gameType: 'pick_title';
  tripId: string;
  titleOptions: string[];
  stopHighlights: string[];
}

interface StorySparkGame {
  gameType: 'story_spark';
  stopId: string;
  stopName: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

type ReflectionGame = WhoAmIGame | GuessWhereGame | DoesntBelongGame | ThisBelongsGame | PickTitleGame | StorySparkGame;

interface ReflectionGamesProps {
  tripId: string;
  explorerId: string;
  sessionType: ReflectionSessionType;
  onComplete: (totalStars: number) => void;
  onClose: () => void;
}

const GAME_ICONS: Record<ReflectionGameType, typeof Star> = {
  who_am_i: Lightbulb,
  guess_where: Image,
  doesnt_belong: Puzzle,
  this_belongs: MapPin,
  pick_title: BookOpen,
  story_spark: Sparkles,
};

const GAME_TITLES: Record<ReflectionGameType, string> = {
  who_am_i: "Who Am I?",
  guess_where: "Guess Where!",
  doesnt_belong: "Which One Doesn't Belong?",
  this_belongs: "This Belongs Here",
  pick_title: "Pick the Best Title",
  story_spark: "Story Spark",
};

export function ReflectionGamesEngine({
  tripId,
  explorerId,
  sessionType,
  onComplete,
  onClose
}: ReflectionGamesProps) {
  const [games, setGames] = useState<ReflectionGame[]>([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totalStars, setTotalStars] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [gameState, setGameState] = useState<"playing" | "answered" | "complete">("playing");

  useEffect(() => {
    loadGames();
  }, [tripId, sessionType]);

  async function loadGames() {
    try {
      setIsLoading(true);
      
      const sessionRes = await apiRequest("POST", `/api/travel/trips/${tripId}/reflection-games/session`, {
        explorerId,
        sessionType,
      });
      const { session } = await sessionRes.json();
      setSessionId(session.id);
      
      const gamesRes = await apiRequest("GET", `/api/travel/trips/${tripId}/reflection-games?sessionType=${sessionType}`);
      const { games: loadedGames } = await gamesRes.json();
      setGames(loadedGames || []);
    } catch (error) {
      console.error("Error loading games:", error);
      toast.error("Failed to load games");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAnswer(selectedAnswer: string, isCorrect: boolean | null, stopId?: string) {
    const currentGame = games[currentGameIndex];
    const starsEarned = isCorrect === null ? 1 : (isCorrect ? 1 : 0);
    
    setTotalStars(prev => Math.min(prev + starsEarned, 3));
    setGameState("answered");

    if (starsEarned > 0) {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.6 }
      });
    }

    if (sessionId) {
      try {
        await apiRequest("POST", `/api/travel/reflection-games/${sessionId}/response`, {
          tripId,
          explorerId,
          gameType: currentGame.gameType,
          selectedAnswer,
          isCorrect,
          starsEarned,
          stopId,
        });
      } catch (error) {
        console.error("Error saving response:", error);
      }
    }
  }

  function handleNextGame() {
    if (currentGameIndex < games.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
      setGameState("playing");
    } else {
      handleComplete();
    }
  }

  async function handleComplete() {
    setGameState("complete");
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    if (sessionId) {
      try {
        await apiRequest("POST", `/api/travel/reflection-games/${sessionId}/complete`);
      } catch (error) {
        console.error("Error completing session:", error);
      }
    }

    onComplete(totalStars);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-12 h-12 text-amber-500" />
        </motion.div>
        <p className="text-muted-foreground">Loading games...</p>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-6 text-center">
        <Puzzle className="w-16 h-16 text-muted-foreground" />
        <h3 className="text-xl font-semibold">No Games Available</h3>
        <p className="text-muted-foreground">Visit more stops to unlock reflection games!</p>
        <Button onClick={onClose}>Continue</Button>
      </div>
    );
  }

  if (gameState === "complete") {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <Trophy className="w-20 h-20 text-amber-500" />
        </motion.div>
        
        <h2 className="text-2xl font-bold">Great Job, Explorer!</h2>
        
        <div className="flex items-center gap-2">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <Star 
                className={`w-10 h-10 ${i < totalStars ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} 
              />
            </motion.div>
          ))}
        </div>
        
        <p className="text-muted-foreground">
          You earned {totalStars} Memory {totalStars === 1 ? 'Star' : 'Stars'}!
        </p>
        
        <Button onClick={onClose} size="lg" className="mt-4">
          Continue Adventure
        </Button>
      </motion.div>
    );
  }

  const currentGame = games[currentGameIndex];
  const GameIcon = GAME_ICONS[currentGame.gameType];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GameIcon className="w-5 h-5 text-amber-500" />
          <span className="font-medium">{GAME_TITLES[currentGame.gameType]}</span>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(3)].map((_, i) => (
            <Star 
              key={i}
              className={`w-5 h-5 ${i < totalStars ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} 
            />
          ))}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Game {currentGameIndex + 1} of {games.length}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentGameIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {currentGame.gameType === 'who_am_i' && (
            <WhoAmIGameComponent 
              game={currentGame} 
              onAnswer={handleAnswer}
              isAnswered={gameState === "answered"}
            />
          )}
          {currentGame.gameType === 'guess_where' && (
            <GuessWhereGameComponent 
              game={currentGame} 
              onAnswer={handleAnswer}
              isAnswered={gameState === "answered"}
            />
          )}
          {currentGame.gameType === 'doesnt_belong' && (
            <DoesntBelongGameComponent 
              game={currentGame} 
              onAnswer={handleAnswer}
              isAnswered={gameState === "answered"}
            />
          )}
          {currentGame.gameType === 'this_belongs' && (
            <ThisBelongsGameComponent 
              game={currentGame} 
              onAnswer={handleAnswer}
              isAnswered={gameState === "answered"}
            />
          )}
          {currentGame.gameType === 'pick_title' && (
            <PickTitleGameComponent 
              game={currentGame} 
              onAnswer={handleAnswer}
              isAnswered={gameState === "answered"}
            />
          )}
          {currentGame.gameType === 'story_spark' && (
            <StorySparkGameComponent 
              game={currentGame} 
              onAnswer={handleAnswer}
              isAnswered={gameState === "answered"}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {gameState === "answered" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center pt-4"
        >
          <Button onClick={handleNextGame} size="lg">
            {currentGameIndex < games.length - 1 ? (
              <>Next Game <ChevronRight className="w-4 h-4 ml-1" /></>
            ) : (
              <>Finish <Trophy className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

function WhoAmIGameComponent({ 
  game, 
  onAnswer, 
  isAnswered 
}: { 
  game: WhoAmIGame; 
  onAnswer: (answer: string, isCorrect: boolean, stopId?: string) => void;
  isAnswered: boolean;
}) {
  const [revealedClues, setRevealedClues] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  function handleRevealClue() {
    if (revealedClues < game.clues.length) {
      setRevealedClues(prev => prev + 1);
    }
  }

  function handleSelect(label: string) {
    if (isAnswered) return;
    setSelectedAnswer(label);
    const isCorrect = label.toLowerCase() === game.correctAnswer.toLowerCase();
    onAnswer(label, isCorrect, game.stopId);
  }

  return (
    <Card data-testid="game-who-am-i">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-center">Who Am I?</h3>
          <p className="text-sm text-muted-foreground text-center">Read the clues and guess the place!</p>
        </div>

        <div className="space-y-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
          {game.clues.slice(0, revealedClues).map((clue, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="italic text-center"
            >
              "{clue}"
            </motion.p>
          ))}
          
          {!isAnswered && revealedClues < game.clues.length && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRevealClue}
              className="w-full mt-2"
              data-testid="button-reveal-clue"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Need another clue? ({game.clues.length - revealedClues} left)
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {game.options.map((option, i) => (
            <Button
              key={i}
              variant={selectedAnswer === option.label 
                ? (option.label.toLowerCase() === game.correctAnswer.toLowerCase() ? "default" : "destructive")
                : "outline"
              }
              className={`h-auto py-3 px-3 text-left justify-start items-start min-w-0 overflow-hidden ${
                isAnswered && option.label.toLowerCase() === game.correctAnswer.toLowerCase() 
                  ? "ring-2 ring-green-500" 
                  : ""
              }`}
              onClick={() => handleSelect(option.label)}
              disabled={isAnswered}
              data-testid={`button-option-${i}`}
            >
              <span className="text-xl mr-2 flex-shrink-0">{option.emoji}</span>
              <span className="text-sm break-words whitespace-normal text-left leading-tight">{option.label}</span>
            </Button>
          ))}
        </div>

        {isAnswered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center p-3 rounded-lg ${
              selectedAnswer?.toLowerCase() === game.correctAnswer.toLowerCase()
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            }`}
          >
            {selectedAnswer?.toLowerCase() === game.correctAnswer.toLowerCase() 
              ? "Correct! Great memory! ⭐" 
              : `It was ${game.correctAnswer}! Good try!`
            }
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function GuessWhereGameComponent({ 
  game, 
  onAnswer, 
  isAnswered 
}: { 
  game: GuessWhereGame; 
  onAnswer: (answer: string, isCorrect: boolean, stopId?: string) => void;
  isAnswered: boolean;
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  function handleSelect(label: string) {
    if (isAnswered) return;
    setSelectedAnswer(label);
    const isCorrect = label.toLowerCase() === game.correctAnswer.toLowerCase();
    onAnswer(label, isCorrect, game.stopId);
  }

  return (
    <Card data-testid="game-guess-where">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-center">Guess Where!</h3>
          <p className="text-sm text-muted-foreground text-center">Look at the photo and guess the place!</p>
        </div>

        <div className="rounded-lg overflow-hidden">
          <img 
            src={game.photoUrl} 
            alt="Mystery location"
            className="w-full h-48 object-cover"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {game.options.map((option, i) => (
            <Button
              key={i}
              variant={selectedAnswer === option.label 
                ? (option.label.toLowerCase() === game.correctAnswer.toLowerCase() ? "default" : "destructive")
                : "outline"
              }
              className={`h-auto py-3 px-3 text-left justify-start items-start min-w-0 overflow-hidden ${
                isAnswered && option.label.toLowerCase() === game.correctAnswer.toLowerCase() 
                  ? "ring-2 ring-green-500" 
                  : ""
              }`}
              onClick={() => handleSelect(option.label)}
              disabled={isAnswered}
              data-testid={`button-option-${i}`}
            >
              <span className="text-xl mr-2 flex-shrink-0">{option.emoji}</span>
              <span className="text-sm break-words whitespace-normal text-left leading-tight">{option.label}</span>
            </Button>
          ))}
        </div>

        {isAnswered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center p-3 rounded-lg ${
              selectedAnswer?.toLowerCase() === game.correctAnswer.toLowerCase()
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            }`}
          >
            {selectedAnswer?.toLowerCase() === game.correctAnswer.toLowerCase() 
              ? "Correct! You remembered! ⭐" 
              : `It was ${game.correctAnswer}! Nice try!`
            }
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function DoesntBelongGameComponent({ 
  game, 
  onAnswer, 
  isAnswered 
}: { 
  game: DoesntBelongGame; 
  onAnswer: (answer: string, isCorrect: null) => void;
  isAnswered: boolean;
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const explanation = game.explanations.find(e => e.itemLabel === selectedAnswer);

  function handleSelect(label: string) {
    if (isAnswered) return;
    setSelectedAnswer(label);
    onAnswer(label, null);
  }

  return (
    <Card data-testid="game-doesnt-belong">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-center">Which One Doesn't Belong?</h3>
          <p className="text-sm text-muted-foreground text-center">Pick the one that seems different - there's no wrong answer!</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {game.items.map((item, i) => (
            <Button
              key={i}
              variant={selectedAnswer === item.label ? "default" : "outline"}
              className="h-auto py-4 px-4 flex flex-col items-center gap-2"
              onClick={() => handleSelect(item.label)}
              disabled={isAnswered}
              data-testid={`button-option-${i}`}
            >
              <span className="text-3xl">{item.emoji}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Button>
          ))}
        </div>

        {isAnswered && explanation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
          >
            <p className="font-medium mb-2">Great thinking! ⭐</p>
            <p className="text-sm">{explanation.reason}</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function ThisBelongsGameComponent({ 
  game, 
  onAnswer, 
  isAnswered 
}: { 
  game: ThisBelongsGame; 
  onAnswer: (answer: string, isCorrect: null, stopId?: string) => void;
  isAnswered: boolean;
}) {
  const [selectedStop, setSelectedStop] = useState<string | null>(null);

  function handleSelect(stopId: string, stopName: string) {
    if (isAnswered) return;
    setSelectedStop(stopId);
    onAnswer(stopName, null, stopId);
  }

  return (
    <Card data-testid="game-this-belongs">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-center">This Belongs Here</h3>
          <p className="text-sm text-muted-foreground text-center">Where does this belong?</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-center">
          <span className="text-4xl block mb-2">{game.item.emoji}</span>
          <p className="font-medium">{game.item.label}</p>
          <p className="text-sm text-muted-foreground">{game.item.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {game.stops.map((stop, i) => (
            <Button
              key={i}
              variant={selectedStop === stop.stopId ? "default" : "outline"}
              className="h-auto py-3 px-4 flex flex-col items-center gap-1"
              onClick={() => handleSelect(stop.stopId, stop.stopName)}
              disabled={isAnswered}
              data-testid={`button-option-${i}`}
            >
              <span className="text-xl">{stop.emoji}</span>
              <span className="text-sm">{stop.stopName}</span>
            </Button>
          ))}
        </div>

        {isAnswered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
          >
            <p className="font-medium">⭐ {game.affirmation}</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function PickTitleGameComponent({ 
  game, 
  onAnswer, 
  isAnswered 
}: { 
  game: PickTitleGame; 
  onAnswer: (answer: string, isCorrect: null) => void;
  isAnswered: boolean;
}) {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  function handleSelect(title: string) {
    if (isAnswered) return;
    setSelectedTitle(title);
    onAnswer(title, null);
  }

  return (
    <Card data-testid="game-pick-title">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-center">Pick the Best Title!</h3>
          <p className="text-sm text-muted-foreground text-center">Name your adventure!</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-2">Places you visited:</p>
          <div className="flex flex-wrap gap-1">
            {game.stopHighlights.map((stop, i) => (
              <span key={i} className="text-xs bg-background px-2 py-1 rounded">
                {stop}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {game.titleOptions.map((title, i) => (
            <Button
              key={i}
              variant={selectedTitle === title ? "default" : "outline"}
              className="w-full h-auto py-3 text-left justify-start"
              onClick={() => handleSelect(title)}
              disabled={isAnswered}
              data-testid={`button-option-${i}`}
            >
              <BookOpen className="w-4 h-4 mr-3 shrink-0" />
              <span>{title}</span>
            </Button>
          ))}
        </div>

        {isAnswered && selectedTitle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
          >
            <p className="font-medium mb-1">Perfect choice! ⭐</p>
            <p className="text-sm">"{selectedTitle}" is a great name for your adventure!</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function StorySparkGameComponent({ 
  game, 
  onAnswer, 
  isAnswered 
}: { 
  game: StorySparkGame; 
  onAnswer: (answer: string, isCorrect: boolean, stopId?: string) => void;
  isAnswered: boolean;
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  function handleSelect(answer: string) {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    
    if (answer.includes("Not sure")) {
      onAnswer(answer, false, game.stopId);
    } else {
      const isCorrect = answer.toLowerCase() === game.correctAnswer.toLowerCase();
      onAnswer(answer, isCorrect, game.stopId);
    }
  }

  return (
    <Card data-testid="game-story-spark">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-center">Story Spark</h3>
          <p className="text-sm text-muted-foreground text-center">Remember what you learned at {game.stopName}?</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
          <p className="text-center font-medium">{game.question}</p>
        </div>

        <div className="space-y-2">
          {game.options.map((option, i) => (
            <Button
              key={i}
              variant={selectedAnswer === option 
                ? (option.toLowerCase() === game.correctAnswer.toLowerCase() ? "default" : "destructive")
                : "outline"
              }
              className={`w-full h-auto py-3 text-left justify-start ${
                isAnswered && option.toLowerCase() === game.correctAnswer.toLowerCase() 
                  ? "ring-2 ring-green-500" 
                  : ""
              }`}
              onClick={() => handleSelect(option)}
              disabled={isAnswered}
              data-testid={`button-option-${i}`}
            >
              {option}
            </Button>
          ))}
        </div>

        {isAnswered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center p-3 rounded-lg ${
              selectedAnswer?.toLowerCase() === game.correctAnswer.toLowerCase()
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            }`}
          >
            {selectedAnswer?.toLowerCase() === game.correctAnswer.toLowerCase() 
              ? "You remembered! ⭐" 
              : game.explanation || `The answer was: ${game.correctAnswer}`
            }
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
