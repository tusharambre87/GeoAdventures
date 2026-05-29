import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gamepad2, 
  Trophy,
  Star,
  ArrowLeft,
  Compass,
  Target,
  ChevronRight,
  RotateCw,
  X,
  Lock,
  Crown,
  HelpCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExplorerXPBar } from "@/components/ExplorerXPBar";
import { useExplorer } from "@/lib/explorerContext";
import { useUser } from "@/lib/userContext";
import { getSpins, spendSpin, checkDailyLoginSpin } from "@/lib/spinSystem";
import { ELITE_XP_THRESHOLD } from "@shared/schema";
import { SignUpPrompt } from "@/components/SignUpPrompt";
import { GeoBuddyCharacter } from "@/components/GeoBuddyCharacter";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { GeoPassModal } from "@/components/GeoPassModal";

interface WheelGame {
  id: string;
  name: string;
  description: string;
  route: string;
  color: string;
  textColor: string;
  icon: string;
  xp: number;
}

const WHEEL_GAMES: WheelGame[] = [
  { id: "guess-and-go", name: "Guess & Go", description: "Classic trivia mode. How fast can you identify world cities?", route: "/play", color: "#3B82F6", textColor: "#fff", icon: "🌍", xp: 20 },
  { id: "crossworld", name: "CrossWorld", description: "Daily word search with a geographical twist!", route: "/crossworld", color: "#8B5CF6", textColor: "#fff", icon: "🔍", xp: 10 },
  { id: "memory-match", name: "Memory Match", description: "Test your memory by matching cities with landmarks.", route: "/mini-games?game=memory-match&from=/play-games", color: "#EC4899", textColor: "#fff", icon: "🧠", xp: 10 },
  { id: "map-me", name: "Map Me", description: "Match cities to their continents on the world map.", route: "/map-me?from=/play-games", color: "#10B981", textColor: "#fff", icon: "🗺️", xp: 15 },
  { id: "flag-quiz", name: "Flag Quiz", description: "How many world flags do you know?", route: "/mini-games?game=flag-quiz&from=/play-games", color: "#EF4444", textColor: "#fff", icon: "🏳️", xp: 10 },
  { id: "spell-geo", name: "Spell Geo", description: "Learn to spell US state names in this fun challenge.", route: "/spell-geo?from=/play-games", color: "#EAB308", textColor: "#1a1a1a", icon: "✏️", xp: 10 },
  { id: "geo-art", name: "Geo Art Studio", description: "Get creative! Color and decorate world flags.", route: "/geo-art?from=/play-games", color: "#F97316", textColor: "#fff", icon: "🎨", xp: 10 },
  { id: "find-my-home", name: "Find My Home", description: "Help cute animals find their way back to their home countries.", route: "/find-my-home?from=/play-games", color: "#6366F1", textColor: "#fff", icon: "🏠", xp: 15 },
  { id: "geo-maze", name: "Geo Maze", description: "Navigate through mazes to find the correct flag!", route: "/geo-maze?from=/play-games", color: "#84CC16", textColor: "#1a1a1a", icon: "🏁", xp: 15 },
  { id: "compass-quest", name: "Compass Quest", description: "Follow clues and use your compass to find hidden treasures!", route: "/compass-quest?from=/play-games", color: "#D97706", textColor: "#fff", icon: "🧭", xp: 10 },
];

const EXTRA_GAMES = [
  { id: "spin-the-globe", name: "Spin the Globe", description: "Spin and win! A fast-paced globe-trotting quiz.", route: "/spin-the-world?from=/play-games", color: "bg-teal-500", icon: "🌐", xp: 5 },
  { id: "city-vibe", name: "City Vibe", description: "Identify cities by their unique style and personality.", route: "/mini-games?game=city-vibe&from=/play-games", color: "bg-pink-500", icon: "✨", xp: 10 },
];

const HOW_TO_PLAY: Record<string, { steps: string[]; tip: string }> = {
  "guess-and-go": {
    steps: ["Look at the clues about a world city", "Answer correctly and complete bonus rounds", "Complete missions to earn stars", "First to reach 10 stars wins!"],
    tip: "Answer bonus rounds and missions for extra stars!"
  },
  "memory-match": {
    steps: ["Cards are placed face down on the board", "Flip two cards at a time to find matching pairs", "Match a city with its famous landmark", "Find all pairs to complete the round!"],
    tip: "Try to remember where each card is when you flip it."
  },
  "crossworld": {
    steps: ["Choose Easy or Hard mode to start", "Find hidden capital city names in the letter grid", "Swipe across letters to select a word", "Use hints for help or cheat to reveal a word!"],
    tip: "Easy mode shows the countries — Hard mode is a real challenge!"
  },
  "map-me": {
    steps: ["A city name appears on the screen", "Look at the world map below", "Tap the correct continent where the city belongs", "Get as many right as you can!"],
    tip: "Think about which part of the world each city is in."
  },
  "flag-quiz": {
    steps: ["A country flag appears on the screen", "Look at the flag's colors and design", "Choose the correct country name", "Learn flags from around the world!"],
    tip: "Pay attention to the unique patterns and colors on each flag."
  },
  "spin-the-globe": {
    steps: ["Spin the globe and land on a continent", "Answer a few questions about that continent", "Master all the questions to conquer it", "Spin again to explore the next continent!"],
    tip: "Focus on one continent at a time to master them all!"
  },
  "spell-geo": {
    steps: ["A US state name is shown with missing letters", "Type in the correct spelling", "Get it right to earn points", "Learn to spell all 50 states!"],
    tip: "Sound out the name in your head to help with spelling."
  },
  "city-vibe": {
    steps: ["Read the description of a city's vibe and culture", "Feel the personality of the city described", "Pick which city matches the description", "Discover what makes each city unique!"],
    tip: "Think about what each city is famous for — food, music, landmarks!"
  },
  "geo-maze": {
    steps: ["Navigate through the maze on screen", "Find the path to the correct flag", "Avoid dead ends and wrong turns", "Reach the finish to earn XP!"],
    tip: "Plan your route before you start moving."
  },
  "find-my-home": {
    steps: ["A cute animal appears on the screen", "Read which country the animal lives in", "Tap the correct spot on the map", "Help all the animals find their homes!"],
    tip: "Think about what climate and habitat each animal needs."
  },
  "geo-art": {
    steps: ["Pick a world flag to color", "Use the color palette to fill in each section", "Match the real flag colors or get creative", "Save your masterpiece when done!"],
    tip: "Look at the real flag first, then have fun with your own version."
  },
  "compass-quest": {
    steps: ["Read the clue and guess which city comes next", "Use the compass to pick the right direction", "Travel to the city and collect a fragment", "Find all fragments to complete the quest!"],
    tip: "Pay attention to compass directions — North, South, East, West and in between!"
  },
};

function ConfettiBurst() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    color: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'][i % 8],
    angle: (i / 24) * 360,
    distance: 60 + Math.random() * 80,
    size: 4 + Math.random() * 6,
    delay: Math.random() * 0.15,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance + 30,
            scale: 0,
            rotate: Math.random() * 360,
          }}
          transition={{ duration: 0.8, delay: p.delay, ease: "easeOut" }}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: '50%',
            top: '40%',
          }}
        />
      ))}
    </div>
  );
}

function SpinWheel({ onResult, spinsLeft, onSpinUsed }: { 
  onResult: (game: WheelGame) => void; 
  spinsLeft: number;
  onSpinUsed: () => void;
}) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const segmentAngle = 360 / WHEEL_GAMES.length;

  useEffect(() => {
    drawWheel();
  }, []);

  function drawWheel() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();

    WHEEL_GAMES.forEach((game, i) => {
      const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = game.color;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      const midAngle = (startAngle + endAngle) / 2;
      const iconDist = radius * 0.62;
      const textDist = radius * 0.82;
      const iconX = center + Math.cos(midAngle) * iconDist;
      const iconY = center + Math.sin(midAngle) * iconDist;
      const textX = center + Math.cos(midAngle) * textDist;
      const textY = center + Math.sin(midAngle) * textDist;

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(game.icon, iconX, iconY);

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.font = 'bold 7.5px system-ui, sans-serif';
      ctx.fillStyle = game.textColor;
      ctx.textAlign = 'center';
      const words = game.name.split(' ');
      if (words.length > 1 && game.name.length > 8) {
        ctx.fillText(words.slice(0, Math.ceil(words.length / 2)).join(' '), 0, -5);
        ctx.fillText(words.slice(Math.ceil(words.length / 2)).join(' '), 0, 5);
      } else {
        ctx.fillText(game.name, 0, 0);
      }
      ctx.restore();
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(center, center, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const spin = useCallback(() => {
    if (spinning || spinsLeft <= 0) return;
    setSpinning(true);
    onSpinUsed();

    const winIndex = Math.floor(Math.random() * WHEEL_GAMES.length);
    const targetAngle = 360 - (winIndex * segmentAngle + segmentAngle / 2);
    const totalRotation = 360 * 5 + targetAngle;
    const newRotation = rotation + totalRotation;
    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      onResult(WHEEL_GAMES[winIndex]);
    }, 3000);
  }, [spinning, rotation, segmentAngle, onResult, spinsLeft, onSpinUsed]);

  return (
    <div className="flex flex-col items-center" data-testid="spin-wheel-section">
      <div className="relative" style={{ width: 300, height: 300 }}>
        <div
          className="absolute top-[-16px] left-1/2 -translate-x-1/2 z-20"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
        >
          <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-red-500" />
        </div>

        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 3, ease: [0.2, 0.8, 0.3, 1] }}
          className="w-full h-full"
          style={{ transformOrigin: 'center center' }}
        >
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="w-full h-full rounded-full"
            style={{ filter: spinning ? 'drop-shadow(0 0 20px rgba(99,102,241,0.4))' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
          />
        </motion.div>

        <button
          onClick={spin}
          disabled={spinning || spinsLeft <= 0}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-20 h-20 rounded-full bg-white shadow-xl border-3 border-slate-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          data-testid="button-spin"
        >
          <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
            <defs>
              <path id="spinArc" d="M 40,40 m -24,0 a 24,24 0 1,1 48,0" fill="none" />
            </defs>
            {!spinning && (
              <text className="fill-indigo-600 font-black" style={{ fontSize: '13px', letterSpacing: '3px' }}>
                <textPath href="#spinArc" startOffset="50%" textAnchor="middle">
                  SPIN
                </textPath>
              </text>
            )}
          </svg>
          {spinning ? (
            <RotateCw className="w-6 h-6 text-indigo-500 animate-spin" />
          ) : (
            <Compass className="w-6 h-6 text-indigo-600 mt-2 animate-[spin_8s_linear_infinite]" />
          )}
        </button>
      </div>

      {!spinning && spinsLeft > 0 && (
        <p className="mt-3 text-sm text-slate-400 dark:text-slate-500 font-medium">Tap the wheel to spin!</p>
      )}
      {!spinning && spinsLeft <= 0 && (
        <p className="mt-3 text-sm text-slate-400 dark:text-slate-500 font-medium">Play quests and explore to earn more spins!</p>
      )}
    </div>
  );
}

function ChallengeResultCard({ game, isDailyBonus, onPlay, onSpinAgain, spinsLeft, showConfetti }: { 
  game: WheelGame; 
  isDailyBonus: boolean;
  onPlay: () => void;
  onSpinAgain: () => void;
  spinsLeft: number;
  showConfetti: boolean;
}) {
  const xpReward = isDailyBonus ? game.xp * 2 : game.xp;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className="relative"
      data-testid="challenge-result-card"
    >
      {showConfetti && <ConfettiBurst />}
      <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-800 relative z-10">
        <CardContent className="p-0">
          <div className="p-6 text-center" style={{ backgroundColor: game.color + '15' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1, damping: 10 }}
              className="text-3xl mb-1"
            >
              🎉
            </motion.div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="w-5 h-5" style={{ color: game.color }} />
              <p className="text-sm font-bold uppercase tracking-wider" style={{ color: game.color }} data-testid="challenge-label">
                Today's Challenge
              </p>
            </div>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.2, damping: 12 }}
              className="text-5xl mb-3"
            >
              {game.icon}
            </motion.div>
            <motion.h3
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-black text-slate-900 dark:text-white mb-2"
              data-testid="challenge-game-name"
            >
              {game.name}
            </motion.h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">{game.description}</p>
          </div>
          <div className="p-6 space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="flex items-center justify-center gap-2"
            >
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 rounded-full border border-amber-200 dark:border-amber-700">
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400" data-testid="challenge-xp-reward">
                  +{xpReward} XP {isDailyBonus && '(2x Bonus!)'}
                </p>
              </div>
            </motion.div>
            <Button
              onClick={onPlay}
              className="w-full h-14 rounded-2xl text-lg font-bold text-white shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: game.color }}
              data-testid="button-play-challenge"
            >
              Play Now <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
            {spinsLeft > 0 && (
              <button
                onClick={onSpinAgain}
                className="w-full text-center text-sm text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold transition-colors py-2"
                data-testid="button-spin-again"
              >
                <RotateCw className="w-3.5 h-3.5 inline mr-1" /> Spin Again ({spinsLeft} {spinsLeft === 1 ? 'spin' : 'spins'} left)
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const PREMIUM_SPIN_GAME_IDS = ['flag-quiz', 'map-me', 'spin-the-globe'];

export default function PlayGames() {
  const [, setLocation] = useLocation();
  const [selectedGame, setSelectedGame] = useState<WheelGame | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [howToPlayGame, setHowToPlayGame] = useState<string | null>(null);
  const [showBuddy, setShowBuddy] = useState(() => {
    return localStorage.getItem('geoquest_play_buddy_dismissed') !== 'true';
  });
  const { activeExplorer, loadExplorers } = useExplorer();
  const { user, login } = useUser();
  const explorerId = activeExplorer?.id;
  const isGuest = !user;

  const { isPaidUser } = useFreeLimits();
  const [showGeoPassModal, setShowGeoPassModal] = useState(false);
  const [spinsLeft, setSpinsLeft] = useState(() => getSpins(explorerId));

  const isChampionRank = (activeExplorer?.totalXp || 0) >= ELITE_XP_THRESHOLD;

  useEffect(() => {
    const awarded = checkDailyLoginSpin(explorerId, isChampionRank);
    if (awarded) {
      setSpinsLeft(getSpins(explorerId, isChampionRank));
    }
  }, [explorerId, isChampionRank]);

  useEffect(() => {
    setSpinsLeft(getSpins(explorerId, isChampionRank));
  }, [explorerId, isChampionRank]);

  useEffect(() => {
    const handleSpinEarned = () => {
      setSpinsLeft(getSpins(explorerId));
    };
    window.addEventListener('geoquest:spin-earned', handleSpinEarned);
    window.addEventListener('geoquest:spins-updated', handleSpinEarned);
    return () => {
      window.removeEventListener('geoquest:spin-earned', handleSpinEarned);
      window.removeEventListener('geoquest:spins-updated', handleSpinEarned);
    };
  }, [explorerId]);

  const isDailyBonus = useCallback(() => {
    const lastSpin = localStorage.getItem('geoquest_last_spin_date');
    const today = new Date().toDateString();
    return lastSpin !== today;
  }, []);

  const [dailyBonusActive] = useState(isDailyBonus());

  const handleSpinUsed = useCallback(() => {
    spendSpin(explorerId);
    setSpinsLeft(getSpins(explorerId));
    localStorage.setItem('geoquest_last_spin_date', new Date().toDateString());
  }, [explorerId]);

  const restoreSpin = useCallback(() => {
    const id = explorerId || 'guest';
    const key = `geoquest_spins_${id}`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(current + 1));
    setSpinsLeft(current + 1);
  }, [explorerId]);

  const handleSpinResult = useCallback((game: WheelGame) => {
    setSelectedGame(game);
    if (!isPaidUser && PREMIUM_SPIN_GAME_IDS.includes(game.id)) {
      restoreSpin();
      setShowGeoPassModal(true);
      return;
    }
    setShowResult(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1200);
    const remaining = getSpins(explorerId);
    if (remaining <= 0 && isGuest) {
      setTimeout(() => setShowSignUp(true), 1500);
    }
  }, [explorerId, isGuest, isPaidUser, restoreSpin]);

  const handleSpinAgain = useCallback(() => {
    setShowResult(false);
    setSelectedGame(null);
    setShowConfetti(false);
  }, []);

  const orderedGames: { game: typeof WHEEL_GAMES[0] | typeof EXTRA_GAMES[0]; featured?: boolean }[] = [
    { game: WHEEL_GAMES.find(g => g.id === 'guess-and-go')!, featured: true },
    { game: WHEEL_GAMES.find(g => g.id === 'compass-quest')!, featured: true },
    { game: WHEEL_GAMES.find(g => g.id === 'memory-match')! },
    { game: WHEEL_GAMES.find(g => g.id === 'crossworld')! },
    { game: WHEEL_GAMES.find(g => g.id === 'map-me')! },
    { game: WHEEL_GAMES.find(g => g.id === 'flag-quiz')! },
    { game: EXTRA_GAMES.find(g => g.id === 'spin-the-globe')! },
    { game: WHEEL_GAMES.find(g => g.id === 'spell-geo')! },
    { game: EXTRA_GAMES.find(g => g.id === 'city-vibe')! },
    { game: WHEEL_GAMES.find(g => g.id === 'geo-maze')! },
    { game: WHEEL_GAMES.find(g => g.id === 'find-my-home')! },
    { game: WHEEL_GAMES.find(g => g.id === 'geo-art')! },
  ].filter(item => item.game);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-700 dark:from-indigo-800 dark:via-purple-800 dark:to-indigo-900 px-6 pt-6 pb-10">
        <div className="max-w-lg mx-auto">
          <Link href="/">
            <button className="flex items-center gap-1 text-sm text-white/60 hover:text-white font-bold mb-4 transition-colors" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
              <Gamepad2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight" data-testid="text-play-title">Play</h1>
            </div>
          </div>
          <p className="text-white/70 font-medium text-sm ml-1">Explorer Arcade — Earn XP and master the world</p>
          <div className="mt-4">
            <ExplorerXPBar />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-8">
        <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="text-2xl">🎡</span> Spin for a Challenge
            </h3>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-200 dark:border-indigo-700" data-testid="spins-counter">
              <Star className="w-4 h-4 text-indigo-500 fill-indigo-500" />
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{spinsLeft}</span>
              <span className="text-xs text-indigo-400 dark:text-indigo-500">spins</span>
            </div>
          </div>

          {dailyBonusActive && !showResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full shadow-sm text-center"
            >
              <p className="text-xs font-bold text-amber-900 flex items-center justify-center gap-1.5" data-testid="daily-bonus-badge">
                <Star className="w-3.5 h-3.5 fill-amber-900" /> Daily Bonus Spin — 2x XP!
              </p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {!showResult ? (
              <motion.div key="wheel" exit={{ opacity: 0, scale: 0.8 }}>
                <SpinWheel 
                  onResult={handleSpinResult} 
                  spinsLeft={spinsLeft}
                  onSpinUsed={handleSpinUsed}
                />
              </motion.div>
            ) : selectedGame && (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ChallengeResultCard
                  game={selectedGame}
                  isDailyBonus={dailyBonusActive}
                  onPlay={() => setLocation(selectedGame.route)}
                  onSpinAgain={handleSpinAgain}
                  spinsLeft={spinsLeft}
                  showConfetti={showConfetti}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {spinsLeft <= 0 && !showResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl text-center"
            >
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">Need more spins?</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                Complete daily quests, discover new cities, or finish adventures to earn more!
              </p>
            </motion.div>
          )}
        </section>

        <section>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Your Games
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {orderedGames.map(({ game, featured }) => {
              const bgColor = game.color.startsWith('#') ? game.color : undefined;
              const bgClass = game.color.startsWith('bg-') ? game.color : undefined;
              const icon = typeof game.icon === 'string' ? game.icon : '🎮';
              const xp = 'xp' in game ? (game as WheelGame).xp : undefined;

              return (
                <motion.div
                  key={game.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setLocation(game.route)}
                  className={`cursor-pointer ${featured ? 'col-span-2' : ''}`}
                  data-testid={`card-game-${game.id}`}
                >
                  <Card className="border-none shadow-md hover:shadow-lg transition-all rounded-2xl overflow-hidden bg-white dark:bg-slate-800 relative">
                    {HOW_TO_PLAY[game.id] && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setHowToPlayGame(game.id); }}
                        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center hover:bg-white/50 transition-colors"
                        data-testid={`button-how-to-play-${game.id}`}
                      >
                        <HelpCircle className="w-4 h-4 text-white drop-shadow-sm" />
                      </button>
                    )}
                    <CardContent className="p-0">
                      {featured ? (
                        <div
                          className={`h-28 flex items-center gap-4 px-6 text-white ${bgClass || ''}`}
                          style={bgColor ? { backgroundColor: bgColor } : undefined}
                        >
                          <span className="text-5xl">{icon}</span>
                          <div>
                            <h4 className="text-xl font-black text-white">{game.name}</h4>
                            <p className="text-white/80 text-sm">{game.description}</p>
                            {xp && <p className="text-xs font-bold text-white/70 mt-1">+{xp} XP</p>}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`h-20 flex items-center justify-center text-white ${bgClass || ''}`}
                            style={bgColor ? { backgroundColor: bgColor } : undefined}
                          >
                            <span className="text-3xl">{icon}</span>
                          </div>
                          <div className="p-3">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{game.name}</h4>
                            {xp && (
                              <p className="text-[10px] font-semibold text-amber-500 mt-0.5">+{xp} XP</p>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

        </section>
      </div>

      <AnimatePresence>
        {howToPlayGame && HOW_TO_PLAY[howToPlayGame] && (() => {
          const gameData = [...WHEEL_GAMES, ...EXTRA_GAMES].find(g => g.id === howToPlayGame);
          const howTo = HOW_TO_PLAY[howToPlayGame];
          const gameIcon = gameData ? (typeof gameData.icon === 'string' ? gameData.icon : '🎮') : '🎮';
          return (
            <motion.div
              key="how-to-play"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setHowToPlayGame(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 relative"
                onClick={(e) => e.stopPropagation()}
                data-testid="modal-how-to-play"
              >
                <button
                  onClick={() => setHowToPlayGame(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  data-testid="button-close-how-to-play"
                >
                  <X className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                </button>
                <div className="text-center mb-5">
                  <span className="text-4xl block mb-2">{gameIcon}</span>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">How to Play</h3>
                  <p className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">{gameData?.name}</p>
                </div>
                <ol className="space-y-3 mb-5">
                  {howTo.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Pro Tip
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-300 mt-1 leading-relaxed">{howTo.tip}</p>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {showBuddy && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed bottom-24 right-4 z-40 flex items-end gap-2"
            data-testid="geobuddy-play-prompt"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-br-md shadow-xl border border-slate-200 dark:border-slate-700 px-4 py-3 max-w-[200px] relative">
              <button
                onClick={() => {
                  setShowBuddy(false);
                  localStorage.setItem('geoquest_play_buddy_dismissed', 'true');
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-full flex items-center justify-center transition-colors"
                data-testid="button-dismiss-play-buddy"
              >
                <X className="w-3 h-3 text-slate-500 dark:text-slate-300" />
              </button>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">
                Spin the wheel to earn more XP.
              </p>
            </div>
            <GeoBuddyCharacter pose="greeting" size="md" showGlow={false} />
          </motion.div>
        )}
      </AnimatePresence>

      <GeoPassModal
        isOpen={showGeoPassModal}
        onClose={() => setShowGeoPassModal(false)}
      />

      <SignUpPrompt
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        onLogin={async (data: any) => {
          if (typeof data === 'string') return;
          if (data.method === 'email') {
            login(data.name, data.email, undefined, data.players, {
              registrationSource: 'email',
              verified: data.verified === true,
              userId: data.userId,
            });
            setShowSignUp(false);
            localStorage.removeItem('geoquest_guest_session');
            if (data.userId) {
              try {
                const response = await fetch(`/api/explorers/user/${data.userId}`);
                if (response.ok) {
                  const loadedExplorers = await response.json();
                  if (loadedExplorers.length > 0) {
                    loadExplorers(data.userId);
                  }
                }
              } catch (e) {
                console.error('Error loading explorers after signup:', e);
              }
            }
          }
        }}
      />
    </div>
  );
}
