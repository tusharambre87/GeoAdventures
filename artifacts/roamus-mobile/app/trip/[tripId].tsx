/**
 * RoamUs — Trip Plan Screen v2
 * Visual ref: roamus-trip-plan-v5.html
 * Brief: ROAMUS_TRIP_PLAN_REPLIT_BRIEF_v2.md
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

import { travelAPI } from "@/lib/apiClient";
import { API_BASE } from "@/lib/authContext";
import { F } from "@/lib/tokens";

// ─── Design tokens ────────────────────────────────────────────────────────────

export const C = {
  orange:    '#E8692A',
  orangeLt:  '#FDF0E9',
  bg:        '#F5F2EE',
  card:      '#FFFFFF',
  deep:      '#1A1F2E',
  muted:     '#8A8FA8',
  sage:      '#7A9E8E',
  sageLt:    '#EEF5F2',
  green:     '#3DAA6E',
  greenLt:   '#E8F7EF',
  amber:     '#F5A623',
  red:       '#E8433A',
  redLt:     '#FEF2F1',
  border:    'rgba(26,31,46,0.09)',
  borderMed: 'rgba(26,31,46,0.16)',
} as const;

export const STOP_HERO_BG: Record<string, string> = {
  park:     '#C8E6C9',
  museum:   '#BBDEFB',
  zoo:      '#FFE0B2',
  landmark: '#E1BEE7',
  shopping: '#FCE4EC',
  nature:   '#DCEDC8',
  culture:  '#FFF3E0',
  default:  '#E0E0E0',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type StopMetadata = {
  doThisFirst?: string;
  parkingSignal?: string;
  ticketSignal?: boolean;
  restroomConfidence?: string;
  foodNearby?: Array<{ name: string; distance: string; type: string }>;
  travelMinutes?: number;
  breakSuggestion?: string;
  foodSuggestion?: string;
  keepGoingSuggestion?: string;
  moreFunSuggestion?: string;
  shortenSuggestion?: string;
  anchorScore?: number;
  dropPriority?: number;
  sessionFit?: 'morning' | 'afternoon' | 'evening';
  durationClass?: 'short' | 'medium' | 'long';
};

type StopEnrichment = {
  whyNow?: string;
  bathroomNotes?: string;
  foodOptions?: string;
  parkingNotes?: string;
  bestTimeOfDay?: string;
  strollerFriendly?: boolean;
  nearbyStops?: string[];
  practicalTips?: string;
};

type Stop = {
  id: string;
  name: string;
  stopType?: string | null;
  dayIndex?: number | null;
  displayOrder?: number | null;
  cityGroup?: string | null;
  description?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  durationMinutes?: number | null;
  isVisited?: boolean;
  visited?: boolean;
  tip?: string | null;
  storyPack?: { story?: string; audioUrl?: string } | null;
  enrichment?: StopEnrichment | null;
  journeyPackCompleted?: boolean;
  metadata?: StopMetadata | null;
  stopMissions?: Array<{
    type: string;
    question: string;
    options?: string[];
    xpReward: number;
    completed: boolean;
  }> | null;
};

type TripTraveler = {
  name: string;
  isParent?: boolean;
  age?: string;
  avatarKey?: string;
};

type TripData = {
  id: string;
  name: string;
  status: string;
  destination?: string | null;
  city?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  pace?: 'chill' | 'balanced' | 'packed' | string | null;
  plannerTripDays?: number | null;
  tripDays?: number | null;
  travelers?: TripTraveler[] | null;
  stops: Stop[];
  totalStops?: number;
  visitedStops?: number;
  coverImageUrl?: string | null;
  cityDates?: Record<string, { start: string; end: string }> | null;
  stayLocations?: Array<{ cityName: string; address?: string; lat?: number; lng?: number }> | null;
  tailoring?: {
    arrivalMethod?: string;
    arrivalTime?: string;
    lastDay?: string;
    interests?: string[];
  } | null;
};

type RunMode = 'balanced' | 'faster' | 'easier';
type ActiveSheet = 'none' | 'stopDetail' | 'replace' | 'runDay' | 'options' | 'compare';
type DayStatus = 'past' | 'today' | 'future';

// ─── Helper functions ─────────────────────────────────────────────────────────

const MEAL_TYPES = new Set(['restaurant', 'food', 'cafe', 'market', 'meal', 'street_food', 'diner', 'eatery']);
const TICKET_TYPES = new Set(['museum', 'zoo', 'aquarium', 'palace', 'castle', 'theater', 'theatre', 'observatory']);

function isMealStop(stopType?: string | null): boolean {
  if (!stopType) return false;
  const t = stopType.toLowerCase();
  return Array.from(MEAL_TYPES).some(k => t.includes(k));
}

function needsTicket(stop: Stop): boolean {
  if (stop.metadata?.ticketSignal === true) return true;
  if (stop.metadata?.ticketSignal === false) return false;
  if (!stop.stopType) return false;
  const t = stop.stopType.toLowerCase();
  return Array.from(TICKET_TYPES).some(k => t.includes(k));
}

function getStopDuration(stop: Stop): number {
  if (stop.durationMinutes) return stop.durationMinutes;
  const t = stop.stopType?.toLowerCase() ?? '';
  if (t.includes('zoo') || t.includes('aquarium') || t.includes('beach')) return 120;
  if (t.includes('museum') || t.includes('palace') || t.includes('castle') || t.includes('adventure')) return 90;
  if (t.includes('park') || t.includes('garden') || t.includes('nature') || t.includes('restaurant')) return 60;
  if (t.includes('landmark') || t.includes('monument') || t.includes('temple')) return 45;
  return 60;
}

function formatDuration(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function stopHeroBg(stopType?: string | null): string {
  if (!stopType) return STOP_HERO_BG.default;
  const t = stopType.toLowerCase();
  const key = Object.keys(STOP_HERO_BG).find(k => k !== 'default' && t.includes(k));
  return key ? STOP_HERO_BG[key] : STOP_HERO_BG.default;
}

function dayTheme(stops: Stop[]): string {
  const content = stops.filter(s => !isMealStop(s.stopType));
  if (content.length === 0) return 'Light Day';
  if (content.length === 1) return 'Light Day';
  const types = content.map(s => s.stopType?.toLowerCase() ?? '');
  const museums = types.filter(t => t.includes('museum') || t.includes('art') || t.includes('gallery') || t.includes('culture')).length;
  const outdoor = types.filter(t => t.includes('park') || t.includes('garden') || t.includes('beach') || t.includes('nature')).length;
  const zoo = types.some(t => t.includes('zoo') || t.includes('aquarium') || t.includes('wildlife'));
  const shopping = types.some(t => t.includes('shopping') || t.includes('mall') || t.includes('market'));
  if (zoo) return 'Wildlife Day';
  if (museums >= 2) return 'Museums & Culture';
  if (outdoor >= 2) return 'Outdoor Day';
  if (shopping) return 'Big Experiences';
  return `Day ${(stops[0]?.dayIndex ?? 0) + 1}`;
}

function getDaySessionBars(
  dayStops: Stop[]
): Array<{ label: string; pct: number; state: 'busy' | 'smooth' | 'free' }> {
  const morning   = dayStops.filter(s => s.metadata?.sessionFit === 'morning').length;
  const afternoon = dayStops.filter(s => s.metadata?.sessionFit === 'afternoon').length;
  const evening   = dayStops.filter(s => s.metadata?.sessionFit === 'evening').length;
  const total = dayStops.length || 1;
  const hasFit = morning + afternoon + evening > 0;
  const m = hasFit ? morning   : Math.ceil(total / 3);
  const a = hasFit ? afternoon : Math.floor(total / 3);
  const e = hasFit ? evening   : total - m - a;

  function state(n: number): 'busy' | 'smooth' | 'free' {
    if (n === 0) return 'free';
    if (n >= 2)  return 'busy';
    return 'smooth';
  }
  return [
    { label: 'Mor', pct: Math.min(100, (m / total) * 100), state: state(m) },
    { label: 'Aft', pct: Math.min(100, (a / total) * 100), state: state(a) },
    { label: 'Eve', pct: Math.min(100, (e / total) * 100), state: state(e) },
  ];
}

function getTicketCount(dayStops: Stop[]): number {
  return dayStops.filter(s => needsTicket(s)).length;
}

function hasLunchStop(dayStops: Stop[]): boolean {
  return dayStops.some(s => isMealStop(s.stopType));
}

function getAnchorStop(dayStops: Stop[]): Stop | null {
  if (dayStops.length === 0) return null;
  const withScores = dayStops.filter(s => s.metadata?.anchorScore != null);
  if (withScores.length === 0) return dayStops[0];
  return withScores.reduce((a, b) =>
    (b.metadata!.anchorScore! > a.metadata!.anchorScore!) ? b : a
  );
}

function getDropStop(dayStops: Stop[]): Stop | null {
  if (dayStops.length <= 1) return null;
  const withPriority = dayStops.filter(s => s.metadata?.dropPriority != null);
  if (withPriority.length === 0) return dayStops[dayStops.length - 1];
  return withPriority.reduce((a, b) =>
    (b.metadata!.dropPriority! > a.metadata!.dropPriority!) ? b : a
  );
}

function formatDate(isoDate: string, dayOffset = 0): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + dayOffset);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '';
  const s = start ? formatDate(start) : '';
  const e = end   ? formatDate(end)   : '';
  if (s && e) return `${s}–${e}`;
  return s || e;
}

function waitTimeForType(stopType?: string | null): string {
  const t = stopType?.toLowerCase() ?? '';
  if (t.includes('zoo') || t.includes('aquarium') || t.includes('museum')) return '15–20 min weekends';
  if (t.includes('park') || t.includes('nature')) return 'No wait';
  return 'Varies';
}

function stopTypeEmoji(stopType?: string | null): string {
  const t = stopType?.toLowerCase() ?? '';
  if (t.includes('zoo') || t.includes('wildlife') || t.includes('aquarium')) return '🦁';
  if (t.includes('museum') || t.includes('art') || t.includes('gallery'))   return '🏛️';
  if (t.includes('park') || t.includes('nature') || t.includes('garden'))   return '🌳';
  if (t.includes('shopping') || t.includes('mall'))                          return '🛍️';
  if (t.includes('landmark') || t.includes('monument'))                      return '🌉';
  if (t.includes('restaurant') || t.includes('food') || t.includes('cafe')) return '🍽️';
  return '📍';
}

// ─── SVG Icon components ──────────────────────────────────────────────────────

function IconChevronLeft({ size = 18, color = C.deep }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="15 18 9 12 15 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconDots({ size = 18, color = C.deep }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5"  r="1.2" fill={color} />
      <Circle cx="12" cy="12" r="1.2" fill={color} />
      <Circle cx="12" cy="19" r="1.2" fill={color} />
    </Svg>
  );
}

function IconChevronRight({ size = 16, color = C.muted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="9 18 15 12 9 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconLock({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={1.8} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconPlay({ size = 15, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M5 3l14 9-14 9V3z" />
    </Svg>
  );
}

function IconPlus({ size = 15, color = C.orange }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function IconX({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="6"  y1="6" x2="18" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function IconRefresh({ size = 17, color = C.sage }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 4v6h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.51 15a9 9 0 1 0 .49-5.91L1 10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconTrash({ size = 17, color = C.red }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="3 6 5 6 21 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 6l-1 14H6L5 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 11v6M14 11v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M9 6V4h6v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconCheck({ size = 14, color = C.green }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconMinus({ size = 14, color = C.red }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function IconClock({ size = 14, color = C.green }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconInfo({ size = 14, color = C.amber }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Line x1="12" y1="8" x2="12" y2="8.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="12" x2="12" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function IconSearch({ size = 15, color = C.muted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={1.8} />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconPin({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function IconStar({ size = 14, color = C.green }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconDownload({ size = 17, color = C.sage }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="7 10 12 15 17 10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="15" x2="12" y2="3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconShare({ size = 17, color = C.orange }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="16 6 12 2 8 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="2" x2="12" y2="15" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconBars({ size = 17, color = C.green }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="4" height="18" rx="1" fill={color} opacity={0.55} />
      <Rect x="10" y="7" width="4" height="14" rx="1" fill={color} opacity={0.75} />
      <Rect x="17" y="11" width="4" height="10" rx="1" fill={color} />
    </Svg>
  );
}

function IconEdit({ size = 17, color = C.orange }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconGear({ size = 17, color = C.muted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconCopy({ size = 17, color = C.muted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Grip bar ─────────────────────────────────────────────────────────────────

function Grip() {
  return <View style={sh.grip} />;
}

// ─── useStopHeroImage (module-level cache so each stop fetches once) ──────────

const _heroImageCache = new Map<string, string>();

function useStopHeroImage(stopId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() =>
    stopId ? (_heroImageCache.get(stopId) ?? null) : null
  );
  useEffect(() => {
    if (!stopId) return;
    const id = stopId;
    if (_heroImageCache.has(id)) {
      setUrl(_heroImageCache.get(id)!);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const res = await fetch(`${API_BASE}/api/travel/stops/${id}/hero-image`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.url) {
            _heroImageCache.set(id, data.url);
            setUrl(data.url);
          }
        }
      } catch { /* silent — color bg stays */ }
    }
    load();
    return () => { cancelled = true; };
  }, [stopId]);
  return url;
}

// ─── apiFetch helper ──────────────────────────────────────────────────────────

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const e = await res.json(); msg = e.message || msg; } catch {}
    const err = new Error(msg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

function showToast(msg: string) {
  Alert.alert('', msg, [{ text: 'OK' }]);
}

// ─── StopCard ─────────────────────────────────────────────────────────────────

let _openSwipeable: Swipeable | null = null;

function StopCard({
  stop,
  isEditable,
  isAnchor,
  tripId,
  onDetails,
  onReplace,
  onDelete,
  onMoveStop,
}: {
  stop: Stop;
  isEditable: boolean;
  isAnchor: boolean;
  tripId: string;
  onDetails: (s: Stop) => void;
  onReplace: (s: Stop) => void;
  onDelete: (stopId: string) => Promise<void>;
  onMoveStop: (stopId: string, dir: 'up' | 'down') => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const heroImg  = useStopHeroImage(stop.id);
  const heroBg   = stopHeroBg(stop.stopType);
  const ticket   = needsTicket(stop);
  const duration = getStopDuration(stop);
  const [reorderActive, setReorderActive] = useState(false);
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function activateReorder() {
    if (!isEditable) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReorderActive(true);
    if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
    reorderTimerRef.current = setTimeout(() => setReorderActive(false), 3000);
  }

  useEffect(() => () => { if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current); }, []);

  function handleRemove() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    swipeRef.current?.close();
    onDelete(stop.id);
  }

  function renderRightActions() {
    return (
      <View style={sc.revealRow}>
        <Pressable style={[sc.revBtn, sc.revReplace]} onPress={() => { swipeRef.current?.close(); onReplace(stop); }}>
          <IconRefresh />
          <Text style={[sc.revLabel, { color: C.sage }]}>Replace</Text>
        </Pressable>
        <Pressable style={[sc.revBtn, sc.revRemove]} onPress={handleRemove}>
          <IconTrash />
          <Text style={[sc.revLabel, { color: C.red }]}>Remove</Text>
        </Pressable>
      </View>
    );
  }

  const card = (
    <View style={sc.card}>
      {/* Hero */}
      <View style={[sc.hero, { backgroundColor: heroBg }]}>
        {heroImg ? (
          <ExpoImage
            source={{ uri: heroImg }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={300}
          />
        ) : null}
        <LinearGradient
          colors={['transparent', 'rgba(26,31,46,0.50)']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={sc.heroName} numberOfLines={2}>{stop.name}</Text>
        {isEditable && (
          reorderActive ? (
            <View style={sc.reorderBtns}>
              <Pressable
                style={sc.reorderBtn}
                onPress={() => { onMoveStop(stop.id, 'up'); setReorderActive(false); }}
                hitSlop={6}
              >
                <Text style={sc.reorderArrow}>▲</Text>
              </Pressable>
              <Pressable
                style={sc.reorderBtn}
                onPress={() => { onMoveStop(stop.id, 'down'); setReorderActive(false); }}
                hitSlop={6}
              >
                <Text style={sc.reorderArrow}>▼</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={sc.dragHandle} onLongPress={activateReorder} delayLongPress={350}>
              <View style={sc.dragLine} />
              <View style={sc.dragLine} />
              <View style={sc.dragLine} />
            </Pressable>
          )
        )}
      </View>

      {/* Body */}
      <View style={sc.body}>
        <View style={sc.tagsRow}>
          <View style={sc.tagMuted}>
            <Text style={sc.tagMutedText}>{duration} min</Text>
          </View>
          {ticket ? (
            <View style={sc.tagTicket}>
              <Text style={sc.tagTicketText}>Ticket</Text>
            </View>
          ) : (
            <View style={sc.tagFree}>
              <Text style={sc.tagFreeText}>Free entry</Text>
            </View>
          )}
          {isAnchor && (
            <View style={sc.tagAnchor}>
              <Text style={sc.tagAnchorText}>anchor stop</Text>
            </View>
          )}
        </View>

        <View style={sc.actionRow}>
          <Pressable
            style={sc.detailsBtn}
            onPress={() => {
              console.log('[DEBUG] Details button pressed for stop:', stop?.name);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDetails(stop);
            }}
          >
            <Text style={sc.detailsBtnText}>Details →</Text>
          </Pressable>
          {isEditable ? (
            <View style={sc.swipeHint}>
              <Text style={sc.swipeHintText}>swipe </Text>
              <IconChevronRight size={11} />
            </View>
          ) : (
            <Text style={sc.viewOnlyText}>View only</Text>
          )}
        </View>
      </View>
    </View>
  );

  if (!isEditable) {
    return <View style={sc.wrap}>{card}</View>;
  }

  return (
    <View style={sc.wrap}>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        onSwipeableOpen={() => {
          if (_openSwipeable && _openSwipeable !== swipeRef.current) {
            _openSwipeable.close();
          }
          _openSwipeable = swipeRef.current;
        }}
      >
        {card}
      </Swipeable>
    </View>
  );
}

// ─── MealCard ─────────────────────────────────────────────────────────────────

function MealCard({ stop }: { stop: Stop }) {
  const emoji = stop.stopType?.toLowerCase().includes('cafe') ? '☕' : '🍕';
  return (
    <View style={meal.card}>
      <View style={meal.left}>
        <Text style={meal.emoji}>{emoji}</Text>
        <View>
          <Text style={meal.name} numberOfLines={1}>{stop.name}</Text>
          <Text style={meal.sub}>{stop.stopType?.replace(/_/g, ' ')} · {getStopDuration(stop)} min</Text>
        </View>
      </View>
      <Pressable style={meal.addBtn}>
        <Text style={meal.addBtnText}>Add</Text>
      </Pressable>
    </View>
  );
}

// ─── Session Bars ─────────────────────────────────────────────────────────────

function SessionBars({ dayStops }: { dayStops: Stop[] }) {
  const bars = getDaySessionBars(dayStops);
  return (
    <View style={sb.row}>
      {bars.map(bar => {
        const dotColor = bar.state === 'busy' ? C.amber : bar.state === 'smooth' ? C.green : C.border;
        const fillColor = bar.state === 'busy' ? C.amber : bar.state === 'smooth' ? C.green : 'transparent';
        const label = bar.state === 'busy' ? 'Busy' : bar.state === 'smooth' ? 'Smooth' : 'Free';
        return (
          <View key={bar.label} style={sb.col}>
            <View style={sb.labelRow}>
              <View style={[sb.dot, { backgroundColor: dotColor }]} />
              <Text style={sb.sessName}>{bar.label}</Text>
            </View>
            <View style={sb.track}>
              <View style={[sb.fill, { width: `${bar.pct}%`, backgroundColor: fillColor }]} />
            </View>
            <Text style={sb.sessLabel}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── DayCard (Overview) ───────────────────────────────────────────────────────

function DayCard({
  dayNum,
  dayStops,
  startDate,
  status,
  onPress,
}: {
  dayNum: number;
  dayStops: Stop[];
  startDate?: string | null;
  status: DayStatus;
  onPress: () => void;
}) {
  const theme    = dayTheme(dayStops);
  const tickets  = getTicketCount(dayStops);
  const noLunch  = !hasLunchStop(dayStops);
  const totalMin = dayStops.reduce((s, st) => s + getStopDuration(st), 0);
  const hrs      = (totalMin / 60).toFixed(1).replace('.0', '');
  const dateStr  = startDate ? formatDate(startDate, dayNum - 1) : null;
  const stopCount = dayStops.length;

  // Badge
  let badgeLabel = '';
  let badgeStyle: ViewStyle;
  let badgeTextStyle: TextStyle;
  if (status === 'today') {
    badgeLabel = 'Today';
    badgeStyle = dc.badgeToday as unknown as ViewStyle;
    badgeTextStyle = dc.badgeTodayText as unknown as TextStyle;
  } else if (stopCount >= 4) {
    badgeLabel = 'Heavy day';
    badgeStyle = dc.badgeHeavy as unknown as ViewStyle;
    badgeTextStyle = dc.badgeHeavyText as unknown as TextStyle;
  } else if (stopCount >= 3) {
    badgeLabel = 'Balanced';
    badgeStyle = dc.badgeGreen as unknown as ViewStyle;
    badgeTextStyle = dc.badgeGreenText as unknown as TextStyle;
  } else {
    badgeLabel = status === 'past' ? 'Done' : 'Light day';
    badgeStyle = dc.badgeMuted as unknown as ViewStyle;
    badgeTextStyle = dc.badgeMutedText as unknown as TextStyle;
  }

  // Day number circle
  let numStyle: ViewStyle;
  let numTextStyle: TextStyle;
  if (status === 'past')       { numStyle = dc.dayNumPast as unknown as ViewStyle;   numTextStyle = dc.dayNumTextPast as unknown as TextStyle; }
  else if (status === 'today') { numStyle = dc.dayNumToday as unknown as ViewStyle;  numTextStyle = dc.dayNumTextToday as unknown as TextStyle; }
  else                         { numStyle = dc.dayNumFuture as unknown as ViewStyle; numTextStyle = dc.dayNumTextFuture as unknown as TextStyle; }

  return (
    <Pressable
      style={({ pressed }) => [dc.card, status === 'past' && dc.cardPast, { opacity: pressed ? 0.95 : 1 }]}
      onPress={onPress}
    >
      {/* Top row */}
      <View style={dc.topRow}>
        <View style={numStyle}>
          <Text style={numTextStyle}>{dayNum}</Text>
        </View>
        <View style={dc.info}>
          <Text style={dc.theme}>{theme}</Text>
          <Text style={dc.sub}>
            {dateStr ? `${dateStr} · ` : ''}{stopCount} stop{stopCount !== 1 ? 's' : ''} · {hrs}h
          </Text>
        </View>
        <View style={badgeStyle}>
          <Text style={badgeTextStyle}>{badgeLabel}</Text>
        </View>
      </View>

      {/* Alert chips — today + future only */}
      {status !== 'past' && (tickets > 0 || noLunch) && (
        <View style={dc.alertRow}>
          {tickets > 0 && (
            <View style={dc.alertChip}>
              <Text style={dc.alertText}>{tickets} ticket{tickets > 1 ? 's' : ''} needed</Text>
            </View>
          )}
          {noLunch && (
            <View style={dc.alertChip}>
              <Text style={dc.alertText}>No lunch stop</Text>
            </View>
          )}
        </View>
      )}

      {/* Session bars */}
      <View style={dc.barsWrap}>
        <SessionBars dayStops={dayStops} />
      </View>

      {/* Locked bar — past days */}
      {status === 'past' && (
        <View style={dc.lockedBar}>
          <IconLock size={14} color={C.muted} />
          <Text style={dc.lockedText}>Day completed — view only</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── TripOverview screen ──────────────────────────────────────────────────────

function TripOverview({
  trip,
  stops,
  totalDays,
  activeTripDay,
  tripStarted,
  getDayStatus,
  getStopsForDay,
  onSelectDay,
  onRunToday,
  onOpenOptions,
}: {
  trip: TripData;
  stops: Stop[];
  totalDays: number;
  activeTripDay: number;
  tripStarted: boolean;
  getDayStatus: (d: number) => DayStatus;
  getStopsForDay: (d: number) => Stop[];
  onSelectDay: (d: number) => void;
  onRunToday: () => void;
  onOpenOptions: () => void;
}) {
  const insets = useSafeAreaInsets();
  const totalTickets  = stops.filter(s => needsTicket(s)).length;
  const booked        = stops.filter(s => s.journeyPackCompleted).length;
  const travelerCount = trip.travelers?.length ?? 0;
  const dateRange     = formatDateRange(trip.startDate, trip.endDate);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={[ov.header, { paddingTop: insets.top + 6 }]}>
        <View style={ov.headerTop}>
          <Pressable style={ov.iconBtn} onPress={() => router.back()} hitSlop={8}>
            <IconChevronLeft />
          </Pressable>
          <View style={ov.titleWrap}>
            <Text style={ov.tripTitle} numberOfLines={1}>{trip.name}</Text>
            <Text style={ov.tripSub}>
              {totalDays} day{totalDays !== 1 ? 's' : ''}
              {dateRange ? ` · ${dateRange}` : ''}
              {travelerCount > 0 ? ` · ${travelerCount} traveler${travelerCount !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
          <Pressable style={ov.iconBtn} onPress={onOpenOptions} hitSlop={8}>
            <IconDots />
          </Pressable>
        </View>

        {/* Health strip */}
        <View style={ov.health}>
          <View style={ov.hi}>
            <Text style={ov.hn}>{stops.length}</Text>
            <Text style={ov.hl}>STOPS</Text>
          </View>
          <View style={ov.hdiv} />
          <View style={ov.hi}>
            <Text style={[ov.hn, { color: C.orange }]}>{totalTickets}</Text>
            <Text style={ov.hl}>TICKETS</Text>
          </View>
          <View style={ov.hdiv} />
          <View style={ov.hi}>
            <Text style={ov.hn}>{totalDays}</Text>
            <Text style={ov.hl}>DAYS</Text>
          </View>
          <View style={ov.hdiv} />
          <View style={ov.hi}>
            <Text style={[ov.hn, { color: C.green }]}>{booked}</Text>
            <Text style={ov.hl}>BOOKED</Text>
          </View>
        </View>
      </View>

      {/* Day cards scroll */}
      <ScrollView
        contentContainerStyle={[ov.body, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: totalDays }, (_, i) => i + 1)
          .filter(dayNum => {
            const status = getDayStatus(dayNum);
            if (status === 'past' || status === 'today') return true;
            return getStopsForDay(dayNum).length > 0;
          })
          .map(dayNum => {
            const dayStops = getStopsForDay(dayNum);
            const status   = getDayStatus(dayNum);
            return (
              <DayCard
                key={dayNum}
                dayNum={dayNum}
                dayStops={dayStops}
                startDate={trip.startDate}
                status={status}
                onPress={() => onSelectDay(dayNum)}
              />
            );
          })}

        {totalDays === 0 && (
          <View style={ov.emptyWrap}>
            <ActivityIndicator color={C.orange} />
            <Text style={ov.emptyText}>Building your itinerary…</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer — Run Today (only if trip has started) */}
      {tripStarted && (
        <View style={[ov.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable style={ov.runTodayBtn} onPress={onRunToday}>
            <IconPlay />
            <Text style={ov.runTodayText}>Run Today — Day {activeTripDay}</Text>
          </Pressable>
          <Text style={ov.runSub}>Jump straight to live mode for today</Text>
        </View>
      )}
    </View>
  );
}

// ─── DayDetail screen ─────────────────────────────────────────────────────────

function DayDetail({
  trip,
  stops,
  totalDays,
  selectedDay,
  getDayStatus,
  getStopsForDay,
  getAnchorStopForDay,
  tripId,
  onBack,
  onSelectDay,
  onStopDetails,
  onReplaceStop,
  onRunDay,
  onOpenOptions,
  onDelete,
  onMoveStop,
}: {
  trip: TripData;
  stops: Stop[];
  totalDays: number;
  selectedDay: number;
  getDayStatus: (d: number) => DayStatus;
  getStopsForDay: (d: number) => Stop[];
  getAnchorStopForDay: (d: number) => Stop | null;
  tripId: string;
  onBack: () => void;
  onSelectDay: (d: number) => void;
  onStopDetails: (s: Stop) => void;
  onReplaceStop: (s: Stop) => void;
  onRunDay: () => void;
  onOpenOptions: () => void;
  onDelete: (stopId: string) => Promise<void>;
  onMoveStop: (stopId: string, dir: 'up' | 'down') => void;
}) {
  const insets   = useSafeAreaInsets();
  const status   = getDayStatus(selectedDay);
  const isEditable = status !== 'past';
  const dayStops = getStopsForDay(selectedDay);
  const anchor   = getAnchorStopForDay(selectedDay);
  const theme    = dayTheme(dayStops);
  const tickets  = getTicketCount(dayStops);
  const noLunch  = !hasLunchStop(dayStops);
  const totalMin = dayStops.reduce((s, st) => s + getStopDuration(st), 0);
  const hrs      = (totalMin / 60).toFixed(1).replace('.0', '');
  const dateStr  = trip.startDate ? formatDate(trip.startDate, selectedDay - 1) : null;
  const stopCount = dayStops.length;

  const contentStops = dayStops.filter(s => !isMealStop(s.stopType));
  const mealStops    = dayStops.filter(s => isMealStop(s.stopType));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={[dd.header, { paddingTop: insets.top + 6 }]}>
        <View style={dd.headerTop}>
          <Pressable style={dd.iconBtn} onPress={onBack} hitSlop={8}>
            <IconChevronLeft />
          </Pressable>
          <View style={dd.titleWrap}>
            <Text style={dd.dayTitle} numberOfLines={1}>Day {selectedDay} — {theme}</Text>
            <Text style={dd.daySub}>
              {dateStr ? `${dateStr} · ` : ''}{stopCount} stop{stopCount !== 1 ? 's' : ''} · {hrs}h
            </Text>
          </View>
          <Pressable style={dd.iconBtn} onPress={onOpenOptions} hitSlop={8}>
            <IconDots />
          </Pressable>
        </View>

        {/* Day tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dd.tabsRow}>
          {Array.from({ length: totalDays }, (_, i) => i + 1)
            .filter(d => {
              const s = getDayStatus(d);
              if (s === 'past' || s === 'today') return true;
              return getStopsForDay(d).length > 0;
            })
            .map(d => {
            const s    = getDayStatus(d);
            const isOn = d === selectedDay;
            const isPast = s === 'past';
            const isToday = s === 'today';
            return (
              <Pressable
                key={d}
                onPress={() => onSelectDay(d)}
                style={[
                  dd.tab,
                  isOn && !isToday && dd.tabOn,
                  isOn && isToday && dd.tabTodayOn,
                  !isOn && isToday && dd.tabTodayOff,
                  !isOn && isPast && dd.tabPast,
                ]}
              >
                <Text style={[
                  dd.tabText,
                  isOn && !isToday && dd.tabTextOn,
                  isOn && isToday && dd.tabTextTodayOn,
                  !isOn && isToday && dd.tabTextTodayOff,
                  !isOn && isPast && dd.tabTextPast,
                ]}>
                  {isPast && !isOn ? `✓ Day ${d}` : `Day ${d}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Body */}
      <ScrollView
        contentContainerStyle={[dd.body, { paddingBottom: insets.bottom + (isEditable ? 100 : 20) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Locked banner */}
        {!isEditable && (
          <View style={dd.lockedBanner}>
            <IconLock size={16} />
            <Text style={dd.lockedText}>This day is done. You can view it but not edit.</Text>
          </View>
        )}

        {/* Before You Go — editable days with stops only */}
        {isEditable && dayStops.length > 0 && (tickets > 0 || noLunch) && (
          <View style={dd.bfg}>
            <View style={dd.bfgHeader}>
              <IconInfo size={14} />
              <Text style={dd.bfgTitle}>Before you go</Text>
            </View>
            {tickets > 0 && (
              <View style={dd.bfgRow}>
                <View style={dd.bfgDot} />
                <Text style={dd.bfgText}>{tickets} ticket{tickets > 1 ? 's' : ''} needed for this day</Text>
                <Text style={dd.bfgAct}>Book now</Text>
              </View>
            )}
            {noLunch && (
              <View style={[dd.bfgRow, { borderTopWidth: 0 }]}>
                <View style={dd.bfgDot} />
                <Text style={dd.bfgText}>No lunch stop — consider adding one</Text>
                <Text style={dd.bfgAct}>Add</Text>
              </View>
            )}
          </View>
        )}


        {/* Stop cards — meal cards splice in after first content stop */}
        {contentStops.map((stop, i) => (
          <React.Fragment key={stop.id}>
            <StopCard
              stop={stop}
              isEditable={isEditable}
              isAnchor={anchor?.id === stop.id}
              tripId={tripId}
              onDetails={onStopDetails}
              onReplace={onReplaceStop}
              onDelete={onDelete}
              onMoveStop={onMoveStop}
            />
            {i === 0 && mealStops.map(ms => (
              <MealCard key={ms.id} stop={ms} />
            ))}
          </React.Fragment>
        ))}
        {/* Meal cards for days with no content stops */}
        {contentStops.length === 0 && mealStops.map(stop => (
          <MealCard key={stop.id} stop={stop} />
        ))}

        {/* Empty day */}
        {dayStops.length === 0 && (
          <View style={dd.emptyDay}>
            <Text style={dd.emptyText}>No stops planned for this day yet.</Text>
          </View>
        )}

        {/* Add a stop — editable only */}
        {isEditable && (
          <Pressable style={dd.addStopBtn} onPress={() => showToast('Add a stop — coming soon')}>
            <IconPlus />
            <Text style={dd.addStopText}> Add a stop</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Footer — editable days with stops only */}
      {isEditable && dayStops.length > 0 && (
        <View style={[dd.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable style={dd.runBtn} onPress={onRunDay}>
            <IconPlay />
            <Text style={dd.runBtnText}>  Run Day {selectedDay}</Text>
          </Pressable>
          <Text style={dd.runSub}>Switches to Today tab — live mode</Text>
        </View>
      )}
    </View>
  );
}

// ─── StopDetailSheet ──────────────────────────────────────────────────────────

function StopDetailSheet({
  stop,
  isEditable,
  tripCity,
  onClose,
  onReplace,
  onDelete,
  onOpenRunDay,
}: {
  stop: Stop | null;
  isEditable: boolean;
  tripCity?: string | null;
  onClose: () => void;
  onReplace: (s: Stop) => void;
  onDelete: (id: string) => Promise<void>;
  onOpenRunDay: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rotAnim = useRef(new Animated.Value(0)).current;

  // ⚠️ Hook must be above early return — rules of hooks
  const heroImg = useStopHeroImage(stop?.id ?? null);

  useEffect(() => {
    Animated.timing(rotAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  if (!stop) return null;

  const heroBg = stopHeroBg(stop.stopType);
  const enrichment = stop.enrichment;
  const meta = stop.metadata;
  const duration = getStopDuration(stop);

  const whyText = enrichment?.whyNow ?? stop.tip ?? meta?.doThisFirst
    ?? `${stop.name} is a great pick for your family.`;

  let timingTitle = 'Good time to visit';
  if (meta?.sessionFit === 'morning')   timingTitle = 'Best in the morning';
  if (meta?.sessionFit === 'afternoon') timingTitle = 'Good this afternoon';
  if (meta?.sessionFit === 'evening')   timingTitle = 'Great for the evening';
  if (!meta?.sessionFit && enrichment?.bestTimeOfDay) {
    timingTitle = `Best: ${enrichment.bestTimeOfDay}`;
  }

  const timingSub = enrichment?.practicalTips
    ? enrichment.practicalTips.split('.')[0] + '.'
    : 'Great pick for families of all ages.';

  const parking   = meta?.parkingSignal ?? enrichment?.parkingNotes ?? 'Check nearby';
  const restrooms = meta?.restroomConfidence ?? enrichment?.bathroomNotes ?? 'Near entrance';
  const bestTime  = enrichment?.bestTimeOfDay ?? (meta?.sessionFit ?? 'Anytime');
  const waitTime  = waitTimeForType(stop.stopType);
  const address   = stop.address;
  const foodNearby = meta?.foodNearby ?? [];

  const arrowRotate = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  function openMaps() {
    if (!address) return;
    const q = encodeURIComponent(address);
    const url = Platform.OS === 'ios' ? `maps://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`;
    Linking.openURL(url).catch(() => showToast('Could not open maps'));
  }

  return (
    <View style={{ flex: 1 }}>
      <Grip />

      {/* Header */}
      <View style={sds.header}>
        <View style={{ flex: 1 }}>
          <Text style={sds.headerName} numberOfLines={1}>{stop.name}</Text>
          <Text style={sds.headerSub}>
            {stop.stopType?.replace(/_/g, ' ')} · {duration} min
          </Text>
        </View>
        <Pressable style={sds.closeBtn} onPress={onClose} hitSlop={8}>
          <IconX size={14} />
        </Pressable>
      </View>

      {/* Scrollable body */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

        {/* Hero banner */}
        <View style={[sds.hero, { backgroundColor: heroBg }]}>
          {heroImg ? (
            <ExpoImage
              source={{ uri: heroImg }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={300}
            />
          ) : null}
          <LinearGradient
            colors={['transparent', 'rgba(26,31,46,0.65)']}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={sds.heroName}>{stop.name}</Text>
        </View>

        <View style={sds.bodyPad}>
          {/* WhyCard */}
          <View style={sds.whyCard}>
            <Text style={sds.whyLabel}>WHY THIS STOP WORKS</Text>
            <Text style={sds.whyText}>{whyText}</Text>
          </View>

          {/* TimingCard */}
          <View style={sds.timCard}>
            <IconStar size={14} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={sds.timMain}>{timingTitle}</Text>
              <Text style={sds.timSub}>{timingSub}</Text>
            </View>
          </View>

          {/* Chips */}
          <View style={sds.chips}>
            <View style={sds.chip}><Text style={sds.chipText}>Open now</Text></View>
            {meta?.parkingSignal && (
              <View style={sds.chip}>
                <Text style={sds.chipText}>{meta.parkingSignal.split('—')[0].trim()}</Text>
              </View>
            )}
            <View style={sds.chip}><Text style={sds.chipText}>{duration} min</Text></View>
            {(enrichment?.bathroomNotes || meta?.restroomConfidence) && (
              <View style={sds.chip}><Text style={sds.chipText}>Restrooms nearby</Text></View>
            )}
          </View>

          {/* Quick Adjust — editable days only */}
          {isEditable && (
            <>
              <Text style={sds.qaLabel}>QUICK ADJUST</Text>
              <View style={sds.qaGrid}>
                <Pressable style={sds.qaBtn} onPress={() => showToast(meta?.shortenSuggestion ? `Tip: ${meta.shortenSuggestion}` : 'Try skipping the gift shop.')}>
                  <Text style={sds.qaBtnText}>Running behind</Text>
                </Pressable>
                <Pressable style={sds.qaBtn} onPress={() => showToast(meta?.breakSuggestion ? `Tip: ${meta.breakSuggestion}` : 'Find a nearby bench or cafe.')}>
                  <Text style={sds.qaBtnText}>Kids are tired</Text>
                </Pressable>
                <Pressable style={sds.qaBtn} onPress={() => {
                  onClose();
                  onDelete(stop.id);
                }}>
                  <Text style={sds.qaBtnText}>Skip this stop</Text>
                </Pressable>
                <Pressable style={sds.qaBtn} onPress={() => { onClose(); onOpenRunDay(); }}>
                  <Text style={sds.qaBtnText}>Too much today</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Explore More */}
          <Pressable style={sds.expToggle} onPress={() => setExpanded(v => !v)}>
            <Text style={sds.expToggleText}>Parking, nearby & logistics</Text>
            <Animated.Text style={[sds.expArrow, { transform: [{ rotate: arrowRotate }] }]}>▾</Animated.Text>
          </Pressable>

          {expanded && (
            <View style={sds.expContent}>
              {/* Parking & Access */}
              <Text style={sds.expSecLabel}>PARKING & ACCESS</Text>
              {[
                { label: 'Parking',   value: parking },
                { label: 'Restrooms', value: restrooms },
                { label: 'Best time', value: bestTime },
                { label: 'Wait time', value: waitTime },
              ].map(row => (
                <View key={row.label} style={sds.expRow}>
                  <Text style={sds.expRl}>{row.label}</Text>
                  <Text style={sds.expRv}>{row.value}</Text>
                </View>
              ))}

              {/* Nearby */}
              {(foodNearby.length > 0 || enrichment?.foodOptions) && (
                <>
                  <Text style={[sds.expSecLabel, { marginTop: 12 }]}>NEARBY ESSENTIALS</Text>
                  {foodNearby.slice(0, 3).map((f, i) => (
                    <View key={i} style={sds.nearbyRow}>
                      <View style={sds.nearbyIco}>
                        <Text style={{ fontSize: 15 }}>🍽️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={sds.nearbyName}>{f.name}</Text>
                        <Text style={sds.nearbyDist}>{f.distance}</Text>
                      </View>
                    </View>
                  ))}
                  {foodNearby.length === 0 && enrichment?.foodOptions && (
                    <Text style={sds.expRl}>{enrichment.foodOptions}</Text>
                  )}
                </>
              )}

              {/* Getting there */}
              {address && (
                <>
                  <Text style={[sds.expSecLabel, { marginTop: 12 }]}>GETTING THERE</Text>
                  <Text style={sds.expRl}>{address}</Text>
                  <Pressable style={sds.mapsBtn} onPress={openMaps}>
                    <IconPin size={14} />
                    <Text style={sds.mapsBtnText}>  Open in Maps</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={sds.footer}>
        <Pressable style={sds.doneBtn} onPress={onClose}>
          <Text style={sds.doneBtnText}>
            {isEditable ? 'Done planning this stop' : 'Done viewing this stop'}
          </Text>
        </Pressable>
        {isEditable && (
          <View style={sds.footerRow}>
            <Pressable style={sds.footerSecBtn} onPress={() => { onClose(); onReplace(stop); }}>
              <Text style={sds.footerSecText}>Replace</Text>
            </Pressable>
            <Pressable style={sds.footerSecBtn} onPress={openMaps}>
              <Text style={sds.footerSecText}>Open in Maps</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── ReplaceSheet ─────────────────────────────────────────────────────────────

const REPLACE_CHIPS = ['Best match', 'Outdoors', 'Shorter', 'More fun', 'Indoor'] as const;
type ReplaceChip = typeof REPLACE_CHIPS[number];

function ReplaceSheet({
  stop,
  trip,
  allStops,
  selectedDay,
  tripId,
  onClose,
  onReplaceConfirm,
}: {
  stop: Stop | null;
  trip: TripData;
  allStops: Stop[];
  selectedDay: number;
  tripId: string;
  onClose: () => void;
  onReplaceConfirm: () => void;
}) {
  const [chip, setChip]       = useState<ReplaceChip>('Best match');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);
  const [alts, setAlts]       = useState<Array<{ id: string; name: string; stopType?: string; description?: string; durationMinutes?: number }>>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();

  function chipFilter(c: ReplaceChip): string | null {
    if (c === 'Outdoors')  return 'outdoors';
    if (c === 'Shorter')   return 'shorter';
    if (c === 'More fun')  return 'fun';
    if (c === 'Indoor')    return 'free';
    return null;
  }

  async function loadAlts(chipVal: ReplaceChip, searchVal: string) {
    if (!stop) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ better?: typeof alts; similar?: typeof alts; suggestions?: typeof alts }>(
        '/api/travel/stops/replace-suggestions',
        {
          method: 'POST',
          body: JSON.stringify({
            stopName: stop.name,
            stopType: stop.stopType,
            destination: trip.destination,
            chipFilter: chipFilter(chipVal),
            search: searchVal || undefined,
          }),
        }
      );
      const combined = [...(res.better ?? []), ...(res.similar ?? []), ...(res.suggestions ?? [])];
      setAlts(combined.slice(0, 8));
    } catch {
      setAlts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!stop) return;
    loadAlts(chip, '');
  }, [stop, chip]);

  function onSearchChange(text: string) {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadAlts(chip, text), 400);
  }

  if (!stop) return null;

  const otherDayStops = allStops
    .filter(s => s.dayIndex !== selectedDay - 1 && !isMealStop(s.stopType))
    .slice(0, 5);

  async function useAlt(alt: typeof alts[0]) {
    if (!stop) return;
    const replacedStop = stop;
    try {
      await apiFetch(`/api/travel/trips/${tripId}/stops`, {
        method: 'POST',
        body: JSON.stringify({
          name: alt.name,
          stopType: alt.stopType ?? 'landmark',
          durationMinutes: alt.durationMinutes ?? 60,
          dayIndex: replacedStop.dayIndex ?? 0,
          displayOrder: replacedStop.displayOrder ?? 0,
          cityGroup: replacedStop.cityGroup ?? null,
        }),
      });
      await apiFetch(`/api/travel/stops/${replacedStop.id}`, { method: 'DELETE' });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      onReplaceConfirm();
    } catch {
      showToast("Couldn't replace stop — try again");
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Grip />

      {/* Swap header */}
      <View style={rep.swapHeader}>
        <Text style={rep.swapOut}>SWAPPING OUT</Text>
        <Text style={rep.swapName}>{stop.name}</Text>
      </View>

      {/* Filter chips + search */}
      <View style={rep.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={rep.chipsRow}>
          {REPLACE_CHIPS.map(c => (
            <Pressable
              key={c}
              style={[rep.fchip, chip === c && rep.fchipOn]}
              onPress={() => setChip(c)}
            >
              <Text style={[rep.fchipText, chip === c && rep.fchipTextOn]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={rep.searchBox}>
          <IconSearch />
          <TextInput
            style={rep.searchInput}
            placeholder={`Search any place in ${trip.city ?? trip.destination ?? 'your city'}...`}
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={onSearchChange}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* From other days */}
        {otherDayStops.length > 0 && (
          <>
            <Text style={rep.secLabel}>FROM OTHER DAYS</Text>
            {otherDayStops.map(s => (
              <Pressable
                key={s.id}
                style={rep.otherDayRow}
                onPress={async () => {
                  try {
                    const targetDayIndex = selectedDay - 1;
                    const targetDayStops = allStops
                      .filter(x => x.dayIndex === targetDayIndex && !isMealStop(x.stopType))
                      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
                    const newDisplayOrder = targetDayStops.length;
                    await apiFetch(`/api/travel/trips/${tripId}/reorder-stops`, {
                      method: 'PATCH',
                      body: JSON.stringify({
                        stopOrders: [{ stopId: s.id, displayOrder: newDisplayOrder, dayIndex: targetDayIndex }],
                      }),
                    });
                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
                    onReplaceConfirm();
                  } catch {
                    showToast("Couldn't move stop — try again");
                  }
                }}
              >
                <View style={[rep.otherDayIco, { backgroundColor: stopHeroBg(s.stopType) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={rep.otherDayName}>{s.name}</Text>
                  <Text style={rep.otherDayMeta}>Day {(s.dayIndex ?? 0) + 1} · {getStopDuration(s)} min</Text>
                </View>
                <IconChevronRight />
              </Pressable>
            ))}
            <View style={rep.divider} />
          </>
        )}

        {/* Alternatives */}
        <Text style={rep.secLabel}>NEW ALTERNATIVES</Text>
        {loading ? (
          [0, 1, 2].map(i => <View key={i} style={rep.skeleton} />)
        ) : alts.length === 0 ? (
          <Text style={{ color: C.muted, fontSize: 13, fontFamily: F.regular, marginBottom: 16 }}>
            Couldn't find alternatives right now — try a different filter
          </Text>
        ) : (
          alts.map((alt, i) => (
            <View key={alt.id || i} style={rep.altCard}>
              <Text style={rep.altName}>{alt.name}</Text>
              <View style={rep.altTagsRow}>
                {alt.stopType && (
                  <View style={rep.altTag}>
                    <Text style={rep.altTagText}>{alt.stopType.replace(/_/g, ' ')}</Text>
                  </View>
                )}
                {alt.durationMinutes && (
                  <View style={rep.altTagN}>
                    <Text style={rep.altTagNText}>{alt.durationMinutes} min</Text>
                  </View>
                )}
              </View>
              {alt.description && (
                <Text style={rep.altDesc} numberOfLines={2}>{alt.description}</Text>
              )}
              <Pressable style={rep.useBtn} onPress={() => useAlt(alt)}>
                <Text style={rep.useBtnText}>Use this stop →</Text>
              </Pressable>
            </View>
          ))
        )}

        {/* Remove from day */}
        <Pressable
          style={rep.removeBtn}
          onPress={() => {
            onClose();
            apiFetch(`/api/travel/stops/${stop.id}`, { method: 'DELETE' })
              .then(() => queryClient.invalidateQueries({ queryKey: ['trip', tripId] }))
              .catch(() => showToast("Couldn't remove stop"));
          }}
        >
          <Text style={rep.removeBtnText}>Remove this stop from the day</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── RunDaySheet ──────────────────────────────────────────────────────────────

function RunDaySheet({
  selectedDay,
  dayStops,
  tripId,
  runMode,
  onModeChange,
  onClose,
  queryClient,
}: {
  selectedDay: number;
  dayStops: Stop[];
  tripId: string;
  runMode: RunMode;
  onModeChange: (m: RunMode) => void;
  onClose: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [applying, setApplying] = useState(false);
  const anchor  = getAnchorStop(dayStops);
  const dropSt  = getDropStop(dayStops);
  const keptStops = dayStops.filter(s => s.id !== dropSt?.id);
  const dropMin   = dropSt ? getStopDuration(dropSt) : 0;
  const totalMin  = dayStops.reduce((s, st) => s + getStopDuration(st), 0);

  const MODES: Array<{ key: RunMode; name: string; badge: string; desc: string }> = [
    { key: 'balanced', name: 'Balanced', badge: 'Recommended', desc: 'All stops as planned. Works best when everyone is rested and ready.' },
    { key: 'faster',   name: 'Faster',   badge: 'Tighter',     desc: "Cuts travel buffer between stops. Good when you're starting late." },
    { key: 'easier',   name: 'Easier',   badge: 'Lighter',     desc: 'Removes the lowest-priority stop. Best when kids need more breathing room.' },
  ];

  async function applyEasier() {
    setApplying(true);
    try {
      await apiFetch(`/api/travel/trips/${tripId}/apply-preferences`, {
        method: 'POST',
        body: JSON.stringify({ pace: 'relaxed' }),
      });
      await queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onClose();
      router.replace('/(tabs)/today' as any);
    } catch {
      showToast("Couldn't update — try again");
    } finally {
      setApplying(false);
    }
  }

  async function applyStart() {
    if (runMode === 'easier') { applyEasier(); return; }
    if (runMode === 'faster') {
      try {
        await apiFetch(`/api/travel/trips/${tripId}/apply-preferences`, {
          method: 'POST',
          body: JSON.stringify({ pace: 'packed' }),
        });
      } catch { /* non-critical */ }
    }
    onClose();
    router.replace('/(tabs)/today' as any);
  }

  return (
    <View style={{ flex: 1 }}>
      <Grip />
      <View style={rds.header}>
        <View style={{ flex: 1 }}>
          <Text style={rds.title}>Start Day {selectedDay}</Text>
          <Text style={rds.sub}>Choose your pace for today</Text>
        </View>
        <Pressable style={rds.closeBtn} onPress={onClose} hitSlop={8}>
          <IconX size={14} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={rds.body}>
        {/* Mode cards */}
        {MODES.map(m => {
          const isSelected = runMode === m.key;
          const isEasier = m.key === 'easier';
          return (
            <Pressable
              key={m.key}
              style={[
                rds.modeCard,
                isSelected && !isEasier && rds.modeCardSel,
                isSelected && isEasier && rds.modeCardEasier,
              ]}
              onPress={() => onModeChange(m.key)}
            >
              <View style={rds.modeHead}>
                <Text style={rds.modeName}>{m.name}</Text>
                <View style={[
                  rds.modeBadge,
                  isSelected && !isEasier && rds.modeBadgeSel,
                  isSelected && isEasier && rds.modeBadgeEasier,
                ]}>
                  <Text style={[
                    rds.modeBadgeText,
                    isSelected && !isEasier && rds.modeBadgeSelText,
                    isSelected && isEasier && rds.modeBadgeEasierText,
                  ]}>
                    {isSelected ? 'Selected' : m.badge}
                  </Text>
                </View>
              </View>
              <Text style={rds.modeDesc}>{m.desc}</Text>
            </Pressable>
          );
        })}

        {/* Consequence panel — Easier mode */}
        {runMode === 'easier' && dropSt && (
          <>
            <View style={rds.consequence}>
              <View style={rds.conHeader}>
                <Text style={rds.conTitle}>We made your day easier</Text>
                <Text style={rds.conSub}>Removed the least essential stop, kept your anchors</Text>
              </View>
              {/* Drop stop */}
              <View style={rds.conRow}>
                <View style={[rds.conIcon, rds.conIconDrop]}>
                  <IconMinus size={14} color={C.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={rds.conName}>{dropSt.name}</Text>
                  <Text style={rds.conReason}>Lower priority for this family profile — easily skipped today.</Text>
                </View>
              </View>
              {/* Kept stops */}
              {keptStops.slice(0, 3).map(s => (
                <View key={s.id} style={[rds.conRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
                  <View style={[rds.conIcon, rds.conIconKeep]}>
                    <IconCheck size={14} color={C.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={rds.conName}>{s.name}</Text>
                    <Text style={rds.conReason}>
                      {s.id === anchor?.id
                        ? "Keeping this — high-value for your kids' ages."
                        : "Keeping this — it's a family anchor."}
                    </Text>
                    {s.id === anchor?.id && (
                      <View style={rds.anchorBadge}>
                        <Text style={rds.anchorBadgeText}>anchor stop</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Time saved */}
            <View style={rds.timeSave}>
              <IconClock size={14} color={C.green} />
              <Text style={rds.timeSaveText}>
                {formatDuration(totalMin - dropMin)} instead of {formatDuration(totalMin)}
              </Text>
            </View>
          </>
        )}

        {/* Plan summary — Balanced or Faster */}
        {runMode !== 'easier' && (
          <View style={rds.planBox}>
            <Text style={rds.planLabel}>
              {runMode === 'faster' ? "TODAY'S PLAN — TIGHTENED UP" : "TODAY'S STOPS"}
            </Text>
            {dayStops.map(s => (
              <View key={s.id} style={rds.planRow}>
                <View style={[rds.planDot, { backgroundColor: C.green }]} />
                <Text style={rds.planRowText}>{s.name} · {formatDuration(getStopDuration(s))}</Text>
              </View>
            ))}
            {runMode === 'faster' && (
              <Text style={[rds.planLabel, { marginTop: 8, textTransform: 'none', fontSize: 11 }]}>
                Travel buffers reduced by ~15 min between stops
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={rds.footer}>
        <Pressable style={rds.startBtn} onPress={applyStart} disabled={applying}>
          {applying
            ? <ActivityIndicator color="#fff" />
            : <Text style={rds.startBtnText}>
                {runMode === 'easier' ? 'Apply changes — start day' : 'Start — switch to Today tab'}
              </Text>
          }
        </Pressable>
        {runMode === 'easier' && (
          <Pressable style={rds.keepBtn} onPress={onClose}>
            <Text style={rds.keepBtnText}>Keep original plan</Text>
          </Pressable>
        )}
        <Text style={rds.startSub}>
          {runMode === 'easier' ? '' : 'Live mode takes over from here'}
        </Text>
      </View>
    </View>
  );
}

// ─── TripOptionsSheet ─────────────────────────────────────────────────────────

function TripOptionsSheet({
  trip,
  tripId,
  onClose,
  onCompare,
  queryClient,
}: {
  trip: TripData;
  tripId: string;
  onClose: () => void;
  onCompare: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  function renameTrip() {
    Alert.prompt(
      'Rename Trip',
      'Enter a new name',
      async (name) => {
        if (!name?.trim()) return;
        try {
          await apiFetch(`/api/travel/trips/${tripId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name: name.trim() }),
          });
          queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
        } catch { showToast("Couldn't rename trip"); }
      },
      'plain-text',
      trip.name
    );
  }

  type OptionItem = { icon: React.ReactNode; bg: string; name: string; sub: string; onPress: () => void };
  const sections: Array<{ label: string; items: OptionItem[] }> = [
    {
      label: 'TRIP TOOLS',
      items: [
        { icon: <IconDownload />, bg: '#EEF5F2', name: 'Download for offline', sub: 'Save stops and stories for no-WiFi use', onPress: () => showToast('Coming soon') },
        { icon: <IconShare />, bg: '#FDF0E9', name: 'Share with family', sub: 'Send the itinerary to your travel partners', onPress: () => Share.share({ message: `Check out our trip plan: ${trip.name}` }) },
        { icon: <IconCheck />, bg: '#FDF0E9', name: 'Packing list', sub: "Check off what you're bringing", onPress: () => showToast('Coming soon') },
        { icon: <IconBars />, bg: '#E8F7EF', name: 'Compare days', sub: 'See balance and pace across all days', onPress: () => { onClose(); onCompare(); } },
      ],
    },
    {
      label: 'PLAN SETTINGS',
      items: [
        { icon: <IconEdit />, bg: '#FDF0E9', name: 'Rename trip', sub: 'Change the name shown at the top', onPress: renameTrip },
        { icon: <IconGear />, bg: C.bg, name: 'Edit trip preferences', sub: 'Adjust pace, interests & auto-optimize', onPress: () => showToast('Coming soon') },
        { icon: <IconRefresh />, bg: '#EEF5F2', name: 'Reset today', sub: 'Un-skip all stops for today', onPress: () => showToast('Coming soon') },
      ],
    },
    {
      label: 'UTILITIES',
      items: [
        { icon: <IconCopy />, bg: C.bg, name: 'Copy this trip', sub: 'Create a copy to plan a similar adventure', onPress: () => showToast('Coming soon') },
      ],
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Grip />
      <View style={opts.header}>
        <Text style={opts.title} numberOfLines={1}>
          {trip.name.slice(0, 28)}{trip.name.length > 28 ? '…' : ''}
        </Text>
        <Pressable style={opts.closeBtn} onPress={onClose} hitSlop={8}>
          <IconX size={14} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={opts.body}>
        {sections.map(sec => (
          <View key={sec.label}>
            <Text style={opts.secLabel}>{sec.label}</Text>
            {sec.items.map(item => (
              <Pressable key={item.name} style={opts.item} onPress={item.onPress}>
                <View style={[opts.ico, { backgroundColor: item.bg }]}>
                  {item.icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={opts.itemName}>{item.name}</Text>
                  <Text style={opts.itemSub}>{item.sub}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── CompareDaysSheet ─────────────────────────────────────────────────────────

function CompareDaysSheet({
  trip,
  stops,
  totalDays,
  getDayStatus,
  getStopsForDay,
  onClose,
  onSelectDay,
}: {
  trip: TripData;
  stops: Stop[];
  totalDays: number;
  getDayStatus: (d: number) => DayStatus;
  getStopsForDay: (d: number) => Stop[];
  onClose: () => void;
  onSelectDay: (d: number) => void;
}) {
  const [tab, setTab] = useState<'summary' | 'timeline'>('summary');

  const allDayStops = Array.from({ length: totalDays }, (_, i) => getStopsForDay(i + 1));
  const anyPacked = allDayStops.some(ds => ds.length >= 4);
  const statusMsg = anyPacked
    ? 'Some days are packed — consider splitting stops'
    : 'Your trip looks well balanced';

  return (
    <View style={{ flex: 1 }}>
      <Grip />
      <View style={cds.header}>
        <View style={{ flex: 1 }}>
          <Text style={cds.title}>Trip Overview</Text>
          <Text style={cds.sub}>{trip.name}</Text>
        </View>
        <Pressable style={cds.closeBtn} onPress={onClose} hitSlop={8}>
          <IconX size={14} />
        </Pressable>
      </View>

      {/* Toggle */}
      <View style={cds.toggle}>
        <Pressable style={[cds.tb, tab === 'summary' && cds.tbOn]} onPress={() => setTab('summary')}>
          <Text style={[cds.tbText, tab === 'summary' && cds.tbTextOn]}>Summary</Text>
        </Pressable>
        <Pressable style={[cds.tb, tab === 'timeline' && cds.tbOn]} onPress={() => showToast('Timeline view coming soon')}>
          <Text style={[cds.tbText, tab === 'timeline' && cds.tbTextOn]}>Timeline</Text>
        </Pressable>
      </View>

      {/* Status banner */}
      <View style={cds.statusBanner}>
        <Text style={cds.statusText}>{statusMsg}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={cds.body}>
        {Array.from({ length: totalDays }, (_, i) => i + 1)
          .filter(dayNum => {
            const st = getDayStatus(dayNum);
            if (st === 'past' || st === 'today') return true;
            return getStopsForDay(dayNum).length > 0;
          })
          .map(dayNum => {
          const ds       = getStopsForDay(dayNum);
          const st       = getDayStatus(dayNum);
          const theme    = dayTheme(ds);
          const totalMin = ds.reduce((s, st2) => s + getStopDuration(st2), 0);
          const hrs      = (totalMin / 60).toFixed(1).replace('.0', '');

          return (
            <Pressable key={dayNum} style={cds.dayCard} onPress={() => { onClose(); onSelectDay(dayNum); }}>
              <View style={cds.dayTop}>
                <View style={[cds.dayNum, st === 'today' && { backgroundColor: C.orange }]}>
                  <Text style={[cds.dayNumText, st === 'today' && { color: '#fff' }]}>{dayNum}</Text>
                </View>
                <Text style={cds.dayTheme} numberOfLines={1}>Day {dayNum} — {theme}</Text>
                <View style={cds.dayBadge}>
                  <Text style={cds.dayBadgeText}>{st === 'past' ? 'Done' : st === 'today' ? 'Today' : `${ds.length} stops`}</Text>
                </View>
              </View>
              <View style={cds.dayMeta}>
                <Text style={cds.metaItem}>📍 {ds.length} stop{ds.length !== 1 ? 's' : ''}</Text>
                <Text style={cds.metaItem}>  {hrs} hrs</Text>
                <Text style={cds.metaItem}>🚗 ~20 min travel</Text>
              </View>
              <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                <SessionBars dayStops={ds} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Sheet wrapper (animated bottom sheet) ────────────────────────────────────

function SheetModal({
  visible,
  onClose,
  children,
  maxHeight = '91%',
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: `${number}%` | number;
}) {
  // Return null when not visible — on React Native Web, <Modal visible={false}>
  // still mounts a full-screen portal that intercepts all pointer events.
  // Five stacked invisible overlays = every button on the screen is dead.
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sh.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[sh.sheet, { maxHeight }]}>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function TripPlanScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const queryClient = useQueryClient();

  // ── Screen state ──
  const [activeScreen, setActiveScreen] = useState<'overview' | 'detail'>('overview');
  const [selectedDay, setSelectedDay]   = useState(1);
  const [activeSheet, setActiveSheet]   = useState<ActiveSheet>('none');
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [runMode, setRunMode]           = useState<RunMode>('balanced');
  const [localStops, setLocalStops]     = useState<Stop[]>([]);

  // ── Data ──
  const { data: rawTrip, isLoading, isError, refetch } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      if (!tripId) throw new Error('No tripId');
      return travelAPI.getTrip(tripId) as Promise<TripData>;
    },
    enabled: !!tripId,
    retry: 1,
    refetchInterval: (query) => {
      const t = query.state.data as TripData | undefined;
      if (!t) return false;
      return (t.stops?.length ?? 0) === 0 ? 4000 : false;
    },
  });

  const trip: TripData | null = rawTrip as TripData | null ?? null;

  useEffect(() => {
    if (trip?.stops) setLocalStops(trip.stops as Stop[]);
  }, [trip?.stops]);

  // ── Derived ──
  const totalDays = (() => {
    if (!trip) return 0;
    if (trip.plannerTripDays) return trip.plannerTripDays;
    if (trip.startDate && trip.endDate) {
      return Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000) + 1;
    }
    if (trip.tripDays) return trip.tripDays;
    if (localStops.length > 0) return Math.max(...localStops.map(s => (s.dayIndex ?? 0) + 1));
    return 0;
  })();

  const tripStartDate = trip?.startDate ? new Date(trip.startDate) : null;
  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

  const getDayStatus = useCallback((dayNum: number): DayStatus => {
    if (!tripStartDate) return 'future';
    const dayDate = new Date(tripStartDate);
    dayDate.setDate(dayDate.getDate() + dayNum - 1);
    dayDate.setHours(0, 0, 0, 0);
    if (dayDate < today) return 'past';
    if (dayDate.getTime() === today.getTime()) return 'today';
    return 'future';
  }, [tripStartDate, today]);

  const activeTripDay = (() => {
    if (!tripStartDate) return 1;
    const diff = Math.floor((today.getTime() - tripStartDate.getTime()) / 86_400_000) + 1;
    return Math.max(1, Math.min(diff, totalDays || 1));
  })();

  const tripStarted = tripStartDate ? tripStartDate <= today : false;

  const getStopsForDay = useCallback((dayNum: number): Stop[] => {
    return [...localStops]
      .filter(s => s.dayIndex === dayNum - 1)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [localStops]);

  const getAnchorStopForDay = useCallback((dayNum: number): Stop | null => {
    return getAnchorStop(getStopsForDay(dayNum));
  }, [getStopsForDay]);

  // ── Actions ──
  function goToDay(dayNum: number) {
    setSelectedDay(dayNum);
    setActiveScreen('detail');
  }

  async function deleteStop(stopId: string) {
    const snapshot = [...localStops];
    setLocalStops(prev => prev.filter(s => s.id !== stopId));
    try {
      await apiFetch(`/api/travel/stops/${stopId}`, { method: 'DELETE' });
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      setLocalStops(snapshot);
      showToast("Couldn't remove stop — restored");
    }
  }

  function moveStop(stopId: string, dir: 'up' | 'down') {
    const snapshot = [...localStops];
    const stop = snapshot.find(s => s.id === stopId);
    if (!stop) return;
    const dayStops = snapshot
      .filter(s => s.dayIndex === stop.dayIndex)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const idx = dayStops.findIndex(s => s.id === stopId);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= dayStops.length) return;
    const swapStop = dayStops[swapIdx];
    const newOrder = snapshot.map(s => {
      if (s.id === stopId) return { ...s, displayOrder: swapStop.displayOrder ?? swapIdx };
      if (s.id === swapStop.id) return { ...s, displayOrder: stop.displayOrder ?? idx };
      return s;
    });
    setLocalStops(newOrder);
    const stopOrders = newOrder
      .filter(s => s.dayIndex === stop.dayIndex)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((s, i) => ({ stopId: s.id, displayOrder: i, dayIndex: s.dayIndex }));
    apiFetch(`/api/travel/trips/${tripId}/reorder-stops`, {
      method: 'PATCH',
      body: JSON.stringify({ stopOrders }),
    }).catch(() => {
      setLocalStops(snapshot);
      showToast("Couldn't reorder — restored");
    });
  }

  function openStopDetails(stop: Stop) {
    console.log('[DEBUG] Details tapped, activeSheet before:', activeSheet, 'stop:', stop?.name);
    setSelectedStop(stop);
    setActiveSheet('stopDetail');
    console.log('[DEBUG] activeSheet after setActiveSheet (state updates are async — next render will reflect change)');
  }

  function openReplaceSheet(stop: Stop) {
    setSelectedStop(stop);
    setActiveSheet('replace');
  }

  function openRunDay(preMode?: RunMode) {
    if (preMode) setRunMode(preMode);
    setActiveSheet('runDay');
  }

  function closeSheet() { setActiveSheet('none'); }

  const dayStopsForSheet = getStopsForDay(selectedDay);
  const isSelectedDayEditable = getDayStatus(selectedDay) !== 'past';

  // ── Loading / error ──
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ height: 56, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border }} />
        {[140, 108, 108, 108].map((h, i) => (
          <View key={i} style={{ marginHorizontal: 16, marginTop: i === 0 ? 20 : 10, borderRadius: 16, height: h, backgroundColor: C.border, opacity: 0.55 }} />
        ))}
      </View>
    );
  }

  if (isError || !trip) {
    return (
      <View style={root.center}>
        <Text style={root.errorTitle}>Couldn't load trip</Text>
        <Text style={root.errorSub}>Check your connection and try again.</Text>
        <Pressable style={root.retryBtn} onPress={() => refetch()}>
          <Text style={root.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Screens */}
      {activeScreen === 'overview' ? (
        <TripOverview
          trip={trip}
          stops={localStops}
          totalDays={totalDays}
          activeTripDay={activeTripDay}
          tripStarted={tripStarted}
          getDayStatus={getDayStatus}
          getStopsForDay={getStopsForDay}
          onSelectDay={goToDay}
          onRunToday={() => openRunDay()}
          onOpenOptions={() => setActiveSheet('options')}
        />
      ) : (
        <DayDetail
          trip={trip}
          stops={localStops}
          totalDays={totalDays}
          selectedDay={selectedDay}
          getDayStatus={getDayStatus}
          getStopsForDay={getStopsForDay}
          getAnchorStopForDay={getAnchorStopForDay}
          tripId={tripId ?? ''}
          onBack={() => setActiveScreen('overview')}
          onSelectDay={(d) => setSelectedDay(d)}
          onStopDetails={openStopDetails}
          onReplaceStop={openReplaceSheet}
          onRunDay={() => openRunDay()}
          onOpenOptions={() => setActiveSheet('options')}
          onDelete={deleteStop}
          onMoveStop={moveStop}
        />
      )}

      {/* ── Sheets ── */}
      <SheetModal visible={activeSheet === 'stopDetail'} onClose={closeSheet}>
        <StopDetailSheet
          stop={selectedStop}
          isEditable={isSelectedDayEditable}
          tripCity={trip.city ?? trip.destination}
          onClose={closeSheet}
          onReplace={(s) => { closeSheet(); openReplaceSheet(s); }}
          onDelete={deleteStop}
          onOpenRunDay={() => { closeSheet(); openRunDay('easier'); }}
        />
      </SheetModal>

      <SheetModal visible={activeSheet === 'replace'} onClose={closeSheet}>
        <ReplaceSheet
          stop={selectedStop}
          trip={trip}
          allStops={localStops}
          selectedDay={selectedDay}
          tripId={tripId ?? ''}
          onClose={closeSheet}
          onReplaceConfirm={() => { closeSheet(); queryClient.invalidateQueries({ queryKey: ['trip', tripId] }); }}
        />
      </SheetModal>

      <SheetModal visible={activeSheet === 'runDay'} onClose={closeSheet}>
        <RunDaySheet
          selectedDay={selectedDay}
          dayStops={dayStopsForSheet}
          tripId={tripId ?? ''}
          runMode={runMode}
          onModeChange={setRunMode}
          onClose={closeSheet}
          queryClient={queryClient}
        />
      </SheetModal>

      <SheetModal visible={activeSheet === 'options'} onClose={closeSheet}>
        <TripOptionsSheet
          trip={trip}
          tripId={tripId ?? ''}
          onClose={closeSheet}
          onCompare={() => setActiveSheet('compare')}
          queryClient={queryClient}
        />
      </SheetModal>

      <SheetModal visible={activeSheet === 'compare'} onClose={closeSheet}>
        <CompareDaysSheet
          trip={trip}
          stops={localStops}
          totalDays={totalDays}
          getDayStatus={getDayStatus}
          getStopsForDay={getStopsForDay}
          onClose={closeSheet}
          onSelectDay={(d) => { closeSheet(); goToDay(d); }}
        />
      </SheetModal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,30,0.48)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  grip: {
    width: 32,
    height: 3,
    backgroundColor: 'rgba(26,31,46,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
    flexShrink: 0,
  },
});

const ov = StyleSheet.create({
  header: {
    backgroundColor: C.card,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  tripTitle: { fontFamily: F.bold, fontSize: 15, color: C.deep, letterSpacing: -0.01 },
  tripSub:   { fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 2 },
  health: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  hi: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  hn: { fontFamily: F.bold, fontSize: 19, color: C.deep, letterSpacing: -0.02, lineHeight: 22 },
  hl: { fontFamily: F.semibold, fontSize: 9, color: C.muted, letterSpacing: 0.06, textTransform: 'uppercase', marginTop: 3 },
  hdiv: { width: 1, backgroundColor: C.border },
  body: { padding: 14, paddingTop: 14 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: F.regular, fontSize: 13, color: C.muted, marginTop: 12 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  runTodayBtn: {
    backgroundColor: C.orange,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 6,
  },
  runTodayText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  runSub: { fontFamily: F.regular, fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 6 },
});

const dc = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: C.deep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardPast: { opacity: 0.55 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingBottom: 12 },
  info: { flex: 1, minWidth: 0 },
  theme: { fontFamily: F.bold, fontSize: 14, color: C.deep, letterSpacing: -0.01 },
  sub:   { fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 2 },
  dayNumPast:   { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dayNumFuture: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dayNumToday:  { width: 32, height: 32, borderRadius: 16, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  dayNumTextPast:   { fontFamily: F.bold, fontSize: 13, color: C.muted },
  dayNumTextFuture: { fontFamily: F.bold, fontSize: 13, color: C.deep },
  dayNumTextToday:  { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  badgeMuted:  { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  badgeToday:  { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: C.orange },
  badgeGreen:  { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: C.greenLt },
  badgeHeavy:  { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: '#FEF5E4', borderWidth: 1, borderColor: '#F0C97A' },
  badgeMutedText:  { fontFamily: F.bold, fontSize: 10, color: C.muted },
  badgeTodayText:  { fontFamily: F.bold, fontSize: 10, color: '#fff' },
  badgeGreenText:  { fontFamily: F.bold, fontSize: 10, color: '#1A6B3A' },
  badgeHeavyText:  { fontFamily: F.bold, fontSize: 10, color: '#7A4F00' },
  alertRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingHorizontal: 14, paddingBottom: 10 },
  alertChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: '#FEF5E4', borderWidth: 1, borderColor: '#F0C97A', flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertText: { fontFamily: F.bold, fontSize: 10, color: '#7A4F00' },
  barsWrap:  { paddingHorizontal: 14, paddingBottom: 12 },
  lockedBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border, padding: 8, paddingHorizontal: 14 },
  lockedText:{ fontFamily: F.regular, fontSize: 11, color: C.muted },
});

const sb = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  col: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  sessName: { fontFamily: F.semibold, fontSize: 9, color: C.deep },
  track: { height: 4, backgroundColor: C.bg, borderRadius: 2, overflow: 'hidden', marginBottom: 3, borderWidth: 1, borderColor: C.border },
  fill: { height: '100%', borderRadius: 2 },
  sessLabel: { fontFamily: F.regular, fontSize: 9, color: C.muted },
});

const sc = StyleSheet.create({
  wrap: { marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, shadowColor: C.deep, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  hero: { height: 108, justifyContent: 'flex-end', position: 'relative' },
  heroName: { position: 'relative', zIndex: 1, fontFamily: F.bold, fontSize: 13, color: '#fff', padding: 9, paddingRight: 42, paddingLeft: 12, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6, letterSpacing: -0.01, lineHeight: 17 },
  dragHandle: { position: 'absolute', right: 11, bottom: 9, zIndex: 2, width: 27, height: 27, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', gap: 3 },
  dragLine: { width: 13, height: 1.5, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 1 },
  reorderBtns: { position: 'absolute', right: 9, bottom: 7, zIndex: 2, flexDirection: 'row', gap: 4 },
  reorderBtn: { width: 27, height: 27, borderRadius: 8, backgroundColor: 'rgba(26,31,46,0.75)', alignItems: 'center', justifyContent: 'center' },
  reorderArrow: { fontSize: 13, color: '#fff', lineHeight: 17 },
  body: { padding: 9, paddingLeft: 12, paddingRight: 12, paddingBottom: 11 },
  tagsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 9 },
  tagMuted:   { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  tagMutedText: { fontFamily: F.bold, fontSize: 10, color: C.deep },
  tagTicket:  { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: '#FEECE9' },
  tagTicketText: { fontFamily: F.bold, fontSize: 10, color: '#C0392B' },
  tagFree:    { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: C.greenLt },
  tagFreeText:{ fontFamily: F.bold, fontSize: 10, color: '#1A6B3A' },
  tagAnchor:  { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: '#F0EBFF', borderWidth: 1, borderColor: '#D8CFEF' },
  tagAnchorText: { fontFamily: F.bold, fontSize: 10, color: '#5B3FA8' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 9 },
  detailsBtn: { backgroundColor: C.deep, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  detailsBtnText: { fontFamily: F.bold, fontSize: 12, color: '#fff' },
  swipeHint: { flexDirection: 'row', alignItems: 'center' },
  swipeHintText: { fontFamily: F.regular, fontSize: 10, color: C.muted },
  viewOnlyText: { fontFamily: F.regular, fontSize: 10, color: C.muted },
  revealRow: { width: 144, flexDirection: 'row' },
  revBtn: { width: 72, alignItems: 'center', justifyContent: 'center', gap: 5 },
  revLabel: { fontFamily: F.bold, fontSize: 10 },
  revReplace: { backgroundColor: '#EEF5F2' },
  revRemove:  { backgroundColor: C.redLt },
});

const meal = StyleSheet.create({
  card: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#A8D8BF', backgroundColor: C.greenLt, borderRadius: 14, padding: 10, paddingHorizontal: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  emoji: { fontSize: 22 },
  name: { fontFamily: F.bold, fontSize: 13, color: '#1B5E39' },
  sub:  { fontFamily: F.regular, fontSize: 10, color: C.sage, marginTop: 1 },
  addBtn: { backgroundColor: '#1B7D46', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7, flexShrink: 0 },
  addBtnText: { fontFamily: F.bold, fontSize: 11, color: '#fff' },
});

const dd = StyleSheet.create({
  header: {
    backgroundColor: C.card,
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  dayTitle: { fontFamily: F.bold, fontSize: 16, color: C.deep, letterSpacing: -0.01 },
  daySub:   { fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 2 },
  tabsRow: { flexDirection: 'row', gap: 5, paddingBottom: 12, paddingTop: 2 },
  tab: { paddingHorizontal: 13, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  tabOn:       { backgroundColor: C.deep, borderColor: C.deep },
  tabTodayOn:  { backgroundColor: C.orange, borderColor: C.orange },
  tabTodayOff: { borderColor: C.orange },
  tabPast:     { borderColor: C.border, backgroundColor: 'transparent' },
  tabText:       { fontFamily: F.bold, fontSize: 11, color: C.muted },
  tabTextOn:     { color: '#fff' },
  tabTextTodayOn:  { color: '#fff' },
  tabTextTodayOff: { color: C.orange },
  tabTextPast:   { color: 'rgba(138,143,168,0.5)' },
  body: { padding: 14, paddingTop: 14 },
  lockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: C.border, borderRadius: 12, padding: 12, paddingHorizontal: 14, marginBottom: 14 },
  lockedText: { fontFamily: F.regular, fontSize: 12, color: C.muted },
  bfg: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: C.amber, borderRadius: 12, padding: 12, paddingHorizontal: 14, marginBottom: 14 },
  bfgHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  bfgTitle: { fontFamily: F.bold, fontSize: 12, color: C.deep },
  bfgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1, borderTopColor: C.border },
  bfgDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.amber, marginRight: 7, flexShrink: 0 },
  bfgText: { fontFamily: F.regular, fontSize: 12, color: C.muted, flex: 1 },
  bfgAct:  { fontFamily: F.bold, fontSize: 11, color: C.orange, marginLeft: 8 },
  secLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 0.08, textTransform: 'uppercase', marginBottom: 9, marginTop: 4 },
  emptyDay: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontFamily: F.regular, fontSize: 13, color: C.muted },
  addStopBtn: { borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(232,105,42,0.45)', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  addStopText: { fontFamily: F.semibold, fontSize: 13, color: C.orange },
  footer: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  runBtn: { backgroundColor: C.orange, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 20, elevation: 6 },
  runBtnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  runSub: { fontFamily: F.regular, fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 6 },
});

const sds = StyleSheet.create({
  header: { padding: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  headerName: { fontFamily: F.bold, fontSize: 16, color: C.deep, letterSpacing: -0.01 },
  headerSub: { fontFamily: F.regular, fontSize: 12, color: C.muted, marginTop: 2, textTransform: 'capitalize' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  hero: { height: 148, justifyContent: 'flex-end' },
  heroName: { position: 'relative', zIndex: 1, fontFamily: F.bold, fontSize: 20, color: '#fff', padding: 13, paddingLeft: 18, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10, letterSpacing: -0.02 },
  bodyPad: { padding: 16, paddingHorizontal: 20 },
  whyCard: { backgroundColor: C.orangeLt, borderRadius: 12, padding: 12, paddingHorizontal: 14, marginBottom: 12 },
  whyLabel: { fontFamily: F.bold, fontSize: 9, color: C.orange, letterSpacing: 0.1, textTransform: 'uppercase', marginBottom: 5 },
  whyText: { fontFamily: F.regular, fontSize: 13, color: C.deep, lineHeight: 20 },
  timCard: { backgroundColor: C.greenLt, borderRadius: 12, padding: 10, paddingHorizontal: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  timMain: { fontFamily: F.bold, fontSize: 13, color: '#1B5E39' },
  timSub:  { fontFamily: F.regular, fontSize: 11, color: C.sage, marginTop: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 },
  chip: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4 },
  chipText: { fontFamily: F.semibold, fontSize: 11, color: C.deep },
  qaLabel: { fontFamily: F.bold, fontSize: 9, color: C.muted, letterSpacing: 0.09, textTransform: 'uppercase', marginBottom: 8 },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  qaBtn: { width: '48%', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 9, paddingHorizontal: 10 },
  qaBtnText: { fontFamily: F.semibold, fontSize: 11, color: C.deep, lineHeight: 16 },
  expToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, paddingHorizontal: 14, marginBottom: 14 },
  expToggleText: { fontFamily: F.semibold, fontSize: 13, color: C.deep },
  expArrow: { fontFamily: F.regular, fontSize: 11, color: C.muted },
  expContent: { marginBottom: 14 },
  expSecLabel: { fontFamily: F.bold, fontSize: 9, color: C.muted, letterSpacing: 0.09, textTransform: 'uppercase', marginBottom: 7 },
  expRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  expRl: { fontFamily: F.regular, fontSize: 12, color: C.muted },
  expRv: { fontFamily: F.semibold, fontSize: 12, color: C.deep },
  nearbyRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  nearbyIco: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nearbyName: { fontFamily: F.bold, fontSize: 12, color: C.deep },
  nearbyDist: { fontFamily: F.bold, fontSize: 10, color: C.orange, marginTop: 1 },
  mapsBtn: { backgroundColor: C.deep, borderRadius: 10, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  mapsBtnText: { fontFamily: F.bold, fontSize: 12, color: '#fff' },
  footer: { padding: 12, paddingHorizontal: 20, paddingBottom: 22, borderTopWidth: 1, borderTopColor: C.border, flexShrink: 0 },
  doneBtn: { backgroundColor: C.deep, borderRadius: 13, padding: 13, alignItems: 'center', marginBottom: 9 },
  doneBtnText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  footerRow: { flexDirection: 'row', gap: 8 },
  footerSecBtn: { flex: 1, borderWidth: 1, borderColor: C.borderMed, borderRadius: 12, padding: 11, alignItems: 'center' },
  footerSecText: { fontFamily: F.semibold, fontSize: 13, color: C.deep },
});

const rep = StyleSheet.create({
  swapHeader: { padding: 10, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  swapOut: { fontFamily: F.bold, fontSize: 11, color: C.muted, letterSpacing: 0.06, textTransform: 'uppercase', marginBottom: 4 },
  swapName: { fontFamily: F.bold, fontSize: 20, color: C.deep, letterSpacing: -0.02, textDecorationLine: 'line-through', textDecorationColor: C.orange },
  filterWrap: { borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 12, paddingHorizontal: 20, gap: 10 },
  chipsRow: { gap: 6, paddingBottom: 2 },
  fchip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  fchipOn: { backgroundColor: C.orange, borderColor: C.orange },
  fchipText: { fontFamily: F.bold, fontSize: 12, color: C.muted },
  fchipTextOn: { color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontFamily: F.regular, fontSize: 13, color: C.deep },
  secLabel: { fontFamily: F.bold, fontSize: 9, color: C.muted, letterSpacing: 0.09, textTransform: 'uppercase', marginBottom: 8 },
  otherDayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  otherDayIco: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  otherDayName: { fontFamily: F.bold, fontSize: 13, color: C.deep },
  otherDayMeta: { fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 1 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  skeleton: { height: 100, backgroundColor: C.bg, borderRadius: 14, marginBottom: 9 },
  altCard: { backgroundColor: C.bg, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 9 },
  altName: { fontFamily: F.bold, fontSize: 14, color: C.deep, marginBottom: 6, letterSpacing: -0.01 },
  altTagsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 7 },
  altTag:  { backgroundColor: C.greenLt, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  altTagText: { fontFamily: F.bold, fontSize: 10, color: '#1A6B3A' },
  altTagN: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  altTagNText: { fontFamily: F.bold, fontSize: 10, color: C.muted },
  altDesc: { fontFamily: F.regular, fontSize: 12, color: C.muted, lineHeight: 18, marginBottom: 10 },
  useBtn: { backgroundColor: C.orange, borderRadius: 10, padding: 10, alignItems: 'center' },
  useBtnText: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  removeBtn: { borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(232,105,42,0.3)', borderRadius: 12, padding: 11, alignItems: 'center', marginTop: 4, marginBottom: 16 },
  removeBtnText: { fontFamily: F.regular, fontSize: 12, color: C.muted },
});

const rds = StyleSheet.create({
  header: { padding: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontFamily: F.bold, fontSize: 16, color: C.deep, letterSpacing: -0.01 },
  sub:   { fontFamily: F.regular, fontSize: 12, color: C.muted },
  body:  { padding: 16, paddingHorizontal: 20, paddingBottom: 8 },
  modeCard: { borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 13, paddingHorizontal: 14, marginBottom: 8 },
  modeCardSel:    { borderColor: C.orange, backgroundColor: C.orangeLt },
  modeCardEasier: { borderColor: C.green,  backgroundColor: C.greenLt },
  modeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modeName: { fontFamily: F.bold, fontSize: 14, color: C.deep, letterSpacing: -0.01 },
  modeBadge:       { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: C.bg },
  modeBadgeSel:    { backgroundColor: C.orangeLt },
  modeBadgeEasier: { backgroundColor: C.greenLt },
  modeBadgeText:       { fontFamily: F.bold, fontSize: 10, color: C.muted },
  modeBadgeSelText:    { color: C.orange },
  modeBadgeEasierText: { color: '#1A6B3A' },
  modeDesc: { fontFamily: F.regular, fontSize: 12, color: C.muted, lineHeight: 17 },
  consequence: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 14 },
  conHeader: { padding: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  conTitle: { fontFamily: F.bold, fontSize: 13, color: C.deep, marginBottom: 2 },
  conSub:   { fontFamily: F.regular, fontSize: 11, color: C.muted },
  conRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, paddingHorizontal: 14 },
  conIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  conIconDrop: { backgroundColor: C.redLt },
  conIconKeep: { backgroundColor: C.greenLt },
  conName:   { fontFamily: F.bold, fontSize: 13, color: C.deep },
  conReason: { fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 16 },
  anchorBadge: { alignSelf: 'flex-start', backgroundColor: C.greenLt, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, marginTop: 3 },
  anchorBadgeText: { fontFamily: F.bold, fontSize: 9, color: '#1A6B3A' },
  timeSave: { backgroundColor: C.greenLt, borderRadius: 10, padding: 9, paddingHorizontal: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#B8DCC8' },
  timeSaveText: { fontFamily: F.semibold, fontSize: 13, color: '#1B5E39' },
  planBox: { backgroundColor: C.bg, borderRadius: 12, padding: 12, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  planLabel: { fontFamily: F.bold, fontSize: 9, color: C.muted, letterSpacing: 0.09, textTransform: 'uppercase', marginBottom: 7 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: C.border },
  planDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  planRowText: { fontFamily: F.regular, fontSize: 12, color: C.deep },
  footer: { padding: 12, paddingHorizontal: 20, paddingBottom: 22, borderTopWidth: 1, borderTopColor: C.border, flexShrink: 0 },
  startBtn: { backgroundColor: C.orange, borderRadius: 13, padding: 14, alignItems: 'center', marginBottom: 6, shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 20, elevation: 6 },
  startBtnText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  keepBtn: { backgroundColor: C.bg, borderRadius: 13, padding: 13, alignItems: 'center', marginBottom: 6 },
  keepBtnText: { fontFamily: F.regular, fontSize: 14, color: C.muted },
  startSub: { fontFamily: F.regular, fontSize: 10, color: C.muted, textAlign: 'center' },
});

const opts = StyleSheet.create({
  header: { padding: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  title:    { fontFamily: F.bold, fontSize: 16, color: C.deep, flex: 1 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  secLabel: { fontFamily: F.bold, fontSize: 9, color: C.muted, letterSpacing: 0.1, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  ico:  { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemName: { fontFamily: F.bold, fontSize: 13, color: C.deep },
  itemSub:  { fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 1 },
});

const cds = StyleSheet.create({
  header: { padding: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  title: { fontFamily: F.bold, fontSize: 16, color: C.deep },
  sub:   { fontFamily: F.regular, fontSize: 12, color: C.muted },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  toggle: { flexDirection: 'row', backgroundColor: C.bg, margin: 16, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: C.border },
  tb: { flex: 1, padding: 7, borderRadius: 9, alignItems: 'center' },
  tbOn: { backgroundColor: C.card, shadowColor: C.deep, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  tbText:   { fontFamily: F.bold, fontSize: 12, color: C.muted },
  tbTextOn: { color: C.deep },
  statusBanner: { backgroundColor: C.greenLt, borderRadius: 12, padding: 11, paddingHorizontal: 13, marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#B8DCC8' },
  statusText: { fontFamily: F.semibold, fontSize: 13, color: '#1B5E39' },
  body: { padding: 16, paddingTop: 0 },
  dayCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 9 },
  dayTop:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, paddingBottom: 10 },
  dayNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dayNumText:  { fontFamily: F.bold, fontSize: 12, color: C.deep },
  dayTheme:    { fontFamily: F.bold, fontSize: 13, color: C.deep, flex: 1, letterSpacing: -0.01 },
  dayBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, flexShrink: 0 },
  dayBadgeText:{ fontFamily: F.bold, fontSize: 10, color: C.muted },
  dayMeta: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 10, flexWrap: 'wrap' },
  metaItem: { fontFamily: F.regular, fontSize: 11, color: C.muted },
});

const root = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { fontFamily: F.regular, fontSize: 14, color: C.muted, marginTop: 12 },
  errorTitle: { fontFamily: F.bold, fontSize: 18, color: C.deep, marginBottom: 8 },
  errorSub:   { fontFamily: F.regular, fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24 },
  retryBtn:   { backgroundColor: C.orange, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText:  { fontFamily: F.bold, fontSize: 14, color: '#fff' },
});
