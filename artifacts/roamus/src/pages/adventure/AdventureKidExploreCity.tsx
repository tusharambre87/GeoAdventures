import { useState } from "react";
import { useAdventureShell } from "./AdventureShell";
import { useTravel } from "@/lib/travelContext";
import { useLocation } from "wouter";
import { navPush } from "@/lib/nav";
import { ExperienceCity } from "@/components/ExperienceCity";
import { ArrowLeft, ChevronLeft, ChevronRight, Gamepad2, Compass, BookOpen, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";

type CardType = 'food_culture' | 'hear_place' | 'everyday_life';

interface CardTheme {
  gradientFrom: string;
  gradientTo: string;
  iconBg: string;
  borderGlow: string;
}

const CARD_THEMES: Record<CardType, CardTheme> = {
  food_culture: {
    gradientFrom: "#FFF3E0",
    gradientTo: "#FFFAF4",
    iconBg: "#FFF2E7",
    borderGlow: "0 0 0 1px rgba(255,183,77,0.15), 0 10px 30px rgba(0,0,0,0.07)",
  },
  hear_place: {
    gradientFrom: "#F3E5F5",
    gradientTo: "#FAF5FC",
    iconBg: "#F3E5F5",
    borderGlow: "0 0 0 1px rgba(186,104,200,0.15), 0 10px 30px rgba(0,0,0,0.07)",
  },
  everyday_life: {
    gradientFrom: "#E0F2F1",
    gradientTo: "#F0F9F8",
    iconBg: "#E0F2F1",
    borderGlow: "0 0 0 1px rgba(128,203,196,0.2), 0 10px 30px rgba(0,0,0,0.07)",
  },
};

const EXPERIENCE_CARDS: { id: CardType; title: string; description: string; emoji: string }[] = [
  {
    id: "food_culture",
    title: "Food & Culture",
    description: "Discover local flavors and traditions",
    emoji: "🍜",
  },
  {
    id: "hear_place",
    title: "Hear the Place",
    description: "Listen to the sounds and stories of this city",
    emoji: "🎧",
  },
  {
    id: "everyday_life",
    title: "Everyday Life",
    description: "See how people live and what makes this place unique",
    emoji: "🏠",
  },
];

const RECOMMENDED_GAMES = [
  {
    id: "daily-quest",
    title: "Daily Quest",
    subtitle: "New every day",
    emoji: "📅",
    getUrl: (returnTo: string) => `/daily-quest?from=${encodeURIComponent(returnTo)}`,
  },
  {
    id: "guess-and-go",
    title: "Guess & Go",
    subtitle: "World challenge",
    emoji: "🌍",
    getUrl: (returnTo: string) => `/game?from=${encodeURIComponent(returnTo)}`,
  },
  {
    id: "geo-art-studio",
    title: "Geo Art Studio",
    subtitle: "Color & create",
    emoji: "🎨",
    getUrl: (returnTo: string) => `/geo-art?from=${encodeURIComponent(returnTo)}`,
  },
  {
    id: "flag-quiz",
    title: "Flag Quiz",
    subtitle: "Guess the flag",
    emoji: "🏳️",
    getUrl: (returnTo: string) => `/mini-games?game=flag-quiz&from=${encodeURIComponent(returnTo)}`,
  },
  {
    id: "map-me",
    title: "Map Me",
    subtitle: "Find the continent",
    emoji: "🗺️",
    getUrl: (returnTo: string) => `/map-me?from=${encodeURIComponent(returnTo)}`,
  },
];

export default function AdventureKidExploreCity() {
  const { tripId } = useAdventureShell();
  const { currentTrip } = useTravel();
  const [, setLocation] = useLocation();
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [activeExperience, setActiveExperience] = useState<CardType | null>(null);

  if (!currentTrip || currentTrip.id !== tripId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="kid-explore-city-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7A1A] mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading city adventure...</p>
        </div>
      </div>
    );
  }

  const destinationName = currentTrip.city || currentTrip.destination.split(',')[0].trim();
  const country = currentTrip.country || currentTrip.destination.split(',').slice(1).join(',').trim();

  const handlePrev = () => setActiveCardIndex((prev) => Math.max(0, prev - 1));
  const handleNext = () => setActiveCardIndex((prev) => Math.min(EXPERIENCE_CARDS.length - 1, prev + 1));

  if (activeExperience) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-56px)]" data-testid="kid-explore-city-page">
        <div className="px-6 pt-4 pb-2">
          <button
            onClick={() => setActiveExperience(null)}
            className="flex items-center gap-1.5 text-[#FF7A1A] text-sm font-medium"
            data-testid="button-back-to-explore"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Explore
          </button>
        </div>
        <div className="flex-1 pb-20 px-4">
          <ExperienceCity
            destinationName={destinationName}
            country={country}
            initialCard={activeExperience}
            onInitialCardDismissed={() => setActiveExperience(null)}
          />
        </div>
      </div>
    );
  }

  const returnUrl = `/adventure/${tripId}/kid/explore-city`;

  return (
    <div className="flex flex-col bg-[#F6F7F9] pb-[72px]" data-testid="kid-explore-city-page">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-2 pb-3"
      >
        <h1 className="text-[28px] font-bold text-[#111827] italic tracking-tight leading-tight" data-testid="text-explore-title">
          Experience {destinationName}
        </h1>
        <p className="text-[15px] text-[#6B7280] mt-1">Discover what makes this place special</p>
      </motion.div>

      <div className="relative px-4">
        <div className="overflow-hidden">
          <motion.div
            className="flex gap-4 px-2"
            animate={{ x: `-${activeCardIndex * 88}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            {EXPERIENCE_CARDS.map((card, index) => {
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
                  data-testid={`explore-card-${card.id}`}
                >
                  <div
                    className="relative p-6 min-h-[210px] flex flex-col rounded-[28px] overflow-hidden"
                    style={{
                      background: `linear-gradient(180deg, ${theme.gradientFrom} 0%, ${theme.gradientTo} 100%)`,
                    }}
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ background: theme.iconBg }}>
                      <span className="text-2xl">{card.emoji}</span>
                    </div>

                    <h3 className="text-[22px] font-bold text-[#111827] mb-1">{card.title}</h3>
                    <p className="text-[16px] text-[#6B7280] mb-6 leading-relaxed">{card.description}</p>

                    <div className="mt-auto">
                      <button
                        onClick={() => setActiveExperience(card.id)}
                        className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm active:scale-95 transition-transform"
                        style={{
                          background: '#FF7A1A',
                          boxShadow: '0 8px 20px rgba(255,122,26,0.35)',
                        }}
                        data-testid={`button-explore-${card.id}`}
                      >
                        Tap to explore
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
          data-testid="button-explore-prev"
        >
          <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
        </button>
        <button
          onClick={handleNext}
          disabled={activeCardIndex === EXPERIENCE_CARDS.length - 1}
          className={`absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center z-10 transition-opacity ${
            activeCardIndex === EXPERIENCE_CARDS.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          data-testid="button-explore-next"
        >
          <ChevronRight className="w-4 h-4 text-[#6B7280]" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 pt-3 pb-1">
        {EXPERIENCE_CARDS.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveCardIndex(index)}
            className="rounded-full transition-all"
            style={{
              width: index === activeCardIndex ? '22px' : '6px',
              height: '6px',
              background: index === activeCardIndex ? '#FF7A1A' : '#D1D5DB',
            }}
            data-testid={`explore-dot-${index}`}
          />
        ))}
      </div>

      <div className="px-6 pt-2">
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
          <button
            onClick={() => navPush(setLocation, `/adventure/${tripId}/kid/games`)}
            className="flex flex-col items-center gap-0.5"
            data-testid="nav-games"
          >
            <Gamepad2 className="w-5 h-5 text-[#9CA3AF]" />
            <span className="text-[11px] font-medium text-[#9CA3AF]">Games</span>
          </button>
          <button className="flex flex-col items-center gap-0.5" data-testid="nav-explore">
            <Compass className="w-5 h-5 text-[#FF7A1A]" />
            <span className="text-[11px] font-bold text-[#FF7A1A]">Explore</span>
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
