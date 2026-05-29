import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { useSubscription } from "@/lib/subscriptionContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Trophy, Star, Calendar, Map, Medal, X, ChevronLeft, ChevronRight, 
  Users, Crown, Globe, Lightbulb, BookOpen, Brain, Compass, Lock,
  Flame, Target, Award, BarChart3, Sparkles
} from "lucide-react";
import { LOCATION_CARDS } from "@/lib/gameData";
import { ALL_PASSPORT_CITIES } from "@/lib/dailyQuestData";
import { getCityImage } from "@/lib/cityImages";
import { FlagImage } from "./FlagImage";
import type { Player } from "@shared/schema";

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExplorerStats {
  explorer: Player;
  gamesPlayed: number;
  gamesWon: number;
  starsEarnedTotal: number;
  cardsCollected: number;
  badgeLevel: string;
  gameHistory: Array<{ date: string; stars: number; won: boolean }>;
  collectedCardIds: string[];
  dailyQuestStreak: number;
  crossworldStreak: number;
}

const AVATAR_OPTIONS: Record<string, string> = {
  panda: '🐼', lion: '🦁', elephant: '🐘', penguin: '🐧',
  koala: '🐨', fox: '🦊', owl: '🦉', turtle: '🐢',
  butterfly: '🦋', dolphin: '🐬', rocket: '🚀', globe: '🌍',
};

function getBadgeLevel(gamesPlayed: number): string {
  if (gamesPlayed > 20) return "Master Geographer";
  if (gamesPlayed > 10) return "Global Adventurer";
  if (gamesPlayed > 5) return "Seasoned Traveler";
  return "Novice Explorer";
}

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

const SKILLS = [
  { name: "City Explorer", icon: "🏙️", maxLevel: 5 },
  { name: "Star Collector", icon: "⭐", maxLevel: 5 },
  { name: "Streak Master", icon: "🔥", maxLevel: 5 },
  { name: "Spelling Champ", icon: "📝", maxLevel: 5 },
  { name: "Nature Friend", icon: "🦋", maxLevel: 5 },
  { name: "Memory Pro", icon: "🧠", maxLevel: 5 },
];

export function AnalyticsDashboard({ isOpen, onClose }: AnalyticsDashboardProps) {
  const { user, stats, collectedCardIds } = useUser();
  const { activeExplorer, explorers } = useExplorer();
  const subscription = useSubscription();
  const { isPro, isFirstMonthFree } = subscription || {};
  const [showCardsView, setShowCardsView] = useState(false);
  const [selectedExplorerId, setSelectedExplorerId] = useState<string | null>(null);
  const [explorerStatsMap, setExplorerStatsMap] = useState<Record<string, ExplorerStats>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const isParent = activeExplorer?.profileType === 'parent' || activeExplorer?.profileType === 'adult';
  const activeExplorers = explorers.filter(e => !e.isArchived);
  
  const hasFullAnalytics = isPro || isFirstMonthFree;

  useEffect(() => {
    if (isOpen && activeExplorers.length > 0) {
      loadAllExplorerStats();
    }
  }, [isOpen, activeExplorers.length]);

  const loadAllExplorerStats = async () => {
    setIsLoadingStats(true);
    const statsMap: Record<string, ExplorerStats> = {};
    
    for (const explorer of activeExplorers) {
      try {
        const response = await fetch(`/api/players/${explorer.id}`);
        if (response.ok) {
          const playerData = await response.json();
          const gamesPlayed = playerData.gamesPlayed || 0;
          const gameHistory = playerData.gameHistory || [];
          const collectedCards = playerData.collectedCardIds || [];
          
          statsMap[explorer.id] = {
            explorer,
            gamesPlayed,
            gamesWon: gameHistory.filter((g: any) => g.won).length,
            starsEarnedTotal: playerData.starsEarnedTotal || 0,
            cardsCollected: collectedCards.length,
            badgeLevel: getBadgeLevel(gamesPlayed),
            gameHistory,
            collectedCardIds: collectedCards,
            dailyQuestStreak: playerData.dailyQuestStreak || 0,
            crossworldStreak: playerData.crossworldStreak || 0,
          };
        }
      } catch (error) {
        console.error(`Failed to load stats for explorer ${explorer.id}:`, error);
      }
    }
    
    setExplorerStatsMap(statsMap);
    setIsLoadingStats(false);
  };

  if (!user) return null;

  const currentBadgeLevel = getBadgeLevel(stats.gamesPlayed);
  const dailyQuestStreak = stats.dailyQuestStreak || 0;
  const crossworldStreak = stats.crossworldStreak || 0;

  const combinedStats = {
    gamesPlayed: Object.values(explorerStatsMap).reduce((sum, s) => sum + s.gamesPlayed, 0),
    gamesWon: Object.values(explorerStatsMap).reduce((sum, s) => sum + s.gamesWon, 0),
    starsEarnedTotal: Object.values(explorerStatsMap).reduce((sum, s) => sum + s.starsEarnedTotal, 0),
    cardsCollected: Object.values(explorerStatsMap).reduce((sum, s) => sum + s.cardsCollected, 0),
  };

  const leaderboard = Object.values(explorerStatsMap)
    .sort((a, b) => b.starsEarnedTotal - a.starsEarnedTotal)
    .map((stats, index) => ({ ...stats, rank: index + 1 }));

  const selectedExplorerStats = selectedExplorerId ? explorerStatsMap[selectedExplorerId] : null;

  const getSkillLevel = (skillName: string, gamesPlayed: number, starsTotal: number, cardsCount: number, streak: number): number => {
    if (skillName === "City Explorer") return Math.min(5, Math.floor(cardsCount / 8));
    if (skillName === "Star Collector") return Math.min(5, Math.floor(starsTotal / 50));
    if (skillName === "Streak Master") return Math.min(5, Math.floor(streak / 3));
    if (skillName === "Spelling Champ") return Math.min(5, Math.floor(gamesPlayed / 10));
    if (skillName === "Nature Friend") return Math.min(5, Math.floor(gamesPlayed / 8));
    if (skillName === "Memory Pro") return Math.min(5, Math.floor(gamesPlayed / 12));
    return 0;
  };

  const renderKnowledgeHub = (
    gamesPlayed: number, 
    starsTotal: number, 
    cardsIds: string[], 
    dqStreak: number, 
    cwStreak: number,
    gamesWon: number
  ) => (
    <>
      {/* Daily Challenges */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-orange-500" /> Daily Challenges
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📅</span>
              <span className="font-bold text-sm">Daily Quest</span>
            </div>
            <div className="flex justify-between text-xs">
              <span><Flame className="w-3 h-3 inline" /> {dqStreak} streak</span>
              <span>✓ {gamesWon} wins</span>
              <span>🎯 {gamesPlayed} played</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">✍️</span>
              <span className="font-bold text-sm">CrossWorld</span>
            </div>
            <div className="flex justify-between text-xs">
              <span><Flame className="w-3 h-3 inline" /> {cwStreak} streak</span>
              <span>🎯 played</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended For You */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center">
          <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" /> Recommended For You
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/play" onClick={onClose}>
            <div className="bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl p-3 text-white cursor-pointer hover:scale-[1.02] transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <span className="font-bold text-sm">Guess & Go</span>
                  </div>
                  <p className="text-xs text-white/80 mt-1">Perfect for beginners!</p>
                </div>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
          <Link href="/knowledge-hub" onClick={onClose}>
            <div className="bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl p-3 text-white cursor-pointer hover:scale-[1.02] transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌍</span>
                    <span className="font-bold text-sm">Explore More</span>
                  </div>
                  <p className="text-xs text-white/80 mt-1">Full Knowledge Hub</p>
                </div>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Your Skills */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-500" /> Your Skills
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {SKILLS.map((skill) => {
            const level = getSkillLevel(skill.name, gamesPlayed, starsTotal, cardsIds.length, dqStreak);
            return (
              <div key={skill.name} className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{skill.icon}</div>
                <div className="text-xs font-bold text-slate-700">{skill.name}</div>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[...Array(skill.maxLevel)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full ${i < level ? 'bg-blue-500' : 'bg-slate-200'}`} 
                    />
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Level {level}/{skill.maxLevel}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Learning Paths */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center">
          <Map className="w-5 h-5 mr-2 text-indigo-500" /> Learning Paths
        </h3>
        <div className="space-y-2">
          {LEARNING_PATHS.map((path) => {
            const isUnlocked = gamesPlayed >= path.unlockCondition;
            const progress = path.unlockCondition === 0 
              ? Math.min(100, (cardsIds.length / ALL_PASSPORT_CITIES.length) * 100)
              : isUnlocked ? 100 : (gamesPlayed / path.unlockCondition) * 100;
            
            return (
              <div 
                key={path.id}
                className={`p-3 rounded-xl border-2 ${path.bgColor} ${path.borderColor} ${!isUnlocked ? 'opacity-60' : ''}`}
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
                    {isUnlocked && path.unlockCondition === 0 && (
                      <div className="mt-1.5">
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div 
                            className={`bg-gradient-to-r ${path.color} h-1.5 rounded-full`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500">{Math.round(progress)}%</span>
                      </div>
                    )}
                  </div>
                  {isUnlocked && <ChevronRight className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Full Knowledge Hub Button */}
      <Link href="/knowledge-hub" onClick={onClose}>
        <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-xl">
          <Sparkles className="w-4 h-4 mr-2" />
          View Full Knowledge Hub
        </Button>
      </Link>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-slate-50 border-4 border-blue-200 rounded-[2rem] p-0 overflow-hidden h-[80vh] flex flex-col [&>button]:hidden">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white relative flex-shrink-0">
          <button 
            onClick={() => {
              if (selectedExplorerId) {
                setSelectedExplorerId(null);
              } else if (showCardsView) {
                setShowCardsView(false);
              } else {
                onClose();
              }
            }}
            className="absolute top-4 right-4 p-2 bg-blue-500 hover:bg-blue-400 rounded-full transition-colors"
          >
            {(showCardsView || selectedExplorerId) ? <ChevronLeft className="w-5 h-5 text-white" /> : <X className="w-5 h-5 text-white" />}
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
              <span className="text-3xl">
                {showCardsView ? "🃏" : selectedExplorerId ? (AVATAR_OPTIONS[selectedExplorerStats?.explorer.avatarKey || 'globe'] || '🌍') : (isParent ? "👨‍👩‍👧‍👦" : "📊")}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold">
                {showCardsView ? "Card Collection" : selectedExplorerId ? `${selectedExplorerStats?.explorer.name}'s Hub` : (isParent ? "Family Dashboard" : "Explorer Stats")}
              </h2>
              <p className="text-blue-100 opacity-90 flex items-center text-sm font-medium">
                {showCardsView ? (
                  <><Map className="w-4 h-4 mr-1" /> {selectedExplorerStats?.cardsCollected || collectedCardIds.length} Cards Collected</>
                ) : selectedExplorerId ? (
                  <><Medal className="w-4 h-4 mr-1" /> {selectedExplorerStats?.badgeLevel}</>
                ) : isParent ? (
                  <><Users className="w-4 h-4 mr-1" /> {activeExplorers.length} Explorers</>
                ) : (
                  <><Medal className="w-4 h-4 mr-1" /> {currentBadgeLevel}</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          
          {/* Cards Collection View */}
          {showCardsView ? (
            <div className="space-y-4">
              {(selectedExplorerStats?.collectedCardIds || collectedCardIds).length === 0 ? (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
                  <div className="text-6xl mb-4">🗺️</div>
                  <h3 className="text-xl font-bold text-slate-700 mb-2">No Cards Yet!</h3>
                  <p className="text-slate-500">Play games to collect location cards from around the world!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(selectedExplorerStats?.collectedCardIds || collectedCardIds).map((cardId) => {
                    const card = LOCATION_CARDS.find(c => c.id === cardId);
                    if (!card) return null;
                    
                    return (
                      <div 
                        key={cardId}
                        className="bg-white rounded-2xl shadow-md border-2 border-slate-100 overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all"
                      >
                        <div className="aspect-[4/3] relative overflow-hidden">
                          <img 
                            src={getCityImage(card.city, card.continent)} 
                            alt={card.city}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <div className="flex items-center gap-2">
                              <FlagImage 
                                src={card.flagUrl} 
                                alt={card.country}
                                className="w-6 h-4 rounded shadow-sm object-cover"
                                countryCode={card.country}
                              />
                              <span className="text-white text-xs font-bold uppercase tracking-wider">{card.continent}</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="font-heading text-lg text-slate-800">{card.city}</h4>
                          <p className="text-xs text-slate-500 font-medium">{card.country}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : selectedExplorerId && selectedExplorerStats ? (
            /* Individual Explorer's Knowledge Hub View */
            <>
              {/* Stats Summary */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-center">
                  <Trophy className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                  <div className="text-xl font-heading text-blue-600">{selectedExplorerStats.gamesWon}</div>
                  <div className="text-[10px] text-slate-500">Won</div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-center">
                  <Target className="w-4 h-4 mx-auto text-slate-500 mb-1" />
                  <div className="text-xl font-heading text-slate-700">{selectedExplorerStats.gamesPlayed}</div>
                  <div className="text-[10px] text-slate-500">Played</div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-center">
                  <Star className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
                  <div className="text-xl font-heading text-yellow-500">{selectedExplorerStats.starsEarnedTotal}</div>
                  <div className="text-[10px] text-slate-500">Stars</div>
                </div>
                <div 
                  className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-center cursor-pointer hover:bg-green-50"
                  onClick={() => setShowCardsView(true)}
                >
                  <Map className="w-4 h-4 mx-auto text-green-500 mb-1" />
                  <div className="text-xl font-heading text-green-600">{selectedExplorerStats.cardsCollected}</div>
                  <div className="text-[10px] text-slate-500">Cards</div>
                </div>
              </div>

              {renderKnowledgeHub(
                selectedExplorerStats.gamesPlayed,
                selectedExplorerStats.starsEarnedTotal,
                selectedExplorerStats.collectedCardIds,
                selectedExplorerStats.dailyQuestStreak,
                selectedExplorerStats.crossworldStreak,
                selectedExplorerStats.gamesWon
              )}
            </>
          ) : isParent ? (
            /* Parent Dashboard View */
            <>
              {/* Combined Family Stats */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 rounded-2xl text-white">
                <h3 className="font-bold text-sm mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-2" /> Family Total Stats
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-heading">{combinedStats.gamesWon}</div>
                    <div className="text-xs text-white/70">Won</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-heading">{combinedStats.gamesPlayed}</div>
                    <div className="text-xs text-white/70">Played</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-heading">{combinedStats.starsEarnedTotal}</div>
                    <div className="text-xs text-white/70">Stars</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-heading">{combinedStats.cardsCollected}</div>
                    <div className="text-xs text-white/70">Cards</div>
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center">
                  <Crown className="w-5 h-5 mr-2 text-yellow-500" /> Family Leaderboard
                  {!hasFullAnalytics && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" /> PRO
                    </span>
                  )}
                </h3>
                {false ? (
                  <div />
                ) : isLoadingStats ? (
                  <div className="text-center py-4 text-slate-500">Loading stats...</div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-4 text-slate-500">No explorer data yet</div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry) => {
                      const isMe = entry.explorer.id === activeExplorer?.id;
                      return (
                      <div 
                        key={entry.explorer.id}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] ${
                          entry.rank === 1 ? 'bg-yellow-50 border-2 border-yellow-200' :
                          entry.rank === 2 ? 'bg-slate-100 border-2 border-slate-200' :
                          entry.rank === 3 ? 'bg-orange-50 border-2 border-orange-200' :
                          'bg-slate-50 border border-slate-100'
                        } ${isMe ? 'ring-2 ring-blue-400' : ''}`}
                        onClick={() => setSelectedExplorerId(entry.explorer.id)}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                          entry.rank === 2 ? 'bg-slate-400 text-white' :
                          entry.rank === 3 ? 'bg-orange-400 text-orange-900' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {entry.rank}
                        </div>
                        <div className="text-2xl">
                          {AVATAR_OPTIONS[entry.explorer.avatarKey || 'globe'] || '🌍'}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-800">{entry.explorer.name} {isMe && <span className="text-blue-500 text-xs">(You)</span>}</div>
                          <div className="text-xs text-slate-500">{entry.badgeLevel}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-yellow-600 flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400" /> {entry.starsEarnedTotal}
                          </div>
                          <div className="text-xs text-slate-500">{entry.gamesPlayed} games • {entry.cardsCollected} cards</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Links to Each Explorer's Knowledge Hub */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-500" /> Explorer Knowledge Hubs
                  {!hasFullAnalytics && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" /> PRO
                    </span>
                  )}
                </h3>
                {false ? (
                  <div />
                ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {activeExplorers.map((explorer) => {
                    const explorerStats = explorerStatsMap[explorer.id];
                    const cardIds = explorerStats?.collectedCardIds || [];
                    const totalProgress = ALL_PASSPORT_CITIES.length > 0 
                      ? Math.round((cardIds.length / ALL_PASSPORT_CITIES.length) * 100) 
                      : 0;
                    
                    return (
                      <div
                        key={explorer.id}
                        className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 cursor-pointer hover:shadow-md transition-all"
                        onClick={() => setSelectedExplorerId(explorer.id)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{AVATAR_OPTIONS[explorer.avatarKey || 'globe'] || '🌍'}</span>
                          <div>
                            <div className="font-bold text-sm text-slate-800">{explorer.name}</div>
                            <div className="text-[10px] text-slate-500">{explorer.ageRange || 'Explorer'}</div>
                          </div>
                        </div>
                        <div className="w-full bg-white/50 rounded-full h-2 mb-1">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full"
                            style={{ width: `${totalProgress}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-600">{totalProgress}% complete • {cardIds.length} cities</div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>

              {/* Parent's Own Knowledge Hub */}
              {renderKnowledgeHub(
                stats.gamesPlayed,
                stats.starsEarnedTotal,
                collectedCardIds,
                dailyQuestStreak,
                crossworldStreak,
                stats.gameHistory.filter(g => g.won).length
              )}
            </>
          ) : (
            /* Kid's Individual Knowledge Hub View */
            <>
              {/* Key Metrics - Use fresh API data from explorerStatsMap when available */}
              {(() => {
                const myStats = activeExplorer?.id ? explorerStatsMap[activeExplorer.id] : null;
                const displayGamesWon = myStats?.gamesWon ?? stats.gameHistory.filter(g => g.won).length;
                const displayGamesPlayed = myStats?.gamesPlayed ?? stats.gamesPlayed;
                const displayStars = myStats?.starsEarnedTotal ?? stats.starsEarnedTotal;
                const displayCards = myStats?.cardsCollected ?? collectedCardIds.length;
                
                return (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-center">
                  <Trophy className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                  <div className="text-xl font-heading text-blue-600">{displayGamesWon}</div>
                  <div className="text-[10px] text-slate-500">Won</div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-center">
                  <Target className="w-4 h-4 mx-auto text-slate-500 mb-1" />
                  <div className="text-xl font-heading text-slate-700">{displayGamesPlayed}</div>
                  <div className="text-[10px] text-slate-500">Played</div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-center">
                  <Star className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
                  <div className="text-xl font-heading text-yellow-500">{displayStars}</div>
                  <div className="text-[10px] text-slate-500">Stars</div>
                </div>
                <div 
                  className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-center cursor-pointer hover:bg-green-50"
                  onClick={() => setShowCardsView(true)}
                >
                  <Map className="w-4 h-4 mx-auto text-green-500 mb-1" />
                  <div className="text-xl font-heading text-green-600">{displayCards}</div>
                  <div className="text-[10px] text-slate-500">Cards</div>
                </div>
              </div>
                );
              })()}

              {/* Family Leaderboard - Right after metrics */}
              {activeExplorers.length >= 1 && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center">
                    <Crown className="w-5 h-5 mr-2 text-yellow-500" /> Family Leaderboard
                  </h3>
                  {isLoadingStats ? (
                    <div className="text-center py-4 text-slate-500">Loading...</div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-4 text-slate-500">No data yet</div>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((entry) => {
                        const isMe = entry.explorer.id === activeExplorer?.id;
                        return (
                          <div 
                            key={entry.explorer.id}
                            className={`flex items-center gap-3 p-2 rounded-xl ${
                              entry.rank === 1 ? 'bg-yellow-50 border-2 border-yellow-200' :
                              entry.rank === 2 ? 'bg-slate-100 border border-slate-200' :
                              entry.rank === 3 ? 'bg-orange-50 border border-orange-200' :
                              'bg-slate-50 border border-slate-100'
                            } ${isMe ? 'ring-2 ring-blue-400' : ''}`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                              entry.rank === 2 ? 'bg-slate-400 text-white' :
                              entry.rank === 3 ? 'bg-orange-400 text-orange-900' :
                              'bg-slate-200 text-slate-600'
                            }`}>
                              {entry.rank}
                            </div>
                            <span className="text-xl">{AVATAR_OPTIONS[entry.explorer.avatarKey || 'globe'] || '🌍'}</span>
                            <div className="flex-1">
                              <div className="font-bold text-sm text-slate-800">
                                {entry.explorer.name} {isMe && <span className="text-blue-500 text-xs">(You)</span>}
                              </div>
                              <div className="text-[10px] text-slate-500">{entry.badgeLevel}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-yellow-600 text-sm flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400" /> {entry.starsEarnedTotal}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {renderKnowledgeHub(
                stats.gamesPlayed,
                stats.starsEarnedTotal,
                collectedCardIds,
                dailyQuestStreak,
                crossworldStreak,
                stats.gameHistory.filter(g => g.won).length
              )}
            </>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
