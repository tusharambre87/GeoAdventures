import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { travelAPI, type Trip } from "@/lib/apiClient";
import { CITY_IMGS, F, G } from "@/lib/tokens";
import { useOnboarding } from "@/lib/onboardingContext";
import { preCacheTrip } from "@/lib/tripCache";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function ActiveHeroCard({ trip, offlineReady }: { trip: Trip; offlineReady?: boolean }) {
  const city = trip.destination ?? trip.name ?? "";
  const bg   = CITY_IMGS[city] ?? trip.coverImageUrl ?? trip.firstPhotoUrl ?? null;

  // ── Active day computation ──────────────────────────────────────────────────
  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const tripStart = trip.startDate
    ? (() => { const d = new Date(trip.startDate); d.setHours(0, 0, 0, 0); return d; })()
    : null;
  const totalDays = trip.tripDays
    ?? (trip.startDate && trip.endDate
      ? Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate!).getTime()) / 86_400_000) + 1
      : 0);
  const isActiveNow   = tripStart ? tripStart <= today : false;
  const daysSince     = tripStart ? Math.floor((today.getTime() - tripStart.getTime()) / 86_400_000) : 0;
  const activeDayIdx  = Math.max(0, Math.min(daysSince, Math.max(totalDays - 1, 0)));
  const activeDay     = activeDayIdx + 1;

  // ── Next unvisited stop for active day ─────────────────────────────────────
  const dayStops = [...(trip.stops ?? [])]
    .filter(s => s.dayIndex === activeDayIdx)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const nextStop = dayStops.find(s => !s.isVisited && !s.visited) ?? dayStops[0];

  function handleContinue() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isActiveNow) router.push("/(tabs)/today" as any);
    else router.push(`/trip/${trip.id}` as any);
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
          <Image source={{ uri: bg }} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} contentFit="cover" />
          <LinearGradient colors={["transparent", "rgba(8,22,14,0.94)"]} locations={[0.15, 1]} style={StyleSheet.absoluteFill} />
        </>
      )}

      {/* Badge */}
      <View style={s.heroBadge}>
        <View style={s.activeDot} />
        <Text style={s.activeBadgeText}>ACTIVE TRIP</Text>
      </View>

      {/* Trip name */}
      <Text style={s.heroTripName}>{trip.name}</Text>

      {/* Day + next stop */}
      <Text style={s.heroMeta} numberOfLines={1}>
        {totalDays > 0 ? `Day ${activeDay} of ${totalDays}` : ''}
        {nextStop ? ` · Next: ${nextStop.name}` : ''}
      </Text>

      {offlineReady && (
        <View style={s.offlinePill}>
          <Text style={s.offlinePillText}>{"✓ Available offline"}</Text>
        </View>
      )}

      {/* Primary CTA */}
      <Pressable
        style={({ pressed }) => [s.continueBtn, { opacity: pressed ? 0.88 : 1 }]}
        onPress={handleContinue}>
        <Text style={s.continueBtnText}>
          {isActiveNow ? `\u25B6 Continue Day ${activeDay}` : 'View plan \u2192'}
        </Text>
      </Pressable>

      {/* Ghost link — only when active */}
      {isActiveNow && (
        <Pressable
          style={({ pressed }) => [s.viewPlanLink, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleViewPlan}>
          <Text style={s.viewPlanLinkText}>{"View full plan \u2192"}</Text>
        </Pressable>
      )}
    </View>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const city = trip.destination ?? trip.name ?? "";
  const bg = CITY_IMGS[city] ?? trip.coverImageUrl ?? trip.firstPhotoUrl ?? null;
  const isCompleted = trip.status === "completed";

  function handlePress() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/trip/${trip.id}` as any);
  }

  return (
    <Pressable
      style={({ pressed }) => [s.tripCard, { opacity: pressed ? 0.9 : 1 }]}
      onPress={handlePress}
    >
      {bg ? (
        <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} contentFit="cover" />
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

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const [cacheStatus, setCacheStatus] = useState<"idle" | "ready">("idle");
  const { reset: resetOnboarding, set: setOnboarding } = useOnboarding();

  function startNewTrip() {
    resetOnboarding();
    setOnboarding({ onboardingInProgress: true, returningUser: true });
    router.push("/onboarding/where" as any);
  }

  async function handleLogout() {
    await logout();
    router.replace("/auth/splash");
  }
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top + 24;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["trips"],
    queryFn: () => travelAPI.getTrips(),
    retry: 1,
  });

  const trips = data?.trips ?? [];

  // Date-aware trip status helper
  function isTripDateActive(t: Trip): boolean {
    if (!t.startDate || !t.endDate) return false;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const start = new Date(t.startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(t.endDate); end.setHours(23, 59, 59, 999);
    return now >= start && now <= end;
  }

  const activeTrip = trips.find(t => isTripDateActive(t) || t.status === "active" || t.status === "in_progress");

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
  // Hero: prefer date-active trip, fall back to first current trip
  const heroTrip = activeTrip ?? (currentTrips.length > 0 ? currentTrips[0] : null);

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
        ) : isError ? (
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
            <ActiveHeroCard trip={heroTrip} offlineReady={cacheStatus === "ready"} />
            {currentTrips.length > 1 && (
              <Pressable style={s.switchRow}>
                <Text style={s.switchText}>Switch trip →</Text>
              </Pressable>
            )}

            {currentTrips.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Your adventures</Text>
                  <Text style={s.sectionCount}>{trips.length} total →</Text>
                </View>

                {inProgressTrips.length > 0 && (
                  <>
                    <Text style={s.sectionSub}>IN PROGRESS</Text>
                    <View style={s.cardRow}>
                      {inProgressTrips.map(t => <TripCard key={t.id} trip={t} />)}
                    </View>
                  </>
                )}

                {upcomingTrips.length > 0 && (
                  <>
                    <Text style={[s.sectionSub, { marginTop: inProgressTrips.length > 0 ? 16 : 0 }]}>UPCOMING</Text>
                    <View style={s.cardRow}>
                      {upcomingTrips.map(t => <TripCard key={t.id} trip={t} />)}
                    </View>
                  </>
                )}

                {completedTrips.length > 0 && (
                  <>
                    <Text style={[s.sectionSub, { marginTop: 20 }]}>COMPLETED</Text>
                    <View style={s.cardRow}>
                      {completedTrips.map(t => <TripCard key={t.id} trip={t} />)}
                    </View>
                  </>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="briefcase-outline" size={32} color={G.orange} />
            </View>
            <Text style={s.emptyTitle}>No trips yet</Text>
            <Text style={s.emptyDesc}>Plan your family adventure and unlock quests, stories, and memories along the way.</Text>
            <Pressable
              style={({ pressed }) => [s.planBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={startNewTrip}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={s.planBtnText}>Plan a Trip</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Plan a trip FAB */}
      <TouchableOpacity
        style={[s.planTripFab, { bottom: insets.bottom + 90 }]}
        onPress={startNewTrip}
        activeOpacity={0.85}
      >
        <Text style={s.planTripFabText}>＋ Plan a trip</Text>
      </TouchableOpacity>
    </View>
  );
}

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

  tripCard: {
    width: 160, height: 110, borderRadius: 14, overflow: "hidden",
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

  planTripFab: {
    position: "absolute", right: 20,
    backgroundColor: "#E8692A",
    borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", gap: 6,
    shadowColor: "#E8692A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  planTripFabText: {
    color: "#fff", fontSize: 14, fontWeight: "800", fontFamily: F.bold,
  },

  offlinePill: {
    alignSelf: "flex-start", backgroundColor: "rgba(16,185,129,0.18)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  offlinePillText: { fontFamily: F.semibold, fontSize: 12, fontWeight: "600", color: "#6EE7B7" },
});
