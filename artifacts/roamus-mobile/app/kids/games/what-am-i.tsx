import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Fraunces_900Black, useFonts } from "@expo-google-fonts/fraunces";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKids } from "@/lib/kidsContext";
import { F } from "@/lib/tokens";
import {
  pickPuzzle,
  type WhatAmIPuzzle,
} from "@/constants/whatAmIData";

type GameState = "mode_select" | "playing" | "correct" | "revealed";
type Difficulty = "easy" | "hard";

const SEARCH_ICON = "\uD83D\uDD0D";
const TARGET_ICON = "\uD83C\uDFAF";
const STAR_ICON = "\u2B50";

const EASY_POINTS = [3, 2, 1] as const;
const HARD_POINTS = [5, 4, 3, 2, 1] as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function WhatAmIGame() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const { tripId } = kids;
  const effectiveTripId = tripId || "default";
  useFonts({ Fraunces_900Black });

  const [gameState, setGameState] = useState<GameState>("mode_select");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [puzzle, setPuzzle] = useState<WhatAmIPuzzle | null>(null);
  const [currentClue, setCurrentClue] = useState(0);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [hardInput, setHardInput] = useState("");
  const [scoreEarned, setScoreEarned] = useState(0);
  const [clueOnWin, setClueOnWin] = useState(1);
  const [loading, setLoading] = useState(false);

  const popAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (gameState === "correct") {
      Animated.sequence([
        Animated.timing(popAnim, { toValue: 1.3, duration: 180, useNativeDriver: true }),
        Animated.timing(popAnim, { toValue: 0.9, duration: 120, useNativeDriver: true }),
        Animated.timing(popAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    } else {
      popAnim.setValue(0);
    }
  }, [gameState]);

  const startGame = useCallback(async () => {
    setLoading(true);
    try {
      const p = await pickPuzzle(effectiveTripId);
      setPuzzle(p);
      setCurrentClue(0);
      setEliminatedOptions([]);
      setShuffledOptions(shuffle([...p.easyOptions]));
      setHardInput("");
      setScoreEarned(0);
      setClueOnWin(1);
      setGameState("playing");
    } finally {
      setLoading(false);
    }
  }, [effectiveTripId]);

  const handleOptionTap = useCallback((option: string) => {
    if (!puzzle) return;
    const activeClues = difficulty === "hard" ? puzzle.hardClues : puzzle.clues;
    const maxClues = activeClues.length;
    if (option === puzzle.answer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const cluePoints = difficulty === "hard" ? HARD_POINTS : EASY_POINTS;
      const pts = cluePoints[currentClue] ?? 1;
      setScoreEarned(pts);
      setClueOnWin(currentClue + 1);
      setGameState("correct");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newEliminated = [...eliminatedOptions, option];
    setEliminatedOptions(newEliminated);
    if (currentClue < maxClues - 1) {
      setCurrentClue(prev => prev + 1);
    } else {
      setGameState("revealed");
    }
  }, [puzzle, currentClue, eliminatedOptions, difficulty]);

  const advanceClue = useCallback(() => {
    if (!puzzle) return;
    const activeClues = difficulty === "hard" ? puzzle.hardClues : puzzle.clues;
    const maxClues = activeClues.length;
    if (currentClue >= maxClues - 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setGameState("revealed");
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentClue(prev => prev + 1);
      setHardInput("");
    }
  }, [puzzle, currentClue, difficulty]);

  const handleHardSubmit = useCallback(() => {
    if (!puzzle) return;
    const cleaned = hardInput.trim().toUpperCase();
    if (cleaned === puzzle.answer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const cluePoints = HARD_POINTS;
      const pts = cluePoints[currentClue] ?? 1;
      setScoreEarned(pts);
      setClueOnWin(currentClue + 1);
      setGameState("correct");
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setHardInput("");
      advanceClue();
    }
  }, [puzzle, hardInput, currentClue, advanceClue]);

  // ── MODE SELECT ─────────────────────────────────────────────────────────────
  if (gameState === "mode_select") {
    const cluePoints = difficulty === "hard" ? HARD_POINTS : EASY_POINTS;
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF8F0" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          {/* Header */}
          <View style={[ms.header, { paddingTop: insets.top + 16 }]}>
            <View style={ms.circle1} />
            <View style={ms.circle2} />
            <Text style={ms.watermark}>{SEARCH_ICON}</Text>
            <Pressable
              style={ms.backRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
            >
              <Text style={ms.backText}>{"\u2190"} Back</Text>
            </Pressable>
            <Text style={ms.eyebrow}>GUESSING GAME</Text>
            <Text style={ms.title}>What Am I?</Text>
            <Text style={ms.sub}>Read the clues. Guess what I am.</Text>
          </View>

          {/* Body */}
          <View style={ms.body}>
            <Text style={ms.sectionLabel}>CHOOSE MODE</Text>

            <View style={ms.toggleRow}>
              <Pressable
                style={[ms.diffCard, ms.diffEasy, difficulty === "easy" && ms.diffEasyOn]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDifficulty("easy");
                }}
              >
                <Text style={ms.diffIcon}>{"\uD83D\uDC40"}</Text>
                <Text style={[ms.diffTitle, { color: "#065F46" }]}>Easy</Text>
                <Text style={[ms.diffHint, { color: "#065F46" }]}>Pick from 4 options</Text>
                {difficulty === "easy" && (
                  <View style={[ms.diffCheck, { backgroundColor: "#16A34A" }]}>
                    <Text style={ms.diffCheckText}>{"\u2713"}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                style={[ms.diffCard, ms.diffHard, difficulty === "hard" && ms.diffHardOn]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDifficulty("hard");
                }}
              >
                <Text style={ms.diffIcon}>{"\uD83E\uDDE0"}</Text>
                <Text style={[ms.diffTitle, { color: "#78350F" }]}>Hard</Text>
                <Text style={[ms.diffHint, { color: "#92400E" }]}>Type the answer</Text>
                {difficulty === "hard" && (
                  <View style={[ms.diffCheck, { backgroundColor: "#D97706" }]}>
                    <Text style={ms.diffCheckText}>{"\u2713"}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            <Text style={[ms.sectionLabel, { marginTop: 8 }]}>HOW IT WORKS</Text>
            <View style={ms.howCard}>
              <View style={ms.howRow}>
                <View style={[ms.howDot, { backgroundColor: "#7C3AED" }]} />
                <Text style={ms.howText}>
                  Up to {difficulty === "hard" ? "5" : "3"} clues revealed one at a time
                </Text>
              </View>
              <View style={ms.howRow}>
                <View style={[ms.howDot, { backgroundColor: "#7C3AED" }]} />
                <Text style={ms.howText}>Guess early to score more points</Text>
              </View>
              <View style={ms.howRow}>
                <View style={[ms.howDot, { backgroundColor: "#7C3AED" }]} />
                <Text style={ms.howText}>Wrong guesses reveal the next clue</Text>
              </View>
            </View>

            <Text style={[ms.sectionLabel, { marginTop: 8 }]}>POINTS PER CLUE</Text>
            <View style={ms.pointsCard}>
              {cluePoints.map((pts, i) => (
                <View
                  key={i}
                  style={[ms.pointsRow, i === 0 && ms.pointsRowHighlight]}
                >
                  <Text style={[ms.pointsClue, i === 0 && ms.pointsTextHL]}>
                    Clue {i + 1}
                  </Text>
                  <Text style={[ms.pointsVal, i === 0 && ms.pointsValHL]}>
                    {pts} {pts === 1 ? "pt" : "pts"}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [ms.cta, pressed && { opacity: 0.88 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                startGame();
              }}
              disabled={loading}
            >
              <Text style={ms.ctaText}>
                {loading ? "Loading..." : "Let\u2019s Go  \u2192"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── PLAYING ─────────────────────────────────────────────────────────────────
  if (gameState === "playing" && puzzle) {
    const activeClues = difficulty === "hard" ? puzzle.hardClues : puzzle.clues;
    const maxClues = activeClues.length;
    const cluePoints = difficulty === "hard" ? HARD_POINTS : EASY_POINTS;
    const currentPoints = cluePoints[currentClue] ?? 1;
    const previousClues = activeClues.slice(0, currentClue);
    const activeClue = activeClues[currentClue];
    const isLastClue = currentClue >= maxClues - 1;

    return (
      <View style={{ flex: 1, backgroundColor: "#2D1B69" }}>
        {/* Top bar */}
        <View style={[pl.topBar, { paddingTop: insets.top + 12 }]}>
          <Pressable
            style={pl.quitBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGameState("mode_select");
            }}
          >
            <Text style={pl.quitText}>{"\u2190"} Quit</Text>
          </Pressable>

          {/* progress dots */}
          <View style={pl.dotsRow}>
            {activeClues.map((_, i) => {
              const isDone = i < currentClue;
              const isActive = i === currentClue;
              return (
                <View
                  key={i}
                  style={[
                    pl.dot,
                    isDone && pl.dotDone,
                    isActive && pl.dotActive,
                    !isDone && !isActive && pl.dotNext,
                  ]}
                />
              );
            })}
          </View>

          {/* Score badge */}
          <View style={pl.scoreBadge}>
            <Text style={pl.scoreText}>{currentPoints}pt</Text>
          </View>
        </View>

        {/* Main content — clues top, input bottom */}
        <View style={{ flex: 1, justifyContent: "space-between", paddingBottom: insets.bottom + 20 }}>

          {/* TOP — clue history + active clue */}
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ padding: 20, gap: 8 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Previous clues greyed */}
            {previousClues.length > 0 && (
              <View style={pl.historyWrap}>
                {previousClues.map((clue, i) => (
                  <View key={i} style={pl.historyRow}>
                    <View style={pl.historyNum}>
                      <Text style={pl.historyNumText}>{i + 1}</Text>
                    </View>
                    <Text style={pl.historyText}>{clue}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Active clue bubble */}
            <View style={pl.bubbleWrap}>
              <View style={pl.bubbleTail} />
              <View style={pl.bubble}>
                <Text style={pl.clueNum}>CLUE {currentClue + 1}</Text>
                <Text style={pl.clueText}>{activeClue}</Text>
              </View>
            </View>
          </ScrollView>

          {/* BOTTOM — input + submit + next clue */}
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            {/* Easy mode: 4 option buttons */}
            {difficulty === "easy" && (
              <View style={pl.optionsWrap}>
                {shuffledOptions.map((opt) => {
                  const isElim = eliminatedOptions.includes(opt);
                  return (
                    <Pressable
                      key={opt}
                      disabled={isElim}
                      style={({ pressed }) => [
                        pl.optBtn,
                        isElim && pl.optBtnElim,
                        !isElim && pressed && pl.optBtnPressed,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleOptionTap(opt);
                      }}
                    >
                      <Text style={[pl.optText, isElim && pl.optTextElim]}>
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Hard mode: text input + submit */}
            {difficulty === "hard" && (
              <View style={pl.inputWrap}>
                <TextInput
                  ref={inputRef}
                  style={pl.textInput}
                  value={hardInput}
                  onChangeText={setHardInput}
                  placeholder="Type your answer..."
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleHardSubmit}
                />
                <Pressable
                  style={({ pressed }) => [pl.submitBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleHardSubmit}
                >
                  <Text style={pl.submitText}>Submit</Text>
                </Pressable>
              </View>
            )}

            {/* Next clue button — hidden on last clue */}
            {!isLastClue && (
              <Pressable
                style={({ pressed }) => [pl.skipBtn, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  advanceClue();
                }}
              >
                <Text style={pl.skipText}>Not sure? Next clue {"\u2192"}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── CORRECT ─────────────────────────────────────────────────────────────────
  if (gameState === "correct" && puzzle) {
    return (
      <LinearGradient
        colors={["#064E3B", "#065F46", "#047857"]}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            cr.container,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 36 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Done button */}
          <View style={cr.closeRow}>
            <Pressable
              style={cr.closeBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/kids/games" as never);
              }}
            >
              <Text style={cr.closeTxt}>Done</Text>
            </Pressable>
          </View>

          {/* Hero */}
          <View style={cr.hero}>
            <Animated.View style={{ transform: [{ scale: popAnim }] }}>
              <Text style={cr.emoji}>{TARGET_ICON}</Text>
            </Animated.View>
            <Text style={cr.headline}>Nailed it!</Text>
            <Text style={cr.answer}>{puzzle.answer}</Text>
            <Text style={cr.clueLabel}>
              You got it on clue {clueOnWin} {"\u2014"} {scoreEarned} {scoreEarned === 1 ? "pt" : "pts"}
            </Text>
            <View style={cr.scoreBadge}>
              <Text style={cr.scoreText}>
                {STAR_ICON}{" "}
                <Text style={cr.scoreVal}>{scoreEarned} {scoreEarned === 1 ? "pt" : "pts"}</Text>
                {"  \u00B7  clue "}
                {clueOnWin}
              </Text>
            </View>
          </View>

          {/* Fun fact */}
          <View style={cr.factCard}>
            <Text style={cr.factLabel}>FUN FACT</Text>
            <Text style={cr.factText}>{puzzle.funFact}</Text>
          </View>

          {/* XP placeholder */}
          <View style={cr.xpNote}>
            <Text style={cr.xpText}>
              {STAR_ICON} XP rewards coming soon
            </Text>
          </View>

          {/* Actions */}
          <View style={cr.actions}>
            <Pressable
              style={({ pressed }) => [cr.btnPrimary, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                startGame();
              }}
            >
              <Text style={cr.btnPrimaryTxt}>Next puzzle</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [cr.btnGhost, pressed && { opacity: 0.75 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/kids/games" as never);
              }}
            >
              <Text style={cr.btnGhostTxt}>Back to Games</Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── REVEALED ─────────────────────────────────────────────────────────────────
  if (gameState === "revealed" && puzzle) {
    const activeClues = difficulty === "hard" ? puzzle.hardClues : puzzle.clues;
    return (
      <LinearGradient
        colors={["#1C0A0A", "#2D1515", "#3D1A1A"]}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            rv.container,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 36 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Done button */}
          <View style={rv.closeRow}>
            <Pressable
              style={rv.closeBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/kids/games" as never);
              }}
            >
              <Text style={rv.closeTxt}>Done</Text>
            </Pressable>
          </View>

          {/* Hero */}
          <View style={rv.hero}>
            <Text style={rv.oh}>ALMOST!</Text>
            <Text style={rv.answer}>{puzzle.answer}</Text>
            <Text style={rv.answerLabel}>The answer was</Text>
          </View>

          {/* All clues */}
          <View style={rv.cluesCard}>
            <Text style={rv.cluesLabel}>ALL {activeClues.length} CLUES</Text>
            {activeClues.map((clue, i) => (
              <View key={i} style={rv.clueRow}>
                <View style={rv.clueNum}>
                  <Text style={rv.clueNumText}>{i + 1}</Text>
                </View>
                <Text style={rv.clueText}>{clue}</Text>
              </View>
            ))}
          </View>

          {/* Fun fact */}
          <View style={rv.factCard}>
            <Text style={rv.factLabel}>FUN FACT</Text>
            <Text style={rv.factText}>{puzzle.funFact}</Text>
          </View>

          {/* Actions */}
          <View style={rv.actions}>
            <Pressable
              style={({ pressed }) => [rv.btnPrimary, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                startGame();
              }}
            >
              <Text style={rv.btnPrimaryTxt}>Try another</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [rv.btnGhost, pressed && { opacity: 0.75 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/kids/games" as never);
              }}
            >
              <Text style={rv.btnGhostTxt}>Back to Games</Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return null;
}

// ── STYLES ───────────────────────────────────────────────────────────────────

const ms = StyleSheet.create({
  header: {
    backgroundColor: "#2D1B69",
    paddingHorizontal: 24,
    paddingBottom: 32,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(124,58,237,0.18)", top: -60, right: -60,
  },
  circle2: {
    position: "absolute", width: 140, height: 140, borderRadius: 70,
    backgroundColor: "rgba(167,139,250,0.12)", bottom: -40, left: 20,
  },
  watermark: { position: "absolute", fontSize: 120, opacity: 0.06, right: -10, top: 10 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backText: { fontFamily: F.medium, fontSize: 15, color: "rgba(255,255,255,0.7)" },
  eyebrow: { fontFamily: F.bold, fontSize: 11, letterSpacing: 2, color: "#A78BFA", marginBottom: 6 },
  title: { fontFamily: F.bold, fontSize: 36, color: "#FFFFFF", lineHeight: 42, marginBottom: 8 },
  sub: { fontFamily: F.medium, fontSize: 15, color: "rgba(255,255,255,0.65)" },
  body: { padding: 20, gap: 12 },
  sectionLabel: { fontFamily: F.bold, fontSize: 11, letterSpacing: 2, color: "#9CA3AF" },
  toggleRow: { flexDirection: "row", gap: 10 },
  diffCard: {
    flex: 1, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: "transparent",
    backgroundColor: "#F9FAFB", position: "relative",
  },
  diffEasy: { backgroundColor: "#ECFDF5" },
  diffEasyOn: { borderColor: "#16A34A" },
  diffHard: { backgroundColor: "#FFFBEB" },
  diffHardOn: { borderColor: "#D97706" },
  diffIcon: { fontSize: 28, marginBottom: 6 },
  diffTitle: { fontFamily: F.bold, fontSize: 18, marginBottom: 2 },
  diffHint: { fontFamily: F.medium, fontSize: 12 },
  diffCheck: {
    position: "absolute", top: 8, right: 8, width: 22, height: 22,
    borderRadius: 11, justifyContent: "center", alignItems: "center",
  },
  diffCheckText: { fontFamily: F.bold, fontSize: 13, color: "#FFFFFF" },
  howCard: { backgroundColor: "#F9FAFB", borderRadius: 14, padding: 16, gap: 10 },
  howRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  howDot: { width: 8, height: 8, borderRadius: 4 },
  howText: { fontFamily: F.medium, fontSize: 14, color: "#374151", flex: 1 },
  pointsCard: { backgroundColor: "#F9FAFB", borderRadius: 14, overflow: "hidden" },
  pointsRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  pointsRowHighlight: { backgroundColor: "#EDE9FE" },
  pointsClue: { fontFamily: F.medium, fontSize: 14, color: "#6B7280" },
  pointsTextHL: { color: "#5B21B6", fontFamily: F.bold },
  pointsVal: { fontFamily: F.bold, fontSize: 16, color: "#374151" },
  pointsValHL: { color: "#7C3AED", fontSize: 18 },
  cta: {
    backgroundColor: "#E8692A", borderRadius: 16, paddingVertical: 18,
    alignItems: "center", marginTop: 4,
  },
  ctaText: { fontFamily: F.bold, fontSize: 18, color: "#FFFFFF" },
});

const pl = StyleSheet.create({
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  quitBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  quitText: { fontFamily: F.medium, fontSize: 15, color: "rgba(255,255,255,0.6)" },
  dotsRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotDone: { backgroundColor: "#16A34A" },
  dotActive: { backgroundColor: "#E8692A", width: 14, height: 14, borderRadius: 7 },
  dotNext: { backgroundColor: "rgba(255,255,255,0.2)" },
  scoreBadge: {
    backgroundColor: "rgba(232,105,42,0.22)", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  scoreText: { fontFamily: F.bold, fontSize: 15, color: "#F97316" },
  historyWrap: { gap: 6, marginBottom: 4 },
  historyRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  historyNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center", marginTop: 1, flexShrink: 0,
  },
  historyNumText: { fontFamily: F.bold, fontSize: 10, color: "rgba(255,255,255,0.5)" },
  historyText: {
    fontFamily: F.medium, fontSize: 13,
    color: "rgba(255,255,255,0.35)", flex: 1, lineHeight: 18,
    textDecorationLine: "line-through",
  },
  bubbleWrap: { position: "relative", marginTop: 4 },
  bubbleTail: {
    position: "absolute", top: -7, left: 24,
    width: 0, height: 0,
    borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 8,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    borderBottomColor: "#4C1D95",
  },
  bubble: {
    backgroundColor: "#4C1D95", borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.3)",
  },
  clueNum: { fontFamily: F.bold, fontSize: 11, color: "#A78BFA", letterSpacing: 1.5, marginBottom: 8 },
  clueText: { fontFamily: F.medium, fontSize: 17, color: "#FFFFFF", lineHeight: 26 },
  optionsWrap: { gap: 10 },
  optBtn: {
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
  },
  optBtnElim: { backgroundColor: "rgba(220,38,38,0.15)", borderColor: "rgba(220,38,38,0.3)", opacity: 0.5 },
  optBtnPressed: { backgroundColor: "rgba(255,255,255,0.22)" },
  optText: { fontFamily: F.bold, fontSize: 16, color: "#FFFFFF" },
  optTextElim: { color: "rgba(255,255,255,0.35)", textDecorationLine: "line-through" },
  inputWrap: { gap: 10 },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 16,
    fontFamily: F.medium, fontSize: 17, color: "#FFFFFF",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  submitBtn: {
    backgroundColor: "#E8692A", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  submitText: { fontFamily: F.bold, fontSize: 17, color: "#FFFFFF" },
  skipBtn: { alignItems: "center", paddingVertical: 6 },
  skipText: { fontFamily: F.medium, fontSize: 14, color: "rgba(255,255,255,0.45)" },
});

const cr = StyleSheet.create({
  container: { paddingHorizontal: 24, alignItems: "stretch" },
  closeRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  closeTxt: { fontFamily: F.bold, fontSize: 14, color: "#FFFFFF" },
  hero: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emoji: { fontSize: 72 },
  headline: { fontFamily: "Fraunces_900Black", fontSize: 40, color: "#FFFFFF", textAlign: "center" },
  answer: { fontFamily: F.bold, fontSize: 28, color: "#6EE7B7", textAlign: "center" },
  clueLabel: { fontFamily: F.medium, fontSize: 15, color: "rgba(255,255,255,0.7)", textAlign: "center" },
  scoreBadge: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 4,
  },
  scoreText: { fontFamily: F.medium, fontSize: 15, color: "#FFFFFF" },
  scoreVal: { fontFamily: F.bold, fontSize: 18, color: "#6EE7B7" },
  factCard: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, marginBottom: 16 },
  factLabel: { fontFamily: F.bold, fontSize: 11, color: "rgba(110,231,183,0.8)", letterSpacing: 2, marginBottom: 8 },
  factText: { fontFamily: F.medium, fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 22 },
  xpNote: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12,
    padding: 14, alignItems: "center", marginBottom: 24,
  },
  xpText: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.5)" },
  actions: { gap: 12 },
  btnPrimary: {
    backgroundColor: "#FFFFFF", borderRadius: 16,
    paddingVertical: 18, alignItems: "center",
  },
  btnPrimaryTxt: { fontFamily: F.bold, fontSize: 17, color: "#064E3B" },
  btnGhost: {
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", borderRadius: 16,
    paddingVertical: 16, alignItems: "center",
  },
  btnGhostTxt: { fontFamily: F.bold, fontSize: 16, color: "rgba(255,255,255,0.7)" },
});

const rv = StyleSheet.create({
  container: { paddingHorizontal: 24, alignItems: "stretch" },
  closeRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  closeTxt: { fontFamily: F.bold, fontSize: 14, color: "rgba(255,255,255,0.7)" },
  hero: { alignItems: "center", paddingVertical: 20, gap: 4 },
  oh: { fontFamily: F.bold, fontSize: 12, letterSpacing: 2, color: "#F87171", marginBottom: 4 },
  answer: { fontFamily: "Fraunces_900Black", fontSize: 36, color: "#FFFFFF", textAlign: "center" },
  answerLabel: { fontFamily: F.medium, fontSize: 14, color: "rgba(255,255,255,0.5)" },
  cluesCard: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 20, marginBottom: 16, gap: 12 },
  cluesLabel: { fontFamily: F.bold, fontSize: 11, letterSpacing: 2, color: "rgba(248,113,113,0.8)", marginBottom: 4 },
  clueRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  clueNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center", flexShrink: 0, marginTop: 1,
  },
  clueNumText: { fontFamily: F.bold, fontSize: 11, color: "rgba(255,255,255,0.6)" },
  clueText: { fontFamily: F.medium, fontSize: 14, color: "rgba(255,255,255,0.75)", flex: 1, lineHeight: 20 },
  factCard: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 20, marginBottom: 24 },
  factLabel: { fontFamily: F.bold, fontSize: 11, color: "rgba(248,113,113,0.7)", letterSpacing: 2, marginBottom: 8 },
  factText: { fontFamily: F.medium, fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 21 },
  actions: { gap: 12 },
  btnPrimary: {
    backgroundColor: "#FFFFFF", borderRadius: 16,
    paddingVertical: 18, alignItems: "center",
  },
  btnPrimaryTxt: { fontFamily: F.bold, fontSize: 17, color: "#3D1A1A" },
  btnGhost: {
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", borderRadius: 16,
    paddingVertical: 16, alignItems: "center",
  },
  btnGhostTxt: { fontFamily: F.bold, fontSize: 16, color: "rgba(255,255,255,0.5)" },
});
