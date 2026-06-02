/**
 * RoamUs — Today Tab v5
 * 11 TodayState values: no_trip · pre_trip_far · pre_trip_tomorrow · morning
 *   en_route · at_stop_frozen · stop_complete · day_complete · trip_complete
 *   day_history · day_history_empty
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { API_BASE } from "@/lib/apiClient";
import { F } from "@/lib/tokens";

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  orange:       '#E8692A',
  orangeLt:     '#FDF0E9',
  bg:           '#F5F2EE',
  card:         '#FFFFFF',
  deep:         '#1A1F2E',
  muted:        '#8A8FA8',
  mutedLt:      '#D1D5E0',
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
  amberLt:      '#FEF3DC',
  amberDark:    '#92400E',
  red:          '#E8433A',
  redLt:        '#FEF2F1',
  border:       'rgba(26,31,46,0.09)',
} as const;

// ─── Stop-type thumbnail helpers ──────────────────────────────────────────────
const STOP_TYPE_EMOJI: Record<string, string> = {
  museum: '🏛️', nature: '🌿', park: '🌳',
  garden: '🌸', beach: '🏖️', restaurant: '🍽️',
  food: '🍜', street_food: '🥢', viewpoint: '🔭',
  landmark: '📍', temple: '⛩️', market: '🛍️',
  zoo: '🦁', aquarium: '🐠', palace: '🏰',
  plaza: '🏛️', bridge: '🌉', waterfall: '💧',
  volcano: '🌋', mountain: '🏔️', adventure: '⚡',
  neighborhood: '🏘️', street: '🛤️', city: '🏙️',
  culture: '🎭', other: '📍',
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
  let gap = 50;
  if (childrenAges.some(a => a < 5)) gap += 15;
  if (childrenAges.length >= 3) gap += 10;
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
  if (fromMeta != null) return Math.max(25, fromMeta + 15);
  if (fromAPI != null) return Math.max(25, fromAPI + 15);
  return 30;
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
    const interGap = nextIsMeal ? Math.max(travel, 15) : Math.max(travel, gap);
    cursor += effectiveDuration(s, pace) + interGap;
    return label;
  });
}

function estimateTotalTime(stops: Stop[], pace: Pace = 'balanced', childrenAges: number[] = []): string {
  const gap = familyInterStopGap(childrenAges);
  const content = stops.filter(s => !isMealStop(s.stopType));
  const total = content.reduce((sum, s, i) => {
    const travel = getTravelToNext(content, i);
    return sum + effectiveDuration(s, pace) + Math.max(travel, i < content.length - 1 ? gap : 0);
  }, 0);
  if (total < 60) return `~${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

function formatDayDate(startDate?: string | null, dayIndex?: number): string {
  if (!startDate) return '';
  try {
    const d = new Date(startDate);
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

function daysUntilDate(dateStr?: string | null): number {
  if (!dateStr) return 0;
  try {
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
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
      <Animated.View style={[sm.sheet, { transform: [{ translateY }] }]}>
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; dayIndex?: string }>();

  const rawDevState = __DEV__
    ? (params as Record<string, string>).state
    : undefined;
  const devState: TodayState | undefined =
    rawDevState && (ALL_STATES as string[]).includes(rawDevState)
      ? (rawDevState as TodayState)
      : undefined;

  const [todayState, setTodayState]             = useState<TodayState>(devState ?? 'morning');
  const [trip, setTrip]                         = useState<TripData | null>(null);
  const [dayStops, setDayStops]                 = useState<Stop[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [selectedPace, setSelectedPace]         = useState<Pace>('balanced');
  const [loading, setLoading]                   = useState(true);
  const [starting, setStarting]                 = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [resolvedTripId, setResolvedTripId]     = useState<string | null>(params.tripId ?? null);
  const [resolvedDayIndex, setResolvedDayIndex] = useState<number>(
    params.dayIndex != null ? parseInt(params.dayIndex, 10) : 0
  );
  const [viewingDay, setViewingDay]             = useState<number>(
    params.dayIndex != null ? parseInt(params.dayIndex, 10) : 0
  );
  const [activeSheet, setActiveSheet]           = useState<'none' | 'rescue'>('none');
  const [rescueType, setRescueType]             = useState<'behind' | 'tired' | 'skip' | 'fun'>('behind');
  const [atStopStartTime, setAtStopStartTime]   = useState<number | null>(null);
  const [markingVisited, setMarkingVisited]     = useState(false);
  const [visitedElapsed, setVisitedElapsed]     = useState<number | null>(null);
  const [kidQuotes, setKidQuotes]               = useState<Record<string, string>>({});
  const [dayRating, setDayRating]               = useState<'okay' | 'good' | 'amazing' | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [visitedPhotos, setVisitedPhotos]       = useState<(string | null)[]>([null, null, null]);
  const [wrapPhotos, setWrapPhotos]             = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [historyDayIndex, setHistoryDayIndex]   = useState<number>(0);

  // Track visited stop name for stop_complete display
  const visitedStopNameRef = useRef<string>('');

  // ── Pulse animation for En Route dot ──
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (todayState !== 'en_route') { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [todayState]);

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
    if (todayState === 'at_stop_frozen') setAtStopStartTime(prev => prev ?? Date.now());
    else if (todayState === 'en_route' || todayState === 'morning') setAtStopStartTime(null);
  }, [todayState]);

  // ── Load trip ──
  const loadTrip = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check for state override from atstop.tsx feedback
      const override = await AsyncStorage.getItem('today_state_override');
      if (override) {
        await AsyncStorage.removeItem('today_state_override');
        if (override === 'stop_complete') {
          setCurrentStopIndex(i => i + 1);
          if (!devState) setTodayState('stop_complete');
        }
      }

      let tid = resolvedTripId;
      if (!tid) {
        let data: { trips: TripData[] };
        try {
          data = await apiFetch<{ trips: TripData[] }>('/api/travel/trips');
        } catch {
          if (__DEV__) {
            data = { trips: [MOCK_TRIP] };
          } else {
            setError('Could not connect to server.');
            return;
          }
        }
        const active = data.trips?.find(t => t.status === 'active') ?? data.trips?.[0];
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
        if (__DEV__) {
          t = MOCK_TRIP;
        } else {
          setError('Failed to load trip details.');
          return;
        }
      }
      setTrip(t);

      const stops = (t.stops ?? [])
        .filter(s => (s.dayIndex ?? 0) === resolvedDayIndex)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setDayStops(stops);

      if (!devState && override !== 'stop_complete') {
        const days = daysUntilDate(t.startDate);
        if (days > 1) {
          setTodayState('pre_trip_far');
        } else if (days === 1) {
          setTodayState('pre_trip_tomorrow');
        } else {
          const allVisited = stops.length > 0 && stops.every(s => s.isVisited || s.visited);
          const lastVisited = stops.reduce(
            (best, s, i) => (s.isVisited || s.visited) ? i : best, -1
          );
          if (allVisited) {
            const tripDays = t.plannerTripDays ?? t.tripDays ?? 1;
            if (resolvedDayIndex >= tripDays - 1) {
              setTodayState('trip_complete');
            } else {
              setTodayState('day_complete');
            }
          } else if (lastVisited >= 0 && lastVisited < stops.length - 1) {
            setCurrentStopIndex(lastVisited + 1);
            setTodayState('en_route');
          } else {
            setTodayState('morning');
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [resolvedTripId, resolvedDayIndex, devState]);

  useFocusEffect(useCallback(() => { loadTrip(); }, [loadTrip]));

  // ── Start Day handler ──
  async function handleStartDay() {
    if (!trip) return;
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
    setTodayState('en_route');
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
    setMarkingVisited(false);
    setVisitedElapsed(elapsed);
    bounceAnim.setValue(0);
    setCurrentStopIndex(i => i + 1);
    setTodayState('stop_complete');
  }

  // ── Skip / delete stop ──
  async function handleSkipStop() {
    const stop = dayStops[currentStopIndex] ?? null;
    if (!stop) return;
    try {
      await apiFetch(`/api/travel/stops/${stop.id}`, { method: 'DELETE' });
    } catch { /* best-effort */ }
    setDayStops(prev => prev.filter(s => s.id !== stop.id));
    setActiveSheet('none');
    setTodayState('en_route');
  }

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
          body: JSON.stringify({ signal: rating }),
        })
      ));
    } catch { /* best-effort */ }
    setSubmittingRating(false);
  }

  async function handlePhotoSlot(source: 'visited' | 'wrap', idx: number) {
    Alert.alert(
      'Add photo',
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
              mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;
              if (source === 'visited') {
                setVisitedPhotos(prev => { const n = [...prev]; n[idx] = uri; return n; });
              } else {
                setWrapPhotos(prev => { const n = [...prev]; n[idx] = uri; return n; });
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
              mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;
              if (source === 'visited') {
                setVisitedPhotos(prev => { const n = [...prev]; n[idx] = uri; return n; });
              } else {
                setWrapPhotos(prev => { const n = [...prev]; n[idx] = uri; return n; });
              }
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  // ── Derived ──
  const totalDays = (() => {
    if (!trip) return 1;
    if (trip.plannerTripDays) return trip.plannerTripDays;
    if (trip.tripDays) return trip.tripDays;
    if (trip.startDate && trip.endDate) {
      return Math.round(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000
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
  const stopTimes = buildStopTimes(dayStops, selectedPace, childrenAges);
  const currentStop = dayStops[currentStopIndex] ?? null;

  // ── Day strip pill shared component ──
  const currentDayIndex = resolvedDayIndex;
  const dayStripEl = totalDays > 1 ? (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      style={ds.strip} contentContainerStyle={ds.stripContent}
    >
      {Array.from({ length: totalDays }, (_, i) => {
        const isPast    = i < currentDayIndex;
        const isCurrent = i === currentDayIndex;
        const isViewing = i === viewingDay;
        return (
          <Pressable
            key={i}
            style={[
              ds.pill,
              isCurrent && ds.pillCurrent,
              isPast    && ds.pillPast,
              isViewing && ds.pillViewing,
              isViewing && isCurrent && ds.pillViewingCurrent,
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewingDay(i);
            }}
          >
            <Text style={[
              ds.pillText,
              isCurrent && ds.pillTextCurrent,
              isPast    && ds.pillTextPast,
            ]}>
              {isPast ? '✓ ' : ''}Day {i + 1}{isCurrent ? ' · Today' : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  ) : null;

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
        <View style={nt.compassWrap}>
          <Text style={nt.compassEmoji}>{'🧭'}</Text>
        </View>
        <Text style={nt.heading}>Where will you roam?</Text>
        <Text style={nt.sub}>
          Add your first trip and RoamUs builds your perfect family day — stops, timing, and all.
        </Text>
        <TouchableOpacity
          style={nt.cta}
          activeOpacity={0.85}
          onPress={() => router.push('/onboarding/splash' as never)}
        >
          <Text style={nt.ctaText}>Plan a trip →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(tabs)' as never)} style={{ marginTop: 16 }}>
          <Text style={nt.link}>Browse my trips</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: PRE_TRIP_FAR  (trip starts >1 day from now)
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'pre_trip_far') {
    const daysLeft = daysUntilDate(trip?.startDate);
    const startLabel = formatDayDate(trip?.startDate, 0);
    const previewStops = (trip?.stops ?? [])
      .filter(s => (s.dayIndex ?? 0) === 0)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .slice(0, 4);
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          <LinearGradient
            colors={[C.teal, C.tealMid, '#3a7a6e']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[ptf.hero, { paddingTop: insets.top + 24 }]}
          >
            <View style={ptf.badge}>
              <Text style={ptf.badgeText}>UPCOMING TRIP</Text>
            </View>
            <Text style={ptf.countdown}>{daysLeft}</Text>
            <Text style={ptf.countdownLabel}>days until {city || 'your trip'}</Text>
            <Text style={ptf.startDate}>{startLabel}</Text>
          </LinearGradient>

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
                  <View style={ptf.ticketBadge}><Text style={ptf.ticketText}>{'🎫'}</Text></View>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={ptf.viewPlanBtn}
              activeOpacity={0.8}
              onPress={() => trip && router.push(`/trip/${trip.id}` as never)}
            >
              <Text style={ptf.viewPlanText}>View full plan →</Text>
            </TouchableOpacity>
          </View>

          <View style={ptf.tipCard}>
            <Text style={ptf.tipLabel}>PRO TIP</Text>
            <Text style={ptf.tipText}>
              Book tickets for {city ? `${city} ` : ''}attractions early — popular family stops sell out fast.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: PRE_TRIP_TOMORROW
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'pre_trip_tomorrow') {
    const tomorrowStops = (trip?.stops ?? [])
      .filter(s => (s.dayIndex ?? 0) === 0)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const ticketCount = tomorrowStops.filter(s => hasTicketSignal(s.metadata)).length;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          <LinearGradient
            colors={['#7c3aed', '#9d5bf5', '#b47dff']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[ptt.hero, { paddingTop: insets.top + 28 }]}
          >
            <Text style={ptt.heroEyebrow}>TOMORROW'S THE DAY</Text>
            <Text style={ptt.heroTitle}>{trip?.name ?? city}</Text>
            <Text style={ptt.heroSub}>
              {tomorrowStops.length} stop{tomorrowStops.length !== 1 ? 's' : ''} planned{city ? ` in ${city}` : ''}
            </Text>
          </LinearGradient>

          {ticketCount > 0 && (
            <View style={ptt.alertBanner}>
              <Text style={ptt.alertIcon}>{'🎫'}</Text>
              <Text style={ptt.alertText}>
                {ticketCount} stop{ticketCount !== 1 ? 's' : ''} need{ticketCount === 1 ? 's' : ''} tickets — book tonight
              </Text>
            </View>
          )}

          <View style={ptt.card}>
            <Text style={ptt.cardLabel}>TOMORROW'S STOPS</Text>
            {tomorrowStops.map((s, i) => (
              <View key={s.id} style={ptt.stopRow}>
                <View style={ptt.stopNum}><Text style={ptt.stopNumText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={ptt.stopName} numberOfLines={1}>{s.name}</Text>
                  <Text style={ptt.stopMeta}>~{getStopDuration(s)} min</Text>
                </View>
                {hasTicketSignal(s.metadata) && (
                  <TouchableOpacity onPress={() => openTicketSearch(s.name)} hitSlop={8}>
                    <View style={ptt.ticketBadge}><Text style={ptt.ticketText}>{'🎫'} Book</Text></View>
                  </TouchableOpacity>
                )}
              </View>
            ))}
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
            onPress={() => trip && router.push(`/trip/${trip.id}` as never)}
          >
            <Text style={ptt.ctaText}>Review tomorrow's plan →</Text>
          </TouchableOpacity>
        </ScrollView>
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
      return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            <View style={[ds.stripWrap, { paddingTop: insets.top + 8, backgroundColor: '#fff' }]}>
              {dayStripEl}
            </View>
            {isPast ? (
              <View style={alt.card}>
                <View style={alt.doneRow}>
                  <Text style={alt.doneIcon}>{'✓'}</Text>
                  <Text style={alt.doneTitle}>Day {viewingDay + 1} Complete</Text>
                </View>
                <Text style={alt.doneSub}>{city ? `${city} · ` : ''}{formatDayDate(trip.startDate, viewingDay)}</Text>
                <View style={alt.statRow}>
                  <View style={alt.stat}>
                    <Text style={alt.statVal}>{visitedCount}</Text>
                    <Text style={alt.statLbl}>stops visited</Text>
                  </View>
                  <View style={alt.stat}>
                    <Text style={alt.statVal}>{timeStr}</Text>
                    <Text style={alt.statLbl}>time planned</Text>
                  </View>
                  <View style={alt.stat}>
                    <Text style={alt.statVal}>{viewingDayStops.length}</Text>
                    <Text style={alt.statLbl}>total stops</Text>
                  </View>
                </View>
                {viewingDayStops.map((stop, i) => (
                  <View key={stop.id} style={alt.stopRow}>
                    <View style={[alt.stopCheck, (stop.isVisited || stop.visited) && alt.stopCheckDone]}>
                      <Text style={alt.stopCheckText}>{(stop.isVisited || stop.visited) ? '✓' : String(i + 1)}</Text>
                    </View>
                    <Text style={alt.stopName} numberOfLines={1}>{stop.name}</Text>
                  </View>
                ))}
                <Pressable style={alt.linkBtn} onPress={() => router.push(`/trip/${trip.id}` as never)}>
                  <Text style={alt.linkBtnText}>View full day recap →</Text>
                </Pressable>
              </View>
            ) : (
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
                        <Text style={alt.stopTravel}>{'🚗'} {stop.travelMinsFromPrevious} min from prev</Text>
                      ) : null}
                    </View>
                    <Text style={alt.stopDur}>{stop.durationMinutes ?? 60}m</Text>
                  </View>
                ))}
                {viewingDayStops.length === 0 && (
                  <Text style={alt.emptyText}>No stops planned for this day yet.</Text>
                )}
                <Pressable style={alt.linkBtn} onPress={() => router.push(`/trip/${trip.id}` as never)}>
                  <Text style={alt.linkBtnText}>See full plan →</Text>
                </Pressable>
              </View>
            )}
            <Pressable style={alt.backBtn} onPress={() => setViewingDay(currentDayIndex)}>
              <Text style={alt.backBtnText}>{'←'} Back to Day {currentDayIndex + 1} (Today)</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          <LinearGradient
            colors={['#1a3a2a', '#2d6648', '#3a8a60']}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={[mo.hero, { paddingTop: insets.top + 20 }]}
          >
            <View style={mo.activePill}>
              <View style={mo.activeDot} />
              <Text style={mo.activePillText}>ACTIVE TRIP</Text>
            </View>
            <Text style={mo.tripName} numberOfLines={2}>{trip?.name ?? 'Your Trip'}</Text>
            <Text style={mo.tripSub}>
              Day {resolvedDayIndex + 1} of {totalDays}
              {city ? ` · ${city}` : ''}
              {dayLabel ? ` · ${dayLabel}` : ''}
            </Text>
            <View style={mo.metaRow}>
              <View style={mo.metaPill}><Text style={mo.metaText}>{'📍'} {dayStops.length} stop{dayStops.length !== 1 ? 's' : ''}</Text></View>
              <View style={mo.metaPill}><Text style={mo.metaText}>{'⏱'} {estimateTotalTime(dayStops, selectedPace, childrenAges)}</Text></View>
            </View>
          </LinearGradient>

          {totalDays > 1 && <View style={ds.stripWrap}>{dayStripEl}</View>}

          <View style={mo.paceSection}>
            <Text style={mo.paceLabel}>TODAY'S PACE</Text>
            <View style={mo.paceRow}>
              {(['balanced', 'easier', 'faster'] as Pace[]).map(p => (
                <Pressable
                  key={p}
                  style={[mo.paceChip, selectedPace === p && mo.paceChipSel]}
                  onPress={() => setSelectedPace(p)}
                >
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
              <Text style={mo.emptyText}>No stops planned for this day yet.</Text>
            )}
            {dayStops.map((stop, i) => {
              const meta = parseMetadata(stop.metadata);
              const isRemoved = selectedPace === 'easier' && (
                (isFinite(maxDropPriority) && (meta.dropPriority ?? -Infinity) === maxDropPriority) ||
                easierFallbackIdx === i
              );
              const hasTicket = hasTicketSignal(stop.metadata);
              const isFreeStop = !hasTicket && ['park', 'nature', 'landmark'].includes(stop.stopType ?? '');
              const isAnchor  = (meta.anchorScore ?? 0) >= 8;
              const dispDur   = effectiveDuration(stop, selectedPace);
              const travelNext = getTravelToNext(dayStops, i);
              const isLast    = i === dayStops.length - 1;
              return (
                <React.Fragment key={stop.id}>
                  <View style={[mo.stopRow, isRemoved && mo.stopRowRemoved]}>
                    <View style={mo.stopNum}><Text style={mo.stopNumText}>{i + 1}</Text></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[mo.stopName, isRemoved && mo.stopNameStruck]} numberOfLines={1}>
                        {stop.name}
                      </Text>
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
                            <Text style={mo.tagTicketText}>{'🎫'} Ticket needed</Text>
                          </TouchableOpacity>
                        )}
                        {isFreeStop && !isRemoved && (
                          <View style={mo.tagFree}><Text style={mo.tagFreeText}>Free entry</Text></View>
                        )}
                        {isAnchor && !isRemoved && (
                          <View style={mo.tagAnchor}><Text style={mo.tagAnchorText}>{'⭐'} Anchor</Text></View>
                        )}
                      </View>
                    </View>
                  </View>
                  {!isLast && (
                    <View style={mo.travelConnector}>
                      <View style={mo.travelLine} />
                      <Text style={mo.travelLabel}>{'🚗'} {travelNext} min</Text>
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
                {'🎫'} {ticketStops.length} ticket{ticketStops.length !== 1 ? 's' : ''} needed — book before you go
              </Text>
            </View>
          )}

          <Pressable style={[mo.startBtn, starting && { opacity: 0.7 }]} onPress={handleStartDay} disabled={starting}>
            {starting
              ? <ActivityIndicator color="#fff" />
              : <Text style={mo.startBtnText}>{'▶'}  Start Day {resolvedDayIndex + 1}</Text>}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: EN_ROUTE
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'en_route') {
    const stop = currentStop;
    if (!stop) {
      const allDone = dayStops.length > 0 && dayStops.every(s => s.isVisited || s.visited);
      if (allDone || dayStops.length === 0) {
        setTodayState('day_complete');
        return null;
      }
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

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <LinearGradient
            colors={['#0f2a4a', '#1a4a7a', '#2563a8']}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={[er.hero, { paddingTop: insets.top + 20 }]}
          >
            <View style={er.headingBadge}>
              <Animated.View style={[er.headingDot, { opacity: pulseAnim }]} />
              <Text style={er.headingText}>HEADING THERE</Text>
            </View>
            <Text style={er.stopName} numberOfLines={2}>{stop.name}</Text>
            <Text style={er.stopSub}>
              Stop {currentStopIndex + 1} of {dayStops.length} · {stopLabel}
            </Text>
            <View style={er.etaRow}>
              <View style={er.etaPill}>
                <Text style={er.etaIcon}>{'🚗'}</Text>
                <View>
                  <Text style={er.etaVal}>{travelMins ? `~${travelMins} min` : '~12 min'}</Text>
                  <Text style={er.etaLbl}>ETA</Text>
                </View>
              </View>
              <View style={er.etaPill}>
                <Text style={er.etaIcon}>{'📍'}</Text>
                <View>
                  <Text style={er.etaVal}>~3 mi</Text>
                  <Text style={er.etaLbl}>Away</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <TouchableOpacity
            style={er.kidsStrip} activeOpacity={0.85}
            onPress={() => router.push({
              pathname: '/kids' as never,
              params: { stopId: stop.id, stopName: encodeURIComponent(stop.name ?? ''), tripId: trip?.id ?? '' },
            })}
          >
            <View style={er.kidsIcon}><Text style={{ fontSize: 20 }}>{'🧭'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={er.kidsTitle}>Let kids explore</Text>
              <Text style={er.kidsSub}>Missions for the ride over</Text>
            </View>
            <Text style={er.kidsArrow}>{'›'}</Text>
          </TouchableOpacity>

          {!!doFirst && (
            <View style={er.infoCard}>
              <Text style={er.infoCardLabel}>DO THIS FIRST</Text>
              <Text style={er.infoCardText}>{doFirst}</Text>
            </View>
          )}

          {(parking || restrooms) && (
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

          <TouchableOpacity
            style={er.imHereBtn} activeOpacity={0.85}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setTodayState('at_stop_frozen');
              router.push('/(tabs)/atstop' as never);
            }}
          >
            <Text style={er.imHereText}>{'📍'}  I'm here — we arrived</Text>
          </TouchableOpacity>

          {afterStops.length > 0 && (
            <View style={er.afterSection}>
              <Text style={er.afterLabel}>AFTER THIS</Text>
              {afterStops.map((s, idx) => {
                const imgUrl = (s.metadata as Record<string, unknown> | null)?.imageUrl as string | undefined;
                const stopNum = currentStopIndex + 2 + idx;
                const typeKey = s.stopType ?? 'other';
                const typeEmoji = STOP_TYPE_EMOJI[typeKey] ?? '📍';
                const typeBg   = STOP_TYPE_COLOR[typeKey] ?? C.orange;
                return (
                  <View key={s.id} style={er.afterRow}>
                    <View style={er.afterThumb}>
                      {imgUrl ? (
                        <Image source={{ uri: imgUrl }} style={er.afterThumbImg} />
                      ) : (
                        <View style={[er.afterThumbPlaceholder, { backgroundColor: typeBg }]}>
                          <Text style={er.afterThumbEmoji}>{typeEmoji}</Text>
                        </View>
                      )}
                      <View style={er.afterThumbBadge}>
                        <Text style={er.afterThumbBadgeText}>{stopNum}</Text>
                      </View>
                    </View>
                    <Text style={er.afterName} numberOfLines={1}>{s.name}</Text>
                    {hasTicketSignal(s.metadata) && (
                      <View style={er.afterTicket}><Text style={er.afterTicketText}>{'🎫'}</Text></View>
                    )}
                    <Text style={er.afterDur}>{getStopDuration(s)} min</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: AT_STOP_FROZEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (todayState === 'at_stop_frozen') {
    const stop = currentStop;
    if (!stop) {
      return (
        <View style={[misc.center, { paddingTop: insets.top }]}>
          <Text style={misc.errorText}>No current stop.</Text>
          <Pressable style={misc.stubBtn} onPress={() => setTodayState('morning')}>
            <Text style={misc.stubBtnText}>{'←'} Back</Text>
          </Pressable>
        </View>
      );
    }
    const meta    = parseMetadata(stop.metadata);
    const doFirst = stop.enrichment?.whyNow ?? meta.doThisFirst;
    const address = stop.address ?? '';
    const planned = getStopDuration(stop);

    const rescueContent: Record<'behind' | 'tired' | 'skip' | 'fun', {
      title: string; sub: string;
      options: { icon: string; label: string; sub?: string; onPress: () => void }[];
    }> = {
      behind: {
        title: 'Running behind?',
        sub: "Here's how we can catch up",
        options: [
          { icon: '⚡', label: 'Tighten travel gaps', sub: 'Cut buffer between stops', onPress: () => setActiveSheet('none') },
          { icon: '✂️', label: 'Shorten this stop', sub: 'Do the highlights in 45 min', onPress: () => setActiveSheet('none') },
          { icon: '⏭', label: 'Skip this stop', sub: 'Move to the next one', onPress: handleSkipStop },
        ],
      },
      tired: {
        title: 'Kids running low?',
        sub: "Let's give everyone a break",
        options: [
          { icon: '☕', label: 'Find a nearby cafe', onPress: () => {
            Linking.openURL('https://www.google.com/maps/search/' + encodeURIComponent('cafe near ' + address));
            setActiveSheet('none');
          }},
          { icon: '🌳', label: 'Quick outdoor break', onPress: () => {
            Linking.openURL('https://www.google.com/maps/search/' + encodeURIComponent('park near ' + address));
            setActiveSheet('none');
          }},
          { icon: '🏠', label: 'Head back early', onPress: () => { setActiveSheet('none'); setTodayState('day_complete'); } },
        ],
      },
      skip: {
        title: 'Skip this stop?',
        sub: "We'll keep the rest of your day",
        options: [
          { icon: '⏭', label: 'Skip, go to next', onPress: handleSkipStop },
          { icon: '🔄', label: 'Replace with something', sub: 'Coming soon', onPress: () => {
            Alert.alert('Coming soon', 'Replace stop is coming in the next update.');
          }},
          { icon: '🏠', label: 'Wrap up for the day', onPress: () => { setActiveSheet('none'); setTodayState('day_complete'); } },
        ],
      },
      fun: {
        title: 'Need more excitement?',
        sub: "Let's turn it up",
        options: [
          { icon: '🎡', label: 'Add a bonus stop', sub: 'Coming soon', onPress: () => {
            Alert.alert('Coming soon', 'Adding stops is coming in the next update.');
          }},
          { icon: '🍕', label: 'Upgrade lunch', onPress: () => {
            Linking.openURL('https://www.google.com/maps/search/' + encodeURIComponent('restaurant near ' + address));
            setActiveSheet('none');
          }},
          { icon: '🎭', label: 'Find something active', onPress: () => {
            Linking.openURL('https://www.google.com/maps/search/' + encodeURIComponent('activities near ' + address));
            setActiveSheet('none');
          }},
        ],
      },
    };
    const sheet = rescueContent[rescueType];
    const sheetTranslate = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [560, 0] });
    const backdropOpacity = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <LinearGradient
            colors={[C.teal, C.tealMid, '#3a7a6e']}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={[asf.hero, { paddingTop: insets.top + 20 }]}
          >
            <View style={asf.heroBadge}>
              <View style={asf.heroDot} />
              <Text style={asf.heroBadgeText}>YOU'RE HERE</Text>
            </View>
            <Text style={asf.stopName} numberOfLines={2}>{stop.name}</Text>
            <Text style={asf.stopSub}>
              Stop {currentStopIndex + 1} of {dayStops.length} · {planned} min planned
            </Text>
            <View style={asf.timerPill}>
              <Text style={asf.timerText}>{'⏱'}  {planned} min</Text>
            </View>
          </LinearGradient>

          {doFirst && (
            <View style={asf.doFirstCard}>
              <View style={asf.doFirstIcon}><Text style={{ fontSize: 18 }}>{'⭐'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={asf.doFirstLabel}>DO THIS FIRST</Text>
                <Text style={asf.doFirstText}>{doFirst}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[asf.visitedBtn, markingVisited && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleMarkVisited}
            disabled={markingVisited}
          >
            {markingVisited
              ? <ActivityIndicator color="#fff" />
              : <Text style={asf.visitedBtnText}>{'✓'}  We visited — mark complete</Text>}
          </TouchableOpacity>

          <View style={asf.rescueSection}>
            <Text style={asf.rescueLabel}>NEED HELP?</Text>
            {([
              { type: 'behind' as const, icon: '⏩', label: 'Running behind' },
              { type: 'tired'  as const, icon: '😴', label: 'Kids are tired' },
              { type: 'skip'   as const, icon: '⏭', label: 'Skip this stop' },
              { type: 'fun'    as const, icon: '🎉', label: 'Need more fun' },
            ]).map(item => (
              <TouchableOpacity
                key={item.type} style={asf.rescueRow} activeOpacity={0.75}
                onPress={() => { setRescueType(item.type); setActiveSheet('rescue'); }}
              >
                <Text style={asf.rescueIcon}>{item.icon}</Text>
                <Text style={asf.rescueRowText}>{item.label}</Text>
                <Text style={asf.rescueChevron}>{'›'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={asf.kidsBtn} activeOpacity={0.85}
            onPress={() => {
              const travelers = trip?.travelers ?? [];
              const kidExplorer = travelers.find(t => t.name && t.name !== 'You') ?? travelers[0];
              const explorerName = kidExplorer?.name && kidExplorer.name !== 'You'
                ? kidExplorer.name : travelers[0]?.name ?? 'Explorer';
              router.push({ pathname: '/kids' as never, params: {
                stopId: stop.id, stopName: encodeURIComponent(stop.name ?? ''),
                tripId: trip?.id ?? '', explorerId: explorerName,
                explorerName: encodeURIComponent(explorerName),
              }});
            }}
          >
            <Text style={asf.kidsBtnText}>{'🧭'}  Let kids explore</Text>
          </TouchableOpacity>
        </ScrollView>

        <Animated.View
          pointerEvents={activeSheet !== 'none' ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.46)', opacity: backdropOpacity }]}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setActiveSheet('none')} />
        </Animated.View>

        <Animated.View style={[asf.sheet, { transform: [{ translateY: sheetTranslate }] }]}>
          <View style={asf.sheetHandle} />
          <Text style={asf.sheetTitle}>{sheet.title}</Text>
          <Text style={asf.sheetSub}>{sheet.sub}</Text>
          {sheet.options.map((opt, i) => (
            <TouchableOpacity key={i} style={asf.sheetRow} activeOpacity={0.75} onPress={opt.onPress}>
              <View style={asf.sheetRowIcon}><Text style={{ fontSize: 18 }}>{opt.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={asf.sheetRowLabel}>{opt.label}</Text>
                {opt.sub && <Text style={asf.sheetRowSub}>{opt.sub}</Text>}
              </View>
              <Text style={asf.sheetChevron}>{'›'}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={asf.sheetDismiss} onPress={() => setActiveSheet('none')}>
            <Text style={asf.sheetDismissText}>Never mind</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
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
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={[sc.hero, { paddingTop: insets.top + 24 }]}>
            <Animated.Text style={[sc.heroEmoji, { transform: [{ scale: bounceScale }] }]}>
              {'🎉'}
            </Animated.Text>
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
            <TextInput
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
            <View style={sc.photoRow}>
              {[0, 1, 2].map(idx => (
                <TouchableOpacity key={idx} style={sc.photoSlot} activeOpacity={0.7}
                  onPress={() => handlePhotoSlot('visited', idx)}>
                  {visitedPhotos[idx] ? (
                    <Image source={{ uri: visitedPhotos[idx]! }} style={sc.photoImg} />
                  ) : (
                    <Text style={sc.photoPlus}>+</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {isLastStop ? (
            <View style={sc.card}>
              <Text style={sc.celebText}>That's all for today!</Text>
              <TouchableOpacity style={sc.wrapBtn} activeOpacity={0.85} onPress={() => setTodayState('day_complete')}>
                <Text style={sc.wrapBtnText}>Wrap up Day {resolvedDayIndex + 1} →</Text>
              </TouchableOpacity>
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
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTodayState('en_route');
                }}
              >
                <Text style={sc.headThereBtnText}>Head there →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={[dc.hero, { paddingTop: insets.top + 28 }]}>
            <Text style={dc.heroLabel}>DAY {resolvedDayIndex + 1} COMPLETE</Text>
            <Text style={dc.heroTheme}>{city} Adventure</Text>
            <Text style={dc.heroMeta}>
              {dayLabel}  ·  {completedStops.length} stops  ·  {totalStr}
            </Text>
            <View style={dc.heroChips}>
              {completedStops.map(s => (
                <View key={s.id} style={dc.heroChip}>
                  <Text style={dc.heroChipText}>{'✓'}  {s.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={dc.card}>
            <Text style={dc.cardLabel}>BEST PHOTOS FROM TODAY</Text>
            <View style={dc.photoGrid}>
              {[0, 1, 2, 3, 4, 5].map(idx => (
                <TouchableOpacity key={idx} style={dc.photoSlot} activeOpacity={0.7}
                  onPress={() => handlePhotoSlot('wrap', idx)}>
                  {wrapPhotos[idx] ? (
                    <Image source={{ uri: wrapPhotos[idx]! }} style={dc.photoImg} />
                  ) : (
                    <Text style={dc.photoPlus}>+</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={dc.photoCount}>
              {wrapPhotos.filter(Boolean).length} of 6 added · Tap to add more
            </Text>
          </View>

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
                    <TextInput
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

          <View style={dc.storyStrip}>
            <Text style={dc.storyTitle}>Your Day {resolvedDayIndex + 1} story is ready</Text>
            <Text style={dc.storySub}>Auto-written from your stops — tap below to see it</Text>
          </View>

          <TouchableOpacity
            style={dc.wrapBtn} activeOpacity={0.85}
            onPress={async () => {
              try {
                await apiFetch(`/api/travel/trips/${trip?.id}/complete-day`, { method: 'POST' });
              } catch { /* best-effort */ }
              router.push('/(tabs)/memories' as never);
            }}
          >
            <Text style={dc.wrapBtnText}>Wrap Day {resolvedDayIndex + 1} — see your story</Text>
          </TouchableOpacity>
        </ScrollView>
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          <LinearGradient
            colors={[C.teal, C.tealMid, '#4a9e8e']}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={[tc.hero, { paddingTop: insets.top + 32 }]}
          >
            <Text style={tc.heroEmoji}>{'🏕️'}</Text>
            <Text style={tc.heroEyebrow}>ADVENTURE COMPLETE</Text>
            <Text style={tc.heroTitle}>{trip?.name ?? city}</Text>
            <Text style={tc.heroSub}>{tripDays} day{tripDays !== 1 ? 's' : ''} of family memories</Text>
            <View style={tc.statRow}>
              <View style={tc.stat}>
                <Text style={tc.statVal}>{totalVisited}</Text>
                <Text style={tc.statLbl}>places visited</Text>
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
              onPress={() => router.push('/(tabs)/memories' as never)}
            >
              <Text style={tc.storyBtnText}>View your trip story →</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={tc.newTripBtn} activeOpacity={0.85}
            onPress={() => router.push('/onboarding/splash' as never)}
          >
            <Text style={tc.newTripBtnText}>Plan your next adventure →</Text>
          </TouchableOpacity>
        </ScrollView>
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
          <View style={[ds.stripWrap, { paddingTop: insets.top + 8, backgroundColor: '#fff' }]}>
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
                      {isPast ? '✓ ' : ''}Day {i + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {hStops.length === 0 ? (
            <View style={dh.emptyCard}>
              <Text style={dh.emptyEmoji}>{'🗓️'}</Text>
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
                <View key={stop.id} style={dh.stopRow}>
                  <View style={[dh.stopCheck, (stop.isVisited || stop.visited) && dh.stopCheckDone]}>
                    <Text style={dh.stopCheckText}>
                      {(stop.isVisited || stop.visited) ? '✓' : String(i + 1)}
                    </Text>
                  </View>
                  <Text style={dh.stopName} numberOfLines={1}>{stop.name}</Text>
                  <Text style={dh.stopDur}>{getStopDuration(stop)} min</Text>
                </View>
              ))}
              <Pressable style={dh.linkBtn} onPress={() => trip && router.push(`/trip/${trip.id}` as never)}>
                <Text style={dh.linkBtnText}>View full recap →</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={dh.backBtn} onPress={() => setTodayState('morning')}>
            <Text style={dh.backBtnText}>{'←'} Back to Today</Text>
          </Pressable>
        </ScrollView>
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
  compassWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.teal,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  compassEmoji: { fontSize: 44 },
  heading: { fontFamily: F.bold, fontSize: 24, color: C.deep, textAlign: 'center', marginBottom: 10 },
  sub:     { fontFamily: F.medium, fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 28, paddingHorizontal: 12 },
  cta:     { backgroundColor: C.orange, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32,
    shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  ctaText: { fontFamily: F.bold, fontSize: 16, color: '#fff' },
  link:    { fontFamily: F.semibold, fontSize: 14, color: C.muted },
});

// PRE_TRIP_FAR
const ptf = StyleSheet.create({
  hero:           { paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
  badge:          { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 20 },
  badgeText:      { fontFamily: F.bold, fontSize: 11, color: '#fff', letterSpacing: 0.8 },
  countdown:      { fontFamily: F.bold, fontSize: 72, color: '#fff', lineHeight: 76 },
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
  tipLabel:       { fontFamily: F.bold, fontSize: 10, color: C.amberDark, letterSpacing: 1, marginBottom: 6 },
  tipText:        { fontFamily: F.medium, fontSize: 13, color: C.amberDark, lineHeight: 20 },
});

// PRE_TRIP_TOMORROW
const ptt = StyleSheet.create({
  hero:         { paddingHorizontal: 24, paddingBottom: 32 },
  heroEyebrow:  { fontFamily: F.bold, fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: 1, marginBottom: 10 },
  heroTitle:    { fontFamily: F.bold, fontSize: 26, color: '#fff', marginBottom: 6, lineHeight: 30 },
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
  hero:           { paddingHorizontal: 24, paddingBottom: 28 },
  activePill:     { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.orange,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 16 },
  activeDot:      { width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3 },
  activePillText: { fontFamily: F.bold, fontSize: 11, color: '#fff', letterSpacing: 0.6 },
  tripName:       { fontFamily: F.bold, fontSize: 26, color: '#fff', lineHeight: 30, marginBottom: 4 },
  tripSub:        { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 18 },
  metaRow:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaPill:       { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  metaText:       { fontFamily: F.semibold, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  paceSection:    { backgroundColor: C.card, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  paceLabel:      { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 },
  paceRow:        { flexDirection: 'row', gap: 8 },
  paceChip:       { flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, alignItems: 'center' },
  paceChipSel:    { borderColor: C.orange, backgroundColor: C.orangeLt },
  paceChipName:   { fontFamily: F.bold, fontSize: 12, color: C.deep },
  paceChipNameSel:{ color: C.orange },
  paceChipSub:    { fontFamily: F.regular, fontSize: 10, color: C.muted, marginTop: 1 },
  stopsSection:   { paddingHorizontal: 20, paddingTop: 14 },
  stopsLabel:     { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 },
  emptyText:      { fontFamily: F.regular, fontSize: 14, color: C.muted, paddingVertical: 16 },
  stopRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card,
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
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
  tagAnchor:      { backgroundColor: '#F0EBFF', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  tagAnchorText:  { fontFamily: F.bold, fontSize: 10, color: C.purple },
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
  headingBadge: { flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 14 },
  headingDot:  { width: 7, height: 7, backgroundColor: '#60d8a4', borderRadius: 4 },
  headingText: { fontFamily: F.bold, fontSize: 11, color: '#fff', letterSpacing: 0.6 },
  stopName:    { fontFamily: F.bold, fontSize: 28, color: '#fff', lineHeight: 32, marginBottom: 4 },
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
});

// AT_STOP_FROZEN
const asf = StyleSheet.create({
  hero:          { paddingHorizontal: 24, paddingBottom: 28 },
  heroBadge:     { flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 14 },
  heroDot:       { width: 7, height: 7, backgroundColor: '#60d8a4', borderRadius: 4 },
  heroBadgeText: { fontFamily: F.bold, fontSize: 11, color: '#fff', letterSpacing: 0.6 },
  stopName:      { fontFamily: F.bold, fontSize: 28, color: '#fff', lineHeight: 32, marginBottom: 4 },
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
});

// STOP_COMPLETE
const sc = StyleSheet.create({
  hero: { backgroundColor: C.orange, paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
  heroEmoji:   { fontSize: 56, marginBottom: 10 },
  heroTitle:   { fontFamily: F.bold, fontSize: 28, color: '#fff', marginBottom: 6 },
  heroSub:     { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 14 },
  elapsedPill: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  elapsedText: { fontFamily: F.semibold, fontSize: 13, color: '#fff' },
  card:        { marginHorizontal: 20, marginTop: 14, backgroundColor: C.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: C.border },
  cardLabel:   { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 12 },
  quoteInput:  { fontFamily: F.regular, fontSize: 14, color: C.deep, backgroundColor: C.bg,
    borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, minHeight: 70, textAlignVertical: 'top' },
  photoRow:    { flexDirection: 'row', gap: 10 },
  photoSlot:   { flex: 1, aspectRatio: 1, backgroundColor: C.bg, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  photoPlus:   { fontSize: 24, color: C.muted },
  photoImg:    { width: '100%', height: '100%', borderRadius: 10 },
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
  hero:         { backgroundColor: C.deep, paddingHorizontal: 24, paddingBottom: 28 },
  heroLabel:    { fontFamily: F.bold, fontSize: 11, color: C.orange, letterSpacing: 1.2, marginBottom: 10 },
  heroTheme:    { fontFamily: F.bold, fontSize: 26, color: '#fff', lineHeight: 30, marginBottom: 6 },
  heroMeta:     { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 18 },
  heroChips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroChip:     { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  heroChipText: { fontFamily: F.semibold, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  card:         { marginHorizontal: 20, marginTop: 14, backgroundColor: C.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: C.border },
  cardLabel:    { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 12 },
  photoGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlot:    { width: '31%', aspectRatio: 1, backgroundColor: C.bg, borderRadius: 10, borderWidth: 1.5,
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
});

// DAY_HISTORY
const dh = StyleSheet.create({
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
});
