import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EXPLORER_XP_RANKS, KIT_TIER_RANK_GATES, KIT_TIER_NAMES } from "@shared/schema";

const KIT_ITEM_NAMES = [
  { name: 'Compass', icon: '🧭' },
  { name: 'Map Scroll', icon: '🗺️' },
  { name: 'Boots', icon: '🥾' },
  { name: 'Sundial', icon: '⏱️' },
  { name: 'Badge', icon: '🏅' },
  { name: 'Globe Lens', icon: '🔍' },
  { name: 'Journal', icon: '📓' },
];

interface XPToastData {
  amount: number;
  id: number;
  leveledUp?: boolean;
  newRankName?: string;
  kitTierUnlocked?: string | null;
}

let toastCounter = 0;
let _suppressNextXPToast = false;

export function suppressNextXPToast() {
  _suppressNextXPToast = true;
}

export function dispatchXPGain(amount: number, leveledUp?: boolean, newRankName?: string, oldRankName?: string, oldRankIcon?: string, newRankIcon?: string, totalXp?: number) {
  window.dispatchEvent(
    new CustomEvent("xp-gained", {
      detail: { amount, id: ++toastCounter, leveledUp, newRankName, oldRankName, oldRankIcon, newRankIcon, totalXp },
    })
  );
  if (leveledUp) {
    window.dispatchEvent(new CustomEvent('geoquest:spin-earned', { detail: { reason: 'rank_up' } }));
  }
}

export function XPGainToastProvider() {
  const [toasts, setToasts] = useState<XPToastData[]>([]);

  const handleXPGain = useCallback((e: Event) => {
    if (_suppressNextXPToast) {
      _suppressNextXPToast = false;
      return;
    }
    const detail = (e as CustomEvent).detail as XPToastData;
    if (detail.leveledUp && detail.newRankName) {
      const newRankLevel = EXPLORER_XP_RANKS.find(r => r.name === detail.newRankName)?.level || 0;
      const kitTierEntry = Object.entries(KIT_TIER_RANK_GATES).find(([, reqLevel]) => reqLevel === newRankLevel);
      detail.kitTierUnlocked = kitTierEntry ? (KIT_TIER_NAMES[Number(kitTierEntry[0])] || null) : null;
    }
    setToasts((prev) => [...prev, detail]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== detail.id));
    }, detail.kitTierUnlocked ? 6000 : 2500);
  }, []);

  useEffect(() => {
    window.addEventListener("xp-gained", handleXPGain);
    return () => window.removeEventListener("xp-gained", handleXPGain);
  }, [handleXPGain]);

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex flex-col items-center"
            data-testid="xp-toast"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg font-black text-sm flex items-center gap-1.5">
              <span className="text-yellow-300">+{toast.amount}</span>
              <span>XP</span>
            </div>
            {toast.leveledUp && toast.newRankName && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-1 flex flex-col items-center gap-1"
              >
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full shadow-lg font-bold text-xs">
                  Rank Up! {toast.newRankName}
                </div>
                {toast.kitTierUnlocked && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-3 py-1.5 rounded-xl shadow-lg text-xs max-w-[220px]"
                  >
                    <div className="font-bold mb-1">🎒 {toast.kitTierUnlocked} Kit Gear Unlocked!</div>
                    <div className="space-y-0.5 text-[10px] opacity-90">
                      {KIT_ITEM_NAMES.map(item => (
                        <div key={item.name}>{item.icon} {item.name} can reach {toast.kitTierUnlocked}</div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
