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
  CLUE_POINTS,
  pickPuzzle,
  type WhatAmIPuzzle,
} from "@/constants/whatAmIData";

type GameState = "mode_select" | "playing" | "correct" | "revealed";
type Difficulty = "easy" | "hard";

const SEARCH_ICON = "\uD83D\uDD0D";
const TARGET_ICON = "\uD83C\uDFAF";
const STAR_ICON = "\u2B50";

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
    if (option === puzzle.answer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const pts = CLUE_POINTS[currentClue] ?? 1;
      setScoreEarned(pts);
      setClueOnWin(currentClue + 1);
      setGameState("correct");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newEliminated = [...eliminatedOptions, option];
    setEliminatedOptions(newEliminated);
    if (currentClue < 2) {
      setCurrentClue(prev => prev + 1);
    } else {
      setGameState("revealed");
    }
  }, [puzzle, currentClue, eliminatedOptions]);

  const advanceClue = useCallback(() => {
    if (!puzzle) return;
    if (currentClue >= 2) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setGameState("revealed");
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentClue(prev => prev + 1);
      setHardInput("");
    }
  }, [puzzle, currentClue]);

  const handleHardSubmit = useCallback(() => {
    if (!puzzle) return;
    const cleaned = hardInput.trim().toUpperCase();
    if (cleaned === puzzle.answer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const pts = CLUE_POINTS[currentClue] ?? 1;
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
                <Text style={ms.howText}>Up to 3 clues revealed one at a time</Text>
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
              {CLUE_POINTS.map((pts, i) => (
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
    const currentPoints = CLUE_POINTS[currentClue] ?? 1;
    const previousClues = puzzle.clues.slice(0, currentClue);
    const activeClue = puzzle.clues[currentClue];
    const isLastClue = currentClue >= 2;

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

          {/* 3 progress dots */}
          <View style={pl.dotsRow}>
            {puzzle.clues.map((_, i) => {
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

        {/* Scrollable clue area — fills remaining space */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={pl.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Clue history */}
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

          {/* Spacer so options push to bottom */}
          <View style={{ flex: 1, minHeight: 16 }} />

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

          {/* Hard mode: text input */}
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

          {/* Bottom safe area padding */}
          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
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

          {/* All 3 clues */}
          <View style={rv.cluesCard}>
            <Text style={rv.cluesLabel}>ALL 3 CLUES</Text>
            {puzzle.clues.map((clue, i) => (
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

// ── MODE SELECT STYLES ────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  header: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 20,
    paddingBottom: 28,
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
  watermark: {
    position: "absolute", right: -10, top: 20,
    fontSize: 110, opacity: 0.12,
  },
  backRow: { marginBottom: 16 },
  backText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.7)" },
  eyebrow: {
    fontFamily: F.bold, fontSize: 11,
    color: "rgba(255,255,255,0.5)", letterSpacing: 0.12 * 11,
    marginBottom: 6,
  },
  title: { fontFamily: F.bold, fontSize: 34, color: "#fff", lineHeight: 40, marginBottom: 4 },
  sub: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  body: { padding: 20, gap: 12 },
  sectionLabel: {
    fontFamily: F.bold, fontSize: 11, color: "#78716C",
    letterSpacing: 0.1 * 11,
  },
  toggleRow: { flexDirection: "row", gap: 10 },
  diffCard: {
    flex: 1, borderRadius: 18, padding: 18,
    borderWidth: 2.5, borderColor: "transparent",
    position: "relative", overflow: "hidden",
  },
  diffEasy: { backgroundColor: "#ECFDF5", borderColor: "#D1FAE5" },
  diffEasyOn: { borderColor: "#16A34A", backgroundColor: "#DCFCE7" },
  diffHard: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  diffHardOn: { borderColor: "#D97706", backgroundColor: "#FEF9C3" },
  diffIcon: { fontSize: 32, marginBottom: 10 },
  diffTitle: { fontFamily: F.bold, fontSize: 16, marginBottom: 4 },
  diffHint: { fontFamily: F.medium, fontSize: 11, lineHeight: 15, opacity: 0.8 },
  diffCheck: {
    position: "absolute", top: 12, right: 12,
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  diffCheckText: { fontFamily: F.bold, fontSize: 12, color: "#fff" },
  howCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: "rgba(0,0,0,0.06)", gap: 10,
  },
  howRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  howDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  howText: { fontFamily: F.medium, fontSize: 13, color: "#44403C", flex: 1, lineHeight: 19 },
  pointsCard: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1.5, borderColor: "rgba(0,0,0,0.06)", overflow: "hidden",
  },
  pointsRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)",
  },
  pointsRowHighlight: { backgroundColor: "#7C3AED" },
  pointsClue: { fontFamily: F.medium, fontSize: 13, color: "#44403C" },
  pointsVal: { fontFamily: F.bold, fontSize: 14, color: "#7C3AED" },
  pointsTextHL: { color: "#fff" },
  pointsValHL: { color: "#FCD34D" },
  cta: {
    backgroundColor: "#E8692A", borderRadius: 16,
    paddingVertical: 18, alignItems: "center",
    shadowColor: "#E8692A", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6, marginTop: 4,
  },
  ctaText: { fontFamily: F.bold, fontSize: 17, color: "#fff" },
});

// ── PLAYING STYLES ────────────────────────────────────────────────────────────
const pl = StyleSheet.create({
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 16,
  },
  quitBtn: {
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  quitText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.7)" },
  dotsRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { borderRadius: 4 },
  dotDone: { width: 18, height: 7, backgroundColor: "#7C3AED" },
  dotActive: { width: 22, height: 9, backgroundColor: "#fff" },
  dotNext: { width: 7, height: 7, backgroundColor: "rgba(255,255,255,0.25)" },
  scoreBadge: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  scoreText: { fontFamily: F.bold, fontSize: 13, color: "#FCD34D" },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  historyWrap: { marginBottom: 8, gap: 8 },
  historyRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  historyNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
    marginTop: 1, flexShrink: 0,
  },
  historyNumText: { fontFamily: F.bold, fontSize: 10, color: "rgba(255,255,255,0.5)" },
  historyText: { fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.4)", flex: 1, lineHeight: 18 },
  bubbleWrap: { marginBottom: 8, position: "relative" },
  bubbleTail: {
    width: 0, height: 0, marginLeft: 28,
    borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 10,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  bubble: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 16, padding: 20, minHeight: 100,
    justifyContent: "center",
  },
  clueNum: {
    fontFamily: F.bold, fontSize: 10,
    color: "rgba(255,255,255,0.45)", letterSpacing: 1.2,
    marginBottom: 8,
  },
  clueText: {
    fontFamily: "Fraunces_900Black",
    fontSize: 18, color: "#fff", lineHeight: 26, fontStyle: "italic",
  },
  optionsWrap: { gap: 10, marginBottom: 10 },
  optBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  optBtnElim: {
    opacity: 0.25,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.06)",
  },
  optBtnPressed: { backgroundColor: "rgba(255,255,255,0.22)" },
  optText: {
    fontSize: 17,
    fontFamily: F.bold,
    color: "#fff",
    letterSpacing: 1,
  },
  optTextElim: {
    textDecorationLine: "line-through",
    color: "rgba(255,255,255,0.4)",
  },
  inputWrap: { gap: 10, marginBottom: 10 },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20,
    fontFamily: F.bold, fontSize: 16, color: "#fff",
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: "#E8692A", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  submitText: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  skipBtn: {
    borderRadius: 12,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)",
    borderStyle: "dashed",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  skipText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.5)" },
});

// ── CORRECT STYLES ────────────────────────────────────────────────────────────
const cr = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  closeRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 16 },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  closeTxt: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  hero: { alignItems: "center", marginBottom: 24 },
  emoji: { fontSize: 56, marginBottom: 12 },
  headline: { fontFamily: F.bold, fontSize: 40, color: "#fff", marginBottom: 8 },
  answer: {
    fontSize: 28, fontFamily: F.bold,
    color: "#6EE7B7", letterSpacing: 6, marginBottom: 4,
  },
  clueLabel: {
    fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.55)",
    marginBottom: 14,
  },
  scoreBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8,
  },
  scoreText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  scoreVal: { color: "#FCD34D" },
  factCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 20, padding: 20, marginBottom: 12,
  },
  factLabel: {
    fontFamily: F.bold, fontSize: 10,
    color: "rgba(255,255,255,0.45)", letterSpacing: 1.2, marginBottom: 8,
  },
  factText: { fontFamily: F.medium, fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 21 },
  xpNote: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    alignItems: "center", marginBottom: 16,
  },
  xpText: { fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.4)" },
  actions: { gap: 10 },
  btnPrimary: {
    backgroundColor: "#E8692A", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    shadowColor: "#E8692A", shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  btnPrimaryTxt: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  btnGhost: {
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  btnGhostTxt: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
});

// ── REVEALED STYLES ───────────────────────────────────────────────────────────
const rv = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  closeRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 16 },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  closeTxt: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.7)" },
  hero: { alignItems: "center", marginBottom: 20 },
  oh: {
    fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.2, marginBottom: 12,
  },
  answer: {
    fontSize: 30, fontFamily: F.bold,
    color: "#fff", letterSpacing: 6, marginBottom: 4,
  },
  answerLabel: {
    fontFamily: F.medium, fontSize: 13,
    color: "rgba(255,255,255,0.45)",
  },
  cluesCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20, padding: 16, marginBottom: 12, gap: 12,
  },
  cluesLabel: {
    fontFamily: F.bold, fontSize: 10,
    color: "rgba(255,255,255,0.35)", letterSpacing: 1.2, marginBottom: 4,
  },
  clueRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  clueNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  clueNumText: { fontFamily: F.bold, fontSize: 11, color: "rgba(255,255,255,0.6)" },
  clueText: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.7)", flex: 1, lineHeight: 19 },
  factCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20, padding: 20, marginBottom: 16,
  },
  factLabel: {
    fontFamily: F.bold, fontSize: 10,
    color: "rgba(255,255,255,0.35)", letterSpacing: 1.2, marginBottom: 8,
  },
  factText: { fontFamily: F.medium, fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 21 },
  actions: { gap: 10 },
  btnPrimary: {
    backgroundColor: "#E8692A", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  btnPrimaryTxt: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  btnGhost: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  btnGhostTxt: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
});
