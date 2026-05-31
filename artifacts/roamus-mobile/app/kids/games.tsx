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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKids } from "@/lib/kidsContext";
import { F } from "@/lib/tokens";

const K = {
  purple: "#7C3AED",
  bg: "#FFF8F0",
  card: "#FFFFFF",
  deep: "#1C1917",
  muted: "#78716C",
  border: "rgba(28,25,23,0.08)",
} as const;

const GRID_GAMES = [
  {
    icon: "🔍",
    name: "Scavenger Hunt",
    desc: "Find hidden items at this stop",
    tag: "TEAM",
    tagBg: "#DCFCE7",
    tagColor: "#16A34A",
    type: "scavenger",
  },
  {
    icon: "🌍",
    name: "GeoGuess",
    desc: "This or that at your stop",
    tag: "SOLO",
    tagBg: "#EFF6FF",
    tagColor: "#2563EB",
    type: "geoguess",
  },
  {
    icon: "👁",
    name: "GeoSpy",
    desc: "Spot the difference challenge",
    tag: "FAMILY",
    tagBg: "#FDF0E9",
    tagColor: "#E8692A",
    type: "geospy",
  },
  {
    icon: "🗺️",
    name: "Guess the Place",
    desc: "Name that landmark!",
    tag: "TRIVIA",
    tagBg: "#F5F3FF",
    tagColor: "#7C3AED",
    type: "guess-place",
  },
];

export default function GameHub() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const stopName = kids.stopName || "your stop";

  return (
    <View style={[s.root, { backgroundColor: K.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <View style={{ paddingTop: insets.top + 52 }}>
          {/* ── Header ── */}
          <View style={s.hdr}>
            <Text style={s.hdrTitle}>Travel Games</Text>
            <Text style={s.hdrSub}>Quick family games · any time</Text>
          </View>

          {/* ── Hero game ── */}
          <Pressable
            style={({ pressed }) => [s.heroCard, pressed && { transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/kids/game-play?type=think-fast" as never);
            }}
          >
            <LinearGradient
              colors={["#1A2F4A", "#0D1829"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.heroOverlay} />
            <View style={s.heroPlayPill}>
              <Text style={s.heroPlayText}>{"Play \u2192"}</Text>
            </View>
            <View style={s.heroContent}>
              <Text style={s.heroMeta}>{"MOST PLAYED · FAMILY · 2 MIN"}</Text>
              <Text style={s.heroName}>Think Fast!</Text>
              <Text style={s.heroDesc}>Name 10 things in 30 seconds</Text>
            </View>
          </Pressable>

          {/* ── 2×2 grid ── */}
          <View style={s.grid}>
            {GRID_GAMES.map((game) => (
              <Pressable
                key={game.name}
                style={({ pressed }) => [s.gridCard, pressed && { backgroundColor: K.bg }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/kids/game-play?type=${game.type}` as never);
                }}
              >
                <Text style={s.gridIcon}>{game.icon}</Text>
                <Text style={s.gridName}>{game.name}</Text>
                <Text style={s.gridDesc} numberOfLines={2}>
                  {game.desc}
                </Text>
                <View style={[s.gridTag, { backgroundColor: game.tagBg }]}>
                  <Text style={[s.gridTagText, { color: game.tagColor }]}>{game.tag}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* ── Back + Hand back ── */}
          <Pressable
            style={s.backLink}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Text style={s.backLinkText}>{"\u2190 Back"}</Text>
          </Pressable>
          <Pressable
            style={s.handBackLink}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.dismissAll();
            }}
          >
            <Text style={s.handBackText}>{"Hand to parent \u2192"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hdr: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  hdrTitle: {
    fontFamily: F.bold,
    fontSize: 24,
    color: K.deep,
    marginBottom: 4,
  },
  hdrSub: {
    fontFamily: F.medium,
    fontSize: 13,
    color: K.muted,
  },
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 22,
    overflow: "hidden",
    height: 190,
    position: "relative",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  heroPlayPill: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  heroPlayText: {
    fontFamily: F.bold,
    fontSize: 13,
    color: K.deep,
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  heroMeta: {
    fontFamily: F.bold,
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  heroName: {
    fontFamily: F.bold,
    fontSize: 26,
    color: "#fff",
    marginBottom: 4,
  },
  heroDesc: {
    fontFamily: F.medium,
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 20,
    gap: 12,
  },
  gridCard: {
    width: "47%",
    backgroundColor: K.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: K.border,
  },
  gridIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  gridName: {
    fontFamily: F.bold,
    fontSize: 15,
    color: K.deep,
    marginBottom: 4,
  },
  gridDesc: {
    fontFamily: F.medium,
    fontSize: 12,
    color: K.muted,
    lineHeight: 17,
    marginBottom: 10,
  },
  gridTag: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gridTagText: {
    fontFamily: F.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  backLink: {
    alignItems: "center",
    paddingVertical: 16,
  },
  backLinkText: {
    fontFamily: F.semibold,
    fontSize: 14,
    color: K.muted,
  },
  handBackLink: {
    alignItems: "center",
    paddingBottom: 20,
  },
  handBackText: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: K.muted,
  },
});
