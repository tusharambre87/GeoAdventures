import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft,
  X,
  Map,
  Plane,
  Headphones
} from "lucide-react";
import { useExplorer } from "@/lib/explorerContext";
import { useUser } from "@/lib/userContext";
import { useQuery } from "@tanstack/react-query";
import { getExplorerRank } from "@shared/schema";
import { GeoBuddyCharacter } from "@/components/GeoBuddyCharacter";

const DEFAULT_RANK = getExplorerRank(0);
const TOTAL_CITIES = 101;

const BUDDY_MESSAGES = [
  "Ready to explore a new place?",
  "Where shall we go today?",
  "The world is waiting for you!",
  "Let's discover something amazing!",
  "Every explorer needs an adventure!",
];

export default function ExplorePage() {
  const { activeExplorer } = useExplorer();
  const [, navigate] = useLocation();
  const { collectedCardIds } = useUser();
  const playerId = activeExplorer?.id;

  const discoveredCount = collectedCardIds.length;

  const [showBuddy, setShowBuddy] = useState(() => {
    const dismissed = localStorage.getItem('geoquest_explore_buddy_dismissed');
    return dismissed !== 'true';
  });

  const [buddyMessage] = useState(() =>
    BUDDY_MESSAGES[Math.floor(Math.random() * BUDDY_MESSAGES.length)]
  );

  const dismissBuddy = () => {
    setShowBuddy(false);
    localStorage.setItem('geoquest_explore_buddy_dismissed', 'true');
  };

  const { data: rankData } = useQuery({
    queryKey: ["/api/players", playerId, "xp"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/xp`);
      if (!res.ok) throw new Error("Failed to fetch XP");
      return res.json();
    },
    enabled: !!playerId,
    staleTime: 15000,
  });

  const rank = rankData || DEFAULT_RANK;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="bg-gradient-to-b from-orange-500 via-amber-500 to-orange-400 dark:from-orange-800 dark:via-amber-800 dark:to-orange-900 px-6 pt-6 pb-10">
        <div className="max-w-lg mx-auto">
          <Link href="/">
            <button className="flex items-center gap-1 text-sm text-white/60 hover:text-white font-bold mb-4 transition-colors" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
          </Link>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🌍</span>
            <p className="text-xs font-black text-white/70 uppercase tracking-[0.2em]">Your World</p>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-base">🏙️</span>
            <p className="text-sm font-bold text-white/80" data-testid="text-cities-discovered">
              Cities Discovered: <span className="text-white">{discoveredCount}</span> / {TOTAL_CITIES}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-5" style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>

        <div onClick={() => navigate('/explorer-identity')} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-amber-300 dark:hover:border-amber-600 transition-colors active:scale-[0.98]" data-testid="explorer-rank-card">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Explorer Rank</p>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{rank.rank.icon}</span>
              <p className="text-lg font-black text-slate-800 dark:text-white" data-testid="text-rank-name">{rank.rank.name}</p>
            </div>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400" data-testid="text-xp-display">
              {rank.totalXp} {rank.nextRank ? `/ ${rank.nextRank.minXp}` : ''} XP
            </p>
          </div>
          <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${rank.progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
          </div>
          {rank.nextRank && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 text-right">
              {rank.xpToNextRank} XP to {rank.nextRank.name}
            </p>
          )}
        </div>

        <Link href="/explorer-map?from=explore">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="bg-emerald-100 dark:bg-emerald-800 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
            data-testid="card-explorer-map"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Map className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900 dark:text-white">Explorer Map</h3>
            </div>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-200 leading-relaxed mb-3">
              See the cities you've discovered and unlock new regions.
            </p>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-emerald-900/40 px-3 py-1 rounded-full">
              {discoveredCount} Cities Discovered
            </span>
          </motion.div>
        </Link>

        <Link href="/geoadventures?from=explore">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="bg-orange-100 dark:bg-orange-800 rounded-2xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow"
            data-testid="card-geoadventures"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3.5 bg-white rounded-xl shadow-sm">
                <Plane className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-orange-900 dark:text-white">Adventure Portal</h3>
            </div>
            <p className="text-base text-orange-700/80 dark:text-orange-200 leading-relaxed mb-4">
              Explore real-world cities through guided adventures.
            </p>
            <span className="text-base font-bold text-orange-600 dark:text-orange-300">
              Continue Adventure
            </span>
          </motion.div>
        </Link>

        <Link href="/geobuddy-adventures?from=explore">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="bg-purple-100 dark:bg-purple-800 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
            data-testid="card-story-library"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Headphones className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-purple-900 dark:text-white">Story Portal</h3>
            </div>
            <p className="text-sm text-purple-700/80 dark:text-purple-200 leading-relaxed mb-3">
              Listen to epic audio adventures from around the globe.
            </p>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-300">
              Start Listening
            </span>
          </motion.div>
        </Link>

      </div>

      <AnimatePresence>
        {showBuddy && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed bottom-24 right-4 z-40 flex items-end gap-2"
            data-testid="geobuddy-explore-prompt"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-br-md shadow-xl border border-slate-200 dark:border-slate-700 px-4 py-3 max-w-[200px] relative">
              <button
                onClick={dismissBuddy}
                className="absolute -top-2 -right-2 w-6 h-6 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-full flex items-center justify-center transition-colors"
                data-testid="button-dismiss-buddy"
              >
                <X className="w-3 h-3 text-slate-500 dark:text-slate-300" />
              </button>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">
                {buddyMessage}
              </p>
            </div>
            <GeoBuddyCharacter pose="greeting" size="md" showGlow={false} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
