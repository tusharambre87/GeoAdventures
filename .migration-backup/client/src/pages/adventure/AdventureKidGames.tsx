import { useState, useRef } from "react";
import { useAdventureShell } from "./AdventureShell";
import { useTravel } from "@/lib/travelContext";
import { useLocation } from "wouter";
import { navPush } from "@/lib/nav";
import { PlayTogether } from "@/components/PlayTogether";
import { ArrowLeft, ChevronLeft, ChevronRight, Gamepad2, Compass, BookOpen, MoreHorizontal, Play } from "lucide-react";
import { motion } from "framer-motion";

const RECOMMENDED_GAMES = [
  {
    id: "daily-quest",
    title: "Daily Quest",
    subtitle: "New every day",
    emoji: "📅",
    getUrl: (returnTo: string) => `/daily-quest?from=${encodeURIComponent(returnTo)}`,
  },
  {
    id: "crossworld",
    title: "CrossWorld",
    subtitle: "World puzzles",
    emoji: "🧩",
    getUrl: (returnTo: string) => `/crossworld?from=${encodeURIComponent(returnTo)}`,
  },
  {
    id: "memory-match",
    title: "Memory Match",
    subtitle: "Find the pairs",
    emoji: "🧠",
    getUrl: (returnTo: string) => `/mini-games?game=memory-match&from=${encodeURIComponent(returnTo)}`,
  },
  {
    id: "flag-quiz",
    title: "Flag Quiz",
    subtitle: "Guess the flag",
    emoji: "🏳️",
    getUrl: (returnTo: string) => `/mini-games?game=flag-quiz&from=${encodeURIComponent(returnTo)}`,
  },
];

type GameId = 'think-fast' | 'scavenger-hunt' | 'whats-in-my-bag' | 'geoguess' | 'geospy';

interface CardTheme {
  gradientFrom: string;
  gradientTo: string;
  glossFrom: string;
  iconBg: string;
  borderGlow: string;
}

const CARD_THEMES: Record<GameId, CardTheme> = {
  "think-fast": {
    gradientFrom: "#FFF8E1",
    gradientTo: "#FFFDF5",
    glossFrom: "rgba(255,248,225,0.7)",
    iconBg: "#FFF2E7",
    borderGlow: "0 0 0 1px rgba(255,200,100,0.15), 0 10px 30px rgba(0,0,0,0.07)",
  },
  "scavenger-hunt": {
    gradientFrom: "#E0F2F1",
    gradientTo: "#F0F9F8",
    glossFrom: "rgba(224,242,241,0.7)",
    iconBg: "#FFF2E7",
    borderGlow: "0 0 0 1px rgba(128,203,196,0.2), 0 10px 30px rgba(0,0,0,0.07)",
  },
  "whats-in-my-bag": {
    gradientFrom: "#FFF3E0",
    gradientTo: "#FFFAF4",
    glossFrom: "rgba(255,243,224,0.7)",
    iconBg: "#FFF2E7",
    borderGlow: "0 0 0 1px rgba(255,183,77,0.15), 0 10px 30px rgba(0,0,0,0.07)",
  },
  "geoguess": {
    gradientFrom: "#E8EAF6",
    gradientTo: "#F5F5FC",
    glossFrom: "rgba(232,234,246,0.7)",
    iconBg: "#EDE7F6",
    borderGlow: "0 0 0 1px rgba(159,168,218,0.15), 0 10px 30px rgba(0,0,0,0.07)",
  },
  "geospy": {
    gradientFrom: "#FCE4EC",
    gradientTo: "#FFF5F7",
    glossFrom: "rgba(252,228,236,0.7)",
    iconBg: "#FCE4EC",
    borderGlow: "0 0 0 1px rgba(240,152,177,0.15), 0 10px 30px rgba(0,0,0,0.07)",
  },
};

const GAME_CARDS: { id: GameId; title: string; description: string; emoji: string }[] = [
  {
    id: "think-fast",
    title: "Think Fast!",
    description: "Name 10 things in 30 seconds",
    emoji: "⚡",
  },
  {
    id: "scavenger-hunt",
    title: "Scavenger Hunt",
    description: "Explore together and see what you notice",
    emoji: "🔍",
  },
  {
    id: "whats-in-my-bag",
    title: "What's In My Bag",
    description: "Family memory game — listen and repeat together",
    emoji: "👜",
  },
  {
    id: "geoguess",
    title: "GeoGuess",
    description: "Ask questions to figure out the mystery place",
    emoji: "🌍",
  },
  {
    id: "geospy",
    title: "GeoSpy",
    description: "Look around and notice the world together",
    emoji: "👁️",
  },
];

export default function AdventureKidGames() {
  const { tripId } = useAdventureShell();
  const { currentTrip, currentTripStops } = useTravel();
  const [, setLocation] = useLocation();
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!currentTrip || currentTrip.id !== tripId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="kid-games-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7A1A] mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading games...</p>
        </div>
      </div>
    );
  }

  const playsLeft = 5;
  const handlePrev = () => setActiveCardIndex((prev) => Math.max(0, prev - 1));
  const handleNext = () => setActiveCardIndex((prev) => Math.min(GAME_CARDS.length - 1, prev + 1));

  if (activeGame) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-56px)]" data-testid="kid-games-page">
        <div className="px-6 pt-4 pb-2">
          <button
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-1.5 text-[#FF7A1A] text-sm font-medium"
            data-testid="button-back-to-games"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </button>
        </div>
        <div className="flex-1 pb-20 px-4">
          <PlayTogether
            tripId={currentTrip.id}
            destination={currentTrip.destination}
            city={currentTrip.city || undefined}
            country={currentTrip.country || undefined}
            isActiveTrip={currentTrip.status !== 'completed'}
            userId={currentTrip.userId}
            stopNames={currentTripStops.map(s => s.name)}
            initialGame={activeGame}
            onInitialGameDismissed={() => setActiveGame(null)}
          />
        </div>
      </div>
    );
  }

  const returnUrl = `/adventure/${tripId}/kid/games`;

  return (
    <div className="flex flex-col bg-[#F6F7F9] pb-[72px]" data-testid="kid-games-page">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-2 pb-3"
      >
        <h1 className="text-[28px] font-bold text-[#111827] italic tracking-tight leading-tight" data-testid="text-games-title">Journey Games</h1>
        <p className="text-[15px] text-[#6B7280] mt-1">Quick games for fun learning moments</p>
      </motion.div>

      <div className="relative px-4">
        <div className="overflow-hidden" ref={scrollRef}>
          <motion.div
            className="flex gap-4 px-2"
            animate={{ x: `-${activeCardIndex * 88}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            {GAME_CARDS.map((card, index) => {
              const isActive = index === activeCardIndex;
              const theme = CARD_THEMES[card.id];
              return (
                <motion.div
                  key={card.id}
                  className={`shrink-0 w-[85%] rounded-[28px] overflow-hidden transition-all ${
                    isActive ? 'opacity-100' : 'opacity-60'
                  }`}
                  style={{
                    boxShadow: isActive
                      ? theme.borderGlow
                      : '0 4px 12px rgba(0,0,0,0.04)',
                  }}
                  animate={{ scale: isActive ? 1 : 0.93 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  data-testid={`game-card-${card.id}`}
                >
                  <div
                    className="relative p-6 min-h-[210px] flex flex-col rounded-[28px] overflow-hidden"
                    style={{
                      background: `linear-gradient(180deg, ${theme.gradientFrom} 0%, ${theme.gradientTo} 100%)`,
                    }}
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: theme.iconBg }}
                      >
                        <span className="text-2xl">{card.emoji}</span>
                      </div>
                      <span
                        className="text-xs font-medium px-3 py-1.5 rounded-full"
                        style={{ background: '#FFE8D9', color: '#FF7A1A' }}
                      >
                        {playsLeft} left
                      </span>
                    </div>

                    <h3 className="text-[22px] font-bold text-[#111827] mb-1">{card.title}</h3>
                    <p className="text-[16px] text-[#6B7280] mb-6 leading-relaxed">{card.description}</p>

                    <div className="mt-auto">
                      <button
                        onClick={() => setActiveGame(card.id)}
                        className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm active:scale-95 transition-transform"
                        style={{
                          background: '#FF7A1A',
                          boxShadow: '0 8px 20px rgba(255,122,26,0.35)',
                        }}
                        data-testid={`button-play-${card.id}`}
                      >
                        Play Now
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        <button
          onClick={handlePrev}
          disabled={activeCardIndex === 0}
          className={`absolute left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center z-10 transition-opacity ${
            activeCardIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          data-testid="button-carousel-prev"
        >
          <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
        </button>
        <button
          onClick={handleNext}
          disabled={activeCardIndex === GAME_CARDS.length - 1}
          className={`absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center z-10 transition-opacity ${
            activeCardIndex === GAME_CARDS.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          data-testid="button-carousel-next"
        >
          <ChevronRight className="w-4 h-4 text-[#6B7280]" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 pt-3 pb-1">
        {GAME_CARDS.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveCardIndex(index)}
            className="rounded-full transition-all"
            style={{
              width: index === activeCardIndex ? '22px' : '6px',
              height: '6px',
              background: index === activeCardIndex ? '#FF7A1A' : '#D1D5DB',
            }}
            data-testid={`dot-${index}`}
          />
        ))}
      </div>

      <div className="px-6 pt-3">
        <h2 className="text-[22px] font-bold text-[#111827]" data-testid="text-recommended-games">Recommended Games</h2>
        <p className="text-[15px] text-[#6B7280] mt-0.5 mb-2">Discover more activities</p>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          {RECOMMENDED_GAMES.map((game) => (
            <motion.button
              key={game.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => navPush(setLocation, game.getUrl(returnUrl))}
              className="shrink-0 w-[170px] bg-white rounded-[22px] p-[18px] text-left"
              style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}
              data-testid={`recommended-game-${game.id}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#F6F7F9] flex items-center justify-center shrink-0">
                  <span className="text-lg">{game.emoji}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[14px] text-[#111827] truncate leading-tight">{game.title}</h3>
                  <p className="text-[12px] text-[#6B7280] truncate">{game.subtitle}</p>
                </div>
              </div>
              <div
                className="flex items-center justify-center gap-1 w-full py-2 rounded-full text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                style={{
                  background: '#FF7A1A',
                  boxShadow: '0 4px 12px rgba(255,122,26,0.25)',
                }}
                data-testid={`button-recommended-play-${game.id}`}
              >
                Play
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Sticky: Hand back to parent */}
      <div className="fixed bottom-[100px] left-0 right-0 flex justify-center z-30 pointer-events-none">
        <button
          onClick={() => {
            try {
              const url = sessionStorage.getItem(`kidHandoffReturn-${tripId}`);
              setLocation(url ?? `/adventure/${tripId}/today`);
            } catch {
              setLocation(`/adventure/${tripId}/today`);
            }
          }}
          className="pointer-events-auto text-xs font-semibold text-slate-500 bg-white/90 border border-slate-200 rounded-full px-5 py-2 shadow-sm hover:bg-slate-50 transition-colors"
          data-testid="button-hand-back-to-parent"
        >
          Hand back to parent
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center z-30 pb-2 pointer-events-none">
        <div
          className="flex items-center justify-around py-3 px-6 bg-white pointer-events-auto"
          style={{
            width: '90%',
            maxWidth: '380px',
            borderRadius: '30px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          }}
        >
          <button className="flex flex-col items-center gap-0.5" data-testid="nav-games">
            <Gamepad2 className="w-5 h-5 text-[#FF7A1A]" />
            <span className="text-[11px] font-bold text-[#FF7A1A]">Games</span>
          </button>
          <button
            onClick={() => navPush(setLocation, `/adventure/${tripId}/kid/explore-city`)}
            className="flex flex-col items-center gap-0.5"
            data-testid="nav-explore"
          >
            <Compass className="w-5 h-5 text-[#9CA3AF]" />
            <span className="text-[11px] font-medium text-[#9CA3AF]">Explore</span>
          </button>
          <button
            onClick={() => navPush(setLocation, `/adventure/${tripId}/kid/next`)}
            className="flex flex-col items-center gap-0.5"
            data-testid="nav-story"
          >
            <BookOpen className="w-5 h-5 text-[#9CA3AF]" />
            <span className="text-[11px] font-medium text-[#9CA3AF]">Story</span>
          </button>
          <button
            onClick={() => navPush(setLocation, `/adventure/${tripId}/kid`)}
            className="flex flex-col items-center gap-0.5"
            data-testid="nav-more"
          >
            <MoreHorizontal className="w-5 h-5 text-[#9CA3AF]" />
            <span className="text-[11px] font-medium text-[#9CA3AF]">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}
