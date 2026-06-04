import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
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
  green: "#16A34A",
  greenLt: "#DCFCE7",
  red: "#DC2626",
  redLt: "#FEF2F1",
  border: "rgba(28,25,23,0.08)",
  borderMed: "rgba(28,25,23,0.14)",
} as const;

const MOCK_QUIZ = {
  question: "How many years did it take to build this famous structure?",
  options: [
    "5 years",
    "14 years",
    "25 years",
    "Over 100 years",
  ],
  correctIndex: 1,
  xp: 5,
};

const LETTERS = ["A", "B", "C", "D"];

export default function Mission1() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const hasRealContent = kids.exploreContent?.missions?.[0]?.type === "quiz";
  const quiz = hasRealContent
    ? {
        question: kids.exploreContent!.missions[0].question,
        options: kids.exploreContent!.missions[0].options,
        correctIndex: kids.exploreContent!.missions[0].correctIndex,
        xp: kids.exploreContent!.missions[0].xp,
      }
    : __DEV__ ? MOCK_QUIZ : null;

  // Show loading/error BEFORE any mock fallback
  if (kids.isLoadingExplore) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF8F0", justifyContent: "center", alignItems: "center", paddingBottom: 40 }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ marginTop: 16, fontSize: 15, color: "#78716C", fontFamily: "PlusJakartaSans_500Medium" }}>Loading your mission...</Text>
      </View>
    );
  }
  if (kids.exploreError) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF8F0", justifyContent: "center", alignItems: "center", paddingBottom: 40, paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 32, marginBottom: 16 }}>{"😕"}</Text>
        <Text style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: "#1C1917", marginBottom: 8, textAlign: "center" }}>Couldn't load this mission</Text>
        <Text style={{ fontFamily: "PlusJakartaSans_500Medium", fontSize: 14, color: "#78716C", marginBottom: 24, textAlign: "center" }}>Head back and try again</Text>
        <Pressable
          style={{ backgroundColor: "#7C3AED", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 }}
          onPress={() => router.back()}
        >
          <Text style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 15, color: "#fff" }}>{"Go back"}</Text>
        </Pressable>
      </View>
    );
  }
  if (!quiz) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF8F0", justifyContent: "center", alignItems: "center", paddingBottom: 40 }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ marginTop: 16, fontSize: 15, color: "#78716C", fontFamily: "PlusJakartaSans_500Medium" }}>Loading your mission...</Text>
      </View>
    );
  }

  async function handleOption(idx: number) {
    if (answered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(idx);
    setAnswered(true);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const isCorrect = idx === quiz!.correctIndex;
    if (kids.stopId) {
      try {
        const result = await kidsAPI.completeMission(kids.stopId, {
          explorerId: kids.explorerId || "explorer",
          missionId: "quiz",
          answer: quiz!.options[idx] ?? String(idx),
        }) as { missionXpAwarded?: number } | undefined;
        const xpAwarded = result?.missionXpAwarded ?? (isCorrect ? quiz!.xp : 0);
        if (xpAwarded > 0) {
          kids.setXpToday(kids.xpToday + xpAwarded);
          kids.addSessionXp(xpAwarded);
        }
      } catch {
        if (isCorrect) {
          kids.setXpToday(kids.xpToday + quiz!.xp);
          kids.addSessionXp(quiz!.xp);
        }
      }
    } else if (isCorrect) {
      kids.setXpToday(kids.xpToday + quiz!.xp);
      kids.addSessionXp(quiz!.xp);
    }
    const delay = isCorrect ? 700 : 1300;
    setTimeout(() => {
      router.push("/kids/mission-2");
    }, delay);
  }

  function getOptionStyle(idx: number) {
    if (!answered) return [s.opt];
    if (idx === quiz!.correctIndex) return [s.opt, s.optCorrect];
    if (idx === selected && idx !== quiz!.correctIndex) return [s.opt, s.optWrong];
    return [s.opt];
  }

  function getLetterStyle(idx: number) {
    if (!answered) return s.letter;
    if (idx === quiz!.correctIndex) return [s.letter, { backgroundColor: K.greenLt }];
    if (idx === selected && idx !== quiz!.correctIndex) return [s.letter, { backgroundColor: K.redLt }];
    return s.letter;
  }

  function getOptionTextColor(idx: number) {
    if (!answered) return K.deep;
    if (idx === quiz!.correctIndex) return K.green;
    if (idx === selected && idx !== quiz!.correctIndex) return K.red;
    return K.deep;
  }

  return (
    <View style={[s.root, { backgroundColor: K.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 16 }}
      >
        {/* ── Header ── */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <Text style={s.counter}>Mission 1 of 3</Text>
          <View style={s.missionDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  s.mDot,
                  i === 0 && s.mDotCur,
                ]}
              >
                <Text style={[s.mDotText, i === 0 && s.mDotTextCur]}>
                  {i + 1}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── White card ── */}
        <View style={s.card}>
          <Text style={s.typeLabel}>{"🧠 KNOWLEDGE · +5 XP"}</Text>
          <Text style={s.question}>{quiz.question}</Text>
          <View style={s.opts}>
            {quiz.options.map((opt, i) => (
              <Pressable
                key={i}
                style={getOptionStyle(i)}
                onPress={() => handleOption(i)}
                disabled={answered}
              >
                <View style={getLetterStyle(i)}>
                  <Text style={[s.letterText, { color: getOptionTextColor(i) }]}>
                    {LETTERS[i]}
                  </Text>
                </View>
                <Text style={[s.optText, { color: getOptionTextColor(i) }]}>
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={s.skipLink}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/kids/mission-2");
            }}
          >
            <Text style={s.skipText}>Skip (no XP)</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Bottom nav ── */}
      <View style={[s.nav, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.navRow}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>{"←"}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.nextBtn, pressed && { opacity: 0.88 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/kids/mission-2");
            }}
          >
            <Text style={s.nextBtnText}>{"Next mission \u2192"}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Text style={s.handBack}>{"\u2190 Back"}</Text>
        </Pressable>
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
  counter: {
    fontFamily: F.bold,
    fontSize: 13,
    color: K.muted,
  },
  missionDots: {
    flexDirection: "row",
    gap: 8,
  },
  mDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: K.bg,
    borderWidth: 1.5,
    borderColor: K.border,
    alignItems: "center",
    justifyContent: "center",
  },
  mDotCur: {
    backgroundColor: K.purple,
    borderColor: K.purple,
  },
  mDotText: {
    fontFamily: F.bold,
    fontSize: 12,
    color: K.muted,
  },
  mDotTextCur: {
    color: "#fff",
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: K.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: K.border,
  },
  typeLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    color: K.purple,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  question: {
    fontFamily: F.bold,
    fontSize: 19,
    color: K.deep,
    lineHeight: 27,
    marginBottom: 20,
  },
  opts: {
    gap: 10,
  },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: K.border,
    backgroundColor: K.card,
  },
  optCorrect: {
    backgroundColor: K.greenLt,
    borderColor: K.green,
  },
  optWrong: {
    backgroundColor: "#FEF2F1",
    borderColor: K.red,
  },
  letter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: K.bg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  letterText: {
    fontFamily: F.bold,
    fontSize: 14,
  },
  optText: {
    fontFamily: F.semibold,
    fontSize: 16,
    flex: 1,
  },
  skipLink: {
    alignItems: "center",
    paddingTop: 14,
  },
  skipText: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: K.muted,
  },
  nav: {
    backgroundColor: K.card,
    borderTopWidth: 1,
    borderTopColor: K.border,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  navRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  backBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: K.borderMed,
    backgroundColor: K.card,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontFamily: F.bold,
    fontSize: 20,
    color: K.deep,
  },
  nextBtn: {
    flex: 1,
    backgroundColor: K.purple,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    shadowColor: K.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  nextBtnText: {
    fontFamily: F.bold,
    fontSize: 17,
    color: "#fff",
  },
  handBack: {
    fontFamily: F.semibold,
    fontSize: 12,
    color: K.muted,
    textAlign: "center",
    paddingVertical: 6,
  },
});
