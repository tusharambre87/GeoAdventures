import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, RotateCcw, Trophy, Volume2, VolumeX, X, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCATION_CARDS } from "@/lib/gameData";
import { ALL_GUESS_AND_GO_CITIES } from "@/lib/dailyQuestData";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { soundManager } from "@/lib/sound";
import confetti from "canvas-confetti";
import LearningSummary from "@/components/LearningSummary";
import worldMapImage from "@assets/generated_images/neutral_beige_world_map.png";
import { recordGamePlayed } from "@/components/TravelModeReminders";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { GeoPassModal } from "@/components/GeoPassModal";

type Continent = "Europe" | "Asia" | "Africa" | "North America" | "South America" | "Oceania";

const ALL_CONTINENTS: Continent[] = ["Europe", "Asia", "Africa", "North America", "South America", "Oceania"];

const CONTINENT_EMOJIS: Record<Continent, string> = {
  "Europe": "🏰",
  "Asia": "🐼",
  "Africa": "🦁",
  "North America": "🗽",
  "South America": "🦜",
  "Oceania": "🦘",
};

interface CityForGame {
  id: string;
  city: string;
  country: string;
  continent: Continent;
}

const allCities: CityForGame[] = ALL_GUESS_AND_GO_CITIES.map(card => ({
  id: card.id,
  city: card.city,
  country: card.country,
  continent: card.continent as Continent,
}));

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function speakCity(city: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`Find ${city} on the world map`);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }
}

type FlashState = "none" | "yellow" | "red" | "green" | "orange";

interface ContinentDisplayState {
  flash: FlashState;
  completed: boolean;
  wasCorrect: boolean;
}

interface WorldMapProps {
  onSelect: (continent: Continent) => void;
  continentStates: Record<Continent, ContinentDisplayState>;
  showLabels: boolean;
  showCityMarker: boolean;
  currentCity: CityForGame | null;
  disabled: boolean;
}

function WorldMap({ onSelect, continentStates, showLabels, showCityMarker, currentCity, disabled }: WorldMapProps) {
  const [hoveredContinent, setHoveredContinent] = useState<Continent | null>(null);
  
  const getContinentFill = (continent: Continent) => {
    const state = continentStates[continent];
    if (state.flash === "green") return "rgba(34, 197, 94, 0.55)";
    if (state.flash === "yellow") return "rgba(251, 191, 36, 0.65)";
    if (state.flash === "red") return "rgba(239, 68, 68, 0.65)";
    if (state.flash === "orange") return "rgba(249, 115, 22, 0.55)";
    if (state.completed && state.wasCorrect) return "rgba(34, 197, 94, 0.45)";
    if (state.completed && !state.wasCorrect) return "rgba(239, 68, 68, 0.35)";
    if (hoveredContinent === continent && !disabled) return "rgba(59, 130, 246, 0.2)";
    return "transparent";
  };

  const handleClick = (continent: Continent) => {
    if (!disabled && !continentStates[continent].completed) {
      onSelect(continent);
    }
  };

  const getCityMarkerPosition = (continent: Continent): { x: number; y: number } | null => {
    const positions: Record<Continent, { x: number; y: number }> = {
      "Europe": { x: 510, y: 130 },
      "Asia": { x: 700, y: 180 },
      "Africa": { x: 520, y: 320 },
      "North America": { x: 180, y: 180 },
      "South America": { x: 280, y: 380 },
      "Oceania": { x: 850, y: 400 },
    };
    return positions[continent] || null;
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden shadow-xl border-4 border-blue-200">
        <img 
          src={worldMapImage} 
          alt="World Map" 
          className="w-full h-auto block"
          draggable={false}
        />
        
        <svg 
          viewBox="0 0 1000 560" 
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <g id="north-america"
            style={{ 
              fill: getContinentFill("North America"),
              transition: "fill 0.3s ease",
              cursor: !continentStates["North America"].completed && !disabled ? "pointer" : "default"
            }}
            onClick={() => handleClick("North America")}
            onMouseEnter={() => setHoveredContinent("North America")}
            onMouseLeave={() => setHoveredContinent(null)}
          >
            <path d="M10,50 L80,30 L150,25 L220,30 L280,50 L320,80 L340,120 L335,160 L320,200 L300,240 L280,280 L260,310 L240,340 L210,360 L170,370 L130,365 L100,350 L80,320 L65,280 L55,240 L45,200 L35,160 L25,120 L15,80 L10,50 Z" />
            <path d="M145,15 L190,10 L230,20 L240,45 L220,65 L180,70 L150,55 L145,30 L145,15 Z" />
            <path d="M170,370 L220,380 L260,410 L280,450 L270,490 L230,510 L190,500 L160,470 L155,430 L165,395 L170,370 Z" />
          </g>

          <g id="south-america"
            style={{ 
              fill: getContinentFill("South America"),
              transition: "fill 0.3s ease",
              cursor: !continentStates["South America"].completed && !disabled ? "pointer" : "default"
            }}
            onClick={() => handleClick("South America")}
            onMouseEnter={() => setHoveredContinent("South America")}
            onMouseLeave={() => setHoveredContinent(null)}
          >
            <path d="M200,320 L260,300 L320,310 L360,340 L380,390 L385,450 L370,510 L340,555 L290,560 L240,555 L200,530 L180,490 L175,440 L185,390 L200,350 L200,320 Z" />
          </g>

          <g id="europe"
            style={{ 
              fill: getContinentFill("Europe"),
              transition: "fill 0.3s ease",
              cursor: !continentStates["Europe"].completed && !disabled ? "pointer" : "default"
            }}
            onClick={() => handleClick("Europe")}
            onMouseEnter={() => setHoveredContinent("Europe")}
            onMouseLeave={() => setHoveredContinent(null)}
          >
            <path d="M420,30 L480,15 L550,20 L610,40 L650,75 L660,120 L650,165 L620,200 L580,220 L530,235 L480,245 L440,240 L410,220 L395,190 L390,155 L400,115 L415,75 L420,45 L420,30 Z" />
            <path d="M380,5 L430,5 L460,25 L455,55 L420,65 L385,50 L380,25 L380,5 Z" />
          </g>

          <g id="africa"
            style={{ 
              fill: getContinentFill("Africa"),
              transition: "fill 0.3s ease",
              cursor: !continentStates["Africa"].completed && !disabled ? "pointer" : "default"
            }}
            onClick={() => handleClick("Africa")}
            onMouseEnter={() => setHoveredContinent("Africa")}
            onMouseLeave={() => setHoveredContinent(null)}
          >
            <path d="M420,210 L480,200 L540,210 L580,235 L610,275 L630,330 L640,390 L630,450 L600,500 L550,540 L490,555 L440,545 L400,510 L375,460 L365,405 L370,350 L385,300 L405,255 L420,210 Z" />
          </g>

          <g id="asia"
            style={{ 
              fill: getContinentFill("Asia"),
              transition: "fill 0.3s ease",
              cursor: !continentStates["Asia"].completed && !disabled ? "pointer" : "default"
            }}
            onClick={() => handleClick("Asia")}
            onMouseEnter={() => setHoveredContinent("Asia")}
            onMouseLeave={() => setHoveredContinent(null)}
          >
            <path d="M640,25 L720,15 L810,35 L890,75 L950,135 L980,205 L985,280 L965,350 L920,405 L860,445 L790,465 L720,470 L660,455 L620,420 L595,375 L585,325 L590,275 L610,225 L635,175 L655,125 L665,80 L660,50 L640,25 Z" />
            <path d="M710,400 L770,390 L825,420 L865,470 L875,525 L845,555 L785,555 L730,540 L695,505 L680,460 L695,425 L710,400 Z" />
          </g>

          <g id="oceania"
            style={{ 
              fill: getContinentFill("Oceania"),
              transition: "fill 0.3s ease",
              cursor: !continentStates["Oceania"].completed && !disabled ? "pointer" : "default"
            }}
            onClick={() => handleClick("Oceania")}
            onMouseEnter={() => setHoveredContinent("Oceania")}
            onMouseLeave={() => setHoveredContinent(null)}
          >
            <path d="M800,380 L870,365 L940,390 L990,440 L1000,500 L980,545 L930,560 L870,555 L810,535 L770,495 L760,445 L775,405 L800,380 Z" />
            <path d="M920,340 L960,330 L990,355 L995,390 L970,415 L935,415 L910,390 L910,360 L920,340 Z" />
          </g>

          {showLabels && (
            <>
              <text x="175" y="200" fill="#1E3A5F" fontSize="22" fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 0 4px white, 0 0 4px white' }}>North America</text>
              <text x="270" y="420" fill="#1E3A5F" fontSize="20" fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 0 4px white, 0 0 4px white' }}>South America</text>
              <text x="520" y="140" fill="#1E3A5F" fontSize="20" fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 0 4px white, 0 0 4px white' }}>Europe</text>
              <text x="520" y="380" fill="#1E3A5F" fontSize="22" fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 0 4px white, 0 0 4px white' }}>Africa</text>
              <text x="760" y="220" fill="#1E3A5F" fontSize="24" fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 0 4px white, 0 0 4px white' }}>Asia</text>
              <text x="870" y="470" fill="#1E3A5F" fontSize="18" fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 0 4px white, 0 0 4px white' }}>Oceania</text>
            </>
          )}

          {showCityMarker && currentCity && (
            <>
              {(() => {
                const pos = getCityMarkerPosition(currentCity.continent);
                if (!pos) return null;
                return (
                  <g className="pointer-events-none">
                    <circle cx={pos.x} cy={pos.y} r="18" fill="#3B82F6" stroke="#fff" strokeWidth="4" />
                    <circle cx={pos.x} cy={pos.y} r="7" fill="#fff" />
                    <text 
                      x={pos.x} 
                      y={pos.y - 30} 
                      fill="#1E40AF" 
                      fontSize="18" 
                      fontWeight="bold" 
                      textAnchor="middle"
                      style={{ textShadow: '0 0 4px white, 0 0 4px white, 0 0 4px white' }}
                    >
                      {currentCity.city}
                    </text>
                  </g>
                );
              })()}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

export default function MapMe() {
  const [location, navigate] = useLocation();
  const { addStars, syncStatsToBackend, awardPassportStar, recordMasteryAttempt } = useUser();
  const { activeExplorer } = useExplorer();
  const { isPaidUser } = useFreeLimits();
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const mapMeReturnTo = urlParams.get('from');
  const masteryCityId = urlParams.get('masteryCity');
  const isMasteryMode = !!masteryCityId;
  const returnTo = urlParams.get('returnTo');

  useEffect(() => {
    if (isPaidUser) {
      setShowPremiumGate(false);
    } else {
      setShowPremiumGate(true);
    }
  }, [isPaidUser]);
  
  const [cities, setCities] = useState<CityForGame[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [continentStates, setContinentStates] = useState<Record<Continent, ContinentDisplayState>>(() => {
    const initial: Record<Continent, ContinentDisplayState> = {} as any;
    ALL_CONTINENTS.forEach(c => {
      initial[c] = { flash: "none", completed: false, wasCorrect: false };
    });
    return initial;
  });
  const [totalStars, setTotalStars] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [timer, setTimer] = useState(0);
  const [masteryStarAwarded, setMasteryStarAwarded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenRef = useRef<number>(-1);
  const isMountedRef = useRef(false);
  
  const currentCity = cities[currentIndex] || null;
  const isGameActive = !gameComplete && currentCity !== null && !showAnswer;
  const totalRounds = isMasteryMode ? 1 : 6;

  useEffect(() => {
    isMountedRef.current = true;
    
    if (isMasteryMode && masteryCityId) {
      // Single city mode for Passport mastery - record the attempt
      recordMasteryAttempt(masteryCityId, 2);
      setTimeout(() => syncStatsToBackend(), 500);
      
      const targetCity = allCities.find(c => c.id === masteryCityId);
      if (targetCity) {
        setCities([targetCity]);
      } else {
        // City not found, fall back to normal mode
        const shuffled = shuffleArray([...allCities]).slice(0, 6);
        setCities(shuffled);
      }
    } else {
      // Normal multi-city mode
      const shuffled = shuffleArray([...allCities]).slice(0, totalRounds);
      setCities(shuffled);
    }
    resetContinentStates();
    
    return () => {
      isMountedRef.current = false;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [masteryCityId]);

  const resetContinentStates = () => {
    const initial: Record<Continent, ContinentDisplayState> = {} as any;
    ALL_CONTINENTS.forEach(c => {
      initial[c] = { flash: "none", completed: false, wasCorrect: false };
    });
    setContinentStates(initial);
  };

  useEffect(() => {
    if (currentCity && voiceEnabled && !gameComplete && !showAnswer && hasSpokenRef.current !== currentIndex && isMountedRef.current) {
      hasSpokenRef.current = currentIndex;
      const timeout = setTimeout(() => {
        if (isMountedRef.current) {
          speakCity(currentCity.city);
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [currentCity, voiceEnabled, gameComplete, showAnswer, currentIndex]);

  useEffect(() => {
    if (isGameActive) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameActive]);

  const handleContinentSelect = useCallback((selected: Continent) => {
    if (!currentCity || gameComplete || showAnswer) return;

    if (selected === currentCity.continent) {
      soundManager.playSuccess();
      setContinentStates(prev => ({
        ...prev,
        [selected]: { flash: "green", completed: true, wasCorrect: true }
      }));
      setCorrectCount(prev => prev + 1);
      
      setTotalStars(prev => prev + 1);
      addStars(1);
      
      // Award passport mastery star 2 in mastery mode
      if (isMasteryMode && masteryCityId && !masteryStarAwarded) {
        awardPassportStar(masteryCityId, 2);
        setMasteryStarAwarded(true);
      }
      
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      setShowAnswer(true);
      
    } else {
      soundManager.playError();
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setContinentStates(prev => ({
          ...prev,
          [selected]: { ...prev[selected], flash: "red" },
          [currentCity.continent]: { flash: "orange", completed: true, wasCorrect: false }
        }));
        setWrongCount(prev => prev + 1);
        setShowAnswer(true);
        
        setTimeout(() => {
          setContinentStates(prev => ({
            ...prev,
            [selected]: { ...prev[selected], flash: "none" }
          }));
        }, 1500);
      } else if (newAttempts === 2) {
        setContinentStates(prev => ({
          ...prev,
          [selected]: { ...prev[selected], flash: "red" }
        }));
        
        setTimeout(() => {
          setContinentStates(prev => ({
            ...prev,
            [selected]: { ...prev[selected], flash: "none" }
          }));
        }, 800);
      } else {
        setContinentStates(prev => ({
          ...prev,
          [selected]: { ...prev[selected], flash: "yellow" }
        }));
        
        setTimeout(() => {
          setContinentStates(prev => ({
            ...prev,
            [selected]: { ...prev[selected], flash: "none" }
          }));
        }, 800);
      }
    }
  }, [currentCity, gameComplete, showAnswer, attempts, addStars, isMasteryMode, masteryCityId, masteryStarAwarded, awardPassportStar]);

  const handleNextCity = () => {
    if (currentIndex + 1 >= cities.length) {
      setGameComplete(true);
      recordGamePlayed(); // Track for Travel Mode reminders
      if (timerRef.current) clearInterval(timerRef.current);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      
      // In mastery mode, show the summary with passport/home buttons
      if (isMasteryMode) {
        syncStatsToBackend();
      }
    } else {
      setCurrentIndex(prev => prev + 1);
      setAttempts(0);
      setShowAnswer(false);
      resetContinentStates();
    }
  };

  const handleRepeatVoice = () => {
    if (currentCity) {
      speakCity(currentCity.city);
    }
  };

  const handlePlayAgain = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    hasSpokenRef.current = -1;
    const shuffled = shuffleArray([...allCities]).slice(0, totalRounds);
    setCities(shuffled);
    setCurrentIndex(0);
    setAttempts(0);
    resetContinentStates();
    setTotalStars(0);
    setCorrectCount(0);
    setWrongCount(0);
    setShowAnswer(false);
    setGameComplete(false);
    setShowSummary(false);
    setTimer(0);
  };

  const handleFinish = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    syncStatsToBackend();
    setGameComplete(true);
    setShowSummary(true);
  };

  const handleBackToVault = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    syncStatsToBackend();
    navigate(mapMeReturnTo || (isMasteryMode ? "/" : "/play-games"));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (showSummary) {
    const mapMeLearningPoints = [
      { emoji: "🗺️", text: "Locating cities on the world map", clueStep: "Locate" as const },
      { emoji: "🌍", text: "Learning which continent cities belong to", clueStep: "Understand" as const },
      { emoji: "🧭", text: "Building spatial awareness", clueStep: "Explore" as const },
    ];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl max-w-md w-full text-center"
        >
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Great Exploring!</h2>
          
          <div className="grid grid-cols-3 gap-3 my-6">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{correctCount}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Correct</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{wrongCount}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Missed</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-3">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totalStars}</span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Stars</div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Time: {formatTime(timer)}
          </div>

          <LearningSummary points={mapMeLearningPoints} className="mb-6" />
          
          {isMasteryMode ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Want to continue mastering this city?
              </p>
              <div className="flex flex-col gap-3">
                {returnTo === "explorer-map" ? (
                  <Button
                    onClick={() => window.location.href = `/explorer-map${masteryCityId ? `?openCity=${masteryCityId}` : ''}`}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                    data-testid="button-return-explorer-map"
                  >
                    🗺️ Return to Explorer Map
                  </Button>
                ) : returnTo === "city-hub" ? (
                  <Button
                    onClick={() => window.location.href = `/city/${masteryCityId}`}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                    data-testid="button-open-passport"
                  >
                    🏙️ Back to City
                  </Button>
                ) : (
                  <Button
                    onClick={() => window.location.href = `/?openPassport=true&openCity=${masteryCityId}`}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                    data-testid="button-open-passport"
                  >
                    🛂 Open Passport
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/"}
                  className="w-full"
                  data-testid="button-home"
                >
                  🏠 Home
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => window.location.href = "/?openPassport=true"}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                data-testid="button-open-passport"
              >
                🛂 Open Passport
              </Button>
              <Button
                onClick={handlePlayAgain}
                variant="outline"
                className="w-full"
                data-testid="button-play-again-summary"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900">
      <div className="sticky top-0 z-50 bg-blue-900/90 backdrop-blur-md border-b border-blue-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToVault}
              className="text-white/80 hover:text-white hover:bg-white/10"
              data-testid="button-back"
            >
              <X className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFinish}
              className="text-white/80 hover:text-white hover:bg-white/10 text-xs"
              data-testid="button-finish-early"
            >
              Finish
            </Button>
            <div className="text-white/80 text-sm font-mono">
              {currentIndex + 1} / {totalRounds}
            </div>
            <div className="text-white/60 text-sm">
              {Math.round((correctCount / Math.max(currentIndex + 1, 1)) * 100)}%
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-yellow-300 font-bold">{totalStars}</span>
            </div>
            <div className="text-white/80 font-mono text-sm">
              {formatTime(timer)}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={cn(
                "hover:bg-white/10 p-2",
                voiceEnabled ? "text-white/80 hover:text-white" : "text-red-400 hover:text-red-300"
              )}
              data-testid="button-mute-toggle"
              title={voiceEnabled ? "Mute voice" : "Unmute voice"}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {!gameComplete && currentCity && (
            <motion.div
              key={`city-${currentIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="text-center">
                <motion.div
                  key={currentCity.city}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg"
                >
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-600 text-sm">Find</span>
                  <span className="text-blue-800 font-bold text-xl">{currentCity.city}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRepeatVoice}
                    className={cn(
                      "p-1 h-auto",
                      voiceEnabled 
                        ? "text-blue-600 hover:text-blue-800 hover:bg-blue-100" 
                        : "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                    )}
                    data-testid="button-repeat-voice"
                    title={voiceEnabled ? "Repeat city name" : "Voice is muted"}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                </motion.div>
                
                {attempts > 0 && !showAnswer && (
                  <div className="mt-2 text-orange-300 text-sm">
                    {3 - attempts} {3 - attempts === 1 ? 'try' : 'tries'} left
                  </div>
                )}
                
                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3"
                  >
                    <span className={cn(
                      "inline-block px-4 py-2 rounded-full text-sm font-medium",
                      continentStates[currentCity.continent].wasCorrect
                        ? "bg-green-500 text-white"
                        : "bg-orange-500 text-white"
                    )}>
                      {currentCity.city} is in {CONTINENT_EMOJIS[currentCity.continent]} {currentCity.continent}!
                    </span>
                  </motion.div>
                )}
              </div>

              <WorldMap
                onSelect={handleContinentSelect}
                continentStates={continentStates}
                showLabels={showAnswer}
                showCityMarker={showAnswer}
                currentCity={currentCity}
                disabled={showAnswer}
              />

              <div className="flex flex-wrap justify-center gap-2">
                {ALL_CONTINENTS.map((continent) => (
                  <button
                    key={continent}
                    onClick={() => !showAnswer && handleContinentSelect(continent)}
                    disabled={showAnswer || continentStates[continent].completed}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border-2",
                      showAnswer || continentStates[continent].completed
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-pointer hover:scale-105",
                      continentStates[continent].flash === "green" && "bg-green-500 text-white border-green-600",
                      continentStates[continent].flash === "yellow" && "bg-yellow-400 text-yellow-900 border-yellow-500",
                      continentStates[continent].flash === "red" && "bg-red-500 text-white border-red-600",
                      continentStates[continent].flash === "orange" && "bg-orange-500 text-white border-orange-600",
                      continentStates[continent].flash === "none" && "bg-white/90 text-gray-700 border-gray-300 hover:bg-white hover:border-blue-400"
                    )}
                    data-testid={`button-continent-${continent.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span>{CONTINENT_EMOJIS[continent]}</span>
                    <span>{continent}</span>
                  </button>
                ))}
              </div>

              {showAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <Button
                    onClick={handleNextCity}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8"
                    data-testid="button-next"
                  >
                    {currentIndex + 1 >= totalRounds ? "See Results" : "Next City →"}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {gameComplete && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                {correctCount === totalRounds ? "Perfect Score!" : "Great Job!"}
              </h2>
              <p className="text-blue-200 mb-6">
                You found {correctCount} out of {totalRounds} cities!
              </p>
              
              <div className="flex items-center justify-center gap-2 mb-6">
                <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                <span className="text-4xl font-bold text-yellow-400">{totalStars}</span>
                <span className="text-yellow-200 text-lg">stars earned</span>
              </div>

              {/* What You Learned Section */}
              {cities.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-yellow-300 mb-3 flex items-center justify-center gap-2">
                    <MapPin className="w-5 h-5" /> What You Learned
                  </h3>
                  <div className="space-y-2">
                    {cities.map((city, idx) => (
                      <div key={city.id} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                        <span className="text-white font-medium">{city.city}</span>
                        <span className="text-blue-200 text-sm flex items-center gap-1">
                          {CONTINENT_EMOJIS[city.continent]} {city.continent}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                {returnTo === "explorer-map" ? (
                  <Button
                    onClick={() => window.location.href = `/explorer-map${masteryCityId ? `?openCity=${masteryCityId}` : ''}`}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                    data-testid="button-return-explorer-map"
                  >
                    🗺️ Return to Explorer Map
                  </Button>
                ) : returnTo === "city-hub" && masteryCityId ? (
                  <Button
                    onClick={() => window.location.href = `/city/${masteryCityId}`}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                    data-testid="button-open-passport"
                  >
                    🏙️ Back to City
                  </Button>
                ) : (
                  <Button
                    onClick={() => window.location.href = isMasteryMode && masteryCityId 
                      ? `/?openPassport=true&openCity=${masteryCityId}` 
                      : "/?openPassport=true"}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                    data-testid="button-open-passport"
                  >
                    🛂 Open Passport
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleFinish}
                  className="w-full border-white/30 text-white hover:bg-white/10"
                  data-testid="button-finish"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  See Summary
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <GeoPassModal
        isOpen={showPremiumGate}
        onClose={() => {
          setShowPremiumGate(false);
          navigate('/play-games');
        }}
      />
    </div>
  );
}
