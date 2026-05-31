import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/lib/authContext";
import { travelAPI } from "@/lib/apiClient";
import { CITY_IMGS, F, G } from "@/lib/tokens";

const K = { purple: "#7C3AED", purpleLt: "#F5F3FF" } as const;

const MOCK_EXPLORERS = [
  { name: "Priya", xp: 145, initial: "P", color: "#7C3AED" },
  { name: "Arjun", xp: 80, initial: "A", color: G.orange },
];

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
        {right ?? <Text style={s.rowArrow}>{"\u203A"}</Text>}
      </Pressable>
      {!noDivider && <Divider />}
    </>
  );
}

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["trips"], queryFn: () => travelAPI.getTrips() });

  const trips = data?.trips ?? [];
  const heroTrip =
    trips.find((t) => t.status === "active" || t.status === "in_progress") ??
    trips[0] ??
    null;
  const tripCount = trips.length;
  const stopCount = trips.reduce((sum, t) => sum + (t.totalStops ?? 0), 0);

  const firstLetter = (user?.firstName ?? user?.username ?? user?.email ?? "U")[0];
  const initials = firstLetter.toUpperCase();
  const displayName = user?.firstName ?? user?.username ?? "Explorer";
  const email = user?.email ?? "";

  const heroCity = heroTrip?.destination ?? "Chicago";
  const heroBg = heroTrip?.coverImageUrl ?? heroTrip?.firstPhotoUrl ?? CITY_IMGS[heroCity] ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── 1. Dark Header ── */}
        <View style={[s.header, { paddingTop: insets.top + 20 }]}>
          <View style={s.headerRow}>
            <LinearGradient colors={[G.orange, G.oDk]} style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={s.headerName}>{displayName}</Text>
              <Text style={s.headerEmail} numberOfLines={1}>
                {email}
              </Text>
              <View style={s.geopassBadge}>
                <Text style={s.geopassText}>{"✦ GeoPass Active"}</Text>
              </View>
            </View>
          </View>
          <View style={s.statsRow}>
            {(
              [
                ["Trips", String(tripCount)],
                ["Stops", String(stopCount)],
                ["Explorers", "2"],
              ] as [string, string][]
            ).map(([label, val]) => (
              <View key={label} style={s.statCard}>
                <Text style={s.statNum}>{val}</Text>
                <Text style={s.statLabel}>{label.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 2. My Travel Journal ── */}
        <View style={s.journalSection}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitleText}>{"📖 My Travel Journal"}</Text>
            <Text style={s.sectionCount}>{tripCount} {tripCount === 1 ? "story" : "stories"}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [s.tripCard, pressed && { opacity: 0.92 }]}
            onPress={() => {}}
          >
            {heroBg ? (
              <Image
                source={{ uri: heroBg }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "#1A2533" }]} />
            )}
            <LinearGradient
              colors={["transparent", "rgba(6,8,16,0.88)"]}
              locations={[0.25, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.tripCardContent}>
              <Text style={s.tripCardCity}>{heroCity}</Text>
              <Text style={s.tripCardTitle}>{heroTrip?.name ?? "Chicago Family Trip"}</Text>
              <Text style={s.tripCardQuote}>{"\"Best vacation ever!\""}</Text>
              <View style={s.tripCardFooter}>
                <Text style={s.tripCardDate}>
                  {heroTrip?.startDate
                    ? new Date(heroTrip.startDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "Jun 1"}{" "}
                  · 2 explorers
                </Text>
                <View style={s.sharePill}>
                  <Text style={s.sharePillText}>{"↗ Share"}</Text>
                </View>
              </View>
            </View>
          </Pressable>
          <Pressable style={s.revisitBtn} onPress={() => {}}>
            <Text style={s.revisitText}>{"Revisit Your Adventures \u2192"}</Text>
          </Pressable>
        </View>

        {/* ── 3. Memories ── */}
        <View style={s.card}>
          {(
            [
              { icon: "🖼️", iconBg: "#FDF0E9", title: "Moments", subtitle: "All your captured memories" },
              { icon: "🗺️", iconBg: "#EEF5F2", title: "Travel Map", subtitle: "See where you've explored" },
              { icon: "✨", iconBg: "#FFF8EC", title: "Keepsakes", subtitle: "Your collected travel treasures" },
              { icon: "🏆", iconBg: "#F5F3FF", title: "Trophy Cabinet", subtitle: "Achievements and milestones" },
            ] as RowProps[]
          ).map((item, i, arr) => (
            <MenuRow key={item.title} {...item} noDivider={i === arr.length - 1} />
          ))}
        </View>

        {/* ── 4. For the Kids ── */}
        <Text style={s.sectionLabel}>FOR THE KIDS</Text>
        <View style={s.card}>
          {/* Explorer chips */}
          <View style={s.explorerStrip}>
            {MOCK_EXPLORERS.map((e) => (
              <View key={e.name} style={s.explorerChip}>
                <View style={[s.explorerCircle, { backgroundColor: e.color }]}>
                  <Text style={s.explorerInitial}>{e.initial}</Text>
                </View>
                <Text style={s.explorerName}>{e.name}</Text>
                <Text style={s.explorerXp}>{"⚡"} {e.xp} XP</Text>
              </View>
            ))}
          </View>
          <Divider />
          {/* Kids Explorer Zone */}
          <Pressable
            style={({ pressed }) => [s.kidsZoneRow, pressed && { opacity: 0.88 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/kids" as never);
            }}
          >
            <View style={[s.rowIconWrap, { backgroundColor: K.purpleLt }]}>
              <Text style={s.rowIconText}>{"🧭"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.kidsZoneTitleRow}>
                <Text style={s.kidsZoneTitle}>Kids Explorer Zone</Text>
                <View style={s.newStopBadge}>
                  <Text style={s.newStopText}>NEW STOP</Text>
                </View>
              </View>
              <Text style={s.kidsZoneSub}>Stories · Missions · Wonder Time · Games</Text>
            </View>
            <Text style={[s.rowArrow, { color: K.purple }]}>{"›"}</Text>
          </Pressable>
          <Divider />
          <MenuRow
            icon="🏆"
            iconBg="#F5F3FF"
            title="Trophy Cabinet"
            subtitle="Badges and achievements earned"
            noDivider
          />
        </View>

        {/* ── 5. Your Account ── */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>YOUR ACCOUNT</Text>
        <View style={s.card}>
          <MenuRow
            icon="✦"
            iconBg="rgba(232,105,42,0.12)"
            title="GeoPass"
            subtitle="Active · Renews Jun 15"
            right={
              <View style={s.activePill}>
                <Text style={s.activePillText}>Active {"›"}</Text>
              </View>
            }
          />
          <MenuRow icon="🔔" iconBg="#EFF6FF" title="Notifications" subtitle="Trip reminders and updates" />
          <MenuRow
            icon="⚙️"
            iconBg="#F5F2EE"
            title="Account"
            subtitle="Family & traveler profiles"
            noDivider
          />
        </View>

        {/* ── 6. Privacy & Settings ── */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>PRIVACY & SETTINGS</Text>
        <View style={[s.card, { marginBottom: 8 }]}>
          <MenuRow icon="🛡️" iconBg="#EFF6FF" title="Privacy Policy" />
          <MenuRow icon="⚖️" iconBg="#EEF5F2" title="Terms of Service" />
          <MenuRow icon="💬" iconBg="#FDF0E9" title="Support" />
          <MenuRow icon="ℹ️" iconBg="#F5F2EE" title="About Us" noDivider />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
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
  avatarText: {
    fontFamily: F.bold,
    fontSize: 24,
    color: "#fff",
  },
  headerName: {
    fontFamily: F.bold,
    fontSize: 22,
    color: "#fff",
    marginBottom: 2,
  },
  headerEmail: {
    fontFamily: F.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
  },
  geopassBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(232,105,42,0.2)",
    borderWidth: 1,
    borderColor: G.orange,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  geopassText: {
    fontFamily: F.semibold,
    fontSize: 12,
    color: G.orange,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statNum: {
    fontFamily: F.bold,
    fontSize: 22,
    color: "#fff",
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: F.semibold,
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.6,
  },
  journalSection: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 4,
    backgroundColor: G.bg,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleText: {
    fontFamily: F.bold,
    fontSize: 15,
    color: "#1A1F2E",
  },
  sectionCount: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: G.orange,
  },
  tripCard: {
    height: 200,
    borderRadius: 16,
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
  tripCardCity: {
    fontFamily: F.bold,
    fontSize: 18,
    color: "#fff",
    marginBottom: 2,
  },
  tripCardTitle: {
    fontFamily: F.bold,
    fontSize: 13,
    color: G.orange,
    marginBottom: 4,
  },
  tripCardQuote: {
    fontFamily: F.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontStyle: "italic",
    marginBottom: 10,
  },
  tripCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tripCardDate: {
    fontFamily: F.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  sharePill: {
    backgroundColor: G.orange,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sharePillText: {
    fontFamily: F.bold,
    fontSize: 12,
    color: "#fff",
  },
  revisitBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  revisitText: {
    fontFamily: F.semibold,
    fontSize: 14,
    color: G.orange,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    color: G.muted,
    letterSpacing: 0.8,
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 16,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
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
  rowIconText: {
    fontSize: 18,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: F.bold,
    fontSize: 15,
    color: "#1A1F2E",
    marginBottom: 2,
  },
  rowSub: {
    fontFamily: F.medium,
    fontSize: 12,
    color: G.muted,
  },
  rowArrow: {
    fontFamily: F.regular,
    fontSize: 20,
    color: "#C4C9D4",
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(28,25,23,0.06)",
    marginLeft: 68,
  },
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
    alignItems: "center",
    backgroundColor: G.bg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 7,
  },
  explorerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  explorerInitial: {
    fontFamily: F.bold,
    fontSize: 13,
    color: "#fff",
  },
  explorerName: {
    fontFamily: F.bold,
    fontSize: 13,
    color: "#1C1917",
  },
  explorerXp: {
    fontFamily: F.semibold,
    fontSize: 11,
    color: "#D97706",
  },
  kidsZoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  kidsZoneTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  kidsZoneTitle: {
    fontFamily: F.bold,
    fontSize: 15,
    color: "#7C3AED",
  },
  kidsZoneSub: {
    fontFamily: F.medium,
    fontSize: 12,
    color: "#7C3AED",
    opacity: 0.75,
  },
  newStopBadge: {
    backgroundColor: "#7C3AED",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newStopText: {
    fontFamily: F.bold,
    fontSize: 10,
    color: "#fff",
    letterSpacing: 0.3,
  },
  activePill: {
    backgroundColor: "#DCFCE7",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  activePillText: {
    fontFamily: F.bold,
    fontSize: 12,
    color: "#16A34A",
  },
});
