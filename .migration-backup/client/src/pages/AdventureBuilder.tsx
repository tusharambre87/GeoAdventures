import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { AddAnchorSheet, type AnchorInput, formatDisplayTime } from "@/components/AddAnchorSheet";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  Search,
  Plus,
  X,
  Check,
  UserPlus,
  MapPin,
  Users,
  Compass,
  ChevronRight,
  Calendar,
  Loader2,
  Plane,
  Sparkles,
  GripVertical,
  Navigation,
  Hotel,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useExplorer } from "@/lib/explorerContext";
import { useUser } from "@/lib/userContext";
import { useTravel } from "@/lib/travelContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useFreeLimits } from "@/hooks/useFreeLimits";

import { SignUpPrompt } from "@/components/SignUpPrompt";
import {
  CONTINENTS,
  COUNTRIES_BY_CONTINENT,
  MONTHS,
  YEARS,
  CITY_COORDS,
  POPULAR_CITIES,
  getCoordsForName,
  type ContinentId,
  type TripTraveler,
} from "@/lib/travelDestinations";
import { toast } from "sonner";

const AVATAR_EMOJIS: Record<string, string> = {
  panda: "🐼",
  lion: "🦁",
  elephant: "🐘",
  penguin: "🐧",
  koala: "🐨",
  fox: "🦊",
  owl: "🦉",
  turtle: "🐢",
  butterfly: "🦋",
  dolphin: "🐬",
  rocket: "🚀",
  globe: "🌍",
};

function getAvatarEmoji(key?: string | null): string {
  return key ? AVATAR_EMOJIS[key] || "🐼" : "🐼";
}

interface SearchableDestination {
  type: "country" | "city" | "continent";
  name: string;
  flag?: string;
  continent?: string;
  continentId?: ContinentId;
  countryCode?: string;
  countryName?: string;
}

function buildSearchIndex(): SearchableDestination[] {
  const items: SearchableDestination[] = [];

  for (const continent of CONTINENTS) {
    items.push({
      type: "continent",
      name: continent.name,
      flag: continent.emoji,
      continentId: continent.id,
    });
  }

  for (const [continentId, countries] of Object.entries(COUNTRIES_BY_CONTINENT)) {
    const continent = CONTINENTS.find((c) => c.id === continentId);
    for (const country of countries) {
      items.push({
        type: "country",
        name: country.name,
        flag: country.flag,
        continent: continent?.name,
        continentId: continentId as ContinentId,
        countryCode: country.code,
      });
    }
  }

  for (const city of POPULAR_CITIES) {
    items.push({
      type: "city",
      name: city.name,
      countryName: city.country,
      countryCode: city.countryCode,
      continentId: city.continentId,
      continent: CONTINENTS.find((c) => c.id === city.continentId)?.name,
    });
  }

  return items;
}

const SEARCH_INDEX = buildSearchIndex();

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function injectBuilderMapStyles() {
  if (document.getElementById('builder-map-styles')) return;
  const style = document.createElement('style');
  style.id = 'builder-map-styles';
  style.textContent = `
    @keyframes builder-pin-drop {
      0% { transform: translateY(-20px) scale(0.5); opacity: 0; }
      60% { transform: translateY(2px) scale(1.05); opacity: 1; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes builder-pulse {
      0% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
      70% { box-shadow: 0 0 0 8px rgba(249,115,22,0); }
      100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
    }
    .builder-city-pin {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      animation: builder-pin-drop 0.4s ease-out;
      transition: transform 0.2s;
    }
    .builder-city-pin:hover {
      transform: scale(1.2);
    }
    .builder-city-pin-inner {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #f97316;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: 700;
    }
    .builder-city-pin-inner.selectable {
      background: #94a3b8;
      cursor: pointer;
    }
    .builder-city-pin-inner.selectable:hover {
      background: #f97316;
    }
    .builder-city-pin-inner.numbered {
      animation: builder-pulse 2s infinite;
    }
    .builder-city-pin-label {
      position: absolute;
      top: 34px;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
      font-size: 10px;
      font-weight: 600;
      color: #1e293b;
      text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white;
      pointer-events: none;
    }
    .builder-map .leaflet-container {
      border-radius: 16px;
    }
  `;
  document.head.appendChild(style);
}

interface RouteStop {
  id: string;
  name: string;
  countryCode?: string;
  countryName?: string;
  continentId?: ContinentId;
}

interface LeafletMap {
  getBounds(): { contains(latlng: [number, number]): boolean };
  getZoom(): number;
  setView(latlng: [number, number], zoom: number): void;
  flyTo(latlng: [number, number], zoom: number): void;
  on(event: string, handler: () => void): void;
  off(event: string, handler: () => void): void;
  remove(): void;
  invalidateSize(): void;
}

interface LeafletLayerGroup {
  clearLayers(): void;
  addTo(map: LeafletMap): LeafletLayerGroup;
}

interface LeafletStatic {
  map(el: HTMLElement, opts: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, opts: Record<string, unknown>): { addTo(map: LeafletMap): void };
  layerGroup(): LeafletLayerGroup;
  divIcon(opts: Record<string, unknown>): unknown;
  marker(latlng: [number, number], opts: Record<string, unknown>): { addTo(group: LeafletLayerGroup): { on(event: string, handler: () => void): void } };
  polyline(latlngs: [number, number][], opts: Record<string, unknown>): { addTo(group: LeafletLayerGroup): void };
}

declare global {
  interface Window {
    L?: LeafletStatic;
  }
}

function BuildingMapPreview({ cityName, leafletReady }: { cityName: string; leafletReady: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [visibleStopCount, setVisibleStopCount] = useState(0);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  // Generate 7 natural zig-zag stop positions spread across city
  const cityCoords = getCoordsForName(cityName) || { lat: 48.8566, lon: 2.3522 };
  const stopPositions = useRef<[number, number][]>(
    (() => {
      // Zig-zag: alternating left/right columns, staggered rows
      const offsets: [number, number][] = [
        [-0.008, -0.018],  // Stop 1 – south-west
        [ 0.014,  0.006],  // Stop 2 – north, centre-east
        [-0.012,  0.020],  // Stop 3 – south-east
        [ 0.018, -0.010],  // Stop 4 – north-west
        [-0.022,  0.016],  // Stop 5 – south-east (clearly below & opposite stop 4)
        [ 0.020,  0.014],  // Stop 6 – north-east
        [-0.015, -0.005],  // Stop 7 – south, slight west
      ];
      return offsets.map(([dlat, dlon]) => [
        cityCoords.lat + dlat,
        cityCoords.lon + dlon,
      ]);
    })()
  );

  useEffect(() => {
    if (!leafletReady) return;
    if (!containerRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    if (mapInstanceRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png", {
      maxZoom: 18,
      crossOrigin: "anonymous",
    }).addTo(map);
    map.setView([cityCoords.lat, cityCoords.lon], 13);
    mapInstanceRef.current = map;
    setMapReady(true);
    // Force Leaflet to re-measure container after CSS transitions settle
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [cityName, leafletReady]);

  // Incrementally reveal stops with dotted lines every 1.5 seconds
  useEffect(() => {
    if (!mapReady) return;
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const positions = stopPositions.current;
    if (visibleStopCount >= positions.length) return;

    const timer = setTimeout(() => {
      const i = visibleStopCount;
      const pos = positions[i];

      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#f97316;color:#fff;font-weight:800;font-size:10px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);animation:popIn 0.3s ease;">${i + 1}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const marker = L.marker(pos, { icon }).addTo(map);
      markersRef.current.push(marker);

      if (i > 0) {
        const prevPos = positions[i - 1];
        const line = L.polyline([prevPos, pos], {
          color: "#f97316",
          weight: 2,
          opacity: 0.7,
          dashArray: "6 5",
        }).addTo(map);
        polylinesRef.current.push(line);
      }

      setVisibleStopCount(c => c + 1);
    }, visibleStopCount === 0 ? 500 : 1500);

    return () => clearTimeout(timer);
  }, [mapReady, visibleStopCount]);

  return (
    <div className="absolute inset-0 w-full h-full">
      {!mapReady && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <span className="text-5xl block mb-2">🗺️</span>
            <span className="text-white/60 text-xs font-medium">{cityName}</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

function BuilderMap({ leafletReady, routeStops, onAddStop, onSelectDestination, step, totalDistance, selectedDestination, searchQuery }: {
  leafletReady: boolean;
  routeStops: RouteStop[];
  onAddStop?: (dest: SearchableDestination) => void;
  onSelectDestination?: (dest: SearchableDestination) => void;
  step: number;
  totalDistance: number;
  selectedDestination?: SearchableDestination | null;
  searchQuery?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletLayerGroup | null>(null);
  const routeLineRef = useRef<LeafletLayerGroup | null>(null);
  const mountedRef = useRef(true);
  const prevStopCountRef = useRef(0);
  const [mapReady, setMapReady] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!leafletReady || !containerRef.current || mapRef.current) return;
    const L = window.L!;
    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    routeLineRef.current = L.layerGroup().addTo(map);
    setTimeout(() => {
      if (mountedRef.current && mapRef.current) {
        mapRef.current.invalidateSize();
        setMapReady(1);
      }
    }, 100);
    return () => {
      mountedRef.current = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [leafletReady]);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current || !routeLineRef.current || mapReady === 0) return;
    const L = window.L!;
    markersRef.current.clearLayers();
    routeLineRef.current.clearLayers();

    const newCount = routeStops.length;
    const coords: [number, number][] = [];

    routeStops.forEach((stop, idx) => {
      const c = getCoordsForName(stop.name);
      if (!c) return;
      coords.push([c.lat, c.lon]);
      const label = routeStops.length > 1 ? `${idx + 1}` : '📍';
      const icon = L.divIcon({
        html: `<div class="builder-city-pin"><div class="builder-city-pin-inner ${routeStops.length > 1 ? 'numbered' : ''}">${label}</div><div class="builder-city-pin-label">${stop.name}</div></div>`,
        className: '',
        iconSize: [32, 48],
        iconAnchor: [16, 16],
      });
      L.marker([c.lat, c.lon], { icon }).addTo(markersRef.current!);
    });

    if (coords.length >= 2) {
      L.polyline(coords, { color: '#f97316', weight: 2.5, opacity: 0.7, dashArray: '6 4' }).addTo(routeLineRef.current);
    }

    if (newCount > prevStopCountRef.current && coords.length > 0) {
      const last = coords[coords.length - 1];
      const zoom = routeStops.length === 1 ? 6 : 4;
      mapRef.current!.flyTo(last, zoom);
    }

    prevStopCountRef.current = newCount;
  }, [routeStops, step, mapReady]);

  useEffect(() => {
    if (!mapRef.current || !selectedDestination) return;
    const coords = getCoordsForName(selectedDestination.name);
    if (coords) {
      mapRef.current.flyTo([coords.lat, coords.lon], selectedDestination.type === 'continent' ? 3 : selectedDestination.type === 'country' ? 4 : 6);
    }
  }, [selectedDestination]);

  useEffect(() => {
    if (!mapRef.current || !searchQuery) return;
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return;
    const coords = CITY_COORDS[q];
    if (coords) {
      mapRef.current.flyTo([coords.lat, coords.lon], 6);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
  }, [step]);

  return (
    <div className="mb-4 builder-map" data-testid="builder-map">
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-sm"
        style={{ height: 112 }}
      />
      {totalDistance > 0 && routeStops.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-slate-500" data-testid="total-distance">
          <Navigation className="w-3.5 h-3.5 text-orange-500" />
          <span>Total Journey: <span className="font-semibold text-slate-700 dark:text-slate-300">{totalDistance.toLocaleString()} km</span></span>
        </div>
      )}
    </div>
  );
}

type AdventureStyleId = "explore_sights" | "food_local" | "kids_activities" | "culture_history" | "nature_outdoors";

const ADVENTURE_STYLES: { id: AdventureStyleId; emoji: string; title: string; description: string; confirmLabel: string }[] = [
  { id: "explore_sights",   emoji: "🌍", title: "Explore & sights",   description: "Top landmarks + iconic spots",  confirmLabel: "sights" },
  { id: "food_local",       emoji: "🍜", title: "Food & local spots", description: "Markets, eats + local gems",     confirmLabel: "food & local spots" },
  { id: "kids_activities",  emoji: "🎡", title: "Kids activities",    description: "Playgrounds, fun + interactive", confirmLabel: "kid-friendly activities" },
  { id: "culture_history",  emoji: "🏛️", title: "Culture & history",  description: "Museums, temples + palaces",    confirmLabel: "culture & history" },
  { id: "nature_outdoors",  emoji: "🌿", title: "Nature & outdoors",  description: "Parks, beaches + wildlife",      confirmLabel: "nature" },
];

const STEP_LABELS = [
  { num: 1, label: "Where & Route" },
  { num: 2, label: "Who & When" },
  { num: 3, label: "Preview" },
];

function DateRangePicker({
  startDate,
  endDate,
  minDate,
  defaultMonth,
  onStartChange,
  onEndChange,
  startLabel = "Arrive",
  endLabel = "Leave",
}: {
  startDate: string;
  endDate: string;
  minDate?: string;
  defaultMonth?: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  startLabel?: string;
  endLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pickState, setPickState] = useState<"start" | "end">("start");
  const triggerRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);

  // Always enforce today as the floor — past dates are never valid for a new trip
  const todayStr = new Date().toISOString().split("T")[0];
  const effectiveMinDate = minDate && minDate > todayStr ? minDate : todayStr;

  const getInitMonth = () => {
    const base = (pickState === "end" ? endDate || startDate : startDate) || defaultMonth || effectiveMinDate || "";
    if (base) {
      const d = new Date(base + "T12:00:00");
      if (!isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth() };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  };

  const [calMonth, setCalMonth] = useState(() => getInitMonth());

  useEffect(() => {
    if (open) setCalMonth(getInitMonth());
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        calRef.current && !calRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openCalendar = (state: "start" | "end") => {
    setPickState(state);
    setOpen(true);
  };

  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(calMonth.year, calMonth.month, 1).getDay();

  const toDateStr = (day: number) =>
    `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const handleDayClick = (day: number) => {
    const dateStr = toDateStr(day);
    if (dateStr < effectiveMinDate) return;
    if (pickState === "start") {
      onStartChange(dateStr);
      onEndChange("");
      setPickState("end");
    } else {
      if (startDate && dateStr < startDate) {
        onStartChange(dateStr);
        onEndChange("");
        setPickState("end");
      } else {
        onEndChange(dateStr);
        setPickState("start");
        setOpen(false);
      }
    }
  };

  const formatDate = (s: string) => {
    if (!s) return "";
    const d = new Date(s + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const isStart = (day: number) => toDateStr(day) === startDate;
  const isEnd = (day: number) => toDateStr(day) === endDate;
  const isInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const d = toDateStr(day);
    return d > startDate && d < endDate;
  };
  const isDisabled = (day: number) => toDateStr(day) < effectiveMinDate;

  const monthName = new Date(calMonth.year, calMonth.month).toLocaleString("en-US", { month: "long", year: "numeric" });

  const liveCalPos = open && triggerRef.current ? (() => {
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const calWidth = Math.min(rect.width, vw - 16);
    let top = rect.bottom + 4;
    let left = Math.max(8, Math.min(rect.left, vw - calWidth - 8));
    // Flip above if not enough space below (calendar ~320px tall)
    if (top + 320 > vh && rect.top > 320) top = rect.top - 324;
    return { top, left, width: calWidth };
  })() : null;

  const calendar = open && liveCalPos ? createPortal(
    <div
      ref={calRef}
      style={{ position: "fixed", top: liveCalPos.top, left: liveCalPos.left, width: liveCalPos.width, zIndex: 9999 }}
      className="bg-white rounded-2xl shadow-xl border border-orange-100 p-4"
    >
      <div className="flex items-center justify-between mb-2">
        {(() => {
          const minD = new Date(effectiveMinDate + "T00:00:00");
          const atMin = calMonth.year < minD.getFullYear() || (calMonth.year === minD.getFullYear() && calMonth.month <= minD.getMonth());
          return (
            <button
              onClick={() => !atMin && setCalMonth(p => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
              className={`p-1.5 rounded-lg transition-colors ${atMin ? "opacity-20 cursor-not-allowed" : "hover:bg-orange-50"}`}
              disabled={atMin}
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
          );
        })()}
        <span className="text-sm font-bold text-slate-700">{monthName}</span>
        <button onClick={() => setCalMonth(p => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="p-1.5 hover:bg-orange-50 rounded-lg">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      <p className="text-[10px] text-center text-orange-500 font-semibold mb-2">
        {pickState === "start" ? `Tap ${startLabel.toLowerCase()} date` : `Tap ${endLabel.toLowerCase()} date`}
      </p>
      <div className="grid grid-cols-7 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-[10px] text-slate-400 font-medium py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const disabled = isDisabled(day);
          const start = isStart(day);
          const end = isEnd(day);
          const inRange = isInRange(day);
          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => !disabled && handleDayClick(day)}
              className={`h-8 w-full text-xs font-medium transition-all ${
                start || end ? "bg-orange-500 text-white rounded-lg" :
                inRange ? "bg-orange-100 text-orange-700 rounded-none" :
                disabled ? "text-slate-300 cursor-not-allowed" :
                "text-slate-700 hover:bg-orange-50 rounded-lg"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100">
        <button onClick={() => { onStartChange(""); onEndChange(""); setPickState("start"); }} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
        <button onClick={() => setOpen(false)} className="text-xs font-semibold text-orange-600 hover:text-orange-700 px-3 py-1 bg-orange-50 rounded-full">Done</button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={triggerRef}>
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className={`h-10 rounded-xl border px-3 flex items-center cursor-pointer transition-colors ${open && pickState === "start" ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-white"}`}
          onClick={() => openCalendar("start")}
        >
          <span className="text-xs text-slate-800 truncate">{startDate ? formatDate(startDate) : <span className="text-slate-400">{startLabel}</span>}</span>
        </div>
        <div
          className={`h-10 rounded-xl border px-3 flex items-center cursor-pointer transition-colors ${open && pickState === "end" ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-white"}`}
          onClick={() => openCalendar(startDate ? "end" : "start")}
        >
          <span className="text-xs text-slate-800 truncate">{endDate ? formatDate(endDate) : <span className="text-slate-400">{endLabel}</span>}</span>
        </div>
      </div>
      {calendar}
    </div>
  );
}

const CITY_TASTE_OF_DAY: Record<string, { stops: Array<{ time: string; stop: string; type: string; xp: string }> }> = {
  rome:        { stops: [{ time: "9:30 AM", stop: "Colosseum Explorer", type: "🏛️ Ancient history", xp: "+10 XP" }, { time: "12:00 PM", stop: "Campo de' Fiori Market", type: "🍕 Food & culture", xp: "+8 XP" }, { time: "3:00 PM", stop: "Trevi Fountain Wish", type: "💧 Family tradition", xp: "+5 XP" }] },
  milan:       { stops: [{ time: "9:30 AM", stop: "Duomo Cathedral Climb", type: "⛪ Architecture", xp: "+10 XP" }, { time: "11:30 AM", stop: "Navigli Canal Walk", type: "🚶 Easy stroll", xp: "+5 XP" }, { time: "2:00 PM", stop: "Sforza Castle Discovery", type: "🏰 History", xp: "+8 XP" }] },
  palermo:     { stops: [{ time: "9:30 AM", stop: "Palermo Cathedral Tour", type: "⛪ History & art", xp: "+8 XP" }, { time: "11:00 AM", stop: "Ballarò Street Market", type: "🛒 Street food", xp: "+10 XP" }, { time: "2:30 PM", stop: "Puppet Museum Adventure", type: "🎭 Interactive", xp: "+5 XP" }] },
  paris:       { stops: [{ time: "9:30 AM", stop: "Eiffel Tower Climb", type: "🗼 Iconic landmark", xp: "+10 XP" }, { time: "12:00 PM", stop: "Luxembourg Gardens Picnic", type: "🌳 Outdoors", xp: "+5 XP" }, { time: "2:30 PM", stop: "Louvre Treasure Hunt", type: "🎨 Art & culture", xp: "+8 XP" }] },
  london:      { stops: [{ time: "9:30 AM", stop: "Tower of London Quest", type: "🏰 History", xp: "+10 XP" }, { time: "12:00 PM", stop: "Hyde Park Explorer", type: "🌿 Outdoors", xp: "+5 XP" }, { time: "2:30 PM", stop: "Natural History Museum", type: "🦕 Science & wonder", xp: "+8 XP" }] },
  barcelona:   { stops: [{ time: "9:30 AM", stop: "Sagrada Família Wonder", type: "⛪ Architecture", xp: "+10 XP" }, { time: "11:30 AM", stop: "Park Güell Adventure", type: "🎨 Art & parks", xp: "+8 XP" }, { time: "2:00 PM", stop: "La Boqueria Market", type: "🛒 Food & culture", xp: "+5 XP" }] },
  tokyo:       { stops: [{ time: "9:30 AM", stop: "Senso-ji Temple Walk", type: "⛩️ Culture", xp: "+8 XP" }, { time: "11:00 AM", stop: "Harajuku Street Food Tour", type: "🍡 Food & fun", xp: "+10 XP" }, { time: "2:00 PM", stop: "teamLab Digital Art", type: "🎆 Interactive art", xp: "+5 XP" }] },
  "new york":  { stops: [{ time: "9:30 AM", stop: "Central Park Bike Ride", type: "🚲 Outdoors", xp: "+8 XP" }, { time: "11:30 AM", stop: "Brooklyn Bridge Walk", type: "🌉 Iconic views", xp: "+5 XP" }, { time: "2:00 PM", stop: "Museum of Natural History", type: "🦕 Science & wonder", xp: "+10 XP" }] },
  sydney:      { stops: [{ time: "9:30 AM", stop: "Sydney Opera House Tour", type: "🎭 Culture", xp: "+10 XP" }, { time: "11:30 AM", stop: "Bondi Beach Coastal Walk", type: "🏖️ Outdoors", xp: "+5 XP" }, { time: "2:30 PM", stop: "Taronga Zoo Discovery", type: "🐨 Wildlife", xp: "+8 XP" }] },
  dubai:       { stops: [{ time: "9:30 AM", stop: "Burj Khalifa Observation", type: "🏙️ Views", xp: "+10 XP" }, { time: "12:00 PM", stop: "Dubai Mall Aquarium", type: "🐟 Wildlife", xp: "+8 XP" }, { time: "3:00 PM", stop: "Dubai Creek Abra Ride", type: "⛵ Adventure", xp: "+5 XP" }] },
  singapore:   { stops: [{ time: "9:30 AM", stop: "Gardens by the Bay", type: "🌿 Nature & wonder", xp: "+10 XP" }, { time: "12:00 PM", stop: "Hawker Centre Feast", type: "🍜 Street food", xp: "+8 XP" }, { time: "2:30 PM", stop: "Sentosa Island Fun", type: "🎡 Adventure", xp: "+5 XP" }] },
  amsterdam:   { stops: [{ time: "9:30 AM", stop: "Anne Frank House Visit", type: "🏛️ History", xp: "+10 XP" }, { time: "11:30 AM", stop: "Canal Boat Ride", type: "⛵ City tour", xp: "+8 XP" }, { time: "2:00 PM", stop: "Rijksmuseum Adventure", type: "🎨 Art & culture", xp: "+5 XP" }] },
  istanbul:    { stops: [{ time: "9:30 AM", stop: "Hagia Sophia Exploration", type: "🕌 History", xp: "+10 XP" }, { time: "11:30 AM", stop: "Grand Bazaar Treasure Hunt", type: "🛒 Shopping", xp: "+8 XP" }, { time: "2:30 PM", stop: "Bosphorus Boat Cruise", type: "⛵ Views", xp: "+5 XP" }] },
  bangkok:     { stops: [{ time: "9:30 AM", stop: "Grand Palace Discovery", type: "🏯 Culture", xp: "+10 XP" }, { time: "11:30 AM", stop: "Wat Pho Temple Walk", type: "⛩️ History", xp: "+8 XP" }, { time: "2:30 PM", stop: "Chatuchak Weekend Market", type: "🛒 Food & culture", xp: "+5 XP" }] },
  "hong kong": { stops: [{ time: "9:30 AM", stop: "Victoria Peak Tram Ride", type: "🚡 Views", xp: "+10 XP" }, { time: "12:00 PM", stop: "Temple Street Night Market", type: "🏮 Culture", xp: "+8 XP" }, { time: "3:00 PM", stop: "Star Ferry Harbour Cruise", type: "⛴️ Adventure", xp: "+5 XP" }] },
  "kuala lumpur": { stops: [{ time: "9:30 AM", stop: "Petronas Twin Towers", type: "🏙️ Iconic landmark", xp: "+10 XP" }, { time: "12:00 PM", stop: "Batu Caves Climb", type: "🦁 Nature & culture", xp: "+8 XP" }, { time: "3:00 PM", stop: "Central Market Discovery", type: "🛒 Food & culture", xp: "+5 XP" }] },
  bali:        { stops: [{ time: "9:00 AM", stop: "Ubud Monkey Forest", type: "🐒 Wildlife", xp: "+8 XP" }, { time: "11:30 AM", stop: "Tegallalang Rice Terrace", type: "🌿 Nature", xp: "+5 XP" }, { time: "4:00 PM", stop: "Tanah Lot Sunset View", type: "🌅 Scenic", xp: "+10 XP" }] },
  prague:      { stops: [{ time: "9:30 AM", stop: "Prague Castle Walk", type: "🏰 History", xp: "+10 XP" }, { time: "12:00 PM", stop: "Old Town Square Clock", type: "⏰ Iconic landmark", xp: "+5 XP" }, { time: "2:30 PM", stop: "Vltava River Paddle Boats", type: "⛵ Fun", xp: "+8 XP" }] },
  vienna:      { stops: [{ time: "9:30 AM", stop: "Schönbrunn Palace Tour", type: "🏰 History", xp: "+10 XP" }, { time: "12:00 PM", stop: "Prater Ferris Wheel", type: "🎡 Fun", xp: "+8 XP" }, { time: "2:30 PM", stop: "Spanish Riding School", type: "🐴 Culture", xp: "+5 XP" }] },
  berlin:      { stops: [{ time: "9:30 AM", stop: "Brandenburg Gate Walk", type: "🏛️ History", xp: "+8 XP" }, { time: "11:30 AM", stop: "Berlin Zoo & Aquarium", type: "🐘 Wildlife", xp: "+10 XP" }, { time: "2:30 PM", stop: "East Side Gallery Art", type: "🎨 Street art", xp: "+5 XP" }] },
  cairo:       { stops: [{ time: "8:30 AM", stop: "Great Pyramid Wonder", type: "🏺 Ancient history", xp: "+10 XP" }, { time: "11:30 AM", stop: "Egyptian Museum Treasures", type: "🏛️ Culture", xp: "+8 XP" }, { time: "2:30 PM", stop: "Khan el-Khalili Bazaar", type: "🛒 Shopping", xp: "+5 XP" }] },
  marrakech:   { stops: [{ time: "9:30 AM", stop: "Jemaa el-Fna Square", type: "🎪 Culture", xp: "+10 XP" }, { time: "11:30 AM", stop: "Majorelle Garden", type: "🌺 Nature", xp: "+5 XP" }, { time: "2:00 PM", stop: "Medina Souk Treasure Hunt", type: "🛒 Adventure", xp: "+8 XP" }] },
  capetown:    { stops: [{ time: "9:30 AM", stop: "Table Mountain Cable Car", type: "🏔️ Views", xp: "+10 XP" }, { time: "12:00 PM", stop: "V&A Waterfront Explorer", type: "🌊 Fun", xp: "+5 XP" }, { time: "2:30 PM", stop: "Boulders Penguin Colony", type: "🐧 Wildlife", xp: "+8 XP" }] },
  // US Cities
  "las vegas":    { stops: [{ time: "9:30 AM", stop: "Las Vegas Strip Walk", type: "🎰 Iconic boulevard", xp: "+8 XP" }, { time: "12:00 PM", stop: "Bellagio Fountains Show", type: "⛲ Family spectacle", xp: "+10 XP" }, { time: "3:00 PM", stop: "Neon Museum Treasure Hunt", type: "🌟 History & art", xp: "+5 XP" }] },
  "san diego":    { stops: [{ time: "9:30 AM", stop: "San Diego Zoo Explorer", type: "🐼 Wildlife", xp: "+10 XP" }, { time: "12:00 PM", stop: "Balboa Park Discovery", type: "🌿 Museums & gardens", xp: "+8 XP" }, { time: "3:00 PM", stop: "La Jolla Cove Sea Life", type: "🦭 Nature", xp: "+5 XP" }] },
  "los angeles":  { stops: [{ time: "9:30 AM", stop: "Griffith Observatory Hike", type: "🔭 Science & views", xp: "+10 XP" }, { time: "12:00 PM", stop: "Santa Monica Pier Fun", type: "🎡 Boardwalk", xp: "+8 XP" }, { time: "3:00 PM", stop: "Getty Center Art Walk", type: "🎨 Culture", xp: "+5 XP" }] },
  "san francisco": { stops: [{ time: "9:30 AM", stop: "Golden Gate Bridge Walk", type: "🌉 Iconic landmark", xp: "+10 XP" }, { time: "12:00 PM", stop: "Fisherman's Wharf Sea Lions", type: "🦭 Wildlife", xp: "+8 XP" }, { time: "2:30 PM", stop: "Alcatraz Island Tour", type: "🏝️ History", xp: "+5 XP" }] },
  "chicago":      { stops: [{ time: "9:30 AM", stop: "The Bean Cloud Gate", type: "🖼️ Iconic landmark", xp: "+8 XP" }, { time: "11:30 AM", stop: "Navy Pier Ferris Wheel", type: "🎡 Fun", xp: "+10 XP" }, { time: "2:30 PM", stop: "Shedd Aquarium Deep Dive", type: "🐟 Wildlife", xp: "+5 XP" }] },
  "miami":        { stops: [{ time: "9:30 AM", stop: "South Beach Ocean Stroll", type: "🏖️ Outdoors", xp: "+8 XP" }, { time: "12:00 PM", stop: "Wynwood Walls Street Art", type: "🎨 Culture", xp: "+5 XP" }, { time: "3:00 PM", stop: "Everglades Airboat Ride", type: "🐊 Nature", xp: "+10 XP" }] },
  "orlando":      { stops: [{ time: "9:30 AM", stop: "Universal Studios Magic", type: "🎢 Theme park fun", xp: "+10 XP" }, { time: "12:30 PM", stop: "ICON Park Observation Wheel", type: "🎡 Views", xp: "+8 XP" }, { time: "3:30 PM", stop: "Lake Eola Park Swan Boats", type: "🦢 Outdoors", xp: "+5 XP" }] },
  "seattle":      { stops: [{ time: "9:30 AM", stop: "Space Needle Observation", type: "🚀 Views", xp: "+10 XP" }, { time: "12:00 PM", stop: "Pike Place Market Fish Toss", type: "🐟 Food & culture", xp: "+8 XP" }, { time: "2:30 PM", stop: "Museum of Pop Culture", type: "🎸 Interactive", xp: "+5 XP" }] },
  "denver":       { stops: [{ time: "9:30 AM", stop: "Red Rocks Amphitheater Hike", type: "🏔️ Nature", xp: "+10 XP" }, { time: "12:00 PM", stop: "Denver Art Museum", type: "🎨 Culture", xp: "+8 XP" }, { time: "3:00 PM", stop: "Denver Zoo Animals", type: "🦁 Wildlife", xp: "+5 XP" }] },
  "washington":   { stops: [{ time: "9:00 AM", stop: "National Mall & Monuments", type: "🏛️ History", xp: "+10 XP" }, { time: "11:30 AM", stop: "Smithsonian Natural History", type: "🦕 Science & wonder", xp: "+8 XP" }, { time: "2:30 PM", stop: "Lincoln Memorial Steps", type: "🗿 Iconic landmark", xp: "+5 XP" }] },
  "boston":       { stops: [{ time: "9:30 AM", stop: "Freedom Trail History Walk", type: "🏛️ History", xp: "+10 XP" }, { time: "12:00 PM", stop: "New England Aquarium", type: "🐠 Wildlife", xp: "+8 XP" }, { time: "3:00 PM", stop: "Boston Common Park Play", type: "🌿 Outdoors", xp: "+5 XP" }] },
  "nashville":    { stops: [{ time: "9:30 AM", stop: "Country Music Hall of Fame", type: "🎵 Culture", xp: "+10 XP" }, { time: "12:00 PM", stop: "Broadway Honky Tonk Strip", type: "🎶 Music & food", xp: "+8 XP" }, { time: "3:00 PM", stop: "Centennial Park Parthenon", type: "🏛️ History", xp: "+5 XP" }] },
  "phoenix":      { stops: [{ time: "8:30 AM", stop: "Camelback Mountain Hike", type: "🏔️ Adventure", xp: "+10 XP" }, { time: "11:00 AM", stop: "Desert Botanical Garden", type: "🌵 Nature", xp: "+8 XP" }, { time: "2:00 PM", stop: "Heard Museum Culture", type: "🏛️ Culture", xp: "+5 XP" }] },
  "portland":     { stops: [{ time: "9:30 AM", stop: "Powell's Books World's Largest", type: "📚 Culture", xp: "+5 XP" }, { time: "11:30 AM", stop: "Washington Park Rose Garden", type: "🌹 Nature", xp: "+8 XP" }, { time: "2:30 PM", stop: "Pittock Mansion Views", type: "🏠 History", xp: "+10 XP" }] },
  "new orleans":  { stops: [{ time: "9:30 AM", stop: "French Quarter Walking Tour", type: "🎺 History & culture", xp: "+10 XP" }, { time: "12:00 PM", stop: "Café Du Monde Beignets", type: "☕ Food & tradition", xp: "+8 XP" }, { time: "2:30 PM", stop: "NOLA Jazz Museum", type: "🎷 Music", xp: "+5 XP" }] },
  "austin":       { stops: [{ time: "9:30 AM", stop: "Texas State Capitol Tour", type: "🏛️ History", xp: "+8 XP" }, { time: "12:00 PM", stop: "Barton Springs Pool", type: "🏊 Outdoors", xp: "+10 XP" }, { time: "3:00 PM", stop: "6th Street Live Music", type: "🎸 Culture", xp: "+5 XP" }] },
  "honolulu":     { stops: [{ time: "9:00 AM", stop: "Diamond Head Crater Hike", type: "🌋 Nature", xp: "+10 XP" }, { time: "12:00 PM", stop: "Waikiki Beach Fun", type: "🏖️ Outdoors", xp: "+8 XP" }, { time: "3:00 PM", stop: "Pearl Harbor Memorial", type: "🏛️ History", xp: "+5 XP" }] },
  // ── India ─────────────────────────────────────────────────────────────────────
  "mysore":       { stops: [{ time: "9:30 AM", stop: "Mysore Palace Morning Tour", type: "🏯 Royal heritage", xp: "+10 XP" }, { time: "12:00 PM", stop: "Devaraja Market Spice Walk", type: "🌶️ Food & culture", xp: "+8 XP" }, { time: "3:00 PM", stop: "Chamundi Hills & Nandi Bull", type: "⛰️ Scenic views", xp: "+5 XP" }] },
  "mysuru":       { stops: [{ time: "9:30 AM", stop: "Mysore Palace Morning Tour", type: "🏯 Royal heritage", xp: "+10 XP" }, { time: "12:00 PM", stop: "Devaraja Market Spice Walk", type: "🌶️ Food & culture", xp: "+8 XP" }, { time: "3:00 PM", stop: "Chamundi Hills & Nandi Bull", type: "⛰️ Scenic views", xp: "+5 XP" }] },
  "ooty":         { stops: [{ time: "9:00 AM", stop: "Nilgiri Mountain Railway Ride", type: "🚂 Heritage train", xp: "+10 XP" }, { time: "12:00 PM", stop: "Ooty Botanical Gardens", type: "🌿 Nature & gardens", xp: "+8 XP" }, { time: "3:00 PM", stop: "Ooty Lake Paddle Boat", type: "⛵ Family fun", xp: "+5 XP" }] },
  "bangalore":    { stops: [{ time: "9:30 AM", stop: "Lalbagh Botanical Garden", type: "🌳 Nature", xp: "+8 XP" }, { time: "12:00 PM", stop: "Cubbon Park Family Walk", type: "🌿 Outdoors", xp: "+5 XP" }, { time: "2:30 PM", stop: "Vidhana Soudha Light Show", type: "🏛️ Architecture", xp: "+10 XP" }] },
  "bengaluru":    { stops: [{ time: "9:30 AM", stop: "Lalbagh Botanical Garden", type: "🌳 Nature", xp: "+8 XP" }, { time: "12:00 PM", stop: "Cubbon Park Family Walk", type: "🌿 Outdoors", xp: "+5 XP" }, { time: "2:30 PM", stop: "Vidhana Soudha Light Show", type: "🏛️ Architecture", xp: "+10 XP" }] },
  "delhi":        { stops: [{ time: "9:00 AM", stop: "Red Fort History Walk", type: "🏯 History", xp: "+10 XP" }, { time: "11:30 AM", stop: "Humayun's Tomb Gardens", type: "🌸 Architecture", xp: "+8 XP" }, { time: "2:30 PM", stop: "Qutub Minar Wonder", type: "🏛️ Ancient wonder", xp: "+5 XP" }] },
  "new delhi":    { stops: [{ time: "9:00 AM", stop: "Red Fort History Walk", type: "🏯 History", xp: "+10 XP" }, { time: "11:30 AM", stop: "Humayun's Tomb Gardens", type: "🌸 Architecture", xp: "+8 XP" }, { time: "2:30 PM", stop: "Qutub Minar Wonder", type: "🏛️ Ancient wonder", xp: "+5 XP" }] },
  "mumbai":       { stops: [{ time: "9:30 AM", stop: "Gateway of India & Harbour", type: "⛵ Iconic landmark", xp: "+10 XP" }, { time: "12:00 PM", stop: "Dhobi Ghat Open-Air Laundry", type: "🎨 Culture", xp: "+8 XP" }, { time: "3:00 PM", stop: "Marine Drive Sunset Walk", type: "🌊 Scenic", xp: "+5 XP" }] },
  "goa":          { stops: [{ time: "9:30 AM", stop: "Old Goa Basilica & Churches", type: "⛪ Heritage", xp: "+10 XP" }, { time: "12:00 PM", stop: "Anjuna Flea Market", type: "🛒 Culture", xp: "+8 XP" }, { time: "3:00 PM", stop: "Beach Sunset & Water Sports", type: "🏖️ Family fun", xp: "+5 XP" }] },
  "jaipur":       { stops: [{ time: "9:00 AM", stop: "Amber Fort Elephant Walk", type: "🐘 Heritage", xp: "+10 XP" }, { time: "12:00 PM", stop: "Hawa Mahal Palace of Winds", type: "🏯 Architecture", xp: "+8 XP" }, { time: "2:30 PM", stop: "City Palace Museum", type: "👑 Royal culture", xp: "+5 XP" }] },
  "agra":         { stops: [{ time: "8:30 AM", stop: "Taj Mahal Sunrise Visit", type: "🕌 World wonder", xp: "+10 XP" }, { time: "12:00 PM", stop: "Agra Fort Exploration", type: "🏯 History", xp: "+8 XP" }, { time: "3:00 PM", stop: "Mehtab Bagh Taj Views", type: "🌸 Gardens & views", xp: "+5 XP" }] },
  "kochi":        { stops: [{ time: "9:30 AM", stop: "Fort Kochi Chinese Fishing Nets", type: "🎣 Heritage", xp: "+8 XP" }, { time: "11:30 AM", stop: "Mattancherry Palace Museum", type: "🏛️ Culture", xp: "+10 XP" }, { time: "3:00 PM", stop: "Kerala Kathakali Show", type: "💃 Performing arts", xp: "+5 XP" }] },
  "udaipur":      { stops: [{ time: "9:30 AM", stop: "City Palace & Lake Pichola", type: "🏯 Royal heritage", xp: "+10 XP" }, { time: "12:00 PM", stop: "Jagdish Temple Visit", type: "🛕 Spiritual", xp: "+5 XP" }, { time: "3:00 PM", stop: "Sunset Boat Ride on Lake Pichola", type: "⛵ Scenic", xp: "+8 XP" }] },
  "varanasi":     { stops: [{ time: "6:00 AM", stop: "Ganges Sunrise Boat Ride", type: "🌅 Spiritual", xp: "+10 XP" }, { time: "10:00 AM", stop: "Kashi Vishwanath Temple", type: "🛕 Sacred site", xp: "+8 XP" }, { time: "7:00 PM", stop: "Ganga Aarti Ceremony", type: "🪔 Cultural", xp: "+5 XP" }] },
  "coorg":        { stops: [{ time: "9:00 AM", stop: "Coffee Plantation Tour", type: "☕ Nature", xp: "+10 XP" }, { time: "12:00 PM", stop: "Abbey Falls Waterfall Hike", type: "🌊 Adventure", xp: "+8 XP" }, { time: "3:00 PM", stop: "Dubare Elephant Camp", type: "🐘 Wildlife", xp: "+5 XP" }] },
  "munnar":       { stops: [{ time: "9:00 AM", stop: "Tea Museum & Plantation Walk", type: "🍵 Nature", xp: "+10 XP" }, { time: "12:00 PM", stop: "Eravikulam National Park", type: "🦌 Wildlife", xp: "+8 XP" }, { time: "3:00 PM", stop: "Mattupetty Dam Viewpoint", type: "🌊 Scenic", xp: "+5 XP" }] },
  "alleppey":     { stops: [{ time: "9:30 AM", stop: "Houseboat Backwater Cruise", type: "⛵ Iconic", xp: "+10 XP" }, { time: "12:00 PM", stop: "Alleppey Beach & Lighthouse", type: "🏖️ Outdoors", xp: "+8 XP" }, { time: "3:00 PM", stop: "Punnamada Lake Canoe Ride", type: "🚣 Adventure", xp: "+5 XP" }] },
  "darjeeling":   { stops: [{ time: "7:00 AM", stop: "Tiger Hill Sunrise View", type: "🌄 Scenic", xp: "+10 XP" }, { time: "10:00 AM", stop: "Toy Train Joyride", type: "🚂 Heritage", xp: "+8 XP" }, { time: "2:00 PM", stop: "Happy Valley Tea Estate", type: "🍵 Nature", xp: "+5 XP" }] },
  "shimla":       { stops: [{ time: "9:30 AM", stop: "The Mall Road Heritage Walk", type: "🏔️ Colonial charm", xp: "+8 XP" }, { time: "12:00 PM", stop: "Jakhu Temple & Monkey Walk", type: "🐒 Culture", xp: "+10 XP" }, { time: "3:00 PM", stop: "Toy Train to Kalka", type: "🚂 Adventure", xp: "+5 XP" }] },
  "manali":       { stops: [{ time: "9:00 AM", stop: "Solang Valley Snow Play", type: "❄️ Adventure", xp: "+10 XP" }, { time: "12:00 PM", stop: "Hadimba Temple Forest Walk", type: "🌲 Nature & culture", xp: "+8 XP" }, { time: "3:00 PM", stop: "Old Manali Village Explore", type: "🏡 Culture", xp: "+5 XP" }] },
  "rishikesh":    { stops: [{ time: "8:00 AM", stop: "Laxman Jhula Morning Walk", type: "🌉 Spiritual", xp: "+8 XP" }, { time: "11:00 AM", stop: "Ganga Rafting Adventure", type: "🚣 Thrills", xp: "+10 XP" }, { time: "3:00 PM", stop: "Beatles Ashram Explore", type: "🎵 History", xp: "+5 XP" }] },
  "amritsar":     { stops: [{ time: "7:30 AM", stop: "Golden Temple Morning Visit", type: "🛕 Sacred & peaceful", xp: "+10 XP" }, { time: "11:00 AM", stop: "Jallianwala Bagh Gardens", type: "🌸 History", xp: "+8 XP" }, { time: "5:00 PM", stop: "Wagah Border Ceremony", type: "🎖️ Culture", xp: "+5 XP" }] },
  "hyderabad":    { stops: [{ time: "9:30 AM", stop: "Charminar & Old City Walk", type: "🏯 Heritage", xp: "+10 XP" }, { time: "12:00 PM", stop: "Golconda Fort Exploration", type: "🏰 History", xp: "+8 XP" }, { time: "3:00 PM", stop: "Hussain Sagar Lake Stroll", type: "🌊 Outdoors", xp: "+5 XP" }] },
  "chennai":      { stops: [{ time: "9:00 AM", stop: "Kapaleeshwarar Temple Visit", type: "🛕 Culture", xp: "+8 XP" }, { time: "12:00 PM", stop: "Marina Beach Morning Walk", type: "🌊 Outdoors", xp: "+10 XP" }, { time: "3:00 PM", stop: "Government Museum Exhibits", type: "🏛️ History", xp: "+5 XP" }] },
  "kolkata":      { stops: [{ time: "9:30 AM", stop: "Victoria Memorial Gardens", type: "🏛️ Heritage", xp: "+10 XP" }, { time: "12:00 PM", stop: "Howrah Bridge Walk", type: "🌉 Iconic", xp: "+8 XP" }, { time: "3:00 PM", stop: "Indian Museum Wonders", type: "🏺 Culture", xp: "+5 XP" }] },
  "leh ladakh":   { stops: [{ time: "9:00 AM", stop: "Leh Palace & Old Town", type: "🏯 Heritage", xp: "+10 XP" }, { time: "12:00 PM", stop: "Shanti Stupa Panorama", type: "🌄 Views", xp: "+8 XP" }, { time: "3:00 PM", stop: "Pangong Lake Day Trip", type: "🏔️ Nature", xp: "+5 XP" }] },
  "jodhpur":      { stops: [{ time: "9:30 AM", stop: "Mehrangarh Fort Exploration", type: "🏰 Heritage", xp: "+10 XP" }, { time: "12:00 PM", stop: "Blue City Rooftop Walk", type: "🏡 Culture", xp: "+8 XP" }, { time: "3:00 PM", stop: "Jaswant Thada Memorial", type: "🌸 Architecture", xp: "+5 XP" }] },
  "jaisalmer":    { stops: [{ time: "9:00 AM", stop: "Golden Fort Jaisalmer Walk", type: "🏯 Living fort", xp: "+10 XP" }, { time: "12:00 PM", stop: "Patwon Ki Haveli Tour", type: "🏛️ Architecture", xp: "+8 XP" }, { time: "4:00 PM", stop: "Desert Safari & Camel Ride", type: "🐪 Adventure", xp: "+5 XP" }] },
  "pondicherry":  { stops: [{ time: "9:00 AM", stop: "French Quarter Heritage Walk", type: "🏛️ Colonial", xp: "+8 XP" }, { time: "12:00 PM", stop: "Auroville Matrimandir Visit", type: "🌍 Spiritual", xp: "+10 XP" }, { time: "3:00 PM", stop: "Paradise Beach Relax", type: "🏖️ Outdoors", xp: "+5 XP" }] },
  "madurai":      { stops: [{ time: "8:00 AM", stop: "Meenakshi Temple Morning Puja", type: "🛕 Sacred", xp: "+10 XP" }, { time: "11:00 AM", stop: "Gandhi Museum Visit", type: "🏛️ History", xp: "+8 XP" }, { time: "3:00 PM", stop: "Thirumalai Nayak Palace", type: "🏯 Architecture", xp: "+5 XP" }] },
  "pune":         { stops: [{ time: "9:30 AM", stop: "Shaniwar Wada Fort Walk", type: "🏯 History", xp: "+10 XP" }, { time: "12:00 PM", stop: "Aga Khan Palace Visit", type: "🏛️ Heritage", xp: "+8 XP" }, { time: "3:00 PM", stop: "Sinhagad Fort Hike", type: "⛰️ Adventure", xp: "+5 XP" }] },
  "ahmedabad":    { stops: [{ time: "9:30 AM", stop: "Sabarmati Ashram Visit", type: "🏛️ History", xp: "+10 XP" }, { time: "12:00 PM", stop: "Sidi Saiyyed Mosque", type: "🕌 Architecture", xp: "+8 XP" }, { time: "3:00 PM", stop: "Kankaria Lake Family Fun", type: "🌊 Outdoors", xp: "+5 XP" }] },
  "andaman islands": { stops: [{ time: "9:00 AM", stop: "Cellular Jail Light & Sound Show", type: "🏛️ History", xp: "+10 XP" }, { time: "12:00 PM", stop: "Radhanagar Beach Swim", type: "🏖️ Outdoors", xp: "+8 XP" }, { time: "3:00 PM", stop: "Elephant Beach Snorkelling", type: "🐠 Wildlife", xp: "+5 XP" }] },
  "lonavala":     { stops: [{ time: "9:00 AM", stop: "Rajmachi Fort Hike", type: "⛰️ Adventure", xp: "+10 XP" }, { time: "12:00 PM", stop: "Bhushi Dam & Waterfall Play", type: "🌊 Family fun", xp: "+8 XP" }, { time: "3:00 PM", stop: "Tiger's Leap Viewpoint", type: "🌄 Scenic", xp: "+5 XP" }] },
  "mahabaleshwar": { stops: [{ time: "9:00 AM", stop: "Venna Lake Boat Ride", type: "⛵ Family fun", xp: "+8 XP" }, { time: "11:30 AM", stop: "Mapro Garden Strawberry Trail", type: "🍓 Nature & taste", xp: "+10 XP" }, { time: "3:00 PM", stop: "Arthur's Seat Viewpoint", type: "🌄 Scenic views", xp: "+5 XP" }] },
  "mahableshwar": { stops: [{ time: "9:00 AM", stop: "Venna Lake Boat Ride", type: "⛵ Family fun", xp: "+8 XP" }, { time: "11:30 AM", stop: "Mapro Garden Strawberry Trail", type: "🍓 Nature & taste", xp: "+10 XP" }, { time: "3:00 PM", stop: "Arthur's Seat Viewpoint", type: "🌄 Scenic views", xp: "+5 XP" }] },
  "matheran":     { stops: [{ time: "9:00 AM", stop: "Matheran Toy Train Arrival", type: "🚂 Heritage train", xp: "+10 XP" }, { time: "11:30 AM", stop: "Echo Point Adventure", type: "🔊 Family fun", xp: "+8 XP" }, { time: "3:00 PM", stop: "One Tree Hill Viewpoint", type: "🌄 Scenic views", xp: "+5 XP" }] },
  "coorg, india": { stops: [{ time: "9:00 AM", stop: "Coffee Plantation Tour", type: "☕ Nature", xp: "+10 XP" }, { time: "12:00 PM", stop: "Abbey Falls Waterfall Hike", type: "🌊 Adventure", xp: "+8 XP" }, { time: "3:00 PM", stop: "Dubare Elephant Camp", type: "🐘 Wildlife", xp: "+5 XP" }] },
};

function getCityTasteOfDay(cityName: string): Array<{ time: string; stop: string; type: string; xp: string }> {
  const key = cityName.toLowerCase().trim();
  if (CITY_TASTE_OF_DAY[key]) return CITY_TASTE_OF_DAY[key].stops;
  for (const [city, data] of Object.entries(CITY_TASTE_OF_DAY)) {
    if (key.includes(city) || city.includes(key)) return data.stops;
  }
  // Fuzzy: first-4-char prefix match (handles typos like "Chicgao" → "chicago")
  const keyPfx = key.replace(/\s+/g, "").slice(0, 4);
  for (const [city, data] of Object.entries(CITY_TASTE_OF_DAY)) {
    if (keyPfx && city.replace(/\s+/g, "").slice(0, 4) === keyPfx) return data.stops;
  }
  return [
    { time: "9:30 AM", stop: `${cityName} Discovery Walk`, type: "🗺️ Explore the city", xp: "+5 XP" },
    { time: "11:30 AM", stop: "Local Market & Food Tour", type: "🍽️ Food & culture", xp: "+8 XP" },
    { time: "2:00 PM", stop: "Family Activity Hub", type: "🎯 Interactive fun", xp: "+10 XP" },
  ];
}

type FamilySpot = { emoji: string; name: string; reason: string };
type CityFamilyData = { all: FamilySpot[]; forYoung: FamilySpot[]; forOlder: FamilySpot[] };

const CITY_FAMILY_SPOTS: Record<string, CityFamilyData> = {
  barcelona:  { all: [{ emoji: "⛪", name: "Sagrada Família", reason: "Gaudí's magical towers — kids say 'it looks like a sandcastle!'" }, { emoji: "🎨", name: "Park Güell", reason: "Giant mosaics, climbing rocks and city panoramas" }, { emoji: "🦁", name: "Barcelona Zoo", reason: "800+ animals right inside the city — easy half-day" }, { emoji: "🛒", name: "La Boqueria", reason: "Colourful market, fresh juice stands and kid-loved snacks" }], forYoung: [{ emoji: "🛝", name: "Parc de la Ciutadella", reason: "Rowing boats, playgrounds and wide open space for little legs" }, { emoji: "🐟", name: "Aquarium Barcelona", reason: "Walk-through shark tunnel that toddlers talk about for weeks" }], forOlder: [{ emoji: "🚡", name: "Montjuïc Cable Car", reason: "Aerial views across the whole city — older kids love the height" }, { emoji: "🏟️", name: "Camp Nou Stadium Tour", reason: "Behind-the-scenes at Europe's biggest football stadium" }] },
  paris:      { all: [{ emoji: "🗼", name: "Eiffel Tower", reason: "Climb the iron lady — views that genuinely blow their minds" }, { emoji: "🌳", name: "Luxembourg Gardens", reason: "Toy sailboats, puppet shows and room to run between museums" }, { emoji: "🎨", name: "Louvre Junior Trail", reason: "Kid-friendly treasure-hunt route through the world's biggest museum" }, { emoji: "⛵", name: "Seine River Cruise", reason: "Float past Notre-Dame and 10 bridges — 1 hr, zero walking" }], forYoung: [{ emoji: "🎠", name: "Tuileries Carousel", reason: "Classic Paris carousel toddlers absolutely love" }, { emoji: "🐘", name: "Jardin des Plantes Zoo", reason: "France's oldest zoo — gentle pace, no crowds" }], forOlder: [{ emoji: "🏛️", name: "Musée d'Orsay", reason: "Impressionist art in a converted train station — endlessly cool" }, { emoji: "🚡", name: "Montmartre Funicular", reason: "Ride up to Sacré-Cœur and explore the artist village on top" }] },
  london:     { all: [{ emoji: "🦕", name: "Natural History Museum", reason: "Free entry + a life-size blue whale that stops everyone in their tracks" }, { emoji: "🏰", name: "Tower of London", reason: "Crown Jewels, Beefeater tours and 1,000 years of stories" }, { emoji: "🌿", name: "Hyde Park", reason: "Princess Diana playground + pedalo boats on the Serpentine" }, { emoji: "🎭", name: "Science Museum", reason: "Four floors of hands-on experiments kids can actually touch" }], forYoung: [{ emoji: "🚌", name: "Red Bus Open Top Tour", reason: "See all the sights without any walking — perfect for little ones" }, { emoji: "🦁", name: "ZSL London Zoo", reason: "Gorilla Kingdom and penguin feeding — right in Regent's Park" }], forOlder: [{ emoji: "⚡", name: "Warner Bros. Studio Tour", reason: "Walk through actual Harry Potter sets and props" }, { emoji: "🌉", name: "Tower Bridge Walkway", reason: "Glass floor 42m above the Thames — brave enough?" }] },
  rome:       { all: [{ emoji: "🏛️", name: "Colosseum", reason: "Ancient gladiator arena that makes history actually click for kids" }, { emoji: "💧", name: "Trevi Fountain", reason: "Throw a coin and make a wish — a family tradition in Rome" }, { emoji: "🍕", name: "Testaccio Market", reason: "Pizza al taglio, gelato and the real local food scene" }, { emoji: "🏰", name: "Castel Sant'Angelo", reason: "Medieval fortress with a rooftop view of the whole city" }], forYoung: [{ emoji: "🌿", name: "Villa Borghese Gardens", reason: "Bike hire, a small lake and puppet theatres — perfect for toddlers" }, { emoji: "🎠", name: "Pincio Terrace", reason: "Panoramic garden where little ones can ride pedal cars" }], forOlder: [{ emoji: "🕌", name: "Vatican Museums", reason: "Sistine Chapel ceiling — one of the most mind-bending things they'll ever see" }, { emoji: "🏺", name: "Forum Romanum", reason: "Walk where Julius Caesar walked — history comes alive at ground level" }] },
  tokyo:      { all: [{ emoji: "⛩️", name: "Senso-ji Temple", reason: "Ancient temple with street food stalls and a giant lantern gate" }, { emoji: "🎆", name: "teamLab Planets", reason: "Immersive digital art you walk through barefoot — pure magic" }, { emoji: "🐼", name: "Ueno Zoo", reason: "Home to giant pandas — Japan's most visited zoo" }, { emoji: "🎡", name: "DisneySea / Disneyland", reason: "Two unique parks — the most beloved family day in all of Asia" }], forYoung: [{ emoji: "🚂", name: "Plarail Museum", reason: "Entire museum dedicated to toy trains — toddlers are in heaven" }, { emoji: "🧸", name: "Kiddyland Harajuku", reason: "Five floors of toys, characters and Sanrio — sensory overload (fun)" }], forOlder: [{ emoji: "🏙️", name: "Shibuya Sky Observation", reason: "360° views of Tokyo at night from the top of Shibuya Scramble Square" }, { emoji: "🎮", name: "Akihabara Electric Town", reason: "Gaming arcades, anime shops and retro tech — a teenage dream" }] },
  "new york": { all: [{ emoji: "🚲", name: "Central Park", reason: "Bike hire, rowboats, playgrounds and the zoo in one massive park" }, { emoji: "🦕", name: "American Museum of Natural History", reason: "Dinosaur halls that genuinely make kids want to become scientists" }, { emoji: "🗽", name: "Staten Island Ferry", reason: "Free ride with perfect Statue of Liberty views — no ticket needed" }, { emoji: "🌉", name: "Brooklyn Bridge Walk", reason: "Walk the iconic bridge — views of Manhattan on both sides" }], forYoung: [{ emoji: "🎪", name: "Children's Museum of Manhattan", reason: "Five floors built entirely for kids under 10 — art, science and play" }, { emoji: "🦁", name: "Bronx Zoo", reason: "One of the world's biggest zoos — gorillas, tigers and giraffes" }], forOlder: [{ emoji: "🏙️", name: "One World Observatory", reason: "Stand on top of the tallest building in the Western Hemisphere" }, { emoji: "🎭", name: "Broadway Show", reason: "A real Broadway show — an experience most kids never forget" }] },
  sydney:     { all: [{ emoji: "🎭", name: "Sydney Opera House", reason: "World-famous sails up close — backstage tour available for kids" }, { emoji: "🐨", name: "Taronga Zoo", reason: "Koalas + harbour views from Australia's most iconic wildlife park" }, { emoji: "🏖️", name: "Bondi Beach", reason: "Swim, surf school, coastal walk and Australia's beach culture" }, { emoji: "🐠", name: "SEA LIFE Sydney Aquarium", reason: "Underwater tunnel through a Great Barrier Reef exhibit" }], forYoung: [{ emoji: "🌉", name: "Darling Harbour", reason: "Splash pads, playgrounds and family restaurants all in one spot" }, { emoji: "🚢", name: "Harbour Ferry Ride", reason: "Cross the harbour — toddlers love the wind and the views" }], forOlder: [{ emoji: "🧗", name: "BridgeClimb Sydney", reason: "Climb the Harbour Bridge — one of the world's great adventures" }, { emoji: "🐊", name: "Australian Reptile Park", reason: "Hand-feed wombats, hold a snake — unlike anywhere else" }] },
  singapore:  { all: [{ emoji: "🌿", name: "Gardens by the Bay", reason: "The Supertrees light up at night — pure futuristic wonder" }, { emoji: "🎡", name: "Universal Studios", reason: "A full theme park on Sentosa Island — multiple rollercoasters" }, { emoji: "🐯", name: "Singapore Zoo", reason: "Open-concept zoo with breakfast with orangutans" }, { emoji: "🏙️", name: "Marina Bay Sands Sky Park", reason: "Infinity pool and city skyline from the 57th floor" }], forYoung: [{ emoji: "🎈", name: "KidZania Singapore", reason: "Role-play city where kids 'work' as doctors, pilots and chefs" }, { emoji: "🌊", name: "Wild Wild Wet Water Park", reason: "Best water slides in Singapore — toddlers have their own zone" }], forOlder: [{ emoji: "⚡", name: "Skyline Luge Sentosa", reason: "Go-kart-style luge ride down a hillside track — adrenaline fun" }, { emoji: "🦈", name: "S.E.A. Aquarium", reason: "One of the world's largest — 800 species behind a single acrylic panel" }] },
  dubai:      { all: [{ emoji: "🏙️", name: "Burj Khalifa Observation", reason: "Top of the world's tallest building — views stretch for 100km" }, { emoji: "🐟", name: "Dubai Aquarium & Underwater Zoo", reason: "Walk through the largest suspended aquarium in the world" }, { emoji: "🎢", name: "IMG Worlds of Adventure", reason: "World's largest indoor theme park — Marvel, Disney and more" }, { emoji: "🌊", name: "Atlantis Aquaventure", reason: "The signature Dubai water park with the famous Leap of Faith slide" }], forYoung: [{ emoji: "🎪", name: "KidZania Dubai", reason: "Mini city where kids earn salary and spend it — educational play" }, { emoji: "🐬", name: "Dubai Dolphinarium", reason: "Dolphin and seal shows in a covered venue — perfect for hot days" }], forOlder: [{ emoji: "🏜️", name: "Desert Safari", reason: "Dune bashing, camel riding and a Bedouin dinner under the stars" }, { emoji: "🚁", name: "Helicopter Tour", reason: "See Palm Jumeirah from the air — an unforgettable 15 minutes" }] },
  amsterdam:  { all: [{ emoji: "⛵", name: "Canal Cruise", reason: "See the whole city from the water — no walking, all wonder" }, { emoji: "🎨", name: "Rijksmuseum", reason: "Rembrandt and Vermeer in a stunning building kids can explore freely" }, { emoji: "🐧", name: "ARTIS Royal Zoo", reason: "Amsterdam's city zoo inside a 19th-century park — penguins + planetarium" }, { emoji: "🚲", name: "Vondelpark", reason: "Rent bikes and cycle like locals through Amsterdam's favourite park" }], forYoung: [{ emoji: "🧸", name: "Nemo Science Museum", reason: "Five floors of hands-on science experiments — built for curious kids" }, { emoji: "🌷", name: "Keukenhof Gardens", reason: "Seven million tulips in bloom — a colour explosion toddlers love" }], forOlder: [{ emoji: "🏠", name: "Anne Frank House", reason: "A moving, powerful experience every child should have" }, { emoji: "🍟", name: "Albert Cuyp Market", reason: "Best stroopwafels, fresh herring and the real Amsterdam food scene" }] },
  chicago:    { all: [{ emoji: "🫘", name: "Millennium Park & The Bean", reason: "Iconic silver sculpture kids can run under and see themselves reflected" }, { emoji: "🐠", name: "Shedd Aquarium", reason: "Beluga whales, dolphin shows and a 4D theatre — a full day in one building" }, { emoji: "🦕", name: "Field Museum", reason: "Sue the T-Rex — one of the most complete dinosaur skeletons in the world" }, { emoji: "🎡", name: "Navy Pier", reason: "Ferris wheel over Lake Michigan, kids' rides and summer fireworks" }], forYoung: [{ emoji: "🦁", name: "Lincoln Park Zoo", reason: "Free admission, farm-in-the-zoo, and animals right in the middle of the city" }, { emoji: "🌊", name: "Chicago Riverwalk", reason: "Flat, stroller-friendly path along the river with water taxis and splash zones" }], forOlder: [{ emoji: "🏙️", name: "360 Chicago Observation Deck", reason: "TILT experience tilts you over Michigan Avenue — 94 floors up" }, { emoji: "🎨", name: "Art Institute of Chicago", reason: "Home to Grant Wood's American Gothic and Georges Seurat's famous dots painting" }] },
  orlando:    { all: [{ emoji: "🏰", name: "Magic Kingdom", reason: "Cinderella's Castle, Space Mountain and the most magical parade on earth" }, { emoji: "🦈", name: "SeaWorld Orlando", reason: "Orca shows, manta ray feeding and thrilling rollercoasters over the water" }, { emoji: "🚀", name: "Kennedy Space Center", reason: "Touch a real moon rock and see the Saturn V rocket that took humans to the moon" }, { emoji: "🧱", name: "LEGOLAND Florida", reason: "Rides, LEGO builds and a water park — designed for ages 2–12" }], forYoung: [{ emoji: "🐊", name: "Gatorland", reason: "Florida's original attraction — toddlers can 'train' baby gators" }, { emoji: "🦋", name: "Orlando Science Center", reason: "Hands-on science with a giant dinosaur hall and a real working planetarium" }], forOlder: [{ emoji: "⚡", name: "Universal's Islands of Adventure", reason: "The Wizarding World of Harry Potter plus some of the best rides in the US" }, { emoji: "🎢", name: "ICON Park & Starflyer", reason: "The Wheel observation deck + Starflyer — world's tallest swing ride at 450 ft" }] },
  "los angeles": { all: [{ emoji: "🎢", name: "Universal Studios Hollywood", reason: "The Making of Harry Potter tour, Jurassic World ride and Hollywood glam" }, { emoji: "🌊", name: "Santa Monica Pier", reason: "Pacific Park rides, an aquarium under the pier and the Pacific Ocean" }, { emoji: "🦕", name: "Natural History Museum LA", reason: "T-Rex skull, gem vault and a butterfly pavilion all under one roof" }, { emoji: "🎨", name: "Getty Center", reason: "Free entry, stunning architecture and gardens kids can roam freely" }], forYoung: [{ emoji: "🐳", name: "Aquarium of the Pacific", reason: "Touch pools, lorikeet feeding and the largest aquarium on the West Coast" }, { emoji: "🎠", name: "Griffith Park Merry-Go-Round", reason: "1926 carousel inside LA's biggest park — a city classic" }], forOlder: [{ emoji: "🏄", name: "Venice Beach Boardwalk", reason: "Street performers, skate park and the most colourful mile in California" }, { emoji: "🏙️", name: "Griffith Observatory", reason: "Free planetarium shows and the best view of the Hollywood sign" }] },
  "san francisco": { all: [{ emoji: "🌉", name: "Golden Gate Bridge Walk", reason: "Walk or bike the most iconic bridge in America — views in every direction" }, { emoji: "🦭", name: "Pier 39 & Sea Lions", reason: "Wild sea lions lounging on the docks + a great aquarium right on the waterfront" }, { emoji: "🚃", name: "Cable Car Ride", reason: "The world's last manually operated cable car system — a living piece of history" }, { emoji: "🐧", name: "California Academy of Sciences", reason: "Planetarium, rainforest dome, aquarium and a living roof all in one building" }], forYoung: [{ emoji: "🌸", name: "Golden Gate Park Carousel", reason: "1912 carousel inside the park — perfect after the Bison paddock" }, { emoji: "🧒", name: "Children's Creativity Museum", reason: "Animation studio, robotics lab and a 1906 Looff carousel for little ones" }], forOlder: [{ emoji: "⛓️", name: "Alcatraz Island", reason: "Tour the most infamous prison in the US — ferry ride included" }, { emoji: "🔭", name: "Exploratorium", reason: "650 hands-on exhibits at Pier 15 — science museum kids never want to leave" }] },
  miami:      { all: [{ emoji: "🐬", name: "Miami Seaquarium", reason: "Dolphin shows, manatee rescue centre and a killer whale experience" }, { emoji: "🎨", name: "Wynwood Walls", reason: "Open-air museum of giant murals — walkable, free and genuinely jaw-dropping" }, { emoji: "🐊", name: "Everglades Airboat Tour", reason: "Blast through the Everglades and spot wild alligators up close" }, { emoji: "🏖️", name: "South Beach", reason: "Turquoise water, Art Deco buildings and the warmest sea on the East Coast" }], forYoung: [{ emoji: "🦋", name: "Jungle Island", reason: "Lemurs, a splash park and an aviary — a gentle first wildlife park" }, { emoji: "🐠", name: "Miami Children's Museum", reason: "Ship bridge, music studio and a miniature supermarket for little ones" }], forOlder: [{ emoji: "🏀", name: "Kaseya Center Tour", reason: "Behind-the-scenes at the Miami Heat's arena — players' tunnel included" }, { emoji: "🚤", name: "Star Island Boat Tour", reason: "Cruise past celebrity mansions on Biscayne Bay — spot-the-house game guaranteed" }] },
};

function getCityFamilySpots(cityName: string): CityFamilyData {
  const key = cityName.toLowerCase().trim();
  if (CITY_FAMILY_SPOTS[key]) return CITY_FAMILY_SPOTS[key];
  for (const [city, data] of Object.entries(CITY_FAMILY_SPOTS)) {
    if (key.includes(city) || city.includes(key)) return data;
  }
  // Fuzzy: first-4-char prefix match (handles typos like "Chicgao" → "chicago")
  const keyPfx = key.replace(/\s+/g, "").slice(0, 4);
  for (const [city, data] of Object.entries(CITY_FAMILY_SPOTS)) {
    if (keyPfx && city.replace(/\s+/g, "").slice(0, 4) === keyPfx) return data;
  }
  const cityLabel = cityName.split(",")[0].trim();
  return {
    all: [
      { emoji: "🗺️", name: `${cityLabel} Discovery Walk`, reason: "Hit the iconic spots locals recommend to visiting families" },
      { emoji: "🦁", name: "Local Zoo or Wildlife Park", reason: "Always a hit — most cities have a great one nearby" },
      { emoji: "🎨", name: "Interactive Museum", reason: "Hands-on exhibits that make learning feel like play" },
      { emoji: "🌿", name: "City Park & Outdoor Space", reason: "Room to run between stops — kids need this daily" },
    ],
    forYoung: [
      { emoji: "🛝", name: "Playground & Splash Pad", reason: "Designed for under-6s — safe, contained and they love it" },
      { emoji: "🧒", name: "Children's Discovery Centre", reason: "Purpose-built for toddlers with creative stations and soft play" },
    ],
    forOlder: [
      { emoji: "🚀", name: "Science & Technology Museum", reason: "Real experiments, simulators and enough to spend half a day" },
      { emoji: "🏙️", name: "City Observation Deck", reason: "Older kids love seeing 'how big' the city actually is from above" },
    ],
  };
}

const FAMILY_SPOT_HEADLINES: Array<{ heading: string; sub: (city: string) => string; footer: string }> = [
  {
    heading: "Great for families like yours 👇",
    sub: (city) => `Places kids usually love in ${city}`,
    footer: "Trips like yours usually include 6–10 great stops",
  },
  {
    heading: "Where kids go wild (in the best way) 🎉",
    sub: (city) => `Top picks for children in ${city}`,
    footer: "We'll weave these into your daily plan automatically",
  },
  {
    heading: "Your family will love these 🌍",
    sub: (city) => `Tried-and-tested by families in ${city}`,
    footer: "Every stop is paced so kids don't burn out",
  },
  {
    heading: "Built for little explorers 🧭",
    sub: (city) => `Kid-approved spots across ${city}`,
    footer: "We balance active stops with rest time",
  },
  {
    heading: "The spots other families rave about ⭐",
    sub: (city) => `Family highlights in ${city}`,
    footer: "Your plan will include the best of these",
  },
  {
    heading: "What's waiting for your crew 🗺️",
    sub: (city) => `Family favourites in ${city}`,
    footer: "Balanced for energy levels throughout the day",
  },
  {
    heading: "Adventures your kids will talk about 🚀",
    sub: (city) => `Can't-miss experiences in ${city}`,
    footer: "We match stops to your family's pace",
  },
  {
    heading: "Places that turn into memories 📸",
    sub: (city) => `Memorable stops for families in ${city}`,
    footer: "Mixed in with downtime so everyone stays happy",
  },
];

function pickFamilySpotCopy(cityName: string) {
  let hash = 0;
  for (let i = 0; i < cityName.length; i++) {
    hash = (hash * 31 + cityName.charCodeAt(i)) >>> 0;
  }
  return FAMILY_SPOT_HEADLINES[hash % FAMILY_SPOT_HEADLINES.length];
}

export default function AdventureBuilder() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { explorers } = useExplorer();
  const { createTrip, fetchTrips, trips } = useTravel();
  const { isAdmin, tier, hasActiveSubscription, isFoundingFamily, isTrialActive } = useSubscription();
  const { recordAdventureCreated: recordFreeAdventureCreated } = useFreeLimits();


  const [step, setStep] = useState(1);
  const [tripMode, setTripMode] = useState<"single" | "multi">("single");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<SearchableDestination | null>(null);

  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [addStopQuery, setAddStopQuery] = useState("");
  const [showAddStop, setShowAddStop] = useState(false);

  const [selectedExplorers, setSelectedExplorers] = useState<TripTraveler[]>([]);
  const [showAddTraveler, setShowAddTraveler] = useState(false);
  const [newTravelerName, setNewTravelerName] = useState("");
  const [newTravelerAge, setNewTravelerAge] = useState<string>("");

  const [selectedStyles, setSelectedStyles] = useState<AdventureStyleId[]>(["explore_sights", "kids_activities"]);
  const [tripStyle, setTripStyle] = useState<"highlights" | "balanced_family" | "off_beaten" | "easy_low_key">("balanced_family");
  const [activityLevel, setActivityLevel] = useState<"chill" | "balanced" | "packed">("balanced");

  const [adventureName, setAdventureName] = useState("");
  const [travelTiming, setTravelTiming] = useState<"" | "this_weekend" | "next_few_weeks" | "dates">("dates");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quickDays, setQuickDays] = useState<number | null>(null); // fallback trip length when no exact dates
  // Per-city date ranges for multi-city trips (keyed by city name)
  const [cityDates, setCityDates] = useState<Record<string, { startDate: string; endDate: string }>>({});

  const [stayLocations, setStayLocations] = useState<Array<{ cityName?: string; name: string; address: string; checkIn: string; checkOut: string }>>([{ name: "", address: "", checkIn: "", checkOut: "" }]);
  const [showStaySection, setShowStaySection] = useState(false);
  const [stayAddressLoading, setStayAddressLoading] = useState<Record<number, boolean>>({});
  const [showFineTune, setShowFineTune] = useState(false);
  const [anchorSheetOpen, setAnchorSheetOpen] = useState(false);
  const [builderAnchors, setBuilderAnchors] = useState<AnchorInput[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);
  const [buildingStep, setBuildingStep] = useState(0);
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [creatingTooLong, setCreatingTooLong] = useState(false);
  const [showGuestSignup, setShowGuestSignup] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const [foodPlanEnabled, setFoodPlanEnabled] = useState(false);
  const [foodMeals, setFoodMeals] = useState({ breakfast: false, lunch: true, snacks: false, dinner: false });
  const [foodStyle, setFoodStyle] = useState<"quick" | "sitdown" | "">("");
  const [foodCuisines, setFoodCuisines] = useState<string[]>([]);

  const [gettingAround, setGettingAround] = useState<"walking" | "car" | "transit" | null>(null);
  const [kidsEnergy, setKidsEnergy] = useState<"charged" | "normal" | "low" | null>(null);
  const [indoorOutdoor, setIndoorOutdoor] = useState<"outdoor" | "mix" | "indoor" | null>(null);
  const [kidInterests, setKidInterests] = useState<string[]>([]);
  const [budgetLevel, setBudgetLevel] = useState<"free" | "mid" | "best" | null>(null);
  const [strollerFriendly, setStrollerFriendly] = useState(false);
  const [smartStopDetails, setSmartStopDetails] = useState(true);

  const [livePreviewSpots, setLivePreviewSpots] = useState<FamilySpot[]>([]);
  const [livePreviewLoading, setLivePreviewLoading] = useState(false);

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);
  const travelerFormRef = useRef<HTMLDivElement>(null);

  const [leafletReady, setLeafletReady] = useState(false);

  const canCreateTravelAdventure = true;

  const parentExplorers = explorers.filter(
    (e) => (e.profileType === "parent" || e.profileType === "adult") && !e.isArchived
  );
  const kidExplorers = explorers.filter(
    (e) => e.profileType !== "parent" && e.profileType !== "adult" && !e.isArchived
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const city = params.get('city');
    const country = params.get('country');
    if (city) {
      setSelectedDestination({ type: 'city', name: city, countryName: country || undefined });
      setSearchQuery(city);
    }
  }, []);

  useEffect(() => {
    if (parentExplorers.length > 0 && selectedExplorers.length === 0) {
      setSelectedExplorers(
        parentExplorers.map((p) => ({
          explorerId: p.id,
          name: p.name,
          avatarKey: p.avatarKey || undefined,
          isParent: true,
        }))
      );
    }
  }, [parentExplorers.map(p => p.id).join(",")]);

  useEffect(() => {
    if (selectedDestination) {
      const cityNames = routeStops.length > 0 ? routeStops.map((s) => s.name).join(" & ") : selectedDestination.name;
      setAdventureName(`${cityNames} Family Adventure`);
    }
  }, [selectedDestination, routeStops.length]);

  useEffect(() => {
    if (!selectedDestination) { setLivePreviewSpots([]); return; }
    const cityShort = selectedDestination.name.split(",")[0].trim();
    const childAges = selectedExplorers
      .filter(e => e.explorerId)
      .map(e => explorers.find(ex => ex.id === e.explorerId)?.age)
      .filter(Boolean)
      .map(a => parseInt(a as string))
      .filter(n => !isNaN(n));
    const ageParam = childAges.length > 0 ? `&childAges=${childAges.join(",")}` : "";
    setLivePreviewLoading(true);
    fetch(`/api/travel/builder-preview?city=${encodeURIComponent(cityShort)}${ageParam}`)
      .then(r => r.json())
      .then(data => {
        if (data.spots && data.spots.length >= 3) {
          setLivePreviewSpots(data.spots as FamilySpot[]);
        } else {
          setLivePreviewSpots([]);
        }
      })
      .catch(() => setLivePreviewSpots([]))
      .finally(() => setLivePreviewLoading(false));
  }, [selectedDestination?.name, selectedExplorers.map(e => e.explorerId).join(",")]);

  useEffect(() => {
    if (!isCreating) { setBuildingStep(0); setCreatingTooLong(false); return; }
    const delays = [5500, 11000, 17000, 23000, 30000, 39000];
    const timers = delays.map((d, i) => setTimeout(() => setBuildingStep(i + 1), d));
    const tooLongTimer = setTimeout(() => setCreatingTooLong(true), 20000);
    return () => { timers.forEach(clearTimeout); clearTimeout(tooLongTimer); };
  }, [isCreating]);

  useEffect(() => {
    const checkLeaflet = () => {
      if (typeof window !== 'undefined' && window.L) {
        setLeafletReady(true);
        injectBuilderMapStyles();
      } else {
        setTimeout(checkLeaflet, 100);
      }
    };
    checkLeaflet();
  }, []);

  useEffect(() => {
    if (showAddTraveler && travelerFormRef.current) {
      setTimeout(() => {
        travelerFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
    }
  }, [showAddTraveler]);

  const totalDistance = useMemo(() => {
    let dist = 0;
    for (let i = 1; i < routeStops.length; i++) {
      const c1 = getCoordsForName(routeStops[i-1].name);
      const c2 = getCoordsForName(routeStops[i].name);
      if (c1 && c2) {
        dist += haversineDistance(c1.lat, c1.lon, c2.lat, c2.lon);
      }
    }
    return Math.round(dist);
  }, [routeStops]);

  // Sync cityDates when routeStops changes
  useEffect(() => {
    setCityDates((prev) => {
      const updated: Record<string, { startDate: string; endDate: string }> = {};
      routeStops.forEach((stop, idx) => {
        if (prev[stop.name]) {
          updated[stop.name] = prev[stop.name];
        } else {
          // Autofill start date from previous city's end date
          const prevCity = routeStops[idx - 1];
          const prevEnd = prevCity ? (updated[prevCity.name]?.endDate || prev[prevCity.name]?.endDate || "") : "";
          updated[stop.name] = { startDate: prevEnd, endDate: "" };
        }
      });
      return updated;
    });
  }, [routeStops.map(s => s.name).join(",")]);

  // Update a single city's date field and autofill the next city's start date
  const updateCityDate = (cityName: string, field: "startDate" | "endDate", value: string) => {
    setCityDates((prev) => {
      const next = { ...prev, [cityName]: { ...(prev[cityName] || { startDate: "", endDate: "" }), [field]: value } };
      // When endDate of a city changes, always sync the next city's startDate
      if (field === "endDate") {
        const idx = routeStops.findIndex(s => s.name === cityName);
        const nextStop = routeStops[idx + 1];
        if (nextStop) {
          next[nextStop.name] = { ...(next[nextStop.name] || { startDate: "", endDate: "" }), startDate: value };
        }
      }
      return next;
    });
  };

  // For single-city or trip-level: derive effective startDate / endDate
  const effectiveStartDate = routeStops.length > 1
    ? (cityDates[routeStops[0]?.name]?.startDate || startDate)
    : startDate;
  const effectiveEndDate = routeStops.length > 1
    ? (cityDates[routeStops[routeStops.length - 1]?.name]?.endDate || endDate)
    : endDate;

  const totalBuilderDays = useMemo(() => {
    if (effectiveStartDate && effectiveEndDate) {
      return Math.max(1, Math.round((new Date(effectiveEndDate).getTime() - new Date(effectiveStartDate).getTime()) / 86400000) + 1);
    }
    return 3;
  }, [effectiveStartDate, effectiveEndDate]);

  const searchResults = searchQuery.trim().length >= 2
    ? SEARCH_INDEX.filter((item) => {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(q);
        const countryMatch = item.countryName?.toLowerCase().includes(q);
        const continentMatch = item.continent?.toLowerCase().includes(q);
        return nameMatch || countryMatch || continentMatch;
      }).slice(0, 8)
    : [];

  const addStopResults = addStopQuery.trim().length >= 2
    ? SEARCH_INDEX.filter((item) => {
        if (item.type !== "city") return false;
        const q = addStopQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.countryName?.toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  const handleSelectDestination = (dest: SearchableDestination) => {
    setSelectedDestination(dest);
    setSearchQuery("");

    if (dest.type === "city") {
      const existing = routeStops.find((s) => s.name === dest.name);
      if (!existing) {
        setRouteStops([
          {
            id: crypto.randomUUID(),
            name: dest.name,
            countryCode: dest.countryCode,
            countryName: dest.countryName,
            continentId: dest.continentId,
          },
        ]);
      }
    }
  };

  const handleAddRouteStop = (dest: SearchableDestination) => {
    const existing = routeStops.find(
      (s) => s.name.toLowerCase() === dest.name.toLowerCase()
    );
    if (existing) {
      toast.error("This city is already in your route");
      return;
    }

    setRouteStops((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: dest.name,
        countryCode: dest.countryCode,
        countryName: dest.countryName,
        continentId: dest.continentId,
      },
    ]);
    setAddStopQuery("");
    setShowAddStop(false);
  };

  const handleRemoveStop = (id: string) => {
    setRouteStops((prev) => prev.filter((s) => s.id !== id));
  };

  const handleMoveStop = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= routeStops.length) return;
    const newStops = [...routeStops];
    const [moved] = newStops.splice(fromIdx, 1);
    newStops.splice(toIdx, 0, moved);
    setRouteStops(newStops);
  };

  const toggleExplorer = (explorer: { id: string; name: string; avatarKey?: string | null; profileType?: string | null }) => {
    const exists = selectedExplorers.some((t) => t.explorerId === explorer.id);
    if (exists) {
      setSelectedExplorers((prev) => prev.filter((t) => t.explorerId !== explorer.id));
    } else {
      setSelectedExplorers((prev) => [
        ...prev,
        {
          explorerId: explorer.id,
          name: explorer.name,
          avatarKey: explorer.avatarKey || undefined,
          isParent: explorer.profileType === "parent" || explorer.profileType === "adult",
        },
      ]);
    }
  };

  const handleAddCustomTraveler = () => {
    if (newTravelerName.trim()) {
      setSelectedExplorers((prev) => [...prev, { name: newTravelerName.trim(), age: newTravelerAge || undefined }]);
      setNewTravelerName("");
      setNewTravelerAge("");
      setShowAddTraveler(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return selectedDestination !== null && routeStops.length > 0;
      case 2: return selectedExplorers.length > 0 || !user;
      case 3: return adventureName.trim().length > 0;
      default: return false;
    }
  };

  const getCountryForTrip = (): string => {
    if (selectedDestination?.type === "country") return selectedDestination.name;
    if (selectedDestination?.type === "city" && selectedDestination.countryName) return selectedDestination.countryName;
    if (routeStops.length > 0 && routeStops[0].countryName) return routeStops[0].countryName;
    if (selectedDestination?.type === "continent") return selectedDestination.name;
    return "";
  };

  const getContinentForTrip = (): string | undefined => {
    if (selectedDestination?.continent) return selectedDestination.continent;
    if (selectedDestination?.continentId) {
      return CONTINENTS.find((c) => c.id === selectedDestination.continentId)?.name;
    }
    return undefined;
  };

  const getCityForTrip = (): string | undefined => {
    if (routeStops.length >= 1) return routeStops[0].name;
    if (selectedDestination?.type === "city") return selectedDestination.name;
    return undefined;
  };

  const handleCreateAdventure = async () => {
    const country = getCountryForTrip();
    const continent = getContinentForTrip();
    const city = getCityForTrip();
    const destinationName = city && country ? `${city}, ${country}` : city || country;

    if (!destinationName) {
      toast.error("Please select a destination first");
      return;
    }

    // Validate that travel dates or a trip length have been selected
    const hasDatesSingle = startDate && endDate;
    const hasQuickDays = !!quickDays;
    const hasMultiDates = tripMode === "multi" && Object.values(cityDates).some(d => d.startDate && d.endDate);
    const hasAnyDates = tripMode === "single" ? (hasDatesSingle || hasQuickDays) : hasMultiDates;
    if (!hasAnyDates) {
      setShowDateWarning(true);
      return;
    }

    const duplicateActiveTrip = trips.find(trip => {
      if (trip.adventureContext !== 'travel') return false;
      if (trip.status === 'completed') return false;
      if ((trip as any).isArchived) return false;
      const tripCountry = trip.country?.toLowerCase().trim();
      const tripCity = trip.city ? trip.city.toLowerCase().trim() : null;
      const newCountry = country ? country.toLowerCase().trim() : '';
      const newCity = city ? city.toLowerCase().trim() : null;
      if (newCity && tripCity && newCity === tripCity) return true;
      if (newCountry && tripCountry === newCountry && !newCity && !tripCity) return true;
      return false;
    });

    if (duplicateActiveTrip) {
      toast.error(`You already have an active adventure for ${destinationName}. Complete or delete it first.`);
      return;
    }

    if (!user) {
      setIsCreating(true);
      try {
        const tripStyleMap = { highlights: "explore_sights", balanced_family: "kids_activities", off_beaten: "nature_outdoors", easy_low_key: "food_local" } as const;
        const adventureStyle = tripStyleMap[tripStyle] || "family_explorer";
        const isMultiCity = routeStops.length > 1;
        const parsedStart = effectiveStartDate ? new Date(effectiveStartDate) : null;
        const parsedEnd = effectiveEndDate ? new Date(effectiveEndDate) : null;
        const stopsPerDayByPace = activityLevel === "chill" ? 3 : activityLevel === "packed" ? 6 : 4;
        const numDays = (parsedStart && parsedEnd)
          ? Math.max(1, Math.round((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
          : quickDays;
        const stopCount = numDays ? Math.max(numDays * stopsPerDayByPace, 3) : stopsPerDayByPace * 3;
        const cityDatesPayload: Record<string, { startDate: string; endDate: string }> | null = isMultiCity
          ? Object.fromEntries(
              routeStops.map((rs) => {
                const cd = cityDates[rs.name];
                return cd ? [rs.name, { startDate: cd.startDate, endDate: cd.endDate }] : null;
              }).filter(Boolean) as [string, { startDate: string; endDate: string }][]
            )
          : null;

        const guestRes = await fetch('/api/travel/trips/guest-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: adventureName,
            destination: destinationName,
            country,
            city,
            travelers: selectedExplorers,
            adventureContext: 'travel',
            adventureStyle,
            pace: activityLevel,
            tripDays: numDays,
            stopCount: Math.min(stopCount, 12),
            cityDates: cityDatesPayload,
            autoGenerateStops: true,
          }),
        });
        if (guestRes.ok) {
          const guestTrip = await guestRes.json();
          const { id: tripId, guestToken } = guestTrip;
          try {
            localStorage.setItem(`guest-trip-${tripId}`, guestToken);
            localStorage.setItem('geoadventures-pending-trip', JSON.stringify({ type: 'travel', tripId, guestToken }));
          } catch {}
          setCreatedTripId(tripId);
        }
      } catch (guestErr) {
        console.warn('[Builder] Guest trip creation failed, continuing without trip:', guestErr);
      }
      await new Promise(r => setTimeout(r, 2200));
      setIsCreating(false);
      setStep(3);
      return;
    }

    setIsCreating(true);

    try {
      const isMultiCity = routeStops.length > 1;
      const numCities = routeStops.length;
      const parsedStart = effectiveStartDate ? new Date(effectiveStartDate) : null;
      const parsedEnd = effectiveEndDate ? new Date(effectiveEndDate) : null;

      // Stops/day based on pace: chill=3, balanced=4, packed=6
      const stopsPerDayByPace = activityLevel === "chill" ? 3 : activityLevel === "packed" ? 6 : 4;

      // Compute stops per city based on per-city date ranges if available
      const stopsPerCityArr: number[] = routeStops.map((stop) => {
        const cd = cityDates[stop.name];
        if (cd?.startDate && cd?.endDate) {
          const s = new Date(cd.startDate);
          const e = new Date(cd.endDate);
          const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          return Math.min(Math.max(days * stopsPerDayByPace, 3), 30);
        }
        return null as unknown as number;
      });
      const hasPerCityDates = stopsPerCityArr.every(v => v !== null);

      let firstCityStops: number;
      let stopsPerCity: number;
      if (hasPerCityDates) {
        firstCityStops = stopsPerCityArr[0];
        stopsPerCity = stopsPerCityArr[1] ?? stopsPerCityArr[0];
      } else {
        const numDays = (parsedStart && parsedEnd)
          ? Math.max(1, Math.round((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
          : quickDays;
        const totalStopsTarget = numDays ? Math.max(numDays * stopsPerDayByPace, 10) : Math.max(numCities * stopsPerDayByPace * 3, 10);
        const totalStops = Math.min(totalStopsTarget, 60);
        const basePerCity = Math.floor(totalStops / numCities);
        const remainder = totalStops - basePerCity * numCities;
        firstCityStops = isMultiCity ? basePerCity + remainder : totalStops;
        stopsPerCity = isMultiCity ? basePerCity : totalStops;
      }

      const tripStyleMap = { highlights: "explore_sights", balanced_family: "kids_activities", off_beaten: "nature_outdoors", easy_low_key: "food_local" } as const;
      const adventureStyle = tripStyleMap[tripStyle] || "explore_sights";
      const derivedMonth = parsedStart ? parsedStart.getMonth() + 1 : undefined;
      const derivedYear = parsedStart ? parsedStart.getFullYear() : undefined;

      // Only pass cityDates for multi-city trips where per-city dates were provided
      const cityDatesPayload: Record<string, { startDate: string; endDate: string }> | null =
        isMultiCity && hasPerCityDates
          ? Object.fromEntries(
              routeStops.map((stop) => {
                const cd = cityDates[stop.name];
                return [stop.name, { startDate: cd.startDate, endDate: cd.endDate }];
              })
            )
          : null;

      // Compute total trip length for correct day count in plan view
      const totalTripDays = (parsedStart && parsedEnd)
        ? Math.max(1, Math.round((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        : quickDays;

      const filteredStayLocations = stayLocations.filter((s) => s.name.trim());
      const createTripTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Trip creation timed out after 45s — please try again")), 45000)
      );
      const trip = await Promise.race([createTrip({
        name: adventureName,
        destination: destinationName,
        continent,
        country,
        city,
        travelMonth: derivedMonth,
        travelYear: derivedYear,
        startDate: parsedStart,
        endDate: parsedEnd,
        travelers: selectedExplorers,
        travelerNames: selectedExplorers.map((t) => t.name),
        autoGenerateStops: true,
        stopCount: firstCityStops,
        tripDays: totalTripDays,
        adventureStyle,
        pace: activityLevel,
        cityDates: cityDatesPayload,
        stayLocations: filteredStayLocations.length > 0 ? filteredStayLocations : null,
        meals: foodPlanEnabled ? {
          enabled: true,
          breakfast: foodMeals.breakfast,
          lunch: foodMeals.lunch,
          snacks: foodMeals.snacks,
          dinner: foodMeals.dinner,
          diningStyle: foodStyle,
          cuisines: foodCuisines,
        } : null,
        tailoring: {
          gettingAround,
          kidsEnergy,
          indoorOutdoor,
          kidInterests: kidInterests.length > 0 ? kidInterests : null,
          budgetLevel,
          strollerFriendly,
          smartStopDetails,
        },
      }), createTripTimeout]);

      if (trip) {
        if (isMultiCity) {
          // Server now handles all city stop generation server-side (via bg-multicity).
          // No client-side generate-city-stops calls needed — polling in ParentPlanView
          // (?generating=true) will pick up all stops as they finish.
        }
        recordFreeAdventureCreated();
        fetchTrips().catch(console.error);
        setCreatedTripId(trip.id);
        if (builderAnchors.length > 0) {
          await Promise.all(
            builderAnchors.map(a =>
              fetch(`/api/travel/trips/${trip.id}/anchors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(a),
              }).catch(err => console.error('[Builder] Anchor POST failed:', err))
            )
          ).catch(console.error);
        }
        setStep(3);
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string; detail?: string };
      console.error('[AdventureBuilder] createTrip error:', error.code, error.message, error.detail);
      if (error.code === 'SESSION_EXPIRED') {
        toast.error("Please sign in again to continue");
        setTimeout(() => navigate("/?login=true"), 1200);
      } else if (error.code === 'DUPLICATE_CITY') {
        toast.error(`You already have an active adventure for this destination. Archive or complete it first.`);
      } else {
        toast.error(error.message || "Failed to create adventure. Please try again.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSeePlan = async () => {
    if (createdTripId) {
      navigate(`/adventure/${createdTripId}/parent-plan?generating=true`);
      return;
    }
    if (user) {
      toast.error("Something went wrong saving your plan. Please try again.");
      return;
    }
    setIsNavigating(true);
    try {
      const tripStyleMap = { highlights: "explore_sights", balanced_family: "kids_activities", off_beaten: "nature_outdoors", easy_low_key: "food_local" } as const;
      const adventureStyle = tripStyleMap[tripStyle as keyof typeof tripStyleMap] || "family_explorer";
      const isMultiCity = routeStops.length > 1;
      const parsedStart = effectiveStartDate ? new Date(effectiveStartDate) : null;
      const parsedEnd = effectiveEndDate ? new Date(effectiveEndDate) : null;
      const numDays = (parsedStart && parsedEnd)
        ? Math.max(1, Math.round((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        : quickDays;
      const stopsPerDayByPace = activityLevel === "chill" ? 3 : activityLevel === "packed" ? 6 : 4;
      const stopCount = numDays ? Math.max(numDays * stopsPerDayByPace, 3) : stopsPerDayByPace * 3;
      const cityDatesPayload: Record<string, { startDate: string; endDate: string }> | null = isMultiCity
        ? Object.fromEntries(
            routeStops.map((rs) => {
              const cd = cityDates[rs.name];
              return cd ? [rs.name, { startDate: cd.startDate, endDate: cd.endDate }] : null;
            }).filter(Boolean) as [string, { startDate: string; endDate: string }][]
          )
        : null;
      const guestRes = await fetch('/api/travel/trips/guest-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adventureName,
          destination: destinationName,
          country,
          city,
          travelers: selectedExplorers,
          adventureContext: 'travel',
          adventureStyle,
          pace: activityLevel,
          tripDays: numDays,
          stopCount: Math.min(stopCount, 12),
          cityDates: cityDatesPayload,
          autoGenerateStops: true,
        }),
      });
      if (guestRes.ok) {
        const guestTrip = await guestRes.json();
        const { id: tripId, guestToken } = guestTrip;
        try {
          localStorage.setItem(`guest-trip-${tripId}`, guestToken);
          localStorage.setItem('geoadventures-pending-trip', JSON.stringify({ type: 'travel', tripId, guestToken }));
        } catch {}
        setCreatedTripId(tripId);
        navigate(`/adventure/${tripId}/parent-plan?generating=true`);
      } else {
        toast.error("Couldn't save your plan. Please check your connection and try again.");
      }
    } catch (err) {
      toast.error("Couldn't save your plan. Please check your connection and try again.");
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-32">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step > 1 ? setStep(step - 1) : navigate("/geoadventures")}
            className="text-slate-600 dark:text-slate-300"
            data-testid="button-back-adventures"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>

        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Plane className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white" data-testid="text-builder-title">
              Build Your Adventure
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Turn your family trip into an interactive journey
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-7" data-testid="step-indicator">
          {STEP_LABELS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => { if (s.num < step) setStep(s.num); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  s.num === step
                    ? "bg-orange-500 text-white shadow-md"
                    : s.num < step
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 cursor-pointer hover:bg-orange-200"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                }`}
                disabled={s.num > step}
                data-testid={`step-${s.num}`}
              >
                {s.num < step ? <Check className="w-3 h-3" /> : null}
                {s.label}
              </button>
              {i < STEP_LABELS.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 mx-1" />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white mb-1">
                Where are you taking the kids? ✨
              </h2>
              <p className="text-sm text-slate-400 mb-3">We'll turn it into a plan in seconds</p>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { setTripMode("single"); if (routeStops.length > 1) setRouteStops(routeStops.slice(0, 1)); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    tripMode === "single"
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-orange-200"
                  }`}
                  data-testid="toggle-single-city"
                >
                  📍 One City
                </button>
                <button
                  onClick={() => setTripMode("multi")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    tripMode === "multi"
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-orange-200"
                  }`}
                  data-testid="toggle-multi-city"
                >
                  🗺️ Multi-City
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-1">
                {tripMode === "single" ? "Pick your destination city" : "Build a multi-city route"}
              </p>
              {!selectedDestination && tripMode === "single" && (
                <p className="text-[11px] text-slate-400 mb-2">Or pick one to get started quickly</p>
              )}

              {tripMode === "multi" && routeStops.length >= 1 && (
                <div className="mb-3 px-3 py-2.5 bg-gray-100 rounded-xl flex items-center gap-2 text-sm text-gray-400 border border-dashed border-gray-200">
                  <Search className="w-4 h-4 shrink-0" />
                  <span>Use <span className="font-semibold text-gray-500">+ Add Another City</span> to add more cities</span>
                </div>
              )}
              {!(tripMode === "multi" && routeStops.length >= 1) && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search city or country…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base rounded-xl"
                  autoFocus
                  data-testid="input-destination-search"
                />
              </div>
              )}

              {searchQuery.trim().length >= 2 && (
                <Card className="mb-3 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden max-h-56 overflow-y-auto">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 dark:hover:bg-slate-700 transition-colors text-left bg-orange-50/50 dark:bg-orange-900/10"
                    onClick={() => handleSelectDestination({ type: "city", name: searchQuery.trim() })}
                    data-testid="search-result-custom"
                  >
                    <span className="text-lg">🌍</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-orange-600 dark:text-orange-400 text-sm truncate">Go to "{searchQuery.trim()}"</p>
                      <p className="text-xs text-slate-500 truncate">Use as destination</p>
                    </div>
                    <Navigation className="w-4 h-4 text-orange-500" />
                  </button>
                  {searchResults.map((result, i) => (
                    <button
                      key={`${result.type}-${result.name}-${i}`}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 dark:hover:bg-slate-700 transition-colors text-left"
                      onClick={() => handleSelectDestination(result)}
                      data-testid={`search-result-${i}`}
                    >
                      <span className="text-lg">{result.flag || "📍"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-white text-sm truncate">{result.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {result.type === "city" ? result.countryName : result.type === "country" ? result.continent : "Continent"}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded-full">
                        {result.type}
                      </span>
                    </button>
                  ))}
                </Card>
              )}

              {!searchQuery && !selectedDestination && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Popular Destinations</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SEARCH_INDEX.filter((d) => d.type === "city")
                      .slice(0, 8)
                      .map((dest, i) => (
                        <button
                          key={`pop-${i}`}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-slate-700 transition-all text-left"
                          onClick={() => handleSelectDestination(dest)}
                          data-testid={`popular-dest-${i}`}
                        >
                          <span className="text-base">📍</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{dest.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{dest.countryName}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {selectedDestination && routeStops.length <= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl bg-white border-2 border-orange-300 dark:border-orange-700 dark:bg-slate-800 mb-3 overflow-hidden shadow-md"
                  data-testid="selected-destination"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-white text-xl leading-tight">{selectedDestination.name}</p>
                        {selectedDestination.countryName && (
                          <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{selectedDestination.countryName}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-300 hover:text-red-400 h-7 w-7 p-0 shrink-0 mt-0.5"
                        onClick={() => { setSelectedDestination(null); setRouteStops([]); setAdventureName(""); }}
                        data-testid="button-clear-destination"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Day plan preview */}
                    {(() => {
                      const cityShort = selectedDestination.name.split(",")[0];
                      const tasteStops = getCityTasteOfDay(cityShort);
                      const allStops = [
                        tasteStops[0],
                        { time: (() => { const t = tasteStops[0]?.time || "9:30 AM"; const [h, rest] = t.split(":"); const ampm = rest?.includes("AM") ? "AM" : "PM"; const hr = parseInt(h) + 2; return `${hr}:00 ${ampm}`; })(), stop: "Lunch nearby", type: "🍔 Food break", xp: "" },
                        ...tasteStops.slice(1),
                      ].filter(Boolean).slice(0, 4);
                      return (
                        <div className="mb-4">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2.5">
                            ✨ Here's a great day your kids will love in {cityShort}
                          </p>
                          <div className="space-y-1.5">
                            {allStops.map((stop, i) => (
                              <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600">
                                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 w-16 shrink-0">{stop.time}</span>
                                <span className="text-sm shrink-0">{stop.type.split(" ")[0]}</span>
                                <p className="text-[13px] font-semibold text-slate-800 dark:text-white leading-snug flex-1 min-w-0 truncate">{stop.stop}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                            <span className="text-[12px] text-slate-500 flex items-center gap-1"><span className="text-green-500">✔</span> Balanced pace</span>
                            <span className="text-[12px] text-slate-500 flex items-center gap-1"><span className="text-green-500">✔</span> Kid-friendly stops</span>
                            <span className="text-[12px] text-slate-500 flex items-center gap-1"><span className="text-green-500">✔</span> Built-in breaks</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Map below the plan preview */}
                    <BuilderMap
                      leafletReady={leafletReady}
                      routeStops={routeStops}
                      onAddStop={handleAddRouteStop}
                      onSelectDestination={handleSelectDestination}
                      step={step}
                      totalDistance={totalDistance}
                      selectedDestination={selectedDestination}
                      searchQuery={searchQuery}
                    />

                    {tripMode === "single" && (
                      <>
                        <button
                          onClick={() => setStep(2)}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-1 transition-all shadow-md"
                          data-testid="button-city-build-plan"
                        >
                          Customize this plan <ChevronRight className="w-4 h-4" />
                        </button>
                        <p className="text-[11px] text-slate-400 text-center mt-2">Takes less than a minute</p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {selectedDestination && routeStops.length > 1 && (
                <motion.div
                  key={`multi-${routeStops.length}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl bg-white border-2 border-blue-300 dark:border-blue-700 dark:bg-slate-800 mb-3 overflow-hidden shadow-md"
                  data-testid="selected-destination-multi"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-white text-xl leading-tight">
                          {routeStops.length}-City Adventure
                        </p>
                        <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                          <Navigation className="w-3 h-3" />
                          {routeStops.map(s => s.name).join(" → ")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-300 hover:text-red-400 h-7 w-7 p-0 shrink-0 mt-0.5"
                        onClick={() => { setSelectedDestination(null); setRouteStops([]); setAdventureName(""); }}
                        data-testid="button-clear-destination"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Trip flow preview */}
                    <div className="mb-4">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2.5">
                        👉 Here's how your trip could flow
                      </p>
                      <div className="space-y-1.5">
                        {routeStops.map((stop, idx) => {
                          const daysPerCity = Math.max(2, Math.round(6 / routeStops.length));
                          const dayStart = idx * daysPerCity + 1;
                          const dayEnd = dayStart + daysPerCity - 1;
                          return (
                            <div key={stop.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600">
                              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 w-16 shrink-0">Day {dayStart}–{dayEnd}</span>
                              <span className="text-sm shrink-0">📍</span>
                              <p className="text-[13px] font-semibold text-slate-800 dark:text-white leading-snug flex-1 min-w-0 truncate">{stop.name.split(",")[0]}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                        <span className="text-[12px] text-slate-500 flex items-center gap-1"><span className="text-green-500">✔</span> Smart pacing between cities</span>
                        <span className="text-[12px] text-slate-500 flex items-center gap-1"><span className="text-green-500">✔</span> Kid-friendly transitions</span>
                      </div>
                    </div>

                    {/* Map for multi-city */}
                    <BuilderMap
                      leafletReady={leafletReady}
                      routeStops={routeStops}
                      onAddStop={handleAddRouteStop}
                      onSelectDestination={handleSelectDestination}
                      step={step}
                      totalDistance={totalDistance}
                      selectedDestination={selectedDestination}
                      searchQuery={searchQuery}
                    />

                    <button
                      onClick={() => { if (canProceed()) setStep(2); }}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-1 transition-all shadow-md"
                      data-testid="button-multi-city-customize"
                    >
                      Customize this trip <ChevronRight className="w-4 h-4" />
                    </button>
                    <p className="text-[11px] text-slate-400 text-center mt-2">Takes less than a minute</p>
                  </div>
                </motion.div>
              )}

              {routeStops.length > 1 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  <span className="text-[11px] bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-3 py-1 font-semibold">⭐ Best for 5–7 days</span>
                  <span className="text-[11px] bg-green-50 text-green-600 border border-green-200 rounded-full px-3 py-1 font-semibold">🧭 Optimized for shortest travel</span>
                </div>
              )}

              {routeStops.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-orange-500" />
                    Your Route
                  </h3>
                  <div className="space-y-2" data-testid="route-list">
                    {routeStops.map((stop, idx) => (
                      <div
                        key={stop.id}
                        draggable
                        onDragStart={() => setDraggedIdx(idx)}
                        onDragOver={(e) => { e.preventDefault(); dragOverIdx.current = idx; }}
                        onDrop={() => {
                          if (draggedIdx !== null && draggedIdx !== idx) {
                            handleMoveStop(draggedIdx, idx);
                          }
                          setDraggedIdx(null);
                          dragOverIdx.current = null;
                        }}
                        onDragEnd={() => { setDraggedIdx(null); dragOverIdx.current = null; }}
                        className={`flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-3 border shadow-sm cursor-grab active:cursor-grabbing transition-all ${
                          draggedIdx === idx ? "opacity-50 border-orange-400 scale-95" : "border-slate-200 dark:border-slate-700"
                        }`}
                        data-testid={`route-stop-${idx}`}
                      >
                        <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                        <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-sm font-bold text-orange-600">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 dark:text-white text-sm truncate">{stop.name}</p>
                          {stop.countryName && <p className="text-xs text-slate-400 truncate">{stop.countryName}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-red-500 h-8 w-8 p-0"
                          onClick={() => handleRemoveStop(stop.id)}
                          data-testid={`remove-stop-${idx}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDestination && tripMode === "multi" && (
                showAddStop ? (
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search for a city to add..."
                        value={addStopQuery}
                        onChange={(e) => setAddStopQuery(e.target.value)}
                        className="pl-10 h-11 rounded-xl"
                        autoFocus
                        data-testid="input-add-stop"
                      />
                    </div>
                    {addStopQuery.trim().length >= 2 && (
                      <Card className="mt-1 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden max-h-44 overflow-y-auto">
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 dark:hover:bg-slate-700 transition-colors text-left bg-orange-50/50"
                          onClick={() => handleAddRouteStop({ type: "city", name: addStopQuery.trim() })}
                          data-testid="add-stop-result-custom"
                        >
                          <span className="text-sm">🌍</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-orange-600 dark:text-orange-400 text-sm truncate">Add "{addStopQuery.trim()}"</p>
                          </div>
                          <Navigation className="w-3.5 h-3.5 text-orange-500" />
                        </button>
                        {addStopResults.map((result, i) => (
                          <button
                            key={`add-${result.type}-${result.name}-${i}`}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 dark:hover:bg-slate-700 transition-colors text-left"
                            onClick={() => handleAddRouteStop(result)}
                            data-testid={`add-stop-result-${i}`}
                          >
                            <span className="text-sm">{result.flag || "📍"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 dark:text-white text-sm truncate">{result.name}</p>
                              <p className="text-xs text-slate-400 truncate">{result.countryName}</p>
                            </div>
                          </button>
                        ))}
                      </Card>
                    )}
                    <div className="flex justify-end mt-2">
                      <Button variant="ghost" size="sm" onClick={() => { setShowAddStop(false); setAddStopQuery(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowAddStop(true)}
                    className="w-full h-11 border-dashed border-2 border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-700 rounded-xl gap-2 mb-3"
                    data-testid="button-add-stop"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another City
                  </Button>
                )
              )}

            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white mb-1">
                We'll customize your plan
              </h2>
              <p className="text-sm text-slate-400 mb-4">Your answers shape the plan instantly</p>

              <BuilderMap
                leafletReady={leafletReady}
                routeStops={routeStops}
                step={step}
                totalDistance={totalDistance}
                selectedDestination={selectedDestination}
              />

              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-0.5">Who's coming along?</h3>
              <p className="text-xs text-slate-400 mb-2">We'll adjust activities for their age</p>
              <div className="grid grid-cols-3 gap-2 mb-4" data-testid="explorer-grid">
                {parentExplorers.map((parentExplorer) => (
                  <button
                    key={parentExplorer.id}
                    onClick={() => toggleExplorer(parentExplorer)}
                    className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                      selectedExplorers.some((t) => t.explorerId === parentExplorer.id)
                        ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20 shadow-md"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-200"
                    }`}
                    data-testid={`explorer-card-${parentExplorer.id}`}
                  >
                    {selectedExplorers.some((t) => t.explorerId === parentExplorer.id) && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <span className="text-2xl block mb-0.5">{getAvatarEmoji(parentExplorer.avatarKey)}</span>
                    <p className="font-medium text-slate-800 dark:text-white text-xs truncate">{parentExplorer.name}</p>
                    <span className="text-[9px] text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">Parent</span>
                  </button>
                ))}
                {kidExplorers.map((explorer) => (
                  <button
                    key={explorer.id}
                    onClick={() => toggleExplorer(explorer)}
                    className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                      selectedExplorers.some((t) => t.explorerId === explorer.id)
                        ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20 shadow-md"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-200"
                    }`}
                    data-testid={`explorer-card-${explorer.id}`}
                  >
                    {selectedExplorers.some((t) => t.explorerId === explorer.id) && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <span className="text-2xl block mb-0.5">{getAvatarEmoji(explorer.avatarKey)}</span>
                    <p className="font-medium text-slate-800 dark:text-white text-xs truncate">{explorer.name}</p>
                  </button>
                ))}
              </div>

              {selectedExplorers.filter((t) => !t.explorerId).length > 0 && (
                <div className="space-y-2 mb-3">
                  {selectedExplorers.filter((t) => !t.explorerId).map((traveler, idx) => (
                    <div key={`custom-${idx}`} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <span className="text-lg">👤</span>
                      <span className="flex-1 text-sm font-medium">{traveler.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                        onClick={() => setSelectedExplorers((prev) => prev.filter((p) => p.name !== traveler.name || p.explorerId))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {showAddTraveler ? (
                <div ref={travelerFormRef} className="rounded-2xl border-2 border-orange-200 bg-orange-50 dark:bg-slate-800 dark:border-orange-800 p-4 mb-3">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Add a traveler</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">How old are they?</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {["Under 3", "3–5", "6–8", "9–11", "12–14", "15+", "Adult"].map((ageLabel) => (
                      <button
                        key={ageLabel}
                        onClick={() => setNewTravelerAge(prev => prev === ageLabel ? "" : ageLabel)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                          newTravelerAge === ageLabel
                            ? "border-orange-400 bg-white text-orange-700 shadow-sm"
                            : "border-orange-200 bg-white/60 text-slate-600"
                        }`}
                        data-testid={`chip-age-${ageLabel}`}
                      >
                        {ageLabel}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Their name"
                    value={newTravelerName}
                    onChange={(e) => setNewTravelerName(e.target.value)}
                    className="rounded-xl mb-3 bg-white dark:bg-slate-700"
                    data-testid="input-new-traveler"
                    onKeyDown={(e) => { if (e.key === "Enter" && newTravelerName.trim()) handleAddCustomTraveler(); }}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddCustomTraveler}
                      disabled={!newTravelerName.trim()}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                      data-testid="button-add-traveler-confirm"
                    >
                      Add traveler
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowAddTraveler(false); setNewTravelerName(""); setNewTravelerAge(""); }}
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowAddTraveler(true)}
                  className="w-full h-11 border-dashed border-2 rounded-xl gap-2 mb-4"
                  data-testid="button-add-explorer"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Traveler
                </Button>
              )}

              {selectedExplorers.length === 0 && (
                <p className="text-xs text-red-500 mb-3" data-testid="text-explorer-warning">Please select at least one explorer</p>
              )}

              {(() => {
                const selectedKidIds = selectedExplorers.filter(e => e.explorerId).map(e => e.explorerId);
                const selectedKidExplorers = explorers.filter(e =>
                  selectedKidIds.includes(e.id) && e.profileType !== "parent" && e.profileType !== "adult"
                );
                if (selectedKidExplorers.length === 0) return null;
                const cityName = routeStops[0]?.name || selectedDestination?.name || "";
                const cityData = getCityFamilySpots(cityName);
                const kidAges = selectedKidExplorers.map(e => parseInt(e.age) || 8);
                const hasYoungKids = kidAges.some(a => a < 7);
                const kidsLabel = selectedKidExplorers.map(e => e.name.split(" ")[0]).join(" & ");
                const ageSwaps = hasYoungKids ? cityData.forYoung : cityData.forOlder;
                const swapPairs = ageSwaps.slice(0, 2).map((swap, i) => ({
                  from: cityData.all[i + 1] || cityData.all[0],
                  to: swap,
                })).filter(p => p.from && p.to && p.from.name !== p.to.name);

                return (
                  <motion.div
                    key={`tailored-${selectedKidExplorers.map(e => e.id).join("-")}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-4 py-3"
                    data-testid="step2-tailored-section"
                  >
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2">
                      🔄 Updated for your kids
                    </p>
                    <div className="space-y-1.5">
                      {swapPairs.length > 0 ? swapPairs.map((pair, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[12px] flex-wrap">
                          <span className="text-slate-400">{pair.from.emoji} <span className="line-through">{pair.from.name}</span></span>
                          <span className="text-slate-400 font-bold">→</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">{pair.to.emoji} {pair.to.name}</span>
                        </div>
                      )) : (
                        <p className="text-[12px] text-emerald-700 dark:text-emerald-300">All stops optimised for {kidsLabel}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })()}

              {selectedExplorers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="border-t border-slate-100 dark:border-slate-700 pt-4 mb-4"
              >
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-0.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  When are you traveling?
                </h3>
                <p className="text-xs text-slate-400 mb-3">Select dates for each city — we'll plan the right number of stops</p>
                {tripMode === "multi" ? (
                    /* Multi-city: per-city date rows */
                    <div className="space-y-3">
                      {routeStops.map((stop, idx) => {
                        const cd = cityDates[stop.name] || { startDate: "", endDate: "" };
                        const prevEndDate = idx > 0
                          ? (cityDates[routeStops[idx - 1].name]?.endDate || "")
                          : "";
                        // minDate = day AFTER previous city's end date, so cities never share a transition day
                        const minDateForCity = prevEndDate ? (() => {
                          const d = new Date(prevEndDate + "T00:00:00");
                          d.setDate(d.getDate() + 1);
                          return d.toISOString().split("T")[0];
                        })() : undefined;
                        const stopsPerDay = activityLevel === "chill" ? 3 : activityLevel === "packed" ? 6 : 4;
                        return (
                          <div key={stop.id} className="bg-orange-50/60 border border-orange-100 rounded-2xl p-3">
                            <div className="flex items-center gap-2 mb-2.5">
                              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                              <span className="text-sm font-bold text-slate-700 truncate">{stop.name}</span>
                            </div>
                            <DateRangePicker
                              startDate={cd.startDate}
                              endDate={cd.endDate}
                              minDate={minDateForCity}
                              defaultMonth={minDateForCity || cd.startDate || undefined}
                              onStartChange={(v) => updateCityDate(stop.name, "startDate", v)}
                              onEndChange={(v) => updateCityDate(stop.name, "endDate", v)}
                            />
                            {cd.startDate && cd.endDate && (() => {
                              const days = Math.max(1, Math.round((new Date(cd.endDate).getTime() - new Date(cd.startDate).getTime()) / 86400000) + 1);
                              return (
                                <p className="text-[10px] text-orange-600 font-semibold mt-1.5">
                                  {days} day{days !== 1 ? "s" : ""} · ~{Math.min(days * stopsPerDay, 30)} stops planned
                                </p>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Single city: range picker + quick-days fallback */
                    <div className="space-y-3">
                      <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onStartChange={(v) => { setStartDate(v); if (v) setQuickDays(null); }}
                        onEndChange={(v) => { setEndDate(v); if (v) setQuickDays(null); }}
                        startLabel="From"
                        endLabel="To"
                      />
                      {!startDate && !endDate && (
                        <div>
                          <p className="text-[11px] text-slate-400 mb-1.5">Or, how long is your trip?</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {[1, 2, 3, 4, 5, 6, 7, 10].map(d => (
                              <button
                                key={d}
                                onClick={() => setQuickDays(prev => prev === d ? null : d)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${quickDays === d ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}
                                data-testid={`quick-days-${d}`}
                              >
                                {d}d
                              </button>
                            ))}
                          </div>
                          {quickDays && (
                            <p className="text-[11px] text-orange-600 font-semibold mt-1.5">
                              ✓ Planning {quickDays} day{quickDays !== 1 ? "s" : ""} · ~{quickDays * (activityLevel === "chill" ? 3 : activityLevel === "packed" ? 6 : 4)} stops
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                }
              </motion.div>
              )}

              {/* ── Anchors block ─────────────────────────────────── */}
              <div className="border-t border-slate-100 dark:border-slate-700 pt-5 mb-4" data-testid="section-anchors">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Anything already planned?</h3>
                    <p className="text-xs text-slate-400 mt-0.5">We'll build your day around it</p>
                  </div>
                </div>

                {/* Anchor chips */}
                {builderAnchors.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {builderAnchors.map((a, i) => {
                      const isSoft = a.flexibility === "soft";
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isSoft ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}
                        >
                          <span className="text-sm shrink-0">
                            {a.anchorType === "ticket" ? "🎟" : a.anchorType === "food" ? "🍽" : a.anchorType === "event" ? "🎭" : a.anchorType === "hotel" ? "🏨" : "📌"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${isSoft ? "text-blue-800" : "text-orange-800"}`}>{a.name}</p>
                            <p className={`text-[10px] flex items-center gap-1 ${isSoft ? "text-blue-600" : "text-orange-600"}`}>
                              Day {a.day}{a.time ? ` · ${formatDisplayTime(a.time)}` : ""}
                              <span className={`text-[9px] font-bold uppercase tracking-wide ${isSoft ? "text-blue-400" : "text-orange-400"}`}>
                                {isSoft ? "· Flexible" : "· Fixed"}
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={() => setBuilderAnchors(prev => prev.filter((_, j) => j !== i))}
                            className={`w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${isSoft ? "bg-blue-200 hover:bg-blue-300" : "bg-orange-200 hover:bg-orange-300"}`}
                            data-testid={`remove-anchor-${i}`}
                          >
                            <X className={`w-3 h-3 ${isSoft ? "text-blue-700" : "text-orange-700"}`} />
                          </button>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-slate-500 font-medium px-1">
                      {builderAnchors.some(a => a.flexibility !== "soft") && "🔒 Fixed plans are locked in. "}
                      {builderAnchors.some(a => a.flexibility === "soft") && "🕐 Flexible plans will be aimed for."}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setAnchorSheetOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/60 text-sm font-bold text-orange-600 hover:bg-orange-50 transition-colors"
                  data-testid="button-add-anchor"
                >
                  <Plus className="w-4 h-4" />
                  Add something planned
                </button>
              </div>

              {selectedExplorers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {/* C: Trip Style */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mb-4">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-extrabold tracking-widest text-orange-500 uppercase">Trip Style</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">What kind of adventure fits your family?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "highlights" as const, emoji: "🏛", label: "Highlights & Must-Sees", hint: "The classics every family loves" },
                      { id: "balanced_family" as const, emoji: "⚖️", label: "Balanced Family Day", hint: "Mix of iconic and relaxed" },
                      { id: "off_beaten" as const, emoji: "🔭", label: "Off the Beaten Path", hint: "Local gems & hidden spots" },
                      { id: "easy_low_key" as const, emoji: "🌿", label: "Easy & Low-Key", hint: "Gentle pace, no pressure" },
                    ].map((ts) => (
                      <button
                        key={ts.id}
                        onClick={() => setTripStyle(ts.id)}
                        className={`py-3 px-3 rounded-xl text-left transition-all border-2 flex flex-col gap-0.5 ${
                          tripStyle === ts.id
                            ? "bg-orange-50 dark:bg-orange-900/20 border-orange-500 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300"
                        }`}
                        data-testid={`trip-style-${ts.id}`}
                      >
                        <span className="text-lg">{ts.emoji}</span>
                        <span className={`text-[11px] font-bold leading-tight ${tripStyle === ts.id ? "text-orange-700 dark:text-orange-300" : "text-slate-700 dark:text-slate-200"}`}>{ts.label}</span>
                        <span className={`text-[9px] leading-tight ${tripStyle === ts.id ? "text-orange-500" : "text-slate-400"}`}>{ts.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* D: Day Pace */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mb-4">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-extrabold tracking-widest text-orange-500 uppercase">Day Pace</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">How much do you want to fit in each day?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "chill" as const, emoji: "🌿", label: "Relaxed", hint: "2 stops · lots of downtime" },
                      { id: "balanced" as const, emoji: "☀️", label: "Moderate", hint: "3 stops · balanced" },
                      { id: "packed" as const, emoji: "⚡", label: "Busy", hint: "4 stops · pack it in" },
                    ].map((level) => (
                      <button
                        key={level.id}
                        onClick={() => setActivityLevel(level.id)}
                        className={`py-2.5 px-2 rounded-xl text-center transition-all border-2 flex flex-col items-center gap-0.5 ${
                          activityLevel === level.id
                            ? "bg-orange-50 dark:bg-orange-900/20 border-orange-500 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300"
                        }`}
                        data-testid={`activity-level-${level.id}`}
                      >
                        <span className="text-base">{level.emoji}</span>
                        <span className={`text-[11px] font-bold leading-tight ${activityLevel === level.id ? "text-orange-700 dark:text-orange-300" : "text-slate-700 dark:text-slate-200"}`}>{level.label}</span>
                        <span className={`text-[9px] leading-tight ${activityLevel === level.id ? "text-orange-500" : "text-slate-400"}`}>{level.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>


                {/* Fine-tune collapsible — optional extras */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl mb-5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowFineTune((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3"
                    data-testid="button-toggle-finetune"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚙️</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Fine-tune your plan</span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">Optional</span>
                    </div>
                    {showFineTune ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  <AnimatePresence>
                    {showFineTune && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-5 border-t border-slate-100 dark:border-slate-700 pt-4">

                          {/* Where are you staying? */}
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Hotel className="w-4 h-4 text-orange-500" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Where are you staying?</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowStaySection((v) => !v)}
                                className="text-[11px] text-orange-500 font-semibold"
                                data-testid="button-toggle-stay-section"
                              >
                                {showStaySection ? "Hide" : stayLocations.some(s => s.name.trim()) ? `${stayLocations.filter(s => s.name.trim()).length} added — edit` : "Add"}
                              </button>
                            </div>
                            <AnimatePresence>
                              {showStaySection && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden mt-3"
                                >
                                  <p className="text-xs text-slate-400 mb-3">Add each hotel/Airbnb — helps plan start/end points per day</p>
                                  {stayLocations.map((stay, idx) => (
                                    <div key={idx} className="mb-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 relative">
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Accommodation {idx + 1}</p>
                                        {stayLocations.length > 1 && (
                                          <button onClick={() => setStayLocations(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600" data-testid={`remove-stay-${idx}`}>
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                      <Input
                                        placeholder="Hotel or accommodation name *"
                                        value={stay.name}
                                        onChange={(e) => setStayLocations(prev => prev.map((s, i) => i === idx ? { ...s, name: e.target.value } : s))}
                                        className="rounded-xl mb-2 h-10 text-sm"
                                        data-testid={`stay-name-${idx}`}
                                      />
                                      <Input
                                        placeholder="Address (optional)"
                                        value={stay.address}
                                        onChange={(e) => setStayLocations(prev => prev.map((s, i) => i === idx ? { ...s, address: e.target.value } : s))}
                                        className="rounded-xl mb-2 h-10 text-sm"
                                        data-testid={`stay-address-${idx}`}
                                      />
                                      <DateRangePicker
                                        startDate={stay.checkIn}
                                        endDate={stay.checkOut}
                                        startLabel="Check in"
                                        endLabel="Check out"
                                        onStartChange={(v) => setStayLocations(prev => prev.map((s, i) => i === idx ? { ...s, checkIn: v } : s))}
                                        onEndChange={(v) => setStayLocations(prev => prev.map((s, i) => i === idx ? { ...s, checkOut: v } : s))}
                                      />
                                    </div>
                                  ))}
                                  <button
                                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-orange-300 text-orange-600 text-sm font-semibold flex items-center justify-center gap-1 hover:bg-orange-50 transition-colors"
                                    onClick={() => setStayLocations(prev => [...prev, { name: "", address: "", checkIn: "", checkOut: "" }])}
                                    data-testid="button-add-stay"
                                  >
                                    <Plus className="w-4 h-4" /> Add accommodation
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Getting Around */}
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Getting Around</p>
                            <div className="grid grid-cols-3 gap-2">
                              {([
                                { id: "walking" as const, emoji: "🚶", label: "Mostly walking" },
                                { id: "car" as const, emoji: "🚗", label: "Driving / car" },
                                { id: "transit" as const, emoji: "🚌", label: "Public transit" },
                              ]).map((opt) => (
                                <button
                                  key={opt.id}
                                  onClick={() => setGettingAround(gettingAround === opt.id ? null : opt.id)}
                                  className={`py-3 px-2 rounded-xl text-center border-2 flex flex-col items-center gap-1 transition-all ${
                                    gettingAround === opt.id
                                      ? "bg-orange-50 border-orange-500 dark:bg-orange-900/20"
                                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300"
                                  }`}
                                  data-testid={`tailor-transport-${opt.id}`}
                                >
                                  <span className="text-xl">{opt.emoji}</span>
                                  <span className={`text-[11px] font-semibold leading-tight ${gettingAround === opt.id ? "text-orange-700 dark:text-orange-300" : "text-slate-600 dark:text-slate-300"}`}>{opt.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Kids' Energy */}
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kids' Energy Today</p>
                            <div className="grid grid-cols-3 gap-2">
                              {([
                                { id: "charged" as const, emoji: "⚡", label: "Fully charged", hint: "Ready for anything" },
                                { id: "normal" as const, emoji: "😊", label: "About right", hint: "Normal day" },
                                { id: "low" as const, emoji: "😴", label: "Running low", hint: "Easy does it" },
                              ]).map((opt) => (
                                <button
                                  key={opt.id}
                                  onClick={() => setKidsEnergy(kidsEnergy === opt.id ? null : opt.id)}
                                  className={`py-3 px-2 rounded-xl text-center border-2 flex flex-col items-center gap-0.5 transition-all ${
                                    kidsEnergy === opt.id
                                      ? "bg-orange-50 border-orange-500 dark:bg-orange-900/20"
                                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300"
                                  }`}
                                  data-testid={`tailor-energy-${opt.id}`}
                                >
                                  <span className="text-xl">{opt.emoji}</span>
                                  <span className={`text-[11px] font-bold leading-tight ${kidsEnergy === opt.id ? "text-orange-700 dark:text-orange-300" : "text-slate-600 dark:text-slate-300"}`}>{opt.label}</span>
                                  <span className={`text-[9px] leading-tight ${kidsEnergy === opt.id ? "text-orange-500" : "text-slate-400"}`}>{opt.hint}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Indoor / Outdoor */}
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Indoor or Outdoor?</p>
                            <div className="grid grid-cols-3 gap-2">
                              {([
                                { id: "outdoor" as const, emoji: "☀️", label: "Outdoors!" },
                                { id: "mix" as const, emoji: "🌤️", label: "Mix it up" },
                                { id: "indoor" as const, emoji: "🏠", label: "Prefer indoors" },
                              ]).map((opt) => (
                                <button
                                  key={opt.id}
                                  onClick={() => setIndoorOutdoor(indoorOutdoor === opt.id ? null : opt.id)}
                                  className={`py-3 px-2 rounded-xl text-center border-2 flex flex-col items-center gap-1 transition-all ${
                                    indoorOutdoor === opt.id
                                      ? "bg-orange-50 border-orange-500 dark:bg-orange-900/20"
                                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300"
                                  }`}
                                  data-testid={`tailor-indoor-${opt.id}`}
                                >
                                  <span className="text-xl">{opt.emoji}</span>
                                  <span className={`text-[11px] font-semibold leading-tight ${indoorOutdoor === opt.id ? "text-orange-700 dark:text-orange-300" : "text-slate-600 dark:text-slate-300"}`}>{opt.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* What do kids love */}
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">What Do Your Kids Love?</p>
                            <div className="flex flex-wrap gap-2">
                              {([
                                { id: "animals", emoji: "🦁", label: "Animals" },
                                { id: "science", emoji: "🔬", label: "Science" },
                                { id: "outdoors", emoji: "🌿", label: "Outdoors" },
                                { id: "rides_play", emoji: "🎢", label: "Rides & Play" },
                                { id: "art_culture", emoji: "🎨", label: "Art & Culture" },
                                { id: "food", emoji: "🍕", label: "Food" },
                                { id: "history", emoji: "🏛️", label: "History" },
                                { id: "water", emoji: "💧", label: "Water" },
                              ]).map((opt) => {
                                const sel = kidInterests.includes(opt.id);
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => setKidInterests(prev => sel ? prev.filter(i => i !== opt.id) : [...prev, opt.id])}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm font-semibold transition-all ${
                                      sel
                                        ? "bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-300"
                                    }`}
                                    data-testid={`tailor-interest-${opt.id}`}
                                  >
                                    <span>{opt.emoji}</span>
                                    <span>{opt.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Meal Planning */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meal Planning</p>
                              <button
                                onClick={() => setFoodPlanEnabled(v => !v)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${foodPlanEnabled ? "bg-orange-500" : "bg-slate-200 dark:bg-slate-600"}`}
                                data-testid="tailor-meal-toggle"
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${foodPlanEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                              </button>
                            </div>
                            {!foodPlanEnabled && (
                              <p className="text-[11px] text-slate-400">Turn on to add dedicated meal stops to your plan</p>
                            )}
                            {foodPlanEnabled && (
                              <div className="space-y-3">
                                <div>
                                  <p className="text-[11px] text-slate-500 mb-1.5">Include stops for:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {([
                                      { id: "breakfast" as const, emoji: "🥐", label: "Breakfast" },
                                      { id: "lunch" as const, emoji: "🥙", label: "Lunch" },
                                      { id: "snacks" as const, emoji: "🍦", label: "Snacks" },
                                      { id: "dinner" as const, emoji: "🍽️", label: "Dinner" },
                                    ]).map((meal) => {
                                      const on = foodMeals[meal.id];
                                      return (
                                        <button
                                          key={meal.id}
                                          onClick={() => setFoodMeals(prev => ({ ...prev, [meal.id]: !prev[meal.id] }))}
                                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm font-semibold transition-all ${
                                            on
                                              ? "bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-300"
                                          }`}
                                          data-testid={`tailor-meal-${meal.id}`}
                                        >
                                          <span>{meal.emoji}</span>
                                          <span>{meal.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[11px] text-slate-500 mb-1.5">Dining style:</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {([
                                      { id: "quick" as const, emoji: "⚡", label: "Quick & easy", hint: "Fast casual, food trucks, grab & go" },
                                      { id: "sitdown" as const, emoji: "🍽️", label: "Sit-down meals", hint: "Restaurants with a table & kids menu" },
                                    ]).map((opt) => (
                                      <button
                                        key={opt.id}
                                        onClick={() => setFoodStyle(foodStyle === opt.id ? "" : opt.id)}
                                        className={`py-2.5 px-3 rounded-xl text-left border-2 flex flex-col gap-0.5 transition-all ${
                                          foodStyle === opt.id
                                            ? "bg-orange-50 border-orange-500 dark:bg-orange-900/20"
                                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300"
                                        }`}
                                        data-testid={`tailor-dining-${opt.id}`}
                                      >
                                        <span className="text-base">{opt.emoji}</span>
                                        <span className={`text-[11px] font-bold leading-tight ${foodStyle === opt.id ? "text-orange-700 dark:text-orange-300" : "text-slate-700 dark:text-white"}`}>{opt.label}</span>
                                        <span className={`text-[9px] leading-tight ${foodStyle === opt.id ? "text-orange-500" : "text-slate-400"}`}>{opt.hint}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Budget */}
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Budget</p>
                            <div className="grid grid-cols-3 gap-2">
                              {([
                                { id: "free" as const, emoji: "💚", label: "Free & cheap", hint: "Low-cost stops" },
                                { id: "mid" as const, emoji: "💛", label: "Mid-range", hint: "Mix of paid & free" },
                                { id: "best" as const, emoji: "⭐", label: "Best of best", hint: "Top experiences" },
                              ]).map((opt) => (
                                <button
                                  key={opt.id}
                                  onClick={() => setBudgetLevel(budgetLevel === opt.id ? null : opt.id)}
                                  className={`py-3 px-2 rounded-xl text-center border-2 flex flex-col items-center gap-0.5 transition-all ${
                                    budgetLevel === opt.id
                                      ? "bg-orange-50 border-orange-500 dark:bg-orange-900/20"
                                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300"
                                  }`}
                                  data-testid={`tailor-budget-${opt.id}`}
                                >
                                  <span className="text-xl">{opt.emoji}</span>
                                  <span className={`text-[11px] font-bold leading-tight ${budgetLevel === opt.id ? "text-orange-700 dark:text-orange-300" : "text-slate-600 dark:text-slate-300"}`}>{opt.label}</span>
                                  <span className={`text-[9px] leading-tight ${budgetLevel === opt.id ? "text-orange-500" : "text-slate-400"}`}>{opt.hint}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Accessibility */}
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Accessibility</p>
                            <button
                              onClick={() => setStrollerFriendly(v => !v)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                strollerFriendly
                                  ? "bg-orange-50 border-orange-500 dark:bg-orange-900/20"
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300"
                              }`}
                              data-testid="tailor-stroller"
                            >
                              <span className="text-2xl">🍼</span>
                              <div className="flex-1">
                                <p className={`text-sm font-semibold ${strollerFriendly ? "text-orange-700 dark:text-orange-300" : "text-slate-700 dark:text-white"}`}>We're bringing a stroller</p>
                                <p className="text-[11px] text-slate-400">We'll prioritise stroller-friendly stops and avoid cobblestones/stairs</p>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${strollerFriendly ? "bg-orange-500 border-orange-500" : "border-slate-300"}`}>
                                {strollerFriendly && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </button>
                          </div>

                          {/* Stop Intelligence */}
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stop Intelligence</p>
                            <button
                              onClick={() => setSmartStopDetails(v => !v)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                smartStopDetails
                                  ? "bg-orange-50 border-orange-500 dark:bg-orange-900/20"
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300"
                              }`}
                              data-testid="tailor-smart-stop"
                            >
                              <span className="text-2xl">🧠</span>
                              <div className="flex-1">
                                <p className={`text-sm font-semibold ${smartStopDetails ? "text-orange-700 dark:text-orange-300" : "text-slate-700 dark:text-white"}`}>Smart stop details</p>
                                <p className="text-[11px] text-slate-400">Live hours, booking links, and cost info for each stop</p>
                              </div>
                              <div className={`w-10 h-6 rounded-full flex items-center shrink-0 transition-colors ${smartStopDetails ? "bg-orange-500" : "bg-slate-200 dark:bg-slate-600"}`}>
                                <div className={`w-5 h-5 rounded-full bg-white shadow ml-0.5 transition-transform ${smartStopDetails ? "translate-x-4" : ""}`} />
                              </div>
                            </button>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Date warning popup */}
                {showDateWarning && (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      background: "rgba(0,0,0,0.55)",
                      backdropFilter: "blur(4px)",
                      zIndex: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 24px",
                    }}
                    onClick={() => setShowDateWarning(false)}
                    data-testid="date-warning-backdrop"
                  >
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 20,
                        padding: "28px 24px 24px",
                        maxWidth: 340,
                        width: "100%",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                      data-testid="date-warning-dialog"
                    >
                      <div style={{ fontSize: 36, textAlign: "center", marginBottom: 14 }}>📅</div>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", textAlign: "center", marginBottom: 8 }}>
                        When are you going?
                      </h3>
                      <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 1.5, marginBottom: 22 }}>
                        Pick your travel dates or choose how many days you're visiting — we use this to build the right number of stops.
                      </p>
                      <button
                        onClick={() => setShowDateWarning(false)}
                        style={{
                          width: "100%",
                          height: 48,
                          borderRadius: 14,
                          background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: 15,
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(212,135,43,0.4)",
                        }}
                        data-testid="button-date-warning-close"
                      >
                        Got it — pick my dates
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCreateAdventure}
                  disabled={isCreating || !canProceed()}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold h-14 rounded-2xl text-base shadow-lg mb-4 active:scale-[0.97] transition-all"
                  data-testid="button-next-step2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Building your plan...
                    </>
                  ) : (
                    "Build my plan →"
                  )}
                </Button>
              </motion.div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              data-testid="plan-reveal-section"
            >
              {/* Celebration header */}
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🎉</div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {routeStops.length > 1
                    ? `Your ${routeStops.map(s => s.name.split(",")[0]).join(" → ")} adventure is ready`
                    : `Your ${(routeStops[0]?.name || selectedDestination?.name || "").split(",")[0]} plan is ready`
                  }
                </h2>
                <p className="text-sm text-slate-500 mt-1">Here's a taste of Day 1</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {isEditingName ? (
                    <input
                      type="text"
                      value={adventureName}
                      onChange={e => setAdventureName(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                      onKeyDown={e => e.key === "Enter" && setIsEditingName(false)}
                      autoFocus
                      className="text-sm text-center font-medium text-slate-700 dark:text-white bg-orange-50 dark:bg-slate-700 border border-orange-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-1 focus:ring-orange-400 w-full max-w-[260px]"
                      data-testid="input-adventure-name"
                    />
                  ) : (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors group"
                      data-testid="button-edit-adventure-name"
                    >
                      <span className="font-medium">{adventureName || "Tap to name your adventure"}</span>
                      <span className="text-xs opacity-60 group-hover:opacity-100">✏️</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Day 1 stops */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mb-5"
                data-testid="day-preview-section"
              >
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <Compass className="w-4 h-4 text-orange-500" />
                  Day 1 • {routeStops[0]?.name || selectedDestination?.name || "your destination"}
                </h3>
                <div className="space-y-2">
                  {(() => {
                    const allStops = getCityTasteOfDay(routeStops[0]?.name || selectedDestination?.name || "");
                    const stopCount = activityLevel === "chill" ? 2 : activityLevel === "packed" ? allStops.length : 3;
                    const showMeal = activityLevel === "chill" || activityLevel === "packed";
                    const mealLabel = activityLevel === "chill" ? "Lunch nearby" : "Snack stop";
                    const mealEmoji = activityLevel === "chill" ? "🍽️" : "🍦";
                    const mealType = activityLevel === "chill" ? "Kid-friendly restaurant" : "Quick treat";
                    const mealTime = activityLevel === "chill" ? "12:30 PM" : "4:00 PM";
                    const displayStops = allStops.slice(0, stopCount);
                    const anchorMatchTime = (stopName: string): string | null => {
                      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\b(climb|tour|visit|adventure|exploration|experience|walk|quest|hunt|treasure|discovery)\b/g, "").trim();
                      const sn = norm(stopName);
                      for (const a of builderAnchors) {
                        if (!a.time) continue;
                        const an = norm(a.name);
                        if (sn.includes(an) || an.includes(sn) || an.split(" ").some(w => w.length > 4 && sn.includes(w))) {
                          return formatDisplayTime(a.time);
                        }
                      }
                      return null;
                    };
                    return (
                      <>
                        {displayStops.map((item, i) => {
                          const anchorTime = anchorMatchTime(item.stop);
                          const typeStr = item.type.toLowerCase();
                          const duration = typeStr.includes("food") || typeStr.includes("market") || typeStr.includes("restaurant")
                            ? "~1 hr"
                            : typeStr.includes("zoo") || typeStr.includes("aquarium") || typeStr.includes("wildlife")
                            ? "~3 hrs"
                            : typeStr.includes("fun") || typeStr.includes("play") || typeStr.includes("rides") || typeStr.includes("pier")
                            ? "~2–3 hrs"
                            : "~2 hrs";
                          const why = typeStr.includes("iconic") || typeStr.includes("landmark") || typeStr.includes("cultural")
                            ? "Classic family photo stop"
                            : typeStr.includes("wildlife") || typeStr.includes("zoo") || typeStr.includes("aquarium")
                            ? "Hands-on for all ages"
                            : typeStr.includes("fun") || typeStr.includes("play") || typeStr.includes("rides")
                            ? "Kids love this one"
                            : typeStr.includes("food") || typeStr.includes("market")
                            ? "Great energy break"
                            : typeStr.includes("science") || typeStr.includes("museum")
                            ? "Learning disguised as fun"
                            : "Great for all ages";
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: 0.15 + i * 0.1 }}
                              className={`rounded-xl p-3 border ${
                                i === 0
                                  ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 shadow-sm"
                                  : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`text-[11px] font-mono w-16 shrink-0 ${anchorTime ? "text-orange-500 font-bold" : "text-slate-400"}`}>{anchorTime ?? item.time}</span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold truncate ${i === 0 ? "text-orange-700 dark:text-orange-300" : "text-slate-700 dark:text-white"}`}>{item.stop}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] text-slate-400">{item.type}</span>
                                    <span className="text-[10px] text-slate-300">•</span>
                                    <span className="text-[11px] text-slate-400">{duration}</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1.5 pl-[76px] italic">{why}</p>
                            </motion.div>
                          );
                        })}
                        {showMeal && (
                          <motion.div
                            key="meal-card"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: 0.15 + displayStops.length * 0.1 }}
                            className="rounded-xl p-3 border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-slate-400 font-mono w-16 shrink-0">{mealTime}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{mealEmoji} {mealLabel}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-slate-400">{mealType}</span>
                                  <span className="text-[10px] text-slate-300">•</span>
                                  <span className="text-[11px] text-slate-400">~45 min</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1.5 pl-[76px] italic">Great energy break for the family</p>
                          </motion.div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>

              {/* Teaser: trips like this feel like */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="mb-6 rounded-2xl overflow-hidden"
                style={{ background: "linear-gradient(135deg,#E8962F 0%,#D4872B 60%,#C47820 100%)" }}
                data-testid="teaser-trips-like-yours"
              >
                <div className="px-5 py-5">
                  <p className="text-lg font-black text-white leading-tight mb-1">
                    This is just the plan…
                  </p>
                  <p className="text-sm text-white/70 font-medium mb-4">
                    Wait till you see what trips like this feel like
                  </p>
                  <button
                    onClick={handleSeePlan}
                    disabled={isNavigating}
                    className="w-full py-3 rounded-xl text-center font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-70"
                    style={{ background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.5)", color: "#fff" }}
                    data-testid="button-see-family-experiences"
                  >
                    {isNavigating ? "Opening your plan…" : "See how families experience this →"}
                  </button>
                </div>
              </motion.div>

              {/* Why this works for your family */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 }}
                className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 border border-amber-200 dark:border-orange-800 rounded-2xl p-4"
                data-testid="why-it-works-block"
              >
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Why this works for your family</p>
                {[
                  "Short travel distances between stops",
                  "Built-in breaks so kids don't burn out",
                  "Mix of discovery, fun + learning",
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <span className="text-green-500 font-bold text-sm shrink-0 mt-0.5">✔</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{point}</span>
                  </div>
                ))}
              </motion.div>

              {!user ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.5 }}
                  className="mb-2"
                  id="adventure-save-section"
                  data-testid="guest-signup-cta"
                >
                  <Button
                    onClick={handleSeePlan}
                    disabled={isNavigating}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold h-14 rounded-2xl text-base shadow-lg"
                    data-testid="button-guest-see-plan"
                  >
                    <Plane className="w-5 h-5 mr-2" />
                    {isNavigating ? "Opening your plan…" : "See full trip plan →"}
                  </Button>
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Your plan details are saved — takes 30 seconds
                  </p>
                </motion.div>
              ) : (
                <>
                  <Button
                    onClick={handleSeePlan}
                    disabled={isNavigating}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold h-14 rounded-2xl text-base shadow-lg mb-2"
                    data-testid="button-see-full-plan"
                  >
                    <Plane className="w-5 h-5 mr-2" />
                    {isNavigating ? "Opening your plan…" : "See full trip plan →"}
                  </Button>
                  {(() => {
                    const tripDays = effectiveStartDate && effectiveEndDate
                      ? Math.max(1, Math.round((new Date(effectiveEndDate).getTime() - new Date(effectiveStartDate).getTime()) / 86400000) + 1)
                      : null;
                    return (
                      <p className="text-xs text-slate-400 text-center">
                        {tripDays ? `${tripDays} days planned for you` : "Full plan ready for you"}
                      </p>
                    );
                  })()}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full-screen building overlay */}
      {isCreating && (() => {
        const ROTATING_MSGS = [
          { icon: "📍", label: "Finding kid-friendly stops..." },
          { icon: "⚖️", label: "Balancing energy levels..." },
          { icon: "🍽️", label: "Adding food breaks..." },
          { icon: "🗺️", label: "Optimizing your route..." },
          { icon: "✨", label: "Adding the finishing touches..." },
        ];
        const currentMsg = ROTATING_MSGS[buildingStep % ROTATING_MSGS.length];
        const mapCity = (routeStops[0]?.name || selectedDestination?.name || "").split(",")[0];
        const displayDestination = routeStops.length > 1
          ? routeStops.map(s => s.name.split(",")[0]).join(" → ")
          : (routeStops[0]?.name || selectedDestination?.name || "").split(",")[0];
        return (
          <div className="fixed inset-0 z-50 bg-gradient-to-b from-orange-50 to-amber-50 flex flex-col px-4">
            <div className="h-[18vh] shrink-0" />
            {/* Live city map with animated route dots */}
            <div className="relative w-full rounded-2xl overflow-hidden shadow-lg shrink-0" style={{ height: "220px" }}>
              <BuildingMapPreview cityName={mapCity} leafletReady={leafletReady} />
              <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1 pointer-events-none">
                <p className="text-white text-xs font-semibold">{displayDestination}</p>
              </div>
            </div>

            <div className="h-[6vh] shrink-0" />

            {/* Building text */}
            <div className="flex flex-col items-center px-2">
              <h1 className="text-2xl font-bold text-slate-800 mb-1.5 text-center">Building your plan</h1>
              <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
                AI is crafting a personalised itinerary for{" "}
                <span className="text-orange-600 font-semibold">{displayDestination || "your destination"}</span>
              </p>

              <div className="w-full max-w-xs">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex items-center gap-3">
                  <span className="text-xl shrink-0">{currentMsg.icon}</span>
                  <span className="flex-1 text-sm font-medium text-slate-700">{currentMsg.label}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0 animate-pulse" />
                </div>
              </div>

              {creatingTooLong ? (
                <div className="mt-6 text-center space-y-2">
                  <p className="text-xs text-amber-600 font-medium">Taking a little longer than usual…</p>
                  <p className="text-xs text-slate-400">Hang tight — almost done.</p>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="mt-2 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600 transition-colors"
                  >
                    Cancel and go back
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center mt-6">
                  Building your plan… almost there
                </p>
              )}
            </div>
          </div>
        );
      })()}

      <AddAnchorSheet
        isOpen={anchorSheetOpen}
        onClose={() => setAnchorSheetOpen(false)}
        totalDays={totalBuilderDays}
        tripCity={routeStops[0]?.name || undefined}
        onAdd={(anchor) => {
          setBuilderAnchors(prev => [...prev, anchor]);
          setAnchorSheetOpen(false);
        }}
      />

      {/* GeoAdventures-specific sign-up modal for guest users */}
      <SignUpPrompt
        isOpen={showGuestSignup}
        onClose={() => setShowGuestSignup(false)}
        onLogin={async () => {
          setShowGuestSignup(false);
          try {
            const pending = localStorage.getItem("geoadventures-pending-trip");
            if (pending) {
              const { tripId, guestToken } = JSON.parse(pending);
              if (tripId && guestToken) {
                await fetch(`/api/travel/trips/${tripId}/claim-guest`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ guestToken }),
                });
                localStorage.removeItem("geoadventures-pending-trip");
                localStorage.removeItem(`guest-trip-${tripId}`);
              }
            }
          } catch { /* silent */ }
          window.location.reload();
        }}
        variant="travel"
      />

    </div>
  );
}
