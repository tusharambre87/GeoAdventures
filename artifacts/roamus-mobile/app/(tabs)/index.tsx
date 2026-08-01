import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { useQuery } from "@tanstack/react-query";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/authContext";
import { travelAPI, type Trip, API_BASE } from "@/lib/apiClient";
import { CITY_IMGS, F, G } from "@/lib/tokens";
import { getDestinationImage } from "@/app/discover/index";
import { isFreePlan } from "@/lib/subscription";
import { useOnboarding } from "@/lib/onboardingContext";
import { preCacheTrip } from "@/lib/tripCache";
import { selectActiveTrip } from "@/lib/tripUtils";
import UpgradeSheet from "@/components/UpgradeSheet";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const datePart = s.split('T')[0].split(' ')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function ActiveHeroCard({ trip, offlineReady, isDownloading, user, onUpgradePress, onDownloadPress }: { trip: Trip; offlineReady?: boolean; isDownloading?: boolean; user?: ReturnType<typeof useAuth>['user']; onUpgradePress?: () => void; onDownloadPress?: () => void }) {
  const [bgErr, setBgErr] = React.useState(false);
  const [wikiImage, setWikiImage] = React.useState<string | null>(null);
  const isFree = isFreePlan(user?.subscriptionTier);
  const rawCity = trip.destination ?? "";
  const city = rawCity || (trip.name ?? "").replace(/\s+(family trip|trip|adventure)$/i, "").trim();
  const firstStopId = (trip as any).stops?.[0]?.id;
  // Prefer family-uploaded photos, then cover, then wiki city photo
  const staticBg = trip.firstPhotoUrl ?? trip.coverImageUrl ?? CITY_IMGS[city] ?? null;
  const bg = !bgErr
    ? (staticBg ?? wikiImage ?? (firstStopId ? `${API_BASE}/api/travel/stops/${firstStopId}/hero-img` : null))
    : wikiImage ?? null;

  // Fetch wiki city photo as hero-image fallback
  React.useEffect(() => {
    if (staticBg) return;
    let cancelled = false;
    getDestinationImage(city).then(url => { if (!cancelled && url) setWikiImage(url); }).catch(() => {});
    return () => { cancelled = true; };
  }, [city, staticBg]);

  // ── Active day computation ──────────────────────────────────────────────────
  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const tripStart = trip.startDate ? parseLocalDate(trip.startDate) : null;
  const totalDays = trip.tripDays
    ?? (trip.startDate && trip.endDate
      ? Math.round(((parseLocalDate(trip.endDate)?.getTime() ?? 0) - (parseLocalDate(trip.startDate)?.getTime() ?? 0)) / 86_400_000) + 1
      : 0);
  const tripEnd       = trip.endDate ? parseLocalDate(trip.endDate) : null;
  if (tripEnd) tripEnd.setHours(23, 59, 59, 999);
  const isActiveNow   = tripStart
    ? (tripEnd ? tripStart <= today && tripEnd >= today : tripStart <= today)
    : false;
  // isTripPast: trip dates are fully in the past.
  // Also catches the common case where startDate is missing but endDate proves the trip is over.
  const isTripPast    = !isActiveNow && (
    (!!tripStart && tripStart <= today) ||
    (!!tripEnd && tripEnd < today)
  );
  const daysSince     = tripStart ? Math.floor((today.getTime() - tripStart.getTime()) / 86_400_000) : 0;
  const activeDayIdx  = Math.max(0, Math.min(daysSince, Math.max(totalDays - 1, 0)));
  const activeDay     = activeDayIdx + 1;
  const isLastDay     = isActiveNow && activeDay === totalDays && trip.status !== 'completed';

  // ── Next unvisited stop for active day ─────────────────────────────────────
  const dayStops = [...(trip.stops ?? [])]
    .filter(s => s.dayIndex === activeDayIdx)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const nextStop = dayStops.find(s => !s.isVisited && !s.visited) ?? dayStops[0];

  function handleContinue() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (trip.status === 'completed') {
      router.push(`/memories/${trip.id}/story` as any);
    } else if (isActiveNow) {
      router.push({ pathname: "/(tabs)/today", params: { tripId: trip.id } } as any);
    } else if (isTripPast) {
      router.push({ pathname: "/(tabs)/today", params: { tripId: trip.id, forceComplete: '1' } } as any);
    } else {
      router.push(`/trip/${trip.id}` as any);
    }
  }

  function handleViewPlan() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/trip/${trip.id}` as any);
  }

  return (
    <View style={s.heroCard}>
      {/* Dark green base */}
      <LinearGradient colors={['#1A3A2A', '#0D2118']} style={StyleSheet.absoluteFill} />
      {bg && (
        <>
          <Image
            source={{ uri: bg }}
            style={[StyleSheet.absoluteFill, { opacity: staticBg || wikiImage ? 1 : 0.12 }]}
            contentFit="cover"
            onError={() => setBgErr(true)}
          />
          <LinearGradient
            colors={staticBg || wikiImage ? ["rgba(8,22,14,0.25)", "rgba(8,22,14,0.88)"] : ["transparent", "rgba(8,22,14,0.94)"]}
            locations={[0.15, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      )}

      {/* Badge */}
      <View style={s.heroBadge}>
        <View style={[s.activeDot, isTripPast && { backgroundColor: '#F59E0B' }]} />
        <Text style={s.activeBadgeText}>{isTripPast ? 'PAST TRIP' : 'ACTIVE TRIP'}</Text>
      </View>

      {/* Trip name */}
      <Text style={s.heroTripName}>{trip.name}</Text>

      {/* Day + next stop */}
      <Text style={s.heroMeta} numberOfLines={1}>
        {isTripPast
          ? 'Your trip has ended'
          : ((totalDays > 0 ? `Day ${activeDay} of ${totalDays}` : '')
             + (nextStop ? ` \u00b7 Next: ${nextStop.name}` : ''))}
      </Text>

      {isFree ? (
        <Pressable
          style={({ pressed }) => [s.offlinePillLocked, { opacity: pressed ? 0.75 : 1 }]}
          onPress={onUpgradePress}
          hitSlop={8}
        >
          <Text style={s.offlinePillLockedTxt}>{"\uD83D\uDCF5 Offline available with Pass"}</Text>
        </Pressable>
      ) : offlineReady ? (
        <View style={s.offlinePill}>
          <Text style={s.offlinePillText}>{"\u2713 Available offline"}</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [s.offlinePillEmpty, { opacity: (pressed || isDownloading) ? 0.75 : 1 }]}
          onPress={onDownloadPress}
          disabled={isDownloading}
          hitSlop={8}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#E8692A" style={{ marginRight: 4 }} />
          ) : null}
          <Text style={s.offlinePillEmptyTxt}>
            {isDownloading ? "Downloading…" : "Download for offline →"}
          </Text>
        </Pressable>
      )}

      {/* Primary CTA */}
      <Pressable
        style={({ pressed }) => [s.continueBtn, { opacity: pressed ? 0.88 : 1 }]}
        onPress={handleContinue}>
        <Text style={s.continueBtnText}>
          {trip.status === 'completed'
            ? 'View memories →'
            // "Complete your trip" only when on the last day AND all stops for that day are done
            : isLastDay && dayStops.length > 0 && dayStops.every((s: any) => s.isVisited || s.visited)
              ? 'Complete your trip \u2192'
              : isActiveNow && activeDay > 1
                ? `\u25B6 Continue Day ${activeDay}`
                : isActiveNow
                  ? '\u25B6 Start Day 1'
                  : isTripPast
                    ? 'View Trip Story \u2192'
                    : 'View trip plan \u2192'}
        </Text>
      </Pressable>

      {/* Ghost link — only when active */}
      {isActiveNow && (
        <Pressable
          style={({ pressed }) => [s.viewPlanLink, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleViewPlan}>
          <Text style={s.viewPlanLinkText}>{"View full plan →"}</Text>
        </Pressable>
      )}
    </View>
  );
}

function TripCard({ trip, small }: { trip: Trip; small?: boolean }) {
  const [bgErr, setBgErr] = React.useState(false);
  const rawCity = trip.destination ?? "";
  const city = rawCity || (trip.name ?? "").replace(/\s+(family trip|trip|adventure)$/i, "").trim();
  const firstStopId = (trip as any).stops?.[0]?.id;
  const bg = !bgErr
    ? (CITY_IMGS[city] ?? trip.coverImageUrl ?? trip.firstPhotoUrl
        ?? (firstStopId ? `${API_BASE}/api/travel/stops/${firstStopId}/hero-img` : null))
    : null;
  const isCompleted = trip.status === "completed" || trip.status === "archived";

  function handlePress() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isCompleted) {
      router.push(`/memories/${trip.id}/recap` as any);
    } else {
      router.push(`/trip/${trip.id}` as any);
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [small ? s.tripCardSm : s.tripCard, { opacity: pressed ? 0.9 : 1 }]}
      onPress={handlePress}
    >
      {bg ? (
        <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setBgErr(true)} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: G.muted + "33", alignItems: "center", justifyContent: "center" }]}>
          <Ionicons name="map-outline" size={24} color={G.muted} />
        </View>
      )}
      <LinearGradient colors={["transparent", "rgba(6,8,16,0.75)"]} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
      <View style={s.tripCardLabel}>
        <Text style={s.tripCardName} numberOfLines={2}>{trip.name}</Text>
        {isCompleted && (
          <View style={s.completedBadge}>
            <Text style={s.completedBadgeText}>Completed</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}


// ─── Inspiration Section ──────────────────────────────────────────────────────

const INSPIRATION_CITIES: Array<{ city: string; slug: string; title: string; desc: string; days: number }> = [
  { city: 'New York',       slug: 'ai-newyork',      title: 'New York City Explorer',    desc: 'Iconic skyline & culture',      days: 3 },
  { city: 'Chicago',        slug: 'ai-chicago',       title: 'Chicago Family Adventure',  desc: 'Architecture & deep dish',       days: 3 },
  { city: 'San Francisco',  slug: 'ai-sanfrancisco',  title: 'San Francisco Discovery',   desc: 'Tech hub with stunning views',  days: 4 },
  { city: 'Orlando',        slug: 'ai-orlando',       title: 'Orlando Theme Parks',       desc: 'Theme parks & sunshine',         days: 4 },
  { city: 'Washington DC',  slug: 'ai-dc',            title: 'Washington DC Explorer',    desc: 'History & monuments',            days: 3 },
];

function InspirationSection() {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ fontFamily: F.bold, fontSize: 18, color: G.deep, marginBottom: 4, letterSpacing: -0.3 }}>
        Inspiration
      </Text>
      <Text style={{ fontFamily: F.regular, fontSize: 13, color: G.muted, marginBottom: 14 }}>
        Popular family destinations to get you started
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
        {INSPIRATION_CITIES.map(({ city, slug, title, desc, days }) => {
          const imgUrl = CITY_IMGS[city] ?? null;
          return (
            <TouchableOpacity
              key={city}
              activeOpacity={0.88}
              style={s.inspireCard}
              onPress={() => router.push({
                pathname: '/discover/[slug]',
                params: { slug, isAiPick: 'true', heroImageUrl: imgUrl ?? '' },
              } as any)}
            >
              {/* Photo area */}
              <View style={s.inspireImg}>
                {imgUrl ? (
                  <Image source={{ uri: imgUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A2A3A' }]} />
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.68)']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={s.inspireCity}>{city}</Text>
              </View>
              {/* Body */}
              <View style={s.inspireBody}>
                <Text style={s.inspireTitle} numberOfLines={2}>{title}</Text>
                <Text style={s.inspireMeta}>{days}d · AI curated</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[s.discoverBtn, { marginTop: 16 }]}
        onPress={() => router.push('/discover' as any)}
      >
        <View style={s.discoverBtnIco}>
          <Text style={{ fontSize: 18 }}>{'🌐'}</Text>
        </View>
        <View style={s.discoverBtnBody}>
          <Text style={s.discoverBtnTitle}>Discover all trips</Text>
          <Text style={s.discoverBtnSub}>Community picks + AI ideas for your family</Text>
        </View>
        <Text style={{ fontSize: 18, color: '#C4C7D4' }}>{'›'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const [cacheStatus, setCacheStatus] = useState<"idle" | "ready">("idle");
  const [downloading, setDownloading] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [overrideHeroId, setOverrideHeroId] = useState<string | null>(null);
  const [cachedTrips, setCachedTrips] = useState<Trip[] | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const fabCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('heroTripOverride').then(id => {
      if (id) setOverrideHeroId(id);
    });
  }, []);
  const { reset: resetOnboarding, set: setOnboarding, data: onboardingData } = useOnboarding();

  function startNewTrip() {
    const existingTravelers = onboardingData.travelers ?? [];
    resetOnboarding();
    setOnboarding({ onboardingInProgress: true, returningUser: true, travelers: existingTravelers });
    router.push("/onboarding/where" as any);
  }

  function handleFabPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (fabExpanded) {
      if (fabCollapseTimer.current) { clearTimeout(fabCollapseTimer.current); fabCollapseTimer.current = null; }
      setFabExpanded(false);
      Animated.spring(fabAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 }).start();
      startNewTrip();
    } else {
      if (fabCollapseTimer.current) clearTimeout(fabCollapseTimer.current);
      setFabExpanded(true);
      Animated.spring(fabAnim, { toValue: 1, useNativeDriver: false, tension: 80, friction: 10 }).start();
      fabCollapseTimer.current = setTimeout(() => {
        setFabExpanded(false);
        Animated.spring(fabAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 }).start();
        fabCollapseTimer.current = null;
      }, 3000);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/auth/splash");
  }
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top + 24;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 120;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["trips"],
    queryFn: () => travelAPI.getTrips(),
    retry: 1,
  });

  const trips = (isError && fromCache && cachedTrips) ? cachedTrips : (data?.trips ?? []);

  // Date-aware trip status helper (used for inProgressTrips display categorisation only)
  function isTripDateActive(t: Trip): boolean {
    if (!t.startDate || !t.endDate) return false;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const start = new Date(t.startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(t.endDate); end.setHours(23, 59, 59, 999);
    return now >= start && now <= end;
  }

  // Use shared 4-tier logic so Home and Today always agree on which trip is active
  const activeTrip = selectActiveTrip(trips);


  // Write last-good trips list to cache on every successful load
  useEffect(() => {
    if (data?.trips?.length) {
      AsyncStorage.setItem('cache_trips', JSON.stringify(data)).catch(() => {});
    }
  }, [data]);

  // Fall back to cached trips list when the query fails
  useEffect(() => {
    if (!isError) { setFromCache(false); return; }
    AsyncStorage.getItem('cache_trips').then(raw => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { trips: Trip[] };
        if (parsed.trips?.length) { setCachedTrips(parsed.trips); setFromCache(true); }
      } catch {}
    }).catch(() => {});
  }, [isError]);

  // On mount — restore cacheStatus only if an active/upcoming trip is actually cached
  useEffect(() => {
    if (user?.subscriptionTier === "free" || !trips.length) return;
    const checkCache = async () => {
      const activeOrUpcoming = trips.filter(
        t => t.status !== "completed" && t.status !== "archived"
      );
      const keys = await AsyncStorage.getAllKeys();
      const anyTripCached = activeOrUpcoming.some(t =>
        keys.includes(`roamus_cache_status_${t.id}`)
      );
      if (anyTripCached) setCacheStatus("ready");
    };
    checkCache().catch(() => {});
  }, [user?.subscriptionTier, trips]);

  // Pre-cache upcoming trips for paid users
  useEffect(() => {
    if (!token || user?.subscriptionTier === "free") return;
    const upcoming = trips.filter(t => {
      if (t.status === "completed" || t.status === "archived") return false;
      if (!t.startDate) return true;
      const msUntil = new Date(t.startDate).getTime() - Date.now();
      return msUntil <= 48 * 60 * 60 * 1000;
    });
    upcoming.forEach(t => {
      preCacheTrip(t.id, token)
        .then(() => setCacheStatus("ready"))
        .catch(() => {});
    });
    // Check if any trip already cached
    NetInfo.fetch().then(state => {
      if (!state.isConnected) setCacheStatus("ready");
    });
  }, [trips, token, user?.subscriptionTier]);
  const currentTrips = trips.filter(t => !["completed", "archived"].includes(t.status));
  const completedTrips = trips.filter(t => t.status === "completed" || t.status === "archived");
  const inProgressTrips = currentTrips.filter(t => isTripDateActive(t) || t.status === "active" || t.status === "in_progress");
  const upcomingTrips = currentTrips.filter(t => !inProgressTrips.some(ip => ip.id === t.id));

  // Hero: respect override, then date-active trip, then first current trip
  const heroTrip = overrideHeroId
    ? (currentTrips.find(t => t.id === overrideHeroId) ?? activeTrip ?? currentTrips[0] ?? null)
    : (activeTrip ?? currentTrips[0] ?? null);

  // Trips shown in the upcoming section (exclude the hero to avoid duplication)
  const upcomingTripsForSection = upcomingTrips.filter((t: any) => t.id !== heroTrip?.id);
  // Completed trips sorted latest-first
  const completedTripsSorted = [...completedTrips].sort((a: any, b: any) => {
    const aDate = (a.endDate ?? a.startDate ?? '');
    const bDate = (b.endDate ?? b.startDate ?? '');
    return bDate.localeCompare(aDate);
  });

  // Detect trips whose dates are fully in the past but not yet completed
  const isPastUnfinished = (() => {
    if (!heroTrip || !heroTrip.endDate) return false;
    if (heroTrip.status === "completed" || heroTrip.status === "archived") return false;
    const end = parseLocalDate(heroTrip.endDate);
    if (!end) return false;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return end < now;
  })();

  async function handleDownloadOffline() {
    if (!heroTrip || !token || downloading) return;
    setDownloading(true);
    try {
      await preCacheTrip(heroTrip.id, token);
      setCacheStatus("ready");
    } catch {
      Alert.alert("Download failed", "Could not download trip for offline use. Please check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  }

  function switchHeroTrip(tripId: string) {
    setOverrideHeroId(tripId);
    AsyncStorage.setItem('heroTripOverride', tripId);
    setShowSwitcher(false);
  }

  const displayName = user?.firstName || user?.username || user?.email?.split("@")[0] || "";

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: topPad, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={G.orange} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.greeting}>{greeting()}{displayName ? `, ${displayName}` : ""}</Text>
              <Text style={s.subGreeting}>
                {isLoading ? "Loading your trips…" : trips.length > 0 ? `${trips.length} trip${trips.length !== 1 ? "s" : ""} in your journal` : "Where will you roam next?"}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.logoutBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleLogout}
              hitSlop={8}
            >
              <Ionicons name="log-out-outline" size={20} color={G.muted} />
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={G.orange} />
            <Text style={s.loadingText}>Fetching your trips…</Text>
          </View>
        ) : isError && !fromCache ? (
          <View style={s.errorCard}>
            <Ionicons name="wifi-outline" size={28} color="#DC2626" />
            <Text style={s.errorTitle}>Couldn't load trips</Text>
            <Text style={s.errorMessage}>Check your connection and pull to refresh.</Text>
            <Pressable style={s.retryBtn} onPress={() => refetch()}>
              <Text style={s.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        ) : heroTrip ? (
          <>
            {fromCache && (
              <View style={{ backgroundColor: '#1F2937', paddingVertical: 7, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ color: '#D1FAE5', fontSize: 12, fontFamily: F.medium, letterSpacing: 0.2 }}>
                  {'Offline — showing your saved plan'}
                </Text>
              </View>
            )}
            <ActiveHeroCard
              trip={heroTrip}
              offlineReady={cacheStatus === "ready"}
              isDownloading={downloading}
              user={user}
              onUpgradePress={() => setUpgradeVisible(true)}
              onDownloadPress={handleDownloadOffline}
            />
            {isPastUnfinished && (
              <Pressable
                style={s.pastBanner}
                onPress={() => router.push({ pathname: "/(tabs)/today", params: { tripId: heroTrip.id } } as any)}
              >
                <Text style={s.pastBannerTitle}>{'⏰'} Your trip has ended</Text>
                <Text style={s.pastBannerSub}>Tap to wrap it up and save your story {'→'}</Text>
              </Pressable>
            )}
            {currentTrips.length > 1 && (
              <Pressable style={s.switchRow} onPress={() => setShowSwitcher(true)}>
                <Text style={s.switchText}>Switch trip {'→'}</Text>
              </Pressable>
            )}

            {/* Upcoming trips — excluding the hero to avoid duplication */}
            {upcomingTripsForSection.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Upcoming trips</Text>
                  {upcomingTripsForSection.length > 3 && (
                    <Pressable onPress={() => router.push('/trips/upcoming' as any)} hitSlop={8}>
                      <Text style={s.sectionLink}>See all {upcomingTripsForSection.length} {'→'}</Text>
                    </Pressable>
                  )}
                </View>
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -20 }}
                  contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}
                >
                  {upcomingTripsForSection.slice(0, 3).map(t => <TripCard key={t.id} trip={t} />)}
                </ScrollView>
              </View>
            )}

            {/* Completed trips — latest first */}
            {completedTripsSorted.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Past adventures</Text>
                  {completedTripsSorted.length > 3 && (
                    <Pressable onPress={() => router.push('/trips/completed' as any)} hitSlop={8}>
                      <Text style={s.sectionLink}>See all {completedTripsSorted.length} {'→'}</Text>
                    </Pressable>
                  )}
                </View>
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -20 }}
                  contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}
                >
                  {completedTripsSorted.slice(0, 3).map(t => <TripCard key={t.id} trip={t} />)}
                </ScrollView>
              </View>
            )}

            {/* Inspiration — shown when family has only one active trip and nothing else */}
            {upcomingTripsForSection.length === 0 && completedTripsSorted.length === 0 && (
              <InspirationSection />
            )}
          </>
        ) : (
          <>
            {/* Plan a trip hero — no current or upcoming trips */}
            <View style={s.planHero}>
              <LinearGradient colors={['#0D2118', '#1A3A2A']} style={StyleSheet.absoluteFill} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Ionicons name="compass-outline" size={20} color="rgba(255,255,255,0.6)" />
                <Text style={{ fontFamily: F.bold, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8 }}>
                  {completedTripsSorted.length > 0 ? 'PLAN YOUR NEXT ADVENTURE' : 'START YOUR JOURNEY'}
                </Text>
              </View>
              <Text style={{ fontFamily: F.bold, fontSize: 26, color: '#fff', letterSpacing: -0.5, marginBottom: 6 }}>
                {completedTripsSorted.length > 0 ? 'Ready for your\nnext trip?' : 'Where will you\nroam next?'}
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 20 }}>
                {completedTripsSorted.length > 0
                  ? 'Plan a new adventure and keep the memories coming.'
                  : 'Build your family itinerary with AI-powered stops, quests and memories.'}
              </Text>
              <Pressable
                style={({ pressed }: { pressed: boolean }) => [s.continueBtn, { opacity: pressed ? 0.88 : 1 }]}
                onPress={startNewTrip}
              >
                <Text style={s.continueBtnText}>Plan a trip {'→'}</Text>
              </Pressable>
            </View>

            {/* Completed trips for returning users with no active/upcoming */}
            {completedTripsSorted.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Past adventures</Text>
                  {completedTripsSorted.length > 3 && (
                    <Pressable onPress={() => router.push('/trips/completed' as any)} hitSlop={8}>
                      <Text style={s.sectionLink}>See all {completedTripsSorted.length} {'→'}</Text>
                    </Pressable>
                  )}
                </View>
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -20 }}
                  contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}
                >
                  {completedTripsSorted.slice(0, 3).map(t => <TripCard key={t.id} trip={t} />)}
                </ScrollView>
              </View>
            )}

            {/* Inspiration for brand-new users with no trips at all */}
            {completedTripsSorted.length === 0 && <InspirationSection />}
          </>
        )}
      </ScrollView>

      {/* Plan a trip FAB */}
      <TouchableOpacity
        style={[s.planTripFab, { bottom: insets.bottom + 90 }]}
        onPress={handleFabPress}
        activeOpacity={0.85}
      >
        <Animated.View style={[s.planTripFabInner, {
          width: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [52, 164] }),
        }]}>
          <Ionicons name="add" size={26} color="#fff" />
          <Animated.View style={{
            overflow: 'hidden',
            width: fabAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 104] }),
            opacity: fabAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }),
          }}>
            <Text style={s.planTripFabLabel} numberOfLines={1}>Plan a trip</Text>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>

      <UpgradeSheet
        visible={upgradeVisible}
        onClose={() => setUpgradeVisible(false)}
        context="at_stop"
      />

      <SwitchTripSheet
        visible={showSwitcher}
        trips={currentTrips}
        heroTripId={heroTrip?.id ?? null}
        insets={insets}
        onSelect={switchHeroTrip}
        onClose={() => setShowSwitcher(false)}
      />
    </View>
  );
}

// ─── SwitchTripSheet ──────────────────────────────────────────────────────────

const SCREEN_H = Dimensions.get('window').height;
const SCREEN_W = Dimensions.get('window').width;

function SwitchTripSheet({
  visible, trips, heroTripId, insets, onSelect, onClose,
}: {
  visible: boolean;
  trips: Trip[];
  heroTripId: string | null;
  insets: { bottom: number };
  onSelect: (tripId: string) => void;
  onClose: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 180,
    }).start();
  }, [visible]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_H, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={sw.outer} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, sw.backdrop, { opacity: anim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[sw.sheet, { transform: [{ translateY }] }]}>
          <View style={sw.handle} />
          <Text style={sw.title}>Your trips</Text>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {trips.map(trip => {
              const isActive = trip.id === heroTripId;
              const days = trip.tripDays
                ?? (trip.startDate && trip.endDate
                  ? Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000) + 1
                  : null);
              return (
                <Pressable
                  key={trip.id}
                  style={({ pressed }) => [sw.row, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => onSelect(trip.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={sw.rowName}>{trip.name}</Text>
                    <Text style={sw.rowSub}>
                      {[trip.destination, days ? `${days} days` : null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={sw.activePill}>
                      <Text style={sw.activePillText}>Active</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
            <View style={{ height: Math.max(insets.bottom, 16) }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sw = StyleSheet.create({
  outer:       { ...StyleSheet.absoluteFillObject, zIndex: 400 },
  backdrop:    { backgroundColor: 'rgba(15,18,30,0.48)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12,
    maxHeight: SCREEN_H * 0.75,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20,
  },
  handle:      { width: 36, height: 4, backgroundColor: '#D1D5E0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:       { fontFamily: F.bold, fontSize: 16, fontWeight: '600', color: '#1A1F2E', marginBottom: 8, paddingHorizontal: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0EDE8',
  },
  rowName:     { fontFamily: F.semibold, fontSize: 15, fontWeight: '600', color: '#1A1F2E' },
  rowSub:      { fontFamily: F.regular, fontSize: 13, color: '#8A8FA8', marginTop: 2 },
  activePill:  { backgroundColor: '#FDF0E9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  activePillText: { fontFamily: F.semibold, fontSize: 11, fontWeight: '600', color: '#E8692A' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  greeting: { fontFamily: F.bold, fontSize: 26, fontWeight: "700", color: G.deep, letterSpacing: -0.5 },
  subGreeting: { fontFamily: F.regular, fontSize: 14, color: G.muted, marginTop: 4 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(26,31,46,0.07)", alignItems: "center", justifyContent: "center", marginTop: 2 },

  center: { alignItems: "center", paddingVertical: 48, gap: 12 },
  loadingText: { fontFamily: F.regular, fontSize: 15, color: G.muted },

  heroCard: {
    borderRadius: 20, overflow: "hidden", marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 6,
    padding: 20, paddingBottom: 18, justifyContent: "flex-end", minHeight: 220,
  },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: G.green },
  activeBadgeText: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", color: G.green, letterSpacing: 0.8 },
  heroTripName: { fontFamily: F.bold, fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 4 },
  heroMeta: { fontFamily: F.regular, fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 14 },
  continueBtn: { backgroundColor: G.orange, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 13, alignItems: "center" },
  continueBtnText: { fontFamily: F.bold, fontSize: 15, fontWeight: "700", color: "#fff" },
  pastBanner: {
    marginTop: 8,
    marginHorizontal: 0,
    backgroundColor: '#2D1F0A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F59E0B44',
  },
  pastBannerTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: '#FCD34D',
    marginBottom: 2,
  },
  pastBannerSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: '#D97706',
  },
  viewPlanLink: { alignItems: "center", paddingTop: 10 },
  viewPlanLinkText: { fontFamily: F.semibold, fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.55)" },

  switchRow: { alignItems: "center", marginBottom: 24 },
  switchText: { fontFamily: F.semibold, fontSize: 14, fontWeight: "600", color: G.orange },

  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: F.bold, fontSize: 18, fontWeight: "700", color: G.deep },
  sectionCount: { fontFamily: F.semibold, fontSize: 14, fontWeight: "600", color: G.orange },
  sectionSub: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", color: G.muted, letterSpacing: 0.8 },
  cardRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  showMoreBtn: { alignItems: "flex-end", paddingTop: 6 },
  showMoreLink: { fontFamily: F.semibold, fontSize: 13, fontWeight: "600", color: G.orange },

  tripCard: {
    width: 160, height: 110, borderRadius: 14, overflow: "hidden",
    justifyContent: "flex-end",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  tripCardSm: {
    width: Math.floor((SCREEN_W - 40 - 20) / 3), height: 90, borderRadius: 12, overflow: "hidden",
    justifyContent: "flex-end",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  tripCardLabel: { padding: 10 },
  tripCardName: { fontFamily: F.bold, fontSize: 14, fontWeight: "700", color: "#fff", lineHeight: 18 },
  completedBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginTop: 4 },
  completedBadgeText: { fontFamily: F.medium, fontSize: 10, fontWeight: "500", color: "#fff" },

  emptyCard: {
    backgroundColor: G.card, borderRadius: 20, padding: 24, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  emptyIconWrap: { width: 56, height: 56, borderRadius: 14, backgroundColor: G.oLt, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: F.bold, fontSize: 18, fontWeight: "700", color: G.deep },
  emptyDesc: { fontFamily: F.regular, fontSize: 14, color: G.muted, lineHeight: 21 },
  planBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: G.orange, borderRadius: 14, paddingVertical: 13, gap: 6, marginTop: 4,
  },
  planBtnText: { fontFamily: F.bold, fontSize: 15, fontWeight: "700", color: "#fff" },

  errorCard: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 16, padding: 24, alignItems: "center", gap: 8 },
  errorTitle: { fontFamily: F.bold, fontSize: 16, fontWeight: "700", color: "#DC2626" },
  errorMessage: { fontFamily: F.regular, fontSize: 14, color: "#DC2626", textAlign: "center" },
  retryBtn: { backgroundColor: G.orange, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryBtnText: { fontFamily: F.bold, fontSize: 14, fontWeight: "700", color: "#fff" },

  sectionLink: { fontFamily: F.semibold, fontSize: 13, fontWeight: "600" as const, color: G.orange },
  planHero: {
    borderRadius: 20, overflow: "hidden" as const, marginBottom: 20,
    padding: 24, paddingBottom: 22, minHeight: 200,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 6,
  },
  inspireCard: {
    width: 155, backgroundColor: G.card,
    borderRadius: 16, overflow: "hidden" as const,
    borderWidth: 1, borderColor: "rgba(26,31,46,0.08)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 3,
  },
  inspireImg: { height: 100, position: "relative" as const, backgroundColor: "#2A3540" },
  inspireCity: {
    position: "absolute" as const, bottom: 7, left: 10,
    fontFamily: F.bold, fontSize: 12, color: "#fff",
  },
  inspireBody: { padding: 10 },
  inspireTitle: { fontFamily: F.bold, fontSize: 13, color: G.deep, marginBottom: 3, lineHeight: 18 },
  inspireMeta: { fontFamily: F.regular, fontSize: 11, color: G.muted },
  planTripFab: {
    position: "absolute", right: 20,
    shadowColor: "#E8692A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  planTripFabInner: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E8692A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  planTripFabPlus: {
    color: "#fff", fontSize: 22, fontFamily: F.bold, lineHeight: 26,
  },
  planTripFabLabel: {
    color: "#fff", fontSize: 14, fontWeight: "800", fontFamily: F.bold,
  },

  offlinePill: {
    alignSelf: "flex-start", backgroundColor: "rgba(16,185,129,0.18)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  offlinePillText: { fontFamily: F.semibold, fontSize: 12, fontWeight: "600", color: "#6EE7B7" },
  offlinePillLocked: {
    alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  offlinePillLockedTxt: { fontFamily: F.semibold, fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.55)" },
  offlinePillEmpty: {
    alignSelf: "flex-start", backgroundColor: "rgba(232,105,42,0.2)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
  },
  offlinePillEmptyTxt: { fontFamily: F.semibold, fontSize: 12, fontWeight: "700", color: "#E8692A" },

  emptyDivider: {
    height: 1,
    backgroundColor: "rgba(26,31,46,0.07)",
    marginVertical: 4,
  },
  discoverRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 4,
  },
  discoverBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(26,31,46,0.08)",
    padding: 14, marginBottom: 14,
  },
  discoverBtnIco: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "#FDF0E9",
    alignItems: "center", justifyContent: "center",
  },
  discoverBtnBody: { flex: 1 },
  discoverBtnTitle: { fontFamily: F.bold, fontSize: 14, fontWeight: "800", color: "#1A1F2E", marginBottom: 1 },
  discoverBtnSub: { fontFamily: F.regular, fontSize: 12, color: "#8A8FA8" },
});
