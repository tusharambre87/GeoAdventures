import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, ChevronLeft, ChevronRight, Gift, Star, Trophy, Lock, Sparkles, Award, BookOpen, Map, FileText, Printer, Mail, Download, Flag, Puzzle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useExplorer } from "@/lib/explorerContext";

interface CitySticker {
  id: string;
  city: string;
  country: string;
  continent: string;
  stickerIcon: string;
  funFact: string | null;
}

interface UserCitySticker {
  id: string;
  stickerId: string;
  earnedAt: string;
  isTraded: boolean;
  tradedAt: string | null;
  sticker: CitySticker;
}

interface UserReward {
  id: string;
  rewardType: string;
  rewardName: string;
  earnedAt: string;
  rewardUrl: string | null;
}

interface ExplorerRank {
  id: string;
  rankLevel: number;
  rankName: string;
  achievedAt: string;
}

const CONTINENTS = ["Europe", "North America", "Asia", "South America", "Africa", "Oceania"] as const;
const CONTINENT_COLORS: Record<string, string> = {
  "Europe": "from-purple-400 to-purple-600",
  "North America": "from-red-400 to-red-600",
  "Asia": "from-yellow-400 to-yellow-600",
  "South America": "from-green-400 to-green-600",
  "Africa": "from-orange-400 to-orange-600",
  "Oceania": "from-teal-400 to-teal-600",
};
const CONTINENT_BG: Record<string, string> = {
  "Europe": "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700",
  "North America": "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
  "Asia": "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700",
  "South America": "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700",
  "Africa": "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700",
  "Oceania": "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700",
};

const RANK_ICONS: Record<number, string> = {
  1: "🌱",
  2: "🥾",
  3: "🗺️",
  4: "🌍",
  5: "⭐",
};

const RANK_NAMES: Record<number, string> = {
  1: "Rookie Explorer",
  2: "Trailblazer",
  3: "Map Master",
  4: "World Ranger",
  5: "Legendary Voyager",
};

const SLOTS_PER_PAGE = 12;

const COUNTRIES_WITH_COLORING_SHEETS = ["Iceland", "Italy", "Japan", "Peru", "Spain", "Turkey", "United States", "USA", "India", "France", "UK", "United Kingdom", "Egypt", "Brazil", "Australia"];

export default function TreasureVault() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { activeExplorer } = useExplorer();
  const [selectedContinent, setSelectedContinent] = useState<typeof CONTINENTS[number]>("Europe");
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [showTradeDialog, setShowTradeDialog] = useState(false);
  const [showRewardsDialog, setShowRewardsDialog] = useState(false);
  const [tradeResult, setTradeResult] = useState<{ success: boolean; reward?: UserReward; newRank?: ExplorerRank } | null>(null);
  const [viewingReward, setViewingReward] = useState<UserReward | null>(null);
  const [showCountryNotification, setShowCountryNotification] = useState(false);
  const [countryForTrade, setCountryForTrade] = useState<string | null>(null);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryReward, setDeliveryReward] = useState<UserReward | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const visitorId = typeof window !== 'undefined' ? localStorage.getItem('geoquest_visitor_id') : null;
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('geoquest_user') : null;
  const userEmail = (() => {
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser)?.email || null;
    } catch {
      return null;
    }
  })();
  const playerId = activeExplorer?.id || null;

  const STICKERS_CACHE_KEY = `geoquest_stickers_cache_${playerId || visitorId}`;
  const STATS_CACHE_KEY = `geoquest_stats_cache_${playerId || visitorId}`;
  const REWARDS_CACHE_KEY = `geoquest_rewards_cache_${playerId || visitorId}`;
  
  const { data: stickersData, isLoading: stickersLoading } = useQuery<{ stickers: UserCitySticker[] }>({
    queryKey: ['/api/stickers/user', visitorId, playerId],
    queryFn: async () => {
      // If offline, return cached data
      if (!navigator.onLine) {
        const cached = localStorage.getItem(STICKERS_CACHE_KEY);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (e) {
            console.error('Failed to parse cached stickers:', e);
          }
        }
        throw new Error('Offline - no cached stickers');
      }
      
      const url = playerId 
        ? `/api/stickers/user/${visitorId}?playerId=${playerId}`
        : `/api/stickers/user/${visitorId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch stickers');
      const data = await res.json();
      
      // Cache stickers for offline use
      try {
        localStorage.setItem(STICKERS_CACHE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error('Failed to cache stickers:', e);
      }
      
      return data;
    },
    enabled: !!visitorId,
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!navigator.onLine) return false;
      return failureCount < 3;
    },
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<{ stats: { totalStickers: number; untradedStickers: number; tradedStickers: number; rankName: string | null; rankLevel: number | null } }>({
    queryKey: ['/api/stickers/stats', visitorId, playerId],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = localStorage.getItem(STATS_CACHE_KEY);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (e) {
            console.error('Failed to parse cached stats:', e);
          }
        }
        throw new Error('Offline - no cached stats');
      }
      
      const url = playerId 
        ? `/api/stickers/stats/${visitorId}?playerId=${playerId}`
        : `/api/stickers/stats/${visitorId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      
      try {
        localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error('Failed to cache stats:', e);
      }
      
      return data;
    },
    enabled: !!visitorId,
    retry: (failureCount, error) => {
      if (!navigator.onLine) return false;
      return failureCount < 3;
    },
  });

  const { data: rewardsData, isLoading: rewardsLoading } = useQuery<UserReward[]>({
    queryKey: ['/api/rewards/user', visitorId, playerId],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = localStorage.getItem(REWARDS_CACHE_KEY);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (e) {
            console.error('Failed to parse cached rewards:', e);
          }
        }
        throw new Error('Offline - no cached rewards');
      }
      
      const url = playerId 
        ? `/api/rewards/user/${visitorId}?playerId=${playerId}`
        : `/api/rewards/user/${visitorId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch rewards');
      const data = await res.json();
      
      try {
        localStorage.setItem(REWARDS_CACHE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error('Failed to cache rewards:', e);
      }
      
      return data;
    },
    enabled: !!visitorId,
    retry: (failureCount, error) => {
      if (!navigator.onLine) return false;
      return failureCount < 3;
    },
  });

  const tradeMutation = useMutation({
    mutationFn: async ({ stickerIds, tradeType }: { stickerIds: string[]; tradeType: string }) => {
      const res = await fetch('/api/stickers/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          playerId,
          stickerIds,
          tradeType,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Trade failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setTradeResult(data);
      setSelectedStickers([]);
      setShowCountryNotification(false);
      setCountryForTrade(null);
      queryClient.invalidateQueries({ queryKey: ['/api/stickers/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stickers/stats'] });
      toast.success("Trade successful! You earned a new reward!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const rawStickers = (stickersData?.stickers || []).filter(s => s?.sticker);
  
  // Deduplicate stickers by city name to avoid showing same city multiple times
  const stickers = rawStickers.reduce((unique: UserCitySticker[], sticker) => {
    const cityName = sticker.sticker?.city;
    if (!cityName) return unique;
    const exists = unique.find(s => s.sticker?.city === cityName);
    if (!exists) {
      unique.push(sticker);
    }
    return unique;
  }, []);
  
  const rewards = rewardsData || [];
  const stats = statsData?.stats;
  const currentRank = stats?.rankName && stats?.rankLevel ? { rankName: stats.rankName, rankLevel: stats.rankLevel } : null;

  const continentStickers = stickers.filter(s => s.sticker?.continent === selectedContinent);
  const untradedContinentStickers = continentStickers.filter(s => !s.tradedAt);
  const totalPages = Math.max(1, Math.ceil(continentStickers.length / SLOTS_PER_PAGE));
  const currentPageStickers = continentStickers.slice(pageIndex * SLOTS_PER_PAGE, (pageIndex + 1) * SLOTS_PER_PAGE);

  const untradedStickers = stickers.filter(s => !s.tradedAt);
  const canTradeAny5 = untradedStickers.length >= 5;

  const getSameCountryGroups = () => {
    const countryGroups: Record<string, UserCitySticker[]> = {};
    untradedStickers.forEach(s => {
      const country = s.sticker?.country;
      if (!country) return;
      if (!countryGroups[country]) countryGroups[country] = [];
      countryGroups[country].push(s);
    });
    return Object.entries(countryGroups)
      .filter(([country, stickers]) => stickers.length >= 5 && COUNTRIES_WITH_COLORING_SHEETS.includes(country))
      .map(([country, stickers]) => ({ country, stickers }));
  };

  const sameCountryGroups = getSameCountryGroups();
  const hasCountryTradeAvailable = sameCountryGroups.length > 0;

  useEffect(() => {
    if (sameCountryGroups.length > 0 && !showCountryNotification && !countryForTrade) {
      const timer = setTimeout(() => {
        setCountryForTrade(sameCountryGroups[0].country);
        setShowCountryNotification(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [sameCountryGroups.length, showCountryNotification, countryForTrade]);

  const toggleStickerSelection = (stickerId: string) => {
    if (selectedStickers.includes(stickerId)) {
      setSelectedStickers(prev => prev.filter(id => id !== stickerId));
    } else if (selectedStickers.length < 5) {
      setSelectedStickers(prev => [...prev, stickerId]);
    }
  };

  const handleTrade = (tradeType: 'coloring_sheet' | 'country_coloring') => {
    if (selectedStickers.length !== 5) {
      toast.error("Please select exactly 5 stickers to trade");
      return;
    }
    tradeMutation.mutate({ stickerIds: selectedStickers, tradeType });
    setShowTradeDialog(false);
  };

  const handleCountryTrade = (country: string) => {
    const countryStickers = untradedStickers.filter(s => s.sticker?.country === country).slice(0, 5);
    if (countryStickers.length < 5) {
      toast.error(`You need 5 stickers from ${country} to trade`);
      return;
    }
    const stickerIds = countryStickers.map(s => s.id);
    tradeMutation.mutate({ stickerIds, tradeType: 'country_coloring' });
    setShowCountryNotification(false);
    setCountryForTrade(null);
  };

  const checkIfSelectedAreFromSameCountry = () => {
    if (selectedStickers.length !== 5) return null;
    const selectedStickerData = stickers.filter(s => selectedStickers.includes(s.id));
    const countries = new Set(selectedStickerData.map(s => s.sticker?.country));
    if (countries.size === 1) {
      const country = selectedStickerData[0]?.sticker?.country;
      if (COUNTRIES_WITH_COLORING_SHEETS.includes(country)) {
        return country;
      }
    }
    return null;
  };

  const selectedCountry = checkIfSelectedAreFromSameCountry();

  const handlePrint = (reward: UserReward) => {
    if (!reward.rewardUrl) return;
    const printWindow = window.open(reward.rewardUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleSendEmail = async (reward: UserReward, email: string) => {
    if (!reward.rewardUrl || !email) return;
    
    setSendingEmail(true);
    try {
      const res = await fetch('/api/rewards/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewardId: reward.id,
          email,
          visitorId,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to send email');
      }
      
      toast.success(`Coloring sheet sent to ${email}!`);
      setShowDeliveryDialog(false);
      setDeliveryReward(null);
      setCustomEmail("");
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const openDeliveryOptions = (reward: UserReward) => {
    setDeliveryReward(reward);
    setCustomEmail(userEmail || "");
    setShowDeliveryDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-200/30 dark:bg-yellow-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-orange-200/30 dark:bg-orange-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">Back</span>
          </Button>

          {currentRank && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/40 dark:to-orange-900/40 px-4 py-2 rounded-full border-2 border-yellow-300 dark:border-yellow-600"
            >
              <span className="text-2xl">{RANK_ICONS[currentRank.rankLevel] || "🌱"}</span>
              <span className="font-bold text-amber-800 dark:text-amber-200">{currentRank.rankName}</span>
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-amber-800 dark:text-amber-200 mb-2 flex items-center justify-center gap-3">
            <span className="text-5xl">📖</span>
            Souvenir Book
            <span className="text-5xl">📖</span>
          </h1>
          <p className="text-lg text-amber-600 dark:text-amber-400 font-medium">
            Your collection of city souvenirs from around the world!
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="bg-white/60 dark:bg-gray-800/60 px-4 py-2 rounded-full">
              <span className="text-amber-800 dark:text-amber-200 font-bold">{stickers.length} Souvenirs</span>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 px-4 py-2 rounded-full">
              <span className="text-amber-800 dark:text-amber-200 font-bold">{untradedStickers.length} Available to Trade</span>
            </div>
          </div>
          
        </motion.div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CONTINENTS.map((continent) => {
            const count = stickers.filter(s => s.sticker?.continent === continent && !s.tradedAt).length;
            return (
              <Button
                key={continent}
                variant={selectedContinent === continent ? "default" : "outline"}
                onClick={() => { setSelectedContinent(continent); setPageIndex(0); }}
                className={cn(
                  "flex-shrink-0 rounded-full font-bold transition-all",
                  selectedContinent === continent
                    ? `bg-gradient-to-r ${CONTINENT_COLORS[continent]} text-white shadow-lg`
                    : "bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700"
                )}
                data-testid={`button-continent-${continent.toLowerCase().replace(' ', '-')}`}
              >
                {continent}
                {count > 0 && (
                  <span className="ml-2 bg-white/30 px-2 py-0.5 rounded-full text-xs">{count}</span>
                )}
              </Button>
            );
          })}
        </div>

        {stickers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-gray-800/80 rounded-3xl border-4 border-dashed border-amber-300 dark:border-amber-600 p-12 mb-6 text-center"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-amber-500 dark:text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-3">
              Your Souvenir Book is Empty!
            </h3>
            <p className="text-lg text-amber-600 dark:text-amber-400 mb-6">
              Play Daily Quest to earn your first City Souvenir!
            </p>
            <Button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold px-8 py-4 rounded-xl text-lg"
              data-testid="button-go-daily-quest"
            >
              <Star className="w-5 h-5 mr-2" />
              Play Daily Quest
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key={selectedContinent}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "rounded-3xl border-4 p-6 mb-6 shadow-xl",
              CONTINENT_BG[selectedContinent]
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={cn(
                "text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                CONTINENT_COLORS[selectedContinent]
              )}>
                {selectedContinent} Souvenirs
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                  disabled={pageIndex === 0}
                  className="rounded-full"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium px-2">
                  Page {pageIndex + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPageIndex(Math.min(totalPages - 1, pageIndex + 1))}
                  disabled={pageIndex >= totalPages - 1}
                  className="rounded-full"
                  data-testid="button-next-page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3">
              {Array.from({ length: SLOTS_PER_PAGE }).map((_, index) => {
                const sticker = currentPageStickers[index];
                const isSelected = sticker && selectedStickers.includes(sticker.id);
                const isTraded = sticker?.tradedAt;

                return (
                  <motion.div
                    key={index}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-2 cursor-pointer transition-all relative",
                      sticker
                        ? isTraded
                          ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 opacity-50"
                          : isSelected
                            ? "bg-yellow-100 dark:bg-yellow-900/50 border-yellow-400 dark:border-yellow-500 shadow-lg ring-2 ring-yellow-400"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-yellow-300 hover:shadow-md"
                        : "bg-gray-100/50 dark:bg-gray-800/50 border-dashed border-gray-300 dark:border-gray-600"
                    )}
                    onClick={() => sticker && !isTraded && toggleStickerSelection(sticker.id)}
                    data-testid={`sticker-slot-${index}`}
                  >
                    {sticker ? (
                      <>
                        <span className="text-4xl mb-1">{sticker.sticker?.stickerIcon || '🏙️'}</span>
                        <span className="text-xs font-bold text-center text-gray-700 dark:text-gray-200 leading-tight">
                          {sticker.sticker?.city || 'City'}
                        </span>
                        {isTraded && (
                          <div className="absolute inset-0 bg-gray-500/30 rounded-2xl flex items-center justify-center">
                            <span className="text-xl">✓</span>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                            ✓
                          </div>
                        )}
                      </>
                    ) : (
                      <Lock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            onClick={() => setShowTradeDialog(true)}
            disabled={selectedStickers.length !== 5}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-6 py-6 rounded-2xl shadow-lg disabled:opacity-50"
            data-testid="button-open-trade"
          >
            <Gift className="w-5 h-5 mr-2" />
            Trade Souvenirs ({selectedStickers.length}/5)
          </Button>

          <Button
            onClick={() => setShowRewardsDialog(true)}
            variant="outline"
            className="border-2 border-purple-400 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 font-bold px-6 py-6 rounded-2xl"
            data-testid="button-view-rewards"
          >
            <Trophy className="w-5 h-5 mr-2" />
            My Rewards ({rewards.length})
          </Button>
        </div>

        {selectedStickers.length > 0 && selectedStickers.length < 5 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            <p className="text-amber-700 dark:text-amber-300 font-medium">
              Select {5 - selectedStickers.length} more souvenir{5 - selectedStickers.length !== 1 ? 's' : ''} to trade!
            </p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showCountryNotification && countryForTrade && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-2xl border-2 border-blue-300">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Flag className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-lg mb-1">
                    Special Trade Available!
                  </h4>
                  <p className="text-blue-100 text-sm mb-3">
                    You have 5+ souvenirs from {countryForTrade}! Trade them for a special {countryForTrade} Coloring Sheet!
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCountryTrade(countryForTrade)}
                      disabled={tradeMutation.isPending}
                      className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-4 py-2 rounded-xl text-sm"
                      data-testid="button-accept-country-trade"
                    >
                      Trade Now!
                    </Button>
                    <Button
                      onClick={() => {
                        setShowCountryNotification(false);
                        setCountryForTrade(null);
                      }}
                      variant="ghost"
                      className="text-white hover:bg-white/20 px-4 py-2 rounded-xl text-sm"
                      data-testid="button-dismiss-country-trade"
                    >
                      Later
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showTradeDialog} onOpenChange={setShowTradeDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Gift className="w-6 h-6 text-amber-500" />
              Trade Your Souvenirs
            </DialogTitle>
            <DialogDescription>
              You have {selectedStickers.length} souvenirs selected. Choose what to trade them for!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Button
              onClick={() => handleTrade('coloring_sheet')}
              disabled={selectedStickers.length !== 5 || tradeMutation.isPending}
              className="w-full h-auto py-4 bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white rounded-xl flex items-center gap-4"
              data-testid="button-trade-city-coloring"
            >
              <FileText className="w-8 h-8" />
              <div className="text-left">
                <div className="font-bold text-lg">City Coloring Sheet</div>
                <div className="text-sm opacity-80">Any 5 souvenirs - Get the next city in sequence</div>
              </div>
            </Button>

            {selectedCountry && (
              <Button
                onClick={() => handleTrade('country_coloring')}
                disabled={selectedStickers.length !== 5 || tradeMutation.isPending}
                className="w-full h-auto py-4 bg-gradient-to-r from-blue-400 to-indigo-500 hover:from-blue-500 hover:to-indigo-600 text-white rounded-xl flex items-center gap-4"
                data-testid="button-trade-country-coloring"
              >
                <Flag className="w-8 h-8" />
                <div className="text-left">
                  <div className="font-bold text-lg">{selectedCountry} Coloring Sheet</div>
                  <div className="text-sm opacity-80">Special reward for 5 {selectedCountry} souvenirs!</div>
                </div>
              </Button>
            )}

            {!selectedCountry && hasCountryTradeAvailable && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-700">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <Flag className="w-4 h-4 inline mr-1" />
                  Tip: Select 5 souvenirs from the same country to unlock a special Country Coloring Sheet!
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTradeDialog(false)} className="rounded-xl">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRewardsDialog} onOpenChange={setShowRewardsDialog}>
        <DialogContent className="sm:max-w-lg rounded-3xl max-h-[80vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Trophy className="w-6 h-6 text-purple-500" />
              My Rewards
            </DialogTitle>
            <DialogDescription>
              Rewards you've earned by trading souvenirs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {rewards.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium text-lg mb-2">No rewards yet!</p>
                <p className="text-sm">Trade 5 souvenirs to unlock your first reward.</p>
              </div>
            ) : (
              rewards.map((reward) => (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-700 flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-md">
                    {reward.rewardType === 'coloring_sheet' && <FileText className="w-6 h-6 text-pink-500" />}
                    {reward.rewardType === 'country_coloring' && <Flag className="w-6 h-6 text-blue-500" />}
                    {reward.rewardType === 'country_map' && <Map className="w-6 h-6 text-blue-500" />}
                    {reward.rewardType === 'continent_map' && <BookOpen className="w-6 h-6 text-emerald-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 dark:text-gray-100">{reward.rewardName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Earned {new Date(reward.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {reward.rewardUrl && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-full"
                        onClick={() => setViewingReward(reward)}
                        data-testid={`button-view-reward-${reward.id}`}
                      >
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-full"
                        onClick={() => openDeliveryOptions(reward)}
                        data-testid={`button-delivery-reward-${reward.id}`}
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowRewardsDialog(false)} className="rounded-xl bg-purple-500 hover:bg-purple-600 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {tradeResult?.success && tradeResult.reward && (
        <Dialog open={!!tradeResult} onOpenChange={() => setTradeResult(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl text-center [&>button]:hidden">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-8"
            >
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-yellow-200 to-orange-200 dark:from-yellow-700 dark:to-orange-700 rounded-full flex items-center justify-center shadow-lg border-4 border-yellow-400">
                <Sparkles className="w-12 h-12 text-yellow-600 dark:text-yellow-300" />
              </div>
              <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-2">
                Congratulations!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                You earned: <span className="font-bold">{tradeResult.reward.rewardName}</span>
              </p>
              {tradeResult.newRank && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 p-4 rounded-xl mb-4"
                >
                  <Award className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                  <p className="font-bold text-purple-800 dark:text-purple-200">
                    New Rank: {tradeResult.newRank.rankName}
                  </p>
                </motion.div>
              )}
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => {
                    openDeliveryOptions(tradeResult.reward!);
                    setTradeResult(null);
                  }}
                  variant="outline"
                  className="rounded-xl border-2"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Get It
                </Button>
                <Button
                  onClick={() => setTradeResult(null)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-8 py-3 rounded-xl"
                >
                  Awesome!
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}

      {viewingReward && (
        <Dialog open={!!viewingReward} onOpenChange={() => setViewingReward(null)}>
          <DialogContent className="sm:max-w-lg rounded-3xl [&>button]:hidden">
            <DialogHeader>
              <DialogTitle className="text-xl text-center">
                {viewingReward.rewardName}
              </DialogTitle>
              <DialogDescription className="text-center">
                Print this coloring sheet and have fun coloring!
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {viewingReward.rewardUrl && (
                <img 
                  src={viewingReward.rewardUrl} 
                  alt={viewingReward.rewardName}
                  className="w-full rounded-xl border-4 border-gray-200 dark:border-gray-700 shadow-lg"
                />
              )}
            </div>
            <DialogFooter className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                onClick={() => setViewingReward(null)}
                className="rounded-xl"
              >
                Close
              </Button>
              {viewingReward.rewardUrl && (
                <>
                  <Button
                    onClick={() => handlePrint(viewingReward)}
                    className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print (A4)
                  </Button>
                  <Button
                    onClick={() => {
                      openDeliveryOptions(viewingReward);
                      setViewingReward(null);
                    }}
                    className="rounded-xl bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <a 
                    href={viewingReward.rewardUrl} 
                    download={`${viewingReward.rewardName.replace(/\s+/g, '_')}.png`}
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold px-4 py-2"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Mail className="w-6 h-6 text-green-500" />
              Send Coloring Sheet
            </DialogTitle>
            <DialogDescription>
              {deliveryReward?.rewardName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-center">
              <Printer className="w-8 h-8 mx-auto text-blue-500 mb-2" />
              <p className="font-bold text-blue-800 dark:text-blue-200 mb-1">Print at Home</p>
              <p className="text-sm text-blue-600 dark:text-blue-300 mb-3">
                Best printed on A4 paper
              </p>
              <Button
                onClick={() => deliveryReward && handlePrint(deliveryReward)}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Now
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">or</span>
              </div>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
              <Mail className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="font-bold text-green-800 dark:text-green-200 mb-1 text-center">Send to Email</p>
              <p className="text-sm text-green-600 dark:text-green-300 mb-3 text-center">
                We'll email the coloring sheet with a download link
              </p>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="rounded-xl"
                  data-testid="input-reward-email"
                />
                <Button
                  onClick={() => deliveryReward && handleSendEmail(deliveryReward, customEmail)}
                  disabled={!customEmail || sendingEmail}
                  className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl"
                  data-testid="button-send-reward-email"
                >
                  {sendingEmail ? "Sending..." : "Send Email"}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeliveryDialog(false);
                setDeliveryReward(null);
                setCustomEmail("");
              }} 
              className="rounded-xl"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
