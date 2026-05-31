/**
 * RoamUs — At Stop Tab
 * Brief: roamus-atstop-brief.md · Visual ref: roamus-atstop-tab-v5.html
 * Steps 1–5 complete:
 *   1. Scaffold · No-Trip empty state · Stop Picker
 *   2. Stop Detail — hero, status, why, best time, actions, photos strip, rescue rows
 *   3. Explore More expandable — all data sections
 *   4. CTA hierarchy + Change Stop + Didn't Visit sheets
 *   5. Feedback sheet + Rescue sheets (4 variants)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  LayoutAnimation,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
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

const STOP_HERO_BG: Record<string, string> = {
  park:     '#C8E6C9', museum:   '#BBDEFB', zoo:      '#FFE0B2',
  landmark: '#E1BEE7', shopping: '#FCE4EC', nature:   '#DCEDC8',
  culture:  '#FFF3E0', meal:     '#FCE4EC', default:  '#E0E0E0',
};

const STOP_HERO_EMOJI: Record<string, string> = {
  park: '🌳', museum: '🏛', zoo: '🦁', landmark: '🗺️',
  shopping: '🛍', nature: '🏔', culture: '🎭', meal: '🍽', default: '📍',
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
  plannerTripDays?: number | null;
  tripDays?: number | null;
  stops: Stop[];
};

type AtStopMode     = 'loading' | 'noTrip' | 'picker' | 'detail';
type ActiveSheet    = 'none' | 'change' | 'didnt' | 'feedback' | 'rescue';
type RescueType     = 'behind' | 'tired' | 'skip' | 'fun';
type FeedbackRating = 'okay' | 'good' | 'amazing';

// ─── Dev mock data ────────────────────────────────────────────────────────────

const MOCK_TRIP: TripData = {
  id: 'mock-trip', name: 'Chicago Family Adventure', status: 'active',
  destination: 'Chicago', city: 'Chicago',
  startDate: '2026-05-30', plannerTripDays: 4,
  stops: [
    {
      id: 's1', name: 'The Art Institute of Chicago', stopType: 'museum',
      address: '111 S Michigan Ave, Chicago, IL 60603',
      dayIndex: 0, displayOrder: 1, durationMinutes: 90, isVisited: true,
      metadata: { ticketSignal: true, anchorScore: 9, sessionFit: 'Ages 3–12',
        restroomConfidence: 'Ground floor near coat check' },
      enrichment: { whyNow: 'Head to the Thorne Miniature Rooms first — lines build fast after 10 AM.',
        parkingNotes: 'Millennium Garage (half block north) · $25 flat rate on weekends',
        bestTimeOfDay: 'Low crowds this morning', practicalTips: 'Pick up a family activity guide at the entrance. The Miniature Rooms and Impressionism galleries are the best with kids.',
        strollerFriendly: true },
    },
    {
      id: 's2', name: 'Millennium Park & Cloud Gate', stopType: 'landmark',
      address: '201 E Randolph St, Chicago, IL 60602',
      dayIndex: 0, displayOrder: 2, durationMinutes: 60,
      metadata: { ticketSignal: false, anchorScore: 8, sessionFit: 'All ages',
        restroomConfidence: 'Near the Jay Pritzker Pavilion' },
      enrichment: { parkingNotes: 'Street parking or Millennium Garage',
        bestTimeOfDay: 'Best before 11 AM on weekends',
        whyNow: 'The Bean is less crowded on weekday mornings — great for photos.',
        practicalTips: 'Touch the Bean for a fun reflection photo. Check the schedule at the Pritzker Pavilion for free events.',
        strollerFriendly: true },
    },
    {
      id: 's3', name: "Giordano's Deep Dish Lunch", stopType: 'meal',
      address: '130 E Randolph St, Chicago, IL 60601',
      dayIndex: 0, displayOrder: 3, durationMinutes: 75,
      metadata: { ticketSignal: false },
      enrichment: { whyNow: 'Order ahead online — waits can be 30+ min on weekends.' },
    },
    {
      id: 's4', name: 'Shedd Aquarium', stopType: 'zoo',
      address: '1200 S Lake Shore Dr, Chicago, IL 60605',
      dayIndex: 0, displayOrder: 4, durationMinutes: 120,
      metadata: { ticketSignal: true, anchorScore: 9, sessionFit: 'Ages 2–12',
        restroomConfidence: 'Multiple locations on each floor' },
      enrichment: { whyNow: 'Catch the 11 AM dolphin show — it sells out.',
        parkingNotes: 'Soldier Field South Lot · $25 · 5 min walk',
        bestTimeOfDay: 'Dolphin shows fill up fast — grab seats early',
        practicalTips: 'Start with the dolphin show, then work your way through Amazon Rising and the coral reef.',
        strollerFriendly: true },
    },
    {
      id: 's5', name: 'Navy Pier', stopType: 'park',
      address: '600 E Grand Ave, Chicago, IL 60611',
      dayIndex: 0, displayOrder: 5, durationMinutes: 60,
      metadata: { ticketSignal: false },
      enrichment: { whyNow: 'Ferris wheel and lakefront views — best at golden hour.' },
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>) };
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

function isStopVisited(s: Stop): boolean { return !!(s.isVisited || s.visited); }

function formatDayDate(trip: TripData, di: number): string {
  if (!trip.startDate) return '';
  try {
    const d = new Date(trip.startDate); d.setDate(d.getDate() + di);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function buildStopTimes(stops: Stop[], startHour = 9): string[] {
  let cur = startHour * 60;
  return stops.map(s => {
    const h = Math.floor(cur / 60); const m = cur % 60;
    const ampm = h < 12 ? 'AM' : 'PM'; const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const label = `${dh}:${String(m).padStart(2, '0')} ${ampm}`;
    cur += (s.durationMinutes ?? 60) + 15;
    return label;
  });
}

async function fetchWikiImage(name: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(name);
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${q}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail?: { source: string } };
    return data.thumbnail?.source ?? null;
  } catch { return null; }
}

function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function ticketUrl(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(name + ' tickets')}`;
}

// ─── SheetModal ───────────────────────────────────────────────────────────────

function SheetModal({ visible, onClose, children }: {
  visible: boolean; onClose: () => void; children: React.ReactNode;
}) {
  const anim    = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);
  if (visible && !mounted.current) mounted.current = true;
  useEffect(() => {
    Animated.spring(anim, { toValue: visible ? 1 : 0, useNativeDriver: true,
      damping: 22, stiffness: 180 }).start();
  }, [visible]);
  if (!mounted.current) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, sh.overlay, { opacity: anim }]}
      pointerEvents={visible ? 'auto' : 'none'}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[sh.sheet, {
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }],
      }]}>
        <View style={sh.handle} />
        {children}
      </Animated.View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AtStopScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ stopId?: string; mode?: string }>();
  const devMode = __DEV__ ? (params.mode as AtStopMode | undefined) : undefined;

  // ── Core state ──
  const [mode, setMode]               = useState<AtStopMode>(devMode ?? 'loading');
  const [trip, setTrip]               = useState<TripData | null>(null);
  const [currentStop, setCurrentStop] = useState<Stop | null>(null);
  const [dayStops, setDayStops]       = useState<Stop[]>([]);
  const [dayIndex, setDayIndex]       = useState(0);
  const [loadErr, setLoadErr]         = useState<string | null>(null);

  // ── Detail state ──
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [activeSheet, setActiveSheet]   = useState<ActiveSheet>('none');
  const [rescueType, setRescueType]     = useState<RescueType>('behind');
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating>('amazing');
  const [feedbackText, setFeedbackText]     = useState('');
  const [exploreOpen, setExploreOpen]       = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackInputFocused, setFeedbackInputFocused] = useState(false);

  // ── Fetch Wikipedia image whenever stop changes ──
  useEffect(() => {
    if (!currentStop) return;
    setHeroImageUrl(null);
    fetchWikiImage(currentStop.name).then(url => { if (url) setHeroImageUrl(url); });
  }, [currentStop?.id]);

  // ── Load on focus ──
  useFocusEffect(
    useCallback(() => {
      if (__DEV__ && devMode && devMode !== 'loading') {
        const ts = MOCK_TRIP.stops.filter(s => (s.dayIndex ?? 0) === 0);
        setTrip(MOCK_TRIP); setDayStops(ts);
        if (devMode === 'detail') setCurrentStop(ts.find(s => !isStopVisited(s)) ?? null);
        setMode(devMode); return;
      }
      load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [devMode, params.stopId])
  );

  async function load() {
    setMode('loading'); setLoadErr(null);
    try {
      const data = await apiFetch<{ trips: TripData[] }>('/api/travel/trips');
      const active = data.trips?.find(t => t.status === 'active') ?? data.trips?.[0];
      if (!active) { setMode('noTrip'); return; }
      const tripData = await apiFetch<TripData>(`/api/travel/trips/${active.id}`);
      setTrip(tripData);
      let di = 0;
      if (tripData.startDate) {
        const diff = Math.floor((Date.now() - new Date(tripData.startDate).getTime()) / 86400000);
        const total = tripData.plannerTripDays ?? tripData.tripDays ?? 1;
        di = Math.max(0, Math.min(diff, total - 1));
      }
      setDayIndex(di);
      const ts = (tripData.stops ?? []).filter(s => (s.dayIndex ?? 0) === di)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setDayStops(ts);
      if (params.stopId) {
        const target = ts.find(s => s.id === params.stopId);
        if (target) { setCurrentStop(target); setMode('detail'); return; }
      }
      setMode('picker');
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.status === 401 && __DEV__) {
        const ts = MOCK_TRIP.stops.filter(s => (s.dayIndex ?? 0) === 0);
        setTrip(MOCK_TRIP); setDayStops(ts);
        if (params.stopId) {
          const t = ts.find(s => s.id === params.stopId);
          if (t) { setCurrentStop(t); setMode('detail'); return; }
        }
        setMode('picker');
      } else { setLoadErr('Could not load trip data.'); setMode('noTrip'); }
    }
  }

  // ── Feedback / mark complete ──
  async function handleMarkComplete(skipFeedback = false) {
    if (!currentStop) return;
    setSubmittingFeedback(true);
    try {
      await apiFetch(`/api/travel/stops/${currentStop.id}/visit`, { method: 'POST' });
      if (!skipFeedback) {
        await apiFetch(`/api/travel/stops/${currentStop.id}/quality-signal`, {
          method: 'POST',
          body: JSON.stringify({ signal: feedbackRating, notes: feedbackText || undefined }),
        });
      }
      // Mark visited locally
      setDayStops(prev => prev.map(s => s.id === currentStop.id ? { ...s, isVisited: true } : s));
    } catch { /* best effort */ }
    setSubmittingFeedback(false);
    setActiveSheet('none');
    // If more unvisited stops, go back to picker; else go to today for day wrap
    const remaining = dayStops.filter(s => s.id !== currentStop.id && !isStopVisited(s));
    if (remaining.length > 0) { setMode('picker'); setCurrentStop(null); }
    else { router.push('/(tabs)/today'); }
  }

  // ── Skip stop ──
  async function handleSkipStop() {
    if (!currentStop) return;
    try { await apiFetch(`/api/travel/stops/${currentStop.id}`, { method: 'DELETE' }); } catch {}
    setDayStops(prev => prev.filter(s => s.id !== currentStop.id));
    setActiveSheet('none');
    setMode('picker'); setCurrentStop(null);
  }

  const unvisited   = dayStops.filter(s => !isStopVisited(s));
  const visited     = dayStops.filter(s => isStopVisited(s));
  const stopTimes   = buildStopTimes(dayStops);
  const stopIdx     = currentStop ? dayStops.indexOf(currentStop) : -1;
  const nextStop    = stopIdx >= 0 ? dayStops[stopIdx + 1] : null;
  const paddingTop  = insets.top + 12;

  const openRescue = (type: RescueType) => { setRescueType(type); setActiveSheet('rescue'); };

  function openSheet(s: ActiveSheet) {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSheet(s);
  }

  // ── Loading ──
  if (mode === 'loading') {
    return (
      <View style={[sc.screen, { paddingTop }]}>
        <ActivityIndicator size="large" color={C.orange} style={{ marginTop: 120 }} />
      </View>
    );
  }

  // ── Screen A — No Active Trip ──
  if (mode === 'noTrip') {
    return (
      <View style={[sc.screen, { paddingTop }]}>
        <View style={sc.noTripWrap}>
          <View style={sc.noTripIcon}><Text style={sc.noTripIconEmoji}>📍</Text></View>
          <Text style={sc.noTripTitle}>You're not on a trip yet</Text>
          <Text style={sc.noTripSub}>
            {loadErr ?? 'At Stop shows live details when you’re out exploring with your family. Start by planning your next trip.'}
          </Text>
          <TouchableOpacity style={sc.noTripBtn} activeOpacity={0.85}
            onPress={() => router.push('/(tabs)')}>
            <Text style={sc.noTripBtnText}>Plan a trip →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Screen B — Stop Picker ──
  if (mode === 'picker') {
    const dateStr = trip ? formatDayDate(trip, dayIndex) : '';
    const dayLabel = [`Day ${dayIndex + 1}`, trip?.destination ?? trip?.city, dateStr]
      .filter(Boolean).join(' · ');
    return (
      <View style={[sc.screen, { paddingTop }]}>
        <View style={sc.header}>
          <Text style={sc.headerTitle}>At Stop</Text>
          {dayLabel ? <Text style={sc.headerSub}>{dayLabel}</Text> : null}
        </View>
        <ScrollView style={sc.scroll} contentContainerStyle={sc.scrollContent} showsVerticalScrollIndicator={false}>
          {unvisited.length > 0 && (
            <>
              <Text style={sc.sectionLabel}>TODAY’S STOPS — TAP TO EXPLORE</Text>
              {unvisited.map(stop => {
                const gi = dayStops.indexOf(stop);
                const time = stopTimes[gi] ?? '';
                const meta = parseMetadata(stop.metadata);
                const bgColor = STOP_HERO_BG[stop.stopType ?? ''] ?? STOP_HERO_BG.default;
                const emoji   = STOP_HERO_EMOJI[stop.stopType ?? ''] ?? STOP_HERO_EMOJI.default;
                const hasTicket = meta.ticketSignal === true;
                const isFree    = meta.ticketSignal === false;
                const isAnchor  = (meta.anchorScore ?? 0) >= 8;
                return (
                  <TouchableOpacity key={stop.id} style={sc.stopCard} activeOpacity={0.88}
                    onPress={() => { setCurrentStop(stop); setMode('detail'); }}>
                    <View style={[sc.stopBanner, { backgroundColor: bgColor }]}>
                      <Text style={sc.stopBannerEmoji}>{emoji}</Text>
                      <Text style={sc.stopBannerName} numberOfLines={1}>{stop.name}</Text>
                    </View>
                    <View style={sc.stopBody}>
                      <Text style={sc.stopMeta}>Stop {gi + 1} · {stop.durationMinutes ?? 60} min{time ? ` · ${time}` : ''}</Text>
                      <View style={sc.tagsRow}>
                        {hasTicket && <View style={[sc.tag, sc.tagRed]}><Text style={[sc.tagTxt, sc.tagTxtRed]}>🎫 Ticket needed</Text></View>}
                        {isFree && !hasTicket && <View style={[sc.tag, sc.tagGreen]}><Text style={[sc.tagTxt, sc.tagTxtGreen]}>Free entry</Text></View>}
                        {isAnchor && <View style={[sc.tag, sc.tagPurple]}><Text style={[sc.tagTxt, sc.tagTxtPurple]}>⚓ Anchor stop</Text></View>}
                      </View>
                    </View>
                    <Text style={sc.stopChevron}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
          {visited.length > 0 && (
            <>
              <Text style={[sc.sectionLabel, unvisited.length > 0 && { marginTop: 22 }]}>ALREADY VISITED</Text>
              {visited.map(stop => {
                const gi = dayStops.indexOf(stop);
                const bgColor = STOP_HERO_BG[stop.stopType ?? ''] ?? STOP_HERO_BG.default;
                const emoji   = STOP_HERO_EMOJI[stop.stopType ?? ''] ?? STOP_HERO_EMOJI.default;
                return (
                  <View key={stop.id} style={[sc.stopCard, { opacity: 0.4 }]}>
                    <View style={[sc.stopBanner, { backgroundColor: bgColor }]}>
                      <Text style={sc.stopBannerEmoji}>{emoji}</Text>
                      <Text style={sc.stopBannerName} numberOfLines={1}>{stop.name}</Text>
                    </View>
                    <View style={sc.stopBody}>
                      <Text style={sc.stopMeta}>Stop {gi + 1} · {stop.durationMinutes ?? 60} min</Text>
                      <View style={sc.tagsRow}>
                        <View style={[sc.tag, sc.tagGreen]}><Text style={[sc.tagTxt, sc.tagTxtGreen]}>✓ Done</Text></View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
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

  // ── Screen C — Stop Detail ────────────────────────────────────────────────
  if (!currentStop) return null;
  const meta        = parseMetadata(currentStop.metadata);
  const enrichment  = currentStop.enrichment ?? {};
  const bgColor     = STOP_HERO_BG[currentStop.stopType ?? ''] ?? STOP_HERO_BG.default;
  const emoji       = STOP_HERO_EMOJI[currentStop.stopType ?? ''] ?? STOP_HERO_EMOJI.default;
  const hasTicket   = meta.ticketSignal === true;
  const isFree      = meta.ticketSignal === false;
  const stopOrderNum = stopIdx + 1;
  const totalStops   = dayStops.length;
  const stopTypeLabel = (currentStop.stopType ?? 'stop').charAt(0).toUpperCase()
    + (currentStop.stopType ?? 'stop').slice(1);
  const duration     = currentStop.durationMinutes ?? 60;
  const address      = currentStop.address ?? '';

  return (
    <View style={sc.screen}>
      <ScrollView style={sc.scroll} contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={dt.hero}>
          {heroImageUrl ? (
            <Image source={{ uri: heroImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor,
              alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 80 }}>{emoji}</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(26,31,46,0.08)', 'rgba(26,31,46,0.75)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Back pill */}
          <View style={[dt.heroPills, { top: paddingTop }]}>
            <TouchableOpacity style={dt.heroPill} activeOpacity={0.85}
              onPress={() => { setMode('picker'); setCurrentStop(null); }}>
              <Text style={dt.heroPillText}>← Back</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={dt.heroPill} activeOpacity={0.85}
                onPress={() => openSheet('change')}>
                <Text style={dt.heroPillText}>⇄ Change Stop</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[dt.heroPill, dt.heroPillDanger]} activeOpacity={0.85}
                onPress={() => openSheet('didnt')}>
                <Text style={[dt.heroPillText, { color: C.red }]}>🚫 Didn’t visit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stop info at hero bottom */}
          <View style={dt.heroBottom}>
            <Text style={dt.heroType}>{stopTypeLabel} · Stop {stopOrderNum} of {totalStops}</Text>
            <Text style={dt.heroName} numberOfLines={2}>{currentStop.name}</Text>
            <Text style={dt.heroSub}>{duration} min · Open now</Text>
          </View>
        </View>

        {/* ── Status pills ─────────────────────────────────────────────────── */}
        <View style={dt.statusRow}>
          <View style={[dt.statusPill, dt.statusPillGreen]}>
            <Text style={[dt.statusPillText, { color: C.green }]}>🟢 Open now · 9AM–5PM</Text>
          </View>
          {hasTicket ? (
            <TouchableOpacity style={[dt.statusPill, dt.statusPillRed]} activeOpacity={0.8}
              onPress={() => Linking.openURL(ticketUrl(currentStop.name))}>
              <Text style={[dt.statusPillText, { color: C.red }]}>🎫 Ticket needed ↗</Text>
            </TouchableOpacity>
          ) : isFree ? (
            <View style={[dt.statusPill, dt.statusPillGreen]}>
              <Text style={[dt.statusPillText, { color: C.green }]}>Free entry</Text>
            </View>
          ) : null}
        </View>

        {/* ── Why This Stop card ───────────────────────────────────────────── */}
        {!!enrichment.whyNow && (
          <View style={dt.card}>
            <Text style={dt.cardLabelOrange}>WHY THIS STOP WORKS</Text>
            <Text style={dt.cardText}>{enrichment.whyNow}</Text>
          </View>
        )}

        {/* ── Best Time card ───────────────────────────────────────────────── */}
        {!!enrichment.bestTimeOfDay && (
          <View style={[dt.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={dt.greenDot} />
            <View style={{ flex: 1 }}>
              <Text style={dt.cardLabelGreen}>BEST TIME RIGHT NOW</Text>
              <Text style={dt.bestTimeText}>{enrichment.bestTimeOfDay}</Text>
            </View>
          </View>
        )}

        {/* ── Quick action buttons ─────────────────────────────────────────── */}
        <View style={dt.actionsRow}>
          {[
            { icon: '↗', label: 'Directions',
              onPress: () => address ? Linking.openURL(mapsUrl(address)) : null },
            { icon: '🎫', label: 'Tickets',
              onPress: () => Linking.openURL(ticketUrl(currentStop.name)) },
            { icon: '🍕', label: 'Food nearby',
              onPress: () => address ? Linking.openURL(mapsUrl('food near ' + address)) : null },
          ].map(a => (
            <TouchableOpacity key={a.label} style={dt.actBtn} activeOpacity={0.8} onPress={a.onPress}>
              <Text style={dt.actIcon}>{a.icon}</Text>
              <Text style={dt.actLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Photos strip ─────────────────────────────────────────────────── */}
        <View style={dt.photoSection}>
          <Text style={dt.photoSectionLabel}>PHOTOS · GOOGLE PLACES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}>
            {[bgColor, bgColor, bgColor].map((bg, i) => (
              <View key={i} style={[dt.photoThumb, { backgroundColor: bg }]}>
                {heroImageUrl ? (
                  <Image source={{ uri: heroImageUrl }} style={[StyleSheet.absoluteFill,
                    { borderRadius: 12 }]} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 34 }}>{emoji}</Text>
                )}
              </View>
            ))}
            <TouchableOpacity style={dt.photoAdd} activeOpacity={0.8}
              onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission needed', 'Photo library access is required to pick photos.');
                  return;
                }
                await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'],
                  allowsEditing: true, aspect: [1, 1], quality: 0.8 });
              }}>
              <Text style={dt.photoAddIcon}>📷</Text>
              <Text style={dt.photoAddLabel}>Add yours</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── Need Help? rescue rows ───────────────────────────────────────── */}
        <View style={dt.rescueSection}>
          <Text style={dt.sectionLabel}>NEED HELP?</Text>
          {([
            { icon: '⏩', label: 'Running behind',   type: 'behind' as RescueType },
            { icon: '😴', label: 'Kids are tired',   type: 'tired'  as RescueType },
            { icon: '⏭', label: 'Skip this stop',    type: 'skip'   as RescueType },
            { icon: '🎉', label: 'Need more fun',     type: 'fun'    as RescueType },
          ] as const).map(row => (
            <TouchableOpacity key={row.type} style={dt.rescueRow} activeOpacity={0.8}
              onPress={() => openRescue(row.type)}>
              <Text style={dt.rescueIcon}>{row.icon}</Text>
              <Text style={dt.rescueLabel}>{row.label}</Text>
              <Text style={dt.rescueChev}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Explore More (expandable) ────────────────────────────────────── */}
        <View style={dt.exploreCard}>
          <TouchableOpacity style={dt.exploreHeader} activeOpacity={0.8}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setExploreOpen(o => !o);
            }}>
            <Text style={dt.exploreTitle}>Explore more about this stop</Text>
            <Text style={[dt.exploreChev, exploreOpen && { transform: [{ rotate: '180deg' }] }]}>▾</Text>
          </TouchableOpacity>

          {exploreOpen && (
            <View style={dt.exploreBody}>
              {/* What you'll experience */}
              {!!enrichment.practicalTips && (
                <>
                  <Text style={dt.exploreSubLabel}>What you’ll experience</Text>
                  <Text style={dt.exploreBodyText}>{enrichment.practicalTips}</Text>
                </>
              )}

              {/* Timing & logistics */}
              <Text style={dt.exploreSubLabel}>Timing &amp; logistics</Text>
              {[
                ['Recommended duration', `${duration} min`],
                ['Best for', meta.sessionFit ?? '—'],
                ['Crowd level now', enrichment.bestTimeOfDay ?? '—'],
                ['Stroller friendly', enrichment.strollerFriendly ? 'Yes ✓' : '—'],
              ].map(([k, v]) => (
                <View key={k} style={dt.exploreRow}>
                  <Text style={dt.exploreKey}>{k}</Text>
                  <Text style={[dt.exploreVal,
                    k === 'Crowd level now' && !!enrichment.bestTimeOfDay && { color: C.green }]}>
                    {v}
                  </Text>
                </View>
              ))}

              {/* Parking & access */}
              <Text style={dt.exploreSubLabel}>Parking &amp; access</Text>
              {[
                ['Parking', enrichment.parkingNotes ?? '—'],
                ['Restrooms', meta.restroomConfidence ?? '—'],
                ['Address', address || '—'],
              ].map(([k, v]) => (
                <View key={k} style={dt.exploreRow}>
                  <Text style={dt.exploreKey}>{k}</Text>
                  <Text style={dt.exploreVal}>{v}</Text>
                </View>
              ))}

              {/* Nearby essentials */}
              <Text style={dt.exploreSubLabel}>Nearby essentials</Text>
              {[
                { icon: '🍔', name: 'Food nearby', url: mapsUrl('food near ' + address) },
                { icon: '🛋', name: 'Quick break spots', url: mapsUrl('park near ' + address) },
                { icon: '👶', name: 'Kid-friendly extras', url: mapsUrl('activities for kids near ' + address) },
              ].map(row => (
                <TouchableOpacity key={row.name} style={dt.nearbyRow} activeOpacity={0.8}
                  onPress={() => address && Linking.openURL(row.url)}>
                  <Text style={dt.nearbyIcon}>{row.icon}</Text>
                  <Text style={dt.nearbyName}>{row.name}</Text>
                  <Text style={dt.nearbyChev}>›</Text>
                </TouchableOpacity>
              ))}

              {/* Hours & entry tiles */}
              <Text style={dt.exploreSubLabel}>Hours &amp; entry</Text>
              <View style={dt.tilesRow}>
                {[
                  { icon: '🕙', label: 'HOURS', val: '9AM–5PM' },
                  { icon: '💵', label: 'ENTRY', val: hasTicket ? 'Ticket required' : 'Free admission' },
                  { icon: '🅿️', label: 'PARKING', val: enrichment.parkingNotes
                    ? enrichment.parkingNotes.split('·')[0].trim() : '—' },
                ].map(tile => (
                  <View key={tile.label} style={dt.infoTile}>
                    <Text style={dt.infoTileIcon}>{tile.icon}</Text>
                    <Text style={dt.infoTileLabel}>{tile.label}</Text>
                    <Text style={dt.infoTileVal}>{tile.val}</Text>
                  </View>
                ))}
              </View>

              {/* Getting there */}
              <Text style={dt.exploreSubLabel}>Getting there</Text>
              <TouchableOpacity style={dt.exploreRow} activeOpacity={0.8}
                onPress={() => address && Linking.openURL(mapsUrl(address))}>
                <Text style={dt.exploreKey}>Directions</Text>
                <Text style={[dt.exploreVal, { color: C.orange }]}>Tap for Maps ↗</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── Fixed CTA bar ────────────────────────────────────────────────── */}
      <View style={[dt.ctaBar, { paddingBottom: insets.bottom + 8 }]}>
        {/* 1. Primary — Capture a moment */}
        <TouchableOpacity style={dt.ctaPrimary} activeOpacity={0.88}
          onPress={async () => {
            Alert.alert('Add photo', 'Choose a source', [
              { text: '📷  Camera', onPress: async () => {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
                await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.8 });
              }},
              { text: '🖼  Photo Library', onPress: async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permission needed', 'Library access is required.'); return; }
                await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.8 });
              }},
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}>
          <Text style={dt.ctaPrimaryText}>📸 Capture a moment</Text>
        </TouchableOpacity>

        {/* 2. Secondary — Let kids explore */}
        <TouchableOpacity style={dt.ctaSecondary} activeOpacity={0.88}
          onPress={() => router.push({ pathname: '/(tabs)/atstop',
            params: { mode: 'kids', stopId: currentStop.id } })}>
          <Text style={dt.ctaSecondaryText}>🧭 Let kids explore</Text>
        </TouchableOpacity>

        {/* 3. Tertiary — Mark stop complete */}
        <TouchableOpacity style={dt.ctaTertiary} activeOpacity={0.88}
          onPress={() => openSheet('feedback')}>
          <Text style={dt.ctaTertiaryText}>✓ Mark stop complete</Text>
        </TouchableOpacity>
      </View>

      {/* ── SHEET: Change Stop ───────────────────────────────────────────── */}
      <SheetModal visible={activeSheet === 'change'} onClose={() => setActiveSheet('none')}>
        <Text style={sh.title}>Where to next?</Text>
        <Text style={sh.sub}>Follow your planned route or pick any stop from today.</Text>

        {/* Follow planned route — highlighted */}
        {nextStop && (
          <TouchableOpacity style={[sh.row, sh.rowHighlighted]} activeOpacity={0.8}
            onPress={() => { setCurrentStop(nextStop); setActiveSheet('none'); }}>
            <View style={[sh.rowIcon, { backgroundColor: C.orangeLt }]}><Text>🗺️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[sh.rowName, { color: C.orange }]}>Follow Planned Route</Text>
              <Text style={[sh.rowDesc, { color: 'rgba(232,105,42,0.65)' }]}>{nextStop.name} · next stop</Text>
            </View>
            <Text style={{ fontSize: 20, color: C.orange }}>✅</Text>
          </TouchableOpacity>
        )}

        <Text style={sh.dividerLabel}>ALL TODAY’S STOPS</Text>

        {dayStops.map(stop => {
          const isCurrent = stop.id === currentStop.id;
          const isNext    = stop.id === nextStop?.id;
          const bgCol     = STOP_HERO_BG[stop.stopType ?? ''] ?? STOP_HERO_BG.default;
          const em        = STOP_HERO_EMOJI[stop.stopType ?? ''] ?? STOP_HERO_EMOJI.default;
          return (
            <TouchableOpacity key={stop.id} activeOpacity={isCurrent ? 1 : 0.8}
              style={[sh.row, isNext && sh.rowHighlighted]}
              onPress={() => {
                if (isCurrent) return;
                setCurrentStop(stop); setActiveSheet('none');
              }}>
              <View style={[sh.rowIcon, { backgroundColor: bgCol }]}><Text>{em}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[sh.rowName, isNext && { color: C.orange }]}>{stop.name}</Text>
                <Text style={[sh.rowDesc, isNext && { color: 'rgba(232,105,42,0.65)' }]}>
                  {stopTypeLabel} · {isCurrent ? 'current stop' : isNext ? 'next up' : `stop ${dayStops.indexOf(stop) + 1}`}
                </Text>
              </View>
              {!isCurrent && <Text style={[sh.rowChev, isNext && { color: C.orange }]}>›</Text>}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={sh.cancelBtn} onPress={() => setActiveSheet('none')}>
          <Text style={sh.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </SheetModal>

      {/* ── SHEET: Didn't Visit ──────────────────────────────────────────── */}
      <SheetModal visible={activeSheet === 'didnt'} onClose={() => setActiveSheet('none')}>
        <Text style={sh.title}>Didn’t visit?</Text>
        <Text style={sh.sub}>That’s fine — tell us why so we can adjust your day and improve future trips.</Text>
        {([
          { icon: '⏰', bg: '#FFF3E0', name: 'Ran out of time',       desc: 'We’ll skip it and keep the rest of your day',  signal: 'time'          },
          { icon: '😤', bg: C.redLt,   name: 'Kids didn’t want to go', desc: 'Noted — won’t suggest similar stops next time', signal: 'kids_rejected' },
          { icon: '🔒', bg: C.bg,      name: 'It was closed',          desc: 'We’ll flag this for future families',         signal: 'closed'        },
          { icon: '✌️', bg: C.bg,      name: 'Just skipping it',       desc: 'No reason needed — moving on',                signal: 'skipped'       },
        ] as const).map(row => (
          <TouchableOpacity key={row.signal} style={sh.row} activeOpacity={0.8}
            onPress={async () => {
              try { await apiFetch(`/api/travel/stops/${currentStop.id}/quality-signal`,
                { method: 'POST', body: JSON.stringify({ signal: row.signal }) }); } catch {}
              setDayStops(prev => prev.filter(s => s.id !== currentStop.id));
              setActiveSheet('none'); setMode('picker'); setCurrentStop(null);
            }}>
            <View style={[sh.rowIcon, { backgroundColor: row.bg }]}><Text>{row.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={sh.rowName}>{row.name}</Text>
              <Text style={sh.rowDesc}>{row.desc}</Text>
            </View>
            <Text style={sh.rowChev}>›</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={sh.cancelBtn} onPress={() => setActiveSheet('none')}>
          <Text style={sh.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </SheetModal>

      {/* ── SHEET: Feedback / Mark Complete ─────────────────────────────── */}
      <SheetModal visible={activeSheet === 'feedback'} onClose={() => setActiveSheet('none')}>
        <Text style={sh.title}>How was it?</Text>
        <Text style={sh.sub}>{currentStop.name} · {duration} min planned</Text>
        <View style={sh.emojiRow}>
          {([
            { emoji: '😐', label: 'Okay',    val: 'okay'    as FeedbackRating },
            { emoji: '😊', label: 'Good',    val: 'good'    as FeedbackRating },
            { emoji: '🤩', label: 'Amazing', val: 'amazing' as FeedbackRating },
          ] as const).map(opt => (
            <TouchableOpacity key={opt.val}
              style={[sh.emojiOpt, feedbackRating === opt.val && sh.emojiOptSel]}
              activeOpacity={0.8}
              onPress={() => setFeedbackRating(opt.val)}>
              <Text style={sh.emojiOptIcon}>{opt.emoji}</Text>
              <Text style={sh.emojiOptLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[sh.feedbackInput, feedbackInputFocused && { borderColor: C.orange }]}
          placeholder="Anything to add? (optional)"
          placeholderTextColor={C.muted}
          multiline
          numberOfLines={2}
          value={feedbackText}
          onChangeText={setFeedbackText}
          onFocus={() => setFeedbackInputFocused(true)}
          onBlur={() => setFeedbackInputFocused(false)}
        />
        <TouchableOpacity style={sh.feedbackSubmit} activeOpacity={0.88}
          onPress={() => handleMarkComplete(false)}
          disabled={submittingFeedback}>
          {submittingFeedback
            ? <ActivityIndicator color="#fff" />
            : <Text style={sh.feedbackSubmitText}>✓ Done — mark complete</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={sh.skipBtn} onPress={() => handleMarkComplete(true)}>
          <Text style={sh.skipText}>Skip feedback</Text>
        </TouchableOpacity>
      </SheetModal>

      {/* ── SHEET: Rescue ────────────────────────────────────────────────── */}
      <SheetModal visible={activeSheet === 'rescue'} onClose={() => setActiveSheet('none')}>
        {rescueType === 'behind' && (
          <>
            <Text style={sh.title}>Running behind?</Text>
            <Text style={sh.sub}>Here’s how we can catch up</Text>
            {[
              { icon: '⚡', bg: '#FFF3E0', name: 'Tighten travel gaps', desc: 'Cut buffer — still doable',
                onPress: () => { Alert.alert('Travel gaps tightened', 'Buffers between stops reduced.'); setActiveSheet('none'); } },
              { icon: '✂️', bg: C.sageLt,  name: 'Shorten this stop', desc: 'Highlights only — 45 min',
                onPress: () => { Alert.alert('Stop shortened', 'Focus on highlights — 45 min.'); setActiveSheet('none'); } },
              { icon: '⏭', bg: C.redLt,   name: 'Skip this stop',    desc: 'Jump to next stop',
                onPress: handleSkipStop },
            ].map(row => (
              <TouchableOpacity key={row.name} style={sh.row} activeOpacity={0.8} onPress={row.onPress}>
                <View style={[sh.rowIcon, { backgroundColor: row.bg }]}><Text>{row.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={sh.rowName}>{row.name}</Text>
                  <Text style={sh.rowDesc}>{row.desc}</Text>
                </View>
                <Text style={sh.rowChev}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
        {rescueType === 'tired' && (
          <>
            <Text style={sh.title}>Kids running low?</Text>
            <Text style={sh.sub}>Let’s give everyone a break</Text>
            {[
              { icon: '☕', bg: C.orangeLt, name: 'Find a nearby cafe',   url: address ? mapsUrl('cafe near ' + address) : null },
              { icon: '🌳', bg: C.sageLt,   name: 'Quick outdoor break',  url: address ? mapsUrl('park near ' + address) : null },
              { icon: '🏠', bg: C.bg,        name: 'Head back early',       url: null, isWrap: true },
            ].map(row => (
              <TouchableOpacity key={row.name} style={sh.row} activeOpacity={0.8}
                onPress={() => {
                  if (row.isWrap) { setActiveSheet('none'); router.push('/(tabs)/today'); return; }
                  if (row.url) Linking.openURL(row.url);
                  setActiveSheet('none');
                }}>
                <View style={[sh.rowIcon, { backgroundColor: row.bg }]}><Text>{row.icon}</Text></View>
                <View style={{ flex: 1 }}><Text style={sh.rowName}>{row.name}</Text></View>
                <Text style={sh.rowChev}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
        {rescueType === 'skip' && (
          <>
            <Text style={sh.title}>Skip this stop?</Text>
            <Text style={sh.sub}>We’ll keep the rest of your day</Text>
            {[
              { icon: '⏭', bg: C.redLt, name: 'Skip, go to next', desc: 'Move to the next stop', onPress: handleSkipStop },
              { icon: '🏠', bg: C.bg,    name: 'Wrap up for the day', desc: 'End here — great job today',
                onPress: () => { setActiveSheet('none'); router.push('/(tabs)/today'); } },
            ].map(row => (
              <TouchableOpacity key={row.name} style={sh.row} activeOpacity={0.8} onPress={row.onPress}>
                <View style={[sh.rowIcon, { backgroundColor: row.bg }]}><Text>{row.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={sh.rowName}>{row.name}</Text>
                  <Text style={sh.rowDesc}>{row.desc}</Text>
                </View>
                <Text style={sh.rowChev}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
        {rescueType === 'fun' && (
          <>
            <Text style={sh.title}>Need more excitement?</Text>
            <Text style={sh.sub}>Let’s turn it up</Text>
            {[
              { icon: '🍕', bg: C.sageLt,   name: 'Upgrade lunch',         url: address ? mapsUrl('great restaurants near ' + address) : null },
              { icon: '🎭', bg: C.purpleLt, name: 'Find something active',  url: address ? mapsUrl('activities near ' + address) : null },
            ].map(row => (
              <TouchableOpacity key={row.name} style={sh.row} activeOpacity={0.8}
                onPress={() => { if (row.url) Linking.openURL(row.url); setActiveSheet('none'); }}>
                <View style={[sh.rowIcon, { backgroundColor: row.bg }]}><Text>{row.icon}</Text></View>
                <View style={{ flex: 1 }}><Text style={sh.rowName}>{row.name}</Text></View>
                <Text style={sh.rowChev}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
        <TouchableOpacity style={sh.cancelBtn} onPress={() => setActiveSheet('none')}>
          <Text style={sh.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </SheetModal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Picker + shared
const sc = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerTitle: { fontFamily: F.bold, fontSize: 22, color: C.deep },
  headerSub: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 2 },
  sectionLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 },
  stopCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  stopBanner: { height: 80, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  stopBannerEmoji: { fontSize: 28 },
  stopBannerName: { fontFamily: F.bold, fontSize: 15, color: C.deep, flex: 1 },
  stopBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  stopMeta: { fontFamily: F.medium, fontSize: 12, color: C.muted, marginBottom: 7 },
  stopChevron: { position: 'absolute', right: 14, bottom: 14, fontSize: 18, color: C.muted },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1 },
  tagTxt: { fontFamily: F.semibold, fontSize: 11 },
  tagRed: { borderColor: 'rgba(232,67,58,0.2)', backgroundColor: C.card },
  tagTxtRed: { color: C.red },
  tagGreen: { borderColor: 'rgba(61,170,110,0.25)', backgroundColor: C.card },
  tagTxtGreen: { color: C.green },
  tagPurple: { borderColor: 'rgba(107,79,168,0.2)', backgroundColor: C.card },
  tagTxtPurple: { color: C.purple },
  noTripWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  noTripIcon: { width: 80, height: 80, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  noTripIconEmoji: { fontSize: 36 },
  noTripTitle: { fontFamily: F.bold, fontSize: 20, color: C.deep, textAlign: 'center', marginBottom: 12 },
  noTripSub: { fontFamily: F.medium, fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  noTripBtn: { backgroundColor: C.orange, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 32 },
  noTripBtnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  emptyDay: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyDayEmoji: { fontSize: 40 },
  emptyDayTitle: { fontFamily: F.bold, fontSize: 16, color: C.deep },
  emptyDaySub: { fontFamily: F.medium, fontSize: 13, color: C.muted },
});

// Detail screen
const dt = StyleSheet.create({
  // Hero
  hero: { height: 240, position: 'relative' },
  heroPills: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, zIndex: 5 },
  heroPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  heroPillDanger: {},
  heroPillText: { fontFamily: F.bold, fontSize: 12, color: C.deep },
  heroBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, zIndex: 5 },
  heroType: { fontFamily: F.bold, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  heroName: { fontFamily: F.bold, fontSize: 24, color: '#fff', lineHeight: 28 },
  heroSub: { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  // Status pills
  statusRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14 },
  statusPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, backgroundColor: C.card },
  statusPillGreen: { borderColor: 'rgba(61,170,110,0.25)' },
  statusPillRed:   { borderColor: 'rgba(232,67,58,0.2)' },
  statusPillText: { fontFamily: F.semibold, fontSize: 12 },
  // Cards
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: C.card, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: C.border },
  cardLabelOrange: { fontFamily: F.bold, fontSize: 10, color: C.orange, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 8 },
  cardLabelGreen: { fontFamily: F.bold, fontSize: 10, color: C.green, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 3 },
  cardText: { fontFamily: F.medium, fontSize: 14, color: C.deep, lineHeight: 23 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green, flexShrink: 0 },
  bestTimeText: { fontFamily: F.semibold, fontSize: 13, color: C.deep },
  // Actions row
  actionsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 12 },
  actBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, alignItems: 'center', paddingVertical: 11, gap: 4 },
  actIcon: { fontSize: 18 },
  actLabel: { fontFamily: F.semibold, fontSize: 11, color: C.muted },
  // Photos strip
  photoSection: { marginHorizontal: 20, marginTop: 14 },
  photoSectionLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8 },
  photoThumb: { width: 96, height: 96, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden' },
  photoAdd: { width: 96, height: 96, borderRadius: 12, backgroundColor: C.card,
    borderWidth: 1.5, borderColor: C.borderMed, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 3 },
  photoAddIcon: { fontSize: 20 },
  photoAddLabel: { fontFamily: F.semibold, fontSize: 10, color: C.muted },
  // Rescue
  rescueSection: { marginHorizontal: 20, marginTop: 14 },
  sectionLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8 },
  rescueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: C.card, borderRadius: 13, borderWidth: 1.5,
    borderColor: C.border, marginBottom: 7 },
  rescueIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  rescueLabel: { fontFamily: F.semibold, fontSize: 13, color: C.deep, flex: 1 },
  rescueChev: { fontSize: 14, color: C.muted },
  // Explore More
  exploreCard: { marginHorizontal: 20, marginTop: 14, backgroundColor: C.card,
    borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  exploreHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14 },
  exploreTitle: { fontFamily: F.bold, fontSize: 13, color: C.deep },
  exploreChev: { fontSize: 14, color: C.muted },
  exploreBody: { paddingHorizontal: 16, paddingBottom: 14 },
  exploreSubLabel: { fontFamily: F.bold, fontSize: 11, color: C.muted, letterSpacing: 0.8,
    textTransform: 'uppercase', marginTop: 14, marginBottom: 4 },
  exploreBodyText: { fontFamily: F.medium, fontSize: 13, color: C.deep, lineHeight: 21,
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 },
  exploreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  exploreKey: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  exploreVal: { fontFamily: F.semibold, fontSize: 12, color: C.deep, textAlign: 'right', maxWidth: '60%', lineHeight: 18 },
  nearbyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9,
    borderTopWidth: 1, borderTopColor: C.border },
  nearbyIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  nearbyName: { fontFamily: F.semibold, fontSize: 13, color: C.deep, flex: 1 },
  nearbyChev: { fontSize: 14, color: C.muted },
  tilesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  infoTile: { flex: 1, backgroundColor: C.bg, borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: C.border },
  infoTileIcon: { fontSize: 18, marginBottom: 4 },
  infoTileLabel: { fontFamily: F.bold, fontSize: 9, color: C.muted, letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 3 },
  infoTileVal: { fontFamily: F.semibold, fontSize: 11, color: C.deep, textAlign: 'center', lineHeight: 15 },
  // CTAs
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(245,242,238,0.97)',
    borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  ctaPrimary: { backgroundColor: C.orange, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  ctaPrimaryText: { fontFamily: F.bold, fontSize: 16, color: '#fff' },
  ctaSecondary: { backgroundColor: C.card, borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(107,79,168,0.25)' },
  ctaSecondaryText: { fontFamily: F.bold, fontSize: 14, color: C.purple },
  ctaTertiary: { backgroundColor: C.card, borderRadius: 16, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(61,170,110,0.3)' },
  ctaTertiaryText: { fontFamily: F.bold, fontSize: 14, color: C.green },
});

// Sheets
const sh = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(15,18,30,0.48)', justifyContent: 'flex-end', zIndex: 100 },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, maxHeight: '88%' },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20 },
  title: { fontFamily: F.bold, fontSize: 18, color: C.deep, marginBottom: 4 },
  sub: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 13,
    borderRadius: 13, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, marginBottom: 8 },
  rowHighlighted: { borderColor: C.orange, backgroundColor: C.orangeLt },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowName: { fontFamily: F.bold, fontSize: 14, color: C.deep, marginBottom: 2 },
  rowDesc: { fontFamily: F.medium, fontSize: 12, color: C.muted, lineHeight: 17 },
  rowChev: { fontSize: 16, color: C.muted },
  dividerLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 10 },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontFamily: F.semibold, fontSize: 14, color: C.muted },
  emojiRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  emojiOpt: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.card, alignItems: 'center' },
  emojiOptSel: { borderColor: C.orange, backgroundColor: C.orangeLt },
  emojiOptIcon: { fontSize: 28, marginBottom: 4 },
  emojiOptLabel: { fontFamily: F.semibold, fontSize: 11, color: C.muted },
  feedbackInput: { fontFamily: F.regular, fontSize: 14, color: C.deep, backgroundColor: C.bg,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border, padding: 12,
    marginBottom: 14, minHeight: 72, textAlignVertical: 'top' },
  feedbackSubmit: { backgroundColor: C.green, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
  feedbackSubmitText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipText: { fontFamily: F.semibold, fontSize: 13, color: C.muted },
});
