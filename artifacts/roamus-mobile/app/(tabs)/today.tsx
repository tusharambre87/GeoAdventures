/**
 * RoamUs — Today Tab
 * Brief: roamus-today-tab-brief.md · Visual ref: roamus-today-tab-v3.html
 * Step 1: Scaffold + Pre-Day state
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { API_BASE } from "@/lib/apiClient";
import { F } from "@/lib/tokens";

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  orange:   '#E8692A',
  orangeLt: '#FDF0E9',
  bg:       '#F5F2EE',
  card:     '#FFFFFF',
  deep:     '#1A1F2E',
  muted:    '#8A8FA8',
  sage:     '#7A9E8E',
  sageLt:   '#EEF5F2',
  green:    '#3DAA6E',
  greenLt:  '#E8F7EF',
  blue:     '#3B82F6',
  blueLt:   '#EFF6FF',
  purple:   '#6B4FA8',
  purpleLt: '#F0EBFF',
  amber:    '#F5A623',
  red:      '#E8433A',
  redLt:    '#FEF2F1',
  border:   'rgba(26,31,46,0.09)',
} as const;

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
  enrichment?: StopEnrichment | null;
  metadata?: StopMetadata | null;
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

type TodayState = 'preday' | 'enroute' | 'atstop' | 'visited' | 'daywrap';
type Pace = 'balanced' | 'easier' | 'faster';

// ─── Dev mock data (browser preview only) ────────────────────────────────────

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
      dayIndex: 0, displayOrder: 1, durationMinutes: 90,
      metadata: { ticketSignal: true, anchorScore: 9, dropPriority: 1, travelMinutes: 12 },
    },
    {
      id: 's2', name: 'Millennium Park & Cloud Gate', stopType: 'landmark',
      dayIndex: 0, displayOrder: 2, durationMinutes: 60,
      metadata: { ticketSignal: false, anchorScore: 8, dropPriority: 3, travelMinutes: 8 },
    },
    {
      id: 's3', name: "Giordano's Deep Dish Lunch", stopType: 'meal',
      dayIndex: 0, displayOrder: 3, durationMinutes: 75,
      metadata: { ticketSignal: false },
    },
    {
      id: 's4', name: 'Shedd Aquarium', stopType: 'zoo',
      dayIndex: 0, displayOrder: 4, durationMinutes: 120,
      metadata: { ticketSignal: true, anchorScore: 9, dropPriority: 2, travelMinutes: 15 },
    },
    {
      id: 's5', name: 'Navy Pier', stopType: 'park',
      dayIndex: 0, displayOrder: 5, durationMinutes: 60,
      metadata: { ticketSignal: false, dropPriority: 4, travelMinutes: 10 },
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

function getStopDuration(stop: Stop): number {
  return stop.durationMinutes ?? 60;
}

function isMealStop(type?: string | null): boolean {
  return ['meal', 'restaurant', 'lunch', 'dinner', 'breakfast', 'cafe'].includes(type ?? '');
}

function buildStopTimes(stops: Stop[]): string[] {
  let cursor = 9 * 60; // 9:00 AM
  return stops.map((s, i) => {
    const h = Math.floor(cursor / 60);
    const m = cursor % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const label = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    cursor += getStopDuration(s) + (i < stops.length - 1 ? 15 : 0);
    return label;
  });
}

function estimateTotalTime(stops: Stop[]): string {
  const content = stops.filter(s => !isMealStop(s.stopType));
  const total = content.reduce((sum, s) => sum + getStopDuration(s), 0) +
    Math.max(0, (content.length - 1) * 15);
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

/** Safely parse metadata — API may return JSONB as a raw string */
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

// ─── SheetModal ───────────────────────────────────────────────────────────────

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

  const [todayState, setTodayState]         = useState<TodayState>('preday');
  const [trip, setTrip]                     = useState<TripData | null>(null);
  const [dayStops, setDayStops]             = useState<Stop[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [selectedPace, setSelectedPace]     = useState<Pace>('balanced');
  const [loading, setLoading]               = useState(true);
  const [starting, setStarting]             = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [resolvedTripId, setResolvedTripId] = useState<string | null>(params.tripId ?? null);
  const [resolvedDayIndex, setResolvedDayIndex] = useState<number>(
    params.dayIndex != null ? parseInt(params.dayIndex, 10) : 0
  );

  // ── Load trip on mount ──
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let tid = resolvedTripId;
        if (!tid) {
          const data = await apiFetch<{ trips: TripData[] }>('/api/travel/trips');
          const active = data.trips?.find(t => t.status === 'active') ?? data.trips?.[0];
          if (!active) { setError('No trips found — plan a trip first.'); return; }
          tid = active.id;
          setResolvedTripId(tid);
        }
        const t = await apiFetch<TripData>(`/api/travel/trips/${tid}`);
        setTrip(t);

        const stops = (t.stops ?? [])
          .filter(s => (s.dayIndex ?? 0) === resolvedDayIndex)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        setDayStops(stops);

        // Resume from last visited
        const lastVisited = stops.reduce(
          (best, s, i) => (s.isVisited || s.visited) ? i : best, -1
        );
        if (lastVisited >= 0 && lastVisited < stops.length - 1) {
          setCurrentStopIndex(lastVisited + 1);
          setTodayState('enroute');
        }
      } catch (e: unknown) {
        // In dev, fall back to mock data so the screen is previewable without auth
        if (__DEV__) {
          const mockStops = MOCK_TRIP.stops
            .filter(s => (s.dayIndex ?? 0) === resolvedDayIndex)
            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
          setTrip(MOCK_TRIP);
          setDayStops(mockStops);
        } else {
          setError(e instanceof Error ? e.message : 'Failed to load trip');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [resolvedTripId, resolvedDayIndex]);

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
    setTodayState('enroute');
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
  const stopTimes = buildStopTimes(dayStops);

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
        <Pressable style={misc.errorBtn} onPress={() => router.replace('/(tabs)/' as never)}>
          <Text style={misc.errorBtnText}>Go to Trips</Text>
        </Pressable>
      </View>
    );
  }

  // ── State stubs (Steps 2-5 built in future steps) ──
  if (todayState !== 'preday') {
    return (
      <View style={[misc.center, { paddingTop: insets.top }]}>
        <Text style={misc.stubTitle}>
          {todayState === 'enroute'  ? 'En Route'  :
           todayState === 'atstop'   ? 'At Stop'   :
           todayState === 'visited'  ? 'Visited'   : 'Day Wrap'}
          {' '}— coming in next step
        </Text>
        <Pressable style={misc.stubBtn} onPress={() => setTodayState('preday')}>
          <Text style={misc.stubBtnText}>← Back to Pre-Day</Text>
        </Pressable>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRE-DAY
  // ────────────────────────────────────────────────────────────────────────────

  // Determine which stop (if any) gets "Removed · Easier mode" treatment
  const maxDropPriority = selectedPace === 'easier'
    ? Math.max(...dayStops.map(s => s.metadata?.dropPriority ?? -Infinity))
    : -Infinity;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#1a3a2a', '#2d6648', '#3a8a60']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[pd.hero, { paddingTop: insets.top + 20 }]}
        >
          <View style={pd.activePill}>
            <View style={pd.activeDot} />
            <Text style={pd.activePillText}>ACTIVE TRIP</Text>
          </View>

          <Text style={pd.tripName} numberOfLines={2}>
            {trip?.name ?? 'Your Trip'}
          </Text>

          <Text style={pd.tripSub}>
            Day {resolvedDayIndex + 1} of {totalDays}
            {city ? ` · ${city}` : ''}
            {dayLabel ? ` · ${dayLabel}` : ''}
          </Text>

          <View style={pd.metaRow}>
            <View style={pd.metaPill}>
              <Text style={pd.metaText}>🌤 72°F</Text>
            </View>
            <View style={pd.metaPill}>
              <Text style={pd.metaText}>
                📍 {dayStops.length} stop{dayStops.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={pd.metaPill}>
              <Text style={pd.metaText}>⏱ {estimateTotalTime(dayStops)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Pace selector ────────────────────────────────────────────────── */}
        <View style={pd.paceSection}>
          <Text style={pd.paceLabel}>TODAY'S PACE</Text>
          <View style={pd.paceRow}>
            {(['balanced', 'easier', 'faster'] as Pace[]).map(p => (
              <Pressable
                key={p}
                style={[pd.paceChip, selectedPace === p && pd.paceChipSel]}
                onPress={() => setSelectedPace(p)}
              >
                <Text style={[pd.paceChipName, selectedPace === p && pd.paceChipNameSel]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
                <Text style={pd.paceChipSub}>
                  {p === 'balanced' ? 'As planned' : p === 'easier' ? 'Drop 1 stop' : 'Less buffer'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Stop list ────────────────────────────────────────────────────── */}
        <View style={pd.stopsSection}>
          <Text style={pd.stopsLabel}>TODAY'S STOPS</Text>

          {dayStops.length === 0 && (
            <Text style={pd.emptyText}>No stops planned for this day yet.</Text>
          )}

          {dayStops.map((stop, i) => {
            const meta = parseMetadata(stop.metadata);
            const isRemoved = selectedPace === 'easier' &&
              isFinite(maxDropPriority) &&
              (meta.dropPriority ?? -Infinity) === maxDropPriority;
            const hasTicket  = hasTicketSignal(stop.metadata);
            const isFreeStop = !hasTicket &&
              ['park', 'nature', 'landmark'].includes(stop.stopType ?? '');
            const isAnchor   = (meta.anchorScore ?? 0) >= 8;

            return (
              <View
                key={stop.id}
                style={[pd.stopRow, isRemoved && pd.stopRowRemoved]}
              >
                <View style={pd.stopNum}>
                  <Text style={pd.stopNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[pd.stopName, isRemoved && pd.stopNameStruck]}
                    numberOfLines={1}
                  >
                    {stop.name}
                  </Text>
                  <Text style={pd.stopMeta}>
                    {stopTimes[i]} · {getStopDuration(stop)} min
                  </Text>
                  <View style={pd.tagRow}>
                    {isRemoved && (
                      <View style={pd.tagRemoved}>
                        <Text style={pd.tagRemovedText}>Removed · Easier mode</Text>
                      </View>
                    )}
                    {hasTicket && !isRemoved && (
                      <TouchableOpacity
                        style={pd.tagTicket}
                        onPress={() => openTicketSearch(stop.name)}
                        hitSlop={6}
                        activeOpacity={0.7}
                      >
                        <Text style={pd.tagTicketText}>🎫 Ticket needed</Text>
                      </TouchableOpacity>
                    )}
                    {isFreeStop && !isRemoved && (
                      <TouchableOpacity style={pd.tagFree} activeOpacity={0.8}>
                        <Text style={pd.tagFreeText}>Free entry</Text>
                      </TouchableOpacity>
                    )}
                    {isAnchor && !isRemoved && (
                      <View style={pd.tagAnchor}>
                        <Text style={pd.tagAnchorText}>⭐ Anchor</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Ticket alert strip ───────────────────────────────────────────── */}
        {ticketStops.length > 0 && (
          <View style={pd.alertStrip}>
            <Text style={pd.alertText}>
              🎫 {ticketStops.length} ticket{ticketStops.length !== 1 ? 's' : ''} needed — book before you go
            </Text>
          </View>
        )}

        {/* ── Start Day CTA ────────────────────────────────────────────────── */}
        <Pressable
          style={[pd.startBtn, starting && { opacity: 0.7 }]}
          onPress={handleStartDay}
          disabled={starting}
        >
          {starting
            ? <ActivityIndicator color="#fff" />
            : <Text style={pd.startBtnText}>▶  Start Day {resolvedDayIndex + 1}</Text>
          }
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const misc = StyleSheet.create({
  center: {
    flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12,
  },
  loadText:    { fontFamily: F.medium,   fontSize: 14, color: C.muted },
  errorText:   { fontFamily: F.semibold, fontSize: 15, color: C.deep, textAlign: 'center' },
  errorBtn:    { backgroundColor: C.orange, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  errorBtnText:{ fontFamily: F.bold, fontSize: 14, color: '#fff' },
  stubTitle:   { fontFamily: F.bold, fontSize: 17, color: C.deep, textAlign: 'center', marginBottom: 20 },
  stubBtn:     { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
  stubBtnText: { fontFamily: F.semibold, fontSize: 14, color: C.deep },
});

const pd = StyleSheet.create({
  // Hero
  hero:           { paddingHorizontal: 24, paddingBottom: 28 },
  activePill:     {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.orange, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  activeDot:      { width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3 },
  activePillText: { fontFamily: F.bold, fontSize: 11, color: '#fff', letterSpacing: 0.6 },
  tripName:       { fontFamily: F.bold, fontSize: 26, color: '#fff', lineHeight: 30, marginBottom: 4 },
  tripSub:        { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 18 },
  metaRow:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaPill:       {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  metaText:       { fontFamily: F.semibold, fontSize: 12, color: 'rgba(255,255,255,0.85)' },

  // Pace
  paceSection:     { backgroundColor: C.card, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  paceLabel:       { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 },
  paceRow:         { flexDirection: 'row', gap: 8 },
  paceChip:        {
    flex: 1, paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card, alignItems: 'center',
  },
  paceChipSel:     { borderColor: C.orange, backgroundColor: C.orangeLt },
  paceChipName:    { fontFamily: F.bold, fontSize: 12, color: C.deep },
  paceChipNameSel: { color: C.orange },
  paceChipSub:     { fontFamily: F.regular, fontSize: 10, color: C.muted, marginTop: 1 },

  // Stop list
  stopsSection:   { paddingHorizontal: 20, paddingTop: 14 },
  stopsLabel:     { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 },
  emptyText:      { fontFamily: F.regular, fontSize: 14, color: C.muted, paddingVertical: 16 },
  stopRow:        {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: C.border,
  },
  stopRowRemoved: { opacity: 0.4 },
  stopNum:        {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stopNumText:    { fontFamily: F.bold, fontSize: 12, color: C.muted },
  stopName:       { fontFamily: F.bold, fontSize: 14, color: C.deep, marginBottom: 2 },
  stopNameStruck: { textDecorationLine: 'line-through', color: C.muted },
  stopMeta:       { fontFamily: F.medium, fontSize: 12, color: C.muted },
  tagRow:         { flexDirection: 'row', gap: 5, marginTop: 5, flexWrap: 'wrap' },

  // Tags
  tagTicket:      { backgroundColor: '#FEF2F1', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  tagTicketText:  { fontFamily: F.bold, fontSize: 10, color: C.red },
  tagFree:        { backgroundColor: C.greenLt, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  tagFreeText:    { fontFamily: F.bold, fontSize: 10, color: C.green },
  tagAnchor:      { backgroundColor: '#F0EBFF', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  tagAnchorText:  { fontFamily: F.bold, fontSize: 10, color: '#6B4FA8' },
  tagRemoved:     { backgroundColor: '#f5f5f5', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  tagRemovedText: { fontFamily: F.medium, fontSize: 10, color: '#bbb' },

  // Alert strip
  alertStrip:  {
    marginHorizontal: 20, marginTop: 6, borderRadius: 10,
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderWidth: 1, borderColor: 'rgba(245,166,35,0.25)',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  alertText:   { fontFamily: F.semibold, fontSize: 12, color: '#a07010' },

  // CTA
  startBtn: {
    marginHorizontal: 20, marginTop: 16, backgroundColor: C.orange,
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: C.orange, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  startBtnText: { fontFamily: F.bold, fontSize: 16, color: '#fff' },
});
