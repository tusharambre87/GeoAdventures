import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useExplorer } from "@/lib/explorerContext";
import { useLocation } from "wouter";
import { suppressNextXPToast } from "@/components/XPGainToast";
import { EXPLORER_XP_RANKS, KIT_TIER_RANK_GATES, KIT_TIER_NAMES, ELITE_XP_THRESHOLD } from "@shared/schema";
import eliteJourneyImage from "@assets/IMG_6112_1776690273760.png";

type MilestoneType = "first_xp" | "first_rankup" | "first_kit" | "adventure_complete" | "elite_journey";

interface MilestoneData {
  type: MilestoneType;
  xpAmount?: number;
  oldRankName?: string;
  newRankName?: string;
  oldRankIcon?: string;
  newRankIcon?: string;
  kitItemName?: string;
  kitItemTier?: string;
  kitItemIcon?: string;
  cityName?: string;
}

interface MilestoneCelebrationContextType {
  showMilestone: (data: MilestoneData) => void;
}

const MilestoneCelebrationContext = createContext<MilestoneCelebrationContextType>({
  showMilestone: () => {},
});

export function useMilestoneCelebration() {
  return useContext(MilestoneCelebrationContext);
}

function getMilestoneKey(explorerId: string) {
  return `geoquest_milestones_${explorerId}`;
}

function getSeenMilestones(explorerId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(getMilestoneKey(explorerId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markMilestoneSeen(explorerId: string, type: string) {
  const seen = getSeenMilestones(explorerId);
  seen[type] = true;
  localStorage.setItem(getMilestoneKey(explorerId), JSON.stringify(seen));
}

export function hasMilestoneBeenSeen(explorerId: string, type: string): boolean {
  return !!getSeenMilestones(explorerId)[type];
}

function fireConfetti() {
  const colors = ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1", "#A855F7"];
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    if (Date.now() > end) return;
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.6 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.6 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
    });
    requestAnimationFrame(frame);
  };
  frame();

  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.4 },
      colors,
      startVelocity: 50,
      gravity: 0.6,
    });
  }, 300);
}

function MilestonePopup({ data, onClose }: { data: MilestoneData; onClose: (navigateTo?: string) => void }) {
  const confettiFired = useRef(false);

  useEffect(() => {
    if (!confettiFired.current) {
      confettiFired.current = true;
      fireConfetti();
    }
  }, []);

  if (data.type === "first_xp") {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4" data-testid="milestone-first-xp">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="bg-gradient-to-b from-indigo-50 to-purple-100 dark:from-indigo-950 dark:to-purple-950 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-indigo-200 dark:border-indigo-700"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs uppercase tracking-widest font-bold text-indigo-400 mb-3"
          >
            Reward Moment
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="text-5xl mb-2"
          >
            ✨
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="text-3xl font-black text-yellow-500 mb-1"
          >
            +{data.xpAmount || 20} XP
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 text-sm text-indigo-500 dark:text-indigo-400 font-semibold mb-4"
          >
            <span>🧭</span> Explorer Rank Progress
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-600 dark:text-gray-300 mb-6"
          >
            🎉 Great exploring! You earned XP.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={() => onClose()}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-400/30 transition-colors"
            data-testid="button-milestone-continue"
          >
            Continue Exploring
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (data.type === "first_rankup") {
    const newRankLevel = EXPLORER_XP_RANKS.find(r => r.name === data.newRankName)?.level || 0;
    const kitTierUnlock = Object.entries(KIT_TIER_RANK_GATES).find(([, reqLevel]) => reqLevel === newRankLevel);
    const unlockedKitTierName = kitTierUnlock ? KIT_TIER_NAMES[Number(kitTierUnlock[0])] : null;

    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4" data-testid="milestone-first-rankup">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-amber-300 dark:border-amber-700"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="text-5xl mb-3"
          >
            🎉
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-amber-700 dark:text-amber-300 mb-4"
          >
            Rank Up!
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-3 mb-5 bg-white/60 dark:bg-black/30 rounded-2xl py-4 px-6"
          >
            <div className="text-center">
              <div className="text-2xl mb-1">{data.oldRankIcon || "🧭"}</div>
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">{data.oldRankName || "Explorer"}</div>
            </div>
            <div className="text-2xl text-amber-500 font-bold">→</div>
            <div className="text-center">
              <div className="text-2xl mb-1">{data.newRankIcon || "🥾"}</div>
              <div className="text-sm font-bold text-amber-700 dark:text-amber-300">{data.newRankName || "Trail Seeker"}</div>
            </div>
          </motion.div>

          {unlockedKitTierName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
              className="bg-white/70 dark:bg-black/30 rounded-xl px-4 py-3 mb-4 border border-amber-200 dark:border-amber-700"
            >
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Kit Unlock</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                🎒 {unlockedKitTierName} tier gear is now available!
              </p>
              <div className="space-y-1">
                {[
                  { name: 'Compass', icon: '🧭' },
                  { name: 'Map Scroll', icon: '🗺️' },
                  { name: 'Boots', icon: '🥾' },
                  { name: 'Sundial', icon: '⏱️' },
                  { name: 'Badge', icon: '🏅' },
                  { name: 'Globe Lens', icon: '🔍' },
                  { name: 'Journal', icon: '📓' },
                ].map(item => (
                  <div key={item.name} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span>{item.icon}</span>
                    <span>{item.name} can now reach <span className="font-bold">{unlockedKitTierName}</span></span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 dark:text-gray-300 text-sm mb-6"
          >
            The more you explore the world, the higher your explorer rank climbs.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => onClose("/explorer-identity")}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-amber-400/30 transition-colors"
            data-testid="button-milestone-see-rank"
          >
            See My Rank
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (data.type === "first_kit") {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4" data-testid="milestone-first-kit">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="bg-gradient-to-b from-teal-50 to-emerald-100 dark:from-teal-950 dark:to-emerald-950 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-teal-300 dark:border-teal-700"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            className="text-5xl mb-3"
          >
            🎒
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-black text-teal-700 dark:text-teal-300 mb-4"
          >
            Explorer Kit Item Unlocked
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/60 dark:bg-black/30 rounded-2xl py-4 px-6 mb-4"
          >
            <div className="text-3xl mb-2">{data.kitItemIcon || "🧭"}</div>
            <p className="font-bold text-gray-800 dark:text-gray-100">
              {data.kitItemName || "Explorer Compass"} — {data.kitItemTier || "Bronze"}
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 dark:text-gray-300 text-sm mb-6"
          >
            Your Explorer Kit upgrades as you discover more of the world.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => onClose("/passport?tab=kit")}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-teal-400/30 transition-colors"
            data-testid="button-milestone-open-kit"
          >
            Open Explorer Kit
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (data.type === "elite_journey") {
    return (
      <div
        className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4"
        data-testid="milestone-elite-journey"
        onClick={() => onClose()}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", damping: 18 }}
          className="bg-gradient-to-b from-slate-900 to-indigo-950 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-indigo-500/40 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onClose()}
            className="absolute right-3 top-3 z-20 h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            data-testid="button-close-elite-journey"
          >
            ✕
          </button>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.15)_0%,_transparent_70%)]" />
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="text-5xl mb-4 relative z-10"
          >
            🏆
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10"
          >
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">GeoQuest Champion</p>
            <h2 className="text-2xl font-black text-white mb-3 leading-tight">
              You've reached GeoQuest Champion 🏆
            </h2>
            <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
              Most explorers stop here. But you didn't.<br />
              <span className="text-white font-bold">Welcome to the Elite Journey.</span>
            </p>

            <div className="bg-indigo-900/50 border border-indigo-500/30 rounded-2xl p-4 mb-6">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: '🎰', label: 'Bonus Spin Rewards' },
                  { icon: '🌍', label: 'Exclusive Adventures' },
                  { icon: '⚡', label: 'Elite Status' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-[10px] text-indigo-300 font-semibold leading-tight">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => onClose("/explorer-identity")}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-colors text-base"
              data-testid="button-enter-elite-journey"
            >
              Enter Elite Journey ✦
            </motion.button>
            <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 bg-black/20">
              <img src={eliteJourneyImage} alt="Elite Journey preview" className="w-full h-auto" data-testid="img-elite-journey-preview" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (data.type === "adventure_complete") {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4" data-testid="milestone-adventure-complete">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="bg-gradient-to-b from-orange-50 to-rose-100 dark:from-orange-950 dark:to-rose-950 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-orange-300 dark:border-orange-700"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="text-5xl mb-2"
          >
            🏆
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-xs uppercase tracking-widest font-bold text-orange-400 mb-2"
          >
            City Explorer Bonus
          </motion.div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-orange-700 dark:text-orange-300 mb-1"
          >
            {data.cityName || "City"} Explorer
          </motion.h2>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="text-2xl font-black text-yellow-500 mb-4"
          >
            +50 XP
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/60 dark:bg-black/30 rounded-2xl p-4 mb-4 text-left"
          >
            <p className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-3 text-center">
              City Journey Completed
            </p>
            {[
              { label: "Discovered", emoji: "🌍" },
              { label: "Learning", emoji: "📚" },
              { label: "Remembered", emoji: "🧠" },
              { label: "Visited", emoji: "📍" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3 py-1.5"
              >
                <span className="text-green-500 font-bold">✓</span>
                <span>{item.emoji}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-gray-600 dark:text-gray-300 text-sm mb-5"
          >
            You explored {data.cityName || "a new city"}!
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            onClick={() => onClose()}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-orange-400/30 transition-colors"
            data-testid="button-milestone-adventure-done"
          >
            Continue
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return null;
}

const ELITE_JOURNEY_STORAGE_KEY = "geoquest_elite_journey_shown";

function hasEliteJourneyBeenShown(explorerId: string): boolean {
  try {
    return localStorage.getItem(`${ELITE_JOURNEY_STORAGE_KEY}_${explorerId}`) === "true";
  } catch {
    return false;
  }
}

function markEliteJourneyShown(explorerId: string) {
  try {
    localStorage.setItem(`${ELITE_JOURNEY_STORAGE_KEY}_${explorerId}`, "true");
  } catch {}
}

export function MilestoneCelebrationProvider({ children }: { children: ReactNode }) {
  const { activeExplorer } = useExplorer();
  const [, navigate] = useLocation();
  const [currentMilestone, setCurrentMilestone] = useState<MilestoneData | null>(null);
  const queueRef = useRef<MilestoneData[]>([]);
  const isShowingRef = useRef(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isShowingRef.current = false;
      setCurrentMilestone(null);
      return;
    }
    isShowingRef.current = true;
    const next = queueRef.current.shift()!;
    setCurrentMilestone(next);
  }, []);

  const showMilestone = useCallback((data: MilestoneData) => {
    queueRef.current.push(data);
    if (!isShowingRef.current) {
      showNext();
    }
  }, [showNext]);

  const handleClose = useCallback((navigateTo?: string) => {
    if (navigateTo) {
      navigate(navigateTo);
    }
    setTimeout(() => showNext(), 300);
  }, [navigate, showNext]);

  useEffect(() => {
    const explorerId = activeExplorer?.id;
    if (!explorerId) return;

    const handleXPGained = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { amount, leveledUp, newRankName, oldRankName, oldRankIcon, newRankIcon, totalXp } = detail;

      const seen = getSeenMilestones(explorerId);

      if (!seen.first_xp) {
        markMilestoneSeen(explorerId, "first_xp");
        suppressNextXPToast();
        showMilestone({ type: "first_xp", xpAmount: amount });
      }

      if (leveledUp && !seen.first_rankup) {
        markMilestoneSeen(explorerId, "first_rankup");
        if (seen.first_xp) {
          suppressNextXPToast();
        }
        setTimeout(() => {
          showMilestone({
            type: "first_rankup",
            oldRankName,
            newRankName,
            oldRankIcon,
            newRankIcon,
          });
        }, 200);
      }

      if (totalXp && totalXp >= ELITE_XP_THRESHOLD && !hasEliteJourneyBeenShown(explorerId)) {
        markEliteJourneyShown(explorerId);
        setTimeout(() => {
          showMilestone({ type: "elite_journey" });
        }, 600);
      }
    };

    const handleKitUnlocked = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      const seen = getSeenMilestones(explorerId);
      if (!seen.first_kit) {
        markMilestoneSeen(explorerId, "first_kit");
        showMilestone({
          type: "first_kit",
          kitItemName: detail.itemName,
          kitItemTier: detail.tierName,
          kitItemIcon: detail.iconEmoji,
        });
      }
    };

    const handleAdventureComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      showMilestone({
        type: "adventure_complete",
        cityName: detail.cityName,
      });
    };

    window.addEventListener("xp-gained", handleXPGained);
    window.addEventListener("geoquest:kit-unlocked", handleKitUnlocked);
    window.addEventListener("geoquest:adventure-completed", handleAdventureComplete);

    return () => {
      window.removeEventListener("xp-gained", handleXPGained);
      window.removeEventListener("geoquest:kit-unlocked", handleKitUnlocked);
      window.removeEventListener("geoquest:adventure-completed", handleAdventureComplete);
    };
  }, [activeExplorer?.id, showMilestone]);

  return (
    <MilestoneCelebrationContext.Provider value={{ showMilestone }}>
      {children}
      <AnimatePresence>
        {currentMilestone && (
          <MilestonePopup data={currentMilestone} onClose={handleClose} />
        )}
      </AnimatePresence>
    </MilestoneCelebrationContext.Provider>
  );
}
