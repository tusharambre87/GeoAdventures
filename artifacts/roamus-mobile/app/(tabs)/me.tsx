import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as StoreReview from "expo-store-review";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/lib/authContext";
import { API_BASE } from "@/lib/authContext";
import { CITY_IMGS, F, G } from "@/lib/tokens";

const EXPLORER_COLORS = ["#7C3AED", "#E8692A", "#1A1F2E", "#DC2626", "#16A34A"];

function getExplorerRank(xp: number): string {
  if (xp >= 5000) return "\uD83C\uDFC6 Legend";
  if (xp >= 2000) return "\u2B50 Expert";
  if (xp >= 1000) return "\uD83D\uDD25 Adventurer";
  if (xp >= 500)  return "\uD83D\uDDFA Explorer";
  if (xp >= 100)  return "\uD83C\uDF31 Rookie";
  return "\uD83D\uDC23 Beginner";
}

type Trip = {
  id: string;
  name: string;
  status: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  visitedStops: number;
  totalStops: number;
  stops: Array<{ id: string; name: string; visited?: boolean; isVisited?: boolean }>;
  travelers?: Array<{ name: string }> | null;
  coverImageUrl?: string | null;
  firstPhotoUrl?: string | null;
  tripDays?: number | null;
};

type Explorer = {
  id: string;
  name: string;
  isParent?: boolean;
  age?: string | null;
  totalXp?: number;
  unlockedAchievementIds?: string[];
  unlockedStreakBadgeIds?: string[];
};

function Divider() {
  return <View style={s.divider} />;
}

interface RowProps {
  icon: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  noDivider?: boolean;
}

function MenuRow({ icon, iconBg, title, subtitle, right, onPress, noDivider }: RowProps) {
  return (
    <>
      <Pressable
        style={({ pressed }) => [s.menuRow, pressed && { backgroundColor: G.bg }]}
        onPress={onPress}
      >
        <View style={[s.rowIconWrap, { backgroundColor: iconBg }]}>
          <Text style={s.rowIconText}>{icon}</Text>
        </View>
        <View style={s.rowContent}>
          <Text style={s.rowTitle}>{title}</Text>
          {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
        </View>
        {right ?? <Text style={s.rowArrow}>{"›"}</Text>}
      </Pressable>
      {!noDivider && <Divider />}
    </>
  );
}

type FetchedUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  subscriptionTier?: string;
  profileImageUrl?: string;
};

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { user: cachedUser } = useAuth();

  const [fetchedUser, setFetchedUser] = useState<FetchedUser | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [explorers, setExplorers] = useState<Explorer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kidsPickerOpen, setKidsPickerOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(400)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    load();
  }, [cachedUser?.id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const authHeaders = { Authorization: `Bearer ${token}` };
      const userId = cachedUser?.id;

      const [userRes, tripsRes, explorersRes] = await Promise.all([
        fetch(`${API_BASE}/api/auth/user`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/travel/trips`, { headers: authHeaders }),
        userId
          ? fetch(`${API_BASE}/api/explorers/user/${userId}`, { headers: authHeaders })
          : Promise.resolve(null),
      ]);

      if (!userRes.ok) throw new Error("Failed to load user");
      if (!tripsRes.ok) throw new Error("Failed to load trips");

      const [userData, tripsData] = await Promise.all([
        userRes.json(),
        tripsRes.json(),
      ]);

      setFetchedUser(userData.user ?? userData);
      setTrips(tripsData.trips ?? []);

      if (explorersRes && explorersRes.ok) {
        const expData = await explorersRes.json();
        setExplorers(Array.isArray(expData) ? expData : expData.explorers ?? []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function openKidsPicker() {
    setKidsPickerOpen(true);
    Animated.parallel([
      Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, damping: 28, stiffness: 300 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }

  function closeKidsPicker() {
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: 400, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setKidsPickerOpen(false));
  }

  function launchKids(explorerName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeKidsPicker();
    const activeTrip = trips.find((t) => t.status === "active" || t.status === "in_progress");
    if (!activeTrip) return;
    const currentStop = activeTrip.stops.find((s) => !s.visited && !s.isVisited) ?? activeTrip.stops[0];
    if (!currentStop) return;
    router.push({
      pathname: "/kids" as never,
      params: {
        stopId: currentStop.id,
        stopName: encodeURIComponent(currentStop.name ?? "This Stop"),
        tripId: activeTrip.id,
        explorerId: explorerName,
        explorerName: encodeURIComponent(explorerName),
      },
    });
  }

  function handleKidsZonePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const activeTrip = trips.find((t) => t.status === "active" || t.status === "in_progress");
    if (!activeTrip) return;
    if (explorers.length > 1) {
      openKidsPicker();
    } else {
      launchKids(explorers[0]?.name ?? "Explorer");
    }
  }

  async function handleRateApp() {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) await StoreReview.requestReview();
    } catch {}
  }

  const activeTrip = trips.find((t) => t.status === "active" || t.status === "in_progress") ?? null;

  const completedTrips = trips.filter((t) => t.status === "completed");
  const heroTrip = trips.length === 0
    ? null
    : completedTrips.length > 0
      ? completedTrips.sort((a, b) => {
          const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
          return bDate - aDate;
        })[0]
      : trips.slice().sort((a, b) => {
          const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
          return bDate - aDate;
        })[0];

  const tripCount = trips.length;
  const stopCount = trips.reduce((sum, t) => sum + (t.visitedStops ?? 0), 0);
  const explorerCount = explorers.length;
  const totalFamilyXp = explorers.reduce((sum, e) => sum + (e.totalXp ?? 0), 0);

  const user = fetchedUser ?? cachedUser;
  const firstLetter = (user?.firstName ?? user?.username ?? user?.email ?? "U")[0];
  const initials = firstLetter.toUpperCase();
  const displayName = user?.firstName ?? user?.username ?? user?.email?.split('@')[0] ?? 'Explorer';
  const email = user?.email ?? "";
  const isSubscribed = user?.subscriptionTier && user.subscriptionTier !== "free";

  const heroCity = heroTrip?.destination ?? "";
  const heroBg = heroTrip
    ? (heroTrip.coverImageUrl ?? heroTrip.firstPhotoUrl ?? CITY_IMGS[heroCity] ?? null)
    : null;

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={G.orange} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.root, { justifyContent: "center", alignItems: "center", padding: 24 }]}>
        <Text style={{ fontFamily: F.regular, fontSize: 14, color: G.muted, marginBottom: 16, textAlign: "center" }}>
          {error}
        </Text>
        <Pressable style={[s.retryBtn]} onPress={load}>
          <Text style={{ fontFamily: F.bold, fontSize: 14, color: "#fff" }}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── 1. Dark Header ── */}
        <View style={[s.header, { paddingTop: insets.top + 20 }]}>
          <View style={s.headerRow}>
            <LinearGradient colors={[G.orange, G.amber]} style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={s.headerName}>{displayName}</Text>
              <Text style={s.headerEmail} numberOfLines={1}>{email}</Text>
              {isSubscribed && (
                <View style={s.passBadge}>
                  <Text style={s.passBadgeText}>{"\u2726 RoamUs Pass Active"}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={s.statsRow}>
            {(
              [
                ["Trips", String(tripCount)],
                ["Stops", String(stopCount)],
                ["Explorers", String(explorerCount)],
              ] as [string, string][]
            ).map(([label, val]) => (
              <View key={label} style={s.statCard}>
                <Text style={s.statNum}>{val}</Text>
                <Text style={s.statLabel}>{label.toUpperCase()}</Text>
              </View>
            ))}
          </View>
          {totalFamilyXp > 0 && (
            <Text style={s.familyXpText}>
              {"\u26A1"} {totalFamilyXp.toLocaleString()} family XP{"  \u00B7  "}{getExplorerRank(totalFamilyXp)}
            </Text>
          )}
        </View>

        {/* ── 2. My Travel Journal ── */}
        <View style={s.journalSection}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitleText}>{"\uD83D\uDCD6 My Travel Journal"}</Text>
            <Text style={s.sectionCount}>{tripCount} {tripCount === 1 ? "story" : "stories"}</Text>
          </View>

          {heroTrip ? (
            <Pressable
              style={({ pressed }) => [s.tripCard, pressed && { opacity: 0.92 }]}
              onPress={() => {}}
            >
              {heroBg ? (
                <Image source={{ uri: heroBg }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <LinearGradient
                  colors={["#1A2533", "#0C1220", "#1A2C44"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                >
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 72, opacity: 0.3 }}>{"\uD83C\uDFD9\uFE0F"}</Text>
                  </View>
                </LinearGradient>
              )}
              <LinearGradient
                colors={["transparent", "rgba(6,8,16,0.88)"]}
                locations={[0.25, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.tripCardContent}>
                <Text style={s.tripCardCity}>{heroCity}</Text>
                <Text style={s.tripCardTitle}>{heroTrip.name}</Text>
                <View style={s.tripCardFooter}>
                  <Text style={s.tripCardDate}>
                    {heroTrip.startDate
                      ? new Date(heroTrip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : ""}
                    {heroTrip.endDate
                      ? ` – ${new Date(heroTrip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : ""}
                    {heroTrip.visitedStops > 0 ? `  ·  ${heroTrip.visitedStops} stops` : ""}
                  </Text>
                  <Pressable
                    style={s.sharePill}
                    onPress={() => {
                      const tripUrl = `https://roamus.app/s/${heroTrip.id}`;
                      Share.share({
                        message: `Check out our ${heroTrip.name} trip on RoamUs!\n\n${tripUrl}`,
                        url: tripUrl,
                      }).catch(() => {});
                    }}
                  >
                    <Text style={s.sharePillText}>{"↗ Share"}</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ) : (
            <View style={s.tripCardPlaceholder}>
              <Text style={s.placeholderText}>{"Your first adventure will appear here"}</Text>
            </View>
          )}

          <Pressable style={s.revisitBtn} onPress={() => router.push("/memories" as never)}>
            <Text style={s.revisitText}>{"Revisit Your Adventures →"}</Text>
          </Pressable>
        </View>

        {/* ── 3. Memories & collections ── */}
        <Text style={s.sectionLabel}>MEMORIES & COLLECTIONS</Text>
        <View style={s.card}>
          <MenuRow
            icon="\uD83D\uDDBC\uFE0F"
            iconBg="#FDF0E9"
            title="Moments"
            subtitle="All your captured memories"
            onPress={() => router.push("/memories" as never)}
          />
          <MenuRow
            icon="\uD83D\uDDFA\uFE0F"
            iconBg="#EEF5F2"
            title="Travel Map"
            subtitle="Everywhere your family has explored"
            onPress={() =>
              router.push({
                pathname: '/me/travel-map',
                params: { tripsJson: JSON.stringify(trips.slice(0, 20)) },
              } as never)
            }
          />
          <MenuRow
            icon="\u2728"
            iconBg="#FDF0E9"
            title="Keepsakes"
            subtitle="Digital collectibles from your adventures"
            right={
              <View style={s.comingSoonTag}>
                <Text style={s.comingSoonText}>Coming soon</Text>
              </View>
            }
            noDivider
          />
        </View>

        {/* ── 4. For the Kids ── */}
        <Text style={s.sectionLabel}>FOR THE KIDS</Text>
        <View style={s.card}>
          {explorers.length > 0 && (
            <>
              <View style={s.explorerStrip}>
                {explorers.map((exp, i) => (
                  <View key={exp.id} style={s.explorerChip}>
                    <View
                      style={[
                        s.explorerCircle,
                        { backgroundColor: EXPLORER_COLORS[i % EXPLORER_COLORS.length] },
                      ]}
                    >
                      <Text style={s.explorerInitial}>{exp.name[0]?.toUpperCase() ?? "?"}</Text>
                    </View>
                    <View>
                      <Text style={s.explorerName}>{exp.name}</Text>
                      <Text style={s.explorerXp}>{"\u26A1"} {exp.totalXp ?? 0} XP</Text>
                      <Text style={s.explorerRank}>{getExplorerRank(exp.totalXp ?? 0)}</Text>
                      {(exp.unlockedAchievementIds?.length ?? 0) > 0 && (
                        <View style={s.explorerBadges}>
                          {exp.unlockedAchievementIds!.slice(0, 3).map(id => (
                            <View key={id} style={s.explorerBadge}>
                              <Text style={s.explorerBadgeIcon}>{"\uD83C\uDFC5"}</Text>
                            </View>
                          ))}
                          {exp.unlockedAchievementIds!.length > 3 && (
                            <Text style={s.explorerBadgeMore}>+{exp.unlockedAchievementIds!.length - 3}</Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              <Divider />
            </>
          )}

          {/* Kids Explorer Zone */}
          <Pressable
            style={({ pressed }) => [
              s.kidsZoneRow,
              pressed && { opacity: 0.88 },
              !activeTrip && s.kidsZoneDisabled,
            ]}
            onPress={activeTrip ? handleKidsZonePress : undefined}
            disabled={!activeTrip}
          >
            <View style={[s.rowIconWrap, { backgroundColor: "#EDE9FE" }]}>
              <Text style={s.rowIconText}>{"\uD83E\uDDED"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.kidsZoneTitleRow}>
                <Text style={[s.kidsZoneTitle, !activeTrip && { color: G.muted }]}>
                  Kids Zone
                </Text>
                {activeTrip && (
                  <View style={s.newStopBadge}>
                    <Text style={s.newStopText}>
                      {explorers.length > 1 ? "PICK EXPLORER" : "LET'S GO"}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[s.kidsZoneSub, !activeTrip && { color: G.muted, opacity: 0.6 }]}>
                {activeTrip
                  ? "Stories · Missions · Wonder Time · Games"
                  : "Start a trip first to unlock"}
              </Text>
            </View>
            <Text style={[s.rowArrow, { color: activeTrip ? "#7C3AED" : G.muted }]}>{"›"}</Text>
          </Pressable>
        </View>

        {/* ── 5. Your Account ── */}
        <Text style={s.sectionLabel}>YOUR ACCOUNT</Text>
        <View style={s.card}>
          <MenuRow
            icon="\u2726"
            iconBg="rgba(232,105,42,0.12)"
            title="RoamUs Pass"
            subtitle={isSubscribed ? "Active subscription" : "Free plan"}
            right={
              <View style={isSubscribed ? s.activePill : s.freePill}>
                <Text style={isSubscribed ? s.activePillText : s.freePillText}>
                  {isSubscribed ? "Active ›" : "Free ›"}
                </Text>
              </View>
            }
            onPress={() => router.push("/me/pass" as never)}
          />
          <MenuRow
            icon="\u2699\uFE0F"
            iconBg="#F5F2EE"
            title="Account"
            subtitle="Family & traveler profiles"
            onPress={() => router.push("/me/account" as never)}
            noDivider
          />
        </View>

        {/* ── 6. Support ── */}
        <Text style={s.sectionLabel}>SUPPORT</Text>
        <View style={[s.card, { marginBottom: 8 }]}>
          <MenuRow
            icon="\uD83D\uDCAC"
            iconBg="#F5F2EE"
            title="Help & FAQ"
            subtitle="Common questions answered"
            onPress={() => router.push("/me/support" as never)}
          />
          <MenuRow
            icon="\u2B50"
            iconBg="#FFFBEB"
            title="Rate RoamUs"
            subtitle="Enjoying the app? Let us know"
            right={
              <Text style={s.nativePromptText}>Native prompt ›</Text>
            }
            onPress={handleRateApp}
          />
          <MenuRow
            icon="\uD83D\uDEE1\uFE0F"
            iconBg="#F5F2EE"
            title="Privacy Policy"
            right={<Text style={s.externalArrow}>{"↗"}</Text>}
            onPress={() => Linking.openURL("https://roamus.app/privacy").catch(() => {})}
          />
          <MenuRow
            icon="\u2696\uFE0F"
            iconBg="#EEF5F2"
            title="Terms of Service"
            right={<Text style={s.externalArrow}>{"↗"}</Text>}
            onPress={() => Linking.openURL("https://roamus.app/terms").catch(() => {})}
            noDivider
          />
        </View>

        <Text style={s.versionText}>{"RoamUs v1.0.0 · Made with love for families"}</Text>
      </ScrollView>

      {/* ── Explorer Picker Sheet (no Modal — Animated.View) ── */}
      {kidsPickerOpen && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[StyleSheet.absoluteFill, s.sheetOverlay, { opacity: overlayOpacity }]}
            pointerEvents="auto"
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeKidsPicker} />
          </Animated.View>
          <Animated.View
            style={[s.pickerSheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetAnim }] }]}
            pointerEvents="auto"
          >
            <View style={s.pickerHandle} />
            <Text style={s.pickerTitle}>{"Who's exploring?"}</Text>
            <Text style={s.pickerSub}>Pick the explorer for this stop</Text>
            <View style={s.pickerList}>
              {explorers.map((exp, i) => (
                <TouchableOpacity
                  key={exp.id}
                  style={s.pickerRow}
                  activeOpacity={0.75}
                  onPress={() => launchKids(exp.name)}
                >
                  <View
                    style={[
                      s.pickerCircle,
                      { backgroundColor: EXPLORER_COLORS[i % EXPLORER_COLORS.length] },
                    ]}
                  >
                    <Text style={s.pickerInitial}>{exp.name[0]?.toUpperCase() ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerName}>{exp.name}</Text>
                    <Text style={s.pickerXp}>{"\u26A1"} {exp.totalXp ?? 0} XP earned</Text>
                  </View>
                  <Text style={s.pickerArrow}>{"›"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.pickerDismiss} onPress={closeKidsPicker}>
              <Text style={s.pickerDismissText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: G.bg },
  retryBtn: { backgroundColor: G.orange, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  header: {
    backgroundColor: "#1A1F2E",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontFamily: F.bold, fontSize: 24, color: "#fff" },
  headerName: { fontFamily: F.bold, fontSize: 22, color: "#fff", marginBottom: 2 },
  headerEmail: { fontFamily: F.regular, fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 },
  passBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(232,105,42,0.2)",
    borderWidth: 1,
    borderColor: G.orange,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  passBadgeText: { fontFamily: F.semibold, fontSize: 12, color: G.orange },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statNum: { fontFamily: F.bold, fontSize: 22, color: "#fff", marginBottom: 2 },
  statLabel: { fontFamily: F.semibold, fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: 0.6 },
  journalSection: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 4, backgroundColor: G.bg },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleText: { fontFamily: F.bold, fontSize: 15, color: "#1A1F2E" },
  sectionCount: { fontFamily: F.semibold, fontSize: 13, color: G.orange },
  tripCard: {
    height: 180,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1A2533",
  },
  tripCardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  tripCardCity: { fontFamily: F.bold, fontSize: 17, color: "#fff", marginBottom: 1 },
  tripCardTitle: { fontFamily: F.bold, fontSize: 12, color: G.orange, marginBottom: 8 },
  tripCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tripCardDate: { fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,0.6)" },
  sharePill: {
    backgroundColor: "rgba(232,105,42,0.9)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sharePillText: { fontFamily: F.bold, fontSize: 11, color: "#fff" },
  tripCardPlaceholder: {
    height: 120,
    borderRadius: 18,
    backgroundColor: "rgba(26,31,46,0.06)",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(26,31,46,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { fontFamily: F.regular, fontSize: 14, color: G.muted, textAlign: "center" },
  revisitBtn: { alignItems: "center", paddingVertical: 14 },
  revisitText: { fontFamily: F.semibold, fontSize: 14, color: G.orange },
  sectionLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    color: G.muted,
    letterSpacing: 0.8,
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 16,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(26,31,46,0.08)",
  },
  divider: { height: 1, backgroundColor: "rgba(26,31,46,0.06)", marginLeft: 68 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 58,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  rowIconText: { fontSize: 18 },
  rowContent: { flex: 1 },
  rowTitle: { fontFamily: F.bold, fontSize: 15, color: "#1A1F2E", marginBottom: 2 },
  rowSub: { fontFamily: F.medium, fontSize: 12, color: G.muted },
  rowArrow: { fontFamily: F.regular, fontSize: 20, color: "#C4C9D4", marginLeft: 8 },
  comingSoonTag: {
    backgroundColor: "rgba(26,31,46,0.06)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  comingSoonText: { fontFamily: F.bold, fontSize: 10, color: G.muted },
  explorerStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  explorerChip: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: G.bg,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  explorerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  explorerInitial: { fontFamily: F.bold, fontSize: 13, color: "#fff" },
  explorerName: { fontFamily: F.bold, fontSize: 13, color: "#1C1917" },
  explorerXp: { fontFamily: F.semibold, fontSize: 11, color: "#D97706" },
  explorerRank: { fontFamily: F.medium, fontSize: 11, color: G.muted, marginTop: 1 },
  explorerBadges: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  explorerBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(232,105,42,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  explorerBadgeIcon: { fontSize: 11 },
  explorerBadgeMore: { fontFamily: F.bold, fontSize: 10, color: G.muted, marginLeft: 2 },
  familyXpText: {
    fontFamily: F.semibold,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    marginTop: 12,
    textAlign: "center",
  },
  kidsZoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  kidsZoneDisabled: { backgroundColor: G.bg, opacity: 0.6 },
  kidsZoneTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  kidsZoneTitle: { fontFamily: F.bold, fontSize: 15, color: "#7C3AED" },
  kidsZoneSub: { fontFamily: F.medium, fontSize: 12, color: "#7C3AED", opacity: 0.75 },
  newStopBadge: { backgroundColor: "#7C3AED", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  newStopText: { fontFamily: F.bold, fontSize: 10, color: "#fff", letterSpacing: 0.3 },
  activePill: {
    backgroundColor: "#DCFCE7",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  activePillText: { fontFamily: F.bold, fontSize: 12, color: "#16A34A" },
  freePill: {
    backgroundColor: "rgba(26,31,46,0.06)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  freePillText: { fontFamily: F.bold, fontSize: 12, color: G.muted },
  nativePromptText: { fontFamily: F.semibold, fontSize: 11, color: G.muted, marginRight: 4 },
  externalArrow: { fontFamily: F.regular, fontSize: 16, color: "#C4C9D4" },
  versionText: {
    fontFamily: F.regular,
    fontSize: 11,
    color: "#C4C8D8",
    textAlign: "center",
    paddingVertical: 8,
  },
  sheetOverlay: { backgroundColor: "rgba(0,0,0,0.45)" },
  pickerSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(28,25,23,0.15)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  pickerTitle: { fontFamily: F.bold, fontSize: 20, color: "#1C1917", marginBottom: 4 },
  pickerSub: { fontFamily: F.medium, fontSize: 13, color: G.muted, marginBottom: 20 },
  pickerList: { gap: 10 },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: G.bg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  pickerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pickerInitial: {
    fontFamily: F.bold,
    fontSize: 18,
    color: "#fff",
  },
  pickerName: {
    fontFamily: F.bold,
    fontSize: 16,
    color: "#1C1917",
    marginBottom: 2,
  },
  pickerXp: {
    fontFamily: F.semibold,
    fontSize: 12,
    color: "#D97706",
  },
  pickerArrow: {
    fontFamily: F.regular,
    fontSize: 22,
    color: "#C4C9D4",
  },
  pickerDismiss: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  pickerDismissText: {
    fontFamily: F.semibold,
    fontSize: 15,
    color: G.muted,
  },
});
