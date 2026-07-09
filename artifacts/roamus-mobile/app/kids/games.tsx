import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { API_BASE } from "@/lib/apiClient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKids } from "@/lib/kidsContext";
import { F } from "@/lib/tokens";

const GRID_GAMES = [
  {
    type: "what-am-i",
    icon: "\uD83D\uDD0D",
    name: "What Am I?",
    desc: "Read the clues. Guess what I am.",
    tag: "SOLO",
    tagBg: "#DBEAFE",
    tagColor: "#1E40AF",
    cardBg: "#EFF6FF",
    border: "#BFDBFE",
    titleColor: "#1E40AF",
    badge: "MOST PLAYED" as string | undefined,
    route: "kids/games/what-am-i" as string | undefined,
  },
  {
    type: "compass-quest",
    icon: "\uD83E\uDDED",
    name: "Compass Quest",
    desc: "Follow clues across the globe",
    tag: "GEO",
    tagBg: "#DBEAFE",
    tagColor: "#1E3A8A",
    cardBg: "#EEF2FF",
    border: "#C7D2FE",
    titleColor: "#3730A3",
    badge: "NEW" as string | undefined,
    ageBadge: "AGES 8+" as string | undefined,
    route: "kids/games/compass-quest" as string | undefined,
  },
  {
    type: "think-fast",
    icon: "\u26A1",
    name: "Think Fast!",
    desc: "Name 10 things in 30 seconds",
    tag: "FAST",
    tagBg: "#FFEDD5",
    tagColor: "#C2410C",
    cardBg: "#FFF7ED",
    border: "#FED7AA",
    titleColor: "#C2410C",
    route: undefined as string | undefined,
  },
  {
    type: "scavenger",
    icon: "\uD83D\uDD0D",
    name: "Scavenger Hunt",
    desc: "Find hidden things at this stop",
    tag: "TEAM",
    tagBg: "#D1FAE5",
    tagColor: "#065F46",
    cardBg: "#ECFDF5",
    border: "#6EE7B7",
    titleColor: "#065F46",
    route: undefined as string | undefined,
  },
  {
    type: "geoguess",
    icon: "\uD83C\uDF0D",
    name: "GeoGuess",
    desc: "Ask yes/no clues to guess a place",
    tag: "SOLO",
    tagBg: "#DBEAFE",
    tagColor: "#1E40AF",
    cardBg: "#EFF6FF",
    border: "#93C5FD",
    titleColor: "#1E40AF",
    route: undefined as string | undefined,
  },
  {
    type: "bag",
    icon: "\uD83D\uDC5C",
    name: "What's In My Bag",
    desc: "Memory chain game",
    tag: "FAMILY",
    tagBg: "#FDE68A",
    tagColor: "#78350F",
    cardBg: "#FEF3C7",
    border: "#F59E0B",
    titleColor: "#78350F",
    route: undefined as string | undefined,
  },
  {
    type: "geospy",
    icon: "\uD83D\uDC41",
    name: "GeoSpy",
    desc: "I Spy — observation prompts",
    tag: "FAMILY",
    tagBg: "#EDE9FE",
    tagColor: "#5B21B6",
    cardBg: "#F5F3FF",
    border: "#C4B5FD",
    titleColor: "#5B21B6",
    route: undefined as string | undefined,
  },
];

export default function GameHub() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const stopName = kids.stopName || "your stop";
  const stopId = kids.stopId || "";
  const ageBand = kids.ageBand;

  const [gameContent, setGameContent] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (!stopId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const res = await fetch(`${API_BASE}/api/travel/stops/${stopId}/games`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setGameContent(data);
        }
      } catch {
        // fail silently — games work with hardcoded content
      }
    })();
    return () => { cancelled = true; };
  }, [stopId]);

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
            <Text style={s.hdrBackText}>← Back</Text>
          </Pressable>
          <Text style={s.hdrTitle}>Travel Games</Text>
          <Text style={s.hdrSub}>Quick family games · {stopName}</Text>
        </View>

        {/* ── Hub body ── */}
        <View style={s.body}>
          {/* Hero — Hangman */}
          <Pressable
            style={({ pressed }) => [s.hangmanCard, pressed && { transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/kids/games/hangman' as never);
            }}
          >
            <Text style={s.hangmanBg}>{'\uD83E\uDEA2'}</Text>
            <View style={s.hangmanBadge}>
              <Text style={s.hangmanBadgeText}>WORD GAME</Text>
            </View>
            <Text style={s.hangmanTitle}>Hangman</Text>
            <Text style={s.hangmanDesc}>Guess travel words before the figure appears</Text>
            <View style={s.hangmanPill}>
              <Text style={s.hangmanPillText}>Play now {'\u2192'}</Text>
            </View>
          </Pressable>

          {/* 2×2 grid — compass-quest hidden for young age band */}
          <View style={s.grid}>
            {GRID_GAMES.filter((game) =>
              !(game.type === "compass-quest" && ageBand === "young")
            ).map((game) => (
              <Pressable
                key={game.name}
                style={({ pressed }) => [
                  s.gridCard,
                  { backgroundColor: game.cardBg, borderColor: game.border },
                  pressed && { opacity: 0.82 },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (game.route) {
                    router.push(`/${game.route}` as never);
                  } else {
                    router.push({ pathname: "/kids/game-play", params: { type: game.type, stopId, stopName: kids.stopName, gameContentJson: JSON.stringify(gameContent ?? {}) } } as never);
                  }
                }}
              >
                {game.badge && (
                  <View style={s.gridBadge}>
                    <Text style={s.gridBadgeText}>{game.badge}</Text>
                  </View>
                )}
                {"ageBadge" in game && game.ageBadge && (
                  <View style={[s.gridBadge, { top: 30, backgroundColor: "#4338CA" }]}>
                    <Text style={[s.gridBadgeText, { color: "#E0E7FF" }]}>{game.ageBadge}</Text>
                  </View>
                )}
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
  // Hangman hero card
  hangmanCard: {
    borderRadius: 20, overflow: "hidden", padding: 24,
    marginBottom: 12, backgroundColor: "#9333EA",
    minHeight: 170, position: "relative",
  },
  hangmanBg: {
    position: "absolute", right: 12, top: "50%",
    fontSize: 80, opacity: 0.14,
  },
  hangmanBadge: {
    backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: "flex-start", marginBottom: 10,
  },
  hangmanBadgeText: {
    fontFamily: F.bold, fontSize: 10,
    color: "rgba(255,255,255,0.9)", letterSpacing: 0.8,
  },
  hangmanTitle: { fontFamily: F.bold, fontSize: 30, color: "#fff", marginBottom: 4 },
  hangmanDesc: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 16 },
  hangmanPill: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 10, alignSelf: "flex-start",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  hangmanPillText: { fontFamily: F.bold, fontSize: 13, color: "#fff" },
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
  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridCard: {
    width: "47.5%", borderRadius: 18, padding: 16, borderWidth: 2,
  },
  gridBadge: {
    position: "absolute", top: 10, left: 10,
    backgroundColor: "#E8692A", borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  gridBadgeText: { fontFamily: F.bold, fontSize: 8, color: "#fff", letterSpacing: 0.6 },
  gridIcon: { fontSize: 32, marginBottom: 10 },
  gridName: { fontFamily: F.bold, fontSize: 15, marginBottom: 3 },
  gridDesc: {
    fontFamily: F.medium, fontSize: 11, color: "#78716C",
    lineHeight: 15, marginBottom: 10,
  },
  gridTag: { alignSelf: "flex-start", borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  gridTagText: { fontFamily: F.bold, fontSize: 9, letterSpacing: 0.6 },
});
