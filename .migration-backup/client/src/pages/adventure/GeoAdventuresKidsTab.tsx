import { useLocation } from "wouter";
import { useRef, useState } from "react";
import { ChevronRight, Gamepad2, Globe, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStockImageForDestination } from "@/components/TravelTripCard";
import type { TravelTrip } from "@shared/schema";

interface GeoAdventuresKidsTabProps {
  activeTrip: TravelTrip | null;
  virtualTrips?: TravelTrip[];
  tripStopsMap?: Record<string, Array<{ isVisited: boolean | null }>>;
  onOpenTravelGame: (gameId: 'think-fast' | 'scavenger-hunt' | 'geoguess' | 'geospy') => void;
}

const TRAVEL_GAMES = [
  { id: 'think-fast' as const, title: 'Think Fast!', desc: 'Name 10 things in 30 seconds', icon: '⚡', bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30', border: 'border-amber-200 dark:border-amber-700' },
  { id: 'scavenger-hunt' as const, title: 'Scavenger Hunt', desc: 'Explore together and notice more', icon: '🔍', bg: 'bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/30', border: 'border-teal-200 dark:border-teal-700' },
  { id: 'geoguess' as const, title: 'GeoGuess', desc: 'Guess the mystery place', icon: '🌍', bg: 'bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-900/30 dark:to-sky-900/30', border: 'border-cyan-200 dark:border-cyan-700' },
  { id: 'geospy' as const, title: 'GeoSpy', desc: 'Spot what others miss', icon: '👁️', bg: 'bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30', border: 'border-pink-200 dark:border-pink-700' },
];

const QUICK_GAMES = [
  { label: 'Guess & Go', emoji: '🌍', route: '/play', description: 'Quick geography quiz' },
  { label: 'Compass Quest', emoji: '🧭', route: '/compass-quest', description: 'Follow the clues' },
  { label: 'CrossWorld', emoji: '✏️', route: '/crossworld', description: 'Geography crossword' },
  { label: 'Map Me', emoji: '🗺️', route: '/map-me', description: 'Place the pin' },
  { label: 'Flag Quiz', emoji: '🚩', route: '/play', description: 'Know your flags' },
  { label: 'Memory Match', emoji: '🃏', route: '/play', description: 'Match the pairs' },
];

export function GeoAdventuresKidsTab({ activeTrip, virtualTrips = [], tripStopsMap = {}, onOpenTravelGame }: GeoAdventuresKidsTabProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const gamesScrollRef = useRef<HTMLDivElement>(null);
  const [activeGameDot, setActiveGameDot] = useState(0);

  const inProgressVirtual = virtualTrips.filter(t => {
    const stops = tripStopsMap[t.id] || [];
    const visited = stops.filter(s => s.isVisited).length;
    return visited > 0 && t.status !== 'completed';
  });

  const handleTravelGame = (gameId: 'think-fast' | 'scavenger-hunt' | 'geoguess' | 'geospy') => {
    if (!activeTrip) {
      toast({ title: "Start an adventure first", description: "Create a trip to play travel games!" });
      return;
    }
    onOpenTravelGame(gameId);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3" data-testid="kids-travel-games-section">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Travel Games</h3>
            <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Quick family games for the car, airport, or downtime.</p>
        </div>
        <div className="relative">
          <div
            ref={gamesScrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const cardWidth = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth + 12 : 172;
              const idx = Math.round(el.scrollLeft / cardWidth);
              setActiveGameDot(Math.min(idx, 3));
            }}
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory kids-travel-games-scroll"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            <style>{`.kids-travel-games-scroll::-webkit-scrollbar { display: none; }`}</style>
            {TRAVEL_GAMES.map(game => (
              <button
                key={game.id}
                onClick={() => handleTravelGame(game.id)}
                className={`${game.bg} ${game.border} snap-start shrink-0 w-[160px] rounded-[20px] p-4 text-left shadow-sm hover:shadow-md transition-shadow border`}
                data-testid={`button-kids-game-${game.id}`}
              >
                <span className="text-2xl mb-2 block">{game.icon}</span>
                <p className="font-bold text-sm text-slate-800 dark:text-white">{game.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{game.desc}</p>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (gamesScrollRef.current) {
                gamesScrollRef.current.scrollBy({ left: 172, behavior: 'smooth' });
              }
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 dark:bg-slate-700/90 shadow-md rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 transition-colors z-10"
            aria-label="Scroll right"
            data-testid="button-kids-games-scroll"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-center gap-1.5 pt-1">
          {TRAVEL_GAMES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === activeGameDot ? 'w-4 bg-orange-400' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`}
            />
          ))}
        </div>
      </div>

      <button
        onClick={() => setLocation("/virtual-adventures")}
        className="w-full text-left space-y-3"
        data-testid="section-virtual-adventures"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Virtual Adventures</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Explore the world from anywhere</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </div>

        {inProgressVirtual.length > 0 ? (
          <div
            className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {[...inProgressVirtual].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 5).map(trip => {
              const stops = tripStopsMap[trip.id] || [];
              const visited = stops.filter(s => s.isVisited).length;
              const total = stops.length;
              const image = getStockImageForDestination(trip.city, trip.country || undefined, trip.destination);
              return (
                <div
                  key={trip.id}
                  className="snap-start shrink-0 w-[140px] rounded-2xl overflow-hidden shadow-sm cursor-pointer"
                  onClick={() => setLocation(`/adventure/${trip.id}/kid`)}
                  data-testid={`kids-virtual-card-${trip.id}`}
                >
                  <div className="relative h-[90px]">
                    <img src={image} alt={trip.name || trip.destination} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-0.5 bg-gray-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        <Home className="w-2.5 h-2.5" /> Virtual
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="font-bold text-white text-[11px] leading-tight drop-shadow-sm truncate">{trip.name || trip.destination}</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 px-3 py-1.5">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{visited}/{total} explored</p>
                  </div>
                </div>
              );
            })}
            {virtualTrips.length > 4 && (
              <div
                className="snap-start shrink-0 w-[100px] rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center"
                onClick={() => setLocation("/virtual-adventures")}
              >
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 text-center px-2">+{virtualTrips.length - 4} more</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Globe className="w-8 h-8 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No virtual adventures yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create one to explore cities from home</p>
            </div>
          </div>
        )}
      </button>

      <div className="space-y-3" data-testid="kids-quick-games-section">
        <div>
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-green-500" />
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Quick Games</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Solo or family geography fun, any time.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_GAMES.map((game) => (
            <button
              key={game.label}
              onClick={() => setLocation(game.route)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1"
              data-testid={`button-quick-game-${game.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span className="text-2xl">{game.emoji}</span>
              <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{game.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{game.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
