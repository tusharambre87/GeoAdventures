import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  BookOpen, Star, Trophy, Target, ChevronRight, Sparkles, 
  Brain, Map, Globe, Flag, Compass, Zap, TrendingUp, 
  CheckCircle, Lock, Play, ArrowLeft, Lightbulb, Users,
  Calendar, Award, BarChart3, ChevronLeft, ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { LOCATION_CARDS } from "@/lib/gameData";
import { ALL_PASSPORT_CITIES } from "@/lib/dailyQuestData";
import { ANIMAL_CARDS } from "@/lib/animalData";
import { UserHeader } from "@/components/UserHeader";
import { FlagImage } from "@/components/FlagImage";
import bgImage from "@assets/generated_images/playful_hand-drawn_world_adventure_map_pattern.png";
import { KIT_TIER_RANK_GATES, KIT_TIER_NAMES } from "@shared/schema";

interface LearningPath {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  games: string[];
  skills: string[];
  unlockCondition: string;
  recommendedFor: string[];
}

interface SkillProgress {
  name: string;
  level: number;
  maxLevel: number;
  icon: string;
  description: string;
  currentProgress: number;
  nextLevelTarget: number;
  howToLevelUp: string;
  recommendedGame: string;
  recommendedRoute: string;
}

interface GameRecommendation {
  gameId: string;
  gameName: string;
  route: string;
  reason: string;
  priority: number;
  icon: string;
  color: string;
}

import { getFactOfTheDay } from "@/lib/geographyFacts";

const LEARNING_PATHS: LearningPath[] = [
  {
    id: "explorer-basics",
    title: "Explorer Basics",
    description: "Start your geography adventure! Learn about continents, countries, and famous cities.",
    icon: <Globe className="w-8 h-8" />,
    color: "from-blue-400 to-cyan-400",
    games: ["guess-and-go", "spin-the-world"],
    skills: ["City Recognition", "Continent Awareness", "Landmark Knowledge"],
    unlockCondition: "none",
    recommendedFor: ["beginners", "young-explorers"]
  },
  {
    id: "daily-champion",
    title: "Daily Champion",
    description: "Build consistent learning habits with daily challenges and streak rewards.",
    icon: <Calendar className="w-8 h-8" />,
    color: "from-orange-400 to-yellow-400",
    games: ["daily-quest"],
    skills: ["Consistency", "City Details", "Weather Patterns"],
    unlockCondition: "5-games",
    recommendedFor: ["streak-builders", "habit-formers"]
  },
  {
    id: "word-wizard",
    title: "Word Wizard",
    description: "Master geography through spelling! Learn to spell countries, capitals, and states.",
    icon: <BookOpen className="w-8 h-8" />,
    color: "from-purple-400 to-pink-400",
    games: ["crossworld", "spell-geo"],
    skills: ["Spelling", "Capital Cities", "US States"],
    unlockCondition: "10-games",
    recommendedFor: ["word-lovers", "spelling-practice"]
  },
  {
    id: "nature-expert",
    title: "Nature Expert",
    description: "Discover where animals live around the world and learn about their habitats.",
    icon: <Compass className="w-8 h-8" />,
    color: "from-green-400 to-emerald-400",
    games: ["find-my-home"],
    skills: ["Animal Habitats", "Ecosystems", "Wildlife Geography"],
    unlockCondition: "15-games",
    recommendedFor: ["animal-lovers", "nature-enthusiasts"]
  },
  {
    id: "memory-master",
    title: "Memory Master",
    description: "Strengthen your memory while learning landmarks, flags, and geography facts.",
    icon: <Brain className="w-8 h-8" />,
    color: "from-indigo-400 to-violet-400",
    games: ["memory-match", "flag-quiz"],
    skills: ["Visual Memory", "Flag Recognition", "Landmark Matching"],
    unlockCondition: "20-games",
    recommendedFor: ["memory-trainers", "visual-learners"]
  },
  {
    id: "global-master",
    title: "Global Master",
    description: "You've mastered all paths! Continue exploring and earn special achievements.",
    icon: <Trophy className="w-8 h-8" />,
    color: "from-amber-400 to-orange-500",
    games: ["all"],
    skills: ["Complete Geography Mastery", "Expert Explorer"],
    unlockCondition: "50-games",
    recommendedFor: ["advanced-explorers"]
  }
];

const GAME_INFO: Record<string, { name: string; route: string; icon: string; color: string }> = {
  "guess-and-go": { name: "Guess & Go", route: "/play", icon: "🎯", color: "bg-blue-500" },
  "daily-quest": { name: "Daily Quest", route: "/", icon: "📅", color: "bg-orange-500" },
  "crossworld": { name: "CrossWorld", route: "/crossworld", icon: "✍️", color: "bg-purple-500" },
  "spell-geo": { name: "Spell Geo", route: "/spell-geo", icon: "🔤", color: "bg-pink-500" },
  "find-my-home": { name: "Find My Home", route: "/find-my-home", icon: "🦁", color: "bg-green-500" },
  "spin-the-world": { name: "Spin the World", route: "/spin-the-world", icon: "🌍", color: "bg-cyan-500" },
  "memory-match": { name: "Memory Match", route: "/mini-games?game=memory-match", icon: "🧩", color: "bg-indigo-500" },
  "flag-quiz": { name: "Flag Quiz", route: "/mini-games?game=flag-quiz", icon: "🏳️", color: "bg-red-500" }
};

export function calculateSkillProgress(stats: any): SkillProgress[] {
  const gamesPlayed = stats?.gamesPlayed || 0;
  const starsEarned = stats?.starsEarnedTotal || 0;
  const dailyStreak = stats?.dailyQuestStreak || 0;
  const crossworldWins = stats?.crossworldTotalWins || 0;
  const findMyHomeUnlocked = stats?.findMyHomeUnlockedIds?.length || 0;
  
  const cityExplorerLevel = Math.min(5, Math.floor(gamesPlayed / 5));
  const starCollectorLevel = Math.min(5, Math.floor(starsEarned / 20));
  const streakMasterLevel = Math.min(5, Math.floor(dailyStreak / 3));
  const spellingChampLevel = Math.min(5, Math.floor(crossworldWins / 2));
  const natureFriendLevel = Math.min(5, Math.floor(findMyHomeUnlocked / 2));
  const memoryProLevel = Math.min(5, Math.floor(gamesPlayed / 8));
  
  return [
    {
      name: "City Explorer",
      level: cityExplorerLevel,
      maxLevel: 5,
      icon: "🏙️",
      description: "Discover cities around the world",
      currentProgress: gamesPlayed,
      nextLevelTarget: (cityExplorerLevel + 1) * 5,
      howToLevelUp: "Play more games to discover new cities!",
      recommendedGame: "Guess & Go",
      recommendedRoute: "/play"
    },
    {
      name: "Star Collector",
      level: starCollectorLevel,
      maxLevel: 5,
      icon: "⭐",
      description: "Earn stars by playing games",
      currentProgress: starsEarned,
      nextLevelTarget: (starCollectorLevel + 1) * 20,
      howToLevelUp: "Earn more stars by winning games and completing challenges!",
      recommendedGame: "Daily Quest",
      recommendedRoute: "/"
    },
    {
      name: "Streak Master",
      level: streakMasterLevel,
      maxLevel: 5,
      icon: "🔥",
      description: "Build daily playing streaks",
      currentProgress: dailyStreak,
      nextLevelTarget: (streakMasterLevel + 1) * 3,
      howToLevelUp: "Play every day to build your streak!",
      recommendedGame: "Daily Quest",
      recommendedRoute: "/"
    },
    {
      name: "Spelling Champ",
      level: spellingChampLevel,
      maxLevel: 5,
      icon: "✍️",
      description: "Master geography spelling",
      currentProgress: crossworldWins,
      nextLevelTarget: (spellingChampLevel + 1) * 2,
      howToLevelUp: "Win CrossWorld puzzles to improve spelling!",
      recommendedGame: "CrossWorld",
      recommendedRoute: "/crossworld"
    },
    {
      name: "Nature Friend",
      level: natureFriendLevel,
      maxLevel: 5,
      icon: "🦋",
      description: "Learn about animal habitats",
      currentProgress: findMyHomeUnlocked,
      nextLevelTarget: (natureFriendLevel + 1) * 2,
      howToLevelUp: "Help animals find their homes in Find My Home!",
      recommendedGame: "Find My Home",
      recommendedRoute: "/find-my-home"
    },
    {
      name: "Memory Pro",
      level: memoryProLevel,
      maxLevel: 5,
      icon: "🧠",
      description: "Strengthen your memory skills",
      currentProgress: gamesPlayed,
      nextLevelTarget: (memoryProLevel + 1) * 8,
      howToLevelUp: "Play games to strengthen your memory!",
      recommendedGame: "Memory Match",
      recommendedRoute: "/mini-games?game=memory-match"
    }
  ];
}

interface ExplorerInfo {
  ageRange?: string;
  profileType?: string;
}

interface ContinentProgress {
  continent: string;
  citiesVisited: number;
  totalCities: number;
  icon: string;
  color: string;
  suggestion: string;
}

const CONTINENT_ICONS: Record<string, { icon: string; color: string }> = {
  "Europe": { icon: "🏰", color: "from-blue-400 to-indigo-400" },
  "Asia": { icon: "🏯", color: "from-red-400 to-orange-400" },
  "North America": { icon: "🗽", color: "from-cyan-400 to-blue-400" },
  "South America": { icon: "🌴", color: "from-green-400 to-emerald-400" },
  "Africa": { icon: "🦁", color: "from-amber-400 to-orange-400" },
  "Oceania": { icon: "🦘", color: "from-teal-400 to-cyan-400" }
};

const getContinentTotals = (): Record<string, number> => {
  const totals: Record<string, number> = {
    "Europe": 0, "Asia": 0, "North America": 0, "South America": 0, "Africa": 0, "Oceania": 0
  };
  ALL_PASSPORT_CITIES.forEach(city => {
    if (city.continent && totals[city.continent] !== undefined) {
      totals[city.continent]++;
    }
  });
  return totals;
};

const CONTINENT_TOTALS = getContinentTotals();

const CONTINENT_DATA: Record<string, { icon: string; color: string; totalCities: number }> = Object.fromEntries(
  Object.entries(CONTINENT_ICONS).map(([continent, data]) => [
    continent,
    { ...data, totalCities: CONTINENT_TOTALS[continent] || 0 }
  ])
);

export function getContinentProgress(collectedCardIds: string[] = []): ContinentProgress[] {
  const continentCounts: Record<string, number> = {
    "Europe": 0, "Asia": 0, "North America": 0, "South America": 0, "Africa": 0, "Oceania": 0
  };
  
  collectedCardIds.forEach(cardId => {
    const card = ALL_PASSPORT_CITIES.find(c => c.id === cardId);
    if (card && card.continent && continentCounts[card.continent] !== undefined) {
      continentCounts[card.continent]++;
    }
  });
  
  const progress: ContinentProgress[] = Object.entries(CONTINENT_DATA).map(([continent, data]) => {
    const visited = continentCounts[continent] || 0;
    let suggestion = "";
    
    if (visited === 0) {
      suggestion = `Start exploring ${continent}!`;
    } else if (visited < data.totalCities / 2) {
      suggestion = `Keep discovering ${continent}!`;
    } else if (visited < data.totalCities) {
      suggestion = `Almost complete!`;
    } else {
      suggestion = `${continent} Master!`;
    }
    
    return {
      continent,
      citiesVisited: visited,
      totalCities: data.totalCities,
      icon: data.icon,
      color: data.color,
      suggestion
    };
  });
  
  return progress.sort((a, b) => {
    const aPercent = a.citiesVisited / a.totalCities;
    const bPercent = b.citiesVisited / b.totalCities;
    if (aPercent === 0 && bPercent === 0) return 0;
    if (aPercent === 0) return 1;
    if (bPercent === 0) return -1;
    return bPercent - aPercent;
  });
}

export function getAgeBasedPriorities(ageRange?: string): { 
  preferVisual: boolean; 
  preferSpelling: boolean;
  preferAnimals: boolean;
  challengeLevel: 'easy' | 'medium' | 'hard';
} {
  switch (ageRange) {
    case '4-5':
      return { preferVisual: true, preferSpelling: false, preferAnimals: true, challengeLevel: 'easy' };
    case '6-7':
      return { preferVisual: true, preferSpelling: true, preferAnimals: true, challengeLevel: 'easy' };
    case '8-9':
      return { preferVisual: false, preferSpelling: true, preferAnimals: true, challengeLevel: 'medium' };
    case '10-12':
      return { preferVisual: false, preferSpelling: true, preferAnimals: false, challengeLevel: 'medium' };
    case '13+':
    default:
      return { preferVisual: false, preferSpelling: true, preferAnimals: false, challengeLevel: 'hard' };
  }
}

export function getPersonalizedRecommendations(stats: any, explorer?: ExplorerInfo): GameRecommendation[] {
  const recommendations: GameRecommendation[] = [];
  const gamesPlayed = stats?.gamesPlayed || 0;
  const dailyStreak = stats?.dailyQuestStreak || 0;
  const lastDailyQuest = stats?.lastDailyQuestDate;
  const crossworldPlayed = stats?.crossworldTotalGames || 0;
  const findMyHomeUnlocked = stats?.findMyHomeUnlockedIds?.length || 0;
  const spellGeoPlayed = stats?.spellGeoGamesPlayed || 0;
  
  const agePrefs = getAgeBasedPriorities(explorer?.ageRange);
  const today = new Date().toDateString();
  const playedDailyToday = lastDailyQuest === today;
  
  if (!playedDailyToday) {
    recommendations.push({
      gameId: "daily-quest",
      gameName: "Daily Quest",
      route: "/",
      reason: dailyStreak > 0 
        ? `Continue your ${dailyStreak}-day explorer streak!` 
        : "Start your explorer streak today!",
      priority: 1,
      icon: "📅",
      color: "from-orange-400 to-yellow-400"
    });
  }
  
  if (gamesPlayed < 3) {
    recommendations.push({
      gameId: "guess-and-go",
      gameName: "Guess & Go",
      route: "/play",
      reason: agePrefs.challengeLevel === 'easy' 
        ? "Fun picture clues to learn cities!" 
        : "Perfect for beginners! Learn cities with fun clues.",
      priority: 2,
      icon: "🎯",
      color: "from-blue-400 to-cyan-400"
    });
  }
  
  if (agePrefs.preferAnimals && findMyHomeUnlocked < 5) {
    recommendations.push({
      gameId: "find-my-home",
      gameName: "Find My Home",
      route: "/find-my-home",
      reason: agePrefs.challengeLevel === 'easy' 
        ? "Help cute animals find their homes!" 
        : "Discover where animals live around the world!",
      priority: agePrefs.preferAnimals ? 3 : 5,
      icon: "🦁",
      color: "from-green-400 to-emerald-400"
    });
  }
  
  if (agePrefs.preferSpelling) {
    if (crossworldPlayed < 5) {
      recommendations.push({
        gameId: "crossworld",
        gameName: "CrossWorld",
        route: "/crossworld",
        reason: agePrefs.challengeLevel === 'easy' 
          ? "Practice spelling with a fun word game!" 
          : "Ready for a spelling challenge? Try the crossword puzzle!",
        priority: agePrefs.preferSpelling ? 3 : 4,
        icon: "✍️",
        color: "from-purple-400 to-pink-400"
      });
    }
    
    if (spellGeoPlayed < 3) {
      recommendations.push({
        gameId: "spell-geo",
        gameName: "Spell Geo",
        route: "/spell-geo",
        reason: "Practice spelling countries and capitals!",
        priority: 4,
        icon: "🔤",
        color: "from-pink-400 to-rose-400"
      });
    }
  }
  
  recommendations.push({
    gameId: "spin-the-world",
    gameName: "Spin the World",
    route: "/spin-the-world",
    reason: agePrefs.challengeLevel === 'easy' 
      ? "Spin the globe and discover new places!" 
      : "Spin the globe and explore new places!",
    priority: 6,
    icon: "🌍",
    color: "from-cyan-400 to-blue-400"
  });
  
  if (gamesPlayed >= 10 && agePrefs.preferVisual) {
    recommendations.push({
      gameId: "memory-match",
      gameName: "Memory Match",
      route: "/mini-games?game=memory-match",
      reason: "Match landmarks and test your memory!",
      priority: 5,
      icon: "🧩",
      color: "from-indigo-400 to-violet-400"
    });
  }
  
  return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 4);
}

export function getUnlockedPaths(gamesPlayed: number): string[] {
  const unlocked: string[] = ["explorer-basics"];
  if (gamesPlayed >= 5) unlocked.push("daily-champion");
  if (gamesPlayed >= 10) unlocked.push("word-wizard");
  if (gamesPlayed >= 15) unlocked.push("nature-expert");
  if (gamesPlayed >= 20) unlocked.push("memory-master");
  if (gamesPlayed >= 50) unlocked.push("global-master");
  return unlocked;
}

interface Milestone {
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  reward: string;
  color: string;
}

export function getNextMilestones(stats: any): Milestone[] {
  const gamesPlayed = stats?.gamesPlayed || 0;
  const starsEarned = stats?.starsEarnedTotal || 0;
  const dailyStreak = stats?.dailyQuestStreak || 0;
  const crossworldWins = stats?.crossworldTotalWins || 0;
  const citiesVisited = stats?.citiesVisited?.length || 0;
  
  const milestones: Milestone[] = [];
  
  if (gamesPlayed < 5) {
    const remaining = 5 - gamesPlayed;
    milestones.push({
      title: "First Steps",
      description: `${remaining} more game${remaining === 1 ? '' : 's'} until Daily Champion unlocks`,
      icon: "🎯",
      progress: gamesPlayed,
      target: 5,
      reward: "Daily Champion Path",
      color: "from-blue-400 to-cyan-400"
    });
  } else if (gamesPlayed < 10) {
    const remaining = 10 - gamesPlayed;
    milestones.push({
      title: "Getting Started",
      description: `${remaining} more game${remaining === 1 ? '' : 's'} until Word Wizard unlocks`,
      icon: "✨",
      progress: gamesPlayed,
      target: 10,
      reward: "Word Wizard Path",
      color: "from-purple-400 to-pink-400"
    });
  } else if (gamesPlayed < 15) {
    const remaining = 15 - gamesPlayed;
    milestones.push({
      title: "Explorer Journey",
      description: `${remaining} more game${remaining === 1 ? '' : 's'} until Nature Expert unlocks`,
      icon: "🌿",
      progress: gamesPlayed,
      target: 15,
      reward: "Nature Expert Path",
      color: "from-green-400 to-emerald-400"
    });
  } else if (gamesPlayed < 20) {
    const remaining = 20 - gamesPlayed;
    milestones.push({
      title: "Almost There",
      description: `${remaining} more game${remaining === 1 ? '' : 's'} until Memory Master unlocks`,
      icon: "🧠",
      progress: gamesPlayed,
      target: 20,
      reward: "Memory Master Path",
      color: "from-indigo-400 to-violet-400"
    });
  }
  
  if (dailyStreak < 7) {
    const remaining = 7 - dailyStreak;
    milestones.push({
      title: "Week Warrior",
      description: `${remaining} more day${remaining === 1 ? '' : 's'} to reach Week Warrior badge`,
      icon: "🔥",
      progress: dailyStreak,
      target: 7,
      reward: "Week Warrior Badge",
      color: "from-orange-400 to-red-400"
    });
  } else if (dailyStreak < 30) {
    const remaining = 30 - dailyStreak;
    milestones.push({
      title: "Month Master",
      description: `${remaining} more day${remaining === 1 ? '' : 's'} to reach Month Master badge`,
      icon: "🏆",
      progress: dailyStreak,
      target: 30,
      reward: "Month Master Badge",
      color: "from-amber-400 to-orange-400"
    });
  }
  
  if (starsEarned < 50) {
    const remaining = 50 - starsEarned;
    milestones.push({
      title: "Star Collector",
      description: `${remaining} more star${remaining === 1 ? '' : 's'} to reach Star Collector badge`,
      icon: "⭐",
      progress: starsEarned,
      target: 50,
      reward: "Star Collector Badge",
      color: "from-yellow-400 to-amber-400"
    });
  } else if (starsEarned < 100) {
    const remaining = 100 - starsEarned;
    milestones.push({
      title: "Star Champion",
      description: `${remaining} more star${remaining === 1 ? '' : 's'} to reach Star Champion badge`,
      icon: "🌟",
      progress: starsEarned,
      target: 100,
      reward: "Star Champion Badge",
      color: "from-yellow-400 to-orange-400"
    });
  }
  
  if (crossworldWins < 5) {
    const remaining = 5 - crossworldWins;
    milestones.push({
      title: "Spelling Starter",
      description: `${remaining} more CrossWorld win${remaining === 1 ? '' : 's'} to reach your next badge`,
      icon: "✍️",
      progress: crossworldWins,
      target: 5,
      reward: "Spelling Star Badge",
      color: "from-purple-400 to-indigo-400"
    });
  }
  
  return milestones.slice(0, 3);
}

function getPathProgress(pathId: string, stats: any): number {
  const gamesPlayed = stats?.gamesPlayed || 0;
  const dailyStreak = stats?.dailyQuestStreak || 0;
  const crossworldWins = stats?.crossworldTotalWins || 0;
  const findMyHomeUnlocked = stats?.findMyHomeUnlockedIds?.length || 0;
  
  switch (pathId) {
    case "explorer-basics":
      return Math.min(100, gamesPlayed * 10);
    case "daily-champion":
      return Math.min(100, dailyStreak * 15);
    case "word-wizard":
      return Math.min(100, crossworldWins * 12);
    case "nature-expert":
      return Math.min(100, findMyHomeUnlocked * 12);
    case "memory-master":
      return Math.min(100, gamesPlayed * 5);
    case "global-master":
      return Math.min(100, gamesPlayed * 2);
    default:
      return 0;
  }
}

export default function KnowledgeHub() {
  const [, navigate] = useLocation();
  const { stats, user, isLoadingPlayer, collectedCardIds: userCollectedCardIds } = useUser();
  const { activeExplorer, isLoading: explorerLoading } = useExplorer();
  const [explorerCollectedCards, setExplorerCollectedCards] = useState<string[]>([]);
  const [explorerCardsLoaded, setExplorerCardsLoaded] = useState(false);
  const [isLoadingExplorerCards, setIsLoadingExplorerCards] = useState(false);
  const [encounteredAnimalIds, setEncounteredAnimalIds] = useState<string[]>([]);
  const [kitState, setKitState] = useState<{ items: any[]; totalTierPoints: number; maxTierPoints: number } | null>(null);
  const [rankData, setRankData] = useState<{ rank: any; totalXp: number; nextRank: any; xpToNextRank: number; progressPercent: number } | null>(null);
  const [recentSouvenirs, setRecentSouvenirs] = useState<{ id: string; city: string; country: string; stickerIcon: string; earnedAt: string }[]>([]);

  const playerId = activeExplorer?.id;

  useEffect(() => {
    const EXPLORER_CARDS_CACHE_KEY = `geoquest_explorer_cards_${activeExplorer?.id}`;

    setExplorerCardsLoaded(false);

    if (activeExplorer?.id) {
      setIsLoadingExplorerCards(true);

      if (!navigator.onLine) {
        const cached = localStorage.getItem(EXPLORER_CARDS_CACHE_KEY);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            setExplorerCollectedCards(data.collectedCardIds || []);
            setEncounteredAnimalIds(data.encounteredAnimalIds || []);
          } catch (e) {
            setExplorerCollectedCards([]);
            setEncounteredAnimalIds([]);
          }
        } else {
          setExplorerCollectedCards([]);
          setEncounteredAnimalIds([]);
        }
        setExplorerCardsLoaded(true);
        setIsLoadingExplorerCards(false);
        return;
      }

      fetch(`/api/players/${activeExplorer.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          setExplorerCollectedCards(data?.collectedCardIds || []);
          setEncounteredAnimalIds(data?.encounteredAnimalIds || []);
          setExplorerCardsLoaded(true);

          try {
            localStorage.setItem(EXPLORER_CARDS_CACHE_KEY, JSON.stringify({
              collectedCardIds: data?.collectedCardIds || [],
              encounteredAnimalIds: data?.encounteredAnimalIds || []
            }));
          } catch (e) {
            console.error('Failed to cache explorer cards:', e);
          }
        })
        .catch(() => {
          const cached = localStorage.getItem(EXPLORER_CARDS_CACHE_KEY);
          if (cached) {
            try {
              const data = JSON.parse(cached);
              setExplorerCollectedCards(data.collectedCardIds || []);
              setEncounteredAnimalIds(data.encounteredAnimalIds || []);
            } catch (e) {
              setExplorerCollectedCards([]);
              setEncounteredAnimalIds([]);
            }
          } else {
            setExplorerCollectedCards([]);
            setEncounteredAnimalIds([]);
          }
          setExplorerCardsLoaded(true);
        })
        .finally(() => setIsLoadingExplorerCards(false));
    } else {
      setExplorerCollectedCards([]);
      setEncounteredAnimalIds([]);
    }
  }, [activeExplorer?.id]);

  useEffect(() => {
    setRecentSouvenirs([]);
    if (!playerId) return;
    fetch(`/api/stickers/user/${playerId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const sorted = data
            .filter((s: any) => s.sticker && s.earnedAt)
            .sort((a: any, b: any) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
            .slice(0, 3)
            .map((s: any) => ({
              id: s.id,
              city: s.sticker.city,
              country: s.sticker.country,
              stickerIcon: s.sticker.stickerIcon || '🏙️',
              earnedAt: s.earnedAt
            }));
          setRecentSouvenirs(sorted);
        }
      })
      .catch(() => {});
  }, [playerId]);

  useEffect(() => {
    setKitState(null);
    setRankData(null);
    if (!playerId) return;
    fetch(`/api/explorer-kit/${playerId}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setKitState(data); })
      .catch(() => {});
  }, [playerId]);

  useEffect(() => {
    if (!playerId) return;
    fetch(`/api/players/${playerId}/xp`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setRankData(data); })
      .catch(() => {});
  }, [playerId]);

  const collectedCardIds = explorerCardsLoaded ? explorerCollectedCards : (userCollectedCardIds || []);

  const isLoading = isLoadingPlayer || explorerLoading || isLoadingExplorerCards;

  const continentProgress = useMemo(() => getContinentProgress(collectedCardIds || []), [collectedCardIds]);

  const gamesPlayed = stats?.gamesPlayed || 0;
  const explorerName = activeExplorer?.name || user?.username || "Explorer";
  const citiesDiscovered = collectedCardIds?.length || 0;
  const currentStreak = stats?.explorerStreak || stats?.dailyQuestStreak || 0;

  const passportCompletion = ALL_PASSPORT_CITIES.length > 0
    ? Math.round((citiesDiscovered / ALL_PASSPORT_CITIES.length) * 100)
    : 0;

  const continentsExplored = continentProgress.filter(cp => cp.citiesVisited > 0).length;

  const kitProgressPercent = kitState && kitState.maxTierPoints > 0
    ? Math.round((kitState.totalTierPoints / kitState.maxTierPoints) * 100)
    : 0;

  const lastKitItem = kitState?.items
    ?.filter((i: any) => i.isUnlocked)
    ?.sort((a: any, b: any) => b.currentTier - a.currentTier)[0] || null;

  const unlockedGearItems = kitState?.items?.filter((i: any) => i.isUnlocked)?.slice(0, 3) || [];

  const nextKitUnlock = kitState?.items?.find((i: any) => !i.isUnlocked) || null;

  const animalAlbumCompletion = ANIMAL_CARDS.length > 0
    ? Math.round((encounteredAnimalIds.length / ANIMAL_CARDS.length) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">📓</div>
          <p className="text-amber-600 dark:text-amber-300 font-medium">Opening your Explorer Journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative"
      data-testid="explorer-journal-page"
    >
      <div
        className="absolute inset-0 opacity-10 dark:opacity-5"
        style={{ backgroundImage: `url(${bgImage})`, backgroundSize: '400px', backgroundRepeat: 'repeat' }}
      />
      <UserHeader />

      <div className="container mx-auto px-4 py-6 max-w-4xl relative z-10">
        <Button
          variant="ghost"
          className="mb-4 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          data-testid="button-back-home"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate('/');
            }
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Hero Area */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-3xl p-6 mb-6 text-white shadow-xl"
          data-testid="journal-hero"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">📓</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Explorer Journal</h1>
              <p className="text-amber-100 text-sm">Welcome back, {explorerName}!</p>
            </div>
          </div>

          <div className="bg-white/15 rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-yellow-200 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wider text-amber-200 font-semibold mb-1">Fact of the Day</p>
                <p className="text-white/95 text-sm leading-relaxed" data-testid="fact-of-the-day">
                  {getFactOfTheDay().fact}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="bg-white/20 rounded-xl px-4 py-2 flex items-center gap-2" data-testid="stat-cities-discovered">
              <Globe className="w-4 h-4" />
              <span className="font-bold text-lg">{citiesDiscovered}</span>
              <span className="text-amber-100 text-xs">cities</span>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 flex items-center gap-2" data-testid="stat-games-played">
              <Zap className="w-4 h-4" />
              <span className="font-bold text-lg">{gamesPlayed}</span>
              <span className="text-amber-100 text-xs">games</span>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 flex items-center gap-2" data-testid="stat-streak">
              <TrendingUp className="w-4 h-4" />
              <span className="font-bold text-lg">{currentStreak}</span>
              <span className="text-amber-100 text-xs">streak</span>
            </div>
          </div>
        </motion.div>

        {/* Section 1: Explorer Identity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
          data-testid="section-explorer-identity"
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-amber-200/50 dark:border-amber-700/30">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Explorer Identity</h2>
            </div>

            {rankData ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 rounded-2xl flex items-center justify-center border-2 border-amber-300 dark:border-amber-600">
                  <span className="text-3xl">{rankData.rank?.icon || '🧭'}</span>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-gray-800 dark:text-white" data-testid="text-current-rank">{rankData.rank?.name || 'Explorer'}</span>
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                      {rankData.totalXp} XP
                    </span>
                  </div>
                  <Progress value={rankData.progressPercent || 0} className="h-2.5 mb-1.5" />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {rankData.nextRank
                        ? `${rankData.xpToNextRank} XP to ${rankData.nextRank.name}`
                        : 'Max rank reached!'}
                    </p>
                    {rankData.nextRank && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        Next: {rankData.nextRank.icon} {rankData.nextRank.name}
                      </span>
                    )}
                  </div>
                  {rankData.nextRank && (
                    <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 border border-amber-200/60 dark:border-amber-700/40" data-testid="next-rank-unlock-preview">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                        {rankData.nextRank.icon} Rank {rankData.nextRank.level} Unlocks:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(() => {
                          const nextLevel = rankData.nextRank.level;
                          const kitTierGate = Object.entries(KIT_TIER_RANK_GATES).find(([, reqRank]) => reqRank === nextLevel);
                          const rewards: string[] = [];
                          if (kitTierGate) {
                            const tierName = KIT_TIER_NAMES[parseInt(kitTierGate[0])] || 'New';
                            rewards.push(`${tierName} Kit Tier`);
                          }
                          rewards.push('New title & badge');
                          return rewards.map(r => (
                            <span key={r} className="text-[10px] bg-amber-200/60 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">{r}</span>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🧭</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white">Explorer</p>
                    <p className="text-xs text-gray-500">Start playing to earn XP!</p>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 border border-amber-200/60 dark:border-amber-700/40" data-testid="next-rank-unlock-preview">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                    🥾 Rank 2 Unlocks:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] bg-amber-200/60 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">New title & badge</span>
                    <span className="text-[10px] bg-amber-200/60 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">Trail Seeker rank</span>
                  </div>
                </div>
              </div>
            )}

            <Link href="/explorer-identity">
              <Button
                className="w-full mt-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold rounded-xl"
                data-testid="button-view-rank-journey"
              >
                <Award className="w-4 h-4 mr-2" />
                View Full Rank Journey
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Section 2: Explorer Kit Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
          data-testid="section-explorer-kit"
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-purple-200/50 dark:border-purple-700/30">
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-6 h-6 text-purple-500" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Explorer Kit</h2>
              <span className="ml-auto text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">
                {kitProgressPercent}% complete
              </span>
            </div>

            {lastKitItem && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-3 mb-3 border border-purple-200/50 dark:border-purple-700/30">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">Last Obtained</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-800 dark:text-white">{lastKitItem.name}</span>
                  <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">{lastKitItem.currentTierName}</span>
                </div>
              </div>
            )}

            {unlockedGearItems.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {unlockedGearItems.map((item: any) => (
                  <div key={item.itemId} className="bg-gray-100 dark:bg-gray-700/50 rounded-xl px-3 py-2 flex items-center gap-2">
                    <img
                      src={`/images/explorer-kit/${item.iconPrefix}-${item.currentTierName?.toLowerCase() || 'bronze'}.png`}
                      alt={item.name}
                      className="w-8 h-8 object-contain"
                      loading="lazy"
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.name}</p>
                      <p className="text-[10px] text-gray-500">{item.currentTierName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {nextKitUnlock && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Next unlock: <span className="font-semibold text-purple-600 dark:text-purple-400">{nextKitUnlock.name}</span>
              </p>
            )}

            <Link href="/passport?tab=kit">
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-xl"
                data-testid="button-open-explorer-kit"
              >
                <Compass className="w-4 h-4 mr-2" />
                Open Explorer Kit
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Section 3: Passport Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
          data-testid="section-passport"
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-blue-200/50 dark:border-blue-700/30">
            <div className="flex items-center gap-2 mb-4">
              <Flag className="w-6 h-6 text-blue-500" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Passport</h2>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="text-cities-discovered">{citiesDiscovered}</span>
                <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase mt-0.5">Cities</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="text-passport-completion">{passportCompletion}%</span>
                <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase mt-0.5">Complete</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="text-continents-explored">{continentsExplored}</span>
                <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase mt-0.5">Continents</p>
              </div>
            </div>

            <Link href="/passport">
              <Button
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl"
                data-testid="button-open-passport"
              >
                <Flag className="w-4 h-4 mr-2" />
                Open Passport
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Section 4: World Exploration Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
          data-testid="section-world-exploration"
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-teal-200/50 dark:border-teal-700/30">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-6 h-6 text-teal-500" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">World Exploration</h2>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <span className="text-2xl font-bold text-teal-700 dark:text-teal-300">{continentsExplored}</span>
                <p className="text-[10px] text-gray-500">Continents</p>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-teal-700 dark:text-teal-300">{citiesDiscovered}</span>
                <p className="text-[10px] text-gray-500">Cities</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {continentProgress.map((cp) => {
                const pct = cp.totalCities > 0 ? Math.round((cp.citiesVisited / cp.totalCities) * 100) : 0;
                return (
                  <div key={cp.continent} className="flex items-center gap-2" data-testid={`continent-progress-${cp.continent.toLowerCase().replace(/\s+/g, '-')}`}>
                    <span className="text-lg w-6">{cp.icon}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-28 truncate">{cp.continent}</span>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${cp.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 w-12 text-right">{cp.citiesVisited}/{cp.totalCities}</span>
                  </div>
                );
              })}
            </div>

            <Link href="/explorer-map">
              <Button
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl"
                data-testid="button-open-explorer-map"
              >
                <Map className="w-4 h-4 mr-2" />
                Open Explorer Map
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Section 5: Discovery Collections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
          data-testid="section-discovery-collections"
        >
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-6 h-6 text-green-500" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Discovery Collections</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-green-200/50 dark:border-green-700/30" data-testid="card-animal-album">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🦁</span>
                <h3 className="font-bold text-gray-800 dark:text-white">Animal Album</h3>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{encounteredAnimalIds.length}/{ANIMAL_CARDS.length} discovered</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">{animalAlbumCompletion}%</span>
                  </div>
                  <Progress value={animalAlbumCompletion} className="h-2" />
                </div>
              </div>

              {encounteredAnimalIds.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">Play Guess & Go to discover animals!</p>
              ) : (
                <div className="flex gap-1 flex-wrap mb-2">
                  {ANIMAL_CARDS.filter(a => encounteredAnimalIds.includes(a.id)).slice(0, 6).map(animal => (
                    <span key={animal.id} className="text-lg" title={animal.name}>{animal.imageEmoji}</span>
                  ))}
                  {encounteredAnimalIds.length > 6 && (
                    <span className="text-xs text-gray-500 flex items-center">+{encounteredAnimalIds.length - 6} more</span>
                  )}
                </div>
              )}

              <Link href="/play">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20 rounded-xl"
                  data-testid="button-play-for-animals"
                >
                  Discover More Animals
                </Button>
              </Link>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-pink-200/50 dark:border-pink-700/30" data-testid="card-souvenirs">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🎁</span>
                <h3 className="font-bold text-gray-800 dark:text-white">Souvenirs</h3>
              </div>

              {recentSouvenirs.length > 0 ? (
                <div className="mb-3">
                  <p className="text-xs text-pink-600 dark:text-pink-400 font-semibold mb-2">Recently Earned</p>
                  <div className="space-y-1.5">
                    {recentSouvenirs.map(s => (
                      <div key={s.id} className="flex items-center gap-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg px-2.5 py-1.5">
                        <span className="text-lg">{s.stickerIcon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{s.city}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{s.country}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : citiesDiscovered > 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {citiesDiscovered} city souvenirs available to collect!
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Start exploring to collect souvenirs!
                </p>
              )}

              <Link href="/sticker-book">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-pink-300 text-pink-700 hover:bg-pink-50 dark:border-pink-600 dark:text-pink-400 dark:hover:bg-pink-900/20 rounded-xl"
                  data-testid="button-open-sticker-book"
                >
                  Open Souvenir Book
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm pb-8"
        >
          <p>Keep exploring to fill your journal!</p>
        </motion.div>
      </div>
    </div>
  );
}
