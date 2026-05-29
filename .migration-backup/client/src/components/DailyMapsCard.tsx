import { useState, useEffect, useMemo } from "react";
import { MapPin, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import type { TravelStop } from "@shared/schema";
import type { DayRouteBundle } from "../types/dailyMaps";
import { generateDayRouteVariants, getRoutePolylineForStops } from "../lib/dailyMapsService";
import { DayRouteMiniMap } from "./DayRouteMiniMap";

type MealRec = {
  name: string;
  cuisine: string;
  description: string;
  priceLevel: number;
  kidFriendlyNote: string;
  walkTime?: string;
};

interface DailyMapsCardProps {
  todayStops: TravelStop[];
  selectedMealRecs: { lunch: MealRec | null; snack: MealRec | null };
  city?: string;
  onRunDay: (bundle: DayRouteBundle) => void;
  onBundleReady?: (bundle: DayRouteBundle) => void;
}

export function DailyMapsCard({ todayStops, selectedMealRecs, city, onRunDay, onBundleReady }: DailyMapsCardProps) {
  const [bundle, setBundle] = useState<DayRouteBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeFailed, setRouteFailed] = useState(false);

  const stopsKey = useMemo(
    () => todayStops.map((s) => s.id).join(",") + JSON.stringify(selectedMealRecs) + (city || ""),
    [todayStops, selectedMealRecs, city]
  );

  useEffect(() => {
    if (todayStops.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const newBundle = generateDayRouteVariants(todayStops, selectedMealRecs, city);

    const updateVariantFromOSRM = (
      variant: typeof newBundle.balanced,
      osrmResult: Awaited<ReturnType<typeof getRoutePolylineForStops>>
    ) => {
      if (!osrmResult) return;
      variant.polylinePoints = osrmResult.points;
      variant.boundingBox = osrmResult.boundingBox;
      if (osrmResult.segmentDurations.length > 0) {
        const isNoChange = variant.summaryText === "This day is already well balanced.";
        let segIdx = 0;
        variant.stops = variant.stops.map((s, i) => {
          if (i === variant.stops.length - 1) return { ...s, travelTimeToNextMin: null };
          if (s.isNavigable && !s.isDropped) {
            const dur = osrmResult.segmentDurations[segIdx] ?? null;
            segIdx++;
            return { ...s, travelTimeToNextMin: dur != null ? Math.round(dur / 60) : s.travelTimeToNextMin };
          }
          return s;
        });
        const totalTravel = variant.stops.filter(s => !s.isDropped).reduce((sum, s) => sum + (s.travelTimeToNextMin || 0), 0);
        variant.totalTravelMin = totalTravel;
        if (!isNoChange) {
          const hrs = Math.floor(totalTravel / 60);
          const mins = totalTravel % 60;
          const travelStr = hrs > 0 ? `${hrs}h ${mins}m travel` : `${mins}m travel`;
          const mealStr = variant.mealsIncluded > 0 ? "Meals included" : "";
          variant.summaryText = [`${variant.totalStops} stops`, travelStr, mealStr].filter(Boolean).join(" · ");
        }
      }
    };

    const balancedRoutePromise = getRoutePolylineForStops(newBundle.balanced.stops);
    const fasterActiveStops = newBundle.faster.stops.filter(s => !s.isDropped);
    const easierActiveStops = newBundle.easier.stops.filter(s => !s.isDropped);
    const fasterDiffers = fasterActiveStops.length !== newBundle.balanced.stops.length;
    const easierDiffers = easierActiveStops.length !== newBundle.balanced.stops.length;

    const fasterRoutePromise = fasterDiffers ? getRoutePolylineForStops(fasterActiveStops) : null;
    const easierRoutePromise = easierDiffers ? getRoutePolylineForStops(easierActiveStops) : null;

    Promise.all([balancedRoutePromise, fasterRoutePromise, easierRoutePromise]).then(([balancedResult, fasterResult, easierResult]) => {
      if (balancedResult) {
        newBundle.polylinePoints = balancedResult.points;
        updateVariantFromOSRM(newBundle.balanced, balancedResult);
        updateVariantFromOSRM(newBundle.faster, fasterDiffers ? fasterResult : balancedResult);
        updateVariantFromOSRM(newBundle.easier, easierDiffers ? easierResult : balancedResult);
        setRouteFailed(false);
      } else {
        newBundle.routeFetchFailed = true;
        setRouteFailed(true);
      }
      setBundle(newBundle);
      onBundleReady?.(newBundle);
      setLoading(false);
    });
  }, [stopsKey]);

  if (todayStops.length === 0) return null;

  if (loading) {
    return (
      <div
        className="mx-4 rounded-2xl p-4 flex items-center justify-center"
        style={{ background: "#FFFCF7", border: "1px solid #F0E6D4", minHeight: 100 }}
        data-testid="daily-maps-card-loading"
      >
        <Loader2 className="w-5 h-5 animate-spin text-orange-400 mr-2" />
        <span className="text-sm text-gray-500">Loading your route...</span>
      </div>
    );
  }

  if (!bundle) return null;

  const balanced = bundle.balanced;
  const navigableCount = balanced.navigableStops;

  return (
    <div
      className="mx-4 rounded-2xl overflow-hidden"
      style={{ background: "#FFFCF7", border: "1px solid #F0E6D4" }}
      data-testid="daily-maps-card"
    >
      <div className="px-3 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          Your Day at a Glance
        </p>
        {navigableCount > 0 ? (
          <DayRouteMiniMap
            variant={balanced}
            polylinePoints={bundle.polylinePoints}
            height={180}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-xl bg-gray-50"
            style={{ height: 120 }}
          >
            <p className="text-xs text-gray-400">No mappable stops today</p>
          </div>
        )}
      </div>

      <div className="px-3 pt-2 pb-1">
        <p className="text-[13px] text-gray-600 font-medium" data-testid="text-day-route-summary">
          {balanced.summaryText}
        </p>
        {routeFailed && (
          <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Route line unavailable — markers shown
          </p>
        )}
      </div>

      <button
        onClick={() => onRunDay(bundle)}
        className="w-full flex items-center justify-between px-3 py-3 text-[14px] font-bold transition-colors active:bg-orange-50"
        style={{ color: "#E67E22" }}
        data-testid="button-run-this-day"
      >
        <span>Run my day</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
