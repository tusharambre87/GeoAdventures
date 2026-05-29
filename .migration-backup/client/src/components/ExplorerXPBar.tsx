import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useExplorer } from "@/lib/explorerContext";
import { getExplorerRank, EXPLORER_XP_RANKS } from "@shared/schema";
import { useSubscription } from "@/hooks/useSubscription";
import { GeoPassModal } from "@/components/GeoPassModal";
import { SignUpPrompt } from "@/components/SignUpPrompt";
import { Crown, UserPlus, ChevronRight } from "lucide-react";
import { useUser } from "@/lib/userContext";

interface RankInfo {
  rank: { level: number; id: string; name: string; minXp: number; icon: string };
  level: number;
  totalXp: number;
  nextRank: { level: number; id: string; name: string; minXp: number; icon: string } | null;
  xpToNextRank: number;
  progressPercent: number;
}

interface ExplorerXPBarProps {
  mini?: boolean;
  className?: string;
}

const DEFAULT_RANK = getExplorerRank(0);
const FREE_RANK_CAP_LEVEL = 1;
const FREE_RANK_CAP_XP = EXPLORER_XP_RANKS[1]?.minXp || 50;

export function ExplorerXPBar({ mini = false, className = "" }: ExplorerXPBarProps) {
  const [, setLocation] = useLocation();
  const { activeExplorer } = useExplorer();
  const playerId = activeExplorer?.id;
  const { tier, isTrialActive, hasActiveSubscription, isPaidTier, isAdmin } = useSubscription();
  const { login } = useUser();
  const [showRankUpgrade, setShowRankUpgrade] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const isPaidUser = isAdmin || isPaidTier || hasActiveSubscription || isTrialActive || tier !== 'free';
  const isGuest = !playerId;

  const { data } = useQuery<RankInfo>({
    queryKey: ["/api/players", playerId, "xp"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/xp`);
      if (!res.ok) throw new Error("Failed to fetch XP");
      return res.json();
    },
    enabled: !!playerId,
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const rankData = data || DEFAULT_RANK;
  const isRankCapped = !isPaidUser && rankData.totalXp >= FREE_RANK_CAP_XP;

  if (mini) {
    return (
      <div className={`flex items-center gap-2 ${className}`} data-testid="xp-bar-mini">
        <span className="text-lg">{rankData.rank.icon}</span>
        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden min-w-[60px] max-w-[120px]">
          <motion.div
            className={`h-full rounded-full ${isRankCapped ? 'bg-gradient-to-r from-purple-400 to-purple-500' : 'bg-gradient-to-r from-amber-400 to-yellow-500'}`}
            initial={{ width: 0 }}
            animate={{ width: isRankCapped ? '100%' : `${rankData.progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{rankData.totalXp} XP</span>
      </div>
    );
  }

  const handleBarClick = () => {
    if (isGuest) {
      setShowSignUp(true);
    } else {
      setLocation('/explorer-identity');
    }
  };

  return (
    <>
      <div
        className={`bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-amber-300 dark:hover:border-amber-600 transition-colors active:scale-[0.98] ${className}`}
        data-testid="xp-bar-full"
        onClick={handleBarClick}
      >
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Explorer Rank</p>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{rankData.rank.icon}</span>
            <p className="text-lg font-black text-slate-800 dark:text-white" data-testid="text-rank-name">
              {isPaidUser ? rankData.rank.name : 'Explorer'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <p className="text-lg font-black text-amber-600 dark:text-amber-400" data-testid="text-total-xp">
              {rankData.totalXp} {!isRankCapped && rankData.nextRank ? `/ ${rankData.nextRank.minXp}` : ''} XP
            </p>
            {!isGuest && <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-500" />}
          </div>
        </div>
        <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${isRankCapped ? 'bg-gradient-to-r from-purple-400 to-purple-500' : 'bg-gradient-to-r from-amber-400 to-yellow-500'}`}
            initial={{ width: 0 }}
            animate={{ width: isRankCapped ? '100%' : `${rankData.progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
        </div>
        {isGuest ? (
          <button
            onClick={(e) => { e.stopPropagation(); setShowSignUp(true); }}
            className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 transition-colors"
            data-testid="button-create-explorer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create an Explorer to start earning XP!
          </button>
        ) : isRankCapped ? (
          <button
            onClick={() => setShowRankUpgrade(true)}
            className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-700 transition-colors"
            data-testid="button-rank-upgrade"
          >
            <Crown className="w-3.5 h-3.5" />
            Upgrade to unlock all 12 ranks!
          </button>
        ) : rankData.nextRank ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 text-right">
            {rankData.xpToNextRank} XP to {rankData.nextRank.name}
          </p>
        ) : null}
      </div>

      <SignUpPrompt
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        onLogin={async (data: any) => {
          if (typeof data === 'string') return;
          if (data.method === 'email') {
            await login(data.email, data.password);
          }
          setShowSignUp(false);
        }}
      />

      <GeoPassModal
        isOpen={showRankUpgrade}
        onClose={() => setShowRankUpgrade(false)}
      />
    </>
  );
}

export function ExplorerRankIcon() {
  const { activeExplorer } = useExplorer();
  const playerId = activeExplorer?.id;

  const { data } = useQuery<RankInfo>({
    queryKey: ["/api/players", playerId, "xp"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/xp`);
      if (!res.ok) throw new Error("Failed to fetch XP");
      return res.json();
    },
    enabled: !!playerId,
    staleTime: 15000,
  });

  if (!data) return null;

  return (
    <span className="text-lg" title={`${data.rank.name} - ${data.totalXp} XP`} data-testid="rank-icon">
      {data.rank.icon}
    </span>
  );
}
