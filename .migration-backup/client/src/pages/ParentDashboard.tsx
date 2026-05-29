import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings, User, Star, Trophy, Calendar, BarChart3, Lock, Archive, Edit, Mail, CheckCircle, Loader2, AlertTriangle, Gift, ChevronDown, ChevronUp, Trash2, RotateCcw, Map, Target, Globe, Lightbulb, BookOpen, Brain, Compass, Flame, ChevronRight, ChevronLeft, Award, Sparkles, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useExplorer } from '@/lib/explorerContext';
import { useUser } from '@/lib/userContext';
import { useParentalGate } from '@/components/ParentalGate';
import { useRewards, RewardProgressCard, PrintableCertificate } from '@/components/RewardSystem';
import { toast } from 'sonner';
import type { Player } from '@shared/schema';

interface RewardTier {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  triggerValue: number;
  rewardType: string;
  rewardDescription: string;
  displayOrder: number;
}

interface RewardUnlock {
  id: string;
  explorerId: string;
  tierId: string;
  status: string;
  unlockedAt: string;
  claimedAt: string | null;
  parentEmail: string | null;
  tier: RewardTier;
}

interface ExplorerRewardsData {
  unlocks: RewardUnlock[];
  stats: {
    masteredCities: number;
    continentsExplored: number;
  };
}

interface GameHistoryEntry {
  date: string;
  stars: number;
  won: boolean;
}

interface ExplorerDetailStats {
  gamesPlayed: number;
  gamesWon: number;
  starsEarnedTotal: number;
  cardsCollected: number;
  citiesDiscovered: number;
  collectedCardIds: string[];
  dailyQuestStreak: number;
  crossworldStreak: number;
  badgeLevel: string;
  gameHistory: GameHistoryEntry[];
}

const AVATAR_OPTIONS: Record<string, string> = {
  panda: '🐼',
  lion: '🦁',
  elephant: '🐘',
  penguin: '🐧',
  koala: '🐨',
  fox: '🦊',
  owl: '🦉',
  turtle: '🐢',
  butterfly: '🦋',
  dolphin: '🐬',
  rocket: '🚀',
  globe: '🌍',
};

function getAvatarEmoji(key: string): string {
  return AVATAR_OPTIONS[key] || '🐼';
}

function getBadgeLevel(gamesPlayed: number): string {
  if (gamesPlayed > 20) return "Master Geographer";
  if (gamesPlayed > 10) return "Global Adventurer";
  if (gamesPlayed > 5) return "Seasoned Traveler";
  return "Novice Explorer";
}

const SKILLS = [
  { name: "City Explorer", icon: "🏙️", maxLevel: 5 },
  { name: "Star Collector", icon: "⭐", maxLevel: 5 },
  { name: "Streak Master", icon: "🔥", maxLevel: 5 },
  { name: "Spelling Champ", icon: "📝", maxLevel: 5 },
  { name: "Nature Friend", icon: "🦋", maxLevel: 5 },
  { name: "Memory Pro", icon: "🧠", maxLevel: 5 },
];

const LEARNING_PATHS = [
  {
    id: "explorer-basics",
    title: "Explorer Basics",
    description: "Start your geography adventure! Learn about continents, countries, and famous cities.",
    icon: <Globe className="w-6 h-6" />,
    color: "from-green-400 to-emerald-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-700",
    unlockCondition: 0,
  },
  {
    id: "daily-champion",
    title: "Daily Champion",
    description: "Build consistent learning habits with daily challenges and streak rewards.",
    icon: <Calendar className="w-6 h-6" />,
    color: "from-orange-400 to-yellow-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-700",
    unlockCondition: 5,
  },
  {
    id: "word-wizard",
    title: "Word Wizard",
    description: "Master geography through spelling! Learn to spell countries, capitals, and states.",
    icon: <BookOpen className="w-6 h-6" />,
    color: "from-purple-400 to-pink-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-700",
    unlockCondition: 10,
  },
  {
    id: "nature-expert",
    title: "Nature Expert",
    description: "Discover where animals live around the world and learn about their habitats.",
    icon: <Compass className="w-6 h-6" />,
    color: "from-teal-400 to-cyan-400",
    bgColor: "bg-teal-50 dark:bg-teal-900/20",
    borderColor: "border-teal-200 dark:border-teal-700",
    unlockCondition: 15,
  },
  {
    id: "memory-master",
    title: "Memory Master",
    description: "Strengthen your memory while learning landmarks, flags, and geography facts.",
    icon: <Brain className="w-6 h-6" />,
    color: "from-indigo-400 to-violet-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    borderColor: "border-indigo-200 dark:border-indigo-700",
    unlockCondition: 20,
  },
];

function getSkillLevel(skillName: string, gamesPlayed: number, starsTotal: number, cardsCount: number, streak: number): number {
  if (skillName === "City Explorer") return Math.min(5, Math.floor(cardsCount / 8));
  if (skillName === "Star Collector") return Math.min(5, Math.floor(starsTotal / 50));
  if (skillName === "Streak Master") return Math.min(5, Math.floor(streak / 3));
  if (skillName === "Spelling Champ") return Math.min(5, Math.floor(gamesPlayed / 10));
  if (skillName === "Nature Friend") return Math.min(5, Math.floor(gamesPlayed / 8));
  if (skillName === "Memory Pro") return Math.min(5, Math.floor(gamesPlayed / 12));
  return 0;
}

function getNextMilestones(gamesPlayed: number, starsEarned: number, dailyStreak: number) {
  const milestones: Array<{ title: string; description: string; icon: string; progress: number; target: number; color: string }> = [];

  if (gamesPlayed < 5) {
    milestones.push({ title: "First Steps", description: `${5 - gamesPlayed} more games until Daily Champion unlocks`, icon: "🎯", progress: gamesPlayed, target: 5, color: "from-blue-400 to-cyan-400" });
  } else if (gamesPlayed < 10) {
    milestones.push({ title: "Getting Started", description: `${10 - gamesPlayed} more games until Word Wizard unlocks`, icon: "✨", progress: gamesPlayed, target: 10, color: "from-purple-400 to-pink-400" });
  } else if (gamesPlayed < 20) {
    milestones.push({ title: "On a Roll", description: `${20 - gamesPlayed} more games until Memory Master unlocks`, icon: "🚀", progress: gamesPlayed, target: 20, color: "from-indigo-400 to-violet-400" });
  }

  if (starsEarned < 50) {
    milestones.push({ title: "Star Gatherer", description: `${50 - starsEarned} more stars to reach Star Collector Level 1`, icon: "⭐", progress: starsEarned, target: 50, color: "from-yellow-400 to-amber-400" });
  } else if (starsEarned < 100) {
    milestones.push({ title: "Star Seeker", description: `${100 - starsEarned} more stars to reach Level 2`, icon: "🌟", progress: starsEarned, target: 100, color: "from-yellow-400 to-orange-400" });
  }

  if (dailyStreak < 3) {
    milestones.push({ title: "Streak Starter", description: `${3 - dailyStreak} more days to reach Streak Master Level 1`, icon: "🔥", progress: dailyStreak, target: 3, color: "from-orange-400 to-red-400" });
  } else if (dailyStreak < 7) {
    milestones.push({ title: "Weekly Warrior", description: `${7 - dailyStreak} more days to reach a week-long streak`, icon: "💪", progress: dailyStreak, target: 7, color: "from-red-400 to-pink-400" });
  }

  return milestones.slice(0, 4);
}

function ExplorerSummary({ 
  explorer, 
  onEdit, 
  onArchive,
  onDelete,
  onViewProgress,
}: { 
  explorer: Player; 
  onEdit: (explorer: Player) => void;
  onArchive: (explorer: Player) => void;
  onDelete: (explorer: Player) => void;
  onViewProgress: (explorer: Player) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl">
            {getAvatarEmoji(explorer.avatarKey || 'panda')}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{explorer.name}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                {explorer.starsEarnedTotal || 0} stars
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-blue-500" />
                {explorer.gamesPlayed || 0} games
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-green-500" />
                {explorer.dailyQuestStreak || 0} explorer days
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {explorer.profileType === 'adult' ? 'Adult' : 'Kid'} • {explorer.ageRange || 'Not set'}
            </div>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-blue-500"
              onClick={() => onEdit(explorer)}
              data-testid={`edit-explorer-${explorer.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-orange-500"
              onClick={() => onArchive(explorer)}
              data-testid={`archive-explorer-${explorer.id}`}
            >
              <Archive className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-red-500"
              onClick={() => onDelete(explorer)}
              data-testid={`delete-explorer-${explorer.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <Button
            onClick={() => onViewProgress(explorer)}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold"
            data-testid={`view-progress-${explorer.id}`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            View Progress
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExplorerDetailView({
  explorer,
  onBack,
  rewardTiers,
  onClaimReward,
  onViewCertificate,
}: {
  explorer: Player;
  onBack: () => void;
  rewardTiers: RewardTier[];
  onClaimReward: (unlock: RewardUnlock) => void;
  onViewCertificate: (unlock: RewardUnlock) => void;
}) {
  const [stats, setStats] = useState<ExplorerDetailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardsData, setRewardsData] = useState<ExplorerRewardsData | null>(null);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  useEffect(() => {
    loadExplorerStats();
    loadRewardsData();
  }, [explorer.id]);

  const loadExplorerStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/players/${explorer.id}`);
      if (response.ok) {
        const data = await response.json();
        const gamesPlayed = data.gamesPlayed || 0;
        const gameHistory = data.gameHistory || [];
        const collectedCards = data.collectedCardIds || [];

        const citiesVisited: string[] = data.citiesVisited || [];
        setStats({
          gamesPlayed,
          gamesWon: gameHistory.filter((g: GameHistoryEntry) => g.won).length,
          starsEarnedTotal: data.starsEarnedTotal || 0,
          cardsCollected: collectedCards.length,
          citiesDiscovered: citiesVisited.length,
          collectedCardIds: collectedCards,
          dailyQuestStreak: data.dailyQuestStreak || 0,
          crossworldStreak: data.crossworldStreak || 0,
          badgeLevel: getBadgeLevel(gamesPlayed),
          gameHistory,
        });
      }
    } catch (error) {
      console.error('Failed to load explorer stats:', error);
      toast.error('Failed to load explorer stats');
    }
    setLoading(false);
  };

  const loadRewardsData = async () => {
    setLoadingRewards(true);
    try {
      const response = await fetch(`/api/rewards/explorer/${explorer.id}`);
      if (response.ok) {
        const data = await response.json();
        setRewardsData(data);
      }
    } catch (error) {
      console.error('Failed to load rewards data:', error);
    }
    setLoadingRewards(false);
  };

  const getProgressForTier = (tier: RewardTier): number => {
    if (!rewardsData) return 0;
    if (tier.triggerType === 'cities_mastered') return rewardsData.stats.masteredCities;
    if (tier.triggerType === 'continents_explored') return rewardsData.stats.continentsExplored;
    return 0;
  };

  const getUnlockForTier = (tierId: string): RewardUnlock | undefined => {
    return rewardsData?.unlocks.find(u => u.tierId === tierId);
  };

  const getFilteredStats = () => {
    if (!stats) return null;
    if (selectedYear === 0) return stats;

    if (stats.gameHistory.length === 0) {
      return stats;
    }

    const filteredHistory = stats.gameHistory.filter(g => {
      const gameYear = new Date(g.date).getFullYear();
      return gameYear === selectedYear;
    });

    return {
      ...stats,
      gamesPlayed: filteredHistory.length,
      gamesWon: filteredHistory.filter(g => g.won).length,
      starsEarnedTotal: filteredHistory.reduce((sum, g) => sum + g.stars, 0),
    };
  };

  const filteredStats = getFilteredStats();

  if (loading) {
    return (
      <Card className="bg-white/95 mb-8">
        <CardContent className="p-8">
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || !filteredStats) {
    return (
      <Card className="bg-white/95 mb-8">
        <CardContent className="p-8 text-center text-gray-500">
          Failed to load explorer data. Please try again.
        </CardContent>
      </Card>
    );
  }

  const milestones = getNextMilestones(stats.gamesPlayed, stats.starsEarnedTotal, stats.dailyQuestStreak);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <Card className="bg-white/95">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800"
              data-testid="button-back-to-explorers"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-4xl">{getAvatarEmoji(explorer.avatarKey || 'panda')}</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">{explorer.name}'s Progress</h2>
              <p className="text-sm text-gray-500">{stats.badgeLevel} • {explorer.ageRange || 'Not set'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
                data-testid="select-year-filter"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
                <option value={0}>All Time</option>
              </select>
            </div>
          </div>

          {selectedYear !== 0 && (
            <p className="text-xs text-gray-400 mb-1">Games, wins, and stars are filtered by year. Cities and cards show all-time totals.</p>
          )}
          <div className="grid grid-cols-5 gap-2">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl text-center border border-blue-200">
              <Trophy className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-games-won">{filteredStats.gamesWon}</div>
              <div className="text-xs text-blue-500">Won</div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 rounded-xl text-center border border-slate-200">
              <Target className="w-5 h-5 mx-auto text-slate-500 mb-1" />
              <div className="text-2xl font-bold text-slate-700" data-testid="stat-games-played">{filteredStats.gamesPlayed}</div>
              <div className="text-xs text-slate-500">Played</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded-xl text-center border border-yellow-200">
              <Star className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
              <div className="text-2xl font-bold text-yellow-600" data-testid="stat-stars">{filteredStats.starsEarnedTotal}</div>
              <div className="text-xs text-yellow-500">Stars</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-3 rounded-xl text-center border border-emerald-200">
              <Globe className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
              <div className="text-2xl font-bold text-emerald-600" data-testid="stat-cities-discovered">{stats.citiesDiscovered}</div>
              <div className="text-xs text-emerald-500">Cities</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl text-center border border-green-200">
              <Map className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <div className="text-2xl font-bold text-green-600" data-testid="stat-cards">{stats.cardsCollected}</div>
              <div className="text-xs text-green-500">Cards</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/95">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            Daily Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📅</span>
                <span className="font-bold text-sm">Daily Quest</span>
              </div>
              <div className="flex justify-between text-xs">
                <span><Flame className="w-3 h-3 inline" /> {stats.dailyQuestStreak} streak</span>
                <span>✓ {stats.gamesWon} wins</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">✍️</span>
                <span className="font-bold text-sm">CrossWorld</span>
              </div>
              <div className="flex justify-between text-xs">
                <span><Flame className="w-3 h-3 inline" /> {stats.crossworldStreak} streak</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/95">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Skills Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {SKILLS.map((skill) => {
              const level = getSkillLevel(skill.name, stats.gamesPlayed, stats.starsEarnedTotal, stats.cardsCollected, stats.dailyQuestStreak);
              return (
                <div key={skill.name} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100" data-testid={`skill-${skill.name.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className="text-2xl mb-1">{skill.icon}</div>
                  <div className="text-xs font-bold text-slate-700">{skill.name}</div>
                  <div className="flex justify-center gap-0.5 mt-2">
                    {[...Array(skill.maxLevel)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-3 h-3 rounded-full ${i < level ? 'bg-blue-500' : 'bg-slate-200'}`} 
                      />
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Level {level}/{skill.maxLevel}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/95">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Map className="w-5 h-5 text-indigo-500" />
            Learning Paths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {LEARNING_PATHS.map((path) => {
              const isUnlocked = stats.gamesPlayed >= path.unlockCondition;
              const progress = path.unlockCondition === 0 
                ? Math.min(100, (stats.cardsCollected / 40) * 100)
                : isUnlocked ? 100 : (stats.gamesPlayed / path.unlockCondition) * 100;
              
              return (
                <div 
                  key={path.id}
                  className={`p-3 rounded-xl border-2 ${path.bgColor} ${path.borderColor} ${!isUnlocked ? 'opacity-60' : ''}`}
                  data-testid={`learning-path-${path.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${path.color} flex items-center justify-center text-white`}>
                      {isUnlocked ? path.icon : <Lock className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-800">{path.title}</h4>
                        {isUnlocked && path.unlockCondition > 0 && (
                          <span className="text-xs text-green-600 font-medium">✓ Unlocked</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">{path.description}</p>
                      {!isUnlocked && (
                        <p className="text-[10px] text-orange-600 mt-1">
                          🔒 Play {path.unlockCondition} games to unlock
                        </p>
                      )}
                      {isUnlocked && (
                        <div className="mt-1.5">
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className={`bg-gradient-to-r ${path.color} h-1.5 rounded-full`}
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">{Math.round(progress)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {milestones.length > 0 && (
        <Card className="bg-white/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Milestone Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {milestones.map((milestone, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-100" data-testid={`milestone-${idx}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{milestone.icon}</div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-800">{milestone.title}</div>
                      <p className="text-[10px] text-slate-500">{milestone.description}</p>
                      <div className="mt-1.5">
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`bg-gradient-to-r ${milestone.color} h-2 rounded-full transition-all`}
                            style={{ width: `${Math.min(100, (milestone.progress / milestone.target) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500">{milestone.progress}/{milestone.target}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/95">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {stats.gamesPlayed < 5 && (
              <div className="bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl p-3 text-white">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <span className="font-bold text-sm">Guess & Go</span>
                </div>
                <p className="text-xs text-white/80 mt-1">Great for beginners!</p>
              </div>
            )}
            {stats.dailyQuestStreak < 3 && (
              <div className="bg-gradient-to-r from-orange-400 to-yellow-400 rounded-xl p-3 text-white">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <span className="font-bold text-sm">Daily Quest</span>
                </div>
                <p className="text-xs text-white/80 mt-1">Build a learning streak!</p>
              </div>
            )}
            <div className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl p-3 text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg">✍️</span>
                <span className="font-bold text-sm">CrossWorld</span>
              </div>
              <p className="text-xs text-white/80 mt-1">Practice spelling!</p>
            </div>
            <div className="bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl p-3 text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg">🦁</span>
                <span className="font-bold text-sm">Find My Home</span>
              </div>
              <p className="text-xs text-white/80 mt-1">Learn animal habitats!</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/95">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" />
            Rewards Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRewards ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : rewardTiers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No rewards available</p>
          ) : (
            <div className="space-y-3">
              {rewardTiers.map(tier => {
                const unlock = getUnlockForTier(tier.id);
                return (
                  <RewardProgressCard
                    key={tier.id}
                    tier={tier}
                    unlock={unlock}
                    currentProgress={getProgressForTier(tier)}
                    onClaim={unlock && unlock.status === 'unlocked' ? () => onClaimReward(unlock) : undefined}
                    onViewCertificate={unlock && (unlock.status === 'claimed' || unlock.status === 'fulfilled') && tier.rewardType === 'certificate' ? () => onViewCertificate(unlock) : undefined}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface CertificateData {
  explorerName: string;
  avatarKey: string;
  tierName: string;
  rewardDescription: string;
  masteredCities: { city: string; country: string }[];
  unlockedAt: string;
}

export default function ParentDashboard() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { explorers, loadExplorers, isLoading, archiveExplorer } = useExplorer();
  const { requestAccess } = useParentalGate();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [selectedExplorer, setSelectedExplorer] = useState<Player | null>(null);
  
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  
  const [showChangeEmailDialog, setShowChangeEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailStep, setEmailStep] = useState<'input' | 'verify'>('input');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [explorerToArchive, setExplorerToArchive] = useState<Player | null>(null);
  const [archiving, setArchiving] = useState(false);
  
  const [deletingExplorer, setDeletingExplorer] = useState<Player | null>(null);
  const [showParentalLock, setShowParentalLock] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathError, setMathError] = useState(false);
  const [mathProblem, setMathProblem] = useState<{ a: number; b: number; token: string } | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  
  const [archivedExplorers, setArchivedExplorers] = useState<Player[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  
  const [showEditExplorerDialog, setShowEditExplorerDialog] = useState(false);
  const [explorerToEdit, setExplorerToEdit] = useState<Player | null>(null);
  const [editExplorerName, setEditExplorerName] = useState('');
  const [savingExplorer, setSavingExplorer] = useState(false);

  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [selectedUnlock, setSelectedUnlock] = useState<RewardUnlock | null>(null);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimAddress, setClaimAddress] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);

  useEffect(() => {
    if (user?.id && isUnlocked) {
      loadExplorers(user.id);
      loadRewardTiers();
      loadArchivedExplorers();
    }
  }, [user?.id, isUnlocked, loadExplorers]);

  const loadRewardTiers = async () => {
    try {
      const response = await fetch('/api/rewards/tiers');
      if (response.ok) {
        const data = await response.json();
        setRewardTiers(data.tiers || []);
      }
    } catch (error) {
      console.error('Failed to load reward tiers:', error);
    }
  };

  const handleClaimReward = (unlock: RewardUnlock) => {
    setSelectedUnlock(unlock);
    setClaimEmail(user?.email || '');
    setClaimAddress('');
    setShowClaimDialog(true);
  };

  const handleSubmitClaim = async () => {
    if (!selectedUnlock || !claimEmail) return;
    
    const needsShipping = selectedUnlock.tier.rewardType === 'sticker_pack' || 
                          selectedUnlock.tier.rewardType === 'world_map_puzzle' ||
                          selectedUnlock.tier.rewardType === 'magazine_subscription';
    
    if (needsShipping && !claimAddress) {
      toast.error('Please enter a shipping address');
      return;
    }

    setClaimSubmitting(true);
    try {
      const response = await fetch(`/api/rewards/claim/${selectedUnlock.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parentEmail: claimEmail, 
          shippingAddress: needsShipping ? claimAddress : undefined 
        }),
      });

      if (response.ok) {
        toast.success('Reward claimed successfully!');
        setShowClaimDialog(false);
        
        if (selectedUnlock.tier.rewardType === 'certificate') {
          const certResponse = await fetch(`/api/rewards/certificate/${selectedUnlock.id}`);
          if (certResponse.ok) {
            const certData = await certResponse.json();
            setCertificateData(certData);
            setShowCertificate(true);
          }
        }
      } else {
        toast.error('Failed to claim reward');
      }
    } catch (error) {
      toast.error('Failed to claim reward');
    }
    setClaimSubmitting(false);
  };

  const handleViewCertificate = async (unlock: RewardUnlock) => {
    try {
      const response = await fetch(`/api/rewards/certificate/${unlock.id}`);
      if (response.ok) {
        const data = await response.json();
        setCertificateData(data);
        setShowCertificate(true);
      } else {
        toast.error('Failed to load certificate');
      }
    } catch (error) {
      toast.error('Failed to load certificate');
    }
  };

  const handleUnlock = () => {
    requestAccess(() => {
      setIsUnlocked(true);
    });
  };

  const handleEditName = () => {
    setNewName(user?.firstName || user?.username || '');
    setShowEditNameDialog(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim() || !user?.id) return;
    
    setSavingName(true);
    try {
      const response = await fetch(`/api/users/${user.id}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      
      if (response.ok) {
        toast.success('Name updated successfully!');
        setShowEditNameDialog(false);
        window.location.reload();
      } else {
        toast.error('Failed to update name');
      }
    } catch (error) {
      toast.error('Failed to update name');
    }
    setSavingName(false);
  };

  const handleChangeEmail = () => {
    setNewEmail('');
    setVerificationCode('');
    setEmailStep('input');
    setShowChangeEmailDialog(true);
  };

  const handleSendVerificationCode = async () => {
    if (!newEmail.trim() || !user?.id) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setSendingCode(true);
    try {
      const response = await fetch('/api/email/change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newEmail: newEmail.trim() }),
      });
      
      if (response.ok) {
        toast.success('Verification code sent to your new email!');
        setEmailStep('verify');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to send verification code');
      }
    } catch (error) {
      toast.error('Failed to send verification code');
    }
    setSendingCode(false);
  };

  const handleVerifyAndChangeEmail = async () => {
    if (!verificationCode.trim() || !user?.id) return;
    
    setVerifyingCode(true);
    try {
      const response = await fetch('/api/email/change-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          newEmail: newEmail.trim(),
          code: verificationCode.trim()
        }),
      });
      
      if (response.ok) {
        toast.success('Email changed successfully!');
        setShowChangeEmailDialog(false);
        window.location.reload();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Invalid verification code');
      }
    } catch (error) {
      toast.error('Failed to verify code');
    }
    setVerifyingCode(false);
  };

  const handleArchiveExplorer = (explorer: Player) => {
    setExplorerToArchive(explorer);
    setShowArchiveDialog(true);
  };

  const confirmArchiveExplorer = async () => {
    if (!explorerToArchive) return;
    
    setArchiving(true);
    try {
      const success = await archiveExplorer(explorerToArchive.id);
      if (success) {
        toast.success(`${explorerToArchive.name} has been archived`);
        setShowArchiveDialog(false);
        setExplorerToArchive(null);
        if (user?.id) {
          loadExplorers(user.id);
          loadArchivedExplorers();
        }
      } else {
        toast.error('Failed to archive explorer');
      }
    } catch (error) {
      toast.error('Failed to archive explorer');
    }
    setArchiving(false);
  };

  const loadArchivedExplorers = async () => {
    if (!user?.id) return;
    setLoadingArchived(true);
    try {
      const response = await fetch(`/api/explorers/archived/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setArchivedExplorers(data);
      }
    } catch (error) {
      console.error('Failed to load archived explorers:', error);
    }
    setLoadingArchived(false);
  };

  const handleRestoreExplorer = async (explorerId: string) => {
    setRestoringId(explorerId);
    try {
      const response = await fetch(`/api/explorers/${explorerId}/restore`, {
        method: 'POST',
      });
      if (response.ok) {
        toast.success('Explorer restored!');
        if (user?.id) {
          loadExplorers(user.id);
          loadArchivedExplorers();
        }
      } else {
        toast.error('Failed to restore explorer');
      }
    } catch (error) {
      toast.error('Failed to restore explorer');
    }
    setRestoringId(null);
  };

  const handleInitiateDelete = async (explorer: Player) => {
    setDeletingExplorer(explorer);
    setMathAnswer('');
    setMathError(false);
    setLoadingChallenge(true);
    setShowParentalLock(true);
    
    try {
      const response = await fetch('/api/parental-challenge');
      const data = await response.json();
      setMathProblem(data);
    } catch (error) {
      toast.error('Failed to load verification. Please try again.');
      setShowParentalLock(false);
    }
    setLoadingChallenge(false);
  };

  const handleVerifyMath = () => {
    if (!mathProblem) return;
    if (parseInt(mathAnswer) === mathProblem.a + mathProblem.b) {
      setShowParentalLock(false);
      setShowDeleteConfirm(true);
    } else {
      setMathError(true);
      setMathAnswer('');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingExplorer || !mathProblem) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/explorers/${deletingExplorer.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentalChallenge: {
            token: mathProblem.token,
            answer: mathProblem.a + mathProblem.b,
          },
        }),
      });
      
      if (response.ok) {
        toast.success(`${deletingExplorer.name} has been permanently deleted`);
        if (user?.id) {
          loadExplorers(user.id);
        }
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to delete explorer');
      }
    } catch (error) {
      toast.error('Failed to delete explorer');
    }
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    setDeletingExplorer(null);
    setMathProblem(null);
  };

  const handleCancelDelete = () => {
    setShowParentalLock(false);
    setShowDeleteConfirm(false);
    setDeletingExplorer(null);
    setMathProblem(null);
  };

  const handleEditExplorer = (explorer: Player) => {
    setExplorerToEdit(explorer);
    setEditExplorerName(explorer.name);
    setShowEditExplorerDialog(true);
  };

  const handleSaveExplorer = async () => {
    if (!explorerToEdit || !editExplorerName.trim()) return;
    
    setSavingExplorer(true);
    try {
      const response = await fetch(`/api/explorers/${explorerToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editExplorerName.trim() }),
      });
      
      if (response.ok) {
        toast.success('Explorer updated!');
        setShowEditExplorerDialog(false);
        if (user?.id) {
          loadExplorers(user.id);
        }
      } else {
        toast.error('Failed to update explorer');
      }
    } catch (error) {
      toast.error('Failed to update explorer');
    }
    setSavingExplorer(false);
  };

  const handleViewProgress = (explorer: Player) => {
    setSelectedExplorer(explorer);
  };

  const totalStars = explorers.reduce((sum, e) => sum + (e.starsEarnedTotal || 0), 0);
  const totalGames = explorers.reduce((sum, e) => sum + (e.gamesPlayed || 0), 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-400 via-purple-300 to-blue-300 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-xl font-fredoka">Please sign in to access the dashboard</p>
          <Button 
            className="mt-4"
            onClick={() => window.location.href = '/api/login'}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-400 via-purple-300 to-blue-300 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 shadow-xl max-w-md text-center"
        >
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-10 h-10 text-purple-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 font-fredoka">
            Parent Dashboard
          </h2>
          <p className="text-gray-600 mb-6">
            This area is for grown-ups only. Please solve a quick puzzle to enter.
          </p>
          <Button
            size="lg"
            onClick={handleUnlock}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold"
            data-testid="unlock-dashboard-button"
          >
            <Lock className="w-5 h-5 mr-2" />
            Unlock Dashboard
          </Button>
          <Button
            variant="ghost"
            className="mt-4 w-full"
            onClick={() => navigate('/whos-playing')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explorers
          </Button>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400 via-purple-300 to-blue-300 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2 mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/whos-playing')}
            className="text-white hover:bg-white/20"
            data-testid="back-to-explorers-button"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Explorers
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/20"
            data-testid="back-to-home-button"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white font-fredoka drop-shadow-lg mb-2">
            Parent Dashboard
          </h1>
          <p className="text-white/80">
            Manage explorers and view progress
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/95">
            <CardContent className="p-4 text-center">
              <User className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <div className="text-3xl font-bold text-gray-800">{explorers.length}</div>
              <div className="text-sm text-gray-600">Explorers</div>
            </CardContent>
          </Card>
          <Card className="bg-white/95">
            <CardContent className="p-4 text-center">
              <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-3xl font-bold text-gray-800">{totalStars}</div>
              <div className="text-sm text-gray-600">Total Stars</div>
            </CardContent>
          </Card>
          <Card className="bg-white/95">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <div className="text-3xl font-bold text-gray-800">{totalGames}</div>
              <div className="text-sm text-gray-600">Games Played</div>
            </CardContent>
          </Card>
        </div>

        <AnimatePresence mode="wait">
          {selectedExplorer ? (
            <ExplorerDetailView
              key={`detail-${selectedExplorer.id}`}
              explorer={selectedExplorer}
              onBack={() => setSelectedExplorer(null)}
              rewardTiers={rewardTiers}
              onClaimReward={handleClaimReward}
              onViewCertificate={handleViewCertificate}
            />
          ) : (
            <motion.div
              key="explorer-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="bg-white/95 mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Explorers ({explorers.length}/5)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent" />
                    </div>
                  ) : explorers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No explorers yet</p>
                      <Button
                        className="mt-4"
                        onClick={() => navigate('/add-explorer')}
                      >
                        Add First Explorer
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {explorers.map((explorer) => (
                        <ExplorerSummary 
                          key={explorer.id} 
                          explorer={explorer}
                          onEdit={handleEditExplorer}
                          onArchive={handleArchiveExplorer}
                          onDelete={handleInitiateDelete}
                          onViewProgress={handleViewProgress}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {archivedExplorers.length > 0 && (
                <Card className="bg-white/95 mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Archive className="w-5 h-5" />
                      Archived Explorers ({archivedExplorers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingArchived ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {archivedExplorers.map((explorer) => (
                          <div key={explorer.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className="text-3xl">
                              {getAvatarEmoji(explorer.avatarKey || 'panda')}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-700">{explorer.name}</h4>
                              <div className="text-sm text-gray-500">
                                {explorer.starsEarnedTotal || 0} stars • {explorer.gamesPlayed || 0} games
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreExplorer(explorer.id)}
                              disabled={restoringId === explorer.id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              data-testid={`restore-explorer-${explorer.id}`}
                            >
                              {restoringId === explorer.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <RotateCcw className="w-4 h-4 mr-2" />
                              )}
                              Restore
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="bg-white/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">Email</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleChangeEmail}
                        data-testid="button-change-email"
                      >
                        Change
                      </Button>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">Account Name</div>
                        <div className="text-sm text-gray-500">{user.firstName || user.username || 'Not set'}</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleEditName}
                        data-testid="button-edit-name"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium">Email Preferences</div>
                        <div className="text-sm text-gray-500">Manage notifications</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/email-preferences?email=${encodeURIComponent(user.email || '')}&from=parent-dashboard`)}
                        data-testid="button-manage-preferences"
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Account Name</DialogTitle>
            <DialogDescription>
              Change the display name for your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter your name"
                data-testid="input-new-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditNameDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveName} 
              disabled={savingName || !newName.trim()}
              data-testid="button-save-name"
            >
              {savingName ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChangeEmailDialog} onOpenChange={setShowChangeEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {emailStep === 'input' ? 'Change Email Address' : 'Verify New Email'}
            </DialogTitle>
            <DialogDescription>
              {emailStep === 'input' 
                ? 'Enter your new email address. We will send a verification code to confirm.'
                : `Enter the 6-digit code sent to ${newEmail}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {emailStep === 'input' ? (
              <div className="space-y-2">
                <Label htmlFor="new-email">New Email Address</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  data-testid="input-new-email"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  data-testid="input-verification-code"
                />
                <p className="text-sm text-gray-500 text-center">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleSendVerificationCode}
                    className="text-purple-600 hover:underline"
                    disabled={sendingCode}
                  >
                    Resend
                  </button>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeEmailDialog(false)}>
              Cancel
            </Button>
            {emailStep === 'input' ? (
              <Button 
                onClick={handleSendVerificationCode} 
                disabled={sendingCode || !newEmail.trim()}
                data-testid="button-send-code"
              >
                {sendingCode ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                Send Code
              </Button>
            ) : (
              <Button 
                onClick={handleVerifyAndChangeEmail} 
                disabled={verifyingCode || verificationCode.length !== 6}
                data-testid="button-verify-email"
              >
                {verifyingCode ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Verify & Change
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Archive Explorer
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to archive {explorerToArchive?.name}? 
              Their progress will be saved but they won't appear in "Who's Playing" anymore.
              You can restore them later from this dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {explorerToArchive && (
              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-4xl">{getAvatarEmoji(explorerToArchive.avatarKey || 'panda')}</div>
                <div>
                  <p className="font-bold text-gray-800">{explorerToArchive.name}</p>
                  <p className="text-sm text-gray-600">
                    {explorerToArchive.starsEarnedTotal || 0} stars • {explorerToArchive.gamesPlayed || 0} games
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmArchiveExplorer}
              disabled={archiving}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="button-confirm-archive"
            >
              {archiving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
              Archive Explorer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showParentalLock} onOpenChange={(open) => !open && handleCancelDelete()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Parental Verification</DialogTitle>
            <DialogDescription className="text-center">
              To delete {deletingExplorer?.name}'s profile, please solve this math problem:
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            {loadingChallenge ? (
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : mathProblem ? (
              <>
                <p className="text-3xl font-bold text-gray-800 mb-4">
                  {mathProblem.a} + {mathProblem.b} = ?
                </p>
                <Input
                  type="number"
                  value={mathAnswer}
                  onChange={(e) => {
                    setMathAnswer(e.target.value);
                    setMathError(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyMath()}
                  placeholder="Enter your answer"
                  className={`text-center text-xl ${mathError ? 'border-red-500' : ''}`}
                  data-testid="parental-lock-answer"
                />
                {mathError && (
                  <p className="text-red-500 text-sm mt-2">
                    Incorrect answer. Please try again.
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-500">Failed to load challenge. Please try again.</p>
            )}
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={handleCancelDelete} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleVerifyMath}
              disabled={!mathAnswer || loadingChallenge || !mathProblem}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={(open) => !open && handleCancelDelete()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-red-600">Delete Explorer?</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-gray-700">
              Are you sure you want to delete <span className="font-bold">{deletingExplorer?.name}</span>?
            </p>
            <p className="text-gray-500 text-sm mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={handleCancelDelete} disabled={isDeleting} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditExplorerDialog} onOpenChange={setShowEditExplorerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Explorer</DialogTitle>
            <DialogDescription>
              Update the details for {explorerToEdit?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="explorer-name">Name</Label>
              <Input
                id="explorer-name"
                value={editExplorerName}
                onChange={(e) => setEditExplorerName(e.target.value)}
                placeholder="Enter explorer name"
                data-testid="input-explorer-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditExplorerDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveExplorer}
              disabled={savingExplorer || !editExplorerName.trim()}
              data-testid="button-save-explorer"
            >
              {savingExplorer ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-500" />
              Claim Reward
            </DialogTitle>
            <DialogDescription>
              {selectedUnlock?.tier.name} - {selectedUnlock?.tier.rewardDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="claim-email">Parent's Email</Label>
              <Input
                id="claim-email"
                type="email"
                value={claimEmail}
                onChange={(e) => setClaimEmail(e.target.value)}
                placeholder="Enter email address"
                data-testid="input-claim-email"
              />
            </div>
            {(selectedUnlock?.tier.rewardType === 'sticker_pack' || 
              selectedUnlock?.tier.rewardType === 'world_map_puzzle' ||
              selectedUnlock?.tier.rewardType === 'magazine_subscription') && (
              <div className="space-y-2">
                <Label htmlFor="claim-address">Shipping Address</Label>
                <textarea
                  id="claim-address"
                  value={claimAddress}
                  onChange={(e) => setClaimAddress(e.target.value)}
                  placeholder="Street address, city, state, zip code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none h-24"
                  data-testid="input-claim-address"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClaimDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitClaim}
              disabled={claimSubmitting || !claimEmail.trim()}
              className="bg-purple-500 hover:bg-purple-600 text-white"
              data-testid="button-submit-reward-claim"
            >
              {claimSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />}
              Claim Reward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrintableCertificate
        isOpen={showCertificate}
        onClose={() => setShowCertificate(false)}
        data={certificateData}
      />
    </div>
  );
}
