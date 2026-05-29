import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/lib/userContext";
import { ALL_PASSPORT_CITIES } from "@/lib/dailyQuestData";
import { ArrowLeft, MapPin, Star, Search, Globe, ChevronDown, ChevronUp, X, Headphones } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

declare const L: any;

interface CityCoord {
  id: string;
  city: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  flag: string;
  funFact: string;
  population: string;
  currency: string;
  languages: string;
  imageUrl?: string;
}

type MarkerStatus = "undiscovered" | "discovered" | "learning" | "mastered" | "visited";

const REGION_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  "Europe": { label: "Europe", emoji: "🏰", color: "#8B5CF6" },
  "North America": { label: "N. America", emoji: "🗽", color: "#EF4444" },
  "Asia": { label: "Asia", emoji: "🏯", color: "#F59E0B" },
  "South America": { label: "S. America", emoji: "🌴", color: "#10B981" },
  "Africa": { label: "Africa", emoji: "🦁", color: "#F97316" },
  "Oceania": { label: "Oceania", emoji: "🏝️", color: "#06B6D4" },
};

const STATUS_COLORS: Record<MarkerStatus, { fill: string; border: string; label: string }> = {
  undiscovered: { fill: "#9CA3AF", border: "#6B7280", label: "Undiscovered" },
  discovered: { fill: "#16a34a", border: "#15803d", label: "Discovered" },
  learning: { fill: "#2563eb", border: "#1d4ed8", label: "Learning" },
  mastered: { fill: "#8B5CF6", border: "#7C3AED", label: "Remembered" },
  visited: { fill: "#F59E0B", border: "#D97706", label: "Visited" },
};

function getStarCount(mastery: any): number {
  if (!mastery) return 0;
  let count = 0;
  if (mastery.star1) count++;
  if (mastery.star2) count++;
  if (mastery.star3) count++;
  if (mastery.star4) count++;
  if (mastery.star5) count++;
  return count;
}

function getCityStatus(
  cityId: string,
  collectedCardIds: string[],
  passportMastery: any[],
): MarkerStatus {
  const mastery = passportMastery.find((m: any) => m.cityId === cityId);
  const stars = getStarCount(mastery);
  const isCollected = collectedCardIds.includes(cityId);

  if (mastery?.visitedInGeoAdventures) return "visited";
  if (stars >= 3) return "mastered";
  if (stars >= 2) return "learning";
  if (stars >= 1 || isCollected) return "discovered";
  return "undiscovered";
}

function createCompassSvg(status: MarkerStatus, size: number): string {
  const colors = STATUS_COLORS[status];
  const r = size / 2;
  const innerR = r * 0.55;
  const needleR = r * 0.35;

  if (status === "undiscovered") {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${r}" cy="${r}" r="${r - 1}" fill="none" stroke="${colors.border}" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.6"/>
      <circle cx="${r}" cy="${r}" r="${innerR}" fill="none" stroke="${colors.border}" stroke-width="1" opacity="0.4"/>
      <line x1="${r}" y1="${r - needleR}" x2="${r}" y2="${r + needleR}" stroke="${colors.fill}" stroke-width="1.5" opacity="0.5" stroke-linecap="round"/>
      <circle cx="${r}" cy="${r}" r="1.5" fill="${colors.fill}" opacity="0.5"/>
    </svg>`;
  }

  const glowFilter = (status === "mastered" || status === "visited") ? 
    `<defs><filter id="glow-${status}"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` : '';
  const filterAttr = (status === "mastered" || status === "visited") ? ` filter="url(#glow-${status})"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${glowFilter}
    <circle cx="${r}" cy="${r}" r="${r - 1}" fill="${colors.fill}" stroke="${colors.border}" stroke-width="1.5"${filterAttr}/>
    <circle cx="${r}" cy="${r}" r="${innerR}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
    <polygon points="${r},${r - needleR} ${r + 2},${r} ${r},${r + 1}" fill="rgba(255,255,255,0.9)"/>
    <polygon points="${r},${r + needleR} ${r - 2},${r} ${r},${r - 1}" fill="rgba(255,255,255,0.5)"/>
    <circle cx="${r}" cy="${r}" r="1.5" fill="white"/>
    ${status === "visited" ? `<text x="${r}" y="${r - needleR - 2}" text-anchor="middle" font-size="8" fill="#F59E0B">⭐</text>` : ''}
  </svg>`;
}

function injectExplorerMapStyles() {
  const styleId = "explorer-map-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .explorer-map-container .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
      border-radius: 12px !important;
      overflow: hidden !important;
    }
    .explorer-map-container .leaflet-control-zoom a {
      width: 36px !important;
      height: 36px !important;
      line-height: 36px !important;
      font-size: 18px !important;
      color: #374151 !important;
      background: white !important;
      border: none !important;
    }
    .explorer-map-container .leaflet-control-zoom a:hover {
      background: #F3F4F6 !important;
    }
    @keyframes explorer-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    @keyframes explorer-sparkle {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    @keyframes explorer-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    @keyframes discovery-pop {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.4); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes discovery-sparkle-burst {
      0% { opacity: 1; transform: scale(0.5); }
      100% { opacity: 0; transform: scale(2.5); }
    }
    .explorer-marker-mastered {
      animation: explorer-pulse 2.5s ease-in-out infinite;
    }
    .explorer-marker-mastered .sparkle-ring {
      animation: explorer-sparkle 3s ease-in-out infinite;
    }
    .explorer-marker-visited {
      animation: explorer-bounce 2s ease-in-out infinite;
    }
    .explorer-marker-newly-discovered {
      animation: discovery-pop 0.8s ease-out forwards;
    }
    .discovery-burst {
      animation: discovery-sparkle-burst 1s ease-out forwards;
    }
    .explorer-map-container .leaflet-tooltip.explorer-tooltip {
      background: rgba(255,255,255,0.95);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .explorer-map-container .leaflet-tooltip.explorer-tooltip::before {
      border-top-color: rgba(255,255,255,0.95);
    }
    .leaflet-marker-cluster {
      background: rgba(59, 130, 246, 0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .leaflet-marker-cluster div {
      background: rgba(59, 130, 246, 0.7);
      color: white;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
  document.head.appendChild(style);
}

export default function ExplorerMap() {
  const [, navigate] = useLocation();
  const { collectedCardIds, passportMastery, getPassportMastery } = useUser();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterGroupRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [cities, setCities] = useState<CityCoord[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityCoord | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [showRegions, setShowRegions] = useState(false);
  const [newlyDiscoveredIds, setNewlyDiscoveredIds] = useState<Set<string>>(new Set());
  const openCityParam = useRef(new URLSearchParams(window.location.search).get('openCity'));
  const prevDiscoveredRef = useRef<Set<string>>(new Set());

  const { data: storiesData } = useQuery<{ stories: Array<{ id: string; cityId: string; title: string; subtitle?: string }>, completedStoryIds: string[] }>({
    queryKey: ["/api/stories"],
    queryFn: async () => {
      const res = await fetch("/api/stories");
      if (!res.ok) return { stories: [], completedStoryIds: [] };
      return res.json();
    },
    staleTime: 60000,
  });

  const storyCityMap = useMemo(() => {
    const map = new Map<string, { id: string; title: string }>();
    if (storiesData?.stories) {
      for (const s of storiesData.stories) {
        if (!map.has(s.cityId)) map.set(s.cityId, { id: s.id, title: s.title });
      }
    }
    return map;
  }, [storiesData]);

  const completedStoryIds = useMemo(() => new Set(storiesData?.completedStoryIds || []), [storiesData]);

  useEffect(() => {
    const check = () => {
      if (typeof window !== "undefined" && (window as any).L) {
        setLeafletReady(true);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  }, []);

  useEffect(() => {
    fetch("/api/daily-quest/cities")
      .then((r) => r.json())
      .then((data: CityCoord[]) => {
        const withCoords = data.filter((c) => c.lat && c.lng);
        setCities(withCoords);
        if (openCityParam.current && withCoords.length > 0) {
          const targetPassport = ALL_PASSPORT_CITIES.find(p => p.id === openCityParam.current);
          if (targetPassport) {
            const targetCity = withCoords.find(
              c => c.city.toLowerCase() === targetPassport.city.toLowerCase() &&
                   c.country.toLowerCase() === targetPassport.country.toLowerCase()
            );
            if (targetCity) {
              setSelectedCity(targetCity);
              setTimeout(() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([targetCity.lat, targetCity.lng], 5, { animate: true });
                }
              }, 500);
            }
          }
          openCityParam.current = null;
        }
      })
      .catch(console.error);
  }, []);

  const cityStatusMap = useMemo(() => {
    const map = new Map<string, MarkerStatus>();
    const allCities = ALL_PASSPORT_CITIES;
    for (const city of allCities) {
      map.set(city.id, getCityStatus(city.id, collectedCardIds, passportMastery));
    }
    return map;
  }, [collectedCardIds, passportMastery]);

  useEffect(() => {
    const currentDiscovered = new Set<string>();
    cityStatusMap.forEach((status, id) => {
      if (status !== "undiscovered") currentDiscovered.add(id);
    });

    if (prevDiscoveredRef.current.size > 0) {
      const newIds = new Set<string>();
      currentDiscovered.forEach(id => {
        if (!prevDiscoveredRef.current.has(id)) newIds.add(id);
      });
      if (newIds.size > 0) {
        setNewlyDiscoveredIds(newIds);
        setTimeout(() => setNewlyDiscoveredIds(new Set()), 3000);
      }
    }
    prevDiscoveredRef.current = currentDiscovered;
  }, [cityStatusMap]);

  const matchCityToPassport = useCallback(
    (apiCity: CityCoord): { passportId: string; status: MarkerStatus } | null => {
      const match = ALL_PASSPORT_CITIES.find(
        (p) =>
          p.city.toLowerCase() === apiCity.city.toLowerCase() &&
          p.country.toLowerCase() === apiCity.country.toLowerCase()
      );
      if (!match) return null;
      const status = cityStatusMap.get(match.id) || "undiscovered";
      return { passportId: match.id, status };
    },
    [cityStatusMap]
  );

  const discoveredCount = useMemo(() => {
    let count = 0;
    cityStatusMap.forEach((status) => {
      if (status !== "undiscovered") count++;
    });
    return count;
  }, [cityStatusMap]);

  const regionStats = useMemo(() => {
    const stats: Record<string, { total: number; discovered: number; mastered: number }> = {};
    for (const city of cities) {
      if (!stats[city.region]) stats[city.region] = { total: 0, discovered: 0, mastered: 0 };
      stats[city.region].total++;
      const match = matchCityToPassport(city);
      if (match && match.status !== "undiscovered") stats[city.region].discovered++;
      if (match && (match.status === "mastered" || match.status === "visited"))
        stats[city.region].mastered++;
    }
    return stats;
  }, [cities, matchCityToPassport]);

  useEffect(() => {
    if (!leafletReady || !mapRef.current || cities.length === 0) return;
    if (mapInstanceRef.current) return;

    injectExplorerMapStyles();

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: true,
      attributionControl: false,
      worldCopyJump: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletReady, cities]);

  useEffect(() => {
    if (!mapInstanceRef.current || cities.length === 0) return;

    if (clusterGroupRef.current) {
      mapInstanceRef.current.removeLayer(clusterGroupRef.current);
    }
    markersRef.current.forEach((m) => {
      if (mapInstanceRef.current.hasLayer(m)) mapInstanceRef.current.removeLayer(m);
    });
    markersRef.current = [];

    const hasMarkerCluster = typeof L.markerClusterGroup === 'function';

    let clusterGroup: any = null;
    if (hasMarkerCluster) {
      clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 6,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const markers = cluster.getAllChildMarkers();
          let hasMastered = false;
          let hasLearning = false;
          let hasDiscovered = false;
          markers.forEach((m: any) => {
            if (m.options._status === 'mastered' || m.options._status === 'visited') hasMastered = true;
            if (m.options._status === 'learning') hasLearning = true;
            if (m.options._status === 'discovered') hasDiscovered = true;
          });
          const clusterColor = hasMastered ? '#8B5CF6' : hasLearning ? '#2563eb' : hasDiscovered ? '#16a34a' : '#9CA3AF';
          const size = count > 20 ? 50 : count > 10 ? 44 : 36;
          return L.divIcon({
            html: `<div style="
              width:${size}px;height:${size}px;
              background:${clusterColor};
              border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              color:white;font-weight:700;font-size:${size > 44 ? 14 : 12}px;
              box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 0 12px ${clusterColor}40;
              border:2px solid rgba(255,255,255,0.5);
            ">${count}</div>`,
            className: 'explorer-cluster-icon',
            iconSize: [size + 8, size + 8],
            iconAnchor: [(size + 8) / 2, (size + 8) / 2],
          });
        },
      });
      clusterGroupRef.current = clusterGroup;
    }

    for (const city of cities) {
      const match = matchCityToPassport(city);
      const status: MarkerStatus = match?.status || "undiscovered";
      const passportId = match?.passportId || '';

      const size = status === "undiscovered" ? 16 : status === "discovered" ? 20 : 24;
      const isNewlyDiscovered = newlyDiscoveredIds.has(passportId);
      const extraClass =
        isNewlyDiscovered ? "explorer-marker-newly-discovered" :
        status === "mastered" ? "explorer-marker-mastered" :
        status === "visited" ? "explorer-marker-visited" : "";

      const compassSvg = createCompassSvg(status, size);

      const sparkleRing = status === "mastered" ?
        `<div class="sparkle-ring" style="position:absolute;inset:-4px;border-radius:50%;border:1.5px solid rgba(139,92,246,0.4);pointer-events:none;"></div>` : '';

      const burstEffect = isNewlyDiscovered ?
        `<div class="discovery-burst" style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${STATUS_COLORS[status].fill};pointer-events:none;"></div>` : '';

      const icon = L.divIcon({
        className: "explorer-city-marker",
        html: `<div class="${extraClass}" style="
          width:${size}px;height:${size}px;
          position:relative;cursor:pointer;
          filter: ${status === 'mastered' ? 'drop-shadow(0 0 6px rgba(139,92,246,0.5))' : status === 'visited' ? 'drop-shadow(0 0 4px rgba(245,158,11,0.4))' : 'none'};
        ">${compassSvg}${sparkleRing}${burstEffect}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([city.lat, city.lng], { icon, _status: status });

      marker.on("click", () => {
        setSelectedCity(city);
      });

      marker.bindTooltip(city.city, {
        direction: "top",
        offset: [0, -size / 2 - 4],
        className: "explorer-tooltip",
      });

      if (clusterGroup) {
        clusterGroup.addLayer(marker);
      } else {
        marker.addTo(mapInstanceRef.current);
      }
      markersRef.current.push(marker);
    }

    if (clusterGroup) {
      mapInstanceRef.current.addLayer(clusterGroup);
    }
  }, [cities, matchCityToPassport, newlyDiscoveredIds]);

  const selectedMatch = useMemo(() => {
    if (!selectedCity) return null;
    return matchCityToPassport(selectedCity);
  }, [selectedCity, matchCityToPassport]);

  const selectedMastery = useMemo(() => {
    if (!selectedMatch) return null;
    return getPassportMastery(selectedMatch.passportId);
  }, [selectedMatch, getPassportMastery]);

  const selectedStarCount = useMemo(() => {
    return getStarCount(selectedMastery);
  }, [selectedMastery]);

  const nextStarInfo = useMemo(() => {
    if (!selectedMastery || !selectedMatch) return null;
    const labels = [
      { num: 1, label: "Discover", emoji: "🔍", game: "Guess & Go" },
      { num: 2, label: "Map Me", emoji: "🗺️", game: "Map Me" },
      { num: 3, label: "Flag Quiz", emoji: "🚩", game: "Flag Quiz" },
      { num: 4, label: "City Vibe", emoji: "✨", game: "City Vibe" },
      { num: 5, label: "Spin Globe", emoji: "🌍", game: "Spin the Globe" },
    ];
    for (const s of labels) {
      const earned = (selectedMastery as any)?.[`star${s.num}`];
      if (!earned) return s;
    }
    return null;
  }, [selectedMastery, selectedMatch]);

  const toggleRegion = (region: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  const progressPercent = cities.length > 0 ? Math.round((discoveredCount / cities.length) * 100) : 0;

  const STAR_LABELS = ["Discovered 🔍", "Map Me 🗺️", "Flag Quiz 🚩", "City Vibe ✨", "Spin Globe 🌍"];

  const handleStarClick = useCallback((starNum: number, passportId: string) => {
    const returnParam = "&returnTo=explorer-map";
    if (starNum === 2) {
      window.location.href = `/map-me?masteryCity=${passportId}${returnParam}`;
    } else if (starNum === 3) {
      window.location.href = `/mini-games?masteryCity=${passportId}&game=flag_quiz${returnParam}`;
    } else if (starNum === 4) {
      window.location.href = `/mini-games?masteryCity=${passportId}&game=city_vibe${returnParam}`;
    } else if (starNum === 5) {
      window.location.href = `/mini-games?masteryCity=${passportId}&game=globe_spinner${returnParam}`;
    }
  }, []);

  const selectedStoryInfo = useMemo(() => {
    if (!selectedCity) return null;
    const info = storyCityMap.get(selectedCity.id);
    if (!info) return null;
    return { ...info, completed: completedStoryIds.has(info.id) };
  }, [selectedCity, storyCityMap, completedStoryIds]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900" data-testid="explorer-map-page">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 z-20 relative">
        <button
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            navigate(params.get('from') === 'explore' ? '/explore' : '/');
          }}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          data-testid="button-back-from-map"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Explorer Map
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="text-discovered-count">
            {discoveredCount} / {cities.length || 101} cities discovered
          </p>
        </div>
        <button
          onClick={() => setShowRegions(!showRegions)}
          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          data-testid="button-toggle-regions"
        >
          <MapPin className="w-5 h-5 text-blue-500" />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-100 dark:border-gray-700 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              data-testid="progress-bar-discovered"
            />
          </div>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 min-w-[45px] text-right">
            {progressPercent}%
          </span>
        </div>
      </div>

      <AnimatePresence>
        {showRegions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10 relative overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2 max-h-[40vh] overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Region Progress</h3>
              {Object.entries(REGION_CONFIG).map(([region, config]) => {
                const stats = regionStats[region] || { total: 0, discovered: 0, mastered: 0 };
                const pct = stats.total > 0 ? Math.round((stats.discovered / stats.total) * 100) : 0;
                const isExpanded = expandedRegions.has(region);
                return (
                  <div key={region} data-testid={`region-progress-${region.replace(/\s/g, "-")}`}>
                    <button
                      onClick={() => toggleRegion(region)}
                      className="w-full flex items-center gap-2 py-1"
                    >
                      <span className="text-base">{config.emoji}</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 text-left">
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-500">{stats.discovered}/{stats.total}</span>
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: config.color }}
                        />
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-8 pb-2 space-y-1">
                            {cities
                              .filter((c) => c.region === region)
                              .sort((a, b) => a.city.localeCompare(b.city))
                              .map((city) => {
                                const match = matchCityToPassport(city);
                                const status = match?.status || "undiscovered";
                                return (
                                  <button
                                    key={city.id}
                                    onClick={() => {
                                      setSelectedCity(city);
                                      if (mapInstanceRef.current) {
                                        mapInstanceRef.current.flyTo([city.lat, city.lng], 6, {
                                          duration: 1,
                                        });
                                      }
                                    }}
                                    className="flex items-center gap-2 w-full text-left py-0.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-1"
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: STATUS_COLORS[status].fill }}
                                    />
                                    <span className="text-xs text-gray-600 dark:text-gray-400">{city.flag}</span>
                                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                      {city.city}
                                    </span>
                                  </button>
                                );
                              })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-around text-xs text-gray-500">
                  {Object.entries(STATUS_COLORS).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: val.fill, border: `1.5px solid ${val.border}` }}
                      />
                      <span>{val.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative">
        <div
          ref={mapRef}
          className="w-full h-full explorer-map-container"
          data-testid="explorer-map-leaflet"
        />

        <div className="absolute bottom-4 left-4 right-4 z-[1000] flex items-center justify-around bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg pointer-events-none">
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 flex-shrink-0"
                dangerouslySetInnerHTML={{ __html: createCompassSvg(key as MarkerStatus, 16) }}
              />
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">{val.label}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-[1001] bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[60vh] overflow-hidden"
            data-testid="city-card-panel"
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedCity.flag}</span>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white text-lg" data-testid="text-city-card-name">
                    {selectedCity.city}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCity.country}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCity(null)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                data-testid="button-close-city-card"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-4 pb-4 overflow-y-auto max-h-[50vh]">
              {selectedMatch && (
                <div className="mb-3">
                  <div className="flex items-center gap-1 mb-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: STATUS_COLORS[selectedMatch.status].fill }}
                      data-testid="text-city-status"
                    >
                      {STATUS_COLORS[selectedMatch.status].label}
                    </span>
                    {selectedStarCount > 0 && (
                      <div className="flex items-center gap-1 ml-2">
                        <span className="text-sm tracking-tight">
                          {Array.from({ length: 5 }, (_, i) => i < selectedStarCount ? "⭐" : "☆").join("")}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">City Mastery</span>
                      </div>
                    )}
                  </div>

                  {selectedStoryInfo && (
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-3 mb-3 border border-purple-200/60 dark:border-purple-700/40" data-testid="city-card-story-slot">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-300/30">
                          <Headphones className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                            {selectedStoryInfo.completed ? "Story Completed ✓" : "🎧 GeoBuddy Story"}
                          </p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            "{selectedStoryInfo.title}"
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/stories/${selectedStoryInfo.id}`)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                            selectedStoryInfo.completed
                              ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-300/30"
                              : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-purple-300/30"
                          }`}
                          data-testid="button-play-story"
                        >
                          {selectedStoryInfo.completed ? "Replay" : "Play Story"}
                        </button>
                      </div>
                    </div>
                  )}

                  {nextStarInfo && selectedMatch.status !== "undiscovered" && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-2.5 mb-3 border border-amber-200/60 dark:border-amber-700/40" data-testid="next-challenge-banner">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">★</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Next Challenge</p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {nextStarInfo.game} {nextStarInfo.emoji}
                          </p>
                        </div>
                        {nextStarInfo.num >= 2 && (
                          <button
                            onClick={() => {
                              if (selectedMatch?.passportId) {
                                handleStarClick(nextStarInfo.num, selectedMatch.passportId);
                              }
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-lg shadow-md transition-all"
                            data-testid="button-next-challenge"
                          >
                            Play
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const earned = selectedMastery
                        ? (selectedMastery as any)[`star${num}`]
                        : false;
                      const isMasteryBonus = num > 3;
                      const isClickable = num >= 2 && !earned && selectedMatch?.passportId && selectedMatch.status !== "undiscovered";
                      const prevStarEarned = num === 1 || (selectedMastery && (selectedMastery as any)[`star${num - 1}`]);
                      const canPlay = isClickable && prevStarEarned;
                      return (
                        <button
                          key={num}
                          disabled={!canPlay}
                          onClick={() => {
                            if (canPlay && selectedMatch?.passportId) {
                              handleStarClick(num, selectedMatch.passportId);
                            }
                          }}
                          className={`flex flex-col items-center flex-1 ${canPlay ? "cursor-pointer" : "cursor-default"}`}
                          data-testid={`star-${num}-button`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                              earned
                                ? isMasteryBonus
                                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-500"
                                  : "bg-green-100 dark:bg-green-900/30 text-green-500"
                                : canPlay
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-500 ring-2 ring-amber-300 dark:ring-amber-600"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                            }`}
                            data-testid={`star-${num}-status`}
                          >
                            {earned ? "★" : canPlay ? "▶" : "☆"}
                          </div>
                          <span className={`text-[9px] mt-0.5 text-center leading-tight ${canPlay ? "text-amber-600 font-semibold" : "text-gray-500"}`}>
                            {STAR_LABELS[num - 1]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedStarCount < 3 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
                      Earn any 3 stars to master this city!
                    </p>
                  )}
                  {selectedStarCount >= 3 && selectedStarCount < 5 && (
                    <p className="text-xs text-purple-500 dark:text-purple-400 text-center mb-2">
                      Complete all 5 for bonus rewards!
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1.5 text-center">
                  <p className="text-[10px] text-gray-400 uppercase">Population</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{selectedCity.population}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1.5 text-center">
                  <p className="text-[10px] text-gray-400 uppercase">Currency</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{selectedCity.currency}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1.5 text-center">
                  <p className="text-[10px] text-gray-400 uppercase">Language</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{selectedCity.languages}</p>
                </div>
              </div>

              {selectedCity.funFact && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 mb-3">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">Did You Know?</span> {selectedCity.funFact}
                  </p>
                </div>
              )}

              {selectedMatch && selectedMatch.status === "undiscovered" && (
                <button
                  onClick={() => navigate("/play-games")}
                  className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors"
                  data-testid="button-discover-city"
                >
                  Play GeoGames to Discover This City!
                </button>
              )}

              {selectedMatch && selectedMatch.status !== "undiscovered" && selectedStarCount < 5 && selectedMatch.passportId && (
                <button
                  onClick={() => navigate("/play-games")}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold text-sm transition-colors"
                  data-testid="button-earn-stars"
                >
                  Continue Exploring →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedCity && (
        <div
          className="absolute inset-0 z-[1000] bg-black/20"
          onClick={() => setSelectedCity(null)}
        />
      )}
    </div>
  );
}
