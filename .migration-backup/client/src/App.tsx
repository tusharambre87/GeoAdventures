import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, Suspense, lazy, type ReactNode, type ComponentType } from "react";
import { UserProvider, useUser } from "./lib/userContext";
import { ExplorerProvider, useExplorer } from "./lib/explorerContext";
import { useRef } from "react";
import { ParentalGateProvider } from "@/components/ParentalGate";
import { RewardProvider, useRewards } from "@/components/RewardSystem";
import { SessionProvider } from "./lib/sessionContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { VerificationReminder } from "@/components/VerificationReminder";
import { onVerificationReminderTriggered, dismissVerificationReminder } from "./lib/verificationReminder";
import { GeoBuddy, type GeoBuddyRef } from "@/components/GeoBuddy";
import { GeoBuddyProvider } from "./lib/geoBuddyContext";
import { OfflineBanner, InstallPrompt, UpdatePrompt, DownloadBanner } from "@/components/PWAComponents";
import { OfflineProvider } from "./lib/offlineContext";
import { SubscriptionProvider } from "./lib/subscriptionContext";
import { TravelProvider } from "./lib/travelContext";
import { AdLayout } from "@/components/AdBanner";
import { BottomNav } from "@/components/BottomNav";
import { XPGainToastProvider } from "@/components/XPGainToast";
import { MasteryCompleteModal } from "@/components/MasteryCompleteModal";
import { MilestoneCelebrationProvider } from "@/components/MilestoneCelebration";
import { GatedTravelMode } from "@/components/GatedTravelMode";
import { AdventureRoutes } from "@/pages/adventure/AdventureRoutes";
import { LOCATION_CARDS } from "./lib/gameData";
import { DAILY_QUEST_CITIES } from "./lib/dailyQuestData";
import { STATE_MAP_IMAGES } from "./lib/spellGeoData";

function LazyLoadError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <p className="text-lg font-semibold mb-2">A new version is available!</p>
      <p className="text-sm text-gray-500 mb-4">Please refresh to get the latest updates.</p>
      <button
        onClick={async () => {
          sessionStorage.removeItem('lazy_reload_attempted');
          try {
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map(r => r.unregister()));
            }
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
          } catch {}
          window.location.reload();
        }}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        data-testid="button-refresh-app"
      >
        Refresh Now
      </button>
    </div>
  );
}

function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    importFn().catch((error) => {
      console.error('Dynamic import failed:', error);
      const hasReloaded = sessionStorage.getItem('lazy_reload_attempted');
      if (!hasReloaded) {
        sessionStorage.setItem('lazy_reload_attempted', 'true');
        window.location.reload();
        return new Promise<{ default: T }>((resolve) =>
          setTimeout(() => resolve({ default: LazyLoadError as unknown as T }), 5000)
        );
      }
      return new Promise<{ default: T }>((resolve) =>
        setTimeout(() => {
          importFn()
            .then(resolve)
            .catch(() => resolve({ default: LazyLoadError as unknown as T }));
        }, 1000)
      );
    })
  );
}

import Home from "@/pages/Home";
import WhosPlaying from "@/pages/WhosPlaying";

const pageImports = {
  Game: () => import("@/pages/Game"),
  Crossworld: () => import("@/pages/Crossworld"),
  FindMyHome: () => import("@/pages/FindMyHome"),
  SpellGeo: () => import("@/pages/SpellGeo"),
  TripSharePage: () => import("@/pages/TripSharePage"),
  ReplayPage: () => import("@/pages/ReplayPage"),
  JournalAllPage: () => import("@/pages/JournalAllPage"),
  PrivacyPolicy: () => import("@/pages/PrivacyPolicy"),
  TermsOfService: () => import("@/pages/TermsOfService"),
  Unsubscribe: () => import("@/pages/Unsubscribe"),
  EmailPreferences: () => import("@/pages/EmailPreferences"),
  Analytics: () => import("@/pages/Analytics"),
  TreasureVault: () => import("@/pages/TreasureVault"),
  MiniGames: () => import("@/pages/MiniGames"),
  GeoMaze: () => import("@/pages/GeoMaze"),
  GeoArt: () => import("@/pages/GeoArt"),
  SpinTheWorld: () => import("@/pages/SpinTheWorld"),
  KnowledgeHub: () => import("@/pages/KnowledgeHub"),
  PassportView: () => import("@/pages/PassportView"),
  CityHub: () => import("@/pages/CityHub"),
  Explore: () => import("@/pages/Explore"),
  AddExplorer: () => import("@/pages/AddExplorer"),
  ParentDashboard: () => import("@/pages/ParentDashboard"),
  Upgrade: () => import("@/pages/Upgrade"),
  Pricing: () => import("@/pages/Pricing"),
  TripUnlock: () => import("@/pages/TripUnlock"),
  FoundingFamilies: () => import("@/pages/FoundingFamilies"),
  MapMe: () => import("@/pages/MapMe"),
  Support: () => import("@/pages/Support"),
  NotFound: () => import("@/pages/not-found"),
  TravelMode: () => import("@/pages/TravelMode"),
  GeoBuddyDemo: () => import("@/pages/GeoBuddyDemo"),
  ArtifactVault: () => import("@/pages/ArtifactVault"),
  GeoRelicPuzzles: () => import("@/pages/GeoRelicPuzzles"),
  ItinerarySharePage: () => import("@/pages/ItinerarySharePage"),
  BrowseItineraries: () => import("@/pages/BrowseItineraries"),
  AboutUs: () => import("@/pages/AboutUs"),
  GeoShorts: () => import("@/pages/GeoShorts"),
  Reviews: () => import("@/pages/Reviews"),
  GeoAdventuresLanding: () => import("@/pages/GeoAdventuresLanding"),
  GeoGamesLanding: () => import("@/pages/GeoGamesLanding"),
  FreeGuide: () => import("@/pages/FreeGuide"),
  GuideUnsubscribed: () => import("@/pages/GuideUnsubscribed"),
  DailyQuestPage: () => import("@/pages/DailyQuestPage"),
  PlayGames: () => import("@/pages/PlayGames"),
  AdminDashboard: () => import("@/pages/AdminDashboard"),
  UnlockPage: () => import("@/pages/UnlockPage"),
  ExplorerMap: () => import("@/pages/ExplorerMap"),
  GeoBuddyAdventures: () => import("@/pages/GeoBuddyAdventures"),
  GeoBuddyStoryPlayer: () => import("@/pages/GeoBuddyStoryPlayer"),
  GeoAtlas: () => import("@/pages/GeoAtlas"),
  ExplorePage: () => import("@/pages/ExplorePage"),
  ExplorerIdentity: () => import("@/pages/ExplorerIdentity"),
  AdventureBuilder: () => import("@/pages/AdventureBuilder"),
  ParentPlanView: () => import("@/pages/adventure/ParentPlanView"),
  CompassQuest: () => import("@/pages/CompassQuest"),
  ChallengeIntro: () => import("@/pages/ChallengeIntro"),
  ChallengeResults: () => import("@/pages/ChallengeResults"),
  TripPlanner: () => import("@/pages/planner/TripPlanner"),
  VirtualAdventuresList: () => import("@/pages/adventure/VirtualAdventuresList"),
  TripContextScreen: () => import("@/pages/adventure/TripContextScreen"),
  StartDayScreen: () => import("@/pages/adventure/StartDayScreen"),
  TodayScreen: () => import("@/pages/adventure/TodayScreen"),
  StopViewScreen: () => import("@/pages/adventure/StopViewScreen"),
  EndDayScreen: () => import("@/pages/adventure/EndDayScreen"),
  EndTripScreen: () => import("@/pages/adventure/EndTripScreen"),
  StoryReadyScreen: () => import("@/pages/adventure/StoryReadyScreen"),
  TripMemoryHub: () => import("@/pages/adventure/TripMemoryHub"),
  BlogList: () => import("@/pages/BlogList"),
  BlogPost: () => import("@/pages/BlogPost"),
};


const Game = lazyWithRetry(pageImports.Game);
const Crossworld = lazyWithRetry(pageImports.Crossworld);
const FindMyHome = lazyWithRetry(pageImports.FindMyHome);
const SpellGeo = lazyWithRetry(pageImports.SpellGeo);
const TripSharePage = lazyWithRetry(pageImports.TripSharePage);
const ReplayPage = lazyWithRetry(pageImports.ReplayPage);
const JournalAllPage = lazyWithRetry(pageImports.JournalAllPage);
const PrivacyPolicy = lazyWithRetry(pageImports.PrivacyPolicy);
const TermsOfService = lazyWithRetry(pageImports.TermsOfService);
const Unsubscribe = lazyWithRetry(pageImports.Unsubscribe);
const EmailPreferences = lazyWithRetry(pageImports.EmailPreferences);
const Analytics = lazyWithRetry(pageImports.Analytics);
const TreasureVault = lazyWithRetry(pageImports.TreasureVault);
const MiniGames = lazyWithRetry(pageImports.MiniGames);
const GeoMaze = lazyWithRetry(pageImports.GeoMaze);
const GeoArt = lazyWithRetry(pageImports.GeoArt);
const SpinTheWorld = lazyWithRetry(pageImports.SpinTheWorld);
const KnowledgeHub = lazyWithRetry(pageImports.KnowledgeHub);
const PassportView = lazyWithRetry(pageImports.PassportView);
const CityHub = lazyWithRetry(pageImports.CityHub);
const Explore = lazyWithRetry(pageImports.Explore);
const AddExplorer = lazyWithRetry(pageImports.AddExplorer);
const ParentDashboard = lazyWithRetry(pageImports.ParentDashboard);
const Upgrade = lazyWithRetry(pageImports.Upgrade);
const Pricing = lazyWithRetry(pageImports.Pricing);
const TripUnlock = lazyWithRetry(pageImports.TripUnlock);
const FoundingFamilies = lazyWithRetry(pageImports.FoundingFamilies);
const MapMe = lazyWithRetry(pageImports.MapMe);
const Support = lazyWithRetry(pageImports.Support);
const NotFound = lazyWithRetry(pageImports.NotFound);
const TravelMode = lazyWithRetry(pageImports.TravelMode);
const GeoBuddyDemo = lazyWithRetry(pageImports.GeoBuddyDemo);
const ArtifactVault = lazyWithRetry(pageImports.ArtifactVault);
const GeoRelicPuzzles = lazyWithRetry(pageImports.GeoRelicPuzzles);
const ItinerarySharePage = lazyWithRetry(pageImports.ItinerarySharePage);
const BrowseItineraries = lazyWithRetry(pageImports.BrowseItineraries);
const AboutUs = lazyWithRetry(pageImports.AboutUs);
const GeoShorts = lazyWithRetry(pageImports.GeoShorts);
const Reviews = lazyWithRetry(pageImports.Reviews);
const GeoAdventuresLanding = lazyWithRetry(pageImports.GeoAdventuresLanding);
const GeoGamesLanding = lazyWithRetry(pageImports.GeoGamesLanding);
const FreeGuide = lazyWithRetry(pageImports.FreeGuide);
const GuideUnsubscribed = lazyWithRetry(pageImports.GuideUnsubscribed);
const DailyQuestPage = lazyWithRetry(pageImports.DailyQuestPage);
const PlayGames = lazyWithRetry(pageImports.PlayGames);
const AdminDashboard = lazyWithRetry(pageImports.AdminDashboard);
const UnlockPage = lazyWithRetry(pageImports.UnlockPage);
const ExplorerMap = lazyWithRetry(pageImports.ExplorerMap);
const GeoBuddyAdventures = lazyWithRetry(pageImports.GeoBuddyAdventures);
const GeoBuddyStoryPlayer = lazyWithRetry(pageImports.GeoBuddyStoryPlayer);
const GeoAtlas = lazyWithRetry(pageImports.GeoAtlas);
const ExplorePage = lazyWithRetry(pageImports.ExplorePage);
const ExplorerIdentity = lazyWithRetry(pageImports.ExplorerIdentity);
const AdventureBuilder = lazyWithRetry(pageImports.AdventureBuilder);
const ParentPlanView = lazyWithRetry(pageImports.ParentPlanView);
const CompassQuest = lazyWithRetry(pageImports.CompassQuest);
const ChallengeIntro = lazyWithRetry(pageImports.ChallengeIntro);
const ChallengeResults = lazyWithRetry(pageImports.ChallengeResults);
const TripPlanner = lazyWithRetry(pageImports.TripPlanner);
const VirtualAdventuresList = lazyWithRetry(pageImports.VirtualAdventuresList);
const TripContextScreen = lazyWithRetry(pageImports.TripContextScreen);
const StartDayScreen = lazyWithRetry(pageImports.StartDayScreen);
const TodayScreen = lazyWithRetry(pageImports.TodayScreen);
const StopViewScreen = lazyWithRetry(pageImports.StopViewScreen);
const EndDayScreen = lazyWithRetry(pageImports.EndDayScreen);
const EndTripScreen = lazyWithRetry(pageImports.EndTripScreen);
const StoryReadyScreen = lazyWithRetry(pageImports.StoryReadyScreen);
const TripMemoryHub = lazyWithRetry(pageImports.TripMemoryHub);
const BlogList = lazyWithRetry(pageImports.BlogList);
const BlogPost = lazyWithRetry(pageImports.BlogPost);

function isGeoAdventuresSubdomain(): boolean {
  const hostname = window.location.hostname;
  return hostname.includes('geoadventures.') || hostname.startsWith('geoadventures.');
}

function isGeoGamesSubdomain(): boolean {
  const hostname = window.location.hostname;
  return hostname.includes('geogames.') || hostname.startsWith('geogames.');
}

function prefetchAllPages() {
  if (!navigator.onLine) return;
  const hasPrefetched = sessionStorage.getItem('pages_prefetched');
  if (hasPrefetched) return;
  
  console.log('[Prefetch] Pre-loading all page chunks for offline support...');
  const corePages = ['Game', 'Crossworld', 'FindMyHome', 'SpellGeo', 'MiniGames', 'TreasureVault', 'GeoArt', 'SpinTheWorld', 'KnowledgeHub', 'Explore', 'MapMe'] as const;
  
  let loaded = 0;
  corePages.forEach((pageName) => {
    const importFn = pageImports[pageName];
    if (importFn) {
      importFn().then(() => {
        loaded++;
        if (loaded === corePages.length) {
          console.log('[Prefetch] All core pages pre-loaded for offline use');
          sessionStorage.setItem('pages_prefetched', 'true');
        }
      }).catch((err) => {
        console.log('[Prefetch] Failed to prefetch', pageName, err.message);
      });
    }
  });
}

async function prefetchFlagsForOffline() {
  if (!navigator.onLine) return;
  const hasCachedFlags = sessionStorage.getItem('flags_cached');
  if (hasCachedFlags) return;

  console.log('[Prefetch] Pre-caching flag images for offline play...');
  const allFlagUrls = new Set<string>();
  
  LOCATION_CARDS.forEach(card => {
    if (card.flagUrl) allFlagUrls.add(card.flagUrl);
  });
  DAILY_QUEST_CITIES.forEach(city => {
    if (city.flagUrl) allFlagUrls.add(city.flagUrl);
  });
  
  let prefetched = 0;
  const urlArray = Array.from(allFlagUrls);
  
  for (let i = 0; i < urlArray.length; i += 5) {
    const batch = urlArray.slice(i, i + 5);
    await Promise.all(batch.map(async (url) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        await new Promise<void>((resolve) => {
          img.onload = () => { prefetched++; resolve(); };
          img.onerror = () => resolve();
        });
      } catch (e) {
        // Skip failed flags
      }
    }));
  }
  console.log(`[Prefetch] Pre-loaded ${prefetched} flag images for offline use`);
  sessionStorage.setItem('flags_cached', 'true');
}

async function prefetchStateMapsForOffline() {
  if (!navigator.onLine) return;
  const hasCachedMaps = sessionStorage.getItem('state_maps_cached');
  if (hasCachedMaps) return;

  console.log('[Prefetch] Pre-caching state map images for offline play...');
  const stateMapUrls = Object.values(STATE_MAP_IMAGES);
  
  let prefetched = 0;
  for (let i = 0; i < stateMapUrls.length; i += 5) {
    const batch = stateMapUrls.slice(i, i + 5);
    await Promise.all(batch.map(async (url) => {
      try {
        const img = new Image();
        img.src = url;
        await new Promise<void>((resolve) => {
          img.onload = () => { prefetched++; resolve(); };
          img.onerror = () => resolve();
        });
      } catch (e) {
        // Skip failed maps
      }
    }));
  }
  console.log(`[Prefetch] Pre-loaded ${prefetched} state map images for offline use`);
  sessionStorage.setItem('state_maps_cached', 'true');
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-blue-200 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="text-6xl animate-bounce mb-4">🌍</div>
        <p className="text-blue-600 dark:text-blue-300 font-medium">Loading...</p>
      </div>
    </div>
  );
}

function ExplorerStatsSync({ children }: { children: ReactNode }) {
  const { activeExplorer } = useExplorer();
  const { loadPlayerFromBackend, currentPlayerId } = useUser();
  const lastSyncedExplorerId = useRef<string | null>(null);

  useEffect(() => {
    if (activeExplorer?.id && activeExplorer.id !== lastSyncedExplorerId.current) {
      lastSyncedExplorerId.current = activeExplorer.id;
      loadPlayerFromBackend(activeExplorer.id);
    }
  }, [activeExplorer?.id, loadPlayerFromBackend]);

  return <>{children}</>;
}

function SessionWithExplorer({ children }: { children: ReactNode }) {
  const { activeExplorer } = useExplorer();
  return (
    <SessionProvider playerId={activeExplorer?.id}>
      <ExplorerStatsSync>
        {children}
      </ExplorerStatsSync>
    </SessionProvider>
  );
}

function Router() {
  useAnalytics();
  
  const isAdventuresSubdomain = isGeoAdventuresSubdomain();
  const isGamesSubdomain = isGeoGamesSubdomain();
  
  const getRootComponent = () => {
    if (isAdventuresSubdomain) return GatedTravelMode;
    if (isGamesSubdomain) return GeoGamesLanding;
    return Home;
  };
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={getRootComponent()} />
        <Route path="/geoadventures-landing" component={GeoAdventuresLanding} />
        <Route path="/geogames-landing" component={GeoGamesLanding} />
        <Route path="/free-guide" component={FreeGuide} />
        <Route path="/free-guide/unsubscribed" component={GuideUnsubscribed} />
        <Route path="/play" component={Game} />
        <Route path="/game" component={Game} />
        <Route path="/crossworld" component={Crossworld} />
        <Route path="/find-my-home" component={FindMyHome} />
        <Route path="/spell-geo" component={SpellGeo} />
        <Route path="/s/:tripId" component={TripSharePage} />
        <Route path="/replay/:tripId" component={ReplayPage} />
        <Route path="/journal" component={JournalAllPage} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/unsubscribe" component={Unsubscribe} />
        <Route path="/email-preferences" component={EmailPreferences} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/sticker-book" component={TreasureVault} />
        <Route path="/mini-games" component={MiniGames} />
        <Route path="/geo-maze" component={GeoMaze} />
        <Route path="/geo-art" component={GeoArt} />
        <Route path="/spin-the-world" component={SpinTheWorld} />
        <Route path="/knowledge-hub" component={KnowledgeHub} />
        <Route path="/passport" component={PassportView} />
        <Route path="/city/:cityId" component={CityHub} />
        <Route path="/geo-atlas" component={GeoAtlas} />
        <Route path="/explore" component={ExplorePage} />
        <Route path="/world-gallery" component={Explore} />
        <Route path="/whos-playing" component={WhosPlaying} />
        <Route path="/add-explorer" component={AddExplorer} />
        <Route path="/parent-dashboard" component={ParentDashboard} />
        <Route path="/upgrade" component={Upgrade} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/trip-unlock" component={TripUnlock} />
        <Route path="/founding-families" component={FoundingFamilies} />
        <Route path="/map-me" component={MapMe} />
        <Route path="/support" component={Support} />
        <Route path="/geoadventures" component={GatedTravelMode} />
        <Route path="/travel" component={GatedTravelMode} />
        <Route path="/travel-keepsake" component={ArtifactVault} />
        <Route path="/georelic-puzzles" component={GeoRelicPuzzles} />
        <Route path="/geobuddy-demo" component={GeoBuddyDemo} />
        <Route path="/itinerary/:slug" component={ItinerarySharePage} />
        <Route path="/browse-itineraries" component={BrowseItineraries} />
        <Route path="/about" component={AboutUs} />
        <Route path="/blog" component={BlogList} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/geoshorts" component={GeoShorts} />
        <Route path="/reviews" component={Reviews} />
        <Route path="/play-games" component={PlayGames} />
        <Route path="/daily-quest" component={DailyQuestPage} />
        <Route path="/explorer-map" component={ExplorerMap} />
        <Route path="/explorer-identity" component={ExplorerIdentity} />
        <Route path="/geobuddy-adventures" component={GeoBuddyAdventures} />
        <Route path="/stories/:storyId" component={GeoBuddyStoryPlayer} />
        <Route path="/admin-dashboard" component={AdminDashboard} />
        <Route path="/dashboard" component={AdminDashboard} />
        <Route path="/unlock" component={UnlockPage} />
        <Route path="/build-adventure" component={AdventureBuilder} />
        <Route path="/trip-planner" nest component={TripPlanner} />
        <Route path="/virtual-adventures" component={VirtualAdventuresList} />
        <Route path="/adventure/:tripId/context" component={TripContextScreen} />
        <Route path="/adventure/:tripId/parent-plan" component={ParentPlanView} />
        <Route path="/adventure/:tripId/start-day" component={StartDayScreen} />
        <Route path="/adventure/:tripId/today" component={TodayScreen} />
        <Route path="/adventure/:tripId/stop/:stopId" component={StopViewScreen} />
        <Route path="/adventure/:tripId/end-day" component={EndDayScreen} />
        <Route path="/adventure/:tripId/story-ready" component={StoryReadyScreen} />
        <Route path="/adventure/:tripId/end-trip" component={EndTripScreen} />
        <Route path="/adventure/:tripId/memory" component={TripMemoryHub} />
        <Route path="/compass-quest" component={CompassQuest} />
        <Route path="/challenge/:share_code" component={ChallengeIntro} />
        <Route path="/challenge/:share_code/results/:attempt_id" component={ChallengeResults} />
        <Route path="/adventure/:tripId/*" component={AdventureRoutes} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ErrorFallback({ error }: { error?: Error }) {
  const isChunkError = error?.message?.includes('Importing a module script failed')
    || error?.message?.includes('Failed to fetch dynamically imported module')
    || error?.message?.includes('Loading chunk')
    || error?.message?.includes('failed to fetch');

  const handleRefresh = () => {
    sessionStorage.removeItem('lazy_reload_attempted');
    sessionStorage.removeItem('chunk_reload');
    window.location.reload();
  };

  if (isChunkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-blue-200 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h1 className="text-2xl font-bold text-blue-800 mb-2">New version available!</h1>
          <p className="text-gray-600 mb-6">
            A fresh update is ready. Tap below to load the latest version.
          </p>
          <button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Load Latest Version
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-blue-200 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">🌍</div>
        <h1 className="text-2xl font-bold text-blue-800 mb-2">Oops! Something went wrong</h1>
        <p className="text-gray-600 mb-4">
          Don't worry, our explorers are fixing it! Try refreshing the page.
        </p>
        {error && (
          <p className="text-xs text-red-500 bg-red-50 rounded p-2 mb-4 text-left font-mono break-all">
            {error.message}
          </p>
        )}
        <button
          onClick={handleRefresh}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

function findCityById(cityId: string) {
  const allCities = [...LOCATION_CARDS, ...DAILY_QUEST_CITIES];
  return allCities.find(c => c.id === cityId);
}

function RewardEvaluator() {
  const { activeExplorer } = useExplorer();
  const { evaluateRewards, showRewardUnlock } = useRewards();
  const unlockQueueRef = useRef<Array<{ unlock: any; explorerName: string }>>([]);
  const isShowingRef = useRef(false);

  const showNextUnlock = () => {
    if (unlockQueueRef.current.length === 0) {
      isShowingRef.current = false;
      return;
    }
    isShowingRef.current = true;
    const next = unlockQueueRef.current.shift();
    if (next) {
      showRewardUnlock(next.unlock, next.explorerName, showNextUnlock);
    }
  };

  useEffect(() => {
    const handleCityMastery = async (event: Event) => {
      const customEvent = event as CustomEvent<{ cityId: string; explorerId?: string }>;
      const explorerId = customEvent.detail?.explorerId;
      
      if (!explorerId) return;
      
      const explorerName = activeExplorer?.id === explorerId ? activeExplorer.name : 'Explorer';
      
      try {
        const newUnlocks = await evaluateRewards(explorerId);
        if (newUnlocks.length > 0) {
          newUnlocks.forEach(unlock => {
            unlockQueueRef.current.push({ unlock, explorerName });
          });
          
          if (!isShowingRef.current) {
            setTimeout(() => {
              showNextUnlock();
            }, 1500);
          }
        }
      } catch (error) {
        console.error('Failed to evaluate rewards:', error);
      }
    };

    window.addEventListener('cityMasteryComplete', handleCityMastery);
    return () => {
      window.removeEventListener('cityMasteryComplete', handleCityMastery);
    };
  }, [activeExplorer?.id, activeExplorer?.name, evaluateRewards, showRewardUnlock]);

  useEffect(() => {
    const handleSpinEarned = (event: Event) => {
      const { reason } = (event as CustomEvent).detail || {};
      if (!reason) return;
      const explorerIdStr = activeExplorer?.id;
      if (!explorerIdStr) return;
      import('@/lib/spinSystem').then(({ earnSpins }) => {
        const amount = earnSpins(explorerIdStr, reason);
        if (amount > 0) {
          const reasonLabels: Record<string, string> = {
            daily_quest_completed: 'Quest completed',
            city_discovered: 'City discovered',
            adventure_stop_completed: 'Adventure completed',
            rank_up: 'Rank up',
            daily_login: 'Daily login',
          };
          toast.success(`+${amount} Spin${amount > 1 ? 's' : ''} earned!`, {
            description: reasonLabels[reason] || 'Keep exploring!',
            duration: 3000,
          });
        }
      });
    };

    window.addEventListener('geoquest:spin-earned', handleSpinEarned);
    return () => window.removeEventListener('geoquest:spin-earned', handleSpinEarned);
  }, [activeExplorer?.id]);

  return null;
}

function ChallengeRedirectAfterLogin() {
  const { activeExplorer } = useExplorer();
  useEffect(() => {
    if (!activeExplorer) return;
    const code = sessionStorage.getItem("challenge_redirect");
    if (code) {
      sessionStorage.removeItem("challenge_redirect");
      window.location.href = `/challenge/${code}`;
    }
  }, [activeExplorer?.id]);
  return null;
}

function App() {
  const [showVerificationReminder, setShowVerificationReminder] = useState(false);
  const [reminderData, setReminderData] = useState<{ email?: string; starsEarned?: number }>({});
  const [showMasteryModal, setShowMasteryModal] = useState(false);
  const [masteredCity, setMasteredCity] = useState<{ cityName: string; countryName: string; flagUrl?: string; isFullMastery?: boolean } | null>(null);
  const geoBuddyRef = useRef<GeoBuddyRef>(null);

  // PWA: show "tap to refresh" when a new service worker takes control
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    const handleControllerChange = () => {
      if (hadController) {
        toast("App updated!", {
          description: "Tap Refresh to get the latest version",
          action: { label: "Refresh", onClick: () => window.location.reload() },
          duration: 60000,
        });
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  useEffect(() => {
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
      initGA();
    }
    
    setTimeout(() => {
      prefetchAllPages();
      prefetchFlagsForOffline();
      prefetchStateMapsForOffline();
    }, 3000);
    
    const handleOnlineForPrefetch = () => {
      setTimeout(() => {
        prefetchAllPages();
        prefetchFlagsForOffline();
        prefetchStateMapsForOffline();
      }, 2000);
    };
    window.addEventListener('online', handleOnlineForPrefetch);
    return () => window.removeEventListener('online', handleOnlineForPrefetch);
  }, []);

  useEffect(() => {
    const unsubscribe = onVerificationReminderTriggered((data) => {
      setReminderData(data);
      setShowVerificationReminder(true);
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleCityMastery = (event: Event) => {
      const customEvent = event as CustomEvent<{ cityId: string; isFullMastery?: boolean }>;
      const cityId = customEvent.detail?.cityId;
      const isFullMastery = customEvent.detail?.isFullMastery ?? false;
      if (!cityId) return;
      
      const city = findCityById(cityId);
      if (city) {
        setMasteredCity({
          cityName: city.city,
          countryName: city.country,
          flagUrl: city.flagUrl,
          isFullMastery,
        });
        setShowMasteryModal(true);
      }
    };

    window.addEventListener('cityMasteryComplete', handleCityMastery);
    return () => {
      window.removeEventListener('cityMasteryComplete', handleCityMastery);
    };
  }, []);

  useEffect(() => {
    const handleGraceUsed = (event: Event) => {
      const customEvent = event as CustomEvent<{ streak: number }>;
      const streak = customEvent.detail?.streak || 0;
      toast.warning(`Grace day used! 🌟`, {
        description: `Your ${streak}-day streak is safe! Play tomorrow to keep it going.`,
        duration: 5000,
      });
    };

    window.addEventListener('geoquest:grace-used', handleGraceUsed);
    return () => {
      window.removeEventListener('geoquest:grace-used', handleGraceUsed);
    };
  }, []);

  // App-wide offline rewards sync - syncs when coming back online from any page
  useEffect(() => {
    const syncOfflineRewards = async () => {
      if (!navigator.onLine) return;
      
      const queueKey = 'geoquest_offline_rewards_queue';
      const existingQueue = localStorage.getItem(queueKey);
      if (!existingQueue) return;
      
      const queue = JSON.parse(existingQueue);
      if (queue.length === 0) return;
      
      console.log(`🔄 [App] Syncing ${queue.length} offline rewards...`);
      const failedItems: any[] = [];
      
      for (const item of queue) {
        try {
          const response = await fetch(`/api/players/${item.explorerId}/add-game-rewards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.rewards),
          });
          
          if (response.ok) {
            console.log(`✅ [App] Synced offline rewards for ${item.playerName}: ${item.rewards.stars} stars`);
          } else {
            failedItems.push(item);
          }
        } catch (error) {
          console.error(`[App] Failed to sync rewards for ${item.playerName}:`, error);
          failedItems.push(item);
        }
      }
      
      // Save failed items back to queue, or clear if all succeeded
      if (failedItems.length > 0) {
        localStorage.setItem(queueKey, JSON.stringify(failedItems));
      } else {
        localStorage.removeItem(queueKey);
      }
    };
    
    // Sync on mount if online
    syncOfflineRewards();
    
    // Sync when coming back online
    const handleOnline = () => {
      console.log('📶 [App] Back online - syncing offline rewards...');
      setTimeout(syncOfflineRewards, 1000); // Small delay to ensure connection is stable
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleCloseReminder = () => {
    setShowVerificationReminder(false);
    dismissVerificationReminder();
  };

  const handleCloseMasteryModal = () => {
    setShowMasteryModal(false);
    setMasteredCity(null);
  };

  return (
    <Sentry.ErrorBoundary fallback={({ error }) => <ErrorFallback error={error as Error} />}>
      <ThemeProvider defaultTheme="light" storageKey="geoquest-theme">
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <SubscriptionProvider>
            <ExplorerProvider>
              <SessionWithExplorer>
                <ParentalGateProvider>
                <RewardProvider>
                <OfflineProvider>
                <TravelProvider>
                <GeoBuddyProvider buddyRef={geoBuddyRef}>
                <TooltipProvider>
                  <MilestoneCelebrationProvider>
                  <RewardEvaluator />
                  <ChallengeRedirectAfterLogin />
                  <AdLayout>
                    <OfflineBanner />
                    <Toaster />
                    <Router />
                    <BottomNav />
                    <XPGainToastProvider />
                    <GeoBuddy ref={geoBuddyRef} />
                    <InstallPrompt />
                    <UpdatePrompt />
                    <VerificationReminder
                      isOpen={showVerificationReminder}
                      onClose={handleCloseReminder}
                      email={reminderData.email}
                      starsEarned={reminderData.starsEarned}
                    />
                    {masteredCity && (
                      <MasteryCompleteModal
                        isOpen={showMasteryModal}
                        onClose={handleCloseMasteryModal}
                        cityName={masteredCity.cityName}
                        countryName={masteredCity.countryName}
                        flagUrl={masteredCity.flagUrl}
                        isFullMastery={masteredCity.isFullMastery}
                      />
                    )}
                  </AdLayout>
                  </MilestoneCelebrationProvider>
                </TooltipProvider>
                </GeoBuddyProvider>
                </TravelProvider>
                </OfflineProvider>
                </RewardProvider>
              </ParentalGateProvider>
              </SessionWithExplorer>
            </ExplorerProvider>
            </SubscriptionProvider>
          </UserProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
