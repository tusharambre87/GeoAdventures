import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trophy, Star, Lock, Sparkles, ArrowRight, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExplorer } from "@/lib/explorerContext";
import { apiRequest } from "@/lib/queryClient";
import { TRAVEL_BADGE_CATEGORIES } from "@shared/schema";

interface TrophyCabinetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BadgeProgress {
  id: string;
  name: string;
  emoji: string;
  description: string;
  currentProgress: number;
  currentTier: string | null;
  tiers: { tier: string; threshold: number; label: string; reward: string }[];
  nextTier: { tier: string; threshold: number; label: string; reward: string } | null;
  progressToNextTier: number;
  bronzeEarnedAt?: string | null;
  silverEarnedAt?: string | null;
  goldEarnedAt?: string | null;
  legendEarnedAt?: string | null;
}

interface TrophyCabinetData {
  explorerId: string;
  stats: {
    totalTrips: number;
    totalStopsVisited: number;
    totalKeepsakes: number;
    beachStopsVisited: number;
    natureStopsVisited: number;
    cityStopsVisited: number;
    wildlifeStopsVisited: number;
    trailTalesCompleted: number;
  };
  badges: BadgeProgress[];
  totalBadgesEarned: number;
  totalGoldBadges: number;
  totalLegendBadges: number;
}

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  bronze: { 
    bg: "bg-gradient-to-br from-amber-600 to-amber-800", 
    border: "border-amber-500",
    text: "text-amber-100",
    glow: "shadow-amber-500/30"
  },
  silver: { 
    bg: "bg-gradient-to-br from-slate-300 to-slate-500", 
    border: "border-slate-400",
    text: "text-slate-900",
    glow: "shadow-slate-400/30"
  },
  gold: { 
    bg: "bg-gradient-to-br from-yellow-400 to-yellow-600", 
    border: "border-yellow-300",
    text: "text-yellow-900",
    glow: "shadow-yellow-400/50"
  },
  legend: { 
    bg: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", 
    border: "border-purple-300",
    text: "text-white",
    glow: "shadow-purple-500/50"
  },
};

const TIER_ICONS: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  legend: "👑",
};

function BadgeCard({ badge, onSelect }: { badge: BadgeProgress; onSelect: () => void }) {
  const tierStyle = badge.currentTier ? TIER_COLORS[badge.currentTier] : null;
  const isUnlocked = !!badge.currentTier;
  
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative p-4 rounded-xl border-2 text-left transition-all w-full",
        isUnlocked 
          ? `${tierStyle?.bg} ${tierStyle?.border} shadow-lg ${tierStyle?.glow}` 
          : "bg-muted/50 border-muted-foreground/20"
      )}
      data-testid={`badge-card-${badge.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "text-3xl flex-shrink-0",
          !isUnlocked && "grayscale opacity-50"
        )}>
          {badge.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "font-semibold truncate",
              tierStyle?.text || "text-muted-foreground"
            )}>
              {badge.name}
            </h3>
            {isUnlocked && (
              <span className="text-sm">{TIER_ICONS[badge.currentTier!]}</span>
            )}
          </div>
          {!isUnlocked && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </div>
          )}
          {isUnlocked && badge.nextTier && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={tierStyle?.text}>
                  {badge.currentProgress} / {badge.nextTier.threshold}
                </span>
                <span className={tierStyle?.text}>
                  {TIER_ICONS[badge.nextTier.tier]} Next
                </span>
              </div>
              <Progress 
                value={badge.progressToNextTier} 
                className="h-1.5 bg-white/20"
              />
            </div>
          )}
          {isUnlocked && !badge.nextTier && (
            <div className="flex items-center gap-1 mt-1">
              <Sparkles className={cn("w-3 h-3", tierStyle?.text)} />
              <span className={cn("text-xs", tierStyle?.text)}>Max Level!</span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function BadgeDetail({ badge, onClose }: { badge: BadgeProgress; onClose: () => void }) {
  const tierStyle = badge.currentTier ? TIER_COLORS[badge.currentTier] : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-4"
    >
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClose}
        className="mb-2"
        data-testid="badge-detail-back"
      >
        <X className="w-4 h-4 mr-1" /> Back
      </Button>
      
      <div className={cn(
        "p-6 rounded-2xl text-center",
        badge.currentTier 
          ? `${tierStyle?.bg} ${tierStyle?.border} border-2` 
          : "bg-muted border-2 border-muted-foreground/20"
      )}>
        <div className="text-5xl mb-3">{badge.emoji}</div>
        <h2 className={cn(
          "text-xl font-bold mb-1",
          tierStyle?.text || "text-foreground"
        )}>
          {badge.name}
        </h2>
        {badge.currentTier && (
          <div className={cn("text-sm", tierStyle?.text)}>
            {TIER_ICONS[badge.currentTier]} {badge.tiers.find(t => t.tier === badge.currentTier)?.label}
          </div>
        )}
      </div>
      
      <p className="text-center text-muted-foreground">{badge.description}</p>
      
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Progress Tiers</h3>
        {badge.tiers.map((tier) => {
          const isEarned = badge.currentTier && 
            ['bronze', 'silver', 'gold', 'legend'].indexOf(tier.tier) <= 
            ['bronze', 'silver', 'gold', 'legend'].indexOf(badge.currentTier);
          const isNext = badge.nextTier?.tier === tier.tier;
          const earnedAt = 
            tier.tier === 'bronze' ? badge.bronzeEarnedAt :
            tier.tier === 'silver' ? badge.silverEarnedAt :
            tier.tier === 'gold' ? badge.goldEarnedAt :
            badge.legendEarnedAt;
          
          return (
            <Card 
              key={tier.tier}
              className={cn(
                "p-3",
                isEarned && "bg-green-500/10 border-green-500/30",
                isNext && "bg-blue-500/10 border-blue-500/30 border-dashed"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{TIER_ICONS[tier.tier]}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tier.label}</span>
                    {isEarned && <span className="text-xs text-green-600">Earned!</span>}
                    {isNext && (
                      <span className="text-xs text-blue-600">
                        {badge.currentProgress}/{tier.threshold}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tier.threshold} required
                  </div>
                </div>
              </div>
              {isNext && (
                <Progress 
                  value={(badge.currentProgress / tier.threshold) * 100} 
                  className="h-1 mt-2"
                />
              )}
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}

export function TrophyCabinet({ isOpen, onClose }: TrophyCabinetProps) {
  const { activeExplorer } = useExplorer();
  const [data, setData] = useState<TrophyCabinetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen && activeExplorer?.id) {
      fetchTrophyCabinet();
    }
  }, [isOpen, activeExplorer?.id]);
  
  const fetchTrophyCabinet = async () => {
    if (!activeExplorer?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest("GET", `/api/travel/trophies/${activeExplorer.id}`);
      const cabinetData = await response.json();
      setData(cabinetData);
    } catch (err) {
      console.error("Failed to fetch trophy cabinet:", err);
      setError("Could not load your trophies. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const earnedBadges = data?.badges.filter(b => b.currentTier) || [];
  const lockedBadges = data?.badges.filter(b => !b.currentTier) || [];
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="trophy-cabinet-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Trophy Cabinet
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  type="button"
                  className="ml-1 p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors" 
                  data-testid="trophy-cabinet-help"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-72 p-3">
                <p className="text-sm font-medium mb-2">How to earn badges:</p>
                <ul className="text-xs space-y-1.5 text-muted-foreground">
                  <li>• <strong>World Traveler</strong> - Complete more trips</li>
                  <li>• <strong>Stop Hopper</strong> - Visit stops on your trips</li>
                  <li>• <strong>Memory Maker</strong> - Collect keepsakes</li>
                  <li>• <strong>Story Spinner</strong> - Solve Trail Tales riddles</li>
                  <li>• <strong>Beach/Mountain/City</strong> - Explore themed locations</li>
                </ul>
                <p className="text-xs mt-3 pt-2 border-t text-muted-foreground">
                  Progress through tiers: Bronze → Silver → Gold → Legend
                </p>
              </PopoverContent>
            </Popover>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Track your travel achievements and unlock rewards
          </DialogDescription>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          {selectedBadge ? (
            <BadgeDetail 
              key="detail"
              badge={selectedBadge} 
              onClose={() => setSelectedBadge(null)} 
            />
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading your trophies...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={fetchTrophyCabinet} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              ) : data ? (
                <>
                  <div className="bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-4 text-center">
                    <div className="text-3xl mb-2">🏆</div>
                    <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                      {data.totalBadgesEarned}
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      Badges Earned
                    </div>
                    <div className="flex justify-center gap-4 mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                      <span>🥇 {data.totalGoldBadges} Gold</span>
                      <span>👑 {data.totalLegendBadges} Legend</span>
                    </div>
                  </div>
                  
                  {earnedBadges.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Your Badges ({earnedBadges.length})
                      </h3>
                      <div className="grid gap-2">
                        {earnedBadges.map((badge) => (
                          <BadgeCard 
                            key={badge.id} 
                            badge={badge} 
                            onSelect={() => setSelectedBadge(badge)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {lockedBadges.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Locked ({lockedBadges.length})
                      </h3>
                      <div className="grid gap-2">
                        {lockedBadges.map((badge) => (
                          <BadgeCard 
                            key={badge.id} 
                            badge={badge} 
                            onSelect={() => setSelectedBadge(badge)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {data.badges.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">🗺️</div>
                      <p className="text-muted-foreground">
                        Start exploring to earn your first badge!
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
