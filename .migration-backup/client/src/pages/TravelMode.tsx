import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { setInternalNavToAdventureTrip } from "@/components/GatedTravelMode";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Menu, Plane, MapPin, Plus, Calendar, Users, ChevronRight, ChevronUp, ChevronDown, Compass, Camera, Star, Loader2, Trash2, Volume2, Map, Globe, UserPlus, CheckCircle, CheckCircle2, BookOpen, Sparkles, Heart, ArrowUpDown, LogOut, Image, X, ArrowLeft, Share2, Video, Lock, Award, Trophy, Mic, MicOff, Home, HelpCircle, Search, Archive, Play, Settings, Check, Backpack, Eye, Gamepad2 } from "lucide-react";
import { GeoAdventuresNowTab } from "@/pages/adventure/GeoAdventuresNowTab";
import { GeoAdventuresKidsTab } from "@/pages/adventure/GeoAdventuresKidsTab";
import { GeoAdventuresMeTab } from "@/pages/adventure/GeoAdventuresMeTab";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LOCATION_CARDS } from "@/lib/gameData";
import { GlobeLoader } from "@/components/GlobeLoader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { GeoBuddyCharacter } from "@/components/GeoBuddyCharacter";
import { getStockImageForDestination, TripPreviewModal } from "@/components/TravelTripCard";
import { isHomeAdventure as checkIsHomeAdventure } from "@/lib/adventureModeUtils";
import { TravelGeoBuddyNudge, getTravelNudgeMessage } from "@/components/TravelGeoBuddyNudge";
import { useTravel } from "@/lib/travelContext";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { useTripExecutionState } from "@/hooks/useTripExecutionState";
import { TripEntryRouter } from "@/components/TripEntryRouter";
import { type TravelStop, type JourneyPack, type TripStory, type TravelMoment, type TravelTrip } from "@shared/schema";

type ExtendedTrip = TravelTrip & { isDemo?: boolean };


function isTravelTrip(trip: ExtendedTrip): boolean {
  return !trip.isDemo && trip.adventureContext === 'travel';
}
function isNonDemoTrip(trip: ExtendedTrip): boolean {
  return !trip.isDemo;
}
function tripHasStarted(trip: ExtendedTrip): boolean {
  if (!trip.startDate) return false;
  const start = new Date(trip.startDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= start;
}
function parentPlanUrl(trip: ExtendedTrip): string {
  if (trip.completedAt || trip.status === 'completed') return `/adventure/${trip.id}/memory`;
  if (!tripHasStarted(trip)) return `/adventure/${trip.id}/parent-plan`;
  if (trip.adventureStartedAt) return `/adventure/${trip.id}/today`;
  return `/adventure/${trip.id}/start-day`;
}
import { format } from "date-fns";
import { JourneyPackPlayer } from "@/components/JourneyPackPlayer";
import { MomentCapture } from "@/components/MomentCapture";
import { TravelOfflineDownload } from "@/components/TravelOfflineDownload";
import { ShareItineraryModal, type ShareData } from "@/components/ShareItineraryModal";
import { MissionCard, MissionProgressBar, RouteOverviewBar, MissionCompletionSummary } from "@/components/MissionCard";
import { PrivacySettingsMenu } from "@/components/PrivacySettingsMenu";
import { LoadingWithFacts } from "@/components/LoadingWithFacts";
import { FamilyTravelMap } from "@/components/FamilyTravelMap";
import { TripRecapModal } from "@/components/TripRecapModal";
import { AdventureRecap } from "@/components/AdventureRecap";
import { ReflectionGamesModal } from "@/components/ReflectionGamesModal";
import { FinishAdventureModal } from "@/components/FinishAdventureModal";
import { TripVideoGenerator } from "@/components/TripVideoGenerator";
import { TripCollageGenerator } from "@/components/TripCollageGenerator";
import { SignUpPrompt } from "@/components/SignUpPrompt";
import { LaunchPromoDialog, shouldShowLaunchPromo, markLaunchPromoSeen } from "@/components/LaunchPromoDialog";
import { CONTINENTS, COUNTRIES_BY_CONTINENT, MONTHS, YEARS, getSuggestedStops, KNOWN_STOP_SUGGESTIONS, type TripTraveler, type ContinentId } from "@/lib/travelDestinations";
import { getTravelAvatarForTrip, getStopTypeEmoji, getDestinationIcon } from "@/lib/travelAvatars";
import { useDestinationWeather } from "@/hooks/useDestinationWeather";
import { StopSelectionDialog } from "@/components/StopSelectionDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TravelModeReminders, incrementStopsVisited } from "@/components/TravelModeReminders";
import { GeoAdventuresAnchoring, hasSeenAnchoring, markAnchoringAsSeen } from "@/components/GeoAdventuresAnchoring";
import { ExitAdventurePrompt, shouldShowExitPrompt } from "@/components/GeoGamesFromAdventures";
import { TripDetailsTooltips } from "@/components/TripDetailsTooltips";
import { TripCountdown, TravelKeepsakes, DidYouKnow, TripPackingList, getKeepsakeForStop } from "@/components/TripEnhancements";
import { TrailTalesGame } from "@/components/TrailTalesGame";
import { TrophyCabinet } from "@/components/TrophyCabinet";
import { getAdventureMode } from "@/lib/adventureModeUtils";
import { DemoTripHero, PreTripInterstitial } from "@/components/DemoTripHero";
import { DemoTripExperience } from "@/components/DemoTripExperience";
import { SwitchAdventureSheet } from "@/components/SwitchAdventureSheet";
import { ExperienceCity } from "@/components/ExperienceCity";
import { PlayTogether } from "@/components/PlayTogether";
import { useSubscription } from "@/hooks/useSubscription";
import { ComingSoonModal, AdventureLimitGate } from "@/components/UpgradePrompt";
import { TripUnlockSheet } from "@/components/planner/TripUnlockSheet";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { useParentalGate } from "@/components/ParentalGate";

const AVATAR_EMOJIS: Record<string, string> = {
  panda: '🐼',
  lion: '🦁',
  elephant: '🐘',
  penguin: '🐧',
  koala: '🐨',
  fox: '🦊',
  owl: '🦉',
  turtle: '🐢',
  butterfly: '🦋',
  dolphin: '🐬',
  rocket: '🚀',
  globe: '🌍',
};

function getAvatarEmoji(key?: string | null): string {
  return key ? AVATAR_EMOJIS[key] || '🐼' : '🐼';
}

function isJourneyPackComplete(stopId: string): boolean {
  try {
    const saved = localStorage.getItem(`journeypack-progress-${stopId}`);
    if (!saved) return false;
    const completedSections = JSON.parse(saved);
    return Array.isArray(completedSections) && completedSections.length >= 4;
  } catch {
    return false;
  }
}

const GAMES_COOLDOWN_STOPS = 2;

function getGamesCooldownKey(tripId: string, explorerId: string): string {
  return `games-cooldown-${tripId}-${explorerId}`;
}

function recordGamesPlayed(tripId: string, explorerId: string, visitedCount: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getGamesCooldownKey(tripId, explorerId), JSON.stringify({
      lastPlayedAt: Date.now(),
      stopsAtLastPlay: visitedCount
    }));
  } catch {}
}

function canPlayGames(tripId: string, explorerId: string, currentVisitedCount: number): { canPlay: boolean; stopsNeeded: number } {
  if (typeof window === 'undefined') return { canPlay: true, stopsNeeded: 0 };
  try {
    const saved = localStorage.getItem(getGamesCooldownKey(tripId, explorerId));
    if (!saved) return { canPlay: true, stopsNeeded: 0 };
    
    const data = JSON.parse(saved);
    const stopsAtLastPlay = data.stopsAtLastPlay || 0;
    
    // If current count dropped below stored count (stops removed/unvisited), unlock games
    if (currentVisitedCount < stopsAtLastPlay) {
      return { canPlay: true, stopsNeeded: 0 };
    }
    
    const stopsSincePlayed = currentVisitedCount - stopsAtLastPlay;
    const stopsNeeded = Math.max(0, GAMES_COOLDOWN_STOPS - stopsSincePlayed);
    
    return { canPlay: stopsSincePlayed >= GAMES_COOLDOWN_STOPS, stopsNeeded };
  } catch {
    return { canPlay: true, stopsNeeded: 0 };
  }
}

function clearGamesCooldown(tripId: string, explorerId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getGamesCooldownKey(tripId, explorerId));
  } catch {}
}

function getMomentPhotoUrl(moment: TravelMoment): string | null {
  if (moment.photoUrl) return moment.photoUrl;
  const urls = moment.photoUrls;
  if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string') {
    return urls[0];
  }
  if (typeof urls === 'string') {
    try {
      const parsed = JSON.parse(urls);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {}
  }
  return null;
}

// Home Adventure Place Categories
const HOME_ADVENTURE_CATEGORIES = [
  { id: 'wonders', name: 'Landmarks & Wonders', emoji: '🏛' },
  { id: 'nature', name: 'Nature & Wildlife', emoji: '🌿' },
  { id: 'cities', name: 'Great Cities', emoji: '🏙' },
  { id: 'islands', name: 'Islands & Oceans', emoji: '🏝' },
  { id: 'mountains', name: 'Mountains & Peaks', emoji: '⛰' },
];

const CITY_CURIOSITY_HOOKS: Record<string, string> = {
  loc_paris: "Home of a tower that grows taller in summer",
  loc_rome: "A 2,000-year-old arena where gladiators fought",
  loc_london: "A clock tower that has rung since 1859",
  loc_athens: "Temples older than the Roman Empire",
  loc_berlin: "A city once divided by a famous wall",
  loc_madrid: "Home to one of the world's largest royal palaces",
  loc_amsterdam: "A city built on millions of wooden poles",
  loc_moscow: "A fortress with walls painted the color of blood",
  loc_tokyo: "The world's busiest pedestrian crossing is here",
  loc_beijing: "A forbidden palace with 9,999 rooms",
  loc_seoul: "A river runs underground through the entire city",
  loc_bangkok: "A city whose full name has 168 letters",
  loc_singapore: "An entire country smaller than most cities",
  loc_delhi: "Home to a tower that has never rusted in 1,600 years",
  loc_mumbai: "Bollywood makes more movies here than Hollywood",
  loc_dubai: "Has a building so tall you can watch two sunsets in one day",
  loc_cairo: "The only ancient wonder you can still visit today",
  loc_cape_town: "Two oceans meet at the tip of this city's peninsula",
  loc_johannesburg: "Built on the world's largest gold deposit",
  loc_nairobi: "The only capital city with a national park inside it",
  loc_lagos: "Africa's largest city sits on a lagoon",
  loc_addis_ababa: "Home of a calendar that is 7 years behind the rest of the world",
  loc_marrakesh: "A maze of 1,000 streets in its ancient market",
  loc_new_york: "A park bigger than some countries sits in its center",
  loc_los_angeles: "Giant white letters on a hill were once an advert",
  loc_chicago: "A river that was reversed to flow backward",
  loc_san_francisco: "A bridge painted orange that everyone calls golden",
  loc_toronto: "A tower so tall it took 40 months to build",
  loc_vancouver: "Mountains, ocean, and rainforest meet in one city",
  loc_mexico_city: "Built on top of an ancient lake that once held a floating city",
  loc_buenos_aires: "The widest avenue in the world has 16 lanes",
  loc_rio_de_janeiro: "A giant statue watches over the city from a mountaintop",
  loc_lima: "A city where it almost never rains",
  loc_santiago: "Snow-capped volcanoes tower over the skyline",
  loc_caracas: "Sits in a valley surrounded by a cloud-covered mountain",
  loc_sydney: "A famous roof shaped like giant sails on the harbor",
  loc_melbourne: "Has its own weather — four seasons in one day",
  loc_brisbane: "A man-made beach in the middle of the city",
  loc_perth: "One of the most isolated big cities on Earth",
  loc_auckland: "Built on top of 50 sleeping volcanoes",
  loc_suva: "An island capital surrounded by coral reefs",
  "loc_bogotá": "A capital city sitting 2,600 meters above the clouds",
};

// Map categories to continent/landmark types for filtering
const getCategoryFilter = (categoryId: string | null) => {
  switch (categoryId) {
    case 'wonders': return (c: typeof LOCATION_CARDS[number]) => ['🗼', '🏛️', '🕌', '🗽', '🏰', '⛩️', '🕋'].includes(c.landmarkIcon || '');
    case 'nature': return (c: typeof LOCATION_CARDS[number]) => ['🦁', '🐨', '🦬', '🐘', '🦓', '🐻'].includes(c.landmarkIcon || '');
    case 'cities': return (c: typeof LOCATION_CARDS[number]) => ['🌆', '🏙️', '🌃'].includes(c.landmarkIcon || '') || c.population?.includes('Million');
    case 'islands': return (c: typeof LOCATION_CARDS[number]) => c.continent === 'Oceania' || c.city?.toLowerCase().includes('island');
    case 'mountains': return (c: typeof LOCATION_CARDS[number]) => ['⛰️', '🏔️', '🗻'].includes(c.landmarkIcon || '');
    default: return () => true;
  }
};

interface HomeAdventurePlacePickerProps {
  selectedPlaces: string[];
  onSelectedPlacesChange: (places: string[]) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedCategory: string | null;
  onSelectedCategoryChange: (category: string | null) => void;
  customCity: { city: string; country: string } | null;
  onCustomCityChange: (custom: { city: string; country: string } | null) => void;
  onInstantStart?: (cityId: string) => void;
  onInstantStartCustom?: (cityName: string) => void;
}

function HomeAdventurePlacePicker({
  selectedPlaces,
  onSelectedPlacesChange,
  searchQuery,
  onSearchQueryChange,
  selectedCategory,
  onSelectedCategoryChange,
  customCity,
  onCustomCityChange,
  onInstantStart,
  onInstantStartCustom,
}: HomeAdventurePlacePickerProps) {
  const filteredCities = useMemo(() => {
    let cities = [...LOCATION_CARDS];
    
    if (selectedCategory) {
      const filter = getCategoryFilter(selectedCategory);
      cities = cities.filter(filter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      cities = cities.filter(c => 
        c.city.toLowerCase().includes(query) ||
        c.country.toLowerCase().includes(query) ||
        c.continent.toLowerCase().includes(query)
      );
    }
    
    return cities;
  }, [selectedCategory, searchQuery]);

  const hasCustomSearch = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return false;
    const query = searchQuery.toLowerCase().trim();
    return !LOCATION_CARDS.some(c => c.city.toLowerCase() === query);
  }, [searchQuery]);
  
  const togglePlace = (cityId: string) => {
    onCustomCityChange(null);
    if (selectedPlaces.includes(cityId)) {
      onSelectedPlacesChange([]);
    } else {
      onSelectedPlacesChange([cityId]);
    }
  };

  const selectCustomCity = () => {
    const query = searchQuery.trim();
    if (!query) return;
    onSelectedPlacesChange([]);
    onCustomCityChange({ city: query, country: '' });
  };
  
  return (
    <div className="space-y-5 pt-2">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
        <Input 
          placeholder="Search any city in the world…"
          value={searchQuery}
          onChange={(e) => {
            onSearchQueryChange(e.target.value);
            if (customCity) onCustomCityChange(null);
            if (e.target.value.trim() && selectedCategory) onSelectedCategoryChange(null);
          }}
          className="pl-12 h-14 text-base rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 shadow-sm placeholder:text-slate-400"
          data-testid="input-home-search"
        />
      </div>

      {searchQuery.trim().length >= 2 && (
        <div className="space-y-2">
          {filteredCities.length > 0 && filteredCities.slice(0, 6).map(city => (
            <button
              key={city.id}
              onClick={() => onInstantStart ? onInstantStart(city.id) : togglePlace(city.id)}
              className="w-full p-3.5 rounded-2xl text-left transition-transform duration-150 border-2 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-sky-300 hover:shadow-lg hover:scale-[1.02] active:scale-[1.02]"
              data-testid={`place-${city.id}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{city.landmarkIcon || '🌍'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-white">{city.city}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{city.country}</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400" data-testid={`button-start-${city.id}`}>
                  Start {city.city} Adventure
                </span>
              </div>
            </button>
          ))}

          {hasCustomSearch && (
            <button
              onClick={() => onInstantStartCustom ? onInstantStartCustom(searchQuery.trim()) : selectCustomCity()}
              className="w-full p-3.5 rounded-2xl text-left transition-transform duration-150 border-2 bg-gradient-to-r from-sky-50 to-teal-50 dark:from-slate-800 dark:to-slate-700 border-transparent hover:border-sky-400 hover:scale-[1.02] active:scale-[1.02]"
              data-testid="button-custom-city"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{searchQuery.trim()}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Custom city adventure</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
                  Start {searchQuery.trim()} Adventure
                </span>
              </div>
            </button>
          )}

          {filteredCities.length === 0 && !hasCustomSearch && (
            <p className="text-sm text-center text-muted-foreground py-6">
              No cities found. Try a different search!
            </p>
          )}
        </div>
      )}

      {!searchQuery.trim() && (
        <>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">Explore by Theme</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSelectedCategoryChange(null)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                  !selectedCategory 
                    ? 'bg-sky-500 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
                data-testid="category-all"
              >
                All
              </button>
              {HOME_ADVENTURE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onSelectedCategoryChange(selectedCategory === cat.id ? null : cat.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                    selectedCategory === cat.id 
                      ? 'bg-sky-500 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                  data-testid={`category-${cat.id}`}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Featured Adventures
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {filteredCities.slice(0, 30).map(city => {
                const isSelected = selectedPlaces.includes(city.id);
                const hook = CITY_CURIOSITY_HOOKS[city.id];
                return (
                  <button
                    key={city.id}
                    onClick={() => togglePlace(city.id)}
                    className={`p-3.5 rounded-2xl text-left transition-transform duration-150 ${
                      isSelected 
                        ? 'bg-sky-50 dark:bg-sky-900/50 border-2 border-sky-500 shadow-lg ring-1 ring-sky-200 dark:ring-sky-800 scale-[1.02]' 
                        : 'bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-sky-300 hover:shadow-lg hover:scale-[1.02] active:scale-[1.02]'
                    }`}
                    data-testid={`place-${city.id}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl mt-0.5 flex-shrink-0">{city.landmarkIcon || '🌍'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{city.city}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{city.country}</p>
                        {hook && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 leading-snug line-clamp-2 italic">
                            {hook}
                          </p>
                        )}
                        <p className="text-[10px] font-medium mt-1.5 text-amber-600 dark:text-amber-400">
                          ✨ 5 discoveries waiting
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 flex justify-center">
                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/50 px-2.5 py-0.5 rounded-full">
                          ✓ Selected
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredCities.length > 30 && (
              <p className="text-xs text-center text-muted-foreground mt-3">
                Showing 30 of {filteredCities.length} cities. Use search to find more.
              </p>
            )}
            {filteredCities.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-6">
                No cities match this theme. Try another!
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function TravelMode() {
  const [, setLocation] = useLocation();
  const { adventureFlowV2, paywallEnabled } = useFeatureFlags();
  const { user, isLoading: isUserLoading } = useUser();
  const { activeExplorer, explorers, loadExplorers } = useExplorer();
  const { isAdmin, tier, hasActiveSubscription, isFoundingFamily, isTrialActive, isPaidTier } = useSubscription();
  const { recordAdventureCreated: recordFreeAdventureCreated, recordVirtualAdventureStarted, hasReachedVirtualAdventureCap, hasPaidTripUnlock, isPaidUser: isFreeLimitsPaid } = useFreeLimits();
  const { requestAccess } = useParentalGate();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');
  // Trip limit gating state
  const [showAdventureLimitGate, setShowAdventureLimitGate] = useState(false);
  const [adventureLimitType, setAdventureLimitType] = useState<'explore_home' | 'travel' | 'community' | 'spots'>('travel');
  const [showHomeTripUnlockSheet, setShowHomeTripUnlockSheet] = useState(false);
  const [pendingHomeDest, setPendingHomeDest] = useState<{ city: string; country: string } | null>(null);
  const homeTripPaymentCompleted = useRef(false);
  const [showVirtualCapGate, setShowVirtualCapGate] = useState(false);
  // Duplicate trip error dialog
  const [showDuplicateTripDialog, setShowDuplicateTripDialog] = useState(false);
  const [duplicateTripDestination, setDuplicateTripDestination] = useState<string>('');
  const [duplicateExistingTrip, setDuplicateExistingTrip] = useState<{ id: string; name: string; destination: string } | null>(null);
  
  const { 
    isEnabled, 
    isInTravelMode,
    setIsInTravelMode,
    trips, 
    tripCounts: travelTripCounts,
    isLoading,
    error: travelError,
    fetchTrips, 
    createTrip, 
    deleteTrip,
    archiveTrip,
    fetchTrip,
    ensureTripLoaded,
    clearCurrentTrip,
    currentTrip,
    currentTripStops,
    currentTripMoments,
    addStop,
    saveMoment,
    toggleFavorite,
    deleteMoment,
    markStopVisited,
    deleteStop,
  } = useTravel();

  const tripCounts = travelTripCounts;
  
  const canCreateHomeAdventure = true;
  
  const canCreateTravelAdventure = true;
  
  const isSpotLocked = useCallback((stopIndex: number): boolean => {
    return false;
  }, []);
  
  useEffect(() => {
    setIsInTravelMode(true);
    return () => setIsInTravelMode(false);
  }, [setIsInTravelMode]);

  // Entry routing is handled by <TripEntryRouter /> rendered below.
  // It self-contains trip discovery, stop loading, and state-based redirect logic.

  // Mark that GeoAdventures has been visited (account-level, so button shows on Home)
  useEffect(() => {
    try {
      localStorage.setItem('geoquest_geoadventures_visited', 'true');
    } catch {}
  }, []);
  
  // Handle openTrip query parameter (from inherited itineraries)
  const [pendingOpenTrip, setPendingOpenTrip] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('openTrip');
  });
  
  useEffect(() => {
    if (pendingOpenTrip && !isLoading && trips.length > 0) {
      // Check if this trip exists in the user's trips
      const tripExists = trips.some(t => t.id === pendingOpenTrip);
      if (tripExists) {
        setSelectedTripId(pendingOpenTrip);
        setView('trip');
        fetchTrip(pendingOpenTrip); // Load the trip data
        setPendingOpenTrip(null);
        // Clear the query param from URL
        window.history.replaceState({}, '', '/geoadventures');
      }
    }
  }, [isLoading, trips, pendingOpenTrip, fetchTrip]);

  const [pendingAutoCreateCity] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autoCreateCity');
  });
  const [pendingAutoCreateMode] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode');
  });
  const [autoCreateProcessed, setAutoCreateProcessed] = useState(false);

  useEffect(() => {
    if (!pendingAutoCreateCity || autoCreateProcessed || isLoading || !user) return;

    const cityName = decodeURIComponent(pendingAutoCreateCity);
    const isTravel = pendingAutoCreateMode === 'travel';
    const context = isTravel ? 'travel' : 'home';

    const existingTrip = trips.find(
      t => t.city?.toLowerCase() === cityName.toLowerCase() && t.adventureContext === context && t.status !== 'completed'
    );

    if (existingTrip) {
      setAutoCreateProcessed(true);
      setSelectedTripId(existingTrip.id);
      fetchTrip(existingTrip.id);
      setView("trip");
      window.history.replaceState({}, '', '/geoadventures');
      return;
    }

    const selectedCity = LOCATION_CARDS.find(c => c.city.toLowerCase() === cityName.toLowerCase());
    if (!selectedCity) {
      setAutoCreateProcessed(true);
      window.history.replaceState({}, '', '/geoadventures');
      return;
    }


    setAutoCreateProcessed(true);
    window.history.replaceState({}, '', '/geoadventures');

    const travelers: TripTraveler[] = activeExplorer
      ? [{ explorerId: activeExplorer.id, name: activeExplorer.name, avatarKey: activeExplorer.avatarKey || 'panda' }]
      : [{ name: 'Explorer', avatarKey: 'panda' }];

    (async () => {
      try {
        const trip = await createTrip({
          name: isTravel ? `${selectedCity.city} Trip` : `Exploring ${selectedCity.city}`,
          continent: selectedCity.continent,
          country: selectedCity.country,
          city: selectedCity.city,
          destination: `${selectedCity.city}, ${selectedCity.country}`,
          travelers,
          travelerNames: travelers.map(t => t.name),
          autoGenerateStops: true,
          adventureContext: context,
          stopCount: context === 'home' ? 5 : undefined,
        });
        if (trip) {
          recordFreeAdventureCreated();
          setSelectedTripId(trip.id);
          await fetchTrip(trip.id);
          setView("trip");
        }
      } catch (err: any) {
        if (err.code === 'DUPLICATE_CITY') {
          setDuplicateTripDestination(`${selectedCity.city}, ${selectedCity.country}`);
          setDuplicateExistingTrip(err.existingTrip || null);
          setShowDuplicateTripDialog(true);
        }
      }
    })();
  }, [pendingAutoCreateCity, autoCreateProcessed, isLoading, user, trips, activeExplorer]);
  
  const { toast } = useToast();
  
  const [view, setView] = useState<"list" | "create" | "trip" | "addStops">("list");
  const [landingTab, setLandingTab] = useState<"trips" | "now" | "kids" | "me">(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab");
    if (t === "now" || t === "kids" || t === "me") return t;
    return "trips";
  });
  const [showHomeAdventureDialog, setShowHomeAdventureDialog] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [showLaunchPromo, setShowLaunchPromo] = useState(false);
  // Track if user has dismissed the signup prompt in this session to avoid pestering
  const [signUpPromptDismissedThisSession, setSignUpPromptDismissedThisSession] = useState(false);
  const [showGuestBanner, setShowGuestBanner] = useState(false);
  const [showPostSignupWelcome, setShowPostSignupWelcome] = useState(false);
  const [emptyStateCity, setEmptyStateCity] = useState<{ name: string; country: string } | null>(null);
  const [highlightedCityIdx, setHighlightedCityIdx] = useState(0);
  const [showStopSelection, setShowStopSelection] = useState(false);
  const [pendingTrip, setPendingTrip] = useState<{ id: string; destination: string; suggestedStops: { name: string; stopType: string; displayOrder: number; address?: string }[] } | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<TravelStop | null>(null);
  const [showJourneyPack, setShowJourneyPack] = useState(false);
  const [showMomentCapture, setShowMomentCapture] = useState(false);
  const [showAddStopDialog, setShowAddStopDialog] = useState(false);
  const [newStopName, setNewStopName] = useState("");
  const [newStopType, setNewStopType] = useState("landmark");
  const [newStopAddress, setNewStopAddress] = useState("");
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [isLookingUpAddress, setIsLookingUpAddress] = useState(false);
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);
  const [showTravelMap, setShowTravelMap] = useState(false);
  const [mapInitialView, setMapInitialView] = useState<'world' | 'trip'>('world');
  const [showTripRecap, setShowTripRecap] = useState(false);
  const [pendingMapOpen, setPendingMapOpen] = useState(false);
  const [pendingMapView, setPendingMapView] = useState<'world' | 'trip'>('world');
  const [tripToArchive, setTripToArchive] = useState<{ id: string; name: string } | null>(null);
  const [tripToDelete, setTripToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showArchivedTrips, setShowArchivedTrips] = useState(false);
  const [showTrailTales, setShowTrailTales] = useState(false);
  const [trailTalesTripId, setTrailTalesTripId] = useState<string | null>(null);
  const [stopToDelete, setStopToDelete] = useState<string | null>(null);
  const [momentToDelete, setMomentToDelete] = useState<string | null>(null);
  const [showVideoMaker, setShowVideoMaker] = useState(false);
  const [showCollageMaker, setShowCollageMaker] = useState(false);
  
  // Demo trip state
  const [showDemoTrip, setShowDemoTrip] = useState(false);
  const [showPreTripInterstitial, setShowPreTripInterstitial] = useState(false);
  const [demoTripCompleted, setDemoTripCompleted] = useState(() => {
    try {
      return localStorage.getItem('geoadventures-demo-completed') === 'true';
    } catch {
      return false;
    }
  });
  
  // Dialog-specific trip data (separate from selected trip to avoid view changes)
  const [dialogTrip, setDialogTrip] = useState<TravelTrip | null>(null);
  const [dialogTripStops, setDialogTripStops] = useState<TravelStop[]>([]);
  const [dialogTripMoments, setDialogTripMoments] = useState<TravelMoment[]>([]);
  const [dialogDataLoading, setDialogDataLoading] = useState(false);
  const [showTripPreview, setShowTripPreview] = useState(false);
  
  useEffect(() => {
    if (!showAddStopDialog || !newStopName.trim() || newStopName.trim().length < 3) {
      return;
    }

    if (!addressAutoFilled && newStopAddress.trim()) return;

    const tripContext = currentTrip?.city || currentTrip?.destination || '';
    const tripCountry = currentTrip?.country || '';
    const fullContext = [tripContext, tripCountry].filter(Boolean).join(', ');
    if (!fullContext) return;

    const timer = setTimeout(async () => {
      setIsLookingUpAddress(true);
      try {
        const response = await fetch('/api/travel/lookup-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ placeName: newStopName.trim(), tripContext: fullContext }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.address) {
            setNewStopAddress(result.address);
            setAddressAutoFilled(true);
          }
        }
      } catch {
      } finally {
        setIsLookingUpAddress(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [newStopName, showAddStopDialog, currentTrip?.city, currentTrip?.destination]);

  // Weather hook for trip detail header
  const { weather: currentTripWeather } = useDestinationWeather(currentTrip?.city, currentTrip?.country, currentTrip?.destination);
  
  // Helper: Check if current trip is a home adventure (virtual exploration)
  const isHomeAdventure = currentTrip?.adventureContext === 'home';
  const adventureMode = getAdventureMode(currentTrip);
  const tripCapabilities = adventureMode.capabilities;
  const tripLanguage = adventureMode.language;
  const [tripStory, setTripStory] = useState<TripStory | null>(null);
  const [isCompletingTrip, setIsCompletingTrip] = useState(false);
  const [isFinishingAdventure, setIsFinishingAdventure] = useState(false);
  const [isStartingAdventure, setIsStartingAdventure] = useState(false);
  const [showAdventureRecap, setShowAdventureRecap] = useState(false);
  const [showGamesOnly, setShowGamesOnly] = useState(false);
  const [showFinishAdventureModal, setShowFinishAdventureModal] = useState(false);
  const [draggedStop, setDraggedStop] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [showMomentsLibrary, setShowMomentsLibrary] = useState(false);
  const [showTrophyCabinet, setShowTrophyCabinet] = useState(false);
  const [showSwitchAdventureSheet, setShowSwitchAdventureSheet] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [showTravelGamesModal, setShowTravelGamesModal] = useState(false);
  const [travelGamesInitialGame, setTravelGamesInitialGame] = useState<'think-fast' | 'scavenger-hunt' | 'geoguess' | 'geospy' | undefined>(undefined);
  const [activeGameDot, setActiveGameDot] = useState(0);
  const gamesScrollRef = useRef<HTMLDivElement>(null);
  const photoStripRef = useRef<HTMLDivElement>(null);
  const [showCompletedTrips, setShowCompletedTrips] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [allMoments, setAllMoments] = useState<{tripId: string; tripName: string; moments: TravelMoment[]}[]>([]);
  const [isLoadingMoments, setIsLoadingMoments] = useState(false);
  const [tripFirstPhotos, setTripFirstPhotos] = useState<Record<string, string | null>>({});
  const [tripStopsMap, setTripStopsMap] = useState<Record<string, TravelStop[]>>({});
  const [tripKeepsakeEmojis, setTripKeepsakeEmojis] = useState<Record<string, string[]>>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentTripShare, setCurrentTripShare] = useState<{ id: string; slug: string; status: string; totalViews: number; totalUpvotes: number; publishedAt: Date | null } | null>(null);

  const [showMissionSummary, setShowMissionSummary] = useState(false);

  const hasMissions = useMemo(() => {
    return currentTripStops.some(s => s.missionType && s.missionQuestion);
  }, [currentTripStops]);

  const activeMissionIndex = useMemo(() => {
    const idx = currentTripStops.findIndex(s => s.missionType && !s.missionCompleted);
    return idx >= 0 ? idx : currentTripStops.length;
  }, [currentTripStops]);

  const [collectedKeepsakes, setCollectedKeepsakes] = useState<Array<{ name: string; emoji: string; stopName: string }>>([]);

  useEffect(() => {
    if (!currentTrip?.id || !activeExplorer?.id) {
      setCollectedKeepsakes([]);
      return;
    }
    const controller = new AbortController();
    const tripId = currentTrip.id;
    const explorerId = activeExplorer.id;
    const loadKeepsakes = async () => {
      try {
        const res = await fetch(`/api/keepsakes/${explorerId}/${tripId}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (res.ok) {
          const data = await res.json();
          if (controller.signal.aborted) return;
          if (Array.isArray(data)) {
            const hydrated = data.map((item: { keepsake: { name: string; emoji: string }; }) => ({
              name: item.keepsake.name,
              emoji: item.keepsake.emoji || '🗺️',
              stopName: '',
            }));
            setCollectedKeepsakes(prev => {
              const existingNames = new Set(hydrated.map((k: { name: string }) => k.name));
              const localOnly = prev.filter(k => !existingNames.has(k.name));
              return [...hydrated, ...localOnly];
            });
          }
        }
      } catch (e) {
        if ((e instanceof DOMException) && e.name === 'AbortError') return;
        console.error("Error loading trip keepsakes:", e);
      }
    };
    loadKeepsakes();
    return () => controller.abort();
  }, [currentTrip?.id, activeExplorer?.id]);

  const handleCompleteMission = useCallback(async (stopId: string, answer: string) => {
    const response = await fetch(`/api/travel/stops/${stopId}/complete-mission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ answer, explorerId: activeExplorer?.id }),
    });
    const data = await response.json();
    if (data.success && currentTrip) {
      if (data.keepsakeUnlocked && data.unlockedKeepsake) {
        const stop = currentTripStops.find(s => s.id === stopId);
        setCollectedKeepsakes(prev => [...prev, {
          name: data.unlockedKeepsake.name,
          emoji: data.unlockedKeepsake.emoji,
          stopName: stop?.name || '',
        }]);
      }
      await fetchTrip(currentTrip.id);
      if (!data.nextMission) {
        setTimeout(() => setShowMissionSummary(true), 1200);
      }
    }
    return data;
  }, [currentTrip, activeExplorer, fetchTrip, currentTripStops]);

  // Account Settings modal state
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [narratorVoice, setNarratorVoice] = useState<'eva' | 'avi'>(() => {
    return (localStorage.getItem('geoquest_narrator_voice') as 'eva' | 'avi') || 'eva';
  });
  const [savingVoice, setSavingVoice] = useState(false);
  
  // Sync narratorVoice from user context when it becomes available
  useEffect(() => {
    const userVoice = (user as any)?.narratorVoice;
    if (userVoice && ['eva', 'avi'].includes(userVoice)) {
      setNarratorVoice(userVoice);
      localStorage.setItem('geoquest_narrator_voice', userVoice);
    }
  }, [user]);
  
  // Spot limit gate state (no longer used - free users can access all spots)
  const [showSpotLimitGate, setShowSpotLimitGate] = useState(false);

  const [tripName, setTripName] = useState("");
  const [selectedContinent, setSelectedContinent] = useState<ContinentId | "">("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [cityName, setCityName] = useState("");
  const [travelMonth, setTravelMonth] = useState<number | null>(null);
  const [travelYear, setTravelYear] = useState<number | null>(null);
  const [selectedTravelers, setSelectedTravelers] = useState<TripTraveler[]>([]);
  const [newTravelerName, setNewTravelerName] = useState("");
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [customStops, setCustomStops] = useState<string[]>(["", "", ""]);
  const [isCreating, setIsCreating] = useState(false);
  const [showAddTraveler, setShowAddTraveler] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  // Restore pending trip data after signup (only when user logs IN, not out)
  const [pendingDataRestored, setPendingDataRestored] = useState(false);
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);
  useEffect(() => {
    // Only restore when user logs IN (user changes from null to non-null)
    const userJustLoggedIn = user && !previousUserId;
    setPreviousUserId(user?.id || null);
    
    if (!user) {
      // User logged out - clear any signup prompts and reset state
      setShowSignUpPrompt(false);
      return;
    }
    
    if (userJustLoggedIn && !pendingDataRestored) {
      try {
        const storedData = localStorage.getItem('geoadventures-pending-trip');
        if (storedData) {
          const pending = JSON.parse(storedData);
          // Check if data is less than 24 hours old
          if (pending.timestamp && Date.now() - pending.timestamp < 24 * 60 * 60 * 1000) {
            if (pending.type === 'home') {
              // Restore home adventure data
              setHomeAdventureName(pending.homeAdventureName || '');
              setHomeSelectedPlaces(pending.homeSelectedPlaces || []);
              if (pending.homeCustomCity) setHomeCustomCity(pending.homeCustomCity);
              // Small delay to let the page load
              setTimeout(() => {
                setShowHomeAdventureDialog(true);
                toast({
                  title: "Welcome back!",
                  description: "Your adventure is ready to create.",
                });
              }, 500);
            } else if (pending.type === 'travel' || pending.tripName) {
              setTimeout(() => {
                setLocation("/build-adventure");
                toast({
                  title: "Welcome back!",
                  description: "Your adventure is ready to create.",
                });
              }, 500);
            }
          }
          // Clear the stored data after restoring
          localStorage.removeItem('geoadventures-pending-trip');
          setPendingDataRestored(true);
        }
      } catch (e) {
        console.log('Could not restore pending trip data');
      }
    }
  }, [user, toast, pendingDataRestored, previousUserId]);
  
  // Home Adventure state
  const [homeAdventureName, setHomeAdventureName] = useState("");
  const [homeSelectedPlaces, setHomeSelectedPlaces] = useState<string[]>([]);
  const [homePlaceSearch, setHomePlaceSearch] = useState("");
  const [homeSelectedCategory, setHomeSelectedCategory] = useState<string | null>(null);
  const [isCreatingHomeAdventure, setIsCreatingHomeAdventure] = useState(false);
  const [homeCustomCity, setHomeCustomCity] = useState<{ city: string; country: string } | null>(null);
  
  // Onboarding state - simple tip system (database-backed for persistence across domains)
  const [showOnboardingTip, setShowOnboardingTip] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [welcomeDismissedState, setWelcomeDismissedState] = useState(false);
  
  // Anchoring modal - show after first adventure is created (sample, real, or virtual)
  const [showAnchoringAfterCreate, setShowAnchoringAfterCreate] = useState(false);
  
  // Get onboarding status from user's database record
  const userOnboarding = useMemo(() => {
    return (user?.onboardingCompleted as Record<string, boolean>) || {};
  }, [user?.onboardingCompleted]);
  
  // Existing users (who have trips OR have completed onboarding before) should skip all onboarding automatically
  const isExistingUser = useMemo(() => {
    const safeTrips = Array.isArray(trips) ? trips : [];
    // User has trips - definitely existing user
    if (safeTrips.length > 0) return true;
    // User has any onboarding markers in database - definitely existing user
    if (userOnboarding.travel_welcome || userOnboarding.travel_list || userOnboarding.travel_trip) return true;
    // Check localStorage for any previous onboarding completion
    if (user?.id) {
      const keys = [
        `travel_onboarding_${user.id}_first_visit`,
        `travel_onboarding_${user.id}_list_seen`,
        `travel_onboarding_${user.id}_trip_seen`
      ];
      if (keys.some(key => localStorage.getItem(key) === 'true')) return true;
    }
    return false;
  }, [trips, userOnboarding, user?.id]);
  
  // Check if user has dismissed welcome - database backed for persistence across domains
  const hasDismissedWelcome = useMemo(() => {
    // Existing users with trips skip welcome automatically
    if (isExistingUser) return true;
    if (welcomeDismissedState) return true;
    // Check database first (persists across domains/publishing)
    if (userOnboarding.travel_welcome) return true;
    // Check new anchoring key first
    if (hasSeenAnchoring()) return true;
    // Fallback to localStorage - check all possible keys for backwards compatibility
    const firstTimeKey = 'travel_mode_first_visit';
    const genericKey = 'travel_onboarding_first_visit';
    const userKey = user?.id ? `travel_onboarding_${user.id}_first_visit` : genericKey;
    return localStorage.getItem(firstTimeKey) === 'true' || 
           localStorage.getItem(userKey) === 'true' || 
           localStorage.getItem(genericKey) === 'true';
  }, [user?.id, welcomeDismissedState, userOnboarding.travel_welcome, isExistingUser]);
  
  // Check if user has seen list/trip onboarding from database
  const hasSeenListOnboarding = useMemo(() => {
    // Existing users skip all onboarding
    if (isExistingUser) return true;
    if (userOnboarding.travel_list) return true;
    const key = user?.id ? `travel_onboarding_${user.id}_list_seen` : 'travel_onboarding_list_seen';
    return localStorage.getItem(key) === 'true';
  }, [user?.id, userOnboarding.travel_list, isExistingUser]);
  
  const hasSeenTripOnboarding = useMemo(() => {
    // Existing users skip all onboarding
    if (isExistingUser) return true;
    if (userOnboarding.travel_trip) return true;
    const key = user?.id ? `travel_onboarding_${user.id}_trip_seen` : 'travel_onboarding_trip_seen';
    return localStorage.getItem(key) === 'true';
  }, [user?.id, userOnboarding.travel_trip, isExistingUser]);
  
  // Save onboarding status to database
  const saveOnboardingStatus = useCallback(async (key: string, value: boolean) => {
    if (!user) return;
    try {
      await fetch('/api/auth/user/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, value }),
      });
    } catch (err) {
      console.error('[Travel] Failed to save onboarding status:', err);
    }
  }, [user]);
  
  const setHasDismissedWelcome = useCallback((value: boolean) => {
    if (value) {
      setWelcomeDismissedState(true);
      // Save to database for persistence across domains
      saveOnboardingStatus('travel_welcome', true);
      // Also save to localStorage as backup - use all keys for consistency
      const firstTimeKey = 'travel_mode_first_visit'; // Same key as FirstTimeTravelWelcome
      localStorage.setItem(firstTimeKey, 'true');
    }
  }, [saveOnboardingStatus]);
  
  // Ensure trips is always an array to prevent runtime errors
  const safeTripsEarly = Array.isArray(trips) ? trips : [];
  
  // Define onboarding tips for different contexts
  const listOnboardingTips = safeTripsEarly.length > 0 
    ? [{ id: "trip_card", title: "Your Adventures", emoji: "🗺️", text: "Tap any adventure to explore stops, play Journey Packs, and save memories. The headphone icon means there's audio content ready!" }]
    : [{ id: "plan_trip", title: "Start Your Adventure!", emoji: "✈️", text: "Tap 'Build Your Child's Adventure' to create your family's next adventure. Add stops and get your kids excited with audio stories!" }];
    
  const tripOnboardingTips = [
    { id: "view_map", title: "View Map", emoji: "🗺️", text: "See all your adventure stops on an interactive map. Track your journey progress!" },
    { id: "moments", title: "Save Moment", emoji: "📸", text: "Capture photos at each stop. When your adventure ends, we'll create a keepsake story from your memories!" },
    { id: "share", title: "Share", emoji: "🔗", text: "Share your adventure itinerary with family and friends, or explore community adventures for inspiration!" },
    { id: "download", title: "Download for Offline", emoji: "📥", text: "Download adventure content to use offline during your travels — no internet needed!" },
  ];
  
  // Check and show onboarding tips based on view
  // Only show tooltips AFTER welcome modal is dismissed AND (demo completed OR has trips)
  useEffect(() => {
    // Don't show onboarding tooltips until user context and trips are loaded
    if (isUserLoading || isLoading) {
      setShowOnboardingTip(null);
      return;
    }
    
    // Don't show onboarding tooltips until welcome modal is dismissed
    if (!hasDismissedWelcome) {
      setShowOnboardingTip(null);
      return;
    }
    
    // Don't show onboarding tooltips for:
    // 1. Non-logged-in users (they should use the demo/signup flow)
    // 2. Users with no trips (hero section provides guidance)
    if (!user || safeTripsEarly.length === 0) {
      setShowOnboardingTip(null);
      return;
    }
    
    if (view === "list" && !hasSeenListOnboarding && !isLoading) {
      const timer = setTimeout(() => {
        setOnboardingStep(0);
        setShowOnboardingTip("list");
      }, 1500);
      return () => clearTimeout(timer);
    } else if (view === "list") {
      setShowOnboardingTip(null);
    }
    
    if (view === "trip" && !hasSeenTripOnboarding && currentTrip) {
      const timer = setTimeout(() => {
        setOnboardingStep(0);
        setShowOnboardingTip("trip");
      }, 1000);
      return () => clearTimeout(timer);
    } else if (view === "trip" && hasSeenTripOnboarding) {
      setShowOnboardingTip(null);
    }
  }, [view, isLoading, isUserLoading, safeTripsEarly.length, currentTrip, hasDismissedWelcome, hasSeenListOnboarding, hasSeenTripOnboarding, demoTripCompleted, user]);
  
  const getCurrentTips = () => showOnboardingTip === "list" ? listOnboardingTips : tripOnboardingTips;
  const currentTip = getCurrentTips()[onboardingStep];
  
  const dismissOnboarding = useCallback(() => {
    if (showOnboardingTip === "list") {
      // Save to database for persistence
      saveOnboardingStatus('travel_list', true);
      // Also save to localStorage as backup
      const key = user?.id ? `travel_onboarding_${user.id}_list_seen` : 'travel_onboarding_list_seen';
      localStorage.setItem(key, 'true');
    } else if (showOnboardingTip === "trip") {
      saveOnboardingStatus('travel_trip', true);
      const key = user?.id ? `travel_onboarding_${user.id}_trip_seen` : 'travel_onboarding_trip_seen';
      localStorage.setItem(key, 'true');
    }
    setShowOnboardingTip(null);
    setOnboardingStep(0);
  }, [showOnboardingTip, saveOnboardingStatus, user?.id]);
  
  const advanceOnboardingTip = () => {
    const tips = getCurrentTips();
    if (onboardingStep < tips.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      dismissOnboarding();
    }
  };

  const parentExplorer = useMemo(() => {
    return explorers.find((e) => e.profileType === "parent" || e.profileType === "adult");
  }, [explorers]);

  const kidExplorers = useMemo(() => {
    // Filter for kid explorers, or explorers without profile type (excluding parent)
    const kids = explorers.filter((e) => e.profileType === "kid" || (!e.profileType && e.id !== parentExplorer?.id));
    // If no kids found but we have explorers without a parent, show all explorers as travelers
    if (kids.length === 0 && !parentExplorer && explorers.length > 0) {
      return explorers;
    }
    return kids;
  }, [explorers, parentExplorer]);

  const allAvailableExplorers = useMemo(() => {
    if (explorers.length > 0) return explorers;
    if (activeExplorer) return [activeExplorer];
    return [];
  }, [explorers, activeExplorer]);

  const countriesForContinent = useMemo(() => {
    if (!selectedContinent) return [];
    return COUNTRIES_BY_CONTINENT[selectedContinent] || [];
  }, [selectedContinent]);

  const suggestedStops = useMemo(() => {
    const city = view === "addStops" && currentTrip?.city 
      ? currentTrip.city 
      : cityName.trim();
    if (!city) return null;
    return getSuggestedStops(city);
  }, [cityName, view, currentTrip?.city]);

  const getTripState = (trip: typeof trips[0]) => {
    if (trip.completedAt) return 'completed';
    if (trip.status === 'completed') return 'completed';
    if (trip.status === 'active') return 'active';
    if (trip.status === 'upcoming') return 'upcoming';
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    if (trip.travelYear && trip.travelMonth) {
      if (trip.travelYear > currentYear || 
          (trip.travelYear === currentYear && trip.travelMonth > currentMonth)) {
        return 'upcoming';
      } else if (trip.travelYear === currentYear && trip.travelMonth === currentMonth) {
        return 'active';
      } else if (trip.travelYear < currentYear || 
          (trip.travelYear === currentYear && trip.travelMonth < currentMonth)) {
        return 'completed';
      }
    } else if (trip.travelYear) {
      if (trip.travelYear > currentYear) {
        return 'upcoming';
      } else if (trip.travelYear < currentYear) {
        return 'completed';
      } else {
        if (trip.totalMemoryStars && trip.totalMemoryStars > 0) {
          return 'completed';
        }
        return 'active';
      }
    }
    
    if (trip.totalMemoryStars && trip.totalMemoryStars > 0) {
      return 'completed';
    }
    
    return 'active';
  };

  const safeTrips = safeTripsEarly;

  const upcomingTrips = useMemo(() => {
    return safeTrips
      .filter(t => !t.isArchived && getTripState(t) === 'upcoming')
      .sort((a, b) => {
        const aYear = a.travelYear || 9999;
        const bYear = b.travelYear || 9999;
        if (aYear !== bYear) return aYear - bYear;
        const aMonth = a.travelMonth || 12;
        const bMonth = b.travelMonth || 12;
        return aMonth - bMonth;
      });
  }, [safeTrips]);

  const pastTrips = useMemo(() => {
    return safeTrips.filter(t => !t.isArchived && getTripState(t) === 'completed');
  }, [safeTrips]);

  const activeTrips = useMemo(() => {
    return safeTrips.filter(t => !t.isArchived && getTripState(t) === 'active');
  }, [safeTrips]);
  
  // Sorted trips for display: Upcoming first (current month priority), then active, then completed/archived at bottom
  const sortedTrips = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    // Sort upcoming trips: current month first, then by date
    const sortedUpcoming = [...upcomingTrips].sort((a, b) => {
      const aYear = a.travelYear || 9999;
      const bYear = b.travelYear || 9999;
      const aMonth = a.travelMonth || 12;
      const bMonth = b.travelMonth || 12;
      
      // Current month trips get priority
      const aIsCurrentMonth = aYear === currentYear && aMonth === currentMonth;
      const bIsCurrentMonth = bYear === currentYear && bMonth === currentMonth;
      if (aIsCurrentMonth && !bIsCurrentMonth) return -1;
      if (!aIsCurrentMonth && bIsCurrentMonth) return 1;
      
      // Then sort by date (nearest first)
      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    });
    
    // Sort active trips by most recent activity
    const sortedActive = [...activeTrips].sort((a, b) => {
      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate; // Most recent first
    });
    
    const sortedPast = [...pastTrips].sort((a, b) => {
      const aYear = a.travelYear || 0;
      const bYear = b.travelYear || 0;
      if (aYear !== bYear) return bYear - aYear;
      const aMonth = a.travelMonth || 0;
      const bMonth = b.travelMonth || 0;
      return bMonth - aMonth;
    });

    return [...sortedActive, ...sortedUpcoming, ...sortedPast];
  }, [activeTrips, upcomingTrips, pastTrips]);

  const familyProgress = useMemo(() => {
    let totalStars = 0;
    let placesCompleted = 0;
    safeTrips.forEach(trip => {
      totalStars += trip.totalMemoryStars || 0;
      const tripState = getTripState(trip);
      if (tripState === 'completed' || (trip.totalMemoryStars && trip.totalMemoryStars > 0)) {
        placesCompleted++;
      }
    });
    return { totalStars, placesCompleted, tripCount: safeTrips.length };
  }, [safeTrips]);

  // Active Adventure Selection Logic
  // Priority: 1) Travel trips over At-Home, 2) Recent activity (48-72 hrs), 3) Incomplete GeoMoment, 4) Most recently created
  const selectActiveAdventure = useMemo(() => {
    const ongoingTrips = [...activeTrips, ...upcomingTrips].filter(t => !t.isLocked && !t.completedAt);
    
    if (ongoingTrips.length === 0) return null;
    if (ongoingTrips.length === 1) return ongoingTrips[0];
    
    const now = new Date();
    const recentThreshold = 72 * 60 * 60 * 1000; // 72 hours
    
    // Sort by priority: travel > at-home, recent activity > has incomplete work > most recently created
    const scored = ongoingTrips.map(trip => {
      let score = 0;
      
      // HIGHEST PRIORITY: Travel trips always get priority over At-Home adventures
      // At-Home = perpetual preview, Travel = real memory preservation
      if (trip.adventureContext !== 'home') {
        score += 10000; // Travel trips get a major boost
      }
      
      // Check for recent activity (updatedAt within 72 hours)
      const updatedAt = trip.updatedAt ? new Date(trip.updatedAt) : null;
      if (updatedAt && (now.getTime() - updatedAt.getTime()) < recentThreshold) {
        score += 1000;
      }
      
      // Check if trip has memory stars (indicates engagement)
      if (trip.totalMemoryStars && trip.totalMemoryStars > 0) {
        score += 100;
      }
      
      // More recent createdAt is better
      const createdAt = trip.createdAt ? new Date(trip.createdAt).getTime() : 0;
      score += createdAt / 1e12; // Small weight for recency
      
      return { trip, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.trip || ongoingTrips[0];
  }, [activeTrips, upcomingTrips]);

  // Count of other ongoing adventures (for "Switch adventure" hint)
  const otherAdventureCount = useMemo(() => {
    const ongoingTrips = [...activeTrips, ...upcomingTrips].filter(t => !t.isLocked && !t.completedAt);
    return Math.max(0, ongoingTrips.length - 1);
  }, [activeTrips, upcomingTrips]);

  // Determine journey phase for the active adventure
  // "listen" = on the way, "wonder" = at location, "reflect" = after stop
  const heroContext = useMemo(() => {
    // No trips at all, or only archived trips
    const nonArchivedTrips = safeTrips.filter(t => !t.isArchived);
    if (nonArchivedTrips.length === 0) {
      return {
        type: 'first' as const,
        trip: null,
        activeAdventure: null,
        journeyPhase: null,
        nextStop: null,
      };
    }
    
    // Only completed/past trips
    if (!selectActiveAdventure && pastTrips.length > 0) {
      return {
        type: 'memories' as const,
        trip: null,
        activeAdventure: null,
        journeyPhase: null,
        nextStop: null,
      };
    }
    
    // We have an active adventure - determine journey phase
    if (selectActiveAdventure) {
      // Default to "listen" (before stop) as the most common starting state
      // In a full implementation, we would check:
      // - If user is physically near a stop (geolocation) → "wonder"
      // - If user has completed listen but not saved moment → "reflect"
      // - Otherwise → "listen"
      
      // For now, use "upcoming" as a generic active state
      // The full journey-phase detection would require more stop-level data
      return {
        type: 'upcoming' as const,
        trip: selectActiveAdventure,
        activeAdventure: {
          trip: selectActiveAdventure,
          nextStop: null,
          journeyPhase: 'listen' as const,
          isActive: true,
        },
        journeyPhase: 'listen',
        nextStop: null,
      };
    }
    
    // Fallback for upcoming trips
    if (upcomingTrips.length > 0) {
      return {
        type: 'upcoming' as const,
        trip: upcomingTrips[0],
        activeAdventure: null,
        journeyPhase: null,
        nextStop: null,
      };
    }
    
    // Default to first adventure prompt
    return {
      type: 'first' as const,
      trip: null,
      activeAdventure: null,
      journeyPhase: null,
      nextStop: null,
    };
  }, [safeTrips, selectActiveAdventure, pastTrips, upcomingTrips]);

  const contextualNudge = useMemo(() => {
    if (trips.length === 0) {
      return null;
    }
    const upcoming = upcomingTrips[0];
    if (upcoming) {
      return `Want to spark curiosity before your ${upcoming.destination} adventure?`;
    }
    const active = activeTrips[0];
    if (active) {
      return `Ready to save a memory from ${active.destination}?`;
    }
    if (pastTrips.length > 0) {
      return "Revisit what your family remembers from past adventures.";
    }
    return null;
  }, [trips, upcomingTrips, activeTrips, pastTrips]);

  useEffect(() => {
    if (emptyStateCity) return;
    const interval = setInterval(() => {
      setHighlightedCityIdx(prev => (prev + 1) % 3);
    }, 2400);
    return () => clearInterval(interval);
  }, [emptyStateCity]);

  useEffect(() => {
    if (landingTab === 'trips' && trips.length === 0) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [landingTab, trips.length]);

  const geoBuddyMessage = useMemo(() => {
    if (trips.length === 0) {
      if (emptyStateCity) {
        return `Great pick. ${emptyStateCity.name} is perfect for kids ☝️`;
      }
      return "I'll help you plan this ☝️";
    }
    const upcoming = upcomingTrips[0];
    if (upcoming) {
      return "Journey Packs are best explored on the way to your destination!";
    }
    const active = activeTrips[0];
    if (active) {
      return "What will you remember from today?";
    }
    return "Where will you go next?";
  }, [trips, upcomingTrips, activeTrips, emptyStateCity]);

  useEffect(() => {
    if (parentExplorer && selectedTravelers.length === 0) {
      setSelectedTravelers([{
        explorerId: parentExplorer.id,
        name: parentExplorer.name,
        avatarKey: parentExplorer.avatarKey || undefined,
        isParent: true,
      }]);
    }
  }, [parentExplorer, selectedTravelers.length]);

  useEffect(() => {
    if (isEnabled && user) {
      fetchTrips();
    }
  }, [isEnabled, user, fetchTrips]);

  // Load explorers when user is available (needed for travelers selection)
  useEffect(() => {
    if (user?.id) {
      loadExplorers(user.id);
    }
  }, [user?.id, loadExplorers]);

  // Login prompt is no longer auto-shown for non-logged users.
  // The landing page serves as a pseudo-landing page.
  // Users can sign up via the Account button or after engaging with the demo.

  useEffect(() => {
    if (selectedTripId) {
      console.log("[TravelMode] SelectedTripId changed, fetching:", selectedTripId);
      fetchTrip(selectedTripId);
      setView("trip");
      setTripStory(null);
    }
  }, [selectedTripId, fetchTrip]); // Removed user dependency to avoid race conditions

  useEffect(() => {
    const trip = currentTrip as ExtendedTrip | null;
    if (view === "trip" && trip && isNonDemoTrip(trip)) {
      console.log("[TravelMode] Redirecting to adventure flow for trip:", trip.id);
      setInternalNavToAdventureTrip(trip.id);
      setLocation(isTravelTrip(trip) ? parentPlanUrl(trip) : `/adventure/${trip.id}/kid`);
    }
  }, [view, currentTrip, setLocation]);

  useEffect(() => {
    // Only open map when the CORRECT trip data is loaded (prevents race condition)
    if (pendingMapOpen && currentTrip && currentTripStops && currentTrip.id === selectedTripId) {
      setMapInitialView(pendingMapView);
      setShowTravelMap(true);
      setPendingMapOpen(false);
    }
  }, [pendingMapOpen, currentTrip, currentTripStops, pendingMapView, selectedTripId]);

  if (!isEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <Plane className="w-16 h-16 text-sky-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">GeoAdventures Coming Soon!</h2>
            <p className="text-muted-foreground">
              Get ready to capture family travel memories and spark curiosity before your adventures.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resetCreateForm = () => {
    setTripName("");
    setSelectedContinent("");
    setSelectedCountry("");
    setCityName("");
    setTravelMonth(null);
    setTravelYear(null);
    setSelectedTravelers(parentExplorer ? [{
      explorerId: parentExplorer.id,
      name: parentExplorer.name,
      avatarKey: parentExplorer.avatarKey || undefined,
      isParent: true,
    }] : []);
    setSelectedStops([]);
    setCustomStops(["", "", ""]);
    setNewTravelerName("");
    setShowAddTraveler(false);
  };

  const handleAddCustomTraveler = () => {
    if (newTravelerName.trim()) {
      setSelectedTravelers(prev => [...prev, { name: newTravelerName.trim() }]);
      setNewTravelerName("");
      setShowAddTraveler(false);
    }
  };
  
  // Helper to show create dialog with free user warning
  // Free users get a warning about 1-city limit before creating
  const handleOpenCreateDialog = useCallback(() => {
    setLocation("/build-adventure");
  }, [setLocation]);
  
  const handleOpenHomeAdventureDialog = useCallback(() => {
    setShowHomeAdventureDialog(true);
  }, []);

  const toggleExplorerTraveler = (explorer: { id: string; name: string; avatarKey?: string | null; profileType?: string | null }) => {
    const exists = selectedTravelers.some(t => t.explorerId === explorer.id);
    if (exists) {
      setSelectedTravelers(prev => prev.filter(t => t.explorerId !== explorer.id));
    } else {
      setSelectedTravelers(prev => [...prev, {
        explorerId: explorer.id,
        name: explorer.name,
        avatarKey: explorer.avatarKey || undefined,
        isParent: explorer.profileType === "parent" || explorer.profileType === "adult",
      }]);
    }
  };

  // Home Adventure creation handler
  const handleCreateHomeAdventure = async (overrideCity?: { city: string; country: string; continent?: string }) => {
    const isCustom = !!homeCustomCity || !!overrideCity;
    const customData = overrideCity || homeCustomCity;

    if (!isCustom && homeSelectedPlaces.length !== 1) return;
    
    
    if (!user) {
      const pendingHomeData = {
        type: 'home',
        homeSelectedPlaces,
        homeAdventureName,
        homeCustomCity: customData,
        timestamp: Date.now()
      };
      try {
        localStorage.setItem('geoadventures-pending-trip', JSON.stringify(pendingHomeData));
      } catch (e) {
        console.log('Could not save pending home adventure data');
      }
      
      toast({
        title: "Create a free account to save",
        description: "Tap 'Account' at the top to sign up — your adventure details are saved!",
      });
      return;
    }
    
    // Virtual adventure cap for non-paying users (2 lifetime max)
    // Exempt users with an active paid subscription OR explicit paid trip unlock recorded at purchase time
    if (hasReachedVirtualAdventureCap && !hasPaidTripUnlock) {
      setShowVirtualCapGate(true);
      return;
    }

    setIsCreatingHomeAdventure(true);
    
    let cityName: string;
    let countryName: string;
    let continentName: string;

    if (isCustom && customData) {
      cityName = customData.city;
      countryName = customData.country || '';
      continentName = customData.continent || '';
    } else {
      const selectedCity = LOCATION_CARDS.find(c => c.id === homeSelectedPlaces[0]);
      if (!selectedCity) {
        setIsCreatingHomeAdventure(false);
        return;
      }
      cityName = selectedCity.city;
      countryName = selectedCity.country;
      continentName = selectedCity.continent;
    }

    const needsTripUnlock =
      paywallEnabled &&
      !isAdmin &&
      !isFoundingFamily &&
      !isTrialActive &&
      !hasActiveSubscription &&
      !homeTripPaymentCompleted.current;

    if (needsTripUnlock) {
      setPendingHomeDest({ city: cityName, country: countryName });
      setShowHomeTripUnlockSheet(true);
      setIsCreatingHomeAdventure(false);
      return;
    }
    
    const adventureDisplayName = `Exploring ${cityName}`;
    
    const travelers: TripTraveler[] = activeExplorer 
      ? [{ 
          explorerId: activeExplorer.id, 
          name: activeExplorer.name, 
          avatarKey: activeExplorer.avatarKey || 'panda' 
        }]
      : [{ name: 'Explorer', avatarKey: 'panda' }];
    
    try {
      const trip = await createTrip({
        name: adventureDisplayName,
        continent: continentName,
        country: countryName,
        city: cityName,
        destination: countryName ? `${cityName}, ${countryName}` : cityName,
        travelers,
        travelerNames: travelers.map(t => t.name),
        autoGenerateStops: true,
        adventureContext: 'home',
        stopCount: 5,
      });
      
      if (trip) {
        recordFreeAdventureCreated();
        recordVirtualAdventureStarted();
        setShowHomeAdventureDialog(false);
        setHomeAdventureName('');
        setHomeSelectedPlaces([]);
        setHomePlaceSearch('');
        setHomeSelectedCategory(null);
        setHomeCustomCity(null);
        
        setSelectedTripId(trip.id);
        await fetchTrip(trip.id);
        setView("trip");
        if (!hasSeenAnchoring()) setShowAnchoringAfterCreate(true);
        
        toast({
          title: "Adventure Created!",
          description: `5 amazing places to explore in ${cityName} are ready!`,
        });
      }
    } catch (err: any) {
      if (err.code === 'DUPLICATE_CITY') {
        const cityCard = isCustom ? null : LOCATION_CARDS.find(c => c.id === homeSelectedPlaces[0]);
        setDuplicateTripDestination(cityCard ? `${cityCard.city}, ${cityCard.country}` : (customData ? customData.city : 'this destination'));
        setDuplicateExistingTrip(err.existingTrip || null);
        setShowDuplicateTripDialog(true);
        setShowHomeAdventureDialog(false);
      } else {
        toast({
          title: "Failed to create adventure",
          description: err.message || "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsCreatingHomeAdventure(false);
    }
  };

  const handleStopSelectionConfirm = async (
    selectedStops: { name: string; stopType: string; displayOrder: number; address?: string }[],
    customStopNames: string[]
  ) => {
    if (!pendingTrip) return;
    
    for (const stop of selectedStops) {
      await addStop(pendingTrip.id, {
        name: stop.name,
        stopType: stop.stopType,
        displayOrder: stop.displayOrder,
        address: stop.address,
      });
    }
    
    for (let i = 0; i < customStopNames.length; i++) {
      if (customStopNames[i].trim()) {
        await addStop(pendingTrip.id, {
          name: customStopNames[i].trim(),
          stopType: "custom",
          displayOrder: selectedStops.length + i + 1,
        });
      }
    }
    
    setShowStopSelection(false);
    resetCreateForm();
    setSelectedTripId(pendingTrip.id);
    await fetchTrip(pendingTrip.id);
    setPendingTrip(null);
    setView("trip");
  };

  const handleDeleteStop = async (stopId: string) => {
    try {
      console.log("[TravelMode] Deleting stop:", stopId);
      // Use the context's deleteStop which handles both online and offline
      await deleteStop(stopId);
      // Refetch trip to get updated stops
      if (currentTrip) {
        await fetchTrip(currentTrip.id);
      }
      toast({ title: "Stop removed", description: "The stop has been removed from your adventure." });
    } catch (error) {
      console.error("Error deleting stop:", error);
      toast({ title: "Couldn't remove stop", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  // Fetch trip data for dialogs without changing the view
  const fetchDialogTripData = async (tripId: string) => {
    console.log("[Dialog] Fetching trip data for:", tripId);
    setDialogDataLoading(true);
    try {
      const tripData = await apiRequest("GET", `/api/travel/trips/${tripId}`);
      const data = await tripData.json();
      console.log("[Dialog] Fetched trip data:", data);
      console.log("[Dialog] Stops:", data.stops?.length, "Moments:", data.moments?.length);
      // API returns trip data directly with stops and moments as properties
      setDialogTrip(data);
      setDialogTripStops(data.stops || []);
      setDialogTripMoments(data.moments || []);
      
      // Also fetch the story for this trip
      try {
        const storyResponse = await apiRequest("GET", `/api/travel/trips/${tripId}/story`);
        if (storyResponse.ok) {
          const story = await storyResponse.json();
          if (story && story.id) {
            console.log("[Dialog] Fetched existing story:", story.id);
            setTripStory(story);
          }
        }
      } catch (storyError) {
        console.log("[Dialog] No existing story for trip");
      }
      
      setDialogDataLoading(false);
      console.log("[Dialog] State set, returning data");
      return data;
    } catch (error) {
      console.error("[Dialog] Error fetching dialog trip data:", error);
      setDialogDataLoading(false);
      toast({ title: "Couldn't load adventure", description: "Something went wrong. Please try again.", variant: "destructive" });
      return null;
    }
  };

  const handleMoveStop = async (stopId: string, direction: 'up' | 'down') => {
    if (!currentTrip || currentTripStops.length < 2) return;
    
    const currentIndex = currentTripStops.findIndex(s => s.id === stopId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= currentTripStops.length) return;
    
    const newStops = [...currentTripStops];
    [newStops[currentIndex], newStops[newIndex]] = [newStops[newIndex], newStops[currentIndex]];
    
    const stopOrders = newStops.map((stop, index) => ({
      stopId: stop.id,
      displayOrder: index + 1,
    }));
    
    try {
      await apiRequest("PATCH", `/api/travel/trips/${currentTrip.id}/reorder-stops`, { stopOrders });
      await fetchTrip(currentTrip.id);
      toast({ title: "Stop moved", description: "Your stops have been reordered." });
    } catch (error) {
      console.error("Error reordering stops:", error);
      toast({ title: "Couldn't reorder stops", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const handleDragStart = (stopId: string) => {
    setDraggedStop(stopId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (!currentTrip || !draggedStop || dragOverIndex === null) {
      setDraggedStop(null);
      setDragOverIndex(null);
      return;
    }

    const fromIndex = currentTripStops.findIndex(s => s.id === draggedStop);
    if (fromIndex === -1 || fromIndex === dragOverIndex) {
      setDraggedStop(null);
      setDragOverIndex(null);
      return;
    }

    const newStops = [...currentTripStops];
    const [removed] = newStops.splice(fromIndex, 1);
    newStops.splice(dragOverIndex, 0, removed);

    const stopOrders = newStops.map((stop, index) => ({
      stopId: stop.id,
      displayOrder: index + 1,
    }));

    setDraggedStop(null);
    setDragOverIndex(null);

    try {
      await apiRequest("PATCH", `/api/travel/trips/${currentTrip.id}/reorder-stops`, { stopOrders });
      await fetchTrip(currentTrip.id);
      toast({ title: "Stops reordered", description: "Your stops have been rearranged." });
    } catch (error) {
      console.error("Error reordering stops:", error);
      toast({ title: "Couldn't reorder stops", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  // Sync packed items to database
  const handlePackedItemsChange = async (items: string[]) => {
    if (!currentTrip) return;
    try {
      await apiRequest("PATCH", `/api/travel/trips/${currentTrip.id}`, { packedItems: items });
    } catch (error) {
      console.error("Error syncing packed items:", error);
      // Silently fail - localStorage fallback is already in place
    }
  };

  const confirmArchiveTrip = async () => {
    if (!tripToArchive) return;
    try {
      await archiveTrip(tripToArchive.id, true);
      if (selectedTripId === tripToArchive.id) {
        setSelectedTripId(null);
        clearCurrentTrip();
        setView("list");
      }
      toast({ title: "Adventure archived", description: `${tripToArchive.name} moved to archive. You can restore it anytime.` });
    } catch (error) {
      console.error("Error archiving trip:", error);
      toast({ title: "Couldn't archive adventure", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setTripToArchive(null);
    }
  };

  const handleAddCustomStop = async () => {
    if (!currentTrip || !newStopName.trim()) return;
    
    setIsAddingStop(true);
    try {
      await addStop(currentTrip.id, {
        name: newStopName.trim(),
        stopType: newStopType,
        displayOrder: currentTripStops.length + 1,
        address: newStopAddress.trim() || undefined,
      });
      await fetchTrip(currentTrip.id);
      setNewStopName("");
      setNewStopType("landmark");
      setNewStopAddress("");
      setAddressAutoFilled(false);
      setShowAddStopDialog(false);
      toast({ title: "Stop added", description: `${newStopName.trim()} has been added to your adventure.` });
    } catch (error) {
      console.error("Error adding stop:", error);
      toast({ title: "Couldn't add stop", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsAddingStop(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!currentTrip) return;
    
    setIsCompletingTrip(true);
    setShowTripRecap(true);
    
    try {
      const response = await apiRequest("POST", `/api/travel/trips/${currentTrip.id}/complete`);
      const data = await response.json() as { trip?: TravelTrip; story?: TripStory };
      if (data.story) {
        setTripStory(data.story);
        toast({ title: "Adventure complete!", description: "Your travel story has been created." });
        // Refresh the trip to get updated storySaved flag
        await fetchTrip(currentTrip.id);
      }
    } catch (error) {
      console.error("Error completing trip:", error);
      toast({ title: "Couldn't complete adventure", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsCompletingTrip(false);
    }
  };

  
  const handleStartAdventure = async () => {
    if (!currentTrip) return;
    setIsStartingAdventure(true);
    try {
      await apiRequest("PATCH", `/api/travel/trips/${currentTrip.id}`, {
        status: "active",
        adventureStartedAt: new Date().toISOString()
      });
      await fetchTrip(currentTrip.id);
      toast({ title: "Adventure Started! 🎉", description: "Your journey has officially begun. Have an amazing time!" });
    } catch (error) {
      console.error("Error starting adventure:", error);
      toast({ title: "Couldn't start adventure", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsStartingAdventure(false);
    }
  };

  // Close Adventure - lock the trip and navigate to home page
  const handleCloseAdventure = async () => {
    if (!currentTrip) return;
    
    setIsFinishingAdventure(true);
    
    try {
      // Lock the trip and mark as completed
      await apiRequest("PATCH", `/api/travel/trips/${currentTrip.id}`, {
        status: "completed",
        isLocked: true,
        completedAt: new Date().toISOString()
      });
      
      toast({ title: "Adventure Closed", description: "Your memories are safely stored." });
      
      // Clear selected trip
      setSelectedTripId(null);
      setView("list");
      
      // Refetch trips to update the list
      fetchTrips();
      
      // Navigate to home page
      setLocation("/");
    } catch (error) {
      console.error("Error closing adventure:", error);
      toast({ title: "Couldn't close adventure", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsFinishingAdventure(false);
    }
  };

  const handleViewStory = async () => {
    if (!currentTrip) return;
    
    setShowTripRecap(true);
    
    if (!tripStory || tripStory.tripId !== currentTrip.id) {
      setIsCompletingTrip(true);
      try {
        const response = await apiRequest("GET", `/api/travel/trips/${currentTrip.id}/story`);
        if (response.ok) {
          const story = await response.json() as TripStory;
          if (story && story.storyHtml) {
            setTripStory(story);
          } else {
            // No story exists yet, generate one
            const genResponse = await apiRequest("POST", `/api/travel/trips/${currentTrip.id}/story/regenerate`);
            if (genResponse.ok) {
              const newStory = await genResponse.json() as TripStory;
              setTripStory(newStory);
            }
          }
        } else {
          // Story endpoint failed, try to generate one
          const genResponse = await apiRequest("POST", `/api/travel/trips/${currentTrip.id}/story/regenerate`);
          if (genResponse.ok) {
            const newStory = await genResponse.json() as TripStory;
            setTripStory(newStory);
          }
        }
      } catch (error) {
        console.error("Error loading story, trying to generate:", error);
        // Try to generate a story if fetching failed
        try {
          const genResponse = await apiRequest("POST", `/api/travel/trips/${currentTrip.id}/story/regenerate`);
          if (genResponse.ok) {
            const newStory = await genResponse.json() as TripStory;
            setTripStory(newStory);
          }
        } catch (genError) {
          console.error("Failed to generate story:", genError);
        }
      } finally {
        setIsCompletingTrip(false);
      }
    }
  };

  const handleRegenerateStory = async () => {
    if (!currentTrip) return;
    
    setIsCompletingTrip(true);
    
    try {
      const response = await apiRequest("POST", `/api/travel/trips/${currentTrip.id}/story/regenerate`);
      const story = await response.json() as TripStory;
      if (story) {
        setTripStory(story);
        toast({ title: "Story updated", description: "Your travel story has been regenerated." });
      }
    } catch (error) {
      console.error("Error regenerating story:", error);
      toast({ title: "Couldn't regenerate story", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsCompletingTrip(false);
    }
  };

  const handleSaveStory = async () => {
    const tripToSave = dialogTrip || currentTrip;
    if (!tripToSave) return;
    
    try {
      await apiRequest("PATCH", `/api/travel/trips/${tripToSave.id}`, { storySaved: true });
      // Update local dialog state immediately
      if (dialogTrip) {
        setDialogTrip({ ...dialogTrip, storySaved: true });
      }
      // Refetch the current trip to update context state
      if (currentTrip && currentTrip.id === tripToSave.id) {
        await fetchTrip(tripToSave.id);
      }
      toast({ title: "Story saved!", description: "Your travel story has been saved. You can read it anytime." });
    } catch (error) {
      console.error("Error saving story:", error);
      toast({ title: "Couldn't save story", description: "Something went wrong. Please try again.", variant: "destructive" });
      throw error;
    }
  };

  const handleOpenShareModal = async () => {
    console.log("[Share] Opening share modal for trip:", currentTrip?.id);
    if (!currentTrip) {
      console.warn("[Share] No current trip selected");
      return;
    }
    
    try {
      console.log("[Share] Fetching share status...");
      const response = await apiRequest("GET", `/api/travel/trips/${currentTrip.id}/share`);
      if (response.ok) {
        const existingShare = await response.json();
        console.log("[Share] Existing share:", existingShare);
        setCurrentTripShare(existingShare || null);
      } else {
        console.log("[Share] No existing share found");
        setCurrentTripShare(null);
      }
    } catch (error) {
      console.error("[Share] Error checking share status:", error);
      setCurrentTripShare(null);
    }
    console.log("[Share] Opening modal...");
    setShowShareModal(true);
  };

  const handleShareItinerary = async (data: ShareData): Promise<{ slug: string }> => {
    if (!currentTrip) throw new Error("No trip selected");
    
    const response = await apiRequest("POST", `/api/travel/trips/${currentTrip.id}/share`, data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to share");
    }
    const share = await response.json();
    setCurrentTripShare(share);
    return { slug: share.slug };
  };

  const handleUnshareItinerary = async (): Promise<void> => {
    if (!currentTrip) throw new Error("No trip selected");
    
    const response = await apiRequest("DELETE", `/api/travel/trips/${currentTrip.id}/share`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to unpublish");
    }
    setCurrentTripShare(null);
  };

  const loadAllMoments = async () => {
    if (trips.length === 0) return;
    
    setIsLoadingMoments(true);
    try {
      const momentsByTrip = await Promise.all(
        trips.map(async (trip) => {
          try {
            // Add cache-busting timestamp to ensure fresh data
            const response = await apiRequest("GET", `/api/travel/trips/${trip.id}/moments?_t=${Date.now()}`);
            const moments = await response.json() as TravelMoment[];
            return {
              tripId: trip.id,
              tripName: trip.destination || trip.name,
              moments: moments || []
            };
          } catch {
            return { tripId: trip.id, tripName: trip.destination || trip.name, moments: [] };
          }
        })
      );
      setAllMoments(momentsByTrip.filter(t => t.moments.length > 0));
    } catch (error) {
      console.error("Error loading moments:", error);
    } finally {
      setIsLoadingMoments(false);
    }
  };

  // Reload moments every time the library opens
  useEffect(() => {
    if (showMomentsLibrary && trips.length > 0) {
      loadAllMoments();
    }
  }, [showMomentsLibrary]);

  // Use firstPhotoUrl from trips list (already fetched from server - no extra API calls needed)
  useEffect(() => {
    const photoMap: Record<string, string | null> = {};
    trips.forEach(trip => {
      photoMap[trip.id] = (trip as any).firstPhotoUrl || null;
    });
    setTripFirstPhotos(photoMap);
  }, [trips]);

  useEffect(() => {
    if (trips.length === 0) return;
    const stopsMap: Record<string, TravelStop[]> = {};
    const keepsakeMap: Record<string, string[]> = {};
    
    trips.forEach((trip: any) => {
      const stops: TravelStop[] = trip.stops || [];
      stopsMap[trip.id] = stops;
      
      const visitedStops = stops.filter((s: TravelStop) => s.isVisited);
      const emojis = visitedStops.map((s: TravelStop, idx: number) => 
        getKeepsakeForStop(s.name, s.stopType || 'landmark', idx).emoji
      );
      keepsakeMap[trip.id] = emojis.slice(0, 3);
    });
    
    setTripStopsMap(stopsMap);
    setTripKeepsakeEmojis(keepsakeMap);
  }, [trips]);

  // Demo trip handlers
  const handleStartDemoTrip = () => {
    setShowDemoTrip(true);
  };

  // Track if demo was completed in THIS session (not from localStorage)
  const [demoJustCompletedThisSession, setDemoJustCompletedThisSession] = useState(false);
  
  const handleDemoTripComplete = () => {
    try {
      localStorage.setItem('geoadventures-demo-completed', 'true');
    } catch (e) {
      console.error('Failed to save demo completion:', e);
    }
    setDemoTripCompleted(true);
    setDemoJustCompletedThisSession(true);
    if (!hasSeenAnchoring()) setShowAnchoringAfterCreate(true);
  };

  const triggerSignUpFlow = () => {
    if (shouldShowLaunchPromo()) {
      setShowLaunchPromo(true);
    } else {
      setShowSignUpPrompt(true);
    }
  };

  const handleExitDemoTrip = () => {
    setShowDemoTrip(false);
    
    // Show signup only if user actually engaged (completed a stop, played a game, etc.)
    // Not just because they opened and closed the demo
    const hasEngaged = (() => { try { return localStorage.getItem('geoadventures-user-engaged') === 'true'; } catch(e) { return false; } })();
    if (!user && hasEngaged && !signUpPromptDismissedThisSession) {
      setTimeout(() => {
        triggerSignUpFlow();
      }, 300);
    }
  };

  const handleDemoCreateTrip = () => {
    setShowDemoTrip(false);
    handleOpenCreateDialog();
  };

  // Determine if we should show the demo hero:
  // - Only for NON-LOGGED-IN users who haven't completed the demo
  // - Logged-in users always see the regular TravelHero (with "first" state if no trips)
  // Non-logged-in users always see the marketing landing page (DemoTripHero)
  // Logged-in users with no trips see TravelHero "first" state
  const shouldShowDemoHero = !isLoading && !user;

  // Track if we already auto-opened the dialog for this session
  const [autoDialogOpened, setAutoDialogOpened] = useState(false);
  
  // Auto-open create dialog for new users without trips (skip intro page)
  // Only fires once per session, and only if there's pending trip data to restore
  useEffect(() => {
    if (!isLoading && trips.length === 0 && user && !showDemoTrip && !autoDialogOpened && pendingDataRestored) {
      // Only auto-open if we restored pending data (user was in the middle of creating)
      setAutoDialogOpened(true);
    }
  }, [isLoading, trips.length, user, showDemoTrip, autoDialogOpened, pendingDataRestored]);

  // If showing demo trip experience, render that instead
  if (showDemoTrip) {
    return (
      <DemoTripExperience
        onComplete={handleDemoTripComplete}
        onExit={handleExitDemoTrip}
        onCreateRealTrip={handleDemoCreateTrip}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-slate-900">
      <TravelModeReminders explorerId={activeExplorer?.id} />

      {/* Guest banner — shown when user continues without saving */}
      {showGuestBanner && !user && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md" data-testid="guest-banner">
          <p className="text-sm font-medium flex-1">Your trip isn't saved yet — sign up to keep your details.</p>
          <button
            onClick={() => triggerSignUpFlow()}
            className="flex-shrink-0 bg-white text-amber-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-amber-50 transition-colors"
            data-testid="button-guest-banner-signup"
          >
            Sign up
          </button>
          <button onClick={() => setShowGuestBanner(false)} className="flex-shrink-0 text-white/80 hover:text-white" data-testid="button-guest-banner-dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}


      {/* Phase 1 state resolver — routes to correct screen on hub entry */}
      <TripEntryRouter />
      <GeoAdventuresAnchoring 
        isOpen={!hasDismissedWelcome && !isLoading && showAnchoringAfterCreate} 
        onClose={() => setHasDismissedWelcome(true)} 
      />
      {view === "trip" && selectedTripId && <TripDetailsTooltips />}
      <div className="max-w-2xl mx-auto p-4 pb-36">
        <header className="flex items-center justify-between mb-6">
          {view === "trip" ? (
            <Button 
              variant="ghost" 
              className="p-2"
              onClick={() => {
                setView("list");
                setSelectedTripId(null);
                clearCurrentTrip();
              }}
              data-testid="button-back"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
          ) : (
            <Sheet open={showMenuSheet} onOpenChange={setShowMenuSheet}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="p-2"
                  data-testid="button-menu"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Plane className="w-5 h-5 text-orange-500" />
                    GeoAdventures
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-base"
                    onClick={() => {
                      setShowMenuSheet(false);
                      setLocation("/play-games");
                    }}
                    data-testid="menu-geogames"
                  >
                    <Gamepad2 className="w-5 h-5 mr-3 text-green-500" />
                    GeoGames
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-base"
                    onClick={() => {
                      setShowMenuSheet(false);
                      setLocation("/browse-itineraries");
                    }}
                    data-testid="menu-browse-itineraries"
                  >
                    <Globe className="w-5 h-5 mr-3 text-blue-500" />
                    Community Adventures
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-base"
                    onClick={() => {
                      setShowMenuSheet(false);
                      setLocation("/blog");
                    }}
                    data-testid="menu-blog"
                  >
                    <BookOpen className="w-5 h-5 mr-3 text-orange-500" />
                    Family Travel Blog
                  </Button>
                  <PrivacySettingsMenu onClose={() => setShowMenuSheet(false)} variant="geoadventures" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-base"
                    onClick={() => {
                      requestAccess(() => {
                        setShowMenuSheet(false);
                        setLocation("/reviews");
                      });
                    }}
                    data-testid="menu-review-us"
                  >
                    <Star className="w-5 h-5 mr-3 text-amber-500" />
                    Support
                  </Button>
                  <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 text-base text-red-600 dark:text-red-400"
                      onClick={async () => {
                        setShowMenuSheet(false);
                        try {
                          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                        } catch {
                        }
                        window.location.href = '/geoadventures';
                      }}
                      data-testid="menu-exit"
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Logout
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          )}
          
          <a href="/geoadventures-landing" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Plane className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl font-heading text-slate-800 dark:text-white">GeoAdventures</h1>
          </a>
          
          {view === "trip" ? (
            <div className="w-10" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-sm font-medium bg-white dark:bg-slate-700 px-3 py-1.5 rounded-full shadow-sm text-slate-700 dark:text-slate-200"
                  data-testid="button-account"
                >
                  {user?.firstName || user?.email?.split('@')[0] || 'Account'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => setShowAccountSettings(true)}
                  data-testid="menu-account-settings"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    window.location.href = "/?openPassport=true&tab=kit";
                  }}
                  data-testid="menu-explorer-kit"
                >
                  <Backpack className="w-4 h-4 mr-2" />
                  Explorer Kit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                      window.location.href = '/geoadventures';
                    } catch {
                      window.location.href = '/geoadventures';
                    }
                  }}
                  className="text-red-600"
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="ghost" 
              className="text-sm font-medium bg-white dark:bg-slate-700 px-3 py-1.5 rounded-full shadow-sm text-slate-700 dark:text-slate-200"
              onClick={() => setShowLogin(true)}
              data-testid="button-account-login"
            >
              Account
            </Button>
          )}
        </header>


        <AnimatePresence mode="wait">
          {view === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-5"
            >
              {shouldShowDemoHero && landingTab === 'trips' && (
                <DemoTripHero
                  onTrySample={handleStartDemoTrip}
                  onCreateTrip={handleOpenCreateDialog}
                  onCreateVirtual={handleOpenHomeAdventureDialog}
                  buildLocked={paywallEnabled && !isFreeLimitsPaid && !isAdmin}
                  onSignUp={() => setShowLogin(true)}
                />
              )}

              {!shouldShowDemoHero && landingTab === 'trips' && (() => {
                const heroTrip = selectActiveAdventure || heroContext.trip;
                const heroStops = heroTrip ? (tripStopsMap[heroTrip.id] || []) : [];
                const visitedCount = heroStops.filter(s => s.isVisited).length;
                const totalCount = heroStops.length;
                const nextStop = heroStops.find(s => !s.isVisited);
                const heroImage = heroTrip ? (tripFirstPhotos[heroTrip.id] || getStockImageForDestination(heroTrip.city, heroTrip.country || undefined, heroTrip.destination)) : null;
                const lastExplored = heroTrip?.updatedAt ? (() => {
                  const diff = Math.floor((Date.now() - new Date(heroTrip.updatedAt!).getTime()) / (1000 * 60 * 60 * 24));
                  if (diff === 0) return 'today';
                  if (diff === 1) return 'yesterday';
                  return `${diff} days ago`;
                })() : null;
                const cityDisplay = heroTrip ? `${heroTrip.city || heroTrip.destination}${heroTrip.country ? `, ${heroTrip.country}` : ''}` : '';

                if (!heroTrip) {
                  if (isLoading) {
                    return (
                      <div className="flex items-center justify-center py-16">
                        <div className="animate-spin w-8 h-8 rounded-full border-4 border-orange-100 border-t-orange-400" />
                      </div>
                    );
                  }
                  const quickCities = [
                    { name: 'Chicago', country: 'United States' },
                    { name: 'Orlando', country: 'United States' },
                    { name: 'London', country: 'United Kingdom' },
                  ];
                  const cityPhotoMap: Record<string, { url: string; label: string }[]> = {
                    Chicago: [
                      { url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&h=130&fit=crop', label: 'Landmark' },
                      { url: 'https://images.unsplash.com/photo-1555169062-013468b47731?w=200&h=130&fit=crop', label: 'Zoo' },
                      { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=130&fit=crop', label: 'Food' },
                      { url: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=200&h=130&fit=crop', label: 'Museum' },
                      { url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=130&fit=crop', label: 'Park' },
                      { url: 'https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=200&h=130&fit=crop', label: 'Playground' },
                    ],
                    Orlando: [
                      { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=130&fit=crop', label: 'Beach' },
                      { url: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=200&h=130&fit=crop', label: 'Theme Park' },
                      { url: 'https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=200&h=130&fit=crop', label: 'Playground' },
                      { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=130&fit=crop', label: 'Food' },
                      { url: 'https://images.unsplash.com/photo-1555169062-013468b47731?w=200&h=130&fit=crop', label: 'Zoo' },
                      { url: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=200&h=130&fit=crop', label: 'Museum' },
                    ],
                    London: [
                      { url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=200&h=130&fit=crop', label: 'Landmark' },
                      { url: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=200&h=130&fit=crop', label: 'Museum' },
                      { url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=130&fit=crop', label: 'Park' },
                      { url: 'https://images.unsplash.com/photo-1555169062-013468b47731?w=200&h=130&fit=crop', label: 'Zoo' },
                      { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=130&fit=crop', label: 'Food' },
                      { url: 'https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=200&h=130&fit=crop', label: 'Playground' },
                    ],
                  };
                  const defaultPhotos = [
                    { url: 'https://images.unsplash.com/photo-1555169062-013468b47731?w=200&h=130&fit=crop', label: 'Zoo' },
                    { url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=130&fit=crop', label: 'Park' },
                    { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=130&fit=crop', label: 'Food' },
                    { url: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=200&h=130&fit=crop', label: 'Museum' },
                    { url: 'https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=200&h=130&fit=crop', label: 'Playground' },
                    { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=130&fit=crop', label: 'Beach' },
                  ];
                  const cityChipMap: Record<string, { emoji: string; label: string }[]> = {
                    Chicago: [
                      { emoji: '🦁', label: 'Zoo' },
                      { emoji: '🏛️', label: 'Museum' },
                      { emoji: '🍕', label: 'Lunch' },
                      { emoji: '🌳', label: 'Park' },
                      { emoji: '🏙️', label: 'Landmark' },
                    ],
                    Orlando: [
                      { emoji: '🏖️', label: 'Beach' },
                      { emoji: '🎢', label: 'Theme Park' },
                      { emoji: '🛝', label: 'Playground' },
                      { emoji: '🍔', label: 'Food' },
                      { emoji: '🦁', label: 'Zoo' },
                    ],
                    London: [
                      { emoji: '🏰', label: 'Landmark' },
                      { emoji: '🎨', label: 'Museum' },
                      { emoji: '🌳', label: 'Park' },
                      { emoji: '🦁', label: 'Zoo' },
                      { emoji: '🍽️', label: 'Food' },
                    ],
                  };
                  const defaultChips = [
                    { emoji: '🐒', label: 'Zoo' },
                    { emoji: '🌳', label: 'Park' },
                    { emoji: '🍔', label: 'Lunch' },
                    { emoji: '🎨', label: 'Museum' },
                  ];
                  const activePhotos = emptyStateCity ? (cityPhotoMap[emptyStateCity.name] ?? defaultPhotos) : defaultPhotos;
                  const activeChips = emptyStateCity ? (cityChipMap[emptyStateCity.name] ?? defaultChips) : defaultChips;
                  const scrollPhotos = [...activePhotos, ...activePhotos];
                  const handleBuildTrip = () => {
                    const params = emptyStateCity
                      ? `?city=${encodeURIComponent(emptyStateCity.name)}&country=${encodeURIComponent(emptyStateCity.country)}`
                      : '';
                    setLocation(`/build-adventure${params}`);
                  };
                  return (
                    <div data-testid="hero-empty" style={{ paddingBottom: 160 }}>

                      {/* ── TITLE (26/600, lh 1.3, 90% width) ── */}
                      <h2
                        className="text-slate-800 dark:text-white"
                        style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.3, maxWidth: '90%', marginBottom: 24 }}
                      >
                        {emptyStateCity
                          ? `Let's plan a day your kids will love in ${emptyStateCity.name}`
                          : "Let's plan a day your kids will actually enjoy"}
                      </h2>

                      {/* ── DESTINATION PICKER (title→label = 24px, label→chips = 12px) ── */}
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.2px', color: '#6B7280', marginBottom: 12 }}>
                          Where are you going?
                        </p>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ paddingBottom: 4 }}>
                          {quickCities.map((city, cityIdx) => {
                            const isSelected = emptyStateCity?.name === city.name;
                            const isHighlighted = !emptyStateCity && highlightedCityIdx === cityIdx;
                            return (
                            <div key={city.name} className="relative flex-shrink-0">
                              <button
                                onClick={() => setEmptyStateCity(isSelected ? null : city)}
                                className={`relative rounded-full text-sm font-semibold border transition-all active:scale-95 ${
                                  isSelected
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 shadow-sm'
                                }`}
                                style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 10, paddingBottom: 10 }}
                                data-testid={`button-city-${city.name.toLowerCase()}`}
                              >
                                {city.name}
                              </button>
                              {isHighlighted && (
                                <svg
                                  key={`ring-${highlightedCityIdx}`}
                                  viewBox="0 0 100 40"
                                  preserveAspectRatio="none"
                                  className="absolute inset-0 w-full h-full overflow-visible"
                                  style={{ pointerEvents: 'none' }}
                                >
                                  <rect
                                    x="1.5"
                                    y="1.5"
                                    width="97"
                                    height="37"
                                    rx="18.5"
                                    fill="none"
                                    stroke="#F59E0B"
                                    strokeWidth="2.5"
                                    pathLength="220"
                                    strokeDasharray="220 10000"
                                    strokeDashoffset="220"
                                    style={{ animation: 'drawPillBorder 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}
                                  />
                                </svg>
                              )}
                            </div>
                            );
                          })}
                          <button
                            onClick={() => setLocation('/build-adventure')}
                            className="flex-shrink-0 rounded-full text-sm font-semibold border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-transparent transition-all active:scale-95"
                            style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 10, paddingBottom: 10 }}
                            data-testid="button-city-let-me-choose"
                          >
                            Let me choose
                          </button>
                        </div>
                        {/* chips → "Popular" = 24px; "Popular" → images = 12px (inside locked section) */}
                        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 24 }}>Popular with families like yours</p>
                      </div>

                      {/* ── LOCKED PREVIEW — overlay when no city selected ── */}
                      <div className="relative" style={{ marginTop: 12 }}>
                        {!emptyStateCity && (
                          <div
                            className="absolute z-10 transition-opacity duration-500"
                            style={{
                              top: 0,
                              bottom: 0,
                              left: -16,
                              right: -16,
                              background: 'rgba(245,242,237,0.88)',
                              backdropFilter: 'blur(3px)',
                            }}
                          />
                        )}

                        {/* Example day label (12px, muted, normal weight) */}
                        {emptyStateCity && (
                          <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 400, marginBottom: 12 }}>
                            Example day in {emptyStateCity.name}
                          </p>
                        )}
                        {!emptyStateCity && <div style={{ height: 24 }} />}

                        {/* Photo strip */}
                        <div className="overflow-hidden -mx-4 px-4">
                          <div
                            className="flex"
                            style={{ gap: 10, width: 'max-content', animation: 'photoScroll 22s linear infinite' }}
                          >
                            {scrollPhotos.map(({ url, label }, idx) => (
                              <div
                                key={`${label}-${idx}`}
                                className="flex-shrink-0 relative rounded-2xl overflow-hidden"
                                style={{ width: 104, height: 80, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
                              >
                                <img src={url} alt={label} className="w-full h-full object-cover" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                                <span className="absolute bottom-1.5 left-0 right-0 text-center text-white text-[10px] font-bold tracking-wide drop-shadow-sm">{label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Flow chips (images → chips = 24px) */}
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ marginTop: 24 }}>
                          {activeChips.map((chip, i) => (
                            <span key={chip.label} className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-700 border border-amber-200 dark:border-amber-700 shadow-sm rounded-full text-slate-700 dark:text-slate-200" style={{ fontSize: 12, fontWeight: 600, paddingLeft: 10, paddingRight: 10, paddingTop: 4, paddingBottom: 4 }}>
                                {chip.emoji} {chip.label}
                              </span>
                              {i < activeChips.length - 1 && <ChevronRight className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                            </span>
                          ))}
                        </div>

                        {/* Checkmarks (flow → checks = 24px; each row = 12px) */}
                        <div style={{ marginTop: 24 }}>
                          {['Balanced pace', 'Kid-friendly stops', 'Food included'].map((item, i, arr) => (
                            <div
                              key={item}
                              className="flex items-center"
                              style={{ gap: 8, marginBottom: i < arr.length - 1 ? 12 : 0 }}
                            >
                              <span className="text-green-500 font-bold leading-none" style={{ opacity: 0.8 }}>✔</span>
                              <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4, color: '#6B7280' }}>{item}</span>
                            </div>
                          ))}
                          <p style={{ marginTop: 14, fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', lineHeight: 1.5 }}>
                            Starts easy → builds energy → ends with a win
                          </p>
                        </div>
                      </div>

                      {/* ── DIVIDER (checks→divider = 32px, divider→CTA = 24px) ── */}
                      <div style={{ marginTop: 32, marginBottom: 24, height: 1, backgroundColor: '#E5E7EB' }} />

                      {/* ── CTA ── */}
                      <button
                        onClick={handleBuildTrip}
                        className="w-full text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #E8962F 0%, #D4872B 100%)', fontSize: 16, fontWeight: 700, paddingTop: 16, paddingBottom: 16 }}
                        data-testid="button-hero-create"
                      >
                        {emptyStateCity ? `Plan ${emptyStateCity.name} trip` : 'Start planning'}
                      </button>
                      {/* CTA → subtext = 12px */}
                      <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 12 }}>Takes less than a minute</p>
                    </div>
                  );
                }

                return (
                  <div data-testid="hero-active">
                    <div className="rounded-[24px] overflow-hidden shadow-lg relative" style={{ minHeight: '240px' }}>
                      {heroImage && (
                        <img
                          src={heroImage}
                          alt={cityDisplay}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                      <div className="absolute top-3 right-3 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 bg-black/30 backdrop-blur-sm rounded-full text-white/80 hover:text-white" data-testid="menu-hero-trip">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {heroTrip.adventureContext !== 'home' && (
                              <DropdownMenuItem onClick={() => {
                                if (heroTrip) {
                                  setDialogTrip(heroTrip);
                                  setDialogDataLoading(true);
                                  setShowTripRecap(true);
                                  fetchDialogTripData(heroTrip.id);
                                }
                              }}>
                                <BookOpen className="w-4 h-4 mr-2" /> View Story
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={async () => {
                              if (heroTrip) {
                                await fetchTrip(heroTrip.id);
                                setMapInitialView('trip');
                                setShowTravelMap(true);
                              }
                            }}>
                              <Map className="w-4 h-4 mr-2" /> View Map
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              if (heroTrip) {
                                setDialogTrip(heroTrip);
                                setDialogTripStops([]);
                                fetchDialogTripData(heroTrip.id);
                                setShowTripPreview(true);
                              }
                            }} data-testid="menu-preview-hero-trip">
                              <Eye className="w-4 h-4 mr-2" /> Preview My Trip
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-amber-700"
                              onClick={() => {
                                if (heroTrip) setTripToArchive({ id: heroTrip.id, name: heroTrip.name || cityDisplay });
                              }}
                            >
                              <Archive className="w-4 h-4 mr-2" /> Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="relative p-6 flex flex-col justify-end h-full" style={{ minHeight: '240px' }}>
                        <p className="text-amber-200 text-xs font-semibold tracking-wider uppercase mb-1">Your Family Adventure</p>
                        <h2 className="text-2xl font-bold text-white mb-0.5" data-testid="hero-trip-name">{heroTrip.name || cityDisplay}</h2>
                        <p className="text-white/70 text-sm mb-1">{cityDisplay}</p>
                        <p className="text-white/80 text-sm mb-3">{visitedCount} of {totalCount} shared discoveries</p>
                        {lastExplored && (
                          <div className="flex items-center gap-1.5 mb-4">
                            <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white/90 text-xs px-3 py-1 rounded-full">
                              <Calendar className="w-3 h-3" />
                              Last explored together · {lastExplored}
                            </span>
                          </div>
                        )}
                        {nextStop && (
                          <div className="mb-4">
                            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white/90 text-xs px-3 py-1 rounded-full">
                              Next Stop: {nextStop.name} →
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            if (heroTrip) {
                              const extHeroTrip = heroTrip as ExtendedTrip;
                              if (isNonDemoTrip(extHeroTrip)) {
                                setInternalNavToAdventureTrip(extHeroTrip.id);
                                setLocation(isTravelTrip(extHeroTrip) ? parentPlanUrl(extHeroTrip) : `/adventure/${extHeroTrip.id}/kid`);
                              } else {
                                setSelectedTripId(extHeroTrip.id);
                              }
                            }
                          }}
                          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 px-6 rounded-full text-base shadow-lg transition-all w-fit"
                          data-testid="button-hero-continue"
                        >
                          Continue Together →
                        </button>
                      </div>
                    </div>
                    {otherAdventureCount > 0 && (
                      <button
                        onClick={() => setShowSwitchAdventureSheet(true)}
                        className="text-sm text-orange-600 dark:text-orange-400 font-medium mt-3 mx-auto block hover:underline"
                        data-testid="button-switch-trip"
                      >
                        Switch trip →
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Virtual adventure cap gate */}
              {showVirtualCapGate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.6)" }} data-testid="virtual-cap-gate">
                  <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                    <div className="px-6 pt-8 pb-5 text-center" style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)" }}>
                      <div className="text-4xl mb-3">🌍</div>
                      <h2 className="text-xl font-black text-white leading-tight mb-1">You've explored 2 virtual adventures</h2>
                      <p className="text-sm text-blue-200 leading-snug">
                        Unlock a real trip or get GeoPass to keep exploring.
                      </p>
                    </div>
                    <div className="px-6 py-5 space-y-3">
                      <button
                        onClick={() => { setShowVirtualCapGate(false); setLandingTab('trips'); }}
                        className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
                        style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
                        data-testid="button-virtual-cap-unlock-trip"
                      >
                        Unlock a real trip
                      </button>
                      <button
                        onClick={() => setShowVirtualCapGate(false)}
                        className="w-full py-2 text-slate-400 text-sm hover:text-slate-600 transition-colors"
                        data-testid="button-virtual-cap-dismiss"
                      >
                        Maybe later
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showHomeAdventureDialog && (
                <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900" data-testid="virtual-adventure-sheet">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-sky-500" />
                      <h2 className="text-lg font-bold text-slate-800 dark:text-white">Start a Virtual Adventure</h2>
                    </div>
                    <button 
                      onClick={() => {
                        setShowHomeAdventureDialog(false);
                        setHomeCustomCity(null);
                        setHomePlaceSearch('');
                        setHomeSelectedCategory(null);
                        setHomeSelectedPlaces([]);
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
                      data-testid="button-close-virtual-adventure"
                    >
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Explore any city in the world and discover 5 incredible places, stories, and surprises.
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      🌍 Over 1,000 cities waiting to be discovered
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto px-4 pb-24">
                    <HomeAdventurePlacePicker
                      selectedPlaces={homeSelectedPlaces}
                      onSelectedPlacesChange={setHomeSelectedPlaces}
                      searchQuery={homePlaceSearch}
                      onSearchQueryChange={setHomePlaceSearch}
                      selectedCategory={homeSelectedCategory}
                      onSelectedCategoryChange={setHomeSelectedCategory}
                      customCity={homeCustomCity}
                      onCustomCityChange={setHomeCustomCity}
                      onInstantStart={(cityId) => {
                        setHomeSelectedPlaces([cityId]);
                        setHomeCustomCity(null);
                        setTimeout(() => handleCreateHomeAdventure(), 50);
                      }}
                      onInstantStartCustom={(cityName) => {
                        setHomeSelectedPlaces([]);
                        const customData = { city: cityName, country: '' };
                        setHomeCustomCity(customData);
                        setTimeout(() => handleCreateHomeAdventure(customData), 50);
                      }}
                    />
                  </div>
                  
                  <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 border-t border-slate-200 dark:border-slate-700 z-50">
                    {(() => {
                      const hasSelection = homeSelectedPlaces.length === 1 || !!homeCustomCity;
                      return (
                        <Button 
                          onClick={() => handleCreateHomeAdventure()}
                          disabled={!hasSelection || isCreatingHomeAdventure}
                          className="w-full h-14 text-base font-bold bg-sky-500 hover:bg-sky-600 rounded-2xl shadow-md"
                          data-testid="button-confirm-home-adventure"
                        >
                          {isCreatingHomeAdventure ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Generating 5 stops...
                            </>
                          ) : (
                            "Start Exploring"
                          )}
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              )}

              {trips.length > 0 && landingTab === 'trips' && (() => {
                const heroTripId = selectActiveAdventure?.id;
                const nonHeroTrips = sortedTrips.filter(t => t.id !== heroTripId && t.adventureContext !== 'home' && !(t as any).isArchived);

                const inProgressTrips = nonHeroTrips.filter(t => {
                  const state = getTripState(t);
                  if (state === 'completed') return false;
                  const stops = tripStopsMap[t.id] || [];
                  const visited = stops.filter(s => s.isVisited).length;
                  return visited > 0;
                });

                const plannedTrips = nonHeroTrips.filter(t => {
                  const state = getTripState(t);
                  if (state === 'completed') return false;
                  const stops = tripStopsMap[t.id] || [];
                  const visited = stops.filter(s => s.isVisited).length;
                  return visited === 0;
                });

                const completedTrips = nonHeroTrips.filter(t => getTripState(t) === 'completed');
                const archivedTrips = safeTrips.filter(t => (t as any).isArchived && t.adventureContext !== 'home');

                const hasAnySubsection = inProgressTrips.length > 0 || plannedTrips.length > 0 || completedTrips.length > 0 || archivedTrips.length > 0;
                if (!hasAnySubsection && !isLoading) return null;

                const renderTripPill = (trip: typeof trips[0]) => {
                  const tripIsHome = trip.adventureContext === 'home';
                  return tripIsHome ? (
                    <span className="inline-flex items-center gap-1 bg-gray-600/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" data-testid="pill-virtual">
                      <Home className="w-3 h-3" /> Virtual
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-700/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" data-testid="pill-travel">
                      <Plane className="w-3 h-3" /> Travel
                    </span>
                  );
                };

                const renderTripMenu = (trip: typeof trips[0]) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 bg-black/30 backdrop-blur-sm rounded-full text-white/80 hover:text-white" data-testid={`menu-trip-${trip.id}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {trip.adventureContext !== 'home' && (
                        <DropdownMenuItem onClick={() => {
                          const tripData = trips.find(t => t.id === trip.id);
                          if (tripData) {
                            setDialogTrip(tripData);
                            setDialogDataLoading(true);
                            setShowTripRecap(true);
                            fetchDialogTripData(trip.id);
                          }
                        }}>
                          <BookOpen className="w-4 h-4 mr-2" /> View Story
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={async () => {
                        await fetchTrip(trip.id);
                        setMapInitialView('trip');
                        setShowTravelMap(true);
                      }}>
                        <Map className="w-4 h-4 mr-2" /> View Map
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setDialogTrip(trip);
                        setDialogTripStops([]);
                        fetchDialogTripData(trip.id);
                        setShowTripPreview(true);
                      }} data-testid={`menu-preview-trip-${trip.id}`}>
                        <Eye className="w-4 h-4 mr-2" /> Preview My Trip
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-amber-700"
                        onClick={() => setTripToArchive({ id: trip.id, name: trip.name || trip.destination })}
                        data-testid={`menu-archive-trip-${trip.id}`}
                      >
                        <Archive className="w-4 h-4 mr-2" /> Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );

                const navigateToTrip = (trip: typeof trips[0]) => {
                  const extTrip = trip as ExtendedTrip;
                  if (isNonDemoTrip(extTrip)) {
                    setInternalNavToAdventureTrip(extTrip.id);
                    setLocation(isTravelTrip(extTrip) ? parentPlanUrl(extTrip) : `/adventure/${extTrip.id}/kid`);
                  } else {
                    setSelectedTripId(extTrip.id);
                  }
                };

                return (
                  <div className="space-y-6" data-testid="adventures-section">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Your Adventures</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Every trip becomes a shared story.</p>
                      </div>
                      <span className="text-sm text-slate-400 dark:text-slate-500">{sortedTrips.filter(t => t.adventureContext !== 'home').length} total</span>
                    </div>

                    {isLoading ? (
                      <div className="py-12">
                        <GlobeLoader message="Loading your adventures..." />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {inProgressTrips.length > 0 && (
                          <div className="space-y-3" data-testid="section-in-progress">
                            <div>
                              <h4 className="font-semibold text-base text-slate-700 dark:text-slate-200">In Progress</h4>
                              <p className="text-xs text-slate-400 dark:text-slate-500">Pick up where you left off</p>
                            </div>
                            <div
                              className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory travel-games-scroll"
                              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                            >
                              {inProgressTrips.map((trip) => {
                                const stops = tripStopsMap[trip.id] || [];
                                const visited = stops.filter(s => s.isVisited).length;
                                const total = stops.length;
                                const tripImage = tripFirstPhotos[trip.id] || getStockImageForDestination(trip.city, trip.country || undefined, trip.destination);

                                return (
                                  <div
                                    key={trip.id}
                                    className="snap-start shrink-0 w-[75vw] max-w-[320px] rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                    data-testid={`adventure-card-${trip.id}`}
                                  >
                                    <div className="relative h-[144px]">
                                      <img src={tripImage} alt={trip.name || trip.destination} className="absolute inset-0 w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                                      <div className="absolute top-3 left-3">{renderTripPill(trip)}</div>
                                      <div className="absolute top-2 right-2">{renderTripMenu(trip)}</div>
                                      <div className="absolute bottom-3 left-4 right-4">
                                        <h4 className="font-bold text-white text-sm leading-tight drop-shadow-sm">{trip.name || trip.destination}</h4>
                                      </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {visited} of {total} discovered
                                      </div>
                                      <button
                                        onClick={() => navigateToTrip(trip)}
                                        className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors"
                                        data-testid={`button-open-trip-${trip.id}`}
                                      >
                                        Resume →
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {plannedTrips.length > 0 && (
                          <div className="space-y-3" data-testid="section-planned">
                            <div>
                              <h4 className="font-semibold text-base text-slate-700 dark:text-slate-200">Up Next</h4>
                              <p className="text-xs text-slate-400 dark:text-slate-500">Ready whenever you are</p>
                            </div>
                            <div className="space-y-3">
                              {plannedTrips.map((trip) => {
                                const tripImage = tripFirstPhotos[trip.id] || getStockImageForDestination(trip.city, trip.country || undefined, trip.destination);

                                return (
                                  <div
                                    key={trip.id}
                                    className="rounded-[18px] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                    data-testid={`adventure-card-${trip.id}`}
                                  >
                                    <div className="relative h-[110px]">
                                      <img src={tripImage} alt={trip.name || trip.destination} className="absolute inset-0 w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                                      <div className="absolute top-3 left-3">{renderTripPill(trip)}</div>
                                      <div className="absolute top-2 right-2">{renderTripMenu(trip)}</div>
                                      <div className="absolute bottom-3 left-4 right-4">
                                        <h4 className="font-bold text-white text-sm leading-tight drop-shadow-sm">{trip.name || trip.destination}</h4>
                                      </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                                      <span className="text-xs text-slate-400 dark:text-slate-500">Not started yet</span>
                                      <button
                                        onClick={() => navigateToTrip(trip)}
                                        className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors"
                                        data-testid={`button-open-trip-${trip.id}`}
                                      >
                                        Start →
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {completedTrips.length > 0 && (
                          <div className="space-y-3" data-testid="section-completed">
                            <button
                              onClick={() => setShowCompletedTrips(!showCompletedTrips)}
                              className="w-full flex items-center justify-between py-2 group"
                              data-testid="button-toggle-completed"
                            >
                              <div>
                                <h4 className="font-semibold text-base text-slate-700 dark:text-slate-200 text-left">Completed ({completedTrips.length})</h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 text-left">Relive past trips</p>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showCompletedTrips ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {showCompletedTrips && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden"
                                >
                                  <div className="space-y-2.5">
                                    {completedTrips.map((trip) => {
                                      const tripImage = tripFirstPhotos[trip.id] || getStockImageForDestination(trip.city, trip.country || undefined, trip.destination);

                                      return (
                                        <div
                                          key={trip.id}
                                          className="rounded-[14px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow"
                                          data-testid={`adventure-card-${trip.id}`}
                                        >
                                          <div className="relative h-[80px]">
                                            <img src={tripImage} alt={trip.name || trip.destination} className="absolute inset-0 w-full h-full object-cover saturate-[0.6] brightness-95" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
                                            <div className="absolute top-2 left-2.5 flex items-center gap-1.5">
                                              {renderTripPill(trip)}
                                            </div>
                                            <div className="absolute top-1.5 right-1.5">{renderTripMenu(trip)}</div>
                                            <div className="absolute bottom-2 left-3 right-3">
                                              <h4 className="font-semibold text-white text-sm leading-tight drop-shadow-sm">{trip.name || trip.destination}</h4>
                                            </div>
                                          </div>
                                          <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                              <Check className="w-3 h-3" /> Completed
                                            </div>
                                            <button
                                              onClick={() => navigateToTrip(trip)}
                                              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors"
                                              data-testid={`button-open-trip-${trip.id}`}
                                            >
                                              Revisit →
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {true && (
                          <div className="mt-1">
                            <button
                              onClick={() => archivedTrips.length > 0 && setShowArchivedTrips(!showArchivedTrips)}
                              className={`w-full flex items-center justify-between py-2 group ${archivedTrips.length === 0 ? 'cursor-default' : ''}`}
                              data-testid="button-toggle-archived"
                            >
                              <div>
                                <h4 className={`font-semibold text-base text-left ${archivedTrips.length > 0 ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>Archived ({archivedTrips.length})</h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 text-left">{archivedTrips.length > 0 ? 'Hidden from main view' : 'Use ⋮ menu on a trip to archive it'}</p>
                              </div>
                              {archivedTrips.length > 0 && (
                                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showArchivedTrips ? 'rotate-180' : ''}`} />
                              )}
                            </button>
                            <AnimatePresence>
                              {showArchivedTrips && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden"
                                >
                                  <div className="space-y-2.5 pb-2">
                                    {archivedTrips.map((trip) => {
                                      const tripImage = tripFirstPhotos[trip.id] || getStockImageForDestination(trip.city, trip.country || undefined, trip.destination);
                                      return (
                                        <div
                                          key={trip.id}
                                          className="rounded-[14px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] opacity-75"
                                          data-testid={`archived-card-${trip.id}`}
                                        >
                                          <div className="relative h-[80px]">
                                            <img src={tripImage} alt={trip.name || trip.destination} className="absolute inset-0 w-full h-full object-cover saturate-0 brightness-90" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
                                            <div className="absolute top-2 left-2.5">
                                              <span className="inline-flex items-center gap-1 bg-slate-600/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                <Archive className="w-3 h-3" /> Archived
                                              </span>
                                            </div>
                                            <div className="absolute bottom-2 left-3 right-3">
                                              <h4 className="font-semibold text-white text-sm leading-tight drop-shadow-sm">{trip.name || trip.destination}</h4>
                                            </div>
                                          </div>
                                          <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 flex items-center justify-between">
                                            <button
                                              onClick={() => setTripToDelete({ id: trip.id, name: trip.name || trip.destination })}
                                              className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
                                              data-testid={`button-delete-trip-${trip.id}`}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              Delete
                                            </button>
                                            <button
                                              onClick={async () => {
                                                await archiveTrip(trip.id, false);
                                                toast({ title: "Restored", description: `${trip.name || trip.destination} is back in your adventures.` });
                                              }}
                                              className="text-xs font-medium text-orange-500 hover:text-orange-700 transition-colors"
                                              data-testid={`button-restore-trip-${trip.id}`}
                                            >
                                              Restore →
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {!shouldShowDemoHero && landingTab === 'trips' && (
                <TravelGeoBuddyNudge
                  message={geoBuddyMessage}
                  triggerKey={`travel-home-${heroContext.type}`}
                  delay={10000}
                  duration={10000}
                  chatEnabled={false}
                  panelVariant="home"
                  activeTrips={[...activeTrips, ...upcomingTrips]
                    .filter(t => !t.completedAt)
                    .sort((a, b) =>
                      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
                    )
                    .map(t => ({ id: t.id, name: t.name, destination: t.destination, city: t.city }))}
                  onOpenTrip={(tripId) => setLocation(`/adventure/${tripId}/parent-plan`)}
                  onPrepareTomorrow={(tripId) => setLocation(`/adventure/${tripId}/parent-plan?tab=trip_plan`)}
                  onFindFoodHome={(mode, city) => {
                    const sortedPanelTrips = [...activeTrips, ...upcomingTrips]
                      .filter(t => !t.completedAt)
                      .sort((a, b) =>
                        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
                      );
                    const primaryTrip = sortedPanelTrips[0];
                    if (!primaryTrip) return;
                    const base = `/adventure/${primaryTrip.id}/parent-plan`;
                    if (mode === "gps" && city) {
                      setLocation(`${base}?tab=todays_plan&addFood=gps&city=${encodeURIComponent(city)}`);
                    } else if (mode === "route") {
                      setLocation(`${base}?tab=todays_plan&addFood=route`);
                    } else {
                      setLocation(`${base}?tab=todays_plan&addFood=search`);
                    }
                  }}
                />
              )}

              {landingTab === 'now' && (
                <GeoAdventuresNowTab
                  activeTripId={selectActiveAdventure?.id ?? null}
                  onCreateTrip={() => {
                    if (paywallEnabled && !isFreeLimitsPaid && !isAdmin) {
                      handleOpenHomeAdventureDialog();
                    } else {
                      handleOpenCreateDialog();
                    }
                  }}
                />
              )}

              {landingTab === 'kids' && (
                <GeoAdventuresKidsTab
                  activeTrip={selectActiveAdventure || heroContext.trip || null}
                  virtualTrips={trips.filter(t => t.adventureContext === 'home')}
                  tripStopsMap={tripStopsMap}
                  onOpenTravelGame={(gameId) => {
                    setTravelGamesInitialGame(gameId);
                    setShowTravelGamesModal(true);
                  }}
                />
              )}

              {landingTab === 'me' && (
                <GeoAdventuresMeTab
                  userName={user?.firstName || user?.email?.split('@')[0] || null}
                  userInitials={
                    user?.firstName
                      ? user.firstName.slice(0, 2).toUpperCase()
                      : user?.email
                      ? user.email.slice(0, 2).toUpperCase()
                      : null
                  }
                  onOpenMoments={() => setShowMomentsLibrary(true)}
                  onOpenTravelMap={() => {
                    setMapInitialView('world');
                    setShowTravelMap(true);
                  }}
                  onOpenTrophyCabinet={() => setShowTrophyCabinet(true)}
                />
              )}
            </motion.div>
          )}

          {view === "trip" && selectedTripId && !currentTrip && (
            <motion.div
              key="trip-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              {travelError ? (
                <>
                  <div className="text-6xl mb-4">😔</div>
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Couldn't load your adventure
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {travelError}
                  </p>
                  <button 
                    onClick={() => {
                      if (selectedTripId) fetchTrip(selectedTripId);
                    }}
                    className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
                  >
                    Try Again
                  </button>
                </>
              ) : (
                <LoadingWithFacts message="Making Your Journey Awesome!" />
              )}
            </motion.div>
          )}

          {view === "trip" && currentTrip && !!((currentTrip as ExtendedTrip).isDemo) && (
            <motion.div
              key="trip"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {(() => {
                const tripAvatar = getTravelAvatarForTrip(currentTrip.city || undefined, currentTrip.country);
                const destinationIcon = getDestinationIcon(currentTrip.city, currentTrip.country, currentTrip.destination);
                // Use teal colors for At-Home adventures
                const isHomeAdventure = currentTrip.adventureContext === 'home';
                const headerColors = isHomeAdventure 
                  ? { primary: '#14b8a6', secondary: '#06b6d4' } // teal-500 to cyan-500
                  : tripAvatar.colors;
                return (
                  <div 
                    className="rounded-3xl p-6 text-white mb-6 relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${headerColors.primary}, ${headerColors.secondary})` }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                      className="absolute top-4 right-4 text-6xl opacity-30"
                    >
                      <motion.span
                        animate={
                          destinationIcon.animation === "bounce"
                            ? { y: [0, -8, 0] }
                            : destinationIcon.animation === "pulse"
                            ? { scale: [1, 1.15, 1] }
                            : { rotate: [0, 8, -8, 0] }
                        }
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                      >
                        {destinationIcon.emoji}
                      </motion.span>
                    </motion.div>
                    
                    {/* Weather and time at top */}
                    {currentTripWeather && (
                      <div className="flex items-center gap-3 mb-3 text-sm opacity-90">
                        <span className="flex items-center gap-1">
                          🕐 {currentTripWeather.localTime}
                        </span>
                        <span className="flex items-center gap-1">
                          {currentTripWeather.weatherEmoji} {currentTripWeather.temperature}{currentTripWeather.temperatureUnit}
                        </span>
                      </div>
                    )}
                    
                    <div className="relative z-10">
                      <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="flex items-center gap-3 mb-3"
                      >
                        <motion.span
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                          className="text-4xl"
                        >
                          {tripAvatar.emoji}
                        </motion.span>
                        <div>
                          <h2 className="text-2xl font-bold">{currentTrip.name}</h2>
                          <p className="opacity-90 flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4" />
                            {currentTrip.destination}
                          </p>
                          {currentTrip.adventureStyle && currentTrip.adventureStyle !== 'family_explorer' && (
                            <span className="inline-flex items-center gap-1 mt-1 text-xs bg-white/20 rounded-full px-2 py-0.5" data-testid="badge-adventure-style">
                              {({ nature_expedition: '🌿', history_culture: '🏛️', iconic_highlights: '⭐', foodie_adventure: '🍜', city_explorer: '🏙️' } as Record<string, string>)[currentTrip.adventureStyle] || '🧭'}
                              {currentTrip.adventureStyle.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </span>
                          )}
                        </div>
                      </motion.div>
                      
                      {currentTripStops.length > 0 && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="text-sm font-medium bg-white/20 rounded-full px-3 py-1 inline-flex items-center gap-2 mb-3"
                        >
                          <Compass className="w-4 h-4" />
                          {currentTripStops.filter(s => s.isVisited).length === currentTripStops.length
                            ? `${currentTripStops.length} places explored!`
                            : `${currentTripStops.length} exciting places ahead!`
                          }
                        </motion.p>
                      )}
                      
                      {(currentTrip.travelMonth || currentTrip.travelYear || currentTrip.startDate) && (
                        <p className="text-sm opacity-75 mb-4">
                          📅 {currentTrip.travelMonth && currentTrip.travelYear
                            ? `${MONTHS.find(m => m.value === currentTrip.travelMonth)?.label || ''} ${currentTrip.travelYear}`
                            : currentTrip.travelYear
                            ? `${currentTrip.travelYear}`
                            : currentTrip.startDate
                            ? format(new Date(currentTrip.startDate), "MMMM d, yyyy") + (currentTrip.endDate ? ` - ${format(new Date(currentTrip.endDate), "MMMM d, yyyy")}` : '')
                            : ''
                          }
                        </p>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {/* View Map - only for Travel adventures that allow map display */}
                        {tripCapabilities.allowMapDisplay && (
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-2 bg-white/20 hover:bg-white/30 text-white border-0"
                              onClick={() => {
                                setMapInitialView('trip');
                                setShowTravelMap(true);
                              }}
                              data-testid="button-open-map"
                            >
                              <Map className="w-4 h-4" />
                              View Map
                            </Button>
                          </motion.div>
                        )}
                        {/* Save Moment - only for Travel adventures that allow media capture */}
                        {tripCapabilities.allowMediaCapture && (
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-2 bg-white/20 hover:bg-white/30 text-white border-0"
                              onClick={() => setShowMomentCapture(true)}
                              data-testid="button-save-moment"
                            >
                              <Camera className="w-4 h-4" />
                              Save Moment
                            </Button>
                          </motion.div>
                        )}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2 bg-white/20 hover:bg-white/30 text-white border-0"
                            onClick={handleOpenShareModal}
                            data-testid="button-share-trip"
                          >
                            <Share2 className="w-4 h-4" />
                            Share
                          </Button>
                        </motion.div>
                        {/* Offline Download - only for Travel adventures */}
                        {tripCapabilities.allowOffline && (
                          <TravelOfflineDownload trip={currentTrip} stops={currentTripStops} />
                        )}
                        {/* Video/Collage makers - only for Travel adventures with media */}
                        {tripCapabilities.allowMediaCapture && (
                          <>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0 text-xs"
                                onClick={() => {
                                  if (isAdmin) {
                                    setShowVideoMaker(true);
                                  } else {
                                    setComingSoonFeature('Video Maker');
                                    setShowComingSoon(true);
                                  }
                                }}
                                data-testid="button-make-video"
                              >
                                <Video className="w-3.5 h-3.5" />
                                Make Video
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0 text-xs"
                                onClick={() => {
                                  if (isAdmin) {
                                    setShowCollageMaker(true);
                                  } else {
                                    setComingSoonFeature('Photo Collage');
                                    setShowComingSoon(true);
                                  }
                                }}
                                data-testid="button-make-collage"
                              >
                                <Image className="w-3.5 h-3.5" />
                                Make Collage
                              </Button>
                            </motion.div>
                          </>
                        )}
                      </div>
                      
                      {!currentTrip.completedAt && !currentTrip.isLocked && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="mt-4"
                        >
                          {currentTrip.adventureStartedAt ? (
                            <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-green-50 text-green-700 font-bold text-base" data-testid="text-journey-started">
                              <CheckCircle2 className="w-5 h-5" />
                              Journey Started
                            </div>
                          ) : (
                            <Button
                              onClick={handleStartAdventure}
                              disabled={isStartingAdventure}
                              className="w-full gap-2 bg-white text-orange-600 hover:bg-orange-50 font-bold text-base shadow-lg border-0"
                              size="lg"
                              data-testid="button-start-adventure"
                            >
                              {isStartingAdventure ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Starting...
                                </>
                              ) : (
                                <>
                                  <Play className="w-5 h-5 fill-current" />
                                  Start Adventure
                                </>
                              )}
                            </Button>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Trip Enhancement Features */}
              <TripCountdown trip={currentTrip} />
              <DidYouKnow 
                destination={currentTrip.destination} 
                city={currentTrip.city} 
                country={currentTrip.country} 
              />
              {/* Travel Keepsakes & Packing List - only for Travel adventures */}
              {tripCapabilities.allowKeepsakes && (
                <TravelKeepsakes stops={currentTripStops} />
              )}
              {tripCapabilities.allowKeepsakes && (
                <TripPackingList 
                  tripId={currentTrip.id}
                  initialPackedItems={currentTrip.packedItems as string[] | undefined}
                  onPackedItemsChange={handlePackedItemsChange}
                />
              )}

              {/* Experience [City] Module - Sensory content for the destination */}
              {currentTrip.destination && (
                <Card className="bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 border-sky-200 dark:border-sky-800">
                  <CardContent className="p-5">
                    <ExperienceCity 
                      destinationName={currentTrip.city || currentTrip.destination.split(',')[0].trim()}
                      country={currentTrip.country || currentTrip.destination.split(',').slice(1).join(',').trim()}
                    />
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4 mt-8 pt-6 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">Exploration Spots</h3>
                    <p className="text-sm text-muted-foreground">Places you'll explore on this adventure</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{currentTripStops.length} places</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => currentTrip && fetchTrip(currentTrip.id)}
                      data-testid="button-refresh-stops"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                    {/* Add Spot - only for Travel adventures that aren't locked */}
                    {!currentTrip?.isLocked && tripCapabilities.allowKeepsakes && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setShowAddStopDialog(true)}
                        data-testid="button-add-stop"
                      >
                        <Plus className="w-3 h-3" />
                        Add Spot
                      </Button>
                    )}
                  </div>
                </div>

                {currentTripStops.length === 0 ? (
                  <Card className="bg-white/60 dark:bg-slate-800/60">
                    <CardContent className="py-8 text-center">
                      <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-muted-foreground mb-3">No exploration spots added yet</p>
                      {!currentTrip?.isLocked && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (currentTrip) {
                              setView("addStops");
                            }
                          }}
                          className="gap-2"
                          data-testid="button-add-first-stop"
                        >
                          <Plus className="w-4 h-4" />
                          Add Your First Stop
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {hasMissions && (
                      <div className="space-y-2 mb-3">
                        <MissionProgressBar
                          completed={currentTrip?.missionsCompleted || 0}
                          total={currentTrip?.totalMissions || 0}
                          xpTotal={currentTrip?.missionXpTotal || 0}
                        />
                        <RouteOverviewBar
                          stops={currentTripStops.map(s => ({
                            id: s.id,
                            name: s.name,
                            missionCompleted: s.missionCompleted || false,
                            missionType: s.missionType,
                          }))}
                          activeStopIndex={activeMissionIndex}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <ArrowUpDown className="w-3 h-3" /> Use arrows to reorder spots
                    </p>
                    {currentTripStops.map((stop, index) => {
                      const spotLocked = isSpotLocked(index);
                      const missionLocked = hasMissions && !spotLocked && index > activeMissionIndex && !!stop.missionType && !stop.missionCompleted;
                      return (
                        <motion.div
                        key={stop.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ 
                          opacity: draggedStop === stop.id ? 0.5 : spotLocked ? 0.7 : 1, 
                          x: 0,
                          scale: dragOverIndex === index && draggedStop !== stop.id ? 1.02 : 1,
                        }}
                        transition={{ delay: index * 0.05 }}
                        draggable={!spotLocked}
                        onDragStart={() => !spotLocked && handleDragStart(stop.id)}
                        onDragOver={(e) => !spotLocked && handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragLeave={() => setDragOverIndex(null)}
                        className={`${dragOverIndex === index && draggedStop !== stop.id ? 'border-t-2 border-orange-400' : ''} ${spotLocked ? 'relative' : ''}`}
                      >
                        <Card 
                          className={`shadow-sm transition-all ${
                            spotLocked 
                              ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 border-2 cursor-pointer'
                              : missionLocked
                              ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 border-2 opacity-50'
                              : `bg-white dark:bg-slate-800 hover:shadow-lg cursor-grab active:cursor-grabbing ${stop.isVisited ? 'border-green-500 border-2' : 'border-transparent border-2'}`
                          }`}
                          data-testid={`card-stop-${stop.id}`}
                        >
                          <CardContent className="p-4">
                            <div 
                              className="flex items-center gap-3"
                            >
                              {!spotLocked && (
                                <div 
                                  className="flex items-center gap-2 text-muted-foreground touch-none"
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <ArrowUpDown className="w-4 h-4" />
                                </div>
                              )}
                              <div 
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                                onClick={() => {
                                  if (spotLocked) {
                                    setShowSpotLimitGate(true);
                                  } else if (missionLocked) {
                                    return;
                                  } else {
                                    setSelectedStop(stop);
                                    setShowJourneyPack(true);
                                  }
                                }}
                              >
                                <motion.div
                                  animate={!spotLocked && stop.isVisited ? { scale: [1, 1.2, 1] } : {}}
                                  transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                                    spotLocked
                                      ? 'bg-slate-200 dark:bg-slate-700'
                                      : stop.isVisited 
                                        ? 'bg-green-100 dark:bg-green-900/30' 
                                        : 'bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30'
                                  }`}
                                >
                                  {spotLocked ? (
                                    <Lock className="w-5 h-5 text-slate-400" />
                                  ) : stop.isVisited ? '✅' : getStopTypeEmoji(stop.stopType || 'other')}
                                </motion.div>
                                <div className="flex-1">
                                  <h4 className={`font-bold ${spotLocked ? 'text-slate-500 dark:text-slate-400' : ''}`}>{stop.name}</h4>
                                  <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                                    {spotLocked ? (
                                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Upgrade to unlock
                                      </span>
                                    ) : missionLocked ? (
                                      <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Complete previous mission first
                                      </span>
                                    ) : (
                                      <>
                                        {stop.isVisited && <span className="text-green-500">{isHomeAdventure ? 'Explored' : 'Visited'} • </span>}
                                        {stop.stopType || 'Stop'} #{index + 1}
                                      </>
                                    )}
                                  </p>
                                  {!spotLocked && stop.address && (
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                      data-testid={`link-stop-address-${stop.id}`}
                                    >
                                      <MapPin className="w-3 h-3 shrink-0" />
                                      <span className="truncate max-w-[180px]">{stop.address}</span>
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {spotLocked ? (
                                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center border-2 border-amber-300">
                                      <Lock className="w-5 h-5 text-amber-600" />
                                    </div>
                                  ) : stop.isVisited ? (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                                        isJourneyPackComplete(stop.id)
                                          ? 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-400'
                                          : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300'
                                      }`}
                                    >
                                      <CheckCircle className={`w-5 h-5 ${isJourneyPackComplete(stop.id) ? 'text-green-600' : 'text-green-400'}`} />
                                    </motion.div>
                                  ) : isJourneyPackComplete(stop.id) ? (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center border-2 border-purple-300"
                                    >
                                      <span className="text-lg">📖</span>
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      animate={{ scale: [1, 1.1, 1] }}
                                      transition={{ repeat: Infinity, duration: 1.5 }}
                                      className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 flex items-center justify-center"
                                    >
                                      <span className="text-xl">🎧</span>
                                    </motion.div>
                                  )}
                                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                            {/* Hide reorder and remove controls for locked/completed trips or locked spots */}
                            {!currentTrip?.isLocked && !spotLocked && (
                              <div className="flex justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-1 h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveStop(stop.id, 'up');
                                    }}
                                    disabled={index === 0}
                                    data-testid={`button-move-up-${stop.id}`}
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-1 h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveStop(stop.id, 'down');
                                    }}
                                    disabled={index === currentTripStops.length - 1}
                                    data-testid={`button-move-down-${stop.id}`}
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </Button>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStopToDelete(stop.id);
                                  }}
                                  data-testid={`button-delete-stop-${stop.id}`}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        {stop.missionType && stop.missionQuestion && !spotLocked && (
                          <div className="mt-1">
                            <MissionCard
                              stopId={stop.id}
                              stopName={stop.name}
                              missionType={stop.missionType}
                              missionQuestion={stop.missionQuestion}
                              missionHint={stop.missionHint}
                              missionAnswer={stop.missionAnswer}
                              missionDifficulty={stop.missionDifficulty || 'normal'}
                              missionCompleted={stop.missionCompleted || false}
                              missionKeepsakeReward={stop.missionKeepsakeReward || false}
                              missionXpAwarded={stop.missionXpAwarded || 0}
                              onComplete={handleCompleteMission}
                              isActive={index === activeMissionIndex}
                              isLocked={index > activeMissionIndex && !stop.missionCompleted}
                              index={index}
                            />
                          </div>
                        )}
                      </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Moments section - only for Travel adventures that allow media capture */}
                {tripCapabilities.allowMediaCapture && (
                  <>
                    <div className="flex items-center justify-between mt-6">
                      <h3 className="font-bold text-lg">Moments</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => setShowMomentCapture(true)}
                        data-testid="button-add-moment"
                      >
                        <Camera className="w-4 h-4" />
                        Add Moment
                      </Button>
                    </div>

                    {currentTripMoments.length === 0 ? (
                      <Card className="bg-white/60 dark:bg-slate-800/60">
                        <CardContent className="py-8 text-center">
                          <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-muted-foreground">No moments captured yet</p>
                          <p className="text-xs text-muted-foreground mt-1">Save memories during your adventure!</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {currentTripMoments.map(moment => {
                          const displayPhoto = getMomentPhotoUrl(moment);
                          return (
                          <div key={moment.id} className="relative group">
                            {displayPhoto ? (
                              <img 
                                src={displayPhoto} 
                                alt="Moment" 
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                <Camera className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                            <div className="absolute top-1 right-1 flex gap-1">
                              <button
                                className={`h-6 w-6 rounded-full flex items-center justify-center transition-all shadow-sm ${
                                  moment.isFavorite 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-white/80 text-slate-400'
                                }`}
                                onClick={() => toggleFavorite(moment.id)}
                                data-testid={`button-favorite-moment-${moment.id}`}
                              >
                                <Heart className={`w-3.5 h-3.5 ${moment.isFavorite ? 'fill-current' : ''}`} />
                              </button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-6 w-6 shadow-sm"
                                onClick={() => setMomentToDelete(moment.id)}
                                data-testid={`button-delete-moment-${moment.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            {moment.kidPromptResponse && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 rounded-b-lg">
                                <p className="text-white text-xs line-clamp-1">{moment.kidPromptResponse}</p>
                              </div>
                            )}
                          </div>
                        );})}
                      </div>
                    )}
                  </>
                )}

                {(currentTrip.adventureStartedAt || currentTrip.isLocked || currentTrip.completedAt) && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8"
                >
                  {/* At-Home Adventure: Show learning-focused card instead of story creation */}
                  {isHomeAdventure ? (
                    <Card className="bg-gradient-to-r from-teal-100 via-cyan-100 to-sky-100 dark:from-teal-900/30 dark:via-cyan-900/30 dark:to-sky-900/30 border-2 border-teal-200 dark:border-teal-800">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-2xl">
                            🌍
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-teal-800 dark:text-teal-200">Your Learning Journey</h3>
                            <p className="text-sm text-teal-600 dark:text-teal-400">Explore and discover from home!</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-sm text-center text-teal-700 dark:text-teal-300">
                            Keep exploring! Each place has fascinating stories, games, and activities waiting for you.
                          </p>
                          <div className="flex items-center justify-center gap-2 text-xs text-teal-600 dark:text-teal-400">
                            <span>📍 {currentTripStops.filter(s => s.isVisited).length}/{currentTripStops.length} places explored</span>
                          </div>
                          
                          {/* Adventure Recap - available after 3+ stops for memory games/reflection */}
                          {currentTripStops.filter(s => s.isVisited).length >= 3 && (
                            <Button
                              onClick={() => setShowAdventureRecap(true)}
                              className="w-full gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                              data-testid="button-adventure-recap"
                            >
                              <Star className="w-5 h-5" />
                              Adventure Recap
                            </Button>
                          )}
                          
                          {/* Save/Close Adventure for At-Home */}
                          <Button
                            onClick={handleCloseAdventure}
                            disabled={isFinishingAdventure}
                            variant="outline"
                            className="w-full gap-2 border-2 border-teal-500 text-teal-600 hover:bg-teal-50 dark:border-teal-400 dark:text-teal-400 dark:hover:bg-teal-950"
                            data-testid="button-save-adventure"
                          >
                            {isFinishingAdventure ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Archive className="w-5 h-5" />
                                Save & Close Adventure
                              </>
                            )}
                          </Button>
                          
                          <p className="text-xs text-center text-teal-600/70 dark:text-teal-400/70">
                            Want photos, keepsakes, and story creation? Create a Travel Pack for your next real trip!
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                  <Card className="bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-orange-900/30 border-2 border-purple-200 dark:border-purple-800">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl">
                          📖
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">Check Your Story</h3>
                          <p className="text-sm text-muted-foreground">Your adventure story awaits!</p>
                        </div>
                      </div>

                      {/* Show story viewing for locked trips, completion options for finished trips, or finish adventure for in-progress trips */}
                      {(() => {
                        const allStopsVisited = currentTripStops.length > 0 && currentTripStops.every(s => s.isVisited);
                        
                        if (currentTrip.isLocked) {
                          // Locked trip - show "Read Our Story"
                          return (
                            <div className="space-y-3">
                              {tripStory ? (
                                <div className="bg-white/70 dark:bg-slate-800/70 rounded-xl p-4">
                                  <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-2">{tripStory.title}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2">{tripStory.storySummary}</p>
                                  <div className="flex items-center gap-2 mt-3">
                                    <div className="flex">
                                      {[...Array(tripStory.memoryStrength === 'strong' ? 3 : tripStory.memoryStrength === 'medium' ? 2 : 1)].map((_, i) => (
                                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                      ))}
                                    </div>
                                    <span className="text-xs text-muted-foreground capitalize">{tripStory.memoryStrength} memories</span>
                                  </div>
                                </div>
                              ) : null}
                              <Button
                                onClick={handleViewStory}
                                className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                data-testid="button-view-story"
                              >
                                <BookOpen className="w-5 h-5" />
                                Read Our Story
                              </Button>
                            </div>
                          );
                        } else if (allStopsVisited) {
                          // All stops visited but not locked - show Adventure Recap, Create Story, Close Adventure
                          return (
                            <div className="space-y-3">
                              <p className="text-sm text-center">
                                {isHomeAdventure 
                                  ? "You've explored all the places! 🎉 Create your family's story or view your adventure recap."
                                  : "You've visited all the stops! 🎉 Create your family's story or view your adventure recap."
                                }
                              </p>
                              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                <span>📸 {currentTripMoments.length} moments</span>
                                <span>•</span>
                                <span>📍 {currentTripStops.filter(s => s.isVisited).length}/{currentTripStops.length} {isHomeAdventure ? 'places explored' : 'stops visited'}</span>
                              </div>
                              
                              <Button
                                onClick={() => setShowAdventureRecap(true)}
                                className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                data-testid="button-adventure-recap"
                              >
                                <Star className="w-5 h-5" />
                                Adventure Recap
                              </Button>
                              
                              <Button
                                onClick={() => setLocation(`/adventure/${currentTrip.id}/end-trip`)}
                                className="w-full gap-2 text-white font-bold"
                                style={{ background: "#D4872B" }}
                                data-testid="button-view-story"
                              >
                                <BookOpen className="w-5 h-5" />
                                View Your Story
                              </Button>
                              
                              <Button
                                onClick={handleCloseAdventure}
                                disabled={isFinishingAdventure}
                                variant="outline"
                                className="w-full gap-2 border-2 border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-900"
                                data-testid="button-close-adventure"
                              >
                                {isFinishingAdventure ? (
                                  <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Closing...
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-5 h-5" />
                                    Close Adventure
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        } else {
                          // Still in progress - show Finish Adventure option
                          const visitedCount = currentTripStops.filter(s => s.isVisited).length;
                          return (
                            <div className="space-y-3">
                              <p className="text-sm text-center">
                                When you're done with your adventure, create your family's story! 
                                We'll weave together your moments, reflections, and discoveries into a keepsake you can read together.
                              </p>
                              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                <span>📸 {currentTripMoments.length} moments</span>
                                <span>•</span>
                                <span>📍 {visitedCount}/{currentTripStops.length} stops visited</span>
                              </div>
                              
                              {visitedCount >= 1 && activeExplorer?.id && (() => {
                                const gameStatus = canPlayGames(currentTrip.id, activeExplorer.id, visitedCount);
                                return (
                                  <div className="relative">
                                    <Button
                                      onClick={() => setShowGamesOnly(true)}
                                      disabled={!gameStatus.canPlay}
                                      className={gameStatus.canPlay 
                                        ? "w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                        : "w-full gap-2 bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                                      }
                                      data-testid="button-recap-so-far"
                                    >
                                      <Star className="w-5 h-5" />
                                      Play Memory Games
                                    </Button>
                                    {!gameStatus.canPlay && (
                                      <p className="text-xs text-center text-muted-foreground mt-1">
                                        Visit {gameStatus.stopsNeeded} more {gameStatus.stopsNeeded === 1 ? 'stop' : 'stops'} to play again
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              <Button
                                onClick={handleCompleteTrip}
                                disabled={isCompletingTrip}
                                className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                data-testid="button-create-story"
                              >
                                {isCompletingTrip ? (
                                  <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating Your Story...
                                  </>
                                ) : (
                                  <>
                                    <BookOpen className="w-5 h-5" />
                                    Create Adventure Story
                                  </>
                                )}
                              </Button>
                              
                              {/* Finish Adventure button - only for Travel adventures that allow completion */}
                              {tripCapabilities.allowCompletion && (
                                <div className="relative">
                                  <Button
                                    onClick={() => setShowFinishAdventureModal(true)}
                                    variant="outline"
                                    className="w-full gap-2 border-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-950"
                                    data-testid="button-finish-adventure"
                                  >
                                    <Lock className="w-5 h-5" />
                                    Finish Adventure
                                  </Button>
                                  <p className="text-xs text-center text-muted-foreground mt-1">
                                    Once completed, the adventure cannot be edited
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </CardContent>
                  </Card>
                  )}
                </motion.div>
                )}
              </div>
              
              {/* GeoBuddy on trip details - shows messages AND is clickable as chatbot */}
              {/* Hide when JourneyPackPlayer is open */}
              {!showJourneyPack && (
                <TravelGeoBuddyNudge
                  message={
                    currentTrip.status === "active" 
                      ? "What will you remember from today? Let's explore together!"
                      : currentTrip.status === "completed"
                      ? "Beautiful memories! Where will you go next?"
                      : "Journey Packs are best explored on the way!"
                  }
                  triggerKey={`trip-details-${currentTrip.id}`}
                  delay={10000}
                  duration={12000}
                  chatEnabled={true}
                />
              )}
            </motion.div>
          )}

          {view === "addStops" && currentTrip && (
            <motion.div
              key="addStops"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-3xl p-6 text-white mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">Add Stops to Visit</h2>
                    <p className="text-white/80">{currentTrip.name}</p>
                  </div>
                </div>
                <p className="text-sm text-white/90">
                  Select places you want to explore on your adventure
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Top 10 Recommended Stops
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Popular places in {currentTrip.city || currentTrip.destination}
                  </p>
                  
                  {suggestedStops && suggestedStops.length > 0 ? (
                    <div className="space-y-2">
                      {suggestedStops.map((stop, idx) => (
                        <Card 
                          key={stop.name}
                          className={`cursor-pointer transition-all ${
                            selectedStops.includes(stop.name) 
                              ? 'border-green-500 border-2 bg-green-50 dark:bg-green-900/20' 
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => {
                            if (selectedStops.includes(stop.name)) {
                              setSelectedStops(prev => prev.filter(n => n !== stop.name));
                            } else {
                              setSelectedStops(prev => [...prev, stop.name]);
                            }
                          }}
                          data-testid={`card-suggested-stop-${idx}`}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              selectedStops.includes(stop.name)
                                ? 'bg-green-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600'
                            }`}>
                              {selectedStops.includes(stop.name) ? '✓' : idx + 1}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{stop.name}</h4>
                              <p className="text-xs text-muted-foreground capitalize">{stop.stopType}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-slate-50 dark:bg-slate-800/50">
                      <CardContent className="py-6 text-center">
                        <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">
                          No preset stops available for this location.
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          Add your own custom stops below!
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Custom Stops
                  </h3>
                  <div className="space-y-2">
                    {customStops.map((stop, idx) => (
                      <Input
                        key={idx}
                        placeholder={`Custom stop ${idx + 1} (e.g., beach, restaurant)`}
                        value={stop}
                        onChange={(e) => {
                          const updated = [...customStops];
                          updated[idx] = e.target.value;
                          setCustomStops(updated);
                        }}
                        className="bg-white dark:bg-slate-800"
                        data-testid={`input-custom-stop-${idx}`}
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => setCustomStops(prev => [...prev, ""])}
                      data-testid="button-add-more-stops"
                    >
                      <Plus className="w-4 h-4" />
                      Add More
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setView("trip");
                      setSelectedStops([]);
                      setCustomStops(["", "", ""]);
                    }}
                    data-testid="button-skip-stops"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={async () => {
                      let displayOrder = 1;
                      for (const stopName of selectedStops) {
                        const stopData = suggestedStops?.find(s => s.name === stopName);
                        if (stopData) {
                          await addStop(currentTrip.id, {
                            name: stopData.name,
                            stopType: stopData.stopType,
                            displayOrder: displayOrder++,
                            address: stopData.address,
                          });
                        }
                      }
                      for (const customStop of customStops) {
                        if (customStop.trim()) {
                          await addStop(currentTrip.id, {
                            name: customStop.trim(),
                            stopType: "other",
                            displayOrder: displayOrder++,
                          });
                        }
                      }
                      setSelectedStops([]);
                      setCustomStops(["", "", ""]);
                      setView("trip");
                    }}
                    disabled={selectedStops.length === 0 && customStops.every(s => !s.trim())}
                    data-testid="button-save-stops"
                  >
                    Save Stops ({selectedStops.length + customStops.filter(s => s.trim()).length})
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stop Selection Dialog - After Trip Creation */}
        {pendingTrip && showStopSelection && (
          <StopSelectionDialog
            onClose={() => {
              setShowStopSelection(false);
              setPendingTrip(null);
              resetCreateForm();
            }}
            destination={pendingTrip.destination}
            suggestedStops={pendingTrip.suggestedStops}
            onConfirm={handleStopSelectionConfirm}
          />
        )}

        {/* Journey Pack Player - Full Screen Overlay */}
        <AnimatePresence>
          {showJourneyPack && selectedStop && currentTrip && (
            <JourneyPackPlayer
              stop={selectedStop}
              journeyPack={null}
              trip={currentTrip}
              stopMoments={(currentTripMoments || []).filter(m => m.stopId === selectedStop.id)}
              explorerId={activeExplorer?.id}
              stopNumber={currentTripStops.findIndex(s => s.id === selectedStop.id) + 1}
              totalStops={currentTripStops.length}
              onClose={() => {
                setShowJourneyPack(false);
                setSelectedStop(null);
              }}
              onComplete={async () => {
                // Capture the stop being completed to avoid race conditions
                const completedStop = selectedStop;
                // Mark stop as visited/explored when Journey Pack activities are completed
                if (completedStop) {
                  await markStopVisited(completedStop.id, activeExplorer?.id || undefined, completedStop.stopType || undefined);
                  toast({
                    title: isHomeAdventure ? "Place explored!" : "Stop completed!",
                    description: isHomeAdventure 
                      ? `${completedStop.name} is now marked as explored.`
                      : `${completedStop.name} is now marked as visited.`,
                  });
                }
                setShowJourneyPack(false);
                setSelectedStop(null);
              }}
              onSaveMoment={async (momentData) => {
                await saveMoment({
                  tripId: currentTrip.id,
                  ...momentData,
                });
              }}
              onDeleteMoment={async (momentId) => {
                await deleteMoment(momentId);
                toast({
                  title: "Memory deleted",
                  description: "The photo has been removed from your adventure.",
                });
              }}
              onCompleteMission={handleCompleteMission}
            />
          )}
        </AnimatePresence>

        {/* Moment Capture - Full Screen Overlay */}
        <AnimatePresence>
          {showMomentCapture && currentTrip && (
            <MomentCapture
              trip={currentTrip}
              stops={currentTripStops}
              isParentMode={true}
              onSave={async (momentData) => {
                await saveMoment({
                  tripId: currentTrip.id,
                  ...momentData,
                });
              }}
              onClose={() => setShowMomentCapture(false)}
            />
          )}
        </AnimatePresence>

        {/* Family Travel Map - Full Screen Overlay */}
        <AnimatePresence>
          {showTravelMap && (mapInitialView === 'world' || currentTrip) && (
            <FamilyTravelMap
              trips={trips.filter(t => t.adventureContext === 'travel')}
              currentTrip={currentTrip}
              stops={currentTripStops}
              moments={currentTripMoments}
              memoryStars={currentTrip?.totalMemoryStars || 0}
              onClose={() => setShowTravelMap(false)}
              onTripSelect={async (tripId) => {
                setSelectedTripId(tripId);
                await fetchTrip(tripId);
              }}
              onStopClick={(stop) => {
                setShowTravelMap(false);
                setSelectedStop(stop);
                setShowJourneyPack(true);
              }}
              initialView={mapInitialView}
            />
          )}
        </AnimatePresence>

        {/* Trip Recap Modal - Family Lore Story */}
        <AnimatePresence>
          {showTripRecap && (dialogTrip || currentTrip) && (
            <TripRecapModal
              trip={dialogTrip || currentTrip!}
              story={tripStory}
              moments={dialogTripMoments.length > 0 ? dialogTripMoments : currentTripMoments}
              stops={dialogTripStops.length > 0 ? dialogTripStops : currentTripStops}
              isLoading={isCompletingTrip || dialogDataLoading}
              onClose={() => {
                setShowTripRecap(false);
                setDialogTrip(null);
                setDialogTripStops([]);
                setDialogTripMoments([]);
                if (currentTrip) {
                  fetchTrip(currentTrip.id);
                }
              }}
              onRegenerate={handleRegenerateStory}
              onSaveStory={(dialogTrip || currentTrip)?.storySaved ? undefined : handleSaveStory}
              explorerId={activeExplorer?.id}
              explorerName={activeExplorer?.name}
              explorerAge={activeExplorer?.age}
            />
          )}
        </AnimatePresence>

        {/* Adventure Recap - Finish Adventure celebration flow */}
        <AnimatePresence>
          {showAdventureRecap && currentTrip && (
            <AdventureRecap
              trip={currentTrip}
              stops={currentTripStops}
              moments={currentTripMoments}
              explorerId={activeExplorer?.id}
              sessionType="adventure_recap"
              isHomeAdventure={isHomeAdventure}
              onClose={() => {
                setShowAdventureRecap(false);
                if (currentTrip) {
                  fetchTrip(currentTrip.id);
                }
              }}
              onCreateVideo={() => {
                setShowAdventureRecap(false);
                if (!isAdmin) {
                  setComingSoonFeature('Video Maker');
                  setShowComingSoon(true);
                } else {
                  setShowVideoMaker(true);
                }
              }}
              onCreateCollage={() => {
                setShowAdventureRecap(false);
                if (!isAdmin) {
                  setComingSoonFeature('Photo Collage');
                  setShowComingSoon(true);
                } else {
                  setShowCollageMaker(true);
                }
              }}
              onGamesCompleted={() => {
                const visitedCount = currentTripStops.filter(s => s.isVisited).length;
                if (activeExplorer?.id) {
                  recordGamesPlayed(currentTrip.id, activeExplorer.id, visitedCount);
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Games Only Modal - For mid-trip memory games */}
        <AnimatePresence>
          {showGamesOnly && currentTrip && activeExplorer?.id && (
            <ReflectionGamesModal
              tripId={currentTrip.id}
              explorerId={activeExplorer.id}
              onClose={(gamesCompleted?: boolean) => {
                const visitedCount = currentTripStops.filter(s => s.isVisited).length;
                if (gamesCompleted && activeExplorer?.id) {
                  recordGamesPlayed(currentTrip.id, activeExplorer.id, visitedCount);
                }
                setShowGamesOnly(false);
                if (currentTrip) {
                  fetchTrip(currentTrip.id);
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Finish Adventure Modal - For completing trip with reflection questions */}
        <AnimatePresence>
          {showFinishAdventureModal && currentTrip && (
            <FinishAdventureModal
              trip={currentTrip}
              stops={currentTripStops}
              moments={currentTripMoments}
              isHomeAdventure={isHomeAdventure}
              onClose={() => setShowFinishAdventureModal(false)}
              onFinished={async () => {
                const tripId = currentTrip.id;
                // Clear games cooldown since trip is now complete
                if (activeExplorer?.id) {
                  clearGamesCooldown(tripId, activeExplorer.id);
                }
                setShowFinishAdventureModal(false);
                // Refresh both the current trip and the trips list to update UI everywhere
                await fetchTrip(tripId);
                await fetchTrips();
                // Show the adventure recap celebration
                setShowAdventureRecap(true);
              }}
            />
          )}
        </AnimatePresence>

        {/* Video Maker Dialog - with subscription gating */}
        <Dialog open={showVideoMaker} onOpenChange={(open) => {
          if (!open) {
            setShowVideoMaker(false);
            setDialogTrip(null);
            setDialogTripStops([]);
            setDialogTripMoments([]);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-500" />
                Create Family Video
              </DialogTitle>
              <DialogDescription>
                Turn your adventure moments into a keepsake video
              </DialogDescription>
            </DialogHeader>
            {(dialogTrip || currentTrip) && (
              <TripVideoGenerator 
                trip={dialogTrip || currentTrip!} 
                moments={dialogTripMoments.length > 0 ? dialogTripMoments : currentTripMoments}
                stops={dialogTripStops.length > 0 ? dialogTripStops : currentTripStops}
                isLoading={dialogDataLoading}
                onClose={() => {
                  setShowVideoMaker(false);
                  setDialogTrip(null);
                  setDialogTripStops([]);
                  setDialogTripMoments([]);
                }} 
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* Coming Soon Modal - for gated features */}
        <ComingSoonModal
          isOpen={showComingSoon}
          onClose={() => setShowComingSoon(false)}
          featureName={comingSoonFeature}
        />
        
        {/* Adventure Limit Gate - shown when free users reach trip limits */}
        <AdventureLimitGate
          isOpen={showAdventureLimitGate}
          onClose={() => setShowAdventureLimitGate(false)}
          limitType={adventureLimitType}
        />
        
        {/* Spot Limit Gate - shown when free users click on locked spots */}
        <AdventureLimitGate
          isOpen={showSpotLimitGate}
          onClose={() => setShowSpotLimitGate(false)}
          limitType="spots"
          cityName={currentTrip?.city || currentTrip?.destination}
        />

        {/* Trip unlock paywall for home adventures (free users) */}
        <TripUnlockSheet
          open={showHomeTripUnlockSheet}
          onClose={() => setShowHomeTripUnlockSheet(false)}
          onOpenFullDetails={() => setShowHomeTripUnlockSheet(false)}
          onPaymentSuccess={() => {
            homeTripPaymentCompleted.current = true;
            setShowHomeTripUnlockSheet(false);
            handleCreateHomeAdventure(pendingHomeDest ?? undefined);
          }}
          destination={
            pendingHomeDest
              ? `${pendingHomeDest.city}${pendingHomeDest.country ? `, ${pendingHomeDest.country}` : ""}`
              : "Your Destination"
          }
          country={pendingHomeDest?.country}
          returnUrl={window.location.pathname + window.location.search}
        />
        
        {/* Duplicate Trip Error Dialog */}
        <AlertDialog open={showDuplicateTripDialog} onOpenChange={setShowDuplicateTripDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <span className="text-2xl">🗺️</span>
                Duplicate Adventure
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                You already have a <span className="font-semibold text-foreground">{duplicateExistingTrip?.name || duplicateTripDestination}</span> in your Adventures. Do you want to make updates on the same?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel 
                onClick={() => {
                  setShowDuplicateTripDialog(false);
                  setDuplicateExistingTrip(null);
                  setShowHomeAdventureDialog(false);
                }}
                data-testid="button-duplicate-back"
              >
                Back
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={async () => {
                  setShowDuplicateTripDialog(false);
                  setShowHomeAdventureDialog(false);
                  if (duplicateExistingTrip?.id) {
                    // Navigate to the existing adventure
                    setSelectedTripId(duplicateExistingTrip.id);
                    await fetchTrip(duplicateExistingTrip.id);
                    setView("trip");
                  }
                  setDuplicateExistingTrip(null);
                }}
                data-testid="button-duplicate-update"
              >
                Update Adventure
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Collage Maker Dialog */}
        <Dialog open={showCollageMaker} onOpenChange={(open) => {
          if (!open) {
            setShowCollageMaker(false);
            setDialogTrip(null);
            setDialogTripStops([]);
            setDialogTripMoments([]);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-amber-500" />
                Create Photo Collage
              </DialogTitle>
              <DialogDescription>
                Create a beautiful collage from your adventure photos
              </DialogDescription>
            </DialogHeader>
            {(dialogTrip || currentTrip) && (
              <TripCollageGenerator 
                trip={dialogTrip || currentTrip!} 
                moments={dialogTripMoments.length > 0 ? dialogTripMoments : currentTripMoments}
                stops={dialogTripStops.length > 0 ? dialogTripStops : currentTripStops}
                isLoading={dialogDataLoading}
                onClose={() => {
                  setShowCollageMaker(false);
                  setDialogTrip(null);
                  setDialogTripStops([]);
                  setDialogTripMoments([]);
                }} 
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Trail Tales Game Modal */}
        {trailTalesTripId && (
          <TrailTalesGame
            tripId={trailTalesTripId}
            tripName={trips.find(t => t.id === trailTalesTripId)?.name || "Your Adventure"}
            isOpen={showTrailTales}
            onClose={() => {
              setShowTrailTales(false);
              setTrailTalesTripId(null);
            }}
          />
        )}

        {/* Share Itinerary Modal */}
        {currentTrip && (
          <ShareItineraryModal
            open={showShareModal}
            onOpenChange={setShowShareModal}
            trip={currentTrip}
            stopCount={currentTripStops.length}
            existingShare={currentTripShare}
            onShare={handleShareItinerary}
            onUnshare={handleUnshareItinerary}
          />
        )}

        {/* Moments Library Dialog */}
        <Dialog open={showMomentsLibrary} onOpenChange={setShowMomentsLibrary}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-pink-500" />
                Moments Library
              </DialogTitle>
              <DialogDescription>
                All the memories your family has captured across adventures.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {isLoadingMoments ? (
                <div className="py-8">
                  <GlobeLoader message="Gathering your memories..." />
                </div>
              ) : trips.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No moments saved yet.</p>
                  <p className="text-sm mt-1">Start an adventure to capture memories!</p>
                </div>
              ) : allMoments.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">No photos captured yet.</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Open an adventure and tap "Save a moment" to capture memories!
                  </p>
                  {activeTrips.length > 0 ? (
                    <Button
                      onClick={() => {
                        setShowMomentsLibrary(false);
                        setSelectedTripId(activeTrips[0].id);
                      }}
                      className="bg-pink-500 hover:bg-pink-600 text-white"
                      data-testid="button-open-active-trip"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Open {activeTrips[0].destination} Adventure
                    </Button>
                  ) : trips.length > 0 ? (
                    <Button
                      onClick={() => {
                        setShowMomentsLibrary(false);
                        setSelectedTripId(trips[0].id);
                      }}
                      variant="outline"
                      data-testid="button-open-trip"
                    >
                      Open an Adventure to Add Moments
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-6">
                  {allMoments.map((tripData) => (
                    <div key={tripData.tripId} className="space-y-3">
                      <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b pb-2">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        {tripData.tripName}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {tripData.moments.length} {tripData.moments.length === 1 ? 'moment' : 'moments'}
                        </span>
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {tripData.moments.map((moment) => {
                          const displayPhoto = getMomentPhotoUrl(moment);
                          return (
                          <div 
                            key={moment.id} 
                            className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 group"
                          >
                            {displayPhoto ? (
                              <img 
                                src={displayPhoto} 
                                alt={moment.kidPromptResponse || "Adventure memory"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Camera className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                            {/* Always visible action buttons for mobile */}
                            <div className="absolute top-1 right-1 flex gap-1">
                              {moment.isFavorite && (
                                <div className="h-5 w-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                                  <Heart className="w-3 h-3 text-white fill-current" />
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMomentToDelete(moment.id);
                                }}
                                className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-sm"
                                data-testid={`button-delete-moment-${moment.id}`}
                              >
                                <Trash2 className="w-2.5 h-2.5 text-white" />
                              </button>
                            </div>
                            {moment.kidPromptResponse && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                                <p className="text-white text-xs line-clamp-2">{moment.kidPromptResponse}</p>
                              </div>
                            )}
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Archive Trip Confirmation Dialog */}
        <AlertDialog open={!!tripToArchive} onOpenChange={(open) => !open && setTripToArchive(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-600" />
                Archive Adventure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left space-y-2">
                <p>
                  Archive <strong>"{tripToArchive?.name}"</strong>?
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  It will be hidden from your main trip list. You can restore it anytime from the Archived section.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-archive">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmArchiveTrip}
                className="bg-amber-600 hover:bg-amber-700"
                data-testid="button-confirm-archive"
              >
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Trip (Permanent) Confirmation Dialog */}
        <AlertDialog open={!!tripToDelete} onOpenChange={(open) => !open && setTripToDelete(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Delete Adventure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left space-y-2">
                <p>
                  You are about to permanently delete <strong>"{tripToDelete?.name}"</strong>.
                </p>
                <p className="text-red-600 dark:text-red-400 font-medium">
                  Once deleted, this trip and all its memories cannot be recovered.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-trip">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!tripToDelete) return;
                  try {
                    await deleteTrip(tripToDelete.id);
                    toast({ title: "Adventure deleted", description: `${tripToDelete.name} has been permanently removed.` });
                  } catch {
                    toast({ title: "Couldn't delete adventure", description: "Something went wrong. Please try again.", variant: "destructive" });
                  }
                  setTripToDelete(null);
                }}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete-trip"
              >
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Stop Confirmation Dialog */}
        <AlertDialog open={!!stopToDelete} onOpenChange={(open) => !open && setStopToDelete(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Remove Exploration Spot?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left space-y-2">
                <p>
                  Are you sure you want to remove <strong>"{currentTripStops.find(s => s.id === stopToDelete)?.name}"</strong>?
                </p>
                <p className="text-red-600 dark:text-red-400 font-medium">
                  All Journey Pack progress, moments, and memories for this spot will be permanently deleted.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-stop">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (stopToDelete) {
                    await handleDeleteStop(stopToDelete);
                    setStopToDelete(null);
                  }
                }}
                className="bg-red-500 hover:bg-red-600"
                data-testid="button-confirm-delete-stop"
              >
                Remove Spot
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Moment Confirmation Dialog */}
        <AlertDialog open={!!momentToDelete} onOpenChange={(open) => !open && setMomentToDelete(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Delete Memory?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left space-y-2">
                <p>Are you sure you want to delete this memory?</p>
                <p className="text-red-600 dark:text-red-400 font-medium">
                  This photo and caption will be permanently deleted.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-moment">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (momentToDelete) {
                    try {
                      await deleteMoment(momentToDelete);
                      // Update the moments library view if open
                      setAllMoments(prev => prev.map(tripData => ({
                        ...tripData,
                        moments: tripData.moments.filter(m => m.id !== momentToDelete)
                      })).filter(t => t.moments.length > 0));
                      toast({
                        title: "Memory deleted",
                        description: "The photo has been removed from your adventure.",
                      });
                    } catch (err) {
                      console.error("Failed to delete moment:", err);
                      toast({
                        title: "Error",
                        description: "Could not delete the memory. Please try again.",
                        variant: "destructive",
                      });
                    }
                    setMomentToDelete(null);
                  }
                }}
                className="bg-red-500 hover:bg-red-600"
                data-testid="button-confirm-delete-moment"
              >
                Delete Memory
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Custom Stop Dialog */}
        <Dialog open={showAddStopDialog} onOpenChange={(open) => {
          setShowAddStopDialog(open);
          if (!open) {
            setNewStopName("");
            setNewStopType("landmark");
            setNewStopAddress("");
            setAddressAutoFilled(false);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                Add a New Stop
              </DialogTitle>
              <DialogDescription>
                Add a custom stop to your {currentTrip?.name} adventure.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="stop-name">Stop Name</Label>
                <Input
                  id="stop-name"
                  placeholder="e.g., Rainbow Falls, Local Market..."
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  data-testid="input-stop-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stop-address" className="flex items-center gap-2">
                  Address
                  {isLookingUpAddress && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Looking up...
                    </span>
                  )}
                  {addressAutoFilled && !isLookingUpAddress && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Auto-filled
                    </span>
                  )}
                </Label>
                <Input
                  id="stop-address"
                  placeholder="Auto-filled from location name, or type manually..."
                  value={newStopAddress}
                  onChange={(e) => {
                    setNewStopAddress(e.target.value);
                    setAddressAutoFilled(false);
                  }}
                  data-testid="input-stop-address"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Stop Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "landmark", emoji: "🏛️", label: "Landmark" },
                    { value: "museum", emoji: "🎨", label: "Museum" },
                    { value: "park", emoji: "🌳", label: "Park" },
                    { value: "beach", emoji: "🏖️", label: "Beach" },
                    { value: "nature", emoji: "🌿", label: "Nature" },
                    { value: "temple", emoji: "⛩️", label: "Temple" },
                    { value: "market", emoji: "🛍️", label: "Market" },
                    { value: "restaurant", emoji: "🍽️", label: "Restaurant" },
                    { value: "viewpoint", emoji: "🔭", label: "Viewpoint" },
                    { value: "zoo", emoji: "🦁", label: "Zoo" },
                    { value: "aquarium", emoji: "🐠", label: "Aquarium" },
                    { value: "garden", emoji: "🌺", label: "Garden" },
                    { value: "plaza", emoji: "⛲", label: "Plaza" },
                    { value: "palace", emoji: "🏰", label: "Palace" },
                    { value: "bridge", emoji: "🌉", label: "Bridge" },
                    { value: "mountain", emoji: "⛰️", label: "Mountain" },
                    { value: "waterfall", emoji: "💧", label: "Waterfall" },
                    { value: "volcano", emoji: "🌋", label: "Volcano" },
                    { value: "neighborhood", emoji: "🏘️", label: "Neighborhood" },
                    { value: "street", emoji: "🛤️", label: "Street" },
                    { value: "street_food", emoji: "🍢", label: "Street Food" },
                    { value: "food", emoji: "🍜", label: "Food" },
                    { value: "culture", emoji: "🎭", label: "Culture" },
                    { value: "adventure", emoji: "🧗", label: "Adventure" },
                    { value: "city", emoji: "🏙️", label: "City" },
                    { value: "other", emoji: "📍", label: "Other" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setNewStopType(type.value)}
                      className={`p-2 rounded-lg border-2 transition-all text-center ${
                        newStopType === type.value
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                      data-testid={`button-stop-type-${type.value}`}
                    >
                      <span className="text-xl">{type.emoji}</span>
                      <p className="text-xs mt-1">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddStopDialog(false);
                  setNewStopName("");
                  setNewStopType("landmark");
                  setNewStopAddress("");
                  setAddressAutoFilled(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCustomStop}
                disabled={!newStopName.trim() || isAddingStop}
                className="bg-orange-500 hover:bg-orange-600"
                data-testid="button-confirm-add-stop"
              >
                {isAddingStop ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Stop
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Onboarding Tooltip Overlay */}
        <AnimatePresence>
          {showOnboardingTip && currentTip && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[100]"
              onClick={() => advanceOnboardingTip()}
            >
              <motion.div
                key={currentTip.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-2xl max-w-xs mx-4 border-2 border-orange-300"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{currentTip.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-white mb-1">
                      {currentTip.title}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {currentTip.text}
                    </p>
                  </div>
                </div>
                
                {/* Step indicator for multi-step */}
                {getCurrentTips().length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-3">
                    {getCurrentTips().map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === onboardingStep ? "bg-orange-500" : "bg-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={dismissOnboarding}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Skip
                  </button>
                  <Button
                    size="sm"
                    onClick={advanceOnboardingTip}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4"
                  >
                    {onboardingStep === getCurrentTips().length - 1 ? "Got it!" : "Next"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login/Signup Prompt */}
        <SignUpPrompt 
          isOpen={showLogin} 
          onClose={() => setShowLogin(false)} 
          onLogin={(data) => {
            if (typeof data === 'string') return;
            setShowLogin(false);
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          }}
          variant="travel"
        />
        
        {/* Launch promo popup — shown before signup for first 100 GeoAdventures families */}
        <LaunchPromoDialog
          open={showLaunchPromo && !user}
          onCreateAccount={() => {
            markLaunchPromoSeen();
            setShowLaunchPromo(false);
            setShowSignUpPrompt(true);
          }}
          onMaybeLater={() => {
            markLaunchPromoSeen();
            setShowLaunchPromo(false);
            setSignUpPromptDismissedThisSession(true);
          }}
        />

        {/* Sign Up Prompt for Adventure Creation - only show if NOT logged in */}
        <SignUpPrompt 
          isOpen={showSignUpPrompt && !user} 
          onClose={() => {
            setShowSignUpPrompt(false);
            setSignUpPromptDismissedThisSession(true);
          }} 
          onLogin={(data) => {
            if (typeof data === 'string') return;
            setShowSignUpPrompt(false);
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          }}
          onContinueWithoutSaving={() => {
            setShowSignUpPrompt(false);
            setSignUpPromptDismissedThisSession(true);
            setShowGuestBanner(true);
          }}
          variant="travel"
        />
        
        {/* Trophy Cabinet */}
        <TrophyCabinet 
          isOpen={showTrophyCabinet}
          onClose={() => setShowTrophyCabinet(false)}
        />
        
        {/* Account Settings Dialog */}
        <Dialog open={showAccountSettings} onOpenChange={setShowAccountSettings}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Account Settings
              </DialogTitle>
              <DialogDescription>
                Manage your account preferences
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Email */}
              <div className="flex justify-between items-center">
                <div>
                  <Label className="font-semibold">Email</Label>
                  <p className="text-sm text-muted-foreground">{user?.email || 'Not set'}</p>
                </div>
              </div>
              
              {/* Account Name */}
              <div className="flex justify-between items-center">
                <div>
                  <Label className="font-semibold">Account Name</Label>
                  <p className="text-sm text-muted-foreground">{user?.firstName || 'Not set'}</p>
                </div>
              </div>
              
              {/* Narrator Voice Preference */}
              <div className="flex justify-between items-center">
                <div>
                  <Label className="font-semibold">Narrator Voice</Label>
                  <p className="text-sm text-muted-foreground">Choose your preferred voice for stories</p>
                </div>
                <Select 
                  value={narratorVoice} 
                  onValueChange={async (value: 'eva' | 'avi') => {
                    setNarratorVoice(value);
                    setSavingVoice(true);
                    // Also update localStorage so JourneyPackPlayer syncs immediately
                    localStorage.setItem('geoquest_narrator_voice', value);
                    try {
                      await fetch('/api/user/narrator-voice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ voice: value })
                      });
                    } catch (error) {
                      console.error('Failed to save voice preference:', error);
                    } finally {
                      setSavingVoice(false);
                    }
                  }}
                  disabled={savingVoice}
                >
                  <SelectTrigger className="w-36" data-testid="select-narrator-voice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="end" sideOffset={4}>
                    <SelectItem value="eva">Eva (female)</SelectItem>
                    <SelectItem value="avi">Avi (male)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setShowAccountSettings(false)} data-testid="button-close-settings">
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Switch Adventure Sheet */}
        <SwitchAdventureSheet
          open={showSwitchAdventureSheet}
          onOpenChange={setShowSwitchAdventureSheet}
          trips={trips}
          activeAdventureId={selectActiveAdventure?.id || null}
          onSelectAdventure={(tripId) => {
            setSelectedTripId(tripId);
          }}
        />
        
        {/* FAB — hidden on empty state (no trips) and on Kids tab */}
        {view === "list" && !shouldShowDemoHero && landingTab !== 'kids' && trips.length > 0 && (
          <>
            <button
              onClick={() => setShowModeSelect(true)}
              className="fixed bottom-[76px] right-6 z-40 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              data-testid="button-fab-create"
            >
              <Plus className="w-7 h-7" />
            </button>

            {/* Mode Selection Full-Screen */}
            <AnimatePresence>
              {showModeSelect && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
                  style={{ background: "linear-gradient(160deg, #FDFCF9 0%, #F8F5F0 60%, #F3EFE8 100%)" }}
                  data-testid="screen-mode-select"
                >
                  {/* Subtle ambient blobs */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
                      style={{ background: "radial-gradient(circle, #E8A87C 0%, transparent 70%)" }} />
                    <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full opacity-15"
                      style={{ background: "radial-gradient(circle, #C4DFC8 0%, transparent 70%)" }} />
                  </div>

                  {/* Close button */}
                  <div className="relative z-10 flex items-center px-5 pt-safe-top pt-5 pb-2">
                    <button
                      onClick={() => setShowModeSelect(false)}
                      className="p-2 -ml-2 rounded-full text-[#8B7355] hover:bg-black/5 transition-colors"
                      data-testid="button-mode-select-close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-6 overflow-hidden">
                    {/* Compass icon */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                      style={{ background: "rgba(180,100,40,0.12)" }}>
                      <Compass className="w-6 h-6" style={{ color: "#A0622A" }} />
                    </div>

                    <h1 className="text-[24px] font-semibold text-center mb-1.5 leading-tight"
                      style={{ color: "#1F1F1F" }}>
                      Let's plan your adventure
                    </h1>
                    <p className="text-[14px] text-center mb-6 leading-snug max-w-[240px]"
                      style={{ color: "#6B6B6B" }}>
                      Choose how you want to experience today
                    </p>

                    <div className="w-full max-w-sm flex flex-col gap-4">

                      {/* Card 1 — For Parents */}
                      <button
                        onClick={() => {
                          setShowModeSelect(false);
                          setLocation("/build-adventure");
                        }}
                        className="w-full rounded-[20px] p-5 text-left transition-transform active:scale-[0.98]"
                        style={{
                          background: "linear-gradient(135deg, #FEF0E2 0%, #FAE6D0 100%)",
                          boxShadow: "0 6px 24px rgba(200,130,60,0.12), 0 2px 6px rgba(200,130,60,0.07)",
                        }}
                        data-testid="button-mode-real-trip"
                      >
                        {/* Top row: pill + icon */}
                        <div className="flex items-start justify-between mb-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{ background: "rgba(200,100,30,0.12)", color: "#9A5520" }}>
                            For parents
                          </span>
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "rgba(255,255,255,0.7)" }}>
                            <Plane className="w-5 h-5" style={{ color: "#C06828" }} />
                          </div>
                        </div>
                        {/* Title + sub */}
                        <p className="text-[20px] font-bold mb-1 leading-tight" style={{ color: "#7A3D10" }}>Plan your trip</p>
                        <p className="text-[13px] mb-4 leading-relaxed" style={{ color: "#9A5520" }}>
                          Smart, kid-friendly day plans built for you
                        </p>
                        {/* Bullets */}
                        <div className="space-y-1.5">
                          {["Balanced pacing (no meltdowns)", "Food & breaks included", "Zero planning stress"].map(b => (
                            <div key={b} className="flex items-center gap-2">
                              <span className="text-[13px]" style={{ color: "#C07840" }}>✓</span>
                              <span className="text-[13px]" style={{ color: "#7A3D10" }}>{b}</span>
                            </div>
                          ))}
                        </div>
                      </button>

                      {/* Card 2 — For Kids */}
                      <button
                        onClick={() => {
                          setShowModeSelect(false);
                          handleOpenHomeAdventureDialog();
                        }}
                        className="w-full rounded-[20px] p-5 text-left transition-transform active:scale-[0.98] relative overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, #DFF3E7 0%, #C8E8D4 100%)",
                          boxShadow: "0 6px 24px rgba(100,170,120,0.15), 0 2px 6px rgba(100,170,120,0.08)",
                        }}
                        data-testid="button-mode-virtual"
                      >
                        {/* Top row: pill + GeoBuddy */}
                        <div className="flex items-start justify-between mb-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{ background: "rgba(255,255,255,0.55)", color: "#3A7A50" }}>
                            For kids
                          </span>
                          <div className="w-12 h-12 shrink-0 -mt-1 -mr-1">
                            <GeoBuddyCharacter size="sm" pose="waving" />
                          </div>
                        </div>
                        {/* Title + sub */}
                        <p className="text-[20px] font-bold mb-1 leading-tight" style={{ color: "#1F4A30" }}>
                          Explore like a kid
                        </p>
                        <p className="text-[13px] mb-4 leading-relaxed" style={{ color: "#3E7055" }}>
                          Stories, games and missions for every place
                        </p>
                        {/* Bullets */}
                        <div className="space-y-1.5">
                          {["Interactive challenges", "GeoBuddy stories", "Earn rewards & XP"].map(b => (
                            <div key={b} className="flex items-center gap-2">
                              <span className="text-[13px]" style={{ color: "#5BA070" }}>✓</span>
                              <span className="text-[13px]" style={{ color: "#2D5E3E" }}>{b}</span>
                            </div>
                          ))}
                        </div>
                      </button>

                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Travel Games Modal */}
        <Dialog open={showTravelGamesModal} onOpenChange={(open) => {
          setShowTravelGamesModal(open);
          if (!open) setTravelGamesInitialGame(undefined);
        }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Travel Games</DialogTitle>
              <DialogDescription>Play family travel games</DialogDescription>
            </DialogHeader>
            {(() => {
              const activeTrip = selectActiveAdventure || heroContext.trip;
              if (!activeTrip) return null;
              return (
                <PlayTogether
                  tripId={activeTrip.id}
                  destination={activeTrip.destination}
                  city={activeTrip.city || undefined}
                  country={activeTrip.country || undefined}
                  isActiveTrip={true}
                  userId={activeTrip.userId}
                  stopNames={(tripStopsMap[activeTrip.id] || []).map(s => s.name)}
                  initialGame={travelGamesInitialGame}
                  onInitialGameDismissed={() => setTravelGamesInitialGame(undefined)}
                />
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Exit Adventure Prompt - streak protection when leaving GeoAdventures */}
        <ExitAdventurePrompt
          open={showExitPrompt}
          onClose={() => setShowExitPrompt(false)}
          explorerId={activeExplorer?.id}
          onPlayQuickGame={() => {
            setShowExitPrompt(false);
            // Navigate to Daily Quest
            window.location.href = '/?openDailyQuest=true';
          }}
          onNotToday={() => {
            setShowExitPrompt(false);
            setLocation("/");
          }}
        />


        <AnimatePresence>
          {showMissionSummary && currentTrip && (
            <MissionCompletionSummary
              tripName={currentTrip.name}
              totalMissions={currentTrip?.totalMissions || 0}
              missionsCompleted={currentTrip?.missionsCompleted || 0}
              totalXp={currentTrip?.missionXpTotal || 0}
              keepsakesEarned={collectedKeepsakes}
              onClose={() => setShowMissionSummary(false)}
            />
          )}
        </AnimatePresence>

        {showTripPreview && dialogTrip && (
          <TripPreviewModal
            trip={dialogTrip}
            stops={dialogTripStops}
            loading={dialogDataLoading}
            onClose={() => { setShowTripPreview(false); setDialogTripStops([]); }}
          />
        )}

        {view === "list" && !shouldShowDemoHero && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 safe-bottom" data-testid="geoadventures-tab-bar">
            <div className="flex items-stretch max-w-2xl mx-auto">
              {([
                { id: 'trips' as const, label: 'Trips', icon: '✈️' },
                { id: 'now' as const, label: 'Now', icon: '📍' },
                { id: 'kids' as const, label: 'Kids', icon: '🎮' },
                { id: 'me' as const, label: 'Me', icon: '🧭' },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLandingTab(tab.id)}
                  className={`relative flex-1 flex flex-col items-center justify-center py-4 gap-1 transition-colors ${
                    landingTab === tab.id
                      ? 'text-orange-500 dark:text-orange-400'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  data-testid={`tab-geoadventures-${tab.id}`}
                >
                  <span className="text-2xl leading-none">{tab.icon}</span>
                  <span className={`text-xs font-semibold leading-none ${landingTab === tab.id ? 'text-orange-500 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {tab.label}
                  </span>
                  {landingTab === tab.id && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
