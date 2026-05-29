export type DayRouteVariantType = "balanced" | "faster" | "easier";

export interface DayRouteStop {
  id: string;
  name: string;
  address?: string;
  lat: number | null;
  lng: number | null;
  stopType: string;
  isNavigable: boolean;
  isMealOrSnack: boolean;
  mealLabel?: string;
  estimatedDurationMin: number;
  travelTimeToNextMin: number | null;
  displayOrder: number;
  isVisited: boolean;
  isDropped?: boolean;
  droppedReason?: string;
}

export interface DayRouteVariant {
  type: DayRouteVariantType;
  label: string;
  stops: DayRouteStop[];
  totalStops: number;
  navigableStops: number;
  totalTravelMin: number;
  mealsIncluded: number;
  summaryText: string;
  googleMapsUrl: string;
  polylinePoints: [number, number][] | null;
  boundingBox: { sw: [number, number]; ne: [number, number] } | null;
}

export interface DayRouteBundle {
  balanced: DayRouteVariant;
  faster: DayRouteVariant;
  easier: DayRouteVariant;
  polylinePoints: [number, number][] | null;
  routeFetchFailed: boolean;
}
