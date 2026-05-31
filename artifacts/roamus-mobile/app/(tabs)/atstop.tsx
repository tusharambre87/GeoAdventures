/**
 * RoamUs — At Stop Tab
 * Brief: roamus-atstop-brief.md · Visual ref: roamus-atstop-tab-v5.html
 * Step 1 complete: Scaffold · No-Trip empty state · Stop Picker
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  orange:    '#E8692A', orangeLt:  '#FDF0E9',
  bg:        '#F5F2EE', card:      '#FFFFFF',
  deep:      '#1A1F2E', muted:     '#8A8FA8',
  sage:      '#7A9E8E', sageLt:    '#EEF5F2',
  green:     '#3DAA6E', greenLt:   '#E8F7EF',
  purple:    '#6B4FA8', purpleLt:  '#F0EBFF',
  red:       '#E8433A', redLt:     '#FEF2F1',
  border:    'rgba(26,31,46,0.09)',
  borderMed: 'rgba(26,31,46,0.16)',
} as const;

// ─── Stop type hero banner colors + emoji ─────────────────────────────────────

const STOP_HERO_BG: Record<string, string> = {
  park:     '#C8E6C9',
  museum:   '#BBDEFB',
  zoo:      '#FFE0B2',
  landmark: '#E1BEE7',
  shopping: '#FCE4EC',
  nature:   '#DCEDC8',
  culture:  '#FFF3E0',
  meal:     '#FCE4EC',
  default:  '#E0E0E0',
};

const STOP_HERO_EMOJI: Record<string, string> = {
  park: '🌳', museum: '🏛', zoo: '🦁', landmark: '🗺️',
  shopping: '🛍', nature: '🏔', culture: '🎭', meal: '🍽',
  default: '📍',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type StopMetadata = {
  doThisFirst?: string;
  ticketSignal?: boolean;
  restroomConfidence?: string;
  travelMinutes?: number;
  anchorScore?: number;
  dropPriority?: number;
  sessionFit?: string;
  parkingSignal?: string;
};

type StopEnrichment = {
  whyNow?: string;
  parkingNotes?: string;
  bathroomNotes?: string;
  bestTimeOfDay?: string;
  practicalTips?: string;
  strollerFriendly?: boolean;
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
  plannerTripDays?: number | null;
  tripDays?: number | null;
  stops: Stop[];
};

type AtStopMode = 'loading' | 'noTrip' | 'picker' | 'detail';

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
  stops: [
    {
      id: 's1', name: 'The Art Institute of Chicago', stopType: 'museum',
      address: '111 S Michigan Ave, Chicago, IL 60603',
      dayIndex: 0, displayOrder: 1, durationMinutes: 90,
      isVisited: true,
      metadata: { ticketSignal: true, anchorScore: 9 },
      enrichment: { whyNow: 'Head to the Thorne Miniature Rooms first — lines build fast after 10 AM.' },
    },
    {
      id: 's2', name: 'Millennium Park & Cloud Gate', stopType: 'landmark',
      address: '201 E Randolph St, Chicago, IL 60602',
      dayIndex: 0, displayOrder: 2, durationMinutes: 60,
      metadata: { ticketSignal: false, anchorScore: 8 },
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
      metadata: { ticketSignal: true, anchorScore: 9 },
      enrichment: { whyNow: 'Catch the 11 AM dolphin show — it sells out.' },
    },
    {
      id: 's5', name: 'Navy Pier', stopType: 'park',
      address: '600 E Grand Ave, Chicago, IL 60611',
      dayIndex: 0, displayOrder: 5, durationMinutes: 60,
      metadata: { ticketSignal: false },
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`) as Error & { status: number };
    error.status = res.status;
    try { const b = await res.json(); error.message = b.message ?? error.message; } catch {}
    throw error;
  }
  return res.json() as Promise<T>;
}

function parseMetadata(raw: Stop['metadata']): StopMetadata {
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return raw as StopMetadata;
}

function isStopVisited(s: Stop): boolean {
  return !!(s.isVisited || s.visited);
}

function formatDayDate(trip: TripData, di: number): string {
  if (!trip.startDate) return '';
  try {
    const d = new Date(trip.startDate);
    d.setDate(d.getDate() + di);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function buildStopTimes(stops: Stop[], startHour = 9): string[] {
  let cur = startHour * 60;
  return stops.map(s => {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    const ampm = h < 12 ? 'AM' : 'PM';
    const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const label = `${dh}:${String(m).padStart(2, '0')} ${ampm}`;
    cur += (s.durationMinutes ?? 60) + 15;
    return label;
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AtStopScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ stopId?: string; mode?: string }>();

  const devMode = __DEV__ ? (params.mode as AtStopMode | undefined) : undefined;

  const [mode, setMode]               = useState<AtStopMode>(devMode ?? 'loading');
  const [trip, setTrip]               = useState<TripData | null>(null);
  const [currentStop, setCurrentStop] = useState<Stop | null>(null);
  const [dayStops, setDayStops]       = useState<Stop[]>([]);
  const [dayIndex, setDayIndex]       = useState(0);
  const [loadErr, setLoadErr]         = useState<string | null>(null);

  // Re-load each time the tab gains focus so visited state stays fresh
  useFocusEffect(
    useCallback(() => {
      // Dev shortcut: ?mode=noTrip|picker|detail skips API
      if (__DEV__ && devMode && devMode !== 'loading') {
        const ts = MOCK_TRIP.stops.filter(s => (s.dayIndex ?? 0) === 0);
        setTrip(MOCK_TRIP);
        setDayStops(ts);
        if (devMode === 'detail') {
          setCurrentStop(ts.find(s => !isStopVisited(s)) ?? null);
        }
        setMode(devMode);
        return;
      }
      load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [devMode, params.stopId])
  );

  async function load() {
    setMode('loading');
    setLoadErr(null);
    try {
      const data = await apiFetch<{ trips: TripData[] }>('/api/travel/trips');
      const active = data.trips?.find(t => t.status === 'active') ?? data.trips?.[0];
      if (!active) { setMode('noTrip'); return; }

      const tripData = await apiFetch<TripData>(`/api/travel/trips/${active.id}`);
      setTrip(tripData);

      // Resolve today's day index
      let di = 0;
      if (tripData.startDate) {
        const start = new Date(tripData.startDate);
        const diff  = Math.floor((Date.now() - start.getTime()) / 86400000);
        const total = tripData.plannerTripDays ?? tripData.tripDays ?? 1;
        di = Math.max(0, Math.min(diff, total - 1));
      }
      setDayIndex(di);

      const ts = (tripData.stops ?? [])
        .filter(s => (s.dayIndex ?? 0) === di)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setDayStops(ts);

      // Arriving from Today tab with a specific stop
      if (params.stopId) {
        const target = ts.find(s => s.id === params.stopId);
        if (target) { setCurrentStop(target); setMode('detail'); return; }
      }

      setMode('picker');
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.status === 401 && __DEV__) {
        // Dev fallback
        const ts = MOCK_TRIP.stops.filter(s => (s.dayIndex ?? 0) === 0);
        setTrip(MOCK_TRIP);
        setDayStops(ts);
        if (params.stopId) {
          const t = ts.find(s => s.id === params.stopId);
          if (t) { setCurrentStop(t); setMode('detail'); return; }
        }
        setMode('picker');
      } else {
        setLoadErr('Could not load trip data. Check your connection.');
        setMode('noTrip');
      }
    }
  }

  const unvisited  = dayStops.filter(s => !isStopVisited(s));
  const visited    = dayStops.filter(s => isStopVisited(s));
  const stopTimes  = buildStopTimes(dayStops);
  const paddingTop = insets.top + 12;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (mode === 'loading') {
    return (
      <View style={[sc.screen, { paddingTop }]}>
        <ActivityIndicator size="large" color={C.orange} style={{ marginTop: 120 }} />
      </View>
    );
  }

  // ── Screen A — No Active Trip ─────────────────────────────────────────────
  if (mode === 'noTrip') {
    return (
      <View style={[sc.screen, { paddingTop }]}>
        <View style={sc.noTripWrap}>
          <View style={sc.noTripIcon}>
            <Text style={sc.noTripIconEmoji}>📍</Text>
          </View>
          <Text style={sc.noTripTitle}>You're not on a trip yet</Text>
          <Text style={sc.noTripSub}>
            {loadErr ?? 'At Stop shows live details when you\u2019re out exploring with your family. Start by planning your next trip.'}
          </Text>
          <TouchableOpacity
            style={sc.noTripBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={sc.noTripBtnText}>Plan a trip →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Screen B — Stop Picker ────────────────────────────────────────────────
  const dateStr = trip ? formatDayDate(trip, dayIndex) : '';
  const dayLabel = [
    `Day ${dayIndex + 1}`,
    trip?.destination ?? trip?.city,
    dateStr,
  ].filter(Boolean).join(' · ');

  return (
    <View style={[sc.screen, { paddingTop }]}>
      {/* Header */}
      <View style={sc.header}>
        <Text style={sc.headerTitle}>At Stop</Text>
        {dayLabel ? <Text style={sc.headerSub}>{dayLabel}</Text> : null}
      </View>

      <ScrollView
        style={sc.scroll}
        contentContainerStyle={sc.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TODAY'S STOPS */}
        {unvisited.length > 0 && (
          <>
            <Text style={sc.sectionLabel}>TODAY'S STOPS — TAP TO EXPLORE</Text>

            {unvisited.map(stop => {
              const globalIdx = dayStops.indexOf(stop);
              const time      = stopTimes[globalIdx] ?? '';
              const duration  = stop.durationMinutes ?? 60;
              const bgColor   = STOP_HERO_BG[stop.stopType ?? ''] ?? STOP_HERO_BG.default;
              const emoji     = STOP_HERO_EMOJI[stop.stopType ?? ''] ?? STOP_HERO_EMOJI.default;
              const meta      = parseMetadata(stop.metadata);
              const hasTicket = meta.ticketSignal === true;
              const isFree    = meta.ticketSignal === false;
              const isAnchor  = (meta.anchorScore ?? 0) >= 8;
              const orderNum  = globalIdx + 1;

              return (
                <TouchableOpacity
                  key={stop.id}
                  style={sc.stopCard}
                  activeOpacity={0.88}
                  onPress={() => { setCurrentStop(stop); setMode('detail'); }}
                >
                  {/* Color hero banner */}
                  <View style={[sc.stopBanner, { backgroundColor: bgColor }]}>
                    <Text style={sc.stopBannerEmoji}>{emoji}</Text>
                    <Text style={sc.stopBannerName} numberOfLines={1}>{stop.name}</Text>
                  </View>

                  {/* Card body */}
                  <View style={sc.stopBody}>
                    <Text style={sc.stopMeta}>
                      Stop {orderNum} · {duration} min{time ? ` · ${time}` : ''}
                    </Text>
                    <View style={sc.tagsRow}>
                      {hasTicket && (
                        <View style={[sc.tag, sc.tagRed]}>
                          <Text style={[sc.tagTxt, sc.tagTxtRed]}>🎫 Ticket needed</Text>
                        </View>
                      )}
                      {isFree && !hasTicket && (
                        <View style={[sc.tag, sc.tagGreen]}>
                          <Text style={[sc.tagTxt, sc.tagTxtGreen]}>Free entry</Text>
                        </View>
                      )}
                      {isAnchor && (
                        <View style={[sc.tag, sc.tagPurple]}>
                          <Text style={[sc.tagTxt, sc.tagTxtPurple]}>⚓ Anchor stop</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={sc.stopChevron}>›</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ALREADY VISITED */}
        {visited.length > 0 && (
          <>
            <Text style={[sc.sectionLabel, unvisited.length > 0 && { marginTop: 22 }]}>
              ALREADY VISITED
            </Text>

            {visited.map(stop => {
              const globalIdx = dayStops.indexOf(stop);
              const bgColor   = STOP_HERO_BG[stop.stopType ?? ''] ?? STOP_HERO_BG.default;
              const emoji     = STOP_HERO_EMOJI[stop.stopType ?? ''] ?? STOP_HERO_EMOJI.default;
              const orderNum  = globalIdx + 1;

              return (
                <View key={stop.id} style={[sc.stopCard, { opacity: 0.4 }]}>
                  <View style={[sc.stopBanner, { backgroundColor: bgColor }]}>
                    <Text style={sc.stopBannerEmoji}>{emoji}</Text>
                    <Text style={sc.stopBannerName} numberOfLines={1}>{stop.name}</Text>
                  </View>
                  <View style={sc.stopBody}>
                    <Text style={sc.stopMeta}>
                      Stop {orderNum} · {stop.durationMinutes ?? 60} min
                    </Text>
                    <View style={sc.tagsRow}>
                      <View style={[sc.tag, sc.tagGreen]}>
                        <Text style={[sc.tagTxt, sc.tagTxtGreen]}>✓ Done</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Empty today */}
        {dayStops.length === 0 && (
          <View style={sc.emptyDay}>
            <Text style={sc.emptyDayEmoji}>🗺️</Text>
            <Text style={sc.emptyDayTitle}>No stops planned for today</Text>
            <Text style={sc.emptyDaySub}>Add stops to your trip to get started.</Text>
          </View>
        )}

        <View style={{ height: 36 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: F.bold,
    fontSize: 22,
    color: C.deep,
  },
  headerSub: {
    fontFamily: F.medium,
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 2 },

  // Section label
  sectionLabel: {
    fontFamily: F.bold,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Stop card
  stopCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  stopBanner: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  stopBannerEmoji: { fontSize: 28 },
  stopBannerName: {
    fontFamily: F.bold,
    fontSize: 15,
    color: C.deep,
    flex: 1,
  },
  stopBody: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  stopMeta: {
    fontFamily: F.medium,
    fontSize: 12,
    color: C.muted,
    marginBottom: 7,
  },
  stopChevron: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    fontSize: 18,
    color: C.muted,
  },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
  tagTxt:       { fontFamily: F.semibold, fontSize: 11 },
  tagRed:       { borderColor: 'rgba(232,67,58,0.2)', backgroundColor: C.card },
  tagTxtRed:    { color: C.red },
  tagGreen:     { borderColor: 'rgba(61,170,110,0.25)', backgroundColor: C.card },
  tagTxtGreen:  { color: C.green },
  tagPurple:    { borderColor: 'rgba(107,79,168,0.2)', backgroundColor: C.card },
  tagTxtPurple: { color: C.purple },

  // No trip
  noTripWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  noTripIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  noTripIconEmoji: { fontSize: 36 },
  noTripTitle: {
    fontFamily: F.bold,
    fontSize: 20,
    color: C.deep,
    textAlign: 'center',
    marginBottom: 12,
  },
  noTripSub: {
    fontFamily: F.medium,
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  noTripBtn: {
    backgroundColor: C.orange,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
  },
  noTripBtnText: {
    fontFamily: F.bold,
    fontSize: 15,
    color: '#fff',
  },

  // Empty today
  emptyDay: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyDayEmoji: { fontSize: 40 },
  emptyDayTitle: { fontFamily: F.bold, fontSize: 16, color: C.deep },
  emptyDaySub:   { fontFamily: F.medium, fontSize: 13, color: C.muted },
});
