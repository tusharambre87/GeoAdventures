import { formatOpenStatus } from '@/lib/formatOpenStatus';
/**
 * RoamUs — Trip Plan Screen v2
 * Visual ref: roamus-trip-plan-v5.html
 * Brief: ROAMUS_TRIP_PLAN_REPLIT_BRIEF_v2.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useFonts as useFrauncesFonts, Fraunces_900Black } from "@expo-google-fonts/fraunces";
import { TouchableOpacity as GHTouchable } from "react-native-gesture-handler";
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

import { travelAPI } from "@/lib/apiClient";
import { API_BASE, useAuth } from "@/lib/authContext";
import { isFreePlan } from "@/lib/subscription";
import UpgradeSheet, { type UpgradeContext } from "@/components/UpgradeSheet";
import { F } from "@/lib/tokens";
import ChecklistSheet, { loadChecklistCounts } from "@/components/ChecklistSheet";
import TripPreferencesSheet from "@/components/TripPreferencesSheet";
import TripDateEditorSheet from "@/components/TripDateEditorSheet";
import TripPlanStopSheet from "@/components/TripPlanStopSheet";
import CommunityShareSheet from "@/components/CommunityShareSheet";
import { preCacheTrip } from "@/lib/tripCache";

const TAB_BAR_H = 49;

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
  travelMinsFromPrevious?: number | null;
  metadata?: StopMetadata | null;
  stopMissions?: Array<{
    type: string;
    question: string;
    options?: string[];
    xpReward: number;
    completed: boolean;
  }> | null;
  kidFitBias?: string | null;
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
type ActiveSheet = 'none' | 'stopDetail' | 'replace' | 'runDay' | 'options' | 'compare' | 'addStop' | 'preferences' | 'dateEditor';
type DayStatus = 'past' | 'today' | 'future';

type StopOption = {
  id?: string;
  name: string;
  address?: string;
  type?: string;
  stopType?: string;
  duration?: string;
  durationMinutes?: number;
  estimatedDurationMinutes?: number;
  distance?: string;
  icon?: string;
  description?: string;
  priceRange?: string;
  tags?: string[];
};

// ─── Helper functions ─────────────────────────────────────────────────────────

const MEAL_TYPES = new Set(['restaurant', 'food', 'cafe', 'market', 'meal', 'street_food', 'diner', 'eatery']);
const TICKET_TYPES = new Set(['museum', 'zoo', 'aquarium', 'palace', 'castle', 'theater', 'theatre', 'observatory', 'observation_deck', 'theme_park', 'science_museum', 'childrens_museum', 'art_museum', 'history_museum', 'planetarium', 'water_park', 'amusement_park']);

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
  return 'Adventure';
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

const KID_FIT_POSITIVE = ['high', 'toddler', 'all_ages'];
function getKidFitScore(stops: Stop[]): number {
  return stops.filter(s => KID_FIT_POSITIVE.includes(((s as any).kidFitBias ?? (s as any).kid_fit_bias ?? '').toLowerCase())).length;
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
  if (t.includes('zoo') || t.includes('wildlife') || t.includes('aquarium')) return '\uD83E\uDD81';
  if (t.includes('museum') || t.includes('art') || t.includes('gallery'))   return '\uD83C\uDFDB\uFE0F';
  if (t.includes('park') || t.includes('nature') || t.includes('garden'))   return '\uD83C\uDF33';
  if (t.includes('shopping') || t.includes('mall'))                          return '\uD83D\uDECD\uFE0F';
  if (t.includes('landmark') || t.includes('monument'))                      return '\uD83C\uDF09';
  if (t.includes('restaurant') || t.includes('food') || t.includes('cafe')) return '\uD83C\uDF7D\uFE0F';
  return '\uD83D\uDCCD';
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

function IconCalendar({ size = 17, color = '#4F7BE8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
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

function IconArchive({ size = 17, color = C.muted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="3" width="20" height="5" rx="1" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 12h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
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

const KID_FIT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  high:     { label: '\u2B50 Great for kids',      bg: '#E8F7EF', color: '#3DAA6E' },
  medium:   { label: '\uD83D\uDC4D Kid friendly',     bg: '#FDF0E9', color: '#E8692A' },
  low:      { label: '\uD83D\uDC40 Check age fit',    bg: '#FFFBEB', color: '#D97706' },
  toddler:  { label: '\uD83E\uDDF8 Toddler friendly', bg: '#E8F7EF', color: '#3DAA6E' },
  all_ages: { label: '\uD83D\uDC6A All ages',         bg: '#F5F3FF', color: '#7C3AED' },
};

function KidFitTag({ bias }: { bias: string | null | undefined }) {
  if (!bias) return null;
  const normalized = bias.toLowerCase().replace(/[\s-]/g, '_');
  const match = KID_FIT_CONFIG[normalized];
  if (!match) return null;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: match.bg, borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: match.color }}>{match.label}</Text>
    </View>
  );
}

function StopCard({
  stop,
  isEditable,
  isAnchor,
  tripId,
  onDetails,
  onReplace,
  onDelete,
  drag,
  isActive,
}: {
  stop: Stop;
  isEditable: boolean;
  isAnchor: boolean;
  tripId: string;
  onDetails: (s: Stop) => void;
  onReplace: (s: Stop) => void;
  onDelete: (stopId: string) => Promise<void>;
  drag?: () => void;
  isActive?: boolean;
}) {
  const heroImg  = useStopHeroImage(stop.id);
  const heroBg   = stopHeroBg(stop.stopType);
  const ticket   = needsTicket(stop);
  const duration = getStopDuration(stop);

  // actionRow lives outside the card so long-press drag is never blocked
  const actionRow = (
    <View style={sc.actionRow}>
      <Pressable
        style={sc.detailsBtn}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onDetails(stop);
        }}
      >
        <Text style={sc.detailsBtnText}>Details →</Text>
      </Pressable>
      {!isEditable && <Text style={sc.viewOnlyText}>View only</Text>}
    </View>
  );

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
        {isEditable && drag && (
          <GHTouchable style={sc.dragHandle} onLongPress={drag} delayLongPress={200}>
            <View style={sc.dragLine} />
            <View style={sc.dragLine} />
            <View style={sc.dragLine} />
          </GHTouchable>
        )}
      </View>

      {/* Body */}
      <View style={sc.body}>
        <KidFitTag bias={stop.kidFitBias ?? (stop as any).kid_fit_bias ?? null} />
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
              <Text style={sc.tagAnchorText}>Kid friendly</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (!isEditable) {
    return <View style={sc.wrap}>{card}{actionRow}</View>;
  }

  return (
    <View style={sc.wrap}>
      {card}
      {actionRow}
    </View>
  );
}

// ─── MealCard ─────────────────────────────────────────────────────────────────

function MealCard({ stop }: { stop: Stop }) {
  const emoji = stop.stopType?.toLowerCase().includes('cafe') ? '\u2615' : '\uD83C\uDF55';
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

// ─── Spend estimate helpers ────────────────────────────────────────────────────────

const CITY_TIER: Record<string, 'tier1' | 'tier2' | 'tier3'> = {
  'New York': 'tier1', 'San Francisco': 'tier1', 'Chicago': 'tier1',
  'Los Angeles': 'tier1', 'Boston': 'tier2', 'Seattle': 'tier2',
  'Washington DC': 'tier2', 'Miami': 'tier2', 'Austin': 'tier2',
};
const ADMISSION_COST: Record<string, number> = {
  museum: 22, aquarium: 28, childrens_museum: 18, science_museum: 24,
  art_museum: 20, zoo: 25, theme_park: 45, observation_deck: 35,
  theater: 30, planetarium: 20,
  park: 0, landmark: 0, market: 0, beach: 0, trail: 0,
};
const FOOD_PER_PERSON: Record<string, { min: number; max: number }> = {
  tier1: { min: 18, max: 28 },
  tier2: { min: 14, max: 22 },
  tier3: { min: 11, max: 17 },
};
const TRANSPORT_PER_STOP: Record<string, number> = {
  tier1: 12, tier2: 9, tier3: 6,
};
const SNACK_PER_PERSON: Record<string, number> = {
  tier1: 8, tier2: 6, tier3: 4,
};
function computeDaySpend(stops: Stop[], destination: string, familySize: number) {
  const tier = (CITY_TIER[destination] ?? 'tier3') as 'tier1' | 'tier2' | 'tier3';
  const admission = stops.reduce((sum, s) => sum + (ADMISSION_COST[s.stopType ?? ''] ?? 0) * familySize, 0);
  const food = FOOD_PER_PERSON[tier];
  const foodMin = food.min * familySize;
  const foodMax = food.max * familySize;
  const snacks = SNACK_PER_PERSON[tier] * familySize;
  const transport = TRANSPORT_PER_STOP[tier] * Math.max(stops.length - 1, 1);
  return { admission, foodMin, foodMax, snacks, transport,
    totalMin: admission + foodMin + snacks + transport,
    totalMax: admission + foodMax + snacks + transport };
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
  onOpenChecklist,
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
  onOpenChecklist: () => void;
}) {
  const insets = useSafeAreaInsets();
  const totalTickets  = stops.filter(s => needsTicket(s)).length;
  const booked        = stops.filter(s => s.journeyPackCompleted).length;
  const travelerCount = trip.travelers?.length ?? 0;
  const dateRange     = formatDateRange(trip.startDate, trip.endDate);

  const [clCounts, setClCounts] = useState<{ checked: number; total: number } | null>(null);

  useEffect(() => {
    loadChecklistCounts(trip.id, stops).then(setClCounts);
  }, [trip.id]);

  const firstStop = [...stops]
    .sort((a, b) => {
      const di = (a.dayIndex ?? 0) - (b.dayIndex ?? 0);
      return di !== 0 ? di : (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    })[0];
  const hideChecklist = false;

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
        contentContainerStyle={[ov.body, { paddingBottom: insets.bottom + 120 + TAB_BAR_H }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Before you go — checklist entry row */}
        {clCounts !== null && (
          <Pressable
            style={cl.row}
            onPress={onOpenChecklist}
          >
            <View style={cl.rowLeft}>
              <Text style={cl.rowTitle}>Before you go</Text>
              <Text style={cl.rowSub}>
                {clCounts.checked} of {clCounts.total} done{'\u00a0\u00b7\u00a0'}Tap to open
              </Text>
            </View>
            <View
              style={[
                cl.badge,
                clCounts.checked === clCounts.total && clCounts.total > 0
                  ? cl.badgeDone
                  : cl.badgePending,
              ]}
            >
              <Text
                style={[
                  cl.badgeText,
                  clCounts.checked === clCounts.total && clCounts.total > 0
                    ? cl.badgeTextDone
                    : cl.badgeTextPending,
                ]}
              >
                {clCounts.checked === clCounts.total && clCounts.total > 0
                  ? 'All done \u2713'
                  : `${clCounts.total - clCounts.checked} left`}
              </Text>
            </View>
          </Pressable>
        )}

        {Array.from({ length: totalDays }, (_, i) => i + 1)
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
        <View style={[ov.footer, { paddingBottom: TAB_BAR_H + insets.bottom + 12 }]}>
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
  activeTripDay,
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
  onAddStop,
  isFree,
  onShowUpgrade,
}: {
  trip: TripData;
  stops: Stop[];
  totalDays: number;
  selectedDay: number;
  activeTripDay: number;
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
  onAddStop: (filter?: 'food' | 'kids' | 'landmarks') => void;
  isFree?: boolean;
  onShowUpgrade?: () => void;
}) {
  const insets   = useSafeAreaInsets();
  const status   = getDayStatus(selectedDay);
  const isEditable = status !== 'past';

  // Run Day button — tracks the currently selected day pill
  const activeDayIndex   = activeTripDay - 1;
  const selectedDayStops = getStopsForDay(selectedDay);
  const isDayComplete    = selectedDayStops.length > 0 &&
    selectedDayStops.every(s => s.isVisited || s.visited);
  const isViewingPast    = selectedDay - 1 < activeDayIndex;
  const runBtnDisabled   = isViewingPast || isDayComplete;
  const dayStops = getStopsForDay(selectedDay);
  const anchor   = getAnchorStopForDay(selectedDay);
  const theme    = dayTheme(dayStops);
  const tickets  = getTicketCount(dayStops);
  const noLunch  = !hasLunchStop(dayStops);
  const totalMin = dayStops.reduce((s, st) => s + getStopDuration(st), 0);
  const hrs      = (totalMin / 60).toFixed(1).replace('.0', '');
  const dateStr  = trip.startDate ? formatDate(trip.startDate, selectedDay - 1) : null;
  const stopCount = dayStops.length;
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);

  const contentStops = dayStops.filter(s => !isMealStop(s.stopType));
  const mealStops    = dayStops.filter(s => isMealStop(s.stopType));
  const queryClient  = useQueryClient();
  const contentKey   = contentStops.map(s => s.id + (s.displayOrder ?? 0)).join(',');
  const [localContentStops, setLocalContentStops] = useState<Stop[]>(contentStops);
  useEffect(() => { setLocalContentStops(contentStops); }, [contentKey]);

  const [weatherWarning, setWeatherWarning] = useState<{
    precipProb: number;
    impactedStops: string[];
  } | null>(null);

  useEffect(() => {
    const checkWeather = async () => {
      try {
        const data = await apiFetch<{
          isRainy: boolean;
          precipProb: number;
          impactedStops: Array<{ name: string } | string>;
        }>(`/api/travel/trips/${trip.id}/weather-check?dayIndex=${selectedDay}`);
        if (data.isRainy && data.impactedStops?.length > 0) {
          setWeatherWarning({
            precipProb: data.precipProb,
            impactedStops: data.impactedStops.map(s =>
              typeof s === 'string' ? s : s.name
            ),
          });
        } else {
          setWeatherWarning(null);
        }
      } catch {}
    };
    checkWeather();
  }, [selectedDay, trip.id]);

  async function handleDragEnd({ data }: { data: Stop[] }) {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prev = localContentStops;
    setLocalContentStops(data);
    const stopOrders = data.map((s, i) => ({ stopId: s.id, displayOrder: i, dayIndex: s.dayIndex ?? 0 }));
    try {
      await apiFetch(`/api/travel/trips/${tripId}/reorder-stops`, {
        method: 'PATCH',
        body: JSON.stringify({ stopOrders }),
      });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    } catch {
      setLocalContentStops(prev);
    }
  }

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
                  {isPast && !isOn ? `\u2713 Day ${d}` : `Day ${d}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Body */}
      <ScrollView
        contentContainerStyle={[dd.body, { paddingBottom: insets.bottom + (isEditable ? 100 : 20) + TAB_BAR_H }]}
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

        {/* Weather warning banner */}
        {weatherWarning && (
          <View style={ww.banner}>
            <Text style={ww.icon}>{'\uD83C\uDF27'}</Text>
            <View style={ww.body}>
              <Text style={ww.title}>
                {'Rain expected \u2014 '}{weatherWarning.precipProb}{'% chance'}
              </Text>
              <Text style={ww.sub}>
                {weatherWarning.impactedStops.length}{' outdoor stop'}
                {weatherWarning.impactedStops.length !== 1 ? 's' : ''}{' may be affected: '}
                {weatherWarning.impactedStops.slice(0, 2).join(', ')}
                {weatherWarning.impactedStops.length > 2
                  ? (' +' + (weatherWarning.impactedStops.length - 2) + ' more')
                  : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Spend estimate card */}
        {dayStops.length > 0 && (() => {
          const familySize = trip.travelers?.length ?? 4;
          const dest = trip.destination ?? '';
          const spend = computeDaySpend(dayStops, dest, familySize);
          return (
            <View style={sp.card}>
              <View style={sp.header}>
                <View>
                  <Text style={sp.label}>ESTIMATED SPEND TODAY</Text>
                  <Text style={sp.range}>${spend.totalMin}–${spend.totalMax}</Text>
                </View>
              </View>
              <View style={sp.buckets}>
                <View style={sp.bucket}>
                  <Text style={sp.bucketIco}>{'\uD83C\uDFAB'}</Text>
                  <Text style={sp.bucketLbl} numberOfLines={1}>Entry</Text>
                  <Text style={sp.bucketVal}>${spend.admission}</Text>
                </View>
                <View style={sp.bucket}>
                  <Text style={sp.bucketIco}>{'\uD83C\uDF54'}</Text>
                  <Text style={sp.bucketLbl} numberOfLines={1}>Food</Text>
                  <Text style={sp.bucketVal}>${spend.foodMin}–${spend.foodMax}</Text>
                </View>
                <View style={sp.bucket}>
                  <Text style={sp.bucketIco}>{'\uD83C\uDF6D'}</Text>
                  <Text style={sp.bucketLbl} numberOfLines={1}>Snacks</Text>
                  <Text style={sp.bucketVal}>${spend.snacks}</Text>
                </View>
                <View style={sp.bucket}>
                  <Text style={sp.bucketIco}>{'\uD83D\uDE97'}</Text>
                  <Text style={sp.bucketLbl} numberOfLines={1}>Travel</Text>
                  <Text style={sp.bucketVal}>~${spend.transport}</Text>
                </View>
              </View>
              <Text style={sp.note}>
                {`Estimates for ${familySize} · ${dest || 'your destination'} pricing · Costs may vary`}
              </Text>
            </View>
          );
        })()}

        {/* Stop cards — draggable; meal cards splice in after first content stop */}
        <DraggableFlatList
          data={localContentStops}
          keyExtractor={s => s.id}
          scrollEnabled={false}
          onDragEnd={handleDragEnd}
          renderItem={({ item: stop, drag, isActive, getIndex }: RenderItemParams<Stop>) => {
            const i      = getIndex() ?? 0;
            const isLast = i === localContentStops.length - 1;
            return (
              <ScaleDecorator activeScale={0.97}>
                <StopCard
                  stop={stop}
                  isEditable={isEditable}
                  isAnchor={anchor?.id === stop.id}
                  tripId={tripId}
                  onDetails={onStopDetails}
                  onReplace={onReplaceStop}
                  onDelete={onDelete}
                  drag={isEditable ? drag : undefined}
                  isActive={isActive}
                />
                {i === 0 && mealStops.map(ms => (
                  <MealCard key={ms.id} stop={ms} />
                ))}
                {!isLast && (
                  <TravelConnector travelMins={localContentStops[i + 1]?.travelMinsFromPrevious} />
                )}
              </ScaleDecorator>
            );
          }}
        />
        {/* Meal cards for days with no content stops */}
        {localContentStops.length === 0 && mealStops.map(stop => (
          <MealCard key={stop.id} stop={stop} />
        ))}

        {/* Empty day */}
        {dayStops.length === 0 && (
          <View style={dd.emptyCard}>
            <View style={dd.emptyIconWrap}>
              <Text style={{ fontSize: 26 }}>{'\uD83D\uDDFA\uFE0F'}</Text>
            </View>
            <Text style={dd.emptyCardTitle}>Nothing planned for Day {selectedDay} yet</Text>
            <Text style={dd.emptyCardSub}>
              {isEditable
                ? 'Add stops and we\u2019ll build a full guide — hours, tips, and what to expect.'
                : 'This day has no stops in the itinerary.'}
            </Text>
            {isEditable && (
              <>
                <Pressable style={dd.emptyCardBtn} onPress={() => onAddStop()}>
                  <Text style={dd.emptyCardBtnTxt}>+ Plan this day</Text>
                </Pressable>
                <Text style={dd.emptyQuickLabel}>QUICK ADD</Text>
                <View style={dd.emptyChipRow}>
                  {([
                    { emoji: '\uD83C\uDF54', label: 'Lunch' },
                    { emoji: '\uD83C\uDFDB\uFE0F', label: 'Museum' },
                    { emoji: '\uD83C\uDF3F', label: 'Park' },
                    { emoji: '\uD83C\uDF66', label: 'Treat stop' },
                  ] as { emoji: string; label: string }[]).map(chip => (
                    <Pressable key={chip.label} style={dd.emptyChip} onPress={() => {
                      const filterMap: Record<string, 'food' | 'kids' | 'landmarks'> = {
                        'Lunch': 'food', 'Museum': 'landmarks', 'Park': 'landmarks', 'Treat stop': 'food',
                      };
                      onAddStop(filterMap[chip.label] ?? 'food');
                    }}>
                      <Text style={{ fontSize: 14 }}>{chip.emoji}</Text>
                      <Text style={dd.emptyChipTxt}>{chip.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Add a stop — editable, only when stops already exist */}
        {isEditable && dayStops.length > 0 && (
          <Pressable style={dd.addStopBtn} onPress={() => onAddStop()}>
            <IconPlus />
            <Text style={dd.addStopText}> Add a stop</Text>
          </Pressable>
        )}

        <Text style={{ fontSize: 11, color: '#B0ADA8', textAlign: 'center', paddingHorizontal: 24, paddingTop: 16, lineHeight: 16 }}>
          Hours and prices may vary — always verify before visiting.
        </Text>
      </ScrollView>


      {/* Footer — show for the selected day */}
      {selectedDayStops.length > 0 && (
        <View style={[dd.footer, { paddingBottom: TAB_BAR_H + insets.bottom + 12 }]}>
          <Pressable
            style={[dd.runBtn, runBtnDisabled && dd.runBtnDone]}
            onPress={runBtnDisabled ? undefined : onRunDay}
            disabled={runBtnDisabled}>
            {isDayComplete
              ? <Text style={[dd.runBtnText, dd.runBtnTextDone]}>{'\u2713'} Day {selectedDay} Complete</Text>
              : <><IconPlay /><Text style={dd.runBtnText}>{'  '}Run Day {selectedDay}</Text></>}
          </Pressable>
          {!isDayComplete && (
            <Text style={dd.runSub}>Switches to Today tab — live mode</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── TravelConnector ──────────────────────────────────────────────────────────

function TravelConnector({ travelMins }: { travelMins?: number | null }) {
  if (!travelMins) return null;
  const isLong = travelMins > 20;
  return (
    <View style={tc.row}>
      <View style={tc.line} />
      <Text style={[tc.label, isLong && tc.labelAmber]}>
        {'\uD83D\uDE97'} {travelMins} min drive
      </Text>
      <View style={tc.line} />
    </View>
  );
}

const tc = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 4 },
  line:       { flex: 1, height: 1, backgroundColor: C.border },
  label:      { fontFamily: F.medium, fontSize: 12, color: C.muted, marginHorizontal: 8 },
  labelAmber: { color: C.amber },
});

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
  const insets  = useSafeAreaInsets();

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

  const parking   = enrichment?.parkingNotes ?? '—';
  const restrooms = meta?.restroomConfidence ?? '—';
  const bestTime  = enrichment?.bestTimeOfDay ?? '—';
  const openStatus = formatOpenStatus((stop as any).openingHours ?? (stop as any).placeReferenceData?.openingHours);
  const waitTime  = waitTimeForType(stop.stopType) ?? '—';
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
          {/* WhyCard — only shown when real enrichment text exists */}
          {enrichment?.whyNow ? (
            <View style={sds.whyCard}>
              <Text style={sds.whyLabel}>WHY THIS STOP WORKS</Text>
              <Text style={sds.whyText}>{enrichment.whyNow}</Text>
            </View>
          ) : null}

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
            {openStatus ? (
              <View style={[sds.chip, { borderColor: openStatus.color }]}>
                <Text style={[sds.chipText, { color: openStatus.color }]}>{openStatus.label}</Text>
              </View>
            ) : null}
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
                        <Text style={{ fontSize: 15 }}>{'\uD83C\uDF7D\uFE0F'}</Text>
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
      <View style={[sds.footer, { paddingBottom: TAB_BAR_H + insets.bottom + 12 }]}>
        <Pressable style={sds.doneBtn} onPress={onClose}>
          <Text style={sds.doneBtnText}>
            {isEditable ? 'Done planning this stop' : 'Done viewing this stop'}
          </Text>
        </Pressable>
        {isEditable && (
          <>
            <View style={sds.footerRow}>
              <Pressable style={sds.footerSecBtn} onPress={() => { onClose(); onReplace(stop); }}>
                <Text style={sds.footerSecText}>Replace</Text>
              </Pressable>
              <Pressable style={sds.footerSecBtn} onPress={openMaps}>
                <Text style={sds.footerSecText}>Open in Maps</Text>
              </Pressable>
            </View>
            <Pressable
              style={sds.removeBtn}
              onPress={() => { onDelete(stop.id); onClose(); }}
            >
              <Text style={sds.removeBtnText}>Remove this stop</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

// ─── ReplaceSheet ─────────────────────────────────────────────────────────────

const REPLACE_CHIPS = ['All', 'Same Vibe', 'Shorter', 'Easier', 'Indoor', 'More Active'] as const;
type ReplaceChip = typeof REPLACE_CHIPS[number];

type SuggestionItem = {
  id: string;
  name: string;
  stopType?: string;
  description?: string;
  duration?: string;
  durationMinutes?: number;
  filterGroup?: string;
};

function chipToFilterGroup(c: ReplaceChip): string | null {
  if (c === 'All')         return null;
  if (c === 'Same Vibe')   return 'sameVibe';
  if (c === 'Shorter')     return 'shorter';
  if (c === 'Easier')      return 'easier';
  if (c === 'Indoor')      return 'indoor';
  if (c === 'More Active') return 'moreActive';
  return null;
}

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
  const [chip, setChip]             = useState<ReplaceChip>('All');
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [allSugs, setAllSugs]       = useState<SuggestionItem[]>([]);
  const sugsCache = useRef<Map<string, SuggestionItem[]>>(new Map());

  const queryClient = useQueryClient();

  async function loadSuggestions(stopId: string) {
    const cached = sugsCache.current.get(stopId);
    if (cached) { setAllSugs(cached); return; }
    setLoading(true);
    try {
      const res = await apiFetch<{ suggestions: SuggestionItem[] }>(
        `/api/travel/stops/${stopId}/replace-suggestions`,
        { method: 'POST' }
      );
      const result = res.suggestions ?? [];
      sugsCache.current.set(stopId, result);
      setAllSugs(result);
    } catch {
      setAllSugs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!stop) return;
    setChip('All');
    setSearch('');
    loadSuggestions(stop.id);
  }, [stop?.id]);

  const existingNames = useMemo(
    () => new Set(allStops.map(s => s.name?.toLowerCase().trim())),
    [allStops]
  );

  const alts = useMemo(() => {
    const filterGroup = chipToFilterGroup(chip);
    let result = filterGroup
      ? allSugs.filter(s => s.filterGroup === filterGroup)
      : allSugs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q));
    }
    return result.filter(a => !existingNames.has(a.name?.toLowerCase().trim())).slice(0, 8);
  }, [allSugs, chip, search, existingNames]);

  function onSearchChange(text: string) {
    setSearch(text);
  }

  if (!stop) return null;

  const otherDayStops = allStops
    .filter(s => s.id !== stop.id && s.dayIndex !== stop.dayIndex && !isMealStop(s.stopType))
    .filter(s => search.trim() === '' || s.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 5);

  async function useAlt(alt: typeof alts[0]) {
    if (!stop) return;
    const replacedStop = stop;
    try {
      await apiFetch(`/api/travel/trips/${tripId}/stops/${replacedStop.id}/replace`, {
        method: 'POST',
        body: JSON.stringify({
          name: alt.name,
          stopType: alt.stopType ?? 'landmark',
          durationMinutes: alt.durationMinutes ?? 60,
        }),
      });
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
            No alternatives found
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
                {(alt.duration || alt.durationMinutes) && (
                  <View style={rep.altTagN}>
                    <Text style={rep.altTagNText}>{alt.duration ?? `${alt.durationMinutes} min`}</Text>
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
  onStopsUpdated,
  onNavigateToDay,
  queryClient,
}: {
  selectedDay: number;
  dayStops: Stop[];
  tripId: string;
  runMode: RunMode;
  onModeChange: (m: RunMode) => void;
  onClose: () => void;
  onStopsUpdated: (stops: Stop[]) => void;
  onNavigateToDay: (day: number) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [applying, setApplying] = useState(false);
  const insets  = useSafeAreaInsets();
  const anchor  = getAnchorStop(dayStops);
  const dropSt  = getDropStop(dayStops);
  const keptStops = dayStops.filter(s => s.id !== dropSt?.id);
  const dropMin   = dropSt ? getStopDuration(dropSt) : 0;
  const kfBalanced = getKidFitScore(dayStops);
  const kfEasier   = getKidFitScore(keptStops);
  const kfFaster   = getKidFitScore(dayStops);
  const kfMax = Math.max(kfBalanced, kfEasier, kfFaster);
  const kidBestMode: RunMode | null = kfMax > 0
    ? (kfBalanced === kfMax ? 'balanced' : kfEasier === kfMax ? 'easier' : 'faster')
    : null;
  const totalMin  = dayStops.reduce((s, st) => s + getStopDuration(st), 0);

  const singleStop = dayStops.length <= 1;
  const MODES: Array<{ key: RunMode; name: string; badge: string; desc: string }> = [
    { key: 'balanced', name: 'Balanced', badge: 'Recommended', desc: 'All stops as planned. Works best when everyone is rested and ready.' },
    ...(!singleStop ? [{ key: 'faster' as RunMode,  name: 'Faster',  badge: 'Tighter',  desc: "Cuts travel buffer between stops. Good when you're starting late." }] : []),
    ...(!singleStop ? [{ key: 'easier' as RunMode,  name: 'Easier',  badge: 'Lighter',  desc: 'Removes the lowest-priority stop. Best when kids need more breathing room.' }] : []),
  ];

  async function applyEasier() {
    setApplying(true);
    try {
      const data = await apiFetch<{ applied?: string[]; stops?: Stop[] }>(
        `/api/travel/trips/${tripId}/apply-preferences`,
        { method: 'POST', body: JSON.stringify({ pace: 'relaxed' }) },
      );
      if (Array.isArray(data.stops)) {
        onStopsUpdated(data.stops);
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onClose();
      onNavigateToDay(selectedDay);
    } catch {
      Alert.alert('Error', "Couldn't update your day — try again");
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
              {kidBestMode === m.key && (
                <View style={rds.kidBadge}>
                  <Text style={rds.kidBadgeText}>{'\uD83D\uDC67'} Best for kids</Text>
                </View>
              )}
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
      <View style={[rds.footer, { paddingBottom: TAB_BAR_H + insets.bottom + 12 }]}>
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
  activeTripDay,
  onClose,
  onCompare,
  onOpenChecklist,
  onOpenPreferences,
  onOpenDateEditor,
  onCommunityShare,
  queryClient,
}: {
  trip: TripData;
  tripId: string;
  activeTripDay: number;
  onClose: () => void;
  onCompare: () => void;
  onOpenChecklist: () => void;
  onOpenPreferences: () => void;
  onOpenDateEditor: () => void;
  onCommunityShare?: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const insets = useSafeAreaInsets();
  const [isOfflineCached, setIsOfflineCached] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(`roamus_cache_status_${tripId}`)
      .then(val => setIsOfflineCached(val === 'complete'))
      .catch(() => {});
  }, [tripId]);

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

  async function deleteTrip() {
    Alert.alert(
      'Delete trip?',
      `This will permanently delete "${trip.name}" and all its data. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/travel/trips/${tripId}`, { method: 'DELETE' });
              onClose();
              router.replace('/(tabs)/' as any);
            } catch {
              Alert.alert('Error', 'Could not delete trip. Try again.');
            }
          },
        },
      ],
    );
  }

  async function archiveTrip() {
    try {
      await apiFetch(`/api/travel/trips/${tripId}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: true }),
      });
      showToast('Trip archived — find it in your past adventures');
      onClose();
      router.replace('/(tabs)/' as any);
    } catch {
      Alert.alert('Error', 'Could not archive trip. Try again.');
    }
  }

  async function downloadOffline() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) { showToast('Sign in to download for offline'); return; }
      showToast('Downloading for offline\u2026');
      await preCacheTrip(tripId, token);
      await AsyncStorage.setItem(`roamus_cache_status_${tripId}`, 'complete');
      setIsOfflineCached(true);
      showToast('\u2713 Trip saved for offline use');
    } catch {
      showToast('Download failed — try again');
    }
  }

  type OptionItem = { icon: React.ReactNode; bg: string; name: string; sub: string; destructive?: boolean; onPress: () => void };
  const sections: Array<{ label: string; items: OptionItem[] }> = [
    {
      label: 'TRIP TOOLS',
      items: [
        {
          icon: isOfflineCached ? <IconCheck /> : <IconDownload />,
          bg: '#EEF5F2',
          name: isOfflineCached ? 'Available offline' : 'Download for offline',
          sub: isOfflineCached ? 'Trip saved \u2014 works without signal' : 'Save stops and stories for no-WiFi use',
          onPress: isOfflineCached ? () => showToast('Already saved for offline') : downloadOffline,
        },
        {
          icon: <IconShare />, bg: '#FDF0E9', name: 'Share with family',
          sub: 'Send the itinerary to your travel partners',
          onPress: () => { onClose(); onCommunityShare?.(); },
        },
        { icon: <IconCheck />, bg: '#FDF0E9', name: 'Packing list', sub: "Check off what you're bringing", onPress: () => { onClose(); setTimeout(() => onOpenChecklist(), 350); } },
        { icon: <IconBars />, bg: '#E8F7EF', name: 'Compare days', sub: 'See balance and pace across all days', onPress: () => { onClose(); onCompare(); } },
      ],
    },
    {
      label: 'PLAN SETTINGS',
      items: [
        { icon: <IconEdit />, bg: '#FDF0E9', name: 'Rename trip', sub: 'Change the name shown at the top', onPress: renameTrip },
        { icon: <IconCalendar />, bg: '#EEF4FF', name: 'Edit dates', sub: 'Change the start and end dates of your trip', onPress: () => { onClose(); setTimeout(() => onOpenDateEditor(), 300); } },
        { icon: <IconGear />, bg: C.bg, name: 'Edit trip preferences', sub: 'Adjust pace, interests & auto-optimize', onPress: () => { onClose(); setTimeout(() => onOpenPreferences(), 350); } },
        {
          icon: <IconRefresh />, bg: '#EEF5F2', name: 'Reset today', sub: 'Un-skip all stops for today',
          onPress: () => {
            const todayDayIndex = activeTripDay - 1;
            const visitedToday = trip.stops?.filter(
              s => s.dayIndex === todayDayIndex && s.isVisited
            ) ?? [];
            Alert.alert(
              'Reset today?',
              "This will mark all of today's stops as unvisited and restart your day.",
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  onPress: async () => {
                    try {
                      await Promise.all(
                        visitedToday.map(s =>
                          apiFetch(`/api/travel/stops/${s.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ isVisited: false }),
                          })
                        )
                      );
                      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
                      showToast('Today reset \u2014 all stops marked unvisited');
                      onClose();
                    } catch {
                      Alert.alert('Error', 'Could not reset today. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ],
    },
    {
      label: 'UTILITIES',
      items: [
        { icon: <IconCopy />, bg: C.bg, name: 'Copy this trip', sub: 'Create a copy to plan a similar adventure', onPress: () => showToast('Coming soon') },
        { icon: <IconArchive />, bg: C.bg, name: 'Archive trip', sub: 'Move this trip to your past adventures', onPress: archiveTrip },
        { icon: <IconTrash color='#DC2626' />, bg: '#FFF0F0', name: 'Delete trip', sub: 'Permanently remove this trip and all data', destructive: true, onPress: deleteTrip },
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[opts.body, { paddingBottom: insets.bottom + 24 }]}
      >
        {sections.map(sec => (
          <View key={sec.label}>
            <Text style={opts.secLabel}>{sec.label}</Text>
            {sec.items.map(item => (
              <Pressable key={item.name} style={opts.item} onPress={item.onPress}>
                <View style={[opts.ico, { backgroundColor: item.bg }]}>
                  {item.icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[opts.itemName, item.destructive && opts.itemNameDestructive]}>{item.name}</Text>
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
                <Text style={cds.dayTheme} numberOfLines={1}>{theme.startsWith('Day') ? `Day ${dayNum}` : `Day ${dayNum} — ${theme}`}</Text>
                <View style={cds.dayBadge}>
                  <Text style={cds.dayBadgeText}>{st === 'past' ? 'Done' : st === 'today' ? 'Today' : `${ds.length} stops`}</Text>
                </View>
              </View>
              <View style={cds.dayMeta}>
                <Text style={cds.metaItem}>{'\uD83D\uDCCD'} {ds.length} stop{ds.length !== 1 ? 's' : ''}</Text>
                <Text style={cds.metaItem}>  {hrs} hrs</Text>
                <Text style={cds.metaItem}>{'\uD83D\uDE97'} ~20 min travel</Text>
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

// ─── Sheet wrapper (absolute-positioned overlay — no Modal) ───────────────────
// React Native's <Modal> is unreliable inside expo-router's Stack on iOS/Expo Go.
// This renders as a sibling View with StyleSheet.absoluteFill instead.

function SheetModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const translateY = useRef(new Animated.Value(800)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 800,
      useNativeDriver: true,
      damping: 28,
      stiffness: 300,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,18,30,0.48)' }]}
        onPress={onClose}
      />
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '88%',
          backgroundColor: C.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
          transform: [{ translateY }],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// ─── AddStopSheet helpers ─────────────────────────────────────────────────────

const DEFAULT_DURATIONS = { food: 45, kids: 90, landmarks: 60 } as const;

function categoryToType(cat: 'food' | 'kids' | 'landmarks'): string {
  if (cat === 'food') return 'food';
  if (cat === 'kids') return 'kid_attraction';
  return 'landmark';
}

function featuredGradient(cat: 'food' | 'kids' | 'landmarks'): [string, string] {
  if (cat === 'food') return ['#1D4A42', '#163830'];
  if (cat === 'kids') return ['#5B21B6', '#3B1A8A'];
  return ['#1D3A5C', '#0F2236'];
}

function iconBgForCategory(cat: 'food' | 'kids' | 'landmarks'): string {
  if (cat === 'food') return '#FDF0E9';
  if (cat === 'kids') return '#F0EBFF';
  return '#EEF5F2';
}

function stopIconForCategory(cat: 'food' | 'kids' | 'landmarks'): string {
  if (cat === 'food') return '\uD83C\uDF7D\uFE0F';
  if (cat === 'kids') return '\uD83C\uDFAA';
  return '\uD83D\uDCCD';
}

function parseDurationMins(opt: StopOption, cat: 'food' | 'kids' | 'landmarks'): number {
  if (opt.durationMinutes != null) return opt.durationMinutes;
  if (opt.estimatedDurationMinutes != null) return opt.estimatedDurationMinutes;
  if (opt.duration) {
    const m = opt.duration.match(/(\d+)/);
    if (m) return parseInt(m[1], 10);
  }
  return DEFAULT_DURATIONS[cat];
}

// ─── StopOptionCard ───────────────────────────────────────────────────────────

function StopOptionCard({
  opt, category, isSelected, onCardPress, onAdd, adding,
}: {
  opt: StopOption;
  category: 'food' | 'kids' | 'landmarks';
  isSelected: boolean;
  onCardPress: () => void;
  onAdd: () => void;
  adding: boolean;
}) {
  const dur = parseDurationMins(opt, category);
  return (
    <View style={[as.soCard, isSelected && as.soCardSelected]}>
      <Pressable style={as.soTop} onPress={onCardPress}>
        <View style={[as.soIcon, { backgroundColor: iconBgForCategory(category) }]}>
          <Text style={{ fontSize: 20 }}>{opt.icon ?? stopIconForCategory(category)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={as.soName} numberOfLines={1}>{opt.name}</Text>
          <Text style={as.soMeta} numberOfLines={1}>
            {[opt.distance, opt.type ?? opt.stopType, opt.description].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Text style={as.soDuration}>{dur} min</Text>
      </Pressable>
      <Pressable
        style={[as.soAddBtn, isSelected && as.soAddBtnSelected]}
        onPress={onAdd}
        disabled={adding || isSelected}
      >
        <Text style={[as.soAddBtnText, isSelected && as.soAddBtnTextSelected]}>
          {isSelected ? '\u2713 Added to plan' : '+ Add to plan'}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── AddStopSheet ─────────────────────────────────────────────────────────────

function AddStopSheet({
  trip,
  tripId,
  selectedDay,
  getStopsForDay,
  allStops,
  defaultFilter,
  queryClient,
  onClose,
}: {
  trip: TripData;
  tripId: string;
  selectedDay: number;
  getStopsForDay: (d: number) => Stop[];
  allStops: Stop[];
  defaultFilter?: 'food' | 'kids' | 'landmarks';
  queryClient: ReturnType<typeof useQueryClient>;
  onClose: () => void;
}) {
  const insets    = useSafeAreaInsets();
  const city      = trip.city ?? trip.destination ?? 'your destination';
  const lastStop  = getStopsForDay(selectedDay).at(-1) ?? null;

  const [category,    setCategory]    = useState<'food' | 'kids' | 'landmarks'>(defaultFilter ?? 'food');
  const [options,     setOptions]     = useState<StopOption[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState('');
  const [selectedOpt, setSelectedOpt] = useState<StopOption | null>(null);
  const [adding,      setAdding]      = useState(false);
  const [detailOpt,   setDetailOpt]   = useState<StopOption | null>(null);
  const [positionOpt, setPositionOpt] = useState<StopOption | null>(null);

  const fetchOptions = useCallback(async (cat: 'food' | 'kids' | 'landmarks') => {
    setLoading(true);
    setOptions([]);
    try {
      const body: Record<string, unknown> = { destination: city };
      const todayNames = getStopsForDay(selectedDay).map(s => s.name).filter(Boolean);
      if (todayNames.length > 0) body.todayStopNames = todayNames;
      if (cat === 'food') {
        body.stopTypes = ['restaurant', 'food'];
      } else if (cat === 'kids') {
        body.context = 'fun';
      } else {
        body.stopTypes = ['landmark', 'museum', 'park'];
      }
      const result = await apiFetch<{ nearby?: StopOption[]; popular?: StopOption[] }>(
        '/api/travel/stops/smart-suggestions',
        { method: 'POST', body: JSON.stringify(body) }
      );
      setOptions([...(result.nearby ?? []), ...(result.popular ?? [])]);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [city, selectedDay, getStopsForDay]);

  useEffect(() => { fetchOptions(defaultFilter ?? 'food'); }, []);

  function changeCategory(cat: 'food' | 'kids' | 'landmarks') {
    setCategory(cat);
    setSelectedOpt(null);
    setSearch('');
    fetchOptions(cat);
  }

  function openPositionPicker(opt: StopOption) {
    setPositionOpt(opt);
    setDetailOpt(null);
  }

  async function handleInsertAt(opt: StopOption, afterStopId: string) {
    setAdding(true);
    const isTimeSlot = afterStopId === '__MORNING__' || afterStopId === '__AFTERNOON__' || afterStopId === '__EVENING__';
    try {
      if (isTimeSlot) {
        await apiFetch(
          `/api/travel/trips/${tripId}/stops`,
          {
            method: 'POST',
            body: JSON.stringify({
              name: opt.name,
              stopType: opt.stopType ?? categoryToType(category),
              address: opt.address ?? `${opt.name}, ${city}`,
              durationMinutes: parseDurationMins(opt, category),
              dayIndex: selectedDay - 1,
            }),
          }
        );
      } else {
        await apiFetch<{ canInsert?: boolean; success?: boolean; stop?: Stop }>(
          `/api/travel/trips/${tripId}/insert-stop`,
          {
            method: 'POST',
            body: JSON.stringify({
              insertAfterStopId: afterStopId,
              confirmed: true,
              place: {
                name: opt.name,
                address: opt.address ?? `${opt.name}, ${city}`,
                type: opt.stopType ?? categoryToType(category),
                estimatedDurationMinutes: parseDurationMins(opt, category),
              },
            }),
          }
        );
      }
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      setPositionOpt(null);
      setDetailOpt(null);
      setSelectedOpt(opt);
    } catch {
      // stay on picker on error
    } finally {
      setAdding(false);
    }
  }

  const filteredOptions = search.trim()
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  const featured   = filteredOptions[0] ?? null;
  const restOpts   = filteredOptions.slice(1);
  const nearbyOpts = restOpts.slice(0, 3);
  const popularOpts = restOpts.slice(3);
  const isAdded    = !!selectedOpt;

  return (
    <View style={{ flex: 1 }}>
      {/* Drag handle */}
      <View style={as.handle} />

      {/* Header */}
      <View style={as.header}>
        <View style={{ flex: 1 }}>
          <Text style={as.title}>Add a stop</Text>
          <Text style={as.sub}>{city} · system picks best time</Text>
        </View>
        <Pressable
          style={as.closeBtn}
          onPress={() => { onClose(); setSelectedOpt(null); }}
          hitSlop={8}
        >
          <Text style={as.closeX}>{'\u2715'}</Text>
        </Pressable>
      </View>

      {/* Category pills */}
      <View style={as.pillsRow}>
        {(['food', 'kids', 'landmarks'] as const).map(cat => (
          <Pressable
            key={cat}
            style={[as.pill, category === cat && as.pillOn]}
            onPress={() => changeCategory(cat)}
          >
            <Text style={as.pillIcon}>{cat === 'food' ? '\uD83C\uDF54' : cat === 'kids' ? '\uD83E\uDDD2' : '\uD83D\uDCCD'}</Text>
            <Text style={[as.pillText, category === cat && as.pillTextOn]}>
              {cat === 'food' ? 'Food' : cat === 'kids' ? 'Kids extras' : 'Landmarks'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search bar */}
      <View style={as.searchWrap}>
        <View style={as.searchBar}>
          <Text style={as.searchIcon}>{'\uD83D\uDD0D'}</Text>
          <TextInput
            style={as.searchInput}
            placeholder={`Search ${city}...`}
            placeholderTextColor="#D1D5E0"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Scrollable content */}
      {loading ? (
        <View style={as.loadingWrap}>
          <ActivityIndicator color="#E8692A" size="large" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={as.body} showsVerticalScrollIndicator={false}>
          {/* From other days — inside scroll so it doesn't squish the list */}
          {(() => {
            const otherDayStops = allStops.filter(s => (s.dayIndex ?? 0) !== selectedDay - 1);
            if (otherDayStops.length === 0) return null;
            return (
              <View>
                <Text style={rep.secLabel}>FROM OTHER DAYS</Text>
                {otherDayStops.slice(0, 5).map(s => (
                  <Pressable
                    key={s.id}
                    style={rep.otherDayRow}
                    onPress={async () => {
                      try {
                        const targetDayIndex = selectedDay - 1;
                        const targetDayStops = allStops
                          .filter(x => x.dayIndex === targetDayIndex)
                          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
                        await apiFetch(`/api/travel/trips/${tripId}/reorder-stops`, {
                          method: 'PATCH',
                          body: JSON.stringify({
                            stopOrders: [{ stopId: s.id, displayOrder: targetDayStops.length, dayIndex: targetDayIndex }],
                          }),
                        });
                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
                        onClose();
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    <View style={[rep.otherDayIco, { backgroundColor: stopHeroBg(s.stopType) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={rep.otherDayName}>{s.name}</Text>
                      <Text style={rep.otherDayMeta}>Day {(s.dayIndex ?? 0) + 1} · {getStopDuration(s)} min</Text>
                    </View>
                  </Pressable>
                ))}
                <View style={rep.divider} />
              </View>
            );
          })()}
          {featured && (
            <LinearGradient
              colors={featuredGradient(category)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={as.featured}
            >
              <Text style={as.featLabel}>
                {'TOP PICK'}
                {lastStop ? ` NEAR ${lastStop.name.toUpperCase()}` : ''}
              </Text>
              <Text style={as.featName}>{featured.name}</Text>
              <Text style={as.featMeta}>
                {[featured.distance, featured.type ?? featured.stopType, featured.priceRange]
                  .filter(Boolean).join(' · ')}
              </Text>
              {featured.tags && featured.tags.length > 0 && (
                <View style={as.featTags}>
                  {featured.tags.slice(0, 3).map((t, i) => (
                    <View key={i} style={as.featTag}>
                      <Text style={as.featTagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Pressable
                style={as.featAddBtn}
                onPress={() => openPositionPicker(featured)}
                disabled={adding}
              >
                <Text style={as.featAddText}>+ Add to plan</Text>
              </Pressable>
            </LinearGradient>
          )}

          {nearbyOpts.length > 0 && (
            <>
              <Text style={as.sectionLabel}>GREAT NEARBY OPTIONS</Text>
              {nearbyOpts.map((opt, i) => (
                <StopOptionCard
                  key={opt.id ?? `nearby-${i}`}
                  opt={opt}
                  category={category}
                  isSelected={selectedOpt?.name === opt.name}
                  onCardPress={() => setDetailOpt(opt)}
                  onAdd={() => openPositionPicker(opt)}
                  adding={adding}
                />
              ))}
            </>
          )}

          {popularOpts.length > 0 && (
            <>
              <Text style={[as.sectionLabel, { marginTop: 6 }]}>POPULAR WITH FAMILIES</Text>
              {popularOpts.map((opt, i) => (
                <StopOptionCard
                  key={opt.id ?? `popular-${i}`}
                  opt={opt}
                  category={category}
                  isSelected={selectedOpt?.name === opt.name}
                  onCardPress={() => setDetailOpt(opt)}
                  onAdd={() => openPositionPicker(opt)}
                  adding={adding}
                />
              ))}
            </>
          )}

          {options.length === 0 && (
            <View style={as.emptyWrap}>
              <Text style={as.emptyText}>No stops found — try a different category.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Footer */}
      <View style={[as.footer, { paddingBottom: Math.max(insets.bottom + 88, 100) }]}>
        {isAdded && selectedOpt && (
          <View style={as.confirmStrip}>
            <Text style={as.confirmText}>
              {'\u2713 '}{selectedOpt.name} added · system will schedule it
            </Text>
          </View>
        )}
        <Pressable
          style={[as.footerBtn, !isAdded && as.footerBtnDisabled]}
          onPress={isAdded ? () => { onClose(); setSelectedOpt(null); } : undefined}
          disabled={!isAdded}
        >
          <Text style={as.footerBtnText}>{isAdded ? 'Done' : 'Select a stop to add'}</Text>
        </Pressable>
      </View>

      {/* Stop detail overlay */}
      {detailOpt != null && positionOpt == null && (
        <AddStopDetailSheet
          opt={detailOpt}
          category={category}
          city={city}
          insets={insets}
          onBack={() => setDetailOpt(null)}
          onClose={() => { setDetailOpt(null); onClose(); }}
          onAddToDay={() => { setPositionOpt(detailOpt); }}
        />
      )}

      {/* Position picker overlay */}
      {positionOpt != null && (
        <PositionPickerSheet
          opt={positionOpt}
          dayStops={getStopsForDay(selectedDay)}
          category={category}
          adding={adding}
          insets={insets}
          onBack={() => setPositionOpt(null)}
          onClose={() => { setPositionOpt(null); setDetailOpt(null); onClose(); }}
          onInsertAt={(afterStopId) => handleInsertAt(positionOpt, afterStopId)}
        />
      )}
    </View>
  );
}

const as = StyleSheet.create({
  handle:      { width: 36, height: 4, backgroundColor: '#D1D5E0', borderRadius: 2, alignSelf: 'center', marginTop: 14 },
  header:      { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 14 },
  title:       { fontFamily: 'Fraunces_900Black', fontSize: 22, color: '#1A1F2E', lineHeight: 26 },
  sub:         { fontSize: 13, color: '#8A8FA8', marginTop: 3, fontFamily: F.regular },
  closeBtn:    { width: 32, height: 32, backgroundColor: 'rgba(26,31,46,0.07)', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  closeX:      { fontSize: 15, color: '#8A8FA8' },
  pillsRow:    { flexDirection: 'row', gap: 7, paddingHorizontal: 20, paddingTop: 12 },
  pill:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(26,31,46,0.09)', backgroundColor: '#fff' },
  pillOn:      { backgroundColor: '#1A1F2E', borderColor: '#1A1F2E' },
  pillIcon:    { fontSize: 14 },
  pillText:    { fontSize: 12, fontFamily: F.bold, color: '#1A1F2E' },
  pillTextOn:  { color: '#fff' },
  searchWrap:  { paddingHorizontal: 20, paddingTop: 10 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#F5F2EE', borderRadius: 13, paddingVertical: 10, paddingHorizontal: 13, borderWidth: 1.5, borderColor: 'rgba(26,31,46,0.09)' },
  searchIcon:  { fontSize: 15, color: '#8A8FA8' },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1F2E', fontFamily: F.regular },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  body:        { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  featured:    { borderRadius: 16, padding: 16, marginBottom: 14 },
  featLabel:   { fontSize: 10, fontFamily: F.bold, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 },
  featName:    { fontFamily: 'Fraunces_900Black', fontSize: 19, color: '#fff', lineHeight: 23, marginBottom: 3 },
  featMeta:    { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: F.semibold, marginBottom: 10 },
  featTags:    { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 12 },
  featTag:     { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9 },
  featTagText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: F.bold },
  featAddBtn:  { backgroundColor: '#fff', borderRadius: 11, paddingVertical: 9, paddingHorizontal: 14, alignSelf: 'flex-start' },
  featAddText: { fontSize: 12, fontFamily: F.bold, color: '#1A1F2E' },
  sectionLabel:{ fontSize: 11, fontFamily: F.bold, color: '#8A8FA8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  soCard:      { backgroundColor: '#fff', borderRadius: 14, padding: 13, shadowColor: '#1A1F2E', shadowRadius: 12, shadowOpacity: 0.08, elevation: 2, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent' },
  soCardSelected: { borderColor: '#E8692A', backgroundColor: '#FDF0E9' },
  soTop:       { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10 },
  soIcon:      { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  soName:      { fontSize: 14, fontFamily: F.bold, color: '#1A1F2E' },
  soMeta:      { fontSize: 12, color: '#8A8FA8', marginTop: 2, fontFamily: F.regular },
  soDuration:  { fontSize: 12, fontFamily: F.bold, color: '#E8692A', flexShrink: 0 },
  soAddBtn:    { backgroundColor: 'rgba(26,31,46,0.06)', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  soAddBtnSelected: { backgroundColor: '#3DAA6E' },
  soAddBtnText: { fontSize: 13, fontFamily: F.bold, color: '#1A1F2E' },
  soAddBtnTextSelected: { color: '#fff' },
  emptyWrap:   { paddingVertical: 40, alignItems: 'center' },
  emptyText:   { fontSize: 14, color: '#8A8FA8', fontFamily: F.regular, textAlign: 'center' },
  footer:      { paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.08)', flexShrink: 0 },
  confirmStrip:{ backgroundColor: '#E8F7EF', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  confirmText: { fontSize: 12, fontFamily: F.bold, color: '#1A6640', flex: 1 },
  footerBtn:   { backgroundColor: '#E8692A', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  footerBtnDisabled: { backgroundColor: '#D1D5E0' },
  footerBtnText: { fontSize: 15, fontFamily: F.bold, color: '#fff' },
});

// ─── AddStopDetailSheet ───────────────────────────────────────────────────────

function AddStopDetailSheet({
  opt, category, city, insets, onBack, onClose, onAddToDay,
}: {
  opt: StopOption;
  category: 'food' | 'kids' | 'landmarks';
  city: string;
  insets: { bottom: number; top: number };
  onBack: () => void;
  onClose: () => void;
  onAddToDay: () => void;
}) {
  const dur = parseDurationMins(opt, category);
  const typeLabel = (opt.stopType ?? opt.type ?? category).replace(/_/g, ' ');
  const mapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(`${opt.name} ${city}`)}`;

  return (
    <View style={asd.wrap}>
      <View style={as.handle} />
      <View style={asd.header}>
        <Pressable style={asd.backBtn} onPress={onBack} hitSlop={8}>
          <Text style={asd.backArrow}>{'←'}</Text>
        </Pressable>
        <Pressable style={as.closeBtn} onPress={onClose} hitSlop={8}>
          <Text style={as.closeX}>{'\u2715'}</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={asd.body} showsVerticalScrollIndicator={false}>
        <Text style={asd.name}>{opt.name}</Text>
        <Text style={asd.subtitle}>{typeLabel}</Text>

        <View style={asd.tagsRow}>
          <View style={[asd.tag, asd.tagOrange]}>
            <Text style={asd.tagOrangeTxt}>
              {category === 'food' ? 'Food' : category === 'kids' ? 'Kids' : 'Landmark'}
            </Text>
          </View>
          <View style={[asd.tag, asd.tagAmber]}>
            <Text style={asd.tagAmberTxt}>{opt.duration ?? `${dur} min`}</Text>
          </View>
          {opt.description && (
            <View style={[asd.tag, asd.tagGreen]}>
              <Text style={asd.tagGreenTxt}>Family pick</Text>
            </View>
          )}
        </View>

        {opt.description ? (
          <View style={asd.section}>
            <Text style={asd.sectionLabel}>{'WHY FAMILIES LOVE IT'}</Text>
            <Text style={asd.sectionText}>{opt.description}</Text>
          </View>
        ) : null}

        <View style={asd.infoGrid}>
          <View style={asd.infoRow}>
            <Text style={asd.infoLabel}>Duration</Text>
            <Text style={asd.infoVal}>{opt.duration ?? `${dur} min`}</Text>
          </View>
          <View style={asd.infoRow}>
            <Text style={asd.infoLabel}>Type</Text>
            <Text style={asd.infoVal}>{typeLabel}</Text>
          </View>
          <View style={[asd.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={asd.infoLabel}>City</Text>
            <Text style={asd.infoVal}>{city}</Text>
          </View>
        </View>

        <Pressable style={asd.mapsRow} onPress={() => Linking.openURL(mapsUrl)}>
          <Text style={asd.mapsAddr} numberOfLines={1}>
            {'\uD83D\uDCCD '}{opt.address ?? `${opt.name}, ${city}`}
          </Text>
          <Text style={asd.mapsLink}>Open in Maps</Text>
        </Pressable>
      </ScrollView>

      <View style={[asd.footer, { paddingBottom: Math.max(insets.bottom + 88, 100) }]}>
        <Pressable style={asd.addBtn} onPress={onAddToDay}>
          <Text style={asd.addBtnText}>Add to my day →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const asd = StyleSheet.create({
  wrap:         { position: 'absolute', inset: 0, backgroundColor: '#fff', zIndex: 10 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14 },
  backBtn:      { width: 32, height: 32, backgroundColor: 'rgba(26,31,46,0.07)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  backArrow:    { fontSize: 17, color: '#8A8FA8', marginTop: -1 },
  body:         { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  name:         { fontFamily: 'Fraunces_900Black', fontSize: 22, color: '#1A1F2E', lineHeight: 27, marginBottom: 4 },
  subtitle:     { fontSize: 13, color: '#8A8FA8', fontFamily: F.regular, textTransform: 'capitalize', marginBottom: 12 },
  tagsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  tag:          { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  tagOrange:    { backgroundColor: '#FDF0E9' },
  tagOrangeTxt: { fontSize: 12, fontFamily: F.bold, color: '#E8692A' },
  tagAmber:     { backgroundColor: '#FEF3DC' },
  tagAmberTxt:  { fontSize: 12, fontFamily: F.bold, color: '#7A5A00' },
  tagGreen:     { backgroundColor: '#E8F7EF' },
  tagGreenTxt:  { fontSize: 12, fontFamily: F.bold, color: '#1A6640' },
  section:      { backgroundColor: '#F5F2EE', borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionLabel: { fontSize: 10, fontFamily: F.bold, color: '#8A8FA8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 },
  sectionText:  { fontSize: 13, fontFamily: F.regular, color: '#1A1F2E', lineHeight: 20 },
  infoGrid:     { backgroundColor: '#F5F2EE', borderRadius: 14, paddingHorizontal: 14, marginBottom: 12 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(26,31,46,0.09)' },
  infoLabel:    { fontSize: 13, color: '#8A8FA8', fontFamily: F.regular },
  infoVal:      { fontSize: 13, fontFamily: F.bold, color: '#1A1F2E', textTransform: 'capitalize' },
  mapsRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: 'rgba(26,31,46,0.09)', gap: 8 },
  mapsAddr:     { flex: 1, fontSize: 13, fontFamily: F.regular, color: '#1A1F2E' },
  mapsLink:     { fontSize: 13, fontFamily: F.bold, color: '#E8692A', flexShrink: 0 },
  footer:       { paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.08)', flexShrink: 0 },
  addBtn:       { backgroundColor: '#E8692A', borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  addBtnText:   { fontSize: 15, fontFamily: F.bold, color: '#fff' },
});

// ─── PositionPickerSheet ──────────────────────────────────────────────────────

function PositionPickerSheet({
  opt, dayStops, category, adding, insets, onBack, onClose, onInsertAt,
}: {
  opt: StopOption;
  dayStops: Stop[];
  category: 'food' | 'kids' | 'landmarks';
  adding: boolean;
  insets: { bottom: number; top: number };
  onBack: () => void;
  onClose: () => void;
  onInsertAt: (afterStopId: string) => void;
}) {
  const optDur = parseDurationMins(opt, category);

  const BASE_MINS = 9 * 60; // 9:00 AM
  const TRAVEL_MINS = 15;
  const DAY_CAP_MINS = 18 * 60; // 6:00 PM

  function toTimeStr(mins: number): string {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  type PosRow = { stopId: string; label: string; timeSub: string; warning?: string };
  const rows: PosRow[] = [];
  let acc = BASE_MINS;

  dayStops.forEach((s, i) => {
    const dur = s.durationMinutes ?? 60;
    const newStopStart = acc + dur + TRAVEL_MINS;
    const newStopEnd = newStopStart + optDur;
    const isEnd = i === dayStops.length - 1;
    const warning = newStopEnd > DAY_CAP_MINS
      ? `Pushes day end to ${toTimeStr(newStopEnd)}`
      : undefined;

    rows.push({
      stopId: s.id,
      label: isEnd ? 'End of day' : `After ${s.name}`,
      timeSub: `New stop around ${toTimeStr(newStopStart)}`,
      warning,
    });
    acc += dur + TRAVEL_MINS;
  });

  return (
    <View style={pps.wrap}>
      <View style={as.handle} />

      <View style={pps.header}>
        <Pressable style={asd.backBtn} onPress={onBack} hitSlop={8}>
          <Text style={asd.backArrow}>{'←'}</Text>
        </Pressable>
        <Pressable style={as.closeBtn} onPress={onClose} hitSlop={8}>
          <Text style={as.closeX}>{'\u2715'}</Text>
        </Pressable>
      </View>

      <View style={pps.titleWrap}>
        <Text style={pps.title}>Where should we fit this?</Text>
        <Text style={pps.sub}>{opt.name}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={pps.list} showsVerticalScrollIndicator={false}>
        {rows.map((row, i) => (
          <View key={row.stopId}>
            {i > 0 && (
              <View style={pps.divider}>
                <View style={pps.divLine} />
                <View style={pps.divPill}>
                  <Text style={pps.divPillText} numberOfLines={1}>{dayStops[i].name}</Text>
                </View>
                <View style={pps.divLine} />
              </View>
            )}
            <Pressable
              style={pps.row}
              onPress={() => !adding && onInsertAt(row.stopId)}
              disabled={adding}
            >
              <View style={pps.rowPlus}>
                <Text style={pps.rowPlusTxt}>+</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pps.rowLabel}>{row.label}</Text>
                <Text style={pps.rowSub}>{row.timeSub}</Text>
                {row.warning ? (
                  <Text style={pps.rowWarn}>{'\u26A0\uFE0F '}{row.warning}</Text>
                ) : null}
              </View>
              {adding ? (
                <ActivityIndicator color={C.orange} size="small" />
              ) : (
                <Text style={pps.rowChev}>{'›'}</Text>
              )}
            </Pressable>
          </View>
        ))}

        {rows.length === 0 && (
          <>
            {[
              { label: 'Morning',   sub: '8\u201311am',  sentinel: '__MORNING__' },
              { label: 'Afternoon', sub: '12\u20133pm',  sentinel: '__AFTERNOON__' },
              { label: 'Evening',   sub: '4\u20137pm',   sentinel: '__EVENING__' },
            ].map((slot, i) => (
              <View key={slot.sentinel}>
                {i > 0 && <View style={pps.slotDivider} />}
                <Pressable
                  style={pps.row}
                  onPress={() => !adding && onInsertAt(slot.sentinel)}
                  disabled={adding}
                >
                  <View style={pps.rowPlus}>
                    <Text style={pps.rowPlusTxt}>+</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={pps.rowLabel}>{slot.label}</Text>
                    <Text style={pps.rowSub}>{slot.sub}</Text>
                  </View>
                  {adding ? (
                    <ActivityIndicator color={C.orange} size="small" />
                  ) : (
                    <Text style={pps.rowChev}>{'›'}</Text>
                  )}
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={[pps.footer, { paddingBottom: Math.max(insets.bottom + 88, 100) }]} />
    </View>
  );
}

const pps = StyleSheet.create({
  wrap:        { position: 'absolute', inset: 0, backgroundColor: '#fff', zIndex: 20 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14 },
  titleWrap:   { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  title:       { fontFamily: 'Fraunces_900Black', fontSize: 22, color: '#1A1F2E', lineHeight: 27 },
  sub:         { fontSize: 13, color: '#8A8FA8', fontFamily: F.regular, marginTop: 3 },
  list:        { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  divLine:     { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(26,31,46,0.09)' },
  slotDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(26,31,46,0.09)', marginHorizontal: 20 },
  divPill:     { backgroundColor: '#F5F2EE', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  divPillText: { fontSize: 11, color: '#8A8FA8', fontFamily: F.bold },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(26,31,46,0.09)', marginBottom: 2, shadowColor: '#1A1F2E', shadowRadius: 6, shadowOpacity: 0.06, elevation: 1 },
  rowPlus:     { width: 32, height: 32, backgroundColor: '#FDF0E9', borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowPlusTxt:  { fontSize: 18, fontFamily: F.bold, color: '#E8692A', lineHeight: 22 },
  rowLabel:    { fontSize: 14, fontFamily: F.bold, color: '#1A1F2E' },
  rowSub:      { fontSize: 12, color: '#8A8FA8', fontFamily: F.regular, marginTop: 2 },
  rowWarn:     { fontSize: 11, fontFamily: F.bold, color: '#F5A623', marginTop: 3 },
  rowChev:     { fontSize: 20, color: '#D1D5E0', flexShrink: 0 },
  footer:      { borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.08)' },
});

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function TripPlanScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const queryClient = useQueryClient();
  useFrauncesFonts({ Fraunces_900Black });

  // ── Screen state ──
  const [activeScreen, setActiveScreen] = useState<'overview' | 'detail'>('overview');
  const [selectedDay, setSelectedDay]   = useState(1);
  const [activeSheet, setActiveSheet]   = useState<ActiveSheet>('none');
  const [addStopFilter, setAddStopFilter] = useState<'food' | 'kids' | 'landmarks'>('food');
  const [showCommunityShare, setShowCommunityShare] = useState(false);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [runMode, setRunMode]           = useState<RunMode>('balanced');
  const [localStops, setLocalStops]     = useState<Stop[]>([]);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const isFree = !authLoading && isFreePlan(user?.subscriptionTier);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<UpgradeContext>('run_day');

  function handleChecklistClose() {
    setChecklistOpen(false);
  }

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
    // Collect all available signals and take the maximum so extending a trip
    // always wins over a stale plannerTripDays value from the original AI generation.
    const candidates: number[] = [];
    if (trip.startDate && trip.endDate) {
      candidates.push(Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000) + 1);
    }
    if (trip.tripDays)        candidates.push(trip.tripDays);
    if (trip.plannerTripDays) candidates.push(trip.plannerTripDays);
    if (localStops.length > 0) candidates.push(Math.max(...localStops.map(s => (s.dayIndex ?? 0) + 1)));
    return candidates.length > 0 ? Math.max(...candidates) : 0;
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

  function handleMoveStop(stopId: string, targetDayIndex: number, _afterStopId: string | null) {
    setLocalStops(prev => prev.map(s =>
      s.id === stopId ? { ...s, dayIndex: targetDayIndex } : s
    ));
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
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
    setSelectedStop(stop);
    setActiveSheet('stopDetail');
  }

  function openReplaceSheet(stop: Stop) {
    setSelectedStop(stop);
    setActiveSheet('replace');
  }

  function openRunDay(preMode?: RunMode) {
    if (isFree) {
      setUpgradeContext('run_day');
      setUpgradeVisible(true);
      return;
    }
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
          onSelectDay={(d) => goToDay(d)}
          onRunToday={() => openRunDay()}
          onOpenOptions={() => setActiveSheet('options')}
          onOpenChecklist={() => setChecklistOpen(true)}
        />
      ) : (
        <DayDetail
          trip={trip}
          stops={localStops}
          totalDays={totalDays}
          selectedDay={selectedDay}
          activeTripDay={activeTripDay}
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
          onAddStop={(filter) => { setAddStopFilter(filter ?? 'food'); setActiveSheet('addStop'); }}
          isFree={isFree}
          onShowUpgrade={() => { setUpgradeContext('locked_day'); setUpgradeVisible(true); }}
        />
      )}

      {/* ── Sheets — only ONE ever in the tree at a time ── */}
      {activeSheet === 'stopDetail' && (
        <SheetModal visible onClose={closeSheet}>
          <TripPlanStopSheet
            stop={selectedStop}
            onClose={closeSheet}
            onReplace={(s) => { closeSheet(); openReplaceSheet(s as any); }}
            onDelete={deleteStop}
            tripId={tripId ?? ''}
            currentDayIndex={selectedStop?.dayIndex ?? 0}
            tripDays={Array.from({ length: totalDays }, (_, i) => ({
              dayIndex: i,
              dayNum: i + 1,
              date: trip.startDate ? formatDate(trip.startDate, i) : null,
              stops: getStopsForDay(i + 1),
            }))}
            onMove={handleMoveStop}
          />
        </SheetModal>
      )}

      {activeSheet === 'replace' && (
        <SheetModal visible onClose={closeSheet}>
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
      )}

      {activeSheet === 'runDay' && (
        <SheetModal visible onClose={closeSheet}>
          <RunDaySheet
            selectedDay={selectedDay}
            dayStops={dayStopsForSheet}
            tripId={tripId ?? ''}
            runMode={runMode}
            onModeChange={setRunMode}
            onClose={closeSheet}
            onStopsUpdated={setLocalStops}
            onNavigateToDay={goToDay}
            queryClient={queryClient}
          />
        </SheetModal>
      )}

      {activeSheet === 'options' && (
        <SheetModal visible onClose={closeSheet}>
          <TripOptionsSheet
            trip={trip}
            tripId={tripId ?? ''}
            activeTripDay={activeTripDay}
            onClose={closeSheet}
            onCompare={() => setActiveSheet('compare')}
            onOpenChecklist={() => { closeSheet(); setTimeout(() => setChecklistOpen(true), 300); }}
            onOpenPreferences={() => setActiveSheet('preferences')}
            onOpenDateEditor={() => setActiveSheet('dateEditor')}
            onCommunityShare={() => { closeSheet(); setShowCommunityShare(true); }}
            queryClient={queryClient}
          />
        </SheetModal>
      )}

      {trip && (
        <CommunityShareSheet
          visible={showCommunityShare}
          onClose={() => setShowCommunityShare(false)}
          trip={trip}
        />
      )}

      <TripPreferencesSheet
        visible={activeSheet === 'preferences'}
        tripId={tripId ?? ''}
        currentPace={trip?.pace}
        onClose={closeSheet}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['trip', tripId] })}
        showToast={showToast}
        apiFetch={apiFetch}
      />

      {activeSheet === 'dateEditor' && trip && (
        <SheetModal visible onClose={closeSheet}>
          <TripDateEditorSheet
            trip={trip}
            onClose={closeSheet}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['trip', tripId] })}
          />
        </SheetModal>
      )}

      {activeSheet === 'compare' && (
        <SheetModal visible onClose={closeSheet}>
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
      )}

      {activeSheet === 'addStop' && (
        <SheetModal visible onClose={closeSheet}>
          <AddStopSheet
            trip={trip}
            tripId={tripId ?? ''}
            selectedDay={selectedDay}
            getStopsForDay={getStopsForDay}
            allStops={localStops}
            defaultFilter={addStopFilter}
            queryClient={queryClient}
            onClose={closeSheet}
          />
        </SheetModal>
      )}
      <ChecklistSheet
        visible={checklistOpen}
        onClose={handleChecklistClose}
        tripId={tripId ?? ''}
        stops={localStops}
      />
      <UpgradeSheet
        visible={upgradeVisible}
        onClose={() => setUpgradeVisible(false)}
        context={upgradeContext}
      />
      <TripTabBar />
    </View>
  );
}

// ─── TripTabBar ───────────────────────────────────────────────────────────────

const TAB_ITEMS = [
  { name: 'Trips',    route: '/(tabs)/',         icon: 'map-outline' as const,      iconActive: 'map' as const,      active: true  },
  { name: 'Today',    route: '/(tabs)/today',    icon: 'calendar-outline' as const, iconActive: 'calendar' as const, active: false },
  { name: 'At Stop',  route: '/(tabs)/atstop',   icon: 'location-outline' as const, iconActive: 'location' as const, active: false },
  { name: 'Memories', route: '/(tabs)/memories', icon: 'images-outline' as const,   iconActive: 'images' as const,   active: false },
  { name: 'Me',       route: '/(tabs)/me',       icon: 'person-outline' as const,   iconActive: 'person' as const,   active: false },
];

function TripTabBar() {
  const insets = useSafeAreaInsets();
  const isIOS  = Platform.OS === 'ios';

  return (
    <View style={[tb.wrap, { height: TAB_BAR_H + insets.bottom, paddingBottom: insets.bottom }]}
      pointerEvents="box-none">
      {isIOS
        ? <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: C.card }]} />}
      <View style={tb.border} />
      {TAB_ITEMS.map(t => (
        <Pressable key={t.name} style={tb.tab} onPress={() => router.navigate(t.route as any)}>
          <Ionicons name={t.active ? t.iconActive : t.icon} size={22}
            color={t.active ? C.orange : C.muted} />
          <Text style={[tb.label, t.active && tb.labelActive]}>{t.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const tb = StyleSheet.create({
  wrap:        { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
                 alignItems: 'flex-start', zIndex: 200, overflow: 'hidden' },
  border:      { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth,
                 backgroundColor: C.border },
  tab:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8, gap: 3 },
  label:       { fontFamily: F.medium, fontSize: 10, color: C.muted },
  labelActive: { color: C.orange },
});

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
  disclaimerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 4, padding: 12, backgroundColor: 'rgba(26,31,46,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(26,31,46,0.08)' },
  disclaimerIcon: { fontSize: 14 },
  disclaimerTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: '#8A8FA8' },
  disclaimerChevron: { fontSize: 10, color: '#C4C7D4' },
  disclaimerBody: { marginHorizontal: 16, marginBottom: 16, padding: 12, backgroundColor: 'rgba(26,31,46,0.04)', borderRadius: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderWidth: 1, borderTopWidth: 0, borderColor: 'rgba(26,31,46,0.08)' },
  disclaimer: { margin: 16, marginTop: 8, padding: 14, backgroundColor: 'rgba(26,31,46,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(26,31,46,0.08)' },
  disclaimerText: { fontSize: 12, color: '#8A8FA8', lineHeight: 18, fontWeight: '500' },
});

const cl = StyleSheet.create({
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  C.card,
    borderRadius:     16,
    borderWidth:      1,
    borderColor:      C.border,
    paddingHorizontal: 14,
    paddingVertical:  13,
    marginBottom:     10,
    shadowColor:      C.deep,
    shadowOffset:     { width: 0, height: 1 },
    shadowOpacity:    0.05,
    shadowRadius:     6,
    elevation:        1,
  },
  rowLeft: {
    flex: 1,
  },
  rowTitle: {
    fontFamily:   F.bold,
    fontSize:     14,
    color:        C.deep,
    letterSpacing: -0.01,
  },
  rowSub: {
    fontFamily: F.regular,
    fontSize:   12,
    color:      C.muted,
    marginTop:  2,
  },
  badge: {
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   4,
    flexShrink:        0,
    marginLeft:        10,
  },
  badgePending: {
    backgroundColor: '#FDF0E9',
  },
  badgeDone: {
    backgroundColor: '#E8F7EF',
  },
  badgeText: {
    fontFamily: F.bold,
    fontSize:   11,
  },
  badgeTextPending: {
    color: '#E8692A',
  },
  badgeTextDone: {
    color: '#3DAA6E',
  },
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
  wrap: { marginBottom: 10, borderRadius: 16, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  card: { borderRadius: 16 },
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
  tagAnchor:  { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: '#E8F7EF', borderWidth: 1, borderColor: '#B2DFCA' },
  tagAnchorText: { fontFamily: F.bold, fontSize: 10, color: '#1A6640' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 9, paddingHorizontal: 12, paddingBottom: 11 },
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
  emptyCard:       { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginTop: 4, borderWidth: 1, borderColor: '#EDE9E3', alignItems: 'center' },
  emptyIconWrap:   { width: 56, height: 56, backgroundColor: '#FDF0E9', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyCardTitle:  { fontFamily: F.bold, fontSize: 16, color: C.deep, marginBottom: 6, textAlign: 'center' },
  emptyCardSub:    { fontFamily: F.regular, fontSize: 13, color: C.muted, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  emptyCardBtn:    { backgroundColor: C.orange, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, width: '100%', alignItems: 'center', marginBottom: 16 },
  emptyCardBtnTxt: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  emptyQuickLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  emptyChipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  emptyChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: '#E0DDD8', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  emptyChipTxt:    { fontFamily: F.regular, fontSize: 13, color: C.deep },
  addStopBtn: { borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(232,105,42,0.45)', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  addStopText: { fontFamily: F.semibold, fontSize: 13, color: C.orange },
  footer: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  runBtn: { backgroundColor: C.orange, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 20, elevation: 6 },
  runBtnDone: { backgroundColor: C.border, shadowOpacity: 0 },
  runBtnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  runBtnTextDone: { color: C.muted },
  runSub: { fontFamily: F.regular, fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 6 },
  disclaimer: { margin: 16, marginTop: 8, padding: 14, backgroundColor: 'rgba(26,31,46,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(26,31,46,0.08)' },
  disclaimerText: { fontSize: 12, color: '#8A8FA8', lineHeight: 18, fontWeight: '500' },
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
  removeBtn: { paddingVertical: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0EDE8', marginTop: 4 },
  removeBtnText: { fontFamily: F.medium, fontSize: 15, color: '#E53E3E' },
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
  modeCard: { borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 13, paddingHorizontal: 14, marginBottom: 8, overflow: 'visible' as const },
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
  kidBadge: { position: 'absolute', top: -11, right: 14, backgroundColor: '#3DAA6E',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row',
    alignItems: 'center', gap: 4,
    shadowColor: '#3DAA6E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4, zIndex: 10 },
  kidBadgeText: { fontSize: 10, fontFamily: F.bold, color: '#fff', letterSpacing: 0.2 },
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
  itemNameDestructive: { color: '#DC2626' },
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

const ww = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  icon: { fontSize: 20, flexShrink: 0 },
  body: { flex: 1 },
  title: {
    fontSize: 14, fontWeight: '700',
    color: '#1E40AF', marginBottom: 3,
  },
  sub: {
    fontSize: 12, color: '#3B82F6', lineHeight: 17,
  },
});

const sp = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: '#1A1F2E',
    borderRadius: 18, padding: 18,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  label: {
    fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.1, textTransform: 'uppercase', marginBottom: 4,
  },
  range: {
    fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5,
  },
  buckets: {
    flexDirection: 'row', gap: 8, marginBottom: 12,
  },
  bucket: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 5, alignItems: 'center',
  },
  bucketIco: { fontSize: 16, marginBottom: 4 },
  bucketLbl: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase', letterSpacing: 0.06, marginBottom: 3,
  },
  bucketVal: { fontSize: 13, fontWeight: '800', color: '#fff' },
  note: {
    fontSize: 11, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center', fontWeight: '600',
  },
});
