import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { kidsAPI } from "@/lib/apiClient";
import type { Mission } from "@/lib/apiClient";
import { useKids } from "@/lib/kidsContext";
import { MissionCard } from "@/components/MissionCard";
import { F } from "@/lib/tokens";

const K = {
  purple:    "#7C3AED",
  bg:        "#FFF8F0",
  card:      "#FFFFFF",
  muted:     "#78716C",
  green:     "#16A34A",
  border:    "rgba(28,25,23,0.08)",
  borderMed: "rgba(28,25,23,0.14)",
} as const;

const MOCK_M1: Mission = {
  type: "detective",
  enRouteBrief: "Agent: something is hidden in plain sight — your mission starts before you arrive.",
  instruction: "Find one detail at this stop that doesn't match its surroundings. Look at materials, wear patterns, or repairs most visitors ignore. Take a photo of your discovery.",
  proof: "photo",
  xp: 15,
};

export default function Mission1() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const [submitting, setSubmitting] = useState(false);

  const mission: Mission | null = kids.exploreContent?.missions?.individual?.[0] ?? null;
  const effectiveMission = mission ?? (__DEV__ ? MOCK_M1 : null);

  if (kids.isLoadingExplore) {
    return (
      <View style={{ flex: 1, backgroundColor: K.bg, justifyContent: "center", alignItems: "center", paddingBottom: 40 }}>
        <ActivityIndicator size="large" color={K.purple} />
        <Text style={{ marginTop: 16, fontSize: 15, color: K.muted, fontFamily: "PlusJakartaSans_500Medium" }}>Loading your mission...</Text>
      </View>
    );
  }
  if (kids.exploreError) {
    return (
      <View style={{ flex: 1, backgroundColor: K.bg, justifyContent: "center", alignItems: "center", paddingBottom: 40, paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 32, marginBottom: 16 }}>{"\uD83D\uDE15"}</Text>
        <Text style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: "#1C1917", marginBottom: 8, textAlign: "center" }}>{"Couldn't load this mission"}</Text>
        <Text style={{ fontFamily: "PlusJakartaSans_500Medium", fontSize: 14, color: K.muted, marginBottom: 24, textAlign: "center" }}>Head back and try again</Text>
        <Pressable style={{ backgroundColor: K.purple, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 }} onPress={() => router.back()}>
          <Text style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 15, color: "#fff" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }
  if (!effectiveMission) {
    return (
      <View style={{ flex: 1, backgroundColor: K.bg, justifyContent: "center", alignItems: "center", paddingBottom: 40 }}>
        <ActivityIndicator size="large" color={K.purple} />
        <Text style={{ marginTop: 16, fontSize: 15, color: K.muted, fontFamily: "PlusJakartaSans_500Medium" }}>Loading your mission...</Text>
      </View>
    );
  }

  async function handleComplete(proof: string | null) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    let xpAwarded = effectiveMission!.xp;
    try {
      if (kids.stopId) {
        const result = await kidsAPI.completeMission(kids.stopId, {
          explorerId: kids.explorerId || "",
          missionId: effectiveMission!.type,
          answer: proof ?? "\u2014",
        }) as { missionXpAwarded?: number } | undefined;
        if (result?.missionXpAwarded != null) xpAwarded = result.missionXpAwarded;
      }
    } catch {}
    kids.addSessionXp(xpAwarded);
    setSubmitting(false);
    router.push("/kids/mission-2");
  }

  return (
    <View style={[s.root, { backgroundColor: K.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 16 }}
      >
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <Text style={s.counter}>Mission 1 of 3</Text>
          <View style={s.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[s.dot, i === 0 && s.dotCur]}>
                <Text style={[s.dotText, i === 0 && s.dotTextCur]}>{i + 1}</Text>
              </View>
            ))}
          </View>
        </View>

        <MissionCard
          mission={effectiveMission}
          index={1}
          onComplete={handleComplete}
          isSubmitting={submitting}
        />

        <Pressable
          style={s.skipLink}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/kids/mission-2");
          }}
        >
          <Text style={s.skipText}>Skip (no XP)</Text>
        </Pressable>
      </ScrollView>

      <View style={[s.nav, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.navRow}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>{"←"}</Text>
          </Pressable>
          <Pressable
            style={[s.nextBtn, { backgroundColor: K.purple }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/kids/mission-2");
            }}
          >
            <Text style={s.nextBtnText}>{"Next mission \u2192"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: { fontFamily: F.bold, fontSize: 13, color: K.muted },
  dots: { flexDirection: "row", gap: 8 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: K.bg, borderWidth: 1.5, borderColor: K.border,
    alignItems: "center", justifyContent: "center",
  },
  dotCur: { backgroundColor: K.purple, borderColor: K.purple },
  dotText: { fontFamily: F.bold, fontSize: 12, color: K.muted },
  dotTextCur: { color: "#fff" },
  skipLink: { alignItems: "center", paddingTop: 14 },
  skipText: { fontFamily: F.semibold, fontSize: 13, color: K.muted },
  nav: {
    backgroundColor: K.card,
    borderTopWidth: 1,
    borderTopColor: K.border,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  navRow: { flexDirection: "row", gap: 10 },
  backBtn: {
    width: 54, height: 54, borderRadius: 16,
    borderWidth: 1.5, borderColor: K.borderMed, backgroundColor: K.card,
    alignItems: "center", justifyContent: "center",
  },
  backBtnText: { fontFamily: F.bold, fontSize: 20, color: "#1C1917" },
  nextBtn: {
    flex: 1, borderRadius: 16, alignItems: "center", justifyContent: "center",
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 4,
  },
  nextBtnText: { fontFamily: F.bold, fontSize: 17, color: "#fff" },
});
