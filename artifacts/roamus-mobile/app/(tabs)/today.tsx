/**
 * RoamUs — Today Tab v5
 * 11 TodayState values: no_trip · pre_trip_far · pre_trip_tomorrow · morning
 *   en_route · at_stop_frozen · stop_complete · day_complete · trip_complete
 *   day_history · day_history_empty
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as ExpoLocation from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Fraunces_900Black, useFonts as useFrauncesFonts } from "@expo-google-fonts/fraunces";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import { Swipeable, TouchableOpacity as GHTouchable } from "react-native-gesture-handler";

import { API_BASE, getMyPlayers, kidsAPI, memoriesAPI, PlayerRecord } from "@/lib/apiClient";
import { SpeechTextInput } from "@/components/SpeechTextInput";
import ChecklistSheet from "@/components/ChecklistSheet";
import IndoorAlternativesSheet from "@/components/IndoorAlternativesSheet";
import StopFeedbackSheet from "@/components/StopFeedbackSheet";
import AddHotelSheet from "@/components/AddHotelSheet";
import DirectionsSheet from "@/components/DirectionsSheet";
import DirectionsToAllStopsCard from "@/components/DirectionsToAllStopsCard";
import RescueSheet from "@/components/RescueSheet";
import StopPreviewSheet from "@/components/StopPreviewSheet";
import { Analytics } from "@/services/analytics/analytics";
import { F, CITY_IMGS } from "@/lib/tokens";

const TODAY_STOP_BG: Record<string, string> = {
  park: '#C8E6C9', museum: '#BBDEFB', zoo: '#FFE0B2', landmark: '#E1BEE7',
  shopping: '#FCE4EC', nature: '#DCEDC8', culture: '#FFF3E0', meal: '#FCE4EC', default: '#E0E0E0',
};
const TODAY_STOP_EMOJI: Record<string, string> = {
  park: '\uD83C\uDF33', museum: '\uD83C\uDFDB', zoo: '\uD83E\uDD81', landmark: '\uD83D\uDDFA\uFE0F',
  shopping: '\uD83D\uDECD', nature: '\uD83C\uDFD4', culture: '\uD83C\uDFAD', meal: '\uD83C\uDF7D', default: '\uD83D\uDCCD',
};
import { useAuth } from "@/lib/authContext";
import NetInfo from "@react-native-community/netinfo";
import { getCachedTrip } from "@/lib/tripCache";
import UpgradeSheet from "@/components/UpgradeSheet";
import EndOfDaySheet from "@/components/EndOfDaySheet";
import { isFreePlan } from "@/lib/subscription";
import { useSpeech } from "@/lib/useSpeech";
import { SpeakButton } from "@/components/SpeakButton";
import { hasAskedPermission } from "@/services/notifications/notificationPermission";
import { useKids } from "@/lib/kidsContext";
import { onEnRoute, onDayComplete, onWeatherAlert } from "@/services/notifications/notificationTriggers";
import NotificationPermissionModal from "@/components/NotificationPermissionModal";
import KidPickerScreen, { getAgeBand, PickedKid } from "@/components/KidPickerScreen";
const MO_STOP_BG: Record<string, string> = {
  park: '#C8E6C9', museum: '#BBDEFB', zoo: '#FFE0B2',
  landmark: '#E1BEE7', nature: '#DCEDC8', culture: '#FFF3E0',
  aquarium: '#B2EBF2', theme_park: '#FCE4EC', default: '#F0ECE6',
};
const MO_STOP_EMOJI: Record<string, string> = {
  park: '\uD83C\uDF3F', museum: '\uD83C\uDFDB', zoo: '\uD83E\uDD8A',
  landmark: '\uD83D\uDDFD', nature: '\uD83C\uDF32', culture: '\uD83C\uDFAD',
  aquarium: '\uD83D\uDC20', theme_park: '\uD83C\uDFA1', default: '\uD83D\uDCCD',
};


// ─── Layout constants ─────────────────────────────────────────────────────────

const TAB_BAR_H = 49; // standard iOS/Android tab bar height (excluding safe area)

// ─── Design tokens ────────────────────────────────────────────────────────────

// ─── Pilot flag — flip to true to re-enable end-of-day reflection card ────────
// When false: the orange "Wrap up today" card is hidden; EndOfDaySheet and
// trip_day_reflections remain untouched in the codebase for post-pilot reuse.
const SHOW_DAY_REFLECTION = false;

const C = {
  orange:       '#E8692A',
  orangeLt:     '#FDF0E9',
  bg:           '#F5F2EE',
  card:         '#FFFFFF',
  deep:         '#1A1F2E',
  muted:        '#8A8FA8',
  mutedLt:      '#C4C8D8',
  sage:         '#7A9E8E',
  sageLt:       '#EEF5F2',
  green:        '#3DAA6E',
  greenLt:      '#E8F7EF',
  blue:         '#3B82F6',
  blueLt:       '#EFF6FF',
  teal:         '#1D4A42',
  tealMid:      '#2A6055',
  purple:       '#6B4FA8',
  purpleLt:     '#F0EBFF',
  purplePrimary:'#7C3AED',
  purplePrimaryLt:'#EDE9FE',
  amber:        '#F5A623',
  amberLt:      '#FEF3C7',
  amberDark:    '#92400E',
  red:          '#E8433A',
  redLt:        '#FEF2F1',
  border:       'rgba(26,31,46,0.09)',
} as const;

// ─── Stop-type thumbnail helpers ──────────────────────────────────────────────
const STOP_TYPE_EMOJI: Record<string, string> = {
  museum: '\uD83C\uDFDB\uFE0F', nature: '\uD83C\uDF3F', park: '\uD83C\uDF33',
  garden: '\uD83C\uDF38', beach: '\uD83C\uDFD6\uFE0F', restaurant: '\uD83C\uDF7D\uFE0F',
  food: '\uD83C\uDF5C', street_food: '\uD83E\uDD62', viewpoint: '\uD83D\uDD2D',
  landmark: '\uD83D\uDCCD', temple: '\u26E9\uFE0F', market: '\uD83D\uDECD\uFE0F',
  zoo: '\uD83E\uDD81', aquarium: '\uD83D\uDC20', palace: '\uD83C\uDFF0',
  plaza: '\uD83C\uDFDB\uFE0F', bridge: '\uD83C\uDF09', waterfall: '\uD83D\uDCA7',
  volcano: '\uD83C\uDF0B', mountain: '\uD83C\uDFD4\uFE0F', adventure: '\u26A1',
  neighborhood: '\uD83C\uDFD8\uFE0F', street: '\uD83D\uDEE4\uFE0F', city: '\uD83C\uDFD9\uFE0F',
  culture: '\uD83C\uDFAD', other: '\uD83D\uDCCD',
};
const STOP_TYPE_COLOR: Record<string, string> = {
  museum: '#3B82F6', nature: '#3DAA6E', park: '#3DAA6E', garden: '#3DAA6E',
  beach: '#0EA5E9', restaurant: '#E8692A', food: '#E8692A', street_food: '#F5A623',
  viewpoint: '#6B4FA8', landmark: '#E8692A', temple: '#E8433A', market: '#F5A623',
  zoo: '#3DAA6E', aquarium: '#0EA5E9', palace: '#6B4FA8', plaza: '#6B4FA8',
  bridge: '#8A8FA8', waterfall: '#0EA5E9', volcano: '#E8433A', mountain: '#8A8FA8',
  adventure: '#E8692A', neighborhood: '#7A9E8E', street: '#8A8FA8', city: '#3B82F6',
  culture: '#6B4FA8', other: '#E8692A',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type StopMetadata = {
  doThisFirst?: string;
  parkingSignal?: string;
  ticketSignal?: boolean;
  restroomConfidence?: string;
  travelMinutes?: number;
  anchorScore?: number;
  dropPriority?: number;
  sessionFit?: string;
  durationMinutes?: number | null;
  durationClass?: string | null;
  foodNearby?: Array<{ name: string; distance: string; type: string }>;
  imageUrl?: string | null;
};

type StopEnrichment = {
  whyNow?: string;
  parkingNotes?: string;
  bathroomNotes?: string;
  bestTimeOfDay?: string;
  practicalTips?: string;
};

type Stop = {
  id: string;
  name: string;
  stopType?: string | null;
  dayIndex?: number | null;
  displayOrder?: number | null;
  durationMinutes?: number | null;
  isVisited?: boolean;
  visited?: boolean;
  tip?: string | null;
  address?: string | null;
  travelMinsFromPrevious?: number | null;
  enrichment?: StopEnrichment | null;
  metadata?: StopMetadata | null;
  cityGroup?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  kidFitBias?: string | null;
};

type TripData = {
  id: string;
  name: string;
  status: string;
  destination?: string | null;
  city?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  pace?: string | null;
  plannerTripDays?: number | null;
  tripDays?: number | null;
  travelers?: Array<{ name: string; isParent?: boolean; age?: string }> | null;
  coverImageUrl?: string | null;
  firstPhotoUrl?: string | null;
  stayLocations?: Array<{ cityName: string; address?: string; lat?: number; lng?: number }> | null;
  currentDayIndex?: number | null;
  stops: Stop[];
};

type TodayState =
  | 'no_trip'
  | 'pre_trip_far'
  | 'pre_trip_tomorrow'
  | 'morning'
  | 'en_route'
  | 'at_stop_frozen'
  | 'stop_complete'
  | 'day_complete'
  | 'trip_complete'
  | 'day_history'
  | 'day_history_empty';

// States in which the user is actively executing their day — polling must
// not overwrite todayState with server-derived state while they're in flight.
const LOCKED_STATES: TodayState[] = [
  'en_route', 'at_stop_frozen', 'stop_complete', 'day_complete', 'trip_complete',
];

type Pace = 'balanced' | 'easier' | 'faster';

const ALL_STATES: TodayState[] = [
  'no_trip','pre_trip_far','pre_trip_tomorrow','morning',
  'en_route','at_stop_frozen','stop_complete','day_complete',
  'trip_complete','day_history','day_history_empty',
];

// ─── Dev mock data ────────────────────────────────────────────────────────────

const MOCK_TRIP: TripData = {
  id: 'mock-trip',
  name: 'Chicago Family Adventure',
  status: 'active',
  destination: 'Chicago',
  city: 'Chicago',
  startDate: '2026-05-30',
  endDate: '2026-06-02',
  plannerTripDays: 4,
  travelers: [
    { name: 'Alex', isParent: true },
    { name: 'Jamie', age: '8' },
    { name: 'Riley', age: '5' },
  ],
  stops: [
    {
      id: 's1', name: 'The Art Institute of Chicago', stopType: 'museum',
      address: '111 S Michigan Ave, Chicago, IL 60603',
      dayIndex: 0, displayOrder: 1, durationMinutes: 90,
      metadata: {
        ticketSignal: true, anchorScore: 9, dropPriority: 1, travelMinutes: 12,
        doThisFirst: 'Head straight to the Thorne Miniature Rooms — lines build up fast after 10 AM.',
        restroomConfidence: 'Ground floor near coat check',
      },
      enrichment: {
        whyNow: 'Head straight to the Thorne Miniature Rooms — lines build up fast after 10 AM.',
        parkingNotes: 'Millennium Garage (1⁄2 block north) · $25 flat rate on weekends',
      },
    },
    {
      id: 's2', name: 'Millennium Park & Cloud Gate', stopType: 'landmark',
      address: '201 E Randolph St, Chicago, IL 60602',
      dayIndex: 0, displayOrder: 2, durationMinutes: 60,
      metadata: { ticketSignal: false, anchorScore: 8, dropPriority: 3, travelMinutes: 8,
        restroomConfidence: 'Near the Jay Pritzker Pavilion' },
      enrichment: { parkingNotes: 'Street parking or same Millennium Garage' },
    },
    {
      id: 's3', name: "Giordano's Deep Dish Lunch", stopType: 'meal',
      address: '130 E Randolph St, Chicago, IL 60601',
      dayIndex: 0, displayOrder: 3, durationMinutes: 75,
      metadata: { ticketSignal: false },
    },
    {
      id: 's4', name: 'Shedd Aquarium', stopType: 'zoo',
      address: '1200 S Lake Shore Dr, Chicago, IL 60605',
      dayIndex: 0, displayOrder: 4, durationMinutes: 120,
      metadata: {
        ticketSignal: true, anchorScore: 9, dropPriority: 2, travelMinutes: 15,
        doThisFirst: 'Catch the 11 AM dolphin show — it sells out.',
        restroomConfidence: 'Multiple locations on each floor',
      },
      enrichment: {
        whyNow: 'Catch the 11 AM dolphin show — it sells out.',
        parkingNotes: 'Soldier Field South Lot · $25 · 5 min walk',
      },
    },
    {
      id: 's5', name: 'Navy Pier', stopType: 'park',
      address: '600 E Grand Ave, Chicago, IL 60611',
      dayIndex: 0, displayOrder: 5, durationMinutes: 60,
      metadata: { ticketSignal: false, dropPriority: 4, travelMinutes: 10,
        restroomConfidence: 'Near the main entrance' },
    },
  ],
};

// ─── apiFetch ─────────────────────────────────────────────────────────────────

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
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DURATION_BY_TYPE: Record<string, number> = {
  planetarium: 150, aquarium: 150, zoo: 180, theme_park: 240, water_park: 240,
  museum: 105, childrens_museum: 120, science_museum: 120, science_center: 120,
  art_museum: 90, history_museum: 90,
  national_park: 120, beach: 90, park: 60, garden: 60, nature: 60,
  observation_deck: 60, viewpoint: 45, landmark: 45, monument: 30, bridge: 30,
  restaurant: 60, meal: 60, lunch: 60, dinner: 60, breakfast: 45, cafe: 30,
  theater: 120, show: 120, sports: 180, adventure: 90,
  market: 60, shopping: 45, street: 45,
};

function getStopDuration(stop: Stop): number {
  if (stop.durationMinutes) return stop.durationMinutes;
  const metaDur = parseMetadata(stop.metadata).durationMinutes;
  const typeFloor = DURATION_BY_TYPE[stop.stopType ?? ''] ?? 75;
  if (metaDur) return Math.max(metaDur, typeFloor);
  return typeFloor;
}

function familyInterStopGap(childrenAges: number[]): number {
  // Small additive transition buffer on top of the displayed travel time
  let gap = 5;
  if (childrenAges.some(a => a < 5)) gap += 5;
  if (childrenAges.length >= 3) gap += 5;
  return gap;
}

function effectiveDuration(stop: Stop, pace: Pace): number {
  const base = getStopDuration(stop);
  if (pace === 'faster') return Math.max(30, base - 15);
  return base;
}

function getTravelToNext(stops: Stop[], idx: number): number {
  if (idx >= stops.length - 1) return 0;
  const next = stops[idx + 1];
  const fromAPI = (next as Stop & { travelMinsFromPrevious?: number | null }).travelMinsFromPrevious;
  const fromMeta = parseMetadata(next.metadata).travelMinutes;
  // Return the raw travel time shown to the user — no hidden padding
  return fromAPI ?? fromMeta ?? 15;
}

function isMealStop(type?: string | null): boolean {
  return ['meal', 'restaurant', 'lunch', 'dinner', 'breakfast', 'cafe'].includes(type ?? '');
}

function buildStopTimes(stops: Stop[], pace: Pace = 'balanced', childrenAges: number[] = []): string[] {
  const gap = familyInterStopGap(childrenAges);
  let cursor = 9 * 60;
  return stops.map((s, i) => {
    const h = Math.floor(cursor / 60);
    const m = cursor % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const label = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    const travel = getTravelToNext(stops, i);
    const nextIsMeal = i < stops.length - 1 && isMealStop(stops[i + 1].stopType);
    // Add travel + small family buffer so displayed times match the travel shown between stops
    const interGap = i < stops.length - 1 ? (travel + (nextIsMeal ? 0 : gap)) : 0;
    cursor += effectiveDuration(s, pace) + interGap;
    return label;
  });
}

function estimateTotalTime(stops: Stop[], pace: Pace = 'balanced', childrenAges: number[] = []): string {
  const gap = familyInterStopGap(childrenAges);
  const content = stops.filter(s => !isMealStop(s.stopType));
  const total = content.reduce((sum, s, i) => {
    const travel = getTravelToNext(content, i);
    return sum + effectiveDuration(s, pace) + (i < content.length - 1 ? travel + gap : 0);
  }, 0);
  if (total < 60) return `~${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

function formatDayDate(startDate?: string | null, dayIndex?: number): string {
  if (!startDate) return '';
  try {
    const d = parseLocalDate(startDate)!;
    d.setDate(d.getDate() + (dayIndex ?? 0));
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function parseMetadata(raw: StopMetadata | Record<string, unknown> | null | undefined): StopMetadata {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as StopMetadata; } catch { return {}; }
  }
  return raw as StopMetadata;
}

function hasTicketSignal(raw: StopMetadata | Record<string, unknown> | null | undefined): boolean {
  const m = parseMetadata(raw);
  return m.ticketSignal === true || (m.ticketSignal as unknown) === 'true';
}

function openTicketSearch(stopName: string) {
  Linking.openURL(
    'https://www.google.com/search?q=' + encodeURIComponent(stopName + ' tickets')
  ).catch(() => {});
}

function daysUntilDate(dateStr?: string | null, simNow?: Date | null): number {
  if (!dateStr) return 0;
  try {
    const target = parseLocalDate(dateStr);
    if (!target) return 0;
    target.setHours(0, 0, 0, 0);
    const now = simNow ? new Date(simNow) : new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - now.getTime()) / 86_400_000);
  } catch { return 0; }
}

// ─── SheetModal ───────────────────────────────────────────────────────────────

function SheetModal({
  visible, onClose, children,
}: {
  visible: boolean; onClose: () => void; children: React.ReactNode;
}) {
  const translateY = useRef(new Animated.Value(800)).current;
  const shInsets = useSafeAreaInsets();
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
      <Animated.View style={[sm.sheet, { transform: [{ translateY }], paddingBottom: TAB_BAR_H + shInsets.bottom + 20 }]}>
        {children}
      </Animated.View>
    </View>
  );
}

const sm = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: '91%', backgroundColor: C.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
  },
});

type SotwFilter = 'playground' | 'beach' | 'coffee' | 'food' | 'restrooms';
interface SotwPlace {
  placeId: string; name: string; vicinity: string;
  lat: number; lng: number;
  photoReference: string | null; detourMinutes: number; onRoute: boolean;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

function haversineDistMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


/** Parse date string as LOCAL midnight — strips UTC offset so June 10 00:00Z stays June 10 on any device timezone. */
function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const datePart = s.split('T')[0].split(' ')[0];
  const ymd = datePart.split('-').map(Number);
  if (ymd.length !== 3 || ymd.some(isNaN)) return null;
  return new Date(ymd[0], ymd[1] - 1, ymd[2]);
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading } = useAuth();
  const isFree = !authLoading && isFreePlan(user?.subscriptionTier);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const { speak, isSpeaking } = useSpeech();
  const kids = useKids();
  useFrauncesFonts({ Fraunces_900Black }); // load Fraunces display font
  const params = useLocalSearchParams<{ tripId?: string; dayIndex?: string; forceComplete?: string }>();

  const rawDevState = __DEV__
    ? (params as Record<string, string>).state
    : undefined;
  const devState: TodayState | undefined =
    rawDevState && (ALL_STATES as string[]).includes(rawDevState)
      ? (rawDevState as TodayState)
      : undefined;

  // Dev-only date override: set AsyncStorage 'dev_date_override' = 'YYYY-MM-DD' to force
  // today's date for testing date-gated flows (e.g. airplane-mode Today-tab verification).
  // Clear it by tapping the purple banner, or: AsyncStorage.removeItem('dev_date_override')
  const [devDate, setDevDate] = useState<Date | null>(null);
  useEffect(() => {
    if (!__DEV__) return;
    AsyncStorage.getItem('dev_date_override').then(raw => {
      if (!raw) return;
      const d = new Date(raw + 'T12:00:00');
      if (!isNaN(d.getTime())) setDevDate(d);
    }).catch(() => {});
  }, []);

  const [todayState, setTodayState]             = useState<TodayState>(devState ?? 'no_trip');
  const [trip, setTrip]                         = useState<TripData | null>(null);
  const [dayStops, setDayStops]                 = useState<Stop[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [selectedPace, setSelectedPace]         = useState<Pace>('balanced');
  const [loading, setLoading]                   = useState(true);
  const [fromCache, setFromCache]               = useState(false);
  const [starting, setStarting]                 = useState(false);
  const [checklistOpen, setChecklistOpen]       = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [resolvedTripId, setResolvedTripId]     = useState<string | null>(params.tripId ?? null);
  const [dayWrapped, setDayWrapped]             = useState(false);
  const [dayIndexOverride, setDayIndexOverride] = useState<number | null>(null);
  // Always auto-advance to today's day — no user override
  const todayDayIndex = useMemo(() => {
    if (!trip?.startDate) return 0;
    const start = parseLocalDate(trip.startDate)!;
    const today = devDate ? new Date(devDate) : new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, Math.min(diff, (trip.tripDays ?? 1) - 1));
  }, [trip?.startDate, trip?.tripDays, devDate]);
  const resolvedDayIndex = dayIndexOverride ?? todayDayIndex;

  // Day-gating flags — derived from trip state, recalculated on every render
  const isDayStarted = typeof trip?.currentDayIndex === 'number'
    && trip.currentDayIndex >= todayDayIndex;
  const tripHasStarted = (() => {
    if (!trip?.startDate) return false;
    const start = parseLocalDate(trip.startDate)!;
    start.setHours(0, 0, 0, 0);
    const today = devDate ? new Date(devDate) : new Date(); today.setHours(0, 0, 0, 0);
    return today.getTime() >= start.getTime();
  })();

  const tripIsUpcoming = (() => {
    if (!trip?.startDate) return false;
    const start = parseLocalDate(trip.startDate)!;
    start.setHours(0, 0, 0, 0);
    const today = devDate ? new Date(devDate) : new Date(); today.setHours(0, 0, 0, 0);
    return start.getTime() > today.getTime();
  })();

  const [viewingDay, setViewingDay]             = useState<number>(0);
  const [activeSheet, setActiveSheet]           = useState<'none' | 'rescue' | 'stopsOnTheWay'>('none');
  const [showChangedMind, setShowChangedMind]   = useState(false);
  const [rescueType, setRescueType]             = useState<'behind' | 'tired' | 'skip' | 'fun'>('behind');
  const [atStopStartTime, setAtStopStartTime]   = useState<number | null>(null);
  const [markingVisited, setMarkingVisited]     = useState(false);
  const [visitedElapsed, setVisitedElapsed]     = useState<number | null>(null);
  const [kidQuotes, setKidQuotes]               = useState<Record<string, string>>({});
  const [dayRating, setDayRating]               = useState<'okay' | 'good' | 'amazing' | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [visitedPhotos, setVisitedPhotos]       = useState<string[]>([]);
  const [wrapPhotos, setWrapPhotos]             = useState<string[]>([]);
  const [isWrapping, setIsWrapping]             = useState(false);
  const [historyDayIndex, setHistoryDayIndex]   = useState<number>(0);
  const [previousState, setPreviousState]       = useState<TodayState | null>(null);
  const [showMenu, setShowMenu]                 = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [kidsXp, setKidsXp]                     = useState<number | null>(null);
  const [showReflectionSheet, setShowReflectionSheet] = useState(false);
  const [reflectionSaved, setReflectionSaved]         = useState(false);
  const [rainAlert, setRainAlert]               = useState<{ chance: number } | null>(null);
  const [currentTemp, setCurrentTemp]           = useState<number | null>(null);
  const [indoorSheetVisible, setIndoorSheetVisible] = useState(false);
  const [isOffline, setIsOffline]               = useState(false);
  const [showFeedback, setShowFeedback]          = useState(false);
  const [showHotelSheet, setShowHotelSheet]      = useState(false);
  const [showDirections, setShowDirections]      = useState(false);
  const [showRescue, setShowRescue]              = useState(false);
  const [previewStop, setPreviewStop] = useState<{
    name: string;
    stopType: string | null;
    description?: string | null;
    address?: string | null;
    gpAddressVerified?: string | null;
    gpPriceLevel?: number | null;
    enrichment?: { bestTimeOfDay?: string } | Record<string, unknown> | null;
  } | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>();
  const [previewReplacingName, setPreviewReplacingName] = useState<string | undefined>();
  const [previewImageLoading, setPreviewImageLoading] = useState(false);
  const [kidPickerVisible, setKidPickerVisible]  = useState(false);
  const [kidsForPicker, setKidsForPicker]        = useState<PlayerRecord[]>([]);
  const pendingKidsParams = useRef<{ stopId: string; stopName: string; tripId: string } | null>(null);
  const [rescueInitialOption, setRescueInitialOption] = useState<'weather' | undefined>(undefined);
  // ── Stops on the Way ──────────────────────────────────────────────────────────
  const [sotwLocDenied, setSotwLocDenied]             = useState(false);
  const [sotwFilter, setSotwFilter]                   = useState<SotwFilter>('playground');
  const [sotwPlaces, setSotwPlaces]                   = useState<SotwPlace[]>([]);
  const [sotwLoading, setSotwLoading]                 = useState(false);
  const [sotwUserLoc, setSotwUserLoc]                 = useState<{ lat: number; lng: number } | null>(null);
  const [activeBreakPlace, setActiveBreakPlace]       = useState<SotwPlace | null>(null);
  const [selectedPlaceId, setSelectedPlaceId]         = useState<string | null>(null);
  const [breakQuote, setBreakQuote]                   = useState('');
  const [breakPhotos, setBreakPhotos]                 = useState<string[]>([]);
  const sotwSlideY  = useRef(new Animated.Value(900)).current;
  const breakSlideY = useRef(new Animated.Value(900)).current;
  const sotwChildAges     = (trip?.travelers ?? [])
    .filter((t: any) => !t.isParent && t.age)
    .map((t: any) => parseInt(t.age as string, 10))
    .filter((n: number) => n > 0 && n < 18);
  const sotwYoungestAge   = sotwChildAges.length > 0 ? Math.min(...sotwChildAges) : null;
  const sotwYoungestKid   = (trip?.travelers ?? []).filter((t: any) => {
    const a = parseInt(t.age as string, 10);
    return !t.isParent && !isNaN(a) && a > 0 && a < 18;
  }).reduce((acc: any, t: any) => {
    const a = parseInt(t.age as string, 10);
    if (isNaN(a)) return acc;
    return !acc || a < parseInt(acc.age as string, 10) ? t : acc;
  }, null as any);
  const youngestChildName = (sotwYoungestKid?.name as string | undefined) ?? 'the kids';
  const showBreakCard     = useMemo(
    () => todayState === 'en_route' && sotwYoungestAge !== null && sotwYoungestAge < 9,
    [todayState, sotwYoungestAge]
  );
  console.log('[SOTW] sotwYoungestAge:', sotwYoungestAge, 'trip.children:', trip?.children);
  const [localSavedHotel, setLocalSavedHotel]   = useState<string | null>(null);

  // Persist hotel across navigation — load on mount/trip change
  useEffect(() => {
    if (!trip?.id) return;
    AsyncStorage.getItem(`hotel_${trip.id}_day${resolvedDayIndex}`).then(saved => {
      if (saved) setLocalSavedHotel(saved);
    }).catch(() => {});
  }, [trip?.id, resolvedDayIndex]);
  const [feedbackStop, setFeedbackStop]          = useState<Stop | null>(null);
  const [userDistMi, setUserDistMi]             = useState<number | null>(null);
  const [tcMomentQuotes, setTcMomentQuotes]     = useState<{ quote: string; name: string }[]>([]);

  // Track visited stop name for stop_complete display
  const visitedStopNameRef = useRef<string>('');
  // Once the user enters execution mode (en_route), never let a data refresh
  // or focus event reset todayState back to morning.
  const executionStartedRef = useRef(false);

  // ── Pulse animation for En Route dot ──
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (todayState !== 'en_route' && todayState !== 'at_stop_frozen') { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [todayState]);


  // ── Live user location for distance pill ──
  useEffect(() => {
    (async () => {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        const stop = currentStop;
        if (!stop?.latitude || !stop?.longitude) return;
        let pos: ExpoLocation.LocationObject | null = null;
        if (status === 'granted') {
          pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
        } else {
          pos = await ExpoLocation.getLastKnownPositionAsync({});
        }
        if (!pos) return;
        const dist = haversineDistMi(
          pos.coords.latitude, pos.coords.longitude,
          parseFloat(stop.latitude as string), parseFloat(stop.longitude as string)
        );
        setUserDistMi(Math.round(dist * 10) / 10);
      } catch {}
    })();
  }, [dayStops[currentStopIndex]?.id]);

  useEffect(() => {
    ExpoLocation.getForegroundPermissionsAsync().then(({ status }) => {
      setSotwLocDenied(status === 'denied');
    }).catch(() => {});
  }, []);

  // ── Mark trip completed server-side when trip_complete is reached (fire-and-forget) ──
  useEffect(() => {
    if (todayState !== 'trip_complete' || !resolvedTripId) return;
    apiFetch(`/api/travel/trips/${resolvedTripId}/complete`, { method: 'POST' }).catch(() => {});
  }, [todayState, resolvedTripId]);

  // ── Fetch real kid quotes when trip is complete ──
  useEffect(() => {
    if (todayState !== 'trip_complete' || !resolvedTripId) return;
    apiFetch<{ moments: Array<{ kidPromptResponse?: string | null; explorerName?: string | null }> }>(`/api/travel/trips/${resolvedTripId}/moments`)
      .then((data) => {
        const quotes = (data.moments ?? [])
          .filter((m) => m.kidPromptResponse?.trim())
          .slice(0, 3)
          .map((m) => ({ quote: m.kidPromptResponse!, name: m.explorerName ?? 'Explorer' }));
        setTcMomentQuotes(quotes);
      })
      .catch(() => {});
  }, [todayState, resolvedTripId]);

  // ── Open-Meteo weather fetch for EN_ROUTE rain alert ──
  useEffect(() => {
    const s = dayStops[currentStopIndex];
    if (!s?.latitude || !s?.longitude) { setRainAlert(null); return; }
    const lat = parseFloat(s.latitude);
    const lon = parseFloat(s.longitude);
    if (isNaN(lat) || isNaN(lon)) { setRainAlert(null); return; }
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&timezone=auto&forecast_days=1`
    )
      .then(r => r.json())
      .then((d: Record<string, unknown>) => {
        const now = new Date();
        const probs = ((d.hourly as Record<string,unknown>)?.precipitation_probability ?? []) as number[];
        const nextThree = probs.slice(now.getHours(), now.getHours() + 3);
        const maxChance = Math.max(...nextThree, 0);
        setRainAlert(maxChance > 40 ? { chance: maxChance } : null);
        if (maxChance > 40 && resolvedTripId) {
          onWeatherAlert({
            tripId: resolvedTripId,
            dayIndex: resolvedDayIndex,
            condition: 'Rain',
          }).catch(() => {});
        }
      })
      .catch(() => setRainAlert(null));
  }, [dayStops, currentStopIndex]);

  // ── Open-Meteo temperature fetch for hero weather pill ──
  useEffect(() => {
    const stops = dayStops;
    if (stops.length === 0) return;
    const first = stops.find(s => s.latitude && s.longitude) ?? stops[0];
    if (!first?.latitude || !first?.longitude) return;
    const lat = parseFloat(first.latitude);
    const lon = parseFloat(first.longitude);
    if (isNaN(lat) || isNaN(lon)) return;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=fahrenheit&timezone=auto`
    )
      .then(r => r.json())
      .then((d: Record<string, unknown>) => {
        const cur = d.current as Record<string, unknown> | undefined;
        const t = cur?.temperature_2m;
        if (typeof t === 'number') setCurrentTemp(Math.round(t));
      })
      .catch(() => {});
  }, [dayStops]);

  // ── Bounce animation for stop_complete hero emoji ──
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (todayState !== 'stop_complete') return;
    bounceAnim.setValue(0);
    Animated.spring(bounceAnim, {
      toValue: 1, useNativeDriver: true,
      damping: 8, stiffness: 120,
    }).start();
  }, [todayState]);

  // ── Sheet slide animation ──
  const sheetAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(sheetAnim, {
      toValue: activeSheet !== 'none' ? 1 : 0,
      useNativeDriver: true,
      damping: 22, stiffness: 180,
    }).start();
  }, [activeSheet]);

  // ── Track time entering At Stop ──
  useEffect(() => {
    if (todayState === 'at_stop_frozen') {
      setAtStopStartTime(prev => prev ?? Date.now());
      const stop = dayStops[currentStopIndex];
      if (stop && resolvedTripId) {
        Analytics.track('stop_arrived', { trip_id: resolvedTripId, stop_id: stop.id, stop_type: stop.stopType ?? 'unknown' });
      }
    } else if (todayState === 'en_route' || todayState === 'morning') {
      setAtStopStartTime(null);
    }
  }, [todayState]);

  useEffect(() => {
    if (todayState !== 'en_route') return;
    if (dayStops.length > 0 && dayStops.every(s => s.isVisited || s.visited)) {
      setTodayState('day_complete');
    }
  }, [todayState, dayStops]);

  // ── Analytics: day completed ──
  useEffect(() => {
    if (todayState !== 'day_complete') return;
    const visited = dayStops.filter(s => s.isVisited || s.visited).length;
    const skipped = dayStops.filter((s: any) => s.isSkipped).length;
    Analytics.track('day_completed', { trip_id: resolvedTripId ?? '', day_index: resolvedDayIndex, stops_visited: visited, stops_skipped: skipped });
  }, [todayState]);

  // ── Paywall: show after Day 1 completes for free users ──
  useEffect(() => {
    if (todayState !== 'day_complete') return;
    if (resolvedDayIndex !== 0) return;
    if (!isFree) return;
    setUpgradeVisible(true);
  }, [todayState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Analytics: rescue sheet opened ──
  useEffect(() => {
    if (!showRescue) return;
    Analytics.track('rescue_sheet_opened', { trip_id: resolvedTripId ?? '', from_state: todayState });
  }, [showRescue]);

  // ── Close menu when state changes ──
  useEffect(() => { setShowMenu(false); }, [todayState]);

  // ── Offline detector ──
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected ?? true));
    });
    return () => { unsub(); };
  }, []);

  // ── Fetch kids XP when day is complete ──
  useEffect(() => {
    if (todayState !== 'day_complete') return;
    if (!resolvedTripId) return;
    const children = (trip?.travelers ?? []).filter(t => !t.isParent);
    const explorerId = children[0]?.name ?? 'explorer';
    kidsAPI.getProgress(resolvedTripId, explorerId)
      .then(prog => setKidsXp(prog.xp ?? null))
      .catch(() => {});
  }, [todayState, resolvedTripId, trip]);

  // ── Load trip ──
  const loadTrip = useCallback(async () => {
    const wasAlreadyResolved = !!resolvedTripId;
    if (!wasAlreadyResolved) setLoading(true);
    setError(null);
    setFromCache(false);
    let localFromCache = false;
    try {
      // Check for state override from atstop.tsx feedback
      const override = await AsyncStorage.getItem('today_state_override');
      // force_morning: "Start Day N" was tapped — break out of any locked state
      // so the new day's stops are evaluated fresh (fixes day_complete lock across days)
      let forceReset = false;
      if (override) {
        await AsyncStorage.removeItem('today_state_override');
        if (override === 'force_morning') {
          forceReset = true;
          executionStartedRef.current = false;
        } else if (override === 'stop_complete') {
          const elapsed = await AsyncStorage.getItem('atStopElapsed');
          if (elapsed) {
            setVisitedElapsed(parseInt(elapsed, 10) || null);
            await AsyncStorage.removeItem('atStopElapsed');
          }
          await AsyncStorage.removeItem('atStopFrozen');
          await AsyncStorage.removeItem('atStopFrozenTripId');
          if (!devState) setTodayState('stop_complete');
        }
      }

      let tid = resolvedTripId;
      if (!tid) {
        let data: { trips: TripData[] };
        try {
          data = await apiFetch<{ trips: TripData[] }>('/api/travel/trips');
          AsyncStorage.setItem('cache_trips', JSON.stringify(data)).catch(() => {});
        } catch {
          if (__DEV__) {
            data = { trips: [MOCK_TRIP] };
          } else {
            const cachedRaw = await AsyncStorage.getItem('cache_trips').catch(() => null);
            if (cachedRaw) {
              try { data = JSON.parse(cachedRaw); localFromCache = true; } catch { data = { trips: [] }; }
            } else {
              setError('Could not connect to server.');
              return;
            }
          }
        }
        const sortedTrips = [...(data.trips ?? [])].sort((a, b) => {
          if (!a.startDate) return 1;
          if (!b.startDate) return -1;
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });
        const todayMs = (devDate ? new Date(devDate) : new Date()).setHours(0,0,0,0);
        const active = sortedTrips.find(t => {
          if (t.status === 'active' || t.status === 'in_progress') return true;
          if (!t.startDate || !t.endDate) return false;
          const s = parseLocalDate(t.startDate)!; s.setHours(0,0,0,0);
          const e = parseLocalDate(t.endDate)!;   e.setHours(23,59,59,999);
          return todayMs >= s.getTime() && todayMs <= e.getTime();
        })
        ?? sortedTrips.find(t => {
          if (!t.startDate || t.status === 'completed') return false;
          const s = parseLocalDate(t.startDate);
          if (!s) return false;
          s.setHours(0, 0, 0, 0);
          return s.getTime() > todayMs;
        })
        ?? sortedTrips.find(t => t.startDate)
        ?? sortedTrips[0];
        if (!active) {
          if (!devState) setTodayState('no_trip');
          return;
        }
        tid = active.id;
        setResolvedTripId(tid);
      }

      let t: TripData;
      try {
        t = await apiFetch<TripData>(`/api/travel/trips/${tid}`);
      } catch {
        const cached = await getCachedTrip(tid);
        if (cached) {
          t = cached as TripData;
          localFromCache = true;
        } else if (__DEV__) {
          t = MOCK_TRIP;
        } else {
          if (!wasAlreadyResolved) setError('Failed to load trip details.');
          return;
        }
      }
      setTrip(t);
      setFromCache(localFromCache);
      if (!localFromCache && tid) {
        AsyncStorage.setItem(`roamus_trip_cache_${tid}`, JSON.stringify({ data: t, cachedAt: Date.now() })).catch(() => {});
      }

      // Day-advance: if user tapped "Done" on the Day Story screen, advance to next day
      const dayAdvancedKey = `roamus_day_advanced_${tid}`;
      const dayAdvancedStr = await AsyncStorage.getItem(dayAdvancedKey);
      let localDayIdx = resolvedDayIndex;
      if (dayAdvancedStr !== null) {
        await AsyncStorage.removeItem(dayAdvancedKey);
        localDayIdx = Number(dayAdvancedStr);
        setDayIndexOverride(localDayIdx);
        setDayWrapped(false);
        forceReset = true; // unlock day_complete and land on morning
        setCurrentStopIndex(0);
      }

      const stops = (t.stops ?? [])
        .filter(s => (s.dayIndex ?? 0) === localDayIdx)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setDayStops(stops);
      // Always sync currentStopIndex with server-confirmed visited state so stops
      // marked complete from the At Stop tab are reflected when Today refocuses.
      // This is a floor operation: it can only advance the index, never go back.
      {
        const lastVisitedIdx = stops.reduce(
          (best, s, i) => (s.isVisited || s.visited) ? i : best, -1
        );
        const serverDerivedIdx = Math.min(lastVisitedIdx + 1, stops.length - 1);
        setCurrentStopIndex(prev => Math.max(prev, serverDerivedIdx));
      }

      // Source of truth: if the server already marks this trip completed,
      // reflect it immediately so trip_complete survives tab-switches/remounts.
      if (t.status === 'completed') { setTodayState('trip_complete'); return; }

      if (forceReset && !devState) {
        // "Start Day N" was tapped explicitly — always land on morning regardless of DB visited state
        setTodayState('morning');
        await AsyncStorage.multiRemove(['atStopFrozen', 'atStopFrozenTripId']).catch(() => {});
      } else if (!devState && override !== 'stop_complete' && !LOCKED_STATES.includes(todayState) && !executionStartedRef.current) {
        const days = daysUntilDate(t.startDate, devDate);
        if (days > 1) {
          setTodayState('pre_trip_far');
        } else if (days === 1) {
          setTodayState('pre_trip_tomorrow');
        } else {
          // Lapsed-trip: if end_date is in the past and trip not yet completed,
          // show the completion screen regardless of visited state.
          const _tripEnd = t.endDate ? parseLocalDate(t.endDate) : null;
          if (_tripEnd) _tripEnd.setHours(23, 59, 59, 999);
          if (_tripEnd != null && _tripEnd.getTime() < Date.now() && t.status !== 'completed') {
            // Only show trip_complete when user tapped 'Wrap up your trip' on Home.
            // Direct navigation from the trip plan stays in morning so nothing fires unexpectedly.
            if (params.forceComplete === '1') {
              setTodayState('trip_complete');
            } else {
              setTodayState('morning');
            }
          } else {
            const allVisited = stops.length > 0 && stops.every(s => s.isVisited || s.visited);
            const lastVisited = stops.reduce(
              (best, s, i) => (s.isVisited || s.visited) ? i : best, -1
            );
            if (allVisited) {
              // Key on last day that has real (non-meal) stops, not last calendar day.
              // Guard: if no stops loaded yet, fall back to tripDays-1 to avoid Day-1 false fire.
              const nonMealStops = (t.stops ?? []).filter(s => !isMealStop(s.stopType));
              const lastPopulatedDay = nonMealStops.length > 0
                ? Math.max(...nonMealStops.map(s => s.dayIndex ?? 0))
                : (t.plannerTripDays ?? t.tripDays ?? 1) - 1;
              if (localDayIdx >= lastPopulatedDay) {
                setTodayState('trip_complete');
              } else {
                setTodayState('day_complete');
              }
            } else if (lastVisited >= 0 && lastVisited < stops.length - 1) {
              setCurrentStopIndex(lastVisited + 1);
              executionStartedRef.current = true;
              setTodayState('en_route');
            } else {
              setTodayState('morning');
            }
          }
        }
      }

      // Restore AT_STOP_FROZEN only for the same trip — clear stale frozen state
      if (!forceReset && !devState && override !== 'stop_complete' && !LOCKED_STATES.includes(todayState) && !executionStartedRef.current) {
        const frozenFlag   = await AsyncStorage.getItem('atStopFrozen');
        const frozenTripId = await AsyncStorage.getItem('atStopFrozenTripId');
        if (frozenFlag === 'true' && frozenTripId === tid) {
          setTodayState('at_stop_frozen');
        } else if (frozenFlag === 'true') {
          // Stale frozen state from a different trip — discard it
          await AsyncStorage.multiRemove(['atStopFrozen', 'atStopFrozenTripId']);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [resolvedTripId, resolvedDayIndex, devState]);

  useFocusEffect(useCallback(() => { loadTrip(); }, [loadTrip]));

  // ── 30-second sync polling for shared trips ──
  useEffect(() => {
    if (!(trip as any)?.isShared || !resolvedTripId) return;
    const interval = setInterval(() => { loadTrip(); }, 30_000);
    return () => clearInterval(interval);
  }, [(trip as any)?.isShared, resolvedTripId, loadTrip]);

  // ── Start Day handler ──
  async function handleStartDay() {
    if (!trip) return;
    if (isFree && resolvedDayIndex > 0) { setUpgradeVisible(true); return; }
    const asked = await hasAskedPermission();
    if (!asked) {
      setShowPermissionModal(true);
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedPace === 'easier') {
      setStarting(true);
      try {
        await apiFetch(`/api/travel/trips/${trip.id}/apply-preferences`, {
          method: 'POST',
          body: JSON.stringify({ pace: 'relaxed' }),
        });
      } catch {
        Alert.alert('Error', "Couldn't apply Easier mode — starting anyway");
      } finally {
        setStarting(false);
      }
    }
    setCurrentStopIndex(0);
    executionStartedRef.current = true;
    setTodayState('en_route');
    Analytics.track('day_started', { trip_id: resolvedTripId ?? trip.id, day_index: resolvedDayIndex });
    // Persist the started day to DB so the gating flag isDayStarted becomes true
    try {
      await apiFetch(`/api/travel/trips/${trip.id}/start-day`, {
        method: 'PATCH',
        body: JSON.stringify({ dayIndex: resolvedDayIndex }),
      });
      await loadTrip();
    } catch (e) {
      // Non-fatal — the UI already advanced; DB write failure is logged server-side
    }
    if (resolvedTripId && dayStops[0]) {
      onEnRoute({
        tripId: resolvedTripId,
        dayIndex: resolvedDayIndex,
        stopId: dayStops[0].id,
        nextStopName: dayStops[0].name,
        driveMinutes: dayStops[0].travelMinsFromPrevious ?? 15,
      }).catch(() => {});
    }
  }

  // ── Mark stop visited (from at_stop_frozen) ──
  async function handleMarkVisited() {
    const stop = dayStops[currentStopIndex] ?? null;
    if (!stop) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMarkingVisited(true);
    const elapsed = atStopStartTime ? Math.round((Date.now() - atStopStartTime) / 60000) : null;
    visitedStopNameRef.current = stop.name;
    try {
      await apiFetch(`/api/travel/stops/${stop.id}/visit`, { method: 'POST' });
    } catch { /* best-effort */ }
    // Send dwell time signal — fire-and-forget, never blocks the UI
    if (elapsed != null && elapsed > 0) {
      const signalType = elapsed >= 15 ? 'long_dwell' : 'short_dwell';
      apiFetch(`/api/travel/stops/${stop.id}/quality-signal`, {
        method: 'POST',
        headers: { 'x-adventure-parent': '1' },
        body: JSON.stringify({ signalType, signalValue: elapsed }),
      }).catch(() => {});
    }
    setMarkingVisited(false);
    setVisitedElapsed(elapsed);
    bounceAnim.setValue(0);
    Analytics.track('stop_visited', { trip_id: resolvedTripId ?? '', stop_id: stop.id, dwell_minutes: elapsed ?? 0 });
    setCurrentStopIndex(i => i + 1);
    setTodayState('stop_complete');
    setFeedbackStop(stop);
    setShowFeedback(true);
  }

  // ── Remove stop from morning list (swipe-left) ──
  function handleRemoveStop(stop: { id: string; name: string }) {
    Alert.alert(
      'Remove Stop',
      `You are removing the ${stop.name} from your trip.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/travel/stops/${stop.id}`, { method: 'DELETE' });
              setDayStops(prev => prev.filter(s => s.id !== stop.id));
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Could not remove stop.';
              Alert.alert('Remove failed', msg);
            }
          },
        },
      ],
    );
  }

  // ── Skip / delete stop ──
  async function handleSkipStop() {
    const stop = dayStops[currentStopIndex] ?? null;
    if (!stop) return;
    try {
      await apiFetch(`/api/travel/stops/${stop.id}`, { method: 'DELETE' });
    } catch { /* best-effort */ }
    Analytics.track('stop_skipped', { trip_id: resolvedTripId ?? '', stop_id: stop.id, reason: 'manual_skip' });
    setDayStops(prev => prev.filter(s => s.id !== stop.id));
    setActiveSheet('none');
    executionStartedRef.current = true;
    setTodayState('en_route');
  }

  // ── Changed My Mind: skip current stop from en_route + send quality signal ──
  async function handleChangedMindSkip(signal: string) {
    const s = dayStops[currentStopIndex] ?? null;
    if (!s) return;
    try {
      await apiFetch(`/api/travel/stops/${s.id}/quality-signal`, {
        method: 'POST',
        headers: { 'x-adventure-parent': '1' },
        body: JSON.stringify({ signal }),
      });
    } catch { /* best-effort */ }
    try { await apiFetch(`/api/travel/stops/${s.id}`, { method: 'DELETE' }); } catch {}
    Analytics.track('stop_skipped', { trip_id: resolvedTripId ?? '', stop_id: s.id, reason: signal });
    setDayStops(prev => prev.filter(st => st.id !== s.id));
    setShowChangedMind(false);
    executionStartedRef.current = true;
    setTodayState('en_route');
  }

  // ── Rescue: drop one stop (tired / late) ────────────────────────────────
  const handleRescueDrop = useCallback(async (stopId: string) => {
    if (!trip) return;
    try {
      await apiFetch(`/api/travel/stops/${stopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSkipped: true }),
      });
    } catch { /* best-effort */ }
    Analytics.track('stop_skipped', { trip_id: resolvedTripId ?? trip.id, stop_id: stopId, reason: 'rescue' });
    await loadTrip();
  }, [trip, loadTrip]);

  // ── Rescue: wrap day early (done / skip) ────────────────────────────────
  const handleRescueWrapDay = useCallback(async () => {
    if (!trip) return;
    try {
      await apiFetch(`/api/travel/trips/${trip.id}/skip-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayIndex: resolvedDayIndex }),
      });
    } catch { /* best-effort */ }
    await loadTrip();
  }, [trip, resolvedDayIndex, loadTrip]);

  const handleRescueClose = useCallback(async () => {
    setShowRescue(false);
    setRescueInitialOption(undefined);
    const tid = resolvedTripId ?? trip?.id;
    if (!tid) return;
    try {
      const updated = await apiFetch<any>(`/api/travel/trips/${tid}`);
      setTrip(updated.trip ?? updated);
    } catch {
      try { await loadTrip(); } catch { /* best-effort */ }
    }
  }, [resolvedTripId, trip?.id, loadTrip]);

  const handlePreviewStop = (stop: any, imageUrl?: string) => {
    setPreviewStop(stop);
    setPreviewImageUrl(imageUrl);
    setPreviewReplacingName(dayStops[currentStopIndex]?.name);
    setShowRescue(false);
  };

  const handlePreviewClose = () => {
    setPreviewStop(null);
    setPreviewImageUrl(undefined);
    setPreviewReplacingName(undefined);
    setShowRescue(true);
  };

  // ── Submit day rating ──
  async function handleRating(rating: 'okay' | 'good' | 'amazing') {
    setDayRating(rating);
    if (submittingRating) return;
    setSubmittingRating(true);
    const visitedStops = dayStops.slice(0, Math.max(currentStopIndex, 1));
    try {
      await Promise.all(visitedStops.map(s =>
        apiFetch(`/api/travel/stops/${s.id}/quality-signal`, {
          method: 'POST',
          headers: { 'x-adventure-parent': '1' },
          body: JSON.stringify({ signal: rating }),
        })
      ));
    } catch { /* best-effort */ }
    setSubmittingRating(false);
  }

  async function handleAddPhotos(source: 'visited' | 'wrap') {
    Alert.alert(
      'Add photos',
      'Choose a source',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera access is required to take photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.85,
            });
            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;
              if (source === 'visited') {
                setVisitedPhotos(prev => prev.includes(uri) ? prev : [...prev, uri]);
                setWrapPhotos(prev => prev.includes(uri) ? prev : [...prev, uri]);
              } else {
                setWrapPhotos(prev => prev.includes(uri) ? prev : [...prev, uri]);
              }
            }
          },
        },
        {
          text: 'Photo Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Photo library access is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsMultipleSelection: true,
              selectionLimit: 20,
              quality: 0.85,
            });
            if (!result.canceled && result.assets.length > 0) {
              const uris = result.assets.map(a => a.uri);
              if (source === 'visited') {
                setVisitedPhotos(prev => {
                  const toAdd = uris.filter(u => !prev.includes(u));
                  return [...prev, ...toAdd];
                });
                setWrapPhotos(prev => {
                  const toAdd = uris.filter(u => !prev.includes(u));
                  return [...prev, ...toAdd];
                });
              } else {
                setWrapPhotos(prev => {
                  const toAdd = uris.filter(u => !prev.includes(u));
                  return [...prev, ...toAdd];
                });
              }
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  // ── Stops on the Way helpers ───────────────────────────────────────────────
  async function openSotwSheet() {
    let loc: { lat: number; lng: number } | null = null;
    try {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      setSotwLocDenied(status === 'denied');
      if (status !== 'denied') {
        let pos: ExpoLocation.LocationObject | null = null;
        if (status === 'granted') {
          pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
        } else {
          const { status: newStatus } = await ExpoLocation.requestForegroundPermissionsAsync();
          if (newStatus === 'granted') {
            pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced }).catch(() => null);
          }
        }
        if (pos) loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
    } catch { /* fall through */ }
    if (!loc && currentStop?.latitude && currentStop?.longitude) {
      loc = { lat: parseFloat(currentStop.latitude as string), lng: parseFloat(currentStop.longitude as string) };
    }
    setSotwUserLoc(loc);
    setSotwPlaces([]);
    setSotwFilter('playground');
    sotwSlideY.setValue(900);
    setActiveSheet('stopsOnTheWay');
    Animated.spring(sotwSlideY, { toValue: 0, useNativeDriver: true, damping: 28, stiffness: 300 }).start();
    if (loc) void fetchSotwPlaces('playground', loc);
  }

  async function fetchSotwPlaces(filter: SotwFilter, loc?: { lat: number; lng: number }) {
    const position = loc ?? sotwUserLoc;
    if (!position) return;
    setSotwFilter(filter);
    setSotwLoading(true);
    try {
      console.log('[SOTW] fetch URL:', `${API_BASE}/api/travel/stops-on-the-way?lat=${position.lat}&lng=${position.lng}&type=${filter}&tripId=${trip?.id ?? ''}`);
      const data = await apiFetch<{ results: SotwPlace[] }>(
        `/api/travel/stops-on-the-way?lat=${position.lat}&lng=${position.lng}&type=${filter}&tripId=${trip?.id ?? ''}`
      );
      const results = data.results ?? [];
      setSotwPlaces(results);
      setSelectedPlaceId(results[0]?.placeId ?? null);
    } catch {
      setSotwPlaces([]);
    } finally {
      setSotwLoading(false);
    }
  }

  function openBreakCapture(place: SotwPlace) {
    setActiveBreakPlace(place);
    breakSlideY.setValue(900);
    Animated.spring(breakSlideY, { toValue: 0, useNativeDriver: true, damping: 28, stiffness: 300 }).start();
  }

  function closeBreakCapture() {
    Animated.timing(breakSlideY, { toValue: 900, duration: 250, useNativeDriver: true }).start(() => setActiveBreakPlace(null));
  }

  function closeSotwSheet() {
    Animated.timing(sotwSlideY, { toValue: 900, duration: 250, useNativeDriver: true }).start(() => setActiveSheet('none'));
    setActiveBreakPlace(null);
  }

  function getBreakHeroColors(filter: SotwFilter): [string, string] {
    switch (filter) {
      case 'beach':   return ['#7fc8e8', '#4a9bc4'];
      case 'food':    return ['#d89a5a', '#a85f3a'];
      case 'coffee':  return ['#c8a45a', '#9a7a35'];
      default:        return ['#5db87a', '#3a8a55'];
    }
  }

  async function handleBreakAddPhotos() {
    Alert.alert('Add photo', 'Choose a source', [
      { text: 'Camera', onPress: async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access required.'); return; }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as any, allowsEditing: true, aspect: [4, 3] as [number, number], quality: 0.85 });
        if (!result.canceled && result.assets[0]) setBreakPhotos(prev => [...prev, result.assets[0].uri]);
      }},
      { text: 'Photo Library', onPress: async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Photo library access required.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, allowsMultipleSelection: true, selectionLimit: 10, quality: 0.85 });
        if (!result.canceled) setBreakPhotos(prev => [...prev, ...result.assets.map((a: any) => a.uri)]);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleBreakDone() {
    try {
      if (trip?.id) {
        await apiFetch(`/api/travel/trips/${trip.id}/moments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'break',
            description: breakQuote || null,
            metadata: JSON.stringify({ breakMoment: true, placeName: activeBreakPlace?.name, placeType: sotwFilter, photoCount: breakPhotos.length }),
          }),
        });
      }
    } catch { /* best-effort */ }
    setActiveBreakPlace(null);
    setBreakQuote('');
    setBreakPhotos([]);
    closeSotwSheet();
  }

  function removePhoto(source: 'visited' | 'wrap', uri: string) {
    if (source === 'visited') {
      setVisitedPhotos(prev => prev.filter(p => p !== uri));
    } else {
      setWrapPhotos(prev => prev.filter(p => p !== uri));
    }
  }

  function mergeVisitedIntoWrap(
    visited: string[],
    wrap: string[]
  ): string[] {
    const toAdd = visited.filter(u => !wrap.includes(u));
    return [...wrap, ...toAdd];
  }

  // ── Derived ──
  const totalDays = (() => {
    if (!trip) return 1;
    if (trip.plannerTripDays) return trip.plannerTripDays;
    if (trip.tripDays) return trip.tripDays;
    if (trip.startDate && trip.endDate) {
      return Math.round(
        (parseLocalDate(trip.endDate)!.getTime() - parseLocalDate(trip.startDate)!.getTime()) / 86_400_000
      ) + 1;
    }
    return 1;
  })();

  const city = trip?.city ?? trip?.destination ?? '';
  const dayLabel = formatDayDate(trip?.startDate, resolvedDayIndex);
  const ticketStops = dayStops.filter(s => hasTicketSignal(s.metadata));
  const childrenAges = (trip?.travelers ?? [])
    .filter(t => !t.isParent && t.age)
    .map(t => parseInt(t.age!, 10))
    .filter(n => n > 0 && n < 18);
  console.log('[SOTW] childrenAges:', childrenAges, 'travelers:', trip?.travelers?.map(t => ({name: t.name, age: t.age, isParent: t.isParent})));
  const stopTimes = buildStopTimes(dayStops, selectedPace, childrenAges);
  const currentStop = dayStops[currentStopIndex] ?? null;

  // ── Day strip pill shared component ──
  const currentDayIndex = resolvedDayIndex;

  const isPaidUser = user?.subscriptionTier !== 'free';
  const offlineBannerEl = (
    <>
      {((isOffline && isPaidUser) || fromCache) && (
        <View style={{ backgroundColor: '#1F2937', paddingVertical: 7, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: '#D1FAE5', fontSize: 12, fontFamily: F.medium, letterSpacing: 0.2 }}>
            {fromCache ? 'Offline \u2014 showing your saved plan' : 'No connection \u2014 showing cached data'}
          </Text>
        </View>
      )}
      {__DEV__ && devDate && (
        <View style={{ backgroundColor: '#7C3AED', paddingVertical: 5, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontFamily: F.bold }}>
            {'DEV DATE: ' + devDate.toISOString().slice(0, 10)}
          </Text>
          <Pressable onPress={() => { AsyncStorage.removeItem('dev_date_override').catch(() => {}); setDevDate(null); }}>
            <Text style={{ color: '#DDD6FE', fontSize: 11, fontFamily: F.bold }}>Clear</Text>
          </Pressable>
        </View>
      )}
    </>
  );

  // ── ⋯ Menu overlay (shared by all states except no_trip) ──
  const menuOverlay = todayState === 'no_trip' ? null : (
    <>
      <TouchableOpacity
        style={[mx.btn, { position: 'absolute', top: insets.top + 14, right: 20, zIndex: 100 }]}
        onPress={() => setShowMenu(v => !v)}
      >
        <Text style={mx.btnText}>···</Text>
      </TouchableOpacity>
      {showMenu && (
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 200 }]}
          onPress={() => setShowMenu(false)}
        >
          <View style={[mx.drop, { position: 'absolute', top: insets.top + 58, right: 20 }]}>
            <Pressable style={mx.dropRow} onPress={() => {
              setShowMenu(false);
              setPreviousState(todayState);
              setTodayState(resolvedDayIndex > 0 ? 'day_history' : 'day_history_empty');
            }}>
              <Text style={mx.dropIcon}>{'\uD83D\uDCC5'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={mx.dropTitle}>Day history</Text>
                <Text style={mx.dropSub}>
                  {resolvedDayIndex > 0 ? 'View completed days' : 'Nothing completed yet'}
                </Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      )}
    </>
  );

  // ── Loading ──
  if (loading) {
    return (
      <View style={[misc.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.orange} />
        <Text style={misc.loadText}>Loading your day…</Text>
      </View>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <View style={[misc.center, { paddingTop: insets.top }]}>
        <Text style={misc.errorText}>{error}</Text>
        <Pressable style={misc.errorBtn} onPress={loadTrip}>
          <Text style={misc.errorBtnText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: NO TRIP
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'no_trip') {
    return (
      <View style={[misc.center, { paddingTop: insets.top, backgroundColor: C.bg }]}>
        <View style={nt.iconWrap}>
          <Text style={nt.iconEmoji}>{'\uD83D\uDDFA\uFE0F'}</Text>
        </View>
        <Text style={nt.heading}>Where will your family go next?</Text>
        <Text style={nt.sub}>
          Plan your first adventure and we’ll run the day when you get there.
        </Text>
        <TouchableOpacity
          style={nt.cta}
          activeOpacity={0.85}
          onPress={() => router.push('/onboarding/splash' as never)}
        >
          <Text style={nt.ctaText}>Plan a trip →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GATE: DAY NOT STARTED — trip date is today or past, waiting for explicit tap
  // ─────────────────────────────────────────────────────────────────────────────
  if (trip && tripHasStarted && !isDayStarted && !loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: insets.top + 32 }}>
        <Text style={{ fontFamily: 'Fraunces_900Black', fontSize: 32, color: C.deep, textAlign: 'center', marginBottom: 10 }}>
          Day {todayDayIndex + 1}
        </Text>
        <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 15, color: C.muted, textAlign: 'center', marginBottom: 40, lineHeight: 22 }}>
          Ready to start your day in {trip.destination}?
        </Text>
        <TouchableOpacity
          onPress={handleStartDay}
          disabled={starting}
          style={{
            backgroundColor: C.orange, borderRadius: 14,
            paddingVertical: 16, paddingHorizontal: 32,
            width: '100%', alignItems: 'center', opacity: starting ? 0.7 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 }}>
            {starting ? 'Starting…' : `Start Day ${todayDayIndex + 1} →`}
          </Text>
        </TouchableOpacity>
        {showPermissionModal && (
          <NotificationPermissionModal onClose={() => setShowPermissionModal(false)} />
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: PRE_TRIP_FAR  (trip starts >7 days from now)
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'pre_trip_far') {
    const daysLeft = daysUntilDate(trip?.startDate, devDate);
    const startLabel = formatDayDate(trip?.startDate, 0);
    const previewStops = (trip?.stops ?? [])
      .filter(s => (s.dayIndex ?? 0) === 0)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .slice(0, 4);
    const day0Stops = trip?.stops?.filter(s => (s.dayIndex ?? 0) === 0) ?? previewStops;
    const stopCount = day0Stops.length || (trip?.stops?.length ?? 0);
    const totalMins = stopCount * 75;
    const totalHoursLabel = totalMins >= 60
      ? `${Math.floor(totalMins / 60)}h${totalMins % 60 > 0 ? ' ' + (totalMins % 60) + 'm' : ''}`
      : `${totalMins}m`;
    const heroImageUrl = trip?.firstPhotoUrl
      ?? CITY_IMGS[city]
      ?? 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80';
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          <ImageBackground
            source={{ uri: heroImageUrl }}
            style={[ptf.hero, { paddingTop: insets.top + 24 }]}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.20)', 'rgba(0,0,0,0.50)', 'rgba(0,0,0,0.80)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={ptf.badge}>
              <Text style={ptf.badgeText}>UPCOMING TRIP</Text>
            </View>
            <Text style={ptf.heroName} numberOfLines={2}>{trip?.name ?? (city ? `${city} Trip` : 'Your Trip')}</Text>
            <Text style={ptf.countdown}>{daysLeft}</Text>
            <Text style={ptf.countdownLabel}>days until {city || 'your trip'}</Text>
            <Text style={ptf.startDate}>{startLabel}</Text>
            {/* Stop count + time pills */}
            {stopCount > 0 && (
              <View style={ptf.pillsRow}>
                <View style={ptf.pill}>
                  <Text style={ptf.pillText}>{'\uD83D\uDCCD '}{stopCount}{' stops'}</Text>
                </View>
                {totalMins > 0 && (
                  <View style={ptf.pill}>
                    <Text style={ptf.pillText}>{'\uD83D\uDD50 ~'}{totalHoursLabel}</Text>
                  </View>
                )}
              </View>
            )}
            {/* Scrolling quote-chip strip */}
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={ptf.quoteStrip} contentContainerStyle={ptf.quoteStripContent}
              scrollEnabled
            >
              {[
                'The journey is the destination',
                'Family memories last forever',
                'Adventure awaits around every corner',
                'Collect moments, not things',
                'Every mile is worth it',
                'Life is short — travel often',
                'Go where you feel most alive',
              ].map((q, i) => (
                <View key={i} style={ptf.quoteChip}>
                  <Text style={ptf.quoteChipText}>{q}</Text>
                </View>
              ))}
            </ScrollView>
          </ImageBackground>

          <View style={ptf.card}>
            <Text style={ptf.cardLabel}>YOUR FIRST DAY STARTS WITH</Text>
            {previewStops.length === 0 && (
              <Text style={ptf.emptyText}>No stops planned yet — build your itinerary below.</Text>
            )}
            {previewStops.map((s, i) => (
              <View key={s.id} style={ptf.stopRow}>
                <View style={ptf.stopNum}><Text style={ptf.stopNumText}>{i + 1}</Text></View>
                <Text style={ptf.stopName} numberOfLines={1}>{s.name}</Text>
                {hasTicketSignal(s.metadata) && (
                  <View style={ptf.ticketBadge}><Text style={ptf.ticketText}>{'\uD83C\uDFAB'}</Text></View>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={ptf.viewPlanBtn}
              activeOpacity={0.8}
              onPress={() => trip && router.push({ pathname: '/trip/[tripId]' as never, params: { tripId: trip.id, } })}
            >
              <Text style={ptf.viewPlanText}>View full plan →</Text>
            </TouchableOpacity>
          </View>

          {ticketStops.length > 0 && (
            <View style={ptf.tipCard}>
              <Text style={ptf.tipLabel}>TICKETS NEEDED</Text>
              {ticketStops.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={ptf.ticketStopRow}
                  activeOpacity={0.75}
                  onPress={() => openTicketSearch(s.name)}
                >
                  <Text style={ptf.ticketStopIcon}>{'\uD83C\uDFAB'}</Text>
                  <Text style={ptf.ticketStopName} numberOfLines={2}>{s.name}</Text>
                  <Text style={ptf.ticketStopArrow}>{'→'}</Text>
                </TouchableOpacity>
              ))}
              <Text style={ptf.ticketHint}>Tap a stop to search for tickets</Text>
            </View>
          )}
        </ScrollView>
        {menuOverlay}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: PRE_TRIP_TOMORROW
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'pre_trip_tomorrow') {
    console.log('[PRE_TRIP_TOMORROW] stops:', JSON.stringify(
      (trip?.stops ?? []).map(s => ({ name: s.name, dayIndex: s.dayIndex, displayOrder: s.displayOrder }))
    ));
    const tomorrowStops = (trip?.stops ?? [])
      .filter(s => s.dayIndex === 0)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const tomorrowContent = tomorrowStops.filter(s => !isMealStop(s.stopType));
    const tomorrowMeals   = tomorrowStops.filter(s => isMealStop(s.stopType) && !s.isVisited);
    const ticketCount = tomorrowStops.filter(s => hasTicketSignal(s.metadata)).length;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          <LinearGradient
            colors={['#1D3A5C', '#152C47', '#0E1E30']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[ptt.hero, { paddingTop: insets.top + 28 }]}
          >
            <View style={ptt.pillWrap}>
              <Text style={ptt.pillIcon}>{'⏰'}</Text>
              <Text style={ptt.pillText}>You leave tomorrow</Text>
            </View>
            <Text style={ptt.heroTitle}>{trip?.name ?? city}</Text>
            <Text style={ptt.heroSub}>
              {tomorrowContent.length} stop{tomorrowContent.length !== 1 ? 's' : ''} planned{city ? ` in ${city}` : ''}{tomorrowMeals.length > 0 ? ` + ${tomorrowMeals.length} meal${tomorrowMeals.length !== 1 ? 's' : ''}` : ''}
            </Text>
          </LinearGradient>

          {ticketCount > 0 && (
            <View style={ptt.alertBanner}>
              <Text style={ptt.alertIcon}>{'\uD83C\uDFAB'}</Text>
              <Text style={ptt.alertText}>
                {ticketCount} stop{ticketCount !== 1 ? 's' : ''} need{ticketCount === 1 ? 's' : ''} tickets — book tonight
              </Text>
            </View>
          )}

          {/* Rain alert */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', borderRadius: 13, padding: 12, marginHorizontal: 16, marginBottom: 10 }}>
            <Text style={{ fontSize: 20 }}>{'\uD83C\uDF27'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.deep }}>Rain expected tomorrow 2–4pm</Text>
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Plan ahead for outdoor stops</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setIndoorSheetVisible(true)}>
                <Text style={{ fontSize: 12, color: C.orange, fontWeight: '700', marginTop: 4 }}>See indoor alternatives →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Before you go — checklist row */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10, shadowColor: '#1A1F2E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
            activeOpacity={0.85}
            onPress={() => setChecklistOpen(true)}
          >
            <View style={{ width: 40, height: 40, backgroundColor: '#FFF8F0', borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Text style={{ fontSize: 18 }}>{'\u2713'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1F2E' }}>Before you go</Text>
              <Text style={{ fontSize: 12, color: '#8A8FA8', marginTop: 2 }}>Tickets, snacks, sunscreen…</Text>
            </View>
            <Text style={{ color: '#E8692A', fontSize: 18 }}>{'\u203a'}</Text>
          </TouchableOpacity>

          {/* Hotel / start point card */}
          {(() => {
            const savedHotel = localSavedHotel
              ?? (trip?.stayLocations ?? []).find(s => !s.cityName || s.cityName === (trip?.destination ?? (trip as any)?.city))?.address
              ?? (trip?.stayLocations ?? [])[0]?.address
              ?? null;
            return (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10, shadowColor: '#1A1F2E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
                activeOpacity={0.85}
                onPress={() => setShowHotelSheet(true)}
              >
                <View style={{ width: 40, height: 40, backgroundColor: '#EBF5F1', borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ fontSize: 20 }}>{'\uD83C\uDFE8'}</Text>
                </View>
                {savedHotel ? (
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.deep }} numberOfLines={1}>{savedHotel}</Text>
                    <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Starting point · tap to edit</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.deep }}>Add hotel / start point</Text>
                    <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Helps with directions and timing</Text>
                  </View>
                )}
                <Text style={{ color: savedHotel ? C.muted : C.orange, fontSize: savedHotel ? 13 : 20, fontWeight: '700' }}>
                  {savedHotel ? 'Edit' : '+'}
                </Text>
              </TouchableOpacity>
            );
          })()}

          <View style={ptt.card}>
            <Text style={ptt.cardLabel}>TOMORROW'S STOPS</Text>
            {tomorrowContent.map((s, i) => (
              <View key={s.id} style={ptt.stopRow}>
                <View style={ptt.stopNum}><Text style={ptt.stopNumText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={ptt.stopName} numberOfLines={1}>{s.name}</Text>
                  <Text style={ptt.stopMeta}>~{getStopDuration(s)} min</Text>
                </View>
                {hasTicketSignal(s.metadata) && (
                  <TouchableOpacity onPress={() => openTicketSearch(s.name)} hitSlop={8}>
                    <View style={ptt.ticketBadge}><Text style={ptt.ticketText}>{'\uD83C\uDFAB'} Book</Text></View>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {tomorrowMeals.length > 0 && (
              <View style={{ marginTop: tomorrowContent.length > 0 ? 10 : 0,
                borderTopWidth: tomorrowContent.length > 0 ? 1 : 0,
                borderTopColor: 'rgba(26,31,46,0.07)', paddingTop: tomorrowContent.length > 0 ? 10 : 0 }}>
                <Text style={[ptt.cardLabel, { fontSize: 10, marginBottom: 6 }]}>MEALS</Text>
                {tomorrowMeals.map(s => (
                  <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 14 }}>{'🍽️'}</Text>
                    <Text style={[ptt.stopName, { flex: 1 }]} numberOfLines={1}>{s.name}</Text>
                    <Text style={ptt.stopMeta}>~{getStopDuration(s)} min</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={ptt.packCard}>
            <Text style={ptt.packLabel}>PACK TONIGHT</Text>
            {[
              'Comfortable walking shoes for everyone',
              'Snacks & water bottles',
              ticketCount > 0 ? 'Printed or downloaded tickets' : 'Camera or phone fully charged',
              'Cash for smaller vendors',
            ].map((item, i) => (
              <View key={i} style={ptt.packRow}>
                <View style={ptt.packDot} />
                <Text style={ptt.packText}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={ptt.cta}
            activeOpacity={0.85}
            onPress={() => trip && router.push({ pathname: '/trip/[tripId]' as never, params: { tripId: trip.id, } })}
          >
            <Text style={ptt.ctaText}>Review tomorrow's plan →</Text>
          </TouchableOpacity>
        </ScrollView>
        {menuOverlay}
        <IndoorAlternativesSheet
          visible={indoorSheetVisible}
          onClose={() => setIndoorSheetVisible(false)}
          stopId={currentStop?.id ?? ''}
          stopName={currentStop?.name ?? ''}
          tripId={trip?.id ?? ''}
          dayIndex={resolvedDayIndex}
          todayStopNames={dayStops.map(s => s.name ?? '')}
          onSwitchSuccess={() => { void loadTrip(); }}
        />
        <AddHotelSheet
          visible={showHotelSheet}
          tripId={trip?.id ?? ''}
          destination={trip?.destination ?? (trip as any)?.city ?? ''}
          onClose={() => setShowHotelSheet(false)}
          onSkip={() => setShowHotelSheet(false)}
          onSaved={(name, addr) => {
            const resolvedAddr = addr || name;
            setShowHotelSheet(false);
            const saveForDay = () => {
              setLocalSavedHotel(resolvedAddr);
              if (trip?.id) {
                AsyncStorage.setItem(`hotel_${trip.id}_day${resolvedDayIndex}`, resolvedAddr).catch(() => {});
              }
            };
            const saveForAllDays = async () => {
              setLocalSavedHotel(resolvedAddr);
              if (trip?.id) {
                const totalDays = (trip as any).tripDays ?? (trip as any).plannerTripDays ?? 1;
                for (let d = 0; d < totalDays; d++) {
                  AsyncStorage.setItem(`hotel_${trip.id}_day${d}`, resolvedAddr).catch(() => {});
                }
              }
              if (!trip) return;
              const cities: string[] = (trip as any).cities?.length > 0
                ? (trip as any).cities
                : [trip.destination ?? (trip as any).city ?? ''].filter(Boolean);
              const allLocs = cities.map((c: string) => ({ cityName: c, name, address: resolvedAddr }));
              try {
                await apiFetch(`/api/travel/trips/${trip.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ stayLocations: allLocs }),
                });
                setTrip(prev => prev ? { ...prev, stayLocations: allLocs } : prev);
              } catch {}
            };
            Alert.alert(
              'Use for all days?',
              `Use "${name || addr}" as the starting point for every day of your trip?`,
              [
                { text: 'This day only', style: 'cancel', onPress: saveForDay },
                { text: 'All days', onPress: () => { void saveForAllDays(); } },
              ]
            );
          }}
        />
        {trip && (
          <ChecklistSheet
            visible={checklistOpen}
            onClose={() => setChecklistOpen(false)}
            tripId={trip.id}
            stops={tomorrowStops}
          />
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: MORNING  (trip day, not yet started)
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'morning') {
    const maxDropPriority = selectedPace === 'easier'
      ? Math.max(...dayStops.map(s => parseMetadata(s.metadata).dropPriority ?? -Infinity))
      : -Infinity;
    const easierFallbackIdx = selectedPace === 'easier' && !isFinite(maxDropPriority)
      ? dayStops.length - 1 : -1;
    // Kid-fit badge: find which pace option has the most kid-friendly stops
    const kfPos = ['high', 'toddler', 'all_ages'];
    const kfCount = (stops: Stop[]) =>
      stops.filter(s => kfPos.includes(((s as any).kidFitBias ?? (s as any).kid_fit_bias ?? '').toLowerCase())).length;
    const kfDropStop = dayStops.slice().sort(
      (a, b) => (parseMetadata(a.metadata).anchorScore ?? 0) - (parseMetadata(b.metadata).anchorScore ?? 0)
    )[0];
    const kfEasierStops = dayStops.filter(s => s.id !== kfDropStop?.id);
    const kfScores: Record<Pace, number> = {
      balanced: kfCount(dayStops), easier: kfCount(kfEasierStops), faster: kfCount(dayStops),
    };
    const kfMax = Math.max(kfScores.balanced, kfScores.easier, kfScores.faster);
    const kidBestPace: Pace | null = kfMax > 0
      ? (['balanced', 'easier', 'faster'] as Pace[]).find(k => kfScores[k] === kfMax) ?? null
      : null;

    // Alternate day view (past or future)
    if (viewingDay !== currentDayIndex && trip) {
      const isPast = viewingDay < currentDayIndex;
      const viewingDayStops = (trip.stops ?? [])
        .filter(s => (s.dayIndex ?? 0) === viewingDay)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      const visitedCount = viewingDayStops.filter(s => s.isVisited || s.visited).length;
      const dayMins = viewingDayStops.reduce((sum, s) => sum + (s.durationMinutes ?? 60), 0);
      const dayHrs = Math.floor(dayMins / 60);
      const dayMinRem = dayMins % 60;
      const timeStr = dayHrs > 0
        ? (dayMinRem > 0 ? `${dayHrs}h ${dayMinRem}m` : `${dayHrs}h`)
        : `${dayMins}m`;

      if (isPast) {
        const todayDayStops = (trip.stops ?? [])
          .filter(s => (s.dayIndex ?? 0) === currentDayIndex)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        const visibleTodayStops = todayDayStops.slice(0, 3);
        return (
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 60 }}
            >
              {offlineBannerEl}

              {/* ── Yesterday card — compact dark ── */}
              <View style={{
                backgroundColor: '#1A1F2E',
                marginHorizontal: 16, marginBottom: 10,
                borderRadius: 20, padding: 20,
                flexDirection: 'row', alignItems: 'center', gap: 14,
              }}>
                <View style={{
                  width: 44, height: 44,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 20, color: '#FFFFFF', fontFamily: F.bold }}>{'\u2713'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 2, fontFamily: F.semibold }}>
                    Day {viewingDay + 1} · {formatDayDate(trip.startDate, viewingDay)}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', fontFamily: F.bold }}>
                    {visitedCount > 0
                      ? `${visitedCount} stop${visitedCount > 1 ? 's' : ''} visited`
                      : `${viewingDayStops.length} stop${viewingDayStops.length !== 1 ? 's' : ''} planned`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: '/(tabs)/memories' as never,
                    params: { focusDayIndex: viewingDay.toString() },
                  })}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#E8692A', fontFamily: F.semibold }}>
                    Recap {'→'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Today card — hero ── */}
              <View style={{
                backgroundColor: '#FFFFFF',
                marginHorizontal: 16,
                borderRadius: 20,
                overflow: 'hidden',
                shadowColor: '#1A1F2E',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 4,
              }}>
                <View style={{ padding: 20, paddingBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A8FA8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, fontFamily: F.bold }}>
                    Today · Day {currentDayIndex + 1}
                  </Text>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: '#1A1F2E', letterSpacing: -0.3, fontFamily: F.bold }}>
                    {city || 'Your day'}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#8A8FA8', fontWeight: '500', marginTop: 3, fontFamily: F.medium }}>
                    {formatDayDate(trip.startDate, currentDayIndex)} · {todayDayStops.length} stop{todayDayStops.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                {visibleTodayStops.length > 0 && (
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.06)', paddingHorizontal: 20 }}>
                    {visibleTodayStops.map((stop, i) => (
                      <View key={stop.id} style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingVertical: 11,
                        borderBottomWidth: i < visibleTodayStops.length - 1 ? 1 : 0,
                        borderBottomColor: 'rgba(26,31,46,0.06)',
                      }}>
                        <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: '#F5F2EE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8FA8', fontFamily: F.bold }}>{i + 1}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1F2E', flex: 1, fontFamily: F.semibold }} numberOfLines={1}>{stop.name}</Text>
                      </View>
                    ))}
                    {todayDayStops.length > 3 && (
                      <Text style={{ fontSize: 12, color: '#8A8FA8', paddingVertical: 10, fontFamily: F.regular }}>
                        +{todayDayStops.length - 3} more stop{todayDayStops.length - 3 !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                )}
                <View style={{ padding: 16, paddingTop: 12 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#E8692A',
                      borderRadius: 14, padding: 16,
                      alignItems: 'center',
                      shadowColor: '#E8692A',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.25, shadowRadius: 16,
                    }}
                    activeOpacity={0.85}
                    onPress={() => { setViewingDay(currentDayIndex); handleStartDay(); }}
                  >
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: -0.2, fontFamily: F.bold }}>
                      {'\u25B6'} Start Day {currentDayIndex + 1}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            {menuOverlay}
          </View>
        );
      }

      return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            {offlineBannerEl}
            <View style={alt.card}>
              <Text style={alt.futureTitle}>Day {viewingDay + 1}</Text>
              <Text style={alt.futureSub}>
                {city ? `${city} · ` : ''}{formatDayDate(trip.startDate, viewingDay)}
                {' · '}{viewingDayStops.length} stop{viewingDayStops.length !== 1 ? 's' : ''}
                {' · '}~{timeStr}
              </Text>
              {viewingDayStops.map((stop, i) => (
                <View key={stop.id} style={alt.stopRow}>
                  <View style={alt.stopNum}><Text style={alt.stopNumText}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={alt.stopName} numberOfLines={1}>{stop.name}</Text>
                    {stop.travelMinsFromPrevious ? (
                      <Text style={alt.stopTravel}>{'\uD83D\uDE97'} {stop.travelMinsFromPrevious} min from prev</Text>
                    ) : null}
                  </View>
                  <Text style={alt.stopDur}>{stop.durationMinutes ?? 60}m</Text>
                </View>
              ))}
              {viewingDayStops.length === 0 && (
                <Text style={alt.emptyText}>No stops planned for this day yet.</Text>
              )}
              <Pressable style={alt.linkBtn} onPress={() => router.push({ pathname: '/trip/[tripId]' as never, params: { tripId: trip.id, } })}>
                <Text style={alt.linkBtnText}>See full plan →</Text>
              </Pressable>
            </View>
            <Pressable style={alt.backBtn} onPress={() => setViewingDay(currentDayIndex)}>
              <Text style={alt.backBtnText}>{'←'} Back to Day {currentDayIndex + 1} (Today)</Text>
            </Pressable>
          </ScrollView>
          {menuOverlay}
        </View>
      );
    }

    const moHeroUrl = CITY_IMGS[city] ?? 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80';
    const handleAddStop = () =>
      router.push({ pathname: '/discover', params: { dayIndex: currentDayIndex } } as never);
    const handleQuickAdd = (category: string) => {
      const filterMap: Record<string, string> = {
        'Lunch': 'food', 'Museum': 'museum', 'Park': 'park', 'Treat stop': 'food',
      };
      router.push({ pathname: '/discover', params: { dayIndex: currentDayIndex, filter: filterMap[category] ?? 'all' } } as never);
    };
    return (
      <>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          <ImageBackground
            source={{ uri: moHeroUrl }}
            style={[mo.hero, { paddingTop: insets.top + 20 }]}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(15,40,34,0.28)', 'rgba(15,40,34,0.72)']}
              start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Weather pill — anchored below status bar */}
            {currentTemp !== null && (
              <View style={[mo.weatherPill, { top: insets.top + 8 }]}>
                <Text style={{ fontSize: 14 }}>{rainAlert ? '\uD83C\uDF27' : '\uD83C\uDF24'}</Text>
                <Text style={mo.weatherText}>{currentTemp}°F</Text>
              </View>
            )}
            {/* Bottom copy */}
            <View style={mo.heroBottom}>
              <Text style={mo.greeting}>Good morning {'\uD83D\uDC4B'}</Text>
              <Text style={[mo.heroHeadline, { paddingRight: 60 }]} numberOfLines={2}>
                Day {resolvedDayIndex + 1}{city ? ` in ${city}` : ''}
              </Text>
              <Text style={mo.heroMeta}>
                {dayLabel || ''}
                {dayStops.length > 0 ? ` · ${dayStops.length} stop${dayStops.length !== 1 ? 's' : ''}` : ''}
              </Text>
            </View>
          </ImageBackground>
          {/* Stop count + time pills — below hero in white content area (R2 fix) */}
          <View style={mo.metaRow}>
            <View style={mo.metaPill}><Text style={mo.metaText}>{'\uD83D\uDCCD'} {dayStops.length} stop{dayStops.length !== 1 ? 's' : ''}</Text></View>
            <View style={mo.metaPill}><Text style={mo.metaText}>{'\uD83D\uDD50'}{' '}{estimateTotalTime(dayStops, selectedPace, childrenAges)}</Text></View>
          </View>

          {offlineBannerEl}
          <View style={mo.paceSection}>
            <Text style={mo.paceLabel}>TODAY'S PACE</Text>
            <View style={mo.paceRow}>
              {(['balanced', 'easier', 'faster'] as Pace[]).map(p => (
                <Pressable
                  key={p}
                  style={[mo.paceChip, selectedPace === p && mo.paceChipSel]}
                  onPress={() => setSelectedPace(p)}
                >
                  {kidBestPace === p && (
                    <View style={mo.kidBadge}>
                      <Text style={mo.kidBadgeText}>{'\uD83D\uDC67'} Best for kids</Text>
                    </View>
                  )}
                  <Text style={[mo.paceChipName, selectedPace === p && mo.paceChipNameSel]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                  <Text style={mo.paceChipSub}>
                    {p === 'balanced' ? 'As planned' : p === 'easier' ? 'Drop 1 stop' : 'Less time/stop'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={mo.stopsSection}>
            <Text style={mo.stopsLabel}>TODAY'S STOPS</Text>
            {dayStops.length === 0 && (
              <View style={{
                backgroundColor: '#fff', borderRadius: 20, padding: 24,
                marginTop: 4, borderWidth: 1, borderColor: '#EDE9E3', alignItems: 'center',
              }}>
                <View style={{
                  width: 56, height: 56, backgroundColor: '#FDF0E9', borderRadius: 16,
                  alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                }}>
                  <Text style={{ fontSize: 26 }}>{'\uD83D\uDDFA\uFE0F'}</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1F2E', marginBottom: 6, textAlign: 'center' }}>
                  Nothing planned yet
                </Text>
                <Text style={{ fontSize: 13, color: '#8A8FA8', lineHeight: 20, textAlign: 'center', marginBottom: 20 }}>
                  Add a stop and we&apos;ll guide your family through it in real time.
                </Text>
                <TouchableOpacity
                  onPress={handleAddStop}
                  style={{
                    backgroundColor: '#E8692A', borderRadius: 14,
                    paddingVertical: 14, paddingHorizontal: 20,
                    width: '100%', alignItems: 'center', marginBottom: 16,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                    + Add a stop for today
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#8A8FA8', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                  Quick add
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {([
                    { emoji: '\uD83C\uDF54', label: 'Lunch' },
                    { emoji: '\uD83C\uDFDB\uFE0F', label: 'Museum' },
                    { emoji: '\uD83C\uDF3F', label: 'Park' },
                    { emoji: '\uD83C\uDF66', label: 'Treat stop' },
                  ] as { emoji: string; label: string }[]).map(chip => (
                    <TouchableOpacity
                      key={chip.label}
                      onPress={() => handleQuickAdd(chip.label)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                        borderWidth: 1.5, borderColor: '#E0DDD8', borderRadius: 20,
                        paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff',
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{chip.emoji}</Text>
                      <Text style={{ fontSize: 13, color: '#1A1F2E' }}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {dayStops.map((stop, i) => {
              const meta = parseMetadata(stop.metadata);
              const isRemoved = selectedPace === 'easier' && (
                (isFinite(maxDropPriority) && (meta.dropPriority ?? -Infinity) === maxDropPriority) ||
                easierFallbackIdx === i
              );
              const hasTicket = hasTicketSignal(stop.metadata);
              const isFreeStop = !hasTicket && ['park', 'nature', 'landmark'].includes(stop.stopType ?? '');
              const KID_FIT_POSITIVE = ['high', 'toddler', 'all_ages'];
              const kidFitNorm = (stop.kidFitBias ?? '').toLowerCase().replace(/[\s-]/g, '_');
              const isAnchor  = KID_FIT_POSITIVE.includes(kidFitNorm);
              const dispDur   = effectiveDuration(stop, selectedPace);
              const travelNext = getTravelToNext(dayStops, i);
              const isLast    = i === dayStops.length - 1;
              return (
                <React.Fragment key={stop.id}>
                  <Swipeable
                    renderRightActions={isRemoved ? undefined : () => (
                      <GHTouchable
                        style={{
                          backgroundColor: '#C0392B',
                          justifyContent: 'center',
                          alignItems: 'center',
                          width: 90,
                          borderRadius: 14,
                          marginVertical: 4,
                          marginRight: 4,
                        }}
                        onPress={() => handleRemoveStop(stop)}
                      >
                        <Text style={{ fontSize: 20 }}>{'\uD83D\uDDD1'}</Text>
                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '800', marginTop: 3, letterSpacing: 0.3 }}>Remove</Text>
                      </GHTouchable>
                    )}
                    overshootRight={false}
                    friction={2}
                  >
                    <View style={[mo.stopCard, isRemoved && mo.stopRowRemoved]}>
                      <View style={mo.stopCardRow}>
                        <View style={[mo.stopIconBox, { backgroundColor: TODAY_STOP_BG[stop.stopType ?? ''] ?? TODAY_STOP_BG.default }]}>
                          <Text style={mo.stopIconText}>{TODAY_STOP_EMOJI[stop.stopType ?? ''] ?? TODAY_STOP_EMOJI.default}</Text>
                        </View>
                        <View style={mo.stopInfo}>
                          <Text style={[mo.stopName, isRemoved && mo.stopNameStruck]} numberOfLines={1}>{stop.name}</Text>
                          <Text style={mo.stopMeta}>
                            {stopTimes[i]} · {dispDur} min
                            {selectedPace === 'faster' && dispDur < getStopDuration(stop) && (
                              <Text style={mo.stopMetaSaved}> (was {getStopDuration(stop)} min)</Text>
                            )}
                          </Text>
                          <View style={mo.tagRow}>
                            {isRemoved && (
                              <View style={mo.tagRemoved}><Text style={mo.tagRemovedText}>Removed · Easier mode</Text></View>
                            )}
                            {hasTicket && !isRemoved && (
                              <TouchableOpacity style={mo.tagTicket} onPress={() => openTicketSearch(stop.name)} hitSlop={6} activeOpacity={0.7}>
                                <Text style={mo.tagTicketText}>{'\uD83C\uDFAB'} Ticket needed</Text>
                              </TouchableOpacity>
                            )}
                            {isFreeStop && !isRemoved && (
                              <View style={mo.tagFree}><Text style={mo.tagFreeText}>Free entry</Text></View>
                            )}
                            {isAnchor && !isRemoved && (
                              <View style={mo.tagAnchor}><Text style={mo.tagAnchorText}>Kid friendly</Text></View>
                            )}
                          </View>
                        </View>
                        <View style={mo.stopNumBadgeAlt}><Text style={mo.stopNumBadgeAltText}>{i + 1}</Text></View>
                      </View>
                    </View>
                  </Swipeable>
                  {!isLast && (
                    <View style={mo.travelConnector}>
                      <View style={mo.travelLine} />
                      <Text style={mo.travelLabel}>{'\uD83D\uDE97'} {travelNext} min</Text>
                      <View style={mo.travelLine} />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {ticketStops.length > 0 && (
            <View style={mo.alertStrip}>
              <Text style={mo.alertText}>
                {'\uD83C\uDFAB'} {ticketStops.length} ticket{ticketStops.length !== 1 ? 's' : ''} needed — book before you go
              </Text>
            </View>
          )}

          {/* Hotel / start point card */}
          {(() => {
            const savedHotel = localSavedHotel
              ?? (trip?.stayLocations ?? []).find(s => !s.cityName || s.cityName === (trip?.destination ?? (trip as any)?.city))?.address
              ?? (trip?.stayLocations ?? [])[0]?.address
              ?? null;
            return (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginHorizontal: 16, marginTop: 16, marginBottom: 10, shadowColor: '#1A1F2E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
                activeOpacity={0.85}
                onPress={() => setShowHotelSheet(true)}
              >
                <View style={{ width: 40, height: 40, backgroundColor: '#EBF5F1', borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ fontSize: 20 }}>{'\uD83C\uDFE8'}</Text>
                </View>
                {savedHotel ? (
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.deep }} numberOfLines={1}>{savedHotel}</Text>
                    <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Starting point · tap to edit</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.deep }}>Add hotel / start point</Text>
                    <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Helps with travel times</Text>
                  </View>
                )}
                <Text style={{ color: savedHotel ? C.muted : C.orange, fontSize: savedHotel ? 13 : 20, fontWeight: '700' }}>
                  {savedHotel ? 'Edit' : '+'}
                </Text>
              </TouchableOpacity>
            );
          })()}

          {/* Directions card */}
          {dayStops.length > 0 && (
            <DirectionsToAllStopsCard onPress={() => setShowDirections(true)} />
          )}

          {/* SOS / Emergency button */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: 'rgba(232,67,58,0.2)', borderRadius: 13, padding: 11, paddingHorizontal: 14, marginHorizontal: 16, marginBottom: 14, marginTop: 10 }}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/atstop/sos' as never,
              params: { tripId: trip?.id ?? '', destination: trip?.destination ?? trip?.city ?? '' } })}
          >
            <View style={{ backgroundColor: '#E8433A', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7, flexShrink: 0 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.6 }}>SOS</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#E8433A' }}>SOS</Text>
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>Medical, lost, need help fast</Text>
            </View>
            <Text style={{ color: '#E8433A', fontSize: 18 }}>{'›'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => trip && router.push({ pathname: '/trip/[tripId]' as never, params: { tripId: trip.id, } })}
            style={{ padding: 16, alignItems: 'center' }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#E8692A' }}>
              {'View full trip plan →'}
            </Text>
          </TouchableOpacity>

          {/* Checklist bottom sheet */}
          {trip && (
            <ChecklistSheet
              visible={checklistOpen}
              onClose={() => setChecklistOpen(false)}
              tripId={trip.id}
              stops={dayStops}
            />
          )}

          {!!rainAlert && currentStop && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', borderRadius: 13, padding: 12, marginHorizontal: 16, marginBottom: 10 }}
              activeOpacity={0.85}
              onPress={() => { setRescueInitialOption('weather'); setShowRescue(true); }}
            >
              <Text style={{ fontSize: 20 }}>{'\uD83C\uDF27'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: C.deep }}>Rain likely this morning ({rainAlert.chance}%)</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>A stop may be affected by rain</Text>
                <Text style={{ fontSize: 12, color: C.orange, fontWeight: '700', marginTop: 4 }}>{'See indoor alternatives \u2192'}</Text>
              </View>
            </TouchableOpacity>
          )}
          <Pressable style={[mo.startBtn, starting && { opacity: 0.7 }]} onPress={handleStartDay} disabled={starting}>
            {starting
              ? <ActivityIndicator color="#fff" />
              : <Text style={mo.startBtnText}>{'▶'}  Start Day {resolvedDayIndex + 1}</Text>}
          </Pressable>
          {__DEV__ && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ alignItems: 'center', paddingVertical: 10, marginTop: 4 }}
              onPress={async () => {
                await AsyncStorage.removeItem('@roamus_notif_permission_asked');
                await AsyncStorage.removeItem('@roamus_notif_prefs');
                Alert.alert('Debug', 'Notification state cleared — tap Start Day to re-trigger permission modal.');
              }}
            >
              <Text style={{ fontSize: 11, color: '#E8692A', fontFamily: F.medium }}>{'[DEV] Reset notification state'}</Text>
            </TouchableOpacity>
          )}
          {__DEV__ && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ alignItems: 'center', paddingVertical: 10 }}
              onPress={async () => {
                const { scheduleLocalNotification } = await import('@/services/notifications/notificationEngine');
                const { NotifType: NT } = await import('@/services/notifications/notificationPrefs');
                await scheduleLocalNotification(
                  NT.KIDS_ZONE_ENROUTE,
                  '18 min to Air & Space \uD83C\uDFAE',
                  'Travel games loaded \u2014 keep the kids busy.',
                  { type: NT.KIDS_ZONE_ENROUTE, tripId: 'test-123', dayIndex: 0 },
                  5,
                );
                Alert.alert('Debug', 'Test notification scheduled — fires in 5 seconds.');
              }}
            >
              <Text style={{ fontSize: 11, color: '#7C3AED', fontFamily: F.medium }}>{'[DEV] Fire test notification (5s)'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        {menuOverlay}
        {showPermissionModal && (
          <NotificationPermissionModal onClose={() => setShowPermissionModal(false)} />
        )}
        <IndoorAlternativesSheet
          visible={indoorSheetVisible}
          onClose={() => setIndoorSheetVisible(false)}
          stopId={currentStop?.id ?? ''}
          stopName={currentStop?.name ?? ''}
          tripId={trip?.id ?? ''}
          dayIndex={resolvedDayIndex}
          todayStopNames={dayStops.map(s => s.name ?? '')}
          onSwitchSuccess={() => { void loadTrip(); }}
        />
        <AddHotelSheet
          visible={showHotelSheet}
          tripId={trip?.id ?? ''}
          destination={trip?.destination ?? (trip as any)?.city ?? ''}
          onClose={() => setShowHotelSheet(false)}
          onSkip={() => setShowHotelSheet(false)}
          onSaved={(name, addr) => {
            const resolvedAddr = addr || name;
            setShowHotelSheet(false);
            const saveForDay = () => {
              setLocalSavedHotel(resolvedAddr);
              if (trip?.id) {
                AsyncStorage.setItem(`hotel_${trip.id}_day${resolvedDayIndex}`, resolvedAddr).catch(() => {});
              }
            };
            const saveForAllDays = async () => {
              setLocalSavedHotel(resolvedAddr);
              if (trip?.id) {
                const totalDays = (trip as any).tripDays ?? (trip as any).plannerTripDays ?? 1;
                for (let d = 0; d < totalDays; d++) {
                  AsyncStorage.setItem(`hotel_${trip.id}_day${d}`, resolvedAddr).catch(() => {});
                }
              }
              if (!trip) return;
              const cities: string[] = (trip as any).cities?.length > 0
                ? (trip as any).cities
                : [trip.destination ?? (trip as any).city ?? ''].filter(Boolean);
              const allLocs = cities.map((c: string) => ({ cityName: c, name, address: resolvedAddr }));
              try {
                await apiFetch(`/api/travel/trips/${trip.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ stayLocations: allLocs }),
                });
                setTrip(prev => prev ? { ...prev, stayLocations: allLocs } : prev);
              } catch {}
            };
            Alert.alert(
              'Use for all days?',
              `Use "${name || addr}" as the starting point for every day of your trip?`,
              [
                { text: 'This day only', style: 'cancel', onPress: saveForDay },
                { text: 'All days', onPress: () => { void saveForAllDays(); } },
              ]
            );
          }}
        />
        {showDirections && trip && (
          <DirectionsSheet
            stops={dayStops}
            trip={trip}
            currentDayIndex={resolvedDayIndex}
            onClose={() => setShowDirections(false)}
            savedHotel={localSavedHotel}
          />
        )}
        <UpgradeSheet
          visible={upgradeVisible}
          onClose={() => setUpgradeVisible(false)}
          context="run_day"
        onSuccess={() => { void handleStartDay(); }}
        />
        <RescueSheet
          visible={showRescue}
          onClose={handleRescueClose}
          context="morning"
          stops={dayStops}
          currentStopIndex={currentStopIndex}
          tripId={trip?.id}
          dayIndex={resolvedDayIndex}
          onDropStop={handleRescueDrop}
          onWrapDay={handleRescueWrapDay}
          onStopsChanged={loadTrip}
          onPreviewStop={handlePreviewStop}
          initialOption={rescueInitialOption}
        />
      </View>
      {previewStop && (
        <StopPreviewSheet
          stop={previewStop}
          imageUrl={previewImageUrl}
          imageLoading={false}
          context="replace"
          replacingName={previewReplacingName}
          onClose={handlePreviewClose}
          onConfirm={handlePreviewClose}
        />
      )}
      </>
    );
  }

  function handleKidsZonePress(stopId: string, stopName: string, tripId: string) {
    function launch(kids: PlayerRecord[]) {
      if (kids.length === 0) {
        router.push({ pathname: '/kids' as never, params: {
          stopId, stopName: encodeURIComponent(stopName), tripId,
        }});
      } else if (kids.length === 1) {
        const k = kids[0];
        router.push({ pathname: '/kids' as never, params: {
          stopId, stopName: encodeURIComponent(stopName), tripId,
          explorerName: encodeURIComponent(k.name),
          explorerId: k.id,
          ageBand: getAgeBand(k.age),
        }});
      } else {
        pendingKidsParams.current = { stopId, stopName, tripId };
        setKidPickerVisible(true);
      }
    }
    if (!kidsForPicker.length) {
      getMyPlayers()
        .then(players => {
          const kids = players.filter(p => !p.isParent && !p.isArchived && p.profileType !== 'parent' && p.profileType !== 'adult');
          setKidsForPicker(kids);
          launch(kids);
        })
        .catch(() => launch([]));
    } else {
      launch(kidsForPicker);
    }
  }

  function handlePickerSelect(kid: PickedKid) {
    setKidPickerVisible(false);
    const p = pendingKidsParams.current;
    if (!p) return;
    router.push({ pathname: '/kids' as never, params: {
      stopId: p.stopId,
      stopName: encodeURIComponent(p.stopName),
      tripId: p.tripId,
      explorerName: encodeURIComponent(kid.playerName),
      explorerId: kid.playerId,
      ageBand: kid.ageBand,
    }});
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: EN_ROUTE
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'en_route') {
    const stop = currentStop;
    if (!stop) {
      // State transition to day_complete is handled by the useEffect below; avoid render-time mutation
      return (
        <View style={[misc.center, { paddingTop: insets.top }]}>
          <Text style={misc.errorText}>No stop to navigate to.</Text>
          <Pressable style={misc.stubBtn} onPress={() => setTodayState('morning')}>
            <Text style={misc.stubBtnText}>{'←'} Back</Text>
          </Pressable>
        </View>
      );
    }
    const meta       = parseMetadata(stop.metadata);
    const doFirst    = stop.enrichment?.whyNow ?? meta.doThisFirst;
    const parking    = stop.enrichment?.parkingNotes ?? null;
    const restrooms  = meta.restroomConfidence ?? null;
    const travelMins = stop.travelMinsFromPrevious ?? meta.travelMinutes;
    const stopLabel  = stop.stopType
      ? stop.stopType.charAt(0).toUpperCase() + stop.stopType.slice(1)
      : 'Stop';
    const afterStops = dayStops.slice(currentStopIndex + 1);
    const quickHitsFirst = kids.exploreContent?.stories?.quickHits?.text
      ? kids.exploreContent.stories.quickHits.text.split('.')[0].trim() + '.'
      : null;
    const didYouKnow = quickHitsFirst ??
      (stop.enrichment?.whyNow !== doFirst ? stop.enrichment?.whyNow ?? null : null);

    return (
      <>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
          {/* Photo hero with gradient overlay */}
          <View style={[er.heroWrap, { paddingTop: insets.top + 20, height: 340 }]}>
            <Image
              source={{ uri: meta.imageUrl as string ||
                CITY_IMGS[(stop as { cityGroup?: string | null }).cityGroup ?? ''] ||
                CITY_IMGS[city] ||
                'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80' }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(10,28,22,0.30)', 'rgba(10,28,22,0.62)', 'rgba(10,28,22,0.90)']}
              start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* HEADING THERE badge — top left */}
            <View style={[er.headingBadge, { top: insets.top + 12 }]}>
              <Animated.View style={[er.headingDot, { opacity: pulseAnim }]} />
              <Text style={er.headingText}>HEADING THERE</Text>
            </View>
            {/* Stop info — bottom left */}
            {/* Stop info — bottom left */}
            <View style={er.stopInfoBlock}>
              <Text style={er.stopNum}>Stop {currentStopIndex + 1} of {dayStops.length}</Text>
              <Text style={er.stopName} numberOfLines={2}>{stop.name}</Text>
              <Text style={er.stopSub}>{stopLabel}</Text>
            </View>
            {/* ETA row — pinned to bottom */}
            <View style={er.etaRow}>
              <View style={er.etaPill}>
                <Text style={er.etaIcon}>{'\uD83D\uDE97'}</Text>
                <View>
                  <Text style={er.etaVal}>{travelMins ? `~${travelMins} min` : '~12 min'}</Text>
                  <Text style={er.etaLbl}>ETA</Text>
                </View>
              </View>
              {userDistMi !== null ? (
              <View style={er.etaPill}>
                <Text style={er.etaIcon}>{'📍'}</Text>
                <View>
                  <Text style={er.etaVal}>{`~${userDistMi} mi`}</Text>
                  <Text style={er.etaLbl}>Away</Text>
                </View>
              </View>
            ) : travelMins ? (
              <View style={er.etaPill}>
                <Text style={er.etaIcon}>{'📍'}</Text>
                <View>
                  <Text style={er.etaVal}>{`~${travelMins} min`}</Text>
                  <Text style={er.etaLbl}>Away</Text>
                </View>
              </View>
            ) : null}
            </View>
          </View>

          {/* Rain alert — powered by Open-Meteo (real data) */}
          {!!rainAlert && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', borderRadius: 13, padding: 12, marginHorizontal: 16, marginBottom: 10 }}
            activeOpacity={0.85}
            onPress={() => setIndoorSheetVisible(true)}
          >
            <Text style={{ fontSize: 20 }}>{'\uD83C\uDF27'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.deep }}>Rain likely in the next 3 hours ({rainAlert.chance}%)</Text>
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Outdoor stop may be affected</Text>
              <Text style={{ fontSize: 12, color: C.orange, fontWeight: '700', marginTop: 4 }}>{'See indoor alternatives →'}</Text>
            </View>
          </TouchableOpacity>
          )}

          {!!didYouKnow && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: '#fff', borderRadius: 14, padding: 13, paddingHorizontal: 15, marginHorizontal: 16, marginBottom: 10, shadowColor: '#1A1F2E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden' }}>
              <View style={{ width: 34, height: 34, backgroundColor: '#FEF0E6', borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Text style={{ fontSize: 16 }}>{'\u2728'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: C.orange, letterSpacing: 1, textTransform: 'uppercase' }}>Did you know</Text>
                  <SpeakButton text={didYouKnow} isSpeaking={isSpeaking} onPress={speak} size="sm" color="#8A8FA8" />
                </View>
                <Text style={{ fontSize: 13, color: C.deep, lineHeight: 20, fontWeight: '500' }}>{didYouKnow}</Text>
              </View>
            </View>
          )}

          {!!kids.exploreContent?.missions?.individual?.length && (
            <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.orange, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, paddingHorizontal: 2 }}>{'Your missions'}</Text>
              {kids.exploreContent.missions.individual.map((m, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 4, borderWidth: 1, borderColor: 'rgba(28,25,23,0.08)' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C3AED', letterSpacing: 0.5, textTransform: 'uppercase', minWidth: 24, paddingTop: 1 }}>{`M${i + 1}`}</Text>
                  <Text style={{ fontSize: 12, color: C.deep, lineHeight: 18, flex: 1, fontWeight: '500' }}>{m.enRouteBrief}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={er.kidsStrip} activeOpacity={0.85}
            onPress={() => handleKidsZonePress(stop.id, stop.name ?? '', trip?.id ?? '')}
          >
            <View style={er.kidsIcon}><Text style={{ fontSize: 20 }}>{'\uD83E\uDDED'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={er.kidsTitle}>Let kids explore</Text>
              <Text style={er.kidsSub}>Missions for the ride over</Text>
            </View>
            <Text style={er.kidsArrow}>{'›'}</Text>
          </TouchableOpacity>
          <KidPickerScreen
            visible={kidPickerVisible}
            kids={kidsForPicker}
            onSelect={handlePickerSelect}
            onClose={() => setKidPickerVisible(false)}
          />

          {childrenAges.some(a => a < 9) && (
            <TouchableOpacity
              style={[sotw.breakCard, { marginHorizontal: 16, marginBottom: 12, marginTop: 8 }]}
              activeOpacity={0.85}
              onPress={() => { void openSotwSheet(); }}
            >
              <View style={sotw.breakIcon}>
                <Text style={{ fontSize: 24 }}>{'\uD83D\uDCCD'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sotw.breakTitle}>Need a pit stop?</Text>
                <Text style={sotw.breakSub}>{'Playgrounds, coffee \u0026 more nearby'}</Text>
              </View>
              <Text style={sotw.breakArrow}>{'\u203A'}</Text>
            </TouchableOpacity>
          )}

          {!!doFirst && (
            <View style={er.infoCard}>
              <Text style={er.infoCardLabel}>DO THIS FIRST</Text>
              <Text style={er.infoCardText}>{doFirst}</Text>
            </View>
          )}

          {!!(parking || restrooms) && (
            <View style={er.twoCol}>
              <View style={er.halfCard}>
                <Text style={er.halfLabel}>PARKING</Text>
                <Text style={er.halfVal}>{parking ?? '—'}</Text>
              </View>
              <View style={er.halfCard}>
                <Text style={er.halfLabel}>RESTROOMS</Text>
                <Text style={er.halfVal}>{restrooms ?? '—'}</Text>
              </View>
            </View>
          )}

          {afterStops.length > 0 && (
            <View style={er.afterSection}>
              <Text style={er.afterLabel}>AFTER THIS</Text>
              {afterStops.map((s, idx) => {
                const sMeta  = parseMetadata(s.metadata);
                const imgUrl = (sMeta.imageUrl as string | undefined)
                  ?? CITY_IMGS[(s as { cityGroup?: string | null }).cityGroup ?? '']
                  ?? CITY_IMGS[city]
                  ?? 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80';
                const stopNum = currentStopIndex + 2 + idx;
                return (
                  <View key={s.id} style={er.afterRow}>
                    <View style={er.afterThumb}>
                      <Image source={{ uri: imgUrl }} style={er.afterThumbImg} />
                      <View style={er.afterThumbBadge}>
                        <Text style={er.afterThumbBadgeText}>{stopNum}</Text>
                      </View>
                    </View>
                    <Text style={er.afterName} numberOfLines={1}>{s.name}</Text>
                    {hasTicketSignal(s.metadata) && (
                      <View style={er.afterTicket}><Text style={er.afterTicketText}>{'\uD83C\uDFAB'}</Text></View>
                    )}
                    <Text style={er.afterDur}>{getStopDuration(s)} min</Text>
                  </View>
                );
              })}
              <TouchableOpacity
                style={er.afterAddBtn}
                activeOpacity={0.7}
                onPress={() => trip && router.push({ pathname: '/trip/[tripId]' as never, params: { tripId: trip.id, openAddStop: 'true', addStopDefaultFilter: 'landmarks' } })}
              >
                <Text style={er.afterAddText}>+ Add a stop</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Dual action buttons: outline Directions + dark I'm here */}
          <View style={er.dualBtnRow}>
            <TouchableOpacity
              style={er.dirBtn}
              activeOpacity={0.8}
              onPress={() => {
                const addr = (stop as { address?: string }).address ?? stop.name;
                Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(addr)}`);
              }}
            >
              <Text style={er.dirBtnText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={er.hereBtn}
              activeOpacity={0.85}
              onPress={() => {
                if (isFree && resolvedDayIndex > 0) { setUpgradeVisible(true); return; }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setTodayState('at_stop_frozen');
                AsyncStorage.setItem('atStopFrozen', 'true');
                AsyncStorage.setItem('atStopFrozenTripId', trip?.id ?? '');
                AsyncStorage.setItem('atStopStartTime', String(Date.now()));
                // Silent instrumentation — fire-and-forget, never blocks UI
                if (trip?.id) {
                  AsyncStorage.getItem('lastStopCompleteTime').then(lastTs => {
                    const timeSinceLastStop = lastTs
                      ? Math.round((Date.now() - parseInt(lastTs, 10)) / 60000)
                      : null;
                    apiFetch('/api/travel/stop-activity-log', {
                      method: 'POST',
                      body: JSON.stringify({
                        tripId: trip.id,
                        stopId: stop.id,
                        arrivedAt: new Date().toISOString(),
                        plannedDurationMinutes: stop.durationMinutes ?? parseMetadata(stop.metadata).durationMinutes ?? null,
                        timeSinceLastStopMinutes: timeSinceLastStop,
                        weatherTempF: currentTemp ?? null,
                      }),
                    }).catch(() => {});
                  }).catch(() => {});
                }
                router.push({ pathname: '/(tabs)/atstop' as never, params: { stopId: stop.id } });
              }}
            >
              <Text style={er.hereBtnText}>{"I'm here ✓"}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={{ alignSelf: 'center', marginTop: 10, paddingVertical: 6, paddingHorizontal: 16 }}
            onPress={() => setShowChangedMind(true)}
          >
            <Text style={{ color: C.orange, fontSize: 13, fontFamily: F.semibold }}>{'Changed My Mind'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowRescue(true)}
            style={{ alignSelf: 'center', marginTop: 12, marginBottom: TAB_BAR_H + insets.bottom + 16, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, borderColor: C.orange, backgroundColor: 'transparent' }}
          >
            <Text style={{ color: C.orange, fontSize: 13, fontFamily: F.semibold }}>{'Day not going to plan? \u2192'}</Text>
          </TouchableOpacity>
        </ScrollView>
        <IndoorAlternativesSheet
          visible={indoorSheetVisible}
          onClose={() => setIndoorSheetVisible(false)}
          stopId={stop.id}
          stopName={stop.name ?? ''}
          tripId={trip?.id ?? ''}
          dayIndex={resolvedDayIndex}
          todayStopNames={dayStops.map(s => s.name ?? '')}
          onSwitchSuccess={() => { void loadTrip(); setIndoorSheetVisible(false); }}
        />
        <UpgradeSheet
          visible={upgradeVisible}
          onClose={() => setUpgradeVisible(false)}
          context="run_day"
        onSuccess={() => { void handleStartDay(); }}
        />
        <RescueSheet
          visible={showRescue}
          onClose={handleRescueClose}
          context="en_route"
          stops={dayStops}
          currentStopIndex={currentStopIndex}
          tripId={trip?.id}
          dayIndex={resolvedDayIndex}
          onDropStop={handleRescueDrop}
          onWrapDay={handleRescueWrapDay}
          onStopsChanged={loadTrip}
          onPreviewStop={handlePreviewStop}
        />
        <SheetModal visible={showChangedMind} onClose={() => setShowChangedMind(false)}>
          <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.deep, marginTop: 20, marginBottom: 4 }}>{"Changed your mind?"}</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 20 }}>{"That's fine — tell us why so we can adjust your day."}</Text>
          {([
            { icon: '\u23F0', bg: '#FFF3E0', name: 'Ran out of time',       desc: "We'll skip it and keep the rest of your day",  signal: 'time' },
            { icon: '\uD83D\uDE24', bg: C.redLt, name: "Kids didn't want to go", desc: "Noted — won't suggest similar stops next time", signal: 'kids_rejected' },
            { icon: '\uD83D\uDD12', bg: C.bg, name: 'It was closed', desc: "We'll flag this for future families", signal: 'closed' },
            { icon: '\u270C\uFE0F', bg: C.bg, name: 'Just skipping it', desc: 'No reason needed — moving on', signal: 'skipped' },
          ] as Array<{ icon: string; bg: string; name: string; desc: string; signal: string }>).map(row => (
            <TouchableOpacity key={row.signal}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 13, borderRadius: 13, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, marginBottom: 8 }}
              activeOpacity={0.8}
              onPress={() => { void handleChangedMindSkip(row.signal); }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: row.bg }}>
                <Text style={{ fontSize: 18 }}>{row.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.deep, marginBottom: 2 }}>{row.name}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: C.muted, lineHeight: 17 }}>{row.desc}</Text>
              </View>
              <Text style={{ fontSize: 16, color: C.muted }}>{"\u203A"}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={{ paddingVertical: 14, alignItems: 'center' }} onPress={() => setShowChangedMind(false)}>
            <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.muted }}>{"Cancel"}</Text>
          </TouchableOpacity>
        </SheetModal>
        {menuOverlay}
      </View>
      {previewStop && (
        <StopPreviewSheet
          stop={previewStop}
          imageUrl={previewImageUrl}
          imageLoading={false}
          context="replace"
          replacingName={previewReplacingName}
          onClose={handlePreviewClose}
          onConfirm={handlePreviewClose}
        />
      )}

      {activeSheet === 'stopsOnTheWay' && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateY: sotwSlideY }], zIndex: 100, elevation: 100, backgroundColor: C.bg },
          ]}
        >
          <View style={{ height: '38%', position: 'relative', overflow: 'hidden' }}>
            {sotwUserLoc ? (
              <Image
                source={{ uri: `${API_BASE}/api/travel/static-map?width=390&height=280&originLat=${currentStop?.latitude}&originLng=${currentStop?.longitude}&destLat=${dayStops[currentStopIndex + 1]?.latitude}&destLng=${dayStops[currentStopIndex + 1]?.longitude}` }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ flex: 1, backgroundColor: '#b0c4b1', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <View style={sotw.topBar}>
              <TouchableOpacity style={sotw.backBtn} onPress={closeSotwSheet}>
                <Text style={{ fontSize: 18, color: C.deep, fontWeight: '700', lineHeight: 22 }}>{'\u2039'}</Text>
              </TouchableOpacity>
              <View style={sotw.etaPill}>
                <View style={sotw.etaDot} />
                <Text style={sotw.etaPillText}>{travelMins != null ? `~${travelMins} min` : 'En route'}</Text>
              </View>
            </View>
            <View style={sotw.routeBar}>
              <Text style={sotw.routeFrom} numberOfLines={1}>{stop.name ?? 'Current stop'}</Text>
              <Text style={sotw.routeArr}>{' \u2192 '}</Text>
              <Text style={sotw.routeTo} numberOfLines={1}>{dayStops[currentStopIndex + 1]?.name ?? 'Next stop'}</Text>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={{ padding: 16, paddingBottom: 0 }}>
              <Text style={sotw.resultsTitle}>Quick Stops Nearby</Text>
              <Text style={sotw.resultsSub}>Places close to your route</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sotw.pillsRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {([
                ['playground', '\uD83D\uDEDD', 'Playgrounds'],
                ['beach',      '\uD83C\uDFD6', 'Beach'],
                ['coffee',     '\u2615',        'Coffee'],
                ['food',       '\uD83C\uDF55',  'Food'],
                ['restrooms',  '\uD83D\uDEBB',  'Restrooms'],
              ] as [SotwFilter, string, string][]).map(([f, emoji, label]) => (
                <TouchableOpacity
                  key={f}
                  style={[sotw.pill, sotwFilter === f && sotw.pillOn]}
                  onPress={() => { setSotwFilter(f); void fetchSotwPlaces(f); }}
                >
                  <Text>{emoji}</Text>
                  <Text style={[sotw.pillText, sotwFilter === f && sotw.pillTextOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ paddingHorizontal: 16 }}>
              {sotwLoading ? (
                <ActivityIndicator color={C.orange} style={{ marginTop: 24 }} />
              ) : sotwPlaces.length === 0 ? (
                <Text style={[sotw.resultsSub, { marginTop: 20, textAlign: 'center' }]}>No places found nearby</Text>
              ) : (
                <>
                  <Text style={sotw.placeCount}>{sotwPlaces.length}{' place'}{sotwPlaces.length !== 1 ? 's' : ''}{' found'}</Text>
                  {sotwPlaces.map((place) => {
                    console.log('[SOTW photo]', place.name, '→', place.photoReference);
                    const isSelected = place.placeId === selectedPlaceId;
                    if (isSelected) {
                      return (
                        <TouchableOpacity key={place.placeId} style={[sotw.richCard, { borderColor: '#E8692A' }]} onPress={() => openBreakCapture(place)} activeOpacity={0.92}>
                          <View style={sotw.richImg}>
                            {place.photoReference ? (
                              <Image
                                source={{ uri: `${API_BASE}/api/travel/place-photo?ref=${encodeURIComponent(place.photoReference)}` }}
                                style={StyleSheet.absoluteFill}
                                resizeMode="cover"
                                onError={(e) => console.log('[SOTW img error]', place.name, e.nativeEvent.error)}
                                onLoad={() => console.log('[SOTW img loaded]', place.name)}
                              />
                            ) : (
                              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#7A9E8E', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{ fontSize: 36 }}>{'\uD83D\uDCCD'}</Text>
                              </View>
                            )}
                            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
                            <Text style={sotw.richName}>{place.name}</Text>
                          </View>
                          <View style={sotw.richBody}>
                            <View style={sotw.pcMeta}>
                              {place.onRoute && <View style={sotw.tagRoute}><Text style={sotw.tagRouteText}>On route</Text></View>}
                              <View style={sotw.tagDetour}><Text style={sotw.tagDetourText}>{'+' + place.detourMinutes + ' min'}</Text></View>
                              <Text style={sotw.pcAmen} numberOfLines={1}>{place.vicinity}</Text>
                            </View>
                            <TouchableOpacity style={[sotw.goBtn, { marginTop: 8, alignSelf: 'stretch', borderRadius: 13, backgroundColor: '#E8692A' }]} onPress={() => openBreakCapture(place)}>
                              <Text style={[sotw.goBtnText, { textAlign: 'center' }]}>{'Let\u2019s go'}</Text>
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity key={place.placeId} style={[sotw.richCard, { paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }]} onPress={() => setSelectedPlaceId(place.placeId)} activeOpacity={0.85}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ fontSize: 15, fontFamily: F.bold, color: C.deep }} numberOfLines={1}>{place.name}</Text>
                          <View style={sotw.pcMeta}>
                            <View style={sotw.tagDetour}><Text style={sotw.tagDetourText}>{'+' + place.detourMinutes + ' min'}</Text></View>
                            {place.onRoute && <View style={sotw.tagRoute}><Text style={sotw.tagRouteText}>On route</Text></View>}
                            <Text style={sotw.pcAmen} numberOfLines={1}>{place.vicinity}</Text>
                          </View>
                        </View>
                        <TouchableOpacity style={[sotw.goBtn, { marginLeft: 10, width: 72, alignItems: 'center' }]} onPress={() => openBreakCapture(place)}>
                          <Text style={sotw.goBtnText}>Go</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {activeBreakPlace && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateY: breakSlideY }], zIndex: 101, elevation: 101 },
          ]}
        >
          <LinearGradient
            colors={getBreakHeroColors(sotwFilter)}
            style={[sotw.bcHero, { paddingTop: insets.top + 6 }]}
          >
            <View style={sotw.bcTopRow}>
              <TouchableOpacity style={sotw.bcClose} onPress={closeBreakCapture}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 }}>{'\u00D7'}</Text>
              </TouchableOpacity>
            </View>
            <View style={sotw.bcBadge}>
              <Text style={sotw.bcBadgeText}>BREAK STOP</Text>
            </View>
            <Text style={sotw.bcTitle}>{activeBreakPlace.name}</Text>
            <Text style={sotw.bcSub}>{activeBreakPlace.vicinity}</Text>
          </LinearGradient>
          <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}>
            <TouchableOpacity
              style={sotw.dirCard}
              activeOpacity={0.85}
              onPress={async () => {
                console.log('activeBreakPlace:', JSON.stringify(activeBreakPlace));
                const native = 'comgooglemaps://';
                const canUseNative = await Linking.canOpenURL(native);
                const url = canUseNative
                  ? `comgooglemaps://?daddr=${activeBreakPlace.lat},${activeBreakPlace.lng}&directionsmode=driving`
                  : `https://www.google.com/maps/dir/?api=1&destination=${activeBreakPlace.lat},${activeBreakPlace.lng}`;
                void Linking.openURL(url);
              }}
            >
              <Text style={sotw.dirCardText}>{'Get Directions \u2192'}</Text>
            </TouchableOpacity>
            <View style={sotw.quoteCard}>
              <Text style={sotw.quoteLabel}>KID QUOTE</Text>
              <SpeechTextInput
                placeholder={'What did ' + youngestChildName + ' say?'}
                value={breakQuote}
                onChangeText={setBreakQuote}
                style={sotw.quoteInput}
                multiline
              />
            </View>
            <View style={sotw.snapCard}>
              <Text style={sotw.quoteLabel}>QUICK SNAP</Text>
              <TouchableOpacity style={sotw.snapBtn} activeOpacity={0.8} onPress={() => { void handleBreakAddPhotos(); }}>
                <Text style={{ fontSize: 22 }}>{'\uD83D\uDCF7'}</Text>
                <Text style={sotw.snapBtnText}>{breakPhotos.length > 0 ? `${breakPhotos.length} photo${breakPhotos.length !== 1 ? 's' : ''} added` : 'Add a photo'}</Text>
              </TouchableOpacity>
              {breakPhotos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {breakPhotos.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={{ width: 72, height: 72, borderRadius: 10, marginRight: 8 }} />
                  ))}
                </ScrollView>
              )}
            </View>
            <TouchableOpacity style={sotw.doneBtn} activeOpacity={0.88} onPress={() => { void handleBreakDone(); }}>
              <Text style={sotw.doneBtnText}>{'Done with break \u2192'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}

      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: AT_STOP_FROZEN — full EN_ROUTE content + green ‘you’re here’ banner
  // ─────────────────────────────────────────────────────────────────────────────────
  if (todayState === 'at_stop_frozen') {
    const stop = currentStop;
    if (!stop) {
      return (
        <View style={[misc.center, { paddingTop: insets.top }]}>
          <Text style={misc.errorText}>No current stop.</Text>
          <Pressable style={misc.stubBtn} onPress={() => setTodayState('morning')}>
            <Text style={misc.stubBtnText}>{'\u2190'} Back</Text>
          </Pressable>
        </View>
      );
    }
    const meta       = parseMetadata(stop.metadata);
    const doFirst    = stop.enrichment?.whyNow ?? meta.doThisFirst;
    const parking    = stop.enrichment?.parkingNotes ?? null;
    const restrooms  = meta.restroomConfidence ?? null;
    const travelMins = stop.travelMinsFromPrevious ?? meta.travelMinutes;
    const stopLabel  = stop.stopType
      ? stop.stopType.charAt(0).toUpperCase() + stop.stopType.slice(1)
      : 'Stop';
    const afterStops = dayStops.slice(currentStopIndex + 1);
    const quickHitsFirst = kids.exploreContent?.stories?.quickHits?.text
      ? kids.exploreContent.stories.quickHits.text.split('.')[0].trim() + '.'
      : null;
    const didYouKnow = quickHitsFirst ??
      (stop.enrichment?.whyNow !== doFirst ? stop.enrichment?.whyNow ?? null : null);
    const heroImageUrl = trip?.firstPhotoUrl
      ?? CITY_IMGS[city]
      ?? 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80';

    return (
      <>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
          {/* Hero — same as EN_ROUTE, not dimmed */}
          <View style={[er.heroWrap, { paddingTop: insets.top + 20, height: 340 }]}>
            <Image
              source={{ uri: heroImageUrl || (meta.imageUrl as string) ||
                CITY_IMGS[(stop as { cityGroup?: string | null }).cityGroup ?? ''] ||
                CITY_IMGS[city] ||
                'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80' }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(10,28,22,0.30)', 'rgba(10,28,22,0.62)', 'rgba(10,28,22,0.90)']}
              start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[er.headingBadge, { top: insets.top + 12 }]}>
              <Animated.View style={[er.headingDot, { opacity: pulseAnim }]} />
              <Text style={er.headingText}>HEADING THERE</Text>
            </View>
            <View style={er.stopInfoBlock}>
              <Text style={er.stopNum}>Stop {currentStopIndex + 1} of {dayStops.length}</Text>
              <Text style={er.stopName} numberOfLines={2}>{stop.name}</Text>
              <Text style={er.stopSub}>{stopLabel}</Text>
            </View>
            <View style={er.etaRow}>
              <View style={er.etaPill}>
                <Text style={er.etaIcon}>{'\uD83D\uDE97'}</Text>
                <View>
                  <Text style={er.etaVal}>{travelMins ? `~${travelMins} min` : '~12 min'}</Text>
                  <Text style={er.etaLbl}>ETA</Text>
                </View>
              </View>
              {userDistMi !== null ? (
                <View style={er.etaPill}>
                  <Text style={er.etaIcon}>{'\uD83D\uDCCD'}</Text>
                  <View>
                    <Text style={er.etaVal}>{`~${userDistMi} mi`}</Text>
                    <Text style={er.etaLbl}>Away</Text>
                  </View>
                </View>
              ) : travelMins ? (
                <View style={er.etaPill}>
                  <Text style={er.etaIcon}>{'\uD83D\uDCCD'}</Text>
                  <View>
                    <Text style={er.etaVal}>{`~${travelMins} min`}</Text>
                    <Text style={er.etaLbl}>Away</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Green banner — tap to return to At Stop tab */}
          <TouchableOpacity
            style={asf.greenBanner}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/(tabs)/atstop' as never, params: { stopId: stop.id } })}
          >
            <Animated.View style={[asf.greenDot, { opacity: pulseAnim }]} />
            <View style={{ flex: 1 }}>
              <Text style={asf.greenBannerTitle}>You're at {stop.name}</Text>
              <Text style={asf.greenBannerSub}>Tap to go back to your stop</Text>
            </View>
            <Text style={asf.greenBannerArrow}>{'\u203A'}</Text>
          </TouchableOpacity>

          {/* Rain alert */}
          {!!rainAlert && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', borderRadius: 13, padding: 12, marginHorizontal: 16, marginBottom: 10 }}
              activeOpacity={0.85}
              onPress={() => setIndoorSheetVisible(true)}
            >
              <Text style={{ fontSize: 20 }}>{'\uD83C\uDF27'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: C.deep }}>Rain likely in the next 3 hours ({rainAlert.chance}%)</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Outdoor stop may be affected</Text>
                <Text style={{ fontSize: 12, color: C.orange, fontWeight: '700', marginTop: 4 }}>{'See indoor alternatives \u2192'}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Did you know */}
          {!!didYouKnow && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: '#fff', borderRadius: 14, padding: 13, paddingHorizontal: 15, marginHorizontal: 16, marginBottom: 10, shadowColor: '#1A1F2E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden' }}>
              <View style={{ width: 34, height: 34, backgroundColor: '#FEF0E6', borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Text style={{ fontSize: 16 }}>{'\u2728'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: C.orange, letterSpacing: 1, textTransform: 'uppercase' }}>Did you know</Text>
                  <SpeakButton text={didYouKnow} isSpeaking={isSpeaking} onPress={speak} size="sm" color="#8A8FA8" />
                </View>
                <Text style={{ fontSize: 13, color: C.deep, lineHeight: 20, fontWeight: '500' }}>{didYouKnow}</Text>
              </View>
            </View>
          )}

          {/* Kids strip */}
          <TouchableOpacity
            style={er.kidsStrip} activeOpacity={0.85}
            onPress={() => handleKidsZonePress(stop.id, stop.name ?? '', trip?.id ?? '')}
          >
            <View style={er.kidsIcon}><Text style={{ fontSize: 20 }}>{'\uD83E\uDDED'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={er.kidsTitle}>Let kids explore</Text>
              <Text style={er.kidsSub}>Missions for the ride over</Text>
            </View>
            <Text style={er.kidsArrow}>{'\u203A'}</Text>
          </TouchableOpacity>

          {!!doFirst && (
            <View style={er.infoCard}>
              <Text style={er.infoCardLabel}>DO THIS FIRST</Text>
              <Text style={er.infoCardText}>{doFirst}</Text>
            </View>
          )}

          {!!(parking || restrooms) && (
            <View style={er.twoCol}>
              <View style={er.halfCard}>
                <Text style={er.halfLabel}>PARKING</Text>
                <Text style={er.halfVal}>{parking ?? '\u2014'}</Text>
              </View>
              <View style={er.halfCard}>
                <Text style={er.halfLabel}>RESTROOMS</Text>
                <Text style={er.halfVal}>{restrooms ?? '\u2014'}</Text>
              </View>
            </View>
          )}

          {afterStops.length > 0 && (
            <View style={er.afterSection}>
              <Text style={er.afterLabel}>AFTER THIS</Text>
              {afterStops.map((s, idx) => {
                const sMeta  = parseMetadata(s.metadata);
                const imgUrl = (sMeta.imageUrl as string | undefined)
                  ?? CITY_IMGS[(s as { cityGroup?: string | null }).cityGroup ?? '']
                  ?? CITY_IMGS[city]
                  ?? 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80';
                const stopNum = currentStopIndex + 2 + idx;
                return (
                  <View key={s.id} style={er.afterRow}>
                    <View style={er.afterThumb}>
                      <Image source={{ uri: imgUrl }} style={er.afterThumbImg} />
                      <View style={er.afterThumbBadge}>
                        <Text style={er.afterThumbBadgeText}>{stopNum}</Text>
                      </View>
                    </View>
                    <Text style={er.afterName} numberOfLines={1}>{s.name}</Text>
                    {hasTicketSignal(s.metadata) && (
                      <View style={er.afterTicket}><Text style={er.afterTicketText}>{'\uD83C\uDFAB'}</Text></View>
                    )}
                    <Text style={er.afterDur}>{getStopDuration(s)} min</Text>
                  </View>
                );
              })}
              <TouchableOpacity
                style={er.afterAddBtn}
                activeOpacity={0.7}
                onPress={() => trip && router.push({ pathname: '/trip/[tripId]' as never, params: { tripId: trip.id, openAddStop: 'true', addStopDefaultFilter: 'landmarks' } })}
              >
                <Text style={er.afterAddText}>+ Add a stop</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Directions + Go to stop */}
          <View style={er.dualBtnRow}>
            <TouchableOpacity
              style={er.dirBtn}
              activeOpacity={0.8}
              onPress={() => {
                const addr = (stop as { address?: string }).address ?? stop.name;
                Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(addr)}`);
              }}
            >
              <Text style={er.dirBtnText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={er.hereBtn}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(tabs)/atstop' as never, params: { stopId: stop.id } })}
            >
              <Text style={er.hereBtnText}>{'Go to stop \u203A'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={{ alignSelf: 'center', marginTop: 10, paddingVertical: 6, paddingHorizontal: 16 }}
            onPress={() => setShowChangedMind(true)}
          >
            <Text style={{ color: C.orange, fontSize: 13, fontFamily: F.semibold }}>{'Changed My Mind'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowRescue(true)}
            style={{ alignSelf: 'center', marginTop: 12, marginBottom: TAB_BAR_H + insets.bottom + 16, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, borderColor: C.orange, backgroundColor: 'transparent' }}
          >
            <Text style={{ color: C.orange, fontSize: 13, fontFamily: F.semibold }}>{'Day not going to plan? \u2192'}</Text>
          </TouchableOpacity>
        </ScrollView>
        <IndoorAlternativesSheet
          visible={indoorSheetVisible}
          onClose={() => setIndoorSheetVisible(false)}
          stopId={stop.id}
          stopName={stop.name ?? ''}
          tripId={trip?.id ?? ''}
          dayIndex={resolvedDayIndex}
          todayStopNames={dayStops.map(s => s.name ?? '')}
          onSwitchSuccess={() => { void loadTrip(); setIndoorSheetVisible(false); }}
        />
        <UpgradeSheet
          visible={upgradeVisible}
          onClose={() => setUpgradeVisible(false)}
          context="run_day"
        onSuccess={() => { void handleStartDay(); }}
        />
        <RescueSheet
          visible={showRescue}
          onClose={handleRescueClose}
          context="en_route"
          stops={dayStops}
          currentStopIndex={currentStopIndex}
          tripId={trip?.id}
          dayIndex={resolvedDayIndex}
          onDropStop={handleRescueDrop}
          onWrapDay={handleRescueWrapDay}
          onStopsChanged={loadTrip}
          onPreviewStop={handlePreviewStop}
        />
        <SheetModal visible={showChangedMind} onClose={() => setShowChangedMind(false)}>
          <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.deep, marginTop: 20, marginBottom: 4 }}>{"Changed your mind?"}</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 20 }}>{"That's fine — tell us why so we can adjust your day."}</Text>
          {([
            { icon: '\u23F0', bg: '#FFF3E0', name: 'Ran out of time',       desc: "We'll skip it and keep the rest of your day",  signal: 'time' },
            { icon: '\uD83D\uDE24', bg: C.redLt, name: "Kids didn't want to go", desc: "Noted — won't suggest similar stops next time", signal: 'kids_rejected' },
            { icon: '\uD83D\uDD12', bg: C.bg, name: 'It was closed', desc: "We'll flag this for future families", signal: 'closed' },
            { icon: '\u270C\uFE0F', bg: C.bg, name: 'Just skipping it', desc: 'No reason needed — moving on', signal: 'skipped' },
          ] as Array<{ icon: string; bg: string; name: string; desc: string; signal: string }>).map(row => (
            <TouchableOpacity key={row.signal}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 13, borderRadius: 13, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, marginBottom: 8 }}
              activeOpacity={0.8}
              onPress={() => { void handleChangedMindSkip(row.signal); }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: row.bg }}>
                <Text style={{ fontSize: 18 }}>{row.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.deep, marginBottom: 2 }}>{row.name}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: C.muted, lineHeight: 17 }}>{row.desc}</Text>
              </View>
              <Text style={{ fontSize: 16, color: C.muted }}>{"\u203A"}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={{ paddingVertical: 14, alignItems: 'center' }} onPress={() => setShowChangedMind(false)}>
            <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.muted }}>{"Cancel"}</Text>
          </TouchableOpacity>
        </SheetModal>
        {menuOverlay}
      </View>
      {previewStop && (
        <StopPreviewSheet
          stop={previewStop}
          imageUrl={previewImageUrl}
          imageLoading={false}
          context="replace"
          replacingName={previewReplacingName}
          onClose={handlePreviewClose}
          onConfirm={handlePreviewClose}
        />
      )}
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: STOP_COMPLETE
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'stop_complete') {
    const visitedStop = dayStops[currentStopIndex - 1] ?? dayStops[0];
    const nextStop    = currentStop;
    const isLastStop  = !nextStop || currentStopIndex >= dayStops.length;
    const firstKid    = (trip?.travelers ?? []).find(t => !t.isParent);
    const quoteKey    = visitedStop?.id ?? 'stop';
    const quoteHolder = firstKid ? `"That was amazing!" — ${firstKid.name}` : '"That was amazing!"';
    const bounceScale = bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

    return (
      <>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
          <View style={[sc.hero, { paddingTop: insets.top + 24 }]}>
            <Animated.View style={{ transform: [{ scale: bounceScale }] }}>
              <Text style={sc.heroEmoji}>{'\uD83C\uDF89'}</Text>
            </Animated.View>
            <Text style={sc.heroTitle}>Stop done!</Text>
            <Text style={sc.heroSub}>{visitedStop?.name ?? ''}</Text>
            {visitedElapsed != null && (
              <View style={sc.elapsedPill}>
                <Text style={sc.elapsedText}>{'⏱'}  {visitedElapsed} min here</Text>
              </View>
            )}
          </View>

          <View style={sc.card}>
            <Text style={sc.cardLabel}>WHAT DID THE KIDS SAY?</Text>
            <SpeechTextInput
              style={sc.quoteInput}
              value={kidQuotes[quoteKey] ?? ''}
              onChangeText={text => setKidQuotes(prev => ({ ...prev, [quoteKey]: text }))}
              placeholder={quoteHolder}
              placeholderTextColor={C.muted}
              multiline numberOfLines={3}
              returnKeyType="done" blurOnSubmit
            />
          </View>

          <View style={sc.card}>
            <Text style={sc.cardLabel}>QUICK SNAP</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={sc.photoScrollContent}
            >
              {visitedPhotos.map(uri => (
                <TouchableOpacity
                  key={uri}
                  style={sc.photoThumb}
                  activeOpacity={0.85}
                  onLongPress={() => removePhoto('visited', uri)}
                >
                  <Image source={{ uri }} style={sc.photoThumbImg} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={sc.photoAddBtn}
                activeOpacity={0.7}
                onPress={() => handleAddPhotos('visited')}
              >
                <Text style={sc.photoAddPlus}>+</Text>
                <Text style={sc.photoAddLabel}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
            {visitedPhotos.length > 0 && (
              <Text style={sc.photoHint}>
                {visitedPhotos.length} photo{visitedPhotos.length !== 1 ? 's' : ''}{' \u00b7 '}Long-press to remove
              </Text>
            )}
          </View>

          {isLastStop ? (
            <View style={sc.card}>
              <Text style={sc.celebText}>That's all for today!</Text>
              <TouchableOpacity style={sc.wrapBtn} activeOpacity={0.85} onPress={() => {
                setWrapPhotos(prev => mergeVisitedIntoWrap(visitedPhotos, prev));
                setTodayState('day_complete');
                if (resolvedTripId) {
                  const photoCount = visitedPhotos.length + wrapPhotos.length;
                  onDayComplete({
                    tripId: resolvedTripId,
                    dayIndex: resolvedDayIndex,
                    stopNames: dayStops.filter(s => s.isVisited || s.visited).map(s => s.name),
                    photoCount,
                    dayNum: resolvedDayIndex + 1,
                  }).catch(() => {});
                }
              }}>
                <Text style={sc.wrapBtnText}>Wrap up Day {resolvedDayIndex + 1} →</Text>
              </TouchableOpacity>
              {(() => {
                // Part B: on the last populated day show a direct story shortcut + extend option
                const scNonMeals = (trip?.stops ?? []).filter((s: any) => !isMealStop(s.stopType));
                const scLastDay = scNonMeals.length > 0
                  ? Math.max(...scNonMeals.map((s: any) => s.dayIndex ?? 0))
                  : (trip?.plannerTripDays ?? trip?.tripDays ?? 1) - 1;
                if (resolvedDayIndex < scLastDay) return null;
                return (
                  <>
                    <TouchableOpacity
                      style={[sc.wrapBtn, { backgroundColor: C.orange, marginTop: 10 }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setWrapPhotos(prev => mergeVisitedIntoWrap(visitedPhotos, prev));
                        setTodayState('trip_complete');
                      }}
                    >
                      <Text style={sc.wrapBtnText}>See your trip story →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => trip?.id && router.push(`/trip/${trip.id}` as never)}
                      style={{ marginTop: 12, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20 }}
                    >
                      <Text style={{ color: C.muted, fontFamily: F.medium, fontSize: 14 }}>{'+ Add a day'}</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          ) : (
            <View style={sc.card}>
              <Text style={sc.cardLabel}>NEXT UP</Text>
              <Text style={sc.nextStopName}>{nextStop!.name}</Text>
              <Text style={sc.nextStopMeta}>
                {nextStop!.stopType
                  ? nextStop!.stopType.charAt(0).toUpperCase() + nextStop!.stopType.slice(1)
                  : 'Stop'}
                {' · '}~{nextStop!.travelMinsFromPrevious ?? parseMetadata(nextStop!.metadata).travelMinutes ?? 15} min away
              </Text>
              <TouchableOpacity
                style={sc.headThereBtn} activeOpacity={0.85}
                onPress={() => {
                  if (isFree && resolvedDayIndex > 0) { setUpgradeVisible(true); return; }
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setWrapPhotos(prev => mergeVisitedIntoWrap(visitedPhotos, prev));
                  setVisitedPhotos([]);
                  executionStartedRef.current = true;
                  setTodayState('en_route');
                }}
              >
                <Text style={sc.headThereBtnText}>Head there →</Text>
              </TouchableOpacity>
            </View>
          )}
          {!isLastStop && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowRescue(true)}
              style={{ alignSelf: 'center', marginTop: 20, marginBottom: TAB_BAR_H + insets.bottom + 16, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, borderColor: C.orange, backgroundColor: 'transparent' }}
            >
              <Text style={{ color: C.orange, fontSize: 13, fontFamily: F.semibold }}>{'Day not going to plan? \u2192'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        {menuOverlay}
        {showFeedback && feedbackStop && (
          <StopFeedbackSheet
            visible={showFeedback}
            stop={feedbackStop}
            tripId={trip?.id ?? ''}
            onComplete={() => setShowFeedback(false)}
          />
        )}
        <UpgradeSheet
          visible={upgradeVisible}
          onClose={() => setUpgradeVisible(false)}
          context="run_day"
        onSuccess={() => { void handleStartDay(); }}
        />
        <RescueSheet
          visible={showRescue}
          onClose={handleRescueClose}
          context="stop_complete"
          stops={dayStops}
          currentStopIndex={currentStopIndex}
          tripId={trip?.id}
          dayIndex={resolvedDayIndex}
          onDropStop={handleRescueDrop}
          onWrapDay={handleRescueWrapDay}
          onStopsChanged={loadTrip}
          onPreviewStop={handlePreviewStop}
        />
      </View>
      {previewStop && (
        <StopPreviewSheet
          stop={previewStop}
          imageUrl={previewImageUrl}
          imageLoading={false}
          context="replace"
          replacingName={previewReplacingName}
          onClose={handlePreviewClose}
          onConfirm={handlePreviewClose}
        />
      )}
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: DAY_COMPLETE
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'day_complete') {
    const completedStops = dayStops.slice(0, Math.max(currentStopIndex > 0 ? currentStopIndex : dayStops.length, 1));
    const totalMins      = completedStops.reduce((s, st) => s + getStopDuration(st), 0);
    const totalHrs       = Math.floor(totalMins / 60);
    const totalRem       = totalMins % 60;
    const totalStr       = totalRem > 0 ? `${totalHrs}h ${totalRem}m` : `${totalHrs}h`;
    const children       = (trip?.travelers ?? []).filter(t => !t.isParent);
    const ratingOptions: { key: 'okay' | 'good' | 'amazing'; label: string }[] = [
      { key: 'okay',    label: 'Okay' },
      { key: 'good',    label: 'Good' },
      { key: 'amazing', label: 'Amazing' },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
          <LinearGradient
            colors={['#1D4A42', '#163830']}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={[dc.hero, { paddingTop: insets.top + 52 }]}
          >
            <Text style={dc.heroStars}>{'\u2B50\u2B50\u2B50'}</Text>
            <Text style={dc.heroLabel}>DAY {resolvedDayIndex + 1} DONE!</Text>
            <Text style={dc.heroTheme}>{city || 'Your trip'} Adventure</Text>
            <Text style={dc.heroMeta}>{dayLabel || ''}</Text>
            <View style={dc.statsGrid}>
              <View style={dc.statCell}>
                <Text style={dc.statVal}>{completedStops.length}</Text>
                <Text style={dc.statLbl}>STOPS</Text>
              </View>
              <View style={dc.statCell}>
                <Text style={dc.statVal}>{totalStr}</Text>
                <Text style={dc.statLbl}>EXPLORED</Text>
              </View>
              <View style={dc.statCell}>
                <Text style={dc.statVal}>{(trip?.travelers ?? []).length}</Text>
                <Text style={dc.statLbl}>PEOPLE</Text>
              </View>
            </View>
          </LinearGradient>

          {children.length > 0 && (
            <View style={dc.card}>
              <Text style={dc.cardLabel}>KID QUOTES</Text>
              {children.map(kid => {
                const key = `dw-${kid.name}`;
                return (
                  <View key={kid.name} style={dc.quoteBlock}>
                    <Text style={dc.quoteWho}>
                      {kid.name.toUpperCase()}{kid.age ? ` (AGE ${kid.age})` : ''} SAID
                    </Text>
                    <SpeechTextInput
                      style={dc.quoteInput}
                      value={kidQuotes[key] ?? ''}
                      onChangeText={text => setKidQuotes(prev => ({ ...prev, [key]: text }))}
                      placeholder={`"Something memorable…"`}
                      placeholderTextColor={C.muted}
                      multiline numberOfLines={2}
                      returnKeyType="done" blurOnSubmit
                    />
                  </View>
                );
              })}
            </View>
          )}

<View style={dc.card}>
            <Text style={dc.cardLabel}>BEST PHOTOS FROM TODAY</Text>
            <View style={dc.photoGrid}>
              {wrapPhotos.map(uri => (
                <TouchableOpacity
                  key={uri}
                  style={dc.photoSlotFilled}
                  activeOpacity={0.85}
                  onLongPress={() => removePhoto('wrap', uri)}
                >
                  <Image source={{ uri }} style={dc.photoImg} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={dc.photoSlotAdd}
                activeOpacity={0.7}
                onPress={() => handleAddPhotos('wrap')}
              >
                <Text style={dc.photoPlus}>+</Text>
              </TouchableOpacity>
            </View>
            {wrapPhotos.length > 0 ? (
              <Text style={dc.photoCount}>
                {wrapPhotos.length} photo{wrapPhotos.length !== 1 ? 's' : ''}{' \u00b7 '}Long-press to remove
              </Text>
            ) : (
              <Text style={dc.photoCount}>Tap + to add photos from your library</Text>
            )}
          </View>

          <View style={dc.card}>
            <Text style={dc.cardLabel}>HOW WAS TODAY?</Text>
            <View style={dc.ratingRow}>
              {ratingOptions.map(opt => (
                <TouchableOpacity
                  key={opt.key} activeOpacity={0.8}
                  style={[dc.ratingBtn, dayRating === opt.key && dc.ratingBtnSel]}
                  onPress={() => handleRating(opt.key)}
                >
                  <Text style={[dc.ratingBtnText, dayRating === opt.key && dc.ratingBtnTextSel]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Wrap up today — End of Day Reflection (hidden during pilot; flip SHOW_DAY_REFLECTION to restore) */}
          {SHOW_DAY_REFLECTION && (
            <TouchableOpacity
              style={{
                marginHorizontal: 20, marginBottom: 12,
                backgroundColor: reflectionSaved ? '#3DAA6E' : '#E8692A', borderRadius: 16,
                padding: 16, flexDirection: 'row', alignItems: 'center',
                shadowColor: '#E8692A', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
              }}
              activeOpacity={0.85}
              onPress={() => setShowReflectionSheet(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: F.bold, marginBottom: 2 }}>
                  {reflectionSaved ? 'Reflection saved!' : 'Wrap up today'}
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: F.regular }}>
                  {reflectionSaved ? 'Tap to add more or edit your reflection.' : 'Capture what surprised you, what you learned, and a kid quote.'}
                </Text>
              </View>
              <Text style={{ fontSize: 22, color: '#E8692A', marginLeft: 8 }}>{'\u203A'}</Text>
            </TouchableOpacity>
          )}

          {dayWrapped ? (
            <TouchableOpacity
              style={dc.wrapBtn} activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/memories/[tripId]' as never, params: { tripId: trip!.id, dayIndex: String(resolvedDayIndex) } } as never)}
            >
              <Text style={dc.wrapBtnText}>{'✓'} Story saved — view Day {resolvedDayIndex + 1} again</Text>
            </TouchableOpacity>
          ) : (
            <>
          <View style={dc.storyStrip}>
            <Text style={dc.storyTitle}>Your Day {resolvedDayIndex + 1} story is ready</Text>
            <Text style={dc.storySub}>Auto-written from your stops — tap below to see it</Text>
          </View>

          <TouchableOpacity
            style={[dc.wrapBtn, isWrapping && { opacity: 0.75 }]} activeOpacity={0.85}
            disabled={isWrapping}
            onPress={async () => {
              setIsWrapping(true);
              try {
                if (trip?.id) {
                  const filledPhotos = [...wrapPhotos];
                  const filledQuotes = Object.entries(kidQuotes).filter(([, v]) => v.trim().length > 0);

                  // Upload each filled photo; any failure stops the wrap and alerts the user
                  if (filledPhotos.length > 0) {
                    let cloudPhotoUrls: string[];
                    try {
                      const token = await AsyncStorage.getItem('auth_token');
                      cloudPhotoUrls = await Promise.all(
                        filledPhotos.map(async (localUri) => {
                          const uploadRes = await FileSystem.uploadAsync(
                            `${API_BASE}/api/travel/upload-photo`,
                            localUri,
                            {
                              httpMethod: 'POST',
                              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                              fieldName: 'photo',
                              headers: token ? { Authorization: `Bearer ${token}` } : {},
                            },
                          );
                          if (uploadRes.status !== 200 && uploadRes.status !== 201) {
                            throw new Error(`Upload failed: ${uploadRes.status}`);
                          }
                          const body = JSON.parse(uploadRes.body) as { photoUrl?: string };
                          if (!body.photoUrl) throw new Error('No URL in upload response');
                          return body.photoUrl;
                        }),
                      );
                    } catch (uploadErr) {
                      Alert.alert(
                        'Photo upload failed',
                        'One or more photos couldn’t be saved. Please check your connection and try again.',
                        [{ text: 'OK' }],
                      );
                      setIsWrapping(false);
                      return;
                    }
                    await memoriesAPI.createMoment({
                      tripId: trip.id,
                      photoUrls: cloudPhotoUrls,
                    });
                  }

                  for (const [key, quote] of filledQuotes) {
                    try {
                      const childName = key.startsWith('dw-') ? key.slice(3) : null;
                      await memoriesAPI.createMoment({
                        tripId: trip.id,
                        kidPromptResponse: childName
                          ? `${childName}|${quote.trim()}`
                          : quote.trim(),
                      });
                    } catch { /* best-effort */ }
                  }
                }

                // Mark day complete only after all memories are saved successfully
                try {
                  await apiFetch(`/api/travel/trips/${trip?.id}/complete-day`, { method: 'POST' });
                } catch { /* best-effort */ }

                router.push({
                  pathname: '/memories/[tripId]' as never,
                  params: { tripId: trip!.id, dayIndex: String(resolvedDayIndex) },
                } as never);
                setDayWrapped(true);
              } finally {
                setIsWrapping(false);
              }
            }}
          >
            {isWrapping ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={dc.wrapBtnText}>Saving photos…</Text>
              </View>
            ) : (
              <Text style={dc.wrapBtnText}>Wrap Day {resolvedDayIndex + 1} — see your story</Text>
            )}
          </TouchableOpacity>
            </>
          )}

          {/* Tomorrow prep card with stops + ticket alerts */}
          {resolvedDayIndex + 1 < totalDays && (() => {
            const tomorrowStops = (trip?.stops ?? [])
              .filter(s => (s.dayIndex ?? 0) === resolvedDayIndex + 1)
              .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
              .slice(0, 3);
            const ticketCount = tomorrowStops.filter(s => hasTicketSignal(s.metadata)).length;
            return (
              <View style={dc.tomorrowCard}>
                <Text style={dc.tomorrowLabel}>TOMORROW</Text>
                {ticketCount > 0 && (
                  <View style={dc.ticketAlert}>
                    <Text style={dc.ticketAlertText}>{'\uD83C\uDFAB'} {ticketCount} ticket{ticketCount !== 1 ? 's' : ''} needed</Text>
                  </View>
                )}
                {tomorrowStops.map((s, i) => (
                  <View key={s.id} style={dc.tomorrowRow}>
                    <View style={dc.tomorrowNum}><Text style={dc.tomorrowNumText}>{i + 1}</Text></View>
                    <Text style={dc.tomorrowName} numberOfLines={1}>{s.name}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* Kids zone CTA */}
          {kidsXp !== null && (
            <View style={dc.kidsXpRow}>
              <Text style={dc.kidsXpText}>
                {(trip?.travelers ?? []).filter(t => !t.isParent)[0]?.name ?? 'Explorer'} earned{' '}
                <Text style={dc.kidsXpNum}>{kidsXp} XP</Text> today
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={dc.kidsZoneBtn} activeOpacity={0.85}
            onPress={() => {
              const kzStop = dayStops[currentStopIndex];
              Analytics.track('kids_zone_opened', { trip_id: resolvedTripId ?? '', stop_id: kzStop?.id ?? '', stop_type: kzStop?.stopType ?? 'unknown' });
              handleKidsZonePress(kzStop?.id ?? '', kzStop?.name ?? '', resolvedTripId ?? '');
            }}
          >
            <Text style={dc.kidsZoneBtnText}>{'\uD83E\uDDF8'} Kids zone →</Text>
          </TouchableOpacity>

          {/* Complete trip CTA — visible on the last day of the trip */}
          {resolvedDayIndex + 1 >= totalDays && (trip as any)?.status !== 'completed' && (
            <TouchableOpacity
              style={dc.completeBtn} activeOpacity={0.85}
              onPress={() => setTodayState('trip_complete')}
            >
              <Text style={dc.completeBtnTitle}>{'\uD83C\uDFC6'} Your trip is complete!</Text>
              <Text style={dc.completeBtnSub}>Tap to wrap up and view your shareable story</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <KidPickerScreen
          visible={kidPickerVisible}
          kids={kidsForPicker}
          onSelect={handlePickerSelect}
          onClose={() => setKidPickerVisible(false)}
        />
        <EndOfDaySheet
          visible={showReflectionSheet}
          onClose={() => setShowReflectionSheet(false)}
          onSaved={() => setReflectionSaved(true)}
          tripId={resolvedTripId ?? ''}
          dayIndex={resolvedDayIndex}
          kids={(trip?.travelers ?? []).filter((t: any) => !t.isParent).map((t: any) => ({ name: t.name, age: t.age ?? null }))}
        />
        {menuOverlay}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: TRIP_COMPLETE
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'trip_complete') {
    const allStops = trip?.stops ?? [];
    const totalVisited = allStops.filter(s => s.isVisited || s.visited).length;
    const tripDays = totalDays;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
          <LinearGradient
            colors={['#2D1B69', '#1E1145', '#150D33']}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={[tc.hero, { paddingTop: insets.top + 32 }]}
          >
            <Text style={tc.heroEmoji}>{'\uD83C\uDFC6'}</Text>
            <Text style={tc.heroEyebrow}>TRIP COMPLETE!</Text>
            <Text style={tc.heroTitle}>{trip?.name ?? city}</Text>
            <Text style={tc.heroSub}>{tripDays} day{tripDays !== 1 ? 's' : ''} of family memories</Text>
            <View style={tc.statRow}>
              <View style={tc.stat}>
                <Text style={tc.statVal}>{totalVisited}</Text>
                <Text style={tc.statLbl}>stops visited</Text>
              </View>
              <View style={tc.stat}>
                <Text style={tc.statVal}>{tripDays}</Text>
                <Text style={tc.statLbl}>days explored</Text>
              </View>
              <View style={tc.stat}>
                <Text style={tc.statVal}>{(trip?.travelers ?? []).length}</Text>
                <Text style={tc.statLbl}>adventurers</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={tc.storyCard}>
            <Text style={tc.storyTitle}>Your family story is being written</Text>
            <Text style={tc.storySub}>
              We've compiled every stop, photo, and moment into your {city} keepsake.
            </Text>
            <TouchableOpacity
              style={tc.storyBtn} activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/memories/[tripId]/story', params: { tripId: resolvedTripId ?? '', fromComplete: '1' } } as never)}
            >
              <Text style={tc.storyBtnText}>View your trip story →</Text>
            </TouchableOpacity>
          </View>

          {/* WHAT THE KIDS SAID — real quotes from moments, hidden if none */}
          {tcMomentQuotes.length > 0 && (
            <View style={tc.kidSection}>
              <Text style={tc.kidSectionLabel}>WHAT THE KIDS SAID</Text>
              {tcMomentQuotes.map((q, i) => (
                <View key={i} style={tc.kidCard}>
                  <Text style={tc.kidQuote}>"{q.quote}"</Text>
                  <Text style={tc.kidName}>{q.name}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={tc.bottomBtnRow}>
            <TouchableOpacity
              style={[tc.newTripBtn, tc.halfBtn]} activeOpacity={0.85}
              onPress={() => router.push('/onboarding/splash' as never)}
            >
              <Text style={tc.newTripBtnText}>Plan a trip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[tc.gamesBtn, tc.halfBtn]} activeOpacity={0.85}
              onPress={() => router.push('/kids/games' as never)}
            >
              <Text style={tc.gamesBtnText}>Travel games</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        {menuOverlay}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: DAY_HISTORY / DAY_HISTORY_EMPTY
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'day_history' || todayState === 'day_history_empty') {
    const hStops = trip
      ? (trip.stops ?? [])
          .filter(s => (s.dayIndex ?? 0) === historyDayIndex)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      : [];
    const hVisited = hStops.filter(s => s.isVisited || s.visited).length;
    const hMins    = hStops.reduce((sum, s) => sum + getStopDuration(s), 0);
    const hHrs     = Math.floor(hMins / 60);
    const hRem     = hMins % 60;
    const hTime    = hHrs > 0 ? (hRem > 0 ? `${hHrs}h ${hRem}m` : `${hHrs}h`) : `${hMins}m`;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Dark gradient hero with back pill */}
          <LinearGradient
            colors={['#3A3A4A', '#26262E', '#1A1A22']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[dh.hero, { paddingTop: insets.top + 20 }]}
          >
            <TouchableOpacity
              style={dh.backPill}
              activeOpacity={0.75}
              onPress={() => setTodayState(previousState ?? 'morning')}
            >
              <Text style={dh.backPillText}>← Back to today</Text>
            </TouchableOpacity>
            <Text style={dh.heroTitle}>Day history</Text>
            <Text style={dh.heroSub}>{trip?.name ?? 'Your Trip'}</Text>
          </LinearGradient>

          {/* Horizontal day pills strip */}
          <View style={[ds.stripWrap, { backgroundColor: '#fff' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={ds.strip} contentContainerStyle={ds.stripContent}>
              {Array.from({ length: totalDays }, (_, i) => {
                const isPast = i < currentDayIndex;
                return (
                  <Pressable
                    key={i}
                    style={[ds.pill, isPast && ds.pillPast, i === historyDayIndex && ds.pillViewing]}
                    onPress={() => setHistoryDayIndex(i)}
                  >
                    <Text style={[ds.pillText, isPast && ds.pillTextPast]}>
                      {isPast ? '\u2713 ' : ''}Day {i + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {(todayState === 'day_history_empty' || hStops.length === 0) ? (
            <View style={dh.emptyCard}>
              <Text style={dh.emptyEmoji}>{'\uD83D\uDDD3\uFE0F'}</Text>
              <Text style={dh.emptyTitle}>No stops recorded for Day {historyDayIndex + 1}</Text>
              <Text style={dh.emptySub}>This day may not have had any planned stops.</Text>
            </View>
          ) : (
            <View style={dh.card}>
              <View style={dh.summaryRow}>
                <Text style={dh.summaryTitle}>Day {historyDayIndex + 1}</Text>
                <Text style={dh.summarySub}>
                  {city ? `${city} · ` : ''}{formatDayDate(trip?.startDate, historyDayIndex)}
                </Text>
              </View>
              <View style={dh.statRow}>
                <View style={dh.stat}>
                  <Text style={dh.statVal}>{hVisited}</Text>
                  <Text style={dh.statLbl}>visited</Text>
                </View>
                <View style={dh.stat}>
                  <Text style={dh.statVal}>{hStops.length}</Text>
                  <Text style={dh.statLbl}>total stops</Text>
                </View>
                <View style={dh.stat}>
                  <Text style={dh.statVal}>{hTime}</Text>
                  <Text style={dh.statLbl}>planned time</Text>
                </View>
              </View>
              {hStops.map((stop, i) => (
                <View key={stop.id} style={dh.stopCard}>
                  {/* Header row: check + name + duration */}
                  <View style={dh.stopRow}>
                    <View style={[dh.stopCheck, (stop.isVisited || stop.visited) && dh.stopCheckDone]}>
                      <Text style={dh.stopCheckText}>
                        {(stop.isVisited || stop.visited) ? '\u2713' : String(i + 1)}
                      </Text>
                    </View>
                    <Text style={dh.stopName} numberOfLines={1}>{stop.name}</Text>
                    <Text style={dh.stopDur}>{getStopDuration(stop)} min</Text>
                  </View>
                  {/* Photo row — placeholder slots (read-only) */}
                  <View style={dh.photoRow}>
                    {[0, 1, 2].map(slot => (
                      <View key={slot} style={dh.photoSlot}>
                        <Text style={dh.photoSlotIcon}>{'\uD83D\uDCF7'}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Kid quote strip (if available) */}
                  {(stop as { kidQuote?: string }).kidQuote ? (
                    <View style={dh.kidQuoteRow}>
                      <Text style={dh.kidQuoteText}>“{(stop as { kidQuote?: string }).kidQuote}”</Text>
                    </View>
                  ) : null}
                  {/* Story playback button — read-only tap target */}
                  <TouchableOpacity style={dh.playRow} activeOpacity={0.7}
                    onPress={() => trip ? router.push({ pathname: '/memories/[tripId]/recap' as never, params: { tripId: trip.id } } as never) : undefined}>
                    <View style={dh.playBtn}>
                      <Text style={dh.playBtnIcon}>▶{'\uFE0F'}</Text>
                    </View>
                    <Text style={dh.playLabel}>Play story</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <Pressable style={dh.linkBtn} onPress={() => trip && router.push({ pathname: '/trip/[tripId]' as never, params: { tripId: trip.id, } })}>
                <Text style={dh.linkBtnText}>View full recap →</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={dh.backBtn} onPress={() => setTodayState(previousState ?? 'morning')}>
            <Text style={dh.backBtnText}>← Back to Today</Text>
          </Pressable>
        </ScrollView>
        {menuOverlay}
      </View>
    );
  }

  // ─── Default fallback ─────────────────────────────────────────────────────────
  return (
    <View style={[misc.center, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color={C.orange} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ds = StyleSheet.create({
  stripWrap:    { backgroundColor: '#fff', paddingBottom: 4 },
  strip:        { paddingVertical: 10 },
  stripContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(26,31,46,0.15)', backgroundColor: '#F5F2EE',
  },
  pillPast:            { backgroundColor: '#EBEBEB', borderColor: 'rgba(26,31,46,0.10)' },
  pillCurrent:         { backgroundColor: '#FDF0E9', borderColor: C.orange },
  pillViewing:         { borderWidth: 2 },
  pillViewingCurrent:  { borderColor: C.orange },
  pillText:            { fontFamily: F.semibold, fontSize: 13, color: C.muted },
  pillTextPast:        { color: '#9AA0B2' },
  pillTextCurrent:     { color: C.orange },
});

const alt = StyleSheet.create({
  card: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  doneRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  doneIcon: { fontSize: 20, color: C.green },
  doneTitle:{ fontFamily: F.bold, fontSize: 20, color: C.deep },
  doneSub:  { fontFamily: F.medium, fontSize: 13, color: C.muted, marginBottom: 16 },
  statRow:  { flexDirection: 'row', gap: 12, marginBottom: 20 },
  stat:     { flex: 1, backgroundColor: '#F5F2EE', borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal:  { fontFamily: F.bold, fontSize: 15, color: C.deep, marginBottom: 2 },
  statLbl:  { fontFamily: F.medium, fontSize: 11, color: C.muted },
  stopRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.06)' },
  stopNum:      { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5F2EE',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stopNumText:  { fontFamily: F.bold, fontSize: 12, color: C.muted },
  stopCheck:    { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5F2EE',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stopCheckDone:{ backgroundColor: '#DCFCE7' },
  stopCheckText:{ fontFamily: F.bold, fontSize: 12, color: C.muted },
  stopName:    { fontFamily: F.semibold, fontSize: 14, color: C.deep, flex: 1 },
  stopTravel:  { fontFamily: F.medium, fontSize: 11, color: C.muted, marginTop: 1 },
  stopDur:     { fontFamily: F.medium, fontSize: 12, color: C.muted, flexShrink: 0 },
  linkBtn:     { marginTop: 16, alignItems: 'center', paddingVertical: 12, backgroundColor: '#F5F2EE', borderRadius: 12 },
  linkBtnText: { fontFamily: F.semibold, fontSize: 14, color: C.orange },
  emptyText:   { fontFamily: F.medium, fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 16 },
  futureTitle: { fontFamily: F.bold, fontSize: 20, color: C.deep, marginBottom: 4 },
  futureSub:   { fontFamily: F.medium, fontSize: 13, color: C.muted, marginBottom: 16 },
  backBtn:     { alignItems: 'center', paddingVertical: 14 },
  backBtnText: { fontFamily: F.semibold, fontSize: 14, color: C.muted },
});

const misc = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadText:    { fontFamily: F.medium, fontSize: 14, color: C.muted },
  errorText:   { fontFamily: F.semibold, fontSize: 15, color: C.deep, textAlign: 'center' },
  errorBtn:    { backgroundColor: C.orange, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  errorBtnText:{ fontFamily: F.bold, fontSize: 14, color: '#fff' },
  stubBtn:     { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: 1, borderColor: C.border },
  stubBtnText: { fontFamily: F.semibold, fontSize: 14, color: C.deep },
});

// NO_TRIP
const nt = StyleSheet.create({
  iconWrap: {
    width: 100, height: 100, borderRadius: 28, backgroundColor: C.orangeLt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  iconEmoji: { fontSize: 46 },
  heading: { fontFamily: F.serif, fontSize: 24, color: C.deep, textAlign: 'center', marginBottom: 10 },
  sub:     { fontFamily: F.medium, fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 28, paddingHorizontal: 12 },
  cta:     { backgroundColor: C.orange, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32,
    shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  ctaText: { fontFamily: F.bold, fontSize: 16, color: '#fff' },
  link:    { fontFamily: F.semibold, fontSize: 14, color: C.muted },
});

// PRE_TRIP_FAR
const ptf = StyleSheet.create({
  hero:           { paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
  heroName:       { fontFamily: F.serif, fontSize: 32, color: '#fff', lineHeight: 38, marginBottom: 12, textAlign: 'center' },
  badge:          { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 20 },
  badgeText:      { fontFamily: F.bold, fontSize: 11, color: '#fff', letterSpacing: 0.8 },
  countdown:      { fontFamily: F.serif, fontSize: 72, color: '#fff', lineHeight: 76 },
  countdownLabel: { fontFamily: F.semibold, fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  startDate:      { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  card:           { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLabel:      { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 14 },
  emptyText:      { fontFamily: F.medium, fontSize: 13, color: C.muted, paddingVertical: 8 },
  stopRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.06)' },
  stopNum:        { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center' },
  stopNumText:    { fontFamily: F.bold, fontSize: 12, color: C.muted },
  stopName:       { fontFamily: F.semibold, fontSize: 14, color: C.deep, flex: 1 },
  ticketBadge:    { backgroundColor: C.redLt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ticketText:     { fontFamily: F.bold, fontSize: 11, color: C.red },
  viewPlanBtn:    { marginTop: 16, alignItems: 'center', paddingVertical: 12, backgroundColor: C.bg, borderRadius: 12 },
  viewPlanText:   { fontFamily: F.semibold, fontSize: 14, color: C.orange },
  tipCard:        { marginHorizontal: 16, backgroundColor: C.amberLt, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(245,166,35,0.25)' },
  tipLabel:       { fontFamily: F.bold, fontSize: 10, color: C.amberDark, letterSpacing: 1, marginBottom: 10 },
  tipText:        { fontFamily: F.medium, fontSize: 13, color: C.amberDark, lineHeight: 20 },
  ticketStopRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(245,166,35,0.2)' },
  ticketStopIcon: { fontSize: 16 },
  ticketStopName: { fontFamily: F.semibold, fontSize: 13, color: C.amberDark, flex: 1 },
  ticketStopArrow:{ fontFamily: F.bold, fontSize: 13, color: C.amberDark },
  ticketHint:     { fontFamily: F.medium, fontSize: 11, color: 'rgba(180,120,10,0.6)', marginTop: 8 },
  quoteStrip: { marginTop: 16 },
  quoteStripContent: { paddingHorizontal: 20, gap: 8 },
  quoteChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  quoteChipText: {
    fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
  },
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 8 },
  pill: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.90)' },
});

// PRE_TRIP_TOMORROW
const ptt = StyleSheet.create({
  hero:         { paddingHorizontal: 24, paddingBottom: 32 },
  pillWrap:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.22)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 14 },
  pillIcon:     { fontSize: 14 },
  pillText:     { fontFamily: F.bold, fontSize: 11, color: '#FEF3C7', letterSpacing: 0.7, textTransform: 'uppercase' },
  heroEyebrow:  { fontFamily: F.bold, fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: 1, marginBottom: 10 },
  heroTitle:    { fontFamily: F.serif, fontSize: 28, color: '#fff', marginBottom: 6, lineHeight: 34 },
  heroSub:      { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  alertBanner:  { marginHorizontal: 16, marginTop: 14, backgroundColor: C.redLt, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(232,67,58,0.2)' },
  alertIcon:    { fontSize: 18 },
  alertText:    { fontFamily: F.semibold, fontSize: 13, color: C.red, flex: 1 },
  card:         { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLabel:    { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 14 },
  stopRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.06)' },
  stopNum:      { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center' },
  stopNumText:  { fontFamily: F.bold, fontSize: 12, color: C.muted },
  stopName:     { fontFamily: F.semibold, fontSize: 14, color: C.deep, flex: 1, marginBottom: 2 },
  stopMeta:     { fontFamily: F.medium, fontSize: 11, color: C.muted },
  ticketBadge:  { backgroundColor: C.redLt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  ticketText:   { fontFamily: F.bold, fontSize: 11, color: C.red },
  packCard:     { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  packLabel:    { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 12 },
  packRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  packDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: C.orange, flexShrink: 0 },
  packText:     { fontFamily: F.medium, fontSize: 13, color: C.deep, flex: 1 },
  cta:          { marginHorizontal: 16, marginTop: 16, backgroundColor: C.orange, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  ctaText:      { fontFamily: F.bold, fontSize: 16, color: '#fff' },
});

// MORNING (renamed from pd)
const mo = StyleSheet.create({
  hero:           { paddingHorizontal: 24, paddingBottom: 28, height: 240 },
  activePill:     { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.orange,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 16 },
  activeDot:      { width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3 },
  activePillText: { fontFamily: F.bold, fontSize: 11, color: '#fff', letterSpacing: 0.6 },
  tripName:       { fontFamily: F.bold, fontSize: 26, color: '#fff', lineHeight: 30, marginBottom: 4 },
  tripSub:        { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 18 },
  weatherPill:    { position: 'absolute', top: 8, right: 68, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  weatherText:    { fontFamily: F.bold, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  heroBottom:     { position: 'absolute', bottom: 22, left: 22, right: 22 },
  greeting:       { fontFamily: F.semibold, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 5 },
  heroHeadline:   { fontFamily: F.serif, fontSize: 28, color: '#fff', lineHeight: 32, marginBottom: 4 },
  heroMeta:       { fontFamily: F.semibold, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  metaRow:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.card },
  metaPill:       { backgroundColor: C.orangeLt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  metaText:       { fontFamily: F.semibold, fontSize: 12, color: C.orange },
  paceSection:    { backgroundColor: C.card, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  paceLabel:      { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 },
  paceRow:        { flexDirection: 'row', gap: 8 },
  paceChip:       { flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, alignItems: 'center',
    overflow: 'visible' as const },
  paceChipSel:    { borderColor: C.orange, backgroundColor: C.orangeLt },
  paceChipName:   { fontFamily: F.bold, fontSize: 12, color: C.deep },
  paceChipNameSel:{ color: C.orange },
  paceChipSub:    { fontFamily: F.regular, fontSize: 10, color: C.muted, marginTop: 1 },
  kidBadge:       { position: 'absolute', top: -11, alignSelf: 'center',
    backgroundColor: '#3DAA6E', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    zIndex: 10, shadowColor: '#3DAA6E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  kidBadgeText:   { fontSize: 9, fontFamily: F.bold, color: '#fff', letterSpacing: 0.2 },
  stopsSection:   { paddingHorizontal: 20, paddingTop: 14 },
  stopsLabel:     { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 },
  emptyText:      { fontFamily: F.regular, fontSize: 14, color: C.muted, paddingVertical: 16 },
  stopRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card,
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  stopCard:       { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginBottom: 4, overflow: 'hidden', shadowColor: '#1A1F2E', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  stopCardRow:    { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  stopIconBox:    { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stopIconText:   { fontSize: 26 },
  stopInfo:       { flex: 1 },
  stopNumBadgeAlt:     { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(26,31,46,0.07)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stopNumBadgeAltText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#8A8FA8' },
  stopBanner:     { height: 120, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingBottom: 10, gap: 10 },
  stopBannerEmoji:{ fontSize: 24 },
  stopBannerName: { flex: 1, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#fff', letterSpacing: -0.2, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  stopNumBadge:   { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.10)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stopNumBadgeText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: 'rgba(0,0,0,0.50)' },
  stopBody:       { paddingHorizontal: 12, paddingBottom: 10 },
  stopRowRemoved: { opacity: 0.4 },
  stopNum:        { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stopNumText:    { fontFamily: F.bold, fontSize: 12, color: C.muted },
  stopName:       { fontFamily: F.bold, fontSize: 14, color: C.deep, marginBottom: 2 },
  stopNameStruck: { textDecorationLine: 'line-through', color: C.muted },
  stopMeta:       { fontFamily: F.medium, fontSize: 12, color: C.muted },
  stopMetaSaved:  { fontFamily: F.medium, fontSize: 11, color: C.orange },
  tagRow:         { flexDirection: 'row', gap: 5, marginTop: 5, flexWrap: 'wrap' },
  travelConnector:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  travelLine:     { flex: 1, height: 1, backgroundColor: C.border },
  travelLabel:    { fontFamily: F.medium, fontSize: 11, color: C.muted },
  tagTicket:      { backgroundColor: '#FEF2F1', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  tagTicketText:  { fontFamily: F.bold, fontSize: 10, color: C.red },
  tagFree:        { backgroundColor: C.greenLt, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  tagFreeText:    { fontFamily: F.bold, fontSize: 10, color: C.green },
  tagAnchor:      { backgroundColor: '#E8F7EF', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  tagAnchorText:  { fontFamily: F.bold, fontSize: 10, color: '#1A6640' },
  tagRemoved:     { backgroundColor: '#f5f5f5', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  tagRemovedText: { fontFamily: F.medium, fontSize: 10, color: '#bbb' },
  alertStrip:     { marginHorizontal: 20, marginTop: 6, borderRadius: 10,
    backgroundColor: 'rgba(245,166,35,0.12)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.25)',
    paddingHorizontal: 14, paddingVertical: 10 },
  alertText:      { fontFamily: F.semibold, fontSize: 12, color: '#a07010' },
  startBtn:       { marginHorizontal: 20, marginTop: 16, backgroundColor: C.orange, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  startBtnText:   { fontFamily: F.bold, fontSize: 16, color: '#fff' },
});

// EN_ROUTE
const er = StyleSheet.create({
  hero:         { paddingHorizontal: 24, paddingBottom: 28 },
  heroWrap:     { position: 'relative', overflow: 'hidden', justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 16 },
  heroBgEmoji:  { position: 'absolute', fontSize: 110, opacity: 0.18, alignSelf: 'center', top: 60 },
  stopInfoBlock:{ position: 'absolute', bottom: 90, left: 20, right: 70 },
  stopNum:      { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1.0, marginBottom: 3 },
  headingBadge: { position: 'absolute', top: 8, left: 0, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 14 },
  headingDot:  { width: 7, height: 7, backgroundColor: '#60d8a4', borderRadius: 4 },
  headingText: { fontFamily: F.bold, fontSize: 11, color: '#fff', letterSpacing: 0.6 },
  stopName:    { fontFamily: F.serif, fontSize: 28, color: '#fff', lineHeight: 32, marginBottom: 4 },
  stopSub:     { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 20 },
  etaRow:      { flexDirection: 'row', gap: 10 },
  etaPill:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  etaIcon:     { fontSize: 18 },
  etaVal:      { fontFamily: F.bold, fontSize: 16, color: '#fff', lineHeight: 18 },
  etaLbl:      { fontFamily: F.semibold, fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  kidsStrip:   { marginHorizontal: 20, marginTop: 14, backgroundColor: C.purplePrimaryLt, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)', flexDirection: 'row', alignItems: 'center', gap: 12 },
  kidsIcon:    { width: 40, height: 40, borderRadius: 12, backgroundColor: C.purplePrimary,
    alignItems: 'center', justifyContent: 'center' },
  kidsTitle:   { fontFamily: F.bold, fontSize: 14, color: C.purplePrimary, marginBottom: 2 },
  kidsSub:     { fontFamily: F.medium, fontSize: 12, color: 'rgba(124,58,237,0.7)' },
  kidsArrow:   { fontSize: 22, color: C.purplePrimary, opacity: 0.5 },
  infoCard:    { marginHorizontal: 20, marginTop: 12, backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border },
  infoCardLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8 },
  infoCardText:  { fontFamily: F.semibold, fontSize: 14, color: C.deep, lineHeight: 20 },
  twoCol:    { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 10 },
  halfCard:  { flex: 1, backgroundColor: C.card, borderRadius: 13, padding: 13, borderWidth: 1, borderColor: C.border },
  halfLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 0.8, marginBottom: 4 },
  halfVal:   { fontFamily: F.semibold, fontSize: 12, color: C.deep, lineHeight: 16 },
  imHereBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: C.card, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', borderWidth: 2, borderColor: C.blue },
  imHereText: { fontFamily: F.bold, fontSize: 15, color: C.blue },
  afterSection: { paddingHorizontal: 20, paddingTop: 20 },
  afterLabel:   { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 },
  afterAddBtn:  { borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(232,105,42,0.45)', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  afterAddText: { fontFamily: F.semibold, fontSize: 13, color: C.orange },
  afterRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card,
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 6 },
  afterThumb:            { width: 46, height: 46, borderRadius: 8, flexShrink: 0 },
  afterThumbImg:         { width: 46, height: 46, borderRadius: 8 },
  afterThumbPlaceholder: { width: 46, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  afterThumbEmoji:       { fontSize: 22 },
  afterThumbBadge:       { position: 'absolute', bottom: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  afterThumbBadgeText:   { fontFamily: F.bold, fontSize: 9, color: '#fff' },
  afterName:       { fontFamily: F.semibold, fontSize: 13, color: C.deep, flex: 1 },
  afterTicket:     { backgroundColor: C.redLt, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  afterTicketText: { fontSize: 10 },
  afterDur:        { fontFamily: F.medium, fontSize: 12, color: C.muted },
  dualBtnRow: {
    flexDirection: 'row', gap: 10, marginHorizontal: 16,
    marginTop: 10, marginBottom: 8,
  },
  dirBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#1A1F2E',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  dirBtnText: { fontFamily: F.bold, fontSize: 15, color: '#1A1F2E' },
  hereBtn: {
    flex: 1, backgroundColor: '#1A1F2E',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  hereBtnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
});

// AT_STOP_FROZEN
const asf = StyleSheet.create({
  hero:          { paddingHorizontal: 24, paddingBottom: 28 },
  heroBadge:     { flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 14 },
  heroDot:       { width: 7, height: 7, backgroundColor: '#60d8a4', borderRadius: 4 },
  heroBadgeText: { fontFamily: F.bold, fontSize: 11, color: '#fff', letterSpacing: 0.6 },
  stopName:      { fontFamily: F.serif, fontSize: 28, color: '#fff', lineHeight: 32, marginBottom: 4 },
  stopSub:       { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 18 },
  timerPill:     { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  timerText:     { fontFamily: F.semibold, fontSize: 13, color: '#fff' },
  doFirstCard:   { marginHorizontal: 20, marginTop: 14, backgroundColor: C.greenLt, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(61,170,110,0.2)', flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  doFirstIcon:   { width: 36, height: 36, borderRadius: 10, backgroundColor: '#c5edda',
    alignItems: 'center', justifyContent: 'center' },
  doFirstLabel:  { fontFamily: F.bold, fontSize: 10, color: C.green, letterSpacing: 1, marginBottom: 4 },
  doFirstText:   { fontFamily: F.semibold, fontSize: 13, color: C.deep, lineHeight: 18 },
  visitedBtn:    { marginHorizontal: 20, marginTop: 16, backgroundColor: C.green, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: C.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  visitedBtnText:{ fontFamily: F.bold, fontSize: 16, color: '#fff' },
  rescueSection: { paddingHorizontal: 20, paddingTop: 20 },
  rescueLabel:   { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 },
  rescueRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card,
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  rescueIcon:    { fontSize: 20, width: 26, textAlign: 'center' },
  rescueRowText: { fontFamily: F.semibold, fontSize: 14, color: C.deep, flex: 1 },
  rescueChevron: { fontSize: 22, color: C.muted },
  kidsBtn:       { marginHorizontal: 20, marginTop: 8, backgroundColor: C.purplePrimaryLt, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)' },
  kidsBtnText:   { fontFamily: F.bold, fontSize: 15, color: C.purplePrimary },
  sheet:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 20 },
  sheetHandle:   { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:    { fontFamily: F.bold, fontSize: 20, color: C.deep, marginBottom: 4 },
  sheetSub:      { fontFamily: F.medium, fontSize: 13, color: C.muted, marginBottom: 20 },
  sheetRow:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bg,
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  sheetRowIcon:  { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  sheetRowLabel: { fontFamily: F.semibold, fontSize: 14, color: C.deep },
  sheetRowSub:   { fontFamily: F.medium, fontSize: 12, color: C.muted, marginTop: 1 },
  sheetChevron:  { fontSize: 22, color: C.muted },
  sheetDismiss:  { alignItems: 'center', paddingVertical: 14, marginTop: 2 },
  sheetDismissText: { fontFamily: F.semibold, fontSize: 14, color: C.muted },
  greenBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: 'rgba(61,170,110,0.25)',
    borderRadius: 14, padding: 15, marginHorizontal: 14, marginTop: 10,
  },
  greenDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: C.green,
  },
  greenBannerTitle: { fontFamily: F.bold, fontSize: 13, color: C.deep },
  greenBannerSub:   { fontFamily: F.medium, fontSize: 12, color: C.muted, marginTop: 1 },
  greenBannerArrow: { fontFamily: F.bold, fontSize: 18, color: C.green },
});

// STOP_COMPLETE
const sc = StyleSheet.create({
  hero: { backgroundColor: C.orange, paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
  heroEmoji:   { fontSize: 56, marginBottom: 10 },
  heroTitle:   { fontFamily: F.serif, fontSize: 28, color: '#fff', marginBottom: 6 },
  heroSub:     { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 14 },
  elapsedPill: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  elapsedText: { fontFamily: F.semibold, fontSize: 13, color: '#fff' },
  card:        { marginHorizontal: 20, marginTop: 14, backgroundColor: C.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: C.border },
  cardLabel:   { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 12 },
  quoteInput:  { fontFamily: F.regular, fontSize: 14, color: C.deep, backgroundColor: C.bg,
    borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, minHeight: 70, textAlignVertical: 'top' },
  photoScrollContent: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
  photoThumb:  { width: 88, height: 88, borderRadius: 12, overflow: 'hidden' },
  photoThumbImg: { width: '100%', height: '100%' },
  photoAddBtn: { width: 88, height: 88, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, borderStyle: 'dashed', backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', gap: 2 },
  photoAddPlus: { fontSize: 22, color: C.muted, lineHeight: 26 },
  photoAddLabel: { fontFamily: F.medium, fontSize: 11, color: C.muted },
  photoHint:   { fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center' },
  nextStopName:{ fontFamily: F.bold, fontSize: 18, color: C.deep, marginBottom: 4 },
  nextStopMeta:{ fontFamily: F.medium, fontSize: 13, color: C.muted, marginBottom: 16 },
  headThereBtn:{ backgroundColor: C.orange, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  headThereBtnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  celebText:   { fontFamily: F.bold, fontSize: 20, color: C.deep, textAlign: 'center', marginBottom: 16 },
  wrapBtn:     { backgroundColor: C.deep, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  wrapBtnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
});

// DAY_COMPLETE
const dc = StyleSheet.create({
  hero:         { paddingHorizontal: 22, paddingBottom: 22 },
  heroLabel:    { fontFamily: F.bold, fontSize: 11, color: C.orange, letterSpacing: 1.2, marginBottom: 10 },
  heroTheme:    { fontFamily: F.serif, fontSize: 26, color: '#fff', lineHeight: 30, marginBottom: 6 },
  heroMeta:     { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 18 },
  heroChips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroChip:     { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  heroChipText: { fontFamily: F.semibold, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  heroStars:    { fontSize: 22, marginBottom: 8 },
  statsGrid:    { flexDirection: 'row', gap: 8, marginTop: 14 },
  statCell:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12, padding: 11, alignItems: 'center' },
  statVal:      { fontFamily: F.bold, fontSize: 20, color: '#fff' },
  statLbl:      { fontFamily: F.bold, fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  card:         { marginHorizontal: 20, marginTop: 14, backgroundColor: C.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: C.border },
  cardLabel:    { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 12 },
  photoGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlotFilled:  { width: '31%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden' },
  photoSlotAdd:     { width: '31%', aspectRatio: 1, backgroundColor: C.bg, borderRadius: 10, borderWidth: 1.5,
    borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  photoPlus:    { fontSize: 22, color: C.muted },
  photoImg:     { width: '100%', height: '100%', borderRadius: 8 },
  photoCount:   { fontFamily: F.medium, fontSize: 12, color: C.muted, marginTop: 10, textAlign: 'center' },
  quoteBlock:   { marginBottom: 14 },
  quoteWho:     { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 0.8, marginBottom: 6 },
  quoteInput:   { fontFamily: F.regular, fontSize: 14, color: C.deep, backgroundColor: C.bg,
    borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, minHeight: 56, textAlignVertical: 'top' },
  ratingRow:        { flexDirection: 'row', gap: 8 },
  ratingBtn:        { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.bg, alignItems: 'center' },
  ratingBtnSel:     { borderColor: C.orange, backgroundColor: C.orangeLt },
  ratingBtnText:    { fontFamily: F.semibold, fontSize: 13, color: C.deep },
  ratingBtnTextSel: { color: C.orange },
  storyStrip:   { marginHorizontal: 20, marginTop: 14, backgroundColor: C.orangeLt, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(232,105,42,0.2)' },
  storyTitle:   { fontFamily: F.bold, fontSize: 15, color: C.orange, marginBottom: 4 },
  storySub:     { fontFamily: F.medium, fontSize: 13, color: 'rgba(232,105,42,0.75)' },
  wrapBtn:      { marginHorizontal: 20, marginTop: 16, backgroundColor: C.deep, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center' },
  wrapBtnText:  { fontFamily: F.bold, fontSize: 16, color: '#fff' },
  tomorrowCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card,
    borderRadius: 14, padding: 14,
  },
  tomorrowLabel: { fontFamily: F.bold, fontSize: 11, color: C.muted, letterSpacing: 1.1, marginBottom: 8 },
  ticketAlert: {
    backgroundColor: C.amberLt, borderRadius: 8, padding: 8, marginBottom: 8,
  },
  ticketAlertText: { fontFamily: F.bold, fontSize: 12, color: C.amberDark },
  tomorrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  tomorrowNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.orangeLt, alignItems: 'center', justifyContent: 'center',
  },
  tomorrowNumText: { fontFamily: F.bold, fontSize: 11, color: C.orange },
  tomorrowName: { fontFamily: F.medium, fontSize: 14, color: C.deep, flex: 1 },
  kidsXpRow:  { marginHorizontal: 20, marginBottom: 10, alignItems: 'center' },
  kidsXpText: { fontFamily: F.medium, fontSize: 14, color: '#3DAA6E' },
  kidsXpNum:  { fontFamily: F.bold, fontSize: 14, color: '#3DAA6E' },
  completeBtn: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16, paddingVertical: 18,
    paddingHorizontal: 20, backgroundColor: C.orange, alignItems: 'center', gap: 4,
  },
  completeBtnTitle: { fontFamily: F.bold, fontSize: 17, color: '#fff' },
  completeBtnSub:   { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  kidsZoneBtn: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 12, paddingVertical: 14,
    backgroundColor: C.purplePrimary, alignItems: 'center',
  },
  kidsZoneBtnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
});

// TRIP_COMPLETE
const tc = StyleSheet.create({
  hero:       { paddingHorizontal: 24, paddingBottom: 36, alignItems: 'center' },
  heroEmoji:  { fontSize: 64, marginBottom: 12 },
  heroEyebrow:{ fontFamily: F.bold, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.2, marginBottom: 8 },
  heroTitle:  { fontFamily: F.bold, fontSize: 26, color: '#fff', textAlign: 'center', lineHeight: 30, marginBottom: 6 },
  heroSub:    { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 24 },
  statRow:    { flexDirection: 'row', gap: 12, width: '100%' },
  stat:       { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, alignItems: 'center' },
  statVal:    { fontFamily: F.bold, fontSize: 22, color: '#fff', marginBottom: 4 },
  statLbl:    { fontFamily: F.medium, fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  storyCard:  { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  storyTitle: { fontFamily: F.bold, fontSize: 18, color: C.deep, marginBottom: 8 },
  storySub:   { fontFamily: F.medium, fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 20 },
  storyBtn:   { backgroundColor: C.orange, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  storyBtnText:{ fontFamily: F.bold, fontSize: 15, color: '#fff' },
  newTripBtn: { marginHorizontal: 16, backgroundColor: C.bg, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: C.border },
  newTripBtnText: { fontFamily: F.semibold, fontSize: 15, color: C.deep },
  kidSection: { marginHorizontal: 16, marginBottom: 12 },
  kidSectionLabel: { fontFamily: F.bold, fontSize: 11, color: C.muted, letterSpacing: 1.1, marginBottom: 8 },
  kidCard: {
    backgroundColor: C.purplePrimaryLt, borderRadius: 12,
    padding: 14, marginBottom: 8,
  },
  kidQuote: { fontFamily: F.medium, fontSize: 14, color: C.purplePrimary, fontStyle: 'italic', marginBottom: 4 },
  kidName:  { fontFamily: F.medium, fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, textAlign: 'right' },
  kidAttrib: { fontFamily: F.bold, fontSize: 12, color: C.muted },
  gamesBtn: {
    marginHorizontal: 0, marginBottom: 0, borderRadius: 12, paddingVertical: 14,
    backgroundColor: C.purplePrimaryLt, alignItems: 'center',
  },
  gamesBtnText: { fontFamily: F.bold, fontSize: 15, color: C.purplePrimary },
  bottomBtnRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 20, gap: 10 },
  halfBtn: { flex: 1, marginHorizontal: 0 },
});

// DAY_HISTORY
const dh = StyleSheet.create({
  hero: {
    paddingHorizontal: 20, paddingBottom: 20,
  },
  backPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14,
  },
  backPillText: { fontFamily: F.bold, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  heroTitle: { fontFamily: F.bold, fontSize: 24, color: '#fff', marginBottom: 4 },
  heroSub: { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  card:         { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryRow:   { marginBottom: 16 },
  summaryTitle: { fontFamily: F.bold, fontSize: 20, color: C.deep, marginBottom: 4 },
  summarySub:   { fontFamily: F.medium, fontSize: 13, color: C.muted },
  statRow:      { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat:         { flex: 1, backgroundColor: C.bg, borderRadius: 10, padding: 12, alignItems: 'center' },
  statVal:      { fontFamily: F.bold, fontSize: 16, color: C.deep, marginBottom: 2 },
  statLbl:      { fontFamily: F.medium, fontSize: 11, color: C.muted },
  stopRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.06)' },
  stopCheck:    { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stopCheckDone:{ backgroundColor: '#DCFCE7' },
  stopCheckText:{ fontFamily: F.bold, fontSize: 12, color: C.muted },
  stopName:     { fontFamily: F.semibold, fontSize: 14, color: C.deep, flex: 1 },
  stopDur:      { fontFamily: F.medium, fontSize: 12, color: C.muted },
  linkBtn:      { marginTop: 16, alignItems: 'center', paddingVertical: 12, backgroundColor: C.bg, borderRadius: 12 },
  linkBtnText:  { fontFamily: F.semibold, fontSize: 14, color: C.orange },
  emptyCard:    { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 32,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  emptyEmoji:   { fontSize: 40, marginBottom: 14 },
  emptyTitle:   { fontFamily: F.bold, fontSize: 17, color: C.deep, textAlign: 'center', marginBottom: 8 },
  emptySub:     { fontFamily: F.medium, fontSize: 14, color: C.muted, textAlign: 'center' },
  backBtn:      { alignItems: 'center', paddingVertical: 14 },
  backBtnText:  { fontFamily: F.semibold, fontSize: 14, color: C.muted },
  stopCard: {
    marginBottom: 12, backgroundColor: '#fff',
    borderRadius: 14, padding: 14,
  },
  photoRow: {
    flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 10,
  },
  photoSlot: {
    flex: 1, aspectRatio: 1, borderRadius: 10,
    backgroundColor: '#F0F0F5', alignItems: 'center', justifyContent: 'center',
  },
  photoSlotIcon: { fontSize: 22, opacity: 0.4 },
  playRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4,
  },
  playBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
  },
  playBtnIcon: { fontSize: 12 },
  playLabel: { fontFamily: F.medium, fontSize: 13, color: '#6B4FA8' },
  kidQuoteRow: {
    backgroundColor: C.purplePrimaryLt, borderRadius: 8,
    padding: 8, marginTop: 4, marginBottom: 4,
  },
  kidQuoteText: { fontFamily: F.medium, fontSize: 12, color: C.purplePrimary, fontStyle: 'italic' },
});

// ⋯ Menu styles
const mx = StyleSheet.create({
  btn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontSize: 16, color: '#fff', letterSpacing: 2, lineHeight: 20 },
  drop: {
    width: 200, backgroundColor: '#fff',
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, elevation: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  dropRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14,
  },
  dropIcon: { fontSize: 18, lineHeight: 22 },
  dropTitle: { fontFamily: F.bold, fontSize: 13, color: '#1A1F2E' },
  dropSub:   { fontFamily: F.medium, fontSize: 11, color: '#8A8FA8', marginTop: 1 },
});

const sotw = StyleSheet.create({
  breakCard:    { backgroundColor: '#EEF4F1', borderWidth: 1.5, borderColor: '#7A9E8E', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  breakIcon:    { width: 50, height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#E8692A', shadowOpacity: 0.18, shadowRadius: 8, elevation: 2 },
  breakTitle:   { fontSize: 16, fontFamily: F.bold, color: C.deep },
  breakSub:     { fontSize: 13, color: '#b87a4e', fontFamily: F.semibold, marginTop: 2 },
  breakArrow:   { fontSize: 22, color: C.orange },
  topBar:       { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, zIndex: 5 },
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  etaPill:      { backgroundColor: 'rgba(26,31,46,0.88)', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20 },
  etaDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E8692A' },
  etaPillText:  { color: '#fff', fontSize: 13, fontFamily: F.bold },
  routeBar:     { position: 'absolute', bottom: 12, left: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 },
  routeFrom:    { fontSize: 13, fontFamily: F.bold, color: '#E8692A', flexShrink: 1 },
  routeArr:     { color: C.muted, fontSize: 13, marginHorizontal: 4 },
  routeTo:      { fontSize: 13, fontFamily: F.bold, color: C.deep, flex: 1 },
  resultsTitle: { fontSize: 22, fontFamily: F.bold, color: C.deep },
  resultsSub:   { fontSize: 13, color: C.muted, fontFamily: F.medium, marginTop: 2 },
  pillsRow:     { marginVertical: 12 },
  pill:         { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ECE8E2', marginRight: 8 },
  pillOn:       { backgroundColor: '#FDF0E9', borderColor: '#E8692A' },
  pillText:     { fontSize: 14, fontFamily: F.bold, color: C.muted },
  pillTextOn:   { color: '#E8692A' },
  placeCount:   { fontSize: 13, fontFamily: F.bold, color: C.muted, marginBottom: 8 },
  simpleCard:   { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ECE8E2', borderRadius: 16, padding: 14, marginBottom: 10 },
  simpleCardTop:{ borderColor: '#F6D3B6', backgroundColor: '#FFFAF5' },
  topBadge:     { marginBottom: 8 },
  topBadgeText: { fontSize: 11, fontFamily: F.bold, color: '#E8692A' },
  pcRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pcEmoji:      { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pcEmojiGreen: { backgroundColor: '#E8F7EF' },
  pcEmojiAmber: { backgroundColor: '#FFF3E0' },
  pcName:       { fontSize: 16, fontFamily: F.bold, color: C.deep },
  pcMeta:       { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 3 },
  tagRoute:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7, backgroundColor: '#E8F7EF' },
  tagRouteText: { fontSize: 11, fontFamily: F.bold, color: '#3DAA6E' },
  tagDetour:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7, backgroundColor: '#F5F2EE' },
  tagDetourText:{ fontSize: 11, fontFamily: F.bold, color: C.muted },
  pcAmen:       { fontSize: 12, color: C.muted, fontFamily: F.medium, flex: 1 },
  goBtn:        { backgroundColor: C.deep, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, flexShrink: 0 },
  goBtnText:    { color: '#fff', fontSize: 14, fontFamily: F.bold },
  richCard:     { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ECE8E2', borderRadius: 18, overflow: 'hidden', marginBottom: 10 },
  richCardTop:  { borderColor: '#F6D3B6' },
  richImg:      { height: 130, position: 'relative' },
  richBadge:    { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(232,105,42,0.92)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, zIndex: 3 },
  richBadgeText:{ color: '#fff', fontSize: 11, fontFamily: F.bold },
  richName:     { position: 'absolute', bottom: 10, left: 12, right: 12, color: '#fff', fontSize: 18, fontFamily: F.bold, zIndex: 2 },
  richBody:     { padding: 13 },
  bcHero:       { paddingBottom: 26, paddingHorizontal: 22 },
  bcTopRow:     { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 },
  bcClose:      { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  bcBadge:      { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, marginBottom: 10 },
  bcBadgeText:  { color: '#fff', fontSize: 12, fontFamily: F.bold, letterSpacing: 0.8 },
  bcTitle:      { fontSize: 30, fontFamily: F.bold, color: '#fff', lineHeight: 34, marginBottom: 4 },
  bcSub:        { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontFamily: F.medium },
  dirCard:      { backgroundColor: '#E8692A', borderRadius: 16, padding: 18, alignItems: 'center' },
  dirCardText:  { color: '#fff', fontSize: 17, fontFamily: F.bold },
  quoteCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  quoteLabel:   { fontSize: 11, fontFamily: F.bold, color: C.muted, letterSpacing: 0.6, marginBottom: 10 },
  quoteInput:   { fontSize: 15, color: C.deep, fontFamily: F.medium, minHeight: 64, paddingRight: 44, backgroundColor: '#F5F2EE', borderRadius: 12, padding: 12 },
  snapCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  snapBtn:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F5F2EE', borderRadius: 12, padding: 14 },
  snapBtnText:  { fontSize: 15, fontFamily: F.semibold, color: C.deep },
  doneBtn:      { backgroundColor: 'transparent', borderRadius: 13, borderWidth: 1.5, borderColor: '#E8692A', padding: 18, alignItems: 'center', marginBottom: 16 },
  doneBtnText:  { color: '#E8692A', fontSize: 18, fontFamily: F.bold },
});