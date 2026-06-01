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

const GRID_GAMES = [
  {
    type: "scavenger",
    icon: "🔍",
    name: "Scavenger Hunt",
    desc: "Find hidden things at this stop",
    tag: "TEAM",
    tagBg: "#D1FAE5",
    tagColor: "#065F46",
    cardBg: "#ECFDF5",
    border: "#6EE7B7",
    titleColor: "#065F46",
  },
  {
    type: "geoguess",
    icon: "🌍",
    name: "GeoGuess",
    desc: "Ask yes/no clues to guess a place",
    tag: "SOLO",
    tagBg: "#DBEAFE",
    tagColor: "#1E40AF",
    cardBg: "#EFF6FF",
    border: "#93C5FD",
    titleColor: "#1E40AF",
  },
  {
    type: "bag",
    icon: "👜",
    name: "What's In My Bag",
    desc: "Memory chain game",
    tag: "FAMILY",
    tagBg: "#FDE68A",
    tagColor: "#78350F",
    cardBg: "#FEF3C7",
    border: "#F59E0B",
    titleColor: "#78350F",
  },
  {
    type: "geospy",
    icon: "👁",
    name: "GeoSpy",
    desc: "I Spy — observation prompts",
    tag: "FAMILY",
    tagBg: "#EDE9FE",
    tagColor: "#5B21B6",
    cardBg: "#F5F3FF",
    border: "#C4B5FD",
    titleColor: "#5B21B6",
  },
] as const;

export default function GameHub() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const stopName = kids.stopName || "your stop";

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ── Purple header ── */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <View style={s.circle1} />
          <View style={s.circle2} />
          <Pressable
            style={s.hdrBack}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Text style={s.hdrBackText}>← Hand back to parent</Text>
          </Pressable>
          <Text style={s.hdrTitle}>Travel Games</Text>
          <Text style={s.hdrSub}>Quick family games · {stopName}</Text>
        </View>

        {/* ── Hub body ── */}
        <View style={s.body}>
          {/* Hero — Think Fast */}
          <Pressable
            style={({ pressed }) => [s.heroCard, pressed && { transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/kids/game-play?type=think-fast" as never);
            }}
          >
            <LinearGradient
              colors={["#FF6B2B", "#FF8C00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={s.heroBigEmoji}>⚡</Text>
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeText}>MOST PLAYED</Text>
            </View>
            <Text style={s.heroTitle}>Think Fast!</Text>
            <Text style={s.heroDesc}>Name 10 things in 30 seconds</Text>
            <View style={s.heroPlayPill}>
              <Text style={s.heroPlayText}>Play now →</Text>
            </View>
          </Pressable>

          {/* 2×2 grid */}
          <View style={s.grid}>
            {GRID_GAMES.map((game) => (
              <Pressable
                key={game.name}
                style={({ pressed }) => [
                  s.gridCard,
                  { backgroundColor: game.cardBg, borderColor: game.border },
                  pressed && { opacity: 0.82 },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/kids/game-play?type=${game.type}` as never);
                }}
              >
                <Text style={s.gridIcon}>{game.icon}</Text>
                <Text style={[s.gridName, { color: game.titleColor }]}>{game.name}</Text>
                <Text style={s.gridDesc} numberOfLines={2}>{game.desc}</Text>
                <View style={[s.gridTag, { backgroundColor: game.tagBg }]}>
                  <Text style={[s.gridTagText, { color: game.tagColor }]}>{game.tag}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF8F0" },
  // Header
  header: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: "hidden",
    position: "relative",
  },
  circle1: {
    position: "absolute", top: -60, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  circle2: {
    position: "absolute", bottom: -40, left: -20,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  hdrBack: { marginBottom: 12 },
  hdrBackText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.7)" },
  hdrTitle: { fontFamily: F.bold, fontSize: 28, color: "#fff", marginBottom: 4 },
  hdrSub: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  // Body
  body: { padding: 16 },
  // Hero card
  heroCard: {
    borderRadius: 20, overflow: "hidden", padding: 24,
    marginBottom: 12, position: "relative", minHeight: 190,
  },
  heroBigEmoji: {
    position: "absolute", right: 16, top: "50%",
    fontSize: 80, opacity: 0.15,
  },
  heroBadge: {
    backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: "flex-start", marginBottom: 10,
  },
  heroBadgeText: {
    fontFamily: F.bold, fontSize: 10,
    color: "rgba(255,255,255,0.9)", letterSpacing: 0.8,
  },
  heroTitle: { fontFamily: F.bold, fontSize: 32, color: "#fff", marginBottom: 4 },
  heroDesc: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 16 },
  heroPlayPill: {
    backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12, alignSelf: "flex-start",
  },
  heroPlayText: { fontFamily: F.bold, fontSize: 14, color: "#FF6B2B" },
  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridCard: {
    width: "47.5%", borderRadius: 18, padding: 16, borderWidth: 2,
  },
  gridIcon: { fontSize: 32, marginBottom: 10 },
  gridName: { fontFamily: F.bold, fontSize: 15, marginBottom: 3 },
  gridDesc: {
    fontFamily: F.medium, fontSize: 11, color: "#78716C",
    lineHeight: 15, marginBottom: 10,
  },
  gridTag: { alignSelf: "flex-start", borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  gridTagText: { fontFamily: F.bold, fontSize: 9, letterSpacing: 0.6 },
});
