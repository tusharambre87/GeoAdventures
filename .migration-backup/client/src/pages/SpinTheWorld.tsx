import { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Globe, Star, Volume2, RotateCcw, Sparkles, Check, X, Lightbulb, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { LOCATION_CARDS } from "@/lib/gameData";
import { ALL_GUESS_AND_GO_CITIES } from "@/lib/dailyQuestData";
import { soundManager } from "@/lib/sound";
import GlobeGL from "react-globe.gl";
import LearningSummary, { getGameLearningPoints } from "@/components/LearningSummary";
import { useUser } from "@/lib/userContext";

interface GlobeErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
  fallback: ReactNode;
}

interface GlobeErrorBoundaryState {
  hasError: boolean;
}

class GlobeErrorBoundary extends Component<GlobeErrorBoundaryProps, GlobeErrorBoundaryState> {
  constructor(props: GlobeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): GlobeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Globe component error:', error, errorInfo);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

type Difficulty = "easy" | "medium" | "hard";

const CONTINENTS = [
  { id: "europe", name: "Europe", color: "#8B5CF6", emoji: "🏰", lat: 50, lng: 10 },
  { id: "asia", name: "Asia", color: "#EAB308", emoji: "🐼", lat: 35, lng: 100 },
  { id: "africa", name: "Africa", color: "#F97316", emoji: "🦁", lat: 0, lng: 20 },
  { id: "north_america", name: "North America", color: "#EF4444", emoji: "🗽", lat: 40, lng: -100 },
  { id: "south_america", name: "South America", color: "#22C55E", emoji: "🦜", lat: -15, lng: -60 },
  { id: "oceania", name: "Oceania", color: "#14B8A6", emoji: "🦘", lat: -25, lng: 135 },
];

interface QuizQuestion {
  city: string;
  country: string;
  clue: string;
  options: string[];
  correctAnswer: string;
  hint?: string;
}

interface WrongAnswer {
  question: string;
  yourAnswer: string;
  correctAnswer: string;
}

function generateOptions(correctCity: string, continent: string, difficulty: Difficulty): string[] {
  const continentMap: Record<string, string> = {
    europe: "Europe",
    asia: "Asia",
    africa: "Africa",
    north_america: "North America",
    south_america: "South America",
    oceania: "Oceania",
  };
  
  const continentName = continentMap[continent];
  const sameContinentCities = ALL_GUESS_AND_GO_CITIES
    .filter(c => c.continent === continentName && c.city !== correctCity)
    .map(c => c.city);
  const otherContinentCities = ALL_GUESS_AND_GO_CITIES
    .filter(c => c.continent !== continentName)
    .map(c => c.city);

  let options: string[] = [correctCity];

  if (difficulty === "easy") {
    const shuffledOther = [...otherContinentCities].sort(() => Math.random() - 0.5);
    options.push(...shuffledOther.slice(0, 3));
  } else if (difficulty === "medium") {
    const shuffledSame = [...sameContinentCities].sort(() => Math.random() - 0.5);
    const shuffledOther = [...otherContinentCities].sort(() => Math.random() - 0.5);
    options.push(shuffledSame[0] || shuffledOther[0]);
    options.push(...shuffledOther.slice(0, 2));
  } else {
    const shuffledSame = [...sameContinentCities].sort(() => Math.random() - 0.5);
    if (shuffledSame.length >= 3) {
      options.push(...shuffledSame.slice(0, 3));
    } else {
      options.push(...shuffledSame);
      const remaining = 3 - shuffledSame.length;
      const shuffledOther = [...otherContinentCities].sort(() => Math.random() - 0.5);
      options.push(...shuffledOther.slice(0, remaining));
    }
  }

  return options.sort(() => Math.random() - 0.5);
}

function generateQuiz(continent: string, difficulty: Difficulty): QuizQuestion[] {
  const continentMap: Record<string, string> = {
    europe: "Europe",
    asia: "Asia",
    africa: "Africa",
    north_america: "North America",
    south_america: "South America",
    oceania: "Oceania",
  };
  
  const continentName = continentMap[continent];
  let cities = ALL_GUESS_AND_GO_CITIES.filter(c => c.continent === continentName);
  
  if (cities.length < 3) {
    cities = [...ALL_GUESS_AND_GO_CITIES].sort(() => Math.random() - 0.5).slice(0, 5);
  }
  
  const questionCount = difficulty === "easy" ? 5 : difficulty === "medium" ? 7 : 10;
  const shuffled = [...cities].sort(() => Math.random() - 0.5);
  
  return shuffled.slice(0, questionCount).map(city => {
    // Use city-specific clue (index 2) since continent is already known
    const cityClue = city.clues.length > 2 ? city.clues[2] : city.clues[city.clues.length - 1];
    let clue = cityClue;
    
    if (difficulty === "easy") {
      clue = `${cityClue} (Hint: It's in ${city.country})`;
    } else if (difficulty === "medium") {
      clue = cityClue;
    }
    // Hard mode: just the city clue, no hints
    
    return {
      city: city.city,
      country: city.country,
      clue,
      options: generateOptions(city.city, continent, difficulty),
      correctAnswer: city.city,
      hint: city.didYouKnow || city.clues[1],
    };
  });
}

export default function SpinTheWorld() {
  const [, navigate] = useLocation();
  const { awardPassportStar, recordMasteryAttempt } = useUser();
  const [phase, setPhase] = useState<"DIFFICULTY" | "SPIN" | "SELECT" | "QUIZ" | "RESULTS">("DIFFICULTY");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [selectedContinent, setSelectedContinent] = useState<typeof CONTINENTS[0] | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [globeError, setGlobeError] = useState(false);
  const [landedContinent, setLandedContinent] = useState<typeof CONTINENTS[0] | null>(null);
  const [lastLandedContinent, setLastLandedContinent] = useState<typeof CONTINENTS[0] | null>(null);
  const globeRef = useRef<any>(null);
  const targetContinentRef = useRef<typeof CONTINENTS[0] | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const masteryCityId = urlParams.get('masteryCity');
  const returnTo = urlParams.get('returnTo');
  const fromPage = urlParams.get('from');
  const preselectedContinentId = urlParams.get('continent');

  // Setup globe controls
  useEffect(() => {
    if (!globeRef.current || !globeReady || phase !== "SPIN") return;
    
    const controls = globeRef.current.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    
    if (!isSpinning && !landedContinent) {
      // Slow idle rotation
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
    } else {
      controls.autoRotate = false;
    }
  }, [globeReady, phase, isSpinning, landedContinent]);

  // Fast spinning animation that lands on a random continent
  useEffect(() => {
    if (!isSpinning || !globeRef.current) return;
    
    // Pick continent to land on — use preselected if provided, otherwise random
    let targetContinent: typeof CONTINENTS[0];
    if (preselectedContinentId && !lastLandedContinent) {
      targetContinent = CONTINENTS.find(c => c.id === preselectedContinentId) || CONTINENTS[Math.floor(Math.random() * CONTINENTS.length)];
    } else {
      const availableContinents = lastLandedContinent 
        ? CONTINENTS.filter(c => c.id !== lastLandedContinent.id)
        : CONTINENTS;
      targetContinent = availableContinents[Math.floor(Math.random() * availableContinents.length)];
    }
    targetContinentRef.current = targetContinent;
    
    let animationId: number;
    let startTime = Date.now();
    const spinDuration = 3000; // 3 seconds
    let currentLng = 0;
    const startLat = 20;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      
      // Ease out - start fast, slow down
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const speed = 25 * (1 - easeOut) + 0.2;
      
      currentLng += speed;
      if (currentLng > 360) currentLng -= 360;
      
      // Interpolate towards target position in the last 30% of animation
      let lat = startLat;
      let lng = currentLng;
      let altitude = 2.5;
      
      if (progress > 0.7) {
        const landingProgress = (progress - 0.7) / 0.3;
        const landingEase = landingProgress * landingProgress;
        lat = startLat + (targetContinent.lat - startLat) * landingEase;
        lng = currentLng + (targetContinent.lng - currentLng) * landingEase;
        altitude = 2.5 - (1.0 * landingEase); // Zoom in from 2.5 to 1.5
      }
      
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat, lng, altitude }, 0);
      }
      
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        // Final zoom to continent
        if (globeRef.current) {
          globeRef.current.pointOfView(
            { lat: targetContinent.lat, lng: targetContinent.lng, altitude: 1.5 },
            800
          );
        }
        setTimeout(() => {
          setIsSpinning(false);
          const landed = targetContinentRef.current!;
          setLandedContinent(landed);
          setLastLandedContinent(landed);
        }, 800);
      }
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isSpinning]);

  const handleDifficultySelect = (diff: Difficulty) => {
    setDifficulty(diff);
    setPhase("SPIN");
  };

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    soundManager.playSuccess();
  };

  const handleGlobeClick = () => {
    if (phase === "SPIN" && !isSpinning) {
      handleSpin();
    }
  };

  const handleContinentSelect = (continent: typeof CONTINENTS[0]) => {
    setSelectedContinent(continent);
    const quiz = generateQuiz(continent.id, difficulty);
    setQuestions(quiz);
    setCurrentQuestion(0);
    setScore(0);
    setHintsUsed(0);
    setWrongAnswers([]);
    setPhase("QUIZ");
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);
    setShowHint(false);
    
    const currentQ = questions[currentQuestion];
    const isCorrect = answer === currentQ.correctAnswer;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      soundManager.playSuccess();
      
      // Award star 5 (Spin the Globe) for correctly identifying this city
      const cityCard = ALL_GUESS_AND_GO_CITIES.find(c => c.city === currentQ.correctAnswer);
      if (cityCard) {
        awardPassportStar(cityCard.id, 5);
      }
    } else {
      soundManager.playError();
      setWrongAnswers(prev => [...prev, {
        question: currentQ.clue,
        yourAnswer: answer,
        correctAnswer: currentQ.correctAnswer,
      }]);
    }

    setTimeout(() => {
      setShowResult(false);
      setSelectedAnswer(null);
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        setPhase("RESULTS");
        const finalScore = score + (isCorrect ? 1 : 0);
        const percentage = (finalScore / questions.length) * 100;
        if (percentage >= 60 && masteryCityId) {
          awardPassportStar(masteryCityId, 5);
        }
        if (percentage >= 80) {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      }
    }, 1500);
  };

  const handleUseHint = () => {
    setShowHint(true);
    setHintsUsed(prev => prev + 1);
  };

  const handlePlayAgain = () => {
    setPhase("DIFFICULTY");
    setSelectedContinent(null);
    setLandedContinent(null);
    setQuestions([]);
    setCurrentQuestion(0);
    setScore(0);
    setHintsUsed(0);
    setWrongAnswers([]);
    setShowHint(false);
    setIsSpinning(false);
  };

  const continentLabels = CONTINENTS.map(c => ({
    lat: c.lat,
    lng: c.lng,
    text: c.emoji,
    color: c.color,
    size: 1.5,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900 relative overflow-hidden">
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => {
              if (phase === "DIFFICULTY") {
                if (returnTo === "explorer-map") {
                  window.location.href = `/explorer-map${masteryCityId ? `?openCity=${masteryCityId}` : ''}`;
                } else if (returnTo === "city-hub" && masteryCityId) {
                  window.location.href = `/city/${masteryCityId}`;
                } else {
                  navigate(fromPage || "/play-games");
                }
              } else {
                setPhase("DIFFICULTY");
                setSelectedContinent(null);
                setLandedContinent(null);
                setQuestions([]);
                setCurrentQuestion(0);
                setScore(0);
                setHintsUsed(0);
                setWrongAnswers([]);
                setShowHint(false);
                setIsSpinning(false);
              }
            }}
            className="text-white/80 hover:text-white hover:bg-white/10"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {phase === "DIFFICULTY" && returnTo === "explorer-map" ? "🗺️ Explorer Map" : phase === "DIFFICULTY" && returnTo === "city-hub" ? "🏙️ Back to City" : "Back"}
          </Button>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white flex items-center gap-2">
            <Globe className="w-8 h-8 text-cyan-400" />
            Spin the World
          </h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-4">
        <AnimatePresence mode="wait">
          {/* DIFFICULTY SELECT PHASE */}
          {phase === "DIFFICULTY" && (
            <motion.div
              key="difficulty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6 w-full max-w-md"
            >
              <h2 className="text-2xl text-white font-bold text-center">
                Choose Your Challenge!
              </h2>
              
              <div className="flex flex-col gap-4 w-full">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDifficultySelect("easy")}
                  className="bg-green-500/20 border-2 border-green-400 rounded-2xl p-5 text-left hover:bg-green-500/30 transition-colors"
                  data-testid="button-difficulty-easy"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🌱</span>
                    <div>
                      <h3 className="text-white font-bold text-lg">Easy Mode</h3>
                      <p className="text-green-200 text-sm">Ages 3-6 • 5 questions • Mixed answers</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDifficultySelect("medium")}
                  className="bg-yellow-500/20 border-2 border-yellow-400 rounded-2xl p-5 text-left hover:bg-yellow-500/30 transition-colors"
                  data-testid="button-difficulty-medium"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">⭐</span>
                    <div>
                      <h3 className="text-white font-bold text-lg">Medium Mode</h3>
                      <p className="text-yellow-200 text-sm">Ages 7-9 • 7 questions • Some same continent</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDifficultySelect("hard")}
                  className="bg-red-500/20 border-2 border-red-400 rounded-2xl p-5 text-left hover:bg-red-500/30 transition-colors"
                  data-testid="button-difficulty-hard"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🔥</span>
                    <div>
                      <h3 className="text-white font-bold text-lg">Hard Mode</h3>
                      <p className="text-red-100 text-sm">Ages 10+ • 10 questions • All same continent • Hints</p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* SPIN PHASE - 3D Globe */}
          {phase === "SPIN" && (
            <motion.div
              key="spin"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-4"
            >
              <p className="text-xl text-white/80 text-center max-w-md">
                {isSpinning ? "🌍 Where will you land?" : landedContinent ? "" : "Tap the globe or press Spin!"}
              </p>
              
              {/* 3D Globe Container */}
              <div 
                className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px] cursor-pointer"
                onClick={handleGlobeClick}
              >
                <GlobeErrorBoundary
                  onError={() => setGlobeError(true)}
                  fallback={
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-full border-4 border-blue-400/30">
                      <Globe className="w-24 h-24 text-blue-300 mb-4" />
                      <p className="text-white/80 text-sm text-center px-4">Pick a continent below!</p>
                    </div>
                  }
                >
                  <GlobeGL
                    ref={globeRef}
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                    bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                    backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                    width={window.innerWidth < 768 ? 320 : 400}
                    height={window.innerWidth < 768 ? 320 : 400}
                    animateIn={true}
                    enablePointerInteraction={true}
                    onGlobeReady={() => setGlobeReady(true)}
                    labelsData={continentLabels}
                    labelLat={(d: any) => d.lat}
                    labelLng={(d: any) => d.lng}
                    labelText={(d: any) => d.text}
                    labelSize={2}
                    labelDotRadius={0}
                    labelColor={() => "white"}
                    labelResolution={2}
                  />
                </GlobeErrorBoundary>
                
                {/* Landed continent overlay */}
                {landedContinent && !isSpinning && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none"
                  >
                    <div 
                      className="bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-4 text-center pointer-events-auto border-2"
                      style={{ borderColor: landedContinent.color }}
                    >
                      <p className="text-white/80 text-sm mb-1">You landed on...</p>
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="text-4xl">{landedContinent.emoji}</span>
                        <h3 className="text-2xl font-bold text-white">{landedContinent.name}</h3>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => {
                            setLandedContinent(null);
                            handleSpin();
                          }}
                          variant="outline"
                          size="sm"
                          className="border-white/30 text-white hover:bg-white/10"
                          data-testid="button-spin-again"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Spin Again
                        </Button>
                        <Button
                          onClick={() => handleContinentSelect(landedContinent)}
                          size="sm"
                          className="text-white font-bold"
                          style={{ backgroundColor: landedContinent.color }}
                          data-testid="button-continue"
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          Let's Go!
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {!landedContinent && !globeError && (
                <Button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className={`text-xl font-bold px-10 py-6 rounded-full shadow-lg transition-all ${
                    isSpinning 
                      ? "bg-gray-500 cursor-not-allowed" 
                      : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  }`}
                  data-testid="button-spin"
                >
                  <Sparkles className="w-6 h-6 mr-2" />
                  {isSpinning ? "Spinning..." : "Spin!"}
                </Button>
              )}
              
              {globeError && (
                <div className="flex flex-col items-center gap-4 w-full max-w-md">
                  <p className="text-white/80 text-center">Pick a continent to explore:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
                    {CONTINENTS.map((continent) => (
                      <motion.button
                        key={continent.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleContinentSelect(continent)}
                        className="bg-white/10 backdrop-blur-sm border-2 rounded-xl p-3 flex flex-col items-center gap-1 hover:bg-white/20 transition-colors"
                        style={{ borderColor: continent.color }}
                        data-testid={`button-continent-${continent.id}`}
                      >
                        <span className="text-2xl">{continent.emoji}</span>
                        <span className="text-white font-bold text-sm">{continent.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* SELECT CONTINENT PHASE */}
          {phase === "SELECT" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6 w-full max-w-2xl"
            >
              <h2 className="text-2xl text-white font-bold text-center">
                Pick a Continent to Explore!
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                {CONTINENTS.map((continent) => (
                  <motion.button
                    key={continent.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleContinentSelect(continent)}
                    className="bg-white/10 backdrop-blur-sm border-2 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-white/20 transition-colors"
                    style={{ borderColor: continent.color }}
                    data-testid={`button-continent-${continent.id}`}
                  >
                    <span className="text-4xl">{continent.emoji}</span>
                    <span className="text-white font-bold">{continent.name}</span>
                  </motion.button>
                ))}
              </div>
              
              <Button
                variant="ghost"
                onClick={() => setPhase("SPIN")}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Spin Again
              </Button>
            </motion.div>
          )}

          {/* QUIZ PHASE */}
          {phase === "QUIZ" && questions.length > 0 && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col items-center gap-4 w-full max-w-xl"
            >
              {/* Progress */}
              <div className="flex items-center gap-2 w-full">
                <span className="text-white/60 text-sm">Q{currentQuestion + 1}/{questions.length}</span>
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-bold">{score}</span>
                </div>
              </div>

              {/* Difficulty & Continent badge */}
              <div className="flex items-center gap-3">
                <div 
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                  style={{ backgroundColor: `${selectedContinent?.color}40` }}
                >
                  <span className="text-xl">{selectedContinent?.emoji}</span>
                  <span className="text-white font-bold">{selectedContinent?.name}</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                  difficulty === "easy" ? "bg-green-500/30 text-green-200" :
                  difficulty === "medium" ? "bg-yellow-500/30 text-yellow-200" :
                  "bg-red-500/30 text-red-200"
                }`}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 w-full border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-blue-500/20 hover:bg-blue-500/30 rounded-full w-9 h-9"
                      onClick={() => soundManager.speak(questions[currentQuestion].clue)}
                    >
                      <Volume2 className="w-4 h-4 text-blue-300" />
                    </Button>
                    <span className="text-white/60 text-xs">Listen</span>
                  </div>
                  
                  {/* Hint button - only for hard mode */}
                  {difficulty === "hard" && !showHint && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-xs"
                      onClick={handleUseHint}
                    >
                      <Lightbulb className="w-4 h-4 mr-1" />
                      Use Hint
                    </Button>
                  )}
                </div>
                
                <p className="text-lg text-white font-medium mb-4 leading-relaxed">
                  "{questions[currentQuestion].clue}"
                </p>

                {/* Show hint if used */}
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-yellow-500/20 rounded-xl p-3 mb-4 border border-yellow-400/30"
                  >
                    <p className="text-sm text-yellow-200 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                      {questions[currentQuestion].hint}
                    </p>
                  </motion.div>
                )}

                <p className="text-white/60 text-sm mb-2">Which city am I?</p>

                {/* Answer Options */}
                <div className="grid grid-cols-2 gap-3">
                  {questions[currentQuestion].options.map((option) => {
                    const isCorrect = option === questions[currentQuestion].correctAnswer;
                    const isSelected = selectedAnswer === option;
                    
                    let buttonClass = "bg-white/10 hover:bg-white/20 border-white/30 text-white";
                    if (showResult) {
                      if (isCorrect) {
                        buttonClass = "bg-green-500/30 border-green-400 text-green-200";
                      } else if (isSelected && !isCorrect) {
                        buttonClass = "bg-red-500/30 border-red-400 text-red-200";
                      }
                    }
                    
                    return (
                      <motion.button
                        key={option}
                        whileHover={!showResult ? { scale: 1.02 } : {}}
                        whileTap={!showResult ? { scale: 0.98 } : {}}
                        onClick={() => !showResult && handleAnswer(option)}
                        disabled={showResult}
                        className={`p-3 rounded-xl border-2 font-bold transition-all text-sm ${buttonClass}`}
                        data-testid={`button-answer-${option}`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {showResult && isCorrect && <Check className="w-4 h-4" />}
                          {showResult && isSelected && !isCorrect && <X className="w-4 h-4" />}
                          {option}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* RESULTS PHASE */}
          {phase === "RESULTS" && (() => {
            const percentage = (score / questions.length) * 100;
            const isPerfect = wrongAnswers.length === 0;
            const isGreat = percentage >= 80;
            
            return (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-5 text-center w-full max-w-xl"
              >
                {/* Emoji and Title */}
                <div className="text-6xl mb-1">
                  {isPerfect ? "🏆" : isGreat ? "🌟" : "💪"}
                </div>
                
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-white">
                  {isPerfect ? "Perfect Score!" : 
                   isGreat ? "Congratulations!" : "Great Effort!"}
                </h2>
                
                <p className="text-white/80 text-sm max-w-sm">
                  {isPerfect 
                    ? "You got every question right! You're a true geography expert!" 
                    : isGreat 
                      ? "Amazing job! Let's review the ones you missed so you can master them too!"
                      : "You're doing great! Every explorer learns from their journey. Let's see what we can learn!"}
                </p>
                
                {/* Score Card */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 w-full">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl font-bold text-yellow-400">{score}</span>
                    <span className="text-xl text-white/60">/ {questions.length}</span>
                    <span className="text-white/60">({Math.round(percentage)}%)</span>
                  </div>
                  {hintsUsed > 0 && (
                    <p className="text-yellow-300 text-xs mt-2">Hints used: {hintsUsed}</p>
                  )}
                </div>
                
                {/* Wrong Answers Review */}
                {wrongAnswers.length > 0 && (
                  <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/10">
                    <h3 className="text-white font-bold mb-3 flex items-center justify-center gap-2">
                      <span className="text-lg">📚</span>
                      Let's Learn These!
                    </h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {wrongAnswers.map((wrong, index) => (
                        <div 
                          key={index}
                          className="bg-white/10 rounded-xl p-3 text-left"
                        >
                          <p className="text-white/60 text-xs mb-1 line-clamp-1">
                            "{wrong.question}"
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-red-300 line-through">{wrong.yourAnswer}</span>
                            <span className="text-white/40">→</span>
                            <span className="text-green-300 font-bold">{wrong.correctAnswer}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Learning Summary */}
                <LearningSummary points={getGameLearningPoints("spin-the-world")} variant="dark" />
                
                {/* Continent Badge */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10">
                  <span className="text-xl">{selectedContinent?.emoji}</span>
                  <span className="text-white text-sm">{selectedContinent?.name} Explorer</span>
                </div>
                
                {/* What's Next Prompt */}
                <p className="text-white/60 text-sm italic">
                  What will you explore next?
                </p>

                {/* Action Buttons */}
                {(() => {
                  const pct = (score / questions.length) * 100;
                  const needsRetry = pct <= 40;
                  return (
                    <div className="flex flex-col gap-3 mt-2 w-full max-w-xs">
                      {needsRetry && (
                        <p className="text-yellow-300 text-sm font-semibold text-center" data-testid="text-retry-message">
                          Score at least 3/5 to continue. Try again!
                        </p>
                      )}
                      {returnTo === "explorer-map" && (
                        <Button
                          onClick={() => window.location.href = `/explorer-map${masteryCityId ? `?openCity=${masteryCityId}` : ''}`}
                          disabled={needsRetry}
                          className={cn(
                            "w-full text-white font-bold rounded-full",
                            needsRetry ? "bg-gray-500/50 opacity-50 cursor-not-allowed" : "bg-cyan-500/80 hover:bg-cyan-500"
                          )}
                          data-testid="button-return-explorer-map"
                        >
                          🗺️ Return to Explorer Map
                        </Button>
                      )}
                      {returnTo === "city-hub" && masteryCityId && (
                        <Button
                          onClick={() => window.location.href = `/city/${masteryCityId}`}
                          disabled={needsRetry}
                          className={cn(
                            "w-full text-white font-bold rounded-full",
                            needsRetry ? "bg-gray-500/50 opacity-50 cursor-not-allowed" : "bg-amber-500/80 hover:bg-amber-500"
                          )}
                          data-testid="button-return-city-hub"
                        >
                          🏙️ Back to City
                        </Button>
                      )}
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={handlePlayAgain}
                          className={cn(
                            "text-white font-bold px-5 py-2.5 rounded-full",
                            needsRetry
                              ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 ring-2 ring-yellow-300 animate-pulse"
                              : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                          )}
                          data-testid="button-play-again"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          {needsRetry ? "Try Again" : "Play Again"}
                        </Button>
                        <Button
                          onClick={() => navigate(fromPage || "/")}
                          variant="outline"
                          disabled={needsRetry}
                          className={cn(
                            "font-bold px-5 py-2.5 rounded-full",
                            needsRetry ? "border-white/10 text-white/30 cursor-not-allowed" : "border-white/30 text-white hover:bg-white/10"
                          )}
                          data-testid="button-go-home"
                        >
                          Home
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
}
