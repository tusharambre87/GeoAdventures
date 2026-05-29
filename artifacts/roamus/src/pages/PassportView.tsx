import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, ChevronDown, ChevronUp, User as UserIcon, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { ALL_PASSPORT_CITIES } from "@/lib/dailyQuestData";
import { getStampVisualState, type PassportStampState } from "@/lib/passportUtils";
import { getExplorerRank } from "@shared/schema";
import ExplorerKit from "@/components/ExplorerKit";
import bgImage from "@assets/generated_images/playful_hand-drawn_world_adventure_map_pattern.png";

const CONTINENT_DATA: Record<string, { icon: string; color: string }> = {
  Europe: { icon: "🏰", color: "#2563eb" },
  Asia: { icon: "🏯", color: "#dc2626" },
  Africa: { icon: "🦁", color: "#f59e0b" },
  "North America": { icon: "🗽", color: "#16a34a" },
  "South America": { icon: "🦜", color: "#eab308" },
  Oceania: { icon: "🐨", color: "#8b5cf6" },
};

const STATE_COLORS: Record<PassportStampState, string> = {
  new: '#94a3b8',
  collected: '#16a34a',
  learning: '#2563eb',
  remembered: '#8b5cf6',
  visited: '#d97706',
};

const STATE_LABELS: Record<PassportStampState, string> = {
  new: '',
  collected: 'Discovered',
  learning: 'Learning',
  remembered: 'Remembered',
  visited: '',
};

function MiniStamp({ city, country, isDiscovered, stampState, starsEarned }: { city: string; country: string; isDiscovered: boolean; stampState: PassportStampState; starsEarned: number }) {
  const stateColor = isDiscovered ? STATE_COLORS[stampState] : '#cbd5e1';
  const label = isDiscovered ? STATE_LABELS[stampState] : '';
  const isSpecial = stampState === 'remembered' || stampState === 'visited';
  const isVisited = stampState === 'visited';

  return (
    <div
      className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-[3px] border-double relative transition-all ${
        isDiscovered ? '' : 'opacity-30'
      }`}
      style={{
        borderColor: stateColor,
        color: isDiscovered ? stateColor : '#94a3b8',
        backgroundColor: isDiscovered ? `${stateColor}12` : '#f8fafc',
        mixBlendMode: isDiscovered && !isSpecial ? 'multiply' : undefined,
        ...(isSpecial && { boxShadow: `0 0 12px ${stateColor}40` }),
      }}
    >
      <div className="absolute inset-0 rounded-full border border-current opacity-40 m-0.5" />
      {isSpecial && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0">
          {[...Array(Math.min(starsEarned, 5))].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-current" style={{ color: stateColor }} />
          ))}
        </div>
      )}
      {isVisited ? (
        <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#d97706' }}>Visited</span>
      ) : label ? (
        <span className="text-[8px] font-bold uppercase tracking-widest opacity-80">{label}</span>
      ) : null}
      <span className="text-sm font-black uppercase text-center leading-none max-w-[80px] break-words">
        {isDiscovered ? city : '???'}
      </span>
      {isDiscovered && (
        <span className="text-[7px] uppercase mt-0.5 opacity-60">{country}</span>
      )}
    </div>
  );
}

export default function PassportView() {
  const [activeTab, setActiveTab] = useState<'passport' | 'kit'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'kit' ? 'kit' : 'passport';
  });
  const [expandedContinent, setExpandedContinent] = useState<string | null>(null);
  const { collectedCardIds, stats, passportMastery } = useUser();
  const { activeExplorer } = useExplorer();

  const explorerName = activeExplorer?.name || 'Explorer';
  const backendCollectedIds = (activeExplorer?.collectedCardIds as string[]) || [];
  const explorerCollectedIds = [...new Set([...backendCollectedIds, ...collectedCardIds])];

  const passportNumber = useMemo(() => {
    const hash = explorerName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return `GQ${String(hash * 1234 + 779546).slice(0, 6)}`;
  }, [explorerName]);

  const continentGroups = useMemo(() => {
    const groups: Record<string, typeof ALL_PASSPORT_CITIES> = {};
    ALL_PASSPORT_CITIES.forEach(city => {
      const continent = city.continent || 'Other';
      if (!groups[continent]) groups[continent] = [];
      groups[continent].push(city);
    });
    return groups;
  }, []);

  const cityMastery = (stats?.cityMastery as Record<string, number>) || {};

  const explorerXp = activeExplorer?.totalXp || 0;
  const explorerRankName = getExplorerRank(explorerXp).name;

  const citiesDiscovered = explorerCollectedIds.length;
  const citiesMastered = useMemo(() => {
    return passportMastery.filter(m => {
      let stars = 0;
      if (m.star1) stars++;
      if (m.star2) stars++;
      if (m.star3) stars++;
      if (m.star4) stars++;
      if (m.star5) stars++;
      return stars >= 3;
    }).length;
  }, [passportMastery]);
  const citiesVisited = useMemo(() => {
    return passportMastery.filter(m => (m as any).visitedInGeoAdventures).length;
  }, [passportMastery]);
  const totalCities = ALL_PASSPORT_CITIES.length;
  const passportCompletionPct = totalCities > 0 ? Math.round((citiesDiscovered / totalCities) * 100) : 0;

  return (
    <div className="min-h-screen w-full relative overflow-hidden font-sans pb-28"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: '400px',
        backgroundRepeat: 'repeat',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-slate-200/90 via-slate-100/95 to-slate-200/90" />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <button className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-bold bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" /> Back to Menu
            </button>
          </Link>
          <Link href="/explorer-map">
            <button className="flex items-center gap-2 text-sm text-slate-600 font-medium bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm" data-testid="button-explorer-map">
              🌍 Explorer Map
            </button>
          </Link>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('passport')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'passport'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
            }`}
            data-testid="tab-passport"
          >
            📘 Passport
          </button>
          <button
            onClick={() => setActiveTab('kit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'kit'
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
            }`}
            data-testid="tab-explorer-kit"
          >
            🎒 Explorer Kit
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'passport' ? (
            <motion.div
              key="passport"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-gradient-to-b from-[#1a237e] to-[#283593] rounded-t-2xl px-6 py-5 text-center" data-testid="passport-header">
                <div className="w-14 h-14 mx-auto mb-2 border-2 border-amber-400/60 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 40 40" className="w-10 h-10">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#d4a843" strokeWidth="1.5" />
                    <circle cx="20" cy="20" r="11" fill="none" stroke="#d4a843" strokeWidth="1" />
                    <line x1="20" y1="4" x2="20" y2="36" stroke="#d4a843" strokeWidth="1" />
                    <line x1="4" y1="20" x2="36" y2="20" stroke="#d4a843" strokeWidth="1" />
                    <ellipse cx="20" cy="20" rx="7" ry="16" fill="none" stroke="#d4a843" strokeWidth="1" />
                  </svg>
                </div>
                <h2 className="text-xl font-black text-white tracking-[0.2em] uppercase">GeoQuest</h2>
                <p className="text-amber-300/80 text-xs tracking-[0.15em] uppercase mt-1">Explorer Passport</p>
              </div>

              <div className="bg-gradient-to-b from-[#f5f0e0] to-[#ece5d0] px-5 py-6 shadow-inner" data-testid="passport-document">
                <p className="text-center text-xs font-bold text-slate-500 tracking-[0.2em] uppercase mb-1">Republic of GeoQuest</p>
                <p className="text-center text-[10px] text-slate-400 tracking-[0.15em] uppercase mb-5">Travel Document</p>

                <div className="flex gap-4 mb-5">
                  <div className="w-24 h-28 bg-slate-200/80 border border-slate-300 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <UserIcon className="w-10 h-10 text-slate-400" />
                    <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">Photo</span>
                  </div>
                  <div className="flex-1 space-y-2 text-left">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Surname</p>
                      <p className="text-sm font-black text-slate-800 uppercase">Explorer</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Given Names</p>
                      <p className="text-sm font-black text-slate-800 uppercase">{explorerName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">🌍 Explorer Rank</p>
                      <p className="text-sm font-black text-amber-700 uppercase" data-testid="text-explorer-rank">{explorerRankName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Nationality</p>
                      <p className="text-sm font-black text-slate-800 uppercase">GeoQuest Citizen</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-300/60 pt-3 mb-4">
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Date of Issue</p>
                      <p className="text-xs font-bold text-slate-700 font-mono">01 JAN 2025</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Date of Expiry</p>
                      <p className="text-xs font-bold text-slate-700 font-mono">NEVER</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Passport No.</p>
                      <p className="text-xs font-bold text-slate-700 font-mono">{passportNumber}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Authority</p>
                      <p className="text-xs font-bold text-slate-700 font-mono">GEOQUEST HQ</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-300/60 pt-3 mb-4" data-testid="passport-exploration-stats">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">Your Exploration</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600 font-medium">Cities Discovered</span>
                      <span className="text-xs font-black text-green-600 font-mono" data-testid="stat-discovered">{citiesDiscovered}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600 font-medium">Cities Remembered</span>
                      <span className="text-xs font-black text-purple-600 font-mono" data-testid="stat-remembered">{citiesMastered}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600 font-medium">Cities Visited</span>
                      <span className="text-xs font-black text-amber-600 font-mono" data-testid="stat-visited">{citiesVisited}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Passport Completion</span>
                      <span className="text-[10px] font-bold text-slate-500">{passportCompletionPct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${passportCompletionPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50/60 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <span className="text-lg">🧭</span>
                  <p className="text-sm text-indigo-700 italic leading-snug">
                    You're becoming someone who explores the world with curiosity.
                  </p>
                </div>

                <div className="border-t border-slate-300/60 pt-3 mb-4">
                  <p className="text-[8px] text-slate-400 font-mono tracking-wider">
                    P&lt;GQTEXPLORER&lt;{explorerName.toUpperCase().slice(0, 7)}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                  </p>
                  <p className="text-[8px] text-slate-400 font-mono tracking-wider">
                    {passportNumber}0&lt;2025&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                  </p>
                </div>

                <Link href="/">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-bold text-slate-700 border-slate-300"
                    data-testid="button-close-passport"
                  >
                    Close Passport
                  </Button>
                </Link>
              </div>

              <div className="bg-gradient-to-b from-[#f5f0e0] to-[#ece5d0] rounded-b-2xl px-5 py-6 mt-2 border-t-2 border-dashed border-[#c9bfa0]">
                <p className="text-center text-xs font-bold text-[#a09070] tracking-[0.2em] uppercase mb-6 italic">
                  Visas & Entry Stamps
                </p>

                {Object.entries(continentGroups).map(([continent, cities]) => {
                  const discoveredCount = cities.filter(c => explorerCollectedIds.includes(c.id)).length;
                  const totalCount = cities.length;
                  const progressPct = totalCount > 0 ? (discoveredCount / totalCount) * 100 : 0;
                  const isExpanded = expandedContinent === continent;
                  const continentInfo = CONTINENT_DATA[continent] || { icon: "🌍", color: "#6b7280" };

                  return (
                    <div key={continent} className="mb-4">
                      <button
                        onClick={() => setExpandedContinent(isExpanded ? null : continent)}
                        className="w-full flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all"
                        data-testid={`continent-${continent.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        <span className="text-2xl">{continentInfo.icon}</span>
                        <span className="font-bold text-slate-800 text-sm uppercase tracking-wider flex-1 text-left">
                          {continent}
                        </span>
                        <span className="text-xs font-bold text-slate-500 mr-2">{discoveredCount}/{totalCount}</span>
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden mr-2">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${progressPct}%`, backgroundColor: continentInfo.color }}
                          />
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-3 gap-3 pt-4 pb-2 px-2">
                              {cities.map((city) => {
                                const isDiscovered = explorerCollectedIds.includes(city.id);
                                const mastery = passportMastery.find(m => m.cityId === city.id);
                                const visualState = getStampVisualState(city.id, isDiscovered, mastery as any);
                                return (
                                  <div key={city.id} className="flex justify-center" data-testid={`passport-stamp-${city.id}`}>
                                    {isDiscovered ? (
                                      <Link href={`/city/${city.id}`}>
                                        <MiniStamp
                                          city={city.city}
                                          country={city.country}
                                          isDiscovered={isDiscovered}
                                          stampState={visualState.state}
                                          starsEarned={visualState.starsEarned}
                                        />
                                      </Link>
                                    ) : (
                                      <MiniStamp
                                        city={city.city}
                                        country={city.country}
                                        isDiscovered={isDiscovered}
                                        stampState={visualState.state}
                                        starsEarned={visualState.starsEarned}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="kit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ExplorerKit />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
