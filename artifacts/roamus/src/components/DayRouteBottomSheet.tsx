import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, MapPin, Clock, AlertTriangle, UtensilsCrossed } from "lucide-react";
import type { DayRouteBundle, DayRouteVariantType, DayRouteVariant } from "../types/dailyMaps";
import { DayRouteMiniMap } from "./DayRouteMiniMap";

interface DayRouteBottomSheetProps {
  bundle: DayRouteBundle;
  open: boolean;
  onClose: () => void;
}

const VARIANT_PILLS: { type: DayRouteVariantType; label: string }[] = [
  { type: "balanced", label: "Balanced" },
  { type: "faster", label: "Faster" },
  { type: "easier", label: "Easier day" },
];

export function DayRouteBottomSheet({ bundle, open, onClose }: DayRouteBottomSheetProps) {
  const [selectedType, setSelectedType] = useState<DayRouteVariantType>("balanced");

  const variant: DayRouteVariant = useMemo(
    () => bundle[selectedType],
    [bundle, selectedType]
  );

  if (!open) return null;

  const activeStops = variant.stops.filter((s) => !s.isDropped);
  const droppedStops = variant.stops.filter((s) => s.isDropped);
  const hrs = Math.floor(variant.totalTravelMin / 60);
  const mins = variant.totalTravelMin % 60;
  const travelStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: 9998 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 rounded-t-3xl bg-white max-h-[85vh] overflow-y-auto"
        style={{ zIndex: 9999 }}
        onClick={(e) => e.stopPropagation()}
        data-testid="day-route-bottom-sheet"
      >
        <div className="px-5 pt-5 pb-8">
          <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Start your day 🚀</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              data-testid="button-close-day-route-sheet"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="flex gap-2 mb-5" data-testid="route-variant-pills">
            {VARIANT_PILLS.map((pill) => (
              <button
                key={pill.type}
                onClick={() => setSelectedType(pill.type)}
                className="px-3.5 py-2 rounded-full text-[13px] font-semibold transition-all active:scale-95"
                style={{
                  background: selectedType === pill.type ? "#E67E22" : "#F2F2F0",
                  color: selectedType === pill.type ? "white" : "#666",
                }}
                data-testid={`button-variant-${pill.type}`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {selectedType === "faster" && (
            <div
              className="flex items-start gap-2 mb-3 px-3.5 py-2.5 rounded-2xl"
              style={{ background: "#FFF8ED", border: "1px solid #F5E0B5" }}
            >
              <span className="text-base mt-0.5">🗺️</span>
              <p className="text-xs leading-relaxed" style={{ color: "#7A5010" }}>
                Stops are reordered by proximity to cut drive time between each one.
              </p>
            </div>
          )}

          <div className="mb-4">
            <DayRouteMiniMap
              variant={variant}
              polylinePoints={variant.polylinePoints}
              height={150}
            />
          </div>

          <div className="space-y-0 mb-4" data-testid="day-flow-list">
            {activeStops.map((stop, idx) => (
              <div key={stop.id}>
                <div className="flex items-start gap-3 py-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold text-white"
                    style={{ background: stop.isVisited ? "#16a34a" : "#E67E22" }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">
                      {stop.name}
                      {stop.isMealOrSnack && stop.mealLabel && (
                        <span className="ml-1.5 text-[11px] font-medium text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                          {stop.mealLabel}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400">
                        {stop.isMealOrSnack ? (
                          <span className="flex items-center gap-0.5">
                            <UtensilsCrossed className="w-3 h-3" /> {stop.estimatedDurationMin}m
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {stop.estimatedDurationMin}m
                          </span>
                        )}
                      </span>
                      {!stop.isNavigable && (
                        <span className="text-[10px] text-amber-500">No location</span>
                      )}
                    </div>
                  </div>
                </div>
                {stop.travelTimeToNextMin != null && idx < activeStops.length - 1 && (
                  <div className="flex items-center gap-2 pl-10 py-1">
                    <div className="w-px h-4 bg-gray-200" />
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      🚗 {stop.travelTimeToNextMin}m drive
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {droppedStops.length > 0 && (
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-[11px] font-semibold text-amber-700 mb-1">Skipped in this variant:</p>
              {droppedStops.map((s) => (
                <p key={s.id} className="text-[11px] text-amber-600">
                  • {s.name} — {s.droppedReason}
                </p>
              ))}
            </div>
          )}

          <div
            className="flex items-center justify-around py-3 rounded-xl mb-4"
            style={{ background: "#F8F5F1" }}
            data-testid="day-route-stats"
          >
            <div className="text-center">
              <p className="text-[15px] font-bold text-gray-900">{variant.totalStops}</p>
              <p className="text-[10px] text-gray-500">Stops</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-[15px] font-bold text-gray-900">{travelStr}</p>
              <p className="text-[10px] text-gray-500">Travel</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-[15px] font-bold text-gray-900">{variant.mealsIncluded}</p>
              <p className="text-[10px] text-gray-500">Meals</p>
            </div>
          </div>

          {bundle.routeFetchFailed && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[11px] text-amber-700">
                Route line unavailable — markers shown. Google Maps link still works.
              </p>
            </div>
          )}

          <button
            onClick={() => window.open(variant.googleMapsUrl, "_blank", "noopener,noreferrer")}
            className="w-full flex items-center justify-center gap-2 h-[52px] rounded-2xl text-[15px] font-bold text-white mb-3 active:scale-[0.98] transition-all"
            style={{ background: "#4285F4" }}
            data-testid="button-open-google-maps"
          >
            <MapPin className="w-5 h-5" />
            Start navigation →
          </button>

          <button
            onClick={onClose}
            className="w-full h-[44px] rounded-2xl text-[14px] font-semibold text-gray-500 active:scale-[0.98] transition-all"
            style={{ background: "#F2F2F0" }}
            data-testid="button-close-day-route-bottom"
          >
            Close
          </button>
        </div>
      </motion.div>
    </>,
    document.body
  );
}
