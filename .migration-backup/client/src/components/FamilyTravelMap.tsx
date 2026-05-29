import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, MapPin, Star, Camera, ChevronLeft, Plane } from "lucide-react";
import type { TravelTrip, TravelStop, TravelMoment } from "@shared/schema";
import { TRIP_LAT_LONG } from "@/lib/travelMapUtils";

function safeMapCleanup(mapInstance: any) {
  if (!mapInstance) return;
  if (typeof mapInstance.remove !== 'function') return;
  try {
    if (typeof mapInstance.off === 'function') {
      mapInstance.off();
    }
    if (typeof mapInstance.eachLayer === 'function') {
      mapInstance.eachLayer((layer: any) => {
        try {
          if (typeof layer.off === 'function') layer.off();
          if (typeof layer.remove === 'function') layer.remove();
        } catch (e) {}
      });
    }
    mapInstance.remove();
  } catch (e) {
    console.warn('Leaflet cleanup warning:', e);
  }
}

interface FamilyTravelMapProps {
  trips: TravelTrip[];
  currentTrip: TravelTrip | null;
  stops: TravelStop[];
  moments: TravelMoment[];
  memoryStars: number;
  onClose: () => void;
  onStopClick: (stop: TravelStop) => void;
  onTripSelect: (tripId: string) => void;
  initialView?: 'world' | 'trip';
  containedMode?: boolean;
  mapMode?: "interactive" | "share";
}

type MapView = 'world' | 'trip';


const BIG_ISLAND_STOPS: Record<string, { lat: number; lon: number }> = {
  "Volcanoes National Park": { lat: 19.4194, lon: -155.2885 },
  "Mauna Kea Summit": { lat: 19.8207, lon: -155.4681 },
  "Akaka Falls": { lat: 19.8536, lon: -155.1528 },
  "Punalu'u Black Sand Beach": { lat: 19.1364, lon: -155.5042 },
  "Kona Town": { lat: 19.6400, lon: -155.9969 },
  "Waipio Valley": { lat: 20.1194, lon: -155.5897 },
  "Kealakekua Bay": { lat: 19.4767, lon: -155.9314 },
  "Hilo Farmers Market": { lat: 19.7241, lon: -155.0868 },
  "Rainbow Falls": { lat: 19.7203, lon: -155.1061 },
  "Hapuna Beach": { lat: 19.9886, lon: -155.8261 },
};

const CHICAGO_STOPS: Record<string, { lat: number; lon: number }> = {
  "Millennium Park & Cloud Gate": { lat: 41.8827, lon: -87.6233 },
  "Navy Pier": { lat: 41.8917, lon: -87.6086 },
  "Shedd Aquarium": { lat: 41.8676, lon: -87.6140 },
  "Field Museum": { lat: 41.8663, lon: -87.6170 },
  "Art Institute of Chicago": { lat: 41.8796, lon: -87.6237 },
  "Willis Tower Skydeck": { lat: 41.8789, lon: -87.6359 },
  "Lincoln Park Zoo": { lat: 41.9211, lon: -87.6340 },
  "Chicago Riverwalk": { lat: 41.8880, lon: -87.6200 },
  "Museum of Science and Industry": { lat: 41.7906, lon: -87.5831 },
  "Magnificent Mile": { lat: 41.8950, lon: -87.6245 },
  "Sears tower": { lat: 41.8789, lon: -87.6359 },
  "Sears Tower": { lat: 41.8789, lon: -87.6359 },
};

const SYDNEY_STOPS: Record<string, { lat: number; lon: number }> = {
  "Sydney Opera House": { lat: -33.8568, lon: 151.2153 },
  "Sydney Harbour Bridge": { lat: -33.8523, lon: 151.2108 },
  "Taronga Zoo": { lat: -33.8435, lon: 151.2411 },
  "Bondi Beach": { lat: -33.8908, lon: 151.2743 },
  "Royal Botanic Garden": { lat: -33.8642, lon: 151.2166 },
  "Darling Harbour": { lat: -33.8732, lon: 151.1987 },
  "The Rocks": { lat: -33.8593, lon: 151.2085 },
  "Manly Beach": { lat: -33.7969, lon: 151.2873 },
  "Luna Park Sydney": { lat: -33.8478, lon: 151.2094 },
  "Australian Museum": { lat: -33.8744, lon: 151.2113 },
  "SEA LIFE Sydney Aquarium": { lat: -33.8700, lon: 151.2020 },
  "Sydney Tower Eye": { lat: -33.8704, lon: 151.2089 },
  "Circular Quay": { lat: -33.8611, lon: 151.2110 },
  "Mrs Macquarie's Chair": { lat: -33.8599, lon: 151.2220 },
  "Barangaroo Reserve": { lat: -33.8574, lon: 151.1995 },
};

const PARIS_STOPS: Record<string, { lat: number; lon: number }> = {
  "Eiffel Tower": { lat: 48.8584, lon: 2.2945 },
  "Louvre Museum": { lat: 48.8606, lon: 2.3376 },
  "Notre-Dame Cathedral": { lat: 48.8530, lon: 2.3499 },
  "Palace of Versailles": { lat: 48.8049, lon: 2.1204 },
  "Sacré-Cœur Basilica": { lat: 48.8867, lon: 2.3431 },
  "Luxembourg Gardens": { lat: 48.8462, lon: 2.3372 },
  "Musée d'Orsay": { lat: 48.8600, lon: 2.3266 },
  "Arc de Triomphe": { lat: 48.8738, lon: 2.2950 },
  "Seine River Cruise": { lat: 48.8566, lon: 2.3522 },
  "Disneyland Paris": { lat: 48.8675, lon: 2.7836 },
  "Champs-Élysées": { lat: 48.8698, lon: 2.3078 },
  "Montmartre": { lat: 48.8867, lon: 2.3431 },
  "Tuileries Garden": { lat: 48.8634, lon: 2.3275 },
  "Pont Alexandre III": { lat: 48.8637, lon: 2.3136 },
  "Jardin des Plantes": { lat: 48.8434, lon: 2.3598 },
};

const SAN_FRANCISCO_STOPS: Record<string, { lat: number; lon: number }> = {
  "Golden Gate Bridge": { lat: 37.8199, lon: -122.4783 },
  "Alcatraz Island": { lat: 37.8267, lon: -122.4233 },
  "Fisherman's Wharf": { lat: 37.8080, lon: -122.4177 },
  "California Academy of Sciences": { lat: 37.7699, lon: -122.4661 },
  "Cable Car Ride": { lat: 37.7949, lon: -122.4194 },
  "Exploratorium": { lat: 37.8017, lon: -122.3975 },
  "Pier 39 & Sea Lions": { lat: 37.8087, lon: -122.4098 },
  "Chinatown": { lat: 37.7941, lon: -122.4078 },
  "Golden Gate Park": { lat: 37.7694, lon: -122.4862 },
  "Ghirardelli Square": { lat: 37.8060, lon: -122.4230 },
  "Coit Tower": { lat: 37.8024, lon: -122.4058 },
  "Palace of Fine Arts": { lat: 37.8029, lon: -122.4484 },
  "Twin Peaks": { lat: 37.7544, lon: -122.4477 },
  "Union Square": { lat: 37.7879, lon: -122.4074 },
  "Ferry Building": { lat: 37.7955, lon: -122.3934 },
};

function getStopCoordsLookup(trip: TravelTrip | null, stops: TravelStop[] = []): Record<string, { lat: number; lon: number }> {
  const lookup: Record<string, { lat: number; lon: number }> = {};
  
  // 1. Add coordinates from generated stops if they exist
  stops.forEach(stop => {
    const lat = (stop as any).latitude;
    const lon = (stop as any).longitude;
    if (lat && lon) {
      lookup[stop.name] = { 
        lat: Number(lat), 
        lon: Number(lon) 
      };
    }
  });

  // 2. Fallback to hardcoded constants for legacy data
  if (trip) {
    const cityKey = (trip.city || "").toLowerCase();
    const destKey = (trip.destination || "").toLowerCase();
    const nameKey = (trip.name || "").toLowerCase();
    
    if (cityKey.includes("chicago") || destKey.includes("chicago") || nameKey.includes("chicago")) {
      Object.assign(lookup, CHICAGO_STOPS);
    } else if (cityKey.includes("hawaii") || destKey.includes("hawaii") || nameKey.includes("hawaii")) {
      Object.assign(lookup, BIG_ISLAND_STOPS);
    } else if (cityKey.includes("sydney") || destKey.includes("sydney") || nameKey.includes("sydney") || 
               cityKey.includes("australia") || destKey.includes("australia")) {
      Object.assign(lookup, SYDNEY_STOPS);
    } else if (cityKey.includes("paris") || destKey.includes("paris") || nameKey.includes("paris") ||
               cityKey.includes("france") || destKey.includes("france")) {
      Object.assign(lookup, PARIS_STOPS);
    } else if (cityKey.includes("san francisco") || destKey.includes("san francisco") || nameKey.includes("san francisco")) {
      Object.assign(lookup, SAN_FRANCISCO_STOPS);
    }
  }

  return lookup;
}

function getDefaultCoords(trip: TravelTrip | null, stops: TravelStop[] = []): { lat: number; lon: number } {
  // If we have stops with coords, use the first one
  const firstStopWithCoords = stops.find(s => (s as any).latitude && (s as any).longitude);
  if (firstStopWithCoords) {
    return { lat: Number((firstStopWithCoords as any).latitude), lon: Number((firstStopWithCoords as any).longitude) };
  }

  if (!trip) return { lat: 19.5, lon: -155.5 };
  return getTripLatLong(trip);
}

function getTripLatLong(trip: TravelTrip): { lat: number; lon: number } {
  // If trip itself has coordinates, use them
  const tLat = (trip as any).latitude;
  const tLon = (trip as any).longitude;
  if (tLat && tLon) {
    return { lat: Number(tLat), lon: Number(tLon) };
  }

  const cityKey = (trip.city || "").toLowerCase();
  const destKey = (trip.destination || "").toLowerCase();
  const nameKey = (trip.name || "").toLowerCase();
  
  const isHawaii = cityKey.includes("hawaii") || destKey.includes("hawaii") ||
                   cityKey.includes("big island") || destKey.includes("big island") ||
                   cityKey.includes("maui") || cityKey.includes("oahu") ||
                   destKey.includes("maui") || destKey.includes("oahu") ||
                   nameKey.includes("hawaii") || nameKey.includes("big island");
  
  if (isHawaii) {
    return { lat: 19.5, lon: -155.5 };
  }
  
  if (TRIP_LAT_LONG[cityKey]) return TRIP_LAT_LONG[cityKey];
  if (TRIP_LAT_LONG[destKey]) return TRIP_LAT_LONG[destKey];
  
  const matchingKey = Object.keys(TRIP_LAT_LONG).find(key => 
    destKey.includes(key) || cityKey.includes(key) || nameKey.includes(key) ||
    key.includes(destKey) || key.includes(cityKey)
  );
  
  if (matchingKey) return TRIP_LAT_LONG[matchingKey];
  
  return { lat: 20, lon: 0 };
}

function injectMapStyles() {
  if (document.getElementById('leaflet-custom-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'leaflet-custom-styles';
  style.textContent = `
    @keyframes marker-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(2); opacity: 0; }
    }
    .trip-marker {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;
      pointer-events: auto !important;
    }
    .trip-marker:hover {
      transform: scale(1.15);
    }
    .trip-marker * {
      pointer-events: none;
    }
    .trip-marker-inner {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #38bdf8, #2563eb);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      border: 3px solid white;
      animation: marker-bounce 2s ease-in-out infinite;
    }
    .trip-marker-icon {
      width: 20px;
      height: 20px;
      color: white;
    }
    .trip-marker-label {
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
      background: rgba(255,255,255,0.95);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .trip-marker-star {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      background: #facc15;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .stop-marker {
      width: 34px;
      height: 54px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      cursor: pointer;
      transition: transform 0.15s;
      pointer-events: auto !important;
    }
    .stop-marker:hover {
      transform: scale(1.12);
    }
    .stop-marker * {
      pointer-events: none;
    }
    .stop-marker-inner {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.22);
      border: 2px solid white;
      position: relative;
      pointer-events: none;
      flex-shrink: 0;
    }
    .stop-marker-inner.unvisited {
      background: linear-gradient(135deg, #fdba74, #f97316);
    }
    .stop-marker-inner.visited {
      background: linear-gradient(135deg, #4ade80, #16a34a);
    }
    .stop-marker-icon {
      width: 14px;
      height: 14px;
      color: white;
      z-index: 1;
    }
    .stop-number {
      font-size: 11px;
      font-weight: 700;
      color: white;
      z-index: 1;
      line-height: 1;
    }
    .stop-marker-label {
      margin-top: 3px;
      white-space: nowrap;
      background: rgba(255,255,255,0.97);
      padding: 1px 5px;
      border-radius: 6px;
      font-size: 9px;
      font-weight: 600;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
      max-width: 72px;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #1e293b;
    }
    .stop-marker-badge {
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
      border: 1.5px solid white;
    }
    .stop-marker-badge.photo {
      bottom: -2px;
      right: -2px;
      background: #ec4899;
    }
    .stop-marker-badge.star {
      top: -2px;
      left: -2px;
      background: #facc15;
    }
    .stop-marker.share-mode .stop-marker-label {
      display: none;
    }
    .stop-marker.share-mode .stop-marker-badge {
      display: none;
    }
    .stop-marker.share-mode {
      height: 30px;
    }
    .leaflet-container {
      font-family: inherit;
    }
    .leaflet-marker-icon {
      pointer-events: auto !important;
    }
    .leaflet-div-icon {
      background: transparent !important;
      border: none !important;
    }
    .leaflet-trip-marker,
    .leaflet-stop-marker {
      background: transparent !important;
      z-index: 500 !important;
      border: none !important;
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);
}

const PlaneIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;
const MapPinIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
const StarIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const CameraIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;

export function FamilyTravelMap({
  trips,
  currentTrip,
  stops,
  moments,
  memoryStars,
  onClose,
  onStopClick,
  onTripSelect,
  initialView = 'world',
  containedMode = false,
  mapMode = "interactive",
}: FamilyTravelMapProps) {
  const isShare = mapMode === "share";
  const [mapView, setMapView] = useState<MapView>(initialView);
  const [selectedStop, setSelectedStop] = useState<TravelStop | null>(null);
  const [zoomingTrip, setZoomingTrip] = useState<TravelTrip | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [pendingTripId, setPendingTripId] = useState<string | null>(null);
  
  const worldMapRef = useRef<HTMLDivElement>(null);
  const tripMapRef = useRef<HTMLDivElement>(null);
  const worldMapInstance = useRef<any>(null);
  const tripMapInstance = useRef<any>(null);
  const worldMarkersRef = useRef<any>(null);
  const tripMarkersRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Switch to trip view when the pending trip data is loaded
  useEffect(() => {
    if (pendingTripId && currentTrip?.id === pendingTripId) {
      setMapView('trip');
      setPendingTripId(null);
    }
  }, [pendingTripId, currentTrip?.id]);

  // Timeout to clear pending trip ID if fetch takes too long (prevents stuck state)
  useEffect(() => {
    if (!pendingTripId) return;
    
    const timeout = setTimeout(() => {
      if (pendingTripId) {
        console.warn('[FamilyTravelMap] Trip fetch timeout, clearing pendingTripId');
        setPendingTripId(null);
      }
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timeout);
  }, [pendingTripId]);

  useEffect(() => {
    const checkLeaflet = () => {
      if (!isMountedRef.current) return;
      if (typeof window !== 'undefined' && (window as any).L) {
        setLeafletReady(true);
        injectMapStyles();
      } else {
        setTimeout(checkLeaflet, 100);
      }
    };
    checkLeaflet();
  }, []);

  useEffect(() => {
    if (!leafletReady || mapView !== 'world') return;
    if (!isMountedRef.current) return;
    
    const L = (window as any).L;
    if (!L) return;
    
    // Add small delay to ensure ref is mounted after AnimatePresence transition
    const initTimeout = setTimeout(() => {
      if (!worldMapRef.current || !isMountedRef.current) {
        console.warn('[FamilyTravelMap] World map ref not ready');
        return;
      }
      
      try {
        safeMapCleanup(worldMapInstance.current);
        worldMapInstance.current = null;
        if (worldMapRef.current) (worldMapRef.current as any)._leaflet_id = undefined;
        
        const map = L.map(worldMapRef.current, {
          center: [20, 0],
          zoom: 2,
          minZoom: 1,
          maxZoom: 6,
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: true,
        });
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(map);
        
        worldMapInstance.current = map;
        worldMarkersRef.current = L.layerGroup().addTo(map);
        
        trips.forEach(trip => {
          if (!isMountedRef.current) return;
          const coords = getTripLatLong(trip);
          const hasStars = (trip.totalMemoryStars ?? 0) > 0;
          
          const html = `
            <div class="trip-marker" data-trip-id="${trip.id}">
              <div class="trip-marker-inner">
                ${PlaneIconSVG.replace('width="20"', 'class="trip-marker-icon"')}
              </div>
              <div class="trip-marker-label">${trip.name}</div>
              ${hasStars ? `<div class="trip-marker-star">${StarIconSVG}</div>` : ''}
            </div>
          `;
          
          const icon = L.divIcon({
            html,
            className: 'leaflet-trip-marker',
            iconSize: [48, 60],
            iconAnchor: [24, 30],
          });
          
          const marker = L.marker([coords.lat, coords.lon], { 
            icon, 
            interactive: true, 
            zIndexOffset: 1000,
            bubblingMouseEvents: false,
          }).addTo(worldMarkersRef.current);
          
          // Bind click handler with multiple event types for mobile compatibility
          const handleMarkerClick = (e: any) => {
            e.originalEvent?.stopPropagation();
            e.originalEvent?.preventDefault();
            console.log('[FamilyTravelMap] Plane marker clicked:', trip.id, trip.name);
            setPendingTripId(trip.id);
            onTripSelect(trip.id);
          };
          
          marker.on('click', handleMarkerClick);
          marker.on('tap', handleMarkerClick); // For mobile touch events
          
          // Also add DOM-level event listeners for better mobile compatibility
          // Use setTimeout to ensure element is in DOM
          setTimeout(() => {
            const markerElement = marker.getElement?.();
            if (markerElement) {
              markerElement.style.cursor = 'pointer';
              markerElement.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                console.log('[FamilyTravelMap] DOM click on trip:', trip.id);
                setPendingTripId(trip.id);
                onTripSelect(trip.id);
              });
              markerElement.addEventListener('touchend', (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[FamilyTravelMap] Touch on trip:', trip.id);
                setPendingTripId(trip.id);
                onTripSelect(trip.id);
              }, { passive: false });
            }
          }, 50);
        });
        
        if (trips.length > 0 && isMountedRef.current) {
          const bounds = trips.map(t => {
            const c = getTripLatLong(t);
            return [c.lat, c.lon];
          });
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 4 });
        }
        
        // Force Leaflet to recalculate container size after AnimatePresence transition
        setTimeout(() => {
          if (map && isMountedRef.current) {
            try {
              map.invalidateSize();
            } catch {}
          }
        }, 100);
      } catch (error) {
        console.warn('Leaflet world map initialization error:', error);
      }
    }, 150); // Small delay for AnimatePresence transition
    
    return () => {
      clearTimeout(initTimeout);
      safeMapCleanup(worldMapInstance.current);
      worldMapInstance.current = null;
      worldMarkersRef.current = null;
    };
  }, [leafletReady, mapView, trips]);

  useEffect(() => {
    if (!leafletReady || !tripMapRef.current || mapView !== 'trip') return;
    if (!isMountedRef.current) return;
    
    const L = (window as any).L;
    if (!L) return;
    
    try {
      safeMapCleanup(tripMapInstance.current);
      tripMapInstance.current = null;
      if (tripMapRef.current) (tripMapRef.current as any)._leaflet_id = undefined;
      
      const tripCenter = getDefaultCoords(currentTrip, stops);
      const map = L.map(tripMapRef.current, {
        center: [tripCenter.lat, tripCenter.lon],
        zoom: 10,
        minZoom: 4,
        maxZoom: 16,
        zoomControl: !containedMode && !isShare,
        attributionControl: false,
        scrollWheelZoom: !containedMode && !isShare,
        dragging: !containedMode && !isShare,
        keyboard: !containedMode && !isShare,
        doubleClickZoom: !containedMode && !isShare,
        boxZoom: !containedMode && !isShare,
        tap: !containedMode && !isShare,
      });
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);
      
      tripMapInstance.current = map;
      tripMarkersRef.current = L.layerGroup().addTo(map);
      
      const sortedStops = [...stops].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      const journeyCoords: [number, number][] = [];
      const stopCoordsLookup = getStopCoordsLookup(currentTrip, stops);
      const defaultCoords = getDefaultCoords(currentTrip, stops);
      
      sortedStops.forEach((stop) => {
        if (!isMountedRef.current) return;
        const coords = stopCoordsLookup[stop.name] || defaultCoords;
        journeyCoords.push([coords.lat, coords.lon]);
      });
      
      if (journeyCoords.length > 1 && isMountedRef.current) {
        L.polyline(journeyCoords, {
          color: '#f97316',
          weight: isShare ? 2 : 3,
          opacity: isShare ? 0.55 : 0.75,
          dashArray: isShare ? '5, 9' : '8, 10',
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(tripMarkersRef.current);
      }
      
      // Compute effective favorites: manual first, auto-fallback if none
      const manualFavIds = sortedStops.filter(s => s.isFavorite && s.favoriteSource === 'manual').map(s => s.id);
      const effectiveFavIds: Set<string> = manualFavIds.length > 0
        ? new Set(manualFavIds)
        : new Set(
            sortedStops
              .filter(s => s.isVisited)
              .map(s => {
                let score = 0;
                if (moments.some(m => m.stopId === s.id && m.photoUrl)) score += 3;
                if (['nature', 'park', 'zoo', 'beach', 'museum', 'experience', 'adventure', 'viewpoint', 'waterfall', 'aquarium'].includes(s.stopType ?? '')) score += 2;
                if (s.missionCompleted) score += 2;
                return { id: s.id, score };
              })
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map(x => x.id)
          );

      sortedStops.forEach((stop, index) => {
        if (!isMountedRef.current) return;
        const coords = stopCoordsLookup[stop.name] || defaultCoords;
        const stopMoments = moments.filter(m => m.stopId === stop.id);
        const hasPhoto = stopMoments.some(m => m.photoUrl);
        const isFav = effectiveFavIds.has(stop.id);

        const html = `
          <div class="stop-marker${isShare ? ' share-mode' : ''}" data-stop-id="${stop.id}">
            <div class="stop-marker-inner ${stop.isVisited ? 'visited' : 'unvisited'}">
              <span class="stop-number">${index + 1}</span>
              ${!isShare && hasPhoto ? `<div class="stop-marker-badge photo">${CameraIconSVG}</div>` : ''}
              ${!isShare && isFav ? `<div class="stop-marker-badge star">${StarIconSVG}</div>` : ''}
            </div>
            ${!isShare ? `<div class="stop-marker-label">${stop.name.split(' ').slice(0, 2).join(' ')}</div>` : ''}
          </div>
        `;
        
        const icon = L.divIcon({
          html,
          className: 'leaflet-stop-marker',
          iconSize: isShare ? [30, 30] : [34, 54],
          iconAnchor: isShare ? [15, 15] : [17, 18],
        });
        
        const marker = L.marker([coords.lat, coords.lon], { icon, interactive: true, zIndexOffset: 1000 }).addTo(tripMarkersRef.current);
        marker.on('click', (e: any) => {
          e.originalEvent?.stopPropagation();
          setSelectedStop(stop);
        });
      });
      
      if (sortedStops.length > 0 && isMountedRef.current) {
        const bounds = sortedStops.map(s => {
          const c = stopCoordsLookup[s.name] || defaultCoords;
          return [c.lat, c.lon];
        });
        map.fitBounds(bounds, { padding: [60, 60] });
      } else if (isMountedRef.current) {
        map.setView([defaultCoords.lat, defaultCoords.lon], 10);
      }
      
      // Force Leaflet to recalculate container size after AnimatePresence transition
      setTimeout(() => {
        if (map && isMountedRef.current) {
          try {
            map.invalidateSize();
          } catch {}
        }
      }, 100);
    } catch (error) {
      console.warn('Leaflet trip map initialization error:', error);
    }
    
    return () => {
      safeMapCleanup(tripMapInstance.current);
      tripMapInstance.current = null;
      tripMarkersRef.current = null;
    };
  }, [leafletReady, mapView, stops, moments, currentTrip, containedMode, isShare]);

  const getStopMoments = (stopId: string) => {
    return moments.filter(m => m.stopId === stopId);
  };

  const handleTripClick = (trip: TravelTrip) => {
    setZoomingTrip(trip);
    setPendingTripId(trip.id);
    onTripSelect(trip.id);
    
    if (worldMapInstance.current && isMountedRef.current) {
      try {
        const coords = getTripLatLong(trip);
        worldMapInstance.current.flyTo([coords.lat, coords.lon], 6, { duration: 0.5 });
      } catch (e) {}
    }
    
    // View will be switched by the useEffect when trip data is ready
    setTimeout(() => {
      if (isMountedRef.current) {
        setZoomingTrip(null);
      }
    }, 500);
  };

  const handleBackToWorld = () => {
    setMapView('world');
    setSelectedStop(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={containedMode
        ? "absolute inset-0 bg-sky-100 dark:bg-slate-800"
        : "fixed inset-0 z-50 bg-gradient-to-b from-sky-200 to-sky-300 dark:from-slate-800 dark:to-slate-900"}
    >
      <div className="h-full flex flex-col">
        <header className={`flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur z-20 ${containedMode || isShare ? "hidden" : ""}`}>
          {mapView === 'trip' ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToWorld}
              className="gap-1"
              data-testid="button-back-world"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-map">
              <X className="w-6 h-6" />
            </Button>
          )}
          <div className="text-center flex-1">
            <h1 className="font-bold text-lg">
              {mapView === 'world' ? 'Family Travel Map' : currentTrip?.name || 'Trip Map'}
            </h1>
            {mapView === 'trip' && currentTrip && (
              <p className="text-sm text-muted-foreground">{currentTrip.destination}</p>
            )}
          </div>
          {mapView === 'world' ? (
            <div className="flex items-center gap-1 bg-sky-100 dark:bg-sky-900/30 px-3 py-1 rounded-full">
              <Plane className="w-4 h-4 text-sky-500" />
              <span className="text-sm font-medium">{trips.length} trips</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                <span className="text-sm font-medium">{memoryStars} stars</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/80 shadow-sm"
                data-testid="button-close-map-trip"
              >
                <X className="w-5 h-5 text-gray-600" />
              </Button>
            </div>
          )}
        </header>

        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {mapView === 'world' ? (
              <motion.div
                key="world-view"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                {!leafletReady ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-sky-100">
                    <div className="text-center">
                      <Plane className="w-12 h-12 text-sky-400 mx-auto mb-3 animate-bounce" />
                      <p className="text-sm text-muted-foreground">Loading map...</p>
                    </div>
                  </div>
                ) : (
                  <div ref={worldMapRef} className="w-full h-full" />
                )}
                
                {leafletReady && trips.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center p-6 bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-lg max-w-xs pointer-events-auto">
                      <Plane className="w-12 h-12 text-sky-400 mx-auto mb-3" />
                      <h3 className="font-bold text-lg mb-2">No Trips Yet!</h3>
                      <p className="text-sm text-muted-foreground">
                        Create your first trip to see it on the map
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="trip-view"
                initial={{ opacity: 0, scale: 1.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                {!leafletReady ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-sky-100">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-orange-400 mx-auto mb-3 animate-bounce" />
                      <p className="text-sm text-muted-foreground">Loading map...</p>
                    </div>
                  </div>
                ) : (
                  <div ref={tripMapRef} className="w-full h-full" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {!containedMode && selectedStop && (
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              className="fixed bottom-0 left-0 right-0 p-4 pb-20 bg-white dark:bg-slate-800 rounded-t-3xl shadow-lg"
              style={{ zIndex: 9999 }}
            >
              <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />

              <div className="flex items-start gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    selectedStop.isVisited
                      ? "bg-gradient-to-br from-green-100 to-green-200"
                      : "bg-gradient-to-br from-orange-100 to-pink-100"
                  }`}
                >
                  <MapPin className={`w-7 h-7 ${selectedStop.isVisited ? 'text-green-600' : 'text-orange-500'}`} />
                </motion.div>

                <div className="flex-1">
                  <h3 className="font-bold text-lg">{selectedStop.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{selectedStop.stopType}</p>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => {
                        onStopClick(selectedStop);
                        setSelectedStop(null);
                      }}
                      className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      data-testid="button-view-journey-games"
                    >
                      <span className="text-lg">🎯</span>
                      Journey Games: Explore
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStop(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>

              {getStopMoments(selectedStop.id).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Moments from this stop:</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {getStopMoments(selectedStop.id).map((moment) => (
                      <div
                        key={moment.id}
                        className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden"
                      >
                        {moment.photoUrl ? (
                          <img src={moment.photoUrl} alt="Moment" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className={`p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur z-10 ${selectedStop || containedMode || isShare ? 'hidden' : ''}`}>
          {mapView === 'world' ? (
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-sky-400 to-blue-600 rounded-full flex items-center justify-center">
                  <Plane className="w-3 h-3 text-white" />
                </div>
                <span>Trips: {trips.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span>Stars: {trips.reduce((sum, t) => sum + (t.totalMemoryStars || 0), 0)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Visited: {stops.filter(s => s.isVisited).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-400" />
                <span>Remaining: {stops.filter(s => !s.isVisited).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-pink-500" />
                <span>Moments: {moments.length}</span>
              </div>
            </div>
          )}
        </footer>
      </div>
    </motion.div>
  );
}
