import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { kidsAPI } from "@/lib/apiClient";
import { useKids } from "@/lib/kidsContext";
import { F } from "@/lib/tokens";

const K = {
  purple: "#7C3AED",
  purpleLt: "#F5F3FF",
  bg: "#FFF8F0",
  card: "#FFFFFF",
  deep: "#1C1917",
  muted: "#78716C",
  amber: "#D97706",
  amberLt: "#FFFBEB",
  border: "rgba(28,25,23,0.08)",
} as const;

function ShimmerRow() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[s.shimmerRow, { opacity: anim }]} />
  );
}

export default function ExplorerHome() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ stopId?: string; stopName?: string; tripId?: string }>();
  const kids = useKids();

  useEffect(() => {
    if (params.stopId && params.stopId !== kids.stopId) {
      kids.setStopInfo(
        params.stopId,
        params.stopName ? decodeURIComponent(params.stopName) : "This Stop",
        params.tripId ?? ""
      );
    }
  }, [params.stopId]);

  const stopId = kids.stopId || params.stopId || "";
  const tripId = kids.tripId || params.tripId || "";

  useEffect(() => {
    if (!stopId) return;
    if (kids.exploreContent && kids.exploreContent.stopId === stopId) return;

    kids.setLoadingExplore(true);
    kids.setExploreError(false);

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 28000)
    );

    Promise.race([kidsAPI.getExplore(stopId), timeout])
      .then((content) => {
        kids.setExploreContent(content);
        kids.setLoadingExplore(false);
      })
      .catch(() => {
        kids.setLoadingExplore(false);
      });

    if (tripId) {
      kidsAPI.getProgress(tripId, kids.explorerId || "explorer")
        .then((prog) => kids.setXpToday(prog.xp))
        .catch(() => {});
    }
  }, [stopId]);

  const stopName = kids.stopName || (params.stopName ? decodeURIComponent(params.stopName) : "Explorer");
  const kidName = kids.kidName || "Explorer";
  const xpToday = kids.xpToday;

  function fmtSec(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const stopIndex = kids.exploreContent?.stopIndex;
  const totalStops = kids.exploreContent?.totalStops;
  const stopBadge = stopIndex && totalStops
    ? `📖 Story Pack · Stop ${stopIndex} of ${totalStops}`
    : "📖 Story Pack";
  const mainDuration = kids.exploreContent?.stories?.main?.durationSeconds
    ? fmtSec(kids.exploreContent.stories.main.durationSeconds)
    : "5:00";

  const allDone = kids.completedStories.every(Boolean);
  const storyProgress = kids.completedStories.filter(Boolean).length;
  const progressPct = (storyProgress / 3) * 100;

  return (
    <View style={[s.root, { backgroundColor: K.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* ── Hero (purple) ── */}
        <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
          {/* decorative circles */}
          <View style={s.circle1} />
          <View style={s.circle2} />

          {/* top row */}
          <View style={s.heroTop}>
            <View>
              <Text style={s.greeting}>{`Hey ${kidName}! \uD83E\uDDED`}</Text>
              <Text style={s.kidName}>{kidName}</Text>
            </View>
            <View style={s.xpBadge}>
              <Text style={s.xpNum}>{xpToday}</Text>
              <Text style={s.xpLbl}>XP TODAY</Text>
            </View>
          </View>

          {/* Story pack card */}
          {kids.isLoadingExplore ? (
            <View style={s.shimmerCard}>
              <ShimmerRow />
              <ShimmerRow />
              <ShimmerRow />
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [s.storyCard, pressed && { transform: [{ scale: 0.98 }] }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/kids/story");
              }}
            >
              <View style={s.scTop}>
                <Text style={s.scBadge}>{stopBadge}</Text>
                <View style={s.scXpPill}>
                  <Text style={s.scXpText}>+5 XP</Text>
                </View>
              </View>
              <Text style={s.scTitle} numberOfLines={2}>{stopName}</Text>
              <Text style={s.scSub}>3 stories · Missions · Wonder Time</Text>
              <View style={s.scPlayRow}>
                <View style={s.scPlayBtn}>
                  <Text style={{ color: K.purple, fontSize: 20 }}>{"\u25B6"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.scPlayLabel}>
                    {allDone ? "All stories complete!" : "Tap to start"}
                  </Text>
                  <Text style={s.scPlaySub}>Main Story · ~{mainDuration}</Text>
                </View>
              </View>
              <View style={s.scProgBar}>
                <View style={[s.scProgFill, { width: `${progressPct}%` as any }]} />
              </View>
            </Pressable>
          )}
        </View>

        {/* ── Activity tiles ── */}
        <View style={s.tiles}>
          <Pressable
            style={({ pressed }) => [s.tile, pressed && { backgroundColor: K.bg }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/kids/wonder");
            }}
          >
            <Text style={s.tileIcon}>{"🤔"}</Text>
            <Text style={s.tileName}>Wonder Time</Text>
            <Text style={s.tileSub}>What are you curious about?</Text>
            <Text style={s.tileXp}>{"⚡ +5 XP"}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.tile, pressed && { backgroundColor: K.bg }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/kids/mission-1");
            }}
          >
            <Text style={s.tileIcon}>{"🎯"}</Text>
            <Text style={s.tileName}>Missions</Text>
            <Text style={s.tileSub}>3 challenges to complete</Text>
            <Text style={s.tileXp}>{"⚡ +15 XP"}</Text>
          </Pressable>
        </View>

        {/* ── Play a quick game ── */}
        <View style={s.gameRow}>
          <Pressable
            style={({ pressed }) => [s.gameBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/kids/games");
            }}
          >
            <Text style={s.gameBtnText}>🎮 Play a quick game →</Text>
          </Pressable>
        </View>

        {/* ── Hand back ── */}
        <Pressable
          style={s.handBack}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Text style={s.handBackText}>{"\u2190 Back"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    backgroundColor: K.purple,
    paddingHorizontal: 24,
    paddingBottom: 28,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    top: -50,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  circle2: {
    position: "absolute",
    bottom: -40,
    left: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    zIndex: 2,
  },
  greeting: {
    fontFamily: F.bold,
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  kidName: {
    fontFamily: F.bold,
    fontSize: 28,
    color: "#fff",
  },
  xpBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  xpNum: {
    fontFamily: F.bold,
    fontSize: 22,
    color: "#fff",
  },
  xpLbl: {
    fontFamily: F.bold,
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.6,
  },
  storyCard: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    padding: 18,
    zIndex: 2,
  },
  shimmerCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  fallbackCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  fallbackIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  fallbackText: {
    fontFamily: F.bold,
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
  fallbackSub: {
    fontFamily: F.medium,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  shimmerRow: {
    height: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 8,
  },
  scTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  scBadge: {
    fontFamily: F.bold,
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
  },
  scXpPill: {
    backgroundColor: "rgba(217,119,6,0.3)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  scXpText: {
    fontFamily: F.bold,
    fontSize: 11,
    color: "#FFFBEB",
  },
  scTitle: {
    fontFamily: F.bold,
    fontSize: 20,
    color: "#fff",
    marginBottom: 4,
    lineHeight: 26,
  },
  scSub: {
    fontFamily: F.medium,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 16,
  },
  scPlayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  scPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    paddingLeft: 3,
  },
  scPlayLabel: {
    fontFamily: F.bold,
    fontSize: 13,
    color: "#fff",
    marginBottom: 2,
  },
  scPlaySub: {
    fontFamily: F.medium,
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
  },
  scProgBar: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  scProgFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  tiles: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tile: {
    flex: 1,
    backgroundColor: K.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: K.border,
  },
  tileIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  tileName: {
    fontFamily: F.bold,
    fontSize: 15,
    color: K.deep,
    marginBottom: 4,
  },
  tileSub: {
    fontFamily: F.medium,
    fontSize: 12,
    color: K.muted,
    lineHeight: 17,
    marginBottom: 8,
  },
  tileXp: {
    fontFamily: F.bold,
    fontSize: 11,
    color: K.amber,
  },
  gameRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  gameBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(232,105,42,0.25)",
    paddingVertical: 14,
    alignItems: "center",
  },
  gameBtnText: {
    fontFamily: F.bold,
    fontSize: 15,
    color: "#E8692A",
  },
  handBack: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  handBackText: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: K.muted,
  },
});
