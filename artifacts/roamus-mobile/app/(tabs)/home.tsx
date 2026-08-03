/**
 * Home tab.
 *
 * Two mutually-exclusive states:
 *   • Active trip  — single live card + teaser strips (no discover feed)
 *   • No trip      — discover feed (community/AI picks) + teaser strips
 *
 * Trip selection uses selectActiveTrip() from lib/tripUtils so this tab always
 * agrees with the Today tab on which trip is "active".
 */

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ExpoLocation from "expo-location";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/authContext";
import { API_BASE, apiFetch } from "@/lib/apiClient";
import RescueSheet from "@/components/RescueSheet";
import { F, G } from "@/lib/tokens";
import { selectActiveTrip, getTripStatusInfo, parseLocalDate } from "@/lib/tripUtils";
import {
  AI_PICKS,
  AGE_FILTERS,
  CITY_FILTERS,
  DURATION_FILTERS,
  DiscoverItem,
  CommunityShare,
  GridCard,
  HeroCard,
  getDestinationImage,
  normalizeShare,
} from "@/app/discover/index";

const TAB_BAR_H = 72; // standard iOS/Android tab bar height (excluding safe area)

// ─── SOTW types + filter list ─────────────────────────────────────────────────
type SotwFilter = 'playground' | 'beach' | 'coffee' | 'dessert' | 'food' | 'restrooms';
interface SotwPlace {
  placeId: string; name: string; vicinity: string;
  lat: number; lng: number;
  photoReference: string | null; detourMinutes: number; onRoute: boolean;
}
const SOTW_FILTERS: [SotwFilter, string, string][] = [
  ['playground', '\uD83D\uDEDD', 'Playgrounds'],
  ['beach',      '\uD83C\uDFD6', 'Beach'],
  ['coffee',     '\u2615',        'Coffee'],
  ['dessert',    '\uD83C\uDF66',  'Desserts'],
  ['food',       '\uD83C\uDF55',  'Food'],
  ['restrooms',  '\uD83D\uDEBB',  'Restrooms'],
];

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal trip shape fetched for the Home card. */
type HomeTripData = {
  id: string;
  name: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  currentDayIndex?: number | null;
  tripDays?: number | null;
  plannerTripDays?: number | null;
  coverImageUrl?: string | null;
  firstPhotoUrl?: string | null;
  destination?: string | null;
  city?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Active-trip card ────────────────────────────────────────────────────────

function ActiveTripCard({
  trip,
  onPress,
  devDate,
}: {
  trip: HomeTripData;
  onPress: () => void;
  devDate?: Date | null;
}) {
  const { dayLabel, statusLine, ctaLabel } = getTripStatusInfo(trip, devDate);
  const isLive = trip.status !== "completed" && !!trip.startDate;
  const imageUri = trip.firstPhotoUrl ?? trip.coverImageUrl ?? null;
  const tripName = trip.name || trip.destination || trip.city || "Your Trip";

  // Fall back to Wikipedia city photo when no user/cover photo is available
  const [wikiImage, setWikiImage] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (imageUri) return;
    const city = trip.city ?? trip.destination ?? "";
    if (!city) return;
    let cancelled = false;
    getDestinationImage(city).then(url => { if (!cancelled && url) setWikiImage(url); }).catch(() => {});
    return () => { cancelled = true; };
  }, [imageUri, trip.city, trip.destination]);
  const displayImage = imageUri ?? wikiImage;

  return (
    <Pressable style={ac.root} onPress={onPress} android_ripple={{ color: "rgba(255,255,255,0.1)" }}>
      {/* Background image */}
      {displayImage ? (
        <Image source={{ uri: displayImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: G.deep }]} />
      )}

      {/* Dark gradient overlay */}
      <LinearGradient
        colors={["rgba(15,18,30,0.35)", "rgba(15,18,30,0.82)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Content */}
      <View style={ac.content}>
        {/* Live pill */}
        <View style={ac.livePill}>
          {isLive && <View style={ac.liveDot} />}
          <Text style={ac.liveTxt}>{isLive ? "LIVE TRIP" : "TRIP"}</Text>
        </View>

        {/* Trip name */}
        <Text style={ac.name} numberOfLines={2}>{tripName}</Text>

        {/* Day badge + status line */}
        <View style={ac.meta}>
          <View style={ac.dayBadge}>
            <Text style={ac.dayTxt}>{dayLabel}</Text>
          </View>
          <Text style={ac.statusLine} numberOfLines={1}>{statusLine}</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={ac.cta} onPress={onPress} activeOpacity={0.85}>
          <Text style={ac.ctaTxt}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

const ac = StyleSheet.create({
  root: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    height: 220,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "flex-end",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  liveTxt: {
    fontFamily: F.bold,
    fontSize: 10,
    color: "#fff",
    letterSpacing: 1.2,
  },
  name: {
    fontFamily: F.bold,
    fontSize: 24,
    color: "#fff",
    letterSpacing: -0.4,
    marginBottom: 10,
    lineHeight: 30,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  dayBadge: {
    backgroundColor: G.orange,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayTxt: {
    fontFamily: F.bold,
    fontSize: 12,
    color: "#fff",
  },
  statusLine: {
    fontFamily: F.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
    flex: 1,
  },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: G.orange,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  ctaTxt: {
    fontFamily: F.bold,
    fontSize: 14,
    color: "#fff",
  },
});

// ─── Teaser strip ─────────────────────────────────────────────────────────────

function TeaserStrip({
  emoji,
  title,
  subtitle,
  ctaLabel,
  accentColor,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  accentColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={ts.card} onPress={onPress} activeOpacity={0.88}>
      <View style={[ts.iconWrap, { backgroundColor: accentColor + "18" }]}>
        <Text style={ts.icon}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ts.title}>{title}</Text>
        <Text style={ts.sub}>{subtitle}</Text>
      </View>
      <View style={[ts.pill, { backgroundColor: accentColor }]}>
        <Text style={ts.pillTxt}>{ctaLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const ts = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: G.card,
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(26,31,46,0.07)",
    padding: 14,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  icon: { fontSize: 22 },
  title: { fontFamily: F.bold, fontSize: 14, color: G.deep, marginBottom: 2 },
  sub: { fontFamily: F.regular, fontSize: 12, color: G.muted, lineHeight: 17 },
  pill: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  pillTxt: { fontFamily: F.bold, fontSize: 12, color: "#fff" },
});

// ─── Full-bleed hero (States 2–4) ─────────────────────────────────────────────

type FullBleedVariant = 'completed' | 'countdown' | 'anticipation';

function FullBleedHero({
  trip,
  variant,
  daysAgo,
  daysUntil,
  firstName,
  insetTop,
  insetBottom,
  onPress,
  onPlanTrip,
}: {
  trip: HomeTripData;
  variant: FullBleedVariant;
  daysAgo?: number;
  daysUntil?: number;
  firstName: string | null;
  insetTop: number;
  insetBottom: number;
  onPress: () => void;
  onPlanTrip: () => void;
}) {
  const tripName = trip.name || trip.destination || trip.city || "Your Trip";
  const imageUri = trip.firstPhotoUrl ?? trip.coverImageUrl ?? null;

  // Wikipedia city photo fallback
  const [wikiImage, setWikiImage] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (imageUri) return;
    const city = trip.city ?? trip.destination ?? "";
    if (!city) return;
    let cancelled = false;
    getDestinationImage(city)
      .then(url => { if (!cancelled && url) setWikiImage(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [imageUri, trip.city, trip.destination]);
  const displayImage = imageUri ?? wikiImage;

  // Eyebrow
  const isCompleted = variant === "completed";
  const dotColor = isCompleted ? "#E8B84A" : "#6BB4D9";
  const eyebrowTextColor = isCompleted ? "#F0CC7A" : "#9DD3EC";
  let eyebrowText = "";
  if (isCompleted) {
    eyebrowText =
      daysAgo === 0 ? "TRIP COMPLETE \u00B7 TODAY"
      : daysAgo === 1 ? "TRIP COMPLETE \u00B7 YESTERDAY"
      : `TRIP COMPLETE \u00B7 ${daysAgo} DAYS AGO`;
  } else {
    eyebrowText = "UPCOMING TRIP";
  }

  // Second line
  let secondLine = "";
  if (variant === "completed") {
    secondLine = `Relive ${tripName} \u2192`;
  } else if (variant === "countdown") {
    secondLine = `${daysUntil} ${daysUntil === 1 ? "day" : "days"} until departure`;
  } else {
    secondLine = "is coming up";
  }

  return (
    <Pressable style={fbh.root} onPress={onPress}>
      {/* Background photo or solid fallback */}
      {displayImage ? (
        <Image
          source={{ uri: displayImage }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#1A2540" }]} />
      )}

      {/* Gradient overlay — matches spec: heavy at top & bottom, light in middle */}
      <LinearGradient
        colors={[
          "rgba(10,14,25,0.55)",
          "rgba(10,14,25,0.10)",
          "rgba(10,14,25,0.55)",
          "rgba(10,14,25,0.97)",
        ]}
        locations={[0, 0.30, 0.62, 1.0]}
        style={StyleSheet.absoluteFill}
      />

      {/* Content */}
      <View
        style={[
          fbh.content,
          { paddingTop: insetTop + 8, paddingBottom: insetBottom + 28 },
        ]}
      >
        {/* Header row: greeting + Plan FAB */}
        <View style={fbh.headerRow}>
          <Text style={fbh.greetTxt}>
            {greeting()}{firstName ? `,\n${firstName}` : ""}
          </Text>
          <TouchableOpacity style={fbh.planFab} onPress={onPlanTrip} activeOpacity={0.85}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Status block */}
        <View style={fbh.statusBlock}>
          {/* Eyebrow row */}
          <View style={fbh.eyebrowRow}>
            <View style={[fbh.eyebrowDot, { backgroundColor: dotColor }]} />
            <Text style={[fbh.eyebrowTxt, { color: eyebrowTextColor }]}>
              {eyebrowText}
            </Text>
          </View>

          {/* Trip name */}
          <Text style={fbh.tripName} numberOfLines={3}>
            {tripName}
          </Text>

          {/* Second line */}
          <Text style={fbh.nextLine}>{secondLine}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const fbh = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0E14" },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    flexDirection: "column",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 6,
  },
  greetTxt: {
    fontFamily: F.bold,
    fontSize: 21,
    color: "white",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  planFab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBlock: { marginBottom: 6 },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  eyebrowTxt: {
    fontFamily: F.bold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  tripName: {
    color: "white",
    fontSize: 32,
    fontFamily: F.bold,
    lineHeight: 36,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
    marginBottom: 6,
  },
  nextLine: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: F.regular,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const firstName = user?.firstName || user?.username || null;

  // ── Trips (for active-trip detection) ─────────────────────────────────────
  const [trips, setTrips] = useState<HomeTripData[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  // Dev-only date override — refreshed on every focus so navigating back
  // from any screen picks up the latest value.
  const [devDate, setDevDate] = useState<Date | null>(null);

  // Refresh trips + devDate every time Home comes into focus so a newly
  // created (or status-changed) trip is picked up without a full app restart.
  useFocusEffect(useCallback(() => {
    setTripsLoading(true);
    apiFetch<{ trips: HomeTripData[] }>("/api/travel/trips")
      .then(data => {
        if (Array.isArray(data?.trips)) setTrips(data.trips);
      })
      .catch(() => {})
      .finally(() => setTripsLoading(false));

    if (!__DEV__) return;
    AsyncStorage.getItem('dev_date_override').then(raw => {
      if (raw) { const d = new Date(raw + 'T12:00:00'); if (!isNaN(d.getTime())) setDevDate(d); }
      else setDevDate(null);
    }).catch(() => {});
  }, []));

  const activeTrip = selectActiveTrip(trips, devDate ?? undefined);

  // ── Scroll tracking for FAB collapse ────────────────────────────────────
  const homeScrollY = useRef(new Animated.Value(0)).current;
  const fabLabelOpacity = homeScrollY.interpolate({ inputRange: [120, 180], outputRange: [1, 0], extrapolate: 'clamp' });
  const fabLabelMaxW    = homeScrollY.interpolate({ inputRange: [120, 180], outputRange: [68, 0], extrapolate: 'clamp' });

  // ── Rescue + SOTW state ───────────────────────────────────────────────────
  const [showRescue, setShowRescue] = useState(false);
  const [rescueStops, setRescueStops] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [sotwVisible, setSotwVisible] = useState(false);
  const [sotwFilter, setSotwFilter] = useState<SotwFilter>('playground');
  const [sotwPlaces, setSotwPlaces] = useState<SotwPlace[]>([]);
  const [sotwLoading, setSotwLoading] = useState(false);
  const [sotwGoing, setSotwGoing] = useState<string | null>(null);
  const [sotwQuery, setSotwQuery] = useState('');
  const [sotwRadius, setSotwRadius] = useState(5000);
  const sotwSlideY = useRef(new Animated.Value(900)).current;

  // Compare dates by local calendar day (YYYY-MM-DD) to avoid UTC/timezone mismatch.
  // e.g. end_date stored as "2026-08-02T00:00:00Z" parses to Aug 1 local in CDT,
  // so timestamp comparison breaks — local string comparison is always correct.
  const toLocalYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Is the active trip live today (date-wise)?
  const isActiveToday = useMemo(() => {
    if (!activeTrip?.startDate || !activeTrip?.endDate) return false;
    if (activeTrip.status === 'completed' || activeTrip.status === 'archived') return false;
    const ref   = devDate ?? new Date();
    const nowYMD   = toLocalYMD(new Date(ref));
    const startYMD = toLocalYMD(new Date(activeTrip.startDate));
    const endYMD   = toLocalYMD(new Date(activeTrip.endDate));
    return nowYMD >= startYMD && nowYMD <= endYMD;
  }, [activeTrip, devDate]);

  const rescueDayIndex = useMemo(() => {
    if (!activeTrip?.startDate) return 0;
    const ref   = devDate ?? new Date();
    const nowYMD   = toLocalYMD(new Date(ref));
    const startYMD = toLocalYMD(new Date(activeTrip.startDate));
    // Count calendar days between start and now
    const msPerDay = 86_400_000;
    const startMidnight = new Date(activeTrip.startDate); startMidnight.setHours(0, 0, 0, 0);
    const nowMidnight   = new Date(ref);                  nowMidnight.setHours(0, 0, 0, 0);
    void nowYMD; void startYMD; // used above for isActiveToday
    return Math.max(0, Math.floor((nowMidnight.getTime() - startMidnight.getTime()) / msPerDay));
  }, [activeTrip?.startDate, devDate]);

  const rescueCurrentIdx = Math.max(
    0,
    rescueStops.findIndex((s: any) => !s.isVisited && !s.visited && !s.isSkipped),
  );

  // ── Priority-state computation (5 states, evaluated top-to-bottom) ─────────
  //
  // Uses parseLocalDate (local-midnight dates) so CDT/UTC offsets don't shift
  // the comparison across the day boundary the way `new Date(isoString)` would.
  //
  // selectActiveTrip() has tier-3/4 fallbacks that return *something* even when
  // no trip is running — so we cannot rely on `activeTrip` alone for branching.
  // Instead we compute homeState independently from the raw trips array.
  type HomeState =
    | { kind: 'active'; trip: HomeTripData }
    | { kind: 'completed'; trip: HomeTripData; daysAgo: number }
    | { kind: 'countdown'; trip: HomeTripData; daysUntil: number }
    | { kind: 'anticipation'; trip: HomeTripData; daysUntil: number }
    | { kind: 'discover' };

  const homeState = useMemo((): HomeState => {
    const ref = devDate ?? new Date();
    const refMidnight = new Date(ref); refMidnight.setHours(0, 0, 0, 0);
    const refMs = refMidnight.getTime();

    // P1 — any trip with today inside its [startDate, endDate] window,
    //        or with an explicit active/in_progress status
    const activeNow = trips.find(t => {
      if (t.status === 'active' || t.status === 'in_progress') return true;
      const s = parseLocalDate(t.startDate);
      const e = parseLocalDate(t.endDate);
      if (!s || !e) return false;
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      return refMs >= s.getTime() && refMs <= e.getTime();
    });
    if (activeNow) return { kind: 'active', trip: activeNow as HomeTripData };

    // P2 — most recently completed trip whose endDate is 1–3 calendar days ago.
    //        Anchored to endDate (NOT the server's completion-marking timestamp).
    //        Beats P3 even if a future trip is imminent.
    let bestCompleted: HomeTripData | null = null;
    let bestCompletedDays = Infinity;
    for (const t of trips) {
      const e = parseLocalDate(t.endDate);
      if (!e) continue;
      e.setHours(0, 0, 0, 0);
      if (e.getTime() >= refMs) continue; // ends today or future → still in range
      const daysAgo = Math.round((refMs - e.getTime()) / 86_400_000);
      if (daysAgo <= 3 && daysAgo < bestCompletedDays) {
        bestCompleted = t as HomeTripData;
        bestCompletedDays = daysAgo;
      }
    }
    if (bestCompleted) return { kind: 'completed', trip: bestCompleted, daysAgo: bestCompletedDays };

    // P3 / P4 — soonest upcoming trip (startDate strictly after today).
    //            ≤7 days → countdown; 8+ days → anticipation.
    let bestUpcoming: HomeTripData | null = null;
    let bestUpcomingDays = Infinity;
    for (const t of trips) {
      const s = parseLocalDate(t.startDate);
      if (!s) continue;
      s.setHours(0, 0, 0, 0);
      if (s.getTime() <= refMs) continue; // already started (or today)
      const daysUntil = Math.round((s.getTime() - refMs) / 86_400_000);
      if (daysUntil < bestUpcomingDays) {
        bestUpcoming = t as HomeTripData;
        bestUpcomingDays = daysUntil;
      }
    }
    if (bestUpcoming) {
      return bestUpcomingDays <= 7
        ? { kind: 'countdown',    trip: bestUpcoming, daysUntil: bestUpcomingDays }
        : { kind: 'anticipation', trip: bestUpcoming, daysUntil: bestUpcomingDays };
    }

    // P5 — nothing active, nothing recently completed, nothing upcoming
    return { kind: 'discover' };
  }, [trips, devDate]);

  // Fetch real day stops + location when rescue sheet opens
  useEffect(() => {
    if (!showRescue || !activeTrip) return;
    // Fetch stops with full data (isVisited, durationMinutes, etc.)
    apiFetch<{ stops: any[] }>(`/api/travel/trips/${activeTrip.id}/stops`)
      .then(data => {
        const day = (data.stops ?? [])
          .filter((s: any) => s.dayIndex === rescueDayIndex)
          .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        setRescueStops(day);
      }).catch(() => {});
    // Request location permission
    (async () => {
      try {
        const { status } = await ExpoLocation.getForegroundPermissionsAsync();
        let loc: { lat: number; lng: number } | null = null;
        if (status === 'granted') {
          const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced }).catch(() => null);
          if (pos) loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } else if (status !== 'denied') {
          const { status: ns } = await ExpoLocation.requestForegroundPermissionsAsync();
          if (ns === 'granted') {
            const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced }).catch(() => null);
            if (pos) loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          }
        }
        if (loc) setUserLoc(loc);
      } catch {}
    })();
  }, [showRescue, activeTrip?.id, rescueDayIndex]);

  async function fetchRescueStops() {
    if (!activeTrip) return;
    apiFetch<{ stops: any[] }>(`/api/travel/trips/${activeTrip.id}/stops`)
      .then(data => {
        const day = (data.stops ?? [])
          .filter((s: any) => s.dayIndex === rescueDayIndex)
          .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        setRescueStops(day);
      }).catch(() => {});
  }

  async function handleRescueDrop(stopId: string) {
    try {
      await apiFetch(`/api/travel/stops/${stopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSkipped: true }),
      });
    } catch {}
    void fetchRescueStops();
  }

  async function handleRescueWrapDay() {
    if (!activeTrip) return;
    try {
      await apiFetch(`/api/travel/trips/${activeTrip.id}/skip-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayIndex: rescueDayIndex }),
      });
    } catch {}
  }

  async function openSotwSheet() {
    setSotwPlaces([]);
    setSotwFilter('playground');
    setSotwQuery('');
    setSotwRadius(5000);
    sotwSlideY.setValue(900);
    setSotwVisible(true);
    Animated.spring(sotwSlideY, { toValue: 0, useNativeDriver: true, damping: 28, stiffness: 300 }).start();

    // Always try to resolve location when the sheet opens
    let loc = userLoc;
    if (!loc) {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced }).catch(() => null);
          if (pos) {
            loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLoc(loc);
          }
        } else {
          // iOS won't re-prompt once denied — guide to Settings
          Alert.alert(
            'Location needed',
            'To find stops nearby, allow location access in Settings.',
            [
              { text: 'Not now', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => Linking.openURL(Platform.OS === 'ios' ? 'app-settings:' : 'app-settings:'),
              },
            ]
          );
        }
      } catch {}
    }
    if (loc) void fetchSotwPlaces('playground', loc);
  }

  async function fetchSotwPlaces(filter: SotwFilter, loc?: { lat: number; lng: number }, overrideRadius?: number, overrideQuery?: string) {
    const position = loc ?? userLoc;
    if (!position) return;
    const radius = overrideRadius ?? sotwRadius;
    const query  = overrideQuery  ?? sotwQuery;
    setSotwFilter(filter);
    setSotwLoading(true);
    try {
      let url = `/api/travel/stops-on-the-way?lat=${position.lat}&lng=${position.lng}&type=${filter}&tripId=${activeTrip?.id ?? ''}&radius=${radius}`;
      if (query.trim()) url += `&query=${encodeURIComponent(query.trim())}`;
      const data = await apiFetch<{ results: SotwPlace[] }>(url);
      setSotwPlaces(data.results ?? []);
    } catch {
      setSotwPlaces([]);
    } finally {
      setSotwLoading(false);
    }
  }

  function closeSotwSheet() {
    Animated.timing(sotwSlideY, { toValue: 900, duration: 250, useNativeDriver: true }).start(() => setSotwVisible(false));
  }

  async function addBreakStopFromSotw(place: SotwPlace) {
    if (!activeTrip) return;
    setSotwGoing(place.placeId);
    const stopTypeMap: Record<string, string> = { food: 'restaurant', coffee: 'cafe', dessert: 'dessert', beach: 'beach', playground: 'park' };
    const stopType = stopTypeMap[sotwFilter] ?? 'other';
    try {
      const stopRes = await apiFetch<{ stop?: { id: string }; id?: string }>(`/api/travel/trips/${activeTrip.id}/stops`, {
        method: 'POST',
        body: JSON.stringify({
          name: place.name,
          stopType,
          latitude: place.lat,
          longitude: place.lng,
          address: place.vicinity,
          durationMinutes: 30,
        }),
      });
      const createdId = (stopRes as any)?.stop?.id ?? (stopRes as any)?.id ?? null;
      if (createdId) {
        await apiFetch(`/api/travel/stops/${createdId}/visit`, { method: 'POST' }).catch(() => {});
      }
    } catch { /* best-effort */ }
    setSotwGoing(null);
    closeSotwSheet();
    // Stash the place so Today tab can open the break-stop capture screen
    await AsyncStorage.setItem('pending_break_place', JSON.stringify(place)).catch(() => {});
    router.push('/(tabs)/today');
  }

  // ── Discover feed state ───────────────────────────────────────────────────
  const [tab, setTab] = useState<"community" | "ai">("community");
  const [communityItems, setCommunityItems] = useState<DiscoverItem[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [quickUpvoted, setQuickUpvoted] = useState<Record<string, boolean>>({});

  const [activeCity, setActiveCity] = useState("All");
  const [activeDuration, setActiveDuration] = useState<string | null>(null);
  const [activeAge, setActiveAge] = useState<string | null>(null);

  // Only fetch community shares in State 5 (Discover) — saves a request in all other states.
  // homeState is recalculated after trips load, so this effect runs at the right time.
  useEffect(() => {
    if (homeState.kind !== 'discover') return;
    fetch(`${API_BASE}/api/travel/shares?limit=30`)
      .then(r => r.json())
      .then(async (data: CommunityShare[]) => {
        if (!Array.isArray(data)) return;
        const normalized = data.map(normalizeShare);
        const enriched = await Promise.all(
          normalized.map(async item => {
            if (item.heroImageUrl) return item;
            const wikiImg = await getDestinationImage(item.destination);
            return { ...item, heroImageUrl: wikiImg };
          })
        );
        setCommunityItems(enriched);
      })
      .catch(() => {})
      .finally(() => setDiscoverLoading(false));
  }, [activeTrip]);

  async function handleQuickUpvote(itemId: string) {
    setQuickUpvoted(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    try {
      let vid = await AsyncStorage.getItem("roamus_visitor_id");
      if (!vid || !/^v_[a-z0-9]{10,20}$/.test(vid)) {
        vid = "v_" + Math.random().toString(36).slice(2, 14);
        await AsyncStorage.setItem("roamus_visitor_id", vid);
      }
      await fetch(`${API_BASE}/api/travel/shares/${itemId}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: vid }),
      });
    } catch {}
  }

  const rawItems = tab === "community" ? communityItems : AI_PICKS;

  const filtered = useMemo(() => {
    return rawItems.filter(item => {
      if (activeCity !== "All" && !item.destination?.toLowerCase().includes(activeCity.toLowerCase())) return false;
      if (activeDuration === "weekend" && item.durationDays > 2) return false;
      if (activeDuration === "3-5" && (item.durationDays < 3 || item.durationDays > 5)) return false;
      if (activeAge && item.ageRange) {
        const ar = item.ageRange.toLowerCase();
        if (activeAge === "toddlers" && !ar.includes("1") && !ar.includes("2") && !ar.includes("3") && !ar.includes("toddler")) return false;
        if (activeAge === "6-10" && !ar.includes("6") && !ar.includes("7") && !ar.includes("8") && !ar.includes("9") && !ar.includes("10") && ar !== "all ages") return false;
        if (activeAge === "teens" && !ar.includes("12") && !ar.includes("teen") && !ar.includes("13") && ar !== "all ages") return false;
      }
      return true;
    });
  }, [rawItems, activeCity, activeDuration, activeAge]);

  function handlePress(item: DiscoverItem) {
    router.push({
      pathname: "/discover/[slug]" as any,
      params: {
        slug: item.slug,
        isAiPick: item.isAiPick ? "true" : "false",
        heroImageUrl: item.heroImageUrl || "",
      },
    });
  }

  const heroItem = filtered[0];
  const gridItems = filtered.slice(1);

  // ── Shared header ─────────────────────────────────────────────────────────
  const header = (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={s.greeting}>
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </Text>
        <Text style={s.headerSub}>
          {activeTrip ? "You have an active trip" : "Plan your next adventure"}
        </Text>
      </View>
      <View style={s.headerActions}>
        <TouchableOpacity
          style={s.planBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/onboarding/where" as any)}
        >
          <Text style={s.planBtnTxt}>Plan a trip →</Text>
        </TouchableOpacity>
        <Pressable
          style={({ pressed }) => [s.logoutBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => logout()}
          hitSlop={8}
        >
          <Ionicons name="log-out-outline" size={20} color={G.muted} />
        </Pressable>
      </View>
    </View>
  );

  // ── Teaser strips (always shown) ───────────────────────────────────────────
  const teasers = (
    <>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>YOUR ROAMUS</Text>
      <TeaserStrip
        emoji="📸"
        title="Trip Memories"
        subtitle="Relive your family's favourite moments"
        ctaLabel="See all"
        accentColor={G.orange}
        onPress={() => router.push("/(tabs)/memories" as any)}
      />
      <TeaserStrip
        emoji="🎮"
        title="Kids Zone"
        subtitle="See your rewards"
        ctaLabel="Explore"
        accentColor="#7C3AED"
        onPress={() => router.push("/(tabs)/kidszone" as any)}
      />
    </>
  );

  // ── Discover More strip (shown in active-trip branch only) ─────────────────
  const discoverMore = (
    <>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>DISCOVER MORE</Text>
      <TouchableOpacity
        style={dm.row}
        activeOpacity={0.82}
        onPress={() => router.push("/discover" as any)}
      >
        <View style={dm.iconWrap}>
          <Text style={dm.icon}>🌍</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={dm.title}>Discover trips</Text>
          <Text style={dm.sub}>Community picks + AI ideas for your family</Text>
        </View>
        <Text style={dm.chevron}>{"›"}</Text>
      </TouchableOpacity>
    </>
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (tripsLoading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        {header}
        <View style={s.center}>
          <ActivityIndicator color={G.orange} />
        </View>
      </View>
    );
  }

  // ── State 2 — Just completed (endDate 1–3 days ago, beats upcoming) ────────
  if (homeState.kind === 'completed') {
    const { trip, daysAgo } = homeState;
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E14' }}>
        <FullBleedHero
          trip={trip}
          variant="completed"
          daysAgo={daysAgo}
          firstName={firstName}
          insetTop={insets.top}
          insetBottom={insets.bottom}
          onPress={() => router.push(`/memories/${trip.id}/recap` as any)}
          onPlanTrip={() => router.push('/onboarding/where' as any)}
        />
      </View>
    );
  }

  // ── State 3 — Upcoming, ≤7 days ────────────────────────────────────────────
  if (homeState.kind === 'countdown') {
    const { trip, daysUntil } = homeState;
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E14' }}>
        <FullBleedHero
          trip={trip}
          variant="countdown"
          daysUntil={daysUntil}
          firstName={firstName}
          insetTop={insets.top}
          insetBottom={insets.bottom}
          onPress={() => router.push(`/trip/${trip.id}` as any)}
          onPlanTrip={() => router.push('/onboarding/where' as any)}
        />
      </View>
    );
  }

  // ── State 4 — Upcoming, 8+ days ────────────────────────────────────────────
  if (homeState.kind === 'anticipation') {
    const { trip, daysUntil } = homeState;
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E14' }}>
        <FullBleedHero
          trip={trip}
          variant="anticipation"
          daysUntil={daysUntil}
          firstName={firstName}
          insetTop={insets.top}
          insetBottom={insets.bottom}
          onPress={() => router.push(`/trip/${trip.id}` as any)}
          onPlanTrip={() => router.push('/onboarding/where' as any)}
        />
      </View>
    );
  }

  // ── State 1 — Active trip (already shipped, kept as-is) ───────────────────
  if (homeState.kind === 'active') {
    const activeTripData = homeState.trip;
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        {header}
        <Animated.ScrollView
          style={s.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: homeScrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          <ActiveTripCard
            trip={activeTripData}
            devDate={devDate}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/today" as any,
                params: { tripId: activeTripData.id },
              })
            }
          />
          {discoverMore}
          {teasers}
        </Animated.ScrollView>

        {/* Rescue FAB — floating, only during live trip dates */}
        {isActiveToday && (
          <TouchableOpacity
            style={[hs.rescueFab, { bottom: insets.bottom + 90 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowRescue(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />
            <Animated.View style={{ overflow: 'hidden', maxWidth: fabLabelMaxW, opacity: fabLabelOpacity, marginLeft: 6 }}>
              <Text style={hs.rescueFabLabel}>Rescue</Text>
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* RescueSheet — standalone, loads real stops on open */}
        {isActiveToday && (
          <RescueSheet
            visible={showRescue}
            onClose={() => setShowRescue(false)}
            context="morning"
            stops={rescueStops}
            currentStopIndex={rescueCurrentIdx}
            tripId={activeTripData.id}
            dayIndex={rescueDayIndex}
            destination={activeTripData.destination ?? activeTripData.city ?? activeTripData.name}
            onDropStop={handleRescueDrop}
            onWrapDay={handleRescueWrapDay}
            onStopsChanged={fetchRescueStops}
            onOpenSotw={() => { setShowRescue(false); void openSotwSheet(); }}
          />
        )}

        {/* SOTW sheet — slides up from bottom */}
        {sotwVisible && (
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { transform: [{ translateY: sotwSlideY }], zIndex: 200, elevation: 200 }]}
          >
            <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={closeSotwSheet} />
            <View style={[hs.sotwSheet, { paddingBottom: TAB_BAR_H + insets.bottom + 16 }]}>
              <View style={hs.sotwHandle} />
              <View style={hs.sotwHeader}>
                <Text style={hs.sotwTitle}>Quick Stops Nearby</Text>
                <TouchableOpacity onPress={closeSotwSheet} hitSlop={8}>
                  <Text style={hs.sotwDone}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Filter pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 16, paddingRight: 24, paddingVertical: 8 }}
                style={{ flexShrink: 0 }}
              >
                {SOTW_FILTERS.map(([f, emoji, label]) => (
                  <TouchableOpacity
                    key={f}
                    style={[hs.sotwPill, sotwFilter === f && hs.sotwPillOn, { marginRight: 8 }]}
                    onPress={() => { setSotwFilter(f); void fetchSotwPlaces(f); }}
                  >
                    <Text>{emoji}</Text>
                    <Text style={[hs.sotwPillTxt, sotwFilter === f && hs.sotwPillTxtOn]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Search bar */}
              <View style={hs.sotwSearchRow}>
                <Text style={hs.sotwSearchIcon}>{'\uD83D\uDD0D'}</Text>
                <TextInput
                  style={hs.sotwSearchInput}
                  placeholder="Search a specific place…"
                  placeholderTextColor="#B0ADA8"
                  value={sotwQuery}
                  onChangeText={setSotwQuery}
                  onSubmitEditing={() => { void fetchSotwPlaces(sotwFilter, undefined, sotwRadius, sotwQuery); }}
                  onBlur={() => { void fetchSotwPlaces(sotwFilter, undefined, sotwRadius, sotwQuery); }}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
              </View>

              {/* Results */}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                {sotwLoading ? (
                  <ActivityIndicator color={G.orange} style={{ marginTop: 28 }} />
                ) : !userLoc ? (
                  <Text style={hs.sotwEmpty}>Enable location to find nearby stops.</Text>
                ) : sotwPlaces.length === 0 ? (
                  <Text style={hs.sotwEmpty}>No places found nearby — try another filter.</Text>
                ) : (
                  <>
                    <Text style={hs.sotwCount}>{sotwPlaces.length} {sotwPlaces.length === 1 ? 'place' : 'places'} found</Text>
                    {sotwPlaces.map((place, index) => {
                      const photoUrl = place.photoReference
                        ? `${API_BASE}/api/travel/place-photo?ref=${encodeURIComponent(place.photoReference)}`
                        : null;
                      const going = sotwGoing === place.placeId;

                      if (index === 0) {
                        return (
                          <View key={place.placeId} style={hs.sotwFeat}>
                            {photoUrl ? (
                              <Image source={{ uri: photoUrl }} style={hs.sotwFeatImg} contentFit="cover" />
                            ) : (
                              <View style={[hs.sotwFeatImg, { backgroundColor: '#D1D5E0' }]} />
                            )}
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.65)']}
                              style={hs.sotwFeatGrad}
                            >
                              <Text style={hs.sotwFeatName} numberOfLines={2}>{place.name}</Text>
                            </LinearGradient>
                            <View style={hs.sotwFeatMeta}>
                              {place.onRoute && (
                                <View style={hs.sotwOnRouteBadge}>
                                  <Text style={hs.sotwOnRouteTxt}>On route</Text>
                                </View>
                              )}
                              <View style={hs.sotwBadge}>
                                <Text style={hs.sotwBadgeTxt}>{'+' + place.detourMinutes + ' min'}</Text>
                              </View>
                              <Text style={hs.sotwFeatAddr} numberOfLines={1}>{place.vicinity}</Text>
                            </View>
                            <TouchableOpacity
                              style={[hs.sotwLetsGo, going && { opacity: 0.7 }]}
                              activeOpacity={0.85}
                              onPress={() => { void addBreakStopFromSotw(place); }}
                              disabled={!!sotwGoing}
                            >
                              {going
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={hs.sotwLetsGoTxt}>{"Let's go"}</Text>
                              }
                            </TouchableOpacity>
                          </View>
                        );
                      }

                      return (
                        <View key={place.placeId} style={hs.sotwRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={hs.sotwCardName} numberOfLines={1}>{place.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                              {place.onRoute && (
                                <View style={hs.sotwOnRouteBadge}>
                                  <Text style={hs.sotwOnRouteTxt}>On route</Text>
                                </View>
                              )}
                              <View style={hs.sotwBadge}>
                                <Text style={hs.sotwBadgeTxt}>{'+' + place.detourMinutes + ' min'}</Text>
                              </View>
                              <Text style={hs.sotwCardSub} numberOfLines={1}>{place.vicinity}</Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={[hs.sotwGoBtn, going && { opacity: 0.7 }]}
                            activeOpacity={0.85}
                            onPress={() => { void addBreakStopFromSotw(place); }}
                            disabled={!!sotwGoing}
                          >
                            {going
                              ? <ActivityIndicator color="#fff" size="small" />
                              : <Text style={hs.sotwGoBtnTxt}>Go</Text>
                            }
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    {/* Load more — expands radius by 5 km */}
                    <TouchableOpacity
                      style={hs.sotwLoadMore}
                      activeOpacity={0.85}
                      onPress={() => {
                        const newRadius = sotwRadius + 5000;
                        setSotwRadius(newRadius);
                        void fetchSotwPlaces(sotwFilter, undefined, newRadius, sotwQuery);
                      }}
                    >
                      <Text style={hs.sotwLoadMoreTxt}>
                        {sotwRadius > 5000
                          ? `Expand further (\u00B1${Math.round(sotwRadius / 1000)} km radius)`
                          : 'Load more'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </Animated.View>
        )}
      </View>
    );
  }

  // ── State 5 — Discover (nothing active, recently completed, or upcoming) ────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {header}

      {/* ── Community / AI tabs ─────────────────────────────────────── */}
      <View style={s.tabsWrap}>
        <TouchableOpacity
          style={[s.tabBtn, tab === "community" && s.tabBtnOn]}
          onPress={() => setTab("community")}
        >
          <Text style={[s.tabBtnTxt, tab === "community" && s.tabBtnTxtOn]}>Community</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === "ai" && s.tabBtnOn]}
          onPress={() => setTab("ai")}
        >
          <Text style={[s.tabBtnTxt, tab === "ai" && s.tabBtnTxtOn]}>AI Picks</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Filter chips ────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {CITY_FILTERS.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.fchip, activeCity === c && s.fchipOn]}
              onPress={() => setActiveCity(c)}
            >
              <Text style={[s.fchipTxt, activeCity === c && s.fchipTxtOn]}>{c}</Text>
            </TouchableOpacity>
          ))}
          {DURATION_FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[s.fchip, activeDuration === f.id && s.fchipOn]}
              onPress={() => setActiveDuration(activeDuration === f.id ? null : f.id)}
            >
              <Text style={[s.fchipTxt, activeDuration === f.id && s.fchipTxtOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
          {AGE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[s.fchip, activeAge === f.id && s.fchipOn]}
              onPress={() => setActiveAge(activeAge === f.id ? null : f.id)}
            >
              <Text style={[s.fchipTxt, activeAge === f.id && s.fchipTxtOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── AI banner ───────────────────────────────────────────── */}
        {tab === "ai" && (
          <View style={s.aiBanner}>
            <Text style={s.aiBannerIco}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.aiBannerTitle}>Curated trips for families</Text>
              <Text style={s.aiBannerSub}>Pick a template — AI adapts stops for your kids' ages and pace.</Text>
            </View>
          </View>
        )}

        {/* ── Loading ─────────────────────────────────────────────── */}
        {tab === "community" && discoverLoading && (
          <View style={s.center}>
            <ActivityIndicator color={G.orange} />
            <Text style={s.loadingTxt}>Finding community trips…</Text>
          </View>
        )}

        {/* ── Empty state ─────────────────────────────────────────── */}
        {!discoverLoading && filtered.length === 0 && (
          <View style={s.center}>
            <Text style={s.emptyTxt}>No trips match your filters.</Text>
            <TouchableOpacity onPress={() => { setActiveCity("All"); setActiveDuration(null); setActiveAge(null); }}>
              <Text style={s.emptyReset}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Hero card ───────────────────────────────────────────── */}
        {heroItem && (
          <HeroCard
            item={heroItem}
            onPress={() => handlePress(heroItem)}
            isUpvoted={!!quickUpvoted[heroItem.id]}
            onUpvote={heroItem.isAiPick ? undefined : () => handleQuickUpvote(heroItem.id)}
          />
        )}

        {/* ── Grid ────────────────────────────────────────────────── */}
        {gridItems.length > 0 && (
          <View style={s.grid}>
            {gridItems.map(item => (
              <GridCard
                key={item.id}
                item={item}
                onPress={() => handlePress(item)}
                isUpvoted={!!quickUpvoted[item.id]}
                onUpvote={item.isAiPick ? undefined : () => handleQuickUpvote(item.id)}
              />
            ))}
          </View>
        )}

        {teasers}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: G.bg },
  scroll: { flex: 1 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 6,
  },
  greeting: { fontFamily: F.bold, fontSize: 20, color: G.deep, letterSpacing: -0.3 },
  headerSub: { fontFamily: F.regular, fontSize: 13, color: G.muted, marginTop: 2 },
  headerActions: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  planBtn: {
    backgroundColor: G.orange, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  planBtnTxt: { fontFamily: F.bold, fontSize: 13, color: "#fff" },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(26,31,46,0.07)",
    alignItems: "center", justifyContent: "center",
  },

  // Tabs
  tabsWrap: {
    flexDirection: "row", backgroundColor: "rgba(26,31,46,0.06)",
    borderRadius: 14, marginHorizontal: 16, marginBottom: 12, padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  tabBtnOn: {
    backgroundColor: G.card,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  tabBtnTxt: { fontFamily: F.bold, fontSize: 13, color: G.muted },
  tabBtnTxtOn: { color: G.deep },

  // Filters
  filterRow: { paddingHorizontal: 16, marginBottom: 12 },
  fchip: {
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(26,31,46,0.08)",
    backgroundColor: G.card, marginRight: 7,
  },
  fchipOn: { backgroundColor: G.deep, borderColor: G.deep },
  fchipTxt: { fontFamily: F.bold, fontSize: 12, color: G.muted },
  fchipTxtOn: { color: "#fff" },

  // AI banner
  aiBanner: {
    flexDirection: "row", gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "rgba(124,58,237,0.05)",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.15)",
    borderRadius: 14, padding: 12,
  },
  aiBannerIco: { fontSize: 18 },
  aiBannerTitle: { fontFamily: F.bold, fontSize: 13, color: G.deep, marginBottom: 2 },
  aiBannerSub: { fontFamily: F.regular, fontSize: 12, color: G.muted, lineHeight: 18 },

  // States
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 },
  loadingTxt: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  emptyTxt: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  emptyReset: { fontFamily: F.bold, fontSize: 14, color: G.orange },

  // Grid
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 16, gap: 10, marginBottom: 12,
  },

  // Teaser section
  divider: {
    height: 1, backgroundColor: "rgba(26,31,46,0.07)",
    marginHorizontal: 16, marginTop: 8, marginBottom: 18,
  },
  sectionLabel: {
    fontFamily: F.bold, fontSize: 11, color: G.muted,
    letterSpacing: 1, marginHorizontal: 16, marginBottom: 10,
  },
});

// ── Rescue FAB + SOTW sheet styles ───────────────────────────────────────────
const hs = StyleSheet.create({
  rescueFab: {
    position: 'absolute', right: 20,
    flexDirection: 'row', alignItems: 'center',
    height: 46, paddingHorizontal: 18, borderRadius: 23,
    backgroundColor: '#B91C1C',
    shadowColor: '#B91C1C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.42, shadowRadius: 10, elevation: 7,
  },
  rescueFabLabel: { color: '#fff', fontSize: 14, fontFamily: F.bold },

  sotwSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '88%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 20,
  },
  sotwHandle: { width: 36, height: 4, backgroundColor: '#D1D5E0', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sotwHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  sotwTitle: { fontFamily: F.bold, fontSize: 17, color: '#1A1F2E' },
  sotwDone: { fontFamily: F.semibold, fontSize: 14, color: G.orange },

  sotwPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(26,31,46,0.1)',
    backgroundColor: '#F5F5F7',
  },
  sotwPillOn: { backgroundColor: G.orange, borderColor: G.orange },
  sotwPillTxt: { fontFamily: F.medium, fontSize: 13, color: '#1A1F2E' },
  sotwPillTxtOn: { color: '#fff' },

  sotwEmpty: { fontFamily: F.regular, fontSize: 14, color: '#8A8FA8', textAlign: 'center', marginTop: 32 },

  sotwCount: { fontFamily: F.medium, fontSize: 13, color: '#8A8FA8', marginBottom: 10, marginTop: 2 },

  // Featured (first) card
  sotwFeat: {
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#E8EAF0',
    marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(26,31,46,0.07)',
  },
  sotwFeatImg: { width: '100%', height: 170 },
  sotwFeatGrad: {
    position: 'absolute', left: 0, right: 0, top: 0, height: 170,
    justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 10,
  },
  sotwFeatName: { fontFamily: F.bold, fontSize: 17, color: '#fff' },
  sotwFeatMeta: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: 6, paddingHorizontal: 14, paddingVertical: 10,
  },
  sotwFeatAddr: { fontFamily: F.regular, fontSize: 12, color: '#8A8FA8', flex: 1, minWidth: 80 },
  sotwLetsGo: {
    marginHorizontal: 14, marginBottom: 12,
    backgroundColor: G.orange, borderRadius: 12, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  sotwLetsGoTxt: { fontFamily: F.bold, fontSize: 15, color: '#fff' },

  // Non-featured row cards
  sotwRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9F9FB', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(26,31,46,0.07)',
    padding: 14, marginBottom: 10, gap: 10,
  },
  sotwCardName: { fontFamily: F.semibold, fontSize: 15, color: '#1A1F2E', marginBottom: 2 },
  sotwCardSub: { fontFamily: F.regular, fontSize: 12, color: '#8A8FA8' },
  sotwGoBtn: {
    backgroundColor: '#1A1F2E', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center', minWidth: 50,
  },
  sotwGoBtnTxt: { fontFamily: F.bold, fontSize: 13, color: '#fff' },

  // On-route badge
  sotwOnRouteBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  sotwOnRouteTxt: { fontFamily: F.semibold, fontSize: 10, color: '#2E7D32' },

  sotwBadge: { backgroundColor: '#FDF0E9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  sotwBadgeTxt: { fontFamily: F.semibold, fontSize: 12, color: G.orange },

  // Search bar
  sotwSearchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#F5F5F7', borderRadius: 12,
    paddingHorizontal: 12, height: 40,
    borderWidth: 1, borderColor: 'rgba(26,31,46,0.08)',
  },
  sotwSearchIcon: { fontSize: 14 },
  sotwSearchInput: { flex: 1, fontFamily: F.regular, fontSize: 14, color: '#1A1F2E', paddingVertical: 0 },

  // Load more
  sotwLoadMore: {
    marginTop: 10, borderRadius: 12, borderWidth: 1.5,
    borderColor: 'rgba(26,31,46,0.14)', paddingVertical: 12,
    alignItems: 'center', backgroundColor: '#F9F9FB',
  },
  sotwLoadMoreTxt: { fontFamily: F.semibold, fontSize: 13, color: '#1A1F2E' },
});

// ── Discover More row styles ───────────────────────────────────────────────────
const dm = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: G.card,
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(26,31,46,0.07)",
    padding: 14,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "rgba(26,31,46,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  icon: { fontSize: 22 },
  title: { fontFamily: F.bold, fontSize: 14, color: G.deep, marginBottom: 2 },
  sub: { fontFamily: F.regular, fontSize: 12, color: G.muted, lineHeight: 17 },
  chevron: { fontFamily: F.bold, fontSize: 22, color: G.muted, marginLeft: 4 },
});
