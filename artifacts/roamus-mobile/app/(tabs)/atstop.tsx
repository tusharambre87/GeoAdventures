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

const TAB_BAR_H = 49;

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  LayoutAnimation,
  Linking,
  PanResponder,
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
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE, getMyPlayers, PlayerRecord } from '@/lib/apiClient';
import { F, CITY_IMGS } from '@/lib/tokens';
import StopPickerSheet from '@/components/StopPickerSheet';
import { useAuth } from '@/lib/authContext';
import { isFreePlan } from '@/lib/subscription';
import UpgradeSheet from '@/components/UpgradeSheet';
import { useSpeech } from '@/lib/useSpeech';
import { SpeakButton } from '@/components/SpeakButton';
import RescueSheet from '@/components/RescueSheet';
import KidPickerScreen, { getAgeBand, PickedKid } from '@/components/KidPickerScreen';

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
  park: '\uD83C\uDF33', museum: '\uD83C\uDFDB', zoo: '\uD83E\uDD81', landmark: '\uD83D\uDDFA\uFE0F',
  shopping: '\uD83D\uDECD', nature: '\uD83C\uDFD4', culture: '\uD83C\uDFAD', meal: '\uD83C\uDF7D', default: '\uD83D\uDCCD',
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
  imageUrl?: string | null;
};

type StopEnrichment = {
  whyNow?: string;
  whyItWorks?: string;
  parkingNotes?: string;
  bathroomNotes?: string;
  bestTimeOfDay?: string;
  practicalTips?: string | string[];
  strollerFriendly?: boolean;
  keepGoingSuggestion?: string;
  priceRange?: string;
  bookingRequired?: boolean;
  bookingUrl?: string;
};

type PlaceProfileData = {
  whyItWorks?: string;
  bathroomNotes?: string;
  foodOptions?: string;
  parkingNotes?: string;
  bestTimeOfDay?: string;
  strollerFriendly?: boolean;
  practicalTips?: string | string[];
  nearbyStops?: Array<{ name: string; distance: string; description: string; agesNote?: string; type: string } | string>;
};

type PlaceReferenceData = {
  openingHours?: string;
  priceRange?: string;
  bookingRequired?: boolean;
  bookingUrl?: string;
  directionsNote?: string;
};

type ParentSupportData = {
  keepGoingSuggestion?: string;
  breakSuggestion?: string;
  foodSuggestion?: string;
  moreFunSuggestion?: string;
  shortenSuggestion?: string;
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
  cityGroup?: string | null;
  openingHours?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  minAge?: number | null;
  enrichment?: StopEnrichment | null;
  metadata?: StopMetadata | null;
  placeProfileData?: PlaceProfileData | null;
  placeReferenceData?: PlaceReferenceData | null;
  parentSupportData?: ParentSupportData | null;
};

type TripData = {
  id: string;
  name: string;
  status: string;
  destination?: string | null;
  city?: string | null;
  country?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  plannerTripDays?: number | null;
  tripDays?: number | null;
  currentDayIndex?: number | null;
  accommodationAddress?: string | null;
  stops: Stop[];
  travelers?: Array<{ name: string; type?: string; id?: string }> | null;
};

type AtStopMode     = 'loading' | 'noTrip' | 'picker' | 'detail';
type ActiveSheet    = 'none' | 'change' | 'didnt' | 'feedback' | 'rescue' | 'food' | 'break' | 'kidExtras' | 'mealFeedback';
type RescueType     = 'behind' | 'tired' | 'skip' | 'fun';
type FeedbackRating = 'big_hit' | 'good' | 'skip_next_time';
type FoodPlace      = { id: string; name: string; cuisine: string; lat: number; lon: number };
type ExtraPlace     = { name: string; distance: string; description: string; stopType: string; ages?: string };
type Moment         = { id: string; photoUrl: string | null; photoUrls?: string[] | null };

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

function parseEnrichment(raw: Stop['enrichment']): StopEnrichment {
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return raw as StopEnrichment;
}

function isStopVisited(s: Stop): boolean { return !!(s.isVisited || s.visited); }

/** Parse a date string as LOCAL midnight (strips time/timezone so UTC offset never shifts the date). */
function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const ymd = s.split('T')[0].split('-').map(Number);
  if (ymd.length !== 3 || ymd.some(isNaN)) return new Date(s);
  return new Date(ymd[0], ymd[1] - 1, ymd[2]);
}

function formatDayDate(trip: TripData, di: number): string {
  if (!trip.startDate) return '';
  try {
    const d = parseLocalDate(trip.startDate)!; d.setDate(d.getDate() + di);
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

const WIKI_AMBIGUOUS = ['bridge','zoo','park','museum','garden','library','center','centre','aquarium','monument','memorial','falls'];

const WIKI_TITLE_OVERRIDES: Record<string, string> = {
  'Como Zoo': 'Como_Park_Zoo_and_Conservatory',
  'Stone Arch Bridge': 'Stone_Arch_Bridge_(Minneapolis)',
  'The Stone Arch Bridge': 'Stone_Arch_Bridge_(Minneapolis)',
  'St. Louis Zoo': 'Saint_Louis_Zoo',
  'Saint Louis Zoo': 'Saint_Louis_Zoo',
};

const WIKI_URL_OVERRIDES: Record<string, string> = {
  'Como Park Zoo & Conservatory':        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Como_Park_Zoo_and_Conservatory-2006.jpg/800px-Como_Park_Zoo_and_Conservatory-2006.jpg',
  'Como Park Zoo and Conservatory':      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Como_Park_Zoo_and_Conservatory-2006.jpg/800px-Como_Park_Zoo_and_Conservatory-2006.jpg',
  "Children's Theatre Company":          "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Children%27s_Theatre_Company.jpg/800px-Children%27s_Theatre_Company.jpg",
  "The Children's Theatre Company":      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Children%27s_Theatre_Company.jpg/800px-Children%27s_Theatre_Company.jpg",
  'Stone Arch Bridge':                   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Mill_City_Museum_20_view_of_Stone_Arch_bridge.jpg/800px-Mill_City_Museum_20_view_of_Stone_Arch_bridge.jpg',
  'The Stone Arch Bridge':               'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Mill_City_Museum_20_view_of_Stone_Arch_bridge.jpg/800px-Mill_City_Museum_20_view_of_Stone_Arch_bridge.jpg',
};

function buildWikiTitle(stopName: string, city?: string): string {
  const base = stopName.replace(/\s+/g, '_');
  if (!city) return base;
  const isAmbiguous = WIKI_AMBIGUOUS.some(t => stopName.toLowerCase().includes(t));
  return isAmbiguous ? `${base},_${city.replace(/\s+/g, '_')}` : base;
}

async function fetchWikiThumbnail(title: string): Promise<string | null> {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!res.ok) return null;
    const d = (await res.json()) as { thumbnail?: { source: string } };
    return d.thumbnail?.source ?? null;
  } catch { return null; }
}

async function fetchWikiImages(name: string, city?: string): Promise<string[]> {
  try {
    // Check direct URL overrides first — avoids wrong Wikipedia page for known stops
    const directUrl = WIKI_URL_OVERRIDES[name];
    if (directUrl) {
      console.log('[fetchWikiImages] direct URL override:', name);
      return [directUrl];
    }
    // Check hardcoded title overrides — bypasses the generic title-building logic
    const override = WIKI_TITLE_OVERRIDES[name];
    if (override) {
      console.log('[fetchWikiImages] override:', override);
      const url = await fetchWikiThumbnail(override);
      if (url) return [url];
    }

    const titleWithCity = buildWikiTitle(name, city);
    const titleOnly = name.replace(/\s+/g, '_');
    console.log('[fetchWikiImages] trying:', decodeURIComponent(titleWithCity));
    const q = encodeURIComponent(titleWithCity);
    const qFallback = encodeURIComponent(titleOnly);
    const [sumRes, mediaRes] = await Promise.all([
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${q}`),
      fetch(`https://en.wikipedia.org/api/rest_v1/page/media-list/${q}`),
    ]);
    const results: string[] = [];
    if (sumRes.ok) {
      const d = (await sumRes.json()) as { thumbnail?: { source: string } };
      if (d.thumbnail?.source) {
        console.log('[fetchWikiImages] hero hit:', d.thumbnail.source);
        results.push(d.thumbnail.source);
      } else if (city && titleWithCity !== titleOnly) {
        // Fallback: try plain stop name without city suffix
        console.log('[fetchWikiImages] fallback without city:', titleOnly);
        const r2 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${qFallback}`);
        if (r2.ok) {
          const d2 = (await r2.json()) as { thumbnail?: { source: string } };
          if (d2.thumbnail?.source) {
            console.log('[fetchWikiImages] hit without city:', d2.thumbnail.source);
            results.push(d2.thumbnail.source);
          }
        }
      }
    }
    if (mediaRes.ok) {
      type MI = { type: string; srcset?: { src: string }[]; src?: string };
      const d = (await mediaRes.json()) as { items?: MI[] };
      const extra = (d.items ?? [])
        .filter(i => i.type === 'image')
        .map(i => { const s = i.srcset?.[0]?.src ?? i.src ?? ''; return s.startsWith('//') ? 'https:' + s : s; })
        .filter(s => s && !/icon|logo|silhouette|map|flag|seal|coat|symbol/i.test(s));
      results.push(...extra);
    }
    return [...new Set(results)].filter(Boolean).slice(0, 3);
  } catch { return []; }
}

async function loadFoodNearby(address: string, stopLat?: string | null, stopLon?: string | null): Promise<FoodPlace[]> {
  try {
    let lat: string, lon: string;
    if (stopLat && stopLon) {
      lat = stopLat; lon = stopLon;
    } else {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'RoamUsApp/1.0' } }
      );
      const geoData = (await geoRes.json()) as Array<{ lat: string; lon: string }>;
      if (!geoData[0]) return [];
      lat = geoData[0].lat; lon = geoData[0].lon;
    }
    const query = `[out:json][timeout:10];node["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](around:600,${lat},${lon});out 8;`;
    const ovRes = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const ovData = (await ovRes.json()) as { elements?: Array<{ id: number; lat: number; lon: number; tags?: Record<string,string> }> };
    return (ovData.elements ?? [])
      .filter(e => e.tags?.name)
      .slice(0, 5)
      .map(e => ({ id: String(e.id), name: e.tags!.name!, cuisine: e.tags?.cuisine ?? e.tags?.amenity ?? 'restaurant', lat: e.lat, lon: e.lon }));
  } catch { return []; }
}

function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function ticketUrl(name: string, bookingUrl?: string | null): string {
  if (bookingUrl) return bookingUrl;
  return `https://www.google.com/search?q=${encodeURIComponent(name + ' tickets')}`;
}

function formatOpenStatus(hours?: string | null): string {
  if (!hours) return 'Open now';
  // If it's already a short "H:MM AM – H:MM PM" or "HH:MM–HH:MM" style string, show as-is
  const trimmed = hours.trim();
  if (trimmed.length < 30) return trimmed;
  // Multi-day string — try to extract today's hours
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today = days[new Date().getDay()];
  const re = new RegExp(today + '[^:]*:\s*([^,;\n]+)', 'i');
  const m = trimmed.match(re);
  if (m) return m[1].trim();
  // Fallback: return first segment
  const seg = trimmed.split(/[,;\n]/)[0].replace(/^[A-Za-z]+[–-][A-Za-z]+:\s*/, '').trim();
  return seg || 'Open now';
}

function mapsDirectionsUrl(stop: Stop): string {
  const lat = stop.latitude ? parseFloat(stop.latitude) : null;
  const lon = stop.longitude ? parseFloat(stop.longitude) : null;
  if (lat && lon) {
    // Platform.select is called at render time; we return both keys here
    return `${lat},${lon}`;
  }
  return encodeURIComponent(stop.address ?? stop.name);
}

// ─── SheetModal ───────────────────────────────────────────────────────────────

function SheetModal({ visible, onClose, children }: {
  visible: boolean; onClose: () => void; children: React.ReactNode;
}) {
  const sheetInsets = useSafeAreaInsets();
  const anim    = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderRelease:       (_, g) => { if (g.dy > 60) onCloseRef.current(); },
    })
  ).current;
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
        paddingBottom: TAB_BAR_H + sheetInsets.bottom + 20,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }],
      }]}>
        <View {...pan.panHandlers} style={sh.handle} />
        {children}
      </Animated.View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AtStopScreen() {
  const insets = useSafeAreaInsets();
  const { speak, isSpeaking } = useSpeech();
  const params = useLocalSearchParams<{ stopId?: string; mode?: string }>();
  const devMode = __DEV__ ? (params.mode as AtStopMode | undefined) : undefined;

  // ── Core state ──
  const [mode, setMode]               = useState<AtStopMode>(devMode ?? 'loading');
  const [trip, setTrip]               = useState<TripData | null>(null);
  const [currentStop, setCurrentStop] = useState<Stop | null>(null);
  const [dayStops, setDayStops]       = useState<Stop[]>([]);
  const [dayIndex, setDayIndex]       = useState(0);
  const [prevDayStops, setPrevDayStops] = useState<Stop[]>([]);
  const [prevDayFeedbackDone, setPrevDayFeedbackDone] = useState(false);
  const [loadErr, setLoadErr]         = useState<string | null>(null);

  // ── Detail state ──
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [kidPlayerId, setKidPlayerId] = useState('');
  const [kidPlayers, setKidPlayers]   = useState<PlayerRecord[]>([]);
  const [kidPickerVisible, setKidPickerVisible] = useState(false);
  const [stopImages, setStopImages]     = useState<(string | null)[]>([null, null, null]);
  const [activeSheet, setActiveSheet]   = useState<ActiveSheet>('none');
  const [rescueType, setRescueType]     = useState<RescueType>('behind');
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating>('good');
  const [feedbackText, setFeedbackText]     = useState('');
  const [exploreOpen, setExploreOpen]       = useState(false);
  const [atStopFrozen, setAtStopFrozen]      = useState(false);
  // Read durable frozen state from AsyncStorage on every focus (handles lazy mount)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('atStopFrozen').then(v => setAtStopFrozen(v === 'true'));
    }, []),
  );
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) =>
        Platform.OS === 'ios' ? (
          <SymbolView
            name={focused ? 'location.fill' : 'location'}
            tintColor={atStopFrozen ? '#3B82F6' : color}
            size={24}
          />
        ) : (
          <Ionicons
            name='location-outline'
            size={22}
            color={atStopFrozen ? '#3B82F6' : color}
          />
        ),
    });
  }, [navigation, atStopFrozen]);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackInputFocused, setFeedbackInputFocused] = useState(false);
  const [foodPlaces, setFoodPlaces]     = useState<FoodPlace[]>([]);
  const { user, isLoading: authLoading } = useAuth();
  const isUserFree = !authLoading && isFreePlan(user?.subscriptionTier);
  const tripNotStarted = !!trip?.startDate && (() => {
    const s = parseLocalDate(trip!.startDate!)!; s.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return s > t;
  })();
  const tripStartLabel = trip?.startDate
    ? parseLocalDate(trip.startDate)!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [showAtstopRescue, setShowAtstopRescue] = useState(false);
  useEffect(() => {
    if (isUserFree && dayIndex > 0) setUpgradeVisible(true);
  }, [isUserFree, dayIndex]);
  const [foodLoading, setFoodLoading]   = useState(false);
  const [foodLoaded, setFoodLoaded]     = useState(false);
  const [breakPlaces, setBreakPlaces]   = useState<ExtraPlace[]>([]);
  const [breakLoading, setBreakLoading] = useState(false);
  const [kidPlaces, setKidPlaces]       = useState<ExtraPlace[]>([]);
  const [kidLoading, setKidLoading]     = useState(false);
  const [addingStop, setAddingStop]     = useState<string | null>(null);
  const [stopMoments, setStopMoments]   = useState<Moment[]>([]);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [mealDone, setMealDone] = useState(false);
  const [mealFeedbackDone, setMealFeedbackDone] = useState(false);

  // Prevents useFocusEffect from resetting mode when returning from a sub-screen
  const keepDetailOnFocus = useRef(false);

  // ── Fetch Wikipedia images whenever stop changes ──
  useEffect(() => {
    if (!currentStop) return;
    // Set immediate fallback so the hero is never blank while wiki/AI fetch is in flight
    const immediateFallback =
      (parseMetadata(currentStop.metadata).imageUrl as string | undefined) ??
      CITY_IMGS[(currentStop as { cityGroup?: string | null }).cityGroup ?? ''] ??
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80';
    setHeroImageUrl(immediateFallback);
    setStopImages([immediateFallback, null, null]);
    // Use AI-generated hero image if available; fall back to Wikipedia
    const rawHero = (currentStop as any).heroImageUrl as string | null | undefined;
    const generatedHero = rawHero
      ? rawHero.startsWith('stop-images/')
        ? `${API_BASE}/api/travel/stops/${currentStop.id}/hero-img`
        : rawHero
      : null;
    if (generatedHero) {
      setHeroImageUrl(generatedHero);
      setStopImages([generatedHero, null, null]);
    } else {
      fetchWikiImages(currentStop.name, (currentStop as any).cityGroup ?? trip?.destination).then(urls => {
        const fallback = CITY_IMGS[(currentStop as { cityGroup?: string | null }).cityGroup ?? ''] ??
          'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80';
        const hero = urls[0] ?? fallback;
        setHeroImageUrl(hero);
        setStopImages([hero, urls[1] ?? null, urls[2] ?? null]);
      });
    }
    // Reset food + extras + moments state for new stop
    setFoodPlaces([]); setFoodLoaded(false);
    setBreakPlaces([]); setKidPlaces([]);
    setStopMoments([]);
    if (trip?.id && currentStop?.id) {
      apiFetch<{ moments?: Moment[] }>(`/api/travel/trips/${trip.id}/moments?stopId=${currentStop.id}`)
        .then(d => setStopMoments(d.moments ?? []))
        .catch(() => {});
    }
    // Fetch child players so Kids Zone navigation has them ready
    if (trip?.id) {
      getMyPlayers().then(players => {
        const kids = players.filter(p => !p.isParent && !p.isArchived && p.profileType !== 'parent' && p.profileType !== 'adult');
        setKidPlayers(kids);
        if (kids[0]) setKidPlayerId(kids[0].id);
      }).catch(() => {});
    }
  }, [currentStop?.id, trip?.id]);

  // Sync mealDone when switching stops
  useEffect(() => {
    if (currentStop) setMealDone(isStopVisited(currentStop));
    else setMealDone(false);
    setMealFeedbackDone(false);
    setPrevDayFeedbackDone(false);
  }, [currentStop?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load on focus ──
  useFocusEffect(
    useCallback(() => {
      // Only skip reload when returning from a sub-screen (no new stopId from today.tsx)
      if (keepDetailOnFocus.current && !params.stopId) { keepDetailOnFocus.current = false; return; }
      keepDetailOnFocus.current = false;
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

  // Reload moments when focus returns (e.g. after adding a photo)
  useFocusEffect(
    useCallback(() => {
      const tid = trip?.id;
      const sid = currentStop?.id;
      if (!tid || !sid) return;
      apiFetch<{ moments?: Moment[] }>(`/api/travel/trips/${tid}/moments?stopId=${sid}`)
        .then(d => setStopMoments(d.moments ?? []))
        .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trip?.id, currentStop?.id])
  );

  async function load() {
    setMode('loading'); setLoadErr(null);
    try {
      const data = await apiFetch<{ trips: TripData[] }>('/api/travel/trips');
      // Pick the trip furthest into its run among all whose date range includes today.
      // No status preference — status can be stale; date arithmetic is the truth.
      const todayMs = new Date().setHours(0, 0, 0, 0);
      const candidates = (data.trips ?? []).filter(t => {
        if (!t.startDate || !t.endDate) return false;
        const s = parseLocalDate(t.startDate)!; s.setHours(0, 0, 0, 0);
        const e = parseLocalDate(t.endDate)!;   e.setHours(23, 59, 59, 999);
        return todayMs >= s.getTime() && todayMs <= e.getTime();
      });
      // Sort by elapsed dayIndex descending (most days in = furthest into run),
      // then by startDate ascending as tiebreaker.
      candidates.sort((a, b) => {
        const dayA = a.startDate ? Math.floor((todayMs - parseLocalDate(a.startDate)!.setHours(0,0,0,0)) / 86400000) : 0;
        const dayB = b.startDate ? Math.floor((todayMs - parseLocalDate(b.startDate)!.setHours(0,0,0,0)) / 86400000) : 0;
        if (dayB !== dayA) return dayB - dayA;
        return new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime();
      });
      // Fallback: when no trip spans today, pick the soonest future trip by startDate.
      const upcoming = (data.trips ?? [])
        .filter(t => t.startDate && parseLocalDate(t.startDate)!.setHours(0,0,0,0) >= todayMs)
        .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
      const active = candidates[0] ?? upcoming[0] ?? data.trips?.[0];
      if (!active) { setMode('noTrip'); return; }
      const tripData = await apiFetch<TripData>(`/api/travel/trips/${active.id}`);
      setTrip(tripData);
      let di = 0;
      if (tripData.startDate) {
        const diff = Math.floor((Date.now() - parseLocalDate(tripData.startDate)!.getTime()) / 86400000);
        // Cap against the highest dayIndex actually present in the stops — don't trust
        // tripDays/plannerTripDays/currentDayIndex which may be stale or null.
        const maxDayIdx = (tripData.stops ?? []).reduce(
          (m: number, s: { dayIndex?: number | null }) => Math.max(m, s.dayIndex ?? 0), 0
        );
        di = Math.max(0, Math.min(diff, maxDayIdx));
      }
      setDayIndex(di);
      const ts = (tripData.stops ?? []).filter(s => (s.dayIndex ?? 0) === di)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setDayStops(ts);
      const prevTs = di > 0
        ? (tripData.stops ?? []).filter(s => (s.dayIndex ?? 0) === di - 1)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        : [];
      setPrevDayStops(prevTs);
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
    Keyboard.dismiss();
    // Compute elapsed time before clearing start timestamp
    const startStr = await AsyncStorage.getItem('atStopStartTime');
    if (startStr) {
      const elapsed = Math.round((Date.now() - parseInt(startStr, 10)) / 60000);
      await AsyncStorage.setItem('atStopElapsed', String(elapsed > 0 ? elapsed : 0));
      await AsyncStorage.removeItem('atStopStartTime');
      // Record completion time so today.tsx can compute time_since_last_stop_minutes
      await AsyncStorage.setItem('lastStopCompleteTime', String(Date.now())).catch(() => {});
      // Send dwell time signal — fire-and-forget, never blocks the UI
      if (elapsed > 0) {
        const signalType = elapsed >= 15 ? 'long_dwell' : 'short_dwell';
        apiFetch(`/api/travel/stops/${currentStop.id}/quality-signal`, {
          method: 'POST',
          headers: { 'x-adventure-parent': '1' },
          body: JSON.stringify({ signalType, signalValue: elapsed }),
        }).catch(() => {});
        // Silent activity log update — fire-and-forget
        if (trip?.id) {
          apiFetch(`/api/travel/stop-activity-log/${currentStop.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ tripId: trip.id, actualDurationMinutes: elapsed }),
          }).catch(() => {});
        }
      }
    }
    await AsyncStorage.removeItem('atStopFrozen');
    setAtStopFrozen(false);
    setSubmittingFeedback(true);
    try {
      await apiFetch(`/api/travel/stops/${currentStop.id}/visit`, { method: 'POST' });
      if (!skipFeedback) {
        await apiFetch(`/api/travel/stops/${currentStop.id}/quality-signal`, {
          method: 'POST',
          headers: { 'x-adventure-parent': '1' },
          body: JSON.stringify({ rating: feedbackRating, notes: feedbackText || undefined }),
        });
      }
      // Mark visited locally
      const isPrevDay = typeof currentStop.dayIndex === 'number' && currentStop.dayIndex < dayIndex;
      if (isPrevDay) {
        setPrevDayStops(prev => prev.map(s => s.id === currentStop.id ? { ...s, isVisited: true } : s));
      } else {
        setDayStops(prev => prev.map(s => s.id === currentStop.id ? { ...s, isVisited: true } : s));
      }
    } catch { /* best effort */ }
    setSubmittingFeedback(false);
    setActiveSheet('none');
    // For previous-day stops: stay on this stop with Save/Back footer
    if (typeof currentStop.dayIndex === 'number' && currentStop.dayIndex < dayIndex) {
      setPrevDayFeedbackDone(true);
      return;
    }
    // Signal today tab that a stop was completed
    await AsyncStorage.setItem('today_state_override', 'stop_complete');
    // Advance to the next unvisited stop if one exists; otherwise go to picker
    // (which will show the "all done" summary). Do NOT reload from network — use
    // the locally-updated dayStops state so the user never sees a stale stop.
    setDayStops(prev => {
      const updated = prev.map(s => s.id === currentStop.id ? { ...s, isVisited: true } : s);
      const nextUnvisited = updated.find(s => !isStopVisited(s));
      if (nextUnvisited) {
        setCurrentStop(nextUnvisited);
        setMode('detail');
      } else {
        setCurrentStop(null);
        setMode('picker');
      }
      return updated;
    });
  }

  async function handleMealComplete() {
    if (!currentStop) return;
    try {
      await apiFetch(`/api/travel/stops/${currentStop.id}/visit`, { method: 'POST' });
      setDayStops(prev => prev.map(s => s.id === currentStop.id ? { ...s, isVisited: true } : s));
      setMealDone(true);
    } catch { /* best effort */ }
    openSheet('mealFeedback');
  }

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
  const isPrevDayStop = !!(currentStop && typeof currentStop.dayIndex === 'number' && currentStop.dayIndex < dayIndex);
  const prevDayStopIdx = isPrevDayStop ? prevDayStops.indexOf(currentStop!) : -1;

  const openRescue = (type: RescueType) => { setRescueType(type); setActiveSheet('rescue'); };

  function openSheet(s: ActiveSheet) {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSheet(s);
  }

  function handleAddPhoto() {
    if (!trip?.id || !currentStop) return;
    keepDetailOnFocus.current = true;
    const stopIcon = STOP_HERO_EMOJI[currentStop.stopType ?? ''] ?? STOP_HERO_EMOJI.default ?? '\uD83D\uDCCD';
    router.push({
      pathname: `/memories/${trip.id}/add-photo` as never,
      params: { stopId: currentStop.id, stopName: currentStop.name, stopIcon },
    });
  }

  function handleStopSelectFromAtStop(stopId: string | null, stopName: string, stopIcon: string) {
    setShowPhotoSheet(false);
    if (trip) {
      keepDetailOnFocus.current = true;
      router.push({
        pathname: `/memories/${trip.id}/add-photo` as never,
        params: { stopId: stopId ?? '', stopName, stopIcon },
      });
    }
  }

  async function addStopToPlan(name: string, stopType: string, durationMinutes: number) {
    if (!trip?.id) return;
    setAddingStop(name);
    try {
      await apiFetch(`/api/travel/trips/${trip.id}/stops`, {
        method: 'POST',
        body: JSON.stringify({ name, stopType, durationMinutes, dayIndex, cityGroup: currentStop?.cityGroup ?? null }),
      });
      setActiveSheet('none');
      Alert.alert('Added to plan!', `${name} added to Day ${dayIndex + 1}.`);
    } catch {
      Alert.alert('Error', "Couldn’t add stop — try again.");
    } finally {
      setAddingStop(null);
    }
  }

  async function loadBreakPlaces() {
    if (breakPlaces.length > 0) { setActiveSheet('break'); return; }
    const dest = trip?.city ?? trip?.destination ?? '';
    setBreakLoading(true);
    setActiveSheet('break');
    try {
      const data = await apiFetch<{ places: ExtraPlace[] }>('/api/travel/stops/rescue-extras', {
        method: 'POST',
        body: JSON.stringify({ type: 'break', destination: dest, stopName: currentStop?.name ?? '' }),
      });
      setBreakPlaces(data.places ?? []);
    } catch { setBreakPlaces([]); }
    finally { setBreakLoading(false); }
  }

  async function loadKidPlaces() {
    if (kidPlaces.length > 0) { setActiveSheet('kidExtras'); return; }
    const dest = trip?.city ?? trip?.destination ?? '';
    setKidLoading(true);
    setActiveSheet('kidExtras');
    try {
      const data = await apiFetch<{ places: ExtraPlace[] }>('/api/travel/stops/rescue-extras', {
        method: 'POST',
        body: JSON.stringify({ type: 'kids', destination: dest, stopName: currentStop?.name ?? '' }),
      });
      setKidPlaces(data.places ?? []);
    } catch { setKidPlaces([]); }
    finally { setKidLoading(false); }
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
          <View style={sc.noTripIcon}><Text style={sc.noTripIconEmoji}>{'\uD83D\uDCCD'}</Text></View>
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
                        {hasTicket && <View style={[sc.tag, sc.tagRed]}><Text style={[sc.tagTxt, sc.tagTxtRed]}>{'\uD83C\uDFAB'} Ticket needed</Text></View>}
                        {isFree && !hasTicket && <View style={[sc.tag, sc.tagGreen]}><Text style={[sc.tagTxt, sc.tagTxtGreen]}>Free entry</Text></View>}
                        {isAnchor && <View style={[sc.tag, sc.tagGreen]}><Text style={[sc.tagTxt, sc.tagTxtGreen]}>Kid friendly</Text></View>}
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
                        <View style={[sc.tag, sc.tagGreen]}><Text style={[sc.tagTxt, sc.tagTxtGreen]}>{'\u2713'} Done</Text></View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Previous day stops — catch-up section */}
          {prevDayStops.length > 0 && dayIndex > 0 && (
            <>
              <Text style={[sc.sectionLabel, { marginTop: 28 }]}>YESTERDAY — TAP TO ADD PHOTOS OR MARK VISITED</Text>
              {prevDayStops.map((stop, gi) => {
                const wasVisited = isStopVisited(stop);
                const bgColor    = STOP_HERO_BG[stop.stopType ?? ''] ?? STOP_HERO_BG.default;
                const emoji      = STOP_HERO_EMOJI[stop.stopType ?? ''] ?? STOP_HERO_EMOJI.default;
                return (
                  <TouchableOpacity key={stop.id}
                    style={[sc.stopCard, wasVisited && { opacity: 0.55 }]}
                    activeOpacity={0.88}
                    onPress={() => { setCurrentStop(stop); setMode('detail'); }}>
                    <View style={[sc.stopBanner, { backgroundColor: bgColor }]}>
                      <Text style={sc.stopBannerEmoji}>{emoji}</Text>
                      <Text style={sc.stopBannerName} numberOfLines={1}>{stop.name}</Text>
                    </View>
                    <View style={sc.stopBody}>
                      <Text style={sc.stopMeta}>Yesterday · Stop {gi + 1} · {stop.durationMinutes ?? 60} min</Text>
                      <View style={sc.tagsRow}>
                        {wasVisited
                          ? <View style={[sc.tag, sc.tagGreen]}><Text style={[sc.tagTxt, sc.tagTxtGreen]}>{'\u2713'} Visited</Text></View>
                          : <View style={[sc.tag, sc.tagRed]}><Text style={[sc.tagTxt, sc.tagTxtRed]}>Not visited</Text></View>
                        }
                      </View>
                    </View>
                    <Text style={sc.stopChevron}>{'›'}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* All stops done for today */}
          {dayStops.length > 0 && unvisited.length === 0 && (
            <View style={{ alignItems: 'center', padding: 32 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>{'\uD83C\uDF89'}</Text>
              <Text style={{ fontFamily: F.bold, fontSize: 22, color: '#1A1F2E', textAlign: 'center', marginBottom: 8 }}>
                All stops done for today!
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 14, color: '#8A8FA8', textAlign: 'center', lineHeight: 21, marginBottom: 24 }}>
                You visited {visited.length} stop{visited.length !== 1 ? 's' : ''} today. Head to Today to wrap up your day and save your memories.
              </Text>
              {/* Mini recap of today's stops */}
              <View style={{ width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 11, color: '#8A8FA8', letterSpacing: 0.8, marginBottom: 10 }}>TODAY'S ADVENTURE</Text>
                {visited.map((stop, i) => (
                  <View key={stop.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: 'rgba(26,31,46,0.07)' }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8F7EF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Text style={{ fontSize: 10, fontFamily: F.bold, color: '#3DAA6E' }}>{'\u2713'}</Text>
                    </View>
                    <Text style={{ fontFamily: F.medium, fontSize: 14, color: '#1A1F2E', flex: 1 }} numberOfLines={1}>{stop.name}</Text>
                  </View>
                ))}
              </View>
              {(() => {
                // Last-day branch: on the last populated day steer to story,
                // not a nonexistent next day.
                const _nm = (trip?.stops ?? []).filter((s: any) => {
                  const _t = (s.stopType ?? '').toLowerCase();
                  return !['restaurant','food','cafe','market','meal',
                    'street_food','diner','eatery'].some(k => _t.includes(k));
                });
                const _lastDay = _nm.length > 0
                  ? Math.max(..._nm.map((s: any) => s.dayIndex ?? 0))
                  : (trip?.plannerTripDays ?? trip?.tripDays ?? 1) - 1;
                if (dayIndex >= _lastDay) {
                  return (
                    <>
                      <TouchableOpacity
                        onPress={() => router.push('/(tabs)/today' as never)}
                        style={{ backgroundColor: '#E8692A', borderRadius: 14,
                          paddingVertical: 14, paddingHorizontal: 32,
                          width: '100%', alignItems: 'center', marginBottom: 10 }}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 15, color: '#fff' }}>
                          {'See your trip story →'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => trip?.id &&
                          router.push({ pathname: '/trip/[tripId]' as never,
                            params: { tripId: trip.id } } as never)}
                        style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20 }}
                      >
                        <Text style={{ fontFamily: F.medium, fontSize: 14, color: '#8A8FA8' }}>
                          {'+ Add a day'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  );
                }
                return (
                  <TouchableOpacity
                    onPress={() => {
                      if (trip?.id) {
                        router.push({
                          pathname: '/trip/[tripId]' as never,
                          params: { tripId: trip.id, initialDay: String(dayIndex + 2), fromDayWrap: 'true' },
                        } as never);
                      } else {
                        router.push('/(tabs)/today');
                      }
                    }}
                    style={{ backgroundColor: '#E8692A', borderRadius: 14,
                      paddingVertical: 14, paddingHorizontal: 32,
                      width: '100%', alignItems: 'center' }}
                  >
                    <Text style={{ fontFamily: F.bold, fontSize: 15, color: '#fff' }}>
                      {"See Tomorrow's Plan →"}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          )}
          {dayStops.length === 0 && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <Text style={{ fontSize: 26, marginBottom: 16 }}>{'\uD83D\uDCCD'}</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1F2E', textAlign: 'center', marginBottom: 8 }}>
                No stop running yet
              </Text>
              <Text style={{ fontSize: 14, color: '#8A8FA8', textAlign: 'center', lineHeight: 21, marginBottom: 24 }}>
                Head to Today to start your day and pick your first stop.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/today')}
                style={{ borderWidth: 1.5, borderColor: '#E8692A', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 }}
              >
                <Text style={{ color: '#E8692A', fontSize: 15, fontWeight: '600' }}>
                  Go to Today {'→'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 36 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Screen C — Stop Detail ────────────────────────────────────────────────

function isMealStop(t?: string | null): boolean {
  if (!t) return false;
  const s = t.toLowerCase();
  return ['restaurant','food','cafe','market','meal','street_food','diner','eatery'].some(k => s.includes(k));
}

  if (!currentStop) return null;
  const meta        = parseMetadata(currentStop.metadata);
  const enrichment  = parseEnrichment(currentStop.enrichment);
  const pRef        = currentStop.placeReferenceData ?? {};
  const pProf       = currentStop.placeProfileData ?? {};
  const bgColor     = STOP_HERO_BG[currentStop.stopType ?? ''] ?? STOP_HERO_BG.default;
  const emoji       = STOP_HERO_EMOJI[currentStop.stopType ?? ''] ?? STOP_HERO_EMOJI.default;
  // Ticket: prefer placeReferenceData, fall back to metadata.ticketSignal
  const hasTicket   = pRef.bookingRequired === true || meta.ticketSignal === true;
  const isFree      = pRef.bookingRequired === false || meta.ticketSignal === false;
  const stopOrderNum = isPrevDayStop ? prevDayStopIdx + 1 : stopIdx + 1;
  const totalStops   = isPrevDayStop ? prevDayStops.length : dayStops.length;
  const stopTypeLabel = (currentStop.stopType ?? 'stop').charAt(0).toUpperCase()
    + (currentStop.stopType ?? 'stop').slice(1);
  const duration     = currentStop.durationMinutes ?? 60;
  const address      = currentStop.address ?? '';
  // Open status from real API hours field
  const openStatus   = formatOpenStatus(pRef.openingHours ?? currentStop.openingHours);
  // "Do this first" card text — prefer whyItWorks, then whyNow
  const doThisFirst  = enrichment.whyItWorks ?? pProf.whyItWorks
    ?? currentStop.parentSupportData?.keepGoingSuggestion ?? enrichment.whyNow;
  // Booking URL for ticket button
  const bookingHref  = pRef.bookingUrl ?? enrichment.bookingUrl;
  // Lat/lon for directions

  const stopLat      = currentStop.latitude ? parseFloat(currentStop.latitude) : null;
  const stopLon      = currentStop.longitude ? parseFloat(currentStop.longitude) : null;

  if (isMealStop(currentStop.stopType)) {
    const tileStyle = {
      flex: 1, backgroundColor: '#fff', borderRadius: 12,
      padding: 16, minHeight: 100,
      borderWidth: 1, borderColor: 'rgba(26,31,46,0.07)',
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    };
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={[dt.hero, { height: 220, overflow: 'hidden' }]}>
            {heroImageUrl ? (
              <Image source={{ uri: heroImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(26,31,46,0.08)', 'rgba(26,31,46,0.75)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={dt.heroBottom}>
              <Text style={dt.heroType}>{stopTypeLabel} {'\u00B7'} Stop {stopOrderNum} of {totalStops}</Text>
              <Text style={dt.heroName} numberOfLines={2}>{currentStop.name}</Text>
            </View>
          </View>

          {/* Kid-friendly + Directions */}
          <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 0 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#E8F7EF', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
              borderWidth: 1, borderColor: '#A8D8BF' }}>
              <Text style={{ fontSize: 14 }}>{'\uD83D\uDC4D'}</Text>
              <Text style={{ fontFamily: F.semibold, fontSize: 13, color: '#16A34A' }}>Kid-friendly</Text>
            </View>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
                borderWidth: 1, borderColor: 'rgba(26,31,46,0.09)' }}
              activeOpacity={0.8}
              onPress={() => {
                const url = stopLat && stopLon
                  ? (Platform.OS === 'ios'
                      ? `maps://app?daddr=${stopLat},${stopLon}&dirflg=d`
                      : `google.navigation:q=${stopLat},${stopLon}`)
                  : address ? `https://www.google.com/maps/search/${encodeURIComponent(address)}` : null;
                if (url) Linking.openURL(url);
              }}>
              <Text style={{ fontSize: 14 }}>{'\u2197\uFE0F'}</Text>
              <Text style={{ fontFamily: F.semibold, fontSize: 13, color: '#1A1F2E' }}>Directions</Text>
            </TouchableOpacity>
          </View>

          {/* 2-tile grid */}
          <View style={{ flexDirection: 'row', gap: 12, margin: 16 }}>
            <TouchableOpacity
              style={tileStyle} activeOpacity={0.8}
              onPress={() => {
                keepDetailOnFocus.current = true;
                router.push({ pathname: '/kids/games' as never, params: { stopId: currentStop.id, stopName: currentStop.name } });
              }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{'\uD83E\uDDED'}</Text>
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: '#1A1F2E', marginBottom: 4 }}>Kids Zone</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12, color: '#8A8FA8' }}>Travel games for the table</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tileStyle} activeOpacity={0.8}
              onPress={handleAddPhoto}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{'\uD83D\uDCF8'}</Text>
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: '#1A1F2E', marginBottom: 4 }}>Capture moment</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12, color: '#8A8FA8' }}>Photo, note, kid quote</Text>
            </TouchableOpacity>
          </View>

          {stopMoments.length > 0 && (
            <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#8A8FA8',
                letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>Your moments</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                nestedScrollEnabled contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
                {stopMoments.map(m => (
                  <Image key={m.id} source={{ uri: m.photoUrls?.[0] ?? m.photoUrl ?? '' }}
                    style={{ width: 90, height: 90, borderRadius: 12 }} resizeMode="cover" />
                ))}
              </ScrollView>
            </View>
          )}

        </ScrollView>

        {/* Pinned CTA */}
        <View style={{ position: 'absolute', bottom: TAB_BAR_H + insets.bottom + 12, left: 16, right: 16 }}>
          {mealFeedbackDone && nextStop ? (
            <TouchableOpacity
              style={{ backgroundColor: C.orange, height: 56, borderRadius: 12,
                justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={0.88}
              onPress={() => setCurrentStop(nextStop)}>
              <Text style={{ color: '#fff', fontFamily: F.semibold, fontSize: 15 }}>
                Head to {nextStop.name} {'\u2192'}
              </Text>
            </TouchableOpacity>
          ) : mealFeedbackDone ? (
            <TouchableOpacity
              style={{ backgroundColor: '#1A1F2E', height: 56, borderRadius: 12,
                justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={0.88}
              onPress={async () => { await AsyncStorage.setItem('today_state_override', 'stop_complete'); router.push('/(tabs)/today'); }}>
              <Text style={{ color: '#fff', fontFamily: F.semibold, fontSize: 15 }}>{'✓'} Done — back to today</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{ backgroundColor: tripNotStarted ? 'rgba(26,31,46,0.3)' : '#1A1F2E', height: 56, borderRadius: 12,
                justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={tripNotStarted ? 1 : 0.88}
              disabled={tripNotStarted}
              onPress={handleMealComplete}>
              <Text style={{ color: tripNotStarted ? 'rgba(255,255,255,0.5)' : '#fff', fontFamily: F.semibold, fontSize: 15 }}>
                {tripNotStarted ? 'Trip hasn\'t started yet' : '\u2713 We\'re done eating \u2014 move on'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Meal feedback sheet */}
        <SheetModal visible={activeSheet === 'mealFeedback'} onClose={() => setActiveSheet('none')}>
          <Text style={sh.title}>How was the meal?</Text>
          <Text style={sh.sub}>Quick rating — helps us suggest better next time.</Text>
          {([
            { label: 'Loved it',       icon: '\u2B50',       signal: 'meal_loved' },
            { label: 'Good',           icon: '\uD83D\uDC4D', signal: 'meal_good'  },
            { label: 'Skip next time', icon: '\uD83D\uDE44', signal: 'meal_skip'  },
          ] as const).map(opt => (
            <TouchableOpacity key={opt.signal} style={sh.row} activeOpacity={0.8}
              onPress={async () => {
                apiFetch(`/api/travel/stops/${currentStop.id}/quality-signal`, {
                  method: 'POST',
                  headers: { 'x-adventure-parent': '1' },
                  body: JSON.stringify({ signalType: opt.signal, signalValue: 1 }),
                }).catch(() => {});
                setActiveSheet('none');
                setMealFeedbackDone(true);
              }}>
              <View style={[sh.rowIcon, { backgroundColor: C.bg }]}><Text style={{ fontSize: 18 }}>{opt.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={sh.rowName}>{opt.label}</Text>
              </View>
              <Text style={sh.rowChev}>{'\u203A'}</Text>
            </TouchableOpacity>
          ))}
        </SheetModal>

      </View>
    );
  }

  return (
    <View style={sc.screen}>
      <ScrollView style={sc.scroll} contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={dt.hero}>
          {heroImageUrl ? (
            <Image source={{ uri: heroImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(26,31,46,0.08)', 'rgba(26,31,46,0.75)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          {!tripNotStarted && !isPrevDayStop && (
            <>
          {/* Hero top row: Change Stop + Didn’t Visit (left) · SOS (right) */}
          <View style={[dt.heroPills, { top: paddingTop }]}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={dt.heroPill} activeOpacity={0.85}
                onPress={() => openSheet('change')}>
                <Text style={dt.heroPillText}>⇄ Change Stop</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[dt.heroPill, dt.heroPillDanger]} activeOpacity={0.85}
                onPress={() => {
              if (tripNotStarted) {
                Alert.alert(
                  "Your trip hasn't started yet",
                  `This trip starts on ${tripStartLabel}. Skipping this stop now will remove it from your itinerary before your trip begins. Do you want to continue?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Continue', onPress: () => openSheet('didnt') },
                  ]
                );
                return;
              }
              openSheet('didnt');
            }}>
                <Text style={[dt.heroPillText, { color: C.red }]}>{'\uD83D\uDEAB'} Didn’t visit</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: 'rgba(239,68,68,0.18)', borderWidth: 1,
                borderColor: 'rgba(239,68,68,0.4)', borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 6,
              }}
              onPress={() => { keepDetailOnFocus.current = true; router.push({ pathname: '/atstop/sos' as never,
                params: { tripId: trip?.id ?? '', destination: trip?.destination ?? trip?.city ?? '' } }); }}>
              <Text style={{ fontSize: 12 }}>{'\uD83C\uDD98'}</Text>
              <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#FCA5A5', letterSpacing: 0.5 }}>Help</Text>
            </TouchableOpacity>
          </View>
            </>
          )}

          {/* Stop info at hero bottom */}
          <View style={dt.heroBottom}>
            <Text style={dt.heroType}>{stopTypeLabel} · Stop {(currentStop.displayOrder ?? stopIdx) + 1} of {totalStops}</Text>
            <Text style={dt.heroName} numberOfLines={2}>{currentStop.name}</Text>
            <Text style={dt.heroSub}>{duration} min · {openStatus}</Text>
          </View>
        </View>


        {/* ── Why This Stop card ───────────────────────────────────────────── */}
        {!!doThisFirst && (
          <View style={dt.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={dt.cardLabelOrange}>DO THIS FIRST</Text>
              <SpeakButton text={doThisFirst} isSpeaking={isSpeaking} onPress={speak} size="sm" color="#8A8FA8" />
            </View>
            <Text style={dt.cardText}>{doThisFirst}</Text>
          </View>
        )}


        {/* ── Flat action buttons: Directions + Tickets ────────────────────────────── */}
        <View style={[dt.actionsRow, isPrevDayStop && { opacity: 0.3 }]} pointerEvents={isPrevDayStop ? 'none' : 'auto'}>
          <TouchableOpacity style={[dt.actBtn, { flexDirection: 'row', gap: 6 }]} activeOpacity={0.8}
            onPress={() => {
              const url = stopLat && stopLon
                ? (Platform.OS === 'ios'
                    ? `maps://app?daddr=${stopLat},${stopLon}&dirflg=d`
                    : `google.navigation:q=${stopLat},${stopLon}`)
                : address
                  ? mapsUrl(address)
                  : null;
              if (url) Linking.openURL(url);
            }}>
            <Text style={dt.actIcon}>↗</Text>
            <Text style={[dt.actLabel, { fontSize: 13, color: C.deep }]}>Directions</Text>
          </TouchableOpacity>
          {hasTicket ? (
            <TouchableOpacity style={[dt.actBtn, { flexDirection: 'row', gap: 6,
              borderColor: 'rgba(245,166,35,0.4)' }]} activeOpacity={0.8}
              onPress={() => Linking.openURL(ticketUrl(currentStop.name, bookingHref))}>
              <Text style={dt.actIcon}>{'\uD83C\uDF9F'}</Text>
              <Text style={[dt.actLabel, { fontSize: 13, color: '#D97706' }]}>Book tickets</Text>
            </TouchableOpacity>
          ) : (
            <View style={[dt.actBtn, { flexDirection: 'row', gap: 6,
              borderColor: 'rgba(74,222,128,0.3)' }]}>
              <Text style={dt.actIcon}>{'\u2713'}</Text>
              <Text style={[dt.actLabel, { fontSize: 13, color: '#16A34A' }]}>No ticket needed</Text>
            </View>
          )}
        </View>

        {/* ── 2×2 action grid ────────────────────────────────────────────────────────────────────────────── */}
        <View style={dt.gridRow}>
          {/* What to expect */}
          <TouchableOpacity style={[dt.gridCard, isPrevDayStop && { opacity: 0.3 }]}
            activeOpacity={isPrevDayStop ? 1 : 0.8}
            disabled={isPrevDayStop}
            onPress={() => { keepDetailOnFocus.current = true; router.push({ pathname: '/atstop/expect' as never, params: {
              stopId: currentStop.id,
              tripId: trip?.id ?? '',
              stopName: encodeURIComponent(currentStop.name),
              address: encodeURIComponent(address),
              enrichment: encodeURIComponent(JSON.stringify(enrichment)),
              meta: encodeURIComponent(JSON.stringify(meta)),
              pRef: encodeURIComponent(JSON.stringify(pRef)),
              pProf: encodeURIComponent(JSON.stringify(pProf)),
              duration: String(duration),
              minAge: String(currentStop.minAge ?? ''),
              openingHours: encodeURIComponent(pRef.openingHours ?? currentStop.openingHours ?? ''),
              lat: currentStop.latitude ?? '',
              lon: currentStop.longitude ?? '',
              bookingUrl: encodeURIComponent(bookingHref ?? ''),
            }}); }}>
            <Text style={dt.gridIcon}>{'\u2728'}</Text>
            <Text style={dt.gridTitle}>What to expect</Text>
            <Text style={dt.gridSub}>Experience {'&'} best tips</Text>
          </TouchableOpacity>

          {/* Kids explorer */}
          <TouchableOpacity style={dt.gridCard} activeOpacity={0.8}
            onPress={() => {
              if (!currentStop) return;
              if (kidPlayers.length >= 2) {
                setKidPickerVisible(true);
              } else {
                const k = kidPlayers[0] ?? null;
                keepDetailOnFocus.current = true;
                router.push({ pathname: '/kids' as never, params: {
                  stopId: currentStop.id,
                  stopName: encodeURIComponent(currentStop.name),
                  tripId: trip?.id ?? '',
                  explorerName: encodeURIComponent(k?.name ?? 'Explorer'),
                  explorerId: k?.id ?? kidPlayerId,
                  ageBand: k ? getAgeBand(k.age) : 'middle',
                }});
              }
            }}>
            <Text style={dt.gridIcon}>{'\uD83E\uDDED'}</Text>
            <Text style={dt.gridTitle}>Kids Zone</Text>
            <Text style={dt.gridSub}>Missions and stories</Text>
          </TouchableOpacity>

          {/* Capture moment */}
          <TouchableOpacity style={dt.gridCard} activeOpacity={0.8}
            onPress={handleAddPhoto}>
            <Text style={dt.gridIcon}>{'\uD83D\uDCF8'}</Text>
            <Text style={dt.gridTitle}>Capture moment</Text>
            <Text style={dt.gridSub}>Photo, note, kid quote</Text>
          </TouchableOpacity>

          {/* Need something? */}
          <TouchableOpacity style={[dt.gridCard, isPrevDayStop && { opacity: 0.3 }]}
            activeOpacity={isPrevDayStop ? 1 : 0.8}
            disabled={isPrevDayStop}
            onPress={() => setShowAtstopRescue(true)}>
            <Text style={dt.gridIcon}>{'\uD83D\uDD00'}</Text>
            <Text style={dt.gridTitle}>Need something?</Text>
            <Text style={dt.gridSub}>Adjust, skip, or swap</Text>
          </TouchableOpacity>
        </View>

        {/* ── Photos strip ─────────────────────────────────────────────────── */}
        <View style={dt.photoSection}>
          <Text style={dt.photoSectionLabel}>PHOTOS FROM FAMILIES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}>
            {stopImages.map((imgUrl, i) => (
              <View key={i} style={[dt.photoThumb, { backgroundColor: bgColor }]}>
                {imgUrl ? (
                  <Image source={{ uri: imgUrl }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} resizeMode="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor, borderRadius: 12 }]} />
                )}
              </View>
            ))}
            <TouchableOpacity style={dt.photoAdd} activeOpacity={0.8}
              onPress={handleAddPhoto}>
              <Text style={dt.photoAddIcon}>{'\uD83D\uDCF7'}</Text>
              <Text style={dt.photoAddLabel}>Add yours</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>


        {/* ── Explore More (expandable) ────────────────────────────────────── */}
        <View style={dt.exploreCard}>
          <TouchableOpacity style={dt.exploreHeader} activeOpacity={0.8}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setExploreOpen(o => !o);
            }}>
            <Text style={dt.exploreTitle}>{'\uD83D\uDCA1'} Timing, access {'&'} logistics</Text>
            <Text style={[dt.exploreChev, exploreOpen && { transform: [{ rotate: '180deg' }] }]}>▾</Text>
          </TouchableOpacity>

          {exploreOpen && (
            <View style={dt.exploreBody}>

              {/* What you'll experience — numbered bullets from whyNow */}
              {!!enrichment.whyNow && (
                <>
                  <Text style={dt.exploreSubLabel}>{"What you'll experience"}</Text>
                  {enrichment.whyNow
                    .split(/\.\s+/)
                    .map((s: string) => s.replace(/\.$/, '').trim())
                    .filter((s: string) => s.length > 8)
                    .map((line: string, i: number) => (
                      <View key={i} style={dt.bulletRow}>
                        <View style={dt.numBadge}>
                          <Text style={dt.numBadgeText}>{i + 1}</Text>
                        </View>
                        <Text style={dt.bulletText}>{line}.</Text>
                      </View>
                    ))}
                </>
              )}

              {/* Best way to do this stop — practicalTips as dot bullet list */}
              {!!enrichment.practicalTips && (
                <>
                  <Text style={dt.exploreSubLabel}>Best way to do this stop</Text>
                  {(Array.isArray(enrichment.practicalTips)
                    ? enrichment.practicalTips as string[]
                    : (enrichment.practicalTips as string).split(/\.\s+/)
                        .map((s: string) => s.replace(/\.$/, '').trim())
                        .filter((s: string) => s.length > 8)
                  ).map((tip: string, i: number) => (
                    <View key={i} style={dt.bulletRow}>
                      <View style={dt.bulletDot} />
                      <Text style={dt.bulletText}>{tip}{Array.isArray(enrichment.practicalTips) ? '' : '.'}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Timing & logistics */}
              <Text style={dt.exploreSubLabel}>Timing {'&'} logistics</Text>
              {([
                ['Recommended duration', `${duration} min`],
                meta.sessionFit ? ['Best for', meta.sessionFit] : null,
                enrichment.bestTimeOfDay ? ['Crowd level now', enrichment.bestTimeOfDay] : null,
                enrichment.strollerFriendly != null
                  ? ['Stroller friendly', enrichment.strollerFriendly ? 'Yes \u2713' : 'No'] : null,
              ] as const).filter((x): x is [string, string] => x !== null && Array.isArray(x)).map(([k, v]) => (
                <View key={k} style={dt.exploreRow}>
                  <Text style={dt.exploreKey}>{k}</Text>
                  <Text style={[dt.exploreVal, k === 'Crowd level now' && { color: C.green }]}>{v}</Text>
                </View>
              ))}

              {/* Parking & access */}
              <Text style={dt.exploreSubLabel}>Parking {'&'} access</Text>
              <TouchableOpacity
                onPress={() => {
                  const query = encodeURIComponent(`parking near ${currentStop.name} ${(currentStop as any).cityGroup ?? trip?.city ?? trip?.destination ?? ''}`);
                  const url = Platform.OS === 'ios'
                    ? `maps://?q=${query}`
                    : `geo:0,0?q=${query}`;
                  Linking.openURL(url);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: 0.5,
                  borderBottomColor: '#F0EDE8',
                }}
              >
                <Text style={dt.exploreKey}>Parking</Text>
                <Text style={{ fontFamily: F.semibold, fontSize: 14, color: '#E8692A' }}>
                  {'Find parking nearby →'}
                </Text>
              </TouchableOpacity>
              {([
                meta.restroomConfidence ? ['Restrooms', meta.restroomConfidence] : null,
                address ? ['Address', address] : null,
              ] as const).filter((x): x is [string, string] => x !== null && Array.isArray(x) && x[1] !== '—' && x[1] !== '').map(([k, v]) => (
                <View key={k} style={dt.exploreRow}>
                  <Text style={dt.exploreKey}>{k}</Text>
                  <Text style={dt.exploreVal}>{v}</Text>
                </View>
              ))}

            </View>
          )}
        </View>

      </ScrollView>


       {/* ── CTA: footer (prev day · trip-not-started · normal) ────────── */}
      <View style={{ backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 10,
        paddingBottom: TAB_BAR_H + insets.bottom + 10, borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.07)' }}>
        {isPrevDayStop ? (
          <>
            {!isStopVisited(currentStop) && !prevDayFeedbackDone ? (
              <TouchableOpacity style={dt.ctaPrimary} activeOpacity={0.88}
                onPress={() => openSheet('feedback')}>
                <Text style={dt.ctaPrimaryText}>{'✓'} Mark as visited</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={dt.ctaPrimary} activeOpacity={0.88}
                onPress={() => { setCurrentStop(null); setMode('picker'); }}>
                <Text style={dt.ctaPrimaryText}>Save</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity activeOpacity={0.7}
              style={{ alignItems: 'center', paddingVertical: 10 }}
              onPress={() => { setCurrentStop(null); setMode('picker'); }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.muted }}>Back</Text>
            </TouchableOpacity>
          </>
        ) : tripNotStarted ? (
          <TouchableOpacity style={dt.ctaSecondary} activeOpacity={0.7}
            onPress={() => router.back()}>
            <Text style={dt.ctaSecondaryText}>Got it</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={dt.ctaPrimary} activeOpacity={0.88}
              onPress={() => openSheet('feedback')}>
              <Text style={dt.ctaPrimaryText}>{'✓'} We visited — mark complete</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              onPress={() => openSheet('didnt')}
              style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.muted }}>
                Didn’t make it → didn’t visit
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>


      {/* ── SHEET: Change Stop ───────────────────────────────────────────── */}
      <SheetModal visible={activeSheet === 'change'} onClose={() => setActiveSheet('none')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View>
            <Text style={sh.title}>Where to next?</Text>
            {(() => {
              const leftToday = (trip?.stops ?? []).filter(
                s => (s.dayIndex ?? 0) === dayIndex && !isStopVisited(s)
              ).length;
              return leftToday > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <View style={{ backgroundColor: C.orange, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontFamily: F.semibold, fontSize: 12, color: '#fff' }}>
                      {leftToday} stop{leftToday !== 1 ? 's' : ''} left today
                    </Text>
                  </View>
                </View>
              ) : null;
            })()}
          </View>
          <TouchableOpacity onPress={() => setActiveSheet('none')} activeOpacity={0.7}
            style={{ backgroundColor: 'rgba(26,31,46,0.06)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.muted }}>Close</Text>
          </TouchableOpacity>
        </View>
        <Text style={sh.sub}>Follow your planned route or pick any stop from the trip.</Text>

        {/* Follow planned route — highlighted */}
        {nextStop && (
          <TouchableOpacity style={[sh.row, sh.rowHighlighted]} activeOpacity={0.8}
            onPress={() => { setCurrentStop(nextStop); setActiveSheet('none'); }}>
            <View style={[sh.rowIcon, { backgroundColor: C.orangeLt }]}><Text>{'\uD83D\uDDFA\uFE0F'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[sh.rowName, { color: C.orange }]}>Follow Planned Route</Text>
              <Text style={[sh.rowDesc, { color: 'rgba(232,105,42,0.65)' }]}>{nextStop.name} · next stop</Text>
            </View>
            <Text style={{ fontSize: 20, color: C.orange }}>{'\u2705'}</Text>
          </TouchableOpacity>
        )}

        {(() => {
          const allStops = trip?.stops ?? [];
          const byDay: Record<number, typeof allStops> = {};
          allStops.forEach(s => { const di = s.dayIndex ?? 0; if (!byDay[di]) byDay[di] = []; byDay[di].push(s); });
          const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
          const dest = (trip?.destination ?? trip?.city ?? '').toUpperCase();
          return (
            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              {days.map(di => {
                const header = di === dayIndex ? "TODAY’S STOPS" : `DAY ${di + 1} · ${dest}`;
                const stopsForDay = (byDay[di] ?? []).slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
                return (
                  <React.Fragment key={di}>
                    <Text style={sh.dividerLabel}>{header}</Text>
                    {stopsForDay.map(stop => {
                      const isCurrent = stop.id === currentStop.id;
                      const isNext    = stop.id === nextStop?.id && !isCurrent;
                      const isVisited = isStopVisited(stop);
                      const bgCol     = STOP_HERO_BG[stop.stopType ?? ''] ?? STOP_HERO_BG.default;
                      const em        = STOP_HERO_EMOJI[stop.stopType ?? ''] ?? STOP_HERO_EMOJI.default;
                      const stLabel   = (stop.stopType ?? 'stop').charAt(0).toUpperCase() + (stop.stopType ?? 'stop').slice(1);
                      return (
                        <TouchableOpacity key={stop.id}
                          activeOpacity={(isCurrent || isVisited) ? 1 : 0.8}
                          style={[sh.row, isNext && sh.rowHighlighted,
                            (isCurrent || isVisited) && { opacity: 0.45 }]}
                          onPress={() => {
                            if (isCurrent || isVisited) return;
                            if (isUserFree && di > 0) { setActiveSheet('none'); setUpgradeVisible(true); return; }
                            setCurrentStop(stop);
                            if (di !== dayIndex) {
                              setDayIndex(di);
                              setDayStops((trip?.stops ?? [])
                                .filter(s => (s.dayIndex ?? 0) === di)
                                .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
                            }
                            setActiveSheet('none');
                          }}>
                          <View style={[sh.rowIcon, { backgroundColor: bgCol }]}><Text>{em}</Text></View>
                          <View style={{ flex: 1 }}>
                            <Text style={[sh.rowName, isNext && { color: C.orange },
                              isVisited && { textDecorationLine: 'line-through' }]}>
                              {stop.name}
                            </Text>
                            <Text style={[sh.rowDesc, isNext && { color: 'rgba(232,105,42,0.65)' }]}>
                              {isCurrent ? 'current stop' : isVisited ? '\u2713 Visited' : isNext ? 'next up' : stLabel}
                            </Text>
                          </View>
                          {!isCurrent && !isVisited && (
                            <Text style={[sh.rowChev, isNext && { color: C.orange }]}>›</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </ScrollView>
          );
        })()}
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
          { icon: '\uD83D\uDE24', bg: C.redLt,   name: 'Kids didn’t want to go', desc: 'Noted — won’t suggest similar stops next time', signal: 'kids_rejected' },
          { icon: '\uD83D\uDD12', bg: C.bg,      name: 'It was closed',          desc: 'We’ll flag this for future families',         signal: 'closed'        },
          { icon: '\u270C\uFE0F', bg: C.bg,      name: 'Just skipping it',       desc: 'No reason needed — moving on',                signal: 'skipped'       },
        ] as const).map(row => (
          <TouchableOpacity key={row.signal} style={sh.row} activeOpacity={0.8}
            onPress={async () => {
              try { await apiFetch(`/api/travel/stops/${currentStop.id}/quality-signal`,
                { method: 'POST', headers: { 'x-adventure-parent': '1' }, body: JSON.stringify({ signal: row.signal }) }); } catch {}
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

      {/* ── SHEET: Food Nearby ───────────────────────────────────────────── */}
      <SheetModal visible={activeSheet === 'food'} onClose={() => setActiveSheet('none')}>
        <Text style={sh.title}>{'\uD83C\uDF54'} Food nearby</Text>
        <Text style={sh.sub}>Near {currentStop.name}</Text>
        {foodLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator size="large" color={C.orange} />
            <Text style={[sh.sub, { marginTop: 10 }]}>Finding restaurants…</Text>
          </View>
        ) : foodPlaces.length > 0 ? (
          <>
            {foodPlaces.map(place => (
              <View key={place.id} style={sh.extraCard}>
                <View style={sh.extraCardTop}>
                  <View style={[sh.rowIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Text>{'\uD83C\uDF7D'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={sh.rowName}>{place.name}</Text>
                    <Text style={sh.rowDesc}>{place.cuisine.charAt(0).toUpperCase() + place.cuisine.slice(1)}</Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.7}
                    onPress={() => Linking.openURL(mapsUrl(`${place.name} near ${address}`))}>
                    <Text style={sh.mapsLink}>Maps →</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[sh.addBtn, addingStop === place.id ? { opacity: 0.6 } : {}]}
                  disabled={addingStop === place.id}
                  onPress={() => addStopToPlan(place.name, 'food', 45)}>
                  <Text style={sh.addBtnText}>{addingStop === place.id ? 'Adding…' : '+ Add to plan'}</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={sh.seeAllBtn} activeOpacity={0.85}
              onPress={() => { Linking.openURL(mapsUrl('restaurants near ' + address)); setActiveSheet('none'); }}>
              <Text style={sh.seeAllText}>See all on Google Maps →</Text>
            </TouchableOpacity>
          </>
        ) : foodLoaded ? (
          <>
            <Text style={[sh.sub, { textAlign: 'center', paddingVertical: 20 }]}>
              No results found nearby. Try Google Maps for more options.
            </Text>
            <TouchableOpacity style={sh.seeAllBtn} activeOpacity={0.85}
              onPress={() => { Linking.openURL(mapsUrl('restaurants near ' + address)); setActiveSheet('none'); }}>
              <Text style={sh.seeAllText}>Search on Google Maps →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={sh.seeAllBtn} activeOpacity={0.85}
            onPress={() => { Linking.openURL(mapsUrl('restaurants near ' + address)); setActiveSheet('none'); }}>
            <Text style={sh.seeAllText}>Open in Google Maps →</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={sh.cancelBtn} onPress={() => setActiveSheet('none')}>
          <Text style={sh.cancelText}>Close</Text>
        </TouchableOpacity>
      </SheetModal>

      {/* ── SHEET: Quick Break ──────────────────────────────────────────────── */}
      <SheetModal visible={activeSheet === 'break'} onClose={() => setActiveSheet('none')}>
        <Text style={sh.title}>{'\uD83D\uDECB'} Quick break spots</Text>
        <Text style={sh.sub}>Near {currentStop.name}</Text>
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          {breakLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={C.orange} />
              <Text style={[sh.sub, { marginTop: 10 }]}>Finding break spots…</Text>
            </View>
          ) : breakPlaces.length > 0 ? (
            <>
              {breakPlaces.map(place => (
                <View key={place.name} style={sh.extraCard}>
                  <View style={sh.extraCardTop}>
                    <View style={[sh.rowIcon, { backgroundColor: C.sageLt }]}><Text>{'\uD83C\uDF33'}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={sh.rowName}>{place.name}</Text>
                      <Text style={sh.rowDesc}>{place.distance}</Text>
                    </View>
                    <TouchableOpacity activeOpacity={0.7}
                      onPress={() => Linking.openURL(mapsUrl(place.name + ' near ' + address))}>
                      <Text style={sh.mapsLink}>Maps →</Text>
                    </TouchableOpacity>
                  </View>
                  {!!place.description && <Text style={sh.extraDesc}>{place.description}</Text>}
                  <TouchableOpacity
                    style={[sh.addBtn, addingStop === place.name ? { opacity: 0.6 } : {}]}
                    disabled={addingStop === place.name}
                    onPress={() => addStopToPlan(place.name, place.stopType, 20)}>
                    <Text style={sh.addBtnText}>{addingStop === place.name ? 'Adding…' : '+ Add to plan'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[sh.seeAllBtn, { marginBottom: 8 }]} activeOpacity={0.85}
                onPress={() => { Linking.openURL(mapsUrl('parks near ' + address)); setActiveSheet('none'); }}>
                <Text style={sh.seeAllText}>See more on Google Maps →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={sh.seeAllBtn} activeOpacity={0.85}
              onPress={() => { Linking.openURL(mapsUrl('parks near ' + address)); setActiveSheet('none'); }}>
              <Text style={sh.seeAllText}>Search on Google Maps →</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <TouchableOpacity style={sh.cancelBtn} onPress={() => setActiveSheet('none')}>
          <Text style={sh.cancelText}>Close</Text>
        </TouchableOpacity>
      </SheetModal>

      {/* ── SHEET: Kid-Friendly Extras ────────────────────────────────────── */}
      <SheetModal visible={activeSheet === 'kidExtras'} onClose={() => setActiveSheet('none')}>
        <Text style={sh.title}>{'\uD83D\uDC3B'} Kid-friendly extras</Text>
        <Text style={sh.sub}>Near {currentStop.name}</Text>
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          {kidLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={C.orange} />
              <Text style={[sh.sub, { marginTop: 10 }]}>Finding kid-friendly spots…</Text>
            </View>
          ) : kidPlaces.length > 0 ? (
            <>
              {kidPlaces.map(place => (
                <View key={place.name} style={sh.extraCard}>
                  <View style={sh.extraCardTop}>
                    <View style={[sh.rowIcon, { backgroundColor: '#EEE8F8' }]}><Text>{'\uD83C\uDFA0'}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={sh.rowName}>{place.name}</Text>
                      <Text style={sh.rowDesc}>{place.distance}{place.ages ? ` · ${place.ages}` : ''}</Text>
                    </View>
                    <TouchableOpacity activeOpacity={0.7}
                      onPress={() => Linking.openURL(mapsUrl(place.name + ' near ' + address))}>
                      <Text style={sh.mapsLink}>Maps →</Text>
                    </TouchableOpacity>
                  </View>
                  {!!place.description && <Text style={sh.extraDesc}>{place.description}</Text>}
                  <TouchableOpacity
                    style={[sh.addBtn, addingStop === place.name ? { opacity: 0.6 } : {}]}
                    disabled={addingStop === place.name}
                    onPress={() => addStopToPlan(place.name, place.stopType, 60)}>
                    <Text style={sh.addBtnText}>{addingStop === place.name ? 'Adding…' : '+ Add to plan'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[sh.seeAllBtn, { marginBottom: 8 }]} activeOpacity={0.85}
                onPress={() => { Linking.openURL(mapsUrl('kid-friendly activities near ' + address)); setActiveSheet('none'); }}>
                <Text style={sh.seeAllText}>See more on Google Maps →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={sh.seeAllBtn} activeOpacity={0.85}
              onPress={() => { Linking.openURL(mapsUrl('kid-friendly activities near ' + address)); setActiveSheet('none'); }}>
              <Text style={sh.seeAllText}>Search on Google Maps →</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <TouchableOpacity style={sh.cancelBtn} onPress={() => setActiveSheet('none')}>
          <Text style={sh.cancelText}>Close</Text>
        </TouchableOpacity>
      </SheetModal>

      {/* ── SHEET: Feedback / Mark Complete ─────────────────────────────── */}
      <SheetModal visible={activeSheet === 'feedback'} onClose={() => { Keyboard.dismiss(); setActiveSheet('none'); }}>
        <Text style={sh.title}>How was it?</Text>
        <Text style={sh.sub}>{currentStop.name} · {duration} min planned</Text>
        <View style={sh.emojiRow}>
          {([
            { emoji: '\uD83C\uDF1F', label: 'Big Hit',        sub: 'Kids loved it',   val: 'big_hit'        as FeedbackRating },
            { emoji: '\uD83D\uDC4D', label: 'Good',           sub: 'Worth the time',  val: 'good'           as FeedbackRating },
            { emoji: '⏭\uFE0F', label: 'Skip next time', sub: "Wouldn’t return", val: 'skip_next_time' as FeedbackRating },
          ] as const).map(opt => (
            <TouchableOpacity key={opt.val}
              style={[sh.emojiOpt, feedbackRating === opt.val && sh.emojiOptSel]}
              activeOpacity={0.8}
              onPress={() => { Keyboard.dismiss(); setFeedbackRating(opt.val); }}>
              <Text style={sh.emojiOptIcon}>{opt.emoji}</Text>
              <Text style={sh.emojiOptLabel}>{opt.label}</Text>
              <Text style={sh.emojiOptSub}>{opt.sub}</Text>
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
          blurOnSubmit
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <TouchableOpacity style={sh.feedbackSubmit} activeOpacity={0.88}
          onPress={() => handleMarkComplete(false)}
          disabled={submittingFeedback}>
          {submittingFeedback
            ? <ActivityIndicator color="#fff" />
            : <Text style={sh.feedbackSubmitText}>Done — mark complete</Text>}
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
              { icon: '\u26A1', bg: '#FFF3E0', name: 'Tighten travel gaps', desc: 'Cut buffer — still doable',
                onPress: () => { Alert.alert('Travel gaps tightened', 'Buffers between stops reduced.'); setActiveSheet('none'); } },
              { icon: '\u2702\uFE0F', bg: C.sageLt,  name: 'Shorten this stop', desc: 'Highlights only — 45 min',
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
            <TouchableOpacity style={sh.row} activeOpacity={0.8}
              onPress={() => {
                if (!foodLoaded && !foodLoading && address) {
                  setFoodLoading(true);
                  loadFoodNearby(address, currentStop?.latitude, currentStop?.longitude).then(places => {
                    setFoodPlaces(places); setFoodLoaded(true); setFoodLoading(false);
                  });
                }
                setActiveSheet('food');
              }}>
              <View style={[sh.rowIcon, { backgroundColor: C.orangeLt }]}><Text>{'\u2615'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={sh.rowName}>Find a nearby cafe</Text>
                <Text style={sh.rowDesc}>Browse cafes and snack spots close by</Text>
              </View>
              <Text style={sh.rowChev}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sh.row} activeOpacity={0.8}
              onPress={() => loadBreakPlaces()}>
              <View style={[sh.rowIcon, { backgroundColor: C.sageLt }]}><Text>{'\uD83C\uDF33'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={sh.rowName}>Quick outdoor break</Text>
                <Text style={sh.rowDesc}>Find a nearby park or break spot</Text>
              </View>
              <Text style={sh.rowChev}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sh.row} activeOpacity={0.8}
              onPress={() => loadKidPlaces()}>
              <View style={[sh.rowIcon, { backgroundColor: '#EEE8F8' }]}><Text>{'\uD83D\uDC3B'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={sh.rowName}>Kid-friendly extras</Text>
                <Text style={sh.rowDesc}>Museums, play spots &amp; treats nearby</Text>
              </View>
              <Text style={sh.rowChev}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sh.row} activeOpacity={0.8}
              onPress={() => { setActiveSheet('none'); router.push('/(tabs)/today'); }}>
              <View style={[sh.rowIcon, { backgroundColor: C.bg }]}><Text>{'\uD83C\uDFE0'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={sh.rowName}>Head back early</Text>
                <Text style={sh.rowDesc}>Wrap up — great job today!</Text>
              </View>
              <Text style={sh.rowChev}>›</Text>
            </TouchableOpacity>
          </>
        )}
        {rescueType === 'skip' && (
          <>
            <Text style={sh.title}>Skip this stop?</Text>
            <Text style={sh.sub}>We’ll keep the rest of your day</Text>
            {[
              { icon: '⏭', bg: C.redLt, name: 'Skip, go to next', desc: 'Move to the next stop', onPress: handleSkipStop },
              { icon: '\uD83C\uDFE0', bg: C.bg,    name: 'Wrap up for the day', desc: 'End here — great job today',
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
            <TouchableOpacity style={sh.row} activeOpacity={0.8}
              onPress={() => setActiveSheet('food')}>
              <View style={[sh.rowIcon, { backgroundColor: C.sageLt }]}><Text>{'\uD83C\uDF55'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={sh.rowName}>Upgrade lunch</Text>
                <Text style={sh.rowDesc}>Find great restaurants nearby</Text>
              </View>
              <Text style={sh.rowChev}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sh.row} activeOpacity={0.8}
              onPress={() => {
                setActiveSheet('none');
                Alert.alert(
                  'Find something active',
                  'Look for a nearby trampoline park, mini golf, bowling alley, or arcade to add some energy to your day.',
                  [
                    { text: 'Got it', style: 'cancel' },
                    { text: 'Open Maps', onPress: () => { if (address) Linking.openURL(mapsUrl('activities near ' + address)); } },
                  ]
                );
              }}>
              <View style={[sh.rowIcon, { backgroundColor: C.purpleLt }]}><Text>{'\uD83C\uDFAD'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={sh.rowName}>Find something active</Text>
                <Text style={sh.rowDesc}>Trampoline park, mini golf, arcade…</Text>
              </View>
              <Text style={sh.rowChev}>›</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={sh.cancelBtn} onPress={() => setActiveSheet('none')}>
          <Text style={sh.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </SheetModal>

      {showPhotoSheet && mode === 'detail' && (
        <StopPickerSheet
          trip={trip as any}
          onDismiss={() => setShowPhotoSheet(false)}
          onSelect={handleStopSelectFromAtStop}
        />
      )}
      {currentStop && (
        <RescueSheet
          visible={showAtstopRescue}
          onClose={() => setShowAtstopRescue(false)}
          context="stop"
          stops={dayStops}
          currentStopIndex={Math.max(0, stopIdx)}
          tripId={trip?.id}
          dayIndex={dayIndex}
          stopId={currentStop.id}
          stopLat={currentStop.latitude ?? undefined}
          stopLng={currentStop.longitude ?? undefined}
          stopName={currentStop.name}
          destination={trip?.destination ?? trip?.city ?? undefined}
          onDropStop={async (stopId: string) => {
            await apiFetch(`/api/travel/stops/${stopId}`, {
              method: 'PATCH',
              body: JSON.stringify({ isSkipped: true }),
            });
          }}
          onStopsChanged={() => { void load(); }}
        />
      )}
      <UpgradeSheet
        visible={upgradeVisible}
        onClose={() => {
          setUpgradeVisible(false);
          router.replace('/(tabs)/today');
        }}
        context="at_stop"
      />
      <KidPickerScreen
        visible={kidPickerVisible}
        kids={kidPlayers}
        onSelect={kid => {
          setKidPickerVisible(false);
          if (!currentStop) return;
          keepDetailOnFocus.current = true;
          router.push({ pathname: '/kids' as never, params: {
            stopId: currentStop.id,
            stopName: encodeURIComponent(currentStop.name),
            tripId: trip?.id ?? '',
            explorerName: encodeURIComponent(kid.playerName),
            explorerId: kid.playerId,
            ageBand: kid.ageBand,
          }});
        }}
        onClose={() => setKidPickerVisible(false)}
      />
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
  // Rescue (kept for sheet content)
  rescueSection: { marginHorizontal: 20, marginTop: 14 },
  sectionLabel: { fontFamily: F.bold, fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8 },
  rescueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: C.card, borderRadius: 13, borderWidth: 1.5,
    borderColor: C.border, marginBottom: 7 },
  rescueIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  rescueLabel: { fontFamily: F.semibold, fontSize: 13, color: C.deep, flex: 1 },
  rescueChev: { fontSize: 14, color: C.muted },
  // 2x2 Action grid
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 20, marginTop: 12 },
  gridCard: { width: '47%', backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  gridIcon: { fontSize: 24, marginBottom: 8 },
  gridTitle: { fontFamily: F.bold, fontSize: 14, color: C.deep, marginBottom: 2 },
  gridSub: { fontFamily: F.medium, fontSize: 11, color: C.muted, lineHeight: 16 },
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
  // Bullet list (Best way section)
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  bulletDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.orange, marginTop: 6, flexShrink: 0 },
  bulletText: { fontFamily: F.regular, fontSize: 13, color: C.deep, lineHeight: 21, flex: 1 },
  numBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.orangeLt,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  numBadgeText: { fontFamily: F.bold, fontSize: 11, color: C.orange },
  // CTAs
  ctaGroup: { marginHorizontal: 20, marginTop: 20, gap: 8 },
  ctaPrimary: { backgroundColor: C.orange, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  ctaPrimaryText: { fontFamily: F.bold, fontSize: 16, color: '#fff' },
  ctaSecondary: { backgroundColor: C.card, borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#E0DDD8' },
  ctaSecondaryText: { fontFamily: F.bold, fontSize: 14, color: '#8A8FA8' },
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
  emojiOptSub:   { fontFamily: F.regular,  fontSize: 10, color: C.muted, marginTop: 2 },
  feedbackInput: { fontFamily: F.regular, fontSize: 14, color: C.deep, backgroundColor: C.bg,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border, padding: 12,
    marginBottom: 14, minHeight: 72, textAlignVertical: 'top' },
  feedbackSubmit: { backgroundColor: C.green, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
  feedbackSubmitText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipText: { fontFamily: F.semibold, fontSize: 13, color: C.muted },
  // Food nearby
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border },
  dirBtn: { backgroundColor: C.orangeLt, borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(232,105,42,0.25)' },
  dirBtnText: { fontFamily: F.semibold, fontSize: 12, color: C.orange },
  seeAllBtn: { marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  seeAllText: { fontFamily: F.semibold, fontSize: 14, color: C.deep },
  // Extra place cards (break / kid extras / food enhanced)
  extraCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    padding: 14, marginBottom: 12 },
  extraCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  extraDesc: { fontFamily: F.regular, fontSize: 13, color: C.muted, lineHeight: 19, marginBottom: 10 },
  addBtn: { backgroundColor: C.orange, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  addBtnText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  mapsLink: { fontFamily: F.semibold, fontSize: 13, color: '#2563EB' },
});
