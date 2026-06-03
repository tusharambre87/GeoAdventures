import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/lib/authContext";
import { kidsAPI, travelAPI } from "@/lib/apiClient";
import { CITY_IMGS, F, G } from "@/lib/tokens";

const K = { purple: "#7C3AED", purpleLt: "#F5F3FF" } as const;
const EXPLORER_COLORS = ["#7C3AED", "#E8692A", "#16A34A", "#DC2626"];

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
  const [explorerXp, setExplorerXp] = useState<Record<string, number>>({});
  const [kidsPickerOpen, setKidsPickerOpen] = useState(false);

  const trips = data?.trips ?? [];
  const heroTrip =
    trips.find((t) => t.status === "active" || t.status === "in_progress") ??
    trips[0] ??
    null;
  const tripCount = trips.length;
  const stopCount = trips.reduce((sum, t) => sum + (t.totalStops ?? 0), 0);
  const travelers = heroTrip?.travelers ?? [];
  const travelerCount = travelers.length;

  const firstLetter = (user?.firstName ?? user?.username ?? user?.email ?? "U")[0];
  const initials = firstLetter.toUpperCase();
  const displayName = user?.firstName ?? user?.username ?? "Explorer";
  const email = user?.email ?? "";

  const heroCity = heroTrip?.destination ?? "Chicago";
  const heroBg = heroTrip?.coverImageUrl ?? heroTrip?.firstPhotoUrl ?? CITY_IMGS[heroCity] ?? null;

  useEffect(() => {
    if (!heroTrip?.id || !travelers.length) return;
    travelers.forEach((t) => {
      kidsAPI
        .getProgress(heroTrip.id, t.name)
        .then((prog) => setExplorerXp((prev) => ({ ...prev, [t.name]: prog.xp })))
        .catch(() => {});
    });
  }, [heroTrip?.id]);

  function launchKids(travelerName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setKidsPickerOpen(false);
    if (!heroTrip) return;
    const currentStop = heroTrip.stops.find((s) => !s.visited && !s.isVisited) ?? heroTrip.stops[0];
    if (!currentStop) return;
    router.push({
      pathname: "/kids" as never,
      params: {
        stopId: currentStop.id,
        stopName: encodeURIComponent(currentStop.name ?? "This Stop"),
        tripId: heroTrip.id,
        explorerId: travelerName,
        explorerName: encodeURIComponent(travelerName),
      },
    });
  }

  function handleKidsZonePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!heroTrip) return;
    if (travelers.length > 1) {
      setKidsPickerOpen(true);
    } else {
      launchKids(travelers[0]?.name ?? "Explorer");
    }
  }

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
                ["Explorers", String(travelerCount || 0)],
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
                  {travelerCount > 0 ? `· ${travelerCount} explorer${travelerCount === 1 ? "" : "s"}` : ""}
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
          {/* Explorer chips — real travelers with XP */}
          {travelers.length > 0 ? (
            <View style={s.explorerStrip}>
              {travelers.map((t, i) => (
                <View key={t.name} style={s.explorerChip}>
                  <View
                    style={[
                      s.explorerCircle,
                      { backgroundColor: EXPLORER_COLORS[i % EXPLORER_COLORS.length] },
                    ]}
                  >
                    <Text style={s.explorerInitial}>{t.name[0]?.toUpperCase() ?? "?"}</Text>
                  </View>
                  <Text style={s.explorerName}>{t.name}</Text>
                  <Text style={s.explorerXp}>
                    {"⚡"} {explorerXp[t.name] ?? 0} XP
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {travelers.length > 0 && <Divider />}
          {/* Kids Explorer Zone */}
          <Pressable
            style={({ pressed }) => [
              s.kidsZoneRow,
              pressed && { opacity: 0.88 },
              !heroTrip && s.kidsZoneDisabled,
            ]}
            onPress={heroTrip ? handleKidsZonePress : undefined}
            disabled={!heroTrip}
          >
            <View style={[s.rowIconWrap, { backgroundColor: K.purpleLt }]}>
              <Text style={s.rowIconText}>{"🧭"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.kidsZoneTitleRow}>
                <Text style={[s.kidsZoneTitle, !heroTrip && { color: G.muted }]}>
                  Kids Explorer Zone
                </Text>
                {heroTrip ? (
                  <View style={s.newStopBadge}>
                    <Text style={s.newStopText}>
                      {travelers.length > 1 ? "PICK EXPLORER" : "LET'S GO"}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[s.kidsZoneSub, !heroTrip && { color: G.muted, opacity: 0.6 }]}>
                {heroTrip
                  ? "Stories · Missions · Wonder Time · Games"
                  : "Start a trip first to unlock"}
              </Text>
            </View>
            <Text style={[s.rowArrow, { color: heroTrip ? K.purple : G.muted }]}>{"›"}</Text>
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
          <MenuRow icon="🛡️" iconBg="#EFF6FF" title="Privacy Policy" onPress={() => Linking.openURL("https://roamus.app/privacy")} />
          <MenuRow icon="⚖️" iconBg="#EEF5F2" title="Terms of Service" onPress={() => Linking.openURL("https://roamus.app/terms")} />
          <MenuRow icon="💬" iconBg="#FDF0E9" title="Support" />
          <MenuRow icon="ℹ️" iconBg="#F5F2EE" title="About Us" noDivider />
        </View>
        <Text style={s.versionText}>
          {"RoamUs v" + (Constants.expoConfig?.version ?? "1.0.0")}
        </Text>
      </ScrollView>

      {/* ── Explorer Picker Sheet ── */}
      <Modal
        visible={kidsPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setKidsPickerOpen(false)}
      >
        <View style={s.pickerOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setKidsPickerOpen(false)} />
          <View style={[s.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.pickerHandle} />
            <Text style={s.pickerTitle}>Who's exploring?</Text>
            <Text style={s.pickerSub}>Pick the explorer for this stop</Text>
            <View style={s.pickerList}>
              {travelers.map((t, i) => (
                <TouchableOpacity
                  key={t.name}
                  style={s.pickerRow}
                  activeOpacity={0.75}
                  onPress={() => launchKids(t.name)}
                >
                  <View
                    style={[
                      s.pickerCircle,
                      { backgroundColor: EXPLORER_COLORS[i % EXPLORER_COLORS.length] },
                    ]}
                  >
                    <Text style={s.pickerInitial}>{t.name[0]?.toUpperCase() ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerName}>{t.name}</Text>
                    <Text style={s.pickerXp}>{"⚡"} {explorerXp[t.name] ?? 0} XP earned</Text>
                  </View>
                  <Text style={s.pickerArrow}>{"›"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={s.pickerDismiss}
              onPress={() => setKidsPickerOpen(false)}
            >
              <Text style={s.pickerDismissText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  kidsZoneDisabled: {
    backgroundColor: G.bg,
    opacity: 0.6,
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
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
  pickerTitle: {
    fontFamily: F.bold,
    fontSize: 20,
    color: "#1C1917",
    marginBottom: 4,
  },
  pickerSub: {
    fontFamily: F.medium,
    fontSize: 13,
    color: G.muted,
    marginBottom: 20,
  },
  pickerList: {
    gap: 10,
  },
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
  versionText: { fontFamily: F.regular, fontSize: 12, color: G.muted, textAlign: "center", paddingVertical: 20 },
});
