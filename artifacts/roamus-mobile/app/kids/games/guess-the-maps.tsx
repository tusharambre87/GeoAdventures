import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { F } from "@/lib/tokens";
import {
  shuffleAndPickQuestions,
  type CountryEntry,
  type GuessMapsQuestion,
} from "@/constants/guessMapsData";
import { getCountryPath } from "@/utils/countryOutline";

// ── Guess normalizer ─────────────────────────────────────────────────────────
// Strips accents, trims, and lowercases so "Cote d'Ivoire" matches "Côte d'Ivoire".
function normalizeGuess(s: string): string {
  return s.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "'");
}

// ── Types ─────────────────────────────────────────────────────────────────────

type GamePhase =
  | "mode_select"
  | "question"
  | "answered_correct"
  | "answered_wrong"
  | "results";
type Difficulty = "easy" | "hard";

const TOTAL_QUESTIONS = 10;
const HARD_MULTIPLIER = 2;
const MAX_ATTEMPTS = 5;
const ROAMUS_ORANGE = "#E8692A";

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

// ── CountrySilhouette ─────────────────────────────────────────────────────────

function CountrySilhouette({ numericId }: { numericId: number }) {
  const screenWidth = Dimensions.get("window").width;
  const size = screenWidth * 0.78;
  const pathD = getCountryPath(numericId);

  if (!pathD) {
    return (
      <View style={[sil.fallback, { width: size, height: size * 0.7 }]}>
        <Text style={sil.fallbackText}>{"\uD83D\uDDFA\uFE0F"}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        sil.card,
        { width: size, height: size * 0.72 },
      ]}
    >
      <Svg
        width={size - 32}
        height={size * 0.72 - 32}
        viewBox="0 0 500 500"
        preserveAspectRatio="xMidYMid meet"
      >
        <Path d={pathD} fill={ROAMUS_ORANGE} />
      </Svg>
    </View>
  );
}

const sil = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginVertical: 8,
  },
  fallback: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginVertical: 8,
  },
  fallbackText: { fontSize: 60, opacity: 0.4 },
});

// ── Hint helpers ───────────────────────────────────────────────────────────────

/**
 * Build the hint display string for a country name given how many wrong
 * attempts have been made and which interior letter index to reveal.
 *
 * wrongAttempts 0-1: no hint shown
 * wrongAttempts 2:   blanks per char (spaces preserved)
 * wrongAttempts 3:   also reveal one interior letter
 * wrongAttempts 4+:  also reveal the last letter
 */
function buildHintString(
  name: string,
  wrongAttempts: number,
  revealIndex: number | null
): string {
  if (wrongAttempts < 2) return "";
  return name
    .split("")
    .map((ch, i) => {
      if (ch === " ") return "  ";
      if (wrongAttempts >= 4 && i === name.length - 1) return ch;
      if (wrongAttempts >= 3 && i === revealIndex) return ch;
      return "_";
    })
    .join(" ");
}

/** Pick a random interior (non-first, non-last, non-space) letter index */
function pickInteriorIndex(name: string): number | null {
  const candidates: number[] = [];
  for (let i = 1; i < name.length - 1; i++) {
    if (name[i] !== " ") candidates.push(i);
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GuessMapsGame() {
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<GamePhase>("mode_select");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [questions, setQuestions] = useState<GuessMapsQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Hard mode state
  const [inputText, setInputText] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const [hardRoundOver, setHardRoundOver] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const factSlideAnim = useRef(new Animated.Value(60)).current;
  const factOpacityAnim = useRef(new Animated.Value(0)).current;
  const trophyAnim = useRef(new Animated.Value(0)).current;

  // ── Timer ────────────────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ── Fact panel animation ─────────────────────────────────────────────────

  const animateFactIn = useCallback(() => {
    factSlideAnim.setValue(60);
    factOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(factSlideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
      Animated.timing(factOpacityAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [factSlideAnim, factOpacityAnim]);

  // ── Trophy animation ─────────────────────────────────────────────────────

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

  // ── Build shuffled options for easy mode ─────────────────────────────────

  const buildOptions = useCallback((q: GuessMapsQuestion): string[] => {
    return shuffle([q.correct.name, ...q.distractors]);
  }, []);

  // ── Start / restart ──────────────────────────────────────────────────────

  const startGame = useCallback((diff?: Difficulty) => {
    const d = diff ?? difficulty;
    const qs = shuffleAndPickQuestions(TOTAL_QUESTIONS, (id) => getCountryPath(id) !== null);
    const first = qs[0];
    setQuestions(qs);
    setQuestionIndex(0);
    setScore(0);
    setElapsed(0);
    setSelectedOption(null);
    setShuffledOptions(buildOptions(first));
    setInputText("");
    setWrongAttempts(0);
    setRevealIndex(pickInteriorIndex(first.correct.name));
    setHardRoundOver(false);
    setPhase("question");
    startTimer();
  }, [difficulty, buildOptions, startTimer]);

  // ── Easy: handle tap ─────────────────────────────────────────────────────

  const handleEasyTap = useCallback((name: string) => {
    if (phase !== "question") return;
    const q = questions[questionIndex];
    if (!q) return;
    setSelectedOption(name);
    const isCorrect = name === q.correct.name;
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore((p) => p + 1);
      setPhase("answered_correct");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPhase("answered_wrong");
    }
    animateFactIn();
    stopTimer();
  }, [phase, questions, questionIndex, animateFactIn, stopTimer]);

  // ── Hard: handle guess ───────────────────────────────────────────────────

  const handleHardGuess = useCallback(() => {
    const q = questions[questionIndex];
    if (!q || hardRoundOver) return;
    const guess = inputText.trim();
    if (!guess) return;

    const isCorrect = normalizeGuess(guess) === normalizeGuess(q.correct.name);
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore((p) => p + 1);
      setHardRoundOver(true);
      setPhase("answered_correct");
      animateFactIn();
      stopTimer();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const next = wrongAttempts + 1;
      setWrongAttempts(next);
      setInputText("");
      if (next >= MAX_ATTEMPTS) {
        setHardRoundOver(true);
        setPhase("answered_wrong");
        animateFactIn();
        stopTimer();
      }
    }
  }, [questions, questionIndex, inputText, wrongAttempts, hardRoundOver, animateFactIn, stopTimer]);

  // ── Advance to next question or results ──────────────────────────────────

  const advance = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = questionIndex + 1;
    if (next >= TOTAL_QUESTIONS) {
      setPhase("results");
    } else {
      const nextQ = questions[next];
      setQuestionIndex(next);
      setSelectedOption(null);
      setShuffledOptions(buildOptions(nextQ));
      setInputText("");
      setWrongAttempts(0);
      setRevealIndex(pickInteriorIndex(nextQ.correct.name));
      setHardRoundOver(false);
      setPhase("question");
      startTimer();
    }
  }, [questionIndex, questions, buildOptions, startTimer]);

  const currentQ = questions[questionIndex];

  // ── MODE SELECT ───────────────────────────────────────────────────────────

  if (phase === "mode_select") {
    return (
      <View style={[ms.root, { paddingTop: insets.top }]}>
        <View style={[ms.header, { paddingTop: 16 }]}>
          <View style={ms.circle1} />
          <View style={ms.circle2} />
          <Pressable
            style={ms.backRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Text style={ms.backText}>{"\u2190"} Back</Text>
          </Pressable>
          <Text style={ms.watermark}>{"\uD83D\uDDFA\uFE0F"}</Text>
          <Text style={ms.eyebrow}>GEO GAME</Text>
          <Text style={ms.title}>Guess The Maps</Text>
          <Text style={ms.sub}>Can you name the country by its shape?</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[ms.body, { paddingBottom: insets.bottom + 40 }]}
        >
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
              <Text style={[ms.diffTitle, { color: "#78350F" }]}>Easy</Text>
              <Text style={[ms.diffHint, { color: "#92400E" }]}>See the silhouette</Text>
              <Text style={[ms.diffHint, { color: "#92400E" }]}>Pick from 4 choices</Text>
              {difficulty === "easy" && (
                <View style={[ms.diffCheck, { backgroundColor: "#D97706" }]}>
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
              <Text style={[ms.diffTitle, { color: "#1E40AF" }]}>Hard</Text>
              <Text style={[ms.diffHint, { color: "#1E40AF" }]}>Type your answer</Text>
              <Text style={[ms.diffHint, { color: "#1E40AF" }]}>{HARD_MULTIPLIER}x score bonus!</Text>
              {difficulty === "hard" && (
                <View style={[ms.diffCheck, { backgroundColor: "#2563EB" }]}>
                  <Text style={ms.diffCheckText}>{"\u2713"}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <Text style={[ms.sectionLabel, { marginTop: 8 }]}>HOW TO PLAY</Text>
          <View style={ms.howCard}>
            {difficulty === "easy" ? (
              <>
                <View style={ms.howRow}>
                  <View style={[ms.howDot, { backgroundColor: "#D97706" }]} />
                  <Text style={ms.howText}>An orange country silhouette appears — tap the correct name from 4 choices</Text>
                </View>
                <View style={ms.howRow}>
                  <View style={[ms.howDot, { backgroundColor: "#D97706" }]} />
                  <Text style={ms.howText}>After each answer a fun fact about that country is revealed</Text>
                </View>
                <View style={ms.howRow}>
                  <View style={[ms.howDot, { backgroundColor: "#D97706" }]} />
                  <Text style={ms.howText}>10 questions total {"\u2014"} see how many you can get right!</Text>
                </View>
              </>
            ) : (
              <>
                <View style={ms.howRow}>
                  <View style={[ms.howDot, { backgroundColor: "#2563EB" }]} />
                  <Text style={ms.howText}>A silhouette appears {"\u2014"} type the country name to guess</Text>
                </View>
                <View style={ms.howRow}>
                  <View style={[ms.howDot, { backgroundColor: "#2563EB" }]} />
                  <Text style={ms.howText}>You have 5 attempts per question {"\u2014"} hints unlock after wrong guesses</Text>
                </View>
                <View style={ms.howRow}>
                  <View style={[ms.howDot, { backgroundColor: "#2563EB" }]} />
                  <Text style={ms.howText}>10 questions {"\u2014"} earn {HARD_MULTIPLIER}x bonus stars for every correct answer!</Text>
                </View>
              </>
            )}
          </View>

          <View style={ms.statsRow}>
            <View style={ms.statBox}>
              <Text style={ms.statNum}>10</Text>
              <Text style={ms.statLabel}>Questions</Text>
            </View>
            <View style={ms.statBox}>
              <Text style={ms.statNum}>150+</Text>
              <Text style={ms.statLabel}>Countries</Text>
            </View>
            <View style={ms.statBox}>
              <Text style={ms.statNum}>{difficulty === "hard" ? `${HARD_MULTIPLIER}x` : "\u2605"}</Text>
              <Text style={ms.statLabel}>{difficulty === "hard" ? "Bonus" : "Score"}</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [ms.cta, pressed && { opacity: 0.88 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              startGame();
            }}
          >
            <Text style={ms.ctaText}>{"\uD83D\uDDFA\uFE0F"} Let{"\u2019"}s Go  {"\u2192"}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── QUESTION / ANSWERED ────────────────────────────────────────────────────

  if (
    (phase === "question" || phase === "answered_correct" || phase === "answered_wrong") &&
    currentQ
  ) {
    const isAnswered = phase === "answered_correct" || phase === "answered_wrong";
    const progressPct = (questionIndex / TOTAL_QUESTIONS) * 100;
    const filledPct = isAnswered ? ((questionIndex + 1) / TOTAL_QUESTIONS) * 100 : progressPct;
    const hintStr =
      difficulty === "hard"
        ? buildHintString(currentQ.correct.name, wrongAttempts, revealIndex)
        : "";

    return (
      <View style={[g.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={g.header}>
          <Pressable
            style={g.quitBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              stopTimer();
              setPhase("mode_select");
            }}
          >
            <Text style={g.quitText}>{"\u2190"} Quit</Text>
          </Pressable>
          <View style={g.timerBadge}>
            <Text style={g.timerText}>{"\u23F1"} {formatTime(elapsed)}</Text>
          </View>
          <View style={g.scoreBadge}>
            <Text style={g.scoreText}>{"\u2B50"} {score}{difficulty === "hard" ? ` \u00D7${HARD_MULTIPLIER}` : ""}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={g.progressTrack}>
          <View style={[g.progressFill, { width: `${filledPct}%` }]} />
        </View>
        <Text style={g.progressLabel}>Question {questionIndex + 1} of {TOTAL_QUESTIONS}</Text>

        {difficulty === "hard" && (
          <View style={g.hardBadge}>
            <Text style={g.hardBadgeText}>{"\uD83E\uDDE0"} HARD MODE {"\u2014"} {HARD_MULTIPLIER}x BONUS</Text>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[g.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Silhouette */}
          <Text style={g.prompt}>Which country is this?</Text>
          <CountrySilhouette numericId={currentQ.correct.numericId} />

          {/* ── EASY: 2×2 name grid ── */}
          {difficulty === "easy" && (
            <View style={g.nameGrid}>
              {shuffledOptions.map((name) => {
                const isSelected = selectedOption === name;
                const isCorrectOpt = name === currentQ.correct.name;
                let btnBg = "rgba(255,255,255,0.08)";
                let btnBorder = "rgba(255,255,255,0.15)";
                if (isAnswered) {
                  if (isCorrectOpt) { btnBg = "rgba(5,150,105,0.35)"; btnBorder = "#059669"; }
                  else if (isSelected) { btnBg = "rgba(239,68,68,0.25)"; btnBorder = "#EF4444"; }
                  else { btnBg = "rgba(255,255,255,0.03)"; btnBorder = "rgba(255,255,255,0.06)"; }
                }
                return (
                  <Pressable
                    key={name}
                    disabled={isAnswered}
                    style={({ pressed }) => [
                      g.nameBtn,
                      { backgroundColor: btnBg, borderColor: btnBorder },
                      !isAnswered && pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleEasyTap(name);
                    }}
                  >
                    {isAnswered && isCorrectOpt && (
                      <Text style={g.nameBtnIcon}>{"\u2713"} </Text>
                    )}
                    {isAnswered && isSelected && !isCorrectOpt && (
                      <Text style={[g.nameBtnIcon, { color: "#FCA5A5" }]}>{"\u2717"} </Text>
                    )}
                    <Text
                      style={[
                        g.nameBtnText,
                        isAnswered && isCorrectOpt && { color: "#A7F3D0" },
                        isAnswered && isSelected && !isCorrectOpt && { color: "#FCA5A5" },
                        isAnswered && !isSelected && !isCorrectOpt && { color: "rgba(255,255,255,0.3)" },
                      ]}
                      numberOfLines={2}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── HARD: text input + attempts ── */}
          {difficulty === "hard" && (
            <View style={g.hardSection}>
              {/* Attempt counter */}
              <View style={g.attemptRow}>
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      g.attemptDot,
                      i < wrongAttempts ? g.attemptDotWrong : g.attemptDotOk,
                    ]}
                  />
                ))}
                <Text style={g.attemptLabel}>
                  {hardRoundOver
                    ? phase === "answered_correct" ? "Correct!" : "Out of guesses"
                    : `${MAX_ATTEMPTS - wrongAttempts} attempt${MAX_ATTEMPTS - wrongAttempts !== 1 ? "s" : ""} left`}
                </Text>
              </View>

              {/* Hint row */}
              {hintStr !== "" && !hardRoundOver && (
                <View style={g.hintRow}>
                  <Text style={g.hintLabel}>{"\uD83D\uDCA1"} Hint: </Text>
                  <Text style={g.hintValue}>{hintStr}</Text>
                </View>
              )}

              {/* Input + button */}
              {!hardRoundOver && (
                <View style={g.inputRow}>
                  <TextInput
                    style={g.input}
                    placeholder="Type country name..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={inputText}
                    onChangeText={setInputText}
                    autoCapitalize="words"
                    autoCorrect={false}
                    spellCheck={false}
                    returnKeyType="done"
                    onSubmitEditing={handleHardGuess}
                  />
                  <Pressable
                    style={({ pressed }) => [g.guessBtn, pressed && { opacity: 0.82 }]}
                    onPress={handleHardGuess}
                  >
                    <Text style={g.guessBtnText}>Guess</Text>
                  </Pressable>
                </View>
              )}

              {/* Reveal answer on failure */}
              {hardRoundOver && phase === "answered_wrong" && (
                <View style={g.revealRow}>
                  <Text style={g.revealLabel}>The answer was </Text>
                  <Text style={g.revealAnswer}>{currentQ.correct.name}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Fun fact panel ── */}
          {isAnswered && (
            <Animated.View
              style={[
                g.factPanel,
                { transform: [{ translateY: factSlideAnim }], opacity: factOpacityAnim },
                phase === "answered_correct" ? g.factPanelCorrect : g.factPanelWrong,
              ]}
            >
              <Text style={[g.factHeader, phase === "answered_correct" && g.factHeaderCorrect]}>
                {phase === "answered_correct"
                  ? "\u2728 Correct! Fun Fact about " + currentQ.correct.name
                  : "\uD83D\uDCA1 Fun Fact about " + currentQ.correct.name}
              </Text>
              <Text style={g.factText}>{currentQ.correct.funFact}</Text>
            </Animated.View>
          )}

          {/* Next button */}
          {isAnswered && (
            <Pressable
              style={({ pressed }) => [g.nextBtn, pressed && { opacity: 0.88 }]}
              onPress={advance}
            >
              <Text style={g.nextBtnText}>
                {phase === "answered_correct" ? "\u2B50 Great! " : ""}
                {questionIndex + 1 < TOTAL_QUESTIONS ? "Next Question \u2192" : "See Results \uD83C\uDFC6"}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────

  if (phase === "results") {
    const multiplier = difficulty === "hard" ? HARD_MULTIPLIER : 1;
    const finalScore = score * multiplier;
    const pct = Math.round((score / TOTAL_QUESTIONS) * 100);
    const stars = pct >= 80 ? 3 : pct >= 50 ? 2 : 1;

    let medal = "\uD83C\uDFC6";
    let headline = "Outstanding!";
    let subline = "You know your shapes!";
    if (score <= 3) { medal = "\uD83C\uDF0D"; headline = "Keep Exploring!"; subline = "Every quiz makes you smarter."; }
    else if (score <= 6) { medal = "\uD83C\uDFC5"; headline = "Well Done!"; subline = "You know your countries!"; }
    else if (score <= 8) { medal = "\uD83E\uDD47"; headline = "Brilliant!"; subline = "Almost a perfect score!"; }

    return (
      <LinearGradient colors={["#1C1917", "#292524", "#44403C"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[r.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 36 }]}
          showsVerticalScrollIndicator={false}
        >
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

          <View style={r.hero}>
            <Animated.View style={{ transform: [{ scale: trophyAnim }] }}>
              <Text style={r.medal}>{medal}</Text>
            </Animated.View>
            <Text style={r.headline}>{headline}</Text>
            <Text style={r.subline}>{subline}</Text>
            {difficulty === "hard" && (
              <View style={r.hardBadge}>
                <Text style={r.hardBadgeText}>{"\uD83E\uDDE0"} Hard Mode {"\u2014"} {HARD_MULTIPLIER}x Multiplier</Text>
              </View>
            )}
          </View>

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
                <Text style={r.scoreNum}>{finalScore}</Text>
                <Text style={r.scoreLabel}>{difficulty === "hard" ? `Stars (\u00D7${multiplier})` : "Stars"}</Text>
              </View>
            </View>
            <View style={r.barTrack}>
              <View style={[r.barFill, { width: `${pct}%` }]} />
            </View>
            <Text style={r.timeText}>{"\u23F1"} Finished in {formatTime(elapsed)}</Text>
          </View>

          {/* Star rating */}
          <View style={r.starsRow}>
            {[1, 2, 3].map((s) => (
              <Text key={s} style={[r.star, s <= stars && r.starFilled]}>
                {s <= stars ? "\u2B50" : "\u2606"}
              </Text>
            ))}
          </View>

          <View style={r.xpNote}>
            <Text style={r.xpText}>
              {difficulty === "hard"
                ? `\uD83E\uDDE0 Hard mode \u2014 ${finalScore} / ${TOTAL_QUESTIONS * multiplier} stars`
                : `\u2B50 Easy mode \u2014 ${finalScore} / ${TOTAL_QUESTIONS} stars`}
              {"  \u2022  XP coming soon"}
            </Text>
          </View>

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
              style={({ pressed }) => [r.btnSecondary, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPhase("mode_select");
              }}
            >
              <Text style={r.btnSecondaryTxt}>Change Mode</Text>
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

const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF7ED" },
  header: {
    backgroundColor: "#C2410C",
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
  toggleRow: { flexDirection: "row", gap: 10 },
  diffCard: {
    flex: 1, borderRadius: 14, padding: 14, borderWidth: 2,
    alignItems: "center", position: "relative",
  },
  diffEasy: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  diffEasyOn: { backgroundColor: "#FEF3C7", borderColor: "#D97706" },
  diffHard: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  diffHardOn: { backgroundColor: "#DBEAFE", borderColor: "#2563EB" },
  diffIcon: { fontSize: 28, marginBottom: 6 },
  diffTitle: { fontFamily: F.bold, fontSize: 16, marginBottom: 4 },
  diffHint: { fontFamily: F.medium, fontSize: 11, textAlign: "center", lineHeight: 16 },
  diffCheck: {
    position: "absolute", top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  diffCheckText: { fontFamily: F.bold, fontSize: 11, color: "#fff" },
  howCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#FDE68A", gap: 12,
  },
  howRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  howDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  howText: { fontFamily: F.medium, fontSize: 13, color: "#374151", flex: 1, lineHeight: 19 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 4 },
  statBox: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14,
    alignItems: "center", borderWidth: 1, borderColor: "#FDE68A",
  },
  statNum: { fontFamily: F.bold, fontSize: 22, color: "#C2410C" },
  statLabel: { fontFamily: F.medium, fontSize: 11, color: "#6B7280", marginTop: 2 },
  cta: {
    marginTop: 20, backgroundColor: "#C2410C", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  ctaText: { fontFamily: F.bold, fontSize: 16, color: "#fff" },
});

const g = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1C1410" },
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
  timerText: { fontFamily: F.bold, fontSize: 13, color: "#FED7AA" },
  scoreBadge: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  scoreText: { fontFamily: F.bold, fontSize: 13, color: "#FDE68A" },
  progressTrack: {
    height: 5, backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 16, borderRadius: 3, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: ROAMUS_ORANGE, borderRadius: 3 },
  progressLabel: {
    fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,0.45)",
    textAlign: "center", marginTop: 6, marginBottom: 2,
  },
  hardBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(37,99,235,0.2)", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 2,
    borderWidth: 1, borderColor: "rgba(37,99,235,0.4)",
  },
  hardBadgeText: { fontFamily: F.bold, fontSize: 11, color: "#93C5FD", letterSpacing: 0.5 },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  prompt: {
    fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.5)",
    textAlign: "center", marginBottom: 4, letterSpacing: 0.3,
  },
  // Easy name grid
  nameGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 16 },
  nameBtn: {
    width: "47.5%", borderRadius: 14, borderWidth: 2,
    paddingVertical: 14, paddingHorizontal: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    minHeight: 58,
  },
  nameBtnIcon: { fontFamily: F.bold, fontSize: 14, color: "#A7F3D0" },
  nameBtnText: {
    fontFamily: F.bold, fontSize: 14, color: "#fff",
    textAlign: "center", flexShrink: 1,
  },
  // Hard mode
  hardSection: { marginTop: 10, marginBottom: 8 },
  attemptRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginBottom: 12,
  },
  attemptDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  attemptDotOk: { backgroundColor: "rgba(255,255,255,0.25)" },
  attemptDotWrong: { backgroundColor: "#EF4444" },
  attemptLabel: { fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 4 },
  hintRow: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap",
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 10,
    padding: 10, marginBottom: 10,
  },
  hintLabel: { fontFamily: F.bold, fontSize: 13, color: "#FDE68A" },
  hintValue: {
    fontFamily: F.bold, fontSize: 17, color: "#fff",
    letterSpacing: 3, flexShrink: 1,
  },
  inputRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: F.medium, fontSize: 15, color: "#fff",
  },
  guessBtn: {
    backgroundColor: ROAMUS_ORANGE, borderRadius: 12,
    paddingHorizontal: 18, justifyContent: "center", alignItems: "center",
  },
  guessBtnText: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  revealRow: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap",
    backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 10,
    padding: 10, marginBottom: 8,
  },
  revealLabel: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  revealAnswer: { fontFamily: F.bold, fontSize: 15, color: "#FCA5A5" },
  // Fact panel
  factPanel: {
    borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1,
  },
  factPanelCorrect: {
    backgroundColor: "rgba(6,95,70,0.5)", borderColor: "#059669",
  },
  factPanelWrong: {
    backgroundColor: "rgba(127,29,29,0.4)", borderColor: "#DC2626",
  },
  factHeader: { fontFamily: F.bold, fontSize: 13, color: "#FDE68A", marginBottom: 8, lineHeight: 18 },
  factHeaderCorrect: { color: "#6EE7B7" },
  factText: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 19 },
  nextBtn: {
    backgroundColor: ROAMUS_ORANGE, borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
    borderWidth: 1, borderColor: "#C4561E",
  },
  nextBtnText: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
});

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
  subline: { fontFamily: F.medium, fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 8 },
  hardBadge: {
    backgroundColor: "rgba(37,99,235,0.25)", borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(37,99,235,0.4)",
  },
  hardBadgeText: { fontFamily: F.bold, fontSize: 12, color: "#93C5FD" },
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
  barFill: { height: "100%", backgroundColor: ROAMUS_ORANGE, borderRadius: 4 },
  timeText: { fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.55)", textAlign: "center" },
  starsRow: {
    flexDirection: "row", gap: 8, marginBottom: 16, justifyContent: "center",
  },
  star: { fontSize: 32, opacity: 0.25 },
  starFilled: { opacity: 1 },
  xpNote: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20,
  },
  xpText: { fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.55)" },
  actions: { width: "100%", gap: 10 },
  btnPrimary: {
    backgroundColor: ROAMUS_ORANGE, borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
  },
  btnPrimaryTxt: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  btnSecondary: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  btnSecondaryTxt: { fontFamily: F.bold, fontSize: 14, color: "#fff" },
  btnGhost: {
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 14, paddingVertical: 14, alignItems: "center",
  },
  btnGhostTxt: { fontFamily: F.bold, fontSize: 14, color: "rgba(255,255,255,0.8)" },
});
