import { useLocation } from "wouter";
import { Home, BookOpen, Gamepad2, Compass } from "lucide-react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/", matchPaths: ["/"] },
  { label: "Learn", icon: BookOpen, path: "/geo-atlas", matchPaths: ["/geo-atlas"] },
  { label: "Play", icon: Gamepad2, path: "/play-games", matchPaths: ["/play-games"] },
  { label: "Explore", icon: Compass, path: "/explore", matchPaths: ["/explore"] },
];

const HIDDEN_ON_ROUTES = [
  "/play", "/game", "/crossworld", "/find-my-home", "/spell-geo",
  "/geo-maze", "/geo-art", "/spin-the-world", "/mini-games", "/map-me",
  "/georelic-puzzles", "/stories/", "/adventure/", "/daily-quest",
  "/whos-playing", "/add-explorer", "/admin-dashboard", "/dashboard",
  "/geoadventures", "/travel", "/geobuddy-demo", "/build-adventure", "/trip-planner",
  "/privacy", "/terms", "/unsubscribe", "/email-preferences",
  "/analytics", "/parent-dashboard", "/upgrade", "/pricing",
  "/founding-families", "/support", "/about", "/reviews",
  "/s/", "/itinerary/", "/trip-unlock", "/replay/", "/journal",
  "/geoadventures-landing", "/geogames-landing", "/free-guide",
  "/free-guide/unsubscribed",
];

export function BottomNav() {
  const [location, setLocation] = useLocation();

  const shouldHide = HIDDEN_ON_ROUTES.some(route => {
    if (route.endsWith("/")) return location.startsWith(route) && location !== "/";
    return location === route || location.startsWith(route + "/");
  });

  if (shouldHide) return null;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-700/60 safe-area-bottom"
      data-testid="bottom-nav"
    >
      <div className="max-w-lg mx-auto flex items-stretch justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.matchPaths.some(p => 
            p === "/" ? location === "/" : location.startsWith(p)
          );
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => setLocation(item.path)}
              className="relative flex flex-col items-center justify-center py-2 pt-3 px-4 min-w-[64px] transition-colors"
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-500 rounded-b-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className={`p-1.5 rounded-xl transition-all ${
                isActive 
                  ? "bg-indigo-100 dark:bg-indigo-900/50" 
                  : ""
              }`}>
                <Icon className={`w-5 h-5 transition-colors ${
                  isActive 
                    ? "text-indigo-600 dark:text-indigo-400" 
                    : "text-slate-400 dark:text-slate-500"
                }`} />
              </div>
              <span className={`text-[11px] font-bold mt-0.5 transition-colors ${
                isActive 
                  ? "text-indigo-600 dark:text-indigo-400" 
                  : "text-slate-400 dark:text-slate-500"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
