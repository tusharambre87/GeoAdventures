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
import { selectActiveTrip, getTripStatusInfo } from "@/lib/tripUtils";
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

const TAB_BAR_H = 62; // standard iOS/Android tab bar height (excluding safe area)

// ─── SOTW types + filter list ─────────────────────────────────────────────────
type SotwFilter = 'playground' | 'beach' | 'coffee' | 'food' | 'restrooms';
interface SotwPlace {
  placeId: string; name: string; vicinity: string;
  lat: number; lng: number;
  photoReference: string | null; detourMinutes: number; onRoute: boolean;
}
const SOTW_FILTERS: [SotwFilter, string, string][] = [
  ['playground', '\uD83D\uDEDD', 'Playgrounds'],
  ['beach',      '\uD83C\uDFD6', 'Beach'],
  ['coffee',     '\u2615',        'Coffee'],
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const firstName = user?.firstName || user?.username || null;

  // ── Trips (for active-trip detection) ─────────────────────────────────────
  const [trips, setTrips] = useState<HomeTripData[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ trips: HomeTripData[] }>("/api/travel/trips")
      .then(data => {
        if (Array.isArray(data?.trips)) setTrips(data.trips);
      })
      .catch(() => {})
      .finally(() => setTripsLoading(false));
  }, []);

  // Dev-only date override — refreshed on every focus so navigating back
  // from any screen picks up the latest value.
  const [devDate, setDevDate] = useState<Date | null>(null);
  useFocusEffect(useCallback(() => {
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
  const sotwSlideY = useRef(new Animated.Value(900)).current;

  // Is the active trip live today (date-wise)?
  const isActiveToday = useMemo(() => {
    if (!activeTrip?.startDate || !activeTrip?.endDate) return false;
    if (activeTrip.status === 'completed' || activeTrip.status === 'archived') return false;
    const ref = devDate ?? new Date();
    const now = new Date(ref); now.setHours(0, 0, 0, 0);
    const start = new Date(activeTrip.startDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(activeTrip.endDate);   end.setHours(23, 59, 59, 999);
    return now >= start && now <= end;
  }, [activeTrip, devDate]);

  const rescueDayIndex = useMemo(() => {
    if (!activeTrip?.startDate) return 0;
    const ref = devDate ?? new Date();
    const now = new Date(ref); now.setHours(0, 0, 0, 0);
    const start = new Date(activeTrip.startDate); start.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
  }, [activeTrip?.startDate, devDate]);

  const rescueCurrentIdx = Math.max(
    0,
    rescueStops.findIndex((s: any) => !s.isVisited && !s.visited && !s.isSkipped),
  );

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

  async function fetchSotwPlaces(filter: SotwFilter, loc?: { lat: number; lng: number }) {
    const position = loc ?? userLoc;
    if (!position) return;
    setSotwFilter(filter);
    setSotwLoading(true);
    try {
      const data = await apiFetch<{ results: SotwPlace[] }>(
        `/api/travel/stops-on-the-way?lat=${position.lat}&lng=${position.lng}&type=${filter}&tripId=${activeTrip?.id ?? ''}`
      );
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

  // ── Discover feed state ───────────────────────────────────────────────────
  const [tab, setTab] = useState<"community" | "ai">("community");
  const [communityItems, setCommunityItems] = useState<DiscoverItem[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [quickUpvoted, setQuickUpvoted] = useState<Record<string, boolean>>({});

  const [activeCity, setActiveCity] = useState("All");
  const [activeDuration, setActiveDuration] = useState<string | null>(null);
  const [activeAge, setActiveAge] = useState<string | null>(null);

  // Only fetch community shares when there's no active trip (saves a request)
  useEffect(() => {
    if (activeTrip !== undefined) return; // skip if we already know there's a trip
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

  // ── Active-trip branch ────────────────────────────────────────────────────
  if (activeTrip) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        {header}
        <Animated.ScrollView
          style={s.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: homeScrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          <ActiveTripCard
            trip={activeTrip as HomeTripData}
            devDate={devDate}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/today" as any,
                params: { tripId: activeTrip.id },
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
            tripId={activeTrip.id}
            dayIndex={rescueDayIndex}
            destination={activeTrip.destination ?? activeTrip.city ?? activeTrip.name}
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}>
                {SOTW_FILTERS.map(([f, emoji, label]) => (
                  <TouchableOpacity
                    key={f}
                    style={[hs.sotwPill, sotwFilter === f && hs.sotwPillOn]}
                    onPress={() => { setSotwFilter(f); void fetchSotwPlaces(f); }}
                  >
                    <Text>{emoji}</Text>
                    <Text style={[hs.sotwPillTxt, sotwFilter === f && hs.sotwPillTxtOn]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Results */}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                {sotwLoading ? (
                  <ActivityIndicator color={G.orange} style={{ marginTop: 28 }} />
                ) : !userLoc ? (
                  <Text style={hs.sotwEmpty}>Enable location to find nearby stops.</Text>
                ) : sotwPlaces.length === 0 ? (
                  <Text style={hs.sotwEmpty}>No places found nearby — try another filter.</Text>
                ) : (
                  sotwPlaces.map(place => (
                    <TouchableOpacity
                      key={place.placeId}
                      style={hs.sotwCard}
                      activeOpacity={0.85}
                      onPress={() => Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`
                      )}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={hs.sotwCardName} numberOfLines={1}>{place.name}</Text>
                        <Text style={hs.sotwCardSub} numberOfLines={1}>{place.vicinity}</Text>
                      </View>
                      <View style={hs.sotwBadge}>
                        <Text style={hs.sotwBadgeTxt}>{'+' + place.detourMinutes + ' min'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </Animated.View>
        )}
      </View>
    );
  }

  // ── No-trip discover branch ───────────────────────────────────────────────
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
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

  sotwCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9F9FB', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(26,31,46,0.07)',
    padding: 14, marginBottom: 10, gap: 10,
  },
  sotwCardName: { fontFamily: F.semibold, fontSize: 15, color: '#1A1F2E', marginBottom: 2 },
  sotwCardSub: { fontFamily: F.regular, fontSize: 12, color: '#8A8FA8' },
  sotwBadge: { backgroundColor: '#FDF0E9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  sotwBadgeTxt: { fontFamily: F.semibold, fontSize: 12, color: G.orange },
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
