import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { F } from "@/lib/tokens";
import {
  shuffleAndPickQuestions,
  type FlagQuizQuestion,
} from "@/constants/flagQuizData";

// ── Types ─────────────────────────────────────────────────────────────────────

type GamePhase = "start" | "question" | "answered_correct" | "answered_wrong" | "results";

const TOTAL_QUESTIONS = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FlagQuizGame() {
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<GamePhase>("start");
  const [questions, setQuestions] = useState<FlagQuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]); // countryCode order for this question
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const factSlideAnim = useRef(new Animated.Value(60)).current;
  const factOpacityAnim = useRef(new Animated.Value(0)).current;
  const trophyAnim = useRef(new Animated.Value(0)).current;

  // ── Timer management ───────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  // ── Fact panel animation ──────────────────────────────────────────────────

  const animateFactIn = useCallback(() => {
    factSlideAnim.setValue(60);
    factOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(factSlideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
      Animated.timing(factOpacityAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [factSlideAnim, factOpacityAnim]);

  // ── Trophy animation ───────────────────────────────────────────────────────

  useEffect(() => {
    if (phase === "results") {
      Animated.sequence([
        Animated.timing(trophyAnim, { toValue: 1.3, duration: 300, useNativeDriver: true }),
        Animated.timing(trophyAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
        Animated.timing(trophyAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    } else {
      trophyAnim.setValue(0);
    }
  }, [phase, trophyAnim]);

  // ── Build option order for a question ─────────────────────────────────────

  const buildOptions = useCallback((q: FlagQuizQuestion): string[] => {
    const all = [q.correct, ...q.distractors];
    return shuffle(all).map((c) => c.countryCode);
  }, []);

  // ── Start / restart game ──────────────────────────────────────────────────

  const startGame = useCallback(() => {
    const qs = shuffleAndPickQuestions(TOTAL_QUESTIONS);
    setQuestions(qs);
    setQuestionIndex(0);
    setScore(0);
    setElapsed(0);
    setSelectedCode(null);
    setOptions(buildOptions(qs[0]));
    setPhase("question");
    startTimer();
  }, [buildOptions, startTimer]);

  // ── Handle a tap ──────────────────────────────────────────────────────────

  const handleTap = useCallback((code: string) => {
    if (phase !== "question") return;
    const q = questions[questionIndex];
    if (!q) return;

    setSelectedCode(code);
    const isCorrect = code === q.correct.countryCode;

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore((prev) => prev + 1);
      setPhase("answered_correct");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPhase("answered_wrong");
    }

    animateFactIn();
    stopTimer();
  }, [phase, questions, questionIndex, animateFactIn, stopTimer]);

  // ── Advance to next question or results ───────────────────────────────────

  const advance = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = questionIndex + 1;
    if (next >= TOTAL_QUESTIONS) {
      setPhase("results");
    } else {
      setQuestionIndex(next);
      setSelectedCode(null);
      setOptions(buildOptions(questions[next]));
      setPhase("question");
      startTimer();
    }
  }, [questionIndex, questions, buildOptions, startTimer]);

  const currentQ = questions[questionIndex];

  // ── START screen ──────────────────────────────────────────────────────────

  if (phase === "start") {
    return (
      <View style={[st.root, { paddingTop: insets.top }]}>
        <View style={[st.header, { paddingTop: 16 }]}>
          <View style={st.circle1} />
          <View style={st.circle2} />
          <Pressable
            style={st.backRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Text style={st.backText}>{"\u2190"} Back</Text>
          </Pressable>
          <Text style={st.watermark}>{"\uD83C\uDFC1"}</Text>
          <Text style={st.eyebrow}>GEO GAME</Text>
          <Text style={st.title}>Flag Quiz</Text>
          <Text style={st.sub}>Tap the correct flag for each country</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[st.body, { paddingBottom: insets.bottom + 40 }]}
        >
          {/* How it works */}
          <Text style={st.sectionLabel}>HOW TO PLAY</Text>
          <View style={st.howCard}>
            <View style={st.howRow}>
              <View style={[st.howDot, { backgroundColor: "#059669" }]} />
              <Text style={st.howText}>You will see a country name — tap the correct flag from 4 choices</Text>
            </View>
            <View style={st.howRow}>
              <View style={[st.howDot, { backgroundColor: "#059669" }]} />
              <Text style={st.howText}>After each answer a fun fact about that flag is revealed</Text>
            </View>
            <View style={st.howRow}>
              <View style={[st.howDot, { backgroundColor: "#059669" }]} />
              <Text style={st.howText}>10 questions total — see how many you can get right!</Text>
            </View>
          </View>

          {/* Stats preview */}
          <View style={st.statsRow}>
            <View style={st.statBox}>
              <Text style={st.statNum}>10</Text>
              <Text style={st.statLabel}>Questions</Text>
            </View>
            <View style={st.statBox}>
              <Text style={st.statNum}>60+</Text>
              <Text style={st.statLabel}>Countries</Text>
            </View>
            <View style={st.statBox}>
              <Text style={st.statNum}>{"\u2605"}</Text>
              <Text style={st.statLabel}>Score</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [st.cta, pressed && { opacity: 0.88 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              startGame();
            }}
          >
            <Text style={st.ctaText}>{"\uD83C\uDFC1"} Let{"\u2019"}s Go  {"\u2192"}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── QUESTION screen ───────────────────────────────────────────────────────

  if ((phase === "question" || phase === "answered_correct" || phase === "answered_wrong") && currentQ) {
    const allCountries = [currentQ.correct, ...currentQ.distractors];
    const countryByCode = Object.fromEntries(allCountries.map((c) => [c.countryCode, c]));
    const isAnswered = phase === "answered_correct" || phase === "answered_wrong";
    const correctCode = currentQ.correct.countryCode;
    const progressPct = ((questionIndex) / TOTAL_QUESTIONS) * 100;
    const filledPct = isAnswered ? ((questionIndex + 1) / TOTAL_QUESTIONS) * 100 : progressPct;

    return (
      <View style={[q.root, { paddingTop: insets.top }]}>
        {/* ── Header bar ── */}
        <View style={q.header}>
          <Pressable
            style={q.quitBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              stopTimer();
              setPhase("start");
            }}
          >
            <Text style={q.quitText}>{"\u2190"} Quit</Text>
          </Pressable>

          <View style={q.timerBadge}>
            <Text style={q.timerText}>{"\u23F1"} {formatTime(elapsed)}</Text>
          </View>

          <View style={q.scoreBadge}>
            <Text style={q.scoreText}>{"\u2B50"} {score}</Text>
          </View>
        </View>

        {/* ── Progress bar ── */}
        <View style={q.progressTrack}>
          <View style={[q.progressFill, { width: `${filledPct}%` }]} />
        </View>
        <Text style={q.progressLabel}>Question {questionIndex + 1} of {TOTAL_QUESTIONS}</Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[q.scroll, { paddingBottom: insets.bottom + 24 }]}
        >
          {/* ── Country name ── */}
          <View style={q.countryCard}>
            <Text style={q.countryLabel}>Which flag belongs to…</Text>
            <Text style={q.countryName}>{currentQ.correct.name}</Text>
          </View>

          {/* ── 2×2 flag grid ── */}
          <View style={q.flagGrid}>
            {options.map((code) => {
              const country = countryByCode[code];
              if (!country) return null;
              const isSelected = selectedCode === code;
              const isCorrectTile = code === correctCode;

              let tileBg = "#ECFDF5";
              let tileBorder = "#6EE7B7";
              if (isAnswered) {
                if (isCorrectTile) {
                  tileBg = "#D1FAE5";
                  tileBorder = "#059669";
                } else if (isSelected && !isCorrectTile) {
                  tileBg = "#FEE2E2";
                  tileBorder = "#EF4444";
                } else {
                  tileBg = "#F8FAFC";
                  tileBorder = "#CBD5E1";
                }
              }

              return (
                <Pressable
                  key={code}
                  disabled={isAnswered}
                  style={({ pressed }) => [
                    q.flagTile,
                    { backgroundColor: tileBg, borderColor: tileBorder },
                    !isAnswered && pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleTap(code);
                  }}
                >
                  <Text style={q.flagEmoji}>{country.flagEmoji}</Text>
                  {isAnswered && isCorrectTile && (
                    <View style={q.correctBadge}>
                      <Text style={q.correctBadgeText}>{"\u2713"}</Text>
                    </View>
                  )}
                  {isAnswered && isSelected && !isCorrectTile && (
                    <View style={[q.correctBadge, { backgroundColor: "#EF4444" }]}>
                      <Text style={q.correctBadgeText}>{"\u2717"}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* ── Fun fact panel (slides in after answer) ── */}
          {isAnswered && (
            <Animated.View
              style={[
                q.factPanel,
                {
                  transform: [{ translateY: factSlideAnim }],
                  opacity: factOpacityAnim,
                },
                phase === "answered_correct" ? q.factPanelCorrect : q.factPanelWrong,
              ]}
            >
              <Text style={q.factHeader}>
                {phase === "answered_correct"
                  ? "\u2728 Correct! Fun Fact about " + currentQ.correct.name + " \uD83C\uDFF3\uFE0F"
                  : "\uD83D\uDCA1 Fun Fact about " + currentQ.correct.name}
              </Text>
              <Text style={q.factText}>{currentQ.correct.funFact}</Text>

              {phase === "answered_wrong" && (
                <View style={q.correctAnswerRow}>
                  <Text style={q.correctAnswerLabel}>The correct flag was: </Text>
                  <Text style={q.correctAnswerFlag}>{currentQ.correct.flagEmoji}</Text>
                  <Text style={q.correctAnswerName}> {currentQ.correct.name}</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* ── Next button ── */}
          {isAnswered && (
            <Pressable
              style={({ pressed }) => [q.nextBtn, pressed && { opacity: 0.88 }]}
              onPress={advance}
            >
              <Text style={q.nextBtnText}>
                {phase === "answered_correct" ? "\u2B50 Great! " : ""}
                {questionIndex + 1 < TOTAL_QUESTIONS ? "Next Question \u2192" : "See Results \uD83C\uDFC6"}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── RESULTS screen ────────────────────────────────────────────────────────

  if (phase === "results") {
    const pct = Math.round((score / TOTAL_QUESTIONS) * 100);
    let medal = "\uD83C\uDFC6";
    let headline = "Outstanding!";
    let subline = "You're a flag expert!";
    if (score <= 3) {
      medal = "\uD83C\uDF0D";
      headline = "Keep Exploring!";
      subline = "Every quiz makes you smarter.";
    } else if (score <= 6) {
      medal = "\uD83C\uDFC5";
      headline = "Well Done!";
      subline = "You know your flags!";
    } else if (score <= 8) {
      medal = "\uD83E\uDD47";
      headline = "Brilliant!";
      subline = "Almost a perfect score!";
    }

    return (
      <LinearGradient
        colors={["#064E3B", "#065F46", "#047857"]}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            r.container,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 36 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <View style={r.closeRow}>
            <Pressable
              style={r.closeBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/kids/games" as never);
              }}
            >
              <Text style={r.closeTxt}>Done</Text>
            </Pressable>
          </View>

          {/* Trophy hero */}
          <View style={r.hero}>
            <Animated.View style={{ transform: [{ scale: trophyAnim }] }}>
              <Text style={r.medal}>{medal}</Text>
            </Animated.View>
            <Text style={r.headline}>{headline}</Text>
            <Text style={r.subline}>{subline}</Text>
          </View>

          {/* Score card */}
          <View style={r.scoreCard}>
            <View style={r.scoreRow}>
              <View style={r.scoreBox}>
                <Text style={r.scoreNum}>{score}</Text>
                <Text style={r.scoreLabel}>Correct</Text>
              </View>
              <View style={r.scoreDivider} />
              <View style={r.scoreBox}>
                <Text style={r.scoreNum}>{TOTAL_QUESTIONS - score}</Text>
                <Text style={r.scoreLabel}>Missed</Text>
              </View>
              <View style={r.scoreDivider} />
              <View style={r.scoreBox}>
                <Text style={r.scoreNum}>{pct}%</Text>
                <Text style={r.scoreLabel}>Score</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={r.barTrack}>
              <View style={[r.barFill, { width: `${pct}%` }]} />
            </View>

            <Text style={r.timeText}>{"\u23F1"} Finished in {formatTime(elapsed)}</Text>
          </View>

          {/* Star display */}
          <View style={r.starsRow}>
            {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
              <Text key={i} style={[r.star, i < score && r.starFilled]}>
                {i < score ? "\u2B50" : "\u2606"}
              </Text>
            ))}
          </View>

          {/* XP note */}
          <View style={r.xpNote}>
            <Text style={r.xpText}>{"\u2B50"} XP rewards coming soon</Text>
          </View>

          {/* Actions */}
          <View style={r.actions}>
            <Pressable
              style={({ pressed }) => [r.btnPrimary, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                startGame();
              }}
            >
              <Text style={r.btnPrimaryTxt}>{"\uD83C\uDD95"} Play Again</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [r.btnGhost, pressed && { opacity: 0.75 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/kids/games" as never);
              }}
            >
              <Text style={r.btnGhostTxt}>Back to Games</Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return null;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

// START screen
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0FDF4" },
  header: {
    backgroundColor: "#1B4332",
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: "hidden",
    position: "relative",
  },
  circle1: {
    position: "absolute", top: -50, right: -30,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  circle2: {
    position: "absolute", bottom: -40, left: -20,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  backRow: { marginBottom: 8 },
  backText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.7)" },
  watermark: {
    position: "absolute", right: 16, bottom: 16,
    fontSize: 72, opacity: 0.12,
  },
  eyebrow: {
    fontFamily: F.bold, fontSize: 10, color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.2, marginBottom: 4,
  },
  title: { fontFamily: F.bold, fontSize: 30, color: "#fff", marginBottom: 4 },
  sub: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.65)" },
  body: { padding: 16 },
  sectionLabel: {
    fontFamily: F.bold, fontSize: 10, letterSpacing: 1, color: "#6B7280",
    marginTop: 20, marginBottom: 8,
  },
  howCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#D1FAE5", gap: 12,
  },
  howRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  howDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  howText: { fontFamily: F.medium, fontSize: 13, color: "#374151", flex: 1, lineHeight: 19 },
  statsRow: {
    flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 4,
  },
  statBox: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14,
    alignItems: "center", borderWidth: 1, borderColor: "#D1FAE5",
  },
  statNum: { fontFamily: F.bold, fontSize: 22, color: "#065F46" },
  statLabel: { fontFamily: F.medium, fontSize: 11, color: "#6B7280", marginTop: 2 },
  cta: {
    marginTop: 20, backgroundColor: "#065F46", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  ctaText: { fontFamily: F.bold, fontSize: 16, color: "#fff" },
});

// QUESTION screen
const q = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F2D1C" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  quitBtn: { paddingVertical: 4, paddingRight: 8 },
  quitText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  timerBadge: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  timerText: { fontFamily: F.bold, fontSize: 13, color: "#A7F3D0" },
  scoreBadge: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  scoreText: { fontFamily: F.bold, fontSize: 13, color: "#FDE68A" },
  progressTrack: {
    height: 5, backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 16, borderRadius: 3, overflow: "hidden",
  },
  progressFill: {
    height: "100%", backgroundColor: "#34D399", borderRadius: 3,
  },
  progressLabel: {
    fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,0.45)",
    textAlign: "center", marginTop: 6, marginBottom: 4,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  countryCard: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16,
    padding: 20, alignItems: "center", marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  countryLabel: {
    fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.5, marginBottom: 6,
  },
  countryName: { fontFamily: F.bold, fontSize: 26, color: "#fff", textAlign: "center" },
  flagGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16,
  },
  flagTile: {
    width: "47.5%", aspectRatio: 1.4,
    borderRadius: 14, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  flagEmoji: { fontSize: 44 },
  correctBadge: {
    position: "absolute", top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#059669",
    alignItems: "center", justifyContent: "center",
  },
  correctBadgeText: { fontFamily: F.bold, fontSize: 11, color: "#fff" },
  factPanel: {
    borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1,
  },
  factPanelCorrect: {
    backgroundColor: "rgba(6,95,70,0.5)", borderColor: "#059669",
  },
  factPanelWrong: {
    backgroundColor: "rgba(127,29,29,0.4)", borderColor: "#DC2626",
  },
  factHeader: {
    fontFamily: F.bold, fontSize: 13, color: "#A7F3D0",
    marginBottom: 8, lineHeight: 18,
  },
  factText: {
    fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 19,
  },
  correctAnswerRow: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap",
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)",
  },
  correctAnswerLabel: { fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.6)" },
  correctAnswerFlag: { fontSize: 20 },
  correctAnswerName: { fontFamily: F.bold, fontSize: 13, color: "#FCA5A5" },
  nextBtn: {
    backgroundColor: "#065F46", borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
    borderWidth: 1, borderColor: "#059669",
  },
  nextBtnText: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
});

// RESULTS screen
const r = StyleSheet.create({
  container: { paddingHorizontal: 20, alignItems: "center" },
  closeRow: { width: "100%", alignItems: "flex-end", marginBottom: 8 },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  closeTxt: { fontFamily: F.bold, fontSize: 13, color: "#fff" },
  hero: { alignItems: "center", marginBottom: 24 },
  medal: { fontSize: 72, marginBottom: 12 },
  headline: { fontFamily: F.bold, fontSize: 28, color: "#fff", marginBottom: 4 },
  subline: { fontFamily: F.medium, fontSize: 14, color: "rgba(255,255,255,0.7)" },
  scoreCard: {
    width: "100%", backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  scoreRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 16 },
  scoreBox: { alignItems: "center" },
  scoreNum: { fontFamily: F.bold, fontSize: 26, color: "#fff" },
  scoreLabel: { fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  scoreDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  barTrack: {
    height: 8, backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 4, overflow: "hidden", marginBottom: 12,
  },
  barFill: { height: "100%", backgroundColor: "#34D399", borderRadius: 4 },
  timeText: {
    fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.55)", textAlign: "center",
  },
  starsRow: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "center",
    gap: 2, marginBottom: 16,
  },
  star: { fontSize: 22 },
  starFilled: { opacity: 1 },
  xpNote: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20,
  },
  xpText: { fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.55)" },
  actions: { width: "100%", gap: 10 },
  btnPrimary: {
    backgroundColor: "#fff", borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
  },
  btnPrimaryTxt: { fontFamily: F.bold, fontSize: 15, color: "#065F46" },
  btnGhost: {
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 14, paddingVertical: 14, alignItems: "center",
  },
  btnGhostTxt: { fontFamily: F.bold, fontSize: 14, color: "rgba(255,255,255,0.8)" },
});
