import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/authContext";
import { travelAPI, type Trip } from "@/lib/apiClient";
import { CITY_IMGS, F, G } from "@/lib/tokens";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function ActiveHeroCard({ trip }: { trip: Trip }) {
  const city = trip.destination ?? trip.name ?? "";
  const bg = CITY_IMGS[city] ?? trip.coverImageUrl ?? trip.firstPhotoUrl ?? null;
  const progressPct = trip.totalStops > 0 ? Math.round((trip.visitedStops / trip.totalStops) * 100) : 0;

  function handlePress() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/trip/${trip.id}` as any);
  }

  return (
    <Pressable
      style={({ pressed }) => [s.heroCard, { opacity: pressed ? 0.96 : 1 }]}
      onPress={handlePress}
    >
      {bg ? (
        <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: G.deep }]} />
      )}
      <LinearGradient
        colors={["transparent", "rgba(6,8,16,0.82)"]}
        locations={[0.3, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.heroBadge}>
        <View style={s.inProgressDot} />
        <Text style={s.inProgressText}>IN PROGRESS</Text>
      </View>
      <Text style={s.heroTripName}>{trip.name}</Text>
      {trip.totalStops > 0 && (
        <Text style={s.heroMeta}>
          {trip.visitedStops}/{trip.totalStops} stops · {progressPct}% complete
        </Text>
      )}
      <View style={s.heroFooter}>
        <View style={s.heroTrack}>
          <View style={[s.heroFill, { width: `${progressPct}%` as any }]} />
        </View>
        <View style={s.continueBtn}>
          <Text style={s.continueBtnText}>Continue →</Text>
        </View>
      </View>
    </Pressable>
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
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/onboarding/splash" as any);
  }
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top + 24;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["trips"],
    queryFn: () => travelAPI.getTrips(),
    retry: 1,
  });

  const trips = data?.trips ?? [];
  // Treat active + planned + in_progress trips as "current"
  const activeTrip = trips.find(t => t.status === "active" || t.status === "in_progress");
  const currentTrips = trips.filter(t => !["completed", "archived"].includes(t.status));
  const completedTrips = trips.filter(t => t.status === "completed" || t.status === "archived");
  // Most recently created non-completed trip (shown as hero if none is "active")
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
            <ActiveHeroCard trip={heroTrip} />
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

                {currentTrips.length > 0 && (
                  <>
                    <Text style={s.sectionSub}>IN PROGRESS</Text>
                    <View style={s.cardRow}>
                      {currentTrips.map(t => <TripCard key={t.id} trip={t} />)}
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
              onPress={() => router.push("/onboarding/splash" as any)}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={s.planBtnText}>Plan a Trip</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Floating + button */}
      <Pressable
        style={[s.fab, { bottom: insets.bottom + 90 }]}
        onPress={() => router.push("/onboarding/splash" as any)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
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
    height: 200, borderRadius: 20, overflow: "hidden", marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
    padding: 20, justifyContent: "flex-end",
  },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  inProgressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: G.orange },
  inProgressText: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", color: G.orange, letterSpacing: 0.5 },
  heroTripName: { fontFamily: F.bold, fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 4 },
  heroMeta: { fontFamily: F.regular, fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 12 },
  heroFooter: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroTrack: { flex: 1, height: 3, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 2, overflow: "hidden" },
  heroFill: { height: "100%", backgroundColor: G.orange, borderRadius: 2 },
  continueBtn: { backgroundColor: G.orange, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  continueBtnText: { fontFamily: F.bold, fontSize: 13, fontWeight: "700", color: "#fff" },

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

  fab: {
    position: "absolute", right: 20,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: G.orange,
    alignItems: "center", justifyContent: "center",
    shadowColor: G.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
});
