import AsyncStorage from "@react-native-async-storage/async-storage";
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
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/lib/apiClient";
import { useKids } from "@/lib/kidsContext";
import { F } from "@/lib/tokens";
import {
  getCategoriesForTrip,
  getDestinationWords,
  HANGMAN_WORDS,
  type HangmanWord,
} from "@/constants/hangmanWords";

type GameState = "mode_select" | "playing" | "won" | "lost";

const MAX_WRONG: Record<"easy" | "hard", number> = { easy: 7, hard: 6 };

const KEYBOARD_ROWS = [
  ["A", "B", "C", "D", "E", "F", "G"],
  ["H", "I", "J", "K", "L", "M", "N"],
  ["O", "P", "Q", "R", "S", "T", "U"],
  ["V", "W", "X", "Y", "Z"],
];

const CATEGORY_EMOJI: Record<string, string> = {
  "Beach & Ocean": "\uD83C\uDF0A",
  "Mountains & Nature": "\uD83C\uDF32",
  "Desert & Southwest": "\uD83C\uDF35",
  "History & Landmarks": "\uD83C\uDFDB",
  "Theme Parks & Fun": "\uD83C\uDFA2",
  "Wildlife & Safari": "\uD83E\uDD81",
  "Big City": "\uD83C\uDFD9",
  "Road Trip": "\uD83D\uDE97",
  "Geography \u2014 World": "\uD83C\uDF0D",
  "Geography \u2014 Destination": "\uD83D\uDCCD",
};

function HangmanScaffold({
  wrongCount,
  isLose = false,
}: {
  wrongCount: number;
  isLose?: boolean;
}) {
  const figureColor = isLose ? "#FCA5A5" : "white";
  const structColor = isLose
    ? "rgba(255,255,255,0.2)"
    : "rgba(255,255,255,0.25)";
  const ropeColor = isLose
    ? "rgba(255,255,255,0.35)"
    : "rgba(255,255,255,0.25)";

  const show = (n: number) => wrongCount >= n;

  return (
    <Svg width={280} height={240} viewBox="0 0 160 190">
      <Rect x={10} y={178} width={140} height={6} rx={3} fill={structColor} />
      <Rect x={38} y={20} width={6} height={160} rx={3} fill={structColor} />
      <Rect x={38} y={20} width={80} height={6} rx={3} fill={structColor} />
      <Rect x={112} y={26} width={4} height={22} rx={2} fill={ropeColor} />
      {show(1) && (
        <Circle
          cx={114}
          cy={62}
          r={16}
          stroke={figureColor}
          strokeWidth={3.5}
          fill="none"
        />
      )}
      {show(2) && (
        <Line
          x1={114} y1={78} x2={114} y2={118}
          stroke={figureColor} strokeWidth={3.5} strokeLinecap="round"
        />
      )}
      {show(3) && (
        <Line
          x1={114} y1={88} x2={90} y2={108}
          stroke={figureColor} strokeWidth={3.5} strokeLinecap="round"
        />
      )}
      {show(4) && (
        <Line
          x1={114} y1={88} x2={138} y2={108}
          stroke={figureColor} strokeWidth={3.5} strokeLinecap="round"
        />
      )}
      {show(5) && (
        <Line
          x1={114} y1={118} x2={90} y2={145}
          stroke={figureColor} strokeWidth={3.5} strokeLinecap="round"
        />
      )}
      {show(6) && (
        <Line
          x1={114} y1={118} x2={138} y2={145}
          stroke={figureColor} strokeWidth={3.5} strokeLinecap="round"
        />
      )}
      {(show(7) || isLose) && (
        <>
          <Line x1={107} y1={55} x2={112} y2={60} stroke={figureColor} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={112} y1={55} x2={107} y2={60} stroke={figureColor} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={116} y1={55} x2={121} y2={60} stroke={figureColor} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={121} y1={55} x2={116} y2={60} stroke={figureColor} strokeWidth={2.5} strokeLinecap="round" />
          <Path
            d="M108 69 Q114 66 120 69"
            stroke={figureColor} strokeWidth={2} strokeLinecap="round" fill="none"
          />
        </>
      )}
    </Svg>
  );
}

export default function HangmanGame() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const { tripId, stopName } = kids;

  const [gameState, setGameState] = useState<GameState>("mode_select");
  const [difficulty, setDifficulty] = useState<"easy" | "hard">("easy");
  const [currentWord, setCurrentWord] = useState<HangmanWord | null>(null);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>([
    "Big City",
    "Road Trip",
    "Geography \u2014 World",
  ]);
  const [destWords, setDestWords] = useState<HangmanWord[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const bounceRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!tripId) {
      const cats = getCategoriesForTrip(stopName || "", [], []);
      setCategories(cats);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const res = await fetch(`${API_BASE}/api/travel/trips/${tripId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok || cancelled) return;
        const trip = await res.json();
        if (cancelled) return;
        const cityName: string = trip.destination || stopName || "";
        const stopTypes: string[] = (trip.stops ?? [])
          .map((s: { stopType?: string | null }) => s.stopType)
          .filter(Boolean) as string[];
        const cats = getCategoriesForTrip(cityName, stopTypes, []);
        setCategories(cats);
        const dWords = getDestinationWords({
          city: cityName,
          state: undefined,
          stops: (trip.stops ?? []).map((s: { name?: string }) => ({ name: s.name })),
        });
        setDestWords(dWords);
      } catch {
        const cats = getCategoriesForTrip(stopName || "", [], []);
        setCategories(cats);
      }
    })();
    return () => { cancelled = true; };
  }, [tripId, stopName]);

  useEffect(() => {
    if (gameState === "won") {
      bounceRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -12,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      bounceRef.current.start();
    } else {
      bounceRef.current?.stop();
      bounceAnim.setValue(0);
    }
  }, [gameState]);

  const wrongGuesses = currentWord
    ? [...guessedLetters].filter((l) => !currentWord.word.includes(l))
    : [];
  const maxWrong = MAX_WRONG[difficulty];
  const isWon = currentWord
    ? [...currentWord.word].every((l) => guessedLetters.has(l))
    : false;
  const isLost = wrongGuesses.length >= maxWrong;

  const startGame = useCallback(async () => {
    const storageKey = `hangman_seen_${tripId || "default"}`;
    let seenMap: Record<string, string[]> = {};
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      seenMap = raw ? JSON.parse(raw) : {};
    } catch {
      seenMap = {};
    }
    let seen: string[] = seenMap[difficulty] ?? [];

    const staticPool = HANGMAN_WORDS.filter(
      (w) =>
        w.difficulty === difficulty &&
        categories.some((c) => c === w.category)
    );
    const destPool = destWords.filter((w) => w.difficulty === difficulty);
    const wordSet = new Map<string, HangmanWord>();
    for (const w of staticPool) wordSet.set(w.word, w);
    for (const w of destPool) wordSet.set(w.word, w);
    const pool = [...wordSet.values()];

    let unseen = pool.filter((w) => !seen.includes(w.word));
    if (unseen.length === 0) {
      seen = [];
      unseen = pool;
    }

    if (unseen.length === 0) return;

    const pick = unseen[Math.floor(Math.random() * unseen.length)];
    const newSeenMap = { ...seenMap, [difficulty]: [...seen, pick.word] };
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newSeenMap));
    } catch {}

    setCurrentWord(pick);
    setGuessedLetters(new Set());
    setHintUsed(false);
    setShowHint(false);
    setGameState("playing");
  }, [difficulty, categories, destWords, tripId]);

  const guessLetter = useCallback(
    (letter: string) => {
      if (!currentWord || isWon || isLost) return;
      if (guessedLetters.has(letter)) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = new Set(guessedLetters);
      next.add(letter);
      setGuessedLetters(next);

      const nextWrong = currentWord.word.includes(letter)
        ? wrongGuesses.length
        : wrongGuesses.length + 1;
      const nextCorrectAll = [...currentWord.word].every((l) => next.has(l));

      if (nextCorrectAll) {
        setGameState("won");
      } else if (nextWrong >= maxWrong) {
        setGameState("lost");
      }
    },
    [currentWord, guessedLetters, isWon, isLost, wrongGuesses, maxWrong]
  );

  const resetToMenu = () => {
    setGameState("mode_select");
    setCurrentWord(null);
    setGuessedLetters(new Set());
  };

  if (gameState === "playing" && currentWord) {
    const wordLetters = [...currentWord.word];
    const livesTotal = maxWrong;
    const livesLost = wrongGuesses.length;

    return (
      <View style={[ps.root, { paddingTop: insets.top }]}>
        <View style={ps.header}>
          <Pressable
            style={ps.quitBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              resetToMenu();
            }}
          >
            <Text style={ps.quitText}>{"\u2190"} Quit</Text>
          </Pressable>
          <View style={ps.lives}>
            {Array.from({ length: livesTotal }).map((_, i) => (
              <View
                key={i}
                style={[
                  ps.lifeDot,
                  i < livesTotal - livesLost ? ps.dotAlive : ps.dotLost,
                ]}
              />
            ))}
          </View>
        </View>

        {difficulty === "easy" && (
          <Text style={ps.catHint}>
            {"This word is about: "}
            <Text style={ps.catHintVal}>
              {CATEGORY_EMOJI[currentWord.category] ?? ""}{" "}
              {currentWord.category}
            </Text>
          </Text>
        )}

        <View style={ps.scaffoldWrap}>
          <HangmanScaffold wrongCount={wrongGuesses.length} />
        </View>

        <View style={ps.wordRow}>
          {wordLetters.map((letter, i) => (
            <View key={i} style={ps.blank}>
              <Text style={ps.blankLetter}>
                {guessedLetters.has(letter) ? letter : ""}
              </Text>
              <View
                style={[
                  ps.blankLine,
                  guessedLetters.has(letter) && ps.blankLineFilled,
                ]}
              />
            </View>
          ))}
        </View>

        <View style={ps.wrongRow}>
          {wrongGuesses.map((l) => (
            <View key={l} style={ps.wrongChip}>
              <Text style={ps.wrongChipText}>{l}</Text>
            </View>
          ))}
        </View>

        {showHint && currentWord.hint ? (
          <View style={ps.hintCard}>
            <Text style={ps.hintCardText}>{"\uD83D\uDCA1"} {currentWord.hint}</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            ps.hintBtn,
            wrongGuesses.length >= 3 && !hintUsed && ps.hintBtnActive,
            hintUsed && ps.hintBtnUsed,
          ]}
          onPress={() => {
            if (hintUsed) return;
            if (wrongGuesses.length < 3) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setHintUsed(true);
            setShowHint(true);
          }}
        >
          <Text style={[
            ps.hintBtnText,
            wrongGuesses.length >= 3 && !hintUsed && ps.hintBtnTextActive,
          ]}>
            {hintUsed
              ? "\uD83D\uDCA1 Hint shown"
              : wrongGuesses.length >= 3
              ? "\uD83D\uDCA1 Show hint"
              : "\uD83D\uDCA1 Hint unlocks after 3 wrong"}
          </Text>
        </Pressable>

        <View style={ps.keyboard}>
          {KEYBOARD_ROWS.map((row, ri) => (
            <View key={ri} style={ps.keyRow}>
              {row.map((letter) => {
                const isGuessed = guessedLetters.has(letter);
                const isCorrect =
                  isGuessed && currentWord.word.includes(letter);
                const isWrong = isGuessed && !currentWord.word.includes(letter);
                return (
                  <Pressable
                    key={letter}
                    disabled={isGuessed}
                    onPress={() => guessLetter(letter)}
                    style={({ pressed }) => [
                      ps.key,
                      isCorrect && ps.keyCorrect,
                      isWrong && ps.keyWrong,
                      isGuessed && ps.keyUsed,
                      !isGuessed && pressed && ps.keyPressed,
                    ]}
                  >
                    <Text
                      style={[
                        ps.keyText,
                        isCorrect && ps.keyTextCorrect,
                        isWrong && ps.keyTextWrong,
                      ]}
                    >
                      {letter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (gameState === "won" && currentWord) {
    return (
      <LinearGradient
        colors={["#064E3B", "#065F46", "#047857"]}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            ws.container,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={ws.closeRow}>
            <Pressable
              style={ws.closeBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/kids/games" as never);
              }}
            >
              <Text style={ws.closeTxt}>Done</Text>
            </Pressable>
          </View>

          <View style={ws.heroBlock}>
            <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
              <Text style={ws.confetti}>{"\uD83C\uDF89"}</Text>
            </Animated.View>
            <Text style={ws.headline}>You got it!</Text>
            <Text style={ws.wordReveal}>{currentWord.word}</Text>
            <Text style={ws.wordLabel}>The word was</Text>
            <View style={ws.xpBadge}>
              <Text style={ws.xpText}>
                {"\u2B50"}{" "}
                <Text style={ws.xpVal}>+10 XP</Text>
                {"  coming soon"}
              </Text>
            </View>
          </View>

          <View style={ws.teachCard}>
            <Text style={ws.teachLabel}>What it means</Text>
            <Text style={ws.teachText}>{currentWord.definition}</Text>
            <View style={ws.divider} />
            <Text style={ws.teachLabel}>In a sentence</Text>
            <Text style={ws.teachText}>
              {'"'}{currentWord.usageExample}{'"'}
            </Text>
            <View style={ws.divider} />
            <Text style={ws.teachLabel}>How to say it</Text>
            <Text style={ws.teachPronounce}>{currentWord.pronunciation}</Text>
          </View>

          <View style={ws.actions}>
            <Pressable
              style={({ pressed }) => [
                ws.btnPrimary,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                startGame();
              }}
            >
              <Text style={ws.btnPrimaryTxt}>Play Again</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                ws.btnSecondary,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/kids/games" as never);
              }}
            >
              <Text style={ws.btnSecondaryTxt}>Back to Games</Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (gameState === "lost" && currentWord) {
    return (
      <LinearGradient
        colors={["#1C0A0A", "#2D1515", "#3D1A1A"]}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            ls.container,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={ls.closeRow}>
            <Pressable
              style={ls.closeBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/kids/games" as never);
              }}
            >
              <Text style={ls.closeTxt}>Done</Text>
            </Pressable>
          </View>

          <View style={ls.scaffoldWrap}>
            <HangmanScaffold wrongCount={maxWrong} isLose />
          </View>

          <View style={ls.heroBlock}>
            <Text style={ls.oh}>Almost there!</Text>
            <Text style={ls.wordLabel}>The word was</Text>
            <Text style={ls.wordReveal}>{currentWord.word}</Text>
          </View>

          <View style={ls.teachCard}>
            <Text style={ls.teachLabel}>What it means</Text>
            <Text style={ls.teachText}>{currentWord.definition}</Text>
            <View style={ls.divider} />
            <Text style={ls.teachLabel}>In a sentence</Text>
            <Text style={ls.teachText}>
              {'"'}{currentWord.usageExample}{'"'}
            </Text>
            <View style={ls.divider} />
            <Text style={ls.teachLabel}>How to say it</Text>
            <Text style={ls.teachPronounce}>{currentWord.pronunciation}</Text>
          </View>

          <View style={ls.actions}>
            <Pressable
              style={({ pressed }) => [
                ls.btnPrimary,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                startGame();
              }}
            >
              <Text style={ls.btnPrimaryTxt}>Try Again</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                ls.btnSecondary,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/kids/games" as never);
              }}
            >
              <Text style={ls.btnSecondaryTxt}>Back to Games</Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  const activeCats = categories.filter((c) => c !== "Geography \u2014 Destination");

  return (
    <View style={ms.root}>
      <View style={[ms.header, { paddingTop: insets.top + 16 }]}>
        <View style={ms.circle1} />
        <View style={ms.circle2} />
        <Pressable
          style={ms.back}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Text style={ms.backText}>{"\u2190"} Travel Games</Text>
        </Pressable>
        <Text style={ms.eyebrow}>WORD GAME</Text>
        <Text style={ms.title}>Hangman</Text>
        <Text style={ms.sub}>Guess the word before the figure appears</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          ms.body,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        <Text style={ms.sectionLabel}>Pick your challenge</Text>
        <View style={ms.diffRow}>
          <Pressable
            style={[
              ms.diffCard,
              ms.diffEasy,
              difficulty === "easy" && ms.diffEasySelected,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDifficulty("easy");
            }}
          >
            <Text style={ms.diffIcon}>{"\uD83C\uDF31"}</Text>
            <Text style={[ms.diffTitle, ms.diffTitleEasy]}>Easy</Text>
            <Text style={[ms.diffHint, ms.diffHintEasy]}>
              Short words{"\u00B7"} 7 guesses
            </Text>
            {difficulty === "easy" && (
              <View style={ms.diffCheck}>
                <Text style={ms.diffCheckText}>{"\u2713"}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={[
              ms.diffCard,
              ms.diffHard,
              difficulty === "hard" && ms.diffHardSelected,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDifficulty("hard");
            }}
          >
            <Text style={ms.diffIcon}>{"\uD83D\uDD25"}</Text>
            <Text style={[ms.diffTitle, ms.diffTitleHard]}>Hard</Text>
            <Text style={[ms.diffHint, ms.diffHintHard]}>
              Long words{"\u00B7"} 6 guesses
            </Text>
            {difficulty === "hard" && (
              <View style={[ms.diffCheck, ms.diffCheckHard]}>
                <Text style={ms.diffCheckText}>{"\u2713"}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Text style={ms.sectionLabel}>{"Today's categories"}</Text>
        <View style={ms.catCard}>
          <Text style={ms.catCardLabel}>
            {"Based on your trip to "}
            {stopName || "your destination"}
          </Text>
          <View style={ms.catChips}>
            {activeCats.map((cat) => (
              <View key={cat} style={ms.catChip}>
                <Text style={ms.catChipText}>
                  {CATEGORY_EMOJI[cat] ?? ""} {cat}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            ms.playCta,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            startGame();
          }}
        >
          <Text style={ms.playCtaText}>{"\u25B6"} {"  "}{"Let's Play"}</Text>
        </Pressable>

        <Text style={ms.footNote}>
          {"Words are based on where you're headed "}
          {"\uD83D\uDCCD"}
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Playing styles ───────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1A0F2E" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 12,
  },
  quitBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quitText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.7)" },
  lives: { flexDirection: "row", gap: 4, alignItems: "center" },
  lifeDot: { width: 10, height: 10, borderRadius: 5 },
  dotAlive: { backgroundColor: "#16A34A" },
  dotLost: { backgroundColor: "#DC2626" },
  catHint: {
    textAlign: "center",
    fontFamily: F.bold,
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  catHintVal: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: F.bold,
    fontSize: 12,
  },
  scaffoldWrap: { alignItems: "center", paddingVertical: 8 },
  wordRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  blank: { alignItems: "center", gap: 6, minWidth: 26 },
  blankLetter: {
    fontFamily: F.bold,
    fontSize: 22,
    color: "#6EE7B7",
    minHeight: 28,
    textAlign: "center",
  },
  blankLine: {
    width: 32,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 2,
  },
  blankLineFilled: { backgroundColor: "#E8692A" },
  wrongRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 24,
    paddingBottom: 10,
    minHeight: 36,
  },
  wrongChip: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "rgba(220,38,38,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  wrongChipText: { fontFamily: F.bold, fontSize: 13, color: "#DC2626" },
  keyboard: { paddingHorizontal: 12, width: "100%", paddingBottom: 32, gap: 5, marginTop: 12 },
  keyRow: { flexDirection: "row", gap: 4, justifyContent: "center", width: "100%" },
  key: {
    flex: 1,
    maxWidth: 48,
    minWidth: 40,
    height: 52,
    margin: 3,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  keyCorrect: { backgroundColor: "#16A34A" },
  keyWrong: { backgroundColor: "rgba(220,38,38,0.3)" },
  keyUsed: { opacity: 0.35 },
  keyPressed: { backgroundColor: "rgba(255,255,255,0.22)" },
  keyText: { fontFamily: F.bold, fontSize: 13, color: "white" },
  keyTextCorrect: { color: "white" },
  keyTextWrong: { color: "rgba(255,255,255,0.4)" },
  hintBtn: {
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 8,
  },
  hintBtnActive: {
    borderColor: "#F97316",
    backgroundColor: "rgba(249,115,22,0.1)",
  },
  hintBtnUsed: {
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "transparent",
    opacity: 0.5,
  },
  hintBtnText: {
    fontFamily: F.medium,
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
  },
  hintBtnTextActive: {
    color: "#F97316",
  },
  hintCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: "rgba(251,191,36,0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hintCardText: {
    fontFamily: F.medium,
    fontSize: 14,
    color: "#FCD34D",
    textAlign: "center",
    lineHeight: 20,
  },
});

// ─── Win styles ───────────────────────────────────────────────────────────────
const ws = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  closeRow: { alignItems: "flex-end", marginBottom: 16 },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  closeTxt: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  heroBlock: { alignItems: "center", paddingBottom: 8 },
  confetti: { fontSize: 48, marginBottom: 12 },
  headline: {
    fontFamily: F.serif,
    fontSize: 40,
    color: "white",
    lineHeight: 44,
    marginBottom: 8,
  },
  wordReveal: {
    fontFamily: F.bold,
    fontSize: 32,
    letterSpacing: 8,
    color: "#6EE7B7",
    marginBottom: 4,
  },
  wordLabel: {
    fontFamily: F.bold,
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  xpBadge: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  xpText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  xpVal: { color: "#FCD34D" },
  teachCard: {
    marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 20,
    gap: 0,
  },
  teachLabel: {
    fontFamily: F.bold,
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  teachText: {
    fontFamily: F.medium,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 14,
  },
  teachPronounce: {
    fontFamily: F.bold,
    fontSize: 18,
    color: "white",
    letterSpacing: 3,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#E8692A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#E8692A",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  btnPrimaryTxt: { fontFamily: F.bold, fontSize: 15, color: "white" },
  btnSecondary: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnSecondaryTxt: { fontFamily: F.bold, fontSize: 15, color: "white" },
});

// ─── Lose styles ──────────────────────────────────────────────────────────────
const ls = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  closeRow: { alignItems: "flex-end", marginBottom: 8 },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  closeTxt: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.7)" },
  scaffoldWrap: { alignItems: "center", paddingBottom: 8 },
  heroBlock: { alignItems: "center", paddingBottom: 12 },
  oh: {
    fontFamily: F.bold,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  wordLabel: {
    fontFamily: F.medium,
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 6,
  },
  wordReveal: {
    fontFamily: F.bold,
    fontSize: 34,
    letterSpacing: 6,
    color: "white",
  },
  teachCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 20,
  },
  teachLabel: {
    fontFamily: F.bold,
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  teachText: {
    fontFamily: F.medium,
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 14,
  },
  teachPronounce: {
    fontFamily: F.bold,
    fontSize: 18,
    color: "white",
    letterSpacing: 3,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#E8692A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#E8692A",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  btnPrimaryTxt: { fontFamily: F.bold, fontSize: 15, color: "white" },
  btnSecondary: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnSecondaryTxt: {
    fontFamily: F.bold,
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
  },
});

// ─── Mode select styles ───────────────────────────────────────────────────────
const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF8F0" },
  header: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 24,
    paddingBottom: 28,
    overflow: "hidden",
    position: "relative",
  },
  circle1: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  circle2: {
    position: "absolute",
    bottom: -40,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  back: { marginBottom: 16 },
  backText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.7)" },
  eyebrow: {
    fontFamily: F.bold,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontFamily: F.serif,
    fontSize: 36,
    color: "white",
    lineHeight: 40,
    marginBottom: 6,
  },
  sub: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  body: { padding: 20, gap: 16 },
  sectionLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    color: "#78716C",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: -8,
  },
  diffRow: { flexDirection: "row", gap: 10 },
  diffCard: {
    flex: 1,
    borderRadius: 18,
    padding: 20,
    borderWidth: 2.5,
    position: "relative",
    overflow: "hidden",
  },
  diffEasy: { backgroundColor: "#ECFDF5", borderColor: "#D1FAE5" },
  diffEasySelected: { borderColor: "#16A34A", backgroundColor: "#DCFCE7" },
  diffHard: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  diffHardSelected: { borderColor: "#D97706", backgroundColor: "#FEF9C3" },
  diffIcon: { fontSize: 32, marginBottom: 10 },
  diffTitle: { fontFamily: F.bold, fontSize: 16, marginBottom: 4 },
  diffTitleEasy: { color: "#065F46" },
  diffTitleHard: { color: "#78350F" },
  diffHint: { fontFamily: F.medium, fontSize: 11, lineHeight: 16, opacity: 0.7 },
  diffHintEasy: { color: "#065F46" },
  diffHintHard: { color: "#92400E" },
  diffCheck: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  diffCheckHard: { backgroundColor: "#D97706" },
  diffCheckText: { fontFamily: F.bold, fontSize: 12, color: "white" },
  catCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.06)",
  },
  catCardLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    color: "#78716C",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  catChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  catChip: {
    backgroundColor: "#F0EBFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  catChipText: { fontFamily: F.bold, fontSize: 11, color: "#5B21B6" },
  playCta: {
    backgroundColor: "#E8692A",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#E8692A",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  playCtaText: { fontFamily: F.bold, fontSize: 17, color: "white" },
  footNote: {
    textAlign: "center",
    fontFamily: F.medium,
    fontSize: 12,
    color: "#78716C",
  },
});
