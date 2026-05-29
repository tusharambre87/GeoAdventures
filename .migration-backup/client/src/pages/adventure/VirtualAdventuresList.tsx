import { useLocation } from "wouter";
import { ArrowLeft, Globe, Home } from "lucide-react";
import { useTravel } from "@/lib/travelContext";
import { getStockImageForDestination } from "@/components/TravelTripCard";
import { useMemo } from "react";

export default function VirtualAdventuresList() {
  const [, setLocation] = useLocation();
  const { trips, isLoading } = useTravel();

  const virtualTrips = useMemo(
    () => trips.filter(t => t.adventureContext === 'home'),
    [trips]
  );

  const inProgressTrips = virtualTrips.filter(t => t.status !== 'completed');
  const completedTrips = virtualTrips.filter(t => t.status === 'completed');

  const navigateToTrip = (tripId: string) => {
    setLocation(`/adventure/${tripId}/kid`);
  };

  const VirtualTag = () => (
    <span className="inline-flex items-center gap-1 bg-gray-600/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
      <Home className="w-3 h-3" /> Virtual
    </span>
  );

  const TripCard = ({ trip, label }: { trip: typeof virtualTrips[0]; label: string }) => {
    const tripImage = getStockImageForDestination(trip.city, trip.country || undefined, trip.destination);

    return (
      <div
        className="rounded-[18px] overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => navigateToTrip(trip.id)}
        data-testid={`virtual-card-${trip.id}`}
      >
        <div className="relative h-[120px]">
          <img src={tripImage} alt={trip.name || trip.destination} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute top-3 left-3"><VirtualTag /></div>
          <div className="absolute bottom-3 left-4 right-4">
            <h4 className="font-bold text-white text-sm leading-tight drop-shadow-sm">{trip.name || trip.destination}</h4>
            {trip.city && <p className="text-white/80 text-xs mt-0.5">{trip.city}{trip.country ? `, ${trip.country}` : ''}</p>}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          <button
            onClick={(e) => { e.stopPropagation(); navigateToTrip(trip.id); }}
            className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700"
            data-testid={`button-open-virtual-${trip.id}`}
          >
            {trip.status === 'completed' ? 'Revisit →' : 'Resume →'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-safe-top pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => setLocation("/geoadventures?home=1")}
          className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          data-testid="button-virtual-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">Virtual Adventures</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Explore the world from anywhere</p>
        </div>
      </div>

      <div className="px-4 pt-5 pb-24 space-y-7 max-w-lg mx-auto">
        {isLoading && (
          <div className="py-12 flex items-center justify-center">
            <Globe className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        )}

        {!isLoading && virtualTrips.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl mb-4">🌍</div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">No virtual adventures yet</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Create a virtual adventure to explore cities from home with your family.
            </p>
            <button
              onClick={() => setLocation("/geoadventures?home=1")}
              className="mt-5 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-full text-sm shadow-md transition-colors"
              data-testid="button-virtual-go-home"
            >
              Go to GeoAdventures
            </button>
          </div>
        )}

        {!isLoading && inProgressTrips.length > 0 && (
          <div className="space-y-3" data-testid="virtual-section-inprogress">
            <div>
              <h3 className="font-semibold text-base text-slate-700 dark:text-slate-200">In Progress</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Pick up where you left off</p>
            </div>
            <div className="space-y-3">
              {inProgressTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} label="In progress" />
              ))}
            </div>
          </div>
        )}

        {!isLoading && completedTrips.length > 0 && (
          <div className="space-y-3" data-testid="virtual-section-completed">
            <div>
              <h3 className="font-semibold text-base text-slate-700 dark:text-slate-200">Completed</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Adventures you've finished</p>
            </div>
            <div className="space-y-3">
              {completedTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} label="Completed" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
