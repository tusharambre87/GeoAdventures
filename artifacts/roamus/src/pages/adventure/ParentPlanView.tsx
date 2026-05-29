import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle,
  Navigation,
  Plus,
  X,
  Loader2,
  Trash2,
  Clock,
  MoreVertical,
  Ticket,
  Share2,
  Camera,
  ChevronDown,
  ChevronUp,
  Star,
  RefreshCw,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Info,
  Upload,
  Hash,
  Map as MapIcon,
  ChevronRight,
  ChevronLeft,
  UtensilsCrossed,
  Coffee,
  Search,
  FolderOpen,
  Plane,
  Hotel,
  Car,
  ParkingCircle,
  FileText,
  Pencil,
  ExternalLink,
  Download,
  Link2,
  Video,
  Image as ImageIcon,
  Sparkles,
  Heart,
  BookOpen,
  Settings,
  Copy,
  Check,
  CloudRain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTravel } from "@/lib/travelContext";
import { useUser } from "@/lib/userContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { SignUpPrompt } from "@/components/SignUpPrompt";
import { groupStopsByDay, stopsPerDayFromPace, STOPS_PER_DAY, type CityDateRange } from "@/lib/travelDayGroups";
import { isQuickStop } from "@/lib/stopCategories";
import { toast } from "sonner";
import type { TravelStop, TripWalletItem, TravelMoment } from "@shared/schema";
import { MomentCapture } from "@/components/MomentCapture";
import { TripVideoGenerator } from "@/components/TripVideoGenerator";
import { TripCollageGenerator } from "@/components/TripCollageGenerator";
import { getAdventureStopImage } from "@/lib/adventureImages";
import { useOnDemandStopImage, useOnDemandCityImage } from "@/hooks/useOnDemandAdventureImage";
import { FamilyTravelMap } from "@/components/FamilyTravelMap";
import { DailyMapsCard } from "@/components/DailyMapsCard";
import { DayRouteBottomSheet } from "@/components/DayRouteBottomSheet";
import { DayRouteMiniMap } from "@/components/DayRouteMiniMap";
import { generateDayRouteVariants } from "@/lib/dailyMapsService";
import type { DayRouteBundle } from "@/types/dailyMaps";
import { TripSettingsModal, type TripSettings, type ChangeImpact } from "./TripSettingsModal";
import { TravelOfflineDownload } from "@/components/TravelOfflineDownload";
import { PackingList } from "@/components/PackingList";
import { runAutoOptimize, exceedsAutoCap, type TriggerType, type ChangeProposal } from "./autoOptimizeEngine";
import { ReliefResultCard } from "./ReliefResultCard";
import type { NeedRec as SharedNeedRec } from "./ReliefResultCard";
import { TravelGeoBuddyNudge, GeoBuddySuggestionCard } from "@/components/TravelGeoBuddyNudge";
import { RescuePanel } from "@/components/RescuePanel";
import { GetHelpFlow } from "@/components/GetHelpFlow";
import { PassesBanner } from "@/components/PassesBanner";
import { AddAnchorSheet, type AnchorInput, formatDisplayTime } from "@/components/AddAnchorSheet";
import { TripsLikeYoursCarousel } from "@/components/planner/TripsLikeYoursCarousel";

function getMomentPhotoUrl(moment: TravelMoment): string | null {
  if (moment.photoUrl) return moment.photoUrl;
  const urls = moment.photoUrls;
  if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === "string") return urls[0];
  if (typeof urls === "string") {
    try { const p = JSON.parse(urls); if (Array.isArray(p) && p.length > 0) return p[0]; } catch {}
  }
  return null;
}

function getMomentAllPhotoUrls(moment: TravelMoment): string[] {
  const urls = moment.photoUrls;
  let arr: string[] = [];
  if (Array.isArray(urls) && urls.length > 0) {
    arr = (urls as unknown[]).filter((u): u is string => typeof u === "string");
  } else if (typeof urls === "string") {
    try {
      const p = JSON.parse(urls);
      if (Array.isArray(p)) arr = (p as unknown[]).filter((u): u is string => typeof u === "string");
    } catch {}
  }
  if (arr.length === 0 && moment.photoUrl) arr = [moment.photoUrl];
  return arr;
}

function flattenMomentPhotos(moments: TravelMoment[]): Array<{ moment: TravelMoment; photoUrl: string | null; key: string }> {
  return moments.flatMap(m => {
    const all = getMomentAllPhotoUrls(m);
    if (all.length === 0) return [{ moment: m, photoUrl: null, key: m.id.toString() }];
    return all.map((url, i) => ({ moment: m, photoUrl: url, key: `${m.id}-${i}` }));
  });
}

const AVATAR_EMOJIS: Record<string, string> = {
  panda: "🐼", lion: "🦁", elephant: "🐘", penguin: "🐧", koala: "🐨",
  fox: "🦊", owl: "🦉", turtle: "🐢", butterfly: "🦋", dolphin: "🐬",
  rocket: "🚀", globe: "🌍",
};

function getAvatarEmoji(key?: string | null): string {
  return key ? AVATAR_EMOJIS[key] || "🐼" : "🐼";
}

const STOP_TYPE_CONFIG: Record<string, { emoji: string; gradient: string; label: string }> = {
  park:       { emoji: "🌳", gradient: "from-green-400 to-emerald-500",  label: "Park" },
  museum:     { emoji: "🏛️", gradient: "from-amber-400 to-orange-500",   label: "Museum" },
  landmark:   { emoji: "🏛️", gradient: "from-blue-400 to-indigo-500",    label: "Landmark" },
  beach:      { emoji: "🏖️", gradient: "from-cyan-400 to-blue-400",      label: "Beach" },
  nature:     { emoji: "🌿", gradient: "from-green-500 to-teal-500",     label: "Nature" },
  zoo:        { emoji: "🦁", gradient: "from-yellow-400 to-orange-400",  label: "Zoo" },
  aquarium:   { emoji: "🐠", gradient: "from-blue-400 to-cyan-500",      label: "Aquarium" },
  restaurant: { emoji: "🍽️", gradient: "from-red-400 to-orange-400",    label: "Restaurant" },
  viewpoint:  { emoji: "👀", gradient: "from-purple-400 to-pink-400",   label: "Viewpoint" },
  activity:   { emoji: "🎯", gradient: "from-orange-400 to-red-400",    label: "Activity" },
  market:     { emoji: "🏪", gradient: "from-amber-500 to-yellow-400",  label: "Market" },
  garden:     { emoji: "🌸", gradient: "from-pink-400 to-rose-400",     label: "Garden" },
  palace:     { emoji: "🏯", gradient: "from-slate-400 to-gray-500",    label: "Palace" },
  bridge:     { emoji: "🌉", gradient: "from-gray-400 to-slate-500",    label: "Bridge" },
  city:       { emoji: "🏙️", gradient: "from-blue-500 to-indigo-500",   label: "City" },
  culture:    { emoji: "🎭", gradient: "from-purple-500 to-violet-500", label: "Culture" },
};

function getStopConfig(type?: string | null) {
  return STOP_TYPE_CONFIG[type || ""] || { emoji: "📍", gradient: "from-orange-400 to-amber-400", label: type || "Stop" };
}

const PLAN_LOADING_STEPS = [
  { text: "Mapping your route...", emoji: "🗺️" },
  { text: "Finding family-friendly stops...", emoji: "📍" },
  { text: "Balancing the pace for kids...", emoji: "⚖️" },
  { text: "Planning meal breaks...", emoji: "🍽️" },
  { text: "Adding local gems...", emoji: "✨" },
  { text: "Putting it all together...", emoji: "🎉" },
];

const CITY_COORDS: Record<string, [number, number]> = {
  "chicago": [41.8781, -87.6298],
  "new york": [40.7128, -74.0060],
  "nyc": [40.7128, -74.0060],
  "london": [51.5074, -0.1278],
  "paris": [48.8566, 2.3522],
  "rome": [41.9028, 12.4964],
  "tokyo": [35.6762, 139.6503],
  "sydney": [-33.8688, 151.2093],
  "los angeles": [34.0522, -118.2437],
  "miami": [25.7617, -80.1918],
  "san francisco": [37.7749, -122.4194],
  "seattle": [47.6062, -122.3321],
  "boston": [42.3601, -71.0589],
  "washington": [38.9072, -77.0369],
  "denver": [39.7392, -104.9903],
  "las vegas": [36.1699, -115.1398],
  "orlando": [28.5383, -81.3792],
  "barcelona": [41.3851, 2.1734],
  "madrid": [40.4168, -3.7038],
  "amsterdam": [52.3676, 4.9041],
  "berlin": [52.5200, 13.4050],
  "prague": [50.0755, 14.4378],
  "vienna": [48.2082, 16.3738],
  "dubai": [25.2048, 55.2708],
  "singapore": [1.3521, 103.8198],
  "bangkok": [13.7563, 100.5018],
  "hong kong": [22.3193, 114.1694],
  "toronto": [43.6532, -79.3832],
  "vancouver": [49.2827, -123.1207],
  "mexico city": [19.4326, -99.1332],
  "buenos aires": [-34.6037, -58.3816],
  "rio de janeiro": [-22.9068, -43.1729],
  "cape town": [-33.9249, 18.4241],
  "nairobi": [-1.2921, 36.8219],
  "mumbai": [19.0760, 72.8777],
  "delhi": [28.6139, 77.2090],
  "new delhi": [28.6139, 77.2090],
  "bangalore": [12.9716, 77.5946],
  "bengaluru": [12.9716, 77.5946],
  "kolkata": [22.5726, 88.3639],
  "hyderabad": [17.3850, 78.4867],
  "chennai": [13.0827, 80.2707],
  "jaipur": [26.9124, 75.7873],
  "ahmedabad": [23.0225, 72.5714],
  "pune": [18.5204, 73.8567],
  "goa": [15.2993, 74.1240],
  "agra": [27.1767, 78.0081],
  "varanasi": [25.3176, 82.9739],
  "udaipur": [24.5854, 73.7125],
  "amritsar": [31.6340, 74.8723],
  "rishikesh": [30.0869, 78.2676],
  "shimla": [31.1048, 77.1734],
  "manali": [32.2396, 77.1887],
  "darjeeling": [27.0360, 88.2627],
  "ooty": [11.4102, 76.6950],
  "munnar": [10.0889, 77.0595],
  "alleppey": [9.4981, 76.3388],
  "kochi": [9.9312, 76.2673],
  "hampi": [15.3350, 76.4601],
  "mysore": [12.2958, 76.6394],
  "mysuru": [12.2958, 76.6394],
  "coorg": [12.3375, 75.8069],
  "kodaikanal": [10.2381, 77.4892],
  "madurai": [9.9252, 78.1198],
  "mahabalipuram": [12.6269, 80.1927],
  "pondicherry": [11.9416, 79.8083],
  "pushkar": [26.4892, 74.5510],
  "jodhpur": [26.2389, 73.0243],
  "jaisalmer": [26.9157, 70.9083],
  "ranthambore": [26.0173, 76.5026],
  "leh": [34.1526, 77.5771],
  "leh ladakh": [34.1526, 77.5771],
  "ladakh": [34.1526, 77.5771],
  "spiti": [32.2432, 78.0413],
  "kaziranga": [26.5775, 93.1711],
  "khajuraho": [24.8318, 79.9199],
  "aurangabad": [19.8762, 75.3433],
  "beijing": [39.9042, 116.4074],
  "shanghai": [31.2304, 121.4737],
  "seoul": [37.5665, 126.9780],
  "istanbul": [41.0082, 28.9784],
  "athens": [37.9838, 23.7275],
  "lisbon": [38.7223, -9.1393],
  "copenhagen": [55.6761, 12.5683],
  "stockholm": [59.3293, 18.0686],
  "oslo": [59.9139, 10.7522],
  "zurich": [47.3769, 8.5417],
  "munich": [48.1351, 11.5820],
  "florence": [43.7696, 11.2558],
  "venice": [45.4408, 12.3155],
  "edinburgh": [55.9533, -3.1883],
  "dublin": [53.3498, -6.2603],
};

function getPlanningMapCenter(destination: string): [number, number] {
  const lower = destination.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(key)) return coords;
  }
  return [20, 0];
}

function generatePlanningStops(center: [number, number]): [number, number][] {
  const r = 0.026;
  // Zig-zag path: bottom-left → mid-right → upper-left → top-right → top-center
  const configs: Array<[number, number]> = [
    [-1.0, -0.9],
    [-0.3,  0.9],
    [ 0.4, -0.8],
    [ 1.0,  0.8],
    [ 0.7,  0.0],
  ];
  return configs.map(([dy, dx]) => [center[0] + dy * r, center[1] + dx * r * 1.4]);
}

function PlanLoadingScreen({ destination }: { destination: string }) {
  const [step, setStep] = React.useState(0);
  const [activeStop, setActiveStop] = React.useState(0);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const pulseMarkerRef = React.useRef<any>(null);

  React.useEffect(() => {
    const iv = setInterval(() => setStep(p => (p + 1) % PLAN_LOADING_STEPS.length), 2800);
    return () => clearInterval(iv);
  }, []);

  React.useEffect(() => {
    const iv = setInterval(() => setActiveStop(p => (p + 1) % 7), 1800);
    return () => clearInterval(iv);
  }, []);

  const center = React.useMemo(() => getPlanningMapCenter(destination), [destination]);
  const stops = React.useMemo(() => generatePlanningStops(center), [center]);

  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = (L: any) => {
      if (!mapRef.current || mapInstanceRef.current) return;
      (mapRef.current as any)._leaflet_id = undefined;
      let map: any;
      try {
        map = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          touchZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
        });
      } catch {
        return;
      }
      mapInstanceRef.current = map;

      map.setView(center, 13);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19, crossOrigin: true }).addTo(map);

      L.polyline(stops, {
        color: "#f97316",
        weight: 2.5,
        opacity: 0.85,
        dashArray: "8, 6",
      }).addTo(map);

      stops.forEach((pos, i) => {
        const icon = L.divIcon({
          html: `<div style="background:#fff;color:#f97316;font-weight:800;font-size:10px;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid #f97316;box-shadow:0 2px 5px rgba(0,0,0,0.18);">${i + 1}</div>`,
          className: "",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        L.marker(pos, { icon }).addTo(map);
      });

      const pulseIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#f97316;box-shadow:0 0 0 4px rgba(249,115,22,0.3);"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker(stops[0], { icon: pulseIcon }).addTo(map);
      pulseMarkerRef.current = marker;

      const bounds = L.latLngBounds(stops);
      map.fitBounds(bounds, { padding: [28, 28] });
      setTimeout(() => map.invalidateSize(), 120);
    };

    if ((window as any).L) {
      initMap((window as any).L);
    } else {
      const cssId = "leaflet-css-loading";
      if (!document.getElementById(cssId)) {
        const link = document.createElement("link");
        link.id = cssId;
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => {
        setTimeout(() => initMap((window as any).L), 80);
      };
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [stops]);

  React.useEffect(() => {
    if (pulseMarkerRef.current && stops[activeStop]) {
      pulseMarkerRef.current.setLatLng(stops[activeStop]);
    }
  }, [activeStop, stops]);

  return (
    <div className="flex flex-col min-h-screen pt-[10vh]">
      <div className="px-4 mb-1">
        <div ref={mapRef} style={{ width: "100%", height: 220, borderRadius: 18, overflow: "hidden" }} />
      </div>
      <div className="flex flex-col items-center px-6 pt-6 pb-10">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Building your plan</h2>
        <p className="text-sm text-slate-500 mb-6 text-center">
          AI is crafting a personalised itinerary for <span className="font-semibold text-slate-700">{destination.split(",")[0]}</span>
        </p>
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm min-h-[56px] flex items-center justify-center w-full max-w-xs mb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-3"
            >
              <span className="text-2xl">{PLAN_LOADING_STEPS[step].emoji}</span>
              <span className="text-sm font-medium text-slate-700">{PLAN_LOADING_STEPS[step].text}</span>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex justify-center gap-1.5 mb-4">
          {PLAN_LOADING_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === step ? "w-4 bg-orange-500" : "w-1.5 bg-orange-200"}`}
            />
          ))}
        </div>
        <p className="text-xs text-slate-400 text-center">Building your plan… almost there. Don't close this screen.</p>
      </div>
    </div>
  );
}

function PlanStopImage({ stopName, cityName, stopType, country, cfg }: {
  stopName: string;
  cityName: string | null | undefined;
  stopType: string | null | undefined;
  country: string | null | undefined;
  cfg: { emoji: string; gradient: string };
}) {
  const { image, isGenerated } = useOnDemandStopImage(stopName, cityName, stopType, country);
  const [imgErr, setImgErr] = React.useState(false);
  if (!imgErr && image) {
    return (
      <>
        <img src={image} alt={stopName} className="absolute inset-0 w-full h-full object-cover" onError={() => setImgErr(true)} />
        {isGenerated && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 z-10">
            <Sparkles className="w-2.5 h-2.5 text-white/80" />
            <span className="text-[9px] font-medium text-white/80 leading-none">AI illustration</span>
          </div>
        )}
      </>
    );
  }
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
      <span className="text-3xl">{cfg.emoji}</span>
    </div>
  );
}

function StopThumb({ stopName, cityName, stopType, country, cfg, fullHeight = false }: {
  stopName: string;
  cityName: string | null | undefined;
  stopType: string | null | undefined;
  country: string | null | undefined;
  cfg: { emoji: string; gradient: string };
  fullHeight?: boolean;
}) {
  const { image, isGenerated } = useOnDemandStopImage(stopName, cityName, stopType, country);
  const [imgError, setImgError] = React.useState(false);

  if (fullHeight) {
    return (
      <div className="shrink-0 self-stretch overflow-hidden relative" style={{ width: 80 }}>
        {!imgError && image ? (
          <>
            <img src={image} alt={stopName} className="w-full h-full object-cover" onError={() => setImgError(true)} />
            {isGenerated && (
              <div className="absolute bottom-1 left-0 right-0 flex justify-center">
                <span className="bg-black/50 text-white/80 text-[8px] leading-none px-1.5 py-0.5 rounded-full font-medium">AI</span>
              </div>
            )}
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
            <span className="text-3xl">{cfg.emoji}</span>
          </div>
        )}
      </div>
    );
  }
  if (!imgError && image) {
    return (
      <div className="w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 relative">
        <img
          src={image}
          alt={stopName}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        {isGenerated && (
          <div className="absolute bottom-1 left-0 right-0 flex justify-center">
            <span className="bg-black/50 text-white/80 text-[8px] leading-none px-1.5 py-0.5 rounded-full font-medium">AI</span>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`w-[72px] h-[72px] rounded-xl shrink-0 bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
      <span className="text-2xl">{cfg.emoji}</span>
    </div>
  );
}

function DetailStopImage({ stop, cfg, city, country }: {
  stop: TravelStop;
  cfg: { emoji: string; gradient: string };
  city: string | null;
  country: string | null;
}) {
  const { image, isGenerated } = useOnDemandStopImage(stop.name, city, stop.stopType, country);
  const [imgErr, setImgErr] = React.useState(false);
  return (
    <div className={`relative h-52 bg-gradient-to-br ${cfg.gradient} overflow-hidden`}>
      {!imgErr && image ? (
        <img src={image} alt={stop.name} className="absolute inset-0 w-full h-full object-cover" onError={() => setImgErr(true)} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <span className="text-[80px] leading-none select-none">{cfg.emoji}</span>
        </div>
      )}
      {!imgErr && image && <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />}
      {!imgErr && image && isGenerated && (
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 z-10">
          <Sparkles className="w-3 h-3 text-white/75" />
          <span className="text-[10px] font-medium text-white/75 leading-none">AI illustration · not a real photo</span>
        </div>
      )}
    </div>
  );
}

function formatDuration(minutes: number | null | undefined): string {
  const m = minutes || 75;
  if (m <= 30) return "Quick stop";
  if (m <= 50) return "~45 min";
  if (m <= 70) return "~1 hr";
  if (m <= 90) return "1–1.5 hrs";
  if (m <= 110) return "~1.5 hrs";
  if (m <= 150) return "1.5–2 hrs";
  return `~${Math.round(m / 60)}+ hrs`;
}

function getStopContextLine(stopType?: string | null, description?: string | null): string {
  const h = new Date().getHours();
  const isMorning = h < 12;
  const isAfternoon = h >= 12 && h < 17;
  const isEvening = h >= 17;
  const lines: Record<string, { morning: string; afternoon: string; evening: string }> = {
    zoo:       { morning: "Best now — animals most active in the morning", afternoon: "Great after lunch — less crowded than the AM rush", evening: "Check closing time — animals wind down early" },
    museum:    { morning: "Best before noon — exhibits quieter, kids more focused", afternoon: "Good timing — indoor stop perfect for midday heat", evening: "Quick win — most exhibits easy to explore fast" },
    park:      { morning: "Peaceful now — best time before crowds arrive", afternoon: "Great energy stop — kids can run and reset", evening: "Golden hour — beautiful light for family photos" },
    aquarium:  { morning: "Arrive early — underwater galleries less crowded now", afternoon: "Great after lunch — cool, calm indoor experience", evening: "Quieter now — feeding sessions often happen late" },
    landmark:  { morning: "Best light now for photos — beat the tour groups", afternoon: "Quick win — easy stop, great for a visual break", evening: "Stunning at dusk — allow extra time for photos" },
    beach:     { morning: "Best now — cooler and less crowded", afternoon: "Busy but fun — grab snacks before you go", evening: "Perfect timing — golden hour on the water" },
    viewpoint: { morning: "Clearest views in the morning — fewer visitors", afternoon: "Great photo stop — allow 15–20 min", evening: "Spectacular at sunset — worth the stop" },
    market:    { morning: "Freshest produce and shortest queues right now", afternoon: "Peak buzz — great atmosphere but busier", evening: "Wind-down prices — great time to browse" },
    palace:    { morning: "Quietest now — audio tours are excellent here", afternoon: "Good timing — indoor exploration at its best", evening: "Check closing time — allow at least 60 min" },
    garden:    { morning: "Dewey and peaceful — best light of the day", afternoon: "Perfect outdoor breather mid-day", evening: "Gorgeous at golden hour — bring the camera" },
    activity:  { morning: "Book ahead — slots fill up fast for morning sessions", afternoon: "Peak fun — energy levels are high", evening: "Check closing — book ahead to guarantee your spot" },
    culture:   { morning: "Guided tours fill up — book or arrive early", afternoon: "Bring the history to life — kids love the interactives", evening: "Great indoor wind-down for the end of the day" },
    nature:    { morning: "Best visibility and cooler temps right now", afternoon: "Pack water and sunscreen — stays warm out here", evening: "Golden hour is magical — don't miss it" },
    restaurant: { morning: "Great brunch spot — usually quieter at this hour", afternoon: "Perfect lunch timing — kid-friendly and fast", evening: "Dinner rush — book ahead or arrive early" },
    city:      { morning: "Streets are calm now — best for exploring on foot", afternoon: "Busy but vibrant — lots to discover around every corner", evening: "Great evening atmosphere — hidden gems come alive" },
  };
  const row = lines[stopType || ""];
  if (row) return isMorning ? row.morning : isAfternoon ? row.afternoon : row.evening;
  return isMorning ? "Great time to visit — quieter before the main crowds" : isAfternoon ? "Good afternoon stop — allow extra time to explore" : "Check closing time — allow at least 30 min";
}

type MainTabId = "trip_plan" | "todays_plan" | "current" | "memories" | "passes";
type ViewMode = "parent" | "kid";
type AddPassStep = "choose" | "screenshot" | "upload" | "confirmation";


type ParkingInfo = {
  state: "easy" | "normal" | "risky" | "bad";
  label: string;
  emoji: string;
};

function getParkingInfo(stopName: string, stopType?: string | null, city?: string | null): ParkingInfo | null {
  const name = stopName.toLowerCase();
  const type = (stopType || "").toLowerCase();
  const majorCities = ["new york", "nyc", "chicago", "washington", "boston", "san francisco", "los angeles", "seattle", "miami", "las vegas", "paris", "london", "rome", "tokyo", "barcelona"];
  const isMajorCity = majorCities.some(c => (city || "").toLowerCase().includes(c));

  // Outdoor parks/nature — only show if notable enough to drive to
  if (["park", "beach", "garden"].includes(type)) {
    if (name.includes("national") || name.includes("state park") || name.includes("conservation")) {
      return { state: "easy", label: "Free parking", emoji: "🅿️" };
    }
    return null; // smaller parks — skip parking noise
  }
  if (type === "nature") {
    return { state: "easy", label: "Free parking", emoji: "🅿️" };
  }

  // Walking districts / neighborhoods
  if (type === "neighborhood" || name.includes("downtown") || name.includes("strip") || name.includes("old town") || name.includes("fremont")) {
    return { state: "risky", label: "Limited parking — arrive early", emoji: "⚠️" };
  }

  // Famous crowded spots
  if (name.includes("times square") || name.includes("pike place") || name.includes("national mall") || name.includes("hollywood") || name.includes("bourbon street")) {
    return { state: "bad", label: "No easy parking — use transit", emoji: "🚫" };
  }

  // Museums
  if (type === "museum" || name.includes("museum") || name.includes("gallery") || name.includes("smithsonian")) {
    return isMajorCity
      ? { state: "risky", label: "Limited parking", emoji: "⚠️" }
      : { state: "normal", label: "Parking available", emoji: "🅿️" };
  }

  // Aquariums & zoos
  if (type === "aquarium" || type === "zoo" || name.includes("aquarium") || name.includes("zoo")) {
    return { state: "normal", label: "Parking available", emoji: "🅿️" };
  }

  // Theme parks
  if (type === "theme_park" || name.includes("disney") || name.includes("universal") || name.includes("legoland") || name.includes("seaworld")) {
    return { state: "normal", label: "Paid parking available", emoji: "🅿️" };
  }

  // Landmarks and general attractions
  if (["attraction", "landmark", "monument", "experience"].includes(type) || name.includes("tower") || name.includes("bridge") || name.includes("castle")) {
    return isMajorCity
      ? { state: "normal", label: "Paid parking nearby", emoji: "🅿️" }
      : { state: "easy", label: "Free parking", emoji: "🅿️" };
  }

  // Restaurant, cafe, food
  if (["restaurant", "cafe", "food", "market"].includes(type)) {
    return null; // usually not relevant enough
  }

  // Show-worthy venues (sporting arenas, theaters, etc.)
  if (name.includes("arena") || name.includes("stadium") || name.includes("theater") || name.includes("theatre")) {
    return { state: "risky", label: "Limited parking on busy days", emoji: "⚠️" };
  }

  return null; // default: don't clutter
}


const ADVENTURE_STYLES: Record<string, string> = {
  family_explorer: "Family Highlights",
  nature_expedition: "Nature Expedition",
  history_culture: "History & Culture",
  iconic_highlights: "Iconic Spots",
  foodie_adventure: "Foodie Adventure",
  city_explorer: "City Explorer",
};

// ─── Timeline helpers ───────────────────────────────────────────────────────

type MealRec = { name: string; cuisine: string; description: string; priceLevel: number; kidFriendlyNote: string; walkTime?: string };

type TimelineItem =
  | { kind: "breakfast" }
  | { kind: "stop"; stop: TravelStop; time: string; endTime: string }
  | { kind: "meal"; mealType: "lunch" | "snack"; time: string; beforeStop: TravelStop | null; afterStop: TravelStop | null }
  | { kind: "anchor_pin"; anchor: AnchorInput; time: string; endTime: string; session: "morning" | "afternoon" | "evening" | "other" };

function fmtTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function estDuration(stopType?: string | null): number {
  const map: Record<string, number> = {
    museum: 180, aquarium: 120, zoo: 150, park: 75, nature: 75,
    garden: 75, beach: 90, landmark: 60, viewpoint: 45, bridge: 30,
    restaurant: 75, market: 60, activity: 90, culture: 75,
    cruise: 150, boat: 150, ferry: 90, boat_trip: 150,
  };
  return map[stopType || ""] || 60;
}

const FOOD_STOP_TYPES = ["restaurant", "food", "cafe", "market", "street_food"];
const OUTDOOR_STOP_TYPES_W = new Set(["park","beach","nature","zoo","playground","garden","viewpoint","outdoor_market","adventure","hiking","waterfall","nature_reserve","open_air"]);

function buildTimeline(stops: TravelStop[], _lunchAfterOverride?: number, dayAnchors?: AnchorInput[]): TimelineItem[] {
  if (stops.length === 0 && (!dayAnchors || dayAnchors.length === 0)) return [{ kind: "breakfast" }];

  const hasFoodStop = stops.some(s => FOOD_STOP_TYPES.includes(s.stopType || ""));

  // ── Session windows (minutes from midnight) ─────────────────────────────────
  const MORNING_START   = 9 * 60 + 30;  // 9:30 AM
  const MORNING_END     = 12 * 60 + 30; // 12:30 PM (180 min window)
  const LUNCH_DURATION  = 75;
  const AFTERNOON_START = 13 * 60 + 30; // 1:30 PM
  const AFTERNOON_END   = 16 * 60 + 30; // 4:30 PM (180 min window)
  const SNACK_DURATION  = 30;
  const EVENING_START   = 17 * 60;      // 5:00 PM
  const EVENING_END     = 19 * 60;      // 7:00 PM (120 min window)
  const DAY_CEILING     = 20 * 60;      // 8:00 PM absolute ceiling
  const TRAVEL_BUFFER   = 40;           // 20 min travel + 20 min family buffer

  // ── Parse anchor times and narrow effective session windows ─────────────────
  // anchors with specific times get pinned in the timeline and reduce the
  // available minutes in their session so surrounding stops don't overlap them.
  function _parseMins(hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  type AnchorPin = { anchor: AnchorInput; tMins: number; endMins: number; session: "morning" | "afternoon" | "evening" | "other" };
  const anchorPins: AnchorPin[] = [];
  // Effective (possibly narrowed) session limits
  let effMorningEnd     = MORNING_END;
  let effAfternoonStart = AFTERNOON_START;
  let effAfternoonEnd   = AFTERNOON_END;
  let effEveningStart   = EVENING_START;

  if (dayAnchors && dayAnchors.length > 0) {
    for (const a of dayAnchors) {
      if (!a.time) continue;
      const tMins  = _parseMins(a.time);
      const dur    = a.durationMinutes || 90;
      const endMin = tMins + dur;

      let session: AnchorPin["session"] = "other";
      if (tMins < MORNING_END)                              session = "morning";
      else if (tMins >= AFTERNOON_START && tMins < AFTERNOON_END) session = "afternoon";
      else if (tMins >= EVENING_START)                      session = "evening";
      anchorPins.push({ anchor: a, tMins, endMins: endMin, session });

      // Narrow session windows so generated stops don't clash with anchor slot
      if (session === "morning") {
        // Truncate morning — stops must end before anchor (with buffer)
        effMorningEnd   = Math.min(effMorningEnd, tMins - TRAVEL_BUFFER);
        // Afternoon can only start after anchor ends
        effAfternoonStart = Math.max(effAfternoonStart, endMin + TRAVEL_BUFFER);
      } else if (session === "afternoon") {
        // Truncate afternoon — stops before anchor must finish with buffer
        effAfternoonEnd   = Math.min(effAfternoonEnd, tMins - TRAVEL_BUFFER);
        // Evening can only start after anchor ends
        effEveningStart   = Math.max(effEveningStart, endMin + TRAVEL_BUFFER);
      } else if (session === "evening") {
        // Stops before anchor: evening starts from effEveningStart but can't go past anchor
        effEveningStart = Math.max(effEveningStart, EVENING_START);
      }
    }
  }

  // ── Duration: read from metadata first, then stopType estimate ─────────────
  const getStopDur = (stop: TravelStop): number => {
    const meta = (stop.metadata as Record<string, unknown> | null | undefined);
    const md = meta?.durationMinutes;
    if (typeof md === "number" && md > 0) return md;
    return (stop as any).durationMinutes || estDuration(stop.stopType);
  };

  // ── Drop priority: from metadata, with hard protection for user-created stops ──
  const getDropPri = (stop: TravelStop): number => {
    const meta = (stop.metadata as Record<string, unknown> | null | undefined);
    // metadata === null → stop was user-created or pre-booked → NEVER drop (return 1)
    // This protects manual stops, hard anchors (pre-booked reservations), and
    // soft anchors (user-added restaurants, activities) from session overflow removal.
    if (!meta) return 1;
    const dp = meta.dropPriority;
    if (typeof dp === "number") return dp;
    // Has metadata (AI-generated with session data) but no explicit dropPriority →
    // infer by type. These are AI stops — safe to drop if session overflows.
    const t = stop.stopType || "";
    if (["museum", "zoo", "aquarium", "palace"].includes(t)) return 2;
    if (["restaurant", "street_food", "food", "market"].includes(t)) return 3;
    if (["viewpoint", "bridge", "plaza"].includes(t)) return 3;
    if (t === "temple") return 4;
    return 3;
  };

  // ── Session fit: from metadata or inferred by type/position ───────────────
  const inferSession = (stop: TravelStop, idx: number, total: number): "morning" | "afternoon" | "evening" => {
    const meta = (stop.metadata as Record<string, unknown> | null | undefined);
    const fit = meta?.sessionFit as string | undefined;
    if (fit === "morning") return "morning";
    if (fit === "afternoon") return "afternoon";
    if (fit === "evening") return "evening";
    const t = stop.stopType || "";
    // Natural evening types
    if (["market", "street_food", "food", "restaurant"].includes(t)) return "evening";
    // Heavy attractions → morning
    if (["museum", "zoo", "aquarium", "palace"].includes(t)) return idx < total * 0.5 ? "morning" : "afternoon";
    // Nature/viewpoints → morning
    if (["beach", "nature", "mountain", "waterfall", "viewpoint"].includes(t) && idx < total * 0.4) return "morning";
    // Position-based fallback
    const thirds = total / 3;
    if (idx < thirds) return "morning";
    if (idx < thirds * 2) return "afternoon";
    return "evening";
  };

  // ── Assign stops to sessions ────────────────────────────────────────────────
  const morningGroup: TravelStop[] = [];
  const afternoonGroup: TravelStop[] = [];
  const eveningGroup: TravelStop[] = [];
  stops.forEach((stop, idx) => {
    const s = inferSession(stop, idx, stops.length);
    if (s === "morning") morningGroup.push(stop);
    else if (s === "afternoon") afternoonGroup.push(stop);
    else eveningGroup.push(stop);
  });

  // ── Fit stops into session window — NEVER drop stops the user placed ────────
  // All stops are always kept so Trip Plan always shows the same stops as Timeline.
  // The "day may feel rushed" warning (shown in Compare Days) handles the UX concern.
  const fitSession = (group: TravelStop[], _windowMins: number): TravelStop[] => {
    return group;
  };

  // Use effective (anchor-narrowed) windows so stops don't crowd anchor slots
  const morning   = fitSession(morningGroup,   Math.max(0, effMorningEnd - MORNING_START));
  const afternoon = fitSession(afternoonGroup, Math.max(0, effAfternoonEnd - effAfternoonStart));
  const evening   = fitSession(eveningGroup,   Math.max(0, EVENING_END - effEveningStart));

  // ── Schedule each session starting at its window start ────────────────────
  type Scheduled = { stop: TravelStop; startMins: number; endMins: number; session: "morning" | "afternoon" | "evening" };
  const scheduled: Scheduled[] = [];

  // Morning: starts at MORNING_START — no hard ceiling so all stops always schedule
  let cur = MORNING_START;
  morning.forEach((stop, i) => {
    if (i > 0) cur += TRAVEL_BUFFER;
    if (cur >= DAY_CEILING) return;
    const dur = getStopDur(stop);
    scheduled.push({ stop, startMins: cur, endMins: Math.min(cur + dur, DAY_CEILING), session: "morning" });
    cur += dur;
  });

  // Afternoon: starts at effAfternoonStart (may be pushed back by morning anchor)
  const morningEndActual = scheduled.filter(s => s.session === "morning").reduce((m, s) => Math.max(m, s.endMins), MORNING_START);
  cur = Math.max(effAfternoonStart, morningEndActual + LUNCH_DURATION);
  afternoon.forEach((stop, i) => {
    if (i > 0) cur += TRAVEL_BUFFER;
    if (cur >= DAY_CEILING) return;
    const dur = getStopDur(stop);
    scheduled.push({ stop, startMins: cur, endMins: Math.min(cur + dur, DAY_CEILING), session: "afternoon" });
    cur += dur;
  });

  // Evening: starts at effEveningStart (may be pushed back by afternoon anchor)
  const afternoonEndActual = scheduled.filter(s => s.session === "afternoon").reduce((m, s) => Math.max(m, s.endMins), cur);
  cur = Math.max(effEveningStart, afternoonEndActual + SNACK_DURATION);
  evening.forEach((stop, i) => {
    if (i > 0) cur += TRAVEL_BUFFER;
    if (cur >= DAY_CEILING) return;
    const dur = getStopDur(stop);
    scheduled.push({ stop, startMins: cur, endMins: Math.min(cur + dur, DAY_CEILING), session: "evening" });
    cur += dur;
  });

  // ── Collect all timed items (stops + anchor pins) and sort by start time ────
  type TimedItem =
    | { kind: "stop_s"; s: typeof scheduled[0] }
    | { kind: "anchor_s"; p: typeof anchorPins[0] };
  const allTimed: TimedItem[] = [
    ...scheduled.map(s => ({ kind: "stop_s" as const, s })),
    ...anchorPins.map(p => ({ kind: "anchor_s" as const, p })),
  ];
  allTimed.sort((a, b) => {
    const ta = a.kind === "stop_s" ? a.s.startMins : a.p.tMins;
    const tb = b.kind === "stop_s" ? b.s.startMins : b.p.tMins;
    return ta - tb;
  });

  // ── Build final timeline items (time-sorted stops + anchor pins) ─────────────
  const items: TimelineItem[] = [{ kind: "breakfast" }];
  const morningItems   = scheduled.filter(s => s.session === "morning");
  const afternoonItems = scheduled.filter(s => s.session === "afternoon");
  const eveningItems   = scheduled.filter(s => s.session === "evening");

  // Lunch gap point (after morning, before afternoon)
  const lunchTime = morningItems.length > 0
    ? morningItems[morningItems.length - 1].endMins
    : MORNING_END;
  let lunchInserted = false;
  // Snack gap point (after afternoon, before evening)
  const snackTime = afternoonItems.length > 0
    ? afternoonItems[afternoonItems.length - 1].endMins
    : effAfternoonEnd;
  let snackInserted = false;

  for (const ti of allTimed) {
    if (ti.kind === "anchor_s") {
      const { anchor, tMins, endMins, session } = ti.p;
      // Insert lunch placeholder before anchor if it falls in the lunch window
      if (!lunchInserted && tMins >= lunchTime && !hasFoodStop && (morningItems.length > 0 || afternoonItems.length > 0)) {
        const beforeStop = morningItems.length > 0 ? morningItems[morningItems.length - 1].stop : null;
        const afterStop  = afternoonItems.length > 0 ? afternoonItems[0].stop : null;
        items.push({ kind: "meal", mealType: "lunch", time: fmtTime(lunchTime), beforeStop, afterStop });
        lunchInserted = true;
      }
      items.push({ kind: "anchor_pin", anchor, time: fmtTime(tMins), endTime: fmtTime(endMins), session });
    } else {
      const { stop, startMins, endMins, session: sess } = ti.s;
      // Insert lunch before first afternoon stop
      if (!lunchInserted && sess === "afternoon" && !hasFoodStop && (morningItems.length > 0 || afternoonItems.length > 0)) {
        const beforeStop = morningItems.length > 0 ? morningItems[morningItems.length - 1].stop : null;
        const afterStop  = afternoonItems[0].stop;
        items.push({ kind: "meal", mealType: "lunch", time: fmtTime(lunchTime), beforeStop, afterStop });
        lunchInserted = true;
      }
      // Insert snack before first evening stop
      if (!snackInserted && sess === "evening" && !hasFoodStop && afternoonItems.length > 0 && eveningItems.length > 0) {
        const beforeStop = afternoonItems[afternoonItems.length - 1].stop;
        const afterStop  = eveningItems[0].stop;
        items.push({ kind: "meal", mealType: "snack", time: fmtTime(snackTime), beforeStop, afterStop });
        snackInserted = true;
      }
      items.push({ kind: "stop", stop, time: fmtTime(startMins), endTime: fmtTime(endMins) });
    }
  }

  // If lunch wasn't inserted yet (morning-only or anchor-only day), add it if needed
  if (!lunchInserted && !hasFoodStop && (morningItems.length > 0 || afternoonItems.length > 0)) {
    const beforeStop = morningItems.length > 0 ? morningItems[morningItems.length - 1].stop : null;
    const afterStop  = afternoonItems.length > 0 ? afternoonItems[0].stop : null;
    items.push({ kind: "meal", mealType: "lunch", time: fmtTime(lunchTime), beforeStop, afterStop });
  }

  return items;
}

function RouteMap({ stops, destination }: { stops: TravelStop[]; destination?: string | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeMapMountedRef = useRef(true);

  useEffect(() => {
    routeMapMountedRef.current = true;
    return () => { routeMapMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);

    const initMap = (L: any) => {
      if (!routeMapMountedRef.current) return;
      const container = mapRef.current;
      if (!container) return;
      // Clear stale Leaflet state
      (container as any)._leaflet_id = undefined;

      let center: [number, number] = [20, 0];
      let zoom = 2;

      if (stopsWithCoords.length > 0) {
        center = [Number(stopsWithCoords[0].latitude), Number(stopsWithCoords[0].longitude)];
        zoom = stopsWithCoords.length === 1 ? 13 : 11;
      }

      let map: any;
      try {
        map = L.map(container, { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: false });
      } catch {
        return;
      }
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      map.setView(center, zoom);

      if (stopsWithCoords.length > 0) {
        const latlngs: [number, number][] = stopsWithCoords.map(s => [Number(s.latitude), Number(s.longitude)]);

        L.polyline(latlngs, {
          color: "#f97316",
          weight: 2,
          opacity: 0.7,
          dashArray: "6, 6",
        }).addTo(map);

        stopsWithCoords.forEach((stop, i) => {
          const icon = L.divIcon({
            html: `<div style="background:#f97316;color:#fff;font-weight:bold;font-size:11px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${i + 1}</div>`,
            className: "",
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
          L.marker([Number(stop.latitude), Number(stop.longitude)], { icon })
            .addTo(map)
            .bindPopup(stop.name);
        });

        if (stopsWithCoords.length > 1) {
          const bounds = L.latLngBounds(latlngs);
          map.fitBounds(bounds, { padding: [24, 24] });
        }
      }
    };

    if ((window as any).L) {
      initMap((window as any).L);
    } else {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap((window as any).L);
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [stops.length]);

  const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);

  if (stopsWithCoords.length === 0) {
    return (
      <div className="h-48 bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col items-center justify-center gap-2">
        <MapPin className="w-8 h-8 text-orange-300" />
        <p className="text-sm font-semibold text-gray-500">{destination}</p>
        <p className="text-xs text-gray-400">{stops.length} stops planned</p>
      </div>
    );
  }

  return <div ref={mapRef} style={{ height: "220px", width: "100%" }} />;
}

export default function ParentPlanView() {
  const [, params] = useRoute("/adventure/:tripId/parent-plan");
  const tripId = params?.tripId || "";
  const [, navigate] = useLocation();

  const { trips, currentTrip, currentTripStops, currentTripMoments, fetchTrip, fetchTrips, markStopVisited, addStop, deleteStop, saveMoment, toggleFavorite, deleteMoment } = useTravel();
  const { user, isLoading: userLoading } = useUser();
  const { paywallEnabled } = useFeatureFlags();
  const [showGuestTabPrompt, setShowGuestTabPrompt] = useState(false);
  const [showPaywallTabPrompt, setShowPaywallTabPrompt] = useState(false);
  const [showGuestSignup, setShowGuestSignup] = useState(false);

  const [activeTab, setActiveTab] = useState<MainTabId>("trip_plan");
  const [fromExecution, setFromExecution] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("parent");
  const [activeDay, setActiveDay] = useState(0);
  const [openStopMenu, setOpenStopMenu] = useState<string | null>(null);
  const [moveStopSheet, setMoveStopSheet] = useState<{
    show: boolean;
    stop: TravelStop | null;
    step: "pick_day" | "pick_method" | "pick_replace";
    targetDayIdx: number | null;
    isMoving: boolean;
  }>({ show: false, stop: null, step: "pick_day", targetDayIdx: null, isMoving: false });
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const [selectedDetailStop, setSelectedDetailStop] = useState<TravelStop | null>(null);
  const [forcedCurrentStop, setForcedCurrentStop] = useState<TravelStop | null>(null);
  const [stopExploreData, setStopExploreData] = useState<any>(null);
  const [stopExploreLoading, setStopExploreLoading] = useState(false);
  const [showMapCollapse, setShowMapCollapse] = useState(false);
  const [mapCollapseReady, setMapCollapseReady] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [tripSettings, setTripSettings] = useState<TripSettings | null>(null);
  const [settingsBanner, setSettingsBanner] = useState<{ msg: string; impact: ChangeImpact } | null>(null);
  const [showTodayRouteMap, setShowTodayRouteMap] = useState(false);
  const [showTodayFullMap, setShowTodayFullMap] = useState(false);
  const [showTodayInlineMap, setShowTodayInlineMap] = useState(false);
  const [todayNeedState, setTodayNeedState] = useState<string | null>(null);
  const [showNeedPanel, setShowNeedPanel] = useState(false);
  const [startedDaySet, setStartedDaySet] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('geoquest_started_days') || '[]')); } catch { return new Set(); }
  });
  const [lunchPositionOverrides, setLunchPositionOverrides] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('geoquest_lunch_positions') || '{}'); } catch { return {}; }
  });
  const [freedSlotsMap, setFreedSlotsMap] = useState<Record<string, Array<{ label: string; minutes: number }>>>(() => {
    try { return JSON.parse(localStorage.getItem('geoquest_freed_slots') || '{}'); } catch { return {}; }
  });
  const [todayAdjustment, setTodayAdjustment] = useState<string | null>(null);
  const [currentTabExploreData, setCurrentTabExploreData] = useState<any>(null);
  const [currentTabExploreLoading, setCurrentTabExploreLoading] = useState(false);
  const [collapsedPassSections, setCollapsedPassSections] = useState<Set<string>>(new Set(["later"]));
  const [showBeforeYouGoSheet, setShowBeforeYouGoSheet] = useState(false);
  const [beforeYouGoStop, setBeforeYouGoStop] = useState<TravelStop | null>(null);
  const [showStartDayFlow, setShowStartDayFlow] = useState(false);
  const [startDayFlowStep, setStartDayFlowStep] = useState<"readiness" | "fix" | "execution">("readiness");
  const [roughDaySheetOpen, setRoughDaySheetOpen] = useState(false);
  const [helpNowOpen, setHelpNowOpen] = useState(false);
  const [roughDayProcessing, setRoughDayProcessing] = useState<string | null>(null);
  const [showFoodSheet, setShowFoodSheet] = useState(false);
  const [dismissedInlineSuggestion, setDismissedInlineSuggestion] = useState(false);
  const [rescuePanelOpen, setRescuePanelOpen] = useState(false);
  const [showStopDetails, setShowStopDetails] = useState(false);
  const [detailsStopOverride, setDetailsStopOverride] = useState<TravelStop | null>(null);
  const [showStopQuickSheet, setShowStopQuickSheet] = useState(false);
  const [quickSheetStop, setQuickSheetStop] = useState<TravelStop | null>(null);
  const [detailsGettingThereOpen, setDetailsGettingThereOpen] = useState(false);
  const [detailsReviewsOpen, setDetailsReviewsOpen] = useState(false);
  const [detailsNearbySheet, setDetailsNearbySheet] = useState<"food" | "breaks" | "kids" | null>(null);
  const [stopHeroImage, setStopHeroImage] = useState<string | null>(null);
  const [stopHeroImageLoading, setStopHeroImageLoading] = useState(false);
  const [skippedStopIds, setSkippedStopIds] = useState<string[]>([]);
  const [confirmSkipNext, setConfirmSkipNext] = useState<TravelStop | null>(null);
  // Undo-based remove state
  const [anchorCalloutStop, setAnchorCalloutStop] = useState<TravelStop | null>(null);
  const [stopsRemovedCount, setStopsRemovedCount] = useState(0);
  const [multiRemoveBannerDismissed, setMultiRemoveBannerDismissed] = useState(false);
  const needSectionRef = useRef<HTMLDivElement>(null);
  const [dragStopId, setDragStopId] = useState<string | null>(null);
  const [dragOverStopId, setDragOverStopId] = useState<string | null>(null);
  const [crossDayDragStopId, setCrossDayDragStopId] = useState<string | null>(null);
  const [crossDayDropDayIdx, setCrossDayDropDayIdx] = useState<number | null>(null);
  const [dismissedParkingAlerts, setDismissedParkingAlerts] = useState<string[]>([]);
  const [parkingSheet, setParkingSheet] = useState<{ stopId: string; stopName: string } | null>(null);
  const [parkingAddresses, setParkingAddresses] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("geoquest_parking_addresses") || "{}"); } catch { return {}; }
  });
  const [parkingInputValue, setParkingInputValue] = useState("");
  const touchDragIdRef = useRef<string | null>(null);
  const touchDragOverIdRef = useRef<string | null>(null);
  const touchReorderRef = useRef<(dropId: string, srcId: string) => void>(() => {});
  const [showCompareDays, setShowCompareDays] = useState(false);
  const [compareDaysView, setCompareDaysView] = useState<"summary" | "timeline">("summary");
  const [selectedCompareDay, setSelectedCompareDay] = useState<number | null>(null);
  const [fixDayDiagnosisSheet, setFixDayDiagnosisSheet] = useState<{ dayIdx: number; stops: TravelStop[]; cityName: string; score: number } | null>(null);
  const [fixEntireTripStep, setFixEntireTripStep] = useState<null | "diagnosis" | "options" | "applying" | "changes" | "success">(null);
  const [fixEntireTripStrategy, setFixEntireTripStrategy] = useState<null | "balanced" | "relaxed" | "flow" | "light_touch">(null);
  const [fixEntireTripProposal, setFixEntireTripProposal] = useState<{ dayIdx: number; cityName: string; stopsToRemove: { id: string; name: string; reason: string }[] }[]>([]);
  const [eveningSectionExpanded, setEveningSectionExpanded] = useState(true);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const todayTabDayInitialized = useRef(false);
  const [showFinishCelebration, setShowFinishCelebration] = useState(false);
  const [finishStopsLeft, setFinishStopsLeft] = useState(0);
  const [isFinishingAdventure, setIsFinishingAdventure] = useState(false);
  const [showReadinessSheet, setShowReadinessSheet] = useState(false);
  const [showFixItSheet, setShowFixItSheet] = useState(false);
  const [fixItDate, setFixItDate] = useState("");
  const [fixItSaving, setFixItSaving] = useState(false);
  const [revisitSheetStop, setRevisitSheetStop] = useState<TravelStop | null>(null);

  // ── Anchors ────────────────────────────────────────────────────────────────
  const [tripAnchors, setTripAnchors] = useState<AnchorInput[]>([]);
  const [anchorSheetOpen, setAnchorSheetOpen] = useState(false);
  const [anchorSaveAnim, setAnchorSaveAnim] = useState<{
    phase: 'saving' | 'adjusting' | 'reshuffling' | 'done';
    name: string;
    time?: string;
  } | null>(null);
  const [editingAnchorIdx, setEditingAnchorIdx] = useState<number | null>(null);
  const [editAnchorTime, setEditAnchorTime] = useState("");
  const [editAnchorDay, setEditAnchorDay] = useState(1);
  // ── Soft wishes ────────────────────────────────────────────────────────────
  const [softWishes, setSoftWishes] = useState<string[]>(() => {
    try { const s = localStorage.getItem(`soft-wishes-${tripId}`); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [softWishInput, setSoftWishInput] = useState("");
  const [showSoftWishInput, setShowSoftWishInput] = useState(false);

  const [removedStopsHistory, setRemovedStopsHistory] = useState<{ id: string; name: string; stopType: string; address?: string; lat?: number; lon?: number; durationMinutes?: number; parkingNotes?: string; requiresBooking?: boolean; entryCost?: string }[]>(() => {
    try { const s = localStorage.getItem(`removed-stops-${tripId}`); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const saveRemovedStop = (stop: TravelStop) => {
    setRemovedStopsHistory(prev => {
      if (prev.some(r => r.id === stop.id)) return prev;
      const next = [{ id: stop.id, name: stop.name, stopType: stop.stopType, address: (stop as any).address, lat: (stop as any).latitude ? Number((stop as any).latitude) : undefined, lon: (stop as any).longitude ? Number((stop as any).longitude) : undefined, durationMinutes: stop.durationMinutes ?? undefined, parkingNotes: (stop as any).parkingNotes ?? undefined, requiresBooking: (stop as any).requiresBooking ?? undefined, entryCost: (stop as any).entryCost ?? undefined }, ...prev];
      try { localStorage.setItem(`removed-stops-${tripId}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [confirmRemoveDialog, setConfirmRemoveDialog] = useState<{ stopNames: string[]; onConfirm: () => void } | null>(null);

  // 1-tap remove with undo
  // Typed payload for stop restoration — captures runtime-enriched fields beyond schema type
  type StopUndoPayload = {
    name: string;
    stopType: string | null;
    address: string | null | undefined;
    latitude: string | null | undefined;
    longitude: string | null | undefined;
    durationMinutes: number | null | undefined;
    entryCost: string | null | undefined;
    cityGroup: string | null | undefined;
    insertAtOrder: number;
  };

  const buildUndoPayload = (stop: TravelStop): StopUndoPayload => {
    // TravelStop has address/latitude/longitude/cityGroup as typed fields.
    // durationMinutes and entryCost are runtime-enriched fields not in the DB schema.
    const enriched = stop as TravelStop & {
      durationMinutes?: number | null;
      entryCost?: string | null;
    };
    return {
      name: stop.name,
      stopType: stop.stopType,
      address: stop.address,
      latitude: stop.latitude,
      longitude: stop.longitude,
      durationMinutes: enriched.durationMinutes,
      entryCost: enriched.entryCost,
      cityGroup: stop.cityGroup,
      insertAtOrder: stop.displayOrder ?? 0,
    };
  };

  // Per-toast undo: each removal captures its own payload in the toast closure
  const handleRemoveStop = async (stop: TravelStop) => {
    const undoPayload = buildUndoPayload(stop);
    const restoreStop = async () => {
      try {
        await fetch(`/api/travel/trips/${tripId}/stops`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(undoPayload),
        });
        await fetchTrip(tripId);
        toast.success("Stop restored");
      } catch {
        toast.error("Couldn't restore stop");
      }
    };

    try {
      if (activeTab === "todays_plan") {
        addFreedSlot(stop.name, stop.stopType, stop.durationMinutes);
      }
      await fetch(`/api/travel/stops/${stop.id}`, { method: "DELETE", credentials: "include" });
      saveRemovedStop(stop);
      await fetchTrip(tripId);
      setStopsRemovedCount(prev => prev + 1);
      toast("Removed from your day · Undo", {
        action: { label: "Undo", onClick: restoreStop },
        duration: 5000,
      });
    } catch {
      toast.error("Couldn't remove stop");
    }
  };

  const handleRemoveStopWithAnchorCheck = (stop: TravelStop, todayUnvisited: TravelStop[]) => {
    const isAnchor = todayUnvisited.length > 0 && todayUnvisited[0].id === stop.id;
    if (isAnchor) {
      setAnchorCalloutStop(stop);
    } else {
      handleRemoveStop(stop);
    }
  };

  const openMoveStopSheet = (stop: TravelStop) => {
    setMoveStopSheet({ show: true, stop, step: "pick_day", targetDayIdx: null, isMoving: false });
  };

  const closeMoveStopSheet = () => {
    setMoveStopSheet({ show: false, stop: null, step: "pick_day", targetDayIdx: null, isMoving: false });
  };

  const handleMoveStop = async (
    stop: TravelStop,
    targetDayIdx: number,
    method: "add" | "replace",
    replaceStop?: TravelStop
  ) => {
    const targetDayStops = dayGroups[targetDayIdx] || [];
    const targetCityGroup =
      targetDayStops[0]?.cityGroup ??
      dayToCityName[targetDayIdx] ??
      stop.cityGroup ??
      null;

    let newDisplayOrder: number;
    if (method === "replace" && replaceStop) {
      newDisplayOrder = replaceStop.displayOrder ?? 0;
    } else {
      const maxOrder = targetDayStops.reduce((m, s) => Math.max(m, s.displayOrder ?? 0), 0);
      newDisplayOrder = maxOrder + 1;
    }

    try {
      setMoveStopSheet(s => ({ ...s, isMoving: true }));
      if (method === "replace" && replaceStop) {
        await fetch(`/api/travel/stops/${replaceStop.id}`, { method: "DELETE", credentials: "include" });
      }
      await fetch(`/api/travel/stops/${stop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cityGroup: targetCityGroup, displayOrder: newDisplayOrder }),
      });
      closeMoveStopSheet();
      await fetchTrip(tripId);
      if (method === "replace" && replaceStop) {
        toast.success(`Moved to Day ${targetDayIdx + 1}`, {
          description: `${stop.name} replaced ${replaceStop.name}.`,
        });
      } else {
        toast.success(`Moved to Day ${targetDayIdx + 1}`);
      }
    } catch {
      toast.error("Couldn't move stop — please try again.");
      setMoveStopSheet(s => ({ ...s, isMoving: false }));
    }
  };

  // Auto-optimize dispatch state
  const [optimizeProposal, setOptimizeProposal] = useState<ChangeProposal | null>(null);
  const [optimizeTrigger, setOptimizeTrigger] = useState<TriggerType | null>(null);
  const [optimizeIsSuggestion, setOptimizeIsSuggestion] = useState(false);
  // GeoBuddy suggestion card (shown when autoOptimize is OFF)
  type GeoBuddySuggestion = {
    message: string;
    primaryAction?: { label: string; onClick: () => void };
    secondaryAction?: { label: string; onClick: () => void };
    tertiaryAction?: { label: string; onClick: () => void };
  };
  const [geoBuddySuggestion, setGeoBuddySuggestion] = useState<GeoBuddySuggestion | null>(null);
  const inferredBannerDismissed = useRef(false);
  // Session-level tracking of how many stops have been removed by auto-optimize this session
  const sessionRemovedCount = useRef(0);
  // Session-level tracking of how many times kids_tired has fired — used to detect compromised day
  const sessionTiredCount = useRef(0);
  // One-shot gate: inferred trigger may only auto-fire once per session per condition key
  const inferredTriggerFiredKey = useRef<string | null>(null);

  // Daily Maps state
  const [dayRouteBundle, setDayRouteBundle] = useState<DayRouteBundle | null>(null);
  const [dayRouteSheetOpen, setDayRouteSheetOpen] = useState(false);

  // More Actions menu (hero ⋯ button)
  const [showDayActionsSheet, setShowDayActionsSheet] = useState(false);
  const [showPackingList, setShowPackingList] = useState(false);
  const [tripOfflineReady, setTripOfflineReady] = useState(false);
  const [showFullTripPDF, setShowFullTripPDF] = useState(false);
  const [triggerOfflineOpen, setTriggerOfflineOpen] = useState(false);
  const [showDayShareSheet, setShowDayShareSheet] = useState(false);
  const [tripShareLink, setTripShareLink] = useState("");
  const [shareGenerating, setShareGenerating] = useState(false);
  const [showRenameTripModal, setShowRenameTripModal] = useState(false);
  const [renameTripValue, setRenameTripValue] = useState("");
  const [renamingTrip, setRenamingTrip] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [showMomentCapture, setShowMomentCapture] = useState(false);
  const [momentCapturePreStopId, setMomentCapturePreStopId] = useState<string | undefined>(undefined);
  const [showMarkVisitedConfirm, setShowMarkVisitedConfirm] = useState<TravelStop | null>(null);
  const [showDatesPrompt, setShowDatesPrompt] = useState(false);
  const [datesPromptStart, setDatesPromptStart] = useState("");
  const [datesPromptEnd, setDatesPromptEnd] = useState("");
  const [savingDates, setSavingDates] = useState(false);
  const [showChangeStopSheet, setShowChangeStopSheet] = useState(false);
  const [showMemoriesVideoMaker, setShowMemoriesVideoMaker] = useState(false);
  const [showMemoriesCollageMaker, setShowMemoriesCollageMaker] = useState(false);

  type StayLocationEntry = { cityName?: string; name: string; address: string; checkIn: string; checkOut: string };
  type DayLocationOverride = { startLocation?: { name: string; address: string }; endLocation?: { name: string; address: string } };
  const [dayOverrides, setDayOverrides] = useState<Record<string, DayLocationOverride>>({});
  const [showDayOverrideSheet, setShowDayOverrideSheet] = useState(false);
  const [overrideDayIdx, setOverrideDayIdx] = useState<number>(0);
  const [overrideForm, setOverrideForm] = useState<DayLocationOverride>({});
  const [savingOverride, setSavingOverride] = useState(false);
  type PlaceResult = { display_name: string; name: string; address: string };
  const [overrideStartQuery, setOverrideStartQuery] = useState("");
  const [overrideStartResults, setOverrideStartResults] = useState<PlaceResult[]>([]);
  const [overrideStartSearching, setOverrideStartSearching] = useState(false);
  const [overrideEndQuery, setOverrideEndQuery] = useState("");
  const [overrideEndResults, setOverrideEndResults] = useState<PlaceResult[]>([]);
  const [overrideEndSearching, setOverrideEndSearching] = useState(false);

  const searchOverridePlace = async (query: string, which: "start" | "end") => {
    if (!query.trim() || query.trim().length < 3) {
      if (which === "start") setOverrideStartResults([]);
      else setOverrideEndResults([]);
      return;
    }
    const dest = currentTrip?.destination || currentTrip?.city || "";
    if (which === "start") setOverrideStartSearching(true);
    else setOverrideEndSearching(true);
    try {
      const q = encodeURIComponent(`${query} ${dest}`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&addressdetails=1`, {
        headers: { "Accept-Language": "en", "User-Agent": "GeoQuestApp/1.0" },
      });
      const data = await res.json();
      const results: PlaceResult[] = (data || []).slice(0, 5).map((r: any) => ({
        display_name: r.display_name,
        name: r.name || r.display_name.split(",")[0],
        address: r.display_name,
      }));
      if (which === "start") setOverrideStartResults(results);
      else setOverrideEndResults(results);
    } catch {
      if (which === "start") setOverrideStartResults([]);
      else setOverrideEndResults([]);
    } finally {
      if (which === "start") setOverrideStartSearching(false);
      else setOverrideEndSearching(false);
    }
  };

  useEffect(() => {
    if (currentTrip && (currentTrip as any).dayOverrides) {
      setDayOverrides((currentTrip as any).dayOverrides as Record<string, DayLocationOverride>);
    }
  }, [currentTrip?.id]);

  const stayLocations: StayLocationEntry[] = (() => {
    const raw = (currentTrip as any)?.stayLocations;
    if (!raw || !Array.isArray(raw)) return [];
    return raw as StayLocationEntry[];
  })();

  function getDayDate(dayIdx: number): string {
    const raw = (currentTrip as any)?.startDate;
    if (!raw) return String(dayIdx);
    const parts = String(raw).slice(0, 10).split("-").map(Number);
    if (parts.length !== 3) return String(dayIdx);
    const [y, m, d] = parts;
    const base = new Date(y, m - 1, d + dayIdx);
    const yy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  function getStayForDay(dayIdx: number): StayLocationEntry | null {
    if (stayLocations.length === 0) return null;
    const dayDate = getDayDate(dayIdx);
    const match = stayLocations.find((s) => {
      if (!s.checkIn || !s.checkOut) {
        return stayLocations.length === 1;
      }
      return s.checkIn <= dayDate && dayDate <= s.checkOut;
    });
    return match || null;
  }

  const openDayOverrideSheet = (dayIdx: number) => {
    setOverrideDayIdx(dayIdx);
    const key = getDayDate(dayIdx);
    const existingOverride = dayOverrides[key];
    if (existingOverride && (existingOverride.startLocation?.name || existingOverride.endLocation?.name)) {
      setOverrideForm(existingOverride);
    } else {
      // Pre-fill from stayLocation for this day so the hotel shows as a quick-select
      const stay = getStayForDay(dayIdx);
      if (stay) {
        setOverrideForm({
          startLocation: { name: stay.name, address: stay.address || "" },
          endLocation: { name: stay.name, address: stay.address || "" },
        });
      } else {
        setOverrideForm({});
      }
    }
    setOverrideStartQuery("");
    setOverrideStartResults([]);
    setOverrideEndQuery("");
    setOverrideEndResults([]);
    setShowDayOverrideSheet(true);
  };

  const saveDayOverride = async () => {
    setSavingOverride(true);
    try {
      const key = getDayDate(overrideDayIdx);
      const updated = { ...dayOverrides };
      if (!overrideForm.startLocation?.name && !overrideForm.endLocation?.name) {
        delete updated[key];
      } else {
        updated[key] = overrideForm;
      }
      setDayOverrides(updated);
      await fetch(`/api/travel/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dayOverrides: updated }),
      });
      setShowDayOverrideSheet(false);
      toast.success("Day locations saved");
    } catch {
      toast.error("Couldn't save — try again");
    } finally {
      setSavingOverride(false);
    }
  };

  useEffect(() => {
    if (!selectedDetailStop) { setStopExploreData(null); return; }
    setStopExploreLoading(true);
    fetch(`/api/travel/stops/${selectedDetailStop.id}/explore`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStopExploreData(d))
      .catch(() => setStopExploreData(null))
      .finally(() => setStopExploreLoading(false));
  }, [selectedDetailStop?.id]);

  useEffect(() => {
    if (!tripId) return;
    if (activeTab === "current") {
      sessionStorage.setItem(`geoquest_at_stop_${tripId}`, "1");
    } else {
      sessionStorage.removeItem(`geoquest_at_stop_${tripId}`);
    }
  }, [activeTab, tripId]);

  useEffect(() => {
    if (activeTab !== "current") return;
    const currentStop = forcedCurrentStop || sortedStops.find((s) => !s.isVisited);
    if (!currentStop) return;
    setCurrentTabExploreLoading(true);
    setCurrentTabExploreData(null);
    setStopHeroImage(null);
    fetch(`/api/travel/stops/${currentStop.id}/explore`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCurrentTabExploreData(d))
      .catch(() => setCurrentTabExploreData(null))
      .finally(() => setCurrentTabExploreLoading(false));
    setStopHeroImageLoading(true);
    fetch(`/api/travel/stops/${currentStop.id}/hero-image`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.url) setStopHeroImage(d.url); })
      .catch(() => {})
      .finally(() => setStopHeroImageLoading(false));
  }, [activeTab, forcedCurrentStop?.id]);

  type StopLookup = {
    name: string; address: string; lat?: string; lon?: string; stopType: string;
    duration: string; description: string; whyKidsLoveIt: string;
    entryCost: string; kidFriendly: boolean; bestTime: string;
    addressSource?: "verified" | "estimated";
  };
  type RemovedStopRecord = {
    id: string; name: string; stopType: string;
    address?: string; lat?: number; lon?: number;
    durationMinutes?: number; parkingNotes?: string; requiresBooking?: boolean; entryCost?: string;
  };
  const [addStopStep, setAddStopStep] = useState<"idle" | "discover" | "preview" | "placement" | "adding">("idle");
  const [addStopContext, setAddStopContext] = useState<"default" | "food" | "dessert" | "dinner">("default");
  const [addStopQuery, setAddStopQuery] = useState("");
  const [pendingFoodAction, setPendingFoodAction] = useState<{ mode: "gps" | "route" | "search"; city?: string } | null>(null);
  const [addStopResult, setAddStopResult] = useState<StopLookup | null>(null);
  const [optimisticStop, setOptimisticStop] = useState<TravelStop | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<{ nearby: SmartSuggestion[]; popular: SmartSuggestion[] } | null>(null);
  const [smartSuggestionsLoading, setSmartSuggestionsLoading] = useState(false);
  const [addStopSearchResults, setAddStopSearchResults] = useState<StopLookup[]>([]);
  const [addStopSearching, setAddStopSearching] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [tightDayWarningDismissed, setTightDayWarningDismissed] = useState(false);

  type SmartSuggestion = { name: string; stopType: string; duration: string; description: string; };

  const fetchSmartSuggestions = async (stopTypes?: string[], cityOverride?: string) => {
    const resolvedCity = cityOverride || activeDayCityName || currentTrip?.destination || "";
    if (!resolvedCity) return;
    setSmartSuggestionsLoading(true);
    try {
      const res = await fetch("/api/travel/stops/smart-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ destination: resolvedCity, stopTypes }),
      });
      if (res.ok) {
        const data = await res.json();
        setSmartSuggestions(data);
      }
    } catch {
      // silently fail — suggestions are best-effort
    } finally {
      setSmartSuggestionsLoading(false);
    }
  };

  const openAddStop = () => {
    setAddStopContext("default");
    setAddStopQuery("");
    setAddStopResult(null);
    setAddStopSearchResults([]);
    setActiveChip(null);
    setTightDayWarningDismissed(false);
    setAddStopStep("discover");
    fetchSmartSuggestions();
  };

  const openFoodPicker = (context: "food" | "dessert" | "dinner" = "food") => {
    setAddStopContext(context);
    setAddStopQuery("");
    setAddStopResult(null);
    setAddStopSearchResults([]);
    setActiveChip(null);
    setTightDayWarningDismissed(false);
    setAddStopStep("discover");
    const foodTypes = context === "dessert"
      ? ["dessert", "ice_cream", "cafe", "bakery"]
      : ["food", "restaurant"];
    fetchSmartSuggestions(foodTypes);
  };

  const closeAddStop = () => {
    setAddStopContext("default");
    setAddStopStep("idle");
    setAddStopQuery("");
    setAddStopResult(null);
    setAddStopSearchResults([]);
    setActiveChip(null);
    setTightDayWarningDismissed(false);
  };

  const handleSearchStop = async (query: string) => {
    if (!query.trim()) { setAddStopSearchResults([]); return; }
    setAddStopSearching(true);
    try {
      const res = await fetch("/api/travel/stops/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: query.trim(), destination: activeDayCityName || currentTrip?.destination || "" }),
      });
      if (res.status === 401) { toast.error("Session expired — please sign in again."); navigate("/?login=true"); return; }
      if (!res.ok) throw new Error("Lookup failed");
      const data: StopLookup = await res.json();
      setAddStopSearchResults([data]);
    } catch {
      setAddStopSearchResults([]);
    } finally {
      setAddStopSearching(false);
    }
  };

  const handleSelectStop = (stop: StopLookup) => {
    setAddStopResult(stop);
    setAddStopStep("preview");
  };

  const handleSelectSuggestion = async (suggestion: SmartSuggestion) => {
    setAddStopResult({
      name: suggestion.name,
      address: "",
      stopType: suggestion.stopType,
      duration: suggestion.duration,
      description: suggestion.description,
      whyKidsLoveIt: suggestion.description,
      entryCost: "Check on site",
      kidFriendly: true,
      bestTime: "Anytime",
    });
    setAddStopStep("preview");
  };

  const handleAddToMyDay = () => {
    setAddStopStep("placement");
  };

  const handlePlaceStop = async (insertAtOrder: number | undefined) => {
    if (!addStopResult || !tripId) return;

    setAddStopStep("adding");

    try {
      const dayStops = dayGroups[activeDay] || [];
      const currentCityGroup = ((dayStops[0] as any)?.cityGroup as string | undefined)
        ?? (dayToCityName[activeDay] || undefined);

      const res = await fetch(`/api/travel/trips/${tripId}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: addStopResult.name,
          stopType: addStopResult.stopType || "landmark",
          address: addStopResult.address || undefined,
          latitude: addStopResult.lat || undefined,
          longitude: addStopResult.lon || undefined,
          cityGroup: currentCityGroup,
          dayIndex: activeDay,
          ...(insertAtOrder !== undefined ? { insertAtOrder } : {}),
        }),
      });
      if (res.status === 401) { toast.error("Session expired — please sign in again."); navigate("/?login=true"); return; }
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).message || "Failed"); }
      const stop = await res.json();
      setOptimisticStop({
        ...stop,
        displayOrder: insertAtOrder ?? (stop.displayOrder ?? 0),
        cityGroup: currentCityGroup || null,
        dayIndex: activeDay,
        isVisited: false,
        journeyPackCompleted: false,
      } as TravelStop);
      closeAddStop();
      toast.success("Added to your day ✨");
      fetchTrip(tripId)
        .then(() => setOptimisticStop(null))
        .catch(() => setOptimisticStop(null));
    } catch (err: any) {
      toast.error(err?.message && err.message !== "Failed" ? err.message : "Couldn't add stop — please try again.");
      setAddStopStep("placement");
    }
  };

  const showAddStop = addStopStep !== "idle";
  const addingStop = addStopStep === "adding";

  type ReplaceSuggestion = { name: string; stopType: string; duration: string; description: string; };
  const [replaceSheet, setReplaceSheet] = useState<{
    show: boolean;
    stop: TravelStop | null;
    step: "discover" | "preview";
    suggestions: { better: ReplaceSuggestion[]; similar: ReplaceSuggestion[] } | null;
    suggestionsLoading: boolean;
    activeChip: string | null;
    searchQuery: string;
    searchResults: StopLookup[];
    searching: boolean;
    previewResult: StopLookup | null;
    applying: boolean;
  }>({
    show: false, stop: null, step: "discover",
    suggestions: null, suggestionsLoading: false,
    activeChip: null, searchQuery: "", searchResults: [], searching: false,
    previewResult: null, applying: false,
  });
  const [isStarting, setIsStarting] = useState(false);
  type LighterDayStop = { id: string; name: string; reason?: string; anchorReason?: string };
  type LighterDayProposal = {
    loading: boolean;
    stopsToRemove: LighterDayStop[];
    stopsToKeep: LighterDayStop[];
    explanation: string;
    newTotalMinutes: number;
    oldTotalMinutes: number;
    fullStopData?: TravelStop[];
  } | null;
  const [lighterDayProposal, setLighterDayProposal] = useState<LighterDayProposal>(null);

  const [planReadyShown, setPlanReadyShown] = useState(false);
  // Reactive unlock tracking — useSearch() updates when URL changes (no reload needed)
  const searchStr = useSearch();
  const [apiUnlocked, setApiUnlocked] = useState(false);
  const urlUnlocked = new URLSearchParams(searchStr).get("tripUnlocked") === "true";
  const tripIsUnlocked = urlUnlocked || apiUnlocked;
  // Local state: user explicitly tapped "Start This Experience" (paywall off) — dismiss teaser, show plan
  const [teaserDismissed, setTeaserDismissed] = useState(false);
  // Track when the inline bottom CTA is on-screen so we can hide the floating sticky CTA from carousel
  const [inlineCTAVisible, setInlineCTAVisible] = useState(false);
  const inlineCTARef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = inlineCTARef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setInlineCTAVisible(entry.isIntersecting), { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const [revealDetailsOpen, setRevealDetailsOpen] = useState(false);
  const [revealShowAllStops, setRevealShowAllStops] = useState(false);
  const [kidsPreviewOpen, setKidsPreviewOpen] = useState(false);
  const [kidsPreviewStopName, setKidsPreviewStopName] = useState<string>("");
  const [kidsPreviewActiveGame, setKidsPreviewActiveGame] = useState<string | null>(null);
  const [revealTip1Visible, setRevealTip1Visible] = useState(() => !localStorage.getItem("geo-reveal-tip1-dismissed"));
  const [walletItems, setWalletItems] = useState<TripWalletItem[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [addPassStep, setAddPassStep] = useState<AddPassStep>("choose");
  const [addingWallet, setAddingWallet] = useState(false);
  const [walletForm, setWalletForm] = useState({
    label: "",
    type: "ticket",
    confirmationNumber: "",
    notes: "",
    fileUrl: "",
    fileUrls: [] as string[],
    walletSection: "pass" as "pass" | "document",
    stopId: undefined as string | undefined,
  });
  const [linkingPassId, setLinkingPassId] = useState<string | null>(null);
  const [passesSubTab, setPassesSubTab] = useState<"passes" | "documents">("passes");
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    label: "",
    type: "flight",
    confirmationNumber: "",
    notes: "",
    fileUrl: "",
  });
  const [editDocItem, setEditDocItem] = useState<TripWalletItem | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TripWalletItem | null>(null);
  const [ticketImgIdx, setTicketImgIdx] = useState(0);
  const [selectedBackupIdx, setSelectedBackupIdx] = useState<number | null>(null);
  const [mealRecState, setMealRecState] = useState<{
    visible: boolean; loading: boolean; mealType: "lunch" | "snack" | "dinner" | "dessert";
    beforeStop: TravelStop | null; afterStop: TravelStop | null;
    suggestions: MealRec[]; error: boolean; widen: boolean; searchQuery: string;
    locationMode: "route" | "nearby"; nearbyLat: number | null; nearbyLng: number | null;
  }>({ visible: false, loading: false, mealType: "lunch", beforeStop: null, afterStop: null, suggestions: [], error: false, widen: false, searchQuery: "", locationMode: "route", nearbyLat: null, nearbyLng: null });
  const [mealRecPendingRec, setMealRecPendingRec] = useState<{ rec: MealRec } | null>(null);
  const [mealRecPlacementStopId, setMealRecPlacementStopId] = useState<string | "end" | null>(null);
  const [autoMealRecs, setAutoMealRecs] = useState<{
    [gapKey: string]: { loading: boolean; rec: MealRec | null; beforeStop: TravelStop | null; afterStop: TravelStop | null; mealType: "lunch" | "snack" };
  }>({});
  const [weatherState, setWeatherState] = useState<{ tempC: number | null; tempF: number | null; isRainy: boolean; precipProb: number }>({ tempC: null, tempF: null, isRainy: false, precipProb: 0 });
  const [weatherBannerDismissedToday, setWeatherBannerDismissedToday] = useState(false);
  const [showWeatherFixSheetToday, setShowWeatherFixSheetToday] = useState(false);
  const [weatherIndoorSuggestion, setWeatherIndoorSuggestion] = useState<{ name: string; stopType: string; duration: string; description: string } | null>(null);
  const [loadingWeatherSuggestion, setLoadingWeatherSuggestion] = useState(false);
  const [applyingWeatherSwap, setApplyingWeatherSwap] = useState(false);

  const [selectedMealRecs, setSelectedMealRecs] = useState<{ lunch: MealRec | null; snack: MealRec | null }>({ lunch: null, snack: null });
  const [dinnerTimeChip, setDinnerTimeChip] = useState<"early" | "evening" | "late" | null>(null);
  const [confirmedEveningStopIds, setConfirmedEveningStopIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`confirmedEvening_${tripId}`) || "[]")); } catch { return new Set(); }
  });

  type NeedRec = SharedNeedRec;
  type LocationMode = "near_me" | "near_next_stop" | "along_route";
  const [needRecState, setNeedRecState] = useState<{
    loading: boolean; needType: "break" | "food" | "fun" | null; suggestions: NeedRec[]; nearStopName: string;
  }>({ loading: false, needType: null, suggestions: [], nearStopName: "" });
  const [locationSheet, setLocationSheet] = useState<{
    open: boolean; pendingNeedType: "break" | "food" | "fun" | null;
    mode: LocationMode; gpsAvailable: boolean | null; lat: number | null; lng: number | null;
  }>({ open: false, pendingNeedType: null, mode: "near_next_stop", gpsAvailable: null, lat: null, lng: null });
  const [detourBanner, setDetourBanner] = useState<{ active: boolean; stopName: string } | null>(null);
  const [addSuccessBanner, setAddSuccessBanner] = useState<{ visible: boolean; stopName: string; stopId?: string } | null>(null);
  const [addingNearbyItemIdx, setAddingNearbyItemIdx] = useState<number | null>(null);

  // Today's Plan: 3-dot menu per stop
  const [todayStopMenuId, setTodayStopMenuId] = useState<string | null>(null);

  // Conflict modal: shown when adding a stop that pushes existing stops
  const [conflictModal, setConflictModal] = useState<{
    show: boolean;
    newStopName: string; newStopType: string;
    newStopAddress?: string; newStopLat?: string; newStopLon?: string;
    insertDisplayOrder: number;
    nextStop: TravelStop | null;
    nextStopOldTime: string; nextStopNewTime: string;
    ticketedStops: Array<{ name: string; ticketLabel: string; scheduledTime: string }>;
  } | null>(null);

  const sortedStops = useMemo(() => {
    const base = [...currentTripStops];
    if (optimisticStop && !base.some(s => s.id === optimisticStop.id)) {
      base.push(optimisticStop);
    }
    return base.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [currentTripStops, optimisticStop]);

  // ── Day-grouping declarations — placed early to prevent TDZ in callbacks ──
  const tripNumDays = useMemo(() => {
    if (currentTrip?.startDate && currentTrip?.endDate) {
      const start = new Date(currentTrip.startDate);
      const end = new Date(currentTrip.endDate);
      return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
    const storedDays = (currentTrip as any)?.tripDays;
    if (storedDays && Number(storedDays) > 0) return Number(storedDays);
    const plannerDays = (currentTrip as any)?.plannerTripDays;
    if (plannerDays && Number(plannerDays) > 0) return Number(plannerDays);
    return null;
  }, [currentTrip?.startDate, currentTrip?.endDate, (currentTrip as any)?.tripDays, (currentTrip as any)?.plannerTripDays]);
  const tripCityDates = (currentTrip as any)?.cityDates as Record<string, CityDateRange> | null | undefined;
  const dayGroups = useMemo(
    () => groupStopsByDay(sortedStops, tripNumDays ?? undefined, currentTrip?.pace, tripCityDates),
    [sortedStops, tripNumDays, currentTrip?.pace, tripCityDates]
  );
  // Maps each day index → its owning city, derived from cityDates day counts.
  // This resolves city names even for empty travel days where dayGroups[d] has no stops.
  const dayToCityName = useMemo<string[]>(() => {
    const result: string[] = [];
    if (!tripCityDates) return result;
    const cityOrder: string[] = [];
    for (const s of sortedStops) {
      const cg = (s as any).cityGroup as string | undefined;
      if (cg && !cityOrder.includes(cg)) cityOrder.push(cg);
    }
    let prevEndDate: string | null = null;
    for (const city of cityOrder) {
      const cd = tripCityDates[city];
      let daysForCity = 1;
      if (cd?.startDate && cd?.endDate) {
        daysForCity = Math.max(1, Math.round((new Date(cd.endDate).getTime() - new Date(cd.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
        // Shared transition day: city A ends Apr 8, city B starts Apr 8 → subtract 1 from city B's count
        if (prevEndDate && cd.startDate === prevEndDate) {
          daysForCity = Math.max(1, daysForCity - 1);
        }
        prevEndDate = cd.endDate;
      }
      for (let d = 0; d < daysForCity; d++) result.push(city);
    }
    return result;
  }, [sortedStops, tripCityDates]);
  // Active day city name — for multi-city trips this changes as the user navigates days
  const activeDayCityName = dayToCityName[activeDay] || currentTrip?.city || currentTrip?.destination || null;

  // Current unvisited stop — derived at component level for hooks
  const topCurrentStop = useMemo(() => sortedStops.find((s) => !s.isVisited) ?? null, [sortedStops]);

  // Client-side stop image — same source as kid zone (fallback when server hero not ready)
  const { image: onDemandCurrentStopImg } = useOnDemandStopImage(
    topCurrentStop?.name,
    currentTrip?.city,
    topCurrentStop?.stopType,
    currentTrip?.country
  );

  // Quick-sheet stop image (loaded on demand when sheet opens)
  // Note: activeDayCityName is declared further down; use trip fields here to avoid TDZ
  const { image: quickSheetOnDemandImg } = useOnDemandStopImage(
    quickSheetStop?.name,
    currentTrip?.city || currentTrip?.destination,
    quickSheetStop?.stopType,
    currentTrip?.country
  );

  // City hero image for Today tab header
  const { image: cityHeroImage } = useOnDemandCityImage(
    currentTrip?.city || currentTrip?.destination,
    currentTrip?.country
  );

  // Ordinal helper: 21 → "21st", 22 → "22nd", etc.
  const toOrdinal = (n: number) => {
    const s = ["th","st","nd","rd"], v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  };

  // Weather fetch when trip destination changes
  useEffect(() => {
    const dest = currentTrip?.destination || currentTrip?.city;
    if (!dest) return;
    let cancelled = false;
    fetch(`/api/weather?city=${encodeURIComponent(dest)}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d && d.tempC != null) setWeatherState({ tempC: d.tempC, tempF: d.tempF, isRainy: d.isRainy ?? false, precipProb: d.precipProb ?? 0 }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentTrip?.destination, currentTrip?.city]);

  const handleOpenWeatherFixToday = useCallback(async (affectedStop: TravelStop, city: string, todayStopNames: string[]) => {
    setShowWeatherFixSheetToday(true);
    if (weatherIndoorSuggestion || loadingWeatherSuggestion) return;
    setLoadingWeatherSuggestion(true);
    try {
      const res = await fetch("/api/travel/stops/smart-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ destination: city, stopTypes: ["museum", "aquarium"], todayStopNames }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const buckets = data?.buckets ?? [];
      const rainyBucket = buckets.find((b: any) => b.label === "Rainy-day picks");
      const stops = rainyBucket?.stops ?? data?.nearby ?? [];
      if (stops.length > 0) setWeatherIndoorSuggestion(stops[0]);
    } catch {
    } finally {
      setLoadingWeatherSuggestion(false);
    }
  }, [weatherIndoorSuggestion, loadingWeatherSuggestion]);

  const clientHeroImage = useMemo(() => {
    if (!topCurrentStop) return null;
    if (onDemandCurrentStopImg) return onDemandCurrentStopImg;
    return getAdventureStopImage(topCurrentStop.name, topCurrentStop.stopType, currentTrip?.city, currentTrip?.destination) ?? null;
  }, [topCurrentStop, onDemandCurrentStopImg, currentTrip]);

  useEffect(() => {
    if (tripId && (!currentTrip || currentTrip.id !== tripId)) {
      fetchTrip(tripId);
    }
  }, [tripId, user]);

  // Close 3-dot menu when clicking anywhere else
  // setTimeout defers the listener so it doesn't catch the same click that opened the menu
  useEffect(() => {
    if (!todayStopMenuId) return;
    const close = () => setTodayStopMenuId(null);
    const timerId = setTimeout(() => document.addEventListener("click", close), 0);
    return () => { clearTimeout(timerId); document.removeEventListener("click", close); };
  }, [todayStopMenuId]);

  // Auto-poll when navigated from multi-city trip creation (?generating=true)
  // Multi-city stop generation can take up to 90s total (each city ~30s sequentially)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("generating") || !tripId) return;
    window.history.replaceState(null, "", window.location.pathname);
    let pollCount = 0;
    const MAX_POLLS = 14; // up to ~98 seconds total — enough for multi-city generation
    const interval = setInterval(() => {
      pollCount++;
      fetchTrip(tripId);
      if (pollCount >= MAX_POLLS) clearInterval(interval);
    }, 7000);
    // Anchors may still be committing to DB when we first mount — retry once after 3s
    const anchorRetry = setTimeout(() => loadAnchors(), 3000);
    return () => { clearInterval(interval); clearTimeout(anchorRetry); };
  }, [tripId]);

  useEffect(() => {
    if (tripId) { loadWallet(); loadAnchors(); }
  }, [tripId]);

  // After Stripe payment redirect (?tripUnlocked=true), re-fetch trip once to get
  // updated tripDays in case the webhook processed after initial page load.
  useEffect(() => {
    if (!urlUnlocked || !tripId) return;
    const t = setTimeout(() => fetchTrip(tripId), 2500);
    return () => clearTimeout(t);
  }, [urlUnlocked, tripId]);

  useEffect(() => {
    if (!tripId) return;
    try { localStorage.setItem(`soft-wishes-${tripId}`, JSON.stringify(softWishes)); } catch {}
  }, [softWishes, tripId]);

  useEffect(() => { setTicketImgIdx(0); }, [selectedTicket?.id]);

  useEffect(() => {
    if (viewMode === "kid") {
      // On the Current tab → go straight to stop-level kid view
      if (activeTab === "current") {
        navigate(`/adventure/${tripId}/kid/next`);
      } else {
        navigate(`/adventure/${tripId}/kid`);
      }
    }
  }, [viewMode]);

  // Read ALL URL params in a single mount effect — avoids race where tab effect
  // calls replaceState and wipes addFood/city before a second effect can read them.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const tParam = params.get("t");
    const addFoodParam = params.get("addFood");
    const cityParam = params.get("city") || undefined;
    const fromParam = params.get("from");

    // Execution context back navigation
    if (fromParam === "execution") setFromExecution(true);

    // Tab routing
    if (tabParam === "wallet") setActiveTab("wallet");
    else if (tabParam === "current") setActiveTab("current");
    else if (tabParam === "todays_plan") setActiveTab("todays_plan");
    else if (tabParam === "trip_plan") setActiveTab("trip_plan");
    else if (tabParam === "memories") setActiveTab("memories");
    else if (tParam === "today") setActiveTab("todays_plan");
    else if (tParam === "current") setActiveTab("current");
    else if (tParam === "plan") setActiveTab("trip_plan");

    // Food picker deep-link from GeoBuddy home panel
    if (addFoodParam) {
      const mode = addFoodParam === "gps" ? "gps" : addFoodParam === "route" ? "route" : "search";
      setPendingFoodAction({ mode, city: cityParam });
      setActiveTab("todays_plan");
    }

    // Clear all handled params at once
    if (tabParam || tParam || addFoodParam || fromParam) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Auto-tab redirect: completed or active trips → Today tab; planning trips → Trip Plan
  const autoTabRedirected = useRef(false);
  useEffect(() => {
    if (autoTabRedirected.current) return;
    if (!currentTrip) return;
    const params = new URLSearchParams(window.location.search);
    const hasExplicitTab = params.get("tab") || params.get("t");
    if (hasExplicitTab) return;
    const tripStarted = !!(currentTrip as any)?.adventureStartedAt || currentTrip?.status === "active";
    const isCompleted = currentTrip?.status === "completed";
    if (tripStarted || isCompleted) {
      autoTabRedirected.current = true;
      setActiveTab("todays_plan");
    }
  }, [currentTrip?.status, (currentTrip as any)?.adventureStartedAt]);

  // Missing dates prompt — show every 2 days if trip has no start date
  useEffect(() => {
    if (!currentTrip || !tripId) return;
    const hasStartDate = !!(currentTrip as any)?.startDate;
    if (hasStartDate) return;
    const PROMPT_KEY = `geoquest_dates_prompt_${tripId}`;
    const lastShown = localStorage.getItem(PROMPT_KEY);
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const shouldShow = !lastShown || (Date.now() - parseInt(lastShown, 10)) >= TWO_DAYS_MS;
    if (shouldShow) {
      const t = setTimeout(() => setShowDatesPrompt(true), 800);
      return () => clearTimeout(t);
    }
  }, [currentTrip?.id, tripId]);

  // Auto-open stop detail panel when ?detail=stopId is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const detailStopId = params.get("detail");
    if (detailStopId && sortedStops.length > 0) {
      const stop = sortedStops.find((s) => s.id === detailStopId);
      if (stop) {
        setSelectedDetailStop(stop);
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, [sortedStops]);

  // Auto-fetch meal recommendations for the active day's lunch/snack gaps
  useEffect(() => {
    if (!currentTrip || !dayGroups[activeDay]) return;
    const stopsForDay = dayGroups[activeDay] || [];
    if (stopsForDay.length < 2) return;
    const hasFoodStop = stopsForDay.some((s: TravelStop) => FOOD_STOP_TYPES.includes(s.stopType || ""));
    if (hasFoodStop) return;
    const timeline = buildTimeline(stopsForDay);
    const mealGaps = timeline.filter((item): item is Extract<typeof item, { kind: "meal" }> => item.kind === "meal");
    if (mealGaps.length === 0) return;
    const cuisines: string[] = ((currentTrip as any)?.mealPreferences as { cuisines?: string[] } | null)?.cuisines || [];
    const alreadyUsedNames = new Set<string>();
    Object.values(autoMealRecs).forEach(r => { if (r.rec?.name) alreadyUsedNames.add(r.rec.name); });
    sortedStops.forEach((s: TravelStop) => { if (FOOD_STOP_TYPES.includes(s.stopType || "") && s.name) alreadyUsedNames.add(s.name); });
    for (const gap of mealGaps) {
      const gapKey = `${gap.mealType}_${activeDay}_${gap.beforeStop?.id ?? "start"}`;
      if (autoMealRecs[gapKey]) continue;
      setAutoMealRecs(prev => ({
        ...prev,
        [gapKey]: { loading: true, rec: null, beforeStop: gap.beforeStop, afterStop: gap.afterStop, mealType: gap.mealType },
      }));
      const apiMealType = gap.mealType === "lunch" ? "lunch" : "snack";
      const excludedNames = Array.from(alreadyUsedNames);
      fetch("/api/travel/meal-recs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          destination: currentTrip.destination || "",
          beforeStopName: gap.beforeStop?.name || "",
          afterStopName: gap.afterStop?.name || "",
          mealType: apiMealType,
          cuisines: cuisines.length > 0 ? cuisines : undefined,
          excludedNames: excludedNames.length > 0 ? excludedNames : undefined,
        }),
      })
        .then(r => r.json())
        .then(data => {
          const topRec: MealRec | null = (data.suggestions || [])[0] || null;
          setAutoMealRecs(prev => ({ ...prev, [gapKey]: { ...prev[gapKey], loading: false, rec: topRec } }));
        })
        .catch(() => {
          setAutoMealRecs(prev => ({ ...prev, [gapKey]: { ...prev[gapKey], loading: false, rec: null } }));
        });
    }
  }, [activeDay, currentTrip?.id, sortedStops.length]);

  // Execute pending food action once trip data is available
  useEffect(() => {
    if (!pendingFoodAction || !currentTrip) return;
    const { mode, city } = pendingFoodAction;
    setPendingFoodAction(null);
    if (mode === "gps" && city) {
      // GPS mode: open food picker with smart suggestions scoped to GPS-detected city
      setAddStopContext("food");
      setAddStopQuery("");
      setAddStopResult(null);
      setAddStopSearchResults([]);
      setActiveChip(null);
      setTightDayWarningDismissed(false);
      setAddStopStep("discover");
      fetchSmartSuggestions(["food", "restaurant"], city);
    } else if (mode === "route") {
      // Route mode: open food picker scoped to the current day's route city
      setAddStopContext("food");
      setAddStopQuery("");
      setAddStopResult(null);
      setAddStopSearchResults([]);
      setActiveChip(null);
      setTightDayWarningDismissed(false);
      setAddStopStep("discover");
      fetchSmartSuggestions(["food", "restaurant"]);
    } else {
      // Search mode: open food picker in discover state for free-text search
      setAddStopContext("food");
      setAddStopQuery("");
      setAddStopResult(null);
      setAddStopSearchResults([]);
      setActiveChip(null);
      setTightDayWarningDismissed(false);
      setAddStopStep("discover");
      fetchSmartSuggestions(["food", "restaurant"]);
    }
  }, [pendingFoodAction, currentTrip]);

  const loadWallet = async () => {
    setWalletLoading(true);
    try {
      const res = await fetch(`/api/travel/trips/${tripId}/wallet`, { credentials: "include" });
      if (res.ok) setWalletItems(await res.json());
    } catch (e) {
      console.error("Failed to load wallet:", e);
      toast.error("Couldn't load wallet — please refresh");
    } finally {
      setWalletLoading(false);
    }
  };

  const loadAnchors = async () => {
    try {
      const res = await fetch(`/api/travel/trips/${tripId}/anchors`, { credentials: "include" });
      if (res.ok) setTripAnchors(await res.json());
    } catch (e) {
      console.error("[ParentPlanView] Failed to load anchors:", e);
      toast.error("Couldn't load bookings — please refresh");
    }
  };

  /**
   * Enriches TravelStop[] with a `booked` flag based on wallet items.
   * A stop is considered "booked" if there is a wallet item (ticket/reservation/confirmation)
   * linked to that stop — requiring user confirmation before removal.
   */
  function withBookingFlags(stops: TravelStop[]): (TravelStop & { booked: boolean })[] {
    const bookedStopIds = new Set(
      walletItems
        .filter(w => w.stopId && (w.type === "ticket" || w.type === "reservation" || w.type === "confirmation"))
        .map(w => w.stopId!)
    );
    return stops.map(s => ({ ...s, booked: bookedStopIds.has(s.id) }));
  }

  function fireAutoOptimize(trigger: TriggerType, stops: TravelStop[], forceSuggest?: boolean, bypassToggle?: boolean) {
    const autoOn = bypassToggle ?? false;
    const isSuggestionMode = forceSuggest || !autoOn;

    // Enrich stops with booking flags from wallet before passing to engine
    const stopsWithBooking = withBookingFlags(stops);

    const unvisitedForAnchor = stopsWithBooking.filter(s => !s.isVisited);
    // For skip_stop, the user explicitly chose a stop to skip — anchor protection must NOT block it.
    // Anchor protection only applies to auto/inferred removals where no specific stop was chosen.
    const anchorStopId = trigger === "skip_stop"
      ? undefined
      : unvisitedForAnchor.length > 0
        ? unvisitedForAnchor.reduce((min, s) => (s.displayOrder ?? 0) < (min.displayOrder ?? 0) ? s : min).id
        : undefined;
    // Track compromised-day signals: kids_tired and repeated running_late both indicate a hard day
    if (trigger === "kids_tired" || trigger === "running_late" || trigger === "behind_20min") {
      sessionTiredCount.current += 1;
    }
    const proposal = runAutoOptimize(stopsWithBooking, trigger, undefined, anchorStopId, sessionTiredCount.current);
    if (proposal.safetyBlocked) {
      if (autoOn) {
        toast.warning(proposal.safetyReason || "Can't auto-adjust — please review manually.");
      } else {
        setGeoBuddySuggestion({ message: "Smart adjustments are available — want to review your options?" });
      }
      return;
    }

    setOptimizeTrigger(trigger);

    if (isSuggestionMode) {
      setOptimizeIsSuggestion(true);
      setOptimizeProposal(proposal);
      return;
    }

    setOptimizeIsSuggestion(false);
    if (proposal.size === "small") {
      applyOptimizeProposal(proposal, trigger, stops);
    } else {
      setOptimizeProposal(proposal);
    }
  }

  async function applyOptimizeProposal(
    proposal: ChangeProposal,
    trigger: TriggerType,
    stops: TravelStop[],
    confirmedByUser?: boolean
  ) {
    const removals = proposal.affected.filter(a => a.changeKind === "remove");
    const reorders = proposal.affected.filter(a => a.changeKind === "reorder");
    const inserts = proposal.affected.filter(a => a.changeKind === "insert_break" || a.changeKind === "insert_delight");
    const shortens = proposal.affected.filter(a => a.changeKind === "shorten");

    const unvisited = stops.filter(s => !s.isVisited);

    // Anchor protection: the first unvisited stop (by displayOrder) is never auto-removed
    // WITHOUT user intent. Exceptions:
    //   - skip_stop: user explicitly chose to skip that stop → no protection
    //   - confirmedByUser: user reviewed a medium/big proposal and confirmed → allow all
    const shouldEnforceAnchor = trigger !== "skip_stop" && !confirmedByUser;
    const anchorStop = shouldEnforceAnchor && unvisited.length > 0
      ? unvisited.reduce((min, s) => (s.displayOrder ?? 0) < (min.displayOrder ?? 0) ? s : min)
      : null;

    const removalsWithoutAnchor = anchorStop
      ? removals.filter(r => r.stopId !== anchorStop.id)
      : removals;
    if (anchorStop && removals.some(r => r.stopId === anchorStop.id)) {
      toast.warning("Your next scheduled stop is protected and can't be auto-removed.");
    }

    // 40% session cap: enforce only for silent auto-apply (not user-confirmed flows)
    let removalsSafe = removalsWithoutAnchor;
    if (!confirmedByUser) {
      if (exceedsAutoCap(proposal, stops, sessionRemovedCount.current)) {
        toast.warning("Auto-optimize limit reached for today — review stops manually if needed.");
        setOptimizeProposal(null);
        setOptimizeTrigger(null);
        return;
      }
    }

    // For auto-apply, further cap to what's still within budget
    if (!confirmedByUser) {
      const sessionCap = Math.floor(unvisited.length * 0.4);
      removalsSafe = removalsWithoutAnchor.slice(0, Math.max(0, sessionCap - sessionRemovedCount.current));
    }

    try {
      // --- Handle removals ---
      if (removalsSafe.length > 0) {
        if (proposal.size === "small" && !confirmedByUser) {
          // Small auto-apply: use local skip (reversible with Undo)
          const idsToSkip = removalsSafe.map(r => r.stopId);
          setSkippedStopIds(prev => [...prev, ...idsToSkip.filter(id => !prev.includes(id))]);
          sessionRemovedCount.current += idsToSkip.length;
          toast.success(proposal.summary, {
            duration: 6000,
            action: {
              label: "Undo",
              onClick: () => setSkippedStopIds(prev => prev.filter(id => !idsToSkip.includes(id))),
            },
          });
        } else {
          // Confirmed medium/big: delete from DB permanently
          const stopsToRemove = stops.filter(s => removalsSafe.some(r => r.stopId === s.id));
          for (const s of stopsToRemove) {
            saveRemovedStop(s);
            await deleteStop(s.id);
          }
          sessionRemovedCount.current += stopsToRemove.length;
          if (inserts.length === 0 && reorders.length === 0) {
            toast.success(proposal.summary, { duration: 4000 });
          }
        }
      }

      // --- Handle reorders ---
      if (reorders.length >= 1) {
        const reorderIds = reorders.map(r => r.stopId);

        // Build the updated ordering from updatedFlow (accurate projection from engine)
        // If engine provided updatedFlow, use it to derive the new displayOrder sequence
        const updatedFlow = proposal.result?.updatedFlow ?? [];
        let newOrders: { stopId: string; displayOrder: number }[] = [];
        let originalOrders: { stopId: string; displayOrder: number }[] = [];

        if (updatedFlow.length >= 2) {
          // Engine gave us the projected sequence — derive displayOrders from it
          const unvisitedStops = stops.filter(s => !s.isVisited);
          const baseOrder = unvisitedStops.length > 0
            ? Math.min(...unvisitedStops.map(s => s.displayOrder ?? 0))
            : 0;
          originalOrders = unvisitedStops.map(s => ({ stopId: s.id, displayOrder: s.displayOrder ?? 0 }));
          // Assign sequential displayOrders following the updatedFlow order
          newOrders = updatedFlow
            .filter(u => unvisitedStops.some(s => s.id === u.id))
            .map((u, i) => ({ stopId: u.id, displayOrder: baseOrder + i }));
        } else if (reorders.length >= 2) {
          // Fallback: swap the two reorder targets
          const stopsToReorder = stops.filter(s => reorderIds.includes(s.id));
          if (stopsToReorder.length >= 2) {
            originalOrders = stopsToReorder.map(s => ({ stopId: s.id, displayOrder: s.displayOrder ?? 0 }));
            const swapped = [stopsToReorder[1], stopsToReorder[0], ...stopsToReorder.slice(2)];
            newOrders = swapped.map((s, i) => ({
              stopId: s.id,
              displayOrder: (stopsToReorder[0].displayOrder ?? 0) + i,
            }));
          }
        }

        if (newOrders.length > 0) {
          await fetch(`/api/travel/trips/${tripId}/reorder-stops`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ stopOrders: newOrders }),
          });
          await fetchTrip(tripId);
          if (proposal.size === "small" && !confirmedByUser) {
            toast.success(proposal.result?.title ?? proposal.summary, {
              duration: 6000,
              action: {
                label: "Undo",
                onClick: async () => {
                  await fetch(`/api/travel/trips/${tripId}/reorder-stops`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ stopOrders: originalOrders }),
                  });
                  await fetchTrip(tripId);
                },
              },
            });
          } else {
            toast.success(proposal.result?.title ?? proposal.summary, { duration: 4000 });
          }
        } else {
          // No real DB stops to reorder (single advisory) — show summary
          toast.success(proposal.result?.title ?? proposal.summary, { duration: 5000 });
        }
      }

      // --- Handle shorten (update durationMinutes via PATCH) ---
      if (shortens.length > 0) {
        const result = proposal.result;
        if (result) {
          for (const shorten of shortens) {
            // Find the new duration from the updatedFlow projection
            const projectedStop = result.updatedFlow.find(s => s.id === shorten.stopId);
            const newDuration = projectedStop?.durationMinutes;
            if (newDuration && newDuration > 0 && shorten.stopId !== "__break__" && shorten.stopId !== "__food__" && shorten.stopId !== "__delight__") {
              try {
                await fetch(`/api/travel/stops/${shorten.stopId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ durationMinutes: newDuration }),
                });
              } catch {
                // Non-critical: proceed even if duration update fails
              }
            }
          }
          await fetchTrip(tripId);
        }
        if (removals.length === 0 && reorders.length === 0) {
          const label = proposal.result?.title ?? proposal.summary;
          toast.success(label, { duration: 4000 });
        }
      }

      // --- Handle insert_break / insert_food / insert_delight ---
      // When confirmed by user: create a real persisted stop in the DB.
      // When auto-apply (size=small): show advisory toast — no DB write.
      if (inserts.length > 0) {
        const insertItem = inserts[0];
        const isVirtualId = insertItem.stopId === "__break__" || insertItem.stopId === "__food__" || insertItem.stopId === "__delight__";

        if (confirmedByUser && isVirtualId) {
          // Determine stop type and name from changeKind
          const insertStopName =
            insertItem.changeKind === "insert_delight" ? "Bonus Fun Stop" :
            insertItem.changeKind === "insert_break" && insertItem.stopName.toLowerCase().includes("food") ? "Food Break" :
            "Rest Break";
          const insertStopType =
            insertItem.changeKind === "insert_delight" ? "activity" :
            insertItem.changeKind === "insert_break" && insertItem.stopName.toLowerCase().includes("food") ? "restaurant" :
            "rest";

          // Determine insertion position: insert before the first unvisited non-virtual stop
          const firstUnvisited = stops.find(s => !s.isVisited);
          const insertAtOrder = firstUnvisited ? (firstUnvisited.displayOrder ?? 0) : undefined;
          const cityGroup = (stops.find(s => !s.isVisited) as any)?.cityGroup ?? null;

          try {
            const insertRes = await fetch(`/api/travel/trips/${tripId}/stops`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: insertStopName,
                stopType: insertStopType,
                durationMinutes: insertItem.changeKind === "insert_delight" ? 30 : 20,
                cityGroup,
                insertAtOrder,
                address: null,
              }),
            });
            if (insertRes.ok) {
              await fetchTrip(tripId);
              toast.success(`${insertStopName} added to your plan`, { duration: 4000 });
            } else {
              // Non-critical: show advisory if API fails
              toast.success(`${insertStopName}: find a spot nearby before heading on`, { duration: 5000 });
            }
          } catch {
            toast.success(`${insertStopName}: find a spot nearby before heading on`, { duration: 5000 });
          }
        } else if (!confirmedByUser) {
          // Auto-apply or suggestion: advisory toast only
          const insertToastId = crypto.randomUUID();
          toast.success(proposal.result?.title ?? proposal.summary, {
            id: insertToastId,
            duration: 7000,
            action: {
              label: "Dismiss",
              onClick: () => {
                toast.dismiss(insertToastId);
              },
            },
          });
        } else {
          // Confirmed but not a virtual ID (e.g. existing stop)
          toast.success(proposal.result?.title ?? proposal.summary, { duration: 4000 });
        }
      }

      // Edge: no-op proposal (empty affected, no safety block) — just show summary
      if (proposal.affected.length === 0 && !proposal.safetyBlocked) {
        toast.success(proposal.summary, { duration: 4000 });
      }

    } catch {
      toast.error("Couldn't adjust the plan — please try again.");
    } finally {
      setOptimizeProposal(null);
      setOptimizeTrigger(null);
    }
  }

  function handleExplicitTrigger(trigger: TriggerType) {
    const todayStops = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops)
      .filter(s => !skippedStopIds.includes(s.id));
    const autoOn = false;
    fireAutoOptimize(trigger, todayStops, !autoOn);
  }

  const handleAddWalletItem = async () => {
    if (!walletForm.label.trim()) return;
    setAddingWallet(true);
    try {
      const allImages = walletForm.fileUrls.length > 0
        ? walletForm.fileUrls
        : walletForm.fileUrl ? [walletForm.fileUrl] : [];
      const res = await fetch(`/api/travel/trips/${tripId}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          label: walletForm.label.trim(),
          type: walletForm.type,
          walletSection: walletForm.walletSection || "pass",
          confirmationNumber: walletForm.confirmationNumber.trim() || undefined,
          notes: walletForm.notes.trim() || undefined,
          fileUrl: allImages[0] || undefined,
          fileUrls: allImages.length > 1 ? allImages : undefined,
          stopId: walletForm.stopId || undefined,
        }),
      });
      if (res.ok) {
        const item = await res.json();
        setWalletItems((prev) => [item, ...prev]);
        setWalletForm({ label: "", type: "ticket", confirmationNumber: "", notes: "", fileUrl: "", fileUrls: [], walletSection: "pass", stopId: undefined });
        setShowAddWallet(false);
        setAddPassStep("choose");
        toast.success("Pass added to wallet 🎟️");
      }
    } catch {
      toast.error("Failed to add item");
    } finally {
      setAddingWallet(false);
    }
  };

  const handleAddDocument = async () => {
    if (!docForm.label.trim() || !tripId) return;
    setAddingDoc(true);
    try {
      const method = editDocItem ? "PATCH" : "POST";
      const url = editDocItem
        ? `/api/travel/wallet/${editDocItem.id}`
        : `/api/travel/trips/${tripId}/wallet`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          label: docForm.label.trim(),
          type: docForm.type,
          walletSection: "document",
          confirmationNumber: docForm.confirmationNumber.trim() || undefined,
          notes: docForm.notes.trim() || undefined,
          fileUrl: docForm.fileUrl || undefined,
        }),
      });
      if (res.ok) {
        const item = await res.json();
        if (editDocItem) {
          setWalletItems((prev) => prev.map((i) => i.id === editDocItem.id ? item : i));
        } else {
          setWalletItems((prev) => [item, ...prev]);
        }
        setDocForm({ label: "", type: "flight", confirmationNumber: "", notes: "", fileUrl: "" });
        setShowAddDocModal(false);
        setEditDocItem(null);
        toast.success(editDocItem ? "Document updated" : "Document saved");
      } else {
        toast.error("Couldn't save document");
      }
    } catch {
      toast.error("Couldn't save document");
    } finally {
      setAddingDoc(false);
    }
  };

  const handleDeleteWalletItem = async (itemId: string) => {
    try {
      await fetch(`/api/travel/wallet/${itemId}`, { method: "DELETE", credentials: "include" });
      setWalletItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  // Auto-select the calendar-based current day on initial load
  const activeDayAutoSet = useRef(false);
  useEffect(() => {
    if (activeDayAutoSet.current || dayGroups.length === 0) return;
    const startDate = (currentTrip as any)?.startDate;
    if (startDate) {
      const tripStart = new Date(String(startDate).slice(0, 10) + "T12:00:00");
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
      const targetDay = Math.max(0, Math.min(dayGroups.length - 1, daysDiff));
      setActiveDay(targetDay);
    } else {
      const firstActiveDay = dayGroups.findIndex(
        (day: any[]) => day.some((s: any) => !s.isVisited)
      );
      if (firstActiveDay >= 0 && firstActiveDay !== 0) {
        setActiveDay(firstActiveDay);
      }
    }
    activeDayAutoSet.current = true;
  }, [dayGroups, currentTrip]);

  const { image: activeDayCityHeroImage } = useOnDemandCityImage(activeDayCityName, currentTrip?.country);

  // GeoBuddy trigger check: runs when Today tab is active (placed after dayGroups is declared)
  // One-shot gating via inferredTriggerFiredKey prevents repeated auto-fires from the same condition
  // Priority: running_late > energy_drop > meal > closing_soon > skipped_stop > end_of_day
  useEffect(() => {
    if (activeTab !== "todays_plan") return;
    if (inferredBannerDismissed.current) return;
    const todayStopsForInfer = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops)
      .filter(s => !skippedStopIds.includes(s.id));
    const unvisited = todayStopsForInfer.filter(s => !s.isVisited);

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const DAY_START = 9 * 60;
    const DAY_END = 18 * 60;
    const totalStops = todayStopsForInfer.length;
    const visitedCount = todayStopsForInfer.filter(s => s.isVisited).length;
    const dayProgress = Math.max(0, Math.min(1, (nowMins - DAY_START) / (DAY_END - DAY_START)));
    const expectedVisited = Math.round(dayProgress * totalStops);
    const scheduleDeltaStops = expectedVisited - visitedCount;
    const isBehindSchedule = scheduleDeltaStops >= 2 && nowMins > DAY_START && nowMins < DAY_END;

    const isWalkingOverload = false;

    const hasHadFoodStop = todayStopsForInfer.some(s => s.isVisited && (s.stopType === "food" || s.stopType === "restaurant" || s.stopType === "street_food"));
    const isMealWindowMissed = nowMins >= 14 * 60 && nowMins <= 17 * 60 && !hasHadFoodStop;

    const isVenueClosingSoon = nowMins >= 16 * 60 && unvisited.length >= 2;

    // Trigger 5: skipped stop — skippedStopIds increased since last check
    const prevSkippedCount = (inferredTriggerFiredKey as React.MutableRefObject<string | null> & { _prevSkipped?: number })._prevSkipped ?? 0;
    const justSkipped = skippedStopIds.length > prevSkippedCount && skippedStopIds.length > 0;
    (inferredTriggerFiredKey as React.MutableRefObject<string | null> & { _prevSkipped?: number })._prevSkipped = skippedStopIds.length;

    // Trigger 6: end of day — 1 unvisited stop left and time is past 15:00
    const isEndOfDay = unvisited.length === 1 && nowMins >= 15 * 60;

    // Trigger 7: evening dinner — all stops done, past 17:30
    const isEveningDinner = unvisited.length === 0 && nowMins >= 17 * 60 + 30 && visitedCount > 0;

    const autoOn = false;

    let conditionKey: string | null = null;
    if (isBehindSchedule) conditionKey = `behind:${visitedCount}`;
    else if (isWalkingOverload) conditionKey = `walking:${unvisited.length}`;
    else if (isMealWindowMissed) conditionKey = "meal_missed";
    else if (isVenueClosingSoon) conditionKey = `closing:${unvisited.length}`;
    else if (justSkipped) conditionKey = `skipped:${skippedStopIds.length}`;
    else if (isEndOfDay) conditionKey = "end_of_day";
    else if (isEveningDinner) conditionKey = "evening_dinner";

    if (!conditionKey) return;
    if (inferredTriggerFiredKey.current === conditionKey) return;

    // Lower-priority triggers (skipped, end-of-day, evening) should not override
    // an active, un-dismissed suggestion that was set by a higher-priority trigger.
    const isLowPriority = conditionKey.startsWith("skipped:") || conditionKey === "end_of_day" || conditionKey === "evening_dinner";
    if (isLowPriority && inferredTriggerFiredKey.current !== null && !inferredBannerDismissed.current) return;

    inferredTriggerFiredKey.current = conditionKey;

    if (isBehindSchedule) {
      if (autoOn) {
        fireAutoOptimize("behind_20min", todayStopsForInfer);
      } else {
        setGeoBuddySuggestion({
          message: "Looks like things are running a bit behind — want me to help?",
          primaryAction: { label: "Make day lighter", onClick: () => handleMakeDayLighter(unvisited, "running_late") },
        });
      }
    } else if (isWalkingOverload) {
      if (autoOn) {
        fireAutoOptimize("walking_overload", todayStopsForInfer);
      } else {
        setGeoBuddySuggestion({
          message: "That's a lot of walking ahead — want me to ease things up?",
          primaryAction: { label: "Make day lighter", onClick: () => handleMakeDayLighter(unvisited, "kids_tired") },
        });
      }
    } else if (isMealWindowMissed) {
      if (autoOn) {
        fireAutoOptimize("meal_window_missed", todayStopsForInfer);
      } else {
        setGeoBuddySuggestion({
          message: "Lunchtime is getting close — should we find somewhere to eat?",
          primaryAction: { label: "Find food", onClick: () => openFoodPicker("food") },
        });
      }
    } else if (isVenueClosingSoon) {
      if (autoOn) {
        fireAutoOptimize("venue_closing", todayStopsForInfer);
      } else {
        setGeoBuddySuggestion({
          message: "A few stops close soon — want me to prioritize them?",
          primaryAction: { label: "Adjust plan", onClick: () => setRoughDaySheetOpen(true) },
        });
      }
    } else if (justSkipped) {
      setGeoBuddySuggestion({
        message: "No worries about that skip — want me to find something better nearby?",
        primaryAction: { label: "Add a stop", onClick: () => openAddStop() },
      });
    } else if (isEndOfDay) {
      setGeoBuddySuggestion({
        message: "You're in a great place to wrap the day — what do you want to do?",
        primaryAction: { label: "Head back", onClick: () => navigate("/") },
        secondaryAction: { label: "Add one more stop", onClick: () => openAddStop() },
        tertiaryAction: { label: "Add dessert nearby 🍦", onClick: () => openFoodPicker("dessert") },
      });
    } else if (isEveningDinner) {
      setGeoBuddySuggestion({
        message: "Great day out! Want dinner suggestions near your hotel? 🌆",
        primaryAction: { label: "Find dinner", onClick: () => openFoodPicker("dinner") },
        secondaryAction: { label: "We're good", onClick: () => {} },
      });
    }
  }, [activeTab, activeDay, dayGroups, sortedStops, skippedStopIds, tripSettings]);

  // Which calendar day of the trip is "today" (0-indexed). Uses timezone-safe local date math.
  const todayDayOffset = useMemo(() => {
    const parseLocalDate = (dateStr: string) => {
      const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    let startStr: string | null | undefined = currentTrip?.startDate
      ? String(currentTrip.startDate).slice(0, 10)
      : null;

    // Fallback: use earliest startDate in cityDates
    if (!startStr) {
      const cd = (currentTrip as any)?.cityDates as Record<string, { startDate?: string; endDate?: string }> | null | undefined;
      if (cd) {
        const starts = Object.values(cd).map(r => r.startDate).filter(Boolean) as string[];
        if (starts.length > 0) startStr = starts.sort()[0];
      }
    }

    if (!startStr) return 0;
    const raw = startStr.split("-").map(Number);
    if (raw.length !== 3) return 0;
    const startMidnight = parseLocalDate(startStr);
    const now = new Date();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(0, Math.floor((nowMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24)));
  }, [currentTrip?.startDate, (currentTrip as any)?.cityDates]);

  const startedDayKey = currentTrip ? `${currentTrip.id}_${activeDay}` : '';
  const isDayStarted = startedDayKey ? startedDaySet.has(startedDayKey) : false;

  const lunchPosKey = currentTrip ? `${currentTrip.id}_${activeDay}` : '';
  const currentLunchOverride = lunchPosKey ? lunchPositionOverrides[lunchPosKey] : undefined;

  const { renderMode, tripPhase } = useMemo(() => {
    if (currentTrip?.status === "completed") return { renderMode: "detail" as const, tripPhase: "completed" as const };
    const tripStarted = !!(currentTrip as any)?.adventureStartedAt || currentTrip?.status === "active";
    if (tripStarted) return { renderMode: "detail" as const, tripPhase: "active" as const };
    const startDate = (currentTrip as any)?.startDate;
    if (!startDate) return { renderMode: "highlight" as const, tripPhase: "planning" as const };
    try {
      const tripStart = new Date(String(startDate).slice(0, 10) + "T12:00:00");
      const daysUntil = (tripStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntil <= 1) return { renderMode: "highlight" as const, tripPhase: "ready" as const };
      return { renderMode: "highlight" as const, tripPhase: "planning" as const };
    } catch { return { renderMode: "highlight" as const, tripPhase: "planning" as const }; }
  }, [currentTrip]);

  const moveLunch = useCallback((delta: number, currentIdx: number, maxIdx: number) => {
    if (!lunchPosKey) return;
    const next = Math.max(0, Math.min(maxIdx - 1, currentIdx + delta));
    setLunchPositionOverrides(prev => {
      const updated = { ...prev, [lunchPosKey]: next };
      try { localStorage.setItem('geoquest_lunch_positions', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [lunchPosKey]);

  const addFreedSlot = useCallback((stopName: string, stopType: string | null | undefined, durationMinutes?: number | null) => {
    if (!lunchPosKey) return;
    const mins = durationMinutes || estDuration(stopType);
    setFreedSlotsMap(prev => {
      const existing = prev[lunchPosKey] || [];
      const updated = { ...prev, [lunchPosKey]: [...existing, { label: stopName, minutes: mins }] };
      try { localStorage.setItem('geoquest_freed_slots', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [lunchPosKey]);

  const dismissFreedSlot = useCallback((index: number) => {
    if (!lunchPosKey) return;
    setFreedSlotsMap(prev => {
      const existing = [...(prev[lunchPosKey] || [])];
      existing.splice(index, 1);
      const updated = { ...prev, [lunchPosKey]: existing };
      try { localStorage.setItem('geoquest_freed_slots', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [lunchPosKey]);

  const markDayStarted = useCallback(() => {
    if (!startedDayKey) return;
    setStartedDaySet(prev => {
      const next = new Set(prev);
      next.add(startedDayKey);
      try { localStorage.setItem('geoquest_started_days', JSON.stringify([...next])); } catch {}
      return next;
    });
    toast.success("Day started — let's go 🚀");
  }, [startedDayKey]);

  // Auto-initialize Today tab to the actual travel day.
  // Runs once when currentTrip first loads; after that, user controls activeDay.
  useEffect(() => {
    if (todayTabDayInitialized.current) return;
    if (!currentTrip?.id) return;
    setActiveDay(todayDayOffset);
    todayTabDayInitialized.current = true;
  }, [todayDayOffset, currentTrip?.id]);

  // Reset reveal "show all stops" when day pill changes
  useEffect(() => {
    setRevealShowAllStops(false);
  }, [activeDay]);

  // In execution state, auto-expand the detail plan
  useEffect(() => {
    if (renderMode === "detail") setRevealDetailsOpen(true);
  }, [renderMode]);

  // Check if trip is paid — fallback for reload without URL param
  useEffect(() => {
    if (!tripId || !user || tripIsUnlocked) return;
    fetch(`/api/travel/trips/${tripId}/unlock-status`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.isUnlocked) setApiUnlocked(true); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, user]);

  // When trip becomes unlocked via payment, auto-expand the full plan and dismiss teaser.
  useEffect(() => {
    if (tripIsUnlocked) { setRevealDetailsOpen(true); setTeaserDismissed(true); }
  }, [tripIsUnlocked]);

  // --- Shared ticket readiness helpers (used across all tabs) ---
  const needsTicketTypes = ["museum", "aquarium", "theme_park", "zoo", "attraction"];
  const stopNeedsTicket = (stop: TravelStop) => needsTicketTypes.includes(stop.stopType || "");
  const stopHasTicket = (stop: TravelStop) =>
    walletItems.some(
      (w) =>
        w.stopId === stop.id ||
        w.label.toLowerCase().includes(stop.name.toLowerCase().slice(0, 8)) ||
        stop.name.toLowerCase().includes(w.label.toLowerCase().slice(0, 8))
    );
  const getTicketForStop = (stop: TravelStop): TripWalletItem | null =>
    walletItems.find(
      (w) =>
        w.stopId === stop.id ||
        w.label.toLowerCase().includes(stop.name.toLowerCase().slice(0, 8)) ||
        stop.name.toLowerCase().includes(w.label.toLowerCase().slice(0, 8))
    ) || null;
  // ── Shared Day 1 readiness rows (single source of truth for ready phase card + sheet) ──
  type ReadinessRow = { key: string; icon: string; text: string; resolved: boolean; onTap: () => void };
  const day1ReadinessRows = useMemo<ReadinessRow[]>(() => {
    const day1Stops = (dayGroups.length > 1 ? dayGroups[0] || [] : sortedStops) as TravelStop[];
    const rows: ReadinessRow[] = [];
    const ticketNeeded = day1Stops.filter((s) => stopNeedsTicket(s) && !stopHasTicket(s)).length;
    rows.push({
      key: "tickets",
      icon: "🎟",
      text: ticketNeeded === 0 ? "Tickets sorted ✓" : `Tickets needed for ${ticketNeeded} stop${ticketNeeded > 1 ? "s" : ""}`,
      resolved: ticketNeeded === 0,
      onTap: () => setActiveTab("passes"),
    });
    const hasFood = day1Stops.some((s) => FOOD_STOP_TYPES.includes(s.stopType || ""));
    if (hasFood || day1Stops.length >= 3) {
      const midIdx = Math.max(0, Math.floor(day1Stops.length / 2) - 1);
      rows.push({
        key: "food",
        icon: "🍔",
        text: hasFood ? "Lunch planned ✓" : "No lunch stop planned",
        resolved: hasFood,
        onTap: () => {
          if (!hasFood) { fetchMealRecs(day1Stops[midIdx] || null, day1Stops[midIdx + 1] || null, "lunch"); }
        },
      });
    }
    const hasStartLoc = !!(dayOverrides[getDayDate(0)] as any)?.startLocation;
    rows.push({
      key: "start-location",
      icon: "📍",
      text: hasStartLoc ? "Start location set ✓" : "Start location not set",
      resolved: hasStartLoc,
      onTap: () => {
        if (!hasStartLoc) { setOverrideDayIdx(0); setOverrideForm(dayOverrides[getDayDate(0)] || {}); setShowDayOverrideSheet(true); }
      },
    });
    rows.push({
      key: "bookings",
      icon: "📌",
      text: tripAnchors.length > 0 ? `${tripAnchors.length} booking${tripAnchors.length !== 1 ? "s" : ""} added ✓` : "Add something already planned",
      resolved: tripAnchors.length > 0,
      onTap: () => setAnchorSheetOpen(true),
    });
    return rows;
  }, [dayGroups, sortedStops, dayOverrides, tripAnchors, walletItems]);

  const getFrictionSignal = (type?: string | null): string | null => {
    if (type === "museum") return "Busy after noon";
    if (type === "aquarium") return "Book in advance";
    if (type === "theme_park") return "Lines likely";
    if (type === "restaurant") return "Book a table early";
    if (type === "zoo") return "Busy at weekends";
    return null;
  };
  const getEntryReadiness = (stop: TravelStop): { type: "free" | "ready" | "needed"; micro: string } => {
    const ticket = getTicketForStop(stop);
    if (ticket) return { type: "ready", micro: "Tickets ready for quick entry" };
    if (stopNeedsTicket(stop)) return { type: "needed", micro: "Buy before arriving to skip lines" };
    return { type: "free", micro: "No entry needed — you're all set" };
  };
  const visitedCount = sortedStops.filter((s) => s.isVisited).length;
  const travelers = useMemo(() => {
    const t = currentTrip?.travelers;
    if (Array.isArray(t)) return t as { name: string; avatarKey?: string; isParent?: boolean }[];
    return [];
  }, [currentTrip?.travelers]);

  const handleGetDirections = (stop: TravelStop) => {
    const query = stop.address || stop.name;
    window.open(`https://maps.google.com/?q=${encodeURIComponent(query)}`, "_blank");
    toast.info("Opening Google Maps...");
    markDayStarted();
  };

  const tripCuisines = useMemo(() => {
    const prefs = (currentTrip as any)?.mealPreferences as { cuisines?: string[] } | null | undefined;
    return prefs?.cuisines || [];
  }, [currentTrip]);

  const fetchMealRecs = async (
    beforeStop: TravelStop | null,
    afterStop: TravelStop | null,
    mealType: "lunch" | "snack" | "dinner" | "dessert",
    widen = false,
    searchQuery = "",
    locationMode: "route" | "nearby" = "route",
    nearbyLat: number | null = null,
    nearbyLng: number | null = null,
  ) => {
    setMealRecPendingRec(null);
    setMealRecPlacementStopId(null);
    const apiMealType = (mealType === "dinner" || mealType === "lunch") ? "lunch" : "snack";
    setMealRecState(s => ({ ...s, visible: true, loading: true, mealType, beforeStop, afterStop, suggestions: [], error: false, widen, searchQuery, locationMode, nearbyLat, nearbyLng }));
    try {
      const res = await fetch("/api/travel/meal-recs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          destination: currentTrip?.destination || "",
          beforeStopName: locationMode === "nearby" ? "" : (beforeStop?.name || ""),
          afterStopName: locationMode === "nearby" ? "" : (afterStop?.name || ""),
          mealType: apiMealType,
          widen: locationMode === "nearby" ? true : widen,
          searchQuery: searchQuery || (mealType === "dinner" ? "dinner" : mealType === "dessert" ? "dessert treat ice cream" : undefined),
          cuisines: tripCuisines.length > 0 ? tripCuisines : undefined,
        }),
      });
      const data = await res.json();
      const suggestions = data.suggestions || [];
      setMealRecState(s => ({ ...s, loading: false, suggestions, error: suggestions.length === 0 }));
    } catch {
      setMealRecState(s => ({ ...s, loading: false, error: true }));
    }
  };

  const fetchNeedRecs = async (
    needType: "break" | "food" | "fun",
    nearStop: TravelStop | null,
    locationMode: "near_me" | "near_next_stop" | "along_route" = "near_next_stop",
    lat?: number | null,
    lng?: number | null,
  ) => {
    const nearStopName = nearStop?.name || "";
    setNeedRecState({ loading: true, needType, suggestions: [], nearStopName });
    try {
      const res = await fetch("/api/travel/need-recs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          destination: currentTrip?.destination || "",
          nearStopName,
          needType,
          locationMode,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
        }),
      });
      const data = await res.json();
      setNeedRecState(s => ({ ...s, loading: false, suggestions: data.suggestions || [] }));
    } catch {
      setNeedRecState(s => ({ ...s, loading: false }));
    }
  };

  const openLocationSheet = (needType: "break" | "food" | "fun", nearStop: TravelStop | null) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationSheet({
            open: true,
            pendingNeedType: needType,
            mode: "near_me",
            gpsAvailable: true,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setLocationSheet({
            open: true,
            pendingNeedType: needType,
            mode: "near_next_stop",
            gpsAvailable: false,
            lat: null,
            lng: null,
          });
        },
        { timeout: 3000 }
      );
    } else {
      setLocationSheet({
        open: true,
        pendingNeedType: needType,
        mode: "near_next_stop",
        gpsAvailable: false,
        lat: null,
        lng: null,
      });
    }
  };

  const confirmLocationAndFetch = (nearStop: TravelStop | null) => {
    const { pendingNeedType, mode, lat, lng } = locationSheet;
    if (!pendingNeedType) return;
    setLocationSheet(s => ({ ...s, open: false }));
    fetchNeedRecs(pendingNeedType, nearStop, mode, lat, lng);
  };

  // Add a need-rec stop to the plan, with conflict detection
  const addNeedRecStop = async (rec: { name: string; type: string }, todayStops: TravelStop[]) => {
    if (!tripId) return;
    const firstUnvisited = todayStops.find(s => !s.isVisited);

    // Compute timeline times to detect conflict
    const timeline = buildTimeline(todayStops);
    const timeToMins = (t: string) => {
      const [hm, ampm] = t.split(" "); const [h, m] = hm.split(":").map(Number);
      return (h % 12 + (ampm === "PM" ? 12 : 0)) * 60 + m;
    };
    type StopItem = { kind: "stop"; stop: TravelStop; time: string };
    const stopItems = timeline.filter((i): i is StopItem => i.kind === "stop");

    // Use actual current wall-clock time as the insertion point
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const newStopDuration = rec.type === "break" || rec.type === "park" ? 20 :
      rec.type === "restaurant" || rec.type === "food" ? 60 : 30;
    // New stop ends at: now + its duration + 20 min travel buffer to reach the next stop
    const newStopEndMins = nowMins + newStopDuration + 20;

    // Insert as the very next stop (before the first unvisited stop)
    const insertDisplayOrder = firstUnvisited
      ? (firstUnvisited.displayOrder ?? 0) - 0.5
      : sortedStops.length;

    // Find ALL unvisited stops in the next 120 min that will be impacted
    const upcomingUnvisited = todayStops.filter(s => {
      if (s.isVisited) return false;
      const item = stopItems.find(i => i.stop.id === s.id);
      if (!item) return false;
      const mins = timeToMins(item.time);
      return mins >= nowMins && mins <= nowMins + 120;
    });

    // Check each upcoming stop for tickets in the wallet
    const ticketedStops = upcomingUnvisited
      .map(s => {
        const ticket = getTicketForStop(s);
        if (!ticket) return null;
        const item = stopItems.find(i => i.stop.id === s.id);
        return { name: s.name, ticketLabel: ticket.label, scheduledTime: item?.time ?? "" };
      })
      .filter((x): x is { name: string; ticketLabel: string; scheduledTime: string } => x !== null);

    // Nearest unvisited stop that would be pushed
    const nextStop = upcomingUnvisited[0] ?? null;
    const nextStopItem = nextStop ? stopItems.find(i => i.stop.id === nextStop.id) : null;
    const nextStopOldMins = nextStopItem ? timeToMins(nextStopItem.time) : null;

    if (nextStop && nextStopOldMins !== null && newStopEndMins > nextStopOldMins) {
      // Conflict — show popup with ticket warnings
      setConflictModal({
        show: true,
        newStopName: rec.name,
        newStopType: rec.type,
        insertDisplayOrder,
        nextStop,
        nextStopOldTime: fmtTime(nextStopOldMins),
        nextStopNewTime: fmtTime(newStopEndMins),
        ticketedStops,
      });
    } else {
      // No conflict — add directly
      await doAddNeedRecStop(rec.name, rec.type, insertDisplayOrder);
    }
  };

  const doAddNeedRecStop = async (name: string, stopType: string, insertDisplayOrder: number) => {
    if (!tripId) return;
    try {
      const res = await fetch(`/api/travel/trips/${tripId}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          stopType: stopType || "other",
          cityGroup: ((dayGroups[activeDay] || [])[0] as any)?.cityGroup as string | undefined,
          insertAtOrder: Math.round(insertDisplayOrder),
        }),
      });
      if (res.status === 401) { toast.error("Session expired — please sign in again."); navigate("/?login=true"); return; }
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).message || "Failed"); }
      const stop = await res.json();
      setConflictModal(null);
      setTodayNeedState(null);
      setNeedRecState(s => ({ ...s, suggestions: [], needType: null }));
      setAddSuccessBanner({ visible: true, stopName: stop.name, stopId: stop.id });
      await fetchTrip(tripId);
    } catch (err: any) {
      toast.error(err?.message && err.message !== "Failed" ? err.message : "Couldn't add stop — please try again.");
    }
  };

  const undoAddedStop = async (stopId: string) => {
    if (!tripId || !stopId) return;
    try {
      await fetch(`/api/travel/trips/${tripId}/stops/${stopId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setAddSuccessBanner(null);
      await fetchTrip(tripId);
    } catch {
      toast.error("Couldn't undo — please try again.");
    }
  };

  const handleRoughDayAction = async (action: string, unvisitedStops: TravelStop[]) => {
    if (!tripId || unvisitedStops.length === 0) { setRoughDaySheetOpen(false); return; }
    setRoughDayProcessing(action);
    try {
      if (action === "running_late") {
        // Remove 1-2 lowest priority unvisited stops (from the end of the day)
        const toRemove = unvisitedStops.slice(-Math.min(2, Math.max(1, unvisitedStops.length - 1)));
        for (const s of toRemove) await deleteStop(s.id);
        const count = toRemove.length;
        toast.success(`Day adjusted • ${count} stop${count > 1 ? "s" : ""} removed — you're back on track`, {
          action: { label: "Undo", onClick: async () => { await fetchTrip(tripId); } },
          duration: 6000,
        });
      } else if (action === "kids_tired") {
        // Remove the last unvisited stop to lighten the day
        const toRemove = unvisitedStops[unvisitedStops.length - 1];
        if (toRemove) await deleteStop(toRemove.id);
        const count = 1;
        toast.success(`Day lightened • ${count} stop removed — enjoy a slower pace`, {
          action: { label: "Undo", onClick: async () => { await fetchTrip(tripId); } },
          duration: 6000,
        });
      } else if (action === "too_much") {
        // Remove the last unvisited stop
        const toRemove = unvisitedStops[unvisitedStops.length - 1];
        await deleteStop(toRemove.id);
        toast.success("We simplified the rest of today • Only must-see stops left", {
          action: { label: "Undo", onClick: async () => { await fetchTrip(tripId); } },
          duration: 6000,
        });
      } else if (action === "skip_next") {
        // Skip the very next unvisited stop — add to skip list, no redistribution
        const toSkip = unvisitedStops[0];
        setSkippedStopIds(prev => [...prev, toSkip.id]);
        toast.success(`"${toSkip.name}" skipped — you can add it back anytime`, {
          action: { label: "Undo", onClick: () => setSkippedStopIds(prev => prev.filter(id => id !== toSkip.id)) },
          duration: 6000,
        });
        setRoughDayProcessing(null);
        setRoughDaySheetOpen(false);
        return;
      }
    } catch {
      toast.error("Couldn't adjust the plan — please try again.");
    } finally {
      setRoughDayProcessing(null);
      setRoughDaySheetOpen(false);
    }
  };

  const handleMakeDayLighter = async (unvisitedStops: TravelStop[], triggerContext: "lighter" | "running_late" | "kids_tired" | "too_much" = "lighter") => {
    if (!tripId) return;

    if (unvisitedStops.length === 0) {
      toast("All stops visited — nothing to simplify", { duration: 4000 });
      return;
    }

    if (unvisitedStops.length <= 2) {
      toast("Your day is already well balanced 👍", { duration: 4000 });
      return;
    }

    setRoughDaySheetOpen(false);

    setLighterDayProposal({ loading: true, stopsToRemove: [], stopsToKeep: [], explanation: "", newTotalMinutes: 0, oldTotalMinutes: 0, fullStopData: unvisitedStops });

    try {
      const stopsPayload = unvisitedStops.map(s => ({
        id: s.id,
        name: s.name,
        stopType: s.stopType,
        durationMinutes: (s as TravelStop & { durationMinutes?: number }).durationMinutes ?? 60,
        latitude: s.latitude,
        longitude: s.longitude,
        displayOrder: s.displayOrder,
      }));

      const res = await fetch(`/api/travel/trips/${tripId}/lighter-day-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stops: stopsPayload, triggerContext }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      if (data.alreadyBalanced) {
        setLighterDayProposal(null);
        toast("Your day is already well balanced 👍", { duration: 4000 });
        return;
      }

      setLighterDayProposal({
        loading: false,
        stopsToRemove: data.stopsToRemove || [],
        stopsToKeep: data.stopsToKeep || [],
        explanation: data.explanation || "",
        newTotalMinutes: data.newTotalMinutes || 0,
        oldTotalMinutes: data.oldTotalMinutes || 0,
        fullStopData: unvisitedStops,
      });
    } catch {
      setLighterDayProposal(null);
      toast.error("Couldn't analyze your day — please try again.");
    }
  };

  const applyLighterDayProposal = async () => {
    if (!lighterDayProposal || lighterDayProposal.loading || !tripId) return;
    const { stopsToRemove, fullStopData } = lighterDayProposal;

    const stopsForUndo = (fullStopData || []).filter((s: TravelStop) => stopsToRemove.some((r: LighterDayStop) => r.id === s.id));

    setLighterDayProposal(null);

    try {
      for (const s of stopsForUndo) {
        saveRemovedStop(s);
      }
      for (const s of stopsToRemove) {
        await fetch(`/api/travel/stops/${s.id}`, { method: "DELETE", credentials: "include" });
      }
      await fetchTrip(tripId);
      setStopsRemovedCount(prev => prev + stopsToRemove.length);

      const restoreAll = async () => {
        try {
          for (const s of stopsForUndo) {
            await fetch(`/api/travel/trips/${tripId}/stops`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: s.name,
                stopType: s.stopType,
                address: s.address,
                latitude: s.latitude,
                longitude: s.longitude,
                cityGroup: s.cityGroup,
                insertAtOrder: s.displayOrder ?? 0,
              }),
            });
          }
          await fetchTrip(tripId);
          toast.success("Stops restored");
        } catch {
          toast.error("Couldn't restore stops");
        }
      };

      toast.success("Your day just got easier ✨", {
        action: { label: "Undo", onClick: restoreAll },
        duration: 5000,
      });
    } catch {
      toast.error("Couldn't apply changes — please try again.");
      await fetchTrip(tripId);
    }
  };

  const handleFixEntireTrip = async (strategy: "balanced" | "relaxed" | "flow" | "light_touch", allDaysArg: TravelStop[][], getDayScore: (s: TravelStop[]) => number, getDayCityName: (dIdx: number, dayStops: TravelStop[]) => string) => {
    if (!tripId) return;
    setFixEntireTripStep("applying");
    if (strategy === "flow") {
      setFixEntireTripStep("success");
      setTimeout(() => setFixEntireTripStep(null), 2200);
      return;
    }
    if (strategy === "light_touch") {
      // Greedy nearest-neighbor reorder per day — no removals
      const distKm = (a: TravelStop, b: TravelStop) => {
        const R = 6371; const dLat = (b.latitude - a.latitude) * Math.PI / 180;
        const dLon = (b.longitude - a.longitude) * Math.PI / 180;
        const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
      };
      let reorderCount = 0;
      for (const dayStops of allDaysArg) {
        if ((dayStops || []).length < 3) continue;
        const stops = [...dayStops];
        const ordered: TravelStop[] = [stops[0]];
        const remaining = stops.slice(1);
        while (remaining.length > 0) {
          const last = ordered[ordered.length - 1];
          const nearestIdx = remaining.reduce((best, s, i) => distKm(last, s) < distKm(last, remaining[best]) ? i : best, 0);
          ordered.push(remaining.splice(nearestIdx, 1)[0]);
        }
        const stopOrders = ordered.map((s, i) => ({ stopId: s.id, displayOrder: i }));
        try {
          await fetch(`/api/travel/trips/${tripId}/reorder-stops`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ stopOrders }) });
          reorderCount++;
        } catch { continue; }
      }
      if (reorderCount > 0 && tripId) await fetchTrip(tripId);
      setFixEntireTripStep("success");
      setTimeout(() => setFixEntireTripStep(null), 2500);
      return;
    }
    const threshold = strategy === "relaxed" ? 60 : 70;
    const maxRemovalsPerDay = strategy === "relaxed" ? 2 : 1;
    const triggerContext = strategy === "relaxed" ? "kids_tired" : "lighter";
    const heavyDays = allDaysArg.map((stops, i) => ({ dIdx: i, stops, score: getDayScore(stops), city: getDayCityName(i, stops) })).filter(d => d.score >= threshold);
    const collected: typeof fixEntireTripProposal = [];
    for (const day of heavyDays) {
      const unvisited = day.stops.filter(s => !s.isVisited);
      if (unvisited.length <= 2) continue;
      try {
        const res = await fetch(`/api/travel/trips/${tripId}/lighter-day-proposal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            stops: unvisited.map(s => ({ id: s.id, name: s.name, stopType: s.stopType, durationMinutes: (s as any).durationMinutes ?? 60, latitude: s.latitude, longitude: s.longitude, displayOrder: s.displayOrder })),
            triggerContext,
            maxRemovalsOverride: maxRemovalsPerDay,
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.alreadyBalanced && data.stopsToRemove?.length) {
          collected.push({ dayIdx: day.dIdx, cityName: day.city, stopsToRemove: (data.stopsToRemove || []).map((r: { id: string; name: string; reason?: string }) => ({ id: r.id, name: r.name, reason: r.reason || "Lightens the day" })) });
        }
      } catch {
        continue;
      }
    }
    if (collected.length === 0) {
      setFixEntireTripStep("success");
      setTimeout(() => setFixEntireTripStep(null), 2200);
      return;
    }
    setFixEntireTripProposal(collected);
    setFixEntireTripStep("changes");
  };

  const applyFixEntireTrip = async () => {
    if (!tripId) return;
    setFixEntireTripStep("applying");
    try {
      for (const day of fixEntireTripProposal) {
        for (const s of day.stopsToRemove) {
          await fetch(`/api/travel/stops/${s.id}`, { method: "DELETE", credentials: "include" });
        }
      }
      await fetchTrip(tripId);
      setFixEntireTripProposal([]);
      setFixEntireTripStep("success");
      setTimeout(() => setFixEntireTripStep(null), 2200);
    } catch {
      setFixEntireTripStep("changes");
      toast.error("Couldn't apply all changes — please try again.");
    }
  };

  const handleStartAdventure = async () => {
    // Guard: don't let users start a trip before its planned start date
    const tripStart = (currentTrip as any)?.startDate;
    if (tripStart) {
      const startMs = new Date(String(tripStart).slice(0, 10) + "T12:00:00").getTime();
      if (Date.now() < startMs - 12 * 60 * 60 * 1000) {
        const label = new Date(String(tripStart).slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });
        toast.error(`Your adventure starts on ${label} — come back then!`);
        return;
      }
    }
    setIsStarting(true);
    try {
      if (currentTrip?.status !== "active") {
        const res = await fetch(`/api/travel/trips/${tripId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "active" }),
        });
        if (!res.ok) throw new Error("Failed");
      }
      navigate(`/adventure/${tripId}/parent-explore`);
    } catch {
      toast.error("Couldn't start adventure, please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const moveStop = async (stop: TravelStop, dir: "up" | "down") => {
    const currentList = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops;
    const idx = currentList.findIndex(s => s.id === stop.id);
    if (idx < 0) return;
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;
    // TRUE SWAP: exchange displayOrder values of the two adjacent stops only.
    // This guarantees neither stop drifts into a different day's range.
    const stopA = currentList[idx];
    const stopB = currentList[targetIdx];
    const orderA = stopA.displayOrder ?? idx;
    const orderB = stopB.displayOrder ?? targetIdx;
    await callReorderApi([
      { ...stopA, displayOrder: orderB },
      { ...stopB, displayOrder: orderA },
    ]);
  };

  const callReorderApi = async (orderedStops: TravelStop[]) => {
    try {
      await fetch(`/api/travel/trips/${tripId}/reorder-stops`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          stopOrders: orderedStops.map((s, i) => ({
            stopId: s.id,
            displayOrder: s.displayOrder !== undefined ? s.displayOrder : i,
            ...(s.dayIndex != null ? { dayIndex: s.dayIndex } : {}),
          })),
        }),
      });
      await fetchTrip(tripId);
    } catch {
      toast.error("Couldn't save stop order.");
    }
  };


  const handleDragDrop = async (dropTargetId: string) => {
    if (!dragStopId || dragStopId === dropTargetId) { setDragStopId(null); setDragOverStopId(null); return; }
    const currentList = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops;
    const stopA = currentList.find(s => s.id === dragStopId);
    const stopB = currentList.find(s => s.id === dropTargetId);
    if (!stopA || !stopB) { setDragStopId(null); setDragOverStopId(null); return; }
    const orderA = stopA.displayOrder ?? currentList.indexOf(stopA);
    const orderB = stopB.displayOrder ?? currentList.indexOf(stopB);
    setDragStopId(null); setDragOverStopId(null);
    await callReorderApi([
      { ...stopA, displayOrder: orderB },
      { ...stopB, displayOrder: orderA },
    ]);
  };

  const handleCrossDayMove = async (stopId: string, targetDayIdx: number) => {
    setCrossDayDragStopId(null);
    setCrossDayDropDayIdx(null);
    const allDaysLocal = dayGroups.length > 1 ? dayGroups : [sortedStops];
    const stop = sortedStops.find(s => s.id === stopId);
    if (!stop) return;
    const matchesAnchor = (a: any) => {
      const aName = (a.name || a.placeName || "").toLowerCase().trim();
      const stopName = (stop.name || "").toLowerCase().trim();
      return aName && stopName && (aName === stopName || stopName.includes(aName.split(" ")[0] ?? ""));
    };
    const hardAnchorMatched = tripAnchors.some(a => matchesAnchor(a) && (a as any).flexibility !== "soft");
    const bookedStopIds = new Set(walletItems.filter(w => w.stopId && (w.type === "ticket" || w.type === "reservation" || w.type === "confirmation")).map(w => w.stopId!));
    const isBooked = bookedStopIds.has(stopId);
    if (hardAnchorMatched || isBooked) {
      toast("This stop is locked — it has a fixed booking attached.", { icon: "🔒" });
      return;
    }
    const softAnchorMatched = tripAnchors.some(a => matchesAnchor(a) && (a as any).flexibility === "soft");
    if (softAnchorMatched) {
      toast("Heads up — this stop has a flexible booking. Moving it across days is fine.", { icon: "🕐" });
    }
    const currentDayIdx = allDaysLocal.findIndex(d => d.some(s => s.id === stopId));
    if (currentDayIdx === targetDayIdx) return;
    const targetDayStops = allDaysLocal[targetDayIdx] || [];
    const targetCityGroup = targetDayStops.length > 0 ? (targetDayStops[0] as any).cityGroup as string | null : (stop as any).cityGroup ?? null;
    const maxOrder = targetDayStops.length > 0
      ? Math.max(...targetDayStops.map(s => s.displayOrder ?? 0)) + 1
      : (stop.displayOrder ?? 0);
    try {
      await fetch(`/api/travel/trips/${tripId}/reorder-stops`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stopOrders: [{ stopId, displayOrder: maxOrder, cityGroup: targetCityGroup, dayIndex: targetDayIdx }] }),
      });
      await fetchTrip(tripId);
      toast.success(`Moved to Day ${targetDayIdx + 1}`);
    } catch {
      toast.error("Couldn't move stop to that day.");
    }
  };

  // Keep touchReorderRef fresh so the touch-end handler always sees current state
  useEffect(() => {
    touchReorderRef.current = (dropId: string, srcId: string) => {
      if (!srcId || srcId === dropId) { setDragStopId(null); setDragOverStopId(null); return; }
      const currentList = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops;
      const idxA = currentList.findIndex(s => s.id === srcId);
      const idxB = currentList.findIndex(s => s.id === dropId);
      const stopA = idxA >= 0 ? currentList[idxA] : null;
      const stopB = idxB >= 0 ? currentList[idxB] : null;
      if (!stopA || !stopB) { setDragStopId(null); setDragOverStopId(null); return; }
      // Ensure unique displayOrders using the full list to pick a safe base offset
      const allOrders = sortedStops.map(s => s.displayOrder ?? 0);
      const maxAllOrders = allOrders.length > 0 ? Math.max(...allOrders) : 0;
      // If stops in the current day have duplicate/same displayOrders, re-number the whole day first
      const dayOrders = currentList.map(s => s.displayOrder ?? null);
      const hasDuplicates = new Set(dayOrders.filter(o => o !== null)).size < dayOrders.filter(o => o !== null).length;
      const hasNulls = dayOrders.some(o => o === null);
      if (hasDuplicates || hasNulls) {
        // Re-number the day with guaranteed-unique displayOrders at the end of the global list
        const base = maxAllOrders + 100;
        const reordered = currentList.map((s, i) => ({ ...s, displayOrder: base + i }));
        // Swap positions A and B in the re-numbered list
        const newList = [...reordered];
        const tmp = newList[idxA].displayOrder;
        newList[idxA] = { ...newList[idxA], displayOrder: newList[idxB].displayOrder };
        newList[idxB] = { ...newList[idxB], displayOrder: tmp };
        setDragStopId(null); setDragOverStopId(null);
        callReorderApi(newList);
        return;
      }
      const orderA = stopA.displayOrder!;
      const orderB = stopB.displayOrder!;
      setDragStopId(null); setDragOverStopId(null);
      callReorderApi([
        { ...stopA, displayOrder: orderB },
        { ...stopB, displayOrder: orderA },
      ]);
    };
  }, [dayGroups, activeDay, sortedStops]);

  // Pointer drag — works on both touch and mouse; more reliable than TouchEvent on mobile
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!touchDragIdRef.current) return;
      e.preventDefault();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const card = el?.closest?.('[data-stop-id]') as HTMLElement | null;
      const overId = card?.dataset?.stopId ?? null;
      if (overId !== touchDragOverIdRef.current) {
        touchDragOverIdRef.current = overId;
        setDragOverStopId(overId);
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!touchDragIdRef.current) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const card = el?.closest?.('[data-stop-id]') as HTMLElement | null;
      const tgtId = card?.dataset?.stopId ?? touchDragOverIdRef.current ?? null;
      const srcId = touchDragIdRef.current;
      touchDragIdRef.current = null;
      touchDragOverIdRef.current = null;
      setDragStopId(null);
      setDragOverStopId(null);
      if (srcId && tgtId && srcId !== tgtId) {
        touchReorderRef.current(tgtId, srcId);
      }
    };
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  // Reset mapCollapseReady when map closes (mount guard for Leaflet 0-height bug)
  useEffect(() => {
    if (!showMapCollapse) setMapCollapseReady(false);
  }, [showMapCollapse]);

  const openReplaceSheet = (stop: TravelStop) => {
    setReplaceSheet({
      show: true, stop, step: "discover",
      suggestions: null, suggestionsLoading: false,
      activeChip: null, searchQuery: "", searchResults: [], searching: false,
      previewResult: null, applying: false,
    });
    fetchReplaceSuggestions(stop, null);
  };

  const closeReplaceSheet = () => {
    setReplaceSheet(s => ({ ...s, show: false }));
  };

  const fetchReplaceSuggestions = async (stop: TravelStop, chipFilter: string | null) => {
    if (!currentTrip?.destination) return;
    setReplaceSheet(s => ({ ...s, suggestionsLoading: true, suggestions: null }));
    try {
      const res = await fetch("/api/travel/stops/replace-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          stopName: stop.name,
          stopType: stop.stopType,
          destination: currentTrip.destination,
          chipFilter: chipFilter || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReplaceSheet(s => ({ ...s, suggestions: data }));
      }
    } catch {
      // best-effort
    } finally {
      setReplaceSheet(s => ({ ...s, suggestionsLoading: false }));
    }
  };

  const handleReplaceSearch = async (query: string) => {
    if (!query.trim()) { setReplaceSheet(s => ({ ...s, searchResults: [] })); return; }
    setReplaceSheet(s => ({ ...s, searching: true }));
    try {
      const res = await fetch("/api/travel/stops/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: query.trim(), destination: activeDayCityName || currentTrip?.destination || "" }),
      });
      if (!res.ok) throw new Error("Lookup failed");
      const data: StopLookup = await res.json();
      setReplaceSheet(s => ({ ...s, searchResults: [data] }));
    } catch {
      setReplaceSheet(s => ({ ...s, searchResults: [] }));
    } finally {
      setReplaceSheet(s => ({ ...s, searching: false }));
    }
  };

  const handleSelectReplaceOption = async (item: ReplaceSuggestion | StopLookup) => {
    const isLookup = "address" in item;
    if (isLookup) {
      setReplaceSheet(s => ({ ...s, previewResult: item as StopLookup, step: "preview" }));
      return;
    }
    // Fetch full details for suggestion items
    const suggestion = item as ReplaceSuggestion;
    setReplaceSheet(s => ({ ...s, suggestionsLoading: true }));
    try {
      const res = await fetch("/api/travel/stops/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: suggestion.name, destination: activeDayCityName || currentTrip?.destination || "" }),
      });
      const data: StopLookup = res.ok ? await res.json() : {
        name: suggestion.name, stopType: suggestion.stopType, duration: suggestion.duration,
        description: suggestion.description, whyKidsLoveIt: suggestion.description,
        address: "", entryCost: "Check on site", kidFriendly: true, bestTime: "Anytime",
      };
      setReplaceSheet(s => ({ ...s, previewResult: data, step: "preview", suggestionsLoading: false }));
    } catch {
      setReplaceSheet(s => ({
        ...s, suggestionsLoading: false,
        previewResult: {
          name: suggestion.name, stopType: suggestion.stopType, duration: suggestion.duration,
          description: suggestion.description, whyKidsLoveIt: suggestion.description,
          address: "", entryCost: "Check on site", kidFriendly: true, bestTime: "Anytime",
        },
        step: "preview",
      }));
    }
  };

  const handleApplyReplace = async () => {
    const { stop, previewResult } = replaceSheet;
    if (!stop || !previewResult) return;
    setReplaceSheet(s => ({ ...s, applying: true }));
    try {
      const res = await fetch(`/api/travel/stops/${stop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: previewResult.name,
          stopType: previewResult.stopType || stop.stopType,
          address: previewResult.address || undefined,
          latitude: previewResult.lat || undefined,
          longitude: previewResult.lon || undefined,
        }),
      });
      if (!res.ok) throw new Error("Patch failed");
      await fetchTrip(tripId);
      closeReplaceSheet();
      toast.success("Replaced ✨");
    } catch {
      toast.error("Couldn't apply replacement.");
      setReplaceSheet(s => ({ ...s, applying: false }));
    }
  };

  const handleSmartPill = (action: string) => {
    if (action === "add_stop") {
      openAddStop();
    } else if (action === "optimize") {
      const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent((dayGroups[activeDay] || []).map(s => s.name).join(" to ") + " " + (currentTrip?.destination || ""))}`;
      window.open(mapsUrl, "_blank");
      toast.success("Opening route in Maps to review your day →");
    } else if (action === "less_walking") {
      toast.info("Tip: Use the map view below to find stops that are close together.");
      setShowMapCollapse(true);
    } else {
      toast.info("Tip: Select 2–3 stops for today and leave the rest for tomorrow.");
    }
  };

  if (!currentTrip && tripId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-slate-500">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  const styleLabel = ADVENTURE_STYLES[(currentTrip?.adventureStyle || "family_explorer")] || "Family Highlights";

  // Day Actions handlers
  const handleDayDownloadOffline = () => {
    setShowDayActionsSheet(false);
    setTriggerOfflineOpen(true);
  };

  const handleDayShareOpen = async () => {
    setShowDayActionsSheet(false);
    setShareGenerating(true);
    setShowDayShareSheet(true);
    setShareLinkCopied(false);
    try {
      const numDays = dayGroups.length > 1 ? dayGroups.length : 1;
      const resp = await fetch(`/api/travel/trips/${tripId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ durationDays: numDays, styleTags: [] }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const slug = data.slug || "";
        if (slug) {
          setTripShareLink(`${window.location.origin}/itinerary/${slug}`);
        } else {
          setTripShareLink(window.location.href);
        }
      } else {
        setTripShareLink(window.location.href);
      }
    } catch {
      setTripShareLink(window.location.href);
    } finally {
      setShareGenerating(false);
    }
  };

  const handleDayCopyLink = () => {
    const link = tripShareLink || window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2500);
    }).catch(() => {
      toast.error("Couldn't copy link — try manually");
    });
  };

  const handleDayExportPDF = () => {
    setShowDayActionsSheet(false);
    setTimeout(() => setShowFullTripPDF(true), 150);
  };

  const handleMoreActionsEditTrip = () => {
    setShowDayActionsSheet(false);
    setTimeout(() => setShowTripSettings(true), 200);
  };

  const handleOpenRenameTrip = () => {
    setRenameTripValue(currentTrip?.name || currentTrip?.destination || "");
    setShowDayActionsSheet(false);
    setTimeout(() => setShowRenameTripModal(true), 200);
  };

  const handleRenameTrip = async () => {
    const name = renameTripValue.trim();
    if (!name || !tripId) return;
    setRenamingTrip(true);
    try {
      const res = await fetch(`/api/travel/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await fetchTrip(tripId);
        setShowRenameTripModal(false);
        toast.success("Trip renamed!");
      } else {
        toast.error("Couldn't rename — try again");
      }
    } catch {
      toast.error("Couldn't rename — try again");
    } finally {
      setRenamingTrip(false);
    }
  };

  const handleMoreActionsResetDay = () => {
    const todayStopIds = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops).map(s => s.id);
    setSkippedStopIds(prev => prev.filter(id => !todayStopIds.includes(id)));
    setShowDayActionsSheet(false);
    toast.success("Today's plan reset!");
  };

  const handleMoreActionsDuplicateTrip = () => {
    setShowDayActionsSheet(false);
    toast("Duplicate trip coming soon!");
  };

  const handleClickFinishAdventure = () => {
    const remaining = currentTripStops.filter(s => !s.isVisited).length;
    setFinishStopsLeft(remaining);
    setShowFinishCelebration(true);
  };

  const handleConfirmFinish = async () => {
    if (!currentTrip) return;
    setIsFinishingAdventure(true);
    try {
      await fetch(`/api/travel/trips/${currentTrip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "completed", completedAt: new Date().toISOString() }),
      });
      await fetchTrips();
      setShowFinishCelebration(false);
      setActiveTab("memories");
      toast.success("🎉 Adventure complete! Your story is ready.");
    } catch {
      toast.error("Couldn't finish the adventure. Try again.");
    } finally {
      setIsFinishingAdventure(false);
    }
  };

  const getShareMessage = () => {
    const dest = currentTrip?.destination || "our destination";
    const link = tripShareLink || window.location.href;
    return `Check out my itinerary to ${dest}: ${link}`;
  };

  return (
    <div className={`min-h-screen bg-[#F6F4EF] ${paywallEnabled && !tripIsUnlocked && !teaserDismissed && !inlineCTAVisible ? 'pb-[164px]' : 'pb-[80px]'}`}>
      <div className="max-w-lg mx-auto">
        {/* No back button — navigation handled by tab bar */}

        <div className="px-4">
          <AnimatePresence mode="wait">
            {activeTab === "trip_plan" && (
              <motion.div
                key="stops"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="-mx-4"
              >
                {sortedStops.length === 0 ? (
                  <PlanLoadingScreen destination={currentTrip?.destination || currentTrip?.city || "your destination"} />
                ) : (
                  <>
                    {/* ── Anchor save animation banner ─────── */}
                    <AnimatePresence>
                      {anchorSaveAnim && (
                        <motion.div
                          key="anchor-anim-banner"
                          initial={{ opacity: 0, y: -10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -10, height: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <div className={`mx-4 mt-4 mb-2 flex items-center gap-2.5 px-4 py-3 rounded-xl ${anchorSaveAnim.phase === 'done' ? "bg-green-50 border border-green-200" : "bg-orange-50 border border-orange-200"}`}>
                            {anchorSaveAnim.phase === 'done' ? (
                              <>
                                <span className="text-lg shrink-0">✅</span>
                                <p className="text-sm font-semibold text-green-800">
                                  {anchorSaveAnim.time
                                    ? `Your day now flows around your ${formatDisplayTime(anchorSaveAnim.time)} booking`
                                    : `${anchorSaveAnim.name} added to your plan`}
                                </p>
                              </>
                            ) : (
                              <>
                                <motion.span
                                  animate={{ opacity: [1, 0.4, 1] }}
                                  transition={{ duration: 1.1, repeat: Infinity }}
                                  className="text-lg shrink-0"
                                >⚡</motion.span>
                                <p className="text-sm font-semibold text-orange-700">We're adjusting your day…</p>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ────────────────────────────────────────
                        TRIP REVEAL SCREEN
                        Confidence-first summary shown above
                        the full plan (expandable below).
                    ──────────────────────────────────────── */}
                    {(() => {
                      // Hide the teaser when: paywall is on and trip is unlocked, OR user explicitly dismissed it
                      if (renderMode !== "highlight" || tripIsUnlocked || teaserDismissed) return null;
                      const revDayStops = dayGroups.length > 1 ? (dayGroups[activeDay] || []) : sortedStops;
                      const isMultiCityTrip = tripCityDates && Object.keys(tripCityDates).length > 1;
                      const revCity = isMultiCityTrip
                        ? (currentTrip?.destination || currentTrip?.city || "your destination").split(",").slice(0, -1).join(",").trim() || (currentTrip?.destination || "your destination").split(",")[0].trim()
                        : (currentTrip?.city || currentTrip?.destination || "your destination").split(",")[0].trim();
                      const revAllCities = (() => {
                        const seen = new Set<string>();
                        const cities: string[] = [];
                        for (const stop of sortedStops) {
                          const cg = (stop as any).cityGroup as string | undefined;
                          if (cg && !seen.has(cg)) { seen.add(cg); cities.push(cg); }
                        }
                        return cities.length > 0 ? cities : [revCity];
                      })();
                      const revStopCount = revDayStops.length; // day-level — for time/travel calculations
                      const revTotalStopCount = dayGroups.length > 1   // all days — for the unlock page
                        ? dayGroups.reduce((total: number, day: TravelStop[]) => total + day.length, 0)
                        : sortedStops.length;
                      const revTotalMin = revDayStops.reduce((a: number, s: TravelStop) => {
                        const meta = (s.metadata as Record<string, unknown> | null | undefined);
                        const md = meta?.durationMinutes;
                        const dur = typeof md === "number" && md > 0 ? md : ((s as any).durationMinutes || 75);
                        return a + dur;
                      }, 0);
                      const revTravelMin = Math.max(0, (revStopCount - 1) * 18);
                      const revTotalHrs = Math.round((revTotalMin + revTravelMin) / 60 * 2) / 2;
                      const revHrsLabel = revTotalHrs < 1 ? `${revTotalMin + revTravelMin}m` : revTotalHrs % 1 === 0 ? `${revTotalHrs} hrs` : `${Math.floor(revTotalHrs)}.5 hrs`;
                      const revTickets = revDayStops.filter((s: TravelStop) => stopNeedsTicket(s) && !stopHasTicket(s)).length;
                      const revHasMeal = revDayStops.some((s: TravelStop) => FOOD_STOP_TYPES.includes(s.stopType || "") || (s.name || "").toLowerCase().includes("lunch") || (s.name || "").toLowerCase().includes("dinner"));
                      const revNumDays = dayGroups.length > 1 ? dayGroups.length : currentTrip?.tripDays || 1;

                      // Compute approximate times using session-based buildTimeline
                      const flowTimeline = buildTimeline(revDayStops);
                      const stopsWithTime = flowTimeline
                        .filter(item => item.kind === "stop" && item.stop && item.time)
                        .map(item => ({ stop: item.stop!, timeStr: item.time! }));
                      const PREVIEW_N = 3;
                      const previewWithTime = stopsWithTime.slice(0, PREVIEW_N);
                      const hiddenCount = stopsWithTime.length > PREVIEW_N ? stopsWithTime.length - PREVIEW_N : 0;

                      // Day summaries for Compare card
                      const allDaysList = dayGroups.length > 1 ? dayGroups : [sortedStops];
                      const dayCardSummaries = allDaysList.map((stops: TravelStop[]) => {
                        const nonFood = (stops || []).filter((s: TravelStop) => !FOOD_STOP_TYPES.includes(s.stopType || ""));
                        const names = nonFood.slice(0, 2).map((s: TravelStop) => (s.name || "").split(" ").slice(0, 3).join(" "));
                        return names.join(" + ") || "Stops planned";
                      });

                      return (
                        <div className="pb-6 bg-gray-50 min-h-screen">
                          {/* No back button — tab bar handles navigation */}
                          <div className="pt-12" />

                          {/* Day pills */}
                          {revNumDays > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4 mb-2">
                              {Array.from({ length: revNumDays }).map((_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setActiveDay(i)}
                                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                                    activeDay === i
                                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm"
                                      : "bg-white text-gray-500 border border-gray-200"
                                  }`}
                                  data-testid={`reveal-day-tab-${i}`}
                                >
                                  Day {i + 1}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 1 — HERO */}
                          <div className="px-4 pt-3 pb-2">
                            <h1 className="text-[27px] font-extrabold text-gray-900 leading-tight">
                              {tripPhase === "ready" ? "Your trip starts soon ✈️" : `🎉 Your ${revCity} trip is ready`}
                            </h1>
                            <p className="text-[14px] text-gray-500 mt-1 leading-relaxed">
                              A smooth, kid-friendly day — no rushing, no meltdowns
                            </p>
                            {tripPhase !== "ready" && (
                              <p className="text-[13px] font-semibold text-orange-600 mt-1.5">
                                You're all set. Just follow the day.
                              </p>
                            )}
                          </div>

                          {/* 2 — AT-A-GLANCE CARD */}
                          <div className="mx-4 mt-3 mb-3 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-4">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Your day at a glance</p>
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
                                <span className="text-emerald-500 font-bold">✔</span>
                                <span className="font-medium">{revStopCount} stop{revStopCount !== 1 ? "s" : ""} · ~{revHrsLabel}</span>
                              </div>
                              <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
                                <span className="text-emerald-500 font-bold">✔</span>
                                <span className="font-medium">Travel flows smoothly</span>
                              </div>
                              {revTickets > 0 ? (
                                <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
                                  <span className="text-amber-500 font-bold">✔</span>
                                  <span className="font-medium">{revTickets} ticket{revTickets !== 1 ? "s" : ""} to book</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
                                  <span className="text-emerald-500 font-bold">✔</span>
                                  <span className="font-medium">No tickets needed</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
                                <span className="text-emerald-500 font-bold">✔</span>
                                <span className="font-medium">{revHasMeal ? "Lunch break included" : "Breaks built in"}</span>
                              </div>
                            </div>
                          </div>

                          {/* ── TRIPS LIKE YOURS CAROUSEL ───────────────────── */}
                          {(() => {
                            // Other trips the user has created (excluding this one)
                            const otherTrips = (trips || []).filter((t: any) => t.id !== tripId);
                            const revUserTripCount = otherTrips.length;
                            // First photo from any other trip that has one (prefer completed/past trips)
                            const revPreviousPhoto = otherTrips
                              .map((t: any) => (t as any).firstPhotoUrl as string | null | undefined)
                              .find(url => !!url) || null;
                            return (
                              <TripsLikeYoursCarousel
                                destination={isMultiCityTrip ? (activeDayCityName || revCity || currentTrip?.destination) : (currentTrip?.city || currentTrip?.destination || revCity)}
                                country={currentTrip?.country}
                                tripType={currentTrip?.adventureStyle}
                                stops={revDayStops.slice(0, 8).map((s: TravelStop) => s.name || "").filter(Boolean)}
                                stopCount={revTotalStopCount}
                                tripDays={revNumDays}
                                tripId={tripId}
                                allCities={revAllCities}
                                onRevealPlan={() => { setTeaserDismissed(true); setRevealDetailsOpen(true); setActiveTab("trip_plan"); }}
                                hideStickyBar={teaserDismissed || inlineCTAVisible}
                                userTripCount={revUserTripCount}
                                previousTripPhotoUrl={revPreviousPhoto}
                              />
                            );
                          })()}

                          {/* 3 — WHY THIS DAY WORKS */}
                          <div className="mx-4 mb-4 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-4">
                            <p className="text-[13px] font-bold text-gray-700 mb-3">Why this day works</p>
                            <div className="space-y-2">
                              {[
                                "Short travel distances between stops",
                                "Built-in breaks so kids don't get tired",
                                "Mix of fun experiences and downtime",
                                "Kid-friendly pacing — no rushing",
                              ].map(pt => (
                                <div key={pt} className="flex items-start gap-2 text-[13px] text-gray-600">
                                  <span className="text-orange-500 font-bold shrink-0 mt-0.5">✔</span>
                                  <span>{pt}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 3.5 — READY PHASE: Before you go readiness card (uses shared day1ReadinessRows) */}
                          {tripPhase === "ready" && (() => {
                            if (day1ReadinessRows.length === 0) return null;
                            const readyUnresolved = day1ReadinessRows.filter(r => !r.resolved);
                            const readyAllClear = readyUnresolved.length === 0;
                            return (
                              <div className="mx-4 mb-4 rounded-2xl border border-amber-200 overflow-hidden" style={{ background: "#FFFBF5" }} data-testid="section-ready-checklist">
                                <div className="px-4 pt-4 pb-3">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <p className="text-[15px] font-bold text-gray-900">Before you go</p>
                                      <p className="text-[12px] text-gray-500 mt-0.5">
                                        {readyAllClear ? "You're all set for Day 1 ✅" : `${readyUnresolved.length} thing${readyUnresolved.length > 1 ? "s" : ""} to sort out`}
                                      </p>
                                    </div>
                                    {readyAllClear && <span className="text-[20px]">✅</span>}
                                  </div>
                                  {day1ReadinessRows.map((row, idx) => (
                                    <div key={row.key}>
                                      {idx > 0 && <div style={{ height: 1, background: "#F0EBE0" }} />}
                                      <button
                                        onClick={row.onTap}
                                        className="w-full flex items-center gap-3 py-2.5 active:bg-black/5 rounded-xl"
                                        data-testid={`button-ready-${row.key}`}
                                      >
                                        <span className="text-[18px] shrink-0">{row.icon}</span>
                                        <span className="flex-1 text-left text-[13px]" style={{ color: row.resolved ? "#9CA3AF" : "#2A2A2A", textDecoration: row.resolved ? "line-through" : "none" }}>
                                          {row.text}
                                        </span>
                                        {!row.resolved && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
                                        {row.resolved && <span className="text-emerald-500 text-[13px] shrink-0">✓</span>}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* 4 — PRIMARY CTA (bigger, dominant) */}
                          <div className="px-4 mb-5">
                            {/* Tooltip 1 — first-time hint */}
                            {revealTip1Visible && tripPhase !== "ready" && (
                              <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm mb-3">
                                <span className="text-[15px] shrink-0">💡</span>
                                <p className="text-[12px] text-gray-600 font-medium flex-1 leading-snug">
                                  We'll guide you through your day step by step
                                </p>
                                <button
                                  onClick={() => {
                                    setRevealTip1Visible(false);
                                    localStorage.setItem("geo-reveal-tip1-dismissed", "1");
                                  }}
                                  className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5"
                                  data-testid="button-reveal-tip1-dismiss"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            {tripPhase === "ready" ? (() => {
                              const readyHasIssues = day1ReadinessRows.some(r => !r.resolved);
                              return (
                                <button
                                  onClick={() => { if (readyHasIssues) setShowReadinessSheet(true); else setRevealDetailsOpen(true); }}
                                  className="w-full font-extrabold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                  style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)", color: "#fff", height: 56, fontSize: 17, boxShadow: "0 4px 16px rgba(212,135,43,0.45)" }}
                                  data-testid="button-reveal-ready-cta"
                                >
                                  {readyHasIssues ? "Fix these in 1 min →" : "Review Day 1"}
                                </button>
                              );
                            })() : (
                              <button
                                onClick={() => {
                                  setRevealTip1Visible(false);
                                  localStorage.setItem("geo-reveal-tip1-dismissed", "1");
                                  setRevealDetailsOpen(true);
                                }}
                                className="text-sm font-semibold transition-colors"
                                style={{ color: "#D4872B", background: "none", border: "none", cursor: "pointer", padding: "12px 0 4px", width: "100%", textAlign: "center" }}
                                data-testid="button-reveal-see-plan"
                              >
                                See your full plan →
                              </button>
                            )}
                          </div>

                          {/* ── FOR YOUR KIDS card ─────────────────────────── */}
                          <div className="px-4 mb-4">
                            <div
                              className="rounded-2xl overflow-hidden"
                              style={{
                                background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
                                border: "1px solid #DDD6FE",
                                boxShadow: "0 2px 12px rgba(109,40,217,0.08)",
                              }}
                              data-testid="card-for-kids"
                            >
                              <div className="px-4 pt-4 pb-4">
                                <div className="text-sm font-bold text-purple-900 mb-0.5">For your kids 👧🧒</div>
                                <p className="text-xs text-purple-600 mb-3 leading-relaxed">
                                  Stories, mini-missions, and quick games are built into every stop
                                </p>
                                <div className="space-y-3 mb-3">
                                  <div className="flex items-start gap-2.5">
                                    <span className="text-lg leading-none mt-0.5 shrink-0">🎧</span>
                                    <div>
                                      <div className="text-xs font-semibold text-purple-900">Short stories at each stop</div>
                                      <div className="text-xs text-purple-500 mt-0.5">Turn places into something they understand</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2.5">
                                    <span className="text-lg leading-none mt-0.5 shrink-0">🎯</span>
                                    <div>
                                      <div className="text-xs font-semibold text-purple-900">Fun missions</div>
                                      <div className="text-xs text-purple-500 mt-0.5">Spot things, guess clues, stay engaged</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2.5">
                                    <span className="text-lg leading-none mt-0.5 shrink-0">🏆</span>
                                    <div>
                                      <div className="text-xs font-semibold text-purple-900">Earn rewards</div>
                                      <div className="text-xs text-purple-500 mt-0.5">XP, travel games, and memories</div>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setKidsPreviewStopName(previewWithTime[0]?.stop?.name ?? trip?.destination ?? "your first stop");
                                    setKidsPreviewOpen(true);
                                  }}
                                  className="w-full text-center text-xs font-bold text-purple-700 py-2.5 rounded-xl transition-all active:opacity-70"
                                  style={{ background: "rgba(109,40,217,0.08)" }}
                                  data-testid="button-preview-kids-exp"
                                >
                                  Preview kids experience →
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 5 — WHAT YOU'LL DO (flow with times + dotted connectors) */}
                          <div className="px-4 mb-1">
                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-3">What you'll do</p>
                            <div>
                              {previewWithTime.map(({ stop, timeStr }: { stop: TravelStop; timeStr: string }, idx: number) => {
                                const cfg = getStopConfig(stop.stopType);
                                const needsTkt = stopNeedsTicket(stop);
                                const hasTkt = stopHasTicket(stop);
                                const isFood = FOOD_STOP_TYPES.includes(stop.stopType || "");
                                const rawDesc = (stop as any).aiDescription || stop.description || getStopContextLine(stop.stopType, stop.description) || "";
                                const shortDesc = rawDesc.length > 75 ? rawDesc.slice(0, 75) + "…" : rawDesc;
                                const isLast = idx === previewWithTime.length - 1 && hiddenCount === 0 && !revHasMeal;
                                return (
                                  <div key={stop.id} className="flex gap-2.5">
                                    {/* Timeline spine */}
                                    <div className="flex flex-col items-center shrink-0" style={{ width: 20, marginTop: 6 }}>
                                      <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0" />
                                      {!isLast && (
                                        <div style={{ width: 2, flex: 1, minHeight: 28, borderLeft: "2px dashed #FDBA74", marginTop: 4 }} />
                                      )}
                                    </div>
                                    {/* Card */}
                                    <div
                                      className="flex-1 mb-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                                      onClick={() => setSelectedDetailStop(stop)}
                                      style={{ cursor: "pointer" }}
                                      data-testid={`reveal-stop-card-${idx}`}
                                    >
                                      <div className="px-3.5 py-3">
                                        <p className="text-[11px] font-bold text-orange-400 mb-0.5">{timeStr}</p>
                                        <div className="flex items-start gap-2.5">
                                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                                            <span className="text-[13px]">{cfg.icon}</span>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-bold text-[13px] text-gray-900 leading-tight">{stop.name}</p>
                                            {shortDesc && <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{shortDesc}</p>}
                                            <div className="mt-1.5">
                                              {isFood ? (
                                                <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">🍽️ Kid-friendly spot</span>
                                              ) : needsTkt && !hasTkt ? (
                                                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">🎟 Tickets needed</span>
                                              ) : (
                                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">✔ Free entry</span>
                                              )}
                                            </div>
                                          </div>
                                          {/* Swap icon */}
                                          <button
                                            onClick={e => { e.stopPropagation(); openReplaceSheet(stop); }}
                                            className="shrink-0 w-6 h-6 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center transition-colors hover:bg-gray-100"
                                            title="Replace this stop"
                                            data-testid={`button-reveal-swap-${idx}`}
                                          >
                                            <RefreshCw className="w-2.5 h-2.5 text-gray-400" />
                                          </button>
                                        </div>
                                      </div>
                                      {/* Tooltip — first stop only */}
                                      {idx === 0 && (
                                        <div className="flex items-center justify-between px-3.5 py-1.5 bg-gray-50 border-t border-gray-100">
                                          <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                            <span>👆</span><span>Tap to see what to do there</span>
                                          </span>
                                          <button
                                            onClick={e => { e.stopPropagation(); openReplaceSheet(stop); }}
                                            className="flex items-center gap-1 text-[10px] text-orange-500 font-semibold hover:text-orange-600"
                                            data-testid={`button-reveal-swap-tooltip-${idx}`}
                                          >
                                            <RefreshCw className="w-2 h-2" /><span>Not feeling this? Swap it</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Summary footer */}
                              <div className="ml-7 flex flex-col gap-1.5 mt-1 mb-3">
                                {revHasMeal && (
                                  <div className="flex items-center gap-2 text-[12px] text-gray-500 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-orange-200 shrink-0" />
                                    <span>🍔 Lunch break built in</span>
                                  </div>
                                )}
                                {hiddenCount > 0 && (
                                  <button
                                    onClick={() => setRevealDetailsOpen(true)}
                                    className="flex items-center gap-2 text-[12px] text-orange-600 font-semibold text-left"
                                    data-testid="button-reveal-show-more"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-orange-300 shrink-0" />
                                    <span>+ {hiddenCount} more stop{hiddenCount !== 1 ? "s" : ""} planned →</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 6 — COMPARE DAYS VISUAL CARD */}
                          {allDaysList.length > 1 && (
                            <div className="mx-4 mt-3 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                              <div className="px-4 pt-4 pb-3">
                                <p className="text-[14px] font-bold text-gray-900 mb-3">🆚 Compare your days</p>
                                <div className="space-y-2.5">
                                  {dayCardSummaries.slice(0, 3).map((summary: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${i === activeDay ? "bg-orange-500" : "bg-gray-100"}`}>
                                        <span className={`text-[11px] font-bold ${i === activeDay ? "text-white" : "text-gray-600"}`}>{i + 1}</span>
                                      </div>
                                      <p className="text-[12px] text-gray-700 flex-1 leading-snug">
                                        <span className="font-semibold">Day {i + 1}</span>
                                        {" → "}{summary}
                                      </p>
                                    </div>
                                  ))}
                                  {dayCardSummaries.length > 3 && (
                                    <p className="text-[11px] text-gray-400 ml-8">+ {dayCardSummaries.length - 3} more days</p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => setShowCompareDays(true)}
                                className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-gray-100 text-[13px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors"
                                data-testid="button-reveal-compare-days"
                              >
                                <span>See which day fits best</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* 7 — SECONDARY ACTIONS */}
                          <div className="px-4 mt-3 space-y-2">
                            <button
                              onClick={() => setShowDayActionsSheet(true)}
                              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                              data-testid="button-reveal-trip-options"
                            >
                              <span>Trip options</span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                            <button
                              onClick={() => setShowTripSettings(true)}
                              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                              data-testid="button-reveal-edit-prefs"
                            >
                              <span>Edit preferences</span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>

                          {/* 8 — SEE FULL PLAN toggle */}
                          <div className="px-4 mt-3">
                            <button
                              onClick={() => setRevealDetailsOpen(v => !v)}
                              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-orange-200 text-[14px] font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-all active:scale-[0.98]"
                              data-testid="button-reveal-view-details"
                            >
                              {revealDetailsOpen ? (
                                <><span>Hide full plan</span><ChevronUp className="w-4 h-4" /></>
                              ) : (
                                <><span>See full plan</span><ChevronDown className="w-4 h-4" /></>
                              )}
                            </button>
                          </div>

                          {/* 9 — GUEST SAVE CTA removed: carousel sticky CTA handles this */}
                        </div>
                      );
                    })()}

                    {/* ── Full Trip Plan (expandable via "View Trip Details") ── */}
                    <div className={(revealDetailsOpen || renderMode === "detail") ? "block" : "hidden"}>
                    {/* ── Trip Plan sticky header ── */}
                    {(() => {
                      const tripName = currentTrip?.name || `${currentTrip?.destination || "Adventure"} Trip`;
                      const numDays = dayGroups.length > 1 ? dayGroups.length : (currentTrip as any)?.tripDays || 1;
                      const dayDate = (() => {
                        const raw = (currentTrip as any)?.startDate;
                        if (!raw) return null;
                        try {
                          const base = new Date(String(raw).slice(0, 10) + "T12:00:00");
                          base.setDate(base.getDate() + activeDay);
                          const month = base.toLocaleDateString("en-US", { month: "short" });
                          const day = base.getDate();
                          const weekday = base.toLocaleDateString("en-US", { weekday: "long" });
                          return `${month} ${day} · ${weekday}`;
                        } catch { return null; }
                      })();
                      return (
                        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm" style={{ paddingTop: 48, paddingBottom: 12, paddingLeft: 16, paddingRight: 16 }}>
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => fromExecution ? navigate(`/adventure/${tripId}/today`) : navigate("/geoadventures")}
                              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5"
                              data-testid="button-back-trip-plan"
                            >
                              <ArrowLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <h1 className="font-bold text-[19px] text-gray-900 leading-tight truncate">{tripName}</h1>
                              <p className="text-[12px] text-gray-400 mt-0.5">
                                Day {activeDay + 1} of {numDays}{dayDate ? ` · ${dayDate}` : ""}
                              </p>
                            </div>
                            <div className="flex gap-1.5 shrink-0 mt-0.5">
                              <button
                                onClick={() => setShowCompareDays(true)}
                                className="px-3 py-1.5 rounded-full border border-gray-200 text-[12px] font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                                data-testid="button-compare-days"
                              >
                                Compare Days
                              </button>
                              <button
                                onClick={() => setShowDayActionsSheet(true)}
                                className="px-3 py-1.5 rounded-full border border-gray-200 text-[12px] font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                                data-testid="button-adjust-trip"
                              >
                                Trip Options
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Settings update banner */}
                    <AnimatePresence>
                      {settingsBanner && (
                        <motion.div
                          key="settings-banner"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3"
                          style={{ background: "#1A1A1A" }}
                        >
                          <span className="text-[18px]">✅</span>
                          <div className="flex-1">
                            <p className="text-[13px] font-semibold text-white">{settingsBanner.msg}</p>
                            <p className="text-[11px] text-white/60 mt-0.5">We kept your main stops intact</p>
                          </div>
                          <button
                            onClick={() => {
                              setSettingsBanner(null);
                              setTripSettings(null);
                            }}
                            className="text-[12px] font-semibold text-orange-300 shrink-0"
                            data-testid="button-undo-settings"
                          >
                            Undo
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── Completed trip hero ────────────────────────────── */}
                    {tripPhase === "completed" && (() => {
                      const compMoments = currentTripMoments || [];
                      const compVisited = currentTripStops.filter(s => s.isVisited).length;
                      const compDays = dayGroups.length > 1 ? dayGroups.length : ((currentTrip as any)?.tripDays || 1);
                      const compFav = compMoments.filter((m: any) => m.isFavorite);
                      const highlightStops = currentTripStops
                        .filter(s => compMoments.some((m: any) => m.stopId === s.id || m.travelStopId === s.id))
                        .slice(0, 3);
                      return (
                        <div className="mx-4 mb-4" data-testid="completed-trip-hero">
                          {/* Hero block */}
                          <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #FFF8F0 0%, #FFF3E0 100%)", border: "1.5px solid #FFCC80" }}>
                            <div className="px-5 pt-5 pb-4">
                              <p className="text-[26px] font-extrabold text-gray-900 leading-tight mb-1">You did it — what a trip 🎉</p>
                              <p className="text-[13px] text-orange-700 mb-4">Your family adventure is complete</p>

                              {/* Summary card */}
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-white rounded-xl px-3 py-3 border border-orange-100">
                                  <p className="text-[22px] font-extrabold text-orange-600">{compVisited}</p>
                                  <p className="text-[11px] text-gray-500 font-medium">stops explored</p>
                                </div>
                                <div className="bg-white rounded-xl px-3 py-3 border border-orange-100">
                                  <p className="text-[22px] font-extrabold text-orange-600">{compDays}</p>
                                  <p className="text-[11px] text-gray-500 font-medium">days completed</p>
                                </div>
                                <div className="bg-white rounded-xl px-3 py-3 border border-orange-100">
                                  <p className="text-[22px] font-extrabold text-orange-600">{compMoments.length}</p>
                                  <p className="text-[11px] text-gray-500 font-medium">memories captured</p>
                                </div>
                                <div className="bg-white rounded-xl px-3 py-3 border border-orange-100">
                                  <p className="text-[22px] font-extrabold text-orange-600">{compFav.length}</p>
                                  <p className="text-[11px] text-gray-500 font-medium">favourites</p>
                                </div>
                              </div>

                              {/* Highlights section */}
                              {highlightStops.length > 0 && (
                                <div className="mb-4">
                                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Your kids explored…</p>
                                  <div className="space-y-1.5">
                                    {highlightStops.map((s) => (
                                      <div key={s.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-orange-100">
                                        <span className="text-[15px]">{getStopConfig(s.stopType).icon}</span>
                                        <p className="text-[13px] font-semibold text-gray-800 truncate flex-1">{s.name}</p>
                                        <span className="text-[11px] text-orange-500 shrink-0">📸</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* CTAs */}
                              <button
                                onClick={() => setActiveTab("memories")}
                                className="w-full font-bold py-3.5 rounded-2xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-2"
                                style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)", color: "#fff" }}
                                data-testid="button-view-memories-completed"
                              >
                                View memories →
                              </button>
                              <button
                                onClick={() => { window.location.href = "/build-adventure"; }}
                                className="w-full font-bold py-3 rounded-2xl text-sm border-2 border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                data-testid="button-plan-another-adventure"
                              >
                                Plan another adventure
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Your Bookings (Anchors) ──────────────────────────── */}
                    {currentTrip?.status !== "completed" && (
                    <div className="mx-4 mb-3" data-testid="section-fixed-plans">
                      {/* Warm-tinted container — signals this is the most important section */}
                      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 dark:bg-amber-900/20 dark:border-amber-700">
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">Your bookings</h3>
                            {tripAnchors.length > 0 ? (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                                {tripAnchors[0].time
                                  ? `Your day is built around your ${formatDisplayTime(tripAnchors[0].time)} booking`
                                  : `We built your day around ${tripAnchors.length === 1 ? "this" : "these"}`}
                              </p>
                            ) : (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400">We'll build your day around these</p>
                            )}
                          </div>
                          <button
                            onClick={() => setAnchorSheetOpen(true)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-200 text-amber-800 text-[11px] font-bold hover:bg-amber-300 transition-colors shrink-0"
                            data-testid="button-add-fixed-plan"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                        {/* Anchor chips or empty state */}
                        {tripAnchors.length === 0 ? (
                          <button
                            onClick={() => setAnchorSheetOpen(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-amber-400 text-[12px] font-bold text-amber-700 hover:bg-amber-100 transition-colors mt-1"
                            data-testid="button-add-anchor-empty"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add a booking or plan
                          </button>
                        ) : (
                          <div className="space-y-1.5 mt-2">
                            {tripAnchors.map((a, i) => {
                              const isSoft = (a as any).flexibility === "soft";
                              return (
                                <button
                                  key={(a as any).id || i}
                                  onClick={() => {
                                    setEditingAnchorIdx(i);
                                    setEditAnchorTime((a as any).time || "");
                                    setEditAnchorDay((a as any).day || 1);
                                  }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border hover:border-opacity-80 transition-colors text-left shadow-sm ${
                                    isSoft
                                      ? "bg-blue-50 border-blue-200 hover:border-blue-400"
                                      : "bg-white border-amber-200 hover:border-amber-400"
                                  }`}
                                  data-testid={`anchor-chip-${i}`}
                                >
                                  <span className="text-base shrink-0">{isSoft ? "🕐" : "🔒"}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-slate-800 truncate">{a.name}</p>
                                    <p className={`text-[10px] font-medium ${isSoft ? "text-blue-700" : "text-amber-700"}`}>
                                      Day {(a as any).day ?? a.day}{a.time ? ` · ${formatDisplayTime(a.time)}` : ""}
                                      <span className={`ml-1.5 text-[9px] font-bold uppercase tracking-wide ${isSoft ? "text-blue-400" : "text-amber-500"}`}>
                                        {isSoft ? "Flexible" : "Fixed"}
                                      </span>
                                    </p>
                                  </div>
                                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSoft ? "text-blue-400" : "text-amber-400"}`} />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* ── Edit Anchor Modal ─────────────────────────────────── */}
                    {editingAnchorIdx !== null && tripAnchors[editingAnchorIdx] && (
                      <>
                        <div className="fixed inset-0 z-[110] bg-black/40" onClick={() => setEditingAnchorIdx(null)} />
                        <div className="fixed bottom-0 left-0 right-0 z-[110] bg-white dark:bg-slate-900 rounded-t-2xl p-5 shadow-2xl max-w-lg mx-auto">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Edit booking</h3>
                              <p className="text-[11px] text-slate-500 truncate max-w-[220px]">{tripAnchors[editingAnchorIdx].name}</p>
                            </div>
                            <button onClick={() => setEditingAnchorIdx(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                              <X className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          </div>
                          <div className="space-y-3 mb-5">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Time</label>
                              <input
                                type="time"
                                value={editAnchorTime}
                                onChange={e => setEditAnchorTime(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                data-testid="edit-anchor-time"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Day</label>
                              <div className="flex gap-1.5 flex-wrap">
                                {Array.from({ length: tripNumDays ?? 7 }, (_, di) => di + 1).map(d => (
                                  <button
                                    key={d}
                                    onClick={() => setEditAnchorDay(d)}
                                    className={`w-9 h-9 rounded-full text-[12px] font-bold border transition-colors ${editAnchorDay === d ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}
                                    data-testid={`edit-anchor-day-${d}`}
                                  >
                                    {d}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                const a = tripAnchors[editingAnchorIdx];
                                const anchorId = (a as any).id;
                                const updates = { day: editAnchorDay, time: editAnchorTime || null };
                                try {
                                  if (anchorId) {
                                    await fetch(`/api/travel/anchors/${anchorId}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      credentials: "include",
                                      body: JSON.stringify(updates),
                                    });
                                  }
                                  setTripAnchors(prev => prev.map((x, j) => j === editingAnchorIdx ? { ...x, ...updates } : x));
                                  setEditingAnchorIdx(null);
                                } catch (e) {
                                  console.error("Anchor update failed:", e);
                                  toast.error("Couldn't save booking — please try again");
                                }
                              }}
                              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
                              data-testid="button-save-anchor-edit"
                            >
                              Save changes
                            </button>
                            <button
                              onClick={async () => {
                                const a = tripAnchors[editingAnchorIdx];
                                const anchorId = (a as any).id;
                                try {
                                  if (anchorId) {
                                    await fetch(`/api/travel/anchors/${anchorId}`, { method: "DELETE", credentials: "include" });
                                  }
                                  setTripAnchors(prev => prev.filter((_, j) => j !== editingAnchorIdx));
                                  setEditingAnchorIdx(null);
                                } catch (e) {
                                  console.error("Anchor delete failed:", e);
                                  toast.error("Couldn't remove booking — please try again");
                                }
                              }}
                              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 transition-colors"
                              data-testid="button-remove-anchor-edit"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Day pills — pastel green active */}
                    {dayGroups.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-3 mx-4">
                        {dayGroups.map((_, dayIdx) => (
                          <button
                            key={dayIdx}
                            onClick={() => setActiveDay(dayIdx)}
                            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                              activeDay === dayIdx
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm"
                                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                            }`}
                            data-testid={`day-tab-${dayIdx}`}
                          >
                            Day {dayIdx + 1}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Day Health Card ── */}
                    {(() => {
                      const dayStops = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops;
                      const stopCount = dayStops.length;
                      const totalMin = dayStops.reduce((a, s) => a + (s.durationMinutes || 75), 0);
                      const hrsRaw = totalMin / 60;
                      const hrsLabel = hrsRaw < 1 ? `${totalMin}m` : Number.isInteger(hrsRaw) ? `${hrsRaw} hrs` : `${Math.floor(hrsRaw)}.${Math.round((hrsRaw % 1) * 10)} hrs`;
                      const MEAL_TYPES = new Set(["restaurant", "food", "cafe", "market", "meal", "street_food"]);
                      const hasMeal = dayStops.some(s => MEAL_TYPES.has(s.stopType || "") || (s.name || "").toLowerCase().includes("lunch") || (s.name || "").toLowerCase().includes("dinner"));
                      // Pace-aware busy threshold — chill/relaxed trips get more stops before they're "busy"
                      // Supports both GeoAdventures values (chill/balanced/packed) and planner values (relaxed/moderate/busy)
                      const tripPace = currentTrip?.pace || 'balanced';
                      const isChillPace = tripPace === 'chill' || tripPace === 'relaxed';
                      const isPackedPace = tripPace === 'packed' || tripPace === 'busy';
                      const busyStopThreshold = isChillPace ? 7 : isPackedPace ? 4 : 5;
                      const busyMinThreshold = isChillPace ? 420 : isPackedPace ? 270 : 330;
                      const isBusy = stopCount >= busyStopThreshold || totalMin >= busyMinThreshold;
                      const travelSmooth = stopCount <= 4;
                      const dayNeeded = dayStops.filter((s) => stopNeedsTicket(s) && !stopHasTicket(s)).length;
                      const getDayIdentity = (): string => {
                        if (stopCount === 0) return "No stops yet";
                        const types = dayStops.map(s => s.stopType || "");
                        const names = dayStops.map(s => (s.name || "").toLowerCase());
                        const hasBeach = types.some(t => t === "beach") || names.some(n => n.includes("beach") || n.includes("surf") || n.includes("bay"));
                        const hasNature = types.some(t => ["nature", "park", "garden", "hiking", "waterfall", "nature_reserve"].includes(t));
                        const hasMuseum = types.some(t => ["museum", "gallery", "historic", "palace"].includes(t)) || names.some(n => n.includes("museum") || n.includes("gallery") || n.includes("palace") || n.includes("castle"));
                        const hasPark = types.some(t => t === "theme_park") || names.some(n => n.includes("disney") || n.includes("universal") || n.includes("legoland") || n.includes("busch"));
                        const hasFood = types.filter(t => ["restaurant", "food", "cafe", "market", "street_food"].includes(t)).length >= 2;
                        const hasAquarium = types.some(t => t === "aquarium");
                        const hasZoo = types.some(t => t === "zoo");
                        if (hasPark) return "Big outing day 🎢";
                        if (hasBeach && stopCount <= 3) return "Beach day 🏖️";
                        if (hasBeach) return "Coastal adventure 🌊";
                        if (hasFood && stopCount <= 4) return "Foodie day 🍜";
                        if (hasMuseum && !isBusy) return "Culture day 🏛️";
                        if (hasAquarium || hasZoo) return "Wildlife day 🐾";
                        if (hasNature && stopCount <= 3) return "Nature day 🌿";
                        if (isBusy) return "Full-on adventure day 💪";
                        if (stopCount <= 2) return "Easy day 😌";
                        if (hasMuseum) return "Big culture day 🎨";
                        return "Your day looks good 👍";
                      };
                      const healthLabel = getDayIdentity();
                      const isRelaxedPace = (() => {
                        if (stopCount < 2) return false;
                        const parseT = (t?: string): number | null => {
                          if (!t) return null;
                          const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
                          if (!m) return null;
                          let h = parseInt(m[1], 10); const min2 = parseInt(m[2], 10); const ap = m[3].toUpperCase();
                          if (ap === "PM" && h !== 12) h += 12; if (ap === "AM" && h === 12) h = 0;
                          return h * 60 + min2;
                        };
                        const dayTimeline = buildTimeline(dayStops);
                        const stopItems = dayTimeline.filter((i): i is Extract<typeof i, { kind: "stop" }> => i.kind === "stop");
                        if (stopItems.length < 2) return false;
                        let wideGaps = 0;
                        for (let k = 0; k < stopItems.length - 1; k++) {
                          const end = parseT(stopItems[k].endTime);
                          const nextStart = parseT(stopItems[k + 1].time);
                          if (end != null && nextStart != null && (nextStart - end - 20) >= 30) wideGaps++;
                        }
                        return wideGaps >= Math.ceil((stopItems.length - 1) / 2);
                      })();
                      const dayOverride = dayOverrides[getDayDate(activeDay)] || {};
                      const stay = getStayForDay(activeDay);
                      const startName = dayOverride.startLocation?.name || null;
                      const endName = dayOverride.endLocation?.name || stay?.name || null;
                      return (
                        <div className="mx-4 mb-3 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden" data-testid="day-health-card">
                          <div className="px-4 pt-4 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[16px] font-bold text-gray-900 leading-tight" data-testid="text-day-identity">{healthLabel}</p>
                              {isRelaxedPace && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-100" data-testid="badge-relaxed-pace">
                                  Relaxed pace
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2.5">
                              <div className="flex items-center gap-1.5 text-[13px] text-gray-600">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{stopCount} stop{stopCount !== 1 ? "s" : ""}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[13px] text-gray-600">
                                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{hrsLabel}</span>
                              </div>
                              {hasMeal && (
                                <div className="flex items-center gap-1.5 text-[13px] text-gray-600">
                                  <UtensilsCrossed className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span>Lunch included</span>
                                </div>
                              )}
                              <button
                                className="flex items-center gap-1.5 text-[13px] text-gray-600 hover:text-orange-600 transition-colors text-left"
                                onClick={() => toast.success("Short distances, easy transitions between stops")}
                                data-testid="button-travel-smooth-detail"
                              >
                                <Navigation className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{travelSmooth ? "Travel looks smooth" : "Some travel between stops"}</span>
                              </button>
                            </div>
                            {isBusy && (
                              <div className="mt-2.5 pt-2.5 border-t border-amber-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13px]">⚠️</span>
                                  <span className="text-[12px] text-amber-700 font-medium">Slightly busy after 2 PM</span>
                                </div>
                                <button
                                  onClick={() => {
                                    const unvisited = dayStops.filter(s => !s.isVisited);
                                    handleMakeDayLighter(unvisited, "lighter");
                                  }}
                                  className="text-[12px] font-semibold text-orange-600 shrink-0"
                                  data-testid="button-make-lighter-health"
                                >
                                  Make it lighter
                                </button>
                              </div>
                            )}
                            {dayNeeded > 0 && (
                              <button
                                onClick={() => setActiveTab("passes")}
                                className="mt-2 w-full text-left flex items-center gap-2 text-[12px] text-amber-600 font-medium"
                                data-testid="button-day-ticket-summary-health"
                              >
                                <Ticket className="w-3.5 h-3.5 shrink-0" />
                                {dayNeeded} ticket{dayNeeded > 1 ? "s" : ""} needed · tap to manage
                              </button>
                            )}
                          </div>
                          {tripPhase !== "completed" && <div className="px-4 pb-3 pt-0 border-t border-gray-100">
                            <div className="space-y-0 mt-2">
                              <button
                                onClick={() => openDayOverrideSheet(activeDay)}
                                className="w-full flex items-center gap-2.5 py-2 text-left hover:opacity-80 active:opacity-60 transition-opacity"
                                data-testid="button-edit-start-location"
                              >
                                <span className="text-[15px] shrink-0">📍</span>
                                <span className="flex-1 min-w-0">
                                  <span className="text-[12px] text-gray-400">Start: </span>
                                  <span className={`text-[12px] font-semibold ${startName ? "text-gray-800" : "text-gray-400"}`}>{startName || "Not set"}</span>
                                </span>
                                <span className="text-[11px] font-semibold text-orange-500 shrink-0">{startName ? "Change" : "Set"}</span>
                              </button>
                              <div className="h-px bg-gray-50 mx-1" />
                              <button
                                onClick={() => openDayOverrideSheet(activeDay)}
                                className="w-full flex items-center gap-2.5 py-2 text-left hover:opacity-80 active:opacity-60 transition-opacity"
                                data-testid="button-edit-end-location"
                              >
                                <span className="text-[15px] shrink-0">🏁</span>
                                <span className="flex-1 min-w-0">
                                  <span className="text-[12px] text-gray-400">End: </span>
                                  <span className={`text-[12px] font-semibold ${endName ? "text-gray-800" : "text-gray-400"}`}>{endName || "Not set"}</span>
                                </span>
                                <span className="text-[11px] font-semibold text-orange-500 shrink-0">{endName ? "Change" : "Set"}</span>
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">We'll plan your route from here</p>
                          </div>}
                        </div>
                      );
                    })()}

                    {/* Before you go — smart pre-day checklist card */}
                    {tripPhase !== "completed" && (() => {
                      const bygStops = dayGroups.length > 1 ? (dayGroups[activeDay] || []) : sortedStops;
                      if (bygStops.length === 0) return null;

                      type BygRow = {
                        key: string;
                        icon: string;
                        text: string;
                        priority: number;
                        critical?: boolean;
                        resolved?: boolean;
                        resolvedText?: string;
                        onTap?: () => void;
                      };

                      const rows: BygRow[] = [];

                      // 1. Tickets needed (critical)
                      const bygTicketNeeded = bygStops.filter(s => stopNeedsTicket(s) && !stopHasTicket(s)).length;
                      const bygTicketBooked = bygStops.filter(s => stopNeedsTicket(s) && stopHasTicket(s)).length;
                      if (bygTicketNeeded > 0) {
                        rows.push({
                          key: "tickets",
                          icon: "🎟",
                          text: `Tickets needed for ${bygTicketNeeded} stop${bygTicketNeeded > 1 ? "s" : ""}`,
                          priority: 1,
                          critical: true,
                          onTap: () => setActiveTab("passes"),
                        });
                      } else if (bygTicketBooked > 0) {
                        rows.push({
                          key: "tickets-ready",
                          icon: "🎟",
                          text: `${bygTicketBooked} ticket${bygTicketBooked > 1 ? "s" : ""} saved ✅`,
                          priority: 1,
                          resolved: true,
                          onTap: () => setActiveTab("passes"),
                        });
                      }

                      // 2. Parking risk for first stop (risk)
                      const firstStop = bygStops[0];
                      if (firstStop) {
                        const park = getParkingInfo(firstStop.name, firstStop.stopType, (firstStop as any).cityGroup || currentTrip?.destination);
                        if (park && (park.state === "risky" || park.state === "bad")) {
                          const hasSavedAddress = !!parkingAddresses[firstStop.id];
                          rows.push({
                            key: "parking",
                            icon: hasSavedAddress ? "✅" : "🅿️",
                            text: hasSavedAddress
                              ? `Parking saved near ${firstStop.name.split(" ").slice(0, 3).join(" ")}`
                              : `Parking ${park.state === "bad" ? "very limited" : "limited"} near ${firstStop.name.split(" ").slice(0, 3).join(" ")}`,
                            priority: 2,
                            critical: park.state === "bad" && !hasSavedAddress,
                            resolved: hasSavedAddress,
                            onTap: () => {
                              setParkingInputValue(parkingAddresses[firstStop.id] || "");
                              setParkingSheet({ stopId: firstStop.id, stopName: firstStop.name });
                            },
                          });
                        }
                      }

                      // 3. No food stop on a longer day (risk)
                      const bygHasFood = bygStops.some(s => FOOD_STOP_TYPES.includes(s.stopType || ""));
                      if (!bygHasFood && bygStops.length >= 3) {
                        const midIdx = Math.max(0, Math.floor(bygStops.length / 2) - 1);
                        rows.push({
                          key: "food",
                          icon: "🍔",
                          text: "No lunch stop — consider adding one",
                          priority: 3,
                          onTap: () => { fetchMealRecs(bygStops[midIdx] || null, bygStops[midIdx + 1] || null, "lunch"); },
                        });
                      } else if (bygHasFood) {
                        const foodStop = bygStops.find(s => ["restaurant", "food", "cafe", "market"].includes(s.stopType || ""));
                        if (foodStop) {
                          rows.push({
                            key: "food",
                            icon: "🍔",
                            text: `Lunch at ${foodStop.name.split(" ").slice(0, 4).join(" ")}`,
                            priority: 3,
                            resolved: true,
                            onTap: () => {},
                          });
                        }
                      }

                      // 4. Sunscreen / outdoor comfort
                      const bygHasOutdoor = bygStops.some(s => ["park", "beach", "nature", "garden", "monument", "attraction"].includes(s.stopType || ""));
                      if (bygHasOutdoor) {
                        rows.push({
                          key: "sunscreen",
                          icon: "☀️",
                          text: "Sunscreen recommended for outdoor stops",
                          priority: 4,
                          onTap: () => setShowPackingList(true),
                        });
                      }

                      // 5. Offline download utility
                      if (!tripOfflineReady) {
                        rows.push({
                          key: "offline",
                          icon: "⬇️",
                          text: "Download for offline use",
                          priority: 5,
                          onTap: () => { setShowDayActionsSheet(false); setTriggerOfflineOpen(true); },
                        });
                      } else {
                        rows.push({
                          key: "offline",
                          icon: "⬇️",
                          text: "Offline ready ✅",
                          priority: 5,
                          resolved: true,
                          onTap: () => {},
                        });
                      }

                      // 6. Packing list nudge (utility — only if not many other items)
                      if (rows.filter(r => !r.resolved).length <= 2) {
                        rows.push({
                          key: "packing",
                          icon: "🎒",
                          text: "Check your packing list",
                          priority: 6,
                          onTap: () => setShowPackingList(true),
                        });
                      }

                      // Sort by priority, limit to 5
                      const sorted = [...rows].sort((a, b) => a.priority - b.priority).slice(0, 5);
                      const unresolvedCount = sorted.filter(r => !r.resolved).length;
                      const allGood = unresolvedCount === 0;

                      return (
                        <div
                          className="mx-4 mb-3 rounded-2xl px-4 pt-4 pb-2"
                          style={{ background: "#F7F3EC" }}
                          data-testid="section-before-you-go"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-[16px] font-semibold text-gray-900 leading-tight">Before you go</p>
                              <p className="text-[13px] mt-0.5" style={{ color: "#7A7A7A" }}>
                                {allGood ? "You're all set for today" : `${unresolvedCount} quick thing${unresolvedCount > 1 ? "s" : ""} to check`}
                              </p>
                            </div>
                            {allGood && (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#E8F5E9" }}>
                                <span className="text-[16px]">✅</span>
                              </div>
                            )}
                          </div>

                          {/* All good state */}
                          {allGood ? (
                            <div className="py-1 pb-2 flex items-center gap-2">
                              <span className="text-[14px] text-gray-600">No open items — enjoy your day!</span>
                            </div>
                          ) : (
                            /* Rows */
                            <div>
                              {sorted.map((row, idx) => (
                                <div key={row.key}>
                                  {idx > 0 && <div style={{ height: 1, background: "#EDE9E0" }} />}
                                  <button
                                    onClick={row.onTap}
                                    className="w-full flex items-center gap-3 py-2.5 transition-colors active:bg-black/5 rounded-xl"
                                    style={row.critical ? { borderLeft: "3px solid #E67E22", paddingLeft: 8, marginLeft: -8, width: "calc(100% + 8px)" } : {}}
                                    data-testid={`button-byg-${row.key}`}
                                  >
                                    <span className="text-[19px] shrink-0 leading-none">{row.icon}</span>
                                    <span
                                      className="flex-1 text-left text-[14px] truncate"
                                      style={{ color: row.resolved ? "#9CA3AF" : "#2A2A2A", textDecoration: row.resolved ? "line-through" : "none" }}
                                    >
                                      {row.text}
                                    </span>
                                    {!row.resolved && (
                                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#B7B0A6" }} />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Stop Cards */}
                    <div
                      className="mx-4 mb-4"
                      data-testid="parent-plan-stops-list"
                      style={{
                        opacity: anchorSaveAnim?.phase === 'adjusting' || anchorSaveAnim?.phase === 'reshuffling' ? 0.72 : 1,
                        filter: anchorSaveAnim?.phase === 'reshuffling' ? 'blur(1.5px)' : 'none',
                        transition: 'opacity 0.35s ease, filter 0.35s ease',
                        pointerEvents: anchorSaveAnim && anchorSaveAnim.phase !== 'done' ? 'none' : 'auto',
                      }}
                    >
                      {(dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops).length === 0 && (
                        <div
                          className="flex flex-col items-center justify-center py-10 px-6 rounded-2xl"
                          style={{ background: '#FFF9F4', border: '1.5px dashed #E67E22' }}
                          data-testid="plan-empty-day-state"
                        >
                          <span className="text-3xl mb-3">✨</span>
                          <p className="font-semibold text-gray-800 text-base mb-1">Your day is now open</p>
                          <p className="text-sm text-gray-500 mb-4 text-center">
                            {currentTrip?.status === "completed" ? "Add memories from this day" : "No stops planned — add something or let the kids lead"}
                          </p>
                          <div className="flex gap-3">
                            {currentTrip?.status === "completed" ? (
                              <button
                                onClick={() => setShowMomentCapture(true)}
                                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                                style={{ background: '#E67E22', color: 'white' }}
                                data-testid="button-plan-empty-add-moments"
                              >
                                📸 Add moments
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSmartPill("add_stop")}
                                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                                style={{ background: '#E67E22', color: 'white' }}
                                data-testid="button-plan-empty-add-stop"
                              >
                                Add a stop
                              </button>
                            )}
                            <button
                              onClick={() => setActiveTab("current")}
                              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                              style={{ background: '#F2F2F0', color: '#444' }}
                              data-testid="button-plan-empty-explore"
                            >
                              Let kids explore
                            </button>
                          </div>
                        </div>
                      )}
                      {(() => {
                        const currentList = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops;
                        const MEAL_TYPES_SET = new Set(["restaurant", "food", "cafe", "market", "meal", "street_food", "snack"]);
                        const isMealStop = (s: TravelStop) => MEAL_TYPES_SET.has(s.stopType || "") || (s.name || "").toLowerCase().match(/\b(lunch|breakfast|snack|brunch)\b/) !== null;
                        const isDinnerStop = (s: TravelStop, _i: number) => !confirmedEveningStopIds.has(s.id) && MEAL_TYPES_SET.has(s.stopType || "") && (s.name || "").toLowerCase().includes("dinner");
                        const rawMainStops = currentList.filter((s, i) => !isDinnerStop(s, i));
                        const eveningStops = currentList.filter((s, i) => isDinnerStop(s, i));
                        // Reorder: if snack/cafe stops appear at index 0 (before any activity), move them after the first activity stop
                        const mainStops = (() => {
                          const activityFirst = rawMainStops.findIndex(s => !isMealStop(s));
                          if (activityFirst <= 0) return rawMainStops; // no reorder needed
                          const leadingMeals = rawMainStops.slice(0, activityFirst);
                          const rest = rawMainStops.slice(activityFirst);
                          // Insert leading meals after the first activity stop
                          return [rest[0], ...leadingMeals, ...rest.slice(1)];
                        })();
                        const hasExplicitLunch = mainStops.some(s => isMealStop(s));
                        const planDayAnchors = tripAnchors.filter(a => a.day === activeDay + 1);
                        const planTimeline = buildTimeline(mainStops, currentLunchOverride, planDayAnchors);

                        const _hKm = (la1: number, lo1: number, la2: number, lo2: number) => {
                          const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
                          const a = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
                          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                        };
                        type _PEI = { kind: "original"; item: typeof planTimeline[0]; tlIdx: number } | { kind: "travel"; sA: TravelStop; sB: TravelStop; key: string } | { kind: "buffer"; key: string };
                        const enhancedPlanItems: _PEI[] = [];
                        let _actCount = 0;
                        for (let _pi = 0; _pi < planTimeline.length; _pi++) {
                          const _pitem = planTimeline[_pi];
                          enhancedPlanItems.push({ kind: "original", item: _pitem, tlIdx: _pi });
                          if (_pitem.kind === "stop") {
                            const _isAct = !isMealStop(_pitem.stop);
                            if (_isAct) _actCount++;
                            const _next = planTimeline[_pi + 1];
                            if (_next && _next.kind === "stop" && !isMealStop(_next.stop)) {
                              enhancedPlanItems.push({ kind: "travel", sA: _pitem.stop, sB: _next.stop, key: `travel-${_pitem.stop.id}-${_next.stop.id}` });
                            }
                            if (_isAct && _actCount % 3 === 0) {
                              let _hasMore = false;
                              for (let _pj = _pi + 1; _pj < planTimeline.length; _pj++) { if (planTimeline[_pj].kind === "stop") { _hasMore = true; break; } }
                              if (_hasMore) enhancedPlanItems.push({ kind: "buffer", key: `buf-${_actCount}` });
                            }
                          }
                        }

                        return (
                          <>
                            {enhancedPlanItems.map((enhanced) => {
                              if (enhanced.kind === "travel") {
                                const { sA, sB, key } = enhanced;
                                const la1 = Number(sA.latitude), lo1 = Number(sA.longitude), la2 = Number(sB.latitude), lo2 = Number(sB.longitude);
                                const hasCoords = la1 && lo1 && la2 && lo2;
                                const km = hasCoords ? _hKm(la1, lo1, la2, lo2) : 1.5;
                                const isWalk = km < 0.8;
                                const mins = isWalk ? Math.max(5, Math.round(km / 0.08)) : Math.max(5, Math.round(km / 0.5));
                                return (
                                  <div key={key} className="flex items-center gap-2 px-1 my-1" style={{ paddingLeft: 33 }}>
                                    <span className="text-[13px]">{isWalk ? "🚶" : "🚗"}</span>
                                    <span className="text-[12px] text-gray-400 font-medium">{mins} min {isWalk ? "walk" : "drive"}</span>
                                    <span className="text-[10px] text-gray-300">· Easy route</span>
                                  </div>
                                );
                              }
                              if (enhanced.kind === "buffer") {
                                return (
                                  <div key={enhanced.key} className="flex items-start gap-2.5 mb-4" style={{ paddingLeft: 0 }}>
                                    <div className="flex flex-col items-center pt-1 shrink-0" style={{ width: 22 }}>
                                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px]" style={{ background: "#F0FDF4" }}>🌿</div>
                                      <div className="flex-1 w-[1.5px] mt-1" style={{ background: "repeating-linear-gradient(to bottom, #E8E8E8 0, #E8E8E8 4px, transparent 4px, transparent 8px)" }} />
                                    </div>
                                    <div className="flex-1 min-w-0 rounded-2xl px-3 py-2.5" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                                      <p className="font-bold text-[13px] text-green-800 leading-tight">Buffer time</p>
                                      <p className="text-[11px] text-green-600 mt-0.5">~20–30 min to relax or adjust</p>
                                      <p className="text-[10px] text-green-500 mt-0.5">Good time to pause, rest, or explore nearby</p>
                                    </div>
                                  </div>
                                );
                              }
                              const { item, tlIdx } = enhanced;
                              const isLastItem = tlIdx === planTimeline.length - 1 && eveningStops.length === 0;

                              if (item.kind === "breakfast") return null;

                              if (item.kind === "anchor_pin") {
                                const { anchor, time, endTime } = item;
                                const isHard = anchor.flexibility === "hard";
                                const anchorTypeEmoji: Record<string, string> = { ticket: "🎟", food: "🍽", event: "🎭", hotel: "🏨", other: "📌" };
                                const anchorTypeLabel: Record<string, string> = { ticket: "Ticket / attraction", food: "Food reservation", event: "Event / show", hotel: "Hotel / accommodation", other: "Something planned" };
                                return (
                                  <div key={`anchor-plan-${tlIdx}`} className="flex items-start gap-2.5 mb-4">
                                    <div className="flex flex-col items-center pt-1 shrink-0" style={{ width: 22 }}>
                                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px]" style={{ background: isHard ? "#FFF3E0" : "#EFF6FF" }}>
                                        {anchorTypeEmoji[anchor.anchorType] || "📌"}
                                      </div>
                                      {!isLastItem && <div className="flex-1 w-[1.5px] mt-1" style={{ background: "repeating-linear-gradient(to bottom, #E8E8E8 0, #E8E8E8 4px, transparent 4px, transparent 8px)" }} />}
                                    </div>
                                    <div className="flex-1 min-w-0 rounded-2xl px-3 py-2.5" style={{ background: isHard ? "#FFF9F0" : "#F0F6FF", border: `1.5px solid ${isHard ? "#F5A623" : "#93C5FD"}` }}>
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: isHard ? "#E67E22" : "#3B82F6" }}>
                                              {isHard ? "🔒 Fixed" : "🕐 Flexible"}
                                            </span>
                                            <span className="text-[10px] text-gray-400">· {anchorTypeLabel[anchor.anchorType] || "Planned"}</span>
                                          </div>
                                          <p className="font-bold text-[14px] leading-snug" style={{ color: '#1A1A1A' }}>{anchor.name}</p>
                                          <p className="text-[12px] mt-0.5" style={{ color: isHard ? "#E67E22" : "#3B82F6" }}>
                                            {time} – {endTime}
                                            {anchor.durationMinutes ? ` · ~${anchor.durationMinutes < 60 ? anchor.durationMinutes + " min" : Math.round(anchor.durationMinutes / 60 * 10) / 10 + "h"}` : ""}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              if (item.kind === "meal") {
                                if (hasExplicitLunch) return null;
                                const isLunch = item.mealType === "lunch";
                                const mealGapKey = `${item.mealType}_${activeDay}_${item.beforeStop?.id ?? "start"}`;
                                const autoRec = autoMealRecs[mealGapKey];
                                return (
                                  <div key={`meal-${tlIdx}`}>
                                    <div className="flex items-start gap-2.5 mb-4">
                                      <div className="flex flex-col items-center pt-1 shrink-0" style={{ width: 22 }}>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[14px]" style={{ background: isLunch ? "#FFF3E0" : "#F0FFF4" }}>
                                          {isLunch ? "🍽" : "☕"}
                                        </div>
                                        {!isLastItem && <div className="flex-1 w-[1.5px] mt-1" style={{ background: "repeating-linear-gradient(to bottom, #E8E8E8 0, #E8E8E8 4px, transparent 4px, transparent 8px)" }} />}
                                      </div>
                                      <div className="flex-1 min-w-0 rounded-2xl overflow-hidden" style={{ background: isLunch ? "#FFF8ED" : "#F0FFF4", border: `1px solid ${isLunch ? "#FFE0A3" : "#BBF7D0"}` }}>
                                        {autoRec?.loading ? (
                                          <div className="flex items-center gap-2 p-3">
                                            <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: isLunch ? "#B45309" : "#15803D" }} />
                                            <p className="text-[12px] font-semibold" style={{ color: isLunch ? "#B45309" : "#15803D" }}>
                                              Finding a {isLunch ? "lunch" : "snack"} spot for you…
                                            </p>
                                          </div>
                                        ) : autoRec?.rec ? (
                                          <div className="p-3">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                              <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[13px] leading-tight" style={{ color: isLunch ? "#92400E" : "#166534" }}>{autoRec.rec.name}</p>
                                                <p className="text-[10px] mt-0.5" style={{ color: isLunch ? "#B45309" : "#15803D" }}>
                                                  {autoRec.rec.cuisine}{autoRec.rec.walkTime ? ` · ${autoRec.rec.walkTime}` : ""} · {item.time}
                                                </p>
                                              </div>
                                              <div className="flex gap-1 shrink-0 mt-0.5">
                                                {Array.from({ length: autoRec.rec.priceLevel || 1 }).map((_, j) => (
                                                  <span key={j} className="text-green-500 text-[10px]">$</span>
                                                ))}
                                              </div>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mb-2 line-clamp-1">{autoRec.rec.kidFriendlyNote}</p>
                                            <div className="flex gap-1.5">
                                              <button
                                                onClick={() => { setMealRecPendingRec({ rec: autoRec.rec! }); setMealRecState(s => ({ ...s, visible: true, mealType: item.mealType, beforeStop: item.beforeStop, afterStop: item.afterStop })); setMealRecPlacementStopId(item.beforeStop?.id ?? null); }}
                                                className="flex-1 py-1.5 rounded-xl text-white text-[11px] font-bold transition-colors"
                                                style={{ background: "#D4872B" }}
                                                data-testid={`button-auto-rec-add-${item.mealType}`}
                                              >
                                                ✓ Add to plan
                                              </button>
                                              <button
                                                onClick={() => fetchMealRecs(item.beforeStop, item.afterStop, item.mealType)}
                                                className="flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition-colors"
                                                style={{ color: isLunch ? "#B45309" : "#15803D", borderColor: isLunch ? "#FFE0A3" : "#BBF7D0", background: "transparent" }}
                                                data-testid={`button-auto-rec-other-${item.mealType}`}
                                              >
                                                Other Options
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between p-3 pb-2.5">
                                            <div className="flex-1 min-w-0">
                                              <p className="font-bold text-[14px] leading-tight" style={{ color: isLunch ? "#92400E" : "#166534" }}>
                                                {isLunch ? "Lunch Break" : "Break / snack time"}
                                              </p>
                                              <p className="text-[11px] mt-0.5" style={{ color: isLunch ? "#B45309" : "#15803D" }}>
                                                {item.time} · ~{isLunch ? "60" : "30"} min · Kid-friendly spot nearby
                                              </p>
                                            </div>
                                            <button
                                              onClick={() => fetchMealRecs(item.beforeStop, item.afterStop, item.mealType)}
                                              className="ml-2 px-3 py-1.5 rounded-full text-[12px] font-bold text-white shrink-0"
                                              style={{ background: "#D4872B" }}
                                              data-testid={`button-find-${item.mealType}`}
                                            >
                                              {isLunch ? "Find Food" : "Find Café"}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              const stop = item.stop;
                              const cfg = getStopConfig(stop.stopType);
                              const isLast = isLastItem;
                              const times = { start: item.time, end: item.endTime };
                              const snapshot = (stop as any).metadata || {};
                              const familyFitLabel: string | null = snapshot.familyFitLabel || null;
                              const bestTimeTip: string | null = snapshot.bestTimeTip || null;
                              const parkingSignal: boolean | null = snapshot.parkingSignal ?? null;
                              const er = getEntryReadiness(stop);
                              const shortDesc = stop.description ? stop.description.split(/[.\n]/).map((s: string) => s.trim()).filter(Boolean)[0] || "" : "";
                              const isMeal = isMealStop(stop);
                              const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\b(climb|tour|visit|adventure|exploration|experience|walk|quest|hunt|treasure|discovery)\b/g, "").trim();
                              const stopNorm = normName(stop.name);
                              const matchedAnchor = tripAnchors.find(a => {
                                const an = normName(a.name);
                                return stopNorm.includes(an) || an.includes(stopNorm) || an.split(" ").some((w: string) => w.length > 4 && stopNorm.includes(w));
                              }) ?? null;

                              if (isMeal) {
                                const mealName = stop.name || "";
                                const mealLabel = mealName.toLowerCase().includes("lunch") ? "Lunch" : mealName.toLowerCase().includes("breakfast") ? "Breakfast" : mealName.toLowerCase().includes("brunch") ? "Brunch" : "Snack";
                                const mealStopIdx = mainStops.findIndex(s => s.id === stop.id);
                                const nextStop = mealStopIdx >= 0 ? mainStops[mealStopIdx + 1] : undefined;
                                return (
                                  <motion.div key={stop.id} layout transition={{ duration: 0.32, ease: "easeInOut" }} data-testid={`parent-plan-stop-${stop.id}`}>
                                    <div className="flex items-start gap-2.5 mb-4">
                                      <div className="flex flex-col items-center pt-1 shrink-0" style={{ width: 22 }}>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[14px]" style={{ background: "#FFF3E0" }}>🍽</div>
                                        {!isLast && <div className="flex-1 w-[1.5px] mt-1" style={{ background: "repeating-linear-gradient(to bottom, #E8E8E8 0, #E8E8E8 4px, transparent 4px, transparent 8px)" }} />}
                                      </div>
                                      <div
                                        data-stop-id={stop.id}
                                        className="flex-1 min-w-0 rounded-2xl overflow-hidden"
                                        style={{ background: "#FFF8ED", border: "1px solid #FFE0A3" }}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverStopId(stop.id); }}
                                        onDrop={() => handleDragDrop(stop.id)}
                                      >
                                        <div className="flex items-stretch">
                                          <div className="flex-1 min-w-0 p-3 pb-2">
                                            <p className="font-bold text-[14px] text-amber-900 leading-tight">{mealLabel} — {mealName.replace(new RegExp(`^${mealLabel}\\s*[-—]?\\s*`, "i"), "") || mealName}</p>
                                            {nextStop && <p className="text-[11px] text-amber-700 mt-0.5">Near {nextStop.name.split(" ").slice(0, 3).join(" ")}</p>}
                                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                              <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">✓ Kid-friendly</span>
                                              <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">⏱ {formatDuration(stop.durationMinutes)}</span>
                                            </div>
                                          </div>
                                          <div className="relative shrink-0 self-stretch overflow-hidden" style={{ width: 70, borderRadius: "0 16px 16px 0" }}>
                                            <PlanStopImage stopName={stop.name} cityName={(stop as any).cityGroup || currentTrip?.city || currentTrip?.destination || null} stopType={stop.stopType} country={currentTrip?.country || null} cfg={cfg} />
                                          </div>
                                        </div>
                                        <div className="flex border-t" style={{ borderColor: "#FFE0A3", paddingTop: 6, paddingBottom: 6, paddingLeft: 12, paddingRight: 12 }}>
                                          <button onClick={() => openReplaceSheet(stop)} className="flex-1 text-[12px] font-semibold text-amber-700 flex items-center justify-center gap-1" data-testid={`button-replace-meal-${stop.id}`}>
                                            <RefreshCw className="w-3 h-3" /> Change
                                          </button>
                                          <div style={{ width: 1, background: "#FFE0A3" }} />
                                          <button onClick={() => { const pl = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops; handleRemoveStopWithAnchorCheck(stop, pl.filter(s => !s.isVisited)); }} className="flex-1 text-[12px] font-semibold text-red-400 flex items-center justify-center gap-1" data-testid={`button-remove-meal-${stop.id}`}>
                                            <X className="w-3 h-3" /> Remove
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              }

                              const isNewAnchorStop = anchorSaveAnim?.phase === 'done' &&
                                stop.name?.toLowerCase().trim() === anchorSaveAnim?.name?.toLowerCase().trim();
                              return (
                                <motion.div key={stop.id} layout transition={{ duration: 0.32, ease: "easeInOut" }} data-testid={`parent-plan-stop-${stop.id}`}>
                                  {/* Stop name as section label */}
                                  <div className="flex items-center gap-2 mb-1.5 ml-7">
                                    <span className="text-[12px] font-bold text-gray-500 truncate">{stop.name}</span>
                                    <div className="flex-1 h-[1px] bg-gray-100 shrink-0" />
                                  </div>
                                  <div className="flex items-stretch gap-2.5 mb-5">
                                    {/* Timeline column */}
                                    <div className="flex flex-col items-center shrink-0" style={{ width: 22 }}>
                                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 z-10 mt-2 ${stop.isVisited ? "bg-green-500 border-green-500" : "bg-white border-gray-300"}`} />
                                      {!isLast && <div className="flex-1 w-[1.5px] mt-1" style={{ background: "repeating-linear-gradient(to bottom, #D1D5DB 0, #D1D5DB 4px, transparent 4px, transparent 8px)" }} />}
                                    </div>
                                    {/* Card */}
                                    <div
                                      data-stop-id={stop.id}
                                      className={`relative flex-1 min-w-0 transition-all ${stop.isVisited ? "opacity-60" : ""} ${dragOverStopId === stop.id && dragStopId !== stop.id ? "ring-2 ring-orange-300 rounded-2xl" : ""}`}
                                      style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: isNewAnchorStop ? "0 0 0 2.5px #f97316, 0 4px 16px rgba(249,115,22,0.22)" : "0px 2px 10px rgba(0,0,0,0.07)", transition: "box-shadow 0.4s ease" }}
                                      onDragOver={(e) => { e.preventDefault(); setDragOverStopId(stop.id); }}
                                      onDrop={() => handleDragDrop(stop.id)}
                                    >
                                      <div className="flex items-stretch">
                                        {/* Content */}
                                        <div className="flex-1 min-w-0 p-3 pb-2">
                                          {/* Time + badge row */}
                                          <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[11px] font-semibold text-gray-500">{times.start} — {times.end}</span>
                                            {familyFitLabel && (
                                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">{familyFitLabel}</span>
                                            )}
                                          </div>
                                          {/* Best time tip */}
                                          {bestTimeTip && (
                                            <p className="text-[11px] text-gray-500 flex items-center gap-1 mb-1">
                                              <Clock className="w-3 h-3 shrink-0 text-gray-400" />
                                              {bestTimeTip}
                                            </p>
                                          )}
                                          {/* Description if no tips */}
                                          {!bestTimeTip && shortDesc && (
                                            <p className="text-[11px] text-gray-500 mb-1 leading-snug">{shortDesc.length > 55 ? shortDesc.slice(0, 55) + "…" : shortDesc}</p>
                                          )}
                                          {/* Signal badges */}
                                          <div className="flex gap-1.5 flex-wrap mt-1">
                                            {matchedAnchor && (
                                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                🔒 Fixed{matchedAnchor.time ? ` · ${formatDisplayTime(matchedAnchor.time)}` : ""}
                                              </span>
                                            )}
                                            {parkingSignal === true && (
                                              <span className="text-[10px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                <ParkingCircle className="w-2.5 h-2.5" /> Parking nearby
                                              </span>
                                            )}
                                            {parkingSignal === false && (
                                              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                <ParkingCircle className="w-2.5 h-2.5" /> Parking limited
                                              </span>
                                            )}
                                            {er.type === "needed" ? (
                                              <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                <Ticket className="w-2.5 h-2.5" /> Tickets needed
                                              </span>
                                            ) : (
                                              <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">✓ Free entry</span>
                                            )}
                                          </div>
                                        </div>
                                        {/* Right image */}
                                        <div className="relative shrink-0 self-stretch overflow-hidden" style={{ width: 90 }}>
                                          <PlanStopImage stopName={stop.name} cityName={(stop as any).cityGroup || currentTrip?.city || currentTrip?.destination || null} stopType={stop.stopType} country={currentTrip?.country || null} cfg={cfg} />
                                          {stop.isVisited && (
                                            <div className="absolute inset-0 bg-green-500/40 flex items-center justify-center">
                                              <CheckCircle className="w-5 h-5 text-white drop-shadow" />
                                            </div>
                                          )}
                                          {/* Drag handle overlay — shows lock for anchor/booked stops */}
                                          {matchedAnchor ? (
                                            <div
                                              className="absolute bottom-0 right-0 w-8 h-8 flex items-center justify-center"
                                              style={{ background: "rgba(120,80,0,0.35)", borderRadius: "8px 0 0 0" }}
                                              title="This stop is fixed by an anchor"
                                              data-testid={`lock-handle-plan-${stop.id}`}
                                            >
                                              <span style={{ fontSize: 13 }}>🔒</span>
                                            </div>
                                          ) : (
                                            <div
                                              onPointerDown={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.setPointerCapture(e.pointerId);
                                                touchDragIdRef.current = stop.id;
                                                touchDragOverIdRef.current = stop.id;
                                                setDragStopId(stop.id);
                                              }}
                                              onPointerMove={(e) => {
                                                if (!touchDragIdRef.current) return;
                                                e.preventDefault();
                                                const under = document.elementFromPoint(e.clientX, e.clientY);
                                                const card = under?.closest?.('[data-stop-id]') as HTMLElement | null;
                                                const overId = card?.dataset?.stopId ?? null;
                                                if (overId && overId !== touchDragOverIdRef.current) {
                                                  touchDragOverIdRef.current = overId;
                                                  setDragOverStopId(overId);
                                                }
                                              }}
                                              onPointerUp={(e) => {
                                                if (!touchDragIdRef.current) return;
                                                e.currentTarget.releasePointerCapture(e.pointerId);
                                                const under = document.elementFromPoint(e.clientX, e.clientY);
                                                const card = under?.closest?.('[data-stop-id]') as HTMLElement | null;
                                                const tgtId = card?.dataset?.stopId ?? touchDragOverIdRef.current ?? null;
                                                const srcId = touchDragIdRef.current;
                                                touchDragIdRef.current = null;
                                                touchDragOverIdRef.current = null;
                                                setDragStopId(null);
                                                setDragOverStopId(null);
                                                if (srcId && tgtId && srcId !== tgtId) touchReorderRef.current(tgtId, srcId);
                                              }}
                                              onPointerCancel={() => {
                                                touchDragIdRef.current = null;
                                                touchDragOverIdRef.current = null;
                                                setDragStopId(null);
                                                setDragOverStopId(null);
                                              }}
                                              className="absolute bottom-0 right-0 w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing"
                                              style={{ background: "rgba(0,0,0,0.25)", borderRadius: "8px 0 0 0", touchAction: "none" }}
                                              data-testid={`drag-handle-plan-${stop.id}`}
                                            >
                                              <GripVertical className="w-3.5 h-3.5 text-white" />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {/* Action bar */}
                                      <div className="flex" style={{ borderTop: "1px solid #F0EDE8", paddingTop: 7, paddingBottom: 7, paddingLeft: 12, paddingRight: 12, gap: 0 }}>
                                        <button onClick={() => { setQuickSheetStop(stop); setShowStopQuickSheet(true); }} className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-gray-500 py-1 rounded-lg hover:bg-gray-50" data-testid={`button-view-details-${stop.id}`}>
                                          <Info className="w-3.5 h-3.5" /> Details
                                        </button>
                                        {stop.isVisited ? (
                                          <button onClick={() => setRevisitSheetStop(stop)} className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-orange-500 py-1 rounded-lg hover:bg-orange-50" style={{ borderLeft: "1px solid #F0EDE8" }} data-testid={`button-revisit-stop-${stop.id}`}>
                                            <BookOpen className="w-3.5 h-3.5" /> Revisit
                                          </button>
                                        ) : (
                                          <button onClick={() => openReplaceSheet(stop)} className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-gray-500 py-1 rounded-lg hover:bg-gray-50" style={{ borderLeft: "1px solid #F0EDE8" }} data-testid={`button-replace-stop-${stop.id}`}>
                                            <RefreshCw className="w-3.5 h-3.5" /> Replace
                                          </button>
                                        )}
                                        <button onClick={() => setOpenStopMenu(openStopMenu === stop.id ? null : stop.id)} className="flex items-center justify-center px-3 text-gray-400 hover:bg-gray-50 rounded-lg" style={{ borderLeft: "1px solid #F0EDE8" }} data-testid={`button-stop-menu-${stop.id}`}>
                                          <MoreVertical className="w-4 h-4" />
                                        </button>
                                      </div>
                                      {/* 3-dot dropdown */}
                                      {openStopMenu === stop.id && (
                                        <>
                                        <div className="fixed inset-0 z-20" onClick={() => setOpenStopMenu(null)} />
                                        <div className="absolute right-0 bottom-12 z-30 bg-white shadow-lg border border-gray-100 rounded-xl overflow-hidden min-w-[150px]">
                                          <button onClick={() => { setOpenStopMenu(null); setActiveTab("passes"); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                            <Ticket className="w-4 h-4 text-orange-500" /> Add ticket
                                          </button>
                                          <button onClick={() => { setOpenStopMenu(null); handleGetDirections(stop); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                            <Navigation className="w-4 h-4 text-blue-500" /> Directions
                                          </button>
                                          {dayGroups.length > 1 && (
                                            <button
                                              onClick={() => { setOpenStopMenu(null); openMoveStopSheet(stop); }}
                                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
                                              data-testid={`button-plan-move-${stop.id}`}
                                            >
                                              <ArrowRight className="w-4 h-4 text-green-500" /> Move stop
                                            </button>
                                          )}
                                          <button
                                            onClick={() => { setOpenStopMenu(null); const pl = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops; handleRemoveStopWithAnchorCheck(stop, pl.filter(s => !s.isVisited)); }}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
                                            data-testid={`button-plan-remove-${stop.id}`}
                                          >
                                            <Trash2 className="w-4 h-4" /> Remove stop
                                          </button>
                                        </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}

                            {/* ── Evening (optional) section ── */}
                            {eveningStops.length > 0 && (
                              <div className="mb-4">
                                <button
                                  onClick={() => setEveningSectionExpanded(v => !v)}
                                  className="flex items-center gap-2 mb-3 w-full"
                                  data-testid="button-toggle-evening"
                                >
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full" style={{ background: "#EEF2FF" }}>
                                    <span className="text-[12px]">🌙</span>
                                  </div>
                                  <span className="text-[13px] font-semibold text-gray-500">Evening <span className="text-[11px] font-normal text-gray-400">(optional)</span></span>
                                  <div className="flex-1 h-[1px] bg-gray-100" />
                                  <span className="text-gray-300">{eveningSectionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                                </button>
                                <AnimatePresence>
                                  {eveningSectionExpanded && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                                      {eveningStops.map((stop) => {
                                        const mealName = stop.name || "";
                                        const shortDesc = stop.description ? stop.description.split(/[.\n]/).map((s: string) => s.trim()).filter(Boolean)[0] || "" : "";
                                        return (
                                          <div key={stop.id} className="flex items-start gap-2.5 mb-3" data-testid={`parent-plan-stop-${stop.id}`}>
                                            <div className="flex flex-col items-center shrink-0" style={{ width: 22 }}>
                                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px]" style={{ background: "#EEF2FF" }}>🌙</div>
                                            </div>
                                            <div className="flex-1 min-w-0 rounded-2xl p-3 pb-2" style={{ background: "#F5F3FF", border: "1px solid #DDD6FE" }}>
                                              <p className="font-bold text-[13px] text-purple-900 leading-tight">Dinner — {mealName.replace(/^dinner\s*[-—]?\s*/i, "") || mealName}</p>
                                              {shortDesc && <p className="text-[11px] text-purple-600 mt-0.5">{shortDesc.length > 60 ? shortDesc.slice(0, 60) + "…" : shortDesc}</p>}
                                              <div className="flex gap-2 mt-2">
                                                <button onClick={() => {
                                                  const next = new Set(confirmedEveningStopIds);
                                                  next.add(stop.id);
                                                  setConfirmedEveningStopIds(next);
                                                  try { localStorage.setItem(`confirmedEvening_${tripId}`, JSON.stringify([...next])); } catch {}
                                                  toast.success("Dinner added to tonight's plan!");
                                                }} className="text-[11px] font-semibold text-purple-700 bg-white border border-purple-100 px-3 py-1 rounded-full" data-testid={`button-add-evening-${stop.id}`}>Add to plan</button>
                                                <button onClick={() => { const pl = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops; handleRemoveStopWithAnchorCheck(stop, pl.filter(s => !s.isVisited)); }} className="text-[11px] font-semibold text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full" data-testid={`button-remove-evening-${stop.id}`}>Remove</button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* Add another stop — matches Today tab's orange dashed button */}
                      <button
                        onClick={() => handleSmartPill("add_stop")}
                        className="w-full mt-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style={{
                          height: 46,
                          borderRadius: 12,
                          border: '1.5px dashed #E67E22',
                          background: '#FFF9F4',
                          color: '#E67E22',
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                        data-testid="smart-pill-add_stop"
                      >
                        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add a stop
                      </button>
                    </div>

                    {/* Today's Passes (inline) */}
                    {walletItems.filter((i) => i.type === "ticket" || i.type === "confirmation").length > 0 && (
                      <div className="mx-4 mb-4" data-testid="today-passes-section">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Today's Passes</p>
                        <div className="space-y-2">
                          {walletItems.filter((i) => i.type === "ticket" || i.type === "confirmation").map((item) => (
                            <div
                              key={item.id}
                              className="bg-white border border-orange-100 rounded-xl p-3 flex items-center gap-3 shadow-sm"
                              data-testid={`today-pass-${item.id}`}
                            >
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shrink-0">
                                <Ticket className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">{item.label}</p>
                                {item.confirmationNumber && (
                                  <p className="text-xs text-gray-400 font-mono">#{item.confirmationNumber}</p>
                                )}
                              </div>
                              <button
                                onClick={() => setSelectedTicket(item)}
                                className="shrink-0 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                                data-testid={`button-view-pass-${item.id}`}
                              >
                                View →
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View route on map collapsible — same accordion as Today tab */}
                    <div className="mx-4 mb-4">
                      <button
                        onClick={() => setShowMapCollapse(v => !v)}
                        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity active:scale-[0.98]"
                        style={{ background: 'white', borderRadius: showMapCollapse ? '12px 12px 0 0' : 12, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#1F1F1F' }}
                        data-testid="button-view-route-map"
                      >
                        <span className="flex items-center gap-2">📍 View route on map</span>
                        {showMapCollapse ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>
                      <AnimatePresence>
                        {showMapCollapse && currentTrip && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 340, opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onAnimationComplete={() => {
                              if (showMapCollapse) setMapCollapseReady(true);
                            }}
                            style={{ borderRadius: '0 0 12px 12px', overflow: 'hidden' }}
                          >
                            {mapCollapseReady && (
                              <div style={{ width: '100%', height: 340 }}>
                                <FamilyTravelMap
                                  trips={trips}
                                  currentTrip={currentTrip}
                                  stops={sortedStops}
                                  moments={currentTripMoments || []}
                                  memoryStars={0}
                                  onClose={() => setShowMapCollapse(false)}
                                  onStopClick={(stop) => { setShowMapCollapse(false); setDetailsStopOverride(stop); setShowStopDetails(true); }}
                                  onTripSelect={() => {}}
                                  initialView="trip"
                                />
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Inline Day CTA — sits at bottom of stop list, not floating */}
                    {tripPhase !== "completed" && (() => {
                      const adStops = dayGroups.length > 1 ? (dayGroups[activeDay] || []) : sortedStops;
                      const adVisited = adStops.filter(s => s.isVisited);
                      const adAllDone = adStops.length > 0 && adVisited.length === adStops.length;
                      const adStarted = adVisited.length > 0 || isDayStarted;
                      const adTotalMins = adStops.reduce((acc, s) => acc + (s.durationMinutes || 75), 0);
                      const adHrsLabel = adTotalMins >= 60
                        ? `~${Math.floor(adTotalMins / 60)}h${adTotalMins % 60 > 0 ? `${adTotalMins % 60}m` : ""}`
                        : `~${adTotalMins}m`;
                      const makeLighter = () => {
                        const unvisited = adStops.filter(s => !s.isVisited);
                        handleMakeDayLighter(unvisited, "lighter");
                      };

                      // Dynamic CTA for STATE 2 (execution mode)
                      const totalDays = dayGroups.length > 1 ? dayGroups.length : 1;
                      const actionDayIdx = (() => {
                        if (dayGroups.length <= 1) return 0;
                        for (let i = 0; i < dayGroups.length; i++) {
                          if ((dayGroups[i] || []).some(s => !s.isVisited)) return i;
                        }
                        return dayGroups.length - 1;
                      })();
                      const allDaysComplete = dayGroups.length > 1
                        ? dayGroups.every(day => (day || []).every(s => s.isVisited))
                        : sortedStops.every(s => s.isVisited);
                      const isLastActionDay = actionDayIdx === totalDays - 1;
                      const dynamicCtaLabel = allDaysComplete
                        ? "Finish Your Adventure →"
                        : totalDays <= 1
                        ? "Start your day →"
                        : actionDayIdx === 0
                        ? "Start Day 1 →"
                        : `Continue with Day ${actionDayIdx + 1} →`;
                      const dynamicCtaAction = () => {
                        if (allDaysComplete) handleClickFinishAdventure();
                        else { setActiveDay(actionDayIdx); setActiveTab("todays_plan"); }
                      };

                      return (
                        <div ref={inlineCTARef} className="px-4 pt-3 pb-10">
                          <p className="text-center text-[11px] text-gray-400 mb-2">
                            Day {activeDay + 1}{dayGroups.length > 1 ? ` of ${dayGroups.length}` : ""} · {adStops.length} stop{adStops.length !== 1 ? "s" : ""} · {adHrsLabel}
                          </p>
                          {adAllDone ? (
                            <button disabled className="w-full bg-green-100 text-green-700 font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 opacity-90" data-testid="button-day-complete-inline">
                              ✓ Day {activeDay + 1} Complete
                            </button>
                          ) : adStarted ? (
                            <>
                              <button onClick={() => navigate(`/adventure/${tripId}/today`)} className="w-full font-bold py-3.5 rounded-2xl text-sm shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-2" style={{ background: "#f97316", color: "#fff" }} data-testid="button-continue-day-inline">
                                ▶ Continue Day {activeDay + 1}
                              </button>
                              {adStops.length > 1 && (
                                <button onClick={makeLighter} className="w-full py-2 text-[12px] font-semibold text-gray-400 hover:text-orange-600 transition-colors flex items-center justify-center gap-1.5" data-testid="button-make-lighter-inline">
                                  Make it lighter
                                </button>
                              )}
                            </>
                          ) : planReadyShown ? (
                            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 mb-2">
                              <p className="text-[12px] font-bold text-orange-700 mb-2">✓ Plan ready</p>
                              <div className="flex flex-col gap-1.5">
                                <button onClick={() => { setPlanReadyShown(false); setActiveTab("todays_plan"); }} className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white" style={{ background: "#f97316" }} data-testid="button-view-todays-plan-inline">
                                  View Today's Plan →
                                </button>
                                {adStops.length > 1 && (
                                  <button onClick={makeLighter} className="w-full py-2 text-[12px] font-semibold text-orange-600 hover:text-orange-700 transition-colors flex items-center justify-center gap-1.5" data-testid="button-make-lighter-plan-inline">
                                    Make it lighter
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : renderMode === "highlight" && !teaserDismissed && paywallEnabled && !tripIsUnlocked ? (
                            <>
                              {adStops.length > 1 && (
                                <button onClick={makeLighter} className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm bg-white hover:bg-gray-50 transition-colors" data-testid="button-make-lighter-bottom-inline">
                                  Make it lighter
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                onClick={dynamicCtaAction}
                                className="w-full font-bold py-3.5 rounded-2xl text-sm shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-2"
                                style={{ background: "#f97316", color: "#fff" }}
                                data-testid="button-dynamic-day-cta"
                              >
                                {dynamicCtaLabel}
                              </button>
                              {adStops.length > 1 && (
                                <button onClick={makeLighter} className="w-full py-2 text-[12px] font-semibold text-gray-400 hover:text-orange-600 transition-colors flex items-center justify-center gap-1.5" data-testid="button-make-lighter-bottom-inline">
                                  Make it lighter
                                </button>
                              )}
                              {renderMode === "detail" && isLastActionDay && currentTrip?.status !== "completed" && (
                                <button
                                  onClick={handleClickFinishAdventure}
                                  className="w-full mt-5 flex items-center justify-center gap-2 text-[15px] font-semibold text-[#6B6B6B] hover:text-gray-900 transition-colors"
                                  data-testid="button-finish-adventure-trip-plan"
                                >
                                  🏁 Finish adventure
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })()}
                    </div>
                    {/* ── end Full Trip Plan expandable ── */}

                    {/* ── Compare Days full-screen modal ── */}
                    <AnimatePresence>
                      {showCompareDays && (() => {
                        const allDays = dayGroups.length > 1 ? dayGroups : [sortedStops];
                        const MEAL_T = new Set(["restaurant", "food", "cafe", "market", "meal", "street_food"]);

                        const getDayScore = (stops: TravelStop[]) => {
                          const totalMin = stops.reduce((a, s) => a + (s.durationMinutes || 75), 0);
                          const hrs = totalMin / 60;
                          const travelMin = Math.max(0, (stops.length - 1) * 20);
                          return Math.round(stops.length * 10 + hrs * 4 + travelMin / 12 * 2);
                        };

                        const rawLabelFromScore = (score: number) =>
                          score < 35 ? "Light day" : score < 60 ? "Balanced" : score < 80 ? "Busy" : "Packed";

                        // Normalize distribution: when all days share the same label, spread them by rank
                        const rawLabels = allDays.map(d => (d?.length ?? 0) === 0 ? "Empty" : rawLabelFromScore(getDayScore(d || [])));
                        const nonEmpty = rawLabels.filter(l => l !== "Empty");
                        const uniqueRaw = new Set(nonEmpty);
                        const normalizedLabels: string[] = [...rawLabels];
                        if (uniqueRaw.size === 1 && nonEmpty.length > 1) {
                          const tier = nonEmpty[0];
                          const tierOrder = ["Packed", "Busy", "Balanced", "Light day"];
                          const tierIdx = tierOrder.indexOf(tier);
                          const scoredIdxs = allDays.map((d, i) => ({ i, score: getDayScore(d || []), empty: (d?.length ?? 0) === 0 })).filter(x => !x.empty).sort((a, b) => b.score - a.score);
                          scoredIdxs.forEach(({ i }, rank) => {
                            normalizedLabels[i] = tierOrder[Math.min(tierIdx + rank, tierOrder.length - 1)];
                          });
                        }

                        const getLoadInfo = (score: number, stopCount: number, normLabel?: string) => {
                          if (stopCount === 0) return { label: "Empty", color: "#9CA3AF", bg: "#F3F4F6", emoji: "⚪" };
                          const label = normLabel || rawLabelFromScore(score);
                          if (label === "Light day") return { label: "Light day", color: "#6B7280", bg: "#F9FAFB", emoji: "⚪" };
                          if (label === "Balanced") return { label: "Balanced", color: "#16A34A", bg: "#F0FDF4", emoji: "🟢" };
                          if (label === "Busy") return { label: "Busy", color: "#D97706", bg: "#FFFBEB", emoji: "🟡" };
                          return { label: "Packed", color: "#DC2626", bg: "#FEF2F2", emoji: "🔴" };
                        };

                        const getSpecificWarning = (stops: TravelStop[], score: number, segs: ReturnType<typeof getSegments>, travelMin: number): string | null => {
                          if (score < 60) return null;
                          if (stops.length > 5) return `Most families hit a wall after stop 4 — this day has ${stops.length}`;
                          if (travelMin > 90) return `Long drives between stops — bring activities for the car`;
                          if (segs.afternoon.density === "packed") return "Expect tired kids after lunch — afternoon is packed";
                          if (segs.morning.density === "busy" && segs.afternoon.density === "busy") return "Non-stop from morning — pace will drop mid-afternoon";
                          if (segs.evening.density === "busy" || segs.evening.density === "packed") return "Evening runs late — plan dinner ahead of time";
                          if (travelMin > 60) return `Long gaps between stops — you'll need snack breaks`;
                          return score >= 80 ? "You'll likely feel rushed toward the end of the day" : "Slightly busy — may need one extra break";
                        };

                        const getSegments = (stops: TravelStop[]) => {
                          const tl = buildTimeline(stops);
                          const countIn = (start: number, end: number) =>
                            tl.filter(i => i.kind === "stop" && (() => {
                              const t = (i as any).time as string;
                              const [ts, ap] = t.split(" ");
                              let [h] = ts.split(":").map(Number);
                              if (ap === "PM" && h !== 12) h += 12;
                              if (ap === "AM" && h === 12) h = 0;
                              return h * 60 >= start && h * 60 < end;
                            })()).length;
                          const morning = countIn(9 * 60, 12 * 60);
                          const afternoon = countIn(12 * 60, 17 * 60);
                          const evening = countIn(17 * 60, 24 * 60);
                          const density = (n: number) => n === 0 ? "free" : n <= 1 ? "smooth" : n <= 2 ? "busy" : "packed";
                          return {
                            morning: { count: morning, density: density(morning) },
                            afternoon: { count: afternoon, density: density(afternoon) },
                            evening: { count: evening, density: density(evening) },
                          };
                        };

                        const densityColor: Record<string, string> = {
                          free: "#E5E7EB", smooth: "#22C55E", busy: "#F59E0B", packed: "#EF4444"
                        };
                        const densityLabel: Record<string, string> = {
                          free: "Free", smooth: "Smooth", busy: "Busy", packed: "Packed"
                        };

                        const packedDays = normalizedLabels.filter(l => l === "Packed").length;
                        const busyOrPackedDays = normalizedLabels.filter(l => l === "Packed" || l === "Busy").length;
                        const tripHealthMsg = busyOrPackedDays === 0
                          ? "✨ Your trip looks well balanced"
                          : packedDays === 0
                            ? `⚠ ${busyOrPackedDays} day${busyOrPackedDays !== 1 ? "s" : ""} may feel busy — quick fixes available`
                            : packedDays === 1
                              ? "⚠ 1 day may feel rushed — a quick fix is recommended"
                              : `⚠ ${packedDays} days may feel rushed — quick fixes recommended`;

                        return (
                          <motion.div
                            key="compare-days-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-white flex flex-col"
                            style={{ overscrollBehavior: "contain" }}
                          >
                            {/* Header */}
                            <div className="flex-shrink-0 px-4 pt-safe pt-4 pb-3 border-b border-gray-100 bg-white">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="font-bold text-[19px] text-gray-900">Trip Overview</p>
                                  <p className="text-[12px] text-gray-400 mt-0.5">{currentTrip?.name || currentTrip?.destination || "Your trip"}</p>
                                </div>
                                <button
                                  onClick={() => { setShowCompareDays(false); setSelectedCompareDay(null); }}
                                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                                  data-testid="button-close-compare-days"
                                >
                                  <X className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                              {/* Toggle */}
                              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#F3F4F6" }}>
                                <button
                                  onClick={() => setCompareDaysView("summary")}
                                  className="flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
                                  style={compareDaysView === "summary" ? { background: "white", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "#6B7280" }}
                                  data-testid="button-compare-view-summary"
                                >
                                  Summary
                                </button>
                                <button
                                  onClick={() => setCompareDaysView("timeline")}
                                  className="flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
                                  style={compareDaysView === "timeline" ? { background: "white", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "#6B7280" }}
                                  data-testid="button-compare-view-timeline"
                                >
                                  Timeline
                                </button>
                              </div>
                            </div>

                            {/* Trip health bar */}
                            <div className="flex-shrink-0 mx-4 mt-3 px-3 py-2.5 rounded-xl text-[12px] font-medium"
                              style={{ background: packedDays === 0 ? "#F0FDF4" : "#FFFBEB", color: packedDays === 0 ? "#15803D" : "#92400E" }}>
                              {tripHealthMsg}
                            </div>

                            {/* ─── SUMMARY VIEW ─── */}
                            {compareDaysView === "summary" && (
                              <div className="flex-1 overflow-y-auto px-4 pt-3 pb-8">
                                {allDays.map((dayStopList, dIdx) => {
                                  const dayStops = dayStopList || [];
                                  const score = getDayScore(dayStops);
                                  const segs = getSegments(dayStops);
                                  const load = getLoadInfo(score, dayStops.length, normalizedLabels[dIdx]);
                                  const totalMin = dayStops.reduce((a, s) => a + (s.durationMinutes || 75), 0);
                                  const hrs = +(totalMin / 60).toFixed(1);
                                  const travelMin = Math.max(0, (dayStops.length - 1) * 20);
                                  const hasMeal = dayStops.some(s => MEAL_T.has(s.stopType || ""));
                                  const isActiveDay = dIdx === activeDay;
                                  const dayCity = (() => {
                                    if (dayStops.length > 0) {
                                      const raw = (dayStops[0] as any)?.cityGroup || "";
                                      if (!/^Day \d+$/i.test(raw.trim())) return raw;
                                    }
                                    return dayToCityName[dIdx] || currentTrip?.destination || "";
                                  })();
                                  const warning = getSpecificWarning(dayStops, score, segs, travelMin);

                                  return (
                                    <button
                                      key={dIdx}
                                      onClick={() => setSelectedCompareDay(dIdx)}
                                      className="w-full text-left mb-3 rounded-2xl overflow-hidden transition-all active:scale-[0.99]"
                                      style={{
                                        background: isActiveDay ? load.bg : "white",
                                        border: isActiveDay ? `1.5px solid ${load.color}33` : "1.5px solid #F3F4F6",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                                      }}
                                      data-testid={`compare-day-card-${dIdx}`}
                                    >
                                      <div className="p-4">
                                        {/* Row 1: Day + load badge */}
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-bold"
                                              style={{ background: isActiveDay ? load.color : "#F3F4F6", color: isActiveDay ? "white" : "#374151" }}>
                                              {dIdx + 1}
                                            </div>
                                            <div>
                                              <p className="font-bold text-[14px] text-gray-900 leading-tight">Day {dIdx + 1}{dayCity ? ` — ${dayCity}` : ""}</p>
                                            </div>
                                          </div>
                                          <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: load.bg, color: load.color }}>
                                            {load.emoji} {load.label}
                                          </span>
                                        </div>
                                        {/* Row 2: Stats */}
                                        <div className="flex items-center gap-3 text-[12px] text-gray-500 mb-2.5">
                                          <span>📍 {dayStops.length} stop{dayStops.length !== 1 ? "s" : ""}</span>
                                          {dayStops.length > 0 && <span>⏱ {hrs} hrs</span>}
                                          {travelMin > 0 && <span>🚗 {travelMin} min travel</span>}
                                          {hasMeal && <span>🍔 Lunch</span>}
                                        </div>
                                        {/* Row 3: Segment indicators */}
                                        {dayStops.length > 0 && (
                                          <div className="flex gap-2">
                                            {(["morning", "afternoon", "evening"] as const).map(seg => (
                                              <div key={seg} className="flex-1">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                  <div className="w-2 h-2 rounded-full" style={{ background: densityColor[segs[seg].density] }} />
                                                  <span className="text-[10px] text-gray-400 capitalize">{seg.slice(0, 3)}</span>
                                                </div>
                                                <div className="h-1.5 rounded-full" style={{ background: densityColor[segs[seg].density] + "33" }}>
                                                  <div className="h-full rounded-full transition-all" style={{ background: densityColor[segs[seg].density], width: segs[seg].density === "free" ? "0%" : segs[seg].density === "smooth" ? "40%" : segs[seg].density === "busy" ? "70%" : "100%" }} />
                                                </div>
                                                <p className="text-[9px] text-gray-400 mt-0.5">{densityLabel[segs[seg].density]}</p>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {/* Warning */}
                                        {warning && (
                                          <p className="text-[11px] font-medium mt-2.5" style={{ color: load.color }}>
                                            ⚠ {warning}
                                          </p>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                                {/* Fix entire trip CTA */}
                                <div className="mt-2 mb-2">
                                  <button
                                    onClick={() => { setFixEntireTripStep("diagnosis"); }}
                                    className="w-full py-3.5 rounded-2xl text-[14px] font-bold border-2"
                                    style={{ borderColor: "#D4872B", color: "#D4872B", background: "white" }}
                                    data-testid="button-fix-entire-trip"
                                  >
                                    Fix entire trip
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* ─── TIMELINE VIEW ─── */}
                            {compareDaysView === "timeline" && (
                              <div className="flex-1 overflow-x-auto overflow-y-auto">
                                {/* How your days flow header */}
                                <div className="px-4 pt-3 pb-2">
                                  <p className="text-[13px] font-bold text-gray-700">How your days flow</p>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-[11px] text-gray-500 font-medium">🌅 Morning</span>
                                    <span className="text-gray-300">·</span>
                                    <span className="text-[11px] text-gray-500 font-medium">☀️ Afternoon</span>
                                    <span className="text-gray-300">·</span>
                                    <span className="text-[11px] text-gray-500 font-medium">🌙 Evening</span>
                                    {allDays.length > 1 && (
                                      <span className="text-[10px] text-orange-500 font-semibold ml-auto">✦ Drag stops between days</span>
                                    )}
                                  </div>
                                </div>
                                {(() => {
                                  const timelineBookedIds = new Set(walletItems.filter(w => w.stopId && (w.type === "ticket" || w.type === "reservation" || w.type === "confirmation")).map(w => w.stopId!));
                                  const anchorPlaceNames = new Set(tripAnchors.map(a => a.placeName?.toLowerCase().trim() ?? "").filter(Boolean));
                                  const isStopLocked = (s: TravelStop) => timelineBookedIds.has(s.id) || anchorPlaceNames.has(s.name?.toLowerCase().trim() ?? "");
                                  return (
                                    <div className="flex gap-3 px-4 pt-1 pb-8" style={{ minWidth: `${Math.max(allDays.length * 150, 320)}px` }}>
                                    {allDays.map((dayStopList, dIdx) => {
                                      const dayStops = dayStopList || [];
                                      const score = getDayScore(dayStops);
                                      const load = getLoadInfo(score, dayStops.length, normalizedLabels[dIdx]);
                                      const dayCity = (() => {
                                        if (dayStops.length > 0) {
                                          const raw = (dayStops[0] as any)?.cityGroup || "";
                                          if (!/^Day \d+$/i.test(raw.trim())) return raw.split(" ")[0];
                                        }
                                        return (dayToCityName[dIdx] || currentTrip?.destination || "").split(" ")[0];
                                      })();
                                      const MEAL_TYPES = new Set(["restaurant", "food", "cafe", "market", "meal", "street_food"]);
                                      let curMin = 9 * 60;
                                      const entries: { type: "stop" | "travel" | "free" | "section"; label?: string; stop?: TravelStop; gapMin?: number; bg?: string }[] = [];
                                      let lastSection = "";
                                      dayStops.forEach((stop, i) => {
                                        const hour = Math.floor(curMin / 60);
                                        const section = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
                                        if (section !== lastSection) {
                                          entries.push({ type: "section", label: section });
                                          lastSection = section;
                                        }
                                        entries.push({ type: "stop", stop });
                                        const dur = stop.durationMinutes || 75;
                                        curMin += dur;
                                        if (i < dayStops.length - 1) {
                                          curMin += 20;
                                          const nextHour = Math.floor(curMin / 60);
                                          const nextSection = nextHour < 12 ? "Morning" : nextHour < 17 ? "Afternoon" : "Evening";
                                          if (nextSection !== section && curMin % 60 > 30) {
                                            entries.push({ type: "free", gapMin: Math.round((curMin % 60)) });
                                          }
                                        }
                                      });
                                      const isDropTarget = crossDayDropDayIdx === dIdx && crossDayDragStopId !== null;
                                      return (
                                        <div
                                          key={dIdx}
                                          className="flex-shrink-0 flex flex-col"
                                          style={{ width: 140 }}
                                          onDragOver={(e) => { e.preventDefault(); setCrossDayDropDayIdx(dIdx); }}
                                          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setCrossDayDropDayIdx(null); }}
                                          onDrop={() => { if (crossDayDragStopId) handleCrossDayMove(crossDayDragStopId, dIdx); }}
                                        >
                                          {/* Day header */}
                                          <div className="mb-2.5 px-1">
                                            <div className="flex items-center justify-between mb-0.5">
                                              <div className="text-[11px] font-bold text-gray-700">Day {dIdx + 1}</div>
                                              <div className="text-[9px] font-semibold" style={{ color: load.color }}>{load.emoji} {load.label}</div>
                                            </div>
                                            {dayCity && <div className="text-[9px] text-gray-400">{dayCity}</div>}
                                          </div>
                                          {/* Timeline entries */}
                                          <div
                                            className="flex flex-col gap-1 rounded-xl transition-all"
                                            style={{
                                              minHeight: 40,
                                              padding: isDropTarget ? "4px" : "0",
                                              background: isDropTarget ? "#FFF4EC" : "transparent",
                                              border: isDropTarget ? "1.5px dashed #E8962F" : "1.5px solid transparent",
                                            }}
                                          >
                                            {dayStops.length === 0 && !isDropTarget && (
                                              <div className="w-full rounded-lg px-2 py-3 text-center" style={{ background: "#F9FAFB", border: "1px dashed #E5E7EB" }}>
                                                <p className="text-[9px] text-gray-400">No stops</p>
                                              </div>
                                            )}
                                            {dayStops.length === 0 && isDropTarget && (
                                              <div className="w-full rounded-lg px-2 py-3 text-center" style={{ background: "#FFF4EC" }}>
                                                <p className="text-[9px] text-orange-500 font-semibold">Drop here</p>
                                              </div>
                                            )}
                                            {entries.map((entry, ei) => {
                                              if (entry.type === "section") {
                                                const sectionEmoji = entry.label === "Morning" ? "🌅" : entry.label === "Afternoon" ? "☀️" : entry.label === "Evening" ? "🌙" : "";
                                                return (
                                                  <div key={`sec-${ei}`} className="flex items-center gap-1 mt-1.5 mb-0.5">
                                                    <div className="h-px flex-1 bg-gray-100" />
                                                    <span className="text-[8px] font-semibold text-gray-500 tracking-wide">{sectionEmoji} {entry.label}</span>
                                                    <div className="h-px flex-1 bg-gray-100" />
                                                  </div>
                                                );
                                              }
                                              if (entry.type === "free") {
                                                return (
                                                  <div key={`free-${ei}`} className="text-center py-0.5">
                                                    <span className="text-[8px] text-gray-400 italic">— Free time —</span>
                                                  </div>
                                                );
                                              }
                                              const stop = entry.stop!;
                                              const isMeal = MEAL_TYPES.has(stop.stopType || "");
                                              const locked = isStopLocked(stop);
                                              const isDraggingThis = crossDayDragStopId === stop.id;
                                              const durH = stop.durationMinutes ? +(stop.durationMinutes / 60).toFixed(1) : null;
                                              const heightPx = Math.max(36, Math.min(72, (stop.durationMinutes || 75) * 0.55));
                                              return (
                                                <div
                                                  key={stop.id}
                                                  className="w-full rounded-lg px-2 py-1.5 flex flex-col justify-between relative"
                                                  draggable={!locked && !stop.isVisited}
                                                  onDragStart={(e) => { if (locked || stop.isVisited) { e.preventDefault(); return; } setCrossDayDragStopId(stop.id); e.dataTransfer.effectAllowed = "move"; }}
                                                  onDragOver={(e) => e.preventDefault()}
                                                  onDragEnd={() => { setCrossDayDragStopId(null); setCrossDayDropDayIdx(null); }}
                                                  style={{
                                                    background: isMeal ? "#FFF8ED" : stop.isVisited ? "#F0FDF4" : "#F8F9FA",
                                                    border: `1px solid ${isMeal ? "#FFE0A3" : stop.isVisited ? "#BBF7D0" : "#E5E7EB"}`,
                                                    minHeight: heightPx,
                                                    opacity: isDraggingThis ? 0.4 : 1,
                                                    cursor: locked || stop.isVisited ? "default" : "grab",
                                                    transition: "opacity 0.15s",
                                                  }}
                                                  data-testid={`timeline-stop-${stop.id}`}
                                                >
                                                  <p className="text-[9px] font-semibold text-gray-700 leading-tight line-clamp-2">
                                                    {locked ? "🔒 " : isMeal ? "🍔 " : ""}{stop.name}
                                                  </p>
                                                  {durH && <p className="text-[8px] text-gray-400 mt-0.5">{durH}h</p>}
                                                  {!locked && !stop.isVisited && (
                                                    <div className="absolute top-1 right-1 opacity-30">
                                                      <GripVertical className="w-2.5 h-2.5 text-gray-500" />
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  </div>
                                  );
                                })()}
                              </div>
                            )}

                            {/* ─── Day detail bottom sheet ─── */}
                            <AnimatePresence>
                              {selectedCompareDay !== null && (() => {
                                const dIdx = selectedCompareDay;
                                const dayStops = allDays[dIdx] || [];
                                const score = getDayScore(dayStops);
                                const load = getLoadInfo(score, dayStops.length);
                                const unvisited = dayStops.filter(s => !s.isVisited);
                                const dayCity = (() => {
                                  if (dayStops.length > 0) {
                                    const raw = (dayStops[0] as any)?.cityGroup || "";
                                    if (!/^Day \d+$/i.test(raw.trim())) return raw;
                                  }
                                  return dayToCityName[dIdx] || currentTrip?.destination || "";
                                })();
                                const travelMinDetail = Math.max(0, (dayStops.length - 1) * 20);
                                const segsDetail = getSegments(dayStops);
                                const reasons: string[] = [];
                                if (dayStops.length > 5) reasons.push(`Most families hit a wall after stop 4 — this day has ${dayStops.length}`);
                                if (travelMinDetail > 90) reasons.push(`Long drives between stops (${travelMinDetail} min) — bring car activities`);
                                if (segsDetail.afternoon.density === "packed") reasons.push("Expect tired kids after lunch — afternoon is packed");
                                else if (segsDetail.afternoon.density === "busy" && segsDetail.morning.density === "busy") reasons.push("Non-stop from morning — pace drops mid-afternoon");
                                if (segsDetail.evening.density === "busy" || segsDetail.evening.density === "packed") reasons.push("Evening runs late — plan dinner ahead");
                                if (reasons.length === 0 && score >= 80) reasons.push("You'll likely feel rushed toward the end of the day");
                                if (reasons.length === 0 && score >= 60) reasons.push("Slightly busy — may need one extra break");
                                const normLabel = normalizedLabels[dIdx];
                                const summaryMsg = normLabel === "Packed"
                                  ? "This day feels a bit packed ⚠️"
                                  : normLabel === "Busy"
                                    ? "This day is on the busier side"
                                    : normLabel === "Light day"
                                      ? "This is a relaxed day"
                                      : "This day looks well balanced";
                                return (
                                  <motion.div
                                    key="day-detail-sheet"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-10 flex flex-col justify-end"
                                    style={{ background: "rgba(0,0,0,0.4)" }}
                                    onClick={() => setSelectedCompareDay(null)}
                                  >
                                    <motion.div
                                      initial={{ y: "100%" }}
                                      animate={{ y: 0 }}
                                      exit={{ y: "100%" }}
                                      transition={{ type: "spring", damping: 28, stiffness: 320 }}
                                      className="bg-white rounded-t-3xl px-4 pt-4 pb-8"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[22px]">{load.emoji}</span>
                                        <div>
                                          <p className="font-bold text-[17px] text-gray-900">Day {dIdx + 1}{dayCity ? ` — ${dayCity}` : ""}</p>
                                          <p className="text-[12px] font-semibold" style={{ color: load.color }}>{load.label}</p>
                                        </div>
                                      </div>
                                      <p className="text-[14px] font-semibold text-gray-800 mb-2">{summaryMsg}</p>
                                      {reasons.length > 0 && (
                                        <div className="mb-3 flex flex-col gap-1">
                                          {reasons.map((r, ri) => (
                                            <div key={ri} className="flex items-center gap-2 text-[12px] text-gray-500">
                                              <span className="text-amber-500">•</span> {r}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {score >= 70 && (
                                        <p className="text-[12px] text-gray-400 italic mb-4">
                                          💡 Suggested fix: Remove 1–2 stops + add a break
                                        </p>
                                      )}
                                      <p className="text-[11px] text-gray-400 mb-3">
                                        ℹ️ Fixes stay within {dayCity || "this city"} only — no cross-city changes
                                      </p>
                                      <div className="flex flex-col gap-2">
                                        {score >= 70 && (
                                          <button
                                            onClick={() => {
                                              setSelectedCompareDay(null);
                                              setShowCompareDays(false);
                                              setActiveDay(dIdx);
                                              setFixDayDiagnosisSheet({ dayIdx: dIdx, stops: dayStops, cityName: dayCity, score });
                                            }}
                                            className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white"
                                            style={{ background: "#D4872B" }}
                                            data-testid={`button-fix-this-day-${dIdx}`}
                                          >
                                            Fix this day →
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            setSelectedCompareDay(null);
                                            setShowCompareDays(false);
                                            setActiveDay(dIdx);
                                          }}
                                          className="w-full py-3 rounded-2xl text-[14px] font-semibold text-gray-700 border border-gray-200"
                                          data-testid={`button-view-details-${dIdx}`}
                                        >
                                          View details
                                        </button>
                                      </div>
                                    </motion.div>
                                  </motion.div>
                                );
                              })()}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === "todays_plan" && (() => {
              // ── Completed trip on Today tab ──────────────────────────────────
              if (tripPhase === "completed") {
                const compMoments = currentTripMoments || [];
                const compVisited = currentTripStops.filter(s => s.isVisited).length;
                const compDays = dayGroups.length > 1 ? dayGroups.length : ((currentTrip as any)?.tripDays || 1);
                const compFav = compMoments.filter((m: any) => m.isFavorite);
                const highlightStops = currentTripStops
                  .filter(s => compMoments.some((m: any) => m.stopId === s.id || m.travelStopId === s.id))
                  .slice(0, 3);
                return (
                  <div className="px-4 pt-6 pb-[120px]" data-testid="today-completed-hero">
                    <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #FFF8F0 0%, #FFF3E0 100%)", border: "1.5px solid #FFCC80" }}>
                      <div className="px-5 pt-5 pb-4">
                        <p className="text-[26px] font-extrabold text-gray-900 leading-tight mb-1">You did it — what a trip 🎉</p>
                        <p className="text-[13px] text-orange-700 mb-4">Your family adventure is complete</p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="bg-white rounded-xl px-3 py-3 border border-orange-100">
                            <p className="text-[22px] font-extrabold text-orange-600">{compVisited}</p>
                            <p className="text-[11px] text-gray-500 font-medium">stops explored</p>
                          </div>
                          <div className="bg-white rounded-xl px-3 py-3 border border-orange-100">
                            <p className="text-[22px] font-extrabold text-orange-600">{compDays}</p>
                            <p className="text-[11px] text-gray-500 font-medium">days completed</p>
                          </div>
                          <div className="bg-white rounded-xl px-3 py-3 border border-orange-100">
                            <p className="text-[22px] font-extrabold text-orange-600">{compMoments.length}</p>
                            <p className="text-[11px] text-gray-500 font-medium">memories captured</p>
                          </div>
                          <div className="bg-white rounded-xl px-3 py-3 border border-orange-100">
                            <p className="text-[22px] font-extrabold text-orange-600">{compFav.length}</p>
                            <p className="text-[11px] text-gray-500 font-medium">favourites</p>
                          </div>
                        </div>
                        {highlightStops.length > 0 && (
                          <div className="mb-4">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Your kids explored…</p>
                            <div className="space-y-1.5">
                              {highlightStops.map((s) => (
                                <div key={s.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-orange-100">
                                  <span className="text-[15px]">{getStopConfig(s.stopType).icon}</span>
                                  <p className="text-[13px] font-semibold text-gray-800 truncate flex-1">{s.name}</p>
                                  <span className="text-[11px] text-orange-500 shrink-0">📸</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => setActiveTab("memories")}
                          className="w-full font-bold py-3.5 rounded-2xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-2"
                          style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)", color: "#fff" }}
                          data-testid="button-today-view-memories"
                        >
                          📸 View Trip Memories
                        </button>
                        <button
                          onClick={() => setActiveTab("trip_plan")}
                          className="w-full font-bold py-3 rounded-2xl text-sm text-orange-700 bg-orange-50 border border-orange-200 transition-all active:scale-[0.98]"
                          data-testid="button-today-view-plan"
                        >
                          View Full Trip Story
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const todayStops = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops)
                .filter(s => !skippedStopIds.includes(s.id));
              const todayAnchors = tripAnchors.filter(a => a.day === activeDay + 1);
              const timeline = buildTimeline(todayStops, currentLunchOverride, todayAnchors);
              const todayFreedSlots = (freedSlotsMap[lunchPosKey] || []);
              const todayVisited = todayStops.filter((s) => s.isVisited).length;
              const todayTotal = todayStops.length;

              const _preTripDaysUntil = (() => {
                if (currentTrip?.adventureStartedAt) return null; // trip already running
                let sd = currentTrip?.startDate ? String(currentTrip.startDate).slice(0, 10) : null;
                // Fallback: earliest date from cityDates
                if (!sd) {
                  const cd = (currentTrip as any)?.cityDates as Record<string, { startDate?: string }> | null | undefined;
                  if (cd) {
                    const starts = Object.values(cd).map(r => r.startDate).filter(Boolean) as string[];
                    if (starts.length > 0) sd = starts.sort()[0];
                  }
                }
                if (!sd) return -1; // no date at all — trip not started, no dates set
                const [y, m, d] = sd.split("-").map(Number);
                const start = new Date(y, m - 1, d);
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const diff = Math.round((start.getTime() - today.getTime()) / 86400000);
                return diff >= 0 ? diff : null; // null if start date is in the past but not started (shouldn't happen)
              })();

              if (_preTripDaysUntil !== null && _preTripDaysUntil !== 0) {
                const daysNum = _preTripDaysUntil;
                const noDate = daysNum === -1;
                const today = daysNum === 0;
                const soon = daysNum >= 1 && daysNum <= 2;
                const close = daysNum >= 3 && daysNum <= 7;
                // >7 days = far out

                const headline = noDate ? "Your trip is planned!"
                  : today ? "Today's the day! 🎉"
                  : soon ? `Trip starts ${daysNum === 1 ? "tomorrow" : "in 2 days"}! 🚀`
                  : close ? `${daysNum} days to go! ✈️`
                  : `${daysNum} days until adventure! 🌍`;

                const subline = noDate ? "Your itinerary is ready — browse your stops in the Trip Plan tab."
                  : today ? "Your itinerary is ready — head to your first stop!"
                  : soon ? "Almost time! Do a final check before you leave."
                  : close ? "Your plan is set — a few things to confirm."
                  : "Plenty of time to get ready. Check your plan below.";

                const checklistItems = noDate || daysNum > 7 ? [
                  { emoji: "📋", text: "Browse your stops in the Trip Plan tab" },
                  { emoji: "🎟", text: "Review any tickets you'll need" },
                  { emoji: "💼", text: "Save your bookings to Trip Wallet" },
                  { emoji: "📍", text: "Explore stop locations on the map" },
                ] : soon || today ? [
                  { emoji: "🎒", text: "Bags packed? Check off your essentials" },
                  { emoji: "🎟", text: "Got your tickets? Check the Passes tab" },
                  { emoji: "💼", text: "Booking confirmations saved to Trip Wallet?" },
                  { emoji: "📍", text: "First stop address ready to go" },
                ] : [
                  { emoji: "🎟", text: "Review tickets needed in the Passes tab" },
                  { emoji: "💼", text: "Add bookings to your Trip Wallet" },
                  { emoji: "📍", text: "Check stop locations on the map" },
                  { emoji: "🧒", text: "Tell the kids what's coming — build excitement!" },
                ];

                const cardGradient = today || soon
                  ? "linear-gradient(135deg, #E67E22 0%, #D4872B 100%)"
                  : close
                  ? "linear-gradient(135deg, #16A34A 0%, #059669 100%)"
                  : "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)";

                const ticketsNeeded = sortedStops
                  .filter((s: TravelStop) => stopNeedsTicket(s) && !stopHasTicket(s));

                return (
                  <div className="px-4 pt-6 pb-6">
                    <div
                      className="rounded-2xl p-5 text-white mb-4 shadow-md"
                      style={{ background: cardGradient }}
                      data-testid="card-pretrip-countdown"
                    >
                      <div className="text-3xl mb-2">{today || soon ? "🚀" : close ? "✈️" : "🌍"}</div>
                      <p className="text-lg font-bold leading-snug mb-1">{headline}</p>
                      <p className="text-white/80 text-sm">{subline}</p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
                      <p className="text-sm font-bold text-gray-800 mb-3">
                        {today || soon ? "Last things to check ✅" : "Before you go ✅"}
                      </p>
                      <div className="space-y-2.5">
                        {checklistItems.map((item) => (
                          <div key={item.text} className="flex items-start gap-2.5">
                            <span className="text-base shrink-0">{item.emoji}</span>
                            <span className="text-sm text-gray-600 leading-snug">{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Missing start date warning */}
                    {noDate && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-3 flex items-start gap-3" data-testid="card-missing-start-date">
                        <span className="text-xl shrink-0">📅</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-amber-800 leading-snug">No start date set</p>
                          <p className="text-xs text-amber-600 mt-0.5 leading-snug">Adding your travel dates helps GeoBuddy give accurate guidance, timing, and reminders.</p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setActiveTab("trip_plan")}
                      className="w-full py-3 rounded-2xl bg-orange-500 text-white font-bold text-sm shadow-sm active:scale-95 transition-transform mb-2"
                      data-testid="button-pretrip-view-plan"
                    >
                      View Trip Plan →
                    </button>

                    {(noDate || ticketsNeeded.length > 0) && (
                      <button
                        onClick={() => { setFixItDate(currentTrip?.startDate ? currentTrip.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10)); setShowFixItSheet(true); }}
                        className="w-full py-3 rounded-2xl bg-white border border-orange-300 text-orange-700 font-semibold text-sm shadow-sm active:scale-95 transition-transform mb-2"
                        data-testid="button-pretrip-fix-it"
                      >
                        Fix This {noDate && ticketsNeeded.length > 0 ? "— add date & review tickets" : noDate ? "— add start date" : "— review tickets needed"}
                      </button>
                    )}

                    {/* Tertiary link — view full day details */}
                    <button
                      onClick={() => { setActiveDay(0); setActiveTab("trip_plan"); setRevealDetailsOpen(true); }}
                      className="w-full py-2 text-center text-sm text-orange-500 font-semibold underline underline-offset-2 active:opacity-70 transition-opacity"
                      data-testid="button-pretrip-view-day1-details"
                    >
                      View Day 1 details
                    </button>
                  </div>
                );
              }

              const needTitle = "Need something right now?";
              const needSuggestions: Record<string, { emoji: string; text: string; sub: string }> = {
                break: { emoji: "😮‍💨", text: "Find a shaded spot or café nearby — free entry, no tickets", sub: "5–10 min away · walk right in · perfect reset" },
                food: { emoji: "🍔", text: "Top kid-friendly restaurants nearby", sub: "Within 10 min · no booking needed · family-checked" },
                keep_going: { emoji: "🚀", text: "Stay on plan — next stop is optimised", sub: "You're doing great, keep the energy up" },
                more_fun: { emoji: "🎈", text: "Quick bonus stop kids will love — tickets available instantly", sub: "15–20 min detour · buy at the door · worth it" },
              };

              // Context detection for smart adjustment cards
              const unvisitedStops = todayStops.filter(s => !s.isVisited);
              const skippedCount = todayVisited < todayTotal * 0.3 && todayTotal > 2 ? todayTotal - todayVisited : 0;
              const isHeavyDay = todayTotal >= 4;
              const currentHour = new Date().getHours();
              const isRunningLate = currentHour >= 15 && unvisitedStops.length >= 2;

              type AdjCard = { id: string; icon: string; label: string; sub: string; cta: string };
              let adjustCards: AdjCard[];
              if (isRunningLate) {
                adjustCards = [
                  { id: "shorten", icon: "⚡", label: "Shorten remaining stops", sub: "15 min each — keep the highlights", cta: "Apply" },
                  { id: "skip_low", icon: "🎯", label: "Skip low-priority stops", sub: "Keep only the ones that matter most", cta: "Apply" },
                  { id: "break_stop", icon: "☕", label: "Add a quick break", sub: "Reset before the next stop", cta: "Add" },
                ];
              } else if (skippedCount >= 2) {
                adjustCards = [
                  { id: "rebalance", icon: "↕️", label: "Rebalance remaining stops", sub: "Redistribute to fit your pace", cta: "Apply" },
                  { id: "essentials", icon: "🎯", label: "Keep only must-see stops", sub: "Trim to the essentials", cta: "Apply" },
                  { id: "break_stop", icon: "☕", label: "Add a break", sub: "Take a breather then continue", cta: "Add" },
                ];
              } else if (isHeavyDay) {
                adjustCards = [
                  { id: "lighter", icon: "⚡", label: "Make today lighter", sub: "Reduce walking + total time", cta: "Apply" },
                  { id: "break_stop", icon: "☕", label: "Add a break", sub: "Insert a 15–20 min rest", cta: "Add" },
                  { id: "essentials", icon: "🎯", label: "Essentials only", sub: "Keep the must-see stops", cta: "Apply" },
                ];
              } else {
                adjustCards = [
                  { id: "lighter", icon: "⚡", label: "Lighten day", sub: "Fewer stops, less rushing", cta: "Apply" },
                  { id: "break_stop", icon: "☕", label: "Add a break", sub: "Perfect reset for the kids", cta: "Add" },
                  { id: "essentials", icon: "🎯", label: "Essentials only", sub: "Trim to the must-see stops", cta: "Apply" },
                ];
              }

              // Live status strip
              const nextStopItem = timeline.find(i => i.kind === "stop" && !(i as { kind: "stop"; stop: TravelStop; time: string }).stop.isVisited);
              const nextStopForStrip = nextStopItem?.kind === "stop" ? nextStopItem.stop : null;
              const nextStopTime = nextStopItem?.kind === "stop" ? nextStopItem.time : "";
              const crowdLabel = (() => {
                const h = new Date().getHours();
                if (h < 10) return { text: "✨ Best Time Now", sub: "Start here before crowds arrive", color: "text-green-700", bg: "bg-green-100" };
                if (h < 13) return { text: "✅ Good Timing", sub: "Moderate crowds — good window", color: "text-blue-600", bg: "bg-blue-100" };
                if (h < 17) return { text: "☀️ Afternoon Window", sub: "Grab a snack before if hungry", color: "text-amber-700", bg: "bg-amber-100" };
                return { text: "🕔 Busy Hour", sub: "Expect some waits", color: "text-red-600", bg: "bg-red-100" };
              })();

              // Compute "in X min" and "Leave by" for control bar
              const ctrlBarMeta = (() => {
                if (!nextStopTime) return null;
                const parseTime = (t: string) => {
                  const [hm, ampm] = t.split(" ");
                  const [h, m] = hm.split(":").map(Number);
                  return ((ampm === "PM" && h !== 12) ? h + 12 : (ampm === "AM" && h === 12) ? 0 : h) * 60 + (m || 0);
                };
                const stopMins = parseTime(nextStopTime);
                const now = new Date();
                const nowMins = now.getHours() * 60 + now.getMinutes();
                const diffMins = stopMins - nowMins;
                const inText = diffMins <= 0 ? "Now" : diffMins < 60 ? `in ${diffMins} min` : `in ${Math.round(diffMins / 60)}h`;
                // Leave by = stopTime - 20 min travel
                const leaveMins = stopMins - 20;
                const leaveH = Math.floor(leaveMins / 60);
                const leaveM = leaveMins % 60;
                const leaveAmpm = leaveH >= 12 ? "PM" : "AM";
                const leaveH12 = leaveH % 12 || 12;
                const leaveBy = `${leaveH12}:${leaveM.toString().padStart(2, "0")} ${leaveAmpm}`;
                return { inText, leaveBy };
              })();
              const dayLabel = (() => {
                if (!currentTrip?.startDate) return `DAY ${activeDay + 1}`;
                const d = new Date(currentTrip.startDate);
                d.setDate(d.getDate() + activeDay);
                const weekday = d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
                const month = d.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
                return `DAY ${activeDay + 1} — ${weekday}, ${month} ${d.getDate()}`;
              })();
              let stopNum = 0;

              return (
                <motion.div
                  key="todays_plan"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="-mx-4 space-y-0"
                >
                  {/* ── HERO HEADER ── */}
                  {(() => {
                    // Compute the actual date for this day — fallback to today when startDate not set
                    const dayDate = (() => {
                      const base = currentTrip?.startDate ? new Date(currentTrip.startDate) : new Date();
                      base.setDate(base.getDate() + activeDay);
                      const month = base.toLocaleDateString("en-US", { month: "long" });
                      return `${toOrdinal(base.getDate())} ${month}, ${base.getFullYear()}`;
                    })();
                    return (
                  <div
                    className="relative"
                    style={{ height: 190 }}
                  >
                    {/* Image + overlay in their own overflow-hidden shell */}
                    <div className="absolute inset-0 overflow-hidden rounded-none">
                      {cityHeroImage && (
                        <img src={cityHeroImage} alt={currentTrip?.destination || ""} className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      {/* Light cream overlay — image is very subtle underneath */}
                      <div className="absolute inset-0" style={{ background: 'rgba(246,244,239,0.88)' }} />
                    </div>

                    {/* Floating back button — top-left, over the hero image */}
                    <button
                      onClick={() => fromExecution ? navigate(`/adventure/${tripId}/today`) : navigate("/geoadventures")}
                      className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm text-gray-600 hover:text-gray-900"
                      data-testid="button-back-today"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {fromExecution && <span className="text-xs font-medium">Back to today</span>}
                    </button>

                    {/* Day picker pill — top-right corner, outside overflow-hidden so dropdown is never clipped */}
                    {dayGroups.length > 1 && (
                      <div className="absolute top-3 right-3 z-20">
                        <button
                          onClick={() => setShowDayPicker(p => !p)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-md"
                          style={{ background: '#E67E22', minWidth: 64 }}
                          data-testid="button-today-day-picker"
                        >
                          Day {activeDay + 1}
                          <ChevronDown className={`w-3 h-3 transition-transform ${showDayPicker ? 'rotate-180' : ''}`} />
                        </button>
                        {showDayPicker && (
                          <>
                            {/* backdrop to close */}
                            <div className="fixed inset-0 z-30" onClick={() => setShowDayPicker(false)} />
                            <div
                              className="absolute right-0 top-9 z-40 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5"
                              style={{ minWidth: 120, maxHeight: 260, overflowY: 'auto' }}
                            >
                              {dayGroups.map((_, idx) => {
                                const isToday = idx === todayDayOffset;
                                const isSelected = idx === activeDay;
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => { setActiveDay(idx); setShowDayPicker(false); }}
                                    className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-orange-50"
                                    style={{ color: isSelected ? '#E67E22' : '#1F1F1F', fontWeight: isSelected ? 700 : 500, fontSize: 13 }}
                                    data-testid={`button-day-picker-day-${idx + 1}`}
                                  >
                                    <span>Day {idx + 1}</span>
                                    {isToday && <span className="text-[10px] font-bold text-orange-400 bg-orange-50 px-1.5 py-0.5 rounded-full ml-1">Today</span>}
                                    {isSelected && !isToday && <span className="text-orange-500 ml-1">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="relative px-4 pt-12">
                      <p style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B6B6B', marginTop: 0, marginBottom: 0 }}>
                        {currentTrip?.destination || currentTrip?.city || "Adventure"} · DAY {activeDay + 1}
                      </p>
                      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 600, color: '#1F1F1F', lineHeight: '34px', marginTop: 4, marginBottom: 0 }}>
                        Today's Plan
                      </h2>
                      <p style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>
                        {todayVisited}/{todayTotal} stops visited
                      </p>
                      {/* Temperature + Date meta row */}
                      <div className="flex items-center gap-3 mt-2.5" style={{ flexWrap: 'wrap' }}>
                        {weatherState.tempC != null && (
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#3A3A3A' }}>
                            {weatherState.tempC}°C / {weatherState.tempF}°F
                          </span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#5A5A5A' }}>
                          {dayDate}
                        </span>
                      </div>
                    </div>
                  </div>
                    );
                  })()}

                  {/* ── PREVIEW MODE BANNER (trip in planning phase only) ── */}
                  {tripPhase === "planning" && (
                    <div className="mx-4 mt-3 mb-1">
                      <div
                        className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
                        style={{ background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', border: '1.5px solid #FFB74D' }}
                      >
                        <span style={{ fontSize: 20 }}>🗓</span>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#E65100', marginBottom: 1 }}>Plan Preview</p>
                          <p style={{ fontSize: 11, color: '#BF360C', lineHeight: '15px' }}>
                            {(currentTrip as any)?.startDate
                              ? `Your adventure starts ${new Date(String((currentTrip as any).startDate).slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })} — everything is saved!`
                              : "Review your plan below — set your travel dates to see exact day numbers."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── WEATHER RAIN BANNER ── */}
                  {(() => {
                    if (!weatherState.isRainy || weatherBannerDismissedToday) return null;
                    const unvisited = todayStops.filter(s => !s.isVisited);
                    const affectedStop = unvisited.find(s => OUTDOOR_STOP_TYPES_W.has(s.stopType ?? "")) ?? null;
                    if (!affectedStop) return null;
                    const city = currentTrip?.destination || currentTrip?.city || "";
                    const stopNames = unvisited.map(s => s.name);
                    return (
                      <div className="mx-4 mt-3">
                        <div
                          className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
                          style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
                          data-testid="banner-weather-rain-today"
                        >
                          <CloudRain className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-blue-900 leading-tight">🌧 Rain expected today</p>
                            <p className="text-xs text-blue-700 mt-0.5 leading-snug">
                              {affectedStop.name} may not work well in the rain
                            </p>
                            <button
                              onClick={() => handleOpenWeatherFixToday(affectedStop, city, stopNames)}
                              className="mt-2 text-xs font-bold text-blue-600 underline"
                              data-testid="button-weather-see-options-today"
                            >
                              See options →
                            </button>
                          </div>
                          <button
                            onClick={() => setWeatherBannerDismissedToday(true)}
                            className="shrink-0 p-1 -mt-0.5 text-blue-400 hover:text-blue-600"
                            data-testid="button-weather-banner-dismiss-today"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── CONTROL BAR (Start Day or Next Stop) ── */}
                  {(() => {
                    if (tripPhase === "completed") return null;
                    const effectiveDayStarted = isDayStarted || todayVisited > 0;
                    if (!effectiveDayStarted && nextStopForStrip && renderMode === "detail") {
                      return (
                        <div className="mx-4" style={{ marginTop: 12 }}>
                          <div
                            className="flex items-center justify-between"
                            style={{ background: 'linear-gradient(135deg, #2D2D1E 0%, #4A4637 100%)', borderRadius: 18, padding: '16px 18px', minHeight: 80, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}
                          >
                            <div className="flex-1 min-w-0">
                              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>🌤 Ready to begin Day {activeDay + 1}?</p>
                              <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 0 }}>First stop: {nextStopForStrip.name}</p>
                            </div>
                            <button
                              onClick={markDayStarted}
                              className="shrink-0 font-extrabold rounded-2xl transition-all active:scale-95"
                              style={{ background: 'linear-gradient(135deg, #E8962F 0%, #D4872B 100%)', color: 'white', fontSize: 15, padding: '13px 22px', border: 'none', cursor: 'pointer', boxShadow: '0 3px 12px rgba(212,135,43,0.4)' }}
                              data-testid="button-start-my-day"
                            >
                              Start Day →
                            </button>
                          </div>
                        </div>
                      );
                    }
                    if (nextStopForStrip) {
                      return (
                        <div className="mx-4" style={{ marginTop: 12 }}>
                          <div
                            className="flex items-center justify-between"
                            style={{ background: '#6E6A4F', borderRadius: 16, padding: '12px 14px', minHeight: 68 }}
                          >
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }} />
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 1 }}>⏱ Day in progress</p>
                                <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'white', lineHeight: '18px' }}>
                                  Next: {nextStopForStrip.name}
                                  {ctrlBarMeta && <span style={{ fontWeight: 400, opacity: 0.8 }}> {ctrlBarMeta.inText}</span>}
                                </p>
                                {ctrlBarMeta && (
                                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                                    Leave by {ctrlBarMeta.leaveBy}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 text-right ml-3">
                              <p style={{ fontSize: 12, fontWeight: 700, color: 'white', lineHeight: '16px' }}>{crowdLabel.text}</p>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2, maxWidth: 110, lineHeight: '13px' }}>{crowdLabel.sub}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* ── DAILY MAPS: Your Day at a Glance ── */}
                  <div className="pt-3">
                    <DailyMapsCard
                      todayStops={
                        (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops)
                          .filter(s => !skippedStopIds.includes(s.id))
                      }
                      selectedMealRecs={selectedMealRecs}
                      city={currentTrip?.destination || undefined}
                      onRunDay={(bundle) => { setDayRouteBundle(bundle); setDayRouteSheetOpen(true); }}
                      onBundleReady={(bundle) => setDayRouteBundle(bundle)}
                    />
                  </div>

                  {/* ── CONTENT AREA ── */}
                  <div className="px-4 pt-4 space-y-4">

                    {/* GeoBuddy suggestion card (shown when autoOptimize is OFF) */}
                    {geoBuddySuggestion && !inferredBannerDismissed.current && (
                      <GeoBuddySuggestionCard
                        message={geoBuddySuggestion.message}
                        primaryAction={geoBuddySuggestion.primaryAction}
                        secondaryAction={geoBuddySuggestion.secondaryAction}
                        tertiaryAction={geoBuddySuggestion.tertiaryAction}
                        onDismiss={() => {
                          inferredBannerDismissed.current = true;
                          setGeoBuddySuggestion(null);
                        }}
                      />
                    )}

                    {/* Live Adjustment Engine — 6 action buttons */}
                    <div className="overflow-x-auto -mx-1 px-1">
                      <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
                        {([
                          { id: "running_late", emoji: "⏱", label: "Running late" },
                          { id: "kids_tired", emoji: "😴", label: "Kids tired" },
                          { id: "need_food", emoji: "🍔", label: "Need food" },
                          { id: "need_a_break", emoji: "☕", label: "Need a break" },
                          { id: "want_more_fun", emoji: "🎉", label: "Want more fun" },
                          { id: "shorten_this_stop", emoji: "⚡", label: "Shorten this stop" },
                        ] as { id: TriggerType; emoji: string; label: string }[]).map(action => (
                          <button
                            key={action.id}
                            onClick={() => handleExplicitTrigger(action.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap active:scale-95 transition-all"
                            style={{ background: "#F2F2F0", color: "#444", border: "1px solid #E5E0D8" }}
                            data-testid={`button-quick-action-${action.id}`}
                          >
                            <span>{action.emoji}</span>
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Day label */}
                    <div className="flex items-center gap-3">
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{dayLabel}</p>
                      <div className="flex-1" style={{ height: 1, background: '#E3E0D8' }} />
                      <span style={{ fontSize: 11, color: '#7A7A7A' }}>{todayVisited}/{todayTotal}</span>
                    </div>

                    {/* Multi-remove amber banner */}
                    {stopsRemovedCount >= 2 && !multiRemoveBannerDismissed && (
                      <div
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-2"
                        style={{ background: '#FEF3C7', border: '1px solid #F59E0B' }}
                        data-testid="banner-multi-remove"
                      >
                        <span className="text-lg shrink-0">💡</span>
                        <p className="flex-1 text-sm font-medium" style={{ color: '#92400E' }}>Want to simplify the rest of your day?</p>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => {
                              const todayAllStops = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops;
                              const unvisited = todayAllStops.filter(s => !skippedStopIds.includes(s.id) && !s.isVisited);
                              handleMakeDayLighter(unvisited, "lighter");
                            }}
                            className="text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95"
                            style={{ background: '#F59E0B', color: 'white' }}
                            data-testid="button-multi-remove-make-lighter"
                          >
                            Make day lighter
                          </button>
                          <button
                            onClick={() => setMultiRemoveBannerDismissed(true)}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-full transition-all active:scale-95"
                            style={{ background: '#FDE68A', color: '#92400E' }}
                            data-testid="button-multi-remove-dismiss"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                  {/* ── Timeline ── */}
                  <div className="space-y-0">
                    {todayStops.length === 0 && (
                      <div
                        className="flex flex-col items-center justify-center py-10 px-6 rounded-2xl mx-1 mb-4"
                        style={{ background: '#FFF9F4', border: '1.5px dashed #E67E22' }}
                        data-testid="today-empty-day-state"
                      >
                        <span className="text-3xl mb-3">✨</span>
                        <p className="font-semibold text-gray-800 text-base mb-1">Your day is now open</p>
                        <p className="text-sm text-gray-500 mb-4 text-center">
                          {currentTrip?.status === "completed" ? "Add memories from this day" : "No stops remaining — add something or let the kids lead"}
                        </p>
                        <div className="flex gap-3">
                          {currentTrip?.status === "completed" ? (
                            <button
                              onClick={() => setShowMomentCapture(true)}
                              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                              style={{ background: '#E67E22', color: 'white' }}
                              data-testid="button-today-empty-add-moments"
                            >
                              📸 Add moments
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSmartPill("add_stop")}
                              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                              style={{ background: '#E67E22', color: 'white' }}
                              data-testid="button-today-empty-add-stop"
                            >
                              Add a stop
                            </button>
                          )}
                          <button
                            onClick={() => setActiveTab("current")}
                            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                            style={{ background: '#F2F2F0', color: '#444' }}
                            data-testid="button-today-empty-explore"
                          >
                            Let kids explore
                          </button>
                        </div>
                      </div>
                    )}
                    {timeline.map((item, idx) => {
                      const isLast = idx === timeline.length - 1;

                      if (item.kind === "breakfast") {
                        return (
                          <div key="breakfast" className="flex gap-2 pb-3">
                            <div className="w-12 shrink-0" />
                            <div className="flex flex-col items-center mr-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-300 mt-1 shrink-0" />
                              <div className="w-px flex-1 bg-gray-200 mt-1" />
                            </div>
                            <div className="flex-1 pb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-base">🍳</span>
                                <span className="text-xs text-gray-400 font-medium">Start your morning — grab breakfast before heading out</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (item.kind === "anchor_pin") {
                        const { anchor, time, endTime } = item;
                        const isHard = anchor.flexibility === "hard";
                        const anchorTypeEmoji: Record<string, string> = { ticket: "🎟", food: "🍽", event: "🎭", hotel: "🏨", other: "📌" };
                        const anchorTypeLabel: Record<string, string> = { ticket: "Ticket · attraction", food: "Food reservation", event: "Event · show", hotel: "Hotel", other: "Planned" };
                        return (
                          <div key={`anchor-today-${idx}`} className="flex pb-3" style={{ gap: 0 }}>
                            <div className="shrink-0 text-right pt-2 pr-2" style={{ width: 40 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: isHard ? '#E67E22' : '#3B82F6' }}>{time}</span>
                            </div>
                            <div className="flex flex-col items-center mx-2">
                              <div className="shrink-0 mt-1.5" style={{ width: 10, height: 10, borderRadius: '50%', background: isHard ? '#F5A623' : '#93C5FD' }} />
                              {!isLast && <div className="flex-1 mt-1" style={{ width: 2, background: '#E3E0D8' }} />}
                            </div>
                            <div className="flex-1 pb-2">
                              <div style={{ background: isHard ? '#FFF9F0' : '#EFF6FF', borderRadius: 14, padding: 12, border: `1.5px solid ${isHard ? '#F5A623' : '#BFDBFE'}` }}>
                                <div className="flex items-center gap-3">
                                  <div className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: '50%', background: 'white' }}>
                                    <span className="text-base">{anchorTypeEmoji[anchor.anchorType] || "📌"}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isHard ? '#E67E22' : '#3B82F6' }}>
                                        {isHard ? "🔒 Fixed" : "🕐 Flexible"}
                                      </span>
                                      <span className="text-[10px]" style={{ color: '#999' }}>· {anchorTypeLabel[anchor.anchorType] || "Planned"}</span>
                                    </div>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{anchor.name}</p>
                                    <p style={{ fontSize: 12, color: isHard ? '#E67E22' : '#3B82F6' }}>
                                      {time} – {endTime}
                                      {anchor.durationMinutes ? ` · ~${anchor.durationMinutes < 60 ? anchor.durationMinutes + " min" : Math.round(anchor.durationMinutes / 60 * 10) / 10 + "h"}` : ""}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (item.kind === "meal") {
                        const isMeal = item.mealType === "lunch";
                        const mealGapKey = `${item.mealType}_${activeDay}_${item.beforeStop?.id ?? "start"}`;
                        const autoRec = autoMealRecs[mealGapKey];
                        const chosenRec = selectedMealRecs[item.mealType === "snack" ? "snack" : "lunch"] ?? autoRec?.rec ?? null;
                        return (
                          <div key={`meal-${idx}`} className="flex pb-3" style={{ gap: 0 }}>
                            <div className="shrink-0 text-right pt-2 pr-2" style={{ width: 40 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#7A7A7A' }}>{item.time}</span>
                            </div>
                            <div className="flex flex-col items-center mx-2">
                              <div className="shrink-0 mt-1.5" style={{ width: 10, height: 10, borderRadius: '50%', background: '#4CAF76' }} />
                              {!isLast && <div className="flex-1 mt-1" style={{ width: 2, background: '#E3E0D8' }} />}
                            </div>
                            <div className="flex-1 pb-2">
                              <div style={{ background: '#E8F3EC', borderRadius: 14, padding: 12 }}>
                                <div className="flex items-center gap-3">
                                  <div className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: '50%', background: 'white' }}>
                                    {isMeal ? <UtensilsCrossed className="w-4 h-4" style={{ color: '#2E7D4F' }} /> : <Coffee className="w-4 h-4" style={{ color: '#2E7D4F' }} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#2E7D4F' }}>
                                      {isMeal ? "Lunch Break" : "Snack Break"}
                                    </p>
                                    <p style={{ fontSize: 12, color: '#4CAF76' }}>
                                      {isMeal ? "~60 min · Kid-friendly spot nearby" : "~30 min · Quick snack or coffee"}
                                    </p>
                                  </div>
                                  {/* Move up/down arrows for lunch */}
                                  {isMeal && (() => {
                                    const currentMealIdx = item.beforeStop ? todayStops.findIndex(s => s.id === item.beforeStop!.id) : -1;
                                    if (currentMealIdx < 0) return null;
                                    return (
                                      <div className="flex flex-col gap-0.5 shrink-0">
                                        <button
                                          onClick={() => moveLunch(-1, currentMealIdx, todayStops.length)}
                                          className="flex items-center justify-center rounded-lg transition-all active:scale-90"
                                          style={{ width: 26, height: 26, background: 'rgba(255,255,255,0.7)', border: 'none', cursor: currentMealIdx > 0 ? 'pointer' : 'not-allowed', opacity: currentMealIdx > 0 ? 1 : 0.35 }}
                                          disabled={currentMealIdx <= 0}
                                          title="Move lunch earlier"
                                          data-testid="button-lunch-move-up"
                                        >
                                          <ChevronUp className="w-3.5 h-3.5" style={{ color: '#2E7D4F' }} />
                                        </button>
                                        <button
                                          onClick={() => moveLunch(1, currentMealIdx, todayStops.length)}
                                          className="flex items-center justify-center rounded-lg transition-all active:scale-90"
                                          style={{ width: 26, height: 26, background: 'rgba(255,255,255,0.7)', border: 'none', cursor: currentMealIdx < todayStops.length - 2 ? 'pointer' : 'not-allowed', opacity: currentMealIdx < todayStops.length - 2 ? 1 : 0.35 }}
                                          disabled={currentMealIdx >= todayStops.length - 2}
                                          title="Move lunch later"
                                          data-testid="button-lunch-move-down"
                                        >
                                          <ChevronDown className="w-3.5 h-3.5" style={{ color: '#2E7D4F' }} />
                                        </button>
                                      </div>
                                    );
                                  })()}
                                  {/* CTA: loading → spinner; autoRec → "Other Options"; else → Find Food */}
                                  {autoRec?.loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: '#2E7D4F' }} />
                                  ) : (
                                    <button
                                      onClick={() => fetchMealRecs(item.beforeStop, item.afterStop, item.mealType)}
                                      className="shrink-0 hover:opacity-80 transition-opacity"
                                      style={{ background: 'white', borderRadius: 12, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#2E7D4F' }}
                                      data-testid={`button-meal-recs-${item.mealType}`}
                                    >
                                      {autoRec?.rec ? "Other Options" : (isMeal ? "Find Food" : "Find Café")}
                                    </button>
                                  )}
                                </div>
                                {/* Recommendation sub-card */}
                                {chosenRec && (
                                  <div className="mt-2 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate" style={{ color: '#2E7D4F' }}>{chosenRec.name}</p>
                                        <p style={{ fontSize: 11, color: '#4CAF76' }}>
                                          {chosenRec.cuisine}{chosenRec.walkTime ? ` · ${chosenRec.walkTime}` : ""} · {"$".repeat(Math.max(1, Math.min(3, chosenRec.priceLevel || 1)))}
                                          {!selectedMealRecs[item.mealType === "snack" ? "snack" : "lunch"] && autoRec?.rec && (
                                            <span className="ml-1.5 text-[10px] text-orange-600 font-semibold bg-orange-50 rounded-full px-1.5 py-0.5">Suggested for you</span>
                                          )}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {autoRec?.rec && !selectedMealRecs[item.mealType === "snack" ? "snack" : "lunch"] && (
                                          <button
                                            onClick={() => { setMealRecPendingRec({ rec: chosenRec }); setMealRecState(s => ({ ...s, visible: true, mealType: item.mealType, beforeStop: item.beforeStop, afterStop: item.afterStop })); setMealRecPlacementStopId(item.beforeStop?.id ?? null); }}
                                            className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                                            style={{ background: 'white', color: '#D4872B', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8 }}
                                            data-testid={`button-auto-rec-add-today-${item.mealType}`}
                                          >
                                            Add
                                          </button>
                                        )}
                                        <button
                                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(chosenRec.name + " " + (currentTrip?.destination || ""))}`, "_blank")}
                                          className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                                          style={{ background: 'white', color: '#2E7D4F' }}
                                        >
                                          <Navigation className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // kind === "stop"
                      const stop = item.stop;
                      const cfg = getStopConfig(stop.stopType);
                      const er = getEntryReadiness(stop);
                      const ticket = getTicketForStop(stop);
                      const todayCurrentList = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops;
                      const todayIdx = todayCurrentList.findIndex(s => s.id === stop.id);
                      const canMoveUp = todayIdx > 0;
                      const canMoveDown = todayIdx < todayCurrentList.length - 1;
                      // Inline smart suggestion: show after first unvisited stop only
                      const stopsAfterThis = unvisitedStops.filter(s => s.id !== stop.id);
                      const ticketedAhead = stopsAfterThis.filter(s => getTicketForStop(s));
                      const durationAhead = stopsAfterThis.reduce((sum, s) => sum + estDuration(s.stopType), 0);
                      const showInlineSugg = !stop.isVisited && unvisitedStops[0]?.id === stop.id
                        && !dismissedInlineSuggestion && stopsAfterThis.length >= 1
                        && (ticketedAhead.length >= 2 || durationAhead > 180);
                      const parking = getParkingInfo(stop.name, stop.stopType, stop.cityGroup || currentTrip?.destination);
                      const showParkingAlert = parking && (parking.state === "risky" || parking.state === "bad") && !stop.isVisited && !dismissedParkingAlerts.includes(stop.id);
                      const isFirstUnvisited = !stop.isVisited && unvisitedStops[0]?.id === stop.id;
                      // "You're here" only when phone clock is within the stop's planned window
                      const isYoureHere = (() => {
                        if (!isFirstUnvisited) return false;
                        if (!item.time) return false;
                        const [hm, ampm] = (item.time as string).split(" ");
                        const [h, m] = hm.split(":").map(Number);
                        let startM = (ampm === "PM" && h !== 12 ? h + 12 : ampm === "AM" && h === 12 ? 0 : h) * 60 + (m || 0);
                        const now = new Date();
                        const nowM = now.getHours() * 60 + now.getMinutes();
                        const dur = estDuration(stop.stopType);
                        return nowM >= startM - 30 && nowM <= startM + dur + 30;
                      })();
                      const contextLine = getStopContextLine(stop.stopType, stop.description);

                      const parseTimeMins = (t?: string): number | null => {
                        if (!t) return null;
                        const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
                        if (!m) return null;
                        let h = parseInt(m[1], 10);
                        const min = parseInt(m[2], 10);
                        const ap = m[3].toUpperCase();
                        if (ap === "PM" && h !== 12) h += 12;
                        if (ap === "AM" && h === 12) h = 0;
                        return h * 60 + min;
                      };
                      const timeConfidence = (() => {
                        if (isLast || stop.isVisited) return null;
                        const endMins = parseTimeMins((item as any).endTime);
                        if (endMins == null) return null;
                        const nextStopItem = timeline.slice(idx + 1).find(i => i.kind === "stop") as any;
                        const nextStartMins = parseTimeMins(nextStopItem?.time);
                        if (nextStartMins == null) return null;
                        const TRAVEL_MINS = 20;
                        const slack = (nextStartMins - endMins) - TRAVEL_MINS;
                        if (slack >= 30) return "plenty";
                        if (slack >= 10) return "tight";
                        return null;
                      })();

                      stopNum++;
                      const displayStopNum = stopNum;
                      return (
                        <React.Fragment key={stop.id}>
                        <div
                          className={`flex pb-3 transition-opacity ${dragStopId && dragStopId !== stop.id ? "opacity-60" : ""} ${dragOverStopId === stop.id && dragStopId !== stop.id ? "opacity-100" : ""}`}
                          style={{ gap: 0 }}
                          onDragOver={(e) => { e.preventDefault(); setDragOverStopId(stop.id); }}
                          onDrop={() => handleDragDrop(stop.id)}
                        >
                          {/* Time label — 40px gutter */}
                          <div className="shrink-0 text-right pt-2 pr-2" style={{ width: 40 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#7A7A7A', lineHeight: 1.2 }}>{item.time}</span>
                          </div>
                          {/* Dot + line */}
                          <div className="flex flex-col items-center mx-2">
                            <div
                              className="shrink-0 flex items-center justify-center font-bold mt-1"
                              style={{
                                width: 22, height: 22, borderRadius: '50%',
                                border: stop.isVisited ? 'none' : '2px solid #E67E22',
                                background: stop.isVisited ? '#22c55e' : 'white',
                                color: stop.isVisited ? 'white' : '#E67E22',
                                fontSize: 11,
                              }}
                            >
                              {stop.isVisited ? "✓" : displayStopNum}
                            </div>
                            {!isLast && <div className="flex-1 mt-1" style={{ width: 2, background: '#E3E0D8' }} />}
                          </div>
                          {/* Stop card */}
                          <div className="flex-1 min-w-0 pb-1" style={{ position: 'relative' }}>
                            {/* Card — full-height image, no outer padding, overflow hidden */}
                            <div
                              data-stop-id={stop.id}
                              className={`transition-all ${stop.isVisited ? "opacity-70" : dragOverStopId === stop.id && dragStopId !== stop.id ? "ring-2 ring-orange-300" : ""}`}
                              style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0px 4px 12px rgba(0,0,0,0.04)', marginBottom: 0 }}
                            >
                              <div className="flex items-stretch">
                                {/* Full-height image */}
                                <StopThumb
                                  stopName={stop.name}
                                  cityName={currentTrip?.city || null}
                                  stopType={stop.stopType}
                                  country={currentTrip?.country || null}
                                  cfg={cfg}
                                  fullHeight
                                />
                                {/* Content column */}
                                <div className="flex-1 min-w-0 flex flex-col">
                                  <div style={{ padding: 10, flex: 1 }}>
                                    {/* Title row */}
                                    <div className="flex items-start justify-between gap-1">
                                      <button
                                        onClick={() => { setForcedCurrentStop(stop); setActiveTab("current"); }}
                                        className="flex-1 min-w-0 text-left leading-tight hover:underline"
                                        style={{ fontSize: 15, fontWeight: 600, color: '#1F1F1F', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                        data-testid={`button-stop-name-${stop.id}`}
                                      >{stop.name}</button>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {stop.isVisited && (
                                          <span className="text-[9px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">✓ Done</span>
                                        )}
                                        {isYoureHere && (
                                          <span style={{ background: '#E6F2E8', color: '#3D7A4F', padding: '3px 7px', borderRadius: 12, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            📍 Here
                                          </span>
                                        )}
                                        {!stop.isVisited && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setTodayStopMenuId(todayStopMenuId === stop.id ? null : stop.id); }}
                                            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                            data-testid={`button-today-menu-${stop.id}`}
                                          >
                                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {/* Time confidence badge */}
                                    {timeConfidence && (
                                      <div className="mt-1.5">
                                        {timeConfidence === "plenty" ? (
                                          <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                            style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
                                            data-testid={`badge-time-confidence-${stop.id}`}
                                          >
                                            Plenty of time ✓
                                          </span>
                                        ) : (
                                          <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                            style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}
                                            data-testid={`badge-time-confidence-${stop.id}`}
                                          >
                                            Tight but doable
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {/* Info line — single row */}
                                    <div className="flex items-center overflow-hidden" style={{ gap: 4, marginTop: 5, flexWrap: 'nowrap' }}>
                                      <span style={{ fontSize: 11, color: '#7A7A7A', whiteSpace: 'nowrap' }}>🚗 20 min</span>
                                      {parking && (
                                        <>
                                          <span style={{ color: '#C8C4BC', fontSize: 11 }}>•</span>
                                          <span style={{ fontSize: 11, whiteSpace: 'nowrap', color: parking.state === "risky" ? '#D97706' : parking.state === "bad" ? '#EF4444' : '#7A7A7A' }}>
                                            {parking.state === "easy" || parking.state === "normal" ? "🅿️ Parking" : parking.state === "risky" ? "⚠️ Parking" : "🚫 No parking"}
                                          </span>
                                        </>
                                      )}
                                      {er.type === "needed" && (
                                        <>
                                          <span style={{ color: '#C8C4BC', fontSize: 11 }}>•</span>
                                          <span style={{ fontSize: 11, color: '#E67E22', fontWeight: 500, whiteSpace: 'nowrap' }}>🎟 Tickets</span>
                                        </>
                                      )}
                                      {er.type === "ready" && ticket && (
                                        <>
                                          <span style={{ color: '#C8C4BC', fontSize: 11 }}>•</span>
                                          <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500, whiteSpace: 'nowrap' }}>✅ Pass</span>
                                        </>
                                      )}
                                      <span style={{ color: '#C8C4BC', fontSize: 11 }}>•</span>
                                      <span style={{ fontSize: 11, color: '#7A7A7A', whiteSpace: 'nowrap' }}>⏱ {estDuration(stop.stopType)} min</span>
                                    </div>
                                  </div>
                                  {/* Action bar */}
                                  {!stop.isVisited && (
                                    <div className="flex" style={{ borderTop: '1px solid #EFECE6', paddingTop: 8, paddingBottom: 8, paddingLeft: 10, paddingRight: 10 }}>
                                      <button
                                        onClick={() => handleGetDirections(stop)}
                                        className="flex-1 flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors rounded-lg py-1"
                                        style={{ fontSize: 13, color: '#E67E22', fontWeight: 500 }}
                                        data-testid={`button-today-directions-${stop.id}`}
                                      >
                                        <Navigation className="w-3.5 h-3.5" /> Directions
                                      </button>
                                      {er.type === "needed" && (
                                        <button
                                          onClick={() => window.open(`https://www.google.com/search?q=buy+tickets+${encodeURIComponent(stop.name)}`, "_blank")}
                                          className="flex-1 flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors rounded-lg py-1"
                                          style={{ fontSize: 13, color: '#E67E22', fontWeight: 500, borderLeft: '1px solid #EFECE6' }}
                                          data-testid={`button-today-tickets-${stop.id}`}
                                        >
                                          <Ticket className="w-3.5 h-3.5" /> Tickets
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setShowMarkVisitedConfirm(stop)}
                                        className="flex items-center justify-center gap-1 hover:bg-green-50 transition-colors rounded-lg py-1 px-2"
                                        style={{ fontSize: 13, color: '#22c55e', fontWeight: 600, borderLeft: '1px solid #EFECE6' }}
                                        data-testid={`button-today-done-${stop.id}`}
                                      >
                                        ✓ Done
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {/* Right drag handle — visible, full-height, touch-friendly */}
                                {!stop.isVisited && (
                                  <div
                                    onPointerDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                      touchDragIdRef.current = stop.id;
                                      touchDragOverIdRef.current = stop.id;
                                      setDragStopId(stop.id);
                                    }}
                                    draggable
                                    onDragStart={() => setDragStopId(stop.id)}
                                    onDragEnd={() => setDragStopId(null)}
                                    className="shrink-0 self-stretch flex flex-col items-center justify-center select-none cursor-grab active:cursor-grabbing gap-1"
                                    style={{ width: 36, background: '#FFF4EC', borderLeft: '1px solid #FDDCBF', touchAction: 'none' }}
                                    title="Drag to reorder"
                                    data-testid={`drag-handle-${stop.id}`}
                                  >
                                    <GripVertical style={{ width: 16, height: 16, color: '#E67E22' }} />
                                    <span style={{ fontSize: 9, fontWeight: 700, color: '#E67E22', letterSpacing: '0.04em', writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>DRAG</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* ── 3-dot dropdown — rendered OUTSIDE overflow:hidden card so it's never clipped ── */}
                            {todayStopMenuId === stop.id && !stop.isVisited && (
                              <div
                                className="absolute bg-white rounded-xl shadow-lg border border-gray-100 py-1"
                                style={{ right: 0, top: 32, width: 180, zIndex: 200 }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => { setTodayStopMenuId(null); fetchNeedRecs("break", stop); setTodayNeedState("break"); setTimeout(() => needSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150); }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                  <span className="text-sm">😮‍💨</span> Need a Break
                                </button>
                                <button
                                  onClick={() => { setTodayStopMenuId(null); fetchNeedRecs("food", stop); setTodayNeedState("food"); setTimeout(() => needSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150); }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                  <span className="text-sm">🍔</span> Need Food
                                </button>
                                <div className="border-t border-gray-100 my-1" />
                                {(() => {
                                  const currentList = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops;
                                  const idx = currentList.findIndex(s => s.id === stop.id);
                                  const canUp = idx > 0;
                                  const canDown = idx < currentList.length - 1;
                                  return (
                                    <>
                                      <button
                                        disabled={!canUp}
                                        onClick={() => { setTodayStopMenuId(null); moveStop(stop, "up"); }}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs ${canUp ? "text-gray-700 hover:bg-gray-50" : "text-gray-300"}`}
                                        data-testid={`button-today-move-up-${stop.id}`}
                                      >
                                        <span className="text-sm">↑</span> Move up
                                      </button>
                                      <button
                                        disabled={!canDown}
                                        onClick={() => { setTodayStopMenuId(null); moveStop(stop, "down"); }}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs ${canDown ? "text-gray-700 hover:bg-gray-50" : "text-gray-300"}`}
                                        data-testid={`button-today-move-down-${stop.id}`}
                                      >
                                        <span className="text-sm">↓</span> Move down
                                      </button>
                                    </>
                                  );
                                })()}
                                <div className="border-t border-gray-100 my-1" />
                                <button
                                  onClick={() => { setTodayStopMenuId(null); openReplaceSheet(stop); }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 hover:bg-orange-50"
                                  data-testid={`button-today-replace-${stop.id}`}
                                >
                                  <span className="text-sm">🔄</span> Replace Stop
                                </button>
                                <button
                                  onClick={() => {
                                    setTodayStopMenuId(null);
                                    const unvis = todayStops.filter(s => !s.isVisited);
                                    const thisIdx = unvis.findIndex(s => s.id === stop.id);
                                    const nextToSkip = thisIdx >= 0 && thisIdx < unvis.length - 1 ? unvis[thisIdx + 1] : unvis.find(s => s.id !== stop.id) ?? null;
                                    setConfirmSkipNext(nextToSkip);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-orange-600 hover:bg-orange-50"
                                >
                                  <span className="text-sm">⏭</span> Skip Next Stop
                                </button>
                                <button
                                  onClick={() => {
                                    setTodayStopMenuId(null);
                                    const unvisited = todayStops.filter(s => !s.isVisited);
                                    handleRemoveStopWithAnchorCheck(stop, unvisited);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-50"
                                  data-testid={`button-today-remove-${stop.id}`}
                                >
                                  <span className="text-sm">🗑️</span> Remove Stop
                                </button>
                              </div>
                            )}
                            {/* ── Decision Line ── */}
                            {contextLine && (
                              <div style={{ marginTop: 6, background: '#F5F1E8', borderRadius: 8, padding: '6px 8px' }}>
                                <p style={{ fontSize: 13, color: '#6B5E3E', lineHeight: '17px' }}>💡 {contextLine}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {showInlineSugg && (
                          <div className="flex pb-3" style={{ gap: 0 }}>
                            <div className="shrink-0" style={{ width: 40 }} />
                            <div className="flex flex-col items-center mx-2">
                              <div className="mt-1" style={{ width: 2, height: 12, background: '#E3E0D8' }} />
                              <div className="shrink-0" style={{ width: 8, height: 8, borderRadius: '50%', background: '#F2D6A2' }} />
                              <div className="flex-1 mt-1" style={{ width: 2, background: '#E3E0D8' }} />
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                              {/* Intervention card — spec: bg #FFF4E5, border #F2D6A2, br 14px, p 12px */}
                              <div style={{ background: '#FFF4E5', border: '1px solid #F2D6A2', borderRadius: 14, padding: 12 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#8A6A3E', marginBottom: 10 }}>⏱ Running tight — want a lighter afternoon?</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => { setDismissedInlineSuggestion(true); handleMakeDayLighter(unvisitedStops, "running_late"); }}
                                    className="hover:opacity-90 transition-opacity"
                                    style={{ padding: '8px 0', background: '#E67E22', color: 'white', borderRadius: 10, fontSize: 13, fontWeight: 600 }}
                                    data-testid="button-inline-adjust-plan"
                                  >
                                    Adjust plan
                                  </button>
                                  <button
                                    onClick={() => setDismissedInlineSuggestion(true)}
                                    className="hover:bg-white/60 transition-colors"
                                    style={{ padding: '8px 0', background: 'transparent', border: '1px solid #E0D6C8', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#8A6A3E' }}
                                    data-testid="button-inline-keep-plan"
                                  >
                                    Keep plan
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Parking escalation card for risky/bad parking */}
                        {showParkingAlert && (
                          <div className="flex gap-2 pb-2">
                            <div className="w-12 shrink-0" />
                            <div className="flex flex-col items-center mx-1">
                              <div className="w-px h-2 bg-gray-200" />
                              <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{parking!.emoji}</span>
                                  <p className="text-xs font-semibold text-yellow-800 flex-1">
                                    {parking!.state === "bad" ? "No easy parking here — consider transit or a rideshare" : "Parking may be tricky here — plan ahead"}
                                  </p>
                                </div>
                                {parkingAddresses[stop.id] && (
                                  <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-2.5 py-1.5">
                                    <span className="text-green-600 text-xs">✅</span>
                                    <p className="text-[10px] text-green-700 font-medium flex-1 break-words">{parkingAddresses[stop.id]}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => { setParkingInputValue(parkingAddresses[stop.id] || ""); setParkingSheet({ stopId: stop.id, stopName: stop.name }); }}
                                    className="py-1.5 bg-yellow-500 text-white text-[11px] font-bold rounded-xl hover:bg-yellow-600 transition-colors"
                                    data-testid={`button-parking-find-${stop.id}`}
                                  >
                                    {parkingAddresses[stop.id] ? "Edit address" : "Find parking"}
                                  </button>
                                  {!parkingAddresses[stop.id] && (
                                    <button
                                      onClick={() => setDismissedParkingAlerts(prev => [...prev, stop.id])}
                                      className="py-1.5 bg-white border border-yellow-200 text-yellow-700 text-[11px] font-bold rounded-xl hover:bg-yellow-50 transition-colors"
                                      data-testid={`button-parking-dismiss-${stop.id}`}
                                    >
                                      Got it
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* ── Evening section — Add later stops ── */}
                  {(() => {
                    const hasAnyStops = todayStops.length > 0;
                    if (!hasAnyStops) return null;
                    return (
                      <div className="px-0 mt-3 mb-2" data-testid="section-evening">
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Evening</span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { const lastStop = todayStops[todayStops.length - 1] || null; fetchMealRecs(lastStop, null, "dinner"); }}
                            className="flex-1 flex items-center gap-2 rounded-2xl border border-dashed border-gray-200 px-3 py-2.5 bg-white hover:bg-orange-50 hover:border-orange-300 active:scale-[0.98] transition-all text-left"
                            data-testid="button-add-evening-dinner"
                          >
                            <span className="text-lg">🌆</span>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-gray-700 leading-tight">Add dinner</p>
                              <p className="text-[10px] text-gray-400">Find a restaurant nearby</p>
                            </div>
                          </button>
                          <button
                            onClick={() => { const lastStop = todayStops[todayStops.length - 1] || null; fetchMealRecs(lastStop, null, "dessert"); }}
                            className="flex-1 flex items-center gap-2 rounded-2xl border border-dashed border-gray-200 px-3 py-2.5 bg-white hover:bg-orange-50 hover:border-orange-300 active:scale-[0.98] transition-all text-left"
                            data-testid="button-add-evening-dessert"
                          >
                            <span className="text-lg">🍦</span>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-gray-700 leading-tight">Add a treat</p>
                              <p className="text-[10px] text-gray-400">Ice cream or dessert</p>
                            </div>
                          </button>
                          <button
                            onClick={() => openAddStop()}
                            className="flex items-center justify-center w-10 rounded-2xl border border-dashed border-gray-200 bg-white hover:bg-orange-50 hover:border-orange-300 active:scale-[0.98] transition-all shrink-0"
                            data-testid="button-add-evening-other"
                            title="Add other stop"
                          >
                            <span className="text-lg">＋</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── View route on map — inline accordion ── */}
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => setShowTodayInlineMap(v => !v)}
                      className="w-full flex items-center justify-between hover:opacity-80 transition-opacity active:scale-[0.98]"
                      style={{ background: 'white', borderRadius: showTodayInlineMap ? '12px 12px 0 0' : 12, padding: 10, fontSize: 13, fontWeight: 600, color: '#1F1F1F', marginBottom: 0 }}
                      data-testid="button-today-view-route"
                    >
                      <span className="flex items-center gap-2">📍 View route on map</span>
                      {showTodayInlineMap
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                    <AnimatePresence>
                      {showTodayInlineMap && currentTrip && (() => {
                        const accordionVariant = dayRouteBundle
                          ? dayRouteBundle.balanced
                          : generateDayRouteVariants(
                              (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops).filter(s => !skippedStopIds.includes(s.id)),
                              selectedMealRecs
                            ).balanced;
                        const accordionPolyline = dayRouteBundle?.polylinePoints ?? null;
                        return (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 240, opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                            style={{ borderRadius: '0 0 12px 12px', marginBottom: 8 }}
                          >
                            <div className="p-2">
                              <DayRouteMiniMap
                                variant={accordionVariant}
                                polylinePoints={accordionPolyline}
                                height={220}
                              />
                            </div>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>
                    <div style={{ marginBottom: 8 }} />
                    <button
                      onClick={() => setRoughDaySheetOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 hover:opacity-80 transition-opacity"
                      style={{ background: '#FFF4E5', borderRadius: 12, padding: 10, fontSize: 13, fontWeight: 600, color: '#E67E22' }}
                      data-testid="button-today-adjust-plan"
                    >
                      🌧 Having a rough day?
                    </button>
                    <button
                      onClick={() => setHelpNowOpen(true)}
                      className="w-full text-center hover:opacity-70 transition-opacity"
                      style={{ background: 'none', border: 'none', padding: '5px 0 0', fontSize: 12, fontWeight: 500, color: '#999', cursor: 'pointer' }}
                      data-testid="button-today-get-help"
                    >
                      Need help right now?
                    </button>
                  </div>

                  {/* ── FREED TIME SLOTS (from removed stops) ── */}
                  {todayFreedSlots.length > 0 && (
                    <div className="px-4 space-y-2 mb-2">
                      {todayFreedSlots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-2xl" style={{ background: '#F5F3EE', border: '1.5px dashed #C8C4BC', padding: '12px 14px' }} data-testid={`freed-slot-${idx}`}>
                          <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: '50%', background: '#EBE8E0' }}>
                            <span style={{ fontSize: 18 }}>🕐</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#5C5C5C' }}>Free Time · {slot.minutes} min</p>
                            <p style={{ fontSize: 11, color: '#9C9C9C' }}>Where {slot.label} was — rest up or explore freely</p>
                          </div>
                          <button
                            onClick={() => dismissFreedSlot(idx)}
                            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
                            style={{ fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
                            data-testid={`button-dismiss-freed-${idx}`}
                            title="Dismiss"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  </div>{/* END px-4 pt-4 space-y-4 */}

                  {/* 4. What do you need right now? — hidden per design (section replaced by "Need something else?" below) */}
                  {false && <div className="px-4">
                  {(() => {
                    const currentStop = todayStops.find(s => !s.isVisited) || null;
                    const needChips: { id: "break" | "food" | "keep_going" | "more_fun"; emoji: string; label: string }[] = [
                      { id: "break", emoji: "🌿", label: "We need a break" },
                      { id: "food", emoji: "🍔", label: "Feed us now" },
                      { id: "keep_going", emoji: "🚀", label: "Keep going" },
                      { id: "more_fun", emoji: "🎈", label: "Want more fun" },
                    ];
                    const isLiveNeed = todayNeedState === "break" || todayNeedState === "food" || todayNeedState === "more_fun";
                    return (
                      <div ref={needSectionRef} style={{ background: 'white', borderRadius: 16, marginTop: 12 }}>
                        {/* Collapsible header */}
                        <button
                          onClick={() => setShowNeedPanel(v => !v)}
                          className="w-full flex items-center justify-between"
                          style={{ padding: 14, paddingBottom: showNeedPanel ? 0 : 14 }}
                          data-testid="button-toggle-need-panel"
                        >
                          <div className="text-left">
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#1F1F1F', marginBottom: 2 }}>{needTitle}</p>
                            <p style={{ fontSize: 12, color: '#7A7A7A' }}>We'll adjust your plan instantly</p>
                          </div>
                          {showNeedPanel
                            ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                            : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />}
                        </button>

                        <AnimatePresence>
                        {showNeedPanel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                          style={{ padding: '0 14px 14px' }}
                        >
                        {/* 4 tiles in one row */}
                        <div className="flex" style={{ gap: 8, marginTop: 12 }}>
                          {needChips.map(({ id, emoji, label }) => (
                            <button
                              key={id}
                              onClick={() => {
                                setSelectedBackupIdx(null);
                                if (todayNeedState === id) {
                                  setTodayNeedState(null);
                                  setNeedRecState(s => ({ ...s, needType: null, suggestions: [] }));
                                } else {
                                  setTodayNeedState(id);
                                  if (id === "break" || id === "food") {
                                    openLocationSheet(id, currentStop);
                                  } else if (id === "more_fun") {
                                    openLocationSheet("fun", currentStop);
                                  } else {
                                    setNeedRecState(s => ({ ...s, needType: null, suggestions: [] }));
                                  }
                                }
                              }}
                              style={todayNeedState === id
                                ? { flex: 1, background: '#FFF4E5', border: '1px solid #E67E22', borderRadius: 12, padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#E67E22' }
                                : { flex: 1, background: '#F4F3EF', borderRadius: 12, padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#1F1F1F' }
                              }
                              className="transition-all"
                              data-testid={`button-need-${id}`}
                            >
                              <span style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>
                              <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
                            </button>
                          ))}
                        </div>

                        <AnimatePresence>
                          {todayNeedState && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden mt-3"
                            >
                              {isLiveNeed ? (
                                needRecState.loading ? (
                                  <div className="flex flex-col items-center gap-2 py-6 justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                                    <span className="text-xs text-gray-400 font-medium">Finding the best move right now…</span>
                                  </div>
                                ) : needRecState.suggestions.length > 0 ? (() => {
                                  const [best, ...backups] = needRecState.suggestions;
                                  const isFunNeed = todayNeedState === "more_fun";
                                  const recNeedType: "break" | "food" | "fun" = isFunNeed ? "fun" : todayNeedState === "break" ? "break" : "food";
                                  const textColor = isFunNeed ? "text-purple-700" : todayNeedState === "break" ? "text-green-700" : "text-orange-700";
                                  const bestOptionLabel = todayNeedState === "break"
                                    ? "Best quick break near you"
                                    : todayNeedState === "food"
                                    ? "Best food stop near you"
                                    : "Best fun stop near you";

                                  return (
                                    <div className="space-y-3">
                                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{bestOptionLabel}</p>
                                      <ReliefResultCard
                                        rec={best}
                                        needType={recNeedType}
                                        testIdSuffix="best"
                                        onGoNow={() => {
                                          const url = best.goNowMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(best.name + " " + (currentTrip?.destination || ""))}`;
                                          window.open(url, "_blank");
                                          setDetourBanner({ active: true, stopName: best.name });
                                        }}
                                        onAddToday={() => addNeedRecStop(best, todayStops)}
                                      />

                                      {backups.length > 0 && (
                                        <div>
                                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Other options</p>
                                          <div className="space-y-2">
                                            {backups.map((rec, i) => {
                                              const isExpanded = selectedBackupIdx === i;
                                              return (
                                                <div key={i} data-testid={`need-rec-backup-${i}`}>
                                                  {isExpanded ? (
                                                    <ReliefResultCard
                                                      rec={rec}
                                                      needType={recNeedType}
                                                      testIdSuffix={`backup-${i}`}
                                                      onGoNow={() => {
                                                        const url = rec.goNowMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(rec.name + " " + (currentTrip?.destination || ""))}`;
                                                        window.open(url, "_blank");
                                                        setDetourBanner({ active: true, stopName: rec.name });
                                                      }}
                                                      onAddToday={() => { addNeedRecStop(rec, todayStops); setSelectedBackupIdx(null); }}
                                                      onCollapse={() => setSelectedBackupIdx(null)}
                                                    />
                                                  ) : (
                                                    <button
                                                      className="w-full flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 hover:bg-gray-100 transition-colors text-left"
                                                      onClick={() => setSelectedBackupIdx(i)}
                                                      data-testid={`button-need-rec-backup-expand-${i}`}
                                                    >
                                                      <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-800 text-xs leading-tight truncate">{rec.name}</p>
                                                        <p className="text-[10px] text-gray-400">
                                                          {rec.travelTimeMinutes != null ? `~${rec.travelTimeMinutes} min away (est.)` : rec.walkTime ? `~${rec.walkTime}` : ""}
                                                        </p>
                                                      </div>
                                                      <span className={`shrink-0 text-[10px] ${textColor} font-bold`}>See more →</span>
                                                    </button>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })() : (
                                  // Smart empty-state fallback
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Here's the best move right now</p>
                                    {/* Fallback 1: Better options at next stop */}
                                    {unvisitedStops.length > 1 && (
                                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5">
                                        <p className="text-xs font-bold text-blue-900 mb-0.5">Better options near your next stop</p>
                                        <p className="text-[11px] text-blue-700 mb-3">
                                          Nothing great right here — {unvisitedStops[1]?.name || "your next stop"} has better options nearby
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                          <button
                                            onClick={() => setTodayNeedState(null)}
                                            className="py-2 bg-blue-500 text-white text-[11px] font-bold rounded-xl hover:bg-blue-600 transition-colors"
                                          >
                                            Continue plan →
                                          </button>
                                          <button
                                            onClick={() => setTodayNeedState(null)}
                                            className="py-2 bg-white border border-blue-200 text-blue-600 text-[11px] font-bold rounded-xl hover:bg-blue-50 transition-colors"
                                          >
                                            Skip for now
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    {/* Fallback 2: Micro-solution */}
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 flex items-start gap-2.5">
                                      <span className="text-xl">{todayNeedState === "break" ? "🌿" : "☕"}</span>
                                      <div>
                                        <p className="text-xs font-bold text-gray-800">
                                          {todayNeedState === "break" ? "Quick reset — then continue" : "Grab a snack for now"}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                          {todayNeedState === "break"
                                            ? "Find a bench or shaded spot nearby · 5–10 min · then carry on"
                                            : "Convenience store or street vendor nearby · then continue to a proper stop"}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => window.open(`https://maps.google.com/?q=${todayNeedState === "break" ? "park+OR+cafe" : "restaurant+kid+friendly"}+near+${encodeURIComponent(needRecState.nearStopName || currentTrip?.destination || "")}`, "_blank")}
                                      className="w-full text-center text-[11px] text-orange-500 font-semibold py-1.5"
                                    >
                                      Search area in Maps →
                                    </button>
                                  </div>
                                )
                              ) : (
                                // Keep going / Want more fun
                                <div className="space-y-2">
                                  {todayNeedState === "keep_going" ? (
                                    <div className="bg-green-50 border border-green-100 rounded-2xl p-3.5">
                                      <p className="text-xs font-bold text-green-900 mb-0.5">
                                        {unvisitedStops.length === 0
                                          ? "All done — great exploring today!"
                                          : isRunningLate
                                            ? "Faster route available — save 8 mins"
                                            : "You're on track — next stop is perfect"}
                                      </p>
                                      <p className="text-[11px] text-green-700 mb-3">
                                        {unvisitedStops.length === 0
                                          ? "You've visited every stop on the plan. Amazing!"
                                          : isRunningLate
                                            ? "Take the direct route to keep the day on schedule"
                                            : "Energy is good, pace is right — keep the momentum going"}
                                      </p>
                                      <button
                                        onClick={() => setTodayNeedState(null)}
                                        className="w-full py-2 bg-green-500 text-white text-[11px] font-bold rounded-xl hover:bg-green-600 transition-colors"
                                      >
                                        Continue →
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3.5">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Fun add-on nearby</p>
                                      <p className="text-xs font-bold text-purple-900 mb-0.5">Quick bonus stop kids will love</p>
                                      <p className="text-[11px] text-purple-700 mb-3">
                                        20–30 min detour · high energy · fits perfectly before your next stop
                                      </p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <button
                                          onClick={() => {
                                            toast.success("Bonus stop added to the plan!");
                                            setTodayNeedState(null);
                                          }}
                                          className="py-2 bg-purple-500 text-white text-[11px] font-bold rounded-xl hover:bg-purple-600 transition-colors"
                                        >
                                          Add to plan
                                        </button>
                                        <button
                                          onClick={() => window.open(`https://maps.google.com/?q=kids+activities+near+${encodeURIComponent(currentTrip?.destination || "")}`, "_blank")}
                                          className="py-2 bg-white border border-purple-200 text-purple-600 text-[11px] font-bold rounded-xl hover:bg-purple-50 transition-colors"
                                        >
                                          Explore options
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        </motion.div>
                        )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}
                  </div>}

                  {/* 5. Need something else? (RescuePanel trigger) + PassesBanner */}
                  {(() => {
                    const nextStop = todayStops.find(s => !s.isVisited) || null;
                    const needsTicket = !!(nextStop && (
                      (nextStop as any).bookingRequired ||
                      (nextStop as any).requiresTicket ||
                      (nextStop as any).placeReferenceData?.bookingRequired
                    ));
                    return (
                      <div className="px-4 space-y-3">
                        {/* PassesBanner — only when next stop needs tickets */}
                        {needsTicket && nextStop && (
                          <PassesBanner
                            stopName={nextStop.name}
                            bookingUrl={(nextStop as any).bookingUrl}
                            onOpenWallet={() => setActiveTab("passes")}
                          />
                        )}
                        {/* Need something else? row */}
                        <button
                          onClick={() => setRescuePanelOpen(true)}
                          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
                          data-testid="button-need-something-else"
                        >
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900">Need something else?</p>
                            <p className="text-xs text-gray-400 mt-0.5">Food · break · skip · lighter day · add fun</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 ml-2" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* 6a. Add stop button — Today tab */}
                  <div className="px-4 pt-2 pb-2">
                    <button
                      onClick={() => { setActiveDay(todayDayOffset); openAddStop(); }}
                      className="w-full flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      style={{
                        height: 46,
                        borderRadius: 12,
                        border: '1.5px dashed #E67E22',
                        background: '#FFF9F4',
                        color: '#E67E22',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                      data-testid="button-add-stop-today"
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add a stop to today
                    </button>
                  </div>

                  {/* ── DAY COMPLETION CARD ── */}
                  {todayTotal > 0 && todayVisited >= todayTotal && (() => {
                    const effectiveDayStarted = isDayStarted || todayVisited > 0;
                    if (!effectiveDayStarted) return null;
                    return (
                      <div className="mx-4 mt-4 mb-2 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', boxShadow: '0 6px 20px rgba(34,197,94,0.3)' }} data-testid="section-day-completion">
                        <div className="px-5 py-5 text-center">
                          <div style={{ fontSize: 42, marginBottom: 6 }}>🎉</div>
                          <p style={{ fontSize: 19, fontWeight: 800, color: 'white', marginBottom: 4, letterSpacing: '-0.02em' }}>Day {activeDay + 1} Complete!</p>
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 16, lineHeight: '1.4' }}>You explored every stop — amazing adventure today!</p>
                          <div className="flex gap-3 justify-center">
                            <button
                              onClick={() => { setActiveTab("memories"); }}
                              className="flex items-center gap-1.5 font-semibold rounded-xl transition-all active:scale-95"
                              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 13, padding: '10px 16px', border: '1.5px solid rgba(255,255,255,0.4)', cursor: 'pointer' }}
                              data-testid="button-day-complete-memories"
                            >
                              📸 Memories
                            </button>
                            <button
                              onClick={() => { const next = activeDay + 1; if (dayGroups[next]) { setActiveDay(next); setActiveTab("todays_plan"); } }}
                              className="flex items-center gap-1.5 font-semibold rounded-xl transition-all active:scale-95"
                              style={{ background: 'white', color: '#16a34a', fontSize: 13, padding: '10px 16px', border: 'none', cursor: 'pointer' }}
                              data-testid="button-day-complete-next"
                            >
                              Day {activeDay + 2} →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 6. Let Kids Explore button — inline, last item in content */}
                  {(() => {
                    const todayCurrent = sortedStops.find((s) => !s.isVisited) || null;
                    return (
                      <div className="px-4 pt-4 pb-8">
                        <button
                          onClick={() => navigate(todayCurrent ? `/adventure/${tripId}/kid/next` : `/adventure/${tripId}/kid`)}
                          className="w-full flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                          style={{
                            height: 52,
                            borderRadius: 14,
                            background: 'white',
                            color: '#4B6B5D',
                            fontSize: 16,
                            fontWeight: 600,
                            border: '2px solid #C8D8D3',
                          }}
                          data-testid="button-hand-to-kid"
                        >
                          🚀 Start Kid Experience
                        </button>
                      </div>
                    );
                  })()}
                </motion.div>
              );
            })()}

            {activeTab === "current" && (() => {
              const currentStop = forcedCurrentStop || sortedStops.find((s) => !s.isVisited) || null;
              const cfg = currentStop ? getStopConfig(currentStop.stopType) : null;
              const unvisitedStops = sortedStops.filter(s => !s.isVisited);
              // Derive planned visit hour from timeline so "Winding down" reflects stop time, not current clock
              const todayStopsForCrowd = dayGroups[todayDayOffset] || [];
              const crowdTimeline = buildTimeline(todayStopsForCrowd);
              type CrowdStopItem = { kind: "stop"; stop: TravelStop; time: string };
              const crowdCurrentItem = crowdTimeline.find((i): i is CrowdStopItem => i.kind === "stop" && !(i.stop as TravelStop).isVisited);
              const plannedHour = (() => {
                if (!crowdCurrentItem?.time) return new Date().getHours();
                const t = crowdCurrentItem.time;
                const [hm, ampm] = t.split(" ");
                const [h] = hm.split(":").map(Number);
                if (ampm === "PM" && h !== 12) return h + 12;
                if (ampm === "AM" && h === 12) return 0;
                return h;
              })();
              const rightNowFit = plannedHour < 11
                ? { text: "Best time right now", sub: "Low crowds this morning", bg: "bg-green-50 border-green-100", tc: "text-green-800", sc: "text-green-600", icon: "🌟" }
                : plannedHour < 14
                ? { text: "Good timing", sub: "Getting busier — move at your pace", bg: "bg-blue-50 border-blue-100", tc: "text-blue-800", sc: "text-blue-600", icon: "✅" }
                : plannedHour < 17
                ? { text: "Afternoon window", sub: "Manageable crowds right now", bg: "bg-amber-50 border-amber-100", tc: "text-amber-800", sc: "text-amber-600", icon: "☀️" }
                : { text: "Busy hour", sub: "More visitors — plan for queues", bg: "bg-rose-50 border-rose-100", tc: "text-rose-800", sc: "text-rose-600", icon: "🕔" };
              const summaryChips = currentStop ? [
                "🟢 Open now",
                (currentStop.stopType === "museum" || currentStop.stopType === "attraction" || currentStop.stopType === "park") ? "👍 Easy parking" : "🚗 Street parking",
                "👶 Ages 5–12",
                `⏱ ${estDuration(currentStop.stopType)} min`,
              ] : [];
              return (
                <motion.div
                  key="current"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="-mx-4"
                  data-testid="current-stop-tab"
                >
                  {!currentStop ? (
                    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                      <p className="text-4xl mb-3">🎉</p>
                      <p className="text-base font-bold text-gray-800">All stops visited!</p>
                      <p className="text-sm text-gray-400 mt-1">You've explored everything on the plan.</p>
                    </div>
                  ) : cfg ? (
                    <div>
                      {/* ── 1. HERO IMAGE (220px, rounded bottom corners) ── */}
                      <div
                        className={`relative h-56 bg-gradient-to-br ${cfg.gradient} flex items-center justify-center overflow-hidden`}
                        style={{ borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}
                      >
                        {(stopHeroImage || clientHeroImage) ? (
                          <img
                            src={stopHeroImage || clientHeroImage!}
                            alt={currentStop.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[100px] leading-none select-none opacity-90">{cfg.emoji}</span>
                        )}
                        {/* Subtle gradient overlay when image is showing */}
                        {(stopHeroImage || clientHeroImage) && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        )}
                        {/* Back button — top-left floating on hero */}
                        <button
                          className="absolute top-3 left-3 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm z-10"
                          onClick={() => {
                            setForcedCurrentStop(null);
                            setActiveTab("trip_plan");
                          }}
                          data-testid="button-stop-back"
                        >
                          <ArrowLeft className="w-4 h-4 text-gray-700" />
                        </button>
                        {/* Top-right overlay buttons */}
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button
                            className="w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
                            onClick={() => navigator.share?.({ title: currentStop.name, text: `Check out ${currentStop.name}` }).catch(() => {})}
                            data-testid="button-stop-share"
                          >
                            <Share2 className="w-4 h-4 text-gray-700" />
                          </button>
                          <button
                            className="w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
                            onClick={() => handleGetDirections(currentStop)}
                            data-testid="button-stop-map"
                          >
                            <MapIcon className="w-4 h-4 text-gray-700" />
                          </button>
                        </div>
                      </div>

                      {/* ── CHANGE STOP + DIDN'T VISIT PILLS ── */}
                      <div className="flex justify-center gap-2 pt-3 pb-1">
                        <button
                          onClick={() => setShowChangeStopSheet(true)}
                          className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors active:scale-95"
                          style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#555' }}
                          data-testid="button-change-stop"
                        >
                          <span style={{ fontSize: 14 }}>🔀</span> Change Stop
                        </button>
                        <button
                          onClick={() => {
                            if (!currentStop) return;
                            saveRemovedStop(currentStop);
                            setSkippedStopIds(prev => [...prev, currentStop.id]);
                            addFreedSlot(currentStop.name, currentStop.stopType, currentStop.durationMinutes);
                            setActiveTab("todays_plan");
                            toast("Stop removed from today", {
                              action: {
                                label: "Undo",
                                onClick: () => setSkippedStopIds(prev => prev.filter(id => id !== currentStop.id)),
                              },
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors active:scale-95"
                          style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#888' }}
                          data-testid="button-skip-stop"
                        >
                          <span style={{ fontSize: 14 }}>🚫</span> Didn't visit
                        </button>
                      </div>

                      {/* ── CONTENT ── */}
                      <div className="px-4 pt-3 pb-[220px] space-y-3">

                        {/* ── 3. TITLE + META ── */}
                        <div>
                          <h2 className="font-extrabold text-gray-900 text-[22px] leading-tight">{currentStop.name}</h2>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> 4.7
                            </span>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-500 capitalize">{cfg.label}</span>
                            <span className="text-gray-300">·</span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" /> {estDuration(currentStop.stopType)} min
                            </span>
                          </div>
                          <div className="mt-2">
                            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Great for kids 5–12</span>
                          </div>
                        </div>

                        {/* ── 4. SMART SUMMARY BAR ── */}
                        <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 overflow-x-auto">
                          <div className="flex gap-4 whitespace-nowrap">
                            {summaryChips.map((chip, i) => (
                              <span key={i} className="text-xs font-medium text-green-800">{chip}</span>
                            ))}
                          </div>
                        </div>

                        {/* ── 5. WHY THIS STOP WORKS ── */}
                        {currentStop.description && (
                          <div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">Why this stop works</p>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {currentStop.description.split(/[.\n]/).filter(s => s.trim()).slice(0, 1).map(s => s.trim()).join("") + "."}
                            </p>
                          </div>
                        )}

                        {/* ── 6. RIGHT NOW FIT ── */}
                        <div className={`${rightNowFit.bg} border rounded-xl px-3 py-2.5 flex items-center gap-2.5`}>
                          <span className="text-lg">{rightNowFit.icon}</span>
                          <div>
                            <p className={`text-sm font-bold ${rightNowFit.tc}`}>{rightNowFit.text}</p>
                            <p className={`text-xs ${rightNowFit.sc}`}>{rightNowFit.sub}</p>
                          </div>
                        </div>

                        {/* ── 7. PRIMARY ACTION BUTTONS ── */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGetDirections(currentStop)}
                            className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm py-3 rounded-2xl transition-colors"
                            data-testid="button-current-directions"
                          >
                            <Navigation className="w-4 h-4" /> Directions
                          </button>
                          <button
                            onClick={() => { setActiveTab("passes"); setAddPassStep("confirmation"); setShowAddWallet(true); setWalletForm((f) => ({ ...f, label: currentStop.name + " Ticket" })); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 font-semibold text-sm py-3 rounded-2xl transition-colors ${stopNeedsTicket(currentStop) ? "bg-orange-500 hover:bg-orange-600 text-white" : "border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"}`}
                            data-testid="button-current-add-ticket"
                          >
                            <Ticket className="w-4 h-4" /> Add Ticket
                          </button>
                          <button
                            onClick={() => {
                              setShowFoodSheet(true);
                              fetchNeedRecs("food", currentStop);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm py-3 rounded-2xl transition-colors"
                            data-testid="button-current-food"
                          >
                            🍽️ Food nearby
                          </button>
                        </div>

                        {/* ── 8. DECISION ENGINE BAR ── */}
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Quick adjust</p>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { id: "running_late", emoji: "⏱", label: "Running late" },
                              { id: "kids_tired",   emoji: "😴", label: "Kids tired" },
                              { id: "skip_next",    emoji: "⏭", label: "Skip stop" },
                              { id: "too_much",     emoji: "😩", label: "Too much planned" },
                            ] as const).map(btn => (
                              <button
                                key={btn.id}
                                onClick={() => {
                                  if (btn.id === "skip_next") {
                                    const nextStop = unvisitedStops[0] ?? null;
                                    setConfirmSkipNext(nextStop);
                                  } else {
                                    handleMakeDayLighter(unvisitedStops, btn.id);
                                  }
                                }}
                                className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
                                data-testid={`button-decision-${btn.id}`}
                              >
                                <span>{btn.emoji}</span> {btn.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ── 9. VIEW DETAILS CTA ── */}
                        <button
                          onClick={() => setShowStopDetails(true)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm"
                          data-testid="button-view-stop-details"
                        >
                          <span className="text-sm font-semibold text-gray-800">Explore more about this stop</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>

                      </div>
                    </div>
                  ) : null}

                  {/* ── FLOATING BOTTOM ACTION BAR ── */}
                  {currentStop && cfg && (
                    <div className="fixed left-0 right-0 z-40 px-4 py-3 bg-white/96 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
                      <div className="flex items-center gap-2.5 max-w-lg mx-auto">
                        {/* Primary: Capture a Moment */}
                        <button
                          onClick={() => {
                            setMomentCapturePreStopId(currentStop.id);
                            setShowMomentCapture(true);
                          }}
                          className={`${isQuickStop(currentStop.stopType, currentStop.name) ? "w-full" : "flex-1"} flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm py-3 rounded-2xl transition-colors shadow-sm`}
                          data-testid="button-atStop-capture-moment"
                        >
                          <Camera className="w-4 h-4 shrink-0" />
                          <span>Capture a Moment</span>
                        </button>
                        {/* Secondary: Let Kids Explore — hidden for quick stops (meal/recovery) */}
                        {!isQuickStop(currentStop.stopType, currentStop.name) && (
                          <button
                            onClick={() => {
                              const stop = sortedStops.find(s => !s.isVisited);
                              navigate(stop ? `/adventure/${tripId}/kid/next` : `/adventure/${tripId}/kid`);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-2xl transition-colors text-white"
                            style={{ background: '#7DA892' }}
                            data-testid="button-atStop-kid-explore"
                          >
                            <span>🤩</span>
                            <span>Let Kids Explore</span>
                          </button>
                        )}
                      </div>
                      {/* Mark Stop Complete — always visible when at a stop */}
                      <div className="mt-3 px-1">
                        <button
                          onClick={() => setShowMarkVisitedConfirm(currentStop)}
                          className="w-full flex items-center justify-center gap-2 font-bold rounded-2xl transition-all active:scale-[0.97]"
                          style={{ background: 'transparent', color: '#22c55e', fontSize: 16, padding: '13px 0', border: '2px solid #22c55e', cursor: 'pointer', letterSpacing: '-0.01em' }}
                          data-testid="button-atStop-mark-visited"
                        >
                          ✓ Mark Stop Complete
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {activeTab === "memories" && (() => {
              const moments = currentTripMoments || [];
              const visitedStops = currentTripStops.filter(s => s.isVisited).length;
              const totalStops = currentTripStops.length;
              const isCompleted = currentTrip?.status === "completed";
              const hasMoments = moments.length > 0;
              const favMoments = moments.filter(m => m.isFavorite);
              const totalPhotoCount = moments.reduce((sum, m) => sum + Math.max(getMomentAllPhotoUrls(m).length, 1), 0);

              const storyLabel = isCompleted
                ? "Your adventure story is ready! ✨"
                : moments.length === 0
                ? "Start capturing moments"
                : totalPhotoCount === 1
                ? "Your story has started ✨"
                : `${totalPhotoCount} photos — your story is building`;

              const stopMomentMap: Record<string, typeof moments> = {};
              moments.forEach(m => {
                const key = m.stopId || "__none__";
                if (!stopMomentMap[key]) stopMomentMap[key] = [];
                stopMomentMap[key].push(m);
              });

              const stopsWithMoments = currentTripStops.filter(s => stopMomentMap[s.id]);
              const unlinkedMoments = stopMomentMap["__none__"] || [];

              return (
                <motion.div
                  key="memories"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22 }}
                  className="min-h-screen pb-[120px]"
                  data-testid="memories-tab"
                >
                  {/* Header */}
                  <div className="px-4 pt-6 pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-[22px] font-bold text-gray-900">Trip Memories</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Capture moments. Relive the adventure.</p>
                      </div>
                      <button
                        onClick={() => setShowMomentCapture(true)}
                        className="flex items-center gap-1.5 bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm active:scale-95 transition-transform"
                        data-testid="button-capture-moment-header"
                      >
                        <Camera className="w-4 h-4" />
                        Capture
                      </button>
                    </div>
                  </div>

                  {/* Hero Story Card */}
                  <div className="mx-4 mt-3 mb-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-orange-100 shadow-sm" data-testid="memories-hero-card">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{storyLabel}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5" />
                            {totalPhotoCount} {totalPhotoCount === 1 ? "photo" : "photos"}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {visitedStops}/{totalStops} stops
                          </span>
                          {favMoments.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                              {favMoments.length} faves
                            </span>
                          )}
                        </div>
                        {moments.length > 0 && (
                          <div className="mt-2 h-1.5 bg-orange-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (visitedStops / Math.max(totalStops, 1)) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {!hasMoments ? (
                    /* Empty State */
                    <div className="mx-4 mt-2" data-testid="memories-empty-state">
                      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                          <Camera className="w-8 h-8 text-orange-300" />
                        </div>
                        <h3 className="font-bold text-gray-800 mb-1">No moments yet</h3>
                        <p className="text-sm text-gray-400 mb-5 max-w-[240px] mx-auto">Tap "Capture" to save your first photo, note, or memory from this trip</p>
                        <button
                          onClick={() => setShowMomentCapture(true)}
                          className="bg-orange-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-sm active:scale-95 transition-transform"
                          data-testid="button-first-capture-moment"
                        >
                          📷 Capture your first moment
                        </button>
                      </div>

                      {/* Creation tools (grayed out) */}
                      <div className="mt-4 grid grid-cols-2 gap-3" data-testid="creation-tools-empty">
                        {[
                          { Icon: Video, label: "Make Video", color: "purple", locked: true },
                          { Icon: ImageIcon, label: "Make Collage", color: "amber", locked: true },
                          { Icon: Share2, label: "Share Story", color: "blue", locked: false },
                          { Icon: Download, label: "Download", color: "green", locked: false },
                        ].map(({ Icon, label, color, locked }) => (
                          <button
                            key={label}
                            disabled={locked}
                            className="flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-xl py-4 opacity-40"
                            data-testid={`creation-tool-${label.toLowerCase().replace(" ", "-")}`}
                          >
                            <Icon className={`w-6 h-6 text-${color}-400`} />
                            <span className="text-xs font-semibold text-gray-500">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Content with moments */
                    <div className="space-y-4" data-testid="memories-content">
                      {/* Timeline by stops */}
                      {stopsWithMoments.length > 0 && (
                        <div className="px-4" data-testid="moments-timeline">
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">By Stop</h3>
                          <div className="space-y-4">
                            {stopsWithMoments.map(stop => {
                              const stopMoments = stopMomentMap[stop.id] || [];
                              const stopFlatPhotos = flattenMomentPhotos(stopMoments);
                              return (
                                <div key={stop.id} data-testid={`stop-moments-${stop.id}`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                                    <p className="text-sm font-semibold text-gray-700 truncate">{stop.name}</p>
                                    <span className="text-xs text-gray-400 ml-auto">{stopFlatPhotos.length}</span>
                                  </div>
                                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                    {stopFlatPhotos.map(({ moment, photoUrl, key }) => (
                                        <div
                                          key={key}
                                          className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 relative"
                                          data-testid={`moment-thumb-${key}`}
                                        >
                                          {photoUrl ? (
                                            <img src={photoUrl} alt="moment" className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-orange-50">
                                              <Camera className="w-5 h-5 text-orange-200" />
                                            </div>
                                          )}
                                          {moment.isFavorite && (
                                            <div className="absolute top-1 right-1">
                                              <Heart className="w-3 h-3 fill-red-400 text-red-400" />
                                            </div>
                                          )}
                                        </div>
                                    ))}
                                    <button
                                      onClick={() => setShowMomentCapture(true)}
                                      className="w-20 h-20 rounded-xl flex-shrink-0 bg-orange-50 border-2 border-dashed border-orange-200 flex items-center justify-center"
                                      data-testid={`add-moment-stop-${stop.id}`}
                                    >
                                      <Plus className="w-5 h-5 text-orange-300" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Unlinked moments */}
                      {unlinkedMoments.length > 0 && (
                        <div className="px-4" data-testid="unlinked-moments">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Other Moments</p>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {flattenMomentPhotos(unlinkedMoments).map(({ moment, photoUrl, key }) => (
                                <div
                                  key={key}
                                  className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 relative"
                                  data-testid={`moment-thumb-${key}`}
                                >
                                  {photoUrl ? (
                                    <img src={photoUrl} alt="moment" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-purple-50">
                                      <Camera className="w-5 h-5 text-purple-200" />
                                    </div>
                                  )}
                                  {moment.isFavorite && (
                                    <div className="absolute top-1 right-1">
                                      <Heart className="w-3 h-3 fill-red-400 text-red-400" />
                                    </div>
                                  )}
                                </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Highlight — favorites row */}
                      {favMoments.length > 0 && (
                        <div className="mx-4 bg-gradient-to-r from-pink-50 to-red-50 rounded-2xl p-4 border border-red-100" data-testid="memories-highlights">
                          <div className="flex items-center gap-2 mb-3">
                            <Heart className="w-4 h-4 fill-red-400 text-red-400" />
                            <p className="text-sm font-bold text-gray-800">Favourite Moments</p>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {favMoments.map(moment => {
                              const photoUrl = getMomentPhotoUrl(moment);
                              return (
                                <div
                                  key={moment.id}
                                  className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100"
                                  data-testid={`fav-moment-${moment.id}`}
                                >
                                  {photoUrl ? (
                                    <img src={photoUrl} alt="fav moment" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-red-50">
                                      <Heart className="w-6 h-6 text-red-300" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* All moments grid */}
                      <div className="px-4" data-testid="all-moments-grid">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">All Moments ({totalPhotoCount})</h3>
                          <button
                            onClick={() => setShowMomentCapture(true)}
                            className="text-xs text-orange-500 font-semibold"
                            data-testid="button-add-moment-grid"
                          >
                            + Add
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {flattenMomentPhotos(moments).map(({ moment, photoUrl, key }) => (
                              <div
                                key={key}
                                className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative group"
                                data-testid={`memory-grid-${key}`}
                              >
                                {photoUrl ? (
                                  <img src={photoUrl} alt="moment" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-orange-50">
                                    <Camera className="w-5 h-5 text-orange-200" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                  <div className="flex items-center justify-between">
                                    <button
                                      onClick={() => toggleFavorite(moment.id)}
                                      className="text-white"
                                      data-testid={`toggle-fav-${key}`}
                                    >
                                      <Heart className={`w-3.5 h-3.5 ${moment.isFavorite ? "fill-red-400 text-red-400" : ""}`} />
                                    </button>
                                    <button
                                      onClick={() => deleteMoment(moment.id)}
                                      className="text-white hover:text-red-400"
                                      data-testid={`delete-moment-${key}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                          ))}
                          {/* Add new moment tile */}
                          <button
                            onClick={() => setShowMomentCapture(true)}
                            className="aspect-square rounded-xl bg-orange-50 border-2 border-dashed border-orange-200 flex items-center justify-center"
                            data-testid="button-add-moment-tile"
                          >
                            <Plus className="w-6 h-6 text-orange-300" />
                          </button>
                        </div>
                      </div>

                      {/* Creation Tools 2×2 */}
                      <div className="px-4" data-testid="creation-tools">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Create Something</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => moments.length >= 3 ? setShowMemoriesVideoMaker(true) : toast.info("Add 3+ moments to create a video")}
                            className={`flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-2xl py-5 shadow-sm active:scale-95 transition-transform ${moments.length < 3 ? "opacity-50" : ""}`}
                            data-testid="button-make-video"
                          >
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                              <Video className="w-5 h-5 text-purple-500" />
                            </div>
                            <span className="text-xs font-bold text-gray-700">Make Video</span>
                            {moments.length < 3 && <span className="text-[10px] text-gray-400">Need 3+ moments</span>}
                          </button>

                          <button
                            onClick={() => moments.length >= 2 ? setShowMemoriesCollageMaker(true) : toast.info("Add 2+ moments to make a collage")}
                            className={`flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-2xl py-5 shadow-sm active:scale-95 transition-transform ${moments.length < 2 ? "opacity-50" : ""}`}
                            data-testid="button-make-collage"
                          >
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-amber-500" />
                            </div>
                            <span className="text-xs font-bold text-gray-700">Make Collage</span>
                            {moments.length < 2 && <span className="text-[10px] text-gray-400">Need 2+ moments</span>}
                          </button>

                          <button
                            onClick={() => setShowDayShareSheet(true)}
                            className="flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-2xl py-5 shadow-sm active:scale-95 transition-transform"
                            data-testid="button-share-memories"
                          >
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                              <Share2 className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="text-xs font-bold text-gray-700">Share Story</span>
                          </button>

                          <button
                            onClick={() => setTriggerOfflineOpen(true)}
                            className="flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-2xl py-5 shadow-sm active:scale-95 transition-transform"
                            data-testid="button-download-memories"
                          >
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                              <Download className="w-5 h-5 text-green-500" />
                            </div>
                            <span className="text-xs font-bold text-gray-700">Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}


                  {/* Video Maker Overlay */}
                  {showMemoriesVideoMaker && currentTrip && (
                    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40" onClick={() => setShowMemoriesVideoMaker(false)}>
                      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
                          <div className="flex items-center gap-2">
                            <Video className="w-5 h-5 text-purple-500" />
                            <h3 className="font-bold text-gray-900">Create Family Video</h3>
                          </div>
                          <button onClick={() => setShowMemoriesVideoMaker(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                            <X className="w-5 h-5 text-gray-400" />
                          </button>
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-gray-500 mb-4">Turn your adventure moments into a keepsake video</p>
                          <TripVideoGenerator
                            trip={currentTrip}
                            moments={currentTripMoments || []}
                            stops={currentTripStops}
                            onClose={() => setShowMemoriesVideoMaker(false)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Collage Maker Overlay */}
                  {showMemoriesCollageMaker && currentTrip && (
                    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40" onClick={() => setShowMemoriesCollageMaker(false)}>
                      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-amber-500" />
                            <h3 className="font-bold text-gray-900">Create Photo Collage</h3>
                          </div>
                          <button onClick={() => setShowMemoriesCollageMaker(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                            <X className="w-5 h-5 text-gray-400" />
                          </button>
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-gray-500 mb-4">Create a beautiful collage from your adventure photos</p>
                          <TripCollageGenerator
                            trip={currentTrip}
                            moments={currentTripMoments || []}
                            stops={currentTripStops}
                            onClose={() => setShowMemoriesCollageMaker(false)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {activeTab === "passes" && (() => {
              const today = new Date();
              const nowMins = today.getHours() * 60 + today.getMinutes();
              const tripStart = currentTrip?.startDate ? new Date(currentTrip.startDate) : null;
              const dayOffset = tripStart
                ? Math.max(0, Math.floor((today.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)))
                : 0;

              const todayStops = dayGroups[dayOffset] || [];
              const tomorrowStops = dayGroups[dayOffset + 1] || [];
              const laterStops = dayGroups.slice(dayOffset + 2).flat();

              // Build time map for today's stops
              const todayTimeline = buildTimeline(todayStops);
              const stopTimeMap: Record<number, number> = {};
              todayTimeline.forEach((item) => {
                if (item.kind === "stop" && item.stop && item.time) {
                  const [h, m] = item.time.replace(" AM", "").replace(" PM", "").split(":").map(Number);
                  const isPM = item.time.includes("PM") && h !== 12;
                  const isAM12 = item.time.includes("AM") && h === 12;
                  const totalMins = (isPM ? h + 12 : isAM12 ? 0 : h) * 60 + m;
                  stopTimeMap[item.stop.id] = totalMins;
                }
              });

              const getStopStatus = (stop: TravelStop, isToday: boolean): "ready" | "entry_soon" | "later_today" | "optional" | "missing_required" => {
                const hasTicket = stopHasTicket(stop);
                const needsTicket = stopNeedsTicket(stop);
                if (hasTicket) return "ready";
                if (!needsTicket) return "optional";
                if (isToday) {
                  const stopMins = stopTimeMap[stop.id];
                  if (stopMins !== undefined) {
                    const minsUntil = stopMins - nowMins;
                    if (minsUntil <= 60 && minsUntil >= -30) return "entry_soon";
                    return "later_today";
                  }
                }
                return "missing_required";
              };

              const getEntryTip = (stop: TravelStop) => {
                const type = stop.stopType;
                if (type === "museum") return "Best before 11 AM to avoid crowds";
                if (type === "park") return "Walk right in — no booking needed";
                if (type === "restaurant") return "Book a table in advance";
                if (type === "aquarium") return "Book online for faster entry";
                if (type === "beach") return "Free entry — just bring sunscreen";
                if (type === "market") return "Open entry — no ticket needed";
                if (type === "landmark") return "Quick entry — no pre-booking needed";
                return "Check venue website for entry info";
              };

              const todayNeedingTickets = todayStops.filter((s) => stopNeedsTicket(s) && !stopHasTicket(s));
              const allTodayReady = todayNeedingTickets.length === 0 && todayStops.length > 0;
              const firstNeeded = todayNeedingTickets[0];
              const firstSoon = todayNeedingTickets.find((s) => getStopStatus(s, true) === "entry_soon");

              const todayPendingCount = todayNeedingTickets.length;

              const toggleSection = (key: string) => {
                setCollapsedPassSections((prev) => {
                  const next = new Set(prev);
                  if (next.has(key)) next.delete(key); else next.add(key);
                  return next;
                });
              };

              const renderStopCard = (stop: TravelStop, isToday: boolean) => {
                const ticket = getTicketForStop(stop);
                const status = getStopStatus(stop, isToday);
                const cfg = getStopConfig(stop.stopType);
                const tip = getEntryTip(stop);
                const isOptional = status === "optional";

                const statusChip = {
                  ready:           { label: "Ready",          dot: "🟢", chipCls: "text-green-700 bg-green-50" },
                  entry_soon:      { label: "Entry soon",     dot: "🔴", chipCls: "text-red-600 bg-red-50" },
                  later_today:     { label: "Later today",    dot: "🟡", chipCls: "text-amber-700 bg-amber-50" },
                  optional:        { label: "Optional",       dot: "⚪", chipCls: "text-gray-400 bg-gray-100" },
                  missing_required:{ label: "Tickets needed", dot: "🟡", chipCls: "text-orange-600 bg-orange-50" },
                }[status];

                return (
                  <div
                    key={stop.id}
                    className={`rounded-2xl border shadow-sm overflow-hidden ${isOptional ? "bg-gray-50/80 border-gray-100" : "bg-white border-gray-100"}`}
                    data-testid={`pass-stop-${stop.id}`}
                  >
                    <div className="p-3.5">
                      {/* Header row */}
                      <div className="flex items-start gap-2.5 mb-2">
                        <div className={`w-8 h-8 rounded-xl shrink-0 bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mt-0.5`}>
                          <span className="text-base">{cfg.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isOptional ? "text-gray-500" : "text-gray-900"}`}>{stop.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{tip}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${statusChip.chipCls}`}>
                          {statusChip.dot} {statusChip.label}
                        </span>
                      </div>

                      {/* Single primary CTA + optional secondary link */}
                      {status === "ready" && ticket ? (
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="w-full flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
                          data-testid={`button-view-pass-${stop.id}`}
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          View pass
                        </button>
                      ) : status === "entry_soon" || status === "missing_required" ? (
                        <div className="space-y-1.5">
                          <button
                            onClick={() => window.open(stop.bookingUrl || `https://www.google.com/search?q=buy+tickets+${encodeURIComponent(stop.name)}`, "_blank")}
                            className="w-full flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
                            data-testid={`button-buy-ticket-${stop.id}`}
                          >
                            {stop.bookingUrl ? "Book tickets →" : "Buy tickets now"}
                          </button>
                          <button
                            onClick={() => { setShowAddWallet(true); setAddPassStep("choose"); setWalletForm((f) => ({ ...f, label: stop.name + " Ticket", stopId: stop.id })); }}
                            className="w-full text-xs text-gray-400 hover:text-orange-500 text-center py-1 transition-colors"
                            data-testid={`button-already-have-${stop.id}`}
                          >
                            I already have tickets
                          </button>
                        </div>
                      ) : status === "later_today" ? (
                        <div className="space-y-1.5">
                          <button
                            onClick={() => window.open(stop.bookingUrl || `https://www.google.com/search?q=buy+tickets+${encodeURIComponent(stop.name)}`, "_blank")}
                            className="w-full flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
                            data-testid={`button-buy-ticket-${stop.id}`}
                          >
                            {stop.bookingUrl ? "Book tickets →" : "Buy tickets"}
                          </button>
                          <button
                            onClick={() => { setShowAddWallet(true); setAddPassStep("choose"); setWalletForm((f) => ({ ...f, label: stop.name + " Ticket", stopId: stop.id })); }}
                            className="w-full text-xs text-gray-400 hover:text-orange-500 text-center py-1 transition-colors"
                            data-testid={`button-already-have-${stop.id}`}
                          >
                            I already have tickets
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowAddWallet(true); setAddPassStep("choose"); setWalletForm((f) => ({ ...f, label: stop.name + " Ticket", stopId: stop.id })); }}
                          className="w-full text-xs text-gray-300 hover:text-gray-400 text-center py-1 transition-colors"
                          data-testid={`button-optional-ticket-${stop.id}`}
                        >
                          Save a pass anyway
                        </button>
                      )}
                    </div>
                  </div>
                );
              };

              const renderSection = (key: string, label: string, stops: TravelStop[], isToday: boolean, defaultCollapsed = false) => {
                if (stops.length === 0) return null;
                const isCollapsed = collapsedPassSections.has(key) ?? defaultCollapsed;
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center justify-between mb-2.5 py-0.5"
                      data-testid={`button-passes-section-${key}`}
                    >
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">{label}</span>
                      <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
                    </button>
                    {!isCollapsed && <div className="space-y-2">{stops.map((s) => renderStopCard(s, isToday))}</div>}
                  </div>
                );
              };

              const bottomCtaLabel = allTodayReady
                ? "You're ready → Start your day"
                : firstSoon
                ? "Head to first stop →"
                : "Get ready for today →";

              const subtitleText = allTodayReady && todayStops.length > 0
                ? "You're ready for today"
                : todayPendingCount === 0
                ? "No stops need tickets right now"
                : todayPendingCount === 1
                ? "1 thing to take care before you go"
                : `${todayPendingCount} things to take care before you go`;

              const passItems = walletItems.filter((w) => w.walletSection !== "document");
              const docItems = walletItems.filter((w) => w.walletSection === "document");

              const docTypeConfig: Record<string, { icon: JSX.Element; label: string; color: string }> = {
                flight:  { icon: <Plane className="w-4 h-4" />,          label: "Flight",      color: "from-blue-400 to-sky-500" },
                hotel:   { icon: <Hotel className="w-4 h-4" />,          label: "Hotel",       color: "from-purple-400 to-violet-500" },
                car:     { icon: <Car className="w-4 h-4" />,            label: "Car rental",  color: "from-green-400 to-emerald-500" },
                parking: { icon: <ParkingCircle className="w-4 h-4" />,  label: "Parking",     color: "from-slate-400 to-gray-500" },
                other:   { icon: <FileText className="w-4 h-4" />,       label: "Document",    color: "from-orange-400 to-amber-500" },
              };

              return (
                <motion.div
                  key="passes"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3.5"
                  data-testid="passes-tab"
                >
                  {/* Sub-tab switcher */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex">
                      <button
                        onClick={() => setPassesSubTab("passes")}
                        className={`flex-1 py-3 text-sm font-bold transition-colors flex flex-col items-center gap-0.5 ${passesSubTab === "passes" ? "text-orange-600 border-b-2 border-orange-500 bg-orange-50/60" : "text-gray-400 hover:text-gray-600 border-b-2 border-transparent"}`}
                        data-testid="button-subtab-passes"
                      >
                        <span className="flex items-center gap-1.5"><Ticket className="w-4 h-4" /> Passes</span>
                        <span className="text-[10px] font-normal opacity-70">Used during your day</span>
                      </button>
                      <button
                        onClick={() => setPassesSubTab("documents")}
                        className={`flex-1 py-3 text-sm font-bold transition-colors flex flex-col items-center gap-0.5 ${passesSubTab === "documents" ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50/60" : "text-gray-400 hover:text-gray-600 border-b-2 border-transparent"}`}
                        data-testid="button-subtab-documents"
                      >
                        <span className="flex items-center gap-1.5"><FolderOpen className="w-4 h-4" /> Documents</span>
                        <span className="text-[10px] font-normal opacity-70">For reference anytime</span>
                      </button>
                    </div>
                  </div>

                  {/* ── PASSES sub-tab ── */}
                  {passesSubTab === "passes" && (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="passes-content"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3.5"
                      >
                        {/* Calm header — no alarming banner */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                          <p className="text-base font-bold text-gray-900">Today's readiness</p>
                          <p className="text-sm text-gray-500 mt-0.5">{subtitleText}</p>

                          {!allTodayReady && todayPendingCount > 0 && (
                            <button
                              onClick={() => {
                                if (firstSoon) window.open(`https://www.google.com/search?q=buy+tickets+${encodeURIComponent(firstSoon.name)}`, "_blank");
                                else if (firstNeeded) window.open(`https://www.google.com/search?q=buy+tickets+${encodeURIComponent(firstNeeded.name)}`, "_blank");
                              }}
                              className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-all"
                              data-testid="button-get-ready-primary"
                            >
                              Get ready for today →
                            </button>
                          )}
                          {allTodayReady && todayStops.length > 0 && (
                            <div className="mt-3 flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5">
                              <span className="text-base">✅</span>
                              <p className="text-sm font-semibold text-green-700">All set — enjoy your day!</p>
                            </div>
                          )}
                        </div>

                        {/* Add pass button */}
                        <button
                          onClick={() => { setShowAddWallet(true); setAddPassStep("choose"); }}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-white rounded-xl border border-dashed border-orange-200 text-orange-500 font-semibold text-sm hover:bg-orange-50 transition-colors"
                          data-testid="button-add-wallet-item"
                        >
                          <Plus className="w-4 h-4" />
                          Add ticket or reservation
                        </button>

                        {walletLoading ? (
                          <div className="py-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-orange-400 mx-auto mb-2" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {renderSection("today", (() => {
                              if (!tripStart) return `Day ${dayOffset + 1}`;
                              const d = new Date(tripStart); d.setDate(d.getDate() + dayOffset);
                              const now = new Date(); const tom = new Date(now); tom.setDate(now.getDate() + 1);
                              if (d.toDateString() === now.toDateString()) return "Today";
                              if (d.toDateString() === tom.toDateString()) return "Tomorrow";
                              return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                            })(), todayStops, true, false)}
                            {renderSection("tomorrow", (() => {
                              if (!tripStart) return `Day ${dayOffset + 2}`;
                              const d = new Date(tripStart); d.setDate(d.getDate() + dayOffset + 1);
                              const now = new Date(); const tom = new Date(now); tom.setDate(now.getDate() + 1);
                              if (d.toDateString() === now.toDateString()) return "Today";
                              if (d.toDateString() === tom.toDateString()) return "Tomorrow";
                              return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                            })(), tomorrowStops, false, true)}
                            {renderSection("later", "Later", laterStops, false, true)}

                            {/* Unmatched pass wallet items (not documents) — today's only, deduplicated */}
                            {passItems.filter((w) => {
                              const matchesStop = sortedStops.some((s) => s.id === w.stopId || w.label.toLowerCase().includes(s.name.toLowerCase().slice(0, 8)));
                              const isTodayStop = todayStops.some(s => s.id === w.stopId);
                              return !matchesStop && (w.stopId == null || isTodayStop);
                            }).length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5">Other passes</p>
                                <div className="space-y-2">
                                  {passItems
                                    .filter((w) => {
                                      const matchesStop = sortedStops.some((s) => s.id === w.stopId || w.label.toLowerCase().includes(s.name.toLowerCase().slice(0, 8)));
                                      const isTodayStop = todayStops.some(s => s.id === w.stopId);
                                      return !matchesStop && (w.stopId == null || isTodayStop);
                                    })
                                    .filter((w, idx, arr) => arr.findIndex(x => x.id === w.id) === idx)
                                    .map((item) => (
                                      <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-testid={`wallet-item-${item.id}`}>
                                        <div className="flex items-center gap-3 p-3">
                                          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shrink-0">
                                            {item.fileUrl
                                              ? <img src={item.fileUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                                              : <Ticket className="w-5 h-5 text-white" />
                                            }
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 text-sm truncate">{item.label}</p>
                                            {item.confirmationNumber && <p className="text-xs text-gray-400 font-mono">#{item.confirmationNumber}</p>}
                                          </div>
                                          <button onClick={() => handleDeleteWalletItem(item.id)} className="p-1 text-gray-200 hover:text-red-400 transition-colors" data-testid={`button-delete-wallet-${item.id}`}>
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                        <div className="border-t border-gray-50 flex">
                                          <button onClick={() => setSelectedTicket(item)} className="flex-1 py-2 text-xs font-bold text-orange-500 hover:bg-orange-50 transition-colors border-r border-gray-50">
                                            View Ticket →
                                          </button>
                                          <button
                                            onClick={() => setLinkingPassId(item.id)}
                                            className="flex-1 py-2 text-xs font-semibold text-gray-400 hover:bg-gray-50 hover:text-orange-500 transition-colors"
                                            data-testid={`button-link-pass-${item.id}`}
                                          >
                                            Link to stop →
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {sortedStops.length === 0 && passItems.length === 0 && (
                              <div className="text-center py-10">
                                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
                                  <Ticket className="w-7 h-7 text-orange-300" />
                                </div>
                                <p className="text-sm font-semibold text-gray-600 mb-1">No passes yet</p>
                                <p className="text-xs text-gray-400">Add tickets and bookings to keep them handy</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sticky bottom CTA */}
                        <div className="pt-1 pb-2">
                          <button
                            onClick={() => {
                              if (allTodayReady) setActiveTab("todays_plan");
                              else if (firstSoon) window.open(`https://www.google.com/search?q=buy+tickets+${encodeURIComponent(firstSoon.name)}`, "_blank");
                              else if (firstNeeded) window.open(`https://www.google.com/search?q=buy+tickets+${encodeURIComponent(firstNeeded.name)}`, "_blank");
                            }}
                            className={`w-full font-bold py-3.5 rounded-2xl text-sm transition-all shadow-sm ${
                              allTodayReady
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : "bg-orange-500 hover:bg-orange-600 text-white"
                            }`}
                            data-testid="button-passes-bottom-cta"
                          >
                            {bottomCtaLabel}
                          </button>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}

                  {/* ── DOCUMENTS sub-tab ── */}
                  {passesSubTab === "documents" && (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="documents-content"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3"
                      >
                        {/* Header */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                          <p className="text-base font-bold text-gray-900">Documents</p>
                          <p className="text-sm text-gray-400 mt-0.5">Flights, hotels, and travel info</p>
                        </div>

                        {/* Add document button */}
                        <button
                          onClick={() => { setDocForm({ label: "", type: "flight", confirmationNumber: "", notes: "", fileUrl: "" }); setEditDocItem(null); setShowAddDocModal(true); }}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-white rounded-xl border border-dashed border-blue-200 text-blue-500 font-semibold text-sm hover:bg-blue-50 transition-colors"
                          data-testid="button-add-document"
                        >
                          <Plus className="w-4 h-4" />
                          Add document
                        </button>

                        {walletLoading ? (
                          <div className="py-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                          </div>
                        ) : docItems.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                              <FolderOpen className="w-7 h-7 text-blue-300" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600 mb-1">No documents yet</p>
                            <p className="text-xs text-gray-400">Save flights, hotels, and other travel info</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {docItems.map((item) => {
                              const cfg = docTypeConfig[item.type] || docTypeConfig.other;
                              return (
                                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-testid={`doc-item-${item.id}`}>
                                  <div className="flex items-center gap-3 p-3.5">
                                    <div className={`w-10 h-10 bg-gradient-to-br ${cfg.color} rounded-xl flex items-center justify-center shrink-0 text-white`}>
                                      {cfg.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-gray-900 text-sm truncate">{item.label}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{cfg.label}</span>
                                        {item.confirmationNumber && (
                                          <span className="text-[10px] text-gray-400 font-mono">#{item.confirmationNumber.slice(0, 12)}</span>
                                        )}
                                      </div>
                                      {item.notes && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => { setDocForm({ label: item.label, type: item.type, confirmationNumber: item.confirmationNumber || "", notes: item.notes || "", fileUrl: item.fileUrl || "" }); setEditDocItem(item); setShowAddDocModal(true); }}
                                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors"
                                        data-testid={`button-edit-doc-${item.id}`}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteWalletItem(item.id)}
                                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-200 hover:text-red-400 transition-colors"
                                        data-testid={`button-delete-doc-${item.id}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  {item.fileUrl && (
                                    <div className="border-t border-gray-50">
                                      <button onClick={() => setSelectedTicket(item)} className="w-full py-2 text-xs font-bold text-blue-500 hover:bg-blue-50 transition-colors">
                                        View →
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </div>

      {/* Detour banner — shown after "Go here now" */}
      <AnimatePresence>
        {detourBanner?.active && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 right-0 z-50 max-w-lg mx-auto"
          >
            <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between shadow-md" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
              <div>
                <p className="text-xs font-bold leading-tight">Heading to {detourBanner.stopName}</p>
                <p className="text-[11px] opacity-80 mt-0.5">We'll help you continue your day after</p>
              </div>
              <button
                onClick={() => setDetourBanner(null)}
                className="text-white opacity-70 hover:opacity-100 ml-3 shrink-0 text-xs font-bold"
                data-testid="button-dismiss-detour-banner"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add-success banner — shown after "Add to today" */}
      <AnimatePresence>
        {addSuccessBanner?.visible && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-20 left-0 right-0 z-40 max-w-lg mx-auto px-4"
          >
            <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl">
              <div>
                <p className="text-xs font-bold leading-tight">✓ {addSuccessBanner.stopName} added to today</p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <button
                  onClick={() => {
                    setAddSuccessBanner(null);
                    setActiveTab("todays_plan");
                  }}
                  className="text-orange-400 text-[11px] font-bold hover:text-orange-300"
                  data-testid="button-success-banner-run-day"
                >
                  Run updated day
                </button>
                {addSuccessBanner.stopId && (
                  <>
                    <span className="text-gray-600">·</span>
                    <button
                      onClick={() => undoAddedStop(addSuccessBanner.stopId!)}
                      className="text-gray-400 text-[11px] font-bold hover:text-gray-200"
                      data-testid="button-success-banner-undo"
                    >
                      Undo
                    </button>
                  </>
                )}
                <button
                  onClick={() => setAddSuccessBanner(null)}
                  className="text-gray-500 text-xs ml-1 hover:text-gray-300"
                  data-testid="button-dismiss-success-banner"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location mode selection sheet */}
      <AnimatePresence>
        {locationSheet.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center max-w-lg mx-auto"
            onClick={() => setLocationSheet(s => ({ ...s, open: false }))}
          >
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ duration: 0.25 }}
              className="relative w-full bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8"
              onClick={e => e.stopPropagation()}
              data-testid="location-mode-sheet"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <p className="text-sm font-bold text-gray-900 mb-1">Where should we look?</p>
              <p className="text-xs text-gray-500 mb-4">Choose a search area for suggestions</p>

              {!locationSheet.gpsAvailable && (
                <div className="mb-3 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <span className="text-amber-500 text-sm">📍</span>
                  <p className="text-[11px] text-amber-700">Suggestions based on your next stop.{" "}
                    <button
                      className="font-bold underline"
                      onClick={() => {
                        navigator.geolocation?.getCurrentPosition(
                          (pos) => setLocationSheet(s => ({ ...s, gpsAvailable: true, mode: "near_me", lat: pos.coords.latitude, lng: pos.coords.longitude })),
                          () => {}
                        );
                      }}
                      data-testid="button-use-my-location"
                    >
                      Use my location
                    </button>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {([
                  { id: "near_me" as const, label: "Near me", sub: "Use your current GPS location", emoji: "📍", disabled: locationSheet.gpsAvailable === false },
                  { id: "near_next_stop" as const, label: "Near next stop", sub: `Based on your next planned stop`, emoji: "🗺️", disabled: false },
                  { id: "along_route" as const, label: "Along today's route", sub: "Find options anywhere on your route today", emoji: "🛣️", disabled: false },
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => !opt.disabled && setLocationSheet(s => ({ ...s, mode: opt.id }))}
                    className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                      locationSheet.mode === opt.id
                        ? "border-orange-400 bg-orange-50"
                        : opt.disabled
                        ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                        : "border-gray-100 bg-white hover:border-orange-200"
                    }`}
                    data-testid={`location-mode-option-${opt.id}`}
                    disabled={opt.disabled}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${locationSheet.mode === opt.id ? "text-orange-700" : opt.disabled ? "text-gray-400" : "text-gray-800"}`}>{opt.label}</p>
                      <p className="text-[11px] text-gray-400">{opt.sub}</p>
                    </div>
                    {locationSheet.mode === opt.id && <span className="text-orange-500 text-sm font-bold shrink-0">✓</span>}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  const currentStop = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops)
                    .filter((s: any) => !skippedStopIds.includes(s.id))
                    .find((s: any) => !s.isVisited) || null;
                  confirmLocationAndFetch(currentStop as any);
                }}
                className="w-full mt-4 py-3.5 bg-orange-500 text-white font-bold text-sm rounded-2xl hover:bg-orange-600 transition-colors"
                data-testid="button-location-confirm"
              >
                Find suggestions →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Tray — hidden while plan is still generating */}
      {sortedStops.length > 0 && <div className="fixed bottom-0 left-0 right-0 z-20 max-w-lg mx-auto">
        {/* 5-tab nav — content row 72px, safe-area padding added below */}
        <div className="bg-white border-t border-gray-100 px-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
          <div className="flex items-center justify-around" style={{ height: 72 }}>
            {(
              [
                { id: "trip_plan",    Icon: MapIcon,     label: "Trip Plan"    },
                { id: "todays_plan",  Icon: Calendar,    label: "Today"        },
                { id: "current",      Icon: Navigation,  label: "At Stop"      },
                { id: "memories",     Icon: Camera,      label: "Memories"     },
                { id: "passes",       Icon: Ticket,      label: "Passes"       },
              ] as const
            ).map(({ id, Icon, label }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (!user && !userLoading && id !== "trip_plan") {
                      setShowGuestTabPrompt(true);
                      return;
                    }
                    if (paywallEnabled && !tripIsUnlocked && (id === "current" || id === "memories" || id === "passes")) {
                      setShowPaywallTabPrompt(true);
                      return;
                    }
                    if (id === "todays_plan" && currentTrip?.adventureStartedAt) {
                      navigate(`/adventure/${tripId}/today`);
                      return;
                    }
                    setActiveTab(id as MainTabId);
                    if (id !== "current") setForcedCurrentStop(null);
                  }}
                  className="flex flex-col items-center gap-1 flex-1 transition-colors py-3"
                  style={{ color: isActive ? '#E67E22' : '#9A9A9A' }}
                  data-testid={`bottom-nav-${id}`}
                >
                  <Icon style={{ width: 22, height: 22 }} />
                  <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>}

      {/* Guest tab access prompt */}
      <AnimatePresence>
        {showGuestTabPrompt && (
          <div className="fixed inset-0 z-[500] bg-black/50 flex items-center justify-center px-6" onClick={() => setShowGuestTabPrompt(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-4xl mb-3">✈️</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Create an account to access this</h3>
              <p className="text-sm text-slate-500 mb-6">Save your plan, track memories, and pick up where you left off — for free.</p>
              <Button
                onClick={() => { setShowGuestTabPrompt(false); setShowGuestSignup(true); }}
                className="w-full h-12 rounded-xl font-bold text-white mb-3"
                style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
                data-testid="button-guest-tab-signup"
              >
                Sign Up — it's free
              </Button>
              <button
                onClick={() => setShowGuestTabPrompt(false)}
                className="w-full text-sm text-slate-400 hover:text-slate-600 py-2"
                data-testid="button-guest-tab-cancel"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Paywall tab access prompt */}
      <AnimatePresence>
        {showPaywallTabPrompt && (
          <div className="fixed inset-0 z-[500] bg-black/50 flex items-center justify-center px-6" onClick={() => setShowPaywallTabPrompt(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">These features are available upon buying the trip.</h3>
              <p className="text-sm text-slate-500 mb-6">Unlock step-by-step guidance, stop details, memories, and passes for your entire adventure.</p>
              <Button
                onClick={() => { setShowPaywallTabPrompt(false); setRevealDetailsOpen(true); }}
                className="w-full h-12 rounded-xl font-bold text-white mb-3"
                style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
                data-testid="button-paywall-tab-unlock"
              >
                Unlock Trip Details
              </Button>
              <button
                onClick={() => setShowPaywallTabPrompt(false)}
                className="w-full text-sm text-slate-400 hover:text-slate-600 py-2"
                data-testid="button-paywall-tab-cancel"
              >
                Maybe later
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GeoAdventures sign-up modal */}
      <SignUpPrompt
        isOpen={showGuestSignup}
        variant="travel"
        onClose={() => setShowGuestSignup(false)}
        onLogin={async () => {
          setShowGuestSignup(false);
          // Claim any pending guest trip
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
          // Reload so user context + trip ownership refresh
          window.location.reload();
        }}
        variant="travel"
      />

      {/* Before You Go Sheet */}
      <AnimatePresence>
        {showBeforeYouGoSheet && beforeYouGoStop && (
          <div className="fixed inset-0 z-[350] bg-black/40 flex items-end justify-center" onClick={() => setShowBeforeYouGoSheet(false)}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28 }}
              className="bg-white w-full max-w-lg rounded-t-2xl shadow-2xl pb-safe"
              onClick={(e) => e.stopPropagation()}
              data-testid="before-you-go-sheet"
            >
              {(() => {
                const er = getEntryReadiness(beforeYouGoStop);
                const ticket = getTicketForStop(beforeYouGoStop);
                const friction = getFrictionSignal(beforeYouGoStop.stopType);
                return (
                  <div className="p-5">
                    <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 text-base mb-1">
                      {er.type === "needed" ? "Quick heads up" : "Before you go"}
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">{beforeYouGoStop.name}</p>

                    <div className="space-y-2.5 mb-5">
                      {er.type === "ready" ? (
                        <>
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">✅</span>
                            <span className="text-sm text-gray-700">Tickets ready</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">🚪</span>
                            <span className="text-sm text-gray-700">Entry: show pass at gate</span>
                          </div>
                          {friction && (
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">⏰</span>
                              <span className="text-sm text-gray-700">{friction}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">🎟</span>
                            <span className="text-sm text-gray-700">Tickets required</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">⏱</span>
                            <span className="text-sm text-gray-700">~5 min to purchase online</span>
                          </div>
                          {friction && (
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">⚠️</span>
                              <span className="text-sm text-gray-700">{friction}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {er.type === "ready" && ticket ? (
                        <button
                          onClick={() => { setShowBeforeYouGoSheet(false); setSelectedTicket(ticket); }}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                          data-testid="button-byg-open-pass"
                        >
                          Open pass
                        </button>
                      ) : (
                        <button
                          onClick={() => { setShowBeforeYouGoSheet(false); window.open(beforeYouGoStop.bookingUrl || `https://www.google.com/search?q=buy+tickets+${encodeURIComponent(beforeYouGoStop.name)}`, "_blank"); }}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                          data-testid="button-byg-buy-now"
                        >
                          {beforeYouGoStop.bookingUrl ? "Book tickets →" : "Buy now →"}
                        </button>
                      )}
                      <button
                        onClick={() => { setShowBeforeYouGoSheet(false); handleGetDirections(beforeYouGoStop); }}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5"
                        data-testid="button-byg-directions"
                      >
                        <Navigation className="w-4 h-4" />
                        Continue
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Pass Modal */}
      <AnimatePresence>
        {showAddWallet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => { setShowAddWallet(false); setAddPassStep("choose"); }}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-white w-full max-w-lg rounded-t-2xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {addPassStep === "choose" && (
                <div className="p-5">
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                  <button onClick={() => { setShowAddWallet(false); setAddPassStep("choose"); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="font-bold text-gray-900 text-lg text-center mb-1">Add Pass</h3>
                  <p className="text-sm text-gray-400 text-center mb-5">Quickly save tickets or reservations.</p>

                  <div className="space-y-2">
                    <button
                      onClick={() => { setWalletForm((f) => ({ ...f, type: "photo" })); setAddPassStep("screenshot"); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 hover:bg-orange-50 rounded-xl text-sm font-semibold text-gray-700 hover:text-orange-600 transition-colors border border-gray-100 hover:border-orange-200"
                      data-testid="button-add-pass-screenshot"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        <Camera className="w-5 h-5 text-gray-500" />
                      </div>
                      <span className="flex-1 text-left">Take screenshot</span>
                      <span className="text-gray-300">›</span>
                    </button>
                    <button
                      onClick={() => { setWalletForm((f) => ({ ...f, type: "photo" })); setAddPassStep("upload"); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 hover:bg-orange-50 rounded-xl text-sm font-semibold text-gray-700 hover:text-orange-600 transition-colors border border-gray-100 hover:border-orange-200"
                      data-testid="button-add-pass-upload"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        <Upload className="w-5 h-5 text-gray-500" />
                      </div>
                      <span className="flex-1 text-left">Upload from photos</span>
                      <span className="text-gray-300">›</span>
                    </button>
                    <button
                      onClick={() => { setWalletForm((f) => ({ ...f, type: "confirmation" })); setAddPassStep("confirmation"); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 hover:bg-orange-50 rounded-xl text-sm font-semibold text-gray-700 hover:text-orange-600 transition-colors border border-gray-100 hover:border-orange-200"
                      data-testid="button-add-pass-confirmation"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        <Hash className="w-5 h-5 text-gray-500" />
                      </div>
                      <span className="flex-1 text-left">Paste confirmation number</span>
                      <span className="text-gray-300">›</span>
                    </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => { setShowAddWallet(false); setAddPassStep("choose"); }}
                      className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {(addPassStep === "screenshot" || addPassStep === "upload") && (
                <div className="p-5">
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setAddPassStep("choose"); setWalletForm(f => ({ ...f, fileUrls: [], fileUrl: "" })); }} className="text-gray-400 hover:text-gray-600">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h3 className="font-bold text-gray-900 text-base">
                        {addPassStep === "screenshot" ? "Take Screenshot" : "Upload from Photos"}
                      </h3>
                    </div>
                    <button
                      onClick={() => { setShowAddWallet(false); setAddPassStep("choose"); setWalletForm(f => ({ ...f, fileUrls: [], fileUrl: "" })); }}
                      className="text-sm font-semibold text-gray-400 hover:text-gray-600 px-2 py-1"
                      data-testid="button-skip-upload-ticket"
                    >
                      Skip
                    </button>
                  </div>

                  <div>
                    {/* Images added so far */}
                    {walletForm.fileUrls.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {walletForm.fileUrls.map((url, idx) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200">
                            <img src={url} alt={`Ticket ${idx + 1}`} className="w-full h-36 object-cover" />
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                              Ticket {idx + 1}
                            </div>
                            <button
                              onClick={() => setWalletForm(f => ({ ...f, fileUrls: f.fileUrls.filter((_, i) => i !== idx) }))}
                              className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors"
                              data-testid={`button-remove-ticket-img-${idx}`}
                            >
                              <X className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        ))}
                        {/* Add another button */}
                        <label className="flex items-center gap-2 w-full px-4 py-3 bg-orange-50 border border-dashed border-orange-300 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors">
                          <Plus className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-semibold text-orange-600">Add another ticket image</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture={addPassStep === "screenshot" ? "environment" : undefined}
                            className="sr-only"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => setWalletForm(f => ({ ...f, fileUrls: [...f.fileUrls, ev.target?.result as string || ""] }));
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                    )}

                    {/* First image upload area — shown when no images yet */}
                    {walletForm.fileUrls.length === 0 && (
                      <label className="flex flex-col items-center gap-3 w-full py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-colors mb-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          {addPassStep === "screenshot" ? <Camera className="w-6 h-6 text-orange-500" /> : <Upload className="w-6 h-6 text-orange-500" />}
                        </div>
                        <p className="text-sm font-semibold text-gray-600">Tap to {addPassStep === "screenshot" ? "take a photo" : "choose from library"}</p>
                        <p className="text-xs text-gray-400">JPEG, PNG supported · add multiple ticket images</p>
                        <input
                          type="file"
                          accept="image/*"
                          capture={addPassStep === "screenshot" ? "environment" : undefined}
                          multiple={addPassStep === "upload"}
                          className="sr-only"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;
                            const urls: string[] = [];
                            for (const file of files) {
                              const url = await new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onload = (ev) => resolve(ev.target?.result as string || "");
                                reader.readAsDataURL(file);
                              });
                              urls.push(url);
                            }
                            setWalletForm(f => ({ ...f, fileUrls: [...f.fileUrls, ...urls] }));
                          }}
                        />
                      </label>
                    )}

                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Label *</label>
                      <input
                        type="text"
                        value={walletForm.label}
                        onChange={(e) => setWalletForm((f) => ({ ...f, label: e.target.value }))}
                        placeholder="e.g., Field Museum Ticket"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3"
                        data-testid="input-wallet-label"
                      />
                    </div>
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                      onClick={handleAddWalletItem}
                      disabled={!walletForm.label.trim() || addingWallet || walletForm.fileUrls.length === 0}
                      data-testid="button-confirm-wallet-item"
                    >
                      {addingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : walletForm.fileUrls.length > 1 ? `Save ${walletForm.fileUrls.length} Tickets` : "Save Pass"}
                    </Button>
                  </div>
                </div>
              )}

              {addPassStep === "confirmation" && (
                <div className="p-5">
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAddPassStep("choose")} className="text-gray-400 hover:text-gray-600">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h3 className="font-bold text-gray-900 text-base">Paste Confirmation</h3>
                    </div>
                    <button
                      onClick={() => { setShowAddWallet(false); setAddPassStep("choose"); }}
                      className="text-sm font-semibold text-gray-400 hover:text-gray-600 px-2 py-1"
                      data-testid="button-skip-add-ticket"
                    >
                      Skip
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">What is this for? *</label>
                      <input
                        type="text"
                        value={walletForm.label}
                        onChange={(e) => setWalletForm((f) => ({ ...f, label: e.target.value }))}
                        placeholder="e.g., Field Museum Entry · 2:00 PM"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        autoFocus
                        data-testid="input-wallet-label"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Confirmation / Booking #</label>
                      <input
                        type="text"
                        value={walletForm.confirmationNumber}
                        onChange={(e) => setWalletForm((f) => ({ ...f, confirmationNumber: e.target.value }))}
                        placeholder="e.g., ABC-12345678"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300"
                        data-testid="input-wallet-confirmation"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optional)</label>
                      <textarea
                        value={walletForm.notes}
                        onChange={(e) => setWalletForm((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="Entry time, # tickets, notes..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                        data-testid="input-wallet-notes"
                      />
                    </div>
                    {/* Ticket photo attach */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Ticket photo (optional)</label>
                      <label
                        className="flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:bg-gray-50"
                        style={{ borderColor: walletForm.fileUrl ? '#E67E22' : '#E0DDD8', background: walletForm.fileUrl ? '#FFF7EE' : '#FAFAF8', minHeight: 80 }}
                        data-testid="label-wallet-ticket-photo"
                      >
                        {walletForm.fileUrl ? (
                          <div className="relative w-full" style={{ height: 110 }}>
                            <img src={walletForm.fileUrl} alt="Ticket preview" className="w-full h-full object-cover rounded-xl" />
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); setWalletForm(f => ({ ...f, fileUrl: '' })); }}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs font-bold"
                            >×</button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 py-4">
                            <Camera className="w-5 h-5 text-gray-400" />
                            <span className="text-xs text-gray-500">Tap to add ticket photo</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setWalletForm(f => ({ ...f, fileUrl: ev.target?.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }}
                          data-testid="input-wallet-ticket-photo"
                        />
                      </label>
                    </div>
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                      onClick={handleAddWalletItem}
                      disabled={!walletForm.label.trim() || addingWallet}
                      data-testid="button-confirm-wallet-item"
                    >
                      {addingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to Wallet"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Document Modal */}
      <AnimatePresence>
        {showAddDocModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => { setShowAddDocModal(false); setEditDocItem(null); }}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
              data-testid="add-doc-modal"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900 text-base">{editDocItem ? "Edit Document" : "Add Document"}</p>
                <button onClick={() => { setShowAddDocModal(false); setEditDocItem(null); }} className="p-1.5 rounded-full hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Type picker */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "flight",  icon: <Plane className="w-3.5 h-3.5" />,         label: "Flight" },
                    { key: "hotel",   icon: <Hotel className="w-3.5 h-3.5" />,          label: "Hotel" },
                    { key: "car",     icon: <Car className="w-3.5 h-3.5" />,            label: "Car" },
                    { key: "parking", icon: <ParkingCircle className="w-3.5 h-3.5" />,  label: "Parking" },
                    { key: "other",   icon: <FileText className="w-3.5 h-3.5" />,       label: "Other" },
                  ].map(({ key, icon, label }) => (
                    <button
                      key={key}
                      onClick={() => setDocForm((f) => ({ ...f, type: key }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${docForm.type === key ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}
                      data-testid={`button-doc-type-${key}`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Label *</label>
                <input
                  value={docForm.label}
                  onChange={(e) => setDocForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder={docForm.type === "flight" ? "e.g. United 425 SFO→LHR" : docForm.type === "hotel" ? "e.g. Hilton Paris Opera" : "Document label"}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  data-testid="input-doc-label"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Confirmation / Reference # (optional)</label>
                <input
                  value={docForm.confirmationNumber}
                  onChange={(e) => setDocForm((f) => ({ ...f, confirmationNumber: e.target.value }))}
                  placeholder="ABC123"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
                  data-testid="input-doc-confirmation"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optional)</label>
                <textarea
                  value={docForm.notes}
                  onChange={(e) => setDocForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Check-in time, gate info, seat numbers..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  data-testid="input-doc-notes"
                />
              </div>

              <Button
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                onClick={handleAddDocument}
                disabled={!docForm.label.trim() || addingDoc}
                data-testid="button-confirm-doc"
              >
                {addingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : editDocItem ? "Save Changes" : "Add Document"}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-screen Today map (same as parent hub FamilyTravelMap) */}
      {showTodayFullMap && currentTrip && (
        <div className="fixed inset-0 z-[350] bg-white">
          <FamilyTravelMap
            trips={trips}
            currentTrip={currentTrip}
            stops={currentTripStops}
            moments={currentTripMoments || []}
            memoryStars={0}
            onClose={() => setShowTodayFullMap(false)}
            onStopClick={(stop) => { setShowTodayFullMap(false); setSelectedDetailStop(stop); }}
            onTripSelect={() => {}}
            initialView="trip"
          />
          {/* Close button top-right overlay */}
          <button
            onClick={() => setShowTodayFullMap(false)}
            className="absolute top-4 right-4 z-[360] w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center"
            data-testid="button-close-fullmap"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      )}

      {/* Stop Detail Panel */}
      <AnimatePresence>
        {selectedDetailStop && (
          <div
            className="fixed inset-0 z-[300] bg-black/40"
            onClick={() => setSelectedDetailStop(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              data-testid="stop-detail-panel"
            >
              {/* Hero + content */}
              {(() => {
                const cfg = getStopConfig(selectedDetailStop.stopType);
                const dur = estDuration(selectedDetailStop.stopType);
                const parking = getParkingInfo(selectedDetailStop.name, selectedDetailStop.stopType, currentTrip?.destination);
                const h = new Date().getHours();
                const timeband = h < 10
                  ? { text: "Best time right now", sub: "Low crowds this morning", bg: "bg-green-50 border-green-100", tc: "text-green-800", sc: "text-green-600", icon: "🌟" }
                  : h < 13
                  ? { text: "Good timing", sub: "Getting busier — move at your pace", bg: "bg-blue-50 border-blue-100", tc: "text-blue-800", sc: "text-blue-600", icon: "✅" }
                  : h < 17
                  ? { text: "Afternoon window", sub: "Manageable crowds right now", bg: "bg-amber-50 border-amber-100", tc: "text-amber-800", sc: "text-amber-600", icon: "☀️" }
                  : { text: "Busy hour", sub: "More visitors — plan for queues", bg: "bg-rose-50 border-rose-100", tc: "text-rose-800", sc: "text-rose-600", icon: "🕔" };
                return (
                  <>
                    {/* Real photo hero */}
                    <div className="relative">
                      <DetailStopImage
                        stop={selectedDetailStop}
                        cfg={cfg}
                        city={currentTrip?.city || currentTrip?.destination || null}
                        country={currentTrip?.country || null}
                      />
                      <button
                        onClick={() => setSelectedDetailStop(null)}
                        className="absolute top-4 right-4 bg-black/40 text-white rounded-full p-1.5 backdrop-blur-sm"
                        data-testid="button-close-stop-detail"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      {/* Name + meta */}
                      <h3 className="font-extrabold text-gray-900 text-xl mb-0.5">{selectedDetailStop.name}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />4.7
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-500 capitalize">{cfg.label}</span>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" /> {dur} min</span>
                      </div>

                      {/* Kid-age badge */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Great for kids 5–12</span>
                      </div>

                      {/* Status chips */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">🟢 Open now</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          {parking ? `${parking.state === "easy" || parking.state === "normal" ? "🅿️" : "⚠️"} ${parking.label}` : "🚗 Street parking"}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">👶 Ages 5–12</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">⏱ {dur} min</span>
                      </div>

                      {/* Time band */}
                      <div className={`flex items-center gap-3 ${timeband.bg} border rounded-xl px-3 py-2.5 mb-4`}>
                        <span className="text-xl">{timeband.icon}</span>
                        <div>
                          <p className={`text-sm font-bold ${timeband.tc}`}>{timeband.text}</p>
                          <p className={`text-xs ${timeband.sc}`}>{timeband.sub}</p>
                        </div>
                      </div>

                      {/* CTAs */}
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => handleGetDirections(selectedDetailStop)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm py-2.5 rounded-xl transition-colors"
                        >
                          <Navigation className="w-4 h-4" />Directions
                        </button>
                        <button
                          onClick={() => { setSelectedDetailStop(null); setActiveTab("wallet"); setAddPassStep("confirmation"); setShowAddWallet(true); setWalletForm((f) => ({ ...f, label: selectedDetailStop.name + " Ticket" })); }}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                        >
                          <Ticket className="w-4 h-4" />Add Ticket
                        </button>
                        <button
                          onClick={() => window.open(`https://maps.google.com/?q=food+near+${encodeURIComponent(selectedDetailStop.name)}`, "_blank")}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm py-2.5 rounded-xl transition-colors"
                        >
                          🍽️ Food nearby
                        </button>
                      </div>

                      {selectedDetailStop.description && (
                        <div className="mb-4">
                          <h4 className="font-bold text-gray-900 text-sm mb-2">Why this stop works</h4>
                          <ul className="space-y-1.5">
                            {selectedDetailStop.description.split(/[.\n]/).filter(Boolean).slice(0, 4).map((bullet, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="text-orange-500 shrink-0 mt-0.5">•</span>
                                <span>{bullet.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedDetailStop.address && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedDetailStop.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-blue-50 rounded-xl p-3 mb-4 border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                          <Navigation className="w-5 h-5 text-blue-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-blue-700">Get Directions</p>
                            <p className="text-xs text-blue-500 truncate">{selectedDetailStop.address}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
                        </a>
                      )}

                      {/* Rich explore data */}
                      {stopExploreLoading && (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-orange-500 mr-2" />
                          <span className="text-sm text-gray-400">Loading area info…</span>
                        </div>
                      )}
                      {!stopExploreLoading && stopExploreData && (
                        <div className="space-y-4 mb-4">
                          {stopExploreData.aboutArea && (
                            <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                              <h4 className="font-bold text-sky-800 text-sm flex items-center gap-2 mb-2">
                                <MapIcon className="w-4 h-4" /> About the Area
                              </h4>
                              <p className="text-sm text-sky-700 leading-relaxed">{stopExploreData.aboutArea}</p>
                            </div>
                          )}

                          {stopExploreData.nearbyAttractions?.length > 0 && (
                            <div>
                              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-orange-500" /> What's Nearby
                              </h4>
                              <div className="space-y-1.5">
                                {stopExploreData.nearbyAttractions.map((place: any, i: number) => (
                                  <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100">
                                    <span className="text-xl shrink-0">{place.type === "park" ? "🌳" : place.type === "museum" ? "🏛️" : "📍"}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-800">{place.name}</p>
                                      <p className="text-xs text-orange-500">{place.distance}</p>
                                      {place.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{place.description}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {stopExploreData.restaurants?.length > 0 && (
                            <div>
                              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2 mb-2">
                                🍽️ Places to Eat
                              </h4>
                              <div className="space-y-1.5">
                                {stopExploreData.restaurants.map((rest: any, i: number) => (
                                  <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100">
                                    <span className="text-xl shrink-0">🍴</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-800">{rest.name}</p>
                                      <p className="text-xs text-rose-500">
                                        {[rest.cuisine, rest.distance, rest.priceRange].filter(Boolean).join(" · ")}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {stopExploreData.kidFriendlyPlaces?.length > 0 && (
                            <div>
                              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2 mb-2">
                                🧒 For Kids
                              </h4>
                              <div className="space-y-1.5">
                                {stopExploreData.kidFriendlyPlaces.map((place: any, i: number) => (
                                  <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100">
                                    <span className="text-xl shrink-0">🎠</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-800">{place.name}</p>
                                      <p className="text-xs text-purple-500">
                                        {[place.distance, place.ageRange].filter(Boolean).join(" · ")}
                                      </p>
                                      {place.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{place.description}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {stopExploreData.gettingAround && (
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                              <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2 mb-2">
                                🚗 Getting Around
                              </h4>
                              <p className="text-sm text-gray-600 leading-relaxed">{stopExploreData.gettingAround}</p>
                            </div>
                          )}

                          {stopExploreData.tips?.length > 0 && (
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                              <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-2">
                                💡 Tips
                              </h4>
                              <ul className="space-y-1.5">
                                {stopExploreData.tips.map((tip: string, i: number) => (
                                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                                    <span className="text-orange-400 shrink-0 mt-0.5">·</span>
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedDetailStop(null)}
                          className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-screen ticket modal */}
      <AnimatePresence>
        {selectedTicket && (() => {
          const now = new Date();
          const entry = selectedTicket.entryTime ? new Date(selectedTicket.entryTime) : null;
          const minsUntilEntry = entry ? Math.round((entry.getTime() - now.getTime()) / 60000) : null;

          const passState: "ready" | "early" | "at_risk" | "missed" | "no_time" =
            minsUntilEntry === null ? "no_time"
            : minsUntilEntry > 60 ? "early"
            : minsUntilEntry >= -10 ? "ready"
            : minsUntilEntry >= -30 ? "at_risk"
            : "missed";

          const statusStrip = {
            ready:   { bg: "bg-green-500",  text: "Show this at entry" },
            early:   { bg: "bg-amber-400",  text: `You're early — entry opens in ${minsUntilEntry} min` },
            at_risk: { bg: "bg-red-500",    text: "You may miss this entry — hurry!" },
            missed:  { bg: "bg-gray-400",   text: "Entry window has passed" },
            no_time: { bg: "bg-green-500",  text: "Show this at entry" },
          }[passState];

          const linkedStop = selectedTicket.stopId
            ? sortedStops.find((s) => s.id === selectedTicket.stopId)
            : sortedStops.find((s) =>
                selectedTicket.label.toLowerCase().includes(s.name.toLowerCase().slice(0, 8))
              );

          const entryTimeStr = entry
            ? entry.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : null;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[400] bg-white flex flex-col max-w-lg mx-auto"
              data-testid="ticket-fullscreen-modal"
              ref={(el) => {
                if (el) {
                  // Request wake lock so screen stays on while viewing pass
                  if ("wakeLock" in navigator) {
                    (navigator as any).wakeLock.request("screen").catch(() => {});
                  }
                }
              }}
            >
              {/* Header */}
              <div className="flex items-start gap-3 px-5 pt-12 pb-4">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 shrink-0 mt-0.5 transition-colors"
                  data-testid="button-close-ticket-modal"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-extrabold text-gray-900 leading-tight">{selectedTicket.label}</h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {currentTrip?.name}
                    {entryTimeStr ? ` · Entry ${entryTimeStr}` : ""}
                  </p>
                </div>
              </div>

              {/* Status strip */}
              <div className={`mx-5 rounded-xl px-4 py-2.5 ${statusStrip.bg} mb-6`}>
                <p className="text-white font-bold text-sm text-center">{statusStrip.text}</p>
              </div>

              {/* QR / Ticket image — dominant, with carousel support */}
              {(() => {
                const allImages: string[] = (selectedTicket as any).fileUrls?.length > 0
                  ? (selectedTicket as any).fileUrls
                  : selectedTicket.fileUrl ? [selectedTicket.fileUrl] : [];
                const hasMany = allImages.length > 1;
                const safeIdx = Math.min(ticketImgIdx, allImages.length - 1);
                const currentImg = allImages[safeIdx] ?? null;
                return (
                  <div className="flex-1 flex flex-col items-center justify-center px-8">
                    {currentImg ? (
                      <div className="relative w-full max-w-[280px]">
                        {(passState === "ready" || passState === "no_time") && (
                          <div className="absolute inset-0 rounded-2xl bg-green-400/20 animate-ping" />
                        )}
                        <img
                          src={currentImg}
                          alt="Ticket / QR code"
                          className="w-full rounded-2xl shadow-xl border-2 border-gray-100 relative z-10"
                          data-testid="ticket-qr-image"
                        />
                        {hasMany && (
                          <>
                            {safeIdx > 0 && (
                              <button
                                onClick={() => setTicketImgIdx(i => i - 1)}
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-9 h-9 bg-white shadow-lg rounded-full flex items-center justify-center border border-gray-200"
                                data-testid="button-ticket-prev"
                              >
                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                            {safeIdx < allImages.length - 1 && (
                              <button
                                onClick={() => setTicketImgIdx(i => i + 1)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 w-9 h-9 bg-white shadow-lg rounded-full flex items-center justify-center border border-gray-200"
                                data-testid="button-ticket-next"
                              >
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="relative w-full max-w-[280px]">
                        {(passState === "ready" || passState === "no_time") && (
                          <div className="absolute inset-0 rounded-2xl bg-green-400/10 animate-ping" />
                        )}
                        <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center relative z-10 shadow-sm gap-3">
                          <Ticket className="w-14 h-14 text-gray-300" />
                          {selectedTicket.confirmationNumber ? (
                            <div className="text-center">
                              <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-1">Confirmation</p>
                              <p className="text-2xl font-black font-mono text-gray-700 tracking-wider">
                                #{selectedTicket.confirmationNumber}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No QR code uploaded</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Dot indicators */}
                    {hasMany && (
                      <div className="flex gap-1.5 mt-4 items-center">
                        {allImages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setTicketImgIdx(i)}
                            className={`rounded-full transition-all ${i === safeIdx ? "w-5 h-2 bg-orange-500" : "w-2 h-2 bg-gray-300"}`}
                            data-testid={`button-ticket-dot-${i}`}
                          />
                        ))}
                        <span className="ml-1 text-[11px] text-gray-400 font-semibold">
                          Ticket {safeIdx + 1} of {allImages.length}
                        </span>
                      </div>
                    )}

                    {/* Scan instruction */}
                    <div className="mt-5 text-center">
                      {selectedTicket.confirmationNumber && (
                        <p className="text-base font-bold text-gray-700 mb-0.5">
                          #{selectedTicket.confirmationNumber}
                        </p>
                      )}
                      <p className="text-sm text-gray-400">Show this at the entrance — no printing needed</p>
                      {selectedTicket.notes && (
                        <p className="text-xs text-gray-400 mt-2 italic">{selectedTicket.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Secondary actions */}
              <div className="flex justify-center gap-6 px-8 py-4">
                {"share" in navigator && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: selectedTicket.label,
                          text: selectedTicket.confirmationNumber
                            ? `Ref: ${selectedTicket.confirmationNumber}${selectedTicket.notes ? "\n" + selectedTicket.notes : ""}`
                            : selectedTicket.label,
                        });
                      } catch { }
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                    data-testid="button-share-ticket"
                  >
                    <Share2 className="w-4 h-4" />
                    Share pass
                  </button>
                )}
                {selectedTicket.confirmationNumber && (
                  <button
                    onClick={() => {
                      toast.info(`Confirmation: #${selectedTicket.confirmationNumber}${selectedTicket.notes ? "\n" + selectedTicket.notes : ""}`);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                    data-testid="button-view-confirmation"
                  >
                    <Hash className="w-4 h-4" />
                    View details
                  </button>
                )}
              </div>

              {/* Bottom CTA */}
              <div className="px-5 pb-10 pt-2">
                {linkedStop?.latitude && linkedStop?.longitude ? (
                  <button
                    onClick={() => window.open(`https://maps.google.com/?q=${linkedStop.latitude},${linkedStop.longitude}`, "_blank")}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl text-sm transition-all"
                    data-testid="button-pass-directions"
                  >
                    Open directions →
                  </button>
                ) : passState === "missed" ? (
                  <button
                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedTicket.label + " ticket help")}`, "_blank")}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3.5 rounded-2xl text-sm transition-all"
                    data-testid="button-pass-help"
                  >
                    Get help →
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl text-sm transition-all"
                    data-testid="button-close-pass"
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────────
          START DAY FLOW — 3-screen readiness → fix → execution
      ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showStartDayFlow && (() => {
          const todayStopsForFlow = dayGroups.length > 1 ? (dayGroups[activeDay] || []) : sortedStops;
          const firstStop = todayStopsForFlow[0] || null;
          const needingTickets = todayStopsForFlow.filter((s) => stopNeedsTicket(s) && !stopHasTicket(s));
          const blockingStop = needingTickets[0] || null;
          const allReady = needingTickets.length === 0;
          const dayNum = activeDay + 1;
          const cfg = firstStop ? getStopConfig(firstStop.stopType) : null;
          const blockingCfg = blockingStop ? getStopConfig(blockingStop.stopType) : null;

          const handleConfirmStart = async () => {
            // Guard: block starting the day if today is before the trip start date
            const tripStart = (currentTrip as any)?.startDate;
            if (tripStart) {
              const startMs = new Date(String(tripStart).slice(0, 10) + "T12:00:00").getTime();
              if (Date.now() < startMs - 12 * 60 * 60 * 1000) {
                const label = new Date(String(tripStart).slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });
                toast.error(`Your adventure starts on ${label} — you can't start early!`);
                setShowStartDayFlow(false);
                return;
              }
            }
            setIsStarting(true);
            try {
              if (currentTrip?.status !== "active") {
                await fetch(`/api/travel/trips/${tripId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ status: "active" }),
                });
              }
              // Fire-and-forget: pre-generate Story Packs in the background
              fetch(`/api/travel/trips/${tripId}/pregenerate-story-packs`, {
                method: "POST",
                credentials: "include",
              }).catch(() => {});
              setShowStartDayFlow(false);
              setActiveTab("todays_plan");
            } catch {
              toast.error("Couldn't start the day, please try again.");
            } finally {
              setIsStarting(false);
            }
          };

          return (
            <motion.div
              key="start-day-flow"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-0 z-[500] bg-gray-50 flex flex-col max-w-lg mx-auto"
              data-testid="start-day-flow"
            >
              {/* ── Screen 1: Day Readiness ── */}
              {startDayFlowStep === "readiness" && (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 px-5 pt-12 pb-2">
                    <button
                      onClick={() => setShowStartDayFlow(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm hover:bg-gray-50 shrink-0"
                      data-testid="button-close-start-day"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                      <h1 className="text-xl font-extrabold text-gray-900">Ready for Day {dayNum}?</h1>
                      <p className="text-sm text-gray-400">{currentTrip?.name}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 space-y-3">
                    {/* Readiness card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                      {/* Row 1 — Tickets */}
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <span className="text-xl">🎟</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">Tickets</p>
                        </div>
                        {allReady ? (
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">All set</span>
                        ) : (
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                            {needingTickets.length} {needingTickets.length === 1 ? "stop" : "stops"} need tickets
                          </span>
                        )}
                      </div>

                      {/* Row 2 — First stop */}
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <span className="text-xl">{cfg?.emoji || "📍"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {firstStop?.name || "No stops today"}
                          </p>
                          <p className="text-xs text-gray-400">First stop</p>
                        </div>
                        {firstStop?.latitude && firstStop?.longitude && (
                          <span className="text-xs text-gray-400 shrink-0">Nearby</span>
                        )}
                      </div>

                      {/* Row 3 — Day summary */}
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <span className="text-xl">🗓</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">Today's plan</p>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">
                          {todayStopsForFlow.length} stop{todayStopsForFlow.length !== 1 ? "s" : ""} · lunch included
                        </span>
                      </div>
                    </div>

                    {/* Summary line */}
                    <div className={`rounded-xl px-4 py-3 flex items-center gap-2.5 ${
                      allReady ? "bg-green-50 border border-green-100" : "bg-amber-50 border border-amber-100"
                    }`}>
                      <span className="text-base">{allReady ? "✅" : "⚠️"}</span>
                      <p className={`text-sm font-semibold ${allReady ? "text-green-700" : "text-amber-700"}`}>
                        {allReady
                          ? "You're all set for today"
                          : `${needingTickets.length} thing${needingTickets.length > 1 ? "s" : ""} still need${needingTickets.length === 1 ? "s" : ""} attention`}
                      </p>
                    </div>

                    {/* Checklist of what needs fixing — tappable to buy */}
                    {!allReady && (
                      <div className="space-y-1.5">
                        {needingTickets.map((s) => {
                          const c = getStopConfig(s.stopType);
                          const ticketUrl = s.bookingUrl || `https://www.google.com/search?q=buy+tickets+${encodeURIComponent(s.name)}`;
                          return (
                            <button
                              key={s.id}
                              onClick={() => window.open(ticketUrl, "_blank")}
                              className="w-full flex items-center gap-2.5 bg-white rounded-xl border border-orange-100 px-3.5 py-2.5 hover:bg-orange-50 transition-colors text-left"
                              data-testid={`button-buy-ticket-${s.id}`}
                            >
                              <span className="text-base">{c.emoji}</span>
                              <p className="text-sm text-gray-700 truncate flex-1">{s.name}</p>
                              <span className="text-[11px] text-orange-500 font-semibold shrink-0 flex items-center gap-0.5">
                                {s.bookingUrl ? "Book →" : "No ticket →"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="px-5 pb-10 pt-2 space-y-2.5">
                    {allReady ? (
                      <button
                        onClick={() => setStartDayFlowStep("execution")}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md"
                        data-testid="button-head-to-first-stop"
                      >
                        Head to first stop →
                      </button>
                    ) : (
                      <button
                        onClick={() => setStartDayFlowStep("fix")}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md"
                        data-testid="button-fix-first"
                      >
                        Fix this first →
                      </button>
                    )}
                    <button
                      onClick={handleConfirmStart}
                      className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
                      data-testid="button-skip-to-continue-readiness"
                    >
                      Skip to Today's Plan
                    </button>
                  </div>
                </>
              )}

              {/* ── Screen 2: Fix Blocker ── */}
              {startDayFlowStep === "fix" && blockingStop && (
                <>
                  <div className="flex items-center gap-3 px-5 pt-12 pb-2">
                    <button
                      onClick={() => setStartDayFlowStep("readiness")}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm hover:bg-gray-50 shrink-0"
                      data-testid="button-back-to-readiness"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                      <h1 className="text-xl font-extrabold text-gray-900">One thing before you go</h1>
                      <p className="text-sm text-gray-400">Sort this out and you're ready</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
                    {/* Single blocking stop card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-11 h-11 rounded-xl shrink-0 bg-gradient-to-br ${blockingCfg?.gradient} flex items-center justify-center`}>
                            <span className="text-xl">{blockingCfg?.emoji}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-gray-900">{blockingStop.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Tickets required before arrival</p>
                          </div>
                          <span className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full shrink-0">Missing</span>
                        </div>

                        <div className="space-y-2">
                          <button
                            onClick={() => window.open(blockingStop.bookingUrl || `https://www.google.com/search?q=buy+tickets+${encodeURIComponent(blockingStop.name)}`, "_blank")}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm py-3 rounded-xl transition-colors"
                            data-testid="button-flow-buy-tickets"
                          >
                            {blockingStop.bookingUrl ? "Book tickets →" : "Buy tickets now"}
                          </button>
                          {blockingStop.bookingUrl && (
                            <button
                              onClick={() => window.open(`https://www.google.com/search?q=buy+tickets+${encodeURIComponent(blockingStop.name)}`, "_blank")}
                              className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-1.5 transition-colors"
                              data-testid="button-flow-search-instead"
                            >
                              Search instead
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowAddWallet(true);
                              setAddPassStep("choose");
                              setWalletForm((f) => ({ ...f, label: blockingStop.name + " Ticket" }));
                            }}
                            className="w-full text-sm text-gray-400 hover:text-gray-600 text-center py-2.5 transition-colors"
                            data-testid="button-flow-already-have"
                          >
                            I already have tickets
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress hint */}
                    {needingTickets.length > 1 && (
                      <p className="text-xs text-gray-400 text-center mt-4">
                        {needingTickets.length - 1} more stop{needingTickets.length - 1 > 1 ? "s" : ""} may need tickets — handle one at a time
                      </p>
                    )}
                  </div>

                  <div className="px-5 pb-10 pt-2 space-y-2.5">
                    <button
                      onClick={() => {
                        const stillBlocking = todayStopsForFlow.filter((s) => stopNeedsTicket(s) && !stopHasTicket(s));
                        setStartDayFlowStep(stillBlocking.length === 0 ? "execution" : "readiness");
                      }}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl text-sm transition-all"
                      data-testid="button-flow-continue-anyway"
                    >
                      Continue anyway →
                    </button>
                    <button
                      onClick={handleConfirmStart}
                      className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
                      data-testid="button-skip-to-continue-fix"
                    >
                      Skip to Today's Plan
                    </button>
                  </div>
                </>
              )}

              {/* ── Screen 3: Start Execution ── */}
              {startDayFlowStep === "execution" && (
                <>
                  <div className="flex items-center gap-3 px-5 pt-12 pb-2">
                    <button
                      onClick={() => setStartDayFlowStep("readiness")}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm hover:bg-gray-50 shrink-0"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                      <h1 className="text-xl font-extrabold text-gray-900">Today is ready</h1>
                      <p className="text-sm text-gray-400">Day {dayNum} · {currentTrip?.destination}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 space-y-3">
                    {/* First stop card — the hero */}
                    {firstStop && cfg && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Next stop</p>
                          <div className="flex items-start gap-3">
                            <div className={`w-12 h-12 rounded-xl shrink-0 bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
                              <span className="text-2xl">{cfg.emoji}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-extrabold text-gray-900 leading-tight">{firstStop.name}</p>
                              {firstStop.address && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{firstStop.address}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {stopHasTicket(firstStop) ? (
                                  <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">🎟 Pass ready</span>
                                ) : stopNeedsTicket(firstStop) ? (
                                  <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Tickets needed</span>
                                ) : (
                                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Free entry</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {firstStop.latitude && firstStop.longitude && (
                          <div className="border-t border-gray-50">
                            <button
                              onClick={() => window.open(`https://maps.google.com/?q=${firstStop.latitude},${firstStop.longitude}`, "_blank")}
                              className="w-full py-3 text-xs font-bold text-orange-500 hover:bg-orange-50 transition-colors flex items-center justify-center gap-1.5"
                              data-testid="button-flow-directions"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              Get directions →
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick day overview */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                          <span className="font-bold text-gray-900">{todayStopsForFlow.length}</span> stop{todayStopsForFlow.length !== 1 ? "s" : ""} planned today
                        </p>
                        <span className="text-xs text-green-600 font-semibold">Day {dayNum} of {tripNumDays ?? "?"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-10 pt-2 space-y-2.5">
                    <button
                      onClick={handleConfirmStart}
                      disabled={isStarting}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                      data-testid="button-open-todays-plan"
                    >
                      {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {isStarting ? "Starting…" : "Open Today's Plan →"}
                    </button>
                    {firstStop?.latitude && firstStop?.longitude && (
                      <button
                        onClick={() => {
                          window.open(`https://maps.google.com/?q=${firstStop.latitude},${firstStop.longitude}`, "_blank");
                          handleConfirmStart();
                        }}
                        className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-3 rounded-2xl text-sm transition-all"
                        data-testid="button-start-with-directions"
                      >
                        Get directions + start →
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Add Stop Modal — 3-step: Discover → Preview → Placement */}
      <AnimatePresence>
        {addStopStep !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 pb-[env(safe-area-inset-bottom,12px)]"
            onClick={closeAddStop}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl p-5 pb-8 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              data-testid="add-stop-modal"
            >
              {/* Step 1: Discover */}
              {addStopStep === "discover" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {addStopContext === "food" ? "Find Food Nearby" :
                         addStopContext === "dessert" ? "Add a Treat 🍦" :
                         addStopContext === "dinner" ? "Find Dinner" :
                         "Add a Stop"}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {addStopContext !== "default"
                          ? (activeDayCityName || currentTrip?.destination) ? `Best options in ${activeDayCityName || currentTrip?.destination}` : "Pick something nearby"
                          : (activeDayCityName || currentTrip?.destination) ? `Great picks for ${activeDayCityName || currentTrip?.destination}` : "Search or pick a suggestion"}
                      </p>
                    </div>
                    <button onClick={closeAddStop} className="p-1.5 rounded-full hover:bg-gray-100" data-testid="button-close-add-stop">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  {/* Food cuisine filter chips — shown in food/dessert/dinner context */}
                  {addStopContext !== "default" && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        {addStopContext === "dessert" ? "What kind of treat?" : "What are you in the mood for?"}
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {(addStopContext === "dessert"
                          ? [
                              { label: "🍦 Ice cream", query: "ice cream", types: ["dessert", "ice_cream"] },
                              { label: "🧁 Bakery", query: "bakery", types: ["bakery", "cafe"] },
                              { label: "🍫 Chocolate", query: "chocolate dessert", types: ["dessert"] },
                              { label: "☕ Cafe", query: "cafe", types: ["cafe"] },
                            ]
                          : addStopContext === "dinner"
                          ? [
                              { label: "🍝 Italian", query: "Italian restaurant", types: ["restaurant"] },
                              { label: "🍛 Indian", query: "Indian restaurant", types: ["restaurant"] },
                              { label: "🌮 Mexican", query: "Mexican restaurant", types: ["restaurant"] },
                              { label: "🍔 American", query: "American restaurant", types: ["restaurant"] },
                              { label: "👨‍👩‍👧 Kid-friendly", query: "kid-friendly restaurant", types: ["restaurant", "food"] },
                            ]
                          : [
                              { label: "🍝 Italian", query: "Italian restaurant", types: ["restaurant"] },
                              { label: "🍛 Indian", query: "Indian restaurant", types: ["restaurant"] },
                              { label: "🌮 Mexican", query: "Mexican restaurant", types: ["restaurant"] },
                              { label: "🍔 American", query: "American restaurant", types: ["restaurant"] },
                              { label: "⚡ Quick bites", query: "fast food", types: ["food", "restaurant"] },
                              { label: "👨‍👩‍👧 Kid-friendly", query: "kid-friendly restaurant", types: ["restaurant", "food"] },
                              { label: "🍦 Dessert", query: "dessert", types: ["dessert", "cafe"] },
                            ]
                        ).map(chip => (
                          <button
                            key={chip.label}
                            onClick={() => {
                              const isActive = activeChip === chip.label;
                              setActiveChip(isActive ? null : chip.label);
                              setAddStopQuery(isActive ? "" : chip.query);
                              setAddStopSearchResults([]);
                              if (!isActive) {
                                fetchSmartSuggestions(chip.types);
                                handleSearchStop(chip.query);
                              } else {
                                fetchSmartSuggestions(addStopContext === "dessert" ? ["dessert","ice_cream","cafe","bakery"] : ["food","restaurant"]);
                              }
                            }}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                              activeChip === chip.label
                                ? "bg-orange-500 text-white border-orange-500"
                                : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"
                            }`}
                            data-testid={`chip-food-${chip.label.replace(/\s+/g, "-").toLowerCase()}`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick-filter chips — shown in default context */}
                  {addStopContext === "default" && (
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                      { label: "🍔 Food", types: ["food", "restaurant"] },
                      { label: "🛝 Playground", types: ["playground", "park"] },
                      { label: "⚡ Quick stop", types: ["landmark", "viewpoint"] },
                    ].map(chip => (
                      <button
                        key={chip.label}
                        onClick={() => {
                          const isActive = activeChip === chip.label;
                          const chipName = chip.label.replace(/^[^\s]+\s/, "");
                          setActiveChip(isActive ? null : chip.label);
                          setAddStopQuery(isActive ? "" : chipName);
                          setAddStopSearchResults([]);
                          if (!isActive) fetchSmartSuggestions(chip.types);
                          else fetchSmartSuggestions();
                        }}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                          activeChip === chip.label
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"
                        }`}
                        data-testid={`chip-${chip.label.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                  )}

                  {/* Search bar */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={addStopQuery}
                      onChange={(e) => {
                        setAddStopQuery(e.target.value);
                        if (!e.target.value.trim()) setAddStopSearchResults([]);
                      }}
                      placeholder={`Search ${activeDayCityName || currentTrip?.destination || "your destination"}…`}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                      data-testid="input-add-stop-query"
                      onKeyDown={(e) => e.key === "Enter" && handleSearchStop(addStopQuery)}
                    />
                    {addStopSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-orange-400" />
                    )}
                    {addStopQuery.trim() && !addStopSearching && (
                      <button
                        onClick={() => handleSearchStop(addStopQuery)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-orange-500 text-white text-[11px] font-bold rounded-xl"
                        data-testid="button-lookup-stop"
                      >
                        Go
                      </button>
                    )}
                  </div>

                  {/* Search results */}
                  {addStopSearchResults.length > 0 && (
                    <div className="mb-4 space-y-1.5">
                      {addStopSearchResults.map((r, i) => {
                        const cfg = getStopConfig(r.stopType);
                        const isFoodCtx = addStopContext !== "default";
                        const tags: string[] = [];
                        if (isFoodCtx && r.kidFriendly) tags.push("👨‍👩‍👧 Family");
                        if (isFoodCtx && r.duration && parseInt(r.duration) <= 45) tags.push("⚡ Fast");
                        if (isFoodCtx && r.entryCost && (r.entryCost === "Free" || r.entryCost === "$")) tags.push("💰 Affordable");
                        return (
                          <button
                            key={i}
                            onClick={() => handleSelectStop(r)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-orange-50 transition-colors border border-gray-100"
                            data-testid={`button-search-result-${i}`}
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-sm shrink-0`}>{cfg.emoji}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-gray-800 truncate">{r.name}</p>
                              {tags.length > 0 ? (
                                <div className="flex gap-1 mt-0.5 flex-wrap">
                                  {tags.map(tag => (
                                    <span key={tag} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">{tag}</span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-gray-400 capitalize">{r.stopType?.replace("_", " ")} · {r.duration}</p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Smart suggestions */}
                  {smartSuggestionsLoading && (
                    <div className="flex items-center gap-2 py-4 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[12px]">Finding great options…</span>
                    </div>
                  )}
                  {!smartSuggestionsLoading && smartSuggestions && (
                    <>
                      {smartSuggestions.nearby.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Great nearby options</p>
                          <div className="space-y-1.5">
                            {smartSuggestions.nearby.map((s, i) => {
                              const cfg = getStopConfig(s.stopType);
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleSelectSuggestion(s)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-orange-50 transition-colors border border-gray-100"
                                  data-testid={`button-nearby-suggestion-${i}`}
                                >
                                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-sm shrink-0`}>{cfg.emoji}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-gray-800 truncate">{s.name}</p>
                                    <p className="text-[11px] text-gray-400 truncate">{s.description}</p>
                                  </div>
                                  <span className="text-[11px] text-orange-400 font-semibold shrink-0">{s.duration}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {smartSuggestions.popular.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Popular with families</p>
                          <div className="space-y-1.5">
                            {smartSuggestions.popular.map((s, i) => {
                              const cfg = getStopConfig(s.stopType);
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleSelectSuggestion(s)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-orange-50 transition-colors border border-gray-100"
                                  data-testid={`button-popular-suggestion-${i}`}
                                >
                                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-sm shrink-0`}>{cfg.emoji}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-gray-800 truncate">{s.name}</p>
                                    <p className="text-[11px] text-gray-400 truncate">{s.description}</p>
                                  </div>
                                  <span className="text-[11px] text-orange-400 font-semibold shrink-0">{s.duration}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Previously removed stops */}
                  {removedStopsHistory.length > 0 && (
                    <div className="mt-2">
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Previously removed</p>
                      <div className="space-y-1.5">
                        {removedStopsHistory.map(r => {
                          const cfg = getStopConfig(r.stopType);
                          return (
                            <button
                              key={r.id}
                              onClick={() => handleSelectStop({ name: r.name, address: r.address || "", lat: r.lat?.toString(), lon: r.lon?.toString(), stopType: r.stopType, duration: r.durationMinutes ? `${r.durationMinutes} min` : "60 min", description: "", whyKidsLoveIt: "", entryCost: r.entryCost || "Check on site", kidFriendly: true, bestTime: "Anytime" })}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-orange-50 transition-colors border border-gray-100"
                              data-testid={`button-readd-removed-${r.id}`}
                            >
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-sm shrink-0`}>{cfg.emoji}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-gray-800 truncate">{r.name}</p>
                                <p className="text-[11px] text-orange-500 font-medium">Removed · tap to re-add</p>
                              </div>
                              <span className="text-gray-300 text-sm shrink-0">+</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Inline Preview */}
              {addStopStep === "preview" && addStopResult && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => setAddStopStep("discover")}
                      className="p-1.5 rounded-full hover:bg-gray-100"
                      data-testid="button-back-to-discover"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-base leading-tight">{addStopResult.name}</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5 capitalize">
                        {addStopResult.stopType?.replace("_", " ")} · {addStopResult.duration}
                      </p>
                    </div>
                    <button onClick={closeAddStop} className="p-1.5 rounded-full hover:bg-gray-100">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  {/* Preview card */}
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 space-y-3 mb-5">
                    {/* Type badge + duration */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-orange-600 bg-white border border-orange-200 px-2 py-0.5 rounded-full capitalize">
                        {addStopResult.stopType?.replace("_", " ")}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500">⏱ {addStopResult.duration}</span>
                      {addStopResult.kidFriendly && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Kid-friendly ✓</span>
                      )}
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 mt-2.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {addStopResult.addressSource === "verified" ? (
                            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">✓ Verified location</span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">⚠ Estimated — please verify</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={addStopResult.address || ""}
                          onChange={e => setAddStopResult(r => r ? { ...r, address: e.target.value } : r)}
                          placeholder="Enter address…"
                          className="w-full text-[11px] text-gray-700 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-300 bg-white"
                          data-testid="input-stop-address"
                        />
                        {addStopResult.address && (
                          <button
                            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(addStopResult!.address)}`, "_blank")}
                            className="text-[10px] text-orange-500 font-semibold mt-1 flex items-center gap-0.5"
                          >
                            <Navigation className="w-2.5 h-2.5" /> Open in Maps to verify
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Why kids love it */}
                    {addStopResult.whyKidsLoveIt && (
                      <div className="bg-white rounded-xl px-3 py-2.5 flex items-start gap-2">
                        <span className="text-sm shrink-0">⭐</span>
                        <div>
                          <p className="text-[10px] font-bold text-gray-700">Why kids love it</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">{addStopResult.whyKidsLoveIt}</p>
                        </div>
                      </div>
                    )}

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {addStopResult.entryCost && (
                        <div className="bg-white rounded-xl px-2.5 py-2">
                          <p className="text-gray-400 font-medium">Entry</p>
                          <p className="text-gray-700 font-semibold">{addStopResult.entryCost}</p>
                        </div>
                      )}
                      {addStopResult.bestTime && (
                        <div className="bg-white rounded-xl px-2.5 py-2">
                          <p className="text-gray-400 font-medium">Best time</p>
                          <p className="text-gray-700 font-semibold">{addStopResult.bestTime}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add to my day button */}
                  <button
                    onClick={handleAddToMyDay}
                    className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    data-testid="button-add-to-my-day"
                  >
                    Add to my day →
                  </button>
                </div>
              )}

              {/* Step 3: Placement picker */}
              {(addStopStep === "placement" || addStopStep === "adding") && addStopResult && (
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <button
                      onClick={() => setAddStopStep("preview")}
                      className="p-1.5 rounded-full hover:bg-gray-100"
                      data-testid="button-back-to-preview"
                      disabled={addStopStep === "adding"}
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-base">Where should we fit this?</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{addStopResult.name}</p>
                    </div>
                    <button onClick={closeAddStop} className="p-1.5 rounded-full hover:bg-gray-100" disabled={addStopStep === "adding"}>
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  {/* Tight day warning banner — shown immediately when day has ≥5 stops */}
                  {(dayGroups[activeDay] || []).length >= 5 && !tightDayWarningDismissed && (
                    <div className="mb-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                      <p className="text-[13px] font-semibold text-amber-800 mb-1">Your day is getting full</p>
                      <p className="text-[12px] text-amber-700 mb-3">This might make your day tight.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={closeAddStop}
                          className="flex-1 py-2 rounded-xl border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
                          data-testid="button-tight-day-skip"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => setTightDayWarningDismissed(true)}
                          className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
                          data-testid="button-tight-day-add-anyway"
                        >
                          Add anyway
                        </button>
                      </div>
                    </div>
                  )}

                  {addStopStep === "adding" ? (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                      <p className="text-sm text-gray-400">Adding {addStopResult.name}…</p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {(() => {
                        const currentDayStops = dayGroups[activeDay] || [];
                        const currentCityGroup = ((currentDayStops[0] as any)?.cityGroup as string | undefined) ?? (dayToCityName[activeDay] || undefined);

                        const positions: Array<{ label: string; insertAtOrder: number | undefined }> = [];

                        if (currentDayStops.length === 0) {
                          let foundOrder: number | undefined;
                          for (let d = activeDay - 1; d >= 0; d--) {
                            const prev = (dayGroups[d] || []).filter((s: any) => s.cityGroup === currentCityGroup);
                            if (prev.length > 0) { foundOrder = ((prev[prev.length - 1] as any).displayOrder ?? 0) + 1; break; }
                          }
                          if (foundOrder === undefined) {
                            for (let d = activeDay + 1; d < dayGroups.length; d++) {
                              const next = (dayGroups[d] || []).filter((s: any) => s.cityGroup === currentCityGroup);
                              if (next.length > 0) { foundOrder = (next[0] as any).displayOrder ?? 0; break; }
                            }
                          }
                          positions.push({ label: "Add to this day", insertAtOrder: foundOrder });
                        } else {
                          const firstOrder = currentDayStops[0].displayOrder ?? 0;
                          positions.push({ label: "Start of day", insertAtOrder: firstOrder });
                          currentDayStops.forEach((stop: TravelStop) => {
                            positions.push({
                              label: `After ${stop.name}`,
                              insertAtOrder: (stop.displayOrder ?? 0) + 1,
                            });
                          });
                          const lastStop = currentDayStops[currentDayStops.length - 1];
                          positions.push({
                            label: "End of day",
                            insertAtOrder: (lastStop.displayOrder ?? currentDayStops.length - 1) + 2,
                          });
                        }

                        return positions.map((pos, i) => (
                          <button
                            key={i}
                            onClick={() => handlePlaceStop(pos.insertAtOrder)}
                            disabled={addStopStep === "adding"}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 text-left transition-colors disabled:opacity-50"
                            data-testid={`button-place-${i}`}
                          >
                            <span className="text-orange-400 text-lg font-bold shrink-0">+</span>
                            <span className="flex-1 text-[13px] font-semibold text-gray-800">{pos.label}</span>
                            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Replace Stop Sheet */}
      <AnimatePresence>
        {replaceSheet.show && replaceSheet.stop && (
          <div
            className="fixed inset-0 z-[310] flex items-end justify-center bg-black/60 pb-[env(safe-area-inset-bottom,12px)]"
            onClick={closeReplaceSheet}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-white rounded-t-3xl max-w-lg w-full shadow-2xl max-h-[88vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
              data-testid="replace-stop-sheet"
            >
              {/* Drag handle */}
              <div className="pt-3 pb-1 flex justify-center shrink-0">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Discover step */}
              {replaceSheet.step === "discover" && (
                <div className="flex flex-col flex-1 min-h-0">
                  {/* Header */}
                  <div className="px-5 pb-3 shrink-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Swapping out</p>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-gray-800 line-through decoration-red-400 decoration-2 truncate max-w-[220px]">
                            {replaceSheet.stop.name}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={closeReplaceSheet}
                        className="mt-0.5 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
                        data-testid="button-close-replace-sheet"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    {/* Filter chips */}
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                      {[
                        { label: "✨ Best match", filter: null },
                        { label: "🌿 Outdoors", filter: "outdoors" },
                        { label: "⚡ Shorter", filter: "shorter" },
                        { label: "🎉 More fun", filter: "fun" },
                        { label: "🆓 Free entry", filter: "free" },
                      ].map(chip => {
                        const isActive = replaceSheet.activeChip === chip.filter;
                        return (
                          <button
                            key={String(chip.filter)}
                            onClick={() => {
                              const nextChip = isActive ? null : chip.filter;
                              setReplaceSheet(s => ({ ...s, activeChip: nextChip }));
                              fetchReplaceSuggestions(replaceSheet.stop!, nextChip);
                            }}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all active:scale-95 ${
                              isActive
                                ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                            }`}
                            data-testid={`chip-replace-${chip.filter}`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Search bar */}
                    <div className="relative mt-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={replaceSheet.searchQuery}
                        onChange={(e) => {
                          setReplaceSheet(s => ({ ...s, searchQuery: e.target.value }));
                          if (!e.target.value.trim()) setReplaceSheet(s => ({ ...s, searchResults: [] }));
                        }}
                        placeholder={`Search any place in ${activeDayCityName || currentTrip?.destination || "your destination"}…`}
                        className="w-full pl-9 pr-16 py-2.5 border border-gray-200 rounded-2xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
                        data-testid="input-replace-search"
                        onKeyDown={(e) => e.key === "Enter" && handleReplaceSearch(replaceSheet.searchQuery)}
                      />
                      {replaceSheet.searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-orange-400" />
                      )}
                      {replaceSheet.searchQuery.trim() && !replaceSheet.searching && (
                        <button
                          onClick={() => handleReplaceSearch(replaceSheet.searchQuery)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-orange-500 text-white text-[11px] font-bold rounded-xl active:scale-95 transition-transform"
                          data-testid="button-replace-search-go"
                        >
                          Search
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable results area */}
                  <div className="overflow-y-auto flex-1 px-5 pb-6">
                    {/* Search results */}
                    {replaceSheet.searchResults.length > 0 && (
                      <div className="mb-5 space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Search results</p>
                        {replaceSheet.searchResults.map((r, i) => {
                          const cfg = getStopConfig(r.stopType);
                          return (
                            <button
                              key={i}
                              onClick={() => handleSelectReplaceOption(r)}
                              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left bg-orange-50 border border-orange-100 hover:border-orange-300 active:scale-[0.98] transition-all"
                              data-testid={`button-replace-search-result-${i}`}
                            >
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-lg shrink-0 shadow-sm`}>{cfg.emoji}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-bold text-gray-800 truncate">{r.name}</p>
                                <p className="text-[11px] text-gray-500 capitalize mt-0.5">{r.stopType?.replace("_", " ")} · {r.duration}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Stops from other days */}
                    {replaceSheet.searchResults.length === 0 && (() => {
                      const otherDayStops = dayGroups
                        .flatMap((dayStops, dayIdx) => dayIdx === activeDay ? [] : dayStops)
                        .filter(s => s.id !== replaceSheet.stop?.id && !s.isVisited && !["lunch", "snack", "dinner"].includes(s.stopType || ""));
                      if (otherDayStops.length === 0) return null;
                      return (
                        <div className="mb-5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">📅 From other days</p>
                          <div className="space-y-2">
                            {otherDayStops.slice(0, 5).map((s, i) => {
                              const cfg = getStopConfig(s.stopType);
                              const dayIdx = dayGroups.findIndex(d => d.some(ds => ds.id === s.id));
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => handleSelectReplaceOption({ name: s.name, stopType: s.stopType || "attraction", duration: s.durationMinutes ? `${s.durationMinutes} min` : "1–2 hrs", description: s.description || "", whyKidsLoveIt: s.description || "", entryCost: s.entryCost || "Check on site", kidFriendly: true, bestTime: "Anytime", address: s.address || "", lat: s.lat?.toString() || null, lon: s.lon?.toString() || null } as any)}
                                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 active:scale-[0.98] transition-all shadow-sm"
                                  data-testid={`button-replace-other-day-${i}`}
                                >
                                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-lg shrink-0 shadow-sm`}>{cfg.emoji}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-bold text-gray-800 truncate">{s.name}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Day {dayIdx + 1} · {s.durationMinutes ? `${s.durationMinutes} min` : "1–2 hrs"}</p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* AI suggestions loading */}
                    {replaceSheet.suggestionsLoading && (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                        <span className="text-[12px] font-medium">Finding the best alternatives…</span>
                      </div>
                    )}

                    {/* AI suggestions */}
                    {!replaceSheet.suggestionsLoading && replaceSheet.suggestions && (
                      <>
                        {replaceSheet.suggestions.better.length > 0 && (
                          <div className="mb-5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">🔝 Recommended swaps</p>
                            <div className="space-y-2">
                              {replaceSheet.suggestions.better.map((s, i) => {
                                const cfg = getStopConfig(s.stopType);
                                return (
                                  <button
                                    key={i}
                                    onClick={() => handleSelectReplaceOption(s)}
                                    className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left bg-white border border-gray-100 hover:bg-orange-50 hover:border-orange-200 active:scale-[0.98] transition-all shadow-sm"
                                    data-testid={`button-replace-better-${i}`}
                                  >
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-lg shrink-0 shadow-sm`}>{cfg.emoji}</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[14px] font-bold text-gray-800 truncate">{s.name}</p>
                                      <p className="text-[11px] text-gray-500 truncate mt-0.5">{s.description}</p>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                      <span className="text-[11px] text-orange-500 font-bold">{s.duration}</span>
                                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 mt-0.5 ml-auto" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {replaceSheet.suggestions.similar.length > 0 && (
                          <div className="mb-5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">📍 Similar places nearby</p>
                            <div className="space-y-2">
                              {replaceSheet.suggestions.similar.map((s, i) => {
                                const cfg = getStopConfig(s.stopType);
                                return (
                                  <button
                                    key={i}
                                    onClick={() => handleSelectReplaceOption(s)}
                                    className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left bg-white border border-gray-100 hover:bg-orange-50 hover:border-orange-200 active:scale-[0.98] transition-all shadow-sm"
                                    data-testid={`button-replace-similar-${i}`}
                                  >
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-lg shrink-0 shadow-sm`}>{cfg.emoji}</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[14px] font-bold text-gray-800 truncate">{s.name}</p>
                                      <p className="text-[11px] text-gray-500 truncate mt-0.5">{s.description}</p>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                      <span className="text-[11px] text-orange-500 font-bold">{s.duration}</span>
                                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 mt-0.5 ml-auto" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Previously removed stops */}
                    {removedStopsHistory.length > 0 && (
                      <div className="mt-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">🗂 Previously removed</p>
                        <div className="space-y-2">
                          {removedStopsHistory.map(r => {
                            const cfg = getStopConfig(r.stopType);
                            return (
                              <button
                                key={r.id}
                                onClick={() => handleSelectReplaceOption({ name: r.name, address: r.address || "", lat: r.lat?.toString(), lon: r.lon?.toString(), stopType: r.stopType, duration: r.durationMinutes ? `${r.durationMinutes} min` : "60 min", description: "", whyKidsLoveIt: "", entryCost: r.entryCost || "Check on site", kidFriendly: true, bestTime: "Anytime" })}
                                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left bg-white border border-gray-100 hover:bg-orange-50 hover:border-orange-200 active:scale-[0.98] transition-all shadow-sm"
                                data-testid={`button-replace-removed-${r.id}`}
                              >
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-lg shrink-0 shadow-sm`}>{cfg.emoji}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14px] font-bold text-gray-800 truncate">{r.name}</p>
                                  <p className="text-[11px] text-orange-500 font-medium mt-0.5">Previously removed · add back</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preview step */}
              {replaceSheet.step === "preview" && replaceSheet.previewResult && (
                <div className="flex flex-col flex-1 min-h-0">
                  {/* Preview header */}
                  <div className="px-5 pb-4 shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setReplaceSheet(s => ({ ...s, step: "discover" }))}
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                        data-testid="button-replace-back-to-discover"
                        disabled={replaceSheet.applying}
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Stop preview</p>
                      <button onClick={closeReplaceSheet} className="ml-auto p-2 rounded-full bg-gray-100 hover:bg-gray-200" disabled={replaceSheet.applying}>
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    {/* Place name hero */}
                    <div className="flex items-start gap-3">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getStopConfig(replaceSheet.previewResult.stopType).gradient} flex items-center justify-center text-2xl shrink-0 shadow-md`}>
                        {getStopConfig(replaceSheet.previewResult.stopType).emoji}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="font-extrabold text-gray-900 text-[17px] leading-tight">{replaceSheet.previewResult.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full capitalize">
                            {replaceSheet.previewResult.stopType?.replace("_", " ")}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            ⏱ {replaceSheet.previewResult.duration}
                          </span>
                          {replaceSheet.previewResult.kidFriendly && (
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">👶 Kid-friendly</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scrollable preview body */}
                  <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-3">
                    {/* Why kids love it */}
                    {replaceSheet.previewResult.whyKidsLoveIt && (
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">⭐</span>
                        <div>
                          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Why kids love it</p>
                          <p className="text-[12px] text-gray-700 mt-0.5 leading-relaxed">{replaceSheet.previewResult.whyKidsLoveIt}</p>
                        </div>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-2">
                      {replaceSheet.previewResult.entryCost && (
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl px-3.5 py-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Entry cost</p>
                          <p className="text-[13px] font-bold text-gray-800 mt-0.5">{replaceSheet.previewResult.entryCost}</p>
                        </div>
                      )}
                      {replaceSheet.previewResult.bestTime && (
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl px-3.5 py-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Best time</p>
                          <p className="text-[13px] font-bold text-gray-800 mt-0.5">{replaceSheet.previewResult.bestTime}</p>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Location</p>
                        {replaceSheet.previewResult.addressSource === "verified" ? (
                          <span className="text-[9px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">✓ Verified</span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">⚠ Please verify</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={replaceSheet.previewResult.address || ""}
                        onChange={e => setReplaceSheet(s => s.previewResult ? { ...s, previewResult: { ...s.previewResult!, address: e.target.value } } : s)}
                        placeholder="Enter address…"
                        className="w-full text-[12px] text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-300"
                        data-testid="input-replace-address"
                      />
                      {replaceSheet.previewResult.address && (
                        <button
                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(replaceSheet.previewResult!.address)}`, "_blank")}
                          className="text-[11px] text-orange-500 font-semibold mt-2 flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3" /> Verify on Maps
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sticky CTA */}
                  <div className="px-5 pb-6 pt-3 shrink-0 border-t border-gray-100">
                    <button
                      onClick={handleApplyReplace}
                      disabled={replaceSheet.applying}
                      className="w-full py-4 rounded-2xl disabled:opacity-60 text-white text-[15px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg"
                      style={{ background: replaceSheet.applying ? "#ccc" : "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
                      data-testid="button-replace-with-this"
                    >
                      {replaceSheet.applying ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Replacing…</>
                      ) : (
                        "Use this stop →"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── STOP QUICK SHEET (bottom sheet from Details button) ── */}
      <AnimatePresence>
        {showStopQuickSheet && quickSheetStop && (() => {
          const qs = quickSheetStop;
          const cfg = getStopConfig(qs.stopType);
          const qsDuration = qs.durationMinutes || estDuration(qs.stopType);
          const qsHrs = qsDuration >= 60
            ? `${Math.floor(qsDuration / 60)}–${Math.floor(qsDuration / 60) + 1} hrs`
            : `${qsDuration} min`;
          const qsImg = quickSheetOnDemandImg || (qs as any).imageUrl || (qs as any).heroImage || null;
          const descText = qs.description
            ? qs.description.split(/[.\n]/).map(s => s.trim()).filter(Boolean)[0] || ""
            : "";
          const isOpen = new Date().getHours() < 20 && new Date().getHours() > 7;
          const hasParking = ["museum", "park", "attraction", "garden"].includes(qs.stopType || "");
          const hasStreetParking = ["market", "restaurant", "cafe", "viewpoint"].includes(qs.stopType || "");
          const parkingLabel = hasParking ? "On-site parking" : hasStreetParking ? "Street parking" : "Nearby parking";
          const ageRange = (() => {
            const t = qs.stopType || "";
            if (["park", "playground", "beach", "garden"].includes(t)) return "Ages 3+";
            if (["museum", "aquarium"].includes(t)) return "Ages 5–14";
            if (["restaurant", "cafe", "market"].includes(t)) return "All ages";
            return "Ages 5–12";
          })();
          const unvisitedInDay = sortedStops.filter(s => !s.isVisited);
          const openQuickSheetDetails = () => {
            setShowStopQuickSheet(false);
            setDetailsStopOverride(qs);
            setShowStopDetails(true);
          };
          return (
            <motion.div
              key="stop-quick-sheet"
              className="fixed inset-0 z-[378] flex items-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowStopQuickSheet(false)} />
              {/* Sheet — slides up */}
              <motion.div
                className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl overflow-hidden shadow-2xl"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                style={{ maxHeight: "88vh", display: "flex", flexDirection: "column" }}
              >
                {/* Pull handle */}
                <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                  <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>

                {/* Hero image */}
                <div className="relative h-40 shrink-0 overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100">
                  {qsImg ? (
                    <img src={qsImg} alt={qs.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${cfg?.gradient || "from-orange-200 to-amber-200"} flex items-center justify-center`}>
                      <span className="text-[64px] leading-none opacity-80">{cfg?.emoji || "📍"}</span>
                    </div>
                  )}
                  {qsImg && <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />}
                  {/* Close X */}
                  <button
                    onClick={() => setShowStopQuickSheet(false)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm z-10"
                    data-testid="button-quick-sheet-close"
                  >
                    <X className="w-4 h-4 text-gray-700" />
                  </button>
                  {/* Stop name on image */}
                  {qsImg && (
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 z-10">
                      <p className="text-white font-bold text-lg leading-tight drop-shadow">{qs.name}</p>
                    </div>
                  )}
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 pb-8">
                  <div className="px-4 pt-4 space-y-4">

                    {/* Stop identity */}
                    {!qsImg && (
                      <p className="text-[18px] font-bold text-gray-900">{qs.name}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap -mt-1">
                      <span className="text-[13px] font-semibold text-amber-500">⭐ {(qs as any).rating || "4.5"}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-[13px] text-gray-500 capitalize">{cfg?.label || qs.stopType || "Attraction"}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-[13px] text-gray-500">⏱ {qsHrs}</span>
                    </div>

                    {/* Great for kids badge */}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                        Great for kids 5–12
                      </span>
                    </div>

                    {/* Info chips row */}
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${isOpen ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {isOpen ? "🟢 Open now" : "⭕ Check hours"}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
                        🚗 {parkingLabel}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
                        👶 {ageRange}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
                        ⏱ {qsHrs}
                      </span>
                    </div>

                    {/* Why this stop works */}
                    {descText && (
                      <div>
                        <p className="text-[13px] font-bold text-gray-900 mb-1">Why this stop works</p>
                        <p className="text-[13px] text-gray-600 leading-relaxed">{descText}</p>
                      </div>
                    )}

                    {/* Best time right now */}
                    <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <span className="text-xl shrink-0">🌟</span>
                      <div>
                        <p className="text-[13px] font-bold text-green-800">
                          {new Date().getHours() < 11 ? "Best time right now" : new Date().getHours() < 15 ? "Good time to visit" : "Quieter this afternoon"}
                        </p>
                        <p className="text-[12px] text-green-600">
                          {new Date().getHours() < 11 ? "Low crowds this morning" : new Date().getHours() < 15 ? "Moderate crowd levels" : "Crowds winding down"}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(qs.address || qs.name || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 py-2.5 bg-white border border-gray-200 rounded-2xl text-[11px] font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                        data-testid="button-qs-directions"
                      >
                        <Navigation className="w-4 h-4 text-gray-500" />
                        Directions
                      </a>
                      <button
                        onClick={() => { setShowStopQuickSheet(false); setActiveTab("passes"); }}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-2xl text-[11px] font-semibold text-white active:scale-95 transition-all shadow-sm"
                        style={{ background: "#f97316" }}
                        data-testid="button-qs-add-ticket"
                      >
                        <Ticket className="w-4 h-4" />
                        Add Ticket
                      </button>
                      <button
                        onClick={() => { setShowStopQuickSheet(false); setShowFoodSheet(true); }}
                        className="flex flex-col items-center gap-1 py-2.5 bg-white border border-gray-200 rounded-2xl text-[11px] font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                        data-testid="button-qs-food"
                      >
                        <UtensilsCrossed className="w-4 h-4 text-gray-500" />
                        Food nearby
                      </button>
                    </div>

                    {/* Quick Adjust */}
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Quick adjust</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { id: "running_late", emoji: "⏱", label: "Running late" },
                          { id: "kids_tired",   emoji: "😴", label: "Kids tired" },
                          { id: "skip_next",    emoji: "⏭", label: "Skip stop" },
                          { id: "too_much",     emoji: "😩", label: "Too much planned" },
                        ] as const).map(btn => (
                          <button
                            key={btn.id}
                            onClick={() => {
                              setShowStopQuickSheet(false);
                              if (btn.id === "skip_next") {
                                setConfirmSkipNext(qs);
                              } else {
                                handleMakeDayLighter(unvisitedInDay, btn.id);
                              }
                            }}
                            className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
                            data-testid={`button-qs-adjust-${btn.id}`}
                          >
                            <span>{btn.emoji}</span> {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Explore more → opens full-screen details */}
                    <button
                      onClick={openQuickSheetDetails}
                      className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm"
                      data-testid="button-qs-explore-more"
                    >
                      <span className="text-[13px] font-semibold text-gray-800">Explore more about this stop</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── SCREEN 2: VIEW DETAILS (full-screen overlay) ── */}
      <AnimatePresence>
        {showStopDetails && (() => {
          const currentStop = detailsStopOverride || sortedStops.find(s => !s.isVisited) || null;
          const cfg = currentStop ? getStopConfig(currentStop.stopType) : null;
          if (!currentStop || !cfg) return null;
          const descBullets = currentStop.description
            ? currentStop.description.split(/[.\n]/).map(s => s.trim()).filter(Boolean).slice(0, 5)
            : [];
          const exploreReady = !currentTabExploreLoading && !!currentTabExploreData;
          const detailsPlannedHour = (() => {
            const daysStops = dayGroups[todayDayOffset] || [];
            const tl = buildTimeline(daysStops);
            type SI = { kind: "stop"; stop: TravelStop; time: string };
            const item = tl.find((i): i is SI => i.kind === "stop" && !(i.stop as TravelStop).isVisited);
            if (!item?.time) return new Date().getHours();
            const [hm, ampm] = item.time.split(" "); const [h] = hm.split(":").map(Number);
            return (ampm === "PM" && h !== 12) ? h + 12 : (ampm === "AM" && h === 12 ? 0 : h);
          })();
          const rightNowFit = detailsPlannedHour < 11
            ? { text: "Best time right now", tc: "text-green-800" }
            : detailsPlannedHour < 14
            ? { text: "Good timing", tc: "text-blue-800" }
            : detailsPlannedHour < 17
            ? { text: "Afternoon window", tc: "text-amber-800" }
            : { text: "Busy hour", tc: "text-rose-800" };
          return (
            <motion.div
              key="stop-details-overlay"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-0 z-[370] bg-gray-50 flex flex-col max-w-lg mx-auto overflow-hidden"
            >
              {/* Mini hero header (160px) */}
              <div className={`relative shrink-0 h-40 bg-gradient-to-br ${cfg.gradient} flex items-center justify-center overflow-hidden`}>
                {(stopHeroImage || clientHeroImage) ? (
                  <img src={stopHeroImage || clientHeroImage!} alt={currentStop.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <span className="text-[72px] leading-none select-none opacity-90">{cfg.emoji}</span>
                )}
                {(stopHeroImage || clientHeroImage) && <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />}
                <button
                  onClick={() => { setShowStopDetails(false); setDetailsStopOverride(null); }}
                  className="absolute top-3 left-3 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm z-10"
                  data-testid="button-stop-details-back"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 bg-gradient-to-t from-black/50 to-transparent z-10">
                  <p className="text-white font-bold text-lg leading-tight">{currentStop.name}</p>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto pb-8">
                <div className="px-4 pt-4 space-y-3">

                  {/* 1. Right Now Suggestion */}
                  {exploreReady && currentTabExploreData.aboutArea && (
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                      <p className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-1">⚡ Best next move</p>
                      <p className="text-sm font-semibold text-orange-900 leading-snug">{currentTabExploreData.aboutArea.split(".")[0]}.</p>
                    </div>
                  )}
                  {currentTabExploreLoading && (
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-400 shrink-0" />
                      <p className="text-sm text-orange-700">Loading stop intelligence…</p>
                    </div>
                  )}

                  {/* 2. What You'll Experience */}
                  {descBullets.length > 0 && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <p className="text-sm font-bold text-gray-900 mb-3">What you'll experience</p>
                      <div className="space-y-2">
                        {descBullets.map((b, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-sm text-gray-700 leading-snug">{b}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Best way to do this stop (tips) */}
                  {exploreReady && currentTabExploreData.tips?.length > 0 && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <p className="text-sm font-bold text-gray-900 mb-3">Best way to do this stop</p>
                      <div className="space-y-2">
                        {currentTabExploreData.tips.slice(0, 3).map((tip: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-orange-400 mt-0.5 shrink-0">•</span>
                            <p className="text-sm text-gray-700 leading-snug">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Parking & Access */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Car className="w-4 h-4 text-gray-500" />
                      <p className="text-sm font-bold text-gray-900">Parking & Access</p>
                    </div>
                    <div className="space-y-1.5">
                      {(currentStop.stopType === "museum" || currentStop.stopType === "attraction") ? (
                        <>
                          <p className="text-sm text-gray-700 flex items-center gap-2"><span className="text-green-500">✔</span> On-site parking available</p>
                          <p className="text-sm text-gray-700 flex items-center gap-2"><span className="text-green-500">✔</span> Accessible entrance</p>
                          <p className="text-sm text-gray-500 text-xs mt-1">Tip: arrive 15 min early for smoother entry</p>
                        </>
                      ) : currentStop.stopType === "park" ? (
                        <>
                          <p className="text-sm text-gray-700 flex items-center gap-2"><span className="text-green-500">✔</span> Free parking lot</p>
                          <p className="text-sm text-gray-700 flex items-center gap-2"><span className="text-amber-500">⚠️</span> Can fill up on weekends</p>
                          <p className="text-sm text-gray-500 text-xs mt-1">Tip: arrive before 10 AM on busy days</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-gray-700 flex items-center gap-2"><span className="text-amber-500">⚠️</span> Street or nearby garage</p>
                          <p className="text-sm text-gray-500 text-xs mt-1">Check Google Maps for current availability</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 5. Timing & Logistics */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <p className="text-sm font-bold text-gray-900">Timing & Logistics</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Recommended duration</span>
                        <span className="font-medium text-gray-800">{estDuration(currentStop.stopType)} min</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Best for</span>
                        <span className="font-medium text-gray-800">Ages 5–12</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Crowd level now</span>
                        <span className={`font-medium ${rightNowFit.tc}`}>{rightNowFit.text}</span>
                      </div>
                    </div>
                  </div>

                  {/* 6. Nearby Essentials */}
                  <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <p className="text-sm font-bold text-gray-900 px-4 pt-4 pb-2">Nearby essentials</p>
                    {[
                      { key: "food" as const, emoji: "🍔", label: "Food nearby", sub: currentTabExploreLoading ? "Finding options…" : currentTabExploreData?.restaurants?.length > 0 ? `${currentTabExploreData.restaurants.length} options found` : "Tap to search nearby" },
                      { key: "breaks" as const, emoji: "🛋️", label: "Quick break spots", sub: currentTabExploreLoading ? "Finding options…" : currentTabExploreData?.nearbyAttractions?.length > 0 ? `${currentTabExploreData.nearbyAttractions.length} spots nearby` : "Tap to search nearby" },
                      { key: "kids" as const, emoji: "🧒", label: "Kid-friendly extras", sub: currentTabExploreLoading ? "Finding options…" : currentTabExploreData?.kidFriendlyPlaces?.length > 0 ? `${currentTabExploreData.kidFriendlyPlaces.length} places` : "Tap to search nearby" },
                    ].map((row, i, arr) => (
                      <button
                        key={row.key}
                        onClick={() => setDetailsNearbySheet(row.key)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}
                        data-testid={`button-nearby-${row.key}`}
                      >
                        <span className="text-xl shrink-0">{row.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{row.label}</p>
                          <p className="text-xs text-gray-400">{row.sub}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      </button>
                    ))}
                  </div>

                  {/* 6b. Real Info Pills (hours, cost, parking) */}
                  {exploreReady && (currentTabExploreData?.openingHours || currentTabExploreData?.entryCost || currentTabExploreData?.parkingInfo) && (
                    <div className="grid grid-cols-3 gap-2">
                      {currentTabExploreData.openingHours && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                          <p className="text-base mb-0.5">🕐</p>
                          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Hours</p>
                          <p className="text-[11px] text-blue-600 mt-0.5 leading-tight">{currentTabExploreData.openingHours}</p>
                        </div>
                      )}
                      {currentTabExploreData.entryCost && (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center overflow-hidden">
                          <p className="text-base mb-0.5">💰</p>
                          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Entry</p>
                          <p className="text-[10px] text-green-600 mt-0.5 leading-tight line-clamp-3 break-words">{currentTabExploreData.entryCost}</p>
                        </div>
                      )}
                      {currentTabExploreData.parkingInfo && (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                          <p className="text-base mb-0.5">🅿️</p>
                          <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">Parking</p>
                          <p className="text-[11px] text-orange-600 mt-0.5 leading-tight">{currentTabExploreData.parkingInfo}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 7. Getting There (collapsible) */}
                  <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <button
                      onClick={() => setDetailsGettingThereOpen(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3.5"
                      data-testid="button-getting-there"
                    >
                      <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-bold text-gray-900">Getting there</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {currentStop.address ? "Tap for directions" : "~10 min drive"}
                        </span>
                        {detailsGettingThereOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
                    {detailsGettingThereOpen && currentStop.address && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <p className="text-sm text-gray-600 mt-3 mb-3">{currentStop.address}</p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentStop.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Open in Maps
                        </a>
                        {currentTabExploreData?.gettingAround && (
                          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{currentTabExploreData.gettingAround}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 8. Reviews (collapsible, placeholder) */}
                  <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <button
                      onClick={() => setDetailsReviewsOpen(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3.5"
                      data-testid="button-reviews"
                    >
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-bold text-gray-900">Reviews</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {currentTabExploreData?.reviews?.length > 0
                            ? `${(currentTabExploreData.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / currentTabExploreData.reviews.length).toFixed(1)} · Based on visitor reviews`
                            : "Visitor reviews"}
                        </span>
                        {detailsReviewsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
                    {detailsReviewsOpen && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                        {currentTabExploreLoading ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="flex gap-3 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                                <div className="flex-1 space-y-1">
                                  <div className="h-3 bg-gray-200 rounded w-24" />
                                  <div className="h-3 bg-gray-100 rounded w-full" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(currentTabExploreData?.reviews || []).map((r: any, i: number) => (
                              <div key={i} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 shrink-0">{r.authorName[0]}</div>
                                <div>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <p className="text-xs font-bold text-gray-800">{r.authorName}</p>
                                    <span className="text-[10px] text-yellow-500">{"★".repeat(r.rating)}</span>
                                    <span className="text-[10px] text-gray-400">{r.relativeTime}</span>
                                  </div>
                                  <p className="text-xs text-gray-600 leading-relaxed">{r.text}</p>
                                </div>
                              </div>
                            ))}
                            {currentTabExploreData?.googleMapsUrl && (
                              <a
                                href={currentTabExploreData.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 mt-2 text-xs font-semibold text-blue-600 hover:underline"
                              >
                                <span>See all reviews on Google Maps</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Need something else? — in Stop Details overlay */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => setRescuePanelOpen(true)}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
                      data-testid="button-stop-need-something-else"
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900">Need something else?</p>
                        <p className="text-xs text-gray-400 mt-0.5">Food · break · skip · lighter day · add fun</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 ml-2" />
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Nearby Essentials Bottom Sheet */}
      <AnimatePresence>
        {detailsNearbySheet && (() => {
          const nearbyCurrentStop = forcedCurrentStop || sortedStops.find(s => !s.isVisited) || null;
          const items = detailsNearbySheet === "food"
            ? (currentTabExploreData?.restaurants || [])
            : detailsNearbySheet === "breaks"
            ? (currentTabExploreData?.nearbyAttractions || [])
            : (currentTabExploreData?.kidFriendlyPlaces || []);
          const titles = { food: "🍔 Food nearby", breaks: "🛋️ Quick break spots", kids: "🧒 Kid-friendly extras" };
          const mapsQueries = {
            food: `family+restaurants+near+${encodeURIComponent(nearbyCurrentStop?.name || currentTrip?.destination || "")}`,
            breaks: `cafes+rest+spots+near+${encodeURIComponent(nearbyCurrentStop?.name || currentTrip?.destination || "")}`,
            kids: `kid+friendly+activities+near+${encodeURIComponent(nearbyCurrentStop?.name || currentTrip?.destination || "")}`,
          };
          return (
            <motion.div
              key="nearby-sheet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[380] bg-black/40 flex items-end justify-center"
              onClick={() => setDetailsNearbySheet(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl max-h-[75vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-4" />
                <p className="text-base font-bold text-gray-900 mb-4">{titles[detailsNearbySheet]}</p>
                {currentTabExploreLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                    <span className="text-sm text-gray-400">Finding nearby options…</span>
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-4">
                    <p className="text-sm text-gray-500 text-center mb-4">
                      Search directly on Google Maps for options near {nearbyCurrentStop?.name || "your stop"}.
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${mapsQueries[detailsNearbySheet]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 text-white text-sm font-bold rounded-2xl hover:bg-blue-600 transition-colors"
                    >
                      🗺️ Open Google Maps
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item: any, i: number) => {
                      const isAdding = addingNearbyItemIdx === i;
                      const lastDayStop = (dayGroups[activeDay] || []).at(-1);
                      const insertOrder = ((lastDayStop as any)?.displayOrder ?? 0) + 0.5;
                      return (
                        <div key={i} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                          <div className="flex items-start gap-3 p-3.5">
                            <span className="text-xl shrink-0">
                              {detailsNearbySheet === "food" ? "🍴" : detailsNearbySheet === "breaks" ? "🌳" : "🎠"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {[item.distance, item.cuisine, item.priceRange, item.ageRange].filter(Boolean).join(" · ")}
                              </p>
                              {item.description && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.description}</p>}
                            </div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + " " + (currentTrip?.destination || ""))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-blue-500 text-xs font-semibold hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              Maps →
                            </a>
                          </div>
                          {detailsNearbySheet === "food" && (
                            <div className="px-3.5 pb-3">
                              <button
                                disabled={isAdding}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setAddingNearbyItemIdx(i);
                                  try {
                                    await doAddNeedRecStop(item.name, "restaurant", insertOrder);
                                    setDetailsNearbySheet(null);
                                  } finally {
                                    setAddingNearbyItemIdx(null);
                                  }
                                }}
                                className="w-full py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                                data-testid={`button-add-nearby-food-${i}`}
                              >
                                {isAdding ? <><Loader2 className="w-3 h-3 animate-spin" /> Adding…</> : "+ Add to plan"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${mapsQueries[detailsNearbySheet]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-2xl hover:bg-gray-200 transition-colors mt-2"
                    >
                      See more on Google Maps →
                    </a>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Parking Address Sheet */}
      <AnimatePresence>
        {parkingSheet && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[400] flex items-end justify-center"
            onClick={() => setParkingSheet(null)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-4" />
              <p className="text-base font-bold text-gray-900 mb-1">🅿️ Parking near {parkingSheet.stopName.split(" ").slice(0, 4).join(" ")}</p>
              <p className="text-xs text-gray-500 mb-4">Find parking on Google Maps, then paste the address below to save it to your plan.</p>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=parking+near+${encodeURIComponent(parkingSheet.stopName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 text-white text-sm font-bold rounded-2xl hover:bg-blue-600 transition-colors mb-4"
              >
                🗺️ Find Parking on Google Maps
              </a>

              <div className="mb-3">
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Parking address (paste from Google Maps)</label>
                <textarea
                  value={parkingInputValue}
                  onChange={e => setParkingInputValue(e.target.value)}
                  placeholder="e.g. Carrer de Pujades 102, Barcelona…"
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-800 placeholder:text-gray-400"
                  data-testid="input-parking-address"
                />
              </div>

              {parkingAddresses[parkingSheet.stopId] && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                  <span className="text-green-600 text-sm">✅</span>
                  <p className="text-xs text-green-700 font-medium flex-1 break-words">{parkingAddresses[parkingSheet.stopId]}</p>
                  <button
                    onClick={() => {
                      const updated = { ...parkingAddresses };
                      delete updated[parkingSheet.stopId];
                      setParkingAddresses(updated);
                      localStorage.setItem("geoquest_parking_addresses", JSON.stringify(updated));
                      setParkingInputValue("");
                    }}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  if (!parkingInputValue.trim()) return;
                  const updated = { ...parkingAddresses, [parkingSheet.stopId]: parkingInputValue.trim() };
                  setParkingAddresses(updated);
                  localStorage.setItem("geoquest_parking_addresses", JSON.stringify(updated));
                  setParkingSheet(null);
                  toast.success("Parking address saved to your plan ✅");
                }}
                disabled={!parkingInputValue.trim()}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-colors disabled:opacity-40"
                style={{ background: "#D4872B" }}
                data-testid="button-save-parking-address"
              >
                Save Parking Address
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Skip Next Stop */}
      <AnimatePresence>
        {confirmSkipNext && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4"
            onClick={() => setConfirmSkipNext(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">⏭</div>
                <h3 className="font-bold text-gray-900 text-base">Skip this stop?</h3>
                <p className="text-sm text-gray-700 mt-1 font-semibold">{confirmSkipNext.name}</p>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  This will remove the stop from your itinerary for today. You can still add it back anytime using the <span className="font-medium text-gray-700">Replace</span> or <span className="font-medium text-gray-700">Add a stop</span> button.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmSkipNext(null)}
                  className="py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  data-testid="button-skip-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const skipped = confirmSkipNext;
                    setSkippedStopIds(prev => [...prev, skipped.id]);
                    setConfirmSkipNext(null);
                    toast("Stop skipped", {
                      action: { label: "Undo", onClick: () => setSkippedStopIds(prev => prev.filter(id => id !== skipped.id)) },
                    });
                  }}
                  className="py-3 rounded-2xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
                  data-testid="button-skip-confirm"
                >
                  Skip it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anchor stop lightweight callout */}
      <AnimatePresence>
        {anchorCalloutStop && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-end justify-center p-4"
            onClick={() => setAnchorCalloutStop(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
              onClick={e => e.stopPropagation()}
              data-testid="anchor-stop-callout"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl shrink-0">📍</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">This is your next planned stop</p>
                  <p className="text-xs text-gray-500 mt-0.5">{anchorCalloutStop.name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const stop = anchorCalloutStop;
                    setAnchorCalloutStop(null);
                    handleRemoveStop(stop);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  data-testid="button-anchor-remove-anyway"
                >
                  Remove anyway
                </button>
                <button
                  onClick={() => setAnchorCalloutStop(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                  data-testid="button-anchor-keep"
                >
                  Keep it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fix This Day — Step 1 Diagnosis Sheet ── */}
      <AnimatePresence>
        {fixDayDiagnosisSheet !== null && lighterDayProposal === null && (() => {
          const { dayIdx, stops, cityName, score } = fixDayDiagnosisSheet;
          const unvisited = stops.filter(s => !s.isVisited);
          const travelMinD = Math.max(0, (stops.length - 1) * 20);
          const reasons: string[] = [];
          if (stops.length > 5) reasons.push(`${stops.length} stops is a lot for one day`);
          if (travelMinD > 60) reasons.push(`~${travelMinD} min travel between stops`);
          if (score >= 85) reasons.push("Afternoon is very dense");
          const suggestedFix = stops.length > 4 ? "Remove 1 stop + add a break" : "Add a break or shorten a visit";
          return (
            <motion.div
              key="fix-day-diagnosis-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[360] bg-black/40 flex items-end justify-center"
              onClick={() => setFixDayDiagnosisSheet(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 300 }}
                className="w-full bg-white rounded-t-3xl px-4 pt-4 pb-8 max-w-lg"
                onClick={e => e.stopPropagation()}
                data-testid="fix-day-diagnosis-sheet"
              >
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                <p className="font-bold text-[18px] text-gray-900 mb-1">
                  {score >= 85 ? "This day feels a bit packed ⚠️" : "This day could be lighter 💡"}
                </p>
                <p className="text-[13px] text-gray-500 mb-3">Day {dayIdx + 1} — {cityName || "Your city"}</p>
                {reasons.length > 0 && (
                  <div className="mb-4 rounded-xl p-3" style={{ background: "#FFF8ED", border: "1px solid #FFE0A3" }}>
                    {reasons.map((r, ri) => (
                      <div key={ri} className="flex items-center gap-2 text-[12px] text-amber-800 mb-1 last:mb-0">
                        <span>⚠</span> {r}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mb-4 rounded-xl p-3 bg-gray-50">
                  <p className="text-[12px] text-gray-500 font-medium mb-1">Suggested fix</p>
                  <p className="text-[14px] text-gray-800 font-semibold">{suggestedFix}</p>
                </div>
                <p className="text-[11px] text-gray-400 mb-4">
                  ℹ️ All changes will stay within {cityName || "this city"} — no cross-city moves
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setFixDayDiagnosisSheet(null);
                      handleMakeDayLighter(unvisited, "lighter");
                    }}
                    className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white"
                    style={{ background: "#D4872B" }}
                    data-testid="button-see-suggestion"
                  >
                    See suggestion
                  </button>
                  <button
                    onClick={() => setFixDayDiagnosisSheet(null)}
                    className="w-full py-3 rounded-2xl text-[14px] font-semibold text-gray-600 border border-gray-200"
                    data-testid="button-cancel-fix-day"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Fix Entire Trip — multi-step modal ── */}
      <AnimatePresence>
        {fixEntireTripStep !== null && (() => {
          const allDaysFET = dayGroups.length > 1 ? dayGroups : [sortedStops];
          const MEAL_T_FET = new Set(["restaurant", "food", "cafe", "market", "meal", "street_food"]);

          const getDayScoreFET = (stops: TravelStop[]) => {
            const totalMin = stops.reduce((a, s) => a + (s.durationMinutes || 75), 0);
            const hrs = totalMin / 60;
            const travelMin = Math.max(0, (stops.length - 1) * 20);
            return Math.round(stops.length * 10 + hrs * 4 + travelMin / 12 * 2);
          };

          const rawLabelFET = (score: number) =>
            score < 35 ? "Light" : score < 60 ? "Balanced" : score < 80 ? "Busy" : "Packed";

          const getLoadInfoFET = (score: number, stopCount: number, normLabel?: string) => {
            if (stopCount === 0) return { label: "Empty", color: "#9CA3AF", emoji: "⚪" };
            const label = normLabel || rawLabelFET(score);
            if (label === "Light") return { label: "Light", color: "#6B7280", emoji: "⚪" };
            if (label === "Balanced") return { label: "Balanced", color: "#16A34A", emoji: "🟢" };
            if (label === "Busy") return { label: "Busy", color: "#D97706", emoji: "🟡" };
            return { label: "Packed", color: "#DC2626", emoji: "🔴" };
          };

          const getDayCityNameFET = (dIdx: number, dayStops: TravelStop[]) => {
            if (dayStops.length > 0) {
              const raw = (dayStops[0] as any)?.cityGroup || "";
              if (!/^Day \d+$/i.test(raw.trim())) return raw;
            }
            return dayToCityName[dIdx] || currentTrip?.destination || "";
          };

          const dayScores = allDaysFET.map((d, i) => ({
            dIdx: i,
            stops: d || [],
            score: getDayScoreFET(d || []),
            city: getDayCityNameFET(i, d || []),
          }));

          // Normalize FET distribution
          const rawLabelsFET = dayScores.map(d => d.stops.length === 0 ? "Empty" : rawLabelFET(d.score));
          const nonEmptyFET = rawLabelsFET.filter(l => l !== "Empty");
          const uniqueRawFET = new Set(nonEmptyFET);
          const normalizedLabelsFET: string[] = [...rawLabelsFET];
          if (uniqueRawFET.size === 1 && nonEmptyFET.length > 1) {
            const tier = nonEmptyFET[0];
            const tierOrder = ["Packed", "Busy", "Balanced", "Light"];
            const tierIdx = tierOrder.indexOf(tier);
            const sorted = dayScores.filter(d => d.stops.length > 0).sort((a, b) => b.score - a.score);
            sorted.forEach(({ dIdx }, rank) => {
              normalizedLabelsFET[dIdx] = tierOrder[Math.min(tierIdx + rank, tierOrder.length - 1)];
            });
          }

          const packedDaysFET = normalizedLabelsFET.filter(l => l === "Packed").length;
          const busyDaysFET = normalizedLabelsFET.filter(l => l === "Packed" || l === "Busy").length;
          const lightDaysFET = normalizedLabelsFET.filter(l => l === "Light").length;

          const strategies = [
            {
              id: "balanced" as const,
              title: "Balanced Trip",
              desc: "Smooth all heavy days — equal distribution of activities",
              icon: "⚖️",
            },
            {
              id: "relaxed" as const,
              title: "Relaxed Trip",
              desc: "Fewer stops per day, more breaks and breathing room",
              icon: "😌",
            },
            {
              id: "flow" as const,
              title: "Keep structure, optimize flow",
              desc: "Keep stops as-is — reduce travel friction and improve order",
              icon: "🔄",
            },
            {
              id: "light_touch" as const,
              title: "Small improvements only",
              desc: "Reorder stops to cut travel time — nothing removed",
              icon: "✨",
            },
          ];

          return (
            <motion.div
              key="fix-entire-trip-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[362] bg-white flex flex-col"
              style={{ overscrollBehavior: "contain" }}
            >
              {/* Header */}
              <div className="flex-shrink-0 px-4 pt-safe pt-4 pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[19px] text-gray-900">Fix Entire Trip</p>
                  {fixEntireTripStep !== "applying" && fixEntireTripStep !== "success" && (
                    <button
                      onClick={() => { setFixEntireTripStep(null); setFixEntireTripProposal([]); setFixEntireTripStrategy(null); }}
                      className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                      data-testid="button-close-fix-entire-trip"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                </div>
                <p className="text-[12px] text-gray-400 mt-0.5">{currentTrip?.name || currentTrip?.destination || "Your trip"}</p>
              </div>

              {/* ─ Diagnosis step ─ */}
              {fixEntireTripStep === "diagnosis" && (
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
                  <div className="rounded-2xl p-4 mb-4" style={{ background: busyDaysFET === 0 ? "#F0FDF4" : "#FFFBEB", border: `1px solid ${busyDaysFET === 0 ? "#BBF7D0" : "#FDE68A"}` }}>
                    <p className="font-bold text-[16px] mb-1" style={{ color: busyDaysFET === 0 ? "#15803D" : "#92400E" }}>
                      {busyDaysFET === 0 ? "Your trip looks good 🎉" : "Your trip can be smoother 👍"}
                    </p>
                    <div className="text-[13px] space-y-1" style={{ color: busyDaysFET === 0 ? "#166534" : "#78350F" }}>
                      {packedDaysFET > 0 && <p>🔴 {packedDaysFET} day{packedDaysFET !== 1 ? "s" : ""} feel{packedDaysFET === 1 ? "s" : ""} packed</p>}
                      {busyDaysFET - packedDaysFET > 0 && <p>🟡 {busyDaysFET - packedDaysFET} day{busyDaysFET - packedDaysFET !== 1 ? "s" : ""} {busyDaysFET - packedDaysFET === 1 ? "is" : "are"} busy</p>}
                      {lightDaysFET > 0 && <p>⚪ {lightDaysFET} day{lightDaysFET !== 1 ? "s" : ""} {lightDaysFET === 1 ? "is" : "are"} light or underused</p>}
                    </div>
                  </div>
                  <p className="text-[12px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Day by day</p>
                  {dayScores.map(d => {
                    const load = getLoadInfoFET(d.score, d.stops.length, normalizedLabelsFET[d.dIdx]);
                    const hasMeal = d.stops.some(s => MEAL_T_FET.has(s.stopType || ""));
                    return (
                      <div key={d.dIdx} className="flex items-center gap-3 mb-2 p-3 rounded-xl border border-gray-100 bg-white">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold bg-gray-100 text-gray-600 shrink-0">{d.dIdx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-gray-800 truncate">Day {d.dIdx + 1}{d.city ? ` — ${d.city}` : ""}</p>
                          <p className="text-[11px] text-gray-400">{d.stops.length} stops{hasMeal ? " · 🍔 Meal" : ""}</p>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: load.color, background: load.color + "15" }}>
                          {load.emoji} {load.label}
                        </span>
                      </div>
                    );
                  })}
                  <div className="mt-4 p-3 rounded-xl bg-blue-50 text-[11px] text-blue-700">
                    ℹ️ Optimizations stay within each city — no stops will move between cities
                  </div>
                  <button
                    onClick={() => setFixEntireTripStep("options")}
                    className="w-full mt-4 py-3.5 rounded-2xl text-[15px] font-bold text-white"
                    style={{ background: "#D4872B" }}
                    data-testid="button-see-options"
                  >
                    See options
                  </button>
                </div>
              )}

              {/* ─ Options step ─ */}
              {fixEntireTripStep === "options" && (
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
                  <p className="text-[14px] text-gray-600 mb-4">Choose how you'd like to balance your trip:</p>
                  <div className="flex flex-col gap-3">
                    {strategies.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setFixEntireTripStrategy(s.id);
                          handleFixEntireTrip(s.id, allDaysFET, getDayScoreFET, getDayCityNameFET);
                        }}
                        className="w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.99]"
                        style={{ borderColor: fixEntireTripStrategy === s.id ? "#D4872B" : "#E5E7EB", background: fixEntireTripStrategy === s.id ? "#FFF9F4" : "white" }}
                        data-testid={`button-strategy-${s.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[24px]">{s.icon}</span>
                          <div>
                            <p className="font-bold text-[14px] text-gray-900">{s.title}</p>
                            <p className="text-[12px] text-gray-500 mt-0.5">{s.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ─ Applying step ─ */}
              {fixEntireTripStep === "applying" && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
                  <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
                  <p className="text-[15px] font-semibold text-gray-700">Analyzing your trip...</p>
                  <p className="text-[12px] text-gray-400 text-center">Making sure all changes stay within each city</p>
                </div>
              )}

              {/* ─ Proposed changes step ─ */}
              {fixEntireTripStep === "changes" && (
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
                  <p className="font-bold text-[16px] text-gray-900 mb-1">Here's what we suggest</p>
                  <p className="text-[12px] text-gray-400 mb-3">All changes are within the same city — nothing will cross city boundaries</p>
                  {/* Impact summary card */}
                  {fixEntireTripProposal.length > 0 && (() => {
                    const daysImproved = fixEntireTripProposal.length;
                    const stopsRemoved = fixEntireTripProposal.reduce((sum, d) => sum + d.stopsToRemove.length, 0);
                    const travelReduced = stopsRemoved * 20;
                    return (
                      <div className="rounded-2xl p-3.5 mb-4" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                        <p className="font-semibold text-[13px] text-green-800 mb-2">After this change:</p>
                        <div className="flex flex-col gap-1">
                          <p className="text-[12px] text-green-700">✔ {daysImproved} day{daysImproved !== 1 ? "s" : ""} will feel lighter</p>
                          {travelReduced > 0 && <p className="text-[12px] text-green-700">✔ Travel reduced by ~{travelReduced} min</p>}
                          <p className="text-[12px] text-green-700">✔ {stopsRemoved} stop{stopsRemoved !== 1 ? "s" : ""} removed — restorable anytime</p>
                        </div>
                      </div>
                    );
                  })()}
                  {fixEntireTripProposal.map((dayProp, pi) => (
                    <div key={pi} className="mb-3 rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                        <p className="font-semibold text-[13px] text-gray-700">Day {dayProp.dayIdx + 1} — {dayProp.cityName || "Your city"}</p>
                      </div>
                      <div className="px-4 py-3 flex flex-col gap-2">
                        {dayProp.stopsToRemove.map(s => (
                          <div key={s.id} className="flex items-start gap-2">
                            <span className="text-red-400 mt-0.5 text-[12px]">−</span>
                            <div>
                              <p className="text-[13px] text-gray-700 line-through">{s.name}</p>
                              <p className="text-[11px] text-gray-400">{s.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 p-3 rounded-xl bg-blue-50 text-[11px] text-blue-700 mb-4">
                    ℹ️ These stops can be restored any time using the undo button after applying
                  </div>
                  <button
                    onClick={applyFixEntireTrip}
                    className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white mb-2"
                    style={{ background: "#D4872B" }}
                    data-testid="button-apply-entire-trip"
                  >
                    Apply changes
                  </button>
                  <button
                    onClick={() => { setFixEntireTripStep("options"); setFixEntireTripProposal([]); }}
                    className="w-full py-3 rounded-2xl text-[14px] font-semibold text-gray-600 border border-gray-200"
                    data-testid="button-back-to-options"
                  >
                    Back to options
                  </button>
                </div>
              )}

              {/* ─ Success step ─ */}
              {fixEntireTripStep === "success" && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
                  <div className="text-[48px]">{fixEntireTripStrategy === "light_touch" ? "✨" : fixEntireTripStrategy === "relaxed" ? "😌" : "👍"}</div>
                  <p className="font-bold text-[20px] text-gray-900">
                    {fixEntireTripStrategy === "light_touch" ? "Stops reordered" : fixEntireTripStrategy === "flow" ? "Looks good already" : "That looks better"}
                  </p>
                  <p className="text-[14px] text-gray-500">
                    {fixEntireTripStrategy === "light_touch" ? "Stops reordered to reduce travel within each day" : fixEntireTripStrategy === "flow" ? "Your trip structure is already optimised" : "Your trip is now smoother for the whole family"}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Weather Fix Sheet — Today screen */}
      <AnimatePresence>
        {showWeatherFixSheetToday && (() => {
          const todayStopsLocal = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops).filter(s => !skippedStopIds.includes(s.id));
          const unvisited = todayStopsLocal.filter(s => !s.isVisited);
          const affectedStop = unvisited.find(s => OUTDOOR_STOP_TYPES_W.has(s.stopType ?? "")) ?? null;
          const stopEmojiMap: Record<string, string> = { museum: "🏛️", nature: "🌿", beach: "🏖️", park: "🌳", zoo: "🐾", aquarium: "🐠", restaurant: "🍽️", landmark: "📍", market: "🛒", viewpoint: "🌅", garden: "🌸", playground: "🎠" };
          const stopEmoji = (t?: string | null) => stopEmojiMap[t ?? ""] ?? "📍";
          return (
            <motion.div
              key="weather-fix-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[365] bg-black/40 flex items-end justify-center"
              onClick={(e) => { if (e.target === e.currentTarget) setShowWeatherFixSheetToday(false); }}
              data-testid="sheet-weather-fix-today"
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full max-w-lg rounded-t-3xl bg-white px-5 pt-4 pb-10 overflow-y-auto"
                style={{ maxHeight: "82vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.14)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4" />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-base font-bold text-slate-800">Rain may affect your day</div>
                    <p className="text-xs text-slate-400 mt-0.5">Here's a quick fix — you stay in control</p>
                  </div>
                  <button onClick={() => setShowWeatherFixSheetToday(false)} className="p-2 rounded-full hover:bg-slate-100 shrink-0 -mt-1" data-testid="button-close-weather-fix-today">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {affectedStop && (
                  <div className="mb-4">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Affected stop</p>
                    <div className="rounded-2xl px-4 py-3 flex items-start gap-3" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }} data-testid="card-affected-stop-today">
                      <span className="text-xl shrink-0">{stopEmoji(affectedStop.stopType)}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{affectedStop.name}</p>
                        <p className="text-xs text-amber-700 mt-0.5">⚠ Best in dry weather — outdoor</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Suggested swap</p>
                  {loadingWeatherSuggestion ? (
                    <div className="rounded-2xl px-4 py-4 flex items-center gap-3 border border-slate-100 bg-slate-50" data-testid="card-suggestion-loading-today">
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                      <p className="text-sm text-slate-400">Finding a great indoor alternative…</p>
                    </div>
                  ) : weatherIndoorSuggestion ? (
                    <div className="rounded-2xl px-4 py-3.5" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }} data-testid="card-indoor-suggestion-today">
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0">{stopEmoji(weatherIndoorSuggestion.stopType)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-blue-900">{weatherIndoorSuggestion.name}</p>
                          <p className="text-xs text-blue-700 mt-0.5">{weatherIndoorSuggestion.description}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-blue-500"><Clock className="w-3 h-3 inline mr-0.5" />{weatherIndoorSuggestion.duration}</span>
                            <span className="text-[11px] text-blue-500">🏠 Indoor</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl px-4 py-4 border border-slate-100 bg-slate-50" data-testid="card-no-suggestion-today">
                      <p className="text-sm text-slate-500">No suggestion available — try adjusting your plan manually.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  {weatherIndoorSuggestion && affectedStop && (
                    <button
                      onClick={async () => {
                        if (!weatherIndoorSuggestion || !affectedStop || !tripId) return;
                        setApplyingWeatherSwap(true);
                        try {
                          await deleteStop(affectedStop.id);
                          await addStop(tripId, {
                            name: weatherIndoorSuggestion.name,
                            stopType: weatherIndoorSuggestion.stopType,
                            displayOrder: affectedStop.displayOrder ?? 999,
                            durationMinutes: (() => { const m = (weatherIndoorSuggestion.duration || "").match(/(\d+)/); return m ? parseInt(m[1], 10) : 60; })(),
                          });
                          await fetchTrip(tripId);
                          setShowWeatherFixSheetToday(false);
                          setWeatherBannerDismissedToday(true);
                          toast.success(`Swapped to ${weatherIndoorSuggestion.name} ✓`);
                        } catch {
                          toast.error("Couldn't apply the swap — please try again");
                        } finally {
                          setApplyingWeatherSwap(false);
                        }
                      }}
                      disabled={applyingWeatherSwap}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-sm font-bold transition-opacity active:opacity-80 disabled:opacity-60"
                      style={{ background: "#2563EB" }}
                      data-testid="button-apply-weather-swap-today"
                    >
                      {applyingWeatherSwap ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Apply this change
                    </button>
                  )}
                  <button
                    onClick={() => setShowWeatherFixSheetToday(false)}
                    className="w-full py-4 rounded-2xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                    data-testid="button-keep-original-plan-today"
                  >
                    Keep original plan
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Lighter Day Preview Sheet */}
      <AnimatePresence>
        {lighterDayProposal !== null && (
          <motion.div
            key="lighter-day-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[365] bg-black/40 flex items-end justify-center"
            onClick={() => { if (!lighterDayProposal?.loading) setLighterDayProposal(null); }}
            data-testid="lighter-day-sheet-backdrop"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-4 pb-8 shadow-2xl"
              onClick={e => e.stopPropagation()}
              data-testid="lighter-day-sheet"
            >
              <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-5" />

              {lighterDayProposal?.loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <div className="w-8 h-8 rounded-full border-4 border-orange-300 border-t-orange-500 animate-spin" />
                  <p className="text-sm font-medium text-gray-500">Analyzing your day...</p>
                </div>
              ) : (
                <>
                  <p className="text-base font-bold text-gray-900 mb-1">✨ We made your day easier</p>
                  {lighterDayProposal?.explanation && (
                    <p className="text-xs text-gray-500 mb-4">{lighterDayProposal.explanation}</p>
                  )}

                  {/* Diff list */}
                  <div className="space-y-2 mb-4">
                    {lighterDayProposal?.stopsToRemove?.map((s: LighterDayStop) => (
                      <div
                        key={s.id}
                        className="flex items-start gap-3 p-3 rounded-xl"
                        style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
                        data-testid={`lighter-day-remove-${s.id}`}
                      >
                        <span className="text-sm shrink-0 mt-0.5">➖</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 leading-tight">{s.name}</p>
                          {s.reason && <p className="text-[11px] text-red-500 mt-0.5 leading-tight">{s.reason}</p>}
                        </div>
                      </div>
                    ))}
                    {lighterDayProposal?.stopsToKeep?.filter((s: LighterDayStop) => s.anchorReason).map((s: LighterDayStop) => (
                      <div
                        key={s.id}
                        className="flex items-start gap-3 p-3 rounded-xl"
                        style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
                        data-testid={`lighter-day-keep-${s.id}`}
                      >
                        <span className="text-sm shrink-0 mt-0.5">⭐</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 leading-tight">{s.name}</p>
                          <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">anchor</span>
                          {s.anchorReason && <p className="text-[11px] text-green-600 mt-0.5 leading-tight">{s.anchorReason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time savings */}
                  {(lighterDayProposal?.oldTotalMinutes ?? 0) > 0 && (
                    <div
                      className="flex items-center gap-2 p-3 rounded-xl mb-4"
                      style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}
                    >
                      <span className="text-sm">⏱</span>
                      <p className="text-sm font-semibold text-orange-800">
                        {Math.round((lighterDayProposal?.newTotalMinutes ?? 0) / 60 * 10) / 10} hrs instead of {Math.round((lighterDayProposal?.oldTotalMinutes ?? 0) / 60 * 10) / 10} hrs
                      </p>
                    </div>
                  )}

                  {/* Reassurance */}
                  <p className="text-[11px] text-gray-400 text-center mb-5">We kept your most important stops</p>

                  {/* Action buttons */}
                  <button
                    onClick={applyLighterDayProposal}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold text-white mb-2 transition-all active:scale-[0.98]"
                    style={{ background: '#f97316' }}
                    data-testid="button-lighter-day-apply"
                  >
                    Apply changes
                  </button>
                  <button
                    onClick={() => setLighterDayProposal(null)}
                    className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all active:scale-[0.98]"
                    data-testid="button-lighter-day-keep-original"
                  >
                    Keep original
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rough Day Bottom Sheet */}
      <AnimatePresence>
        {roughDaySheetOpen && (() => {
          const todayRoughStops = dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops;
          const roughUnvisited = todayRoughStops.filter(s => !s.isVisited);
          const roughDayOptions = [
            {
              id: "running_late",
              emoji: "⏱",
              label: "I'm running late",
              desc: roughUnvisited.length > 2 ? "Remove 2 stops to get back on track" : "Remove 1 stop to get back on track",
              disabled: roughUnvisited.length === 0,
            },
            {
              id: "kids_tired",
              emoji: "😴",
              label: "Kids are tired",
              desc: "Find a nearby rest spot + lighten the day",
              disabled: roughUnvisited.length === 0,
            },
            {
              id: "too_much",
              emoji: "😩",
              label: "Too much planned",
              desc: "Keep only the must-see stops for today",
              disabled: roughUnvisited.length === 0,
            },
            {
              id: "skip_next",
              emoji: "⏭",
              label: "Skip next stop",
              desc: roughUnvisited.length > 0 ? `Skip "${roughUnvisited[0].name}"` : "No more stops",
              disabled: roughUnvisited.length === 0,
            },
          ];
          return (
            <motion.div
              key="rough-day-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[360] bg-black/40 flex items-end justify-center"
              onClick={() => { if (!roughDayProcessing) setRoughDaySheetOpen(false); }}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-4 pb-8 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-5" />
                <p className="text-base font-bold text-gray-900 mb-0.5">Adjust your day</p>
                <p className="text-xs text-gray-400 mb-4">We'll handle the rest instantly</p>
                <div className="space-y-2">
                  {roughDayOptions.map(opt => (
                    <button
                      key={opt.id}
                      disabled={opt.disabled || roughDayProcessing !== null}
                      onClick={() => {
                        if (opt.id === "skip_next") {
                          setRoughDaySheetOpen(false);
                          setConfirmSkipNext(roughUnvisited[0] ?? null);
                        } else if (opt.id === "running_late" || opt.id === "kids_tired" || opt.id === "too_much") {
                          handleMakeDayLighter(roughUnvisited, opt.id as "running_late" | "kids_tired" | "too_much");
                        } else {
                          handleRoughDayAction(opt.id, roughUnvisited);
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 hover:bg-gray-50 active:scale-[0.98] transition-all text-left disabled:opacity-50 disabled:pointer-events-none"
                      data-testid={`button-rough-day-${opt.id}`}
                    >
                      <span className="text-xl shrink-0">{opt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{opt.label}</p>
                        <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{opt.desc}</p>
                      </div>
                      {roughDayProcessing === opt.id ? (
                        <div className="w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Live Adjustment Engine: Result card + confirmation sheet */}
      <AnimatePresence>
        {optimizeProposal != null && (
          <>
            <motion.div
              key="opt-proposal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[370] bg-black/40"
              onClick={() => { setOptimizeProposal(null); setOptimizeTrigger(null); setOptimizeIsSuggestion(false); }}
            />
            <motion.div
              key="opt-proposal-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[380] rounded-t-3xl px-5 pt-5 pb-10 bg-white"
              style={{ maxHeight: "85vh", overflowY: "auto" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />

              {/* Title + confidence badge */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-[18px] font-bold text-gray-900 leading-snug flex-1">
                  {optimizeProposal.result?.title ?? (
                    optimizeProposal.size === "big"
                      ? "Here's what will change"
                      : optimizeIsSuggestion
                      ? "Here's a suggestion"
                      : "Adjust your day?"
                  )}
                </p>
                {optimizeProposal.result?.confidenceLevel && (
                  <span
                    className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full mt-0.5"
                    style={{
                      background: optimizeProposal.result.confidenceLevel === "high" ? "#E8F3EC" : optimizeProposal.result.confidenceLevel === "medium" ? "#FFF4E5" : "#F2F0ED",
                      color: optimizeProposal.result.confidenceLevel === "high" ? "#2E7D4F" : optimizeProposal.result.confidenceLevel === "medium" ? "#E67E22" : "#888",
                    }}
                    data-testid="badge-confidence-level"
                  >
                    {optimizeProposal.result.confidenceLevel === "high" ? "High confidence" : optimizeProposal.result.confidenceLevel === "medium" ? "Good fit" : "Approximate"}
                  </span>
                )}
              </div>

              {/* Explanation */}
              <p className="text-[13px] text-gray-500 mb-4 leading-snug">
                {optimizeProposal.result?.explanation ?? optimizeProposal.summary}
              </p>

              {/* Changes made — bullet list (uses typed ChangeMade[] from result) */}
              {(() => {
                const changes: { stopName: string; changeKind: string; details: string }[] =
                  optimizeProposal.result?.changesMade && optimizeProposal.result.changesMade.length > 0
                    ? optimizeProposal.result.changesMade.map(c => ({
                        stopName: c.stopName,
                        changeKind: c.changeKind,
                        details: c.details,
                      }))
                    : optimizeProposal.affected.map(a => ({
                        stopName: a.stopName,
                        changeKind: a.changeKind,
                        details: a.details,
                      }));
                if (changes.length === 0) return null;
                return (
                  <div className="space-y-2 mb-4" data-testid="list-changes-made">
                    {changes.map((c, i) => {
                      const emoji =
                        c.changeKind === "remove" ? "🗑" :
                        c.changeKind === "insert_break" ? "☕" :
                        c.changeKind === "insert_delight" ? "🎉" :
                        c.changeKind === "shorten" ? "⚡" :
                        c.changeKind === "replace" ? "🔄" :
                        "🔁";
                      return (
                        <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ background: "#F8F5F1" }}
                          data-testid={`change-item-${i}`}>
                          <span className="text-[14px] leading-none mt-0.5">{emoji}</span>
                          <div>
                            <p className="text-[13px] font-semibold text-gray-800">{c.stopName}</p>
                            <p className="text-[11px] text-gray-500">{c.details}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Updated flow preview */}
              {optimizeProposal.result?.updatedFlow && optimizeProposal.result.updatedFlow.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Updated stop order</p>
                  <div className="flex flex-col gap-1">
                    {optimizeProposal.result.updatedFlow
                      .filter(s => !s.isVisited)
                      .slice(0, 5)
                      .map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2 text-[12px] text-gray-600"
                          data-testid={`flow-stop-${i}`}>
                          <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                            style={{ background: "#E8742B" }}>{i + 1}</span>
                          <span className="truncate">{s.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Alternatives */}
              {optimizeProposal.result?.alternatives && optimizeProposal.result.alternatives.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Alternatives</p>
                  <div className="space-y-1.5">
                    {optimizeProposal.result.alternatives.map((alt, i) => (
                      <div key={i} className="px-3 py-2 rounded-xl" style={{ background: "#F0EDEA" }}>
                        <p className="text-[12px] font-semibold text-gray-700">{alt.label}</p>
                        <p className="text-[11px] text-gray-500">{alt.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA buttons */}
              <button
                onClick={() => {
                  const todayStopsNow = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops).filter(s => !skippedStopIds.includes(s.id));
                  const proposal = optimizeProposal;
                  const trigger = optimizeTrigger || "running_late";
                  const removedNames = proposal.affected.filter(a => a.changeKind === "remove").map(a => a.stopName);
                  const doApply = async () => {
                    setOptimizeProposal(null);
                    setOptimizeIsSuggestion(false);
                    await applyOptimizeProposal(proposal, trigger, todayStopsNow, true);
                    // Refresh Daily Maps using engine's accurate updatedFlow projection
                    const projectedStops = proposal.result?.updatedFlow
                      ? todayStopsNow.filter(s => proposal.result!.updatedFlow.some(u => u.id === s.id))
                      : (() => {
                          const removedIds = new Set(proposal.affected.filter(a => a.changeKind === "remove").map(a => a.stopId));
                          return todayStopsNow.filter(s => !removedIds.has(s.id));
                        })();
                    const updBundle = generateDayRouteVariants(projectedStops, selectedMealRecs);
                    setDayRouteBundle(updBundle);
                  };
                  if (removedNames.length > 0) {
                    setConfirmRemoveDialog({ stopNames: removedNames, onConfirm: doApply });
                  } else {
                    doApply();
                  }
                }}
                className="w-full h-[52px] rounded-2xl text-[15px] font-bold text-white mb-3 active:scale-[0.98] transition-all"
                style={{ background: "#E8742B" }}
                data-testid={`button-optimize-${optimizeProposal.size}-apply`}
              >
                {optimizeProposal.size === "big" ? "Apply changes" : "Update my plan"}
              </button>
              <button
                onClick={async () => {
                  const currentStops = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops).filter(s => !skippedStopIds.includes(s.id));
                  const proposal = optimizeProposal;
                  const trigger = optimizeTrigger || "running_late";
                  const removedNames = proposal.affected.filter(a => a.changeKind === "remove").map(a => a.stopName);
                  const doRunDay = async () => {
                    setOptimizeProposal(null);
                    setOptimizeIsSuggestion(false);
                    await applyOptimizeProposal(proposal, trigger, currentStops, true);
                    const removedIds = new Set(proposal.affected.filter(a => a.changeKind === "remove").map(a => a.stopId));
                    let projectedStops = currentStops.filter(s => !removedIds.has(s.id));
                    const reorders = proposal.affected.filter(a => a.changeKind === "reorder");
                    if (reorders.length >= 2) {
                      const reorderIds = reorders.map(r => r.stopId);
                      const toSwap = projectedStops.filter(s => reorderIds.includes(s.id));
                      if (toSwap.length >= 2) {
                        const idxA = projectedStops.indexOf(toSwap[0]);
                        const idxB = projectedStops.indexOf(toSwap[1]);
                        if (idxA >= 0 && idxB >= 0) {
                          const copy = [...projectedStops];
                          [copy[idxA], copy[idxB]] = [copy[idxB], copy[idxA]];
                          projectedStops = copy;
                        }
                      }
                    }
                    // Refresh Daily Maps route bundle
                    const updBundle = generateDayRouteVariants(projectedStops, selectedMealRecs);
                    setDayRouteBundle(updBundle);
                    setDayRouteSheetOpen(true);
                  };
                  if (removedNames.length > 0) {
                    setConfirmRemoveDialog({ stopNames: removedNames, onConfirm: doRunDay });
                  } else {
                    doRunDay();
                  }
                }}
                className="w-full h-[44px] rounded-2xl text-[14px] font-semibold mb-2 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                style={{ background: "#FFF4E5", color: "#E67E22" }}
                data-testid="button-run-updated-day"
              >
                Run updated day →
              </button>
              <button
                onClick={() => { setOptimizeProposal(null); setOptimizeTrigger(null); setOptimizeIsSuggestion(false); }}
                className="w-full h-[44px] rounded-2xl text-[14px] font-semibold text-gray-500 active:scale-[0.98] transition-all"
                style={{ background: "#F2F2F0" }}
                data-testid={`button-optimize-${optimizeProposal.size}-cancel`}
              >
                Keep original
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm Remove Dialog */}
      {confirmRemoveDialog && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center px-5 bg-black/50" onClick={() => setConfirmRemoveDialog(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">⚠️</span>
            </div>
            <h3 className="text-[17px] font-bold text-gray-900 text-center mb-2">Stops will be removed</h3>
            <p className="text-[13px] text-gray-500 text-center mb-4 leading-snug">
              These stops will be permanently removed from your plan. You can add them back using <strong>Add Stop</strong>.
            </p>
            <div className="space-y-2 mb-5">
              {confirmRemoveDialog.stopNames.map((name, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#FFF4E5" }}>
                  <span className="text-sm">🗑</span>
                  <p className="text-[13px] font-semibold text-gray-800">{name}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => { const fn = confirmRemoveDialog.onConfirm; setConfirmRemoveDialog(null); fn(); }}
              className="w-full h-[50px] rounded-2xl text-[15px] font-bold text-white mb-2 active:scale-[0.98] transition-all"
              style={{ background: "#E8742B" }}
              data-testid="button-confirm-remove-stops"
            >
              Yes, remove stops
            </button>
            <button
              onClick={() => setConfirmRemoveDialog(null)}
              className="w-full h-[44px] rounded-2xl text-[14px] font-semibold text-gray-500"
              style={{ background: "#F2F2F0" }}
              data-testid="button-cancel-remove-stops"
            >
              Keep original
            </button>
          </div>
        </div>
      )}

      {/* ── LINK PASS TO STOP SHEET ── */}
      <AnimatePresence>
        {linkingPassId && (
          <motion.div
            className="fixed inset-0 z-[9980] flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setLinkingPassId(null)} />
            <motion.div
              className="relative bg-white rounded-t-3xl overflow-hidden"
              style={{ maxHeight: '70vh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="font-bold text-gray-900 text-[17px]">Which stop is this for?</h3>
                <button
                  onClick={() => setLinkingPassId(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-bold"
                >×</button>
              </div>
              <div className="overflow-y-auto pb-8 px-4 space-y-2" style={{ maxHeight: 'calc(70vh - 64px)' }}>
                {sortedStops.map((stop) => {
                  const stopCfg = getStopConfig(stop.stopType);
                  return (
                    <button
                      key={stop.id}
                      className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-white hover:bg-orange-50 hover:border-orange-200 transition-all active:scale-[0.98] p-3"
                      data-testid={`button-link-pass-to-${stop.id}`}
                      onClick={async () => {
                        const itemId = linkingPassId;
                        setLinkingPassId(null);
                        try {
                          const res = await fetch(`/api/travel/wallet/${itemId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ stopId: stop.id }),
                          });
                          if (res.ok) {
                            const updated = await res.json();
                            setWalletItems(prev => prev.map(w => w.id === itemId ? updated : w));
                            toast.success(`Pass linked to ${stop.name} ✅`);
                          }
                        } catch {
                          toast.error('Could not link pass');
                        }
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br ${stopCfg.gradient}`}>
                        <span style={{ fontSize: 20 }}>{stopCfg.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`font-semibold text-sm truncate ${stop.isVisited ? 'text-gray-400' : 'text-gray-900'}`}>{stop.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">{stopCfg.label}{stop.isVisited ? ' · ✓ Visited' : ''}</p>
                      </div>
                      <CheckCircle className={`w-4 h-4 shrink-0 ${stopHasTicket(stop) ? 'text-green-400' : 'text-gray-200'}`} />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CHANGE STOP SHEET ── */}
      <AnimatePresence>
        {showChangeStopSheet && (
          <motion.div
            className="fixed inset-0 z-[9980] flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowChangeStopSheet(false)} />
            <motion.div
              className="relative bg-white rounded-t-3xl overflow-hidden"
              style={{ maxHeight: '80vh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="font-bold text-gray-900 text-[18px]">Where to next?</h3>
                <button
                  onClick={() => setShowChangeStopSheet(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-bold"
                  data-testid="button-change-stop-close"
                >
                  ×
                </button>
              </div>
              <div className="overflow-y-auto pb-8" style={{ maxHeight: 'calc(80vh - 64px)' }}>
                {/* Follow planned route option */}
                <div className="px-4 mb-3">
                  <button
                    onClick={() => { setForcedCurrentStop(null); setShowChangeStopSheet(false); }}
                    className="w-full flex items-center gap-3 rounded-2xl border-2 transition-all active:scale-[0.98]"
                    style={{ background: '#FFF7EE', borderColor: '#E67E22', padding: '14px 16px' }}
                    data-testid="button-change-stop-follow-route"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#FEE4C8' }}>
                      <span style={{ fontSize: 20 }}>🗺️</span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-sm" style={{ color: '#E67E22' }}>Follow Planned Route</p>
                      <p className="text-xs text-orange-400 mt-0.5">{sortedStops.find(s => !s.isVisited)?.name || "All stops visited"}</p>
                    </div>
                    {!forcedCurrentStop && <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />}
                  </button>
                </div>
                {/* All stops */}
                <div className="px-4 space-y-2">
                  {sortedStops.map((stop) => {
                    const stopCfg = getStopConfig(stop.stopType);
                    const isSelected = forcedCurrentStop?.id === stop.id;
                    return (
                      <button
                        key={stop.id}
                        onClick={() => { setForcedCurrentStop(stop); setShowChangeStopSheet(false); }}
                        className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition-all active:scale-[0.98]"
                        style={{ padding: '12px 14px', ...(isSelected ? { background: '#FFF7EE', borderColor: '#E67E22' } : {}) }}
                        data-testid={`button-change-stop-${stop.id}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br ${stopCfg.gradient}`}>
                          <span style={{ fontSize: 20 }}>{stopCfg.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className={`font-semibold text-sm truncate ${stop.isVisited ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{stop.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">{stopCfg.label}{stop.isVisited ? ' · ✓ Visited' : ''}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Missing Dates Prompt */}
      {showDatesPrompt && (
        <div className="fixed inset-0 z-[9995] flex items-center justify-center px-5 bg-black/50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-3xl text-center mb-3">📅</div>
            <h3 className="text-[18px] font-bold text-gray-900 text-center mb-1">When is your trip?</h3>
            <p className="text-[13px] text-gray-500 text-center mb-5 leading-snug">
              Adding dates helps us show today's stops, track your progress, and know when your adventure is complete.
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[12px] font-semibold text-gray-500 block mb-1">Start date</label>
                <input
                  type="date"
                  value={datesPromptStart}
                  onChange={e => setDatesPromptStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  data-testid="input-dates-prompt-start"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-gray-500 block mb-1">End date</label>
                <input
                  type="date"
                  value={datesPromptEnd}
                  onChange={e => setDatesPromptEnd(e.target.value)}
                  min={datesPromptStart}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  data-testid="input-dates-prompt-end"
                />
              </div>
            </div>
            <button
              disabled={!datesPromptStart || !datesPromptEnd || savingDates}
              onClick={async () => {
                if (!datesPromptStart || !datesPromptEnd) return;
                setSavingDates(true);
                try {
                  await fetch(`/api/travel/trips/${tripId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ startDate: datesPromptStart, endDate: datesPromptEnd }),
                  });
                  localStorage.setItem(`geoquest_dates_prompt_${tripId}`, Date.now().toString());
                  await fetchTrip(tripId);
                  setShowDatesPrompt(false);
                  toast.success("Trip dates saved!");
                } catch {
                  toast.error("Failed to save dates — please try again");
                } finally {
                  setSavingDates(false);
                }
              }}
              className="w-full h-[50px] rounded-2xl text-[15px] font-bold text-white mb-2 active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ background: "#E8962F" }}
              data-testid="button-dates-prompt-save"
            >
              {savingDates ? "Saving…" : "Save Dates"}
            </button>
            <button
              onClick={() => {
                localStorage.setItem(`geoquest_dates_prompt_${tripId}`, Date.now().toString());
                setShowDatesPrompt(false);
              }}
              className="w-full h-[44px] rounded-2xl text-[14px] font-semibold text-gray-400 bg-gray-50"
              data-testid="button-dates-prompt-skip"
            >
              I'll add dates later
            </button>
          </div>
        </div>
      )}

      {/* Mark Visited Confirmation Dialog */}
      {showMarkVisitedConfirm && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center px-5 bg-black/50" onClick={() => setShowMarkVisitedConfirm(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-[17px] font-bold text-gray-900 text-center mb-2">Mark as visited?</h3>
            <p className="text-[13px] text-gray-500 text-center mb-5 leading-snug">
              This action cannot be undone. This will mark <strong>{showMarkVisitedConfirm.name}</strong> as completed and move to the next stop.
            </p>
            <button
              onClick={async () => {
                const stop = showMarkVisitedConfirm;
                setShowMarkVisitedConfirm(null);
                await markStopVisited(stop.id);
                toast.success(`${stop.name} marked as visited!`);
                setActiveTab("todays_plan");
                // Post-meal delight nudge — fire 2s after visiting a food/restaurant stop
                const isFoodStop = stop.stopType === "food" || stop.stopType === "restaurant" || stop.stopType === "street_food";
                if (isFoodStop) {
                  setTimeout(() => {
                    setGeoBuddySuggestion({
                      message: "Good choice — want to add a quick treat before your next stop? 🍦",
                      primaryAction: { label: "Add ice cream stop", onClick: () => openFoodPicker("dessert") },
                      secondaryAction: { label: "Skip", onClick: () => {} },
                    });
                  }, 2000);
                }
              }}
              className="w-full h-[50px] rounded-2xl text-[15px] font-bold text-white mb-2 active:scale-[0.98] transition-all bg-orange-500 hover:bg-orange-600"
              data-testid="button-confirm-mark-visited"
            >
              Mark Visited
            </button>
            <button
              onClick={() => setShowMarkVisitedConfirm(null)}
              className="w-full h-[44px] rounded-2xl text-[14px] font-semibold text-gray-500 bg-gray-100"
              data-testid="button-cancel-mark-visited"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Day Route Bottom Sheet */}
      <AnimatePresence>
        {dayRouteSheetOpen && dayRouteBundle && (
          <DayRouteBottomSheet
            bundle={dayRouteBundle}
            open={dayRouteSheetOpen}
            onClose={() => setDayRouteSheetOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Food Nearby Bottom Sheet */}
      <AnimatePresence>
        {showFoodSheet && (() => {
          const currentStop = sortedStops.find(s => !s.isVisited) || null;
          const suggestions = needRecState.suggestions;
          return (
            <motion.div
              key="food-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[360] bg-black/40 flex items-end justify-center"
              onClick={() => setShowFoodSheet(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-4" />
                <p className="text-base font-bold text-gray-900 mb-0.5">🍽️ Food nearby</p>
                <p className="text-xs text-gray-400 mb-4">
                  {currentStop ? `Near ${currentStop.name}` : currentTrip?.destination}
                </p>
                {needRecState.loading ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                    <p className="text-sm text-gray-400">Finding nearby options…</p>
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="space-y-2">
                    {suggestions.map((s: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-100 bg-gray-50">
                        <span className="text-xl shrink-0">🍴</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{s.name}</p>
                          {s.type && <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{s.type}</p>}
                        </div>
                        <button
                          onClick={() => {
                            window.open(`https://maps.google.com/?q=${encodeURIComponent(s.name + " " + (currentTrip?.destination || ""))}`, "_blank");
                          }}
                          className="shrink-0 text-[11px] font-semibold text-orange-600 border border-orange-200 rounded-xl px-2.5 py-1.5 hover:bg-orange-50 transition-colors"
                        >
                          Directions
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=kid-friendly+restaurant+near+${encodeURIComponent(currentStop?.name || currentTrip?.destination || "")}`, "_blank")}
                      className="w-full mt-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      See all on Google Maps →
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">No suggestions found</p>
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=kid-friendly+restaurant+near+${encodeURIComponent(currentStop?.name || currentTrip?.destination || "")}`, "_blank")}
                      className="mt-3 py-2.5 px-5 rounded-2xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
                    >
                      Search on Google Maps
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Conflict Modal — adding stop that pushes next stop later */}
      <AnimatePresence>
        {conflictModal?.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[320] flex items-center justify-center bg-black/50 px-4"
            onClick={() => setConflictModal(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <span className="text-3xl">⚠️</span>
                <h3 className="font-bold text-gray-900 text-base mt-2">This addition shifts the next stop</h3>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4 mb-3">
                <p className="text-xs font-bold text-orange-800 mb-2">Adding: <span className="text-gray-900">{conflictModal.newStopName}</span></p>
                <p className="text-xs text-orange-700">
                  This will push <span className="font-bold text-gray-900">{conflictModal.nextStop?.name}</span> from{" "}
                  <span className="font-bold">{conflictModal.nextStopOldTime}</span> to{" "}
                  <span className="font-bold">{conflictModal.nextStopNewTime}</span>
                </p>
                <p className="text-[10px] text-orange-600 mt-1.5 italic">
                  Starts now · includes stop time + 20 min travel
                </p>
              </div>
              {conflictModal.ticketedStops.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">🎟</span>
                    <p className="text-xs font-bold text-red-800">Check your reservations!</p>
                  </div>
                  <p className="text-xs text-red-700 mb-2">
                    {conflictModal.ticketedStops.length === 1
                      ? "This stop has a ticket or booking that may be impacted:"
                      : "These upcoming stops have tickets or bookings that may be impacted:"}
                  </p>
                  {conflictModal.ticketedStops.map((ts, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1">
                      <span className="text-red-400 text-xs mt-0.5">•</span>
                      <div>
                        <span className="text-xs font-semibold text-gray-900">{ts.name}</span>
                        {ts.scheduledTime ? <span className="text-[10px] text-red-600"> · {ts.scheduledTime}</span> : null}
                        <p className="text-[10px] text-red-500">Pass: {ts.ticketLabel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setConflictModal(null)}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (conflictModal) {
                      doAddNeedRecStop(conflictModal.newStopName, conflictModal.newStopType, conflictModal.insertDisplayOrder);
                    }
                  }}
                  className="flex-[2] py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
                >
                  Add & move stop →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meal Recommendations Modal */}
      <AnimatePresence>
        {mealRecState.visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-end justify-center bg-black/40"
            onClick={() => { if (!mealRecPendingRec) setMealRecState(s => ({ ...s, visible: false })); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto pb-safe-bottom"
              onClick={e => e.stopPropagation()}
              data-testid="meal-recs-modal"
            >
              {/* Placement picker overlay — shown when user taps "Add to plan" */}
              {mealRecPendingRec && (() => {
                const todayStopsForPlacement = dayGroups[activeDay] || [];
                const recommendedStopId = mealRecState.beforeStop?.id ?? null;
                return (
                  <div className="px-5 pt-5 pb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={() => { setMealRecPendingRec(null); setMealRecPlacementStopId(null); }}
                        className="p-1.5 rounded-full hover:bg-gray-100"
                        data-testid="button-meal-placement-back"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base">Where should we fit this?</h3>
                        <p className="text-[11px] text-gray-400 truncate">{mealRecPendingRec.rec.name}</p>
                      </div>
                      <button onClick={() => { setMealRecPendingRec(null); setMealRecPlacementStopId(null); setMealRecState(s => ({ ...s, visible: false })); }} className="p-1.5 rounded-full hover:bg-gray-100">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {/* Start of day option */}
                      {todayStopsForPlacement.length > 0 && (
                        <button
                          onClick={() => setMealRecPlacementStopId("start")}
                          className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${mealRecPlacementStopId === "start" ? "border-orange-400 bg-orange-50" : "border-gray-100 bg-white hover:bg-gray-50"}`}
                          data-testid="button-meal-placement-start"
                        >
                          <span className="text-lg">🌅</span>
                          <span className="text-sm font-semibold text-gray-800 flex-1">Start of day</span>
                        </button>
                      )}

                      {todayStopsForPlacement.map((stop: TravelStop) => {
                        const isRecommended = stop.id === recommendedStopId;
                        const stopIdKey = stop.id ?? stop.name;
                        return (
                          <button
                            key={stop.id}
                            onClick={() => setMealRecPlacementStopId(stopIdKey)}
                            className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${mealRecPlacementStopId === stopIdKey ? "border-orange-400 bg-orange-50" : "border-gray-100 bg-white hover:bg-gray-50"}`}
                            data-testid={`button-meal-placement-after-${stop.id}`}
                          >
                            <span className="text-lg">📍</span>
                            <span className="text-sm font-semibold text-gray-800 flex-1">After {stop.name}</span>
                            {isRecommended && (
                              <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">Recommended</span>
                            )}
                          </button>
                        );
                      })}

                      {/* End of day */}
                      <button
                        onClick={() => setMealRecPlacementStopId("end")}
                        className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${mealRecPlacementStopId === "end" ? "border-orange-400 bg-orange-50" : "border-gray-100 bg-white hover:bg-gray-50"}`}
                        data-testid="button-meal-placement-end"
                      >
                        <span className="text-lg">🌇</span>
                        <span className="text-sm font-semibold text-gray-800 flex-1">End of day</span>
                      </button>
                    </div>

                    <button
                      disabled={!mealRecPlacementStopId}
                      onClick={async () => {
                        if (!mealRecPlacementStopId || !mealRecPendingRec) return;
                        const rec = mealRecPendingRec.rec;
                        let insertAtOrder: number | undefined;
                        let cityGroup: string | null = null;
                        const stopsForDay = dayGroups[activeDay] || [];
                        if (mealRecPlacementStopId === "start" && stopsForDay.length > 0) {
                          insertAtOrder = (stopsForDay[0].displayOrder ?? 0);
                          cityGroup = (stopsForDay[0] as any)?.cityGroup ?? null;
                        } else if (mealRecPlacementStopId === "end") {
                          const lastS = stopsForDay[stopsForDay.length - 1];
                          insertAtOrder = lastS ? ((lastS.displayOrder ?? 0) + 1) : undefined;
                          cityGroup = (lastS as any)?.cityGroup ?? null;
                        } else {
                          const afterStop = stopsForDay.find((s: TravelStop) => (s.id ?? s.name) === mealRecPlacementStopId);
                          if (afterStop) {
                            insertAtOrder = (afterStop.displayOrder ?? 0) + 0.5;
                            cityGroup = (afterStop as any)?.cityGroup ?? null;
                          }
                        }
                        const stopType = (mealRecState.mealType === "lunch" || mealRecState.mealType === "dinner") ? "restaurant" : "cafe";
                        const duration = (mealRecState.mealType === "lunch" || mealRecState.mealType === "dinner") ? 60 : 30;
                        const dinnerTimeNote = mealRecState.mealType === "dinner" && dinnerTimeChip
                          ? ({ early: "Dinner around 5pm", evening: "Dinner around 6:30pm", late: "Dinner around 8pm" })[dinnerTimeChip]
                          : undefined;
                        setMealRecState(s => ({ ...s, visible: false }));
                        setMealRecPendingRec(null);
                        setMealRecPlacementStopId(null);
                        setDinnerTimeChip(null);
                        try {
                          const res = await fetch(`/api/travel/trips/${tripId}/stops`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ name: rec.name, stopType, durationMinutes: duration, address: null, cityGroup, insertAtOrder, notes: dinnerTimeNote }),
                          });
                          if (res.ok) {
                            await fetchTrip(tripId);
                            toast.success(`${rec.name} added to your plan!`);
                          } else {
                            toast.error(`Couldn't add ${rec.name} — please try again.`);
                          }
                        } catch {
                          toast.error("Couldn't add stop — please try again.");
                        }
                      }}
                      className="mt-4 w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-bold rounded-2xl transition-colors"
                      data-testid="button-meal-placement-confirm"
                    >
                      Add Here
                    </button>
                  </div>
                );
              })()}

              {!mealRecPendingRec && (
                <>
                  <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {(mealRecState.mealType === "lunch" || mealRecState.mealType === "dinner")
                          ? <UtensilsCrossed className="w-4 h-4 text-green-600" />
                          : <Coffee className="w-4 h-4 text-blue-600" />}
                        <h3 className="font-bold text-gray-900 text-base">
                          {mealRecState.mealType === "dinner" ? "Dinner Spots" :
                           mealRecState.mealType === "dessert" ? "Treats & Desserts" :
                           mealRecState.mealType === "snack" ? "Cafes & Snack Stops" : "Kid-Friendly Lunch Spots"}
                        </h3>
                      </div>
                      <button
                        onClick={() => { setMealRecState(s => ({ ...s, visible: false })); setDinnerTimeChip(null); }}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    {/* ── Dinner time preference chips ── */}
                    {mealRecState.mealType === "dinner" && (
                      <div className="mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">When do you want dinner?</p>
                        <div className="flex gap-2">
                          {([
                            { key: "early", label: "🌅 Early", sub: "~5pm" },
                            { key: "evening", label: "🌆 Evening", sub: "~6:30pm" },
                            { key: "late", label: "🌃 Late", sub: "~8pm" },
                          ] as const).map(chip => (
                            <button
                              key={chip.key}
                              onClick={() => setDinnerTimeChip(prev => prev === chip.key ? null : chip.key)}
                              className={`flex-1 flex flex-col items-center py-2 px-1 rounded-xl border text-center transition-colors ${
                                dinnerTimeChip === chip.key
                                  ? "bg-orange-500 text-white border-orange-500"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"
                              }`}
                              data-testid={`chip-dinner-time-${chip.key}`}
                            >
                              <span className="text-[12px] font-semibold leading-tight">{chip.label}</span>
                              <span className={`text-[10px] mt-0.5 ${dinnerTimeChip === chip.key ? "text-orange-100" : "text-gray-400"}`}>{chip.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Location mode toggle */}
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => {
                          if (mealRecState.locationMode !== "route") {
                            fetchMealRecs(mealRecState.beforeStop, mealRecState.afterStop, mealRecState.mealType, false, mealRecState.searchQuery, "route");
                          }
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${mealRecState.locationMode === "route" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                        data-testid="button-meal-mode-route"
                      >
                        🗺️ Along the Route
                      </button>
                      <button
                        onClick={() => {
                          if (mealRecState.locationMode === "nearby") return;
                          if (!navigator.geolocation) {
                            toast.error("Location not available on this device.");
                            return;
                          }
                          navigator.geolocation.getCurrentPosition(
                            pos => {
                              fetchMealRecs(null, null, mealRecState.mealType, true, mealRecState.searchQuery, "nearby", pos.coords.latitude, pos.coords.longitude);
                            },
                            () => toast.error("Couldn't get your location — please allow location access.")
                          );
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${mealRecState.locationMode === "nearby" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                        data-testid="button-meal-mode-nearby"
                      >
                        📍 Find Nearby
                      </button>
                    </div>

                    {mealRecState.locationMode === "route" && (mealRecState.beforeStop || mealRecState.afterStop) && (
                      <p className="text-[11px] text-gray-400 mb-1">
                        Between {mealRecState.beforeStop?.name || "start"} → {mealRecState.afterStop?.name || "next stop"}
                      </p>
                    )}
                    {mealRecState.locationMode === "nearby" && (
                      <p className="text-[11px] text-blue-500 mb-1">📍 Using your current location</p>
                    )}

                    <form
                      className="mt-1.5 flex gap-2"
                      onSubmit={e => {
                        e.preventDefault();
                        const q = mealRecState.searchQuery.trim();
                        if (q) fetchMealRecs(mealRecState.beforeStop, mealRecState.afterStop, mealRecState.mealType, false, q, mealRecState.locationMode, mealRecState.nearbyLat, mealRecState.nearbyLng);
                      }}
                    >
                      <input
                        type="text"
                        placeholder={`Search e.g. "pizza" or "Shake Shack"…`}
                        value={mealRecState.searchQuery}
                        onChange={e => setMealRecState(s => ({ ...s, searchQuery: e.target.value }))}
                        className="flex-1 min-w-0 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        data-testid="input-meal-search"
                      />
                      <button
                        type="submit"
                        disabled={mealRecState.loading || !mealRecState.searchQuery.trim()}
                        className="shrink-0 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
                        data-testid="button-meal-search-submit"
                      >
                        {mealRecState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                      </button>
                    </form>
                  </div>

                  <div className="px-5 py-4 space-y-3">
                    {mealRecState.loading ? (
                      <div className="flex flex-col items-center py-10 gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                        <p className="text-sm text-gray-400">{mealRecState.locationMode === "nearby" ? "Searching near you…" : mealRecState.widen ? "Searching a wider area…" : "Finding great spots nearby…"}</p>
                      </div>
                    ) : mealRecState.suggestions.length === 0 ? (
                      <div className="text-center py-8 space-y-4">
                        <p className="text-2xl">😕</p>
                        <p className="text-gray-600 text-sm font-semibold">
                          {mealRecState.widen ? "Nothing found in the wider area either." : "Nothing close by right now."}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {mealRecState.widen
                            ? "Try Google Maps for live results in this area."
                            : "The spots nearby may be too niche to suggest — try widening the search."}
                        </p>
                        {!mealRecState.widen ? (
                          <button
                            onClick={() => fetchMealRecs(mealRecState.beforeStop, mealRecState.afterStop, mealRecState.mealType, true, "", mealRecState.locationMode, mealRecState.nearbyLat, mealRecState.nearbyLng)}
                            className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
                            data-testid="button-meal-recs-widen"
                          >
                            🔍 Expand search (20–30 min away)
                          </button>
                        ) : (
                          <button
                            onClick={() => window.open(`https://maps.google.com/?q=${mealRecState.mealType === "lunch" || mealRecState.mealType === "dinner" ? "kid+friendly+restaurant" : "cafe+snack"}+near+${encodeURIComponent(currentTrip?.destination || "")}`, "_blank")}
                            className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors"
                            data-testid="button-meal-recs-maps"
                          >
                            Open Google Maps
                          </button>
                        )}
                      </div>
                    ) : (
                      mealRecState.suggestions.map((rec, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm" data-testid={`meal-rec-${i}`}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-bold text-gray-900 text-sm">{rec.name}</p>
                            <div className="flex shrink-0 gap-0.5">
                              {Array.from({ length: rec.priceLevel || 1 }).map((_, j) => (
                                <span key={j} className="text-green-500 text-xs">$</span>
                              ))}
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-500 mb-1">{rec.cuisine}{rec.walkTime ? ` · ${rec.walkTime}` : ""}</p>
                          <p className="text-[11px] text-gray-600 mb-1.5">{rec.description}</p>
                          <div className="flex items-start gap-1.5 bg-green-50 rounded-xl px-2.5 py-1.5">
                            <span className="text-xs shrink-0">👨‍👩‍👧</span>
                            <p className="text-[10px] text-green-700">{rec.kidFriendlyNote}</p>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedMealRecs(prev => ({ ...prev, [mealRecState.mealType === "dinner" || mealRecState.mealType === "lunch" ? "lunch" : "snack"]: rec }));
                                setMealRecPendingRec({ rec });
                                setMealRecPlacementStopId(mealRecState.beforeStop?.id ?? null);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors"
                              data-testid={`button-meal-rec-add-${i}`}
                            >
                              ✓ Add to plan
                            </button>
                            <button
                              onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(rec.name + " " + (currentTrip?.destination || ""))}`, "_blank")}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold rounded-xl transition-colors"
                              data-testid={`button-meal-rec-directions-${i}`}
                            >
                              <Navigation className="w-3 h-3" /> Maps
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Trip Settings full-screen modal */}
      <AnimatePresence>
        {showTripSettings && (
          <motion.div
            key="trip-settings-modal"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed inset-0 z-[200]"
          >
            <TripSettingsModal
              tripId={tripId}
              tripName={currentTrip?.name || currentTrip?.destination || "Your Trip"}
              onClose={() => setShowTripSettings(false)}
              onSave={(settings, impact) => {
                setTripSettings(settings);
                setShowTripSettings(false);
                const msg = impact === "big"
                  ? "Plan updated — your day is refreshed"
                  : "Preferences saved";
                setSettingsBanner({ msg, impact });
                setTimeout(() => setSettingsBanner(null), 5000);
                fetchTrip(tripId);
              }}
              onMakeLighter={() => {
                const removable = sortedStops.filter(s => !s.isVisited);
                handleMakeDayLighter(removable, "lighter");
              }}
              todayStops={(dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops).filter(s => !skippedStopIds.includes(s.id))}
              onOptimizeNow={(trigger) => {
                setShowTripSettings(false);
                const todayStopsNow = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops).filter(s => !skippedStopIds.includes(s.id));
                fireAutoOptimize(trigger, todayStopsNow, false, true);
              }}
              onApplyProposal={(proposal, trigger) => {
                setShowTripSettings(false);
                const todayStopsNow = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops).filter(s => !skippedStopIds.includes(s.id));
                applyOptimizeProposal(proposal, trigger, todayStopsNow, true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AddAnchorSheet
        isOpen={anchorSheetOpen}
        onClose={() => setAnchorSheetOpen(false)}
        totalDays={Math.max(dayGroups.length, 1)}
        tripCity={currentTrip?.city || currentTrip?.destination || undefined}
        ctaLabel="Add & Update Plan"
        onAdd={async (anchor) => {
          // Close sheet + kick off animation immediately
          setAnchorSheetOpen(false);
          setAnchorSaveAnim({ phase: 'saving', name: anchor.name, time: anchor.time || undefined });
          setTimeout(() => setAnchorSaveAnim(prev => prev ? { ...prev, phase: 'adjusting' } : null), 200);
          setTimeout(() => setAnchorSaveAnim(prev => prev ? { ...prev, phase: 'reshuffling' } : null), 460);

          try {
            // 1. Save the anchor record
            const anchorRes = await fetch(`/api/travel/trips/${tripId}/anchors`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(anchor),
            });
            if (anchorRes.ok) {
              const saved = await anchorRes.json();
              setTripAnchors(prev => [...prev, saved]);
            }

            // 2. Hotels are accommodations — no stop needed, just refresh anchors
            if (anchor.anchorType === "hotel") {
              setAnchorSaveAnim(null);
              await loadAnchors();
              toast.success(`${anchor.name} added to your bookings`);
              return;
            }

            // 3. Create a real stop in the trip plan for that day
            const dayIdx = anchor.day - 1;
            const dayStopsForGroup = dayGroups[dayIdx] || [];
            const cityGroup = dayStopsForGroup[0]?.cityGroup || null;
            const stopType =
              anchor.anchorType === "ticket" ? "landmark" :
              anchor.anchorType === "food"   ? "restaurant" :
              anchor.anchorType === "event"  ? "entertainment" : "landmark";

            const stopRes = await fetch(`/api/travel/trips/${tripId}/stops`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: anchor.name,
                stopType,
                cityGroup: cityGroup || undefined,
                durationMinutes: anchor.durationMinutes || 90,
                notes: anchor.time ? `Fixed at ${formatDisplayTime(anchor.time)}` : undefined,
                // Pass address so the server skips the slow AI lookup
                address: anchor.address || undefined,
              }),
            });

            if (stopRes.ok) {
              await fetchTrip(tripId);
              setActiveDay(Math.max(0, anchor.day - 1));
              // Phase: done — show confirmation banner + glow new stop
              setAnchorSaveAnim({ phase: 'done', name: anchor.name, time: anchor.time || undefined });
              setTimeout(() => setAnchorSaveAnim(null), 2500);
            } else {
              await fetchTrip(tripId);
              setAnchorSaveAnim(null);
              toast.success("Booking saved — plan refreshed");
            }
          } catch (e) {
            console.error("[ParentPlanView] Anchor + stop save failed:", e);
            setAnchorSaveAnim(null);
            toast.error("Something went wrong — please try again");
          } finally {
            // Always re-sync anchor chips from DB — catches any state drift
            loadAnchors();
          }
        }}
      />

      {/* Day Actions Bottom Sheet */}
      <AnimatePresence>
        {showDayActionsSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[450] flex items-end justify-center bg-black/40"
            onClick={() => setShowDayActionsSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
              data-testid="day-actions-sheet"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              {/* Header */}
              <div className="px-5 pt-2 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-base">{currentTrip?.name || currentTrip?.destination || "Trip"}</p>
                    {tripOfflineReady && (
                      <p className="text-xs text-green-600 font-medium mt-0.5 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Offline ready
                      </p>
                    )}
                  </div>
                  <button onClick={() => setShowDayActionsSheet(false)} className="p-2 -mr-1 rounded-full hover:bg-gray-100 transition-colors">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] space-y-4 overflow-y-auto max-h-[70vh]">
                {/* Section 1 — Trip Tools */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1.5">Trip Tools</p>
                  <div className="space-y-0.5">
                    <button
                      onClick={handleDayDownloadOffline}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
                      data-testid="button-more-action-download"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tripOfflineReady ? "bg-green-100" : "bg-orange-100"}`}>
                        {tripOfflineReady ? <Check className="w-4 h-4 text-green-600" /> : <Download className="w-4 h-4 text-orange-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {tripOfflineReady ? "Downloaded for offline" : "Download for offline"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {tripOfflineReady ? "Tap to re-download or check status" : "Save stops and stories for no-WiFi use"}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={handleDayShareOpen}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-blue-50 active:bg-blue-100 transition-colors text-left"
                      data-testid="button-more-action-share"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Share2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Share with family</p>
                        <p className="text-xs text-gray-400 mt-0.5">Send the itinerary to your travel partners</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { setShowDayActionsSheet(false); setShowPackingList(true); }}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-amber-50 active:bg-amber-100 transition-colors text-left"
                      data-testid="button-more-action-packing"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <span className="text-lg leading-none">🎒</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Packing list</p>
                        <p className="text-xs text-gray-400 mt-0.5">Check off what you're bringing</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Section 2 — Plan Settings */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1.5">Plan Settings</p>
                  <div className="space-y-0.5">
                    <button
                      onClick={handleOpenRenameTrip}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-indigo-50 active:bg-indigo-100 transition-colors text-left"
                      data-testid="button-more-action-rename"
                    >
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-base leading-none">✏️</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Rename trip</p>
                        <p className="text-xs text-gray-400 mt-0.5">Change the name shown at the top</p>
                      </div>
                    </button>
                    <button
                      onClick={handleMoreActionsEditTrip}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-purple-50 active:bg-purple-100 transition-colors text-left"
                      data-testid="button-more-action-edit-trip"
                    >
                      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                        <Settings className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Edit trip preferences</p>
                        <p className="text-xs text-gray-400 mt-0.5">Adjust preferences, pace & auto-optimize</p>
                      </div>
                    </button>
                    <button
                      onClick={handleMoreActionsResetDay}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-amber-50 active:bg-amber-100 transition-colors text-left"
                      data-testid="button-more-action-reset-day"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <RefreshCw className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Reset today (undo changes)</p>
                        <p className="text-xs text-gray-400 mt-0.5">Un-skip all stops for today</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Section 3 — Utilities */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1.5">Utilities</p>
                  <div className="space-y-0.5">
                    <button
                      onClick={handleMoreActionsDuplicateTrip}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                      data-testid="button-more-action-duplicate"
                    >
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Copy className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Copy this trip</p>
                        <p className="text-xs text-gray-400 mt-0.5">Create a copy to plan a similar adventure</p>
                      </div>
                    </button>
                    <button
                      onClick={handleDayExportPDF}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                      data-testid="button-more-action-pdf"
                    >
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Export PDF</p>
                        <p className="text-xs text-gray-400 mt-0.5">Full itinerary — all days, stops & meals</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Trip PDF Export Modal */}
      <AnimatePresence>
        {showFullTripPDF && (() => {
          const tripName = currentTrip?.name || currentTrip?.destination || "Adventure";
          const destination = currentTrip?.destination || "";
          const startDate = (currentTrip as any)?.startDate;
          const numDays = dayGroups.length > 1 ? dayGroups.length : 1;
          const allDays = dayGroups.length > 1 ? dayGroups : [sortedStops];

          const getDayLabel = (dayIdx: number) => {
            if (!startDate) return `Day ${dayIdx + 1}`;
            try {
              const base = new Date(String(startDate).slice(0, 10) + "T12:00:00");
              base.setDate(base.getDate() + dayIdx);
              return `Day ${dayIdx + 1} — ${base.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`;
            } catch { return `Day ${dayIdx + 1}`; }
          };

          const mealIcon = (mealType: string) => mealType === "lunch" ? "🍽️" : "🧃";
          const mealLabel = (mealType: string) => mealType === "lunch" ? "Lunch break" : "Snack stop";
          const stopTypeIcon = (stopType?: string | null) => {
            const map: Record<string, string> = {
              museum: "🏛️", park: "🌿", nature: "🌿", garden: "🌿",
              beach: "🏖️", landmark: "📍", viewpoint: "🔭", bridge: "🌉",
              restaurant: "🍴", market: "🛍️", activity: "⚡", culture: "🎭",
              aquarium: "🐠", zoo: "🦁", cruise: "⛵", boat: "⛵",
            };
            return map[stopType || ""] || "📍";
          };

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] bg-[#F6F4EF] flex flex-col"
              data-testid="full-trip-pdf-overlay"
            >
              {/* Header */}
              <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
                <button
                  onClick={() => setShowFullTripPDF(false)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
                  data-testid="button-close-pdf"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
                <p className="text-sm font-bold text-gray-900">Full Itinerary</p>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-sm font-semibold rounded-full hover:bg-orange-600 transition-colors"
                  data-testid="button-print-pdf"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Print / Save
                </button>
              </div>

              {/* Scrollable content — this is what prints */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 max-w-lg mx-auto w-full" id="pdf-content">
                {/* Trip summary */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-lg font-bold text-gray-900">{tripName}</p>
                  {destination && <p className="text-sm text-gray-500 mt-0.5">{destination}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-full">
                      {numDays} {numDays === 1 ? "Day" : "Days"}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full">
                      {sortedStops.length} Stops
                    </span>
                    {startDate && (() => {
                      try {
                        const d = new Date(String(startDate).slice(0, 10) + "T12:00:00");
                        return (
                          <span className="text-xs text-gray-400">
                            {d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </span>
                        );
                      } catch { return null; }
                    })()}
                  </div>
                </div>

                {/* Each day */}
                {allDays.map((dayStops, dayIdx) => {
                  const timeline = buildTimeline(dayStops.filter(s => !skippedStopIds.includes(s.id)));
                  return (
                    <div key={dayIdx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Day header */}
                      <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                        <p className="text-sm font-bold text-orange-800">{getDayLabel(dayIdx)}</p>
                        <p className="text-xs text-orange-600 mt-0.5">{dayStops.filter(s => !skippedStopIds.includes(s.id)).length} stops planned</p>
                      </div>

                      {/* Timeline */}
                      <div className="px-4 py-3 space-y-0">
                        {timeline.map((item, i) => {
                          if (item.kind === "breakfast") {
                            return (
                              <div key="breakfast" className="flex gap-3 py-2.5 border-b border-gray-50">
                                <div className="flex flex-col items-center gap-0 w-6 shrink-0 pt-0.5">
                                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-sm">☕</div>
                                  <div className="w-0.5 flex-1 bg-gray-100 mt-1" />
                                </div>
                                <div className="pb-2">
                                  <p className="text-xs font-bold text-gray-700">Morning start</p>
                                  <p className="text-[11px] text-gray-400 mt-0.5">Grab breakfast before heading out</p>
                                </div>
                              </div>
                            );
                          }
                          if (item.kind === "meal") {
                            return (
                              <div key={`meal-${i}`} className="flex gap-3 py-2.5 border-b border-gray-50">
                                <div className="flex flex-col items-center gap-0 w-6 shrink-0 pt-0.5">
                                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-sm">{mealIcon(item.mealType)}</div>
                                  <div className="w-0.5 flex-1 bg-gray-100 mt-1" />
                                </div>
                                <div className="pb-2">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-gray-700">{mealLabel(item.mealType)}</p>
                                    <span className="text-[10px] text-gray-400 font-medium">{item.time}</span>
                                  </div>
                                  <p className="text-[11px] text-gray-400 mt-0.5">
                                    {item.mealType === "lunch" ? "Find a family-friendly spot for lunch" : "Time for a snack and quick break"}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          if (item.kind === "stop") {
                            const isLast = i === timeline.length - 1;
                            return (
                              <div key={item.stop.id} className={`flex gap-3 py-2.5 ${!isLast ? "border-b border-gray-50" : ""}`}>
                                <div className="flex flex-col items-center gap-0 w-6 shrink-0 pt-0.5">
                                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-sm">{stopTypeIcon(item.stop.stopType)}</div>
                                  {!isLast && <div className="w-0.5 flex-1 bg-gray-100 mt-1" />}
                                </div>
                                <div className="pb-2 flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-bold text-gray-900 leading-tight">{item.stop.name}</p>
                                    <span className="text-[10px] text-gray-400 font-medium shrink-0">{item.time} – {item.endTime}</span>
                                  </div>
                                  {item.stop.description && (
                                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{item.stop.description}</p>
                                  )}
                                  {item.stop.address && (
                                    <p className="text-[10px] text-gray-300 mt-0.5">{item.stop.address}</p>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                        {dayStops.filter(s => !skippedStopIds.includes(s.id)).length === 0 && (
                          <p className="text-sm text-gray-400 py-4 text-center">No stops planned for this day</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                <p className="text-center text-xs text-gray-300 pb-2">Generated by GeoQuest Adventures</p>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Quick Share Sheet */}
      <AnimatePresence>
        {showDayShareSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[460] flex items-end justify-center bg-black/40"
            onClick={() => setShowDayShareSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
              data-testid="day-share-sheet"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-gray-100">
                <div>
                  <p className="font-bold text-gray-900 text-base">Share itinerary</p>
                  <p className="text-xs text-gray-400 mt-0.5">{currentTrip?.name || currentTrip?.destination || ""}</p>
                </div>
                <button onClick={() => setShowDayShareSheet(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="px-5 py-4">
                {/* Link box */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-4">
                  {shareGenerating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-400 shrink-0" />
                      <p className="text-sm text-gray-400">Generating your link…</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-700 truncate flex-1 font-mono">{tripShareLink || window.location.href}</p>
                      <button
                        onClick={handleDayCopyLink}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-xl transition-colors hover:bg-orange-600 active:scale-95"
                        data-testid="button-share-copy-link"
                      >
                        {shareLinkCopied ? <><CheckCircle className="w-3.5 h-3.5" /> Copied!</> : <><Link2 className="w-3.5 h-3.5" /> Copy</>}
                      </button>
                    </div>
                  )}
                </div>

                {/* Social sharing */}
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Share via</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {/* WhatsApp */}
                  <button
                    onClick={() => {
                      const msg = encodeURIComponent(getShareMessage());
                      window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
                    }}
                    disabled={shareGenerating}
                    className="flex flex-col items-center gap-2 py-3.5 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors active:scale-95 disabled:opacity-40"
                    data-testid="button-share-whatsapp"
                  >
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span className="text-[11px] font-semibold text-gray-700">WhatsApp</span>
                  </button>

                  {/* iMessage / Text */}
                  <button
                    onClick={() => {
                      const body = encodeURIComponent(getShareMessage());
                      window.open(`sms:&body=${body}`, "_self");
                    }}
                    disabled={shareGenerating}
                    className="flex flex-col items-center gap-2 py-3.5 rounded-2xl bg-[#34C759]/10 hover:bg-[#34C759]/20 transition-colors active:scale-95 disabled:opacity-40"
                    data-testid="button-share-imessage"
                  >
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#34C759">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                    </svg>
                    <span className="text-[11px] font-semibold text-gray-700">Message</span>
                  </button>

                  {/* Facebook Messenger */}
                  <button
                    onClick={() => {
                      const link = tripShareLink || window.location.href;
                      window.open(`fb-messenger://share?link=${encodeURIComponent(link)}`, "_self");
                      setTimeout(() => {
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, "_blank");
                      }, 500);
                    }}
                    disabled={shareGenerating}
                    className="flex flex-col items-center gap-2 py-3.5 rounded-2xl bg-[#0084FF]/10 hover:bg-[#0084FF]/20 transition-colors active:scale-95 disabled:opacity-40"
                    data-testid="button-share-messenger"
                  >
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#0084FF">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm1.163 16.395l-2.77-2.73-5.38 2.73 5.956-6.383 2.84 2.73 5.31-2.73-5.956 6.383z"/>
                    </svg>
                    <span className="text-[11px] font-semibold text-gray-700">Messenger</span>
                  </button>
                </div>

                {/* Email option */}
                <button
                  onClick={() => {
                    const msg = getShareMessage();
                    const subject = encodeURIComponent(`Family itinerary: ${currentTrip?.destination || "our trip"}`);
                    const body = encodeURIComponent(msg);
                    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
                  }}
                  disabled={shareGenerating}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors text-left disabled:opacity-40"
                  data-testid="button-share-email"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Send by email</p>
                </button>
              </div>
              <div className="h-[env(safe-area-inset-bottom,16px)]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish Adventure Modal */}
      {showFinishCelebration && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
            {finishStopsLeft > 0 ? (
              <>
                <div className="text-4xl mb-3">🗺️</div>
                <h2 className="text-xl font-black text-gray-900 mb-2">Still exploring?</h2>
                <p className="text-sm text-gray-500 mb-6">
                  You still have <span className="font-bold text-orange-500">{finishStopsLeft} stop{finishStopsLeft !== 1 ? "s" : ""}</span> left on your adventure. Finish now?
                </p>
                <button
                  onClick={handleConfirmFinish}
                  disabled={isFinishingAdventure}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold text-white mb-3 disabled:opacity-60 transition-all active:scale-[0.98]"
                  style={{ background: "#f97316" }}
                  data-testid="button-finish-anyway"
                >
                  {isFinishingAdventure ? "Finishing…" : "Finish anyway"}
                </button>
                <button
                  onClick={() => setShowFinishCelebration(false)}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                  data-testid="button-continue-trip"
                >
                  Continue trip
                </button>
              </>
            ) : (
              <>
                <div className="text-5xl mb-3">🎉</div>
                <h2 className="text-xl font-black text-gray-900 mb-2">You made it!</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Ready to wrap up your trip and create your family story?
                </p>
                <button
                  onClick={handleConfirmFinish}
                  disabled={isFinishingAdventure}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold text-white mb-3 disabled:opacity-60 transition-all active:scale-[0.98]"
                  style={{ background: "#f97316" }}
                  data-testid="button-create-story"
                >
                  {isFinishingAdventure ? "Creating…" : "Create our story →"}
                </button>
                <button
                  onClick={() => setShowFinishCelebration(false)}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                  data-testid="button-not-yet"
                >
                  Not yet
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Capture Moment Overlay — component-level so it works from any tab */}
      {showMomentCapture && currentTrip && (
        <div className="fixed inset-0 z-[400] bg-black/50 flex items-end justify-center">
          <MomentCapture
            trip={currentTrip}
            stops={currentTripStops}
            preSelectedStopId={momentCapturePreStopId}
            isParentMode={true}
            onSave={async (data) => {
              await saveMoment({ tripId: currentTrip.id, ...data });
              setShowMomentCapture(false);
              setMomentCapturePreStopId(undefined);
              toast.success("Moment saved ✨");
            }}
            onClose={() => { setShowMomentCapture(false); setMomentCapturePreStopId(undefined); }}
          />
        </div>
      )}

      {/* Revisit Stop Sheet — for completed stops */}
      <AnimatePresence>
        {revisitSheetStop && (
          <motion.div
            key="revisit-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[450] flex flex-col justify-end"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={() => setRevisitSheetStop(null)}
          >
            <motion.div
              key="revisit-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 340 }}
              className="bg-white rounded-t-3xl px-5 pt-5 pb-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">✅</span>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Already visited</p>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-5">{revisitSheetStop.name}</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setMomentCapturePreStopId(revisitSheetStop.id);
                    setShowMomentCapture(true);
                    setRevisitSheetStop(null);
                  }}
                  className="w-full flex items-center gap-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm py-4 px-5 rounded-2xl transition-colors"
                  data-testid="button-revisit-upload-memories"
                >
                  <Camera className="w-5 h-5 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold">Upload Memories</p>
                    <p className="text-xs font-normal opacity-80">Add photos from this stop</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    navigate(`/adventure/${tripId}/kid/story/${revisitSheetStop.id}`);
                    setRevisitSheetStop(null);
                  }}
                  className="w-full flex items-center gap-3 text-white font-bold text-sm py-4 px-5 rounded-2xl transition-colors"
                  style={{ background: "#7DA892" }}
                  data-testid="button-revisit-stories"
                >
                  <BookOpen className="w-5 h-5 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold">Revisit Stories</p>
                    <p className="text-xs font-normal opacity-80">Let kids explore the story pack again</p>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setRevisitSheetStop(null)}
                className="w-full mt-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-600"
                data-testid="button-revisit-close"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Packing List overlay */}
      <AnimatePresence>
        {showPackingList && currentTrip && (
          <PackingList
            tripId={currentTrip.id}
            tripName={currentTrip.name}
            destinations={[
              currentTrip.destination || "",
              ...(Object.keys((currentTrip as any).cityDates || {})),
            ].filter(Boolean)}
            onClose={() => setShowPackingList(false)}
          />
        )}
      </AnimatePresence>

      {/* Readiness Sheet — "Finish getting ready" bottom sheet for ready phase */}
      <AnimatePresence>
        {showReadinessSheet && (() => {
          // Use the shared day1ReadinessRows; wrap each onTap to close the sheet first
          const rsRows = day1ReadinessRows.map(row => ({
            ...row,
            onTap: () => { setShowReadinessSheet(false); row.onTap(); },
          }));
          const rsAllResolved = rsRows.every(r => r.resolved);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[480] flex items-end justify-center bg-black/40"
              onClick={() => setShowReadinessSheet(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="bg-white rounded-t-3xl w-full max-w-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
                data-testid="readiness-sheet"
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-gray-200" />
                </div>
                <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-gray-100">
                  <p className="text-[17px] font-bold text-gray-900">Finish getting ready</p>
                  <button onClick={() => setShowReadinessSheet(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center" data-testid="button-readiness-sheet-close">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="px-5 py-4">
                  {rsAllResolved ? (() => {
                    const rsDayStops = (dayGroups.length > 1 ? dayGroups[0] || [] : sortedStops) as TravelStop[];
                    const rsTicketsSaved = rsDayStops.filter((s) => stopNeedsTicket(s) && stopHasTicket(s)).length;
                    const rsHasLunch = rsDayStops.some((s) => FOOD_STOP_TYPES.includes(s.stopType || ""));
                    return (
                    <div className="py-2">
                      <div className="text-center mb-4">
                        <p className="text-[28px] mb-1">👍</p>
                        <p className="text-[18px] font-bold text-gray-900 mb-1">You're ready for Day 1</p>
                        <p className="text-[13px] text-gray-500">Everything's sorted — enjoy your trip!</p>
                      </div>
                      {/* Summary block */}
                      <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-4 space-y-2">
                        <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{rsTicketsSaved === 0 ? "No tickets needed" : `${rsTicketsSaved} ticket${rsTicketsSaved !== 1 ? "s" : ""} saved`}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{rsHasLunch ? "Lunch planned" : "Breaks built in"}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{rsDayStops.length} stop{rsDayStops.length !== 1 ? "s" : ""} · route ready</span>
                        </div>
                        {tripAnchors.length > 0 && (
                          <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>{tripAnchors.length} booking{tripAnchors.length !== 1 ? "s" : ""} locked in</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => { setShowReadinessSheet(false); setRevealDetailsOpen(true); }}
                        className="w-full font-bold py-3.5 rounded-2xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)", color: "#fff" }}
                        data-testid="button-readiness-review-day1"
                      >
                        Review Day 1
                      </button>
                    </div>
                    );
                  })() : (
                    <div>
                      {rsRows.map((row, idx) => (
                        <div key={row.key}>
                          {idx > 0 && <div style={{ height: 1, background: "#F3F4F6" }} className="my-0.5" />}
                          <button
                            onClick={row.onTap}
                            className="w-full flex items-center gap-3 py-3.5 active:bg-gray-50 rounded-xl"
                            disabled={row.resolved}
                            data-testid={`button-readiness-${row.key}`}
                          >
                            <span className="text-[20px] shrink-0">{row.icon}</span>
                            <span className="flex-1 text-left text-[14px]" style={{ color: row.resolved ? "#9CA3AF" : "#111827", textDecoration: row.resolved ? "line-through" : "none" }}>
                              {row.text}
                            </span>
                            {row.resolved
                              ? <span className="text-emerald-500 font-bold text-[16px] shrink-0">✓</span>
                              : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                            }
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Fix It Sheet — add start date + review tickets */}
      <AnimatePresence>
        {showFixItSheet && (() => {
          const hasStartDate = !!currentTrip?.startDate;
          const fixTickets = (dayGroups.length > 1 ? dayGroups[0] || [] : sortedStops)
            .filter((s: TravelStop) => stopNeedsTicket(s) && !stopHasTicket(s));
          const saveDate = async () => {
            if (!fixItDate || !tripId) return;
            setFixItSaving(true);
            try {
              const res = await fetch(`/api/travel/trips/${tripId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ startDate: fixItDate }),
              });
              if (res.ok) { fetchTrip(tripId); setShowFixItSheet(false); }
            } finally { setFixItSaving(false); }
          };
          return (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[480] flex items-end justify-center bg-black/40"
              onClick={() => setShowFixItSheet(false)}
              data-testid="fixit-sheet-backdrop"
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 350 }}
                className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl"
                style={{ maxHeight: "85dvh", overflowY: "auto", paddingBottom: "env(safe-area-inset-bottom)" }}
                onClick={e => e.stopPropagation()}
                data-testid="fixit-sheet"
              >
                <div className="flex justify-between items-center px-5 pt-5 pb-1">
                  <p className="text-[18px] font-extrabold text-gray-900">Fix This</p>
                  <button onClick={() => setShowFixItSheet(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center" data-testid="button-fixit-close">
                    <span className="text-gray-500 text-sm font-bold">✕</span>
                  </button>
                </div>
                <div className="px-5 pb-6 space-y-5 mt-3">
                  {/* Start Date */}
                  {!hasStartDate && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📅</span>
                        <p className="text-[15px] font-bold text-gray-900">When are you travelling?</p>
                      </div>
                      <p className="text-[13px] text-gray-500 mb-3 ml-7">GeoBuddy uses this for timing, reminders, and daily guidance.</p>
                      <input
                        type="date"
                        value={fixItDate}
                        onChange={e => setFixItDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 10)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 text-gray-800 text-sm font-semibold focus:outline-none focus:border-orange-400"
                        data-testid="input-fix-start-date"
                      />
                      {fixItDate && (
                        <button
                          onClick={saveDate}
                          disabled={fixItSaving}
                          className="w-full mt-2 py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-transform"
                          style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
                          data-testid="button-fixit-save-date"
                        >
                          {fixItSaving ? "Saving…" : "Save Start Date"}
                        </button>
                      )}
                    </div>
                  )}
                  {/* Tickets needed */}
                  {fixTickets.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🎟</span>
                        <p className="text-[15px] font-bold text-gray-900">Tickets to book</p>
                      </div>
                      <p className="text-[13px] text-gray-500 mb-3 ml-7">These stops require tickets — book ahead to avoid queues.</p>
                      <div className="space-y-2">
                        {fixTickets.map((s: TravelStop) => (
                          <div key={s.id} className="flex items-center justify-between bg-orange-50 rounded-xl px-3 py-2.5 border border-orange-100">
                            <div>
                              <p className="text-[13px] font-bold text-gray-800">{s.name}</p>
                              <p className="text-[11px] text-orange-600 font-medium">Tickets needed</p>
                            </div>
                            <button
                              onClick={() => { setShowFixItSheet(false); setActiveTab("passes"); }}
                              className="text-[12px] font-bold text-orange-600 underline"
                              data-testid={`button-fixit-view-passes-${s.id}`}
                            >
                              View passes
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasStartDate && fixTickets.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-2xl mb-2">✅</p>
                      <p className="text-[15px] font-bold text-gray-800">You're all set!</p>
                      <p className="text-[13px] text-gray-500 mt-1">Start date is saved and no tickets are needed.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Rename Trip Modal */}
      <AnimatePresence>
        {showRenameTripModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[480] flex items-end justify-center bg-black/40"
            onClick={() => setShowRenameTripModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
              data-testid="rename-trip-modal"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-gray-100">
                <p className="font-bold text-gray-900 text-base">Rename trip</p>
                <button onClick={() => setShowRenameTripModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" data-testid="button-rename-trip-close">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="px-5 py-4">
                <input
                  type="text"
                  value={renameTripValue}
                  onChange={e => setRenameTripValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRenameTrip()}
                  placeholder="Trip name…"
                  autoFocus
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  data-testid="input-rename-trip"
                />
              </div>
              <div className="px-5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
                <button
                  onClick={handleRenameTrip}
                  disabled={renamingTrip || !renameTripValue.trim()}
                  className="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-bold text-[15px] disabled:opacity-50 transition-opacity"
                  data-testid="button-rename-trip-save"
                >
                  {renamingTrip ? "Saving…" : "Save name"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Start/End Location Override Sheet */}
      <AnimatePresence>
        {showDayOverrideSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[470] flex items-end justify-center bg-black/40"
            onClick={() => setShowDayOverrideSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
              data-testid="day-override-sheet"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-gray-100">
                <div>
                  <p className="font-bold text-gray-900 text-base">Where do you start &amp; end?</p>
                  <p className="text-xs text-gray-400 mt-0.5">We'll plan your route from here</p>
                </div>
                <button onClick={() => setShowDayOverrideSheet(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[65vh]">
                {(() => {
                  const hotelDefault = getStayForDay(overrideDayIdx);
                  const hasOverride = !!dayOverrides[getDayDate(overrideDayIdx)];
                  const yesterdayOverride = overrideDayIdx > 0 ? dayOverrides[getDayDate(overrideDayIdx - 1)] : null;
                  const yesterdayStart = yesterdayOverride?.startLocation || (overrideDayIdx > 0 ? (() => { const s = getStayForDay(overrideDayIdx - 1); return s ? { name: s.name, address: s.address || "" } : null; })() : null);
                  return (
                    <>
                      {hotelDefault && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Quick options</p>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              onClick={() => setOverrideForm(prev => ({
                                ...prev,
                                startLocation: { name: hotelDefault.name, address: hotelDefault.address || "" },
                              }))}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all"
                              style={{ background: overrideForm.startLocation?.name === hotelDefault.name ? "#FFF7ED" : "#F9FAFB", borderColor: overrideForm.startLocation?.name === hotelDefault.name ? "#D4872B" : "#E5E7EB" }}
                              data-testid="button-quick-hotel-start"
                            >
                              <span className="text-xl shrink-0">🏨</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-gray-800 leading-tight truncate">{hotelDefault.name}</p>
                                <p className="text-[11px] text-gray-400">Start from your stay</p>
                              </div>
                              {overrideForm.startLocation?.name === hotelDefault.name && <span className="text-orange-500 text-[13px]">✓</span>}
                            </button>
                          </div>
                          {hasOverride && (
                            <button
                              onClick={async () => {
                                setSavingOverride(true);
                                try {
                                  const key = getDayDate(overrideDayIdx);
                                  const updated = { ...dayOverrides };
                                  delete updated[key];
                                  setDayOverrides(updated);
                                  await fetch(`/api/travel/trips/${tripId}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "include",
                                    body: JSON.stringify({ dayOverrides: updated }),
                                  });
                                  setShowDayOverrideSheet(false);
                                  toast.success("Reverted to hotel default");
                                } catch {
                                  toast.error("Couldn't revert — try again");
                                } finally {
                                  setSavingOverride(false);
                                }
                              }}
                              className="w-full text-[11px] text-gray-400 hover:text-gray-600 text-left py-1 transition-colors"
                              data-testid="button-use-hotel-default"
                            >
                              Reset to hotel defaults
                            </button>
                          )}
                        </div>
                      )}

                      {yesterdayStart && (
                        <button
                          onClick={() => setOverrideForm(prev => ({
                            ...prev,
                            startLocation: { name: yesterdayStart.name, address: yesterdayStart.address || "" },
                            endLocation: { name: yesterdayStart.name, address: yesterdayStart.address || "" },
                          }))}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-orange-300 bg-orange-50 text-orange-700 text-[13px] font-semibold"
                          data-testid="button-same-as-yesterday"
                        >
                          <span>🔁</span>
                          Same as yesterday — {yesterdayStart.name}
                        </button>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1">
                          <span>🟢</span> Start Location
                        </label>
                        <div className="relative">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Hotel, station, attraction…"
                              value={overrideStartQuery || overrideForm.startLocation?.name || ""}
                              onChange={e => {
                                const v = e.target.value;
                                setOverrideStartQuery(v);
                                setOverrideForm(prev => ({ ...prev, startLocation: { name: v, address: prev.startLocation?.address || "" } }));
                                const t = setTimeout(() => searchOverridePlace(v, "start"), 600);
                                return () => clearTimeout(t);
                              }}
                              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                              data-testid="input-override-start-name"
                            />
                            <button
                              onClick={() => searchOverridePlace(overrideStartQuery || overrideForm.startLocation?.name || "", "start")}
                              disabled={overrideStartSearching}
                              className="shrink-0 px-3 py-2.5 rounded-xl text-[12px] font-bold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-colors"
                              data-testid="button-search-start-place"
                            >
                              {overrideStartSearching ? "…" : "Look up"}
                            </button>
                          </div>
                          {overrideStartResults.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                              {overrideStartResults.map((r, ri) => (
                                <button
                                  key={ri}
                                  onClick={() => {
                                    setOverrideForm(prev => ({ ...prev, startLocation: { name: r.name, address: r.address } }));
                                    setOverrideStartQuery(r.name);
                                    setOverrideStartResults([]);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                                  data-testid={`start-place-result-${ri}`}
                                >
                                  <p className="font-semibold text-gray-900 truncate">{r.name}</p>
                                  <p className="text-[11px] text-gray-400 truncate">{r.address}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {overrideForm.startLocation?.address && (
                          <p className="text-[11px] text-gray-400 px-1 truncate">📍 {overrideForm.startLocation.address}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[12px] font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-1">
                            <span>🔴</span> End Location
                          </label>
                          {overrideForm.startLocation?.name && (
                            <button
                              onClick={() => {
                                const sl = overrideForm.startLocation!;
                                setOverrideForm(prev => ({ ...prev, endLocation: { name: sl.name, address: sl.address } }));
                                setOverrideEndQuery(sl.name);
                                setOverrideEndResults([]);
                              }}
                              className="text-[11px] text-orange-600 font-semibold bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg"
                              data-testid="button-same-as-start"
                            >
                              Same as start
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Hotel, station, attraction…"
                              value={overrideEndQuery || overrideForm.endLocation?.name || ""}
                              onChange={e => {
                                const v = e.target.value;
                                setOverrideEndQuery(v);
                                setOverrideForm(prev => ({ ...prev, endLocation: { name: v, address: prev.endLocation?.address || "" } }));
                                const t = setTimeout(() => searchOverridePlace(v, "end"), 600);
                                return () => clearTimeout(t);
                              }}
                              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                              data-testid="input-override-end-name"
                            />
                            <button
                              onClick={() => searchOverridePlace(overrideEndQuery || overrideForm.endLocation?.name || "", "end")}
                              disabled={overrideEndSearching}
                              className="shrink-0 px-3 py-2.5 rounded-xl text-[12px] font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors"
                              data-testid="button-search-end-place"
                            >
                              {overrideEndSearching ? "…" : "Look up"}
                            </button>
                          </div>
                          {overrideEndResults.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                              {overrideEndResults.map((r, ri) => (
                                <button
                                  key={ri}
                                  onClick={() => {
                                    setOverrideForm(prev => ({ ...prev, endLocation: { name: r.name, address: r.address } }));
                                    setOverrideEndQuery(r.name);
                                    setOverrideEndResults([]);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0"
                                  data-testid={`end-place-result-${ri}`}
                                >
                                  <p className="font-semibold text-gray-900 truncate">{r.name}</p>
                                  <p className="text-[11px] text-gray-400 truncate">{r.address}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {overrideForm.endLocation?.address && (
                          <p className="text-[11px] text-gray-400 px-1 truncate">📍 {overrideForm.endLocation.address}</p>
                        )}
                      </div>

                      {hasOverride && (
                        <button
                          onClick={async () => {
                            setSavingOverride(true);
                            try {
                              const key = getDayDate(overrideDayIdx);
                              const updated = { ...dayOverrides };
                              delete updated[key];
                              setDayOverrides(updated);
                              await fetch(`/api/travel/trips/${tripId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({ dayOverrides: updated }),
                              });
                              setShowDayOverrideSheet(false);
                              toast.success("Override removed");
                            } catch {
                              toast.error("Couldn't remove — try again");
                            } finally {
                              setSavingOverride(false);
                            }
                          }}
                          className="w-full py-3 border-2 border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
                          data-testid="button-remove-day-override"
                        >
                          Remove custom override
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="px-5 py-4 border-t border-gray-100">
                <button
                  onClick={saveDayOverride}
                  disabled={savingOverride}
                  className="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-bold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-60"
                  data-testid="button-save-day-override"
                >
                  {savingOverride ? "Saving…" : "Save start & end"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TravelOfflineDownload — visually hidden trigger, dialog portal mounts to body */}
      {currentTrip && (
        <span className="sr-only">
          <TravelOfflineDownload
            trip={currentTrip}
            stops={sortedStops}
            forceOpen={triggerOfflineOpen}
            onForceOpenHandled={() => setTriggerOfflineOpen(false)}
            onOfflineReady={setTripOfflineReady}
          />
        </span>
      )}

      {/* GeoBuddy float button — travel quick-action panel (chatEnabled=false in travel contexts) */}
      {activeTab === "todays_plan" && (
        <TravelGeoBuddyNudge
          message={
            geoBuddySuggestion
              ? geoBuddySuggestion.message
              : "Looks like a busy day ahead — I've got some ideas"
          }
          triggerKey={`parent-plan-${tripId}`}
          delay={8000}
          duration={8000}
          chatEnabled={false}
          onWhatsNext={() => {
            const todayStops = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops)
              .filter(s => !skippedStopIds.includes(s.id));
            const nextUnvisited = todayStops.find(s => !s.isVisited);
            if (nextUnvisited) {
              const el = document.querySelector(`[data-stop-id="${nextUnvisited.id}"]`) as HTMLElement | null;
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
          onFindFood={() => openFoodPicker("food")}
          onMakeLighter={() => {
            const todayStops = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops)
              .filter(s => !skippedStopIds.includes(s.id));
            const unvisited = todayStops.filter(s => !s.isVisited);
            handleMakeDayLighter(unvisited, "lighter");
          }}
          onSkipNext={() => {
            const todayStops = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops)
              .filter(s => !skippedStopIds.includes(s.id));
            const nextUnvisited = todayStops.find(s => !s.isVisited) ?? null;
            setConfirmSkipNext(nextUnvisited);
          }}
        />
      )}

      {/* RescuePanel — global bottom sheet */}
      {(() => {
        const todayTabStops = (dayGroups.length > 1 ? dayGroups[activeDay] || [] : sortedStops)
          .filter(s => !skippedStopIds.includes(s.id));
        const nextUnvisited = todayTabStops.find(s => !s.isVisited) ?? null;
        const cityName = currentTrip?.city || currentTrip?.destination || "";
        return (
          <RescuePanel
            open={rescuePanelOpen}
            onClose={() => setRescuePanelOpen(false)}
            tripId={tripId}
            currentStopId={nextUnvisited?.id ?? null}
            cityName={cityName}
            todayStops={todayTabStops}
            onSkipDone={() => {
              setSkippedStopIds(prev => nextUnvisited ? [...prev, nextUnvisited.id] : prev);
              fetchTrip(tripId);
            }}
            onProposalAccepted={() => fetchTrip(tripId)}
            onAddStop={async (suggestion) => {
              await addStop(tripId, {
                name: suggestion.name,
                stopType: suggestion.stopType,
              });
              await fetchTrip(tripId);
            }}
            onGetHelp={() => setHelpNowOpen(true)}
          />
        );
      })()}

      {/* ── Get Help Now overlay ─────────────────────────────────── */}
      {(() => {
        type StayLoc = { cityName?: string; name: string; address: string; checkIn: string; checkOut: string };
        const helpCityName = activeDayCityName || currentTrip?.city || currentTrip?.destination || "";
        const explicitStayLocs = (currentTrip?.stayLocations as StayLoc[] | null | undefined) ?? null;
        const dayOv = dayOverrides[String(activeDay)];
        const stayLocs: StayLoc[] | null = (() => {
          if (explicitStayLocs?.length) {
            // For multi-city trips, show only the hotel for the current active city
            const cityLower = helpCityName.toLowerCase().trim();
            const cityMatch = explicitStayLocs.filter(s =>
              s.cityName && s.cityName.toLowerCase().trim() === cityLower
            );
            return cityMatch.length > 0 ? cityMatch : explicitStayLocs;
          }
          const candidates: StayLoc[] = [];
          if (dayOv?.endLocation?.address) candidates.push({ name: dayOv.endLocation.name, address: dayOv.endLocation.address, checkIn: '', checkOut: '' });
          if (dayOv?.startLocation?.address) candidates.push({ name: dayOv.startLocation.name, address: dayOv.startLocation.address, checkIn: '', checkOut: '' });
          return candidates.length ? candidates : null;
        })();
        const helpStop = ((dayGroups[activeDay] ?? []) as any[]).find((s: any) => !s.isVisited) ?? null;
        const fbLat = helpStop?.latitude ? parseFloat(helpStop.latitude) : null;
        const fbLng = helpStop?.longitude ? parseFloat(helpStop.longitude) : null;
        return (
          <GetHelpFlow
            open={helpNowOpen}
            onClose={() => setHelpNowOpen(false)}
            cityName={helpCityName}
            tripDestination={currentTrip?.destination ?? currentTrip?.city ?? helpCityName}
            stayLocations={stayLocs}
            fallbackLat={fbLat}
            fallbackLng={fbLng}
          />
        );
      })()}

      {/* ── Kids preview bottom sheet ─────────────────────────── */}
      {kidsPreviewOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setKidsPreviewOpen(false); }}
          data-testid="sheet-kids-preview"
        >
          <div
            className="w-full bg-white rounded-t-3xl px-5 pt-6 pb-10 overflow-y-auto"
            style={{ maxHeight: "82vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5" />
            <h2 className="text-lg font-bold text-slate-800 mb-1">What your child will experience</h2>
            <p className="text-xs text-slate-400 mb-4">At every stop, they get their own adventure</p>

            {/* Real stop preview */}
            <div
              className="rounded-2xl mb-5 overflow-hidden"
              style={{ background: "#F8F7FF", border: "1px solid #E9E6FF" }}
            >
              <div className="px-4 py-3 border-b border-purple-100">
                <div className="text-xs font-bold text-purple-500 uppercase tracking-wide mb-0.5">Stop example</div>
                <div className="text-sm font-bold text-slate-800">{kidsPreviewStopName}</div>
              </div>
              <div className="px-4 py-3 space-y-4">

                {/* Story */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span>🎧</span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Story</span>
                  </div>
                  <div className="bg-white rounded-xl px-3 py-2.5 border border-slate-100">
                    <p className="text-xs text-slate-600 mb-2.5 leading-relaxed">
                      "Why do people still visit {kidsPreviewStopName}? Let me tell you..."
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "#D4872B" }}
                      >
                        <span className="text-white text-xs">▶</span>
                      </div>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-1/3 h-full bg-orange-300 rounded-full" />
                      </div>
                      <div
                        className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs shrink-0"
                      >
                        🔇
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mission */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span>🎯</span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Mission</span>
                  </div>
                  <div className="bg-white rounded-xl px-3 py-2.5 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-700">Find the oldest part of {kidsPreviewStopName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Look around — what clues can you spot?</p>
                  </div>
                </div>

                {/* Quick games */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span>⚡</span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Quick games</span>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { emoji: "🔍", name: "Scavenger Hunt", desc: "Find hidden clues around the stop — who can spot them first?" },
                      { emoji: "⚡", name: "Think Fast", desc: "Quick-fire questions about what they're seeing. Earn XP for speed!" },
                    ].map((game) => (
                      <button
                        key={game.name}
                        onClick={() => setKidsPreviewActiveGame(prev => prev === game.name ? null : game.name)}
                        className={`flex-1 bg-white rounded-xl px-3 py-2.5 border text-center transition-colors ${kidsPreviewActiveGame === game.name ? "border-purple-300 bg-purple-50" : "border-slate-100 hover:border-slate-200"}`}
                        data-testid={`button-kids-game-${game.name.toLowerCase().replace(" ", "-")}`}
                      >
                        <div className="text-xl mb-1">{game.emoji}</div>
                        <div className="text-xs font-semibold text-slate-700">{game.name}</div>
                        {kidsPreviewActiveGame === game.name && (
                          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed text-left">{game.desc}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Handoff flow */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="text-center px-2">
                <div className="text-2xl mb-1">👨‍👩‍👧</div>
                <div className="text-[11px] text-slate-500 font-medium">Parent</div>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="text-slate-300 text-base leading-none">→</div>
                <div className="text-[10px] text-slate-400">hand it over</div>
              </div>
              <div className="text-center px-2">
                <div className="text-2xl mb-1">🧒</div>
                <div className="text-[11px] text-slate-500 font-medium">Kid explores</div>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="text-slate-300 text-base leading-none">→</div>
                <div className="text-[10px] text-slate-400">hands back</div>
              </div>
              <div className="text-center px-2">
                <div className="text-2xl mb-1">👨‍👩‍👧</div>
                <div className="text-[11px] text-slate-500 font-medium">Parent continues</div>
              </div>
            </div>

            <button
              onClick={() => setKidsPreviewOpen(false)}
              className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all active:opacity-80"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)" }}
              data-testid="button-kids-preview-close"
            >
              Got it 👍
            </button>
          </div>
        </div>
      )}

      {/* ── Move Stop Bottom Sheet ── */}
      {moveStopSheet.show && moveStopSheet.stop && (() => {
        const movingStop = moveStopSheet.stop;
        const totalDays = dayGroups.length;
        const spd = stopsPerDayFromPace(currentTrip?.pace);
        const startDate = (currentTrip as any)?.startDate;

        const getDayStatus = (dayIdx: number): "past" | "current" | "future" => {
          if (startDate) {
            const todayStr = (() => {
              const t = new Date();
              return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
            })();
            const dayDate = getDayDate(dayIdx);
            if (dayDate < todayStr) return "past";
            if (dayDate === todayStr) return "current";
            return "future";
          }
          if (dayIdx < activeDay) return "past";
          if (dayIdx === activeDay) return "current";
          return "future";
        };

        const targetDayStops = moveStopSheet.targetDayIdx !== null ? (dayGroups[moveStopSheet.targetDayIdx] || []) : [];
        const targetDayIsPacked = targetDayStops.filter(s => s.id !== movingStop.id).length >= spd;

        return (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={(e) => { if (e.target === e.currentTarget) closeMoveStopSheet(); }}
            data-testid="sheet-move-stop"
          >
            <div
              className="w-full bg-white rounded-t-3xl overflow-hidden"
              style={{ maxHeight: "85vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mt-4 mb-1" />

              {/* ── Step: pick_day ── */}
              {moveStopSheet.step === "pick_day" && (
                <div className="flex flex-col" style={{ maxHeight: "82vh" }}>
                  <div className="px-5 pt-3 pb-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <h2 className="text-base font-bold text-gray-900">Move stop</h2>
                      <button onClick={closeMoveStopSheet} className="p-1.5 rounded-full hover:bg-gray-100" data-testid="button-move-stop-close">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mb-3 truncate max-w-xs">{movingStop.name}</p>
                  </div>
                  <div className="overflow-y-auto flex-1 px-4 pb-5">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Choose a day</p>
                    {Array.from({ length: totalDays }, (_, di) => {
                      const status = getDayStatus(di);
                      const isPast = status === "past";
                      const isCurrent = di === activeDay;
                      const dayStops = dayGroups[di] || [];
                      const otherStops = dayStops.filter(s => s.id !== movingStop.id);
                      const packed = otherStops.length >= spd;
                      const cityName = dayToCityName[di] || activeDayCityName;
                      const dateLabel = startDate ? (() => {
                        const dd = getDayDate(di);
                        const d = new Date(dd + "T12:00:00");
                        return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                      })() : null;
                      const isSelected = moveStopSheet.targetDayIdx === di;
                      const isDisabled = isPast || isCurrent;

                      return (
                        <button
                          key={di}
                          disabled={isDisabled}
                          onClick={() => setMoveStopSheet(s => ({ ...s, targetDayIdx: di }))}
                          className={[
                            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl mb-2 transition-all text-left",
                            isSelected ? "bg-green-50 border-2 border-green-400" : "bg-gray-50 border-2 border-transparent",
                            isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100 active:scale-[0.98]",
                          ].join(" ")}
                          data-testid={`button-move-day-${di}`}
                        >
                          <div
                            className={[
                              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                              isSelected ? "bg-green-400 text-white" : "bg-white text-gray-500 border border-gray-200",
                            ].join(" ")}
                          >
                            {di + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={["text-sm font-semibold", isSelected ? "text-green-700" : "text-gray-800"].join(" ")}>
                                Day {di + 1}
                              </span>
                              {cityName && <span className="text-[11px] text-gray-400 truncate max-w-[100px]">{cityName}</span>}
                              {isCurrent && (
                                <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">Already here</span>
                              )}
                              {isPast && (
                                <span className="text-[10px] font-semibold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Past</span>
                              )}
                              {packed && !isDisabled && (
                                <span className="text-[10px] font-semibold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Packed</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {dateLabel && <span className="text-[11px] text-gray-400">{dateLabel}</span>}
                              <span className="text-[11px] text-gray-400">{otherStops.length} stop{otherStops.length !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-4 pb-6 pt-2 border-t border-gray-100">
                    <button
                      disabled={moveStopSheet.targetDayIdx === null}
                      onClick={() => setMoveStopSheet(s => ({ ...s, step: "pick_method" }))}
                      className={[
                        "w-full py-3.5 rounded-2xl font-bold text-sm transition-all",
                        moveStopSheet.targetDayIdx !== null
                          ? "bg-gray-900 text-white active:opacity-80"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed",
                      ].join(" ")}
                      data-testid="button-move-day-continue"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step: pick_method ── */}
              {moveStopSheet.step === "pick_method" && moveStopSheet.targetDayIdx !== null && (
                <div className="px-5 pt-3 pb-8">
                  <div className="flex items-center gap-2 mb-0.5">
                    <button onClick={() => setMoveStopSheet(s => ({ ...s, step: "pick_day" }))} className="p-1.5 rounded-full hover:bg-gray-100" data-testid="button-move-back-to-day">
                      <ArrowLeft className="w-4 h-4 text-gray-400" />
                    </button>
                    <h2 className="text-base font-bold text-gray-900">Add to Day {moveStopSheet.targetDayIdx + 1}</h2>
                    <div className="flex-1" />
                    <button onClick={closeMoveStopSheet} className="p-1.5 rounded-full hover:bg-gray-100" data-testid="button-move-method-close">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mb-4 pl-9">How should we fit {movingStop.name} in?</p>

                  {targetDayIsPacked && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4">
                      <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
                      <p className="text-xs text-amber-700">
                        <span className="font-semibold">Day {moveStopSheet.targetDayIdx + 1} is already full.</span> Adding more stops may make the day too long. Consider replacing a stop instead.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => handleMoveStop(movingStop, moveStopSheet.targetDayIdx!, "add")}
                    disabled={moveStopSheet.isMoving}
                    className="w-full flex items-start gap-3 bg-gray-50 hover:bg-gray-100 border-2 border-transparent rounded-2xl px-4 py-4 mb-3 text-left transition-all active:scale-[0.98]"
                    data-testid="button-move-method-add"
                  >
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Add to this day</p>
                      <p className="text-xs text-gray-400 mt-0.5">Place it at the end of Day {moveStopSheet.targetDayIdx + 1}</p>
                    </div>
                    {moveStopSheet.isMoving && <Loader2 className="w-4 h-4 text-gray-400 animate-spin ml-auto mt-1 shrink-0" />}
                  </button>

                  {targetDayStops.filter(s => s.id !== movingStop.id && !s.isVisited).length > 0 && (
                    <button
                      onClick={() => setMoveStopSheet(s => ({ ...s, step: "pick_replace" }))}
                      disabled={moveStopSheet.isMoving}
                      className="w-full flex items-start gap-3 bg-gray-50 hover:bg-gray-100 border-2 border-transparent rounded-2xl px-4 py-4 text-left transition-all active:scale-[0.98]"
                      data-testid="button-move-method-replace"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <RefreshCw className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Replace a stop</p>
                        <p className="text-xs text-gray-400 mt-0.5">Swap out one of the stops already on Day {moveStopSheet.targetDayIdx + 1}</p>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* ── Step: pick_replace ── */}
              {moveStopSheet.step === "pick_replace" && moveStopSheet.targetDayIdx !== null && (
                <div className="flex flex-col" style={{ maxHeight: "82vh" }}>
                  <div className="px-5 pt-3 pb-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <button onClick={() => setMoveStopSheet(s => ({ ...s, step: "pick_method" }))} className="p-1.5 rounded-full hover:bg-gray-100" data-testid="button-move-back-to-method">
                        <ArrowLeft className="w-4 h-4 text-gray-400" />
                      </button>
                      <h2 className="text-base font-bold text-gray-900">Choose a stop to replace</h2>
                      <div className="flex-1" />
                      <button onClick={closeMoveStopSheet} className="p-1.5 rounded-full hover:bg-gray-100" data-testid="button-move-replace-close">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 pl-9 mb-3">On Day {moveStopSheet.targetDayIdx + 1} — tap a stop to remove it and place {movingStop.name} there</p>
                  </div>
                  <div className="overflow-y-auto flex-1 px-4 pb-6">
                    {targetDayStops
                      .filter(s => s.id !== movingStop.id && !s.isVisited)
                      .map(candidate => (
                        <button
                          key={candidate.id}
                          onClick={() => handleMoveStop(movingStop, moveStopSheet.targetDayIdx!, "replace", candidate)}
                          disabled={moveStopSheet.isMoving}
                          className="w-full flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-2xl px-4 py-3.5 mb-2 text-left transition-all active:scale-[0.98]"
                          data-testid={`button-move-replace-${candidate.id}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{candidate.name}</p>
                            {candidate.stopType && <p className="text-[11px] text-gray-400 capitalize">{candidate.stopType.replace("_", " ")}</p>}
                          </div>
                          {moveStopSheet.isMoving
                            ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
                            : <Trash2 className="w-3.5 h-3.5 text-red-300 shrink-0" />
                          }
                        </button>
                      ))
                    }
                    {targetDayStops.filter(s => s.id !== movingStop.id && !s.isVisited).length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-6">No stops available to replace on this day.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
