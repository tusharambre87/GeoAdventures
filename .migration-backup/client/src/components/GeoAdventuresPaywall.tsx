import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Compass, Globe, Sparkles, Crown, ArrowRight, X, Lock, Gamepad2, Map, BookOpen, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/userContext";
import { getExplorerRank, EXPLORER_XP_RANKS } from "@shared/schema";
import { usePricing, DEFAULT_PRICING } from "@/hooks/usePricing";

const TEASER_CITIES = [
  { city: "Tokyo", country: "Japan", emoji: "🗼", tagline: "Ancient temples and futuristic streets" },
  { city: "Cairo", country: "Egypt", emoji: "🏛️", tagline: "Pyramids, pharaohs, and the Nile" },
  { city: "Rio de Janeiro", country: "Brazil", emoji: "🎭", tagline: "Carnivals, beaches, and rainforests" },
  { city: "London", country: "United Kingdom", emoji: "🎡", tagline: "Big Ben, castles, and royal guards" },
  { city: "Sydney", country: "Australia", emoji: "🦘", tagline: "Opera House, koalas, and coral reefs" },
  { city: "Marrakech", country: "Morocco", emoji: "🕌", tagline: "Colorful markets and desert adventures" },
  { city: "New York", country: "United States", emoji: "🗽", tagline: "Skyscrapers, hot dogs, and Central Park" },
  { city: "Reykjavik", country: "Iceland", emoji: "🌋", tagline: "Northern lights, geysers, and volcanoes" },
  { city: "Bangkok", country: "Thailand", emoji: "🛕", tagline: "Golden temples and floating markets" },
  { city: "Nairobi", country: "Kenya", emoji: "🦁", tagline: "Safaris, savannas, and wildlife" },
  { city: "Rome", country: "Italy", emoji: "🏟️", tagline: "Colosseum, gelato, and ancient ruins" },
  { city: "Mexico City", country: "Mexico", emoji: "🌮", tagline: "Aztec pyramids and vibrant murals" },
];

function pickRandomCities(exclude?: string, count = 3) {
  const available = TEASER_CITIES.filter(
    (c) => c.city.toLowerCase() !== exclude?.toLowerCase()
  );
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function PlanRow({ name, price, sub, highlight }: { name: string; price: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${highlight ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-100'}`}>
      <div>
        <p className={`text-xs font-bold ${highlight ? 'text-amber-800' : 'text-slate-700'}`}>{name}</p>
        <p className={`text-[10px] ${highlight ? 'text-amber-600' : 'text-slate-400'}`}>{sub}</p>
      </div>
      <span className={`text-sm font-black ${highlight ? 'text-amber-700' : 'text-slate-800'}`}>{price}</span>
    </div>
  );
}

interface AdventureLimitReachedProps {
  isOpen: boolean;
  onClose: () => void;
  adventuresUsed?: number;
  adventuresLimit?: number;
}

export function AdventureLimitReached({ isOpen, onClose, adventuresUsed = 2, adventuresLimit = 2 }: AdventureLimitReachedProps) {
  const [, setLocation] = useLocation();
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;
  const lockedCities = useMemo(() => pickRandomCities(undefined, 3), []);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    setLocation("/pricing?entry=geoadventures");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 p-4" data-testid="adventure-limit-reached">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 22 }}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-br from-teal-400 to-emerald-500 px-6 pt-8 pb-6 text-center relative">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                data-testid="button-limit-close"
              >
                <X className="w-4 h-4" />
              </button>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 300 }} className="text-5xl mb-3">🎉</motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-xl font-black text-white mb-1">
                Adventure Complete!
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-teal-100 text-sm">
                You've used all {adventuresLimit} free adventures
              </motion.p>
            </div>

            <div className="px-6 py-5">
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-3 text-center">
                Cities waiting for you
              </motion.p>

              <div className="space-y-2.5 mb-4">
                {lockedCities.map((city, i) => (
                  <motion.div
                    key={city.city}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 relative overflow-hidden"
                    data-testid={`locked-city-card-${i}`}
                  >
                    <div className="text-2xl flex-shrink-0">{city.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{city.city}, {city.country}</p>
                      <p className="text-xs text-slate-400 truncate">{city.tagline}</p>
                    </div>
                    <div className="absolute inset-0 bg-white/40 dark:bg-black/20 flex items-center justify-end pr-3">
                      <div className="bg-slate-200/80 dark:bg-slate-700/80 rounded-full p-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-2 mb-4">
                <PlanRow name="GeoQuest Explorer" price={`${p.monthly}/mo`} sub="Billed monthly" />
                <PlanRow name="GeoQuest Explorer" price={`${p.annual}/yr`} sub="Save 30%+ · Best value" />
                <PlanRow name="Founding Families" price={`${p.foundingAnnual}/yr`} sub="Limited early-supporter spots" highlight />
              </div>

              <Button
                onClick={handleUpgrade}
                className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-teal-400/30"
                data-testid="button-limit-upgrade"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Unlock Unlimited Adventures
              </Button>

              <button
                onClick={onClose}
                className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                data-testid="button-limit-later"
              >
                Maybe next month
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface NextDestinationHookProps {
  currentCity?: string;
  onClose: () => void;
}

export function NextDestinationHook({ currentCity, onClose }: NextDestinationHookProps) {
  const [, setLocation] = useLocation();
  const { collectedCardIds } = useUser();
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;

  const teaserCities = useMemo(() => {
    const lowerCurrent = currentCity?.toLowerCase();
    const available = TEASER_CITIES.filter((c) => c.city.toLowerCase() !== lowerCurrent);
    const discovered = new Set((collectedCardIds || []).map((id: string) => id.toLowerCase()));
    const undiscovered = available.filter(
      (c) => !discovered.has(c.city.toLowerCase()) && !discovered.has(`dq_${c.city.toLowerCase()}`)
    );
    const pool = undiscovered.length >= 3 ? undiscovered : available;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [currentCity, collectedCardIds]);

  const handleUpgrade = () => {
    onClose();
    setLocation("/pricing?entry=geoadventures");
  };

  if (teaserCities.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950 dark:to-emerald-950 rounded-2xl p-5 border border-teal-200 dark:border-teal-800 shadow-sm"
      data-testid="next-destination-hook"
    >
      <div className="flex items-center gap-2 mb-1">
        <Compass className="w-5 h-5 text-teal-500" />
        <p className="text-xs uppercase tracking-widest font-bold text-teal-600 dark:text-teal-400">
          Explorer Compass Detected a New Signal
        </p>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        Upgrade to GeoQuest Explorer to unlock these destinations
      </p>

      <div className="space-y-2 mb-4">
        {teaserCities.map((city, i) => (
          <motion.div
            key={city.city}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 + i * 0.1 }}
            className="flex items-center gap-3 bg-white/70 dark:bg-slate-800/70 rounded-xl p-2.5 border border-teal-100 dark:border-teal-800 relative overflow-hidden"
            data-testid={`teaser-city-${i}`}
          >
            <div className="text-xl flex-shrink-0">{city.emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{city.city}, {city.country}</p>
              <p className="text-[11px] text-slate-400 truncate">{city.tagline}</p>
            </div>
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-100/60 dark:bg-teal-900/60 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-teal-400" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-1.5 mb-3">
        <PlanRow name="GeoQuest Explorer" price={`${p.monthly}/mo`} sub="Billed monthly" />
        <PlanRow name="Founding Families" price={`${p.foundingAnnual}/yr`} sub="Limited early-supporter spots" highlight />
      </div>

      <Button
        onClick={handleUpgrade}
        className="w-full h-11 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-md shadow-teal-400/20"
        data-testid="button-next-destination-upgrade"
      >
        <Compass className="w-4 h-4 mr-2" />
        Continue the Journey
      </Button>

      <p className="text-[11px] text-center text-slate-400 mt-2">
        {TEASER_CITIES.length}+ cities waiting to be explored
      </p>
    </motion.div>
  );
}

interface RankPromotionPaywallProps {
  isOpen: boolean;
  onClose: () => void;
  currentXp: number;
}

export function RankPromotionPaywall({ isOpen, onClose, currentXp }: RankPromotionPaywallProps) {
  const [, setLocation] = useLocation();
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;

  const rankData = useMemo(() => getExplorerRank(currentXp), [currentXp]);
  const nextRank = useMemo(() => {
    const currentIdx = EXPLORER_XP_RANKS.findIndex(r => r.id === rankData.rank.id);
    return EXPLORER_XP_RANKS[currentIdx + 1] || EXPLORER_XP_RANKS[currentIdx];
  }, [rankData]);
  const champion = EXPLORER_XP_RANKS[EXPLORER_XP_RANKS.length - 1];
  const lockedCities = useMemo(() => pickRandomCities(undefined, 3), []);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    setLocation("/pricing?entry=geoadventures");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 p-4" data-testid="rank-promotion-paywall">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 22 }}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 px-6 pt-8 pb-6 text-center relative">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                data-testid="button-rank-paywall-close"
              >
                <X className="w-4 h-4" />
              </button>
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }} className="text-5xl mb-2">🏅</motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-xl font-black text-white mb-1">
                Explorer Rank Promoted!
              </motion.h2>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-center gap-2 mt-2">
                <div className="text-center">
                  <span className="text-2xl block">{rankData.rank.icon}</span>
                  <span className="text-[10px] text-white/70 font-medium">{rankData.rank.name}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-white/70" />
                <div className="text-center">
                  <span className="text-2xl block">{nextRank.icon}</span>
                  <span className="text-[10px] text-white font-bold">{nextRank.name}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-white/70" />
                <div className="text-center">
                  <span className="text-2xl block">{champion.icon}</span>
                  <span className="text-[10px] text-white/70 font-medium">{champion.name}</span>
                </div>
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-amber-100 text-sm mt-2">
                {currentXp} XP earned — you've reached {rankData.rank.name}! Upgrade to become {nextRank.name}.
              </motion.p>
            </div>

            <div className="px-6 py-5">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-3 text-center">Abilities you'll unlock</p>
                <div className="space-y-2 mb-4">
                  {[
                    { icon: <Gamepad2 className="w-4 h-4 text-purple-500" />, label: "Advanced GeoGames", desc: "Flag Quiz, Map Me & unlimited daily play" },
                    { icon: <Globe className="w-4 h-4 text-teal-500" />, label: "Full City Adventures", desc: "Unlimited GeoAdventures & stops" },
                    { icon: <BookOpen className="w-4 h-4 text-amber-500" />, label: "Explorer Passport Tracking", desc: "All 12 ranks & full passport mastery" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.06 }}
                      className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3"
                    >
                      <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</p>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-1.5 mb-4">
                  <PlanRow name="GeoQuest Explorer" price={`${p.monthly}/mo`} sub="Billed monthly" />
                  <PlanRow name="GeoQuest Explorer" price={`${p.annual}/yr`} sub="Save 30%+" />
                  <PlanRow name="Founding Families" price={`${p.foundingAnnual}/yr`} sub="Limited early-supporter spots" highlight />
                </div>

                <Button
                  onClick={handleUpgrade}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-amber-400/30"
                  data-testid="button-rank-paywall-upgrade"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Unlock the Full Explorer Journey
                </Button>

                <button
                  onClick={onClose}
                  className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  data-testid="button-rank-paywall-later"
                >
                  Keep exploring for free
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
