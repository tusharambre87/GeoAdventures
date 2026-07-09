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
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKids } from "@/lib/kidsContext";
import { F } from "@/lib/tokens";
import {
  ADVENTURES,
  makeCompassOptions,
  calculateXP,
  type Adventure,
  type QuestStep,
  type CompassDirection,
  type AdventureProgress,
} from "@/constants/compassQuestData";

// ─── Types ────────────────────────────────────────────────────────────────────

type GamePhase =
  | "adventure_select"
  | "story_intro"
  | "story_beat"
  | "city_guess"
  | "city_result"
  | "compass_guess"
  | "compass_result"
  | "step_fact"
  | "adventure_complete";

// ─── Compass Rose ─────────────────────────────────────────────────────────────

const DIRECTIONS_8 = [
  { label: "N", degrees: 0 },
  { label: "NE", degrees: 45 },
  { label: "E", degrees: 90 },
  { label: "SE", degrees: 135 },
  { label: "S", degrees: 180 },
  { label: "SW", degrees: 225 },
  { label: "W", degrees: 270 },
  { label: "NW", degrees: 315 },
];

function CompassRose({ needleDeg, size = 160 }: { needleDeg: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const needleLen = r - 8;
  const rad = ((needleDeg - 90) * Math.PI) / 180;
  const nx = cx + needleLen * Math.cos(rad);
  const ny = cy + needleLen * Math.sin(rad);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer ring */}
      <Circle cx={cx} cy={cy} r={r} fill="#1E293B" stroke="#475569" strokeWidth={2} />
      <Circle cx={cx} cy={cy} r={r - 12} fill="none" stroke="#334155" strokeWidth={1} />

      {/* Tick marks and labels */}
      {DIRECTIONS_8.map((d) => {
        const ang = ((d.degrees - 90) * Math.PI) / 180;
        const isCardinal = d.label.length === 1;
        const innerR = isCardinal ? r - 20 : r - 18;
        const outerR = r - 4;
        const lx = cx + (r - 28) * Math.cos(ang);
        const ly = cy + (r - 28) * Math.sin(ang);
        return (
          <React.Fragment key={d.label}>
            <Line
              x1={cx + outerR * Math.cos(ang)} y1={cy + outerR * Math.sin(ang)}
              x2={cx + innerR * Math.cos(ang)} y2={cy + innerR * Math.sin(ang)}
              stroke={isCardinal ? "#E2E8F0" : "#64748B"} strokeWidth={isCardinal ? 2 : 1}
            />
            <SvgText
              x={lx} y={ly + 4}
              textAnchor="middle" fontSize={isCardinal ? 10 : 8}
              fill={d.label === "N" ? "#F97316" : "#CBD5E1"}
              fontWeight={isCardinal ? "bold" : "normal"}
            >
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* Needle */}
      <Line
        x1={cx} y1={cy}
        x2={nx} y2={ny}
        stroke="#F97316" strokeWidth={3} strokeLinecap="round"
      />
      {/* Needle tail */}
      <Line
        x1={cx} y1={cy}
        x2={cx + 14 * Math.cos(rad + Math.PI)}
        y2={cy + 14 * Math.sin(rad + Math.PI)}
        stroke="#475569" strokeWidth={2} strokeLinecap="round"
      />
      {/* Center dot */}
      <Circle cx={cx} cy={cy} r={4} fill="#F97316" />
    </Svg>
  );
}

// ─── Storage helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY = "compass_quest_v1";

async function loadAllProgress(explorerId: string): Promise<Record<string, AdventureProgress>> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY}_${explorerId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveProgressToStorage(
  progress: AdventureProgress, explorerId: string
): Promise<void> {
  try {
    const all = await loadAllProgress(explorerId);
    all[progress.adventureId] = progress;
    await AsyncStorage.setItem(`${STORAGE_KEY}_${explorerId}`, JSON.stringify(all));
  } catch {}
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CompassQuestGame() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const { ageBand, explorerId, kidName, tripId } = kids;
  const effectiveExplorerId = explorerId || tripId || "anon";

  const [phase, setPhase] = useState<GamePhase>("adventure_select");
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [compassOptions, setCompassOptions] = useState<CompassDirection[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedDir, setSelectedDir] = useState<CompassDirection | null>(null);
  const [cityCorrect, setCityCorrect] = useState<boolean | null>(null);
  const [compassCorrect, setCompassCorrect] = useState<boolean | null>(null);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [fragmentsCollected, setFragmentsCollected] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [allProgress, setAllProgress] = useState<Record<string, AdventureProgress>>({});
  const [needleAnim] = useState(new Animated.Value(0));
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadAllProgress(effectiveExplorerId).then(setAllProgress);
    return () => { if (resultTimer.current) clearTimeout(resultTimer.current); };
  }, [effectiveExplorerId]);

  // ── Age gate — redirect 'young' kids back to games ───────────────────────────
  useEffect(() => {
    if (ageBand === "young") {
      router.replace("/kids/games" as never);
    }
  }, [ageBand]);

  if (ageBand === "young") return null;

  const startAdventure = useCallback((adv: Adventure) => {
    const steps = adv.steps ?? [];
    if (steps.length === 0) return; // stub / coming-soon

    const existing = allProgress[adv.id];
    let currentStep = 0;
    let fragments: string[] = [];
    let wrong = 0;

    if (existing && !existing.completed) {
      currentStep = existing.currentStep;
      fragments = existing.fragmentsCollected ?? [];
      wrong = existing.wrongGuesses ?? 0;
    }

    setAdventure(adv);
    setStepIdx(currentStep);
    setFragmentsCollected(fragments);
    setWrongGuesses(wrong);
    setStartTime(Date.now());

    const step = steps[currentStep];
    if (step && step.storyBeat && currentStep === 0) {
      setPhase("story_intro");
    } else if (step && step.storyBeat) {
      setPhase("story_beat");
    } else {
      prepareStep(adv, currentStep);
    }
  }, [allProgress]);

  const prepareStep = useCallback((adv: Adventure, idx: number) => {
    const step = adv.steps[idx];
    if (!step) return;
    const shuffledCities = [...step.cityOptions].sort(() => Math.random() - 0.5);
    setCityOptions(shuffledCities);
    setCompassOptions(makeCompassOptions(step.compassDirection));
    setSelectedCity(null);
    setSelectedDir(null);
    setCityCorrect(null);
    setCompassCorrect(null);
    setPhase("city_guess");
  }, []);

  const onStoryNext = useCallback(() => {
    if (!adventure) return;
    prepareStep(adventure, stepIdx);
  }, [adventure, stepIdx, prepareStep]);

  const onCityGuess = useCallback((city: string) => {
    if (!adventure) return;
    const step = adventure.steps[stepIdx];
    const correct = city === step.correctCity;
    Haptics.impactAsync(
      correct ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy
    );
    setSelectedCity(city);
    setCityCorrect(correct);
    if (!correct) setWrongGuesses((w) => w + 1);
    setPhase("city_result");

    resultTimer.current = setTimeout(() => {
      setPhase("compass_guess");
    }, 1400);
  }, [adventure, stepIdx]);

  const onCompassGuess = useCallback((dir: CompassDirection) => {
    if (!adventure) return;
    const step = adventure.steps[stepIdx];
    const correct = dir.label === step.compassDirection.label;
    Haptics.impactAsync(
      correct ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy
    );
    setSelectedDir(dir);
    setCompassCorrect(correct);
    if (!correct) setWrongGuesses((w) => w + 1);

    // Animate needle to correct direction
    const targetDeg = step.compassDirection.degrees;
    Animated.timing(needleAnim, {
      toValue: targetDeg,
      duration: 800,
      useNativeDriver: false,
    }).start();

    setPhase("compass_result");
    resultTimer.current = setTimeout(() => {
      setPhase("step_fact");
    }, 1400);
  }, [adventure, stepIdx, needleAnim]);

  const onNextStep = useCallback(async () => {
    if (!adventure) return;
    const step = adventure.steps[stepIdx];
    const newFragments = [...fragmentsCollected, step.fragmentEmoji];
    setFragmentsCollected(newFragments);

    const nextIdx = stepIdx + 1;
    const isLast = nextIdx >= adventure.steps.length;

    const progress: AdventureProgress = {
      adventureId: adventure.id,
      currentStep: isLast ? stepIdx : nextIdx,
      fragmentsCollected: newFragments,
      totalXpEarned: calculateXP(wrongGuesses, adventure.steps.length),
      wrongGuesses,
      completed: isLast,
      completedAt: isLast ? new Date().toISOString() : undefined,
      startedAt: new Date(startTime).toISOString(),
    };
    await saveProgressToStorage(progress, effectiveExplorerId);
    setAllProgress((prev) => ({ ...prev, [adventure.id]: progress }));

    if (isLast) {
      setPhase("adventure_complete");
      return;
    }

    setStepIdx(nextIdx);
    needleAnim.setValue(0);

    const nextStep = adventure.steps[nextIdx];
    if (nextStep.storyBeat) {
      setPhase("story_beat");
    } else {
      prepareStep(adventure, nextIdx);
    }
  }, [adventure, stepIdx, fragmentsCollected, wrongGuesses, startTime, effectiveExplorerId, needleAnim, prepareStep]);

  // ── ADVENTURE SELECT ─────────────────────────────────────────────────────────
  if (phase === "adventure_select") {
    const playable = ADVENTURES.filter((a) => (a.steps ?? []).length > 0);
    const comingSoon = ADVENTURES.filter((a) => (a.steps ?? []).length === 0);
    const featured = playable.find((a) => !a.locked) ?? playable[0];
    const rest = playable.filter((a) => a !== featured);

    return (
      <View style={s.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          {/* Header */}
          <LinearGradient
            colors={["#0F172A", "#1E3A5F", "#0F172A"]}
            style={[s.header, { paddingTop: insets.top + 16 }]}
          >
            <View style={s.circle1} />
            <View style={s.circle2} />
            <Pressable style={s.backRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
              <Text style={s.backText}>{"\u2190"} Back</Text>
            </Pressable>
            <Text style={s.hdrEye}>GEOGRAPHY ADVENTURE</Text>
            <Text style={s.hdrTitle}>Compass Quest</Text>
            <Text style={s.hdrSub}>
              {"\uD83E\uDDED"} Follow the clues. Collect the fragments.
            </Text>
          </LinearGradient>

          <View style={s.body}>
            {/* Featured adventure */}
            {featured && (
              <Pressable
                style={({ pressed }) => [s.featCard, pressed && { opacity: 0.9 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  startAdventure(featured);
                }}
              >
                <View style={s.featTop}>
                  <View style={s.featBadge}>
                    <Text style={s.featBadgeText}>
                      {allProgress[featured.id]?.completed
                        ? "\u2713 COMPLETED"
                        : allProgress[featured.id]
                        ? "IN PROGRESS"
                        : "START HERE"}
                    </Text>
                  </View>
                  <Text style={s.featIcon}>{featured.icon}</Text>
                </View>
                <Text style={s.featTitle}>{featured.title}</Text>
                <Text style={s.featSub}>{featured.subtitle}</Text>
                <Text style={s.featDesc} numberOfLines={2}>{featured.description}</Text>
                <View style={s.featMeta}>
                  <View style={s.featMetaPill}>
                    <Text style={s.featMetaText}>{featured.steps.length} stops</Text>
                  </View>
                  <View style={s.featMetaPill}>
                    <Text style={s.featMetaText}>{"\uD83C\uDF0D"} Global</Text>
                  </View>
                  <View style={s.featMetaPill}>
                    <Text style={s.featMetaText}>{"\u2B50"} {featured.steps.length * 10} XP</Text>
                  </View>
                </View>
                <View style={s.featBtn}>
                  <Text style={s.featBtnText}>
                    {allProgress[featured.id] && !allProgress[featured.id].completed
                      ? "Continue Adventure \u2192"
                      : "Start Adventure \u2192"}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Other playable adventures */}
            {rest.length > 0 && (
              <>
                <Text style={s.sectionLabel}>MORE ADVENTURES</Text>
                {rest.map((adv) => {
                  const prog = allProgress[adv.id];
                  const done = prog?.completed;
                  return (
                    <Pressable
                      key={adv.id}
                      style={({ pressed }) => [
                        s.advCard,
                        adv.locked && s.advCardLocked,
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={() => {
                        if (adv.locked) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        startAdventure(adv);
                      }}
                    >
                      <Text style={s.advIcon}>{adv.icon}</Text>
                      <View style={s.advInfo}>
                        <Text style={[s.advTitle, adv.locked && s.advTitleLocked]}>
                          {adv.title}
                        </Text>
                        <Text style={s.advSub} numberOfLines={1}>{adv.subtitle}</Text>
                      </View>
                      <View style={s.advRight}>
                        {done ? (
                          <Text style={s.advDone}>{"\u2713"}</Text>
                        ) : adv.locked ? (
                          <Text style={s.advLock}>{"\uD83D\uDD12"}</Text>
                        ) : (
                          <Text style={s.advArrow}>{"\u2192"}</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </>
            )}

            {/* Coming soon */}
            {comingSoon.length > 0 && (
              <>
                <Text style={s.sectionLabel}>COMING SOON</Text>
                <View style={s.comingSoonGrid}>
                  {comingSoon.slice(0, 6).map((adv) => (
                    <View key={adv.id} style={s.comingCard}>
                      <Text style={s.comingIcon}>{adv.icon}</Text>
                      <Text style={s.comingTitle} numberOfLines={1}>{adv.title}</Text>
                      <Text style={s.comingRegion} numberOfLines={1}>{adv.startCity}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!adventure) return null;
  const steps = adventure.steps;
  const step = steps[stepIdx] as QuestStep;
  const totalSteps = steps.length;

  // ── STORY INTRO ───────────────────────────────────────────────────────────────
  if (phase === "story_intro") {
    return (
      <View style={[s.root, { backgroundColor: "#0F172A" }]}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingTop: insets.top + 16, marginBottom: 20 }}>
            <Pressable onPress={() => setPhase("adventure_select")}>
              <Text style={[s.backText, { color: "#94A3B8" }]}>{"\u2190"} Adventures</Text>
            </Pressable>
          </View>

          <Text style={bs.adventureLabel}>{adventure.icon} {adventure.title}</Text>
          <Text style={bs.adventureSubtitle}>{adventure.subtitle}</Text>
          <View style={bs.divider} />
          {adventure.storyIntro ? (
            <Text style={bs.proseText}>{adventure.storyIntro}</Text>
          ) : (
            <Text style={bs.proseText}>{adventure.description}</Text>
          )}
          <Text style={bs.startCity}>
            {"\uD83D\uDCCD"} Starting in {adventure.startCity} {adventure.startCityEmoji}
          </Text>
          {adventure.startCityFunFact && (
            <View style={bs.funFactBox}>
              <Text style={bs.funFactText}>{adventure.startCityFunFact}</Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [bs.continueBtn, pressed && { opacity: 0.85 }]}
            onPress={onStoryNext}
          >
            <Text style={bs.continueBtnText}>Begin the Quest {"\u2192"}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── STORY BEAT ────────────────────────────────────────────────────────────────
  if (phase === "story_beat") {
    return (
      <View style={[s.root, { backgroundColor: "#0F172A" }]}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[bs.stepBar, { paddingTop: insets.top + 16 }]}>
            <Text style={bs.stepLabel}>Stop {stepIdx + 1} of {totalSteps}</Text>
            <View style={bs.progressRow}>
              {steps.map((_, i) => (
                <View
                  key={i}
                  style={[bs.progressDot, i < stepIdx && bs.progressDotDone, i === stepIdx && bs.progressDotActive]}
                />
              ))}
            </View>
          </View>
          <Text style={bs.proseText}>{step.storyBeat}</Text>
          <Pressable
            style={({ pressed }) => [bs.continueBtn, pressed && { opacity: 0.85 }]}
            onPress={onStoryNext}
          >
            <Text style={bs.continueBtnText}>Solve the Clue {"\u2192"}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── CITY GUESS ────────────────────────────────────────────────────────────────
  if (phase === "city_guess" || phase === "city_result") {
    const isResult = phase === "city_result";
    const clue = step;

    return (
      <View style={[s.root, { backgroundColor: "#0F172A" }]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[cg.topBar, { paddingTop: insets.top + 12 }]}>
            <Pressable onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPhase("adventure_select");
            }}>
              <Text style={cg.quitText}>{"\u2190"} Quit</Text>
            </Pressable>
            <View style={cg.progressRow}>
              {steps.map((_, i) => (
                <View key={i} style={[cg.dot, i < stepIdx && cg.dotDone, i === stepIdx && cg.dotActive]} />
              ))}
            </View>
            <View style={cg.xpBadge}>
              <Text style={cg.xpText}>{totalSteps * 10} XP</Text>
            </View>
          </View>

          {/* Clue card */}
          <View style={cg.clueCard}>
            <Text style={cg.clueLabel}>
              {clue.clueType === "landmark"
                ? "\uD83C\uDFDB\uFE0F Landmark Clue"
                : clue.clueType === "flag"
                ? "\uD83C\uDFF4 Flag Clue"
                : "\uD83D\uDCDC Text Clue"}
            </Text>

            {clue.clueType === "landmark" && clue.landmarkClue ? (
              <>
                <Text style={cg.landmarkName}>{clue.landmarkClue.name}</Text>
                <Text style={cg.landmarkDesc}>{clue.landmarkClue.description}</Text>
                <View style={cg.divider} />
              </>
            ) : clue.clueType === "flag" && clue.flagClue ? (
              <>
                <Text style={cg.flagHint}>{clue.flagClue.hint}</Text>
                <View style={cg.divider} />
              </>
            ) : null}

            <Text style={cg.clueText}>{clue.cityClue}</Text>
          </View>

          <Text style={cg.guessLabel}>Which city is this?</Text>

          {/* Options */}
          <View style={cg.optionsGrid}>
            {cityOptions.map((city) => {
              const isSelected = isResult && city === selectedCity;
              const isCorrect = isResult && city === step.correctCity;
              const isWrong = isSelected && !cityCorrect;
              return (
                <Pressable
                  key={city}
                  disabled={isResult}
                  style={[
                    cg.optBtn,
                    isCorrect && cg.optCorrect,
                    isWrong && cg.optWrong,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onCityGuess(city);
                  }}
                >
                  <Text style={[cg.optText, isCorrect && cg.optTextCorrect, isWrong && cg.optTextWrong]}>
                    {city}
                  </Text>
                  {isCorrect && <Text style={cg.optCheck}>{"\u2713"}</Text>}
                  {isWrong && <Text style={cg.optCheck}>{"\u2717"}</Text>}
                </Pressable>
              );
            })}
          </View>

          {isResult && !cityCorrect && (
            <View style={cg.correctHint}>
              <Text style={cg.correctHintText}>
                The answer was {step.correctCity} {"\u2014"} continuing...
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── COMPASS GUESS ──────────────────────────────────────────────────────────────
  if (phase === "compass_guess" || phase === "compass_result") {
    const isResult = phase === "compass_result";
    const needleDeg = isResult ? step.compassDirection.degrees : 0;

    return (
      <View style={[s.root, { backgroundColor: "#0F172A" }]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[cg.topBar, { paddingTop: insets.top + 12 }]}>
            <Pressable onPress={() => setPhase("adventure_select")}>
              <Text style={cg.quitText}>{"\u2190"} Quit</Text>
            </Pressable>
            <View style={cg.progressRow}>
              {steps.map((_, i) => (
                <View key={i} style={[cg.dot, i < stepIdx && cg.dotDone, i === stepIdx && cg.dotActive]} />
              ))}
            </View>
            <View style={cg.xpBadge}>
              <Text style={cg.xpText}>{step.fragmentEmoji}</Text>
            </View>
          </View>

          {/* Compass + clue */}
          <View style={cs.compassSection}>
            <Text style={cs.compassLabel}>Which direction is {step.correctCity}?</Text>
            <View style={cs.roseWrap}>
              <CompassRose needleDeg={needleDeg} size={180} />
            </View>
            <View style={cs.compassClueBox}>
              <Text style={cs.compassClueText}>{step.compassClue}</Text>
            </View>
          </View>

          {/* Direction options */}
          <View style={cs.dirGrid}>
            {compassOptions.map((dir) => {
              const isSelected = isResult && dir.label === selectedDir?.label;
              const isCorrect = isResult && dir.label === step.compassDirection.label;
              const isWrong = isSelected && !compassCorrect;
              return (
                <Pressable
                  key={dir.label}
                  disabled={isResult}
                  style={[
                    cs.dirBtn,
                    isCorrect && cg.optCorrect,
                    isWrong && cg.optWrong,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onCompassGuess(dir);
                  }}
                >
                  <Text style={[cs.dirText, isCorrect && cg.optTextCorrect, isWrong && cg.optTextWrong]}>
                    {dir.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isResult && (
            <View style={cg.correctHint}>
              <Text style={cg.correctHintText}>
                {compassCorrect ? "\u2713 Correct!" : `The answer was ${step.compassDirection.label}`}
                {" \u2014 "}{compassCorrect ? "Nice navigation!" : "continuing..."}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── STEP FACT ─────────────────────────────────────────────────────────────────
  if (phase === "step_fact") {
    const collected = [...fragmentsCollected, step.fragmentEmoji];
    return (
      <View style={[s.root, { backgroundColor: "#0F172A" }]}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Fragment collected */}
          <View style={sf.fragmentBanner}>
            <Text style={sf.fragmentEmoji}>{step.fragmentEmoji}</Text>
            <View>
              <Text style={sf.fragmentLabel}>Fragment Collected!</Text>
              <Text style={sf.fragmentName}>{step.fragmentName}</Text>
            </View>
          </View>

          {/* City arrival */}
          <View style={sf.cityCard}>
            <Text style={sf.cityArrival}>Arrived in</Text>
            <Text style={sf.cityName}>{step.correctCity}</Text>
            {step.transportMode && (
              <Text style={sf.transport}>
                {step.transportMode === "plane" ? "\u2708\uFE0F Flew" :
                  step.transportMode === "ship" ? "\uD83D\uDEA2 Sailed" :
                  step.transportMode === "train" ? "\uD83D\uDE82 Train" : "\uD83D\uDE97 Drove"}
              </Text>
            )}
          </View>

          {/* Travel fact */}
          <View style={sf.factCard}>
            <Text style={sf.factLabel}>DID YOU KNOW?</Text>
            <Text style={sf.factText}>{step.travelFact}</Text>
          </View>

          {/* Fragment collection progress */}
          <View style={sf.fragmentsRow}>
            {collected.map((emoji, i) => (
              <View key={i} style={sf.fragmentDot}>
                <Text style={sf.fragmentDotEmoji}>{emoji}</Text>
              </View>
            ))}
            {Array.from({ length: totalSteps - collected.length }).map((_, i) => (
              <View key={`empty-${i}`} style={[sf.fragmentDot, sf.fragmentDotEmpty]}>
                <Text style={sf.fragmentDotEmptyText}>?</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [bs.continueBtn, pressed && { opacity: 0.85 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNextStep(); }}
          >
            <Text style={bs.continueBtnText}>
              {stepIdx + 1 >= totalSteps ? "Complete Quest!" : `Next Stop (${stepIdx + 2}/${totalSteps}) \u2192`}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── ADVENTURE COMPLETE ────────────────────────────────────────────────────────
  if (phase === "adventure_complete") {
    const xp = calculateXP(wrongGuesses, totalSteps);
    return (
      <LinearGradient colors={["#064E3B", "#065F46", "#047857"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: insets.bottom + 60 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={ac.heroBlock}>
            <Text style={ac.rewardEmoji}>{adventure.reward.emoji}</Text>
            <Text style={ac.headline}>Quest Complete!</Text>
            <Text style={ac.rewardTitle}>{adventure.reward.title}</Text>
            <Text style={ac.rewardDesc}>{adventure.reward.description}</Text>
          </View>

          <View style={ac.statsCard}>
            <View style={ac.statRow}>
              <Text style={ac.statLabel}>Cities Visited</Text>
              <Text style={ac.statVal}>{totalSteps}</Text>
            </View>
            <View style={ac.statRow}>
              <Text style={ac.statLabel}>XP Earned</Text>
              <Text style={ac.statVal}>{xp} XP</Text>
            </View>
            <View style={ac.statRow}>
              <Text style={ac.statLabel}>Wrong Guesses</Text>
              <Text style={ac.statVal}>{wrongGuesses}</Text>
            </View>
          </View>

          {/* Fragments */}
          <View style={ac.fragmentsWrap}>
            <Text style={ac.fragmentsLabel}>Fragments Collected</Text>
            <View style={sf.fragmentsRow}>
              {fragmentsCollected.map((emoji, i) => (
                <View key={i} style={sf.fragmentDot}>
                  <Text style={sf.fragmentDotEmoji}>{emoji}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [ac.btnPrimary, pressed && { opacity: 0.85 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setPhase("adventure_select");
              setAdventure(null);
              setStepIdx(0);
              setFragmentsCollected([]);
              setWrongGuesses(0);
              needleAnim.setValue(0);
            }}
          >
            <Text style={ac.btnPrimaryText}>Back to Adventures</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [ac.btnGhost, pressed && { opacity: 0.75 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/kids/games" as never); }}
          >
            <Text style={ac.btnGhostText}>Back to Games</Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF8F0" },
  header: {
    paddingHorizontal: 20, paddingBottom: 28,
    overflow: "hidden", position: "relative",
  },
  circle1: {
    position: "absolute", top: -50, right: -30,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  circle2: {
    position: "absolute", bottom: -30, left: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  backRow: { marginBottom: 14 },
  backText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.65)" },
  hdrEye: { fontFamily: F.bold, fontSize: 10, color: "#F97316", letterSpacing: 1.2, marginBottom: 6 },
  hdrTitle: { fontFamily: F.bold, fontSize: 30, color: "#fff", marginBottom: 4 },
  hdrSub: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.55)" },
  body: { padding: 16, gap: 12 },
  sectionLabel: { fontFamily: F.bold, fontSize: 10, color: "#94A3B8", letterSpacing: 1.2, marginTop: 8 },
  // Featured card
  featCard: {
    backgroundColor: "#1E3A5F", borderRadius: 20, padding: 20,
    borderWidth: 1.5, borderColor: "#2563EB",
  },
  featTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  featBadge: { backgroundColor: "#F97316", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  featBadgeText: { fontFamily: F.bold, fontSize: 9, color: "#fff", letterSpacing: 0.8 },
  featIcon: { fontSize: 28 },
  featTitle: { fontFamily: F.bold, fontSize: 20, color: "#fff", marginBottom: 2 },
  featSub: { fontFamily: F.medium, fontSize: 12, color: "#93C5FD", marginBottom: 8 },
  featDesc: { fontFamily: F.medium, fontSize: 12, color: "#94A3B8", marginBottom: 14, lineHeight: 18 },
  featMeta: { flexDirection: "row", gap: 8, marginBottom: 16 },
  featMetaPill: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  featMetaText: { fontFamily: F.medium, fontSize: 11, color: "#CBD5E1" },
  featBtn: {
    backgroundColor: "#F97316", borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 20,
    alignItems: "center",
  },
  featBtnText: { fontFamily: F.bold, fontSize: 14, color: "#fff" },
  // Adventure list items
  advCard: {
    backgroundColor: "#1E293B", borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 1, borderColor: "#334155",
  },
  advCardLocked: { opacity: 0.55 },
  advIcon: { fontSize: 24, width: 36, textAlign: "center" },
  advInfo: { flex: 1 },
  advTitle: { fontFamily: F.bold, fontSize: 14, color: "#E2E8F0", marginBottom: 2 },
  advTitleLocked: { color: "#64748B" },
  advSub: { fontFamily: F.medium, fontSize: 11, color: "#64748B" },
  advRight: { width: 24, alignItems: "center" },
  advDone: { fontFamily: F.bold, fontSize: 16, color: "#4ADE80" },
  advLock: { fontSize: 16 },
  advArrow: { fontFamily: F.bold, fontSize: 18, color: "#94A3B8" },
  // Coming soon
  comingSoonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  comingCard: {
    backgroundColor: "#1E293B", borderRadius: 12, padding: 12,
    width: "30.5%", alignItems: "center",
    borderWidth: 1, borderColor: "#334155",
  },
  comingIcon: { fontSize: 22, marginBottom: 6 },
  comingTitle: { fontFamily: F.bold, fontSize: 10, color: "#64748B", textAlign: "center" },
  comingRegion: { fontFamily: F.medium, fontSize: 9, color: "#475569", textAlign: "center", marginTop: 2 },
});

const bs = StyleSheet.create({
  adventureLabel: { fontFamily: F.bold, fontSize: 22, color: "#E2E8F0", marginBottom: 4 },
  adventureSubtitle: { fontFamily: F.medium, fontSize: 13, color: "#64748B", marginBottom: 20 },
  divider: { height: 1, backgroundColor: "#1E293B", marginVertical: 20 },
  proseText: {
    fontFamily: F.medium, fontSize: 15, color: "#CBD5E1",
    lineHeight: 26, marginBottom: 20,
  },
  startCity: { fontFamily: F.bold, fontSize: 15, color: "#F97316", marginBottom: 12 },
  funFactBox: {
    backgroundColor: "#1E293B", borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: "#F97316", marginBottom: 24,
  },
  funFactText: { fontFamily: F.medium, fontSize: 13, color: "#94A3B8", lineHeight: 20 },
  continueBtn: {
    backgroundColor: "#F97316", borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  continueBtnText: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  stepBar: { marginBottom: 24 },
  stepLabel: { fontFamily: F.bold, fontSize: 11, color: "#64748B", marginBottom: 10 },
  progressRow: { flexDirection: "row", gap: 5 },
  progressDot: { width: 18, height: 4, borderRadius: 2, backgroundColor: "#1E293B" },
  progressDotDone: { backgroundColor: "#4ADE80" },
  progressDotActive: { backgroundColor: "#F97316" },
});

const cg = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: "#1E293B",
    marginBottom: 16,
  },
  quitText: { fontFamily: F.bold, fontSize: 13, color: "#64748B" },
  progressRow: { flexDirection: "row", gap: 4 },
  dot: { width: 14, height: 4, borderRadius: 2, backgroundColor: "#1E293B" },
  dotDone: { backgroundColor: "#4ADE80" },
  dotActive: { backgroundColor: "#F97316" },
  xpBadge: {
    backgroundColor: "#1E293B", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  xpText: { fontFamily: F.bold, fontSize: 11, color: "#94A3B8" },
  clueCard: {
    marginHorizontal: 16, backgroundColor: "#1E293B",
    borderRadius: 18, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: "#334155",
  },
  clueLabel: { fontFamily: F.bold, fontSize: 10, color: "#64748B", letterSpacing: 0.8, marginBottom: 12 },
  landmarkName: { fontFamily: F.bold, fontSize: 18, color: "#E2E8F0", marginBottom: 4 },
  landmarkDesc: { fontFamily: F.medium, fontSize: 13, color: "#94A3B8", marginBottom: 12, lineHeight: 20 },
  flagHint: { fontFamily: F.medium, fontSize: 14, color: "#CBD5E1", marginBottom: 12, lineHeight: 22 },
  divider: { height: 1, backgroundColor: "#334155", marginVertical: 12 },
  clueText: { fontFamily: F.bold, fontSize: 17, color: "#F1F5F9", lineHeight: 26 },
  guessLabel: { fontFamily: F.bold, fontSize: 11, color: "#64748B", letterSpacing: 0.8, textAlign: "center", marginBottom: 14 },
  optionsGrid: { paddingHorizontal: 16, gap: 10 },
  optBtn: {
    backgroundColor: "#1E293B", borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: "#334155",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  optCorrect: { backgroundColor: "#052E16", borderColor: "#16A34A" },
  optWrong: { backgroundColor: "#2D0A0A", borderColor: "#DC2626" },
  optText: { fontFamily: F.bold, fontSize: 15, color: "#E2E8F0" },
  optTextCorrect: { color: "#4ADE80" },
  optTextWrong: { color: "#F87171" },
  optCheck: { fontFamily: F.bold, fontSize: 18 },
  correctHint: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: "#1E293B", borderRadius: 10, padding: 12,
  },
  correctHintText: { fontFamily: F.medium, fontSize: 13, color: "#94A3B8", textAlign: "center" },
});

const cs = StyleSheet.create({
  compassSection: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 16 },
  compassLabel: {
    fontFamily: F.bold, fontSize: 16, color: "#E2E8F0",
    textAlign: "center", marginBottom: 20,
  },
  roseWrap: { marginBottom: 16 },
  compassClueBox: {
    backgroundColor: "#1E293B", borderRadius: 14, padding: 16,
    borderLeftWidth: 3, borderLeftColor: "#F97316",
    marginBottom: 24, alignSelf: "stretch",
  },
  compassClueText: { fontFamily: F.medium, fontSize: 14, color: "#CBD5E1", lineHeight: 22 },
  dirGrid: {
    paddingHorizontal: 16, flexDirection: "row",
    flexWrap: "wrap", gap: 10, justifyContent: "center",
  },
  dirBtn: {
    backgroundColor: "#1E293B", borderRadius: 12, padding: 14,
    width: "45%", alignItems: "center",
    borderWidth: 1.5, borderColor: "#334155",
  },
  dirText: { fontFamily: F.bold, fontSize: 15, color: "#E2E8F0" },
});

const sf = StyleSheet.create({
  fragmentBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#1C1917", borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: "#F97316",
  },
  fragmentEmoji: { fontSize: 36 },
  fragmentLabel: { fontFamily: F.bold, fontSize: 12, color: "#F97316", letterSpacing: 0.6 },
  fragmentName: { fontFamily: F.bold, fontSize: 15, color: "#E2E8F0", marginTop: 2 },
  cityCard: {
    backgroundColor: "#1E293B", borderRadius: 16, padding: 18,
    marginBottom: 16, alignItems: "center",
  },
  cityArrival: { fontFamily: F.medium, fontSize: 12, color: "#64748B", marginBottom: 4 },
  cityName: { fontFamily: F.bold, fontSize: 24, color: "#E2E8F0", marginBottom: 4 },
  transport: { fontFamily: F.medium, fontSize: 13, color: "#94A3B8" },
  factCard: {
    backgroundColor: "#1C1917", borderRadius: 16, padding: 18,
    marginBottom: 20, borderLeftWidth: 3, borderLeftColor: "#F97316",
  },
  factLabel: { fontFamily: F.bold, fontSize: 10, color: "#F97316", letterSpacing: 0.8, marginBottom: 8 },
  factText: { fontFamily: F.medium, fontSize: 14, color: "#CBD5E1", lineHeight: 22 },
  fragmentsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24, justifyContent: "center" },
  fragmentDot: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#1E293B",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#F97316",
  },
  fragmentDotEmpty: { borderColor: "#334155" },
  fragmentDotEmoji: { fontSize: 20 },
  fragmentDotEmptyText: { fontFamily: F.bold, fontSize: 16, color: "#334155" },
});

const ac = StyleSheet.create({
  heroBlock: { alignItems: "center", paddingVertical: 28 },
  rewardEmoji: { fontSize: 64, marginBottom: 12 },
  headline: { fontFamily: F.bold, fontSize: 28, color: "#fff", marginBottom: 4 },
  rewardTitle: { fontFamily: F.bold, fontSize: 18, color: "#6EE7B7", marginBottom: 12 },
  rewardDesc: {
    fontFamily: F.medium, fontSize: 14, color: "rgba(255,255,255,0.7)",
    lineHeight: 22, textAlign: "center",
  },
  statsCard: {
    backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 18, padding: 20,
    marginBottom: 20, gap: 12,
  },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { fontFamily: F.medium, fontSize: 14, color: "rgba(255,255,255,0.6)" },
  statVal: { fontFamily: F.bold, fontSize: 16, color: "#fff" },
  fragmentsWrap: { marginBottom: 28 },
  fragmentsLabel: { fontFamily: F.bold, fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 0.8, marginBottom: 14, textAlign: "center" },
  btnPrimary: {
    backgroundColor: "#fff", borderRadius: 16,
    paddingVertical: 14, alignItems: "center", marginBottom: 12,
  },
  btnPrimaryText: { fontFamily: F.bold, fontSize: 15, color: "#065F46" },
  btnGhost: {
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 16, paddingVertical: 14, alignItems: "center",
  },
  btnGhostText: { fontFamily: F.bold, fontSize: 14, color: "rgba(255,255,255,0.7)" },
});
