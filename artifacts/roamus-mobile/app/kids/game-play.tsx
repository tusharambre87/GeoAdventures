import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  type BuildItRound,
  type GameContentRounds,
  type GuessRound,
  type SpotItRound,
  type ThisOrThatRound,
  kidsAPI,
} from "@/lib/apiClient";
import { useKids } from "@/lib/kidsContext";
import { F } from "@/lib/tokens";

type GameType = "think-fast" | "scavenger" | "geoguess" | "geospy" | "guess-place";

interface GameConfig {
  title: string;
  icon: string;
  dataKey: keyof Pick<GameContentRounds, "guess" | "thisorthat" | "spotit" | "buildit">;
  accent: string;
  bg: string;
}

const CONFIG: Record<GameType, GameConfig> = {
  "think-fast": { title: "Think Fast!", icon: "🔥", dataKey: "guess", accent: "#7C3AED", bg: "#F5F3FF" },
  scavenger: { title: "Scavenger Hunt", icon: "🔍", dataKey: "spotit", accent: "#16A34A", bg: "#F0FDF4" },
  geoguess: { title: "GeoGuess", icon: "🌍", dataKey: "thisorthat", accent: "#2563EB", bg: "#EFF6FF" },
  geospy: { title: "GeoSpy", icon: "👁", dataKey: "spotit", accent: "#E8692A", bg: "#FDF0E9" },
  "guess-place": { title: "Guess the Place", icon: "🗺️", dataKey: "buildit", accent: "#7C3AED", bg: "#F5F3FF" },
};

export default function GamePlay() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();
  const gameType: GameType = (type as GameType) in CONFIG ? (type as GameType) : "think-fast";
  const config = CONFIG[gameType];
  const kids = useKids();

  const [gameContent, setGameContent] = useState<GameContentRounds | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!kids.stopId) {
      setErrored(true);
      setLoading(false);
      return;
    }
    kidsAPI
      .getGames(kids.stopId)
      .then((data) => {
        setGameContent(data);
        setLoading(false);
      })
      .catch(() => {
        setErrored(true);
        setLoading(false);
      });
  }, [kids.stopId]);

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: config.bg, paddingTop: insets.top }]}>
        <Text style={s.loadingIcon}>{config.icon}</Text>
        <ActivityIndicator size="large" color={config.accent} style={{ marginTop: 16 }} />
        <Text style={[s.loadingText, { color: config.accent }]}>Getting your game ready…</Text>
      </View>
    );
  }

  if (errored || !gameContent) {
    return (
      <View style={[s.centered, { backgroundColor: config.bg, paddingTop: insets.top }]}>
        <Text style={s.errorEmoji}>😬</Text>
        <Text style={s.errorText}>Couldn't load the game right now.</Text>
        <Pressable
          style={[s.actionBtn, { backgroundColor: config.accent }]}
          onPress={() => router.back()}
        >
          <Text style={s.actionBtnText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (gameType === "geoguess") {
    return (
      <ThisOrThatGame
        rounds={gameContent.thisorthat}
        config={config}
        stopName={kids.stopName}
        insets={insets}
      />
    );
  }
  if (gameType === "scavenger" || gameType === "geospy") {
    return (
      <SpotItGame
        rounds={gameContent.spotit}
        config={config}
        stopName={kids.stopName}
        insets={insets}
        gameType={gameType}
      />
    );
  }
  if (gameType === "guess-place") {
    return (
      <BuildItGame
        rounds={gameContent.buildit}
        config={config}
        stopName={kids.stopName}
        insets={insets}
      />
    );
  }
  return (
    <GuessGame
      rounds={gameContent.guess}
      config={config}
      stopName={kids.stopName}
      insets={insets}
    />
  );
}

function ProgressDots({ current, total, accent }: { current: number; total: number; accent: string }) {
  return (
    <View style={s.progressRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            s.progressDot,
            { backgroundColor: i <= current ? accent : "#E5E7EB" },
          ]}
        />
      ))}
    </View>
  );
}

function DoneView({
  config,
  label,
  count,
  insets,
}: {
  config: GameConfig;
  label: string;
  count: number;
  insets: ReturnType<typeof useSafeAreaInsets>;
}) {
  return (
    <View style={[s.centered, { backgroundColor: config.bg, paddingTop: insets.top }]}>
      <Text style={s.doneEmoji}>🎉</Text>
      <Text style={[s.doneTitle, { color: config.accent }]}>{label}</Text>
      <Text style={s.doneSub}>
        {count} round{count !== 1 ? "s" : ""} completed
      </Text>
      <Pressable
        style={[s.actionBtn, { backgroundColor: config.accent, marginTop: 32 }]}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        }}
      >
        <Text style={s.actionBtnText}>← Back to Games</Text>
      </Pressable>
    </View>
  );
}

function BackLink({ insets }: { insets: ReturnType<typeof useSafeAreaInsets> }) {
  return (
    <Pressable
      style={[s.backLink, { paddingBottom: insets.bottom + 20 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
      }}
    >
      <Text style={s.backLinkText}>← Back to Games</Text>
    </Pressable>
  );
}

function GuessGame({
  rounds,
  config,
  stopName,
  insets,
}: {
  rounds: GuessRound[];
  config: GameConfig;
  stopName: string;
  insets: ReturnType<typeof useSafeAreaInsets>;
}) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handlePick = (label: string) => {
    if (picked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPicked(label);
    setTimeout(() => {
      if (round + 1 >= rounds.length) {
        setDone(true);
      } else {
        setRound((r) => r + 1);
        setPicked(null);
      }
    }, 700);
  };

  if (done || !rounds.length) {
    return (
      <DoneView
        config={config}
        label="Predictions made!"
        count={rounds.length}
        insets={insets}
      />
    );
  }

  const cur = rounds[round];

  return (
    <View style={[s.root, { backgroundColor: config.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24 }}>
          <ProgressDots current={round} total={rounds.length} accent={config.accent} />
          <Text style={s.gameIcon}>{config.icon}</Text>
          <Text style={[s.gameTitle, { color: config.accent }]}>{config.title}</Text>
          <Text style={s.stopLabel}>{stopName}</Text>
          <Text style={s.question}>{cur.question}</Text>
        </View>

        <View style={s.optionsList}>
          {cur.options.map((opt) => (
            <Pressable
              key={opt.label}
              style={[
                s.optionBtn,
                { borderColor: config.accent },
                picked === opt.label && {
                  backgroundColor: config.accent,
                  borderColor: config.accent,
                },
              ]}
              onPress={() => handlePick(opt.label)}
              disabled={!!picked}
            >
              <Text style={s.optionEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  s.optionLabel,
                  picked === opt.label && { color: "#fff" },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <BackLink insets={insets} />
      </ScrollView>
    </View>
  );
}

function SpotItGame({
  rounds,
  config,
  stopName,
  insets,
  gameType,
}: {
  rounds: SpotItRound[];
  config: GameConfig;
  stopName: string;
  insets: ReturnType<typeof useSafeAreaInsets>;
  gameType: "scavenger" | "geospy";
}) {
  const [checked, setChecked] = useState<boolean[]>(() => rounds.map(() => false));
  const countDone = checked.filter(Boolean).length;
  const allDone = rounds.length > 0 && countDone === rounds.length;

  const toggle = (i: number) => {
    if (checked[i]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked((prev) => {
      const next = [...prev];
      next[i] = true;
      return next;
    });
  };

  if (allDone) {
    return (
      <DoneView
        config={config}
        label={gameType === "geospy" ? "Mission complete! 🕵️" : "Everything found!"}
        count={rounds.length}
        insets={insets}
      />
    );
  }

  return (
    <View style={[s.root, { backgroundColor: config.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24 }}>
          <Text style={s.gameIcon}>{config.icon}</Text>
          <Text style={[s.gameTitle, { color: config.accent }]}>{config.title}</Text>
          <Text style={s.stopLabel}>{stopName}</Text>
          <Text style={[s.progressCount, { color: config.accent }]}>
            {countDone} / {rounds.length}{" "}
            {gameType === "geospy" ? "targets spotted" : "items found"}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 12 }}>
          {rounds.map((r, i) => (
            <Pressable
              key={i}
              style={[
                s.checkItem,
                { borderColor: checked[i] ? config.accent : "rgba(0,0,0,0.08)" },
                checked[i] && { backgroundColor: config.accent + "18" },
              ]}
              onPress={() => toggle(i)}
            >
              <View
                style={[
                  s.checkbox,
                  checked[i] && {
                    backgroundColor: config.accent,
                    borderColor: config.accent,
                  },
                ]}
              >
                {checked[i] && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text
                style={[
                  s.checkLabel,
                  checked[i] && { textDecorationLine: "line-through", opacity: 0.45 },
                ]}
              >
                {r.prompt}
              </Text>
            </Pressable>
          ))}
        </View>

        <BackLink insets={insets} />
      </ScrollView>
    </View>
  );
}

function ThisOrThatGame({
  rounds,
  config,
  stopName,
  insets,
}: {
  rounds: ThisOrThatRound[];
  config: GameConfig;
  stopName: string;
  insets: ReturnType<typeof useSafeAreaInsets>;
}) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<"A" | "B" | null>(null);
  const [done, setDone] = useState(false);

  const handlePick = (which: "A" | "B") => {
    if (picked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPicked(which);
  };

  const advance = () => {
    if (round + 1 >= rounds.length) {
      setDone(true);
    } else {
      setRound((r) => r + 1);
      setPicked(null);
    }
  };

  if (done || !rounds.length) {
    return (
      <DoneView
        config={config}
        label="Great choices!"
        count={rounds.length}
        insets={insets}
      />
    );
  }

  const cur = rounds[round];

  return (
    <View style={[s.root, { backgroundColor: config.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24 }}>
          <ProgressDots current={round} total={rounds.length} accent={config.accent} />
          <Text style={s.gameIcon}>{config.icon}</Text>
          <Text style={[s.gameTitle, { color: config.accent }]}>{config.title}</Text>
          <Text style={s.stopLabel}>{stopName}</Text>
          <Text style={s.question}>{cur.question}</Text>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 10 }}>
          <Pressable
            style={[
              s.totCard,
              { borderColor: picked === "A" ? config.accent : "rgba(0,0,0,0.08)" },
              picked === "A" && { backgroundColor: config.accent + "18" },
            ]}
            onPress={() => handlePick("A")}
            disabled={!!picked}
          >
            <Text style={s.totEmoji}>{cur.optionA.emoji}</Text>
            <Text style={s.totLabel}>{cur.optionA.label}</Text>
          </Pressable>

          <Text style={s.vsDivider}>vs</Text>

          <Pressable
            style={[
              s.totCard,
              { borderColor: picked === "B" ? config.accent : "rgba(0,0,0,0.08)" },
              picked === "B" && { backgroundColor: config.accent + "18" },
            ]}
            onPress={() => handlePick("B")}
            disabled={!!picked}
          >
            <Text style={s.totEmoji}>{cur.optionB.emoji}</Text>
            <Text style={s.totLabel}>{cur.optionB.label}</Text>
          </Pressable>

          {picked && (
            <View style={[s.factBox, { borderColor: config.accent }]}>
              <Text style={[s.factLabel, { color: config.accent }]}>💡 Fun fact!</Text>
              <Text style={s.factText}>{cur.funFact}</Text>
              <Pressable
                style={[s.actionBtn, { backgroundColor: config.accent, marginTop: 14 }]}
                onPress={advance}
              >
                <Text style={s.actionBtnText}>
                  {round + 1 >= rounds.length ? "Finish! 🎉" : "Next →"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <BackLink insets={insets} />
      </ScrollView>
    </View>
  );
}

function BuildItGame({
  rounds,
  config,
  stopName,
  insets,
}: {
  rounds: BuildItRound[];
  config: GameConfig;
  stopName: string;
  insets: ReturnType<typeof useSafeAreaInsets>;
}) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handlePick = (label: string) => {
    if (picked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPicked(label);
    setTimeout(() => {
      if (round + 1 >= rounds.length) {
        setDone(true);
      } else {
        setRound((r) => r + 1);
        setPicked(null);
      }
    }, 800);
  };

  if (done || !rounds.length) {
    return (
      <DoneView
        config={config}
        label="You're a designer!"
        count={rounds.length}
        insets={insets}
      />
    );
  }

  const cur = rounds[round];

  return (
    <View style={[s.root, { backgroundColor: config.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24 }}>
          <ProgressDots current={round} total={rounds.length} accent={config.accent} />
          <Text style={s.gameIcon}>{config.icon}</Text>
          <Text style={[s.gameTitle, { color: config.accent }]}>{config.title}</Text>
          <Text style={s.stopLabel}>{stopName}</Text>
          <Text style={s.question}>{cur.prompt}</Text>
        </View>

        <View style={s.grid2x2}>
          {cur.options.map((opt) => (
            <Pressable
              key={opt.label}
              style={[
                s.gridOption,
                { borderColor: picked === opt.label ? config.accent : "rgba(0,0,0,0.08)" },
                picked === opt.label && { backgroundColor: config.accent },
              ]}
              onPress={() => handlePick(opt.label)}
              disabled={!!picked}
            >
              <Text style={s.gridOptionEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  s.gridOptionLabel,
                  picked === opt.label && { color: "#fff" },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <BackLink insets={insets} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingIcon: { fontSize: 52 },
  loadingText: {
    fontFamily: F.semibold,
    fontSize: 15,
    marginTop: 12,
  },
  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorText: {
    fontFamily: F.semibold,
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    marginBottom: 24,
  },
  gameIcon: { fontSize: 36, marginBottom: 8 },
  gameTitle: {
    fontFamily: F.bold,
    fontSize: 22,
    marginBottom: 4,
  },
  stopLabel: {
    fontFamily: F.medium,
    fontSize: 13,
    color: "#78716C",
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  progressDot: {
    width: 28,
    height: 5,
    borderRadius: 3,
  },
  question: {
    fontFamily: F.bold,
    fontSize: 19,
    color: "#1C1917",
    lineHeight: 27,
    marginBottom: 4,
  },
  optionsList: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: "#fff",
  },
  optionEmoji: { fontSize: 26 },
  optionLabel: {
    fontFamily: F.semibold,
    fontSize: 16,
    color: "#1C1917",
    flexShrink: 1,
  },
  progressCount: {
    fontFamily: F.bold,
    fontSize: 14,
    marginTop: 6,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkmark: {
    color: "#fff",
    fontFamily: F.bold,
    fontSize: 14,
  },
  checkLabel: {
    fontFamily: F.medium,
    fontSize: 15,
    color: "#1C1917",
    lineHeight: 22,
    flex: 1,
  },
  totCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 2,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  totEmoji: { fontSize: 30 },
  totLabel: {
    fontFamily: F.bold,
    fontSize: 18,
    color: "#1C1917",
    flexShrink: 1,
  },
  vsDivider: {
    fontFamily: F.bold,
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    letterSpacing: 1,
  },
  factBox: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
    marginTop: 4,
  },
  factLabel: {
    fontFamily: F.bold,
    fontSize: 13,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  factText: {
    fontFamily: F.medium,
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  grid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  gridOption: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 2,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 8,
  },
  gridOptionEmoji: { fontSize: 30 },
  gridOptionLabel: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: "#1C1917",
    textAlign: "center",
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  actionBtnText: {
    fontFamily: F.bold,
    fontSize: 15,
    color: "#fff",
  },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: {
    fontFamily: F.bold,
    fontSize: 24,
    textAlign: "center",
    marginBottom: 8,
  },
  doneSub: {
    fontFamily: F.medium,
    fontSize: 15,
    color: "#78716C",
    textAlign: "center",
  },
  backLink: {
    alignItems: "center",
    paddingTop: 28,
  },
  backLinkText: {
    fontFamily: F.semibold,
    fontSize: 14,
    color: "#9CA3AF",
  },
});
