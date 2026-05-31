/**
 * RoamUs — Today Tab
 * Brief: roamus-today-tab-brief.md · Visual ref: roamus-today-tab-v3.html
 * Steps 1-5 complete: Pre-Day · En Route · At Stop · Visited · Day Wrap
 */

import React, { useEffect, useRef, useState } from "react";
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
      address: '111 S Michigan Ave, Chicago, IL 60603',
      dayIndex: 0, displayOrder: 1, durationMinutes: 90,
      metadata: { ticketSignal: true, anchorScore: 9, dropPriority: 1, travelMinutes: 12,
        doThisFirst: 'Head straight to the Thorne Miniature Rooms — lines build up fast after 10 AM.',
        restroomConfidence: 'Ground floor near coat check' },
      enrichment: { whyNow: 'Head straight to the Thorne Miniature Rooms — lines build up fast after 10 AM.',
        parkingNotes: 'Millennium Garage (1⁄2 block north) · $25 flat rate on weekends' },
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
      metadata: { ticketSignal: true, anchorScore: 9, dropPriority: 2, travelMinutes: 15,
        doThisFirst: 'Catch the 11 AM dolphin show — it sells out.',
        restroomConfidence: 'Multiple locations on each floor' },
      enrichment: { whyNow: 'Catch the 11 AM dolphin show — it sells out.',
        parkingNotes: 'Soldier Field South Lot · $25 · 5 min walk' },
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

  const devState = __DEV__ ? (params as Record<string, string>).state as TodayState | undefined : undefined;
  const [todayState, setTodayState]         = useState<TodayState>(
    devState === 'enroute' || devState === 'atstop' || devState === 'visited' || devState === 'daywrap'
      ? devState : 'preday'
  );
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
  const [activeSheet, setActiveSheet]       = useState<'none' | 'rescue'>('none');
  const [rescueType, setRescueType]         = useState<'behind' | 'tired' | 'skip' | 'fun'>('behind');
  const [atStopStartTime, setAtStopStartTime]   = useState<number | null>(null);
  const [markingVisited, setMarkingVisited]     = useState(false);
  const [visitedElapsed, setVisitedElapsed]     = useState<number | null>(null);
  const [kidQuotes, setKidQuotes]               = useState<Record<string, string>>({});
  const [dayRating, setDayRating]               = useState<'okay' | 'good' | 'amazing' | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [visitedPhotos, setVisitedPhotos] = useState<(string | null)[]>([null, null, null]);
  const [wrapPhotos, setWrapPhotos]       = useState<(string | null)[]>([null, null, null, null, null, null]);

  // ── Pulse animation for En Route dot ──
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (todayState !== 'enroute') { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [todayState]);

  // ── Bounce animation for Visited hero emoji ──
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (todayState !== 'visited') return;
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

  // ── Track time entering At Stop (keep through visited state so elapsed is readable) ──
  useEffect(() => {
    if (todayState === 'atstop') setAtStopStartTime(prev => prev ?? Date.now());
    else if (todayState === 'enroute' || todayState === 'preday') setAtStopStartTime(null);
  }, [todayState]);

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

  // ── Mark stop visited ──
  async function handleMarkVisited() {
    const stop = currentStop;
    if (!stop) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMarkingVisited(true);
    const elapsed = atStopStartTime ? Math.round((Date.now() - atStopStartTime) / 60000) : null;
    try {
      await apiFetch(`/api/travel/stops/${stop.id}/visit`, { method: 'POST' });
    } catch {
      // best-effort — proceed even if API fails
    }
    setMarkingVisited(false);
    setVisitedElapsed(elapsed);
    bounceAnim.setValue(0);
    setCurrentStopIndex(i => i + 1);
    setTodayState('visited');
  }

  // ── Skip / delete stop ──
  async function handleSkipStop() {
    const stop = currentStop;
    if (!stop) return;
    try {
      await apiFetch(`/api/travel/stops/${stop.id}`, { method: 'DELETE' });
    } catch {
      // best-effort
    }
    setDayStops(prev => prev.filter(s => s.id !== stop.id));
    setActiveSheet('none');
    setTodayState('enroute');
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
    } catch {
      // best-effort
    }
    setSubmittingRating(false);
  }

  async function handlePhotoSlot(source: 'visited' | 'wrap', idx: number) {
    Alert.alert(
      'Add photo',
      'Choose a source',
      [
        {
          text: '📷  Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera access is required to take photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;
              if (source === 'visited') {
                setVisitedPhotos(prev => { const next = [...prev]; next[idx] = uri; return next; });
              } else {
                setWrapPhotos(prev => { const next = [...prev]; next[idx] = uri; return next; });
              }
            }
          },
        },
        {
          text: '🖼  Photo Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Photo library access is required to pick photos.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;
              if (source === 'visited') {
                setVisitedPhotos(prev => { const next = [...prev]; next[idx] = uri; return next; });
              } else {
                setWrapPhotos(prev => { const next = [...prev]; next[idx] = uri; return next; });
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

  const currentStop = dayStops[currentStopIndex] ?? null;

  // ────────────────────────────────────────────────────────────────────────────
  // DAY WRAP
  // ────────────────────────────────────────────────────────────────────────────
  if (todayState === 'daywrap') {
    const completedStops = dayStops.slice(0, currentStopIndex > 0 ? currentStopIndex : dayStops.length);
    const totalMins      = completedStops.reduce((s, st) => s + getStopDuration(st), 0);
    const totalHrs       = Math.floor(totalMins / 60);
    const totalRem       = totalMins % 60;
    const totalStr       = totalRem > 0 ? `${totalHrs}h ${totalRem}m` : `${totalHrs}h`;
    const children       = (trip?.travelers ?? []).filter(t => !t.isParent);
    const ratingOptions: { key: 'okay' | 'good' | 'amazing'; label: string }[] = [
      { key: 'okay',    label: '😐  Okay' },
      { key: 'good',    label: '😊  Good' },
      { key: 'amazing', label: '🤩  Amazing' },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <View style={[dw.hero, { paddingTop: insets.top + 28 }]}>
            <Text style={dw.heroLabel}>
              DAY {resolvedDayIndex + 1} COMPLETE
            </Text>
            <Text style={dw.heroTheme}>
              {city} Adventure 🗺
            </Text>
            <Text style={dw.heroMeta}>
              {dayLabel}  ·  {completedStops.length} stops  ·  {totalStr}
            </Text>
            <View style={dw.heroChips}>
              {completedStops.map(s => (
                <View key={s.id} style={dw.heroChip}>
                  <Text style={dw.heroChipText}>✓  {s.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Photo grid ───────────────────────────────────────────────── */}
          <View style={dw.card}>
            <Text style={dw.cardLabel}>📸 Best photos from today</Text>
            <View style={dw.photoGrid}>
              {[0, 1, 2, 3, 4, 5].map(idx => (
                <TouchableOpacity
                  key={idx}
                  style={dw.photoSlot}
                  activeOpacity={0.7}
                  onPress={() => handlePhotoSlot('wrap', idx)}
                >
                  {wrapPhotos[idx] ? (
                    <Image source={{ uri: wrapPhotos[idx]! }} style={dw.photoImg} />
                  ) : (
                    <Text style={dw.photoPlus}>+</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={dw.photoCount}>
              {wrapPhotos.filter(Boolean).length} of 6 added · Tap to add more
            </Text>
          </View>

          {/* ── Kid quotes ───────────────────────────────────────────────── */}
          {children.length > 0 && (
            <View style={dw.card}>
              <Text style={dw.cardLabel}>💬 Kid quotes</Text>
              {children.map(kid => {
                const key = `dw-${kid.name}`;
                const prefill = Object.entries(kidQuotes).find(([k]) =>
                  dayStops.some(s => s.id === k)
                );
                return (
                  <View key={kid.name} style={dw.quoteBlock}>
                    <Text style={dw.quoteWho}>
                      {kid.name.toUpperCase()}{kid.age ? ` (AGE ${kid.age})` : ''} SAID
                    </Text>
                    <TextInput
                      style={dw.quoteInput}
                      value={kidQuotes[key] ?? (prefill ? prefill[1] : '')}
                      onChangeText={text => setKidQuotes(prev => ({ ...prev, [key]: text }))}
                      placeholder={`"Something memorable…"`}
                      placeholderTextColor={C.muted}
                      multiline
                      numberOfLines={2}
                      returnKeyType="done"
                      blurOnSubmit
                    />
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Day rating ───────────────────────────────────────────────── */}
          <View style={dw.card}>
            <Text style={dw.cardLabel}>⭐ How was today?</Text>
            <View style={dw.ratingRow}>
              {ratingOptions.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[dw.ratingBtn, dayRating === opt.key && dw.ratingBtnSel]}
                  activeOpacity={0.8}
                  onPress={() => handleRating(opt.key)}
                >
                  <Text style={[dw.ratingBtnText, dayRating === opt.key && dw.ratingBtnTextSel]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Story ready strip ────────────────────────────────────────── */}
          <View style={dw.storyStrip}>
            <Text style={dw.storyTitle}>✨ Your Day {resolvedDayIndex + 1} story is ready</Text>
            <Text style={dw.storySub}>Auto-written from your stops — tap below to see it</Text>
          </View>

          {/* ── Wrap Day CTA ─────────────────────────────────────────────── */}
          <TouchableOpacity
            style={dw.wrapBtn}
            activeOpacity={0.85}
            onPress={async () => {
              try {
                await apiFetch(`/api/travel/trips/${trip?.id}/complete-day`, { method: 'POST' });
              } catch {
                // best-effort
              }
              router.push('/(tabs)/memories' as never);
            }}
          >
            <Text style={dw.wrapBtnText}>🎬  Wrap Day {resolvedDayIndex + 1} — see your story</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VISITED
  // ────────────────────────────────────────────────────────────────────────────
  if (todayState === 'visited') {
    // The stop just visited is the one BEFORE currentStopIndex (since we advanced on Done)
    const visitedStop = dayStops[currentStopIndex - 1] ?? dayStops[0];
    const nextStop    = currentStop; // dayStops[currentStopIndex] — null if last stop
    const isLastStop  = !nextStop || currentStopIndex >= dayStops.length;
    const firstKid    = (trip?.travelers ?? []).find(t => !t.isParent);
    const quoteKey    = visitedStop?.id ?? 'stop';
    const quoteHolder = firstKid ? `"That was amazing!" — ${firstKid.name}` : '"That was amazing!"';

    const bounceScale = bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <View style={[vi.hero, { paddingTop: insets.top + 24 }]}>
            <Animated.Text style={[vi.heroEmoji, { transform: [{ scale: bounceScale }] }]}>
              🎉
            </Animated.Text>
            <Text style={vi.heroTitle}>Stop done!</Text>
            <Text style={vi.heroSub}>{visitedStop?.name ?? ''}</Text>
            {visitedElapsed != null && (
              <View style={vi.elapsedPill}>
                <Text style={vi.elapsedText}>⏱  {visitedElapsed} min here</Text>
              </View>
            )}
          </View>

          {/* ── Kid quote card ───────────────────────────────────────────── */}
          <View style={vi.card}>
            <Text style={vi.cardLabel}>💬 What did the kids say?</Text>
            <TextInput
              style={vi.quoteInput}
              value={kidQuotes[quoteKey] ?? ''}
              onChangeText={text => setKidQuotes(prev => ({ ...prev, [quoteKey]: text }))}
              placeholder={quoteHolder}
              placeholderTextColor={C.muted}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              blurOnSubmit
            />
          </View>

          {/* ── Quick photo card ─────────────────────────────────────────── */}
          <View style={vi.card}>
            <Text style={vi.cardLabel}>📸 Quick snap</Text>
            <View style={vi.photoRow}>
              {[0, 1, 2].map(idx => (
                <TouchableOpacity
                  key={idx}
                  style={vi.photoSlot}
                  activeOpacity={0.7}
                  onPress={() => handlePhotoSlot('visited', idx)}
                >
                  {visitedPhotos[idx] ? (
                    <Image source={{ uri: visitedPhotos[idx]! }} style={vi.photoImg} />
                  ) : (
                    <Text style={vi.photoPlus}>+</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Next stop / last stop card ───────────────────────────────── */}
          {isLastStop ? (
            <View style={vi.card}>
              <Text style={vi.celebText}>🎊 That's all for today!</Text>
              <TouchableOpacity
                style={vi.wrapBtn}
                activeOpacity={0.85}
                onPress={() => setTodayState('daywrap')}
              >
                <Text style={vi.wrapBtnText}>Wrap up Day {resolvedDayIndex + 1} →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={vi.card}>
              <Text style={vi.cardLabel}>NEXT UP</Text>
              <Text style={vi.nextStopName}>{nextStop!.name}</Text>
              <Text style={vi.nextStopMeta}>
                {nextStop!.stopType
                  ? nextStop!.stopType.charAt(0).toUpperCase() + nextStop!.stopType.slice(1)
                  : 'Stop'
                }
                {' · '}~{parseMetadata(nextStop!.metadata).travelMinutes ?? 15} min away
              </Text>
              <TouchableOpacity
                style={vi.headThereBtn}
                activeOpacity={0.85}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTodayState('enroute');
                }}
              >
                <Text style={vi.headThereBtnText}>Head there →</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // AT STOP
  // ────────────────────────────────────────────────────────────────────────────
  if (todayState === 'atstop') {
    const stop = currentStop;
    if (!stop) {
      return (
        <View style={[misc.center, { paddingTop: insets.top }]}>
          <Text style={misc.errorText}>No current stop.</Text>
          <Pressable style={misc.stubBtn} onPress={() => setTodayState('preday')}>
            <Text style={misc.stubBtnText}>← Back</Text>
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
        sub: 'Here\'s how we can catch up',
        options: [
          { icon: '⚡', label: 'Tighten travel gaps', sub: 'Cut buffer between stops', onPress: () => setActiveSheet('none') },
          { icon: '✂️', label: 'Shorten this stop', sub: 'Do the highlights in 45 min', onPress: () => setActiveSheet('none') },
          { icon: '⏭', label: 'Skip this stop', sub: 'Move to the next one', onPress: handleSkipStop },
        ],
      },
      tired: {
        title: 'Kids running low?',
        sub: 'Let\'s give everyone a break',
        options: [
          { icon: '☕', label: 'Find a nearby cafe', onPress: () => {
            Linking.openURL('https://www.google.com/maps/search/' + encodeURIComponent('cafe near ' + address));
            setActiveSheet('none');
          }},
          { icon: '🌳', label: 'Quick outdoor break', onPress: () => {
            Linking.openURL('https://www.google.com/maps/search/' + encodeURIComponent('park near ' + address));
            setActiveSheet('none');
          }},
          { icon: '🏠', label: 'Head back early', onPress: () => { setActiveSheet('none'); setTodayState('daywrap'); } },
        ],
      },
      skip: {
        title: 'Skip this stop?',
        sub: 'We\'ll keep the rest of your day',
        options: [
          { icon: '⏭', label: 'Skip, go to next', onPress: handleSkipStop },
          { icon: '🔄', label: 'Replace with something', sub: 'Coming soon', onPress: () => {
            Alert.alert('Coming soon', 'Replace stop is coming in the next update.');
          }},
          { icon: '🏠', label: 'Wrap up for the day', onPress: () => { setActiveSheet('none'); setTodayState('daywrap'); } },
        ],
      },
      fun: {
        title: 'Need more excitement?',
        sub: 'Let\'s turn it up',
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

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <LinearGradient
            colors={['#133020', '#1f5038', '#2d7a52']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[as.hero, { paddingTop: insets.top + 20 }]}
          >
            <View style={as.heroBadge}>
              <View style={as.heroDot} />
              <Text style={as.heroBadgeText}>YOU'RE HERE</Text>
            </View>

            <Text style={as.stopName} numberOfLines={2}>{stop.name}</Text>
            <Text style={as.stopSub}>
              Stop {currentStopIndex + 1} of {dayStops.length} · {planned} min planned
            </Text>

            <View style={as.timerPill}>
              <Text style={as.timerText}>⏱  {planned} min</Text>
            </View>
          </LinearGradient>

          {/* ── Do This First ────────────────────────────────────────────── */}
          {doFirst && (
            <View style={as.doFirstCard}>
              <View style={as.doFirstIcon}>
                <Text style={{ fontSize: 18 }}>⭐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={as.doFirstLabel}>DO THIS FIRST</Text>
                <Text style={as.doFirstText}>{doFirst}</Text>
              </View>
            </View>
          )}

          {/* ── Done here CTA ────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[as.doneBtn, markingVisited && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleMarkVisited}
            disabled={markingVisited}
          >
            {markingVisited
              ? <ActivityIndicator color="#fff" />
              : <Text style={as.doneBtnText}>✓  Done here</Text>
            }
          </TouchableOpacity>

          {/* ── Need Help? rescue section ─────────────────────────────────── */}
          <View style={as.rescueSection}>
            <Text style={as.rescueLabel}>NEED HELP?</Text>
            {([
              { type: 'behind' as const, icon: '⏩', label: 'Running behind' },
              { type: 'tired'  as const, icon: '😴', label: 'Kids are tired' },
              { type: 'skip'   as const, icon: '⏭', label: 'Skip this stop' },
              { type: 'fun'    as const, icon: '🎉', label: 'Need more fun' },
            ]).map(item => (
              <TouchableOpacity
                key={item.type}
                style={as.rescueRow}
                activeOpacity={0.75}
                onPress={() => { setRescueType(item.type); setActiveSheet('rescue'); }}
              >
                <Text style={as.rescueIcon}>{item.icon}</Text>
                <Text style={as.rescueRowText}>{item.label}</Text>
                <Text style={as.rescueChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Let Kids Explore ─────────────────────────────────────────── */}
          <TouchableOpacity
            style={as.kidsBtn}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/(tabs)/atstop', params: { mode: 'kids', stopId: stop.id } })}
          >
            <Text style={as.kidsBtnText}>🧭  Let kids explore</Text>
          </TouchableOpacity>

        </ScrollView>

        {/* ── RescueSheet backdrop ─────────────────────────────────────────── */}
        <Animated.View
          pointerEvents={activeSheet !== 'none' ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.46)', opacity: backdropOpacity }]}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setActiveSheet('none')} />
        </Animated.View>

        {/* ── RescueSheet panel ────────────────────────────────────────────── */}
        <Animated.View style={[as.sheet, { transform: [{ translateY: sheetTranslate }] }]}>
          <View style={as.sheetHandle} />
          <Text style={as.sheetTitle}>{sheet.title}</Text>
          <Text style={as.sheetSub}>{sheet.sub}</Text>

          {sheet.options.map((opt, i) => (
            <TouchableOpacity key={i} style={as.sheetRow} activeOpacity={0.75} onPress={opt.onPress}>
              <View style={as.sheetRowIcon}>
                <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={as.sheetRowLabel}>{opt.label}</Text>
                {opt.sub && <Text style={as.sheetRowSub}>{opt.sub}</Text>}
              </View>
              <Text style={as.sheetChevron}>›</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={as.sheetDismiss} onPress={() => setActiveSheet('none')}>
            <Text style={as.sheetDismissText}>Never mind</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // EN ROUTE
  // ────────────────────────────────────────────────────────────────────────────
  if (todayState === 'enroute') {
    const stop = currentStop;
    if (!stop) {
      return (
        <View style={[misc.center, { paddingTop: insets.top }]}>
          <Text style={misc.errorText}>No stop to navigate to.</Text>
          <Pressable style={misc.stubBtn} onPress={() => setTodayState('preday')}>
            <Text style={misc.stubBtnText}>← Back</Text>
          </Pressable>
        </View>
      );
    }
    const meta       = parseMetadata(stop.metadata);
    const doFirst    = stop.enrichment?.whyNow ?? meta.doThisFirst;
    const parking    = stop.enrichment?.parkingNotes ?? null;
    const restrooms  = meta.restroomConfidence ?? null;
    const travelMins = meta.travelMinutes;
    const stopLabel  = stop.stopType
      ? stop.stopType.charAt(0).toUpperCase() + stop.stopType.slice(1)
      : 'Stop';
    const afterStops = dayStops.slice(currentStopIndex + 1);

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <LinearGradient
            colors={['#0f2a4a', '#1a4a7a', '#2563a8']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[er.hero, { paddingTop: insets.top + 20 }]}
          >
            {/* Heading badge with pulsing dot */}
            <View style={er.headingBadge}>
              <Animated.View style={[er.headingDot, { opacity: pulseAnim }]} />
              <Text style={er.headingText}>HEADING THERE</Text>
            </View>

            <Text style={er.stopName} numberOfLines={2}>{stop.name}</Text>
            <Text style={er.stopSub}>
              Stop {currentStopIndex + 1} of {dayStops.length} · {stopLabel}
            </Text>

            {/* ETA pills */}
            <View style={er.etaRow}>
              <View style={er.etaPill}>
                <Text style={er.etaIcon}>🚗</Text>
                <View>
                  <Text style={er.etaVal}>{travelMins ? `~${travelMins} min` : '~12 min'}</Text>
                  <Text style={er.etaLbl}>ETA</Text>
                </View>
              </View>
              <View style={er.etaPill}>
                <Text style={er.etaIcon}>📍</Text>
                <View>
                  <Text style={er.etaVal}>~3 mi</Text>
                  <Text style={er.etaLbl}>Away</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* ── Let Kids Explore strip ──────────────────────────────────── */}
          <TouchableOpacity
            style={er.kidsStrip}
            activeOpacity={0.85}
            onPress={() => router.push({
              pathname: '/(tabs)/atstop',
              params: { mode: 'kids', stopId: stop.id },
            })}
          >
            <View style={er.kidsIcon}>
              <Text style={{ fontSize: 20 }}>🧭</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={er.kidsTitle}>Let kids explore</Text>
              <Text style={er.kidsSub}>Missions for the ride over</Text>
            </View>
            <Text style={er.kidsArrow}>›</Text>
          </TouchableOpacity>

          {/* ── Do This First ───────────────────────────────────────────── */}
          {!!doFirst && (
            <View style={er.infoCard}>
              <Text style={er.infoCardLabel}>DO THIS FIRST</Text>
              <Text style={er.infoCardText}>{doFirst}</Text>
            </View>
          )}

          {/* ── Parking / Restrooms 2-col ───────────────────────────────── */}
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

          {/* ── I'm Here button ─────────────────────────────────────────── */}
          <TouchableOpacity
            style={er.imHereBtn}
            activeOpacity={0.85}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setTodayState('atstop');
            }}
          >
            <Text style={er.imHereText}>📍  I'm here — we arrived</Text>
          </TouchableOpacity>

          {/* ── After This ──────────────────────────────────────────────── */}
          {afterStops.length > 0 && (
            <View style={er.afterSection}>
              <Text style={er.afterLabel}>AFTER THIS</Text>
              {afterStops.map((s, idx) => (
                <View key={s.id} style={er.afterRow}>
                  <View style={er.afterNum}>
                    <Text style={er.afterNumText}>{currentStopIndex + 2 + idx}</Text>
                  </View>
                  <Text style={er.afterName} numberOfLines={1}>{s.name}</Text>
                  {hasTicketSignal(s.metadata) && (
                    <View style={er.afterTicket}>
                      <Text style={er.afterTicketText}>🎫</Text>
                    </View>
                  )}
                  <Text style={er.afterDur}>{getStopDuration(s)} min</Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
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

const er = StyleSheet.create({
  // Hero
  hero:         { paddingHorizontal: 24, paddingBottom: 28 },
  headingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  headingDot:  { width: 7, height: 7, backgroundColor: '#60d8a4', borderRadius: 4 },
  headingText: { fontFamily: F.bold, fontSize: 11, color: '#fff', letterSpacing: 0.6 },
  stopName:    { fontFamily: F.bold, fontSize: 28, color: '#fff', lineHeight: 32, marginBottom: 4 },
  stopSub:     { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 20 },
  etaRow:      { flexDirection: 'row', gap: 10 },
  etaPill:     {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  etaIcon:     { fontSize: 18 },
  etaVal:      { fontFamily: F.bold, fontSize: 16, color: '#fff', lineHeight: 18 },
  etaLbl:      { fontFamily: F.semibold, fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  // Kids Explore strip
  kidsStrip: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: C.purpleLt, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(107,79,168,0.18)',
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  kidsIcon:  {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center',
  },
  kidsTitle: { fontFamily: F.bold, fontSize: 14, color: C.purple, marginBottom: 2 },
  kidsSub:   { fontFamily: F.medium, fontSize: 12, color: 'rgba(107,79,168,0.7)' },
  kidsArrow: { fontSize: 22, color: C.purple, opacity: 0.5 },

  // Info cards
  infoCard: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  infoCardLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8 },
  infoCardText:  { fontFamily: F.semibold, fontSize: 14, color: C.deep, lineHeight: 20 },

  // 2-col parking/restrooms
  twoCol:    { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 10 },
  halfCard:  {
    flex: 1, backgroundColor: C.card, borderRadius: 13, padding: 13,
    borderWidth: 1, borderColor: C.border,
  },
  halfLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 0.8, marginBottom: 4 },
  halfVal:   { fontFamily: F.semibold, fontSize: 12, color: C.deep, lineHeight: 16 },

  // I'm here button
  imHereBtn: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: C.card, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', borderWidth: 2, borderColor: C.blue,
  },
  imHereText: { fontFamily: F.bold, fontSize: 15, color: C.blue },

  // After this
  afterSection: { paddingHorizontal: 20, paddingTop: 20 },
  afterLabel:   { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 },
  afterRow:     {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, marginBottom: 6,
  },
  afterNum:        {
    width: 24, height: 24, borderRadius: 12, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  afterNumText:    { fontFamily: F.bold, fontSize: 11, color: C.muted },
  afterName:       { fontFamily: F.semibold, fontSize: 13, color: C.deep, flex: 1 },
  afterTicket:     { backgroundColor: C.redLt, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  afterTicketText: { fontSize: 10 },
  afterDur:        { fontFamily: F.medium, fontSize: 12, color: C.muted },
});

const as = StyleSheet.create({
  // Hero
  hero:          { paddingHorizontal: 24, paddingBottom: 28 },
  heroBadge:     {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  heroDot:       { width: 7, height: 7, backgroundColor: '#60d8a4', borderRadius: 4 },
  heroBadgeText: { fontFamily: F.bold, fontSize: 11, color: '#fff', letterSpacing: 0.6 },
  stopName:      { fontFamily: F.bold, fontSize: 28, color: '#fff', lineHeight: 32, marginBottom: 4 },
  stopSub:       { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 18 },
  timerPill:     {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  timerText:     { fontFamily: F.semibold, fontSize: 13, color: '#fff' },

  // Do This First
  doFirstCard: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: C.greenLt, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(61,170,110,0.2)',
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  doFirstIcon:  {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#c5edda', alignItems: 'center', justifyContent: 'center',
  },
  doFirstLabel: { fontFamily: F.bold, fontSize: 10, color: C.green, letterSpacing: 1, marginBottom: 4 },
  doFirstText:  { fontFamily: F.semibold, fontSize: 13, color: C.deep, lineHeight: 18 },

  // Done here CTA
  doneBtn: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: C.green, borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: C.green, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  doneBtnText: { fontFamily: F.bold, fontSize: 16, color: '#fff' },

  // Rescue section
  rescueSection: { paddingHorizontal: 20, paddingTop: 20 },
  rescueLabel:   { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 },
  rescueRow:     {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: C.border,
  },
  rescueIcon:     { fontSize: 20, width: 26, textAlign: 'center' },
  rescueRowText:  { fontFamily: F.semibold, fontSize: 14, color: C.deep, flex: 1 },
  rescueChevron:  { fontSize: 22, color: C.muted },

  // Let Kids Explore button
  kidsBtn: {
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: C.purpleLt, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(107,79,168,0.18)',
  },
  kidsBtnText: { fontFamily: F.bold, fontSize: 15, color: C.purple },

  // RescueSheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  sheetHandle:      {
    width: 40, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle:       { fontFamily: F.bold, fontSize: 20, color: C.deep, marginBottom: 4 },
  sheetSub:         { fontFamily: F.medium, fontSize: 13, color: C.muted, marginBottom: 20 },
  sheetRow:         {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.bg, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  sheetRowIcon:     {
    width: 40, height: 40, borderRadius: 12, backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  sheetRowLabel:    { fontFamily: F.semibold, fontSize: 14, color: C.deep },
  sheetRowSub:      { fontFamily: F.medium, fontSize: 12, color: C.muted, marginTop: 1 },
  sheetChevron:     { fontSize: 22, color: C.muted },
  sheetDismiss:     { alignItems: 'center', paddingVertical: 14, marginTop: 2 },
  sheetDismissText: { fontFamily: F.semibold, fontSize: 14, color: C.muted },
});

const vi = StyleSheet.create({
  // Hero
  hero: {
    backgroundColor: C.orange,
    paddingHorizontal: 24, paddingBottom: 32,
    alignItems: 'center',
  },
  heroEmoji:   { fontSize: 56, marginBottom: 10 },
  heroTitle:   { fontFamily: F.bold, fontSize: 28, color: '#fff', marginBottom: 6 },
  heroSub:     { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 14 },
  elapsedPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  elapsedText: { fontFamily: F.semibold, fontSize: 13, color: '#fff' },

  // Cards
  card: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: C.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: C.border,
  },
  cardLabel:  { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 12 },

  // Quote input
  quoteInput: {
    fontFamily: F.regular, fontSize: 14, color: C.deep,
    backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    padding: 12, minHeight: 70, textAlignVertical: 'top',
  },

  // Photo slots
  photoRow:  { flexDirection: 'row', gap: 10 },
  photoSlot: {
    flex: 1, aspectRatio: 1,
    backgroundColor: C.bg, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  photoPlus: { fontSize: 24, color: C.muted },
  photoImg:  { width: '100%', height: '100%', borderRadius: 10 },

  // Next stop card
  nextStopName: { fontFamily: F.bold, fontSize: 18, color: C.deep, marginBottom: 4 },
  nextStopMeta: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginBottom: 16 },
  headThereBtn: {
    backgroundColor: C.orange, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  headThereBtnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },

  // Last stop / Wrap up
  celebText: { fontFamily: F.bold, fontSize: 20, color: C.deep, textAlign: 'center', marginBottom: 16 },
  wrapBtn: {
    backgroundColor: C.deep, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  wrapBtnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
});

const dw = StyleSheet.create({
  // Hero
  hero: {
    backgroundColor: C.deep,
    paddingHorizontal: 24, paddingBottom: 28,
  },
  heroLabel: {
    fontFamily: F.bold, fontSize: 11, color: C.orange,
    letterSpacing: 1.2, marginBottom: 10,
  },
  heroTheme: {
    fontFamily: F.bold, fontSize: 26, color: '#fff',
    lineHeight: 30, marginBottom: 6,
  },
  heroMeta: {
    fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 18,
  },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  heroChipText: { fontFamily: F.semibold, fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  // Cards
  card: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: C.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: C.border,
  },
  cardLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 12 },

  // Photo grid
  photoGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlot:  {
    width: '31%', aspectRatio: 1,
    backgroundColor: C.bg, borderRadius: 10, borderWidth: 1.5,
    borderColor: C.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  photoPlus:  { fontSize: 22, color: C.muted },
  photoImg:   { width: '100%', height: '100%', borderRadius: 8 },
  photoCount: { fontFamily: F.medium, fontSize: 12, color: C.muted, marginTop: 10, textAlign: 'center' },

  // Kid quotes
  quoteBlock: { marginBottom: 14 },
  quoteWho:   { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 0.8, marginBottom: 6 },
  quoteInput: {
    fontFamily: F.regular, fontSize: 14, color: C.deep,
    backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    padding: 12, minHeight: 56, textAlignVertical: 'top',
  },

  // Rating
  ratingRow:        { flexDirection: 'row', gap: 8 },
  ratingBtn:        {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.bg, alignItems: 'center',
  },
  ratingBtnSel:     { borderColor: C.orange, backgroundColor: C.orangeLt },
  ratingBtnText:    { fontFamily: F.semibold, fontSize: 13, color: C.deep },
  ratingBtnTextSel: { color: C.orange },

  // Story strip
  storyStrip: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: C.orangeLt, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(232,105,42,0.2)',
  },
  storyTitle: { fontFamily: F.bold, fontSize: 15, color: C.orange, marginBottom: 4 },
  storySub:   { fontFamily: F.medium, fontSize: 13, color: 'rgba(232,105,42,0.75)' },

  // Wrap CTA
  wrapBtn: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: C.deep, borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  wrapBtnText: { fontFamily: F.bold, fontSize: 16, color: '#fff' },
});
