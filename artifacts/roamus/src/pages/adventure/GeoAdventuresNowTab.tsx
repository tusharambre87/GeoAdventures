import { TripStateCardDispatcher } from "@/components/execution/TripStateCard";

interface GeoAdventuresNowTabProps {
  activeTripId?: string | null;
  onCreateTrip: () => void;
}

export function GeoAdventuresNowTab({ activeTripId, onCreateTrip }: GeoAdventuresNowTabProps) {
  return (
    <div className="px-1" data-testid="now-tab">
      <TripStateCardDispatcher
        tripId={activeTripId}
        onCreateTrip={onCreateTrip}
      />
    </div>
  );
}
