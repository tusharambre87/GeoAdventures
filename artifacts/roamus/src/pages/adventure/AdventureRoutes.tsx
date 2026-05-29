import { Switch, Route } from "wouter";
import { AdventureShell } from "./AdventureShell";
import { lazy, Suspense, ComponentType } from "react";

function EmptyFallback() {
  return null;
}

function lazyRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): ReturnType<typeof lazy> {
  return lazy(() =>
    importFn().catch(() => {
      const hasReloaded = sessionStorage.getItem('adventure_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('adventure_reload', 'true');
        window.location.reload();
        return importFn().catch(() => ({ default: EmptyFallback as unknown as T }));
      }
      // Already tried reloading — return a no-op fallback to prevent React crash
      return { default: EmptyFallback as unknown as T };
    })
  );
}

const AdventureKidHome = lazyRetry(() => import("./AdventureKidHome"));
const AdventureKidExploreCity = lazyRetry(() => import("./AdventureKidExploreCity"));
const AdventureKidNext = lazyRetry(() => import("./AdventureKidNext"));
const AdventureKidGames = lazyRetry(() => import("./AdventureKidGames"));
const AdventureKidStory = lazyRetry(() => import("./AdventureKidStory"));
const AdventureKidQuiet = lazyRetry(() => import("./AdventureKidQuiet"));
const AdventureKidPostExplore = lazyRetry(() => import("./AdventureKidPostExplore"));
const AdventureKidReflectStop = lazyRetry(() => import("./AdventureKidReflectStop"));
const AdventureKidRecap = lazyRetry(() => import("./AdventureKidRecap"));
const AdventureParentExplore = lazyRetry(() => import("./AdventureParentExplore"));
const HandoffScreen = lazyRetry(() => import("./HandoffScreen"));

function PageLoader() {
  return (
    <div className="p-8 flex items-center justify-center">
      <div className="text-4xl animate-bounce">🧭</div>
    </div>
  );
}

export function AdventureRoutes() {
  return (
    <AdventureShell>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/adventure/:tripId/parent-explore" component={AdventureParentExplore} />
          <Route path="/adventure/:tripId/handoff/:stopId" component={HandoffScreen} />
          <Route path="/adventure/:tripId/kid" component={AdventureKidHome} />
          <Route path="/adventure/:tripId/kid/explore-city" component={AdventureKidExploreCity} />
          <Route path="/adventure/:tripId/kid/next" component={AdventureKidNext} />
          <Route path="/adventure/:tripId/kid/games" component={AdventureKidGames} />
          <Route path="/adventure/:tripId/kid/story/:stopId" component={AdventureKidStory} />
          <Route path="/adventure/:tripId/kid/quiet/:stopId" component={AdventureKidQuiet} />
          <Route path="/adventure/:tripId/kid/post-explore/:stopId" component={AdventureKidPostExplore} />
          <Route path="/adventure/:tripId/kid/reflect/:stopId" component={AdventureKidReflectStop} />
          <Route path="/adventure/:tripId/kid/recap" component={AdventureKidRecap} />
        </Switch>
      </Suspense>
    </AdventureShell>
  );
}
