import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Headphones,
  Compass,
  Map,
  Globe,
  Smile,
  HelpCircle,
  BookOpen,
  Lock,
  Plane,
  Home,
  X
} from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { useQuery } from "@tanstack/react-query";
import { ALL_PASSPORT_CITIES } from "@/lib/dailyQuestData";
import { LOCATION_CARDS } from "@/lib/gameData";
import { getCityImage } from "@/lib/cityImages";
import LearningSummary, { getGameLearningPoints } from "@/components/LearningSummary";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { GeoPassModal } from "@/components/GeoPassModal";
import { TripUnlockSheet } from "@/components/planner/TripUnlockSheet";

const ALL_CITIES = [...LOCATION_CARDS, ...ALL_PASSPORT_CITIES.filter(c => !LOCATION_CARDS.find(l => l.id === c.id))];

const GAME_LIST = [
  { num: 2, id: "map_me", name: "Map Me", emoji: "🗺️", route: "map-me" },
  { num: 3, id: "flag_quiz", name: "Flag Quiz", emoji: "🚩", route: "mini-games", game: "flag_quiz" },
  { num: 4, id: "city_vibe", name: "City Vibe", emoji: "✨", route: "mini-games", game: "city_vibe" },
  { num: 5, id: "spin_globe", name: "Spin the Globe", emoji: "🌍", route: "spin-the-world" },
];

function getStarCount(mastery: any): number {
  if (!mastery) return 0;
  let count = 0;
  if (mastery.star1) count++;
  if (mastery.star2) count++;
  if (mastery.star3) count++;
  if (mastery.star4) count++;
  if (mastery.star5) count++;
  return count;
}

const PREMIUM_GAMES = ['flag_quiz', 'map_me', 'spin_globe'];

export default function CityHub() {
  const [, params] = useRoute("/city/:cityId");
  const [, navigate] = useLocation();
  const { collectedCardIds, passportMastery, getPassportMastery } = useUser();
  const { activeExplorer } = useExplorer();
  const { isPaidUser } = useFreeLimits();
  const { paywallEnabled } = useFeatureFlags();
  const [showUpgradeGate, setShowUpgradeGate] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showQuestDetails, setShowQuestDetails] = useState(false);
  const [showAdventureChoice, setShowAdventureChoice] = useState(false);
  const [showTripUnlockSheet, setShowTripUnlockSheet] = useState(false);

  const cityId = params?.cityId || "";
  const searchParams = new URLSearchParams(window.location.search);
  const fromQuest = searchParams.get("from") === "quest";
  const isParisOnboarding = cityId === "dq_paris" && fromQuest;
  const questLost = searchParams.get("lost") === "true";

  const questData = useMemo(() => {
    if (!fromQuest) return null;
    if (isParisOnboarding) {
      return {
        playerName: activeExplorer?.name || "Explorer",
        cityName: "Paris",
        cityNameCorrected: "Paris",
        isWin: !questLost,
        timer: 0,
        clues: ["This city has the Eiffel Tower.", "It's the capital of France.", "People call it the City of Light."],
        didYouKnow: "The Eiffel Tower was meant to be temporary — it was built for the 1889 World's Fair and almost torn down!"
      };
    }
    try {
      const raw = localStorage.getItem('geoquest_last_quest_data');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.timestamp > 3600000) return null;
      return data;
    } catch { return null; }
  }, [fromQuest]);

  const city = useMemo(() => ALL_CITIES.find(c => c.id === cityId), [cityId]);
  const isDiscovered = collectedCardIds.includes(cityId);
  const mastery = getPassportMastery(cityId);
  const starCount = getStarCount(mastery);
  const isRemembered = starCount >= 3;
  const adventureLocked = paywallEnabled && !isPaidUser && !isRemembered;
  const heroImage = city ? getCityImage(city.city, city.continent) : "";

  const journeyStages = useMemo(() => {
    if (!isDiscovered && !fromQuest) return [];
    return [
      { label: "Discovered", done: questLost ? false : (isDiscovered || fromQuest), color: "#16a34a" },
      { label: "Learning", done: questLost ? false : starCount >= 2, color: "#2563eb" },
      { label: "Remembered", done: questLost ? false : starCount >= 3, color: "#8b5cf6" },
      { label: "Visited", done: questLost ? false : !!(mastery as any)?.visitedInGeoAdventures, color: "#d97706" },
    ];
  }, [isDiscovered, fromQuest, questLost, starCount, mastery]);
  const journeyCompletedCount = journeyStages.filter(s => s.done).length;
  const isCityMastered = journeyStages.length === 4 && journeyCompletedCount === 4;

  const { data: storiesData } = useQuery<{ stories: Array<{ id: string; cityId: string; title: string }>, completedStoryIds: string[] }>({
    queryKey: ["/api/stories"],
    queryFn: async () => {
      const res = await fetch("/api/stories");
      if (!res.ok) return { stories: [], completedStoryIds: [] };
      return res.json();
    },
    staleTime: 60000,
  });

  const storyInfo = useMemo(() => {
    if (!storiesData?.stories || !city) return null;
    const story = storiesData.stories.find(s => s.cityId === city.id);
    if (!story) return null;
    return { ...story, completed: storiesData.completedStoryIds?.includes(story.id) || false };
  }, [storiesData, city]);

  const nextGame = useMemo(() => {
    for (const g of GAME_LIST) {
      const earned = mastery ? (mastery as any)[`star${g.num}`] : false;
      if (!earned) return g;
    }
    return null;
  }, [mastery]);

  const handleGameClick = (game: typeof GAME_LIST[0]) => {
    if (!isPaidUser && PREMIUM_GAMES.includes(game.id)) {
      setShowUpgradeGate(true);
      return;
    }
    const practiceParam = questLost ? "&practice=true" : "";
    const returnParam = "&returnTo=city-hub&cityId=" + cityId + (questLost ? "&lost=true" : "");
    if (game.route === "map-me") {
      window.location.href = `/map-me?masteryCity=${cityId}${practiceParam}${returnParam}`;
    } else if (game.route === "spin-the-world") {
      const continentMap: Record<string, string> = {
        "Europe": "europe", "Asia": "asia", "Africa": "africa",
        "North America": "north_america", "South America": "south_america", "Oceania": "oceania"
      };
      const continentId = continentMap[city?.continent || ''] || '';
      window.location.href = `/spin-the-world?masteryCity=${cityId}&continent=${continentId}${practiceParam}${returnParam}`;
    } else {
      window.location.href = `/mini-games?masteryCity=${cityId}&game=${game.game}${practiceParam}${returnParam}`;
    }
  };

  if (!city) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500" data-testid="text-city-not-found">City not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24" data-testid="city-hub-page">
      <div className="relative h-56 overflow-hidden" data-testid="city-hero">
        <img
          src={heroImage}
          alt={city.city}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3 z-10">
          <button
            onClick={() => navigate("/passport")}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/explorer-map")}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
            data-testid="button-map"
          >
            <Map className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            <img src={city.flagUrl} alt={city.country} className="w-8 h-6 rounded shadow-sm object-cover" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wide" data-testid="text-city-name">
            {city.city}
          </h1>
          <p className="text-sm text-white/80" data-testid="text-city-region">
            {city.country} • {city.continent}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-3 relative z-10">

        {journeyStages.length > 0 && (() => {
          const currentIdx = journeyStages.findIndex(s => !s.done);
          return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-700" data-testid="city-journey-bar">
              {isCityMastered ? (
                <p className="text-xs font-bold uppercase tracking-wider mb-3 text-amber-600 dark:text-amber-400" data-testid="text-city-mastered">🎉 {city.city} Mastered</p>
              ) : (
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">🌍 City Journey</p>
              )}
              <div className="flex items-start justify-between gap-1">
                {journeyStages.map((stage, idx) => {
                  const isNext = questLost ? false : idx === currentIdx;
                  return (
                    <div key={stage.label} className="flex flex-col items-center flex-1" data-testid={`journey-stage-${stage.label.toLowerCase()}`}>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                          stage.done
                            ? "text-white"
                            : isNext
                            ? "bg-white dark:bg-gray-700 animate-pulse"
                            : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                        }`}
                        style={stage.done ? { backgroundColor: stage.color, borderColor: stage.color } : isNext ? { borderColor: stage.color, color: stage.color } : {}}
                      >
                        {stage.done ? "✓" : isNext ? "☆" : ""}
                      </div>
                      <span className={`text-[10px] font-bold mt-1 text-center leading-tight ${
                        stage.done ? "opacity-90" : isNext ? "opacity-70" : "opacity-40"
                      }`} style={stage.done || isNext ? { color: stage.color } : {}}>
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-0.5 mt-3">
                {journeyStages.map((stage, idx) => (
                  <div key={idx} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {stage.done && (
                      <div className="h-full rounded-full" style={{ backgroundColor: stage.color }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="mb-4" data-testid="play-city-section">
          <p className="text-lg font-black text-gray-800 dark:text-white mb-3">
            {questLost ? `🎮 Practice ${city.city}` : `🎮 Play ${city.city}`}
          </p>
          {questLost && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5 border border-amber-200 dark:border-amber-700">
              Practice mode — discover this city in a future quest to earn stars!
            </p>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
            {GAME_LIST.map((game, idx) => {
              const earned = questLost ? false : (mastery ? (mastery as any)[`star${game.num}`] : false);
              const isLocked = !isPaidUser && PREMIUM_GAMES.includes(game.id);
              const isNext = questLost ? false : nextGame?.id === game.id;

              return (
                <button
                  key={game.id}
                  onClick={() => handleGameClick(game)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors ${
                    idx > 0 ? "border-t border-gray-100 dark:border-gray-700" : ""
                  } ${isNext && !isLocked ? "bg-amber-50/80 dark:bg-amber-900/20" : ""} ${isLocked ? "opacity-60" : ""} hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer`}
                  data-testid={`game-row-${game.id}`}
                >
                  <span className="text-xl flex-shrink-0">{game.emoji}</span>
                  <span className={`flex-1 text-left ${
                    isNext && !isLocked ? "font-bold text-gray-900 dark:text-white text-[15px]" : "font-semibold text-gray-800 dark:text-white"
                  }`}>
                    {game.name}
                  </span>
                  {isLocked ? (
                    <span className="text-xs font-bold text-purple-600 bg-purple-100 dark:bg-purple-800/40 px-2 py-0.5 rounded-full flex items-center gap-1" data-testid={`lock-badge-${game.id}`}>
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  ) : isNext ? (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-800/40 px-2 py-0.5 rounded-full" data-testid="badge-next">
                      NEXT
                    </span>
                  ) : earned ? (
                    <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-800/40 px-2 py-0.5 rounded-full" data-testid={`earned-badge-${game.id}`}>
                      ✓
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              );
            })}
          </div>

          {questLost ? (
            <button
              onClick={() => handleGameClick(GAME_LIST[0])}
              className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base shadow-lg transition-all"
              data-testid="button-start-challenge"
            >
              🗺️ Start Map Me Practice
            </button>
          ) : nextGame ? (
            <button
              onClick={() => handleGameClick(nextGame)}
              className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold text-base shadow-lg transition-all"
              data-testid="button-start-challenge"
            >
              🗺️ Start {nextGame.name} Challenge
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4" data-testid="exploration-cards">
          <div
            onClick={() => storyInfo ? navigate(`/stories/${storyInfo.id}`) : undefined}
            className={`bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 shadow-md ${storyInfo ? "cursor-pointer hover:shadow-lg" : ""} transition-all`}
            data-testid="card-geobuddy-story"
          >
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mb-2">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-sm font-bold text-white mb-0.5">GeoBuddy Story</h4>
            <p className="text-xs text-white/70 mb-2 leading-snug">
              {storyInfo ? `"${storyInfo.title}"` : "Audio adventure for this city"}
            </p>
            {storyInfo ? (
              <span className="text-xs font-bold text-white bg-white/20 px-3 py-1 rounded-full">
                {storyInfo.completed ? "Replay" : "Listen"}
              </span>
            ) : (
              <span className="text-xs font-semibold text-white/50 bg-white/10 px-3 py-1 rounded-full">
                Coming Soon
              </span>
            )}
          </div>

          <div
            onClick={() => {
              if (adventureLocked) {
                setShowTripUnlockSheet(true);
                return;
              }
              if (isPaidUser) {
                setShowAdventureChoice(true);
              } else {
                navigate(`/geoadventures?autoCreateCity=${encodeURIComponent(city.city)}`);
              }
            }}
            className={`rounded-2xl p-4 shadow-md transition-all ${
              adventureLocked
                ? 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 opacity-70 cursor-pointer hover:shadow-lg'
                : 'bg-gradient-to-br from-orange-400 to-amber-500 cursor-pointer hover:shadow-lg'
            }`}
            data-testid="card-geoadventures"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${adventureLocked ? 'bg-white/10' : 'bg-white/20'}`}>
              {adventureLocked ? <Lock className="w-5 h-5 text-white/70" /> : <Compass className="w-5 h-5 text-white" />}
            </div>
            <h4 className="text-sm font-bold text-white mb-0.5">GeoAdventures</h4>
            <p className="text-xs text-white/70 mb-2 leading-snug">
              {adventureLocked ? 'Master the city first to unlock the adventure.' : 'Explore more places around the city!'}
            </p>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              adventureLocked
                ? 'text-white/60 bg-white/10'
                : 'text-white bg-white/20'
            }`}>
              {adventureLocked ? '🔒 Unlock Adventure' : 'Start Exploring'}
            </span>
          </div>
        </div>

        {journeyStages.length > 0 && !questLost && !isCityMastered && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4 italic" data-testid="text-mastery-prompt">
            Complete all 4 steps to master <span className="font-semibold text-gray-700 dark:text-gray-200">{city.city}</span>.
          </p>
        )}

        {city.didYouKnow && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-4 border border-amber-200/40 dark:border-amber-700/30" data-testid="did-you-know-card">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
              💡 Did You Know?
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              {city.didYouKnow}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4" data-testid="city-info-row">
          <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-2.5 text-center border border-gray-100 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Population</p>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{city.population}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-2.5 text-center border border-gray-100 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Currency</p>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{city.currency}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-2.5 text-center border border-gray-100 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Language</p>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{city.language}</p>
          </div>
        </div>

        <button
          onClick={() => {
            window.location.href = `/geo-atlas?continent=${encodeURIComponent(city?.continent || '')}&returnTo=city-hub&cityId=${cityId}`;
          }}
          className="w-full flex items-center gap-3 bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900/40 dark:to-blue-900/40 rounded-2xl p-4 hover:from-sky-200 hover:to-blue-200 dark:hover:from-sky-900/60 dark:hover:to-blue-900/60 transition-all mb-4 text-left"
          data-testid="card-geoatlas"
        >
          <div className="w-10 h-10 rounded-xl bg-white/70 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-800 dark:text-blue-200">GeoAtlas</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-300/70">Learn more about {city?.continent || 'the world'}</p>
          </div>
        </button>

        <button
          onClick={() => setShowMoreInfo(!showMoreInfo)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-2"
          data-testid="button-toggle-more-info"
        >
          {showMoreInfo ? "Hide Details" : "More About " + city.city}
          {showMoreInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showMoreInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pb-4">
                {city.greetingAudio && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700" data-testid="greeting-card">
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                      Say hello in {city.language}!
                    </p>
                    <p className="text-lg font-black text-gray-800 dark:text-white">
                      "{city.greetingAudio}"
                    </p>
                  </div>
                )}

                {city.landmarkIcon && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700" data-testid="landmark-card">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Landmark</p>
                    <p className="text-2xl">{city.landmarkIcon}</p>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {fromQuest && questData && (
          <>
            <button
              onClick={() => setShowQuestDetails(!showQuestDetails)}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors mt-2"
              data-testid="button-toggle-quest-details"
            >
              Your Quest Details
              {showQuestDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showQuestDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-4 border-yellow-300 dark:border-yellow-600 mb-4" data-testid="quest-details-panel">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shrink-0 ${questData.isWin ? "bg-yellow-100 border-yellow-400" : "bg-gray-100 border-gray-400"}`}>
                        {questData.isWin ? <Smile className="w-9 h-9 text-yellow-600" /> : <HelpCircle className="w-9 h-9 text-gray-500" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-none mb-1">{questData.playerName}</h3>
                        {questData.isWin ? (
                          <p className="text-sm text-gray-500 font-bold uppercase">Solved in {questData.timer}s!</p>
                        ) : (
                          <p className="text-sm text-gray-500 font-bold uppercase">Nice try!</p>
                        )}
                      </div>
                    </div>

                    {questData.newStreakBadges?.length > 0 && (
                      <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-3 rounded-xl mb-4 border-2 border-yellow-300">
                        <div className="flex items-center gap-3">
                          <div className="text-4xl">{questData.newStreakBadges[0].badge.icon}</div>
                          <div>
                            <p className="text-xs font-bold text-orange-600 uppercase">New Badge Unlocked!</p>
                            <p className="font-bold text-gray-800">{questData.newStreakBadges[0].badge.name}</p>
                            <p className="text-xs text-gray-600">{questData.newStreakBadges[0].badge.description}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <LearningSummary points={getGameLearningPoints("daily-quest")} />
                    </div>

                    {questData.clues && (
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-3 rounded-xl mb-4 border border-amber-200 dark:border-amber-700">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase mb-2 flex items-center gap-1">
                          <span>🔍</span> Why {questData.cityName}?
                        </p>
                        <div className="space-y-2">
                          {questData.clues.map((clue: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 bg-white/70 dark:bg-gray-700/50 rounded-lg p-2">
                              <span className="text-amber-500 mt-0.5 shrink-0">{i === 0 ? "💡" : i === 1 ? "🧩" : "🎯"}</span>
                              <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug italic">"{clue}"</p>
                            </div>
                          ))}
                        </div>
                        {questData.didYouKnow && (
                          <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                            <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                              <span className="shrink-0">🌟</span>
                              <span><strong>Did you know?</strong> {questData.didYouKnow}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {!questData.isWin && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl mb-4 text-center border border-blue-100 dark:border-blue-800">
                        <p className="text-blue-800 dark:text-blue-200 font-bold mb-1">Great exploring!</p>
                        <p className="text-sm text-blue-600 dark:text-blue-300 leading-tight mb-2">
                          Every quest makes you a better explorer. What will you explore next?
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mt-2">See you tomorrow for a new adventure!</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </>
        )}
      </div>

      <GeoPassModal
        isOpen={showUpgradeGate}
        onClose={() => setShowUpgradeGate(false)}
      />

      {city && (
        <TripUnlockSheet
          open={showTripUnlockSheet}
          onClose={() => setShowTripUnlockSheet(false)}
          onOpenFullDetails={() => setShowTripUnlockSheet(false)}
          onPaymentSuccess={() => {
            setShowTripUnlockSheet(false);
            navigate(`/geoadventures?autoCreateCity=${encodeURIComponent(city.city)}`);
          }}
          destination={`${city.city}, ${city.country}`}
          country={city.country}
          returnUrl={window.location.pathname + window.location.search}
        />
      )}

      <AnimatePresence>
        {showAdventureChoice && city && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setShowAdventureChoice(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-white dark:bg-slate-800 rounded-t-3xl w-full max-w-lg p-5 pb-32 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              data-testid="adventure-choice-sheet"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Start {city.city} Adventure</h3>
                <button
                  onClick={() => setShowAdventureChoice(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
                  data-testid="button-close-adventure-choice"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowAdventureChoice(false);
                    navigate(`/geoadventures?autoCreateCity=${encodeURIComponent(city.city)}&mode=travel`);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-orange-50 dark:bg-slate-700 hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors text-left"
                  data-testid="button-choice-travel"
                >
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
                    <Plane className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">Build an Adventure</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Plan a real-world trip to {city.city}</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowAdventureChoice(false);
                    navigate(`/geoadventures?autoCreateCity=${encodeURIComponent(city.city)}`);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-teal-50 dark:bg-slate-700 hover:bg-teal-100 dark:hover:bg-slate-600 transition-colors text-left"
                  data-testid="button-choice-virtual"
                >
                  <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center shrink-0">
                    <Home className="w-6 h-6 text-teal-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">Virtual Adventure</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Explore {city.city} from home</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
