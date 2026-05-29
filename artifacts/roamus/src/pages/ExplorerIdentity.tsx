import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock, Crown, Sparkles, ChevronDown, Trophy, Gift, ChevronRight, Star, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useExplorer } from "@/lib/explorerContext";
import {
  getExplorerRank,
  EXPLORER_XP_RANKS,
  ELITE_XP_RANKS,
  ELITE_XP_THRESHOLD,
  XP_REWARDS,
  KIT_TIER_RANK_GATES,
  KIT_TIER_NAMES,
} from "@shared/schema";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { Button } from "@/components/ui/button";

interface RankInfo {
  rank: { level: number; id: string; name: string; minXp: number; icon: string };
  totalXp: number;
  nextRank: { level: number; id: string; name: string; minXp: number; icon: string } | null;
  xpToNextRank: number;
  progressPercent: number;
  isElite?: boolean;
}

const RANK_KIT_TIER_MAP: Record<number, string> = {};
Object.entries(KIT_TIER_RANK_GATES).forEach(([tierNum, rankLevel]) => {
  if (rankLevel > 0) {
    const tierName = KIT_TIER_NAMES[Number(tierNum)];
    if (tierName) RANK_KIT_TIER_MAP[rankLevel] = tierName;
  }
});

function getElitePercentile(totalXp: number): string {
  if (totalXp >= 200000) return "Top 0.1%";
  if (totalXp >= 120000) return "Top 0.5%";
  if (totalXp >= 80000) return "Top 1%";
  if (totalXp >= 55000) return "Top 2%";
  if (totalXp >= 35000) return "Top 3%";
  if (totalXp >= 20000) return "Top 4%";
  return "Top 5%";
}

function getNextRankBenefits(nextRankId: string, nextRankLevel: number): { icon: string; label: string }[] {
  if (nextRankId === 'world_architect' || nextRankLevel === 13) {
    return [
      { icon: '🎰', label: 'Bonus Spin Rewards' },
      { icon: '🌍', label: 'Exclusive Adventures' },
      { icon: '⚡', label: 'Elite Status' },
    ];
  }

  const kitTier = RANK_KIT_TIER_MAP[nextRankLevel];
  const benefits: { icon: string; label: string }[] = [];
  if (kitTier) benefits.push({ icon: '🎒', label: `${kitTier} Explorer Kit` });
  benefits.push({ icon: '🎁', label: 'Bonus Spin Reward' });
  benefits.push({ icon: '🏅', label: `${EXPLORER_XP_RANKS.find(r => r.level === nextRankLevel)?.name || 'New'} Badge` });
  return benefits.slice(0, 3);
}

function getChampionBenefits(): { icon: string; label: string }[] {
  return [
    { icon: '🎰', label: 'Bonus Spin Rewards' },
    { icon: '🌍', label: 'Exclusive Adventures' },
    { icon: '⚡', label: 'Elite Status' },
  ];
}

function useXpToday(playerId: number | undefined) {
  const [xpToday, setXpToday] = useState(0);

  useEffect(() => {
    if (!playerId) return;
    const key = `geoquest_xp_today_${playerId}`;
    const dateKey = `geoquest_xp_today_date_${playerId}`;
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(dateKey);
    if (storedDate === today) {
      setXpToday(parseInt(localStorage.getItem(key) || '0', 10));
    } else {
      localStorage.setItem(dateKey, today);
      localStorage.setItem(key, '0');
      setXpToday(0);
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.amount) {
        const currentDate = localStorage.getItem(dateKey);
        if (currentDate !== new Date().toDateString()) {
          localStorage.setItem(dateKey, new Date().toDateString());
          localStorage.setItem(key, String(detail.amount));
          setXpToday(detail.amount);
        } else {
          const current = parseInt(localStorage.getItem(key) || '0', 10);
          const updated = current + detail.amount;
          localStorage.setItem(key, String(updated));
          setXpToday(updated);
        }
      }
    };
    window.addEventListener('xp-gained', handler);
    return () => window.removeEventListener('xp-gained', handler);
  }, [playerId]);

  return xpToday;
}

export default function ExplorerIdentity() {
  const [, setLocation] = useLocation();
  const { activeExplorer } = useExplorer();
  const { isPaidUser } = useFreeLimits();
  const [showFullLadder, setShowFullLadder] = useState(false);
  const [expandedRank, setExpandedRank] = useState<string | null>(null);

  const playerId = activeExplorer?.id;
  const xpToday = useXpToday(playerId);

  const { data: rankData } = useQuery<RankInfo>({
    queryKey: ["/api/players", playerId, "xp"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/xp`);
      if (!res.ok) throw new Error("Failed to fetch XP");
      return res.json();
    },
    enabled: !!playerId,
    staleTime: 15000,
  });

  const defaultRank = getExplorerRank(0);
  const rank = rankData || { ...defaultRank, totalXp: 0 };
  const isElite = (rank.totalXp || 0) >= ELITE_XP_THRESHOLD;
  const isRankCapped = !isPaidUser && rank.rank.level >= 1 && !isElite;
  const isChampionOrElite = rank.rank.id === 'geoquest_champion' || isElite;

  if (!playerId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg text-slate-600 dark:text-slate-300">Select an explorer to view their journey.</p>
          <button onClick={() => setLocation('/whos-playing')} className="mt-4 text-indigo-500 font-semibold" data-testid="button-choose-explorer">
            Choose Explorer
          </button>
        </div>
      </div>
    );
  }

  const currentRankIndex = EXPLORER_XP_RANKS.findIndex(r => r.level === rank.rank.level);

  const getVisibleRanks = () => {
    if (showFullLadder || isElite) return [...EXPLORER_XP_RANKS];
    const ci = currentRankIndex >= 0 ? currentRankIndex : 0;
    const start = Math.max(0, ci - 2);
    const end = Math.min(EXPLORER_XP_RANKS.length - 1, ci + 2);
    return EXPLORER_XP_RANKS.slice(start, end + 1);
  };

  const visibleRanks = getVisibleRanks();

  const nextRankBenefits = rank.nextRank
    ? getNextRankBenefits(rank.nextRank.id, rank.nextRank.level)
    : isChampionOrElite
    ? getChampionBenefits()
    : [];

  const currentEliteRank = isElite
    ? (() => {
        let result: typeof ELITE_XP_RANKS[number] | null = null;
        for (const r of ELITE_XP_RANKS) {
          if ((rank.totalXp || 0) >= r.minXp) result = r;
          else break;
        }
        return result;
      })()
    : null;

  const currentEliteIndex = currentEliteRank
    ? ELITE_XP_RANKS.findIndex(r => r.id === currentEliteRank.id)
    : -1;

  const nextEliteRank = currentEliteIndex >= 0 && currentEliteIndex < ELITE_XP_RANKS.length - 1
    ? ELITE_XP_RANKS[currentEliteIndex + 1]
    : currentEliteIndex === -1 && isElite
    ? ELITE_XP_RANKS[0]
    : null;

  const elitePreviewStart = currentEliteIndex + 1;
  const previewEliteRanks = ELITE_XP_RANKS.slice(elitePreviewStart, elitePreviewStart + 2);
  const hiddenEliteRanks = ELITE_XP_RANKS.slice(elitePreviewStart + 2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-warm-gray-50 to-slate-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-800 pb-28" style={{ background: 'linear-gradient(to bottom, #fafaf9, #f5f5f4, #f4f4f5)' }}>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" data-testid="button-back">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white">Explorer Rank Journey</h1>
          {isElite && (
            <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Elite Explorer
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* HERO CARD — redesigned with warm neutral gradient */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 shadow-md relative overflow-hidden"
          style={{
            background: isElite
              ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)'
              : 'linear-gradient(135deg, #78716c 0%, #57534e 50%, #44403c 100%)',
          }}
          data-testid="hero-section"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-8 -translate-x-8" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Your Journey</p>
              {isElite && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> Elite Explorer
                </span>
              )}
            </div>

            {/* Current → Next Rank */}
            <div className="flex items-center gap-3 mb-5 mt-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${isElite ? 'bg-indigo-500/30' : 'bg-white/15'}`}>
                  {rank.rank.icon}
                </div>
                <div>
                  <p className="text-white/50 text-[9px] font-bold uppercase tracking-wider">Current</p>
                  <p className="text-base font-black text-white leading-tight" data-testid="text-current-rank">{rank.rank.name}</p>
                </div>
              </div>
              {(rank.nextRank || nextEliteRank) && !isRankCapped && (
                <>
                  <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                  <div className="flex items-center gap-2.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 opacity-60 ${isElite ? 'bg-indigo-500/20' : 'bg-white/10'}`}>
                      {(nextEliteRank || rank.nextRank)?.icon}
                    </div>
                    <div>
                      <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">Next</p>
                      <p className="text-sm font-bold text-white/70 leading-tight">{(nextEliteRank || rank.nextRank)?.name}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* XP Display */}
            {isElite ? (
              <p className="text-white font-bold text-base mb-3" data-testid="text-current-xp">
                {getElitePercentile(rank.totalXp)} of explorers
              </p>
            ) : (
              <p className="text-white/80 font-bold text-sm mb-3" data-testid="text-current-xp">
                {rank.totalXp.toLocaleString()} {rank.nextRank ? `/ ${rank.nextRank.minXp.toLocaleString()}` : ''} XP
                {xpToday > 0 && <span className="ml-2 text-amber-300 text-xs font-bold">+{xpToday} today</span>}
              </p>
            )}

            {/* Thin animated progress bar */}
            {(rank.nextRank || nextEliteRank) && !isRankCapped && (
              <>
                <div className="relative h-1.5 bg-white/15 rounded-full overflow-hidden mb-2">
                  <motion.div
                    className={`absolute inset-y-0 left-0 rounded-full ${isElite ? 'bg-indigo-400' : 'bg-white/70'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${rank.progressPercent}%` }}
                    transition={{ duration: 1.3, ease: "easeOut" }}
                  />
                </div>
                <p className="text-white/40 text-[10px]">
                  {isElite && currentEliteRank && nextEliteRank
                    ? `${(nextEliteRank.minXp - rank.totalXp).toLocaleString()} XP to ${nextEliteRank.name}`
                    : rank.nextRank
                    ? `${rank.xpToNextRank.toLocaleString()} XP to ${rank.nextRank.name}`
                    : ''}
                </p>
              </>
            )}

            {/* Horizontal journey line */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between gap-1 overflow-x-hidden">
                {EXPLORER_XP_RANKS.map((r, i) => {
                  const isActive = rank.rank.level === r.level && !isElite;
                  const isDone = rank.totalXp >= r.minXp;
                  return (
                    <div key={r.id} className="flex flex-col items-center flex-1 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        isActive ? 'bg-white ring-2 ring-white/40 scale-125' :
                        isDone ? 'bg-white/60' :
                        'bg-white/20'
                      }`} />
                      {isActive && (
                        <span className="text-[8px] text-white/70 mt-1 font-bold truncate w-full text-center">{r.name.split(' ')[0]}</span>
                      )}
                    </div>
                  );
                })}
                {isElite && (
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-3 h-3 rounded-full bg-indigo-400 ring-2 ring-indigo-400/40 scale-125 flex-shrink-0" />
                    <span className="text-[8px] text-indigo-300 mt-1 font-bold">Elite</span>
                  </div>
                )}
              </div>
              <div className="h-0.5 bg-white/10 -mt-3.5 mx-1 -z-10 relative" />
            </div>

            {isRankCapped && (
              <div className="bg-white/10 rounded-xl px-4 py-2.5 flex items-center gap-2 mt-3">
                <Lock className="w-4 h-4 text-white/60" />
                <p className="text-white text-sm font-semibold">Upgrade to unlock all explorer ranks</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* WHAT'S NEXT — clean benefits section */}
        {nextRankBenefits.length > 0 && !isRankCapped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700"
            data-testid="next-rank-unlocks"
          >
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">What's Next</p>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">
              {isElite && nextEliteRank
                ? `${nextEliteRank.name} unlocks`
                : rank.nextRank
                ? `${rank.nextRank.name} unlocks`
                : isChampionOrElite
                ? 'Your elite perks'
                : ''}
            </h3>
            <div className="space-y-3">
              {nextRankBenefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-lg flex-shrink-0">
                    {benefit.icon}
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{benefit.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* RANK CAPPED UPGRADE CARD */}
        {isRankCapped && rank.nextRank && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl p-5 shadow-sm border relative overflow-hidden bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            data-testid="next-rank-card"
          >
            <div className="absolute top-3 right-3">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Locked Rank</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-slate-200 dark:bg-slate-700">
                {rank.nextRank.icon}
              </div>
              <div>
                <p className="text-xl font-black text-slate-400">{rank.nextRank.name}</p>
                <p className="text-sm font-semibold text-slate-400">Upgrade to unlock</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Free explorers are capped at Explorer rank. Upgrade to continue your journey through all 12 ranks.
            </p>
          </motion.div>
        )}

        {/* ELITE JOURNEY CARD — shown instead of rank ladder for elite users */}
        {isElite ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl overflow-hidden shadow-md border border-indigo-200 dark:border-indigo-800"
            data-testid="elite-journey-section"
          >
            <div className="p-5" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-1">Elite Journey</p>
                  <h3 className="text-white font-black text-lg">Elite Ranks</h3>
                </div>
                <motion.div
                  animate={{ boxShadow: ['0 0 12px rgba(99,102,241,0.4)', '0 0 24px rgba(99,102,241,0.7)', '0 0 12px rgba(99,102,241,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-12 h-12 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-2xl"
                >
                  ⚡
                </motion.div>
              </div>

              {/* Current elite rank */}
              <div className="bg-white/10 rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/30 flex items-center justify-center text-2xl">
                    {currentEliteRank ? currentEliteRank.icon : rank.rank.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-indigo-200 text-[9px] font-bold uppercase tracking-wider">Current Elite Rank</p>
                    <p className="text-white font-black text-base">{currentEliteRank ? currentEliteRank.name : rank.rank.name}</p>
                    <p className="text-indigo-300 text-xs">{currentEliteRank ? currentEliteRank.tagline : 'GeoQuest Champion — The elite journey begins'}</p>
                  </div>
                </div>
                {nextEliteRank && (
                  <>
                    <div className="h-1 bg-indigo-900/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${rank.progressPercent}%` }}
                        transition={{ duration: 1.3, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-indigo-400 text-[10px] mt-1.5">
                      {(nextEliteRank.minXp - rank.totalXp).toLocaleString()} XP to {nextEliteRank.name}
                    </p>
                  </>
                )}
              </div>

              {/* Next 2 elite ranks preview */}
              {previewEliteRanks.length > 0 && (
                <div className="space-y-2 mb-2">
                  {previewEliteRanks.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5" data-testid={`elite-rank-preview-${r.id}`}>
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg flex-shrink-0">
                        {r.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-sm font-bold">{r.name}</p>
                        <p className="text-indigo-400 text-[10px]">{r.minXp.toLocaleString()} XP</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Hidden elite ranks — blurred */}
              {hiddenEliteRanks.length > 0 && (
                <div className="relative">
                  <div className="space-y-2 blur-sm pointer-events-none select-none" aria-hidden>
                    {hiddenEliteRanks.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg">❓</div>
                        <div>
                          <p className="text-white/40 text-sm font-bold">???</p>
                          <p className="text-indigo-600 text-[10px]">Hidden</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-indigo-900/80 backdrop-blur-sm rounded-xl px-3 py-1.5">
                      <p className="text-indigo-300 text-xs font-bold">🔮 Unlock by reaching {previewEliteRanks[previewEliteRanks.length - 1]?.name || 'next rank'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* STANDARD RANK LADDER — compressed for non-elite users */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-700"
            data-testid="rank-ladder-section"
          >
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Rank Ladder
            </h3>

            <div className="space-y-1">
              {visibleRanks.map((r, idx) => {
                const isCurrent = rank.rank.level === r.level;
                const isNext = rank.nextRank?.level === r.level;
                const isReached = rank.totalXp >= r.minXp;
                const isLocked = !isReached && !isNext;
                const isExpanded = expandedRank === r.id;
                const kitTier = RANK_KIT_TIER_MAP[r.level];

                let statusLabel = '';
                let statusColor = '';
                if (isCurrent) {
                  statusLabel = 'Current';
                  statusColor = 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300';
                } else if (isNext) {
                  statusLabel = 'Next';
                  statusColor = 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
                } else if (isReached) {
                  statusLabel = '✓';
                  statusColor = 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
                } else {
                  statusLabel = '🔒';
                  statusColor = 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500';
                }

                return (
                  <div key={r.id}>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + idx * 0.03 }}
                      onClick={() => setExpandedRank(isExpanded ? null : r.id)}
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors cursor-pointer active:scale-[0.98] ${
                        isCurrent
                          ? 'bg-stone-50 dark:bg-stone-900/40 border-2 border-stone-300 dark:border-stone-700'
                          : isNext
                          ? 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800'
                          : isReached
                          ? 'bg-green-50/30 dark:bg-green-900/5'
                          : 'opacity-40'
                      }`}
                      data-testid={`rank-ladder-${r.id}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                        isCurrent ? 'bg-stone-200/50 dark:bg-stone-700/30' :
                        isNext ? 'bg-blue-200/50 dark:bg-blue-800/30' :
                        isReached ? 'bg-green-200/30 dark:bg-green-800/20' :
                        'bg-slate-100 dark:bg-slate-700'
                      }`}>
                        {isLocked && !isNext ? (
                          <Lock className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        ) : (
                          r.icon
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${
                          isCurrent ? 'text-stone-700 dark:text-stone-300' :
                          isNext ? 'text-blue-700 dark:text-blue-300' :
                          isReached ? 'text-slate-700 dark:text-slate-300' :
                          'text-slate-400 dark:text-slate-500'
                        }`}>
                          {r.name} — {r.minXp.toLocaleString()} XP
                        </p>
                        {kitTier && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                            🔓 {kitTier} Kit Tier
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                          {statusLabel}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-[52px] py-2 px-3 space-y-1.5" data-testid={`rank-detail-${r.id}`}>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Unlocked at {r.minXp.toLocaleString()} XP
                            </p>
                            {kitTier && (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                🎒 {kitTier} Explorer Kit unlocked
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* View full journey toggle */}
            {!showFullLadder && EXPLORER_XP_RANKS.length > visibleRanks.length && (
              <button
                onClick={() => setShowFullLadder(true)}
                className="w-full mt-3 py-2 text-sm text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                data-testid="button-view-full-ladder"
              >
                <ChevronDown className="w-4 h-4" />
                View full journey ({EXPLORER_XP_RANKS.length} ranks)
              </button>
            )}
            {showFullLadder && (
              <button
                onClick={() => setShowFullLadder(false)}
                className="w-full mt-3 py-2 text-sm text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                data-testid="button-collapse-ladder"
              >
                <ChevronDown className="w-4 h-4 rotate-180" />
                Show less
              </button>
            )}
          </motion.div>
        )}

        {/* WAYS TO EARN XP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-700"
          data-testid="how-to-earn-section"
        >
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Ways to Earn XP
          </h3>
          <div className="space-y-0.5">
            {[
              { icon: '🌍', label: 'Discover a city', xp: XP_REWARDS.CITY_DISCOVERED },
              { icon: '🎯', label: 'Complete Daily Quest', xp: XP_REWARDS.DAILY_QUEST_BONUS },
              { icon: '🎮', label: 'Win a game', xp: XP_REWARDS.GAME_WIN },
              { icon: '🏕️', label: 'Complete an adventure', xp: XP_REWARDS.ADVENTURE_COMPLETED },
              { icon: '📚', label: 'Learn in GeoAtlas', xp: XP_REWARDS.GAME_PLAY },
              { icon: '⭐', label: 'Master a city', xp: XP_REWARDS.CITY_MASTERED },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-base w-6 text-center">{item.icon}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                  +{item.xp} XP
                </span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
