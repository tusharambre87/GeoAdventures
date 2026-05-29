import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { SignUpPrompt } from "@/components/SignUpPrompt";
import { useLocation } from "wouter";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { ArrowLeft, Trophy, Star, RotateCcw, Play, ChevronRight, Clock, Zap, MapPin, Compass, Volume2, VolumeX, Search, X, GripVertical, Sparkles, Wand2, Check, Swords } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  POPULAR_CITIES,
  CITY_COORDS,
  getCoordsForName,
} from "@/lib/travelDestinations";
import { useCompassTTS } from "@/hooks/useCompassTTS";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useExplorer } from "@/lib/explorerContext";
import { useUser } from "@/lib/userContext";
import confetti from "canvas-confetti";
import {
  ADVENTURES,
  loadProgress,
  saveProgress,
  saveCustomAdventure,
  loadCustomAdventure,
  loadAllCustomAdventures,
  clearProgress,
  loadRecords,
  saveRecord,
  calculateXP,
  formatTime,
  makeCompassOptions,
  loadCompassStats,
  saveCompassStats,
  loadCompassAchievements,
  saveCompassAchievements,
  checkAndUnlockAchievements,
  ACHIEVEMENTS,
  getContinentForCity,
  type Adventure,
  type AdventureProgress,
  type AdventureRecord,
  type QuestStep,
  type CompassDirection,
  type CityCoords,
  type CompassStats,
  type AchievementDef,
  type AchievementsRecord,
} from "@/lib/compassQuestData";
import { getDistanceMiles, getBearing } from "@/lib/compassQuestMaps";

declare const L: typeof import("leaflet");
import turkeyPiece1 from "@assets/1_1773756593418.png";
import turkeyPiece2 from "@assets/2_1773756593418.png";
import turkeyPiece3 from "@assets/3_1773756593418.png";
import turkeyPiece4 from "@assets/4_1773756593418.png";
import turkeyPiece5 from "@assets/5_1773756593419.png";
import turkeyPiece6 from "@assets/6_1773756593419.png";
import turkeyPiece7 from "@assets/7_1773756593419.png";
import turkeyPiece8 from "@assets/8_1773756593419.png";
import turkeyComplete from "@assets/9_1773756734361.png";
import landmarkMountains from "@assets/landmark_rocky_mountains.png";
import landmarkStatue from "@assets/landmark_statue_of_liberty.png";
import landmarkEiffel from "@assets/landmark_eiffel_tower.png";
import landmarkStBasils from "@assets/landmark_st_basils.png";
import landmarkRedFort from "@assets/landmark_red_fort.png";
import compassPiece1 from "@assets/1_1773783789733.png";
import compassPiece2 from "@assets/2_1773783789734.png";
import compassPiece3 from "@assets/3_1773783789734.png";
import compassPiece4 from "@assets/4_1773783789734.png";
import compassPiece5 from "@assets/5_1773783789734.png";
import compassPiece6 from "@assets/6_1773783789734.png";
import compassPiece7 from "@assets/7_1773783789734.png";
import compassFinal from "@assets/Final_1773778755873.png";
import kenyaMap from "@assets/kenya_map.png";
import landmarkTableMountain from "@assets/landmark_table_mountain.png";
import landmarkChristRedeemer from "@assets/landmark_christ_redeemer.png";
import landmarkVancouver from "@assets/landmark_vancouver.png";
import landmarkSpaceNeedle from "@assets/landmark_space_needle.png";
import landmarkNiagaraFalls from "@assets/landmark_niagara_falls.png";
import landmarkChicagoSkyline from "@assets/landmark_chicago_skyline.png";
import landmarkWhiteHouse from "@assets/landmark_white_house.png";
import landmarkHonolulu from "@assets/landmark_honolulu.png";
import landmarkKangarooOutback from "@assets/landmark_kangaroo_outback.png";
import landmarkSkyTowerAuckland from "@assets/landmark_sky_tower_auckland.png";
import landmarkGrandPalaceBangkok from "@assets/landmark_grand_palace_bangkok.png";
import landmarkGreatWallChina from "@assets/landmark_great_wall_china.png";
import landmarkHobbitonShire from "@assets/landmark_hobbiton_shire.png";
import landmarkHanoiFlagTower from "@assets/landmark_hanoi_flag_tower.png";
import ringPiece1 from "@assets/1_1774016324039.png";
import ringPiece2 from "@assets/2_1774016324039.png";
import ringPiece3 from "@assets/3_1774016324039.png";
import ringPiece4 from "@assets/4_1774016324039.png";
import ringPiece5 from "@assets/5_1774016324039.png";
import ringPiece6 from "@assets/6_1774033297113.png";
import ringPiece7 from "@assets/7_1774020595981.png";
import finalRingImg from "@assets/Final_Ring_1774016324040.png";
import finalCrownImg from "@assets/Final_Crown_1774016361106.png";
import mergedCrownCrownImg from "@assets/Final_Crown_1774016689936.png";
import mergedCrownRingImg from "@assets/Final_Ring_1774016697774.png";
import mergedCrownFinalImg from "@assets/Merged_Crown_1774016789950.png";
import artifactPiece1 from "@assets/1_1773862276946.png";
import artifactPiece2 from "@assets/2_1773862276946.png";
import artifactPiece3 from "@assets/3_1773862276946.png";
import artifactPiece4 from "@assets/4_1773862276946.png";
import artifactPiece5 from "@assets/5_1773862276947.png";
import artifactPiece6 from "@assets/6_1773862276947.png";
import artifactPiece7 from "@assets/7_1773862276947.png";
import brokenCrown from "@assets/Broken_Crown_1773862281000.png";
import finalCrown from "@assets/Final_Crown_1773862281000.png";
import journalPage1 from "@assets/1_1773943514400.png";
import journalPage2 from "@assets/2_1773943514400.png";
import journalPage3 from "@assets/3_1773943514400.png";
import journalPage4 from "@assets/4_1773943514400.png";
import journalPage5 from "@assets/5_1773943514401.png";
import journalPage6 from "@assets/6_1773943514401.png";
import journalPage7 from "@assets/7_1773943514401.png";
import journalAllPages from "@assets/All_Pages_1773943514401.png";
import journalFinal from "@assets/Final_Journal_1773943514401.png";

const TURKEY_PIECES = [turkeyPiece1, turkeyPiece2, turkeyPiece3, turkeyPiece4, turkeyPiece5, turkeyPiece6, turkeyPiece7, turkeyPiece8];
const COMPASS_PIECES = [compassPiece1, compassPiece2, compassPiece3, compassPiece4, compassPiece5, compassPiece6, compassPiece7];
const ARTIFACT_PIECES = [artifactPiece1, artifactPiece2, artifactPiece3, artifactPiece4, artifactPiece5, artifactPiece6, artifactPiece7];
const FINAL_RING_PIECES = [ringPiece1, ringPiece2, ringPiece3, ringPiece4, ringPiece5, ringPiece6, ringPiece7];
const JOURNAL_PAGES = [journalPage1, journalPage2, journalPage3, journalPage4, journalPage5, journalPage6, journalPage7];

type Screen = "entry" | "campaign" | "intro" | "clue" | "city-guess" | "compass-guess" | "travel" | "fragment" | "victory" | "create-step1" | "create-step2" | "create-step3" | "quest-preview" | "my-quests" | "my-challenges" | "explorer-dashboard";

interface CompassNeedleProps {
  targetDegrees: number;
  spinning: boolean;
  revealed: boolean;
}

function CompassNeedle({ targetDegrees, spinning, revealed }: CompassNeedleProps) {
  const [currentDeg, setCurrentDeg] = useState(0);

  useEffect(() => {
    if (spinning) {
      let frame: number;
      let deg = 0;
      const spin = () => {
        deg += 8;
        setCurrentDeg(deg % 360);
        frame = requestAnimationFrame(spin);
      };
      frame = requestAnimationFrame(spin);
      return () => cancelAnimationFrame(frame);
    } else if (revealed) {
      setCurrentDeg(targetDegrees);
    }
  }, [spinning, revealed, targetDegrees]);

  return (
    <div className="relative w-48 h-48 mx-auto">
      <div className="absolute inset-0 rounded-full border-4 border-amber-700 bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg">
        {["N", "E", "S", "W"].map((dir, i) => {
          const positions = [
            { top: "8px", left: "50%", transform: "translateX(-50%)" },
            { top: "50%", right: "8px", transform: "translateY(-50%)" },
            { bottom: "8px", left: "50%", transform: "translateX(-50%)" },
            { top: "50%", left: "8px", transform: "translateY(-50%)" },
          ];
          return (
            <span
              key={dir}
              className="absolute text-sm font-bold text-amber-800"
              style={positions[i] as React.CSSProperties}
            >
              {dir}
            </span>
          );
        })}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div
            key={deg}
            className="absolute w-0.5 h-3 bg-amber-400"
            style={{
              top: "50%",
              left: "50%",
              transformOrigin: "center 0",
              transform: `translate(-50%, -100%) rotate(${deg}deg) translateY(-68px)`,
            }}
          />
        ))}
      </div>
      <motion.div
        className="absolute top-1/2 left-1/2 w-1 origin-bottom"
        style={{ height: "70px", marginLeft: "-2px", marginTop: "-70px" }}
        animate={{ rotate: currentDeg }}
        transition={spinning ? { duration: 0 } : { type: "spring", stiffness: 60, damping: 12 }}
      >
        <div className="w-0 h-0 mx-auto" style={{
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderBottom: "60px solid #DC2626",
          marginLeft: "-4px",
        }} />
      </motion.div>
      <motion.div
        className="absolute top-1/2 left-1/2 w-1 origin-top"
        style={{ height: "70px", marginLeft: "-2px", marginTop: "0px" }}
        animate={{ rotate: currentDeg }}
        transition={spinning ? { duration: 0 } : { type: "spring", stiffness: 60, damping: 12 }}
      >
        <div className="w-0 h-0 mx-auto" style={{
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "50px solid #94A3B8",
          marginLeft: "-3.5px",
        }} />
      </motion.div>
      <div className="absolute top-1/2 left-1/2 w-4 h-4 -ml-2 -mt-2 rounded-full bg-amber-700 border-2 border-amber-900 z-10" />
    </div>
  );
}

function getDirectionArrow(degrees: number): string {
  const arrows: Record<number, string> = {
    0: "↑", 45: "↗", 90: "→", 135: "↘",
    180: "↓", 225: "↙", 270: "←", 315: "↖",
  };
  return arrows[degrees] || "→";
}

function ZoomedMapTravel({ from, fromCoords, to, toCoords, onComplete, directionLabel, transportMode }: {
  from: string;
  fromCoords: CityCoords;
  to: string;
  toCoords: CityCoords;
  onComplete: () => void;
  directionLabel?: string;
  transportMode?: "plane" | "car" | "train" | "ship";
}) {
  const [progress, setProgress] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const planeMarkerRef = useRef<L.Marker | null>(null);
  const trailLineRef = useRef<L.Polyline | null>(null);

  const distMiles = getDistanceMiles(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
  const bearing = directionLabel || getBearing(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);

  useEffect(() => {
    const L = (window as unknown as Record<string, unknown>).L as typeof import("leaflet");
    const hasValidCoords = Number.isFinite(fromCoords.lat) && Number.isFinite(fromCoords.lng) && (fromCoords.lat !== 0 || fromCoords.lng !== 0);
    const hasValidDestCoords = Number.isFinite(toCoords.lat) && Number.isFinite(toCoords.lng) && (toCoords.lat !== 0 || toCoords.lng !== 0);
    if (!L || !mapContainerRef.current || mapRef.current || !hasValidCoords || !hasValidDestCoords) return;

    const fromLL: [number, number] = [fromCoords.lat, fromCoords.lng];
    const toLL: [number, number] = [toCoords.lat, toCoords.lng];

    const bounds = L.latLngBounds([fromLL, toLL]);
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
      boxZoom: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });

    const fromIcon = L.divIcon({
      className: "",
      html: `<div style="background:#EF4444;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);transform:translate(-7px,-7px)"></div>`,
      iconSize: [0, 0],
    });
    const toIcon = L.divIcon({
      className: "",
      html: `<div style="background:#22C55E;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);transform:translate(-7px,-7px)"></div>`,
      iconSize: [0, 0],
    });

    L.marker(fromLL, { icon: fromIcon, interactive: false }).addTo(map);
    L.marker(toLL, { icon: toIcon, interactive: false }).addTo(map);

    const makeLabelIcon = (text: string, color: string) => L.divIcon({
      className: "",
      html: `<div style="position:relative;left:-50%;background:white;padding:3px 10px;border-radius:10px;font-size:12px;font-weight:700;color:${color};white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.2);width:max-content">${text}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, -8],
    });
    L.marker(fromLL, { icon: makeLabelIcon(from, "#1F2937"), interactive: false }).addTo(map);
    L.marker(toLL, { icon: makeLabelIcon(to, "#16A34A"), interactive: false }).addTo(map);

    L.polyline([fromLL, toLL], { color: "#F59E0B", weight: 2, dashArray: "8,6", opacity: 0.5 }).addTo(map);

    trailLineRef.current = L.polyline([fromLL, fromLL], { color: "#F59E0B", weight: 3, opacity: 0.9 }).addTo(map);

    const isSideViewEmoji = transportMode === "car" || transportMode === "train" || transportMode === "ship";
    const travelEmoji = transportMode === "car" ? "🚗" : transportMode === "train" ? "🚂" : transportMode === "ship" ? "🚢" : "✈️";
    const sideYOffset = transportMode === "train" ? -26 : transportMode === "ship" ? -22 : -20;
    const baseTransform = isSideViewEmoji
      ? `translate(-14px,${sideYOffset}px) scaleX(-1)`
      : "translate(-14px,-14px)";
    const planeIcon = L.divIcon({
      className: "",
      html: `<div style="font-size:28px;line-height:1;transform:${baseTransform};filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))">${travelEmoji}</div>`,
      iconSize: [0, 0],
    });
    planeMarkerRef.current = L.marker(fromLL, { icon: planeIcon, interactive: false }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [from, fromCoords, to, toCoords]);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 3500;
    let frame: number;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);

      const lat = fromCoords.lat + (toCoords.lat - fromCoords.lat) * p;
      const lng = fromCoords.lng + (toCoords.lng - fromCoords.lng) * p;
      const L = (window as unknown as Record<string, unknown>).L as typeof import("leaflet");
      if (planeMarkerRef.current && L && mapRef.current) {
        planeMarkerRef.current.setLatLng([lat, lng]);
        const fromPx = mapRef.current.latLngToContainerPoint([fromCoords.lat, fromCoords.lng]);
        const toPx = mapRef.current.latLngToContainerPoint([toCoords.lat, toCoords.lng]);
        const screenAngle = Math.atan2(toPx.y - fromPx.y, toPx.x - fromPx.x) * (180 / Math.PI);
        const planeEl = planeMarkerRef.current.getElement();
        if (planeEl) {
          const inner = planeEl.querySelector("div") as HTMLElement | null;
          if (inner) {
            const sideView = transportMode === "car" || transportMode === "train" || transportMode === "ship";
            if (sideView) {
              const yOff = transportMode === "train" ? -26 : transportMode === "ship" ? -22 : -20;
              if (Math.abs(screenAngle) <= 90) {
                // East hemisphere (including due north/south at ±90°):
                // mirror flips the left-facing emoji to face right, then rotate toward destination.
                inner.style.transform = `translate(-14px,${yOff}px) rotate(${screenAngle}deg) scaleX(-1)`;
              } else {
                // West hemisphere: no mirror — original left-facing emoji naturally faces west.
                // Use a small tilt from the 180° west baseline to avoid going upside-down.
                const tilt = screenAngle > 0 ? screenAngle - 180 : screenAngle + 180;
                inner.style.transform = `translate(-14px,${yOff}px) rotate(${tilt}deg)`;
              }
            } else {
              inner.style.transform = `translate(-14px,-14px) rotate(${screenAngle}deg)`;
            }
          }
        }
      }
      if (trailLineRef.current) {
        trailLineRef.current.setLatLngs([
          [fromCoords.lat, fromCoords.lng],
          [lat, lng],
        ]);
      }

      if (p < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        setTimeout(onComplete, 400);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [onComplete, fromCoords, toCoords]);

  const milesTraveled = Math.round(distMiles * progress);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-2 space-y-3"
    >
      <div className="flex items-center gap-2 text-amber-700">
        <span className="text-lg">{transportMode === "car" ? "🚗" : transportMode === "train" ? "🚂" : transportMode === "ship" ? "🚢" : "✈️"}</span>
        <p className="text-base font-bold">{transportMode === "car" ? "Driving to" : transportMode === "train" ? "Riding the train to" : transportMode === "ship" ? "Cruising to" : "Flying to"} {to}!</p>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full rounded-2xl overflow-hidden border-2 border-amber-200 shadow-lg"
        style={{ height: 280 }}
      />

      <div className="w-full max-w-xs mx-auto">
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-xs text-amber-600 text-center mt-1 font-medium">
          {milesTraveled.toLocaleString()} of {distMiles.toLocaleString()} miles {bearing}
        </p>
      </div>
    </motion.div>
  );
}

function TurkeyPieceDisplay({ pieceIndex, size = 180 }: { pieceIndex: number; size?: number }) {
  const src = TURKEY_PIECES[pieceIndex];
  if (!src) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.6, type: "spring" }}
      className="mx-auto rounded-2xl overflow-hidden bg-white shadow-xl border-2 border-amber-200"
      style={{ width: size, height: size }}
    >
      <img src={src} alt={`Map piece ${pieceIndex + 1}`} className="w-full h-full object-contain" draggable={false} />
    </motion.div>
  );
}

const LANDMARK_IMAGES: Record<string, string> = {
  mountains: landmarkMountains,
  "statue-of-liberty": landmarkStatue,
  "eiffel-tower": landmarkEiffel,
  "st-basils": landmarkStBasils,
  "red-fort": landmarkRedFort,
  "table-mountain": landmarkTableMountain,
  "christ-redeemer": landmarkChristRedeemer,
  "vancouver-skyline": landmarkVancouver,
  "space-needle": landmarkSpaceNeedle,
  "niagara-falls": landmarkNiagaraFalls,
  "chicago-skyline": landmarkChicagoSkyline,
  "white-house": landmarkWhiteHouse,
  "honolulu-landscape": landmarkHonolulu,
  "kangaroo-outback": landmarkKangarooOutback,
  "hobbiton-shire": landmarkHobbitonShire,
  "hanoi-flag-tower": landmarkHanoiFlagTower,
  "sky-tower-auckland": landmarkSkyTowerAuckland,
  "grand-palace-bangkok": landmarkGrandPalaceBangkok,
  "great-wall-china": landmarkGreatWallChina,
};

const LANDMARK_EMOJIS: Record<string, string> = {
  "table-mountain": "🏔️",
  "christ-redeemer": "✝️",
  "vancouver-skyline": "🌄",
  "space-needle": "🗼",
  "casablanca": "🕌",
  "nairobi": "🦁",
  "johannesburg": "💎",
  "santiago": "🏔️",
  "lima": "🦙",
  "havana": "🎺",
  "mexico-city": "🌮",
  "rome": "🏛️",
  "istanbul": "🕌",
  "mumbai": "🎬",
  "bali": "🌴",
  "jakarta": "🌺",
  "colombo": "🌊",
  "cairo": "🔺",
  "giza": "🔺",
  "london": "🔔",
  "buenos-aires": "💃",
  "montreal": "🍁",
  "quebec-city": "🏰",
  "tokyo": "⛩️",
  "manila": "🌺",
  "delhi": "🕌",
  "new-delhi": "🕌",
  "bogota": "🌿",
  "bogotá": "🌿",
  "moscow": "🏛️",
  "beijing": "🏯",
  "sydney": "🦘",
  "auckland": "🌋",
  "bangkok": "⛩️",
  "seattle": "🗼",
};

const CITY_COUNTRY_CODES: Record<string, string> = {
  "paris": "fr", "lyon": "fr", "nice": "fr",
  "rome": "it", "milan": "it", "venice": "it", "florence": "it", "naples": "it",
  "london": "gb", "edinburgh": "gb", "manchester": "gb",
  "berlin": "de", "munich": "de", "hamburg": "de", "frankfurt": "de",
  "madrid": "es", "barcelona": "es", "seville": "es", "valencia": "es",
  "amsterdam": "nl", "rotterdam": "nl",
  "athens": "gr", "thessaloniki": "gr",
  "istanbul": "tr", "ankara": "tr",
  "moscow": "ru", "st. petersburg": "ru", "saint petersburg": "ru",
  "tokyo": "jp", "osaka": "jp", "kyoto": "jp", "hiroshima": "jp",
  "beijing": "cn", "shanghai": "cn", "hong kong": "hk", "guangzhou": "cn",
  "bangkok": "th", "chiang mai": "th",
  "mumbai": "in", "delhi": "in", "new delhi": "in", "bangalore": "in", "kolkata": "in", "chennai": "in", "agra": "in",
  "seoul": "kr", "busan": "kr",
  "singapore": "sg",
  "dubai": "ae", "abu dhabi": "ae",
  "sydney": "au", "melbourne": "au", "brisbane": "au", "perth": "au", "cairns": "au",
  "auckland": "nz", "wellington": "nz", "queenstown": "nz",
  "cairo": "eg", "alexandria": "eg", "giza": "eg",
  "nairobi": "ke", "mombasa": "ke",
  "cape town": "za", "johannesburg": "za", "durban": "za",
  "casablanca": "ma", "marrakech": "ma",
  "lagos": "ng", "abuja": "ng",
  "accra": "gh",
  "addis ababa": "et",
  "rio de janeiro": "br", "são paulo": "br", "sao paulo": "br", "brasilia": "br",
  "buenos aires": "ar",
  "lima": "pe",
  "santiago": "cl",
  "bogotá": "co", "bogota": "co",
  "havana": "cu",
  "mexico city": "mx",
  "toronto": "ca", "vancouver": "ca", "montreal": "ca", "quebec city": "ca", "ottawa": "ca",
  "new york": "us", "new york city": "us", "los angeles": "us", "chicago": "us",
  "san francisco": "us", "seattle": "us", "washington dc": "us", "washington d.c.": "us",
  "honolulu": "us", "miami": "us", "las vegas": "us", "denver": "us",
  "reykjavik": "is",
  "oslo": "no", "bergen": "no",
  "stockholm": "se", "gothenburg": "se",
  "copenhagen": "dk",
  "helsinki": "fi",
  "vienna": "at",
  "prague": "cz",
  "budapest": "hu",
  "warsaw": "pl", "krakow": "pl",
  "lisbon": "pt", "porto": "pt",
  "brussels": "be",
  "zurich": "ch", "geneva": "ch",
  "dublin": "ie",
  "dubai": "ae",
  "riyadh": "sa",
  "tehran": "ir",
  "karachi": "pk",
  "dhaka": "bd",
  "colombo": "lk",
  "kathmandu": "np",
  "yangon": "mm",
  "hanoi": "vn", "ho chi minh city": "vn",
  "manila": "ph",
  "jakarta": "id", "bali": "id",
  "kuala lumpur": "my",
  "taipei": "tw",
  "ulaanbaatar": "mn",
  "almaty": "kz",
  "tashkent": "uz",
  "tbilisi": "ge",
  "baku": "az",
  "yerevan": "am",
  "beirut": "lb",
  "amman": "jo",
  "baghdad": "iq",
  "muscat": "om",
  "doha": "qa",
  "kuwait city": "kw",
  "rabat": "ma",
  "tunis": "tn",
  "tripoli": "ly",
  "khartoum": "sd",
  "dakar": "sn",
  "kinshasa": "cd",
  "luanda": "ao",
  "dar es salaam": "tz",
  "kampala": "ug",
  "harare": "zw",
  "lusaka": "zm",
  "maputo": "mz",
  "antananarivo": "mg",
  "suva": "fj",
  "nadi": "fj",
  "lima": "pe",
  "quito": "ec",
  "caracas": "ve",
  "port-au-prince": "ht",
  "panama city": "pa",
  "san jose": "cr",
  "guatemala city": "gt",
};

function getCityCountryName(cityName: string): string | null {
  const code = CITY_COUNTRY_CODES[cityName.toLowerCase()];
  if (!code) return null;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

const CITY_LANDMARK_KEYS: Record<string, string> = {
  "washington dc": "white-house", "washington d.c.": "white-house",
  "new york": "statue-of-liberty", "new york city": "statue-of-liberty",
  "paris": "eiffel-tower",
  "moscow": "st-basils", "saint petersburg": "st-basils",
  "delhi": "red-fort", "new delhi": "red-fort",
  "cape town": "table-mountain",
  "rio de janeiro": "christ-redeemer",
  "vancouver": "vancouver-skyline",
  "seattle": "space-needle",
  "niagara falls": "niagara-falls",
  "chicago": "chicago-skyline",
  "honolulu": "honolulu-landscape",
  "sydney": "kangaroo-outback",
  "auckland": "sky-tower-auckland",
  "bangkok": "grand-palace-bangkok",
  "beijing": "great-wall-china",
};

function LandmarkClueCard({ landmarkClue }: { landmarkClue: { name: string; description: string; svg: string } }) {
  const staticSrc = LANDMARK_IMAGES[landmarkClue.svg];
  const [dynamicSrc, setDynamicSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (staticSrc) return;
    setLoading(true);
    fetch(`/api/compass/landmark-image/${encodeURIComponent(landmarkClue.svg)}?landmarkName=${encodeURIComponent(landmarkClue.name)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.imagePath) setDynamicSrc(data.imagePath);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [landmarkClue.svg, landmarkClue.name, staticSrc]);

  const imgSrc = staticSrc || dynamicSrc;

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50 overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-hidden rounded-t-lg flex items-center justify-center bg-gradient-to-b from-amber-100 to-orange-100" style={{ height: 140 }}>
          {imgSrc ? (
            <motion.img
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              src={imgSrc}
              alt={landmarkClue.name}
              className="w-full h-full object-cover object-center"
              draggable={false}
            />
          ) : loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-2">
              <div className="text-4xl animate-pulse">🗺️</div>
              <p className="text-xs text-amber-600">Loading image…</p>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.5 }} className="text-center space-y-2">
              <div className="text-6xl">{LANDMARK_EMOJIS[landmarkClue.svg] || "🗺️"}</div>
              <p className="text-sm font-semibold text-amber-800">{landmarkClue.name}</p>
            </motion.div>
          )}
        </div>
        <div className="p-3 text-center">
          <p className="text-sm text-gray-600 italic">{landmarkClue.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LandmarkRevealImage({ svgKey, altText }: { svgKey: string; altText: string }) {
  const staticSrc = LANDMARK_IMAGES[svgKey];
  const [dynamicSrc, setDynamicSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (staticSrc) return;
    setLoading(true);
    fetch(`/api/compass/landmark-image/${encodeURIComponent(svgKey)}?landmarkName=${encodeURIComponent(altText)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.imagePath) setDynamicSrc(data.imagePath); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [svgKey, altText, staticSrc]);

  const imgSrc = staticSrc || dynamicSrc;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -5 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
      className="mx-auto rounded-3xl overflow-hidden border-4 border-amber-300 shadow-2xl"
      style={{ width: 240, height: 180 }}
    >
      {imgSrc ? (
        <img src={imgSrc} alt={altText} className="w-full h-full object-cover" draggable={false} />
      ) : loading ? (
        <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex flex-col items-center justify-center gap-2">
          <div className="text-4xl animate-pulse">🌍</div>
          <p className="text-xs text-amber-600">Loading image…</p>
        </div>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
          <span className="text-6xl">🦘</span>
        </div>
      )}
    </motion.div>
  );
}

function FlagClueCard({ flagClue }: { flagClue: { countryCode: string; countryName: string; hint: string } }) {
  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-indigo-50 overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-b from-slate-100 to-slate-200 p-4 flex items-center justify-center" style={{ height: 120 }}>
          <motion.img
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            src={`https://flagcdn.com/w320/${flagClue.countryCode}.png`}
            alt={`${flagClue.countryName} flag`}
            className="h-20 rounded-md shadow-lg border border-gray-200"
            draggable={false}
          />
        </div>
        <div className="p-3 text-center">
          <p className="font-bold text-gray-800 text-base">Can you spot which country?</p>
          <p className="text-xs text-gray-500 mt-1 italic">{flagClue.hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TurkeyMapAssembly({ pieces, total, animateAssembly = false }: { pieces: number; total: number; animateAssembly?: boolean }) {
  const [showComplete, setShowComplete] = useState(false);
  const allCollected = pieces >= total;

  useEffect(() => {
    if (animateAssembly && allCollected) {
      const timer = setTimeout(() => setShowComplete(true), pieces * 300 + 600);
      return () => clearTimeout(timer);
    }
  }, [animateAssembly, allCollected, pieces]);

  if (showComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="mx-auto rounded-2xl overflow-hidden shadow-xl bg-white border-2 border-amber-200"
        style={{ width: 280, height: 160 }}
      >
        <motion.img
          src={turkeyComplete}
          alt="Complete Turkey Map"
          className="w-full h-full object-contain"
          draggable={false}
          animate={{ scale: [1, 1.1, 1.2, 1.3, 1.4, 1.3, 1.2, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    );
  }

  return (
    <div className="relative mx-auto" style={{ width: 280, height: 200 }}>
      <div className="grid grid-cols-4 gap-1 justify-items-center">
        {TURKEY_PIECES.map((src, i) => (
          <motion.div
            key={i}
            className="rounded-lg overflow-hidden bg-white shadow-md border border-amber-100"
            style={{ width: 64, height: 64 }}
            initial={animateAssembly ? { opacity: 0, scale: 0, rotate: -20 } : false}
            animate={i < pieces ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0.15, scale: 0.8 }}
            transition={animateAssembly ? { delay: i * 0.3, duration: 0.5, type: "spring" } : undefined}
          >
            <img src={src} alt={`Piece ${i + 1}`} className="w-full h-full object-contain" draggable={false} style={i >= pieces ? { filter: "grayscale(1) brightness(0.5)" } : undefined} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CompassAssembly({ pieces, total, animateAssembly = false, spinning = false }: { pieces: number; total: number; animateAssembly?: boolean; spinning?: boolean }) {
  const [showComplete, setShowComplete] = useState(false);
  const allCollected = pieces >= total;

  useEffect(() => {
    if (animateAssembly && allCollected) {
      const timer = setTimeout(() => setShowComplete(true), pieces * 300 + 600);
      return () => clearTimeout(timer);
    }
  }, [animateAssembly, allCollected, pieces]);

  if (showComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="mx-auto rounded-2xl overflow-hidden shadow-xl bg-white border-2 border-amber-200"
        style={{ width: 280, height: 280 }}
      >
        <motion.img
          src={compassFinal}
          alt="The Wayfinder Compass"
          className="w-full h-full object-contain"
          draggable={false}
          animate={spinning ? { rotate: 360 } : {}}
          transition={spinning ? { duration: 20, repeat: Infinity, ease: "linear" } : {}}
        />
      </motion.div>
    );
  }

  return (
    <div className="relative mx-auto" style={{ width: 280, height: 200 }}>
      <div className="grid grid-cols-4 gap-1 justify-items-center">
        {COMPASS_PIECES.map((src, i) => (
          <motion.div
            key={i}
            className="rounded-lg overflow-hidden bg-white shadow-md border border-amber-100"
            style={{ width: 64, height: 64 }}
            initial={animateAssembly ? { opacity: 0, scale: 0, rotate: -20 } : false}
            animate={i < pieces ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0.15, scale: 0.8 }}
            transition={animateAssembly ? { delay: i * 0.3, duration: 0.5, type: "spring" } : undefined}
          >
            <img src={src} alt={`Fragment ${i + 1}`} className="w-full h-full object-contain" draggable={false} style={i >= pieces ? { filter: "grayscale(1) brightness(0.5)" } : undefined} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CrownAssembly({ animateAssembly = false }: { animateAssembly?: boolean }) {
  const [phase, setPhase] = useState<"pieces" | "broken" | "final" | "dust">("pieces");

  useEffect(() => {
    if (!animateAssembly) return;
    const t1 = setTimeout(() => setPhase("broken"), 1200);
    const t2 = setTimeout(() => setPhase("final"), 3800);
    const t3 = setTimeout(() => setPhase("dust"), 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [animateAssembly]);

  const dustParticles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 220,
    y: -(Math.random() * 180 + 40),
    size: Math.random() * 6 + 3,
    delay: Math.random() * 0.6,
    color: ["#f59e0b", "#fbbf24", "#fcd34d", "#e5e7eb", "#d1fae5"][Math.floor(Math.random() * 5)],
  }));

  if (phase === "pieces") {
    return (
      <div className="relative mx-auto" style={{ width: 280, height: 220 }}>
        <div className="grid grid-cols-4 gap-1 justify-items-center">
          {ARTIFACT_PIECES.map((src, i) => (
            <motion.div
              key={i}
              className="rounded-lg overflow-hidden bg-white shadow-md border border-amber-100"
              style={{ width: 64, height: 64 }}
              initial={animateAssembly ? { opacity: 0, scale: 0, rotate: -20 } : false}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={animateAssembly ? { delay: i * 0.15, duration: 0.5, type: "spring" } : undefined}
            >
              <img src={src} alt={`Artifact ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "broken") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, type: "spring" }}
        className="mx-auto rounded-2xl overflow-hidden shadow-xl bg-white border-2 border-amber-200"
        style={{ width: 280, height: 280 }}
      >
        <img src={brokenCrown} alt="Broken Crown" className="w-full h-full object-contain" draggable={false} />
      </motion.div>
    );
  }

  return (
    <div className="relative mx-auto" style={{ width: 280, height: 280 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="rounded-2xl overflow-hidden shadow-xl bg-white border-2 border-amber-300"
        style={{ width: 280, height: 280 }}
      >
        <img src={finalCrown} alt="The Crown" className="w-full h-full object-contain" draggable={false} />
      </motion.div>
      {phase === "dust" && dustParticles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{ width: p.size, height: p.size, backgroundColor: p.color, bottom: "50%", left: "50%" }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
          transition={{ delay: p.delay, duration: 1.4, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function getFragmentPieces(adventureId: string): string[] {
  if (adventureId === "broken-trail") return COMPASS_PIECES;
  if (adventureId === "wild-signal") return ARTIFACT_PIECES;
  if (adventureId === "final-ring") return FINAL_RING_PIECES;
  if (adventureId.startsWith("custom-")) return FINAL_RING_PIECES;
  return TURKEY_PIECES;
}

function MapFragmentDisplay({ collected, total, adventureId }: { collected: number; total: number; adventureId?: string }) {
  const pieces = adventureId ? getFragmentPieces(adventureId) : TURKEY_PIECES;
  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-8 h-7 rounded overflow-hidden flex items-center justify-center ${
            i < collected
              ? "border-2 border-green-400 bg-white"
              : "bg-gray-100 border-2 border-dashed border-gray-300"
          }`}
        >
          {i < collected ? (
            <img
              src={pieces[i % pieces.length]}
              alt={`Piece ${i + 1}`}
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <span className="text-[8px] text-gray-400">?</span>
          )}
        </div>
      ))}
    </div>
  );
}

function AchievementUnlockBanner({ achievements, onDone }: { achievements: AchievementDef[]; onDone?: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(achievements.length > 0);

  useEffect(() => {
    if (achievements.length === 0) return;
    setCurrentIdx(0);
    setVisible(true);
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) throw new Error("no AudioContext");
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, [achievements]);

  useEffect(() => {
    if (!visible || achievements.length === 0) return;
    const timer = setTimeout(() => {
      if (currentIdx < achievements.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        setVisible(false);
        onDone?.();
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [currentIdx, visible, achievements.length]);

  if (!visible || achievements.length === 0) return null;
  const ach = achievements[currentIdx];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentIdx}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto max-w-xs"
        data-testid="achievement-unlock-banner"
      >
        <div className="flex items-center gap-3 bg-amber-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-amber-600">
          <span className="text-2xl">{ach.icon}</span>
          <div>
            <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">🏅 Achievement Unlocked!</p>
            <p className="text-sm font-bold">{ach.label}</p>
            <p className="text-[10px] text-amber-200">{ach.description}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

const CAT_STYLES: Record<string, { accent: string; bg: string; border: string; tab: string; glow: string; barColor: string; description: string }> = {
  "Explorer Progress": {
    accent: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200",
    tab: "bg-amber-500 border-amber-500", glow: "shadow-amber-100",
    barColor: "bg-amber-400", description: "Your journey across quests",
  },
  "Skills": {
    accent: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200",
    tab: "bg-blue-500 border-blue-500", glow: "shadow-blue-100",
    barColor: "bg-blue-400", description: "How sharp your instincts are",
  },
  "World Exploration": {
    accent: "text-green-700", bg: "bg-green-50", border: "border-green-200",
    tab: "bg-green-600 border-green-600", glow: "shadow-green-100",
    barColor: "bg-green-500", description: "How much of the world you've seen",
  },
  "Challenges": {
    accent: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200",
    tab: "bg-rose-500 border-rose-500", glow: "shadow-rose-100",
    barColor: "bg-rose-400", description: "How you compete with friends",
  },
  "Special": {
    accent: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200",
    tab: "bg-purple-500 border-purple-500", glow: "shadow-purple-100",
    barColor: "bg-purple-400", description: "Rare feats worth celebrating",
  },
};

function DashboardAchievementTabs({
  achievements,
  newlyUnlocked,
  stats,
}: {
  achievements: AchievementsRecord;
  newlyUnlocked: AchievementDef[];
  stats: CompassStats;
}) {
  const CATS = ["Explorer Progress", "Skills", "World Exploration", "Challenges", "Special"] as const;
  type Cat = typeof CATS[number];
  const [activeTab, setActiveTab] = useState<Cat>("Explorer Progress");

  const catStyle = CAT_STYLES[activeTab];
  const catAchievements = ACHIEVEMENTS.filter(a => a.category === activeTab);
  const catUnlocked = catAchievements.filter(a => achievements[a.key]);
  const catLocked = catAchievements.filter(a => !achievements[a.key]);

  return (
    <div className="space-y-3" data-testid="section-achievement-tabs">
      <h3 className="text-sm font-bold text-gray-700">All Achievements</h3>
      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {CATS.map(cat => {
          const catAchs = ACHIEVEMENTS.filter(a => a.category === cat);
          const catCount = catAchs.filter(a => achievements[a.key]).length;
          const isActive = activeTab === cat;
          const cs = CAT_STYLES[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat as Cat)}
              data-testid={`tab-achievement-${cat.toLowerCase().replace(/ /g, "-")}`}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isActive ? `${cs.tab} text-white shadow-md` : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {cat.split(" ")[0]}
              <span className={`ml-1 ${isActive ? "opacity-80" : "opacity-50"}`}>{catCount}/{catAchs.length}</span>
            </button>
          );
        })}
      </div>

      {/* Category identity */}
      <AnimatePresence mode="wait">
        <motion.p
          key={activeTab}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`text-xs font-medium ${catStyle.accent} px-1`}
        >
          {catStyle.description}
        </motion.p>
      </AnimatePresence>

      {/* Achievement cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="space-y-2"
        >
          {catUnlocked.map(ach => (
            <motion.div
              key={ach.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 bg-white rounded-2xl border-2 ${catStyle.border} p-3 shadow-sm ${catStyle.glow}`}
              data-testid={`achievement-card-${ach.key}`}
            >
              <span className="text-2xl">{ach.icon}</span>
              <div className="flex-1">
                <p className={`text-sm font-bold ${catStyle.accent}`}>{ach.label}</p>
                <p className="text-xs text-gray-400">{ach.description}</p>
              </div>
              {newlyUnlocked.some(n => n.key === ach.key) ? (
                <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded-full font-bold">New!</span>
              ) : (
                <span className="text-green-500 text-lg">✓</span>
              )}
            </motion.div>
          ))}
          {catLocked.map(ach => {
            const prog = ach.progress ? ach.progress(stats) : null;
            const pct = prog && prog.max > 0 ? Math.round((prog.value / prog.max) * 100) : 0;
            const hasProgress = prog !== null && prog.value > 0;
            return (
              <div
                key={ach.key}
                className={`rounded-2xl border border-solid ${catStyle.border} ${catStyle.bg} p-3 shadow-sm ${catStyle.glow}`}
                data-testid={`achievement-card-locked-${ach.key}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl opacity-60">{ach.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${catStyle.accent} opacity-75`}>{ach.label}</p>
                    <p className="text-xs text-gray-500">{ach.description}</p>
                  </div>
                  <span className="text-gray-300">🔒</span>
                </div>
                {hasProgress && prog && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>{prog.value} / {prog.max}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/80 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${catStyle.barColor} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {catAchievements.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No achievements in this category</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function MyChallengesCodeEntry() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLocation(`/challenge/${trimmed}`);
  };
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === "Enter" && handleJoin()}
        placeholder="e.g. GQ-1234"
        maxLength={12}
        className="flex-1 h-11 px-3 rounded-xl border-2 border-rose-200 focus:border-rose-400 focus:outline-none text-sm font-mono tracking-wider bg-white"
        data-testid="input-challenge-code"
      />
      <button
        onClick={handleJoin}
        disabled={!code.trim()}
        className="h-11 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-sm font-bold transition-colors"
        data-testid="button-join-challenge"
      >
        Join ⚔️
      </button>
    </div>
  );
}

export default function CompassQuest() {
  const [, setLocation] = useLocation();
  const gameReturnTo = new URLSearchParams(window.location.search).get("from") || "/play-games";
  const { activeExplorer, loadExplorers } = useExplorer();
  const explorerId = activeExplorer?.id;
  const isGuestUser = !activeExplorer || activeExplorer.isGuest === true;
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const { login: userLogin } = useUser();

  const [screen, setScreen] = useState<Screen>("entry");
  const [selectedAdventure, setSelectedAdventure] = useState<Adventure | null>(null);

  const [createStopCount, setCreateStopCount] = useState(5);
  const [createCitySearch, setCreateCitySearch] = useState("");
  const [createSelectedCities, setCreateSelectedCities] = useState<{id: string; name: string}[]>([]);
  const [createOrderedCities, setCreateOrderedCities] = useState<{id: string; name: string}[]>([]);
  const [createOrderMode, setCreateOrderMode] = useState<"select" | "shuffle">("select");
  const [createTab, setCreateTab] = useState<"select-cities" | "generate-random">("select-cities");
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [createRandomStopCount, setCreateRandomStopCount] = useState(5);
  const [createStartCity, setCreateStartCity] = useState<{name: string; lat: number; lng: number} | null>(null);
  const [isGeneratingQuest, setIsGeneratingQuest] = useState(false);
  type GeneratedStep = {
    city: string;
    story_beat: string;
    clue_type: string;
    clue: string;
    options: string[];
    correct_answer: string;
    direction: string;
    compass_clue: string;
    fun_fact: string;
    artifact: string;
  };
  const [generatedQuestData, setGeneratedQuestData] = useState<{quest_title: string; steps: GeneratedStep[]} | null>(null);
  type LeafletMap = { remove: () => void; flyTo: (latlng: [number, number], zoom: number) => void; fitBounds: (bounds: unknown, opts: unknown) => void; invalidateSize: () => void };
  type LeafletLayerGroup = { clearLayers: () => void; addTo: (map: LeafletMap) => LeafletLayerGroup };
  const createMapRef = useRef<LeafletMap | null>(null);
  const createMarkersRef = useRef<LeafletLayerGroup | null>(null);
  const [createMapTick, setCreateMapTick] = useState(0);
  const [progress, setProgress] = useState<AdventureProgress | null>(null);
  const [records, setRecords] = useState<Record<string, AdventureRecord>>({});

  const [cityGuess, setCityGuess] = useState<string | null>(null);
  const [cityResult, setCityResult] = useState<"correct" | "wrong" | null>(null);
  const [compassGuess, setCompassGuess] = useState<CompassDirection | null>(null);
  const [compassResult, setCompassResult] = useState<"correct" | "wrong" | null>(null);
  const [compassSpinning, setCompassSpinning] = useState(true);
  const [compassRevealed, setCompassRevealed] = useState(false);
  const [activeCompassOptions, setActiveCompassOptions] = useState<CompassDirection[]>([]);
  const [travelFrom, setTravelFrom] = useState("");
  const [travelTo, setTravelTo] = useState("");
  const [travelFromCoords, setTravelFromCoords] = useState<CityCoords>({ lat: 0, lng: 0 });
  const [travelToCoords, setTravelToCoords] = useState<CityCoords>({ lat: 0, lng: 0 });
  const [travelDirectionLabel, setTravelDirectionLabel] = useState<string | undefined>(undefined);
  const [travelTransportMode, setTravelTransportMode] = useState<"plane" | "car" | "train" | "ship">("plane");
  const [stepWrongGuesses, setStepWrongGuesses] = useState(0);
  const [victoryQuizAnswer, setVictoryQuizAnswer] = useState<string | null>(null);
  const [mapRevealed, setMapRevealed] = useState(false);
  const [crownShown, setCrownShown] = useState(false);
  const [compassSpun, setCompassSpun] = useState(false);
  const [missingPieceRevealed, setMissingPieceRevealed] = useState(false);
  const [victoryQuizResult, setVictoryQuizResult] = useState<"correct" | "wrong" | null>(null);
  const [introFragmentShown, setIntroFragmentShown] = useState(false);
  const [clueRevealed, setClueRevealed] = useState(false);

  const startTimeRef = useRef<number>(0);

  // Achievement unlock state
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<AchievementDef[]>([]);

  // Challenge a Friend state
  const [challengeCreating, setChallengeCreating] = useState(false);
  const [challengeShareData, setChallengeShareData] = useState<{
    shareCode: string;
    shareUrl: string;
    xp: number;
    questName: string;
    accuracy: number;
    timeMs?: number;
  } | null>(null);

  // Persist a sent challenge to localStorage
  function saveSentChallenge(data: { shareCode: string; shareUrl: string; xp: number; questName: string; accuracy: number; timeMs?: number }) {
    try {
      const key = `compass_sent_challenges_${explorerId ?? "guest"}`;
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
      const entry = { ...data, createdAt: new Date().toISOString() };
      const updated = [entry, ...existing].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  }

  function loadSentChallenges(): Array<{ shareCode: string; shareUrl: string; xp: number; questName: string; accuracy: number; timeMs?: number; createdAt: string }> {
    try {
      const key = `compass_sent_challenges_${explorerId ?? "guest"}`;
      return JSON.parse(localStorage.getItem(key) ?? "[]");
    } catch { return []; }
  }

  // Read challenge params from URL (when arriving via /compass-quest?challenge=GQ-XXXX&attemptId=...)
  const searchParams = new URLSearchParams(window.location.search);
  const urlChallengeCode = searchParams.get("challenge");
  const urlAttemptId = searchParams.get("attemptId");
  const urlQuestKey = searchParams.get("questKey");

  const tts = useCompassTTS();

  const currentStep: QuestStep | null = selectedAdventure && progress
    ? selectedAdventure.steps[progress.currentStep] || null
    : null;

  // ── Auto-play TTS on story beat screens ──
  useEffect(() => {
    if (!selectedAdventure) return;
    tts.stop();

    if (screen === "intro") {
      const text = [
        selectedAdventure.description,
        selectedAdventure.storyIntro || "",
        "Are you ready to start the quest?",
      ].filter(Boolean).join("\n\n");
      const timer = setTimeout(() => tts.speak(text), 600);
      return () => clearTimeout(timer);
    }

    if (screen === "clue" && currentStep?.storyBeat) {
      const preBtn = "Should we reveal the clue?";
      const text = `${currentStep.storyBeat}\n\n${preBtn}`;
      const timer = setTimeout(() => tts.speak(text), 600);
      return () => clearTimeout(timer);
    }

    if (screen === "fragment" && currentStep) {
      // Only read the fun fact on the standard fragment screen (not the intro fragment)
      const isIntroFragment =
        (selectedAdventure.id === "broken-trail" ||
          selectedAdventure.id === "wild-signal" ||
          selectedAdventure.id === "royal-journal" ||
          selectedAdventure.id === "final-ring") &&
        !introFragmentShown &&
        progress?.fragmentsCollected.length === 1 &&
        progress?.currentStep === 0;
      if (!isIntroFragment && currentStep.travelFact) {
        const text = `Fun fact about ${currentStep.correctCity}: ${currentStep.travelFact}`;
        const timer = setTimeout(() => tts.speak(text), 700);
        return () => clearTimeout(timer);
      }
    }

    if (screen === "victory") {
      const text = [
        selectedAdventure.reward.description,
        "Let's assemble this to find out.",
      ].filter(Boolean).join("\n\n");
      const timer = setTimeout(() => tts.speak(text), 800);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, progress?.currentStep]);

  // "Where could this lead us?" — when map is assembled & nextAdventure section appears
  // (skip for final-ring — it has its own crownShown narration below)
  useEffect(() => {
    if (screen === "victory" && mapRevealed && selectedAdventure?.id !== "final-ring") {
      const timer = setTimeout(() => tts.speak("Where could this lead us?"), 3500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRevealed, screen]);

  // Final Ring only: narrate the assembly story + closing quotes when crown merge plays
  useEffect(() => {
    if (screen === "victory" && crownShown && selectedAdventure?.id === "final-ring") {
      const text = [
        "A burst of light.",
        "The compass spins fast.",
        "The journal flips open.",
        "—",
        "A glowing map appears.",
        "Every place you visited. Connected.",
        "—",
        "The crown shines. Complete. Alive.",
        "Then — it settles. You're holding it. Whole.",
        "—",
        "You found every piece.",
        "You brought it back together.",
        "The crown is complete.",
      ].join("\n\n");
      const timer = setTimeout(() => tts.speak(text), 3800);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crownShown, screen]);

  useEffect(() => {
    setRecords(loadRecords(explorerId));
  }, [explorerId]);

  // Auto-start challenge quest when arriving from /challenge/:code
  useEffect(() => {
    if (!urlChallengeCode || !urlQuestKey) return;
    const loadChallengeQuest = async () => {
      try {
        const res = await fetch(`/api/challenges/${urlChallengeCode}`);
        if (!res.ok) return;
        const data = await res.json();
        const questKey = decodeURIComponent(urlQuestKey);
        // Try to find among built-in adventures first
        const builtIn = ADVENTURES.find(a => a.id === questKey);
        if (builtIn) {
          setSelectedAdventure(builtIn);
          beginNewRun(builtIn);
          return;
        }
        // Use the quest data from the challenge
        const quest = data.quest;
        if (!quest) return;
        let steps: QuestStep[];
        try {
          steps = typeof quest.stepsJson === 'string' ? JSON.parse(quest.stepsJson) : (quest.stepsJson as QuestStep[]);
        } catch {
          return;
        }
        const adventure: Adventure = {
          id: quest.questKey,
          title: quest.title,
          subtitle: quest.subtitle || "",
          icon: quest.icon || "🧭",
          description: quest.description || "",
          startCity: quest.startCity,
          startCityEmoji: "🌐",
          startCityCoords: steps[0]?.cityCoords || { lat: 0, lng: 0 },
          steps,
          reward: { title: "Quest Complete!", emoji: "🏆", description: "You completed the challenge!" },
        };
        setSelectedAdventure(adventure);
        beginNewRun(adventure);
      } catch (e) {
        // silently fail
      }
    };
    loadChallengeQuest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlChallengeCode, urlQuestKey]);

  // Handle "Challenge a Friend" from victory screen
  async function handleChallengeAFriend() {
    if (!selectedAdventure || !progress || challengeCreating) return;
    setChallengeCreating(true);
    setChallengeShareData(null);
    try {
      const xp = calculateXP(progress.wrongGuesses, selectedAdventure.steps.length);
      const timeMs = progress.bestTimeMs ?? (Date.now() - startTimeRef.current);
      const wrongGuesses = progress.wrongGuesses;
      const accuracy = Math.round(((selectedAdventure.steps.length - wrongGuesses) / selectedAdventure.steps.length) * 100);
      const playerName = activeExplorer?.name || "Explorer";
      const isCustom = selectedAdventure.id.startsWith("custom-");

      // For custom quests, persist the quest first
      let questId: string;
      if (isCustom) {
        const questRes = await fetch("/api/quests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questKey: selectedAdventure.id,
            title: selectedAdventure.title,
            subtitle: selectedAdventure.subtitle || null,
            icon: selectedAdventure.icon || "🧭",
            description: selectedAdventure.description || null,
            startCity: selectedAdventure.startCity,
            cities: selectedAdventure.steps.map(s => s.correctCity),
            stepsJson: JSON.stringify(selectedAdventure.steps),
            isCustom: true,
          }),
        });
        if (!questRes.ok) throw new Error("Failed to save quest");
        const quest = await questRes.json();
        questId = quest.id;
      } else {
        // Built-in quest — upsert it
        const questRes = await fetch("/api/quests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questKey: selectedAdventure.id,
            title: selectedAdventure.title,
            subtitle: selectedAdventure.subtitle || null,
            icon: selectedAdventure.icon || "🧭",
            description: selectedAdventure.description || null,
            startCity: selectedAdventure.startCity,
            cities: selectedAdventure.steps.map(s => s.correctCity),
            stepsJson: JSON.stringify(selectedAdventure.steps),
            isCustom: false,
          }),
        });
        if (!questRes.ok) throw new Error("Failed to save quest");
        const quest = await questRes.json();
        questId = quest.id;
      }

      // Create the attempt
      const attemptRes = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, playerName }),
      });
      if (!attemptRes.ok) throw new Error("Failed to create attempt");
      const attempt = await attemptRes.json();

      // Complete the attempt with scores
      await fetch(`/api/attempts/${attempt.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xp, timeMs, wrongGuesses, accuracy }),
      });

      // Create the challenge
      const challengeRes = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, creatorAttemptId: attempt.id }),
      });
      if (!challengeRes.ok) throw new Error("Failed to create challenge");
      const challengeData = await challengeRes.json();

      const xpEarned = calculateXP(progress!.wrongGuesses, selectedAdventure!.steps.length);
      const accPct = Math.round(((selectedAdventure!.steps.length - progress!.wrongGuesses) / selectedAdventure!.steps.length) * 100);
      const sharePayload = {
        shareCode: challengeData.shareCode,
        shareUrl: challengeData.shareUrl,
        xp: xpEarned,
        questName: selectedAdventure!.title,
        accuracy: accPct,
        timeMs: progress!.bestTimeMs ?? undefined,
      };
      setChallengeShareData(sharePayload);
      saveSentChallenge(sharePayload);
    } catch (e) {
      toast.error("Failed to create challenge. Try again!");
    } finally {
      setChallengeCreating(false);
    }
  }

  // After completing a challenge (challenger), navigate to results
  useEffect(() => {
    if (!urlAttemptId || !urlChallengeCode) return;
    if (screen !== "victory") return;
    // Complete the challenge attempt once the victory screen is reached
    if (!progress || !selectedAdventure) return;
    const xp = calculateXP(progress.wrongGuesses, selectedAdventure.steps.length);
    const timeMs = progress.bestTimeMs ?? 0;
    const wrongGuesses = progress.wrongGuesses;
    const accuracy = Math.round(((selectedAdventure.steps.length - wrongGuesses) / selectedAdventure.steps.length) * 100);
    fetch(`/api/attempts/${urlAttemptId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xp, timeMs, wrongGuesses, accuracy }),
    })
      .then(() => {
        setTimeout(() => {
          setLocation(`/challenge/${urlChallengeCode}/results/${urlAttemptId}`);
        }, 3500);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, urlAttemptId, urlChallengeCode]);

  const getPreviousCity = useCallback((): string => {
    if (!selectedAdventure || !progress) return "";
    if (progress.currentStep === 0) return selectedAdventure.startCity;
    return selectedAdventure.steps[progress.currentStep - 1].correctCity;
  }, [selectedAdventure, progress]);

  const getPreviousCityCoords = useCallback((): CityCoords => {
    if (!selectedAdventure || !progress) return { lat: 0, lng: 0 };
    if (progress.currentStep === 0) return selectedAdventure.startCityCoords;
    return selectedAdventure.steps[progress.currentStep - 1].cityCoords;
  }, [selectedAdventure, progress]);

  function startAdventure(adventure: Adventure) {
    const existing = loadProgress(adventure.id, explorerId);
    setSelectedAdventure(adventure);
    if (existing && !existing.completed) {
      setProgress(existing);
      setClueRevealed(false);
      setScreen("clue");
    } else {
      setScreen("intro");
    }
  }

  function beginNewRun(adventure: Adventure) {
    clearProgress(adventure.id, explorerId);
    const newProgress: AdventureProgress = {
      adventureId: adventure.id,
      currentStep: 0,
      fragmentsCollected: [],
      totalXpEarned: 0,
      wrongGuesses: 0,
      completed: false,
      startedAt: new Date().toISOString(),
    };
    setProgress(newProgress);
    saveProgress(newProgress, explorerId);
    startTimeRef.current = Date.now();
    setStepWrongGuesses(0);
    setVictoryQuizAnswer(null);
    setVictoryQuizResult(null);
    setMapRevealed(false);
    setCrownShown(false);
    setCompassSpun(false);
    setMissingPieceRevealed(false);
    setClueRevealed(false);
    setScreen("clue");
  }

  function beginNewRunWithFragment(adventure: Adventure) {
    clearProgress(adventure.id, explorerId);
    const newProgress: AdventureProgress = {
      adventureId: adventure.id,
      currentStep: 0,
      fragmentsCollected: ["fragment-1"],
      totalXpEarned: 0,
      wrongGuesses: 0,
      completed: false,
      startedAt: new Date().toISOString(),
    };
    setProgress(newProgress);
    saveProgress(newProgress, explorerId);
    startTimeRef.current = Date.now();
    setStepWrongGuesses(0);
    setVictoryQuizAnswer(null);
    setVictoryQuizResult(null);
    setMapRevealed(false);
    setCrownShown(false);
    setCompassSpun(false);
    setMissingPieceRevealed(false);
    setIntroFragmentShown(false);
    setScreen("fragment");
  }

  function handleCityGuess(city: string) {
    if (cityResult) return;
    setCityGuess(city);
    if (!currentStep) return;
    if (city === currentStep.correctCity) {
      setCityResult("correct");
      setTimeout(() => {
        setActiveCompassOptions(
          currentStep.compassWrongOptions
            ? [...currentStep.compassWrongOptions, currentStep.compassDirection].sort(() => Math.random() - 0.5)
            : makeCompassOptions(currentStep.compassDirection)
        );
        setScreen("compass-guess");
        setCityGuess(null);
        setCityResult(null);
        setCompassSpinning(true);
        setCompassRevealed(false);
        setCompassGuess(null);
        setCompassResult(null);
      }, 1200);
    } else {
      setCityResult("wrong");
      setStepWrongGuesses(prev => prev + 1);
      if (progress) {
        const updated = { ...progress, wrongGuesses: progress.wrongGuesses + 1 };
        setProgress(updated);
        saveProgress(updated, explorerId);
      }
      setTimeout(() => { setCityGuess(null); setCityResult(null); }, 1000);
    }
  }

  function handleCompassGuess(dir: CompassDirection) {
    if (compassResult) return;
    setCompassGuess(dir);
    if (!currentStep) return;
    setCompassSpinning(false);
    if (dir.label === currentStep.compassDirection.label) {
      setCompassRevealed(true);
      setCompassResult("correct");
      setTimeout(() => {
        const prevCityName = getPreviousCity();
        const prevCityKey = prevCityName.toLowerCase();
        const prevRaw = CITY_COORDS[prevCityKey];
        const resolvedFromCoords = prevRaw
          ? { lat: prevRaw.lat, lng: prevRaw.lon }
          : getPreviousCityCoords();
        const destCityKey = currentStep.correctCity.toLowerCase();
        const destRaw = CITY_COORDS[destCityKey];
        const resolvedToCoords = destRaw
          ? { lat: destRaw.lat, lng: destRaw.lon }
          : currentStep.cityCoords;
        setTravelFrom(prevCityName);
        setTravelTo(currentStep.correctCity);
        setTravelFromCoords(resolvedFromCoords);
        setTravelToCoords(resolvedToCoords);
        setTravelDirectionLabel(currentStep.compassDirection.label);
        setTravelTransportMode(currentStep.transportMode || "plane");
        setScreen("travel");
      }, 1500);
    } else {
      setCompassResult("wrong");
      setStepWrongGuesses(prev => prev + 1);
      if (progress) {
        const updated = { ...progress, wrongGuesses: progress.wrongGuesses + 1 };
        setProgress(updated);
        saveProgress(updated, explorerId);
      }
      setTimeout(() => {
        setCompassGuess(null); setCompassResult(null);
        setCompassSpinning(true); setCompassRevealed(false);
      }, 1000);
    }
  }

  function handleTravelComplete() { setScreen("fragment"); }

  function handleFragmentCollected() {
    if (!progress || !currentStep || !selectedAdventure) return;
    const newFragments = [...progress.fragmentsCollected, currentStep.fragmentEmoji];
    const xpForStep = stepWrongGuesses > 0 ? Math.max(10 - stepWrongGuesses * 2, 1) : 10;
    const newTotalXp = progress.totalXpEarned + xpForStep;
    const nextStepIndex = progress.currentStep + 1;
    const isComplete = nextStepIndex >= selectedAdventure.steps.length;
    const updated: AdventureProgress = {
      ...progress,
      currentStep: nextStepIndex,
      fragmentsCollected: newFragments,
      totalXpEarned: newTotalXp,
      completed: isComplete,
      completedAt: isComplete ? new Date().toISOString() : undefined,
    };
    setProgress(updated);
    saveProgress(updated, explorerId);
    if (isComplete) {
      const elapsed = Date.now() - (startTimeRef.current || Date.now());
      updated.bestTimeMs = elapsed;
      saveProgress(updated, explorerId);
      saveRecord(selectedAdventure.id, elapsed, newTotalXp, explorerId);
      setRecords(loadRecords(explorerId));

      // Update compass stats
      const prevStats = loadCompassStats(explorerId);
      const stepsCount = selectedAdventure.steps.length;
      const wrongForQuest = progress.wrongGuesses || 0;
      const correctForQuest = stepsCount * 2 - wrongForQuest; // city + compass per step
      // Collect continents from this quest's steps
      const newContinents = selectedAdventure.steps
        .map(s => getContinentForCity(s.correctCity))
        .filter((c): c is string => c !== null);
      const mergedContinents = Array.from(new Set([...prevStats.continentsVisited, ...newContinents]));
      const isCustomAdventure = selectedAdventure.id.startsWith("custom-");
      const isPerfect = wrongForQuest === 0;
      const newStats: CompassStats = {
        ...prevStats,
        totalQuestsCompleted: prevStats.totalQuestsCompleted + 1,
        totalXp: prevStats.totalXp + newTotalXp,
        totalCorrectAnswers: prevStats.totalCorrectAnswers + correctForQuest,
        totalWrongAnswers: prevStats.totalWrongAnswers + wrongForQuest,
        continentsVisited: mergedContinents,
        currentStreak: prevStats.currentStreak + 1,
        bestTimeMs: prevStats.bestTimeMs === undefined
          ? elapsed
          : Math.min(prevStats.bestTimeMs, elapsed),
        perfectQuestsCompleted: prevStats.perfectQuestsCompleted + (isPerfect ? 1 : 0),
        customQuestsCompleted: prevStats.customQuestsCompleted + (isCustomAdventure ? 1 : 0),
      };
      saveCompassStats(newStats, explorerId);

      // Check achievements
      const existingAchievements = loadCompassAchievements(explorerId);
      const newUnlocks = checkAndUnlockAchievements(newStats, existingAchievements);
      if (newUnlocks.length > 0) {
        const updatedAchievements = { ...existingAchievements };
        for (const ach of newUnlocks) {
          updatedAchievements[ach.key] = { unlockedAt: new Date().toISOString() };
        }
        saveCompassAchievements(updatedAchievements, explorerId);
        setNewlyUnlockedAchievements(newUnlocks);
      }

      if (activeExplorer) {
        const xpToAward = calculateXP(progress.wrongGuesses, selectedAdventure.steps.length);
        fetch(`/api/players/${activeExplorer.id}/award-xp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: xpToAward, source: "COMPASS_QUEST" }),
        }).catch(() => {});
      }
      setTimeout(() => {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        setScreen("victory");
      }, 500);
    } else {
      setTimeout(() => { setScreen("clue"); setStepWrongGuesses(0); setClueRevealed(false); }, 300);
    }
  }

  function handleVictoryQuiz(answer: string) {
    if (victoryQuizResult) return;
    setVictoryQuizAnswer(answer);
    if (!selectedAdventure?.nextAdventure) return;
    if (answer === selectedAdventure.nextAdventure.city) {
      setVictoryQuizResult("correct");
    } else {
      setVictoryQuizResult("wrong");
      setTimeout(() => { setVictoryQuizAnswer(null); setVictoryQuizResult(null); }, 1000);
    }
  }

  function handleReplay() {
    if (!selectedAdventure) return;
    beginNewRun(selectedAdventure);
  }

  function handleBackToCampaign() {
    tts.stop();
    const isCustomQuest = selectedAdventure?.id?.startsWith("custom-");
    setScreen(isCustomQuest ? "entry" : "campaign");
    setSelectedAdventure(null); setProgress(null);
    setCityGuess(null); setCityResult(null); setCompassGuess(null); setCompassResult(null);
    setVictoryQuizAnswer(null); setVictoryQuizResult(null);
  }

  const LOADING_MESSAGES = ["Tracing your path…", "Hiding clues…", "Scattering fragments…"];
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);

  useEffect(() => {
    if (!isGeneratingQuest) return;
    const interval = setInterval(() => {
      setLoadingMessageIdx(i => (i + 1) % LOADING_MESSAGES.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGeneratingQuest]);

  useEffect(() => {
    if (screen === "create-step2") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [screen]);

  const [createGeoResults, setCreateGeoResults] = useState<{name: string; country: string}[]>([]);
  const [createGeoLoading, setCreateGeoLoading] = useState(false);
  const createGeoAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = createCitySearch.trim();
    if (q.length < 2) { setCreateGeoResults([]); return; }
    if (createGeoAbortRef.current) { createGeoAbortRef.current.abort(); }
    const controller = new AbortController();
    createGeoAbortRef.current = controller;
    const delay = setTimeout(async () => {
      setCreateGeoLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=8&featuretype=city&accept-language=en`;
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'GeoQuestApp/1.0' },
        });
        if (!resp.ok) throw new Error('Nominatim error');
        const data = await resp.json() as Array<{ display_name: string; address?: { city?: string; town?: string; village?: string; country?: string } }>;
        const seen = new Set<string>();
        const results: {name: string; country: string}[] = [];
        for (const item of data) {
          const cityName = item.address?.city || item.address?.town || item.address?.village || item.display_name.split(',')[0].trim();
          const country = item.address?.country || '';
          const key = cityName.toLowerCase();
          if (!seen.has(key) && cityName) { seen.add(key); results.push({ name: cityName, country }); }
        }
        setCreateGeoResults(results);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          const q2 = createCitySearch.toLowerCase();
          const selectedNames = new Set(createSelectedCities.map(c => c.name.toLowerCase()));
          const fallback = [...POPULAR_CITIES, ...Object.keys(CITY_COORDS).map(k => ({ name: k.replace(/\b\w/g, ch => ch.toUpperCase()), country: '' }))]
            .filter((c): c is {name: string; country: string} => !!c.name && c.name.toLowerCase().includes(q2) && !selectedNames.has(c.name.toLowerCase()))
            .slice(0, 8);
          setCreateGeoResults(fallback);
        }
      } finally {
        setCreateGeoLoading(false);
      }
    }, 300);
    return () => { clearTimeout(delay); controller.abort(); };
  }, [createCitySearch]);

  const createSearchResults = useMemo(() => {
    if (createCitySearch.trim().length < 2) return [];
    const selectedNames = new Set(createSelectedCities.map(c => c.name.toLowerCase()));
    return createGeoResults.filter(c => !selectedNames.has(c.name.toLowerCase())).slice(0, 8);
  }, [createCitySearch, createSelectedCities, createGeoResults]);

  function addCreateCity(name: string) {
    if (createSelectedCities.find(c => c.name.toLowerCase() === name.toLowerCase())) return;
    if (createSelectedCities.length >= createStopCount) return;
    const newCity = { id: crypto.randomUUID(), name };
    setCreateSelectedCities(prev => [...prev, newCity]);
    setCreateCitySearch("");
  }

  function removeCreateCity(id: string) {
    setCreateSelectedCities(prev => prev.filter(c => c.id !== id));
  }

  const QUEST_START_FALLBACKS = [
    { name: "Washington DC", lat: 38.9047, lng: -77.0163 },
    { name: "Cape Town", lat: -33.9249, lng: 18.4241 },
    { name: "Suva", lat: -18.1416, lng: 178.4419 },
  ];

  function pickQuestStartCity(selectedNames: string[]) {
    const lower = selectedNames.map(n => n.toLowerCase());
    // Exclude start cities that conflict with user-selected city names
    const eligible = QUEST_START_FALLBACKS.filter(
      fb => !lower.some(l => l.includes(fb.name.toLowerCase().split(' ')[0]))
    );
    if (eligible.length === 0) return QUEST_START_FALLBACKS[0];
    // Use the first destination's coordinates to pick the closest eligible start
    const firstCoords = getCoordsForName(selectedNames[0] ?? '');
    if (!firstCoords) return eligible[0];
    let best = eligible[0];
    let bestDist = Infinity;
    for (const fb of eligible) {
      const dist = getDistanceMiles(firstCoords.lat, firstCoords.lon, fb.lat, fb.lng);
      if (dist < bestDist) { bestDist = dist; best = fb; }
    }
    return best;
  }

  async function handleGenerateQuest() {
    if (createOrderedCities.length < 2) return;
    setIsRandomMode(false);
    const orderedToUse = createOrderMode === "shuffle"
      ? [...createOrderedCities].sort(() => Math.random() - 0.5)
      : createOrderedCities;
    if (createOrderMode === "shuffle") setCreateOrderedCities(orderedToUse);
    const startCity = pickQuestStartCity(orderedToUse.map(c => c.name));
    setCreateStartCity(startCity);
    setIsGeneratingQuest(true);
    setLoadingMessageIdx(0);
    try {
      const resp = await fetch('/api/compass/generate-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cities: orderedToUse.map(c => c.name), startCity: startCity.name }),
      });
      if (!resp.ok) {
        let errMsg = "Quest generation failed. Please try again.";
        try {
          const errData = await resp.json();
          if (errData?.error) errMsg = errData.error;
        } catch {}
        toast.error(errMsg);
        return;
      }
      const data = await resp.json();
      setGeneratedQuestData(data);
      setScreen("quest-preview");
    } catch (e) {
      toast.error("Quest generation failed. Please try again.");
    } finally {
      setIsGeneratingQuest(false);
    }
  }

  // Helper: load/save random quest rotation from localStorage
  function loadRandomRotation(): number[] {
    try { return JSON.parse(localStorage.getItem(`compass_random_rotation_${explorerId ?? "guest"}`) ?? "[]"); } catch { return []; }
  }
  function saveRandomRotation(seen: number[]) {
    try { localStorage.setItem(`compass_random_rotation_${explorerId ?? "guest"}`, JSON.stringify(seen)); } catch {}
  }
  function pickNextTemplateIdx(): number {
    const seen = loadRandomRotation();
    const all = [0, 1, 2, 3];
    const unseen = all.filter(i => !seen.includes(i));
    if (unseen.length === 0) {
      saveRandomRotation([]);
      return all[Math.floor(Math.random() * all.length)];
    }
    return unseen[Math.floor(Math.random() * unseen.length)];
  }

  async function handleGenerateRandomQuest() {
    setIsGeneratingQuest(true);
    setLoadingMessageIdx(0);
    setIsRandomMode(true);
    const templateIdx = pickNextTemplateIdx();
    try {
      const resp = await fetch(`/api/compass/random-quest?stopCount=${createRandomStopCount}&templateIdx=${templateIdx}`);
      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();
      const cities: string[] = data.cities ?? [];
      const effectiveCities = data.effectiveStopCount ? cities.slice(0, data.effectiveStopCount) : cities;
      setCreateOrderedCities(effectiveCities.map((name: string, i: number) => ({ id: `random-${i}`, name })));
      const startCityName = data.startCity ?? "Washington DC";
      const startCityRaw = getCoordsForName(startCityName);
      setCreateStartCity({ name: startCityName, lat: startCityRaw?.lat ?? 38.9047, lng: startCityRaw?.lon ?? -77.0163 });
      setGeneratedQuestData({ quest_title: data.quest_title, steps: data.steps });
      // Mark this template as seen
      const seen = loadRandomRotation();
      if (!seen.includes(templateIdx)) { seen.push(templateIdx); saveRandomRotation(seen); }
      setScreen("quest-preview");
    } catch {
      toast.error("Could not generate random quest. Please try again.");
      setIsRandomMode(false);
    } finally {
      setIsGeneratingQuest(false);
    }
  }

  function handlePlayGeneratedQuest() {
    if (!generatedQuestData) return;
    const COMPASS_DIRS_MAP: Record<string, {label: string; degrees: number}> = {
      "North": { label: "North", degrees: 0 }, "Northeast": { label: "Northeast", degrees: 45 },
      "East": { label: "East", degrees: 90 }, "Southeast": { label: "Southeast", degrees: 135 },
      "South": { label: "South", degrees: 180 }, "Southwest": { label: "Southwest", degrees: 225 },
      "West": { label: "West", degrees: 270 }, "Northwest": { label: "Northwest", degrees: 315 },
    };
    const startCity = createStartCity ?? { name: "Washington DC", lat: 38.9047, lng: -77.0163 };
    const steps: QuestStep[] = generatedQuestData.steps.map((s, i) => {
      const destCoords = (() => {
        const key = s.correct_answer.toLowerCase();
        const c = CITY_COORDS[key];
        return c ? { lat: c.lat, lng: c.lon } : null;
      })();
      const srcCoords = i === 0
        ? { lat: startCity.lat, lng: startCity.lng }
        : (() => {
            const prevKey = createOrderedCities[i - 1]?.name.toLowerCase() ?? "";
            const c = CITY_COORDS[prevKey];
            return c ? { lat: c.lat, lng: c.lon } : null;
          })();
      const actualBearingLabel = srcCoords && destCoords
        ? getBearing(srcCoords.lat, srcCoords.lng, destCoords.lat, destCoords.lng)
        : (COMPASS_DIRS_MAP[s.direction] ? s.direction : "East");
      const compassDir = COMPASS_DIRS_MAP[actualBearingLabel] ?? COMPASS_DIRS_MAP["East"];
      const rawClueType = (s.clue_type as "text" | "landmark" | "flag") || "text";
      const destNameLower = s.correct_answer.toLowerCase();
      const countryCode = CITY_COUNTRY_CODES[destNameLower];
      const landmarkKey = CITY_LANDMARK_KEYS[destNameLower];
      const clueType: "text" | "landmark" | "flag" = (["text", "landmark", "flag"] as const).includes(rawClueType) ? rawClueType : "text";
      const citySlug = s.correct_answer.toLowerCase().replace(/\s+/g, '-');
      return {
        stepIndex: i,
        clueType,
        cityClue: s.clue,
        flagClue: clueType === "flag" && countryCode
          ? { countryCode, countryName: s.correct_answer, hint: s.clue }
          : undefined,
        landmarkClue: clueType === "landmark"
          ? {
              name: landmarkKey
                ? landmarkKey.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                : "Famous Landmark",
              description: s.clue,
              svg: landmarkKey || citySlug,
            }
          : undefined,
        cityOptions: s.options && s.options.length === 4 ? s.options : [s.correct_answer, "Paris", "Tokyo", "Cairo"],
        correctCity: s.correct_answer,
        compassClue: s.compass_clue,
        compassDirection: compassDir,
        fragmentName: `Crown Fragment ${i + 1}`,
        fragmentEmoji: "👑",
        travelFact: s.fun_fact,
        cityCoords: destCoords ? { lat: destCoords.lat, lng: destCoords.lng } : { lat: 0, lng: 0 },
        storyBeat: s.story_beat,
      };
    });
    const startCityCoords = { lat: startCity.lat, lng: startCity.lng };
    const generatedAdventure: Adventure = {
      id: `custom-${Date.now()}`,
      title: "The Lost Crown",
      subtitle: `A Custom Quest through ${createOrderedCities.map(c => c.name).join(', ')}`,
      icon: "👑",
      description: `The crown has been shattered and its fragments scattered across the globe. Starting in ${startCity.name}, follow the clues to recover every piece!`,
      startCity: startCity.name,
      startCityEmoji: "🧭",
      startCityCoords,
      steps,
      reward: {
        title: "The Lost Crown Restored",
        emoji: "👑",
        description: "You recovered all the fragments and restored the Lost Crown!",
      },
    };
    setSelectedAdventure(generatedAdventure);
    saveCustomAdventure(generatedAdventure, explorerId);
    beginNewRun(generatedAdventure);
  }

  type LeafletGlobal = {
    map: (el: HTMLElement, opts: object) => LeafletMap;
    tileLayer: (url: string, opts: object) => { addTo: (m: LeafletMap) => void };
    layerGroup: () => LeafletLayerGroup;
    divIcon: (opts: object) => object;
    marker: (latlng: [number, number], opts: object) => { addTo: (g: LeafletLayerGroup) => void };
    polyline: (coords: [number, number][], opts: object) => { addTo: (g: LeafletLayerGroup) => void };
    latLngBounds: (coords: [number, number][]) => unknown;
  };

  const initCreateMapOnEl = useCallback((el: HTMLDivElement | null) => {
    if (!el) {
      if (createMapRef.current) {
        createMapRef.current.remove();
        createMapRef.current = null;
        createMarkersRef.current = null;
      }
      return;
    }
    const tryInit = () => {
      const L = (window as { L?: LeafletGlobal }).L;
      if (!L) { setTimeout(tryInit, 100); return; }
      if (createMapRef.current) {
        createMapRef.current.remove();
        createMapRef.current = null;
        createMarkersRef.current = null;
      }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!el) return;
        const map = L.map(el, {
          center: [20, 0], zoom: 2, zoomControl: false, attributionControl: false,
          minZoom: 2, maxZoom: 12, worldCopyJump: true,
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd', maxZoom: 19,
        }).addTo(map);
        createMarkersRef.current = L.layerGroup().addTo(map);
        createMapRef.current = map;
        map.invalidateSize();
        setTimeout(() => { map.invalidateSize(); setCreateMapTick(t => t + 1); }, 150);
        setTimeout(() => { map.invalidateSize(); setCreateMapTick(t => t + 1); }, 500);
      }));
    };
    tryInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = (window as { L?: LeafletGlobal }).L;
    if (!createMapRef.current || !createMarkersRef.current || !L) return;
    const map = createMapRef.current;
    const markers = createMarkersRef.current;
    markers.clearLayers();
    const citiesToShow = screen === "create-step2" ? createOrderedCities : createSelectedCities;
    const validCoords: {lat: number; lon: number}[] = [];
    citiesToShow.forEach((city, idx) => {
      const coords = getCoordsForName(city.name);
      if (!coords) return;
      validCoords.push(coords);
      const label = screen === "create-step2" ? String(idx + 1) : '•';
      const html = `<div style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);color:white;font-size:11px;font-weight:700;transform:translate(-14px,-14px)">${label}</div>`;
      const icon = L.divIcon({ html, className: '', iconSize: [0, 0] });
      L.marker([coords.lat, coords.lon], { icon }).addTo(markers);
    });
    if (validCoords.length > 1) {
      L.polyline(validCoords.map(c => [c.lat, c.lon] as [number, number]), {
        color: '#f97316', weight: 2, opacity: 0.7, dashArray: '8,8',
      }).addTo(markers);
      const bounds = L.latLngBounds(validCoords.map(c => [c.lat, c.lon] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 });
    } else if (validCoords.length === 1) {
      map.flyTo([validCoords[0].lat, validCoords[0].lon], 5);
    }
  }, [createSelectedCities, createOrderedCities, screen, createMapTick]);

  useEffect(() => {
    return () => {
      if (createMapRef.current) {
        createMapRef.current.remove();
        createMapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 pb-24">
      <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
        <button
          onClick={() => {
            if (screen === "entry") setLocation(gameReturnTo);
            else if (screen === "campaign") setScreen("entry");
            else if (screen === "my-quests") setScreen("entry");
            else if (screen === "my-challenges") setScreen("entry");
            else if (screen === "explorer-dashboard") setScreen("entry");
            else if (screen === "create-step1") setScreen("entry");
            else if (screen === "create-step2") setScreen("create-step1");
            else if (screen === "create-step3") setScreen("create-step2");
            else if (screen === "quest-preview") {
              if (isRandomMode) {
                setIsRandomMode(false);
                setGeneratedQuestData(null);
                setScreen("create-step1");
              } else {
                setScreen("create-step3");
              }
            }
            else if (screen === "intro") handleBackToCampaign();
            else if (screen === "clue") { setClueRevealed(false); setScreen("intro"); }
            else if (screen === "city-guess") { setCityGuess(null); setCityResult(null); setScreen("clue"); }
            else if (screen === "compass-guess") { setCompassGuess(null); setCompassResult(null); setScreen("city-guess"); }
            else if (screen === "travel") { setScreen("clue"); }
            else handleBackToCampaign();
          }}
          className="p-1"
          data-testid="button-back-compass"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">🧭</span>
          <h1 className="text-lg font-bold">Compass Quest</h1>
        </div>
        {/* Right side: fragment tracker + TTS controls */}
        <div className="ml-auto flex items-center gap-2">
          {progress && selectedAdventure && !["campaign", "intro", "victory"].includes(screen) && (
            <div className="text-sm">
              <MapFragmentDisplay collected={progress.fragmentsCollected.length} total={selectedAdventure.id === "broken-trail" ? 7 : selectedAdventure.steps.length} adventureId={selectedAdventure.id} />
            </div>
          )}

          {/* TTS controls — shown on story beat screens */}
          {selectedAdventure && ["intro", "clue", "victory"].includes(screen) && (
            <div className="flex items-center gap-1">
              {/* Voice toggle pill */}
              <div className="flex bg-white/20 rounded-full overflow-hidden text-[10px] font-bold leading-none">
                <button
                  onClick={() => tts.setVoice("eva")}
                  className={`px-2 py-1 transition-colors ${tts.voice === "eva" ? "bg-white text-amber-700" : "text-white/80 hover:text-white"}`}
                  data-testid="button-tts-voice-eva"
                >
                  EVA
                </button>
                <button
                  onClick={() => tts.setVoice("ari")}
                  className={`px-2 py-1 transition-colors ${tts.voice === "ari" ? "bg-white text-amber-700" : "text-white/80 hover:text-white"}`}
                  data-testid="button-tts-voice-ari"
                >
                  ARI
                </button>
              </div>
              {/* Mute / unmute button — pure toggle, never play/pause */}
              <button
                onClick={tts.toggleMute}
                className={`p-1.5 rounded-full transition-all hover:bg-white/20 ${tts.isMuted ? "opacity-50" : "opacity-100"}`}
                title={tts.isMuted ? "Unmute narrator" : "Mute narrator"}
                data-testid="button-tts-mute"
              >
                {tts.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <AnimatePresence mode="wait">

          {screen === "entry" && (() => {
            const unfinishedAdventure = ADVENTURES.find(adv => {
              const p = loadProgress(adv.id, explorerId);
              return p && !p.completed;
            });
            const savedCustomAdventure = loadCustomAdventure(explorerId);
            const customProgress = savedCustomAdventure ? loadProgress(savedCustomAdventure.id, explorerId) : null;
            const hasUnfinishedCustomQuest = !!(savedCustomAdventure && customProgress && !customProgress.completed);
            const hasUnfinishedQuest = !!unfinishedAdventure || hasUnfinishedCustomQuest;

            const compassStats = loadCompassStats(explorerId);
            const compassAchievements = loadCompassAchievements(explorerId);
            const unlockedCount = Object.keys(compassAchievements).length;
            const explorerXp = activeExplorer?.totalXp ?? 0;
            const { getExplorerRank } = (() => {
              const EXPLORER_XP_RANKS = [
                { level: 1, name: 'Explorer', minXp: 0, icon: '🧭' },
                { level: 2, name: 'Trail Seeker', minXp: 50, icon: '🥾' },
                { level: 3, name: 'Pathfinder', minXp: 150, icon: '🗺️' },
                { level: 4, name: 'City Spotter', minXp: 350, icon: '🔭' },
                { level: 5, name: 'Cartographer', minXp: 650, icon: '🎭' },
                { level: 6, name: 'World Ranger', minXp: 1100, icon: '🌍' },
                { level: 7, name: 'Navigator', minXp: 1800, icon: '🧭' },
                { level: 8, name: 'Voyager', minXp: 2800, icon: '✈️' },
                { level: 9, name: 'World Scholar', minXp: 4200, icon: '📚' },
                { level: 10, name: 'Master Explorer', minXp: 6200, icon: '⭐' },
                { level: 11, name: 'Geography Legend', minXp: 9000, icon: '🏆' },
                { level: 12, name: 'GeoQuest Champion', minXp: 13000, icon: '👑' },
              ];
              return {
                getExplorerRank: (xp: number) => {
                  let current = EXPLORER_XP_RANKS[0];
                  let next: typeof EXPLORER_XP_RANKS[0] | null = null;
                  for (let i = 0; i < EXPLORER_XP_RANKS.length; i++) {
                    if (xp >= EXPLORER_XP_RANKS[i].minXp) current = EXPLORER_XP_RANKS[i];
                  }
                  const idx = EXPLORER_XP_RANKS.indexOf(current);
                  next = idx < EXPLORER_XP_RANKS.length - 1 ? EXPLORER_XP_RANKS[idx + 1] : null;
                  const xpToNext = next ? next.minXp - xp : 0;
                  const xpInLevel = xp - current.minXp;
                  const rangeSize = next ? next.minXp - current.minXp : 1;
                  const progressPct = next ? Math.min(100, Math.round((xpInLevel / rangeSize) * 100)) : 100;
                  return { rank: current, next, xpToNext, progressPct };
                }
              };
            })();
            const rankInfo = getExplorerRank(explorerXp);

            function handlePlayQuest() {
              if (hasUnfinishedQuest) {
                if (hasUnfinishedCustomQuest && savedCustomAdventure && customProgress) {
                  setSelectedAdventure(savedCustomAdventure);
                  setProgress(customProgress);
                  setIntroFragmentShown(true);
                  setScreen("intro");
                } else {
                  setScreen("campaign");
                }
              } else {
                setScreen("campaign");
              }
            }

            return (
              <motion.div key="entry" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 py-4">
                <div className="text-center py-2">
                  <motion.div
                    animate={{ rotate: [0, -8, 8, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                    className="text-6xl mb-3"
                  >🧭</motion.div>
                  <h2 className="text-2xl font-bold text-amber-800" data-testid="text-choose-quest-title">Compass Quest Hub</h2>
                  <p className="text-amber-600 mt-1 text-sm">Play, create, or challenge your friends.</p>
                </div>

                {/* 3 Primary Action Cards */}
                <div className="space-y-3">
                  {/* Play a Quest */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} whileHover={{ scale: 1.01 }}>
                    <Card
                      className="border-2 border-amber-300 overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                      onClick={handlePlayQuest}
                      data-testid="card-quest-play"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-2xl shadow-md flex-shrink-0">
                            {hasUnfinishedQuest ? "🧭" : "👑"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-amber-800" data-testid="text-card-title-play">
                              {hasUnfinishedQuest ? "Continue Your Quest" : "Play a Quest"}
                            </h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {hasUnfinishedQuest ? "Pick up where you left off" : "Explore pre-made quests across the world"}
                            </p>
                            {hasUnfinishedQuest && (unfinishedAdventure || hasUnfinishedCustomQuest) && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-amber-600 font-medium">
                                  {hasUnfinishedCustomQuest && savedCustomAdventure ? savedCustomAdventure.subtitle || "Custom Quest" : unfinishedAdventure?.title}
                                </span>
                                <div className="h-1.5 flex-1 bg-amber-100 rounded-full overflow-hidden">
                                  {(() => {
                                    const adv = hasUnfinishedCustomQuest && savedCustomAdventure ? savedCustomAdventure : unfinishedAdventure;
                                    const p = adv ? loadProgress(adv.id, explorerId) : null;
                                    return p && adv ? <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(p.currentStep / adv.steps.length) * 100}%` }} /> : null;
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.93 }}
                            className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md"
                            onClick={e => { e.stopPropagation(); handlePlayQuest(); }}
                            data-testid="button-play-quest"
                          >
                            {hasUnfinishedQuest ? "Continue" : "Start Quest"}
                          </motion.button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Create Your Own Quest */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ scale: 1.01 }}>
                    <Card
                      className="border-2 border-purple-300 overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => {
                        if (isGuestUser) { setShowGuestSignUp(true); return; }
                        setCreateSelectedCities([]); setCreateOrderedCities([]); setCreateCitySearch(""); setCreateStopCount(5); setGeneratedQuestData(null); setScreen("create-step1");
                      }}
                      data-testid="card-quest-create"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-2xl shadow-md flex-shrink-0">✨</div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-purple-800" data-testid="text-card-title-create">Create Your Own Quest</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Build a custom quest with your own cities</p>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.93 }}
                            className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md"
                            onClick={e => {
                              e.stopPropagation();
                              if (isGuestUser) { setShowGuestSignUp(true); return; }
                              setCreateSelectedCities([]); setCreateOrderedCities([]); setCreateCitySearch(""); setCreateStopCount(5); setGeneratedQuestData(null); setScreen("create-step1");
                            }}
                            data-testid="button-create-quest"
                          >
                            Create Quest
                          </motion.button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Challenge a Friend */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileHover={{ scale: 1.01 }}>
                    <Card
                      className="border-2 border-rose-300 overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => setScreen("my-challenges")}
                      data-testid="card-quest-challenge"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-2xl shadow-md flex-shrink-0">⚔️</div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-rose-800" data-testid="text-card-title-challenge">Challenge a Friend</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Challenge friends. Beat their score.</p>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.93 }}
                            className="flex-shrink-0 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md"
                            onClick={e => { e.stopPropagation(); setScreen("my-challenges"); }}
                            data-testid="button-challenge-quest"
                          >
                            Challenges
                          </motion.button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Explorer Dashboard compact card */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} whileHover={{ scale: 1.01 }}>
                  <Card className="border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 shadow-md" data-testid="card-explorer-dashboard">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{rankInfo.rank.icon}</span>
                          <div>
                            <p className="text-sm font-bold text-sky-800" data-testid="text-dashboard-rank">{rankInfo.rank.name}</p>
                            <p className="text-xs text-sky-600">{explorerXp} XP total</p>
                          </div>
                        </div>
                        <button
                          className="text-xs font-bold text-sky-600 bg-sky-100 hover:bg-sky-200 border border-sky-200 px-3 py-1.5 rounded-xl transition-colors"
                          onClick={() => setScreen("explorer-dashboard")}
                          data-testid="button-view-progress"
                        >
                          View Progress
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center bg-white rounded-xl py-1.5 px-2 border border-sky-100">
                          <p className="text-base font-bold text-sky-700" data-testid="text-dashboard-quests">{compassStats.totalQuestsCompleted}</p>
                          <p className="text-[10px] text-gray-400 leading-tight">Quests</p>
                        </div>
                        <div className="text-center bg-white rounded-xl py-1.5 px-2 border border-sky-100">
                          <p className="text-base font-bold text-sky-700" data-testid="text-dashboard-challenge-wins">{compassStats.challengesWon}</p>
                          <p className="text-[10px] text-gray-400 leading-tight">Wins</p>
                        </div>
                        <div className="text-center bg-white rounded-xl py-1.5 px-2 border border-sky-100">
                          <p className="text-base font-bold text-sky-700" data-testid="text-dashboard-achievements">{unlockedCount}</p>
                          <p className="text-[10px] text-gray-400 leading-tight">Badges</p>
                        </div>
                      </div>
                      {/* XP progress bar */}
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                          <span>Progress to {rankInfo.next?.name ?? "Max"}</span>
                          <span>{rankInfo.progressPct}%</span>
                        </div>
                        <div className="h-1.5 bg-sky-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${rankInfo.progressPct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* My Quests + My Challenges utility cards */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-2">
                  {[
                    { id: "my-quests", label: "My Quests", icon: "✨", color: "from-purple-500 to-indigo-500", border: "border-purple-200", badge: loadAllCustomAdventures(explorerId).length, sub: (n: number) => `${n} quest${n !== 1 ? "s" : ""} created` },
                    { id: "my-challenges", label: "My Challenges", icon: "⚔️", color: "from-rose-500 to-pink-500", border: "border-rose-200", badge: 0, sub: () => "Challenges from friends" },
                  ].map((row) => (
                    <motion.button
                      key={row.id}
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.01 }}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white border ${row.border} shadow-sm hover:shadow-md transition-shadow text-left`}
                      data-testid={`button-nav-${row.id}`}
                      onClick={() => setScreen(row.id as Screen)}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${row.color} flex items-center justify-center text-xl shadow flex-shrink-0`}>
                        {row.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">{row.label}</p>
                        <p className="text-xs text-gray-400">{row.sub(row.badge)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            );
          })()}

          {screen === "my-quests" && (
            <motion.div key="my-quests" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4 py-2">
              <div className="flex items-center gap-3 pb-1">
                <button onClick={() => setScreen("entry")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" data-testid="button-back-my-quests">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-purple-800">My Quests</h2>
                  <p className="text-xs text-gray-400">Quests you have created</p>
                </div>
              </div>
              {(() => {
                const allCustom = loadAllCustomAdventures(explorerId);
                if (allCustom.length === 0) {
                  return (
                    <Card className="border border-dashed border-purple-200 bg-purple-50/40">
                      <CardContent className="p-8 text-center space-y-2">
                        <p className="text-3xl">✨</p>
                        <p className="text-sm font-semibold text-purple-700">No quests yet</p>
                        <p className="text-xs text-gray-400">Create your first custom quest to see it here</p>
                        <Button className="mt-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-xl" onClick={() => { setCreateSelectedCities([]); setCreateOrderedCities([]); setCreateCitySearch(""); setCreateStopCount(5); setGeneratedQuestData(null); setScreen("create-step1"); }} data-testid="button-create-first-quest">
                          Create a Quest
                        </Button>
                      </CardContent>
                    </Card>
                  );
                }
                return (
                  <div className="space-y-2">
                    {allCustom.map((adv, i) => {
                      const prog = loadProgress(adv.id, explorerId);
                      const isCompleted = prog?.completed;
                      const cityNames = adv.steps.slice(0, 5).map(s => s.city ?? "?").join(" → ");
                      const extraCount = adv.steps.length > 5 ? adv.steps.length - 5 : 0;
                      return (
                        <motion.div key={adv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                          <Card className="border border-purple-200 bg-white shadow-sm">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-xl shadow flex-shrink-0 mt-0.5">✨</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-800 leading-tight">{adv.subtitle ?? adv.title}</p>
                                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{cityNames}{extraCount > 0 ? ` +${extraCount} more` : ""}</p>
                                  <p className="text-xs text-gray-300 mt-1">{adv.steps.length} stops</p>
                                  {isCompleted && (
                                    <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full mt-1">Completed ✓</span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 rounded-lg mt-0.5"
                                  data-testid={`button-replay-my-quest-${i}`}
                                  onClick={() => {
                                    saveCustomAdventure(adv, explorerId);
                                    setSelectedAdventure(adv);
                                    beginNewRun(adv);
                                  }}
                                >
                                  Replay
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {screen === "my-challenges" && (() => {
            const sentChallenges = loadSentChallenges();
            return (
              <motion.div key="my-challenges" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4 py-2">
                <div className="flex items-center gap-3 pb-1">
                  <button onClick={() => setScreen("entry")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" data-testid="button-back-my-challenges">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-rose-700">My Challenges</h2>
                    <p className="text-xs text-gray-400">Challenges sent & received</p>
                  </div>
                </div>

                {/* Active Challenges — Sent */}
                {sentChallenges.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-wider px-1">🔥 Active Challenges</p>
                    {sentChallenges.map((ch, i) => {
                      const daysAgo = Math.floor((Date.now() - new Date(ch.createdAt).getTime()) / 86400000);
                      const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
                      return (
                        <Card key={i} className="border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50" data-testid={`card-sent-challenge-${i}`}>
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-lg flex-shrink-0">⚔️</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-rose-800 truncate">{ch.questName}</p>
                              <p className="text-xs text-gray-500">{ch.xp} XP · {ch.accuracy}% accuracy · {timeLabel}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <button
                                onClick={async () => {
                                  try { await navigator.clipboard.writeText(ch.shareUrl); toast.success("Link copied!"); }
                                  catch { toast.error("Could not copy"); }
                                }}
                                className="text-xs px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors"
                                data-testid={`button-copy-sent-challenge-${i}`}
                              >
                                📋 Copy
                              </button>
                              <p className="font-mono text-[10px] text-rose-400">{ch.shareCode}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Manual code entry */}
                <Card className="border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔑</span>
                      <div>
                        <p className="text-sm font-bold text-rose-700">Got a challenge code?</p>
                        <p className="text-xs text-gray-500">Enter the code your friend shared with you</p>
                      </div>
                    </div>
                    <MyChallengesCodeEntry />
                  </CardContent>
                </Card>

                {sentChallenges.length === 0 && (
                  <Card className="border border-dashed border-rose-200 bg-rose-50/40">
                    <CardContent className="p-6 text-center space-y-2">
                      <p className="text-3xl">⚔️</p>
                      <p className="text-sm font-semibold text-rose-700">No challenges yet</p>
                      <p className="text-xs text-gray-400">Complete a quest and challenge a friend — your sent challenges will appear here</p>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            );
          })()}

          {screen === "explorer-dashboard" && (() => {
            const EXPLORER_XP_RANKS_DASH = [
              { level: 1, name: 'Explorer', minXp: 0, icon: '🧭', flavor: 'Every journey begins somewhere 🌍' },
              { level: 2, name: 'Trail Seeker', minXp: 50, icon: '🥾', flavor: "You're finding your path" },
              { level: 3, name: 'Pathfinder', minXp: 150, icon: '🗺️', flavor: 'The world awaits your footsteps' },
              { level: 4, name: 'City Spotter', minXp: 350, icon: '🔭', flavor: 'Your eyes are trained on the skyline' },
              { level: 5, name: 'Cartographer', minXp: 650, icon: '🎭', flavor: "You're mapping your own story" },
              { level: 6, name: 'World Ranger', minXp: 1100, icon: '🌍', flavor: 'You roam where few have ventured' },
              { level: 7, name: 'Navigator', minXp: 1800, icon: '🧭', flavor: 'The stars guide your way' },
              { level: 8, name: 'Voyager', minXp: 2800, icon: '✈️', flavor: 'Seas and skies hold no mystery' },
              { level: 9, name: 'World Scholar', minXp: 4200, icon: '📚', flavor: 'Your knowledge shapes empires' },
              { level: 10, name: 'Master Explorer', minXp: 6200, icon: '⭐', flavor: "You've mastered the art of discovery" },
              { level: 11, name: 'Geography Legend', minXp: 9000, icon: '🏆', flavor: 'Legends are written in your footsteps' },
              { level: 12, name: 'GeoQuest Champion', minXp: 13000, icon: '👑', flavor: 'The world bows to your knowledge' },
            ];
            const explorerXpDash = activeExplorer?.totalXp ?? 0;
            let currentRankDash = EXPLORER_XP_RANKS_DASH[0];
            for (const r of EXPLORER_XP_RANKS_DASH) {
              if (explorerXpDash >= r.minXp) currentRankDash = r;
            }
            const idxDash = EXPLORER_XP_RANKS_DASH.indexOf(currentRankDash);
            const nextRankDash = idxDash < EXPLORER_XP_RANKS_DASH.length - 1 ? EXPLORER_XP_RANKS_DASH[idxDash + 1] : null;
            const xpInLevelDash = explorerXpDash - currentRankDash.minXp;
            const rangeSizeDash = nextRankDash ? nextRankDash.minXp - currentRankDash.minXp : 1;
            const progressPctDash = nextRankDash ? Math.min(100, Math.round((xpInLevelDash / rangeSizeDash) * 100)) : 100;

            const dashStats = loadCompassStats(explorerId);
            const dashAchievements = loadCompassAchievements(explorerId);
            const unlockedCountDash = Object.values(dashAchievements).filter(Boolean).length;

            const accuracy = dashStats.totalCorrectAnswers + dashStats.totalWrongAnswers > 0
              ? Math.round((dashStats.totalCorrectAnswers / (dashStats.totalCorrectAnswers + dashStats.totalWrongAnswers)) * 100)
              : 0;

            const recentUnlocks = ACHIEVEMENTS
              .filter(a => dashAchievements[a.key])
              .sort((a, b) => {
                const ta = dashAchievements[a.key]?.unlockedAt ?? "";
                const tb = dashAchievements[b.key]?.unlockedAt ?? "";
                return tb.localeCompare(ta);
              })
              .slice(0, 2);

            const nextGoal = ACHIEVEMENTS.find(a => !dashAchievements[a.key]);

            // "Almost There" — locked achievements closest to completion (by ratio), min 1 progress
            const almostThereItems = ACHIEVEMENTS
              .filter(a => !dashAchievements[a.key] && a.progress)
              .map(a => {
                const p = a.progress!(dashStats);
                return { ach: a, value: p.value, max: p.max, ratio: p.max > 0 ? p.value / p.max : 0 };
              })
              .filter(x => x.value > 0 && x.ratio < 1)
              .sort((a, b) => b.ratio - a.ratio)
              .slice(0, 3);

            // Badge strip — first 8 achievements as icons
            const badgeStripItems = ACHIEVEMENTS.slice(0, 8);

            return (
              <motion.div key="explorer-dashboard" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4 py-2 pb-8">
                {/* Achievement unlock banner for current-session unlocks */}
                <AchievementUnlockBanner
                  achievements={newlyUnlockedAchievements}
                  onDone={() => setNewlyUnlockedAchievements([])}
                />
                {/* Header */}
                <div className="flex items-center gap-3 pb-1">
                  <button onClick={() => setScreen("entry")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" data-testid="button-back-dashboard">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-sky-800">Explorer Dashboard</h2>
                    <p className="text-xs text-gray-400">{activeExplorer?.name ?? "Explorer"}'s progress</p>
                  </div>
                </div>

                {/* Hero XP card — with identity flavor text */}
                <Card className="border-0 bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg" data-testid="card-hero-xp">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4 mb-3">
                      <motion.div
                        className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl"
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        {currentRankDash.icon}
                      </motion.div>
                      <div className="flex-1">
                        <p className="text-xs text-sky-200 font-medium uppercase tracking-wider">Level {currentRankDash.level}</p>
                        <p className="text-xl font-bold leading-tight" data-testid="text-hero-rank">{currentRankDash.name}</p>
                        <p className="text-sky-200 text-xs mt-0.5 italic">{currentRankDash.flavor}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-white mb-3" data-testid="text-hero-xp">
                      {explorerXpDash} <span className="text-sky-200 text-sm font-normal">XP total</span>
                    </p>
                    <div>
                      <div className="flex justify-between text-xs text-sky-200 mb-1">
                        <span>Progress to {nextRankDash?.name ?? "Max Rank"}</span>
                        <span>{progressPctDash}%</span>
                      </div>
                      <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-white rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPctDash}%` }}
                          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                        />
                      </div>
                      {nextRankDash && (
                        <p className="text-xs text-sky-200 mt-1">{nextRankDash.minXp - explorerXpDash} XP to unlock {nextRankDash.name}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 🏅 Badge Preview Strip */}
                <div data-testid="section-badge-strip">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-700">🏅 Your Badges</p>
                    <span className="text-xs text-amber-600 font-semibold">{unlockedCountDash} / {ACHIEVEMENTS.length} unlocked</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {badgeStripItems.map(ach => {
                      const isUnlocked = !!dashAchievements[ach.key];
                      return (
                        <button
                          key={ach.key}
                          onClick={() => {
                            const el = document.getElementById("achievement-tabs-section");
                            el?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xl border-2 transition-all ${
                            isUnlocked
                              ? "bg-amber-50 border-amber-300 shadow-sm shadow-amber-100"
                              : "bg-gray-50 border-gray-200 grayscale opacity-40"
                          }`}
                          title={ach.label}
                          data-testid={`badge-strip-${ach.key}`}
                        >
                          {ach.icon}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => {
                        const el = document.getElementById("achievement-tabs-section");
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200"
                    >
                      +{ACHIEVEMENTS.length - 8}
                    </button>
                  </div>
                </div>

                {/* 6-stat grid */}
                <div className="grid grid-cols-3 gap-2" data-testid="section-stats-grid">
                  {[
                    { label: "Total XP", value: explorerXpDash, icon: "⭐" },
                    { label: "Quests", value: dashStats.totalQuestsCompleted, icon: "🧭" },
                    { label: "Accuracy", value: `${accuracy}%`, icon: "🎯" },
                    { label: "Best Time", value: dashStats.bestTimeMs ? formatTime(dashStats.bestTimeMs) : "—", icon: "⚡" },
                    { label: "Challenge Wins", value: dashStats.challengesWon, icon: "⚔️" },
                    { label: "Streak", value: dashStats.currentStreak, icon: "🔥" },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center"
                      data-testid={`stat-${stat.label.toLowerCase().replace(/ /g, "-")}`}
                    >
                      <p className="text-lg">{stat.icon}</p>
                      <p className="text-base font-bold text-gray-800">{stat.value}</p>
                      <p className="text-[10px] text-gray-400 leading-tight">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* 🎯 Next Goal — big highlight card */}
                {nextGoal && (
                  <div data-testid="section-next-goal">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🎯 Next Unlock</p>
                    <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-md shadow-amber-100">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-200 flex items-center justify-center text-2xl">
                            {nextGoal.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-base font-bold text-amber-900">{nextGoal.label}</p>
                            <p className="text-xs text-amber-700">{nextGoal.description}</p>
                          </div>
                        </div>
                        {nextGoal.progress && (() => {
                          const p = nextGoal.progress(dashStats);
                          const pct = p.max > 0 ? Math.round((p.value / p.max) * 100) : 0;
                          return (
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-amber-600 mb-1">
                                <span>Progress</span><span>{p.value} / {p.max}</span>
                              </div>
                              <div className="h-2.5 bg-amber-100 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-amber-400 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                        <button
                          onClick={() => setScreen("entry")}
                          className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors"
                          data-testid="button-next-goal-start"
                        >
                          Start a Quest →
                        </button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ⚡ Almost There */}
                {almostThereItems.length > 0 && (
                  <div data-testid="section-almost-there">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">⚡ Almost There</p>
                    <div className="space-y-2">
                      {almostThereItems.map(({ ach, value, max, ratio }) => {
                        const cs = CAT_STYLES[ach.category];
                        const pct = Math.round(ratio * 100);
                        return (
                          <div
                            key={ach.key}
                            className={`rounded-2xl ${cs.bg} border ${cs.border} p-3 shadow-sm`}
                            data-testid={`almost-there-${ach.key}`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xl">{ach.icon}</span>
                              <div className="flex-1">
                                <p className={`text-sm font-bold ${cs.accent}`}>{ach.label}</p>
                                <p className="text-xs text-gray-500">{ach.description}</p>
                              </div>
                              <span className={`text-xs font-bold ${cs.accent} bg-white/70 px-2 py-0.5 rounded-full border ${cs.border}`}>
                                {value} / {max}
                              </span>
                            </div>
                            <div className="h-2 bg-white/80 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full ${cs.barColor} rounded-full`}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.9, ease: "easeOut", delay: 0.4 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Achievements preview — recent unlocks */}
                {recentUnlocks.length > 0 && (
                  <Card className="border border-amber-200 bg-amber-50/50" data-testid="section-recent-unlocks">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Recent Unlocks</p>
                      {recentUnlocks.map(ach => (
                        <div key={ach.key} className="flex items-center gap-2 bg-white rounded-xl border border-amber-100 p-2">
                          <span className="text-xl">{ach.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-gray-800">{ach.label}</p>
                            <p className="text-[10px] text-gray-400">{ach.description}</p>
                          </div>
                          <span className="ml-auto text-green-500 text-base">✓</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Full achievement category tabs */}
                <div id="achievement-tabs-section">
                  <DashboardAchievementTabs
                    achievements={dashAchievements}
                    newlyUnlocked={newlyUnlockedAchievements}
                    stats={dashStats}
                  />
                </div>
              </motion.div>
            );
          })()}

          {screen === "create-step1" && (
            <motion.div key="create-step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4 py-2">
              <div className="text-center mb-2">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-1">Step 1 of 3</p>
                <h2 className="text-xl font-bold text-amber-800" data-testid="text-create-step1-title">Where is your Quest happening?</h2>
                <p className="text-sm text-gray-500 mt-1">Choose your cities or let the compass decide</p>
              </div>

              {/* Mode tabs */}
              <div className="flex gap-1 p-1 bg-amber-100 rounded-xl" data-testid="create-mode-tabs">
                <button
                  onClick={() => { setCreateTab("select-cities"); setIsRandomMode(false); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${createTab === "select-cities" ? "bg-white text-amber-700 shadow-sm" : "text-amber-600 hover:text-amber-800"}`}
                  data-testid="tab-select-cities"
                >
                  Select Cities
                </button>
                <button
                  onClick={() => setCreateTab("generate-random")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${createTab === "generate-random" ? "bg-white text-amber-700 shadow-sm" : "text-amber-600 hover:text-amber-800"}`}
                  data-testid="tab-generate-random"
                >
                  Generate Random
                </button>
              </div>

              {createTab === "select-cities" && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">How many stops?</span>
                    <div className="flex gap-2">
                      {[4,5,6,7,8].map(n => (
                        <button
                          key={n}
                          onClick={() => setCreateStopCount(n)}
                          className={`w-9 h-9 rounded-xl text-sm font-bold border-2 transition-colors ${createStopCount === n ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'}`}
                          data-testid={`button-stop-count-${n}`}
                        >{n}</button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search for a city..."
                      value={createCitySearch}
                      onChange={e => setCreateCitySearch(e.target.value)}
                      className="pl-10 h-11 rounded-xl"
                      data-testid="input-city-search"
                    />
                  </div>

                  {createCitySearch.trim().length >= 2 && createGeoLoading && createSearchResults.length === 0 && (
                    <div className="flex items-center gap-2 px-4 py-3 text-amber-600 text-sm" data-testid="text-city-search-loading">
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>🧭</motion.span>
                      Searching cities…
                    </div>
                  )}

                  {createSearchResults.length > 0 && (
                    <Card className="overflow-hidden border border-amber-200">
                      {createSearchResults.map(city => (
                        <button
                          key={city.name}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                          onClick={() => addCreateCity(city.name)}
                          data-testid={`search-city-${city.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <MapPin className="w-4 h-4 text-amber-500" />
                          <div>
                            <p className="font-medium text-sm text-gray-800">{city.name}</p>
                            <p className="text-xs text-gray-400">{city.country}</p>
                          </div>
                          <span className="ml-auto text-amber-500 text-lg">+</span>
                        </button>
                      ))}
                    </Card>
                  )}

                  {!createCitySearch && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Popular Destinations</p>
                      <div className="grid grid-cols-2 gap-2">
                        {POPULAR_CITIES.slice(0, 12).map(city => {
                          const isSelected = createSelectedCities.some(c => c.name === city.name);
                          return (
                            <button
                              key={city.name}
                              onClick={() => isSelected ? undefined : addCreateCity(city.name)}
                              disabled={isSelected}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left text-sm transition-colors ${isSelected ? 'border-amber-400 bg-amber-50 opacity-70 cursor-default' : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50'}`}
                              data-testid={`popular-city-${city.name.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <span className="text-base">📍</span>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 truncate text-xs">{city.name}</p>
                                <p className="text-xs text-gray-400 truncate">{city.country}</p>
                              </div>
                              {isSelected && <Check className="w-3 h-3 text-amber-500 ml-auto flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div ref={initCreateMapOnEl} className="w-full rounded-2xl overflow-hidden border-2 border-amber-200 shadow-sm" style={{ height: '180px', width: '100%' }} data-testid="create-map" />

                  {createSelectedCities.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2" data-testid="text-selected-count">{createSelectedCities.length} of {createStopCount} cities selected</p>
                      <div className="flex flex-wrap gap-2">
                        {createSelectedCities.map(city => (
                          <div key={city.id} className="flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                            {city.name}
                            <button onClick={() => removeCreateCity(city.id)} className="ml-1 hover:text-amber-900" data-testid={`remove-city-${city.id}`}>
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    disabled={createSelectedCities.length < createStopCount}
                    onClick={() => {
                      setCreateOrderedCities([...createSelectedCities]);
                      setScreen("create-step2");
                      setCreateMapTick(t => t + 1);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-3 font-bold disabled:opacity-40"
                    data-testid="button-next-build-route"
                  >
                    Next: Build Quest →
                  </Button>
                </>
              )}

              {createTab === "generate-random" && (
                <div className="space-y-5">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 text-center">
                    <div className="text-3xl mb-2">🧭</div>
                    <h3 className="font-bold text-amber-800 text-base mb-1">Surprise Quest!</h3>
                    <p className="text-sm text-amber-700">We will select cities and shuffle them in random order for your quest. You won't know what comes next.</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-600">How many mystery stops?</span>
                    <div className="flex gap-2">
                      {[4,5,6,7,8].map(n => (
                        <button
                          key={n}
                          onClick={() => setCreateRandomStopCount(n)}
                          className={`w-9 h-9 rounded-xl text-sm font-bold border-2 transition-colors ${createRandomStopCount === n ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'}`}
                          data-testid={`button-random-stop-count-${n}`}
                        >{n}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your mystery destinations</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: createRandomStopCount }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50">
                          <span className="text-base">❓</span>
                          <div className="min-w-0 flex-1">
                            <div className="h-3 bg-amber-200 rounded-full w-16 mb-1 blur-[3px]" />
                            <div className="h-2 bg-amber-100 rounded-full w-10 blur-[3px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateRandomQuest}
                    disabled={isGeneratingQuest}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl py-3.5 font-bold text-base shadow-md disabled:opacity-50"
                    data-testid="button-generate-random-quest"
                  >
                    {isGeneratingQuest ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block">🧭</motion.span>
                        Plotting your adventure…
                      </span>
                    ) : (
                      "Generate Quest"
                    )}
                  </Button>
                  <p className="text-center text-xs text-gray-400">Mystery starting city · Rotates through 4 unique adventures</p>
                </div>
              )}
            </motion.div>
          )}

          {screen === "create-step2" && (
            <motion.div key="create-step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4 py-2">
              <div className="text-center mb-2">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-1">Step 2 of 3</p>
                <h2 className="text-xl font-bold text-amber-800" data-testid="text-create-step2-title">Choose Your Order</h2>
                <p className="text-sm text-gray-500 mt-1">Set the order of your journey</p>
              </div>

              <div className="flex gap-2 p-1 bg-amber-100 rounded-xl">
                <button
                  onClick={() => setCreateOrderMode("select")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${createOrderMode === "select" ? "bg-white text-amber-700 shadow-sm" : "text-amber-600 hover:text-amber-800"}`}
                  data-testid="button-order-mode-select"
                >
                  Select Order
                </button>
                <button
                  onClick={() => setCreateOrderMode("shuffle")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${createOrderMode === "shuffle" ? "bg-white text-amber-700 shadow-sm" : "text-amber-600 hover:text-amber-800"}`}
                  data-testid="button-order-mode-shuffle"
                >
                  🔀 Shuffle
                </button>
              </div>

              {createOrderMode === "shuffle" ? (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-6 text-center space-y-2">
                  <div className="text-3xl">🎲</div>
                  <p className="font-bold text-amber-800">Surprise Order Selected!</p>
                  <p className="text-sm text-gray-500">Your cities will be shuffled into a random order when the quest generates. You won't know what comes next!</p>
                </div>
              ) : (
                <>
                  <div ref={initCreateMapOnEl} className="w-full rounded-2xl overflow-hidden border-2 border-amber-200 shadow-sm" style={{ height: '180px', width: '100%' }} data-testid="create-route-map" />

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
                    <span>💡</span>
                    <span>Tip: Try moving west to east for smoother routes</span>
                  </div>

                  <Reorder.Group
                    axis="y"
                    values={createOrderedCities}
                    onReorder={cities => { setCreateOrderedCities(cities); setCreateMapTick(t => t + 1); }}
                    className="space-y-2"
                  >
                    {createOrderedCities.map((city, idx) => (
                      <Reorder.Item key={city.id} value={city} className="cursor-grab active:cursor-grabbing" data-testid={`route-city-${city.id}`}>
                        <div className="flex items-center gap-3 bg-white border-2 border-amber-200 rounded-xl px-3 py-3 shadow-sm hover:shadow-md transition-shadow">
                          <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                          <span className="font-semibold text-gray-800 flex-1">{city.name}</span>
                          {idx > 0 && <span className="text-[10px] text-gray-300 font-mono">drag</span>}
                          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </div>
                        {idx < createOrderedCities.length - 1 && (
                          <div className="flex justify-center py-1">
                            <div className="w-px h-4 border-l-2 border-dashed border-amber-300" />
                          </div>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </>
              )}

              <Button
                onClick={() => setScreen("create-step3")}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-3 font-bold"
                data-testid="button-next-choose-quest-type"
              >
                Next: Choose Quest Type →
              </Button>
            </motion.div>
          )}

          {screen === "create-step3" && (
            <motion.div key="create-step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5 py-2">
              <div className="text-center mb-2">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-1">Step 3 of 3</p>
                <h2 className="text-xl font-bold text-amber-800" data-testid="text-create-step3-title">Choose Your Quest</h2>
                <p className="text-sm text-gray-500 mt-1">Select a quest template</p>
              </div>

              <Card className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">👑</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-amber-800 text-lg">The Lost Crown</h3>
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-semibold">Story Mode</span>
                        <span className="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Selected</span>
                      </div>
                      <p className="text-sm text-gray-600">A crown has been shattered. Follow clues through your chosen cities to recover all the fragments!</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    {createOrderedCities.map((city, i) => (
                      <span key={city.id} className="flex items-center gap-1 bg-white border border-amber-200 px-2 py-1 rounded-full">
                        <span className="text-amber-500 font-bold">{i + 1}</span> {city.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {isGeneratingQuest ? (
                <div className="text-center py-8 space-y-4" data-testid="text-loading-quest">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-5xl mx-auto w-16 h-16 flex items-center justify-center"
                  >🧭</motion.div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingMessageIdx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="text-amber-700 font-semibold text-lg"
                    >
                      {LOADING_MESSAGES[loadingMessageIdx]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              ) : (
                <Button
                  onClick={handleGenerateQuest}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl py-4 font-bold text-lg shadow-lg"
                  data-testid="button-generate-quest"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Quest
                </Button>
              )}
            </motion.div>
          )}

          {screen === "quest-preview" && generatedQuestData && (
            <motion.div key="quest-preview" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-5 py-2">
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, -5, 5, -3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-6xl mb-3"
                >{isRandomMode ? "🎲" : "👑"}</motion.div>
                <h2 className="text-2xl font-bold text-amber-800" data-testid="text-quest-preview-title">{"Quest Ready!"}</h2>
                <p className="text-sm text-gray-500 mt-1">{isRandomMode ? "Your mystery adventure awaits — destinations revealed as you play!" : "Your custom quest has been generated"}</p>
              </div>

              <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2">
                    <span>{isRandomMode ? "🎲" : "👑"}</span> {generatedQuestData.quest_title}
                    <span className="ml-auto text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-normal">{isRandomMode ? "Mystery Mode" : "Story Mode"}</span>
                  </h3>
                  <div className="space-y-1.5">
                    {createOrderedCities.map((_, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-amber-500">❓</span>
                          <div className="h-3 bg-amber-200 rounded-full w-24 blur-sm" />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-amber-700 italic pt-1 flex items-center gap-1">
                      <span>🎭</span> The mystery reveals itself as you play!
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {createOrderedCities.length} cities</span>
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {createOrderedCities.length * 10} XP</span>
                    <span className="flex items-center gap-1">👑 {createOrderedCities.length} fragments</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button
                  onClick={handlePlayGeneratedQuest}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl py-4 font-bold text-lg shadow-lg"
                  data-testid="button-play-quest"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {isRandomMode ? "Play Surprise Quest!" : "Play Quest"}
                </Button>
              </div>
            </motion.div>
          )}

          {screen === "campaign" && (
            <motion.div key="campaign" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="text-center py-4">
                <div className="text-5xl mb-2">🧭</div>
                <h2 className="text-2xl font-bold text-amber-800" data-testid="text-compass-quest-title">Compass Quest</h2>
                <p className="text-amber-600 mt-1">Follow clues and use your compass to find hidden treasures!</p>
              </div>

              {ADVENTURES.filter(adv => adv.steps.length > 0).slice(0, 5).map((adv, idx, arr) => {
                const record = records[adv.id];
                const existingProgress = loadProgress(adv.id, explorerId);
                const hasProgress = existingProgress && !existingProgress.completed;
                // Adventure 1 is always unlocked; each subsequent one requires the previous to be completed
                const isUnlocked = idx === 0 || (records[arr[idx - 1].id]?.completions ?? 0) > 0;
                const isLocked = !isUnlocked;
                return (
                  <Card key={adv.id} className={`border-2 overflow-hidden transition-colors ${isLocked ? "border-gray-200 opacity-60 cursor-default" : "border-amber-200 hover:border-amber-400 cursor-pointer"}`} onClick={() => !isLocked && startAdventure(adv)} data-testid={`card-adventure-${adv.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-4xl relative">
                          {adv.icon}
                          {isLocked && <span className="absolute -bottom-1 -right-1 text-sm">🔒</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-lg ${isLocked ? "text-gray-400" : "text-gray-800"}`}>{adv.title}</h3>
                          <p className="text-sm text-gray-500">{adv.subtitle}</p>
                          <p className="text-sm text-gray-600 mt-1">{adv.description}</p>
                          {isLocked ? (
                            <p className="text-xs text-amber-700 mt-2 italic font-medium">
                              Complete {arr[idx - 1].title} to unlock!
                            </p>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {adv.steps.length + 1} cities</span>
                                <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {adv.id === "broken-trail" || adv.id === "wild-signal" ? "7 artifacts" : `${adv.steps.length} map pieces`}</span>
                                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Up to {adv.steps.length * 10} XP</span>
                              </div>
                              {hasProgress && (
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(existingProgress.currentStep / adv.steps.length) * 100}%` }} />
                                  </div>
                                  <span className="text-xs text-amber-600 font-medium">{existingProgress.currentStep}/{adv.steps.length}</span>
                                </div>
                              )}
                              {record && (
                                <div className="mt-2 flex items-center gap-3 text-xs">
                                  <span className="text-green-600 flex items-center gap-1"><Trophy className="w-3 h-3" /> {record.completions}x</span>
                                  <span className="text-blue-600 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(record.bestTimeMs)}</span>
                                  <span className="text-amber-600 flex items-center gap-1"><Zap className="w-3 h-3" /> {record.bestXp} XP</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {!isLocked && <ChevronRight className="w-5 h-5 text-gray-400 mt-2 flex-shrink-0" />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          )}

          {screen === "intro" && selectedAdventure && (
            <motion.div key="intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="text-center space-y-6 py-8">
              <motion.div animate={{ rotate: [0, -5, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} className="text-7xl">{selectedAdventure.icon}</motion.div>
              <h2 className="text-2xl font-bold text-amber-800">{selectedAdventure.title}</h2>
              <p className="text-gray-600 max-w-sm mx-auto leading-relaxed italic">{selectedAdventure.description}</p>
              {selectedAdventure.storyIntro && (
                <p className="text-gray-600 max-w-sm mx-auto leading-relaxed italic whitespace-pre-line">{selectedAdventure.storyIntro}</p>
              )}
              <div className="bg-white rounded-xl p-4 border border-amber-200 max-w-xs mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">{selectedAdventure.startCityEmoji}</span>
                  <span className="text-lg font-bold text-gray-800">{selectedAdventure.startCity}</span>
                </div>
              </div>
              {selectedAdventure.id === "broken-trail" || selectedAdventure.id === "wild-signal" || selectedAdventure.id === "royal-journal" ? (
                <Button onClick={() => beginNewRunWithFragment(selectedAdventure)} className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 text-lg rounded-xl shadow-lg" data-testid="button-start-adventure">
                  <Compass className="w-5 h-5 mr-2" />
                  {selectedAdventure.id === "wild-signal" ? "Collect Artifact & Start" : selectedAdventure.id === "royal-journal" ? "Collect Page & Start Quest" : "Collect Fragment & Start"}
                </Button>
              ) : (
                <Button onClick={() => beginNewRun(selectedAdventure)} className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 text-lg rounded-xl shadow-lg" data-testid="button-start-adventure">
                  <Play className="w-5 h-5 mr-2" /> Start Quest
                </Button>
              )}
            </motion.div>
          )}

          {screen === "clue" && currentStep && progress && selectedAdventure && (
            <motion.div key={`clue-${progress.currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">Step {progress.currentStep + 1} of {selectedAdventure.steps.length}</p>
                <h3 className="text-lg font-bold text-gray-800 mt-1">Where to next?</h3>
              </div>
              {currentStep.storyBeat && (
                <Card className="border border-amber-100 bg-gradient-to-br from-amber-50/80 to-yellow-50/80">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">📜</span>
                      <p className="text-gray-600 text-sm leading-relaxed italic whitespace-pre-line">{currentStep.storyBeat}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {!clueRevealed ? (
                <div className="text-center pt-2">
                  <Button onClick={() => setClueRevealed(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl shadow-md" data-testid="button-reveal-clue">
                    Reveal Clue 🔍
                  </Button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {currentStep.clueType === "landmark" && currentStep.landmarkClue ? (
                    <LandmarkClueCard landmarkClue={currentStep.landmarkClue} />
                  ) : currentStep.clueType === "flag" && currentStep.flagClue ? (
                    <FlagClueCard flagClue={currentStep.flagClue} />
                  ) : (
                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">🔍</span>
                          <p className="text-gray-700 leading-relaxed" data-testid="text-city-clue">{currentStep.cityClue}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {currentStep.cityOptions.map((city) => {
                      const isSelected = cityGuess === city;
                      const isCorrectCity = city === currentStep.correctCity;
                      let borderColor = "border-gray-200 hover:border-amber-400";
                      let bgColor = "bg-white";
                      if (cityResult && isSelected) {
                        borderColor = cityResult === "correct" ? "border-green-500" : "border-red-500";
                        bgColor = cityResult === "correct" ? "bg-green-50" : "bg-red-50";
                      }
                      const countryName = currentStep.clueType === "flag" ? getCityCountryName(city) : null;
                      const displayLabel = countryName ? `${city}, ${countryName}` : city;
                      return (
                        <motion.button key={city} whileTap={{ scale: 0.95 }} onClick={() => handleCityGuess(city)} disabled={!!cityResult} className={`p-3 rounded-xl border-2 ${borderColor} ${bgColor} text-center transition-colors`} data-testid={`button-city-${city.toLowerCase().replace(/\s+/g, "-")}`}>
                          <span className="font-semibold text-sm text-gray-800">{cityResult && isSelected ? (isCorrectCity ? "✅ " : "❌ ") : ""}{displayLabel}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  {cityResult === "wrong" && <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-red-500 text-sm font-medium">Not quite! Try again (-2 XP penalty)</motion.p>}
                </motion.div>
              )}
            </motion.div>
          )}

          {screen === "compass-guess" && currentStep && progress && selectedAdventure && (
            <motion.div key={`compass-${progress.currentStep}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">Compass Challenge</p>
                <h3 className="text-lg font-bold text-gray-800 mt-1">Which direction?</h3>
              </div>
              <Card className="border-2 border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🧭</span>
                    <p className="text-gray-700 leading-relaxed" data-testid="text-compass-clue">{currentStep.compassClue}</p>
                  </div>
                </CardContent>
              </Card>
              <CompassNeedle targetDegrees={compassResult === "correct" ? currentStep.compassDirection.degrees : 0} spinning={compassSpinning} revealed={compassRevealed} />
              <div className="grid grid-cols-2 gap-3">
                {activeCompassOptions.map((dir) => {
                  const isSelected = compassGuess?.label === dir.label;
                  const isCorrectDir = dir.label === currentStep.compassDirection.label;
                  let borderColor = "border-gray-200 hover:border-amber-400";
                  let bgColor = "bg-white";
                  if (compassResult && isSelected) {
                    borderColor = compassResult === "correct" ? "border-green-500" : "border-red-500";
                    bgColor = compassResult === "correct" ? "bg-green-50" : "bg-red-50";
                  }
                  return (
                    <motion.button key={dir.label} whileTap={{ scale: 0.95 }} onClick={() => handleCompassGuess(dir)} disabled={!!compassResult} className={`p-3 rounded-xl border-2 ${borderColor} ${bgColor} text-center transition-colors`} data-testid={`button-compass-${dir.label.toLowerCase()}`}>
                      <span className={`text-2xl block mb-1 ${compassResult && isSelected ? (isCorrectDir ? "text-green-500" : "text-red-500") : "text-amber-600"}`}>{getDirectionArrow(dir.degrees)}</span>
                      <span className="font-semibold text-sm text-gray-800">{dir.label}</span>
                    </motion.button>
                  );
                })}
              </div>
              {compassResult === "wrong" && <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-red-500 text-sm font-medium">Wrong direction! Try again (-2 XP penalty)</motion.p>}
            </motion.div>
          )}

          {screen === "travel" && (
            <motion.div key="travel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4">
              <ZoomedMapTravel from={travelFrom} fromCoords={travelFromCoords} to={travelTo} toCoords={travelToCoords} onComplete={handleTravelComplete} directionLabel={travelDirectionLabel} transportMode={travelTransportMode} />
            </motion.div>
          )}

          {screen === "fragment" && progress && selectedAdventure && (
            <motion.div key={`fragment-${progress.currentStep}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="text-center space-y-4 py-6">
              {(selectedAdventure.id === "broken-trail" || selectedAdventure.id === "wild-signal" || selectedAdventure.id === "royal-journal" || selectedAdventure.id === "final-ring") && !introFragmentShown && progress.fragmentsCollected.length === 1 && progress.currentStep === 0 ? (
                <>
                  {selectedAdventure.id === "royal-journal" ? (
                    <>
                      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-sm font-semibold text-green-600 flex items-center justify-center gap-1">
                        <MapPin className="w-4 h-4" /> Page found in {selectedAdventure.startCity}!
                      </motion.div>
                      <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 0.7, delay: 0.3 }}>
                        <div className="w-52 h-52 mx-auto rounded-2xl overflow-hidden shadow-xl border-4 border-amber-300 bg-amber-50">
                          <img src={JOURNAL_PAGES[0]} alt="Journal Page 1" className="w-full h-full object-contain" draggable={false} />
                        </div>
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-bold text-amber-800">Journal Page Found!</h3>
                        <p className="text-gray-500 text-sm">Page 1 of 7</p>
                      </div>
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }} className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                        <Zap className="w-4 h-4" /> +10 XP
                      </motion.div>
                      <Card className="border border-amber-200 bg-amber-50 max-w-xs mx-auto">
                        <CardContent className="p-3">
                          <p className="text-sm text-amber-700"><span className="font-semibold">Fun Fact:</span> {selectedAdventure.startCityFunFact}</p>
                        </CardContent>
                      </Card>
                      <Button onClick={() => { setIntroFragmentShown(true); setScreen("clue"); }} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl" data-testid="button-continue-quest">
                        Continue Quest →
                      </Button>
                    </>
                  ) : (
                    <>
                      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-sm font-semibold text-green-600 flex items-center justify-center gap-1">
                        <Compass className="w-4 h-4" /> You found the first {selectedAdventure.id === "wild-signal" ? "artifact" : "fragment"} in {selectedAdventure.startCity}!
                      </motion.div>
                      <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.6, delay: 0.4 }}>
                        <div className="w-40 h-40 mx-auto rounded-xl overflow-hidden shadow-lg border-2 bg-white border-amber-200">
                          <img src={selectedAdventure.id === "wild-signal" ? ARTIFACT_PIECES[0] : (selectedAdventure.id === "final-ring" || selectedAdventure.id.startsWith("custom-")) ? FINAL_RING_PIECES[0] : COMPASS_PIECES[0]} alt={(selectedAdventure.id === "final-ring" || selectedAdventure.id.startsWith("custom-")) ? "Crown Fragment 1" : selectedAdventure.id === "wild-signal" ? "Artifact 1" : "Fragment 1"} className="w-full h-full object-contain" draggable={false} />
                        </div>
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-bold text-amber-800">{selectedAdventure.id === "wild-signal" ? "Artifact Found!" : "Fragment Found!"}</h3>
                        <p className="text-gray-500 text-sm">{selectedAdventure.id === "wild-signal" ? "Artifact 1 of 7" : "Fragment 1 of 7"}</p>
                      </div>
                      <Card className="border border-amber-200 bg-amber-50 max-w-xs mx-auto">
                        <CardContent className="p-3">
                          {selectedAdventure.id === "wild-signal" ? (
                            <p className="text-sm text-amber-700"><span className="font-semibold">Fun fact about Nairobi:</span> Nairobi is one of the only capital cities in the world with a national park right inside it — where lions, giraffes, and rhinos roam just minutes from skyscrapers!</p>
                          ) : (
                            <p className="text-sm text-amber-700"><span className="font-semibold">The fragment hums...</span> Collect 6 more fragments from the trail ahead to help guide your quest.</p>
                          )}
                        </CardContent>
                      </Card>
                      <Button onClick={() => { setIntroFragmentShown(true); setScreen("clue"); }} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl" data-testid="button-continue-quest">
                        Follow the Trail →
                      </Button>
                    </>
                  )}
                </>
              ) : currentStep ? (
                <>
                  <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-sm font-semibold text-green-600 flex items-center justify-center gap-1">
                    <MapPin className="w-4 h-4" /> Arrived in {currentStep.correctCity}!
                  </motion.div>
                  {selectedAdventure.id === "broken-trail" ? (
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.6, delay: 0.4 }}>
                      <div className="w-40 h-40 mx-auto rounded-xl overflow-hidden bg-white shadow-lg border-2 border-amber-200">
                        <img src={COMPASS_PIECES[Math.min(progress.currentStep + 1, COMPASS_PIECES.length - 1)]} alt={`Fragment ${progress.currentStep + 2}`} className="w-full h-full object-contain" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    </motion.div>
                  ) : selectedAdventure.id === "wild-signal" ? (
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.6, delay: 0.4 }}>
                      <div className="w-40 h-40 mx-auto rounded-xl overflow-hidden bg-white shadow-lg border-2 border-amber-200">
                        <img src={ARTIFACT_PIECES[Math.min(progress.currentStep + 1, ARTIFACT_PIECES.length - 1)]} alt={`Artifact ${progress.currentStep + 2}`} className="w-full h-full object-contain" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    </motion.div>
                  ) : selectedAdventure.id === "royal-journal" ? (
                    <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 0.7, delay: 0.3 }}>
                      <div className="w-52 h-52 mx-auto rounded-2xl overflow-hidden shadow-xl border-4 border-amber-300 bg-amber-50">
                        <img
                          src={JOURNAL_PAGES[Math.min(progress.currentStep + 1, JOURNAL_PAGES.length - 1)]}
                          alt={`Journal Page ${progress.currentStep + 2}`}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      </div>
                    </motion.div>
                  ) : selectedAdventure.id === "final-ring" ? (
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.6, delay: 0.4 }}>
                      <div className="w-44 h-44 mx-auto rounded-xl overflow-hidden bg-white shadow-lg border-2 border-amber-200">
                        <img
                          src={FINAL_RING_PIECES[Math.min(progress.currentStep + 1, FINAL_RING_PIECES.length - 1)]}
                          alt={`Ring Fragment ${progress.currentStep + 2}`}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      </div>
                    </motion.div>
                  ) : selectedAdventure.id.startsWith("custom-") ? (
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.6, delay: 0.4 }}>
                      <div className="w-44 h-44 mx-auto rounded-xl overflow-hidden bg-white shadow-lg border-2 border-amber-200">
                        <img
                          src={FINAL_RING_PIECES[Math.min(progress.currentStep + 1, FINAL_RING_PIECES.length - 1)]}
                          alt={`Crown Fragment ${progress.currentStep + 2}`}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.6, delay: 0.4 }}>
                      <TurkeyPieceDisplay pieceIndex={progress.currentStep} size={180} />
                    </motion.div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-amber-800">
                      {selectedAdventure.id === "royal-journal" ? "Journal Page Found!" : selectedAdventure.id === "wild-signal" ? "Artifact Found!" : selectedAdventure.id === "broken-trail" ? "Fragment Found!" : "Fragment Piece Found!"}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {selectedAdventure.id === "royal-journal" ? `Page ${progress.currentStep + 2} of 7` : selectedAdventure.id === "wild-signal" ? `Artifact ${progress.currentStep + 2} of 7` : selectedAdventure.id === "broken-trail" ? `Fragment ${progress.fragmentsCollected.length + 1} of 7` : `Piece ${progress.currentStep + 1} of ${selectedAdventure.steps.length}`}
                    </p>
                  </div>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }} className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                    <Zap className="w-4 h-4" /> +{stepWrongGuesses > 0 ? Math.max(10 - stepWrongGuesses * 2, 1) : 10} XP
                  </motion.div>
                  <Card className="border border-amber-200 bg-amber-50 max-w-xs mx-auto">
                    <CardContent className="p-3">
                      <p className="text-sm text-amber-700"><span className="font-semibold">Fun Fact:</span> {currentStep.travelFact}</p>
                    </CardContent>
                  </Card>
                  {selectedAdventure.id === "broken-trail" && progress.currentStep + 1 >= selectedAdventure.steps.length && (
                    <p className="text-sm text-gray-600 italic max-w-xs mx-auto">Look, it wasn't the crown after all — what can it be?</p>
                  )}
                  {selectedAdventure.id === "wild-signal" && progress.currentStep + 1 >= selectedAdventure.steps.length && (
                    <p className="text-sm text-gray-600 italic max-w-xs mx-auto">All 7 artifacts are in your hands. What do they form together?</p>
                  )}
                  {selectedAdventure.id === "royal-journal" && progress.currentStep + 1 >= selectedAdventure.steps.length && (
                    <p className="text-sm text-gray-600 italic max-w-xs mx-auto">All 7 pages are recovered. The journal is whole again.</p>
                  )}
                  <Button onClick={handleFragmentCollected} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl" data-testid="button-continue-quest">
                    {progress.currentStep + 1 >= selectedAdventure.steps.length ? (selectedAdventure.id === "royal-journal" ? "Assemble Journal 📖" : "Complete Quest 🎉") : "Continue Quest →"}
                  </Button>
                </>
              ) : null}
            </motion.div>
          )}

          {screen === "victory" && selectedAdventure && progress && (
            <motion.div key="victory" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 py-6">
              <AchievementUnlockBanner
                achievements={newlyUnlockedAchievements}
                onDone={() => setNewlyUnlockedAchievements([])}
              />
              <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 1, repeat: 2 }} className="text-7xl">{selectedAdventure.reward.emoji}</motion.div>

              <div>
                <h2 className="text-2xl font-bold text-amber-800" data-testid="text-victory-title">Quest Complete!</h2>
                <p className="text-amber-600 font-medium mt-1">{selectedAdventure.reward.title}</p>
              </div>

              <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 max-w-xs mx-auto">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">XP Earned</span>
                    <span className="font-bold text-amber-700 flex items-center gap-1"><Zap className="w-4 h-4" />{calculateXP(progress.wrongGuesses, selectedAdventure.steps.length)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Wrong Guesses</span>
                    <span className="font-bold text-gray-700">{progress.wrongGuesses}</span>
                  </div>
                  {progress.bestTimeMs != null && progress.bestTimeMs > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Time</span>
                      <span className="font-bold text-blue-600 flex items-center gap-1"><Clock className="w-4 h-4" />{formatTime(progress.bestTimeMs)}</span>
                    </div>
                  )}
                  {(() => {
                    const coords = [selectedAdventure.startCityCoords, ...selectedAdventure.steps.map(s => s.cityCoords)];
                    let total = 0;
                    for (let i = 0; i < coords.length - 1; i++) {
                      total += getDistanceMiles(coords[i].lat, coords[i].lng, coords[i+1].lat, coords[i+1].lng);
                    }
                    return total > 0 ? (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Miles Travelled</span>
                        <span className="font-bold text-purple-600 flex items-center gap-1">✈️ {Math.round(total).toLocaleString()} mi</span>
                      </div>
                    ) : null;
                  })()}
                  {records[selectedAdventure.id] && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Personal Best</span>
                        <span className="text-xs font-bold text-green-600">{formatTime(records[selectedAdventure.id].bestTimeMs)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Times Completed</span>
                        <span className="text-xs font-bold text-gray-600">{records[selectedAdventure.id].completions}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 🔥 Challenge CTA — primary entry point, shown before challenge is created */}
              {!challengeShareData && !urlChallengeCode && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
                  <Card className="border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-pink-50 to-rose-50 max-w-xs mx-auto shadow-md shadow-rose-100">
                    <CardContent className="p-4 text-center space-y-3">
                      <p className="text-base font-bold text-rose-700">🔥 Beat this?</p>
                      <div className="flex justify-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-amber-700">{calculateXP(progress.wrongGuesses, selectedAdventure.steps.length)} XP</p>
                          <p className="text-[10px] text-gray-400">Score</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-blue-700">{Math.round(((selectedAdventure.steps.length - progress.wrongGuesses) / selectedAdventure.steps.length) * 100)}%</p>
                          <p className="text-[10px] text-gray-400">Accuracy</p>
                        </div>
                        {progress.bestTimeMs && progress.bestTimeMs > 0 && (
                          <div className="text-center">
                            <p className="font-bold text-green-700">{formatTime(progress.bestTimeMs)}</p>
                            <p className="text-[10px] text-gray-400">Time</p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleChallengeAFriend}
                        disabled={challengeCreating}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-60 text-white text-sm font-bold shadow-md transition-all"
                        data-testid="button-challenge-friend-victory"
                      >
                        {challengeCreating
                          ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating challenge…</span>
                          : "⚔️ Challenge a Friend"}
                      </button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {selectedAdventure.id === "lost-crown" ? (
                <>
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
                    <Card className="border border-amber-100 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 max-w-sm mx-auto">
                      <CardContent className="p-4 space-y-2">
                        <p className="text-sm text-gray-600 italic leading-relaxed">All pieces are now in place.</p>
                        <p className="text-sm text-gray-600 italic leading-relaxed">The map is complete.</p>
                        <p className="text-sm text-gray-500 leading-relaxed">—</p>
                        <p className="text-sm text-gray-600 italic leading-relaxed">But this isn't the crown.</p>
                        <p className="text-sm text-gray-600 italic leading-relaxed">Look…</p>
                        <p className="text-sm text-gray-600 italic leading-relaxed">The lines are moving again.</p>
                        <p className="text-sm text-gray-600 italic leading-relaxed">Rearranging.</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5 }}>
                    <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 max-w-sm mx-auto">
                      <CardContent className="p-4 space-y-3">
                        <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">📜 Final Revelation</p>
                        <p className="text-sm text-gray-700 italic leading-relaxed">An inscription reveals itself:</p>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-amber-800">"This was never the end."</p>
                          <p className="text-sm font-semibold text-amber-800">"The crown was not hidden… it was searching."</p>
                          <p className="text-sm font-semibold text-amber-800">"For something older. Something lost before kingdoms existed."</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4.5 }} className="space-y-3">
                    {!mapRevealed ? (
                      <div className="space-y-3">
                        <div className="mx-auto rounded-2xl bg-amber-50 border-2 border-dashed border-amber-300 flex items-center justify-center" style={{ width: 280, height: 160 }}>
                          <span className="text-4xl">🗺️</span>
                        </div>
                        <Button onClick={() => setMapRevealed(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl shadow-md" data-testid="button-reveal-clue">
                          Reveal Clue
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Card className="border border-amber-100 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 max-w-sm mx-auto">
                          <CardContent className="p-4">
                            <p className="text-sm text-gray-600 italic text-center">It's forming something new. Are you seeing this?</p>
                          </CardContent>
                        </Card>
                        <TurkeyMapAssembly pieces={selectedAdventure.steps.length} total={selectedAdventure.steps.length} animateAssembly={true} />
                      </>
                    )}
                  </motion.div>
                </>
              ) : selectedAdventure.id === "broken-trail" ? (
                <>
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="space-y-3">
                    {!mapRevealed ? (
                      <div className="space-y-3">
                        <div className="mx-auto rounded-2xl bg-amber-50 border-2 border-dashed border-amber-300 flex items-center justify-center" style={{ width: 280, height: 280 }}>
                          <span className="text-4xl">🧭</span>
                        </div>
                        <Button onClick={() => setMapRevealed(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl shadow-md" data-testid="button-assemble-fragments">
                          Assemble Fragments
                        </Button>
                      </div>
                    ) : (
                      <CompassAssembly pieces={7} total={7} animateAssembly={true} spinning={compassSpun} />
                    )}
                  </motion.div>

                  {mapRevealed && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4 }} className="space-y-3">
                      <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 max-w-sm mx-auto">
                        <CardContent className="p-4 space-y-3">
                          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">🧭 Final Revelation</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">The final fragment is placed.</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">The pieces pull together. They align perfectly.</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">Not into a crown. Not into a map.</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">—</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">Look…</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">It's a compass. But not an ordinary one.</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">A strange glow begins at its center. Symbols along its edge begin to shine.</p>
                          <p className="text-sm font-semibold text-amber-800">"Not all who wander are lost. This wayfinder reveals the path to what the heart seeks."</p>
                          <p className="text-sm text-gray-600 italic leading-relaxed">It isn't just a compass. It's a magical guide.</p>
                        </CardContent>
                      </Card>
                      {!compassSpun && (
                        <Button onClick={() => setCompassSpun(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl shadow-md" data-testid="button-spin-compass">
                          Spin the Compass 🧭
                        </Button>
                      )}
                    </motion.div>
                  )}

                  {compassSpun && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <Card className="border border-amber-100 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 max-w-sm mx-auto">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-sm text-gray-600 italic">The compass needle begins to move.</p>
                          <p className="text-sm text-gray-600 italic">A country map forms beneath it.</p>
                          <p className="text-sm text-gray-600 italic">What does that mean? Do you know this place?</p>
                        </CardContent>
                      </Card>
                      <div className="mx-auto rounded-2xl overflow-hidden shadow-xl bg-white border-2 border-amber-200" style={{ width: 280, height: 200 }}>
                        <img src={kenyaMap} alt="Kenya Map" className="w-full h-full object-contain" draggable={false} />
                      </div>
                    </motion.div>
                  )}
                </>
              ) : selectedAdventure.id === "wild-signal" ? (
                <>
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="space-y-3">
                    {!mapRevealed ? (
                      <div className="space-y-3">
                        <div className="mx-auto rounded-2xl bg-amber-50 border-2 border-dashed border-amber-300 flex items-center justify-center" style={{ width: 280, height: 180 }}>
                          <span className="text-4xl">👑</span>
                        </div>
                        <Button onClick={() => setMapRevealed(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl shadow-md" data-testid="button-assemble-artifacts">
                          Assemble Artifacts
                        </Button>
                      </div>
                    ) : (
                      <CrownAssembly animateAssembly={true} />
                    )}
                  </motion.div>

                  {mapRevealed && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 5 }} className="space-y-3">
                      <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 max-w-sm mx-auto">
                        <CardContent className="p-4 space-y-3">
                          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">👑 The Crown</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">The final artifact is placed. The pieces pull together.</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">Everything aligns. Perfectly.</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">—</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">Look. Do you see it?</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">These are not just any artifacts.</p>
                          <p className="text-sm font-semibold text-amber-800">It's the crown.</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">Restored.</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">—</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">Or is it? What's that gap in the front of the crown?</p>
                          <p className="text-sm text-gray-600 italic leading-relaxed">A missing piece?</p>
                        </CardContent>
                      </Card>
                      {!missingPieceRevealed && (
                        <Button onClick={() => setMissingPieceRevealed(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl shadow-md" data-testid="button-explore-missing-piece">
                          Explore Missing Piece 🔍
                        </Button>
                      )}
                    </motion.div>
                  )}

                  {missingPieceRevealed && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <Card className="border border-amber-100 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 max-w-sm mx-auto">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-sm text-gray-600 italic">As you bring it closer to the compass - both begin to react.</p>
                          <p className="text-sm text-gray-600 italic">The compass glows. The crown hums.</p>
                          <p className="text-sm text-gray-600 italic">And then— the needle stops.</p>
                          <p className="text-sm text-gray-600 italic">Perfectly still.</p>
                          <p className="text-sm text-gray-600 italic">It's… pointing.</p>
                          <p className="text-sm text-gray-600 italic">—</p>
                          <p className="text-sm text-gray-600 italic">A tall, narrow structure rises into the sky.</p>
                          <p className="text-sm text-gray-600 italic">Futuristic. Standing above a city.</p>
                          <p className="text-sm text-gray-600 italic">—</p>
                          <p className="text-sm text-gray-600 italic">Do you know this place?</p>
                        </CardContent>
                      </Card>
                      <div className="mx-auto rounded-2xl overflow-hidden border-2 border-amber-200 shadow-lg" style={{ width: 280, height: 160 }}>
                        <img src={landmarkSpaceNeedle} alt="Space Needle, Seattle" className="w-full h-full object-cover" draggable={false} />
                      </div>
                    </motion.div>
                  )}
                </>
              ) : selectedAdventure.id === "final-ring" ? (
                <>
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="space-y-4">
                    {!mapRevealed ? (
                      /* ── State 1: Pre-assembly — show all 7 fragments in a grid ── */
                      <div className="space-y-4">
                        <p className="text-sm font-semibold text-amber-700">All 7 fragments collected</p>
                        <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
                          {FINAL_RING_PIECES.map((src, i) => (
                            <motion.div
                              key={i}
                              className="rounded-lg bg-white overflow-hidden shadow border border-amber-200"
                              style={{ width: 64, height: 64 }}
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 + i * 0.08, type: "spring", bounce: 0.4 }}
                            >
                              <img src={src} alt={`Fragment ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
                            </motion.div>
                          ))}
                        </div>
                        <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 max-w-sm mx-auto">
                          <CardContent className="p-4 space-y-2">
                            <p className="text-sm text-gray-700 italic leading-relaxed">Tokyo hits you differently.</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">Lights. Movement. Energy everywhere.</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">—</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">And you know — it's time.</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">To finally assemble the fragments.</p>
                          </CardContent>
                        </Card>
                        <Button onClick={() => setMapRevealed(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl shadow-md" data-testid="button-complete-ring">
                          Assemble Ring 💍
                        </Button>
                      </div>
                    ) : !crownShown ? (
                      /* ── State 2: Assembly animation — fragments converge → Final Ring ── */
                      <motion.div className="space-y-4">
                        <div className="relative mx-auto" style={{ width: 280, height: 280 }}>
                          {FINAL_RING_PIECES.map((src, i) => {
                            const angle = (i / 7) * 2 * Math.PI - Math.PI / 2;
                            const r = 96;
                            const ox = Math.cos(angle) * r;
                            const oy = Math.sin(angle) * r;
                            return (
                              <motion.div
                                key={i}
                                className="absolute rounded-lg bg-white overflow-hidden shadow border border-amber-200"
                                style={{ left: 140 + ox - 28, top: 140 + oy - 28, width: 56, height: 56 }}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{ x: -ox, y: -oy, opacity: [1, 1, 0], scale: [1, 1.3, 0.1] }}
                                transition={{ delay: i * 0.12, duration: 0.85, times: [0, 0.55, 1], ease: "easeIn" }}
                              >
                                <img src={src} alt={`Fragment ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
                              </motion.div>
                            );
                          })}
                          {/* Amber puff flash at center */}
                          <motion.div
                            className="absolute rounded-full pointer-events-none"
                            style={{ left: 90, top: 90, width: 100, height: 100, background: "radial-gradient(circle, #fde68a, #fbbf24, transparent)" }}
                            initial={{ opacity: 0, scale: 0.3 }}
                            animate={{ opacity: [0, 0.9, 0], scale: [0.3, 2.5, 4] }}
                            transition={{ delay: 1.15, duration: 0.7, ease: "easeOut" }}
                          />
                          {/* Final ring emerges */}
                          <motion.div
                            className="absolute rounded-full bg-white shadow-xl border-2 border-amber-300"
                            style={{ left: 70, top: 70, width: 140, height: 140 }}
                            initial={{ opacity: 0, scale: 0, rotate: -90 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0, boxShadow: ["0 0 0px #fbbf24", "0 0 30px #fbbf24", "0 0 10px #fbbf24"] }}
                            transition={{ delay: 1.7, duration: 0.9, type: "spring", bounce: 0.35 }}
                          >
                            <img src={finalRingImg} alt="The Final Ring assembled" className="w-full h-full object-contain" draggable={false} />
                          </motion.div>
                        </div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.4 }}>
                          <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 max-w-sm mx-auto">
                            <CardContent className="p-4 space-y-2">
                              <p className="text-sm text-gray-700 italic leading-relaxed">As you place the fragments together.</p>
                              <p className="text-sm text-gray-700 italic leading-relaxed">They lock. Perfectly.</p>
                              <p className="text-sm text-gray-700 italic leading-relaxed">—</p>
                              <p className="text-sm text-gray-700 italic leading-relaxed">The ring lifts and snaps into the crown.</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.2 }}>
                          <Button onClick={() => setCrownShown(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl shadow-md" data-testid="button-show-crown">
                            Show Crown 👑
                          </Button>
                        </motion.div>
                      </motion.div>
                    ) : (
                      /* ── State 3: Crown + Ring merge into Merged Crown ── */
                      <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="relative mx-auto" style={{ width: 300, height: 200 }}>
                          {/* Final Crown (left) */}
                          <motion.div
                            className="absolute rounded-xl bg-white overflow-hidden shadow border border-amber-200"
                            style={{ left: 0, top: 20, width: 120, height: 120 }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: [0, 1, 1, 0], x: [-20, 0, 0, 60], scale: [0.8, 1, 1, 0.3] }}
                            transition={{ duration: 2.6, times: [0, 0.25, 0.65, 1], ease: "easeInOut" }}
                          >
                            <img src={mergedCrownCrownImg} alt="Final Crown" className="w-full h-full object-contain" draggable={false} />
                          </motion.div>

                          {/* Final Ring (right) */}
                          <motion.div
                            className="absolute rounded-xl bg-white overflow-hidden shadow border border-amber-200"
                            style={{ right: 0, top: 20, width: 120, height: 120 }}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: [0, 1, 1, 0], x: [20, 0, 0, -60], scale: [0.8, 1, 1, 0.3] }}
                            transition={{ duration: 2.6, times: [0, 0.25, 0.65, 1], ease: "easeInOut" }}
                          >
                            <img src={mergedCrownRingImg} alt="Final Ring" className="w-full h-full object-contain" draggable={false} />
                          </motion.div>

                          {/* Cyan/blue merge flash at center */}
                          <motion.div
                            className="absolute rounded-full pointer-events-none"
                            style={{ left: 100, top: 40, width: 100, height: 100, background: "radial-gradient(circle, #7dd3fc, #3b82f6, transparent)" }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 1, 0], scale: [0, 2.5, 4] }}
                            transition={{ delay: 2.2, duration: 0.8, ease: "easeOut" }}
                          />

                          {/* Merged Crown rises from center */}
                          <motion.div
                            className="absolute rounded-xl bg-white shadow-xl border-2 border-sky-300"
                            style={{ left: 65, top: 10, width: 170, height: 170 }}
                            initial={{ opacity: 0, scale: 0, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0, boxShadow: ["0 0 0px #38bdf8", "0 0 35px #38bdf8", "0 0 12px #38bdf8"] }}
                            transition={{ delay: 2.7, duration: 0.9, type: "spring", bounce: 0.35 }}
                          >
                            <img src={mergedCrownFinalImg} alt="Merged Crown" className="w-full h-full object-contain" draggable={false} />
                          </motion.div>
                        </div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.6 }}>
                          <Card className="border border-amber-100 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 max-w-sm mx-auto">
                            <CardContent className="p-4 space-y-2">
                              <p className="text-sm text-gray-600 italic">A burst of light.</p>
                              <p className="text-sm text-gray-600 italic">The compass spins fast.</p>
                              <p className="text-sm text-gray-600 italic">The journal flips open.</p>
                              <p className="text-sm text-gray-600 italic">—</p>
                              <p className="text-sm text-gray-600 italic">A glowing map appears.</p>
                              <p className="text-sm text-gray-600 italic">Every place you visited. Connected.</p>
                              <p className="text-sm text-gray-600 italic">—</p>
                              <p className="text-sm text-gray-600 italic">The crown shines. Complete. Alive.</p>
                              <p className="text-sm text-gray-600 italic">Then — it settles. You're holding it. Whole.</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4.3 }}>
                          <Card className="border border-amber-200 bg-amber-50/60 max-w-sm mx-auto">
                            <CardContent className="p-4 space-y-1">
                              <p className="text-sm font-semibold text-amber-800 italic">"You found every piece."</p>
                              <p className="text-sm font-semibold text-amber-800 italic">"You brought it back together."</p>
                              <p className="text-sm font-semibold text-amber-800 italic">"The crown is complete."</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.div>
                </>
              ) : selectedAdventure.id === "royal-journal" ? (
                <>
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="space-y-3">
                    {!mapRevealed ? (
                      <div className="space-y-4">
                        <div className="mx-auto overflow-hidden rounded-2xl bg-amber-50 shadow-xl border-2 border-amber-300" style={{ width: 280, height: 220 }}>
                          <motion.img
                            src={journalAllPages}
                            alt="All 7 journal pages collected"
                            className="w-full h-full object-contain"
                            animate={{ scale: [1, 1.03, 1] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            draggable={false}
                          />
                        </div>
                        <p className="text-xs text-amber-600 font-semibold">All 7 pages collected — ready to assemble!</p>
                        <Button onClick={() => setMapRevealed(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl shadow-md" data-testid="button-assemble-journal">
                          Assemble Journal 📖
                        </Button>
                      </div>
                    ) : (
                      <motion.div className="space-y-4">
                        <div className="relative mx-auto flex items-center justify-center" style={{ width: 240, height: 280 }}>
                          {JOURNAL_PAGES.map((src, i) => {
                            const positions = [
                              { x: -100, y: -100 }, { x: 0, y: -120 }, { x: 100, y: -90 },
                              { x: -120, y: 20 },  { x: 120, y: 20 },
                              { x: -90, y: 110 },  { x: 90, y: 100 },
                            ];
                            const pos = positions[i] || { x: 0, y: 0 };
                            const rotates = [-20, 10, -15, 18, -12, 15, -8];
                            return (
                              <motion.div
                                key={i}
                                className="absolute rounded-lg overflow-hidden shadow-lg border-2 border-amber-200 bg-amber-50"
                                style={{ width: 70, height: 70, zIndex: i + 1 }}
                                initial={{ x: pos.x, y: pos.y, opacity: 1, scale: 0.8, rotate: rotates[i] }}
                                animate={{ x: 0, y: 0, opacity: 0, scale: 1, rotate: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.55, ease: "easeIn" }}
                              >
                                <img src={src} alt={`Page ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
                              </motion.div>
                            );
                          })}
                          <motion.div
                            className="absolute rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-400 bg-amber-50"
                            style={{ width: 200, height: 240, zIndex: 20 }}
                            initial={{ opacity: 0, scale: 0.4, rotate: -5 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ delay: 0.95, duration: 0.7, type: "spring", bounce: 0.45 }}
                          >
                            <img src={journalFinal} alt="The Royal Journal — assembled" className="w-full h-full object-contain" draggable={false} />
                          </motion.div>
                        </div>
                        <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 max-w-sm mx-auto">
                          <CardContent className="p-4 space-y-3">
                            <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">📖 The Royal Journal</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">The final page is placed.</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">The pages pull together.</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">They align perfectly.</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">—</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">Look… do you see it?</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">This isn't just writing.</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">It's memory.</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">—</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">The crown reacts. The compass glows.</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">The journal opens on its own.</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">Pages turn rapidly… then stop.</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">—</p>
                            <p className="text-sm text-gray-700 italic leading-relaxed">One final image remains.</p>
                          </CardContent>
                        </Card>
                        {!missingPieceRevealed && (
                          <Button onClick={() => setMissingPieceRevealed(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl shadow-md" data-testid="button-reveal-image">
                            Reveal Image 🔍
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </motion.div>

                  {missingPieceRevealed && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <Card className="border border-amber-100 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 max-w-sm mx-auto">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-sm text-gray-600 italic">The image is clear now.</p>
                          <p className="text-sm text-gray-600 italic">An open land.</p>
                          <p className="text-sm text-gray-600 italic">Red earth. Warm sun.</p>
                          <p className="text-sm text-gray-600 italic">—</p>
                          <p className="text-sm text-gray-600 italic">And there it is.</p>
                          <p className="text-sm text-gray-600 italic">Bounding across the land.</p>
                          <p className="text-sm text-gray-600 italic">—</p>
                          <p className="text-sm text-gray-600 italic">Where can this place be?</p>
                        </CardContent>
                      </Card>
                      <LandmarkRevealImage svgKey="kangaroo-outback" altText="Kangaroo bounding across the Australian outback" />
                    </motion.div>
                  )}
                </>
              ) : selectedAdventure.id.startsWith("custom-") ? (
                <>
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="space-y-4">
                    {!mapRevealed ? (
                      <div className="space-y-4">
                        <p className="text-sm font-semibold text-amber-700">All {selectedAdventure.steps.length} crown fragments collected</p>
                        <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
                          {FINAL_RING_PIECES.slice(0, selectedAdventure.steps.length).map((src, i) => (
                            <motion.div
                              key={i}
                              className="rounded-lg bg-white overflow-hidden shadow border border-amber-200"
                              style={{ width: 64, height: 64 }}
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 + i * 0.08, type: "spring", bounce: 0.4 }}
                            >
                              <img src={src} alt={`Fragment ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
                            </motion.div>
                          ))}
                        </div>
                        <Button onClick={() => setMapRevealed(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl shadow-md" data-testid="button-assemble-fragments">
                          Assemble Fragments 👑
                        </Button>
                      </div>
                    ) : (
                      <motion.div className="space-y-4">
                        <div className="relative mx-auto" style={{ width: 280, height: 280 }}>
                          {FINAL_RING_PIECES.slice(0, selectedAdventure.steps.length).map((src, i) => {
                            const count = selectedAdventure.steps.length;
                            const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
                            const r = 96;
                            const ox = Math.cos(angle) * r;
                            const oy = Math.sin(angle) * r;
                            return (
                              <motion.div
                                key={i}
                                className="absolute rounded-lg bg-white overflow-hidden shadow border border-amber-200"
                                style={{ left: 140 + ox - 28, top: 140 + oy - 28, width: 56, height: 56 }}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{ x: -ox, y: -oy, opacity: [1, 1, 0], scale: [1, 1.3, 0.1] }}
                                transition={{ delay: i * 0.12, duration: 0.85, times: [0, 0.55, 1], ease: "easeIn" }}
                              >
                                <img src={src} alt={`Fragment ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
                              </motion.div>
                            );
                          })}
                          <motion.div
                            className="absolute rounded-full pointer-events-none"
                            style={{ left: 90, top: 90, width: 100, height: 100, background: "radial-gradient(circle, #fde68a, #fbbf24, transparent)" }}
                            initial={{ opacity: 0, scale: 0.3 }}
                            animate={{ opacity: [0, 0.9, 0], scale: [0.3, 2.5, 4] }}
                            transition={{ delay: 1.15, duration: 0.7, ease: "easeOut" }}
                          />
                          <motion.div
                            className="absolute rounded-xl bg-white shadow-xl border-2 border-amber-300"
                            style={{ left: 70, top: 70, width: 140, height: 140 }}
                            initial={{ opacity: 0, scale: 0, rotate: -90 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0, boxShadow: ["0 0 0px #fbbf24", "0 0 30px #fbbf24", "0 0 10px #fbbf24"] }}
                            transition={{ delay: 1.7, duration: 0.9, type: "spring", bounce: 0.35 }}
                          >
                            <img src={mergedCrownFinalImg} alt="The Lost Crown Restored" className="w-full h-full object-contain" draggable={false} />
                          </motion.div>
                        </div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.8 }}>
                          <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 max-w-sm mx-auto">
                            <CardContent className="p-5 space-y-2 text-center">
                              <p className="text-xl font-bold text-amber-800">🎉 Congratulations!</p>
                              <p className="text-sm text-gray-700 italic leading-relaxed">You solved the quest.</p>
                              <p className="text-sm font-bold text-amber-800 italic">You found the Lost Crown.</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.div>
                </>
              ) : null}

              {selectedAdventure.nextAdventure && (
                selectedAdventure.id === "broken-trail" ? compassSpun :
                selectedAdventure.id === "wild-signal" ? missingPieceRevealed :
                selectedAdventure.id === "royal-journal" ? missingPieceRevealed :
                mapRevealed
              ) && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: selectedAdventure.id === "broken-trail" || selectedAdventure.id === "wild-signal" || selectedAdventure.id === "royal-journal" ? 0 : selectedAdventure.steps.length * 0.3 + 2 }} className="space-y-3">
                  <Card className="border-2 border-blue-300 bg-blue-50 max-w-sm mx-auto">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm font-bold text-blue-800">
                        {selectedAdventure.id === "broken-trail"
                          ? "🧭 The compass points to a city in this country. Do you know this place?"
                          : selectedAdventure.id === "wild-signal"
                          ? "👑 The compass needle points to a city. Where is the missing piece of the crown?"
                          : selectedAdventure.id === "royal-journal"
                          ? "🦘 This creature roams freely here. Where can this place be?"
                          : "🗺️ You have found a map. Your next adventure starts in a famous city in this country. Which one can it be?"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedAdventure.nextAdventure.cityOptions.map((option) => {
                          const isSelected = victoryQuizAnswer === option;
                          const isCorrect = option === selectedAdventure.nextAdventure!.city;
                          let btnStyle = "border-gray-200 bg-white hover:border-blue-400";
                          if (victoryQuizResult && isSelected) {
                            btnStyle = victoryQuizResult === "correct" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
                          }
                          return (
                            <motion.button key={option} whileTap={{ scale: 0.95 }} onClick={() => handleVictoryQuiz(option)} disabled={victoryQuizResult === "correct"} className={`p-2.5 rounded-xl border-2 ${btnStyle} text-center transition-colors`} data-testid={`button-quiz-${option.toLowerCase()}`}>
                              <span className="font-semibold text-sm text-gray-800">
                                {victoryQuizResult && isSelected ? (isCorrect ? "✅ " : "❌ ") : ""}{option}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                      {victoryQuizResult === "correct" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2">
                          <p className="text-sm text-green-700 font-semibold">
                            {selectedAdventure.id === "broken-trail"
                              ? `That's right! ${selectedAdventure.nextAdventure.city} awaits! 🦁`
                              : selectedAdventure.id === "royal-journal"
                              ? `That's right! ${selectedAdventure.nextAdventure.city} awaits! 🦘`
                              : `That's right! ${selectedAdventure.nextAdventure.city} awaits! 🎉`}
                          </p>
                          <div className="border-t border-blue-200 pt-3 space-y-2">
                            {selectedAdventure.id === "broken-trail" ? (
                              <>
                                <p className="text-sm text-gray-700 italic font-medium">"May be this can lead us to the crown."</p>
                                <p className="text-sm text-gray-700 italic font-medium">"Now… are you ready."</p>
                              </>
                            ) : selectedAdventure.id === "wild-signal" ? (
                              <>
                                <p className="text-sm text-gray-700 italic font-medium">"The compass can guide."</p>
                                <p className="text-sm text-gray-700 italic font-medium">"But only the journal can restore what was missing on the crown."</p>
                                <p className="text-sm text-gray-700 italic font-medium">"And it begins… here."</p>
                              </>
                            ) : selectedAdventure.id === "royal-journal" ? (
                              <>
                                <p className="text-sm text-gray-700 italic font-medium">"The journal is restored."</p>
                                <p className="text-sm text-gray-700 italic font-medium">"The crown remembers."</p>
                                <p className="text-sm text-gray-700 italic font-medium">"The missing jewel that makes it a whole... the journal will help remember the soul."</p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-gray-700 italic font-medium">"The crown was trying to find it."</p>
                                <p className="text-sm text-gray-700 italic font-medium">"Now… so are you."</p>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                      {victoryQuizResult === "wrong" && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500">
                          Not quite — look at the map and try again!
                        </motion.p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 🔥 Viral Challenge Share Panel */}
              {challengeShareData && (() => {
                const viralTemplates = [
                  `I just completed ${challengeShareData.questName} on GeoQuest 🌍\nI got ${challengeShareData.xp} XP 😎\nThink you can beat me?`,
                  `This quest was harder than I thought 🤯\nI got ${challengeShareData.xp} XP\nTry it and beat me 👇`,
                  `I bet you can't beat my score 😏\nI got ${challengeShareData.xp} XP on ${challengeShareData.questName}\nProve me wrong 👇`,
                ];
                const templateIdx = Math.floor((Date.now() / 30000)) % viralTemplates.length;
                const viralMsg = viralTemplates[templateIdx];
                const fullMsg = `${viralMsg}\n${challengeShareData.shareUrl}`;
                const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMsg)}`;
                const smsUrl = `sms:?body=${encodeURIComponent(fullMsg)}`;

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-rose-600 to-pink-600 rounded-2xl p-4 max-w-xs mx-auto space-y-3 shadow-lg shadow-rose-200"
                    data-testid="panel-challenge-share"
                  >
                    <div className="text-center">
                      <p className="font-bold text-white text-base">🔥 Your Challenge is Ready!</p>
                      <p className="text-xs text-rose-100 mt-0.5">Share it with your friend</p>
                    </div>

                    {/* Viral message preview */}
                    <div className="bg-white/15 rounded-xl p-3 text-sm text-white leading-relaxed whitespace-pre-line">
                      {viralMsg}
                    </div>

                    {/* Share code */}
                    <div className="bg-white rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-gray-400 mb-0.5">Challenge Code</p>
                      <p className="font-mono font-bold text-xl tracking-widest text-rose-700" data-testid="text-share-code">{challengeShareData.shareCode}</p>
                    </div>

                    {/* Share buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={async () => {
                          try { await navigator.clipboard.writeText(challengeShareData.shareUrl); toast.success("Link copied!"); }
                          catch { toast.error("Could not copy"); }
                        }}
                        className="py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors"
                        data-testid="button-copy-challenge-link"
                      >
                        📋 Copy Link
                      </button>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold text-center transition-colors"
                        data-testid="button-share-whatsapp"
                      >
                        💬 WhatsApp
                      </a>
                      <a
                        href={smsUrl}
                        className="py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold text-center transition-colors"
                        data-testid="button-share-sms"
                      >
                        📱 iMessage
                      </a>
                    </div>

                    {/* Native share fallback */}
                    {typeof navigator !== "undefined" && "share" in navigator && (
                      <button
                        onClick={async () => {
                          try {
                            await navigator.share({ title: `Can you beat my ${challengeShareData.questName} score?`, text: viralMsg, url: challengeShareData.shareUrl });
                          } catch {
                            await navigator.clipboard.writeText(challengeShareData.shareUrl);
                            toast.success("Link copied!");
                          }
                        }}
                        className="w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors"
                        data-testid="button-share-challenge"
                      >
                        ⚔️ More Ways to Share
                      </button>
                    )}
                  </motion.div>
                );
              })()}

              {selectedAdventure.id.startsWith("custom-") ? (
                mapRevealed ? (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.2 }} className="flex gap-3 justify-center flex-wrap pt-2">
                    <Button onClick={handleReplay} variant="outline" className="border-amber-300 text-amber-700 px-5 rounded-xl" data-testid="button-replay-quest">
                      <RotateCcw className="w-4 h-4 mr-1" /> Replay
                    </Button>
                    <Button onClick={handleBackToCampaign} className="bg-amber-600 hover:bg-amber-700 text-white px-5 rounded-xl" data-testid="button-next-quest">
                      Next Quest
                    </Button>
                  </motion.div>
                ) : null
              ) : selectedAdventure.id === "wild-signal" || selectedAdventure.id === "royal-journal" ? (
                <div className="flex gap-3 justify-center pt-2">
                  <Button onClick={handleReplay} variant="outline" className="border-amber-300 text-amber-700 px-5 rounded-xl" data-testid="button-replay-quest">
                    <RotateCcw className="w-4 h-4 mr-1" /> Replay
                  </Button>
                  {missingPieceRevealed && victoryQuizResult === "correct" && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                      <Button onClick={handleBackToCampaign} className="bg-amber-600 hover:bg-amber-700 text-white px-5 rounded-xl" data-testid="button-next-adventure">
                        Next Quest →
                      </Button>
                    </motion.div>
                  )}
                </div>
              ) : selectedAdventure.id === "final-ring" ? (
                mapRevealed ? (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.2 }} className="flex gap-3 justify-center pt-2">
                    <Button onClick={handleReplay} variant="outline" className="border-amber-300 text-amber-700 px-5 rounded-xl" data-testid="button-replay-quest">
                      <RotateCcw className="w-4 h-4 mr-1" /> Replay
                    </Button>
                    <Button onClick={handleBackToCampaign} className="bg-amber-600 hover:bg-amber-700 text-white px-5 rounded-xl" data-testid="button-back-to-quests">
                      Back to Quests
                    </Button>
                  </motion.div>
                ) : null
              ) : victoryQuizResult === "correct" && selectedAdventure.nextAdventure ? (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex gap-3 justify-center pt-2">
                  <Button onClick={handleReplay} variant="outline" className="border-amber-300 text-amber-700 px-5 rounded-xl" data-testid="button-replay-quest">
                    <RotateCcw className="w-4 h-4 mr-1" /> Replay
                  </Button>
                  <Button onClick={handleBackToCampaign} className="bg-amber-600 hover:bg-amber-700 text-white px-5 rounded-xl" data-testid="button-next-adventure">
                    Next Quest →
                  </Button>
                </motion.div>
              ) : (
                <div className="flex gap-3 justify-center pt-2 flex-wrap">
                  <Button onClick={handleReplay} variant="outline" className="border-amber-300 text-amber-700 px-5 rounded-xl" data-testid="button-replay-quest">
                    <RotateCcw className="w-4 h-4 mr-1" /> Replay
                  </Button>
                  {!selectedAdventure.nextAdventure && (
                    <Button onClick={handleBackToCampaign} className="bg-amber-600 hover:bg-amber-700 text-white px-5 rounded-xl" data-testid="button-back-to-quests">
                      Next Quest
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SignUpPrompt
        isOpen={showGuestSignUp}
        onClose={() => setShowGuestSignUp(false)}
        onLogin={async (data: any) => {
          if (typeof data === 'string') return;
          if (data.method === 'email') {
            userLogin(data.name, data.email, undefined, data.players, {
              registrationSource: 'email',
              verified: data.verified === true,
              userId: data.userId,
            });
            localStorage.removeItem('geoquest_guest_session');
            if (data.userId) {
              try { await loadExplorers(data.userId); } catch (e) {}
            }
          }
          setShowGuestSignUp(false);
          setLocation("/");
        }}
        variant="game"
        source="default"
        message="Creating quests is only available for users with GeoQuest accounts. Sign up to create quests and challenge friends."
      />
    </div>
  );
}
